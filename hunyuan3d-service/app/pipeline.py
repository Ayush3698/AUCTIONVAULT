"""Wrapper around the official Hunyuan3D-2 `hy3dgen` pipeline.

This module imports the model code directly from the cloned Hunyuan3D-2
repository (see `config.hunyuan3d_root`) so the heavy models stay loaded in
memory between requests. It mirrors the official `api_server.py` generation
flow (background removal -> shape -> optional texture -> export GLB) while
translating failures into structured `ServiceError`s.

All heavy imports (torch, hy3dgen, trimesh, PIL) are performed lazily so the
health endpoint keeps working when dependencies are missing.

Memory notes (why the loaders below exist)
------------------------------------------
`Hunyuan3DDiTPipeline.from_single_file()` and `VectsetVAE.from_single_file()`
create every module with the default float32 dtype, copy the fp16 checkpoint
into those float32 parameters and only then cast the module back to fp16:

    3.8 GB checkpoint dict  +  7.6 GB float32 parameters  +  3.8 GB fp16 copy

That peaks at ~15 GB of committed memory for the shape checkpoint alone and at
another ~16 GB when `enable_flashvdm()` swaps in the turbo VAE, which is more
than this machine (16 GB RAM) can serve. Windows answers the failing
allocation with an access violation inside `torch_cpu.dll`, so the process dies
without a Python traceback and the HTTP client only sees a dropped connection.

The loaders in this module instantiate the modules on the `meta` device and then
*assign* the fp16 checkpoint tensors to them (`load_state_dict(assign=True)`),
which keeps the peak at the size of the checkpoint itself and never allocates a
float32 copy. The official repository is left untouched.
"""
from __future__ import annotations

import contextlib
import logging
import os
import sys
import time
import uuid
from pathlib import Path

from app.errors import ServiceError
from app import config as cfg

_OUTPUTS_DIR = cfg.config.outputs_dir

log = logging.getLogger("hunyuan3d.pipeline")

# Extra head-room needed on top of a checkpoint while it is being read.
_LOAD_HEADROOM_GB = 1.5
# Size of the `hunyuan3d-vae-v2-mini-turbo` weights that enable_flashvdm() pulls
# in *in addition* to the bundled VAE.
_FLASH_VDM_VAE_GB = 4.1


def _available_ram_gb() -> float | None:
    """Free physical RAM in GiB, or None when it cannot be determined."""
    try:
        import psutil

        return round(psutil.virtual_memory().available / 2**30, 2)
    except Exception:
        pass
    try:
        import ctypes

        class _MemoryStatusEx(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]

        status = _MemoryStatusEx()
        status.dwLength = ctypes.sizeof(status)
        ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status))  # type: ignore[attr-defined]
        return round(status.ullAvailPhys / 2**30, 2)
    except Exception:
        return None


def _require_torch():
    """Import torch or raise a ServiceError that names the wrong interpreter."""
    try:
        import torch
    except ImportError as exc:
        raise ServiceError(
            "DEPENDENCIES_MISSING",
            "PyTorch is not installed for the Python interpreter running this service "
            f"({sys.executable}). Start the service with the project virtual environment: "
            r"hunyuan3d-service\.venv\Scripts\python.exe server.py (or run start_hunyuan3d.bat), "
            f"then retry. (original error: {exc})",
        ) from exc
    return torch


# --------------------------------------------------------------------------- #
# Low-memory checkpoint loading                                              #
# --------------------------------------------------------------------------- #
def _materialize_meta_tensors(module) -> None:
    """Replace parameters/buffers left on the meta device with real zeros.

    Modules are built on `meta` below, so anything the checkpoint does not
    provide (non-persistent buffers, for example) would stay unusable.
    """
    import torch

    for submodule in module.modules():
        for name, buffer in list(submodule._buffers.items()):
            if isinstance(buffer, torch.Tensor) and buffer.is_meta:
                submodule._buffers[name] = torch.zeros(tuple(buffer.shape), dtype=buffer.dtype)
        for name, parameter in list(submodule._parameters.items()):
            if parameter is not None and parameter.is_meta:
                submodule._parameters[name] = torch.nn.Parameter(
                    torch.zeros(tuple(parameter.shape), dtype=parameter.dtype), requires_grad=False
                )


def _instantiate_low_mem(factory, state_dict, *, dtype, device="cpu", strict=False):
    """Build a module without real storage, then attach the checkpoint tensors."""
    import torch
    from accelerate import init_empty_weights

    with init_empty_weights():
        module = factory()
    _materialize_meta_tensors(module)
    if state_dict:
        # assign=True rebinds the parameters to the (already fp16) checkpoint
        # tensors instead of copying them into float32 storage.
        module.load_state_dict(state_dict, strict=strict, assign=True)
    if str(device) != "cpu" or dtype is not None:
        module.to(device=device, dtype=dtype)
    return module


def _read_checkpoint(ckpt_path: str, use_safetensors: bool) -> dict:
    import torch

    if use_safetensors and ckpt_path.endswith(".safetensors"):
        import safetensors.torch

        return safetensors.torch.load_file(ckpt_path, device="cpu")
    return torch.load(ckpt_path, map_location="cpu", weights_only=True)


class _Checkpoint:
    """Weight reader that keeps a safetensors file mapped instead of copied.

    `safetensors.torch.load_file()` maps the checkpoint *and* copies every
    tensor out of the mapping before returning, so a 3.6 GB checkpoint needs
    ~7 GB of system commit charge at once. That is what made this machine abort
    with `OSError 1455` ("the paging file is too small") and, in the upstream
    loader, an access violation inside `torch_cpu.dll`.

    Reading the header ourselves lets every tensor alias the mapping instead:
    peak extra memory is then a single tensor (<= 24 MB here) and the weights
    stay file-backed, so Windows can page them out under memory pressure. The
    mapping must stay alive for as long as the tensors do - callers keep the
    `_Checkpoint` on the pipeline object.
    """

    _DTYPES = {
        "F64": "float64", "F32": "float32", "F16": "float16", "BF16": "bfloat16",
        "I64": "int64", "I32": "int32", "I16": "int16", "I8": "int8",
        "U8": "uint8", "BOOL": "bool",
    }

    def __init__(self, path: str, use_safetensors: bool):
        import torch

        self.path = path
        self.zero_copy = False
        self._array = None
        self._flat = None
        self._copied: dict | None = None
        self._header: dict = {}
        self._data_start = 0

        if use_safetensors and path.endswith(".safetensors"):
            try:
                self._map(path)
                self.zero_copy = True
            except Exception as exc:
                log.warning("Could not memory-map %s (%s); falling back to a full copy.",
                            os.path.basename(path), exc)
        if not self.zero_copy:
            self._copied = _read_checkpoint(path, use_safetensors)

    def _map(self, path: str) -> None:
        import json
        import struct

        import numpy as np
        import torch

        with open(path, "rb") as handle:
            header_len = struct.unpack("<Q", handle.read(8))[0]
            header = json.loads(handle.read(header_len))
        header.pop("__metadata__", None)
        if not header:
            raise ValueError("checkpoint contains no tensors")
        self._header = header
        self._data_start = 8 + header_len
        # mode="c" = copy-on-write: writable, but the pages stay file-backed.
        self._array = np.memmap(path, dtype=np.uint8, mode="c")
        self._flat = torch.frombuffer(memoryview(self._array), dtype=torch.uint8)

    def sub(self, prefix: str) -> dict:
        """Return the tensors stored under `prefix` (e.g. "model" -> "model.*")."""
        return self._collect(lambda name: name.startswith(f"{prefix}."), strip=f"{prefix}.")

    def all(self) -> dict:
        """Return every tensor in the checkpoint (used by single-file loaders)."""
        return self._collect(lambda name: True, strip="")

    def _collect(self, keep, strip: str) -> dict:
        if self._copied is not None:
            return {k[len(strip):]: v for k, v in self._copied.items() if keep(k)}

        import torch

        out: dict = {}
        for name, info in self._header.items():
            if not keep(name):
                continue
            begin, end = info["data_offsets"]
            dtype_name = self._DTYPES.get(info["dtype"])
            if dtype_name is None:
                raise ValueError(f"unsupported safetensors dtype {info['dtype']} for {name}")
            dtype = getattr(torch, dtype_name)
            itemsize = torch.empty(0, dtype=dtype).element_size()
            shape = list(info["shape"])
            offset = self._data_start + begin
            nbytes = end - begin
            if nbytes == 0:
                # torch.frombuffer rejects empty buffers.
                out[name[len(strip):]] = torch.empty(shape, dtype=dtype)
                continue
            raw = self._flat[offset : offset + nbytes]
            if offset % itemsize:
                # torch requires dtype-aligned storage; this is rare and cheap.
                raw = raw.clone()
            out[name[len(strip):]] = raw.view(dtype).reshape(shape)
        return out

    def release(self) -> None:
        self._copied = None
        self._header = {}
        self._flat = None
        self._array = None


def _load_shape_pipeline(*, model_path: str, subfolder: str, use_safetensors: bool,
                         variant: str, device: str, dtype):
    """Same result as Hunyuan3DDiTFlowMatchingPipeline.from_pretrained, low peak RAM."""
    import yaml
    from hy3dgen.shapegen.pipelines import (
        Hunyuan3DDiTFlowMatchingPipeline,
        instantiate_from_config,
    )
    from hy3dgen.shapegen.utils import smart_load_model

    try:
        config_path, ckpt_path = smart_load_model(
            model_path, subfolder=subfolder, use_safetensors=use_safetensors, variant=variant
        )
    except Exception as exc:
        raise ServiceError(
            "MODEL_DOWNLOAD_FAILED",
            f"The Hunyuan3D shape weights ({model_path} [{subfolder}]) could not be fetched. "
            f"The first generation needs internet access; afterwards they are cached. "
            f"(original error: {type(exc).__name__}: {exc})",
        ) from exc

    reader: _Checkpoint | None = None
    try:
        with open(config_path, "r", encoding="utf-8") as handle:
            config = yaml.safe_load(handle)

        reader = _Checkpoint(ckpt_path, use_safetensors)
        model = _instantiate_low_mem(
            lambda: instantiate_from_config(config["model"]),
            reader.sub("model"),
            dtype=dtype,
            strict=True,
        )
        vae = _instantiate_low_mem(
            lambda: instantiate_from_config(config["vae"]),
            reader.sub("vae"),
            dtype=dtype,
            strict=False,
        )
        conditioner = _instantiate_low_mem(
            lambda: instantiate_from_config(config["conditioner"]),
            reader.sub("conditioner"),
            dtype=dtype,
            strict=False,
        )
    except ServiceError:
        raise
    except MemoryError as exc:
        raise ServiceError(
            "MODEL_LOAD_FAILED",
            "Ran out of system memory while reading the Hunyuan3D shape weights. "
            "Close memory-hungry applications (virtual machines, browsers, editors) and retry.",
        ) from exc
    except OSError as exc:
        if getattr(exc, "winerror", None) == 1455 or "paging file" in str(exc).lower():
            raise ServiceError(
                "MODEL_LOAD_FAILED",
                "The system ran out of commitable memory while reading the Hunyuan3D weights "
                f"(~{round(os.path.getsize(ckpt_path) / 2**30, 1)} GB). Windows reported: "
                f"{exc}. Free RAM by closing virtual machines, browsers and editors, or enlarge "
                "the pagefile, then restart the service.",
            ) from exc
        raise ServiceError(
            "MODEL_LOAD_FAILED",
            f"The Hunyuan3D shape weights ({model_path} [{subfolder}]) could not be read "
            f"({type(exc).__name__}: {exc}).",
        ) from exc
    except Exception as exc:
        raise ServiceError(
            "MODEL_LOAD_FAILED",
            f"Hunyuan3D model initialization failed while reading {model_path} [{subfolder}] "
            f"({type(exc).__name__}: {exc}).",
        ) from exc

    pipeline = Hunyuan3DDiTFlowMatchingPipeline(
        vae=vae,
        model=model,
        scheduler=instantiate_from_config(config["scheduler"]),
        conditioner=conditioner,
        image_processor=instantiate_from_config(config["image_processor"]),
        device=device,
        dtype=dtype,
        from_pretrained_kwargs={
            "model_path": model_path,
            "subfolder": subfolder,
            "use_safetensors": use_safetensors,
            "variant": variant,
            "dtype": dtype,
            "device": device,
        },
    )
    # Keep the memory mapping alive for as long as the weights live.
    pipeline._weight_reader = reader
    return pipeline


@contextlib.contextmanager
def _low_mem_vae_loader():
    """Temporarily give VectsetVAE the same low-memory loading path.

    `enable_flashvdm()` reloads the turbo VAE through the upstream loader, which
    is the single largest peak-RAM offender on this machine.
    """
    import yaml
    from hy3dgen.shapegen.models.autoencoders.model import VectsetVAE

    original = VectsetVAE.__dict__["from_single_file"].__func__

    def patched(cls, ckpt_path, config_path, device="cuda", dtype=None, use_safetensors=None, **kwargs):
        if use_safetensors:
            ckpt_path = ckpt_path.replace(".ckpt", ".safetensors")
        with open(config_path, "r", encoding="utf-8") as handle:
            config = yaml.safe_load(handle)
        reader = _Checkpoint(ckpt_path, bool(use_safetensors))
        model_kwargs = dict(config["params"])
        model_kwargs.update(kwargs)
        module = _instantiate_low_mem(
            lambda: cls(**model_kwargs), reader.all(), dtype=dtype, device=device, strict=False
        )
        module._weight_reader = reader
        return module

    VectsetVAE.from_single_file = classmethod(patched)
    try:
        yield
    finally:
        VectsetVAE.from_single_file = classmethod(original)


@contextlib.contextmanager
def _rembg_session(model: str | None):
    """Force rembg to build a specific segmentation session, if requested."""
    if not model:
        yield
        return
    import hy3dgen.rembg as hy_rembg

    original = hy_rembg.new_session

    def factory(*args, **kwargs):
        kwargs.pop("model_name", None)
        kwargs.pop("providers", None)
        return original(model, *args, **kwargs)

    hy_rembg.new_session = factory
    try:
        yield
    finally:
        hy_rembg.new_session = original


class HunyuanPipeline:
    def __init__(self):
        self.rembg = None
        self.pipeline = None  # Hunyuan3DDiTFlowMatchingPipeline
        self.tex_pipeline = None
        self.face_reduction = None
        self.device = ""
        self.flash_vdm = False
        self.flash_vdm_reason = "not loaded"
        self.rembg_reason = "not loaded"
        self.load_warning = ""

    # ------------------------------------------------------------------ #
    # Low-VRAM CUDA offload                                               #
    # ------------------------------------------------------------------ #
    def _setup_offload_hooks(self) -> None:
        """Move the model weights to CPU and stream each component to the GPU
        only while it is being used.

        The full Hunyuan3D-2mini fp16 checkpoint is ~3.8 GB while this machine
        has a 4 GB GPU, so the components must never all live in VRAM at once.
        accelerate's `cpu_offload_with_hook` keeps everything on CPU and swaps
        each component (conditioner -> model -> vae) onto the GPU just before
        its forward pass. Without this, /generate would OOM on this card.
        """
        if self.pipeline is None or self.device != "cuda":
            return
        import torch
        from accelerate import cpu_offload_with_hook

        dev = torch.device("cuda")
        self.pipeline.device = dev
        self.pipeline.dtype = torch.float16
        hooks = []
        for name in ("conditioner", "model", "vae"):
            component = getattr(self.pipeline, name)
            if not isinstance(component, torch.nn.Module):
                continue
            _, hook = cpu_offload_with_hook(component, dev, prev_module_hook=hooks[-1] if hooks else None)
            hooks.append(hook)
        self.pipeline._offload_hooks = hooks

    def _release_offload(self) -> None:
        """Return every component to the CPU and free the GPU cache between
        requests so the next generation starts from a clean 4 GB state."""
        if self.pipeline is not None:
            import torch

            hooks = getattr(self.pipeline, "_offload_hooks", None) or []
            for hook in hooks:
                try:
                    hook.offload()
                except Exception:
                    pass
            try:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass

    # ------------------------------------------------------------------ #
    # Environment checks                                                  #
    # ------------------------------------------------------------------ #
    def ensure_dependencies(self) -> None:
        repo = cfg.config.hunyuan3d_root
        if not repo.is_dir() or not (repo / "hy3dgen").is_dir():
            raise ServiceError(
                "DEPENDENCIES_MISSING",
                "The Hunyuan3D-2 repository was not found. Clone it into "
                f"'{repo}' and install its requirements (see README.md) before using "
                "this service.",
            )
        if str(repo) not in sys.path:
            sys.path.insert(0, str(repo))
        try:
            import hy3dgen  # noqa: F401
        except ImportError as exc:
            raise ServiceError(
                "DEPENDENCIES_MISSING",
                "Python dependencies for Hunyuan3D are missing. From the Hunyuan3D-2 "
                f"repository run: pip install -r requirements.txt && pip install -e . "
                f"(original error: {exc}).",
            ) from exc

    def _cuda_available(self) -> bool:
        try:
            import torch

            return bool(getattr(torch, "cuda", None) and torch.cuda.is_available())
        except Exception:
            return False

    def is_cuda_enabled(self) -> bool:
        return self._cuda_available() or cfg.config.device == "cuda"

    def resolve_device(self) -> str:
        torch = _require_torch()

        cuda_available = bool(getattr(torch, "cuda", None) and torch.cuda.is_available())
        requested = cfg.config.device
        if requested == "cuda" and not cuda_available:
            raise ServiceError(
                "GPU_UNAVAILABLE",
                "CUDA was requested (HUNYUAN3D_DEVICE=cuda) but no usable CUDA GPU was "
                "detected. This machine has no adequate NVIDIA GPU or the CUDA build of "
                "PyTorch is not installed. Unset HUNYUAN3D_DEVICE or set it to 'cpu' to "
                "fall back to CPU (very slow).",
            )
        if requested == "cpu":
            return "cpu"
        return "cuda" if cuda_available else "cpu"

    # ------------------------------------------------------------------ #
    # Model loading                                                       #
    # ------------------------------------------------------------------ #
    def _resolve_flash_vdm(self) -> tuple[bool, str]:
        setting = (cfg.config.flash_vdm or "auto").strip().lower()
        if setting in ("0", "false", "no", "off"):
            return False, "disabled via HUNYUAN3D_FLASH_VDM=0"
        needed = _FLASH_VDM_VAE_GB + _LOAD_HEADROOM_GB
        available = _available_ram_gb()
        if setting in ("1", "true", "yes", "on"):
            return True, "forced via HUNYUAN3D_FLASH_VDM=1"
        if available is None:
            return True, "enabled (free RAM could not be measured)"
        if available < needed:
            return False, (
                f"skipped to avoid exhausting system RAM: it loads a second "
                f"{_FLASH_VDM_VAE_GB} GB turbo VAE checkpoint and needs ~{needed} GB free, "
                f"but only {available} GB is free"
            )
        return True, f"enabled (~{available} GB free RAM)"

    def _resolve_rembg_model(self) -> tuple[str | None, str]:
        setting = (cfg.config.rembg_model or "auto").strip()
        if setting and setting.lower() != "auto":
            return setting, f"forced via HUNYUAN3D_REMBG_MODEL={setting}"
        available = _available_ram_gb()
        if available is not None and available < 2.5:
            return "u2net", (f"u2net (~176 MB) because only ~{available} GB of RAM is free; "
                             "the default bria-rmbg session needs ~1 GB")
        return None, "default (bria-rmbg)"

    def load(self) -> None:
        self.ensure_dependencies()
        torch = _require_torch()
        try:
            self.device = self.resolve_device()
        except ServiceError:
            raise
        except Exception as exc:
            raise ServiceError(
                "DEPENDENCIES_MISSING",
                f"PyTorch/CUDA could not be initialised for Hunyuan3D ({exc}). Install a "
                "compatible PyTorch build (see README.md) and restart the service.",
            ) from exc

        try:
            from hy3dgen.rembg import BackgroundRemover
            from hy3dgen.shapegen import (
                DegenerateFaceRemover,
                FaceReducer,
                FloaterRemover,
                Hunyuan3DDiTFlowMatchingPipeline,
            )
        except ImportError as exc:
            raise ServiceError(
                "DEPENDENCIES_MISSING",
                f"Importing Hunyuan3D failed ({exc}). Make sure the Hunyuan3D-2 "
                "repository requirements are installed in this Python environment.",
            ) from exc

        self.load_warning = ""
        available = _available_ram_gb()
        if available is not None and available < _LOAD_HEADROOM_GB + 3.5:
            self.load_warning = (
                f"Only ~{available} GB of RAM is free; the weights stay memory-mapped from "
                "disk so generation works, but it will be slow. Close virtual machines, "
                "browsers and editors for a faster run."
            )
            log.warning(self.load_warning)

        # Weights (fp16) total ~3.6 GB and this machine has a 4 GB GPU. Always
        # load into system RAM first and only move a single component onto the
        # GPU at a time via `_setup_offload_hooks`. Loading on 'cuda' directly
        # would place every component in VRAM at once and OOM.
        previous = self.pipeline
        self.pipeline = _load_shape_pipeline(
            model_path=cfg.config.shape_model,
            subfolder=cfg.config.shape_subfolder,
            use_safetensors=True,
            variant="fp16",
            device="cpu",
            dtype=torch.float16,
        )
        if previous is not None:
            self._release_offload()
            del previous

        enabled, reason = self._resolve_flash_vdm()
        self.flash_vdm = False
        self.flash_vdm_reason = reason
        if enabled:
            try:
                with _low_mem_vae_loader():
                    self.pipeline.enable_flashvdm()
                self.flash_vdm = True
            except Exception as exc:
                self.flash_vdm_reason = f"failed ({type(exc).__name__}: {exc}); using the bundled VAE"
                log.warning("enable_flashvdm() failed: %s", exc)
        log.info("flashvdm VAE %s", self.flash_vdm_reason)

        self._setup_offload_hooks()

        rembg_model, rembg_reason = self._resolve_rembg_model()
        self.rembg_reason = rembg_reason
        try:
            with _rembg_session(rembg_model):
                self.rembg = BackgroundRemover()
        except Exception as exc:
            raise ServiceError(
                "DEPENDENCIES_MISSING",
                f"The background-removal model could not be initialised ({type(exc).__name__}: "
                f"{exc}). The first run downloads it and needs network access.",
            ) from exc

        if cfg.config.texture_enabled:
            try:
                from hy3dgen.texgen import Hunyuan3DPaintPipeline

                self.tex_pipeline = Hunyuan3DPaintPipeline.from_pretrained(cfg.config.tex_model)
                self.face_reduction = (FloaterRemover, DegenerateFaceRemover, FaceReducer)
            except ImportError:
                # Texture enabled but unavailable -> keep shape-only; the next
                # generation will attempt texture again and surface the error.
                self.tex_pipeline = None

    @property
    def model_log(self) -> str:
        return (f"{cfg.config.shape_model} [{cfg.config.shape_subfolder}] "
                f"on {self.device or 'not-loaded'}, "
                f"flashvdm={'on' if self.flash_vdm else 'off'}, "
                f"texture={'on' if cfg.config.texture_enabled else 'off'}")

    # ------------------------------------------------------------------ #
    # Generation                                                          #
    # ------------------------------------------------------------------ #
    def generate(self, image_bytes: bytes) -> tuple[Path, str]:
        """Run image-to-3D and return (path to GLB, model id)."""
        self.ensure_dependencies()
        if self.pipeline is None:
            raise ServiceError(
                "DEPENDENCIES_MISSING",
                "The Hunyuan3D model has not been loaded yet. Start the service with "
                "HUNYUAN3D_PRELOAD=1, or POST to /load to trigger a load, then retry.",
            )
        try:
            self.device = self.resolve_device()
        except Exception:
            self.device = "cpu"
        if self.device == "cuda" and not self._cuda_available():
            self.device = "cpu"

        import io as _io

        import torch
        from PIL import Image

        image = Image.open(_io.BytesIO(image_bytes)).convert("RGB")
        try:
            image = self.rembg(image)
        except Exception as exc:
            raise ServiceError(
                "GENERATION_FAILED",
                f"Background removal failed while preparing the image ({exc}).",
            ) from exc

        generator = torch.Generator(self.device).manual_seed(cfg.config.seed)
        started = time.time()
        try:
            try:
                mesh = self.pipeline(
                    image=image,
                    generator=generator,
                    octree_resolution=cfg.config.octree_resolution,
                    num_inference_steps=cfg.config.num_inference_steps,
                    guidance_scale=cfg.config.guidance_scale,
                )
                if isinstance(mesh, (list, tuple)):
                    mesh = mesh[0]
            except Exception as exc:
                if "out of memory" in str(exc).lower():
                    raise ServiceError(
                        "GENERATION_FAILED",
                        "CUDA ran out of memory during generation. Lower "
                        f"HUNYUAN3D_OCTREE_RESOLUTION (currently {cfg.config.octree_resolution}), "
                        "keep texture generation off, or set HUNYUAN3D_DEVICE=cpu.",
                    ) from exc
                raise ServiceError(
                    "GENERATION_FAILED",
                    f"Hunyuan3D shape generation failed ({exc}). This often means a model "
                    "weight failed to load, CUDA ran out of memory, or the image is not "
                    "suitable for reconstruction. Check the service log for details.",
                ) from exc

            shape_seconds = time.time() - started
            if mesh is None:
                raise ServiceError("MODEL_NOT_RETURNED", "Hunyuan3D returned no mesh.")

            if cfg.config.texture_enabled and self.tex_pipeline is not None and self.face_reduction is not None:
                try:
                    floater, degenerate, reducer = self.face_reduction
                    mesh = floater()(mesh)
                    mesh = degenerate()(mesh)
                    mesh = reducer()(mesh, max_facenum=40_000)
                    mesh = self.tex_pipeline(mesh, image)
                except Exception as exc:
                    raise ServiceError(
                        "GENERATION_FAILED",
                        f"Hunyuan3D texture generation failed ({exc}).",
                    ) from exc

            model_id = str(uuid.uuid4())
            out_dir = _OUTPUTS_DIR / model_id
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / "model.glb"
            try:
                mesh.export(out_path)
            except Exception as exc:
                raise ServiceError(
                    "MODEL_NOT_RETURNED",
                    f"The generated mesh could not be exported to GLB ({exc}).",
                ) from exc
            if not out_path.is_file() or out_path.stat().st_size == 0:
                raise ServiceError(
                    "MODEL_NOT_RETURNED",
                    "Hunyuan3D completed but produced no GLB output file.",
                )
            log.info("shape generation finished in %.1fs", shape_seconds)
        finally:
            try:
                self._release_offload()
            except Exception:
                pass

        return out_path, model_id

    # ------------------------------------------------------------------ #
    # Status                                                              #
    # ------------------------------------------------------------------ #
    def describe(self) -> dict:
        cuda_available = self._cuda_available()
        device = self.device
        if not device:
            device = "cuda" if (cuda_available or cfg.config.device == "cuda") else "cpu"
        status = {
            "modelLoaded": self.pipeline is not None,
            "device": device,
            "cudaAvailable": cuda_available,
            "model": cfg.config.shape_model,
            "subfolder": cfg.config.shape_subfolder,
            "textureEnabled": cfg.config.texture_enabled,
            "outputsDir": str(_OUTPUTS_DIR),
            "availableRamGb": _available_ram_gb(),
        }
        if self.pipeline is not None:
            status["flashVdm"] = self.flash_vdm
            status["flashVdmReason"] = self.flash_vdm_reason
            status["rembgModel"] = self.rembg_reason
            status["weightsMemoryMapped"] = bool(getattr(self.pipeline, "_weight_reader", None))
        if self.load_warning:
            status["warning"] = self.load_warning
        try:
            import torch

            status["torchVersion"] = torch.__version__
            status["python"] = sys.executable
            if cuda_available:
                status["cudaVersion"] = torch.version.cuda
                status["gpuName"] = torch.cuda.get_device_name(0)
                status["gpuVramGb"] = round(
                    torch.cuda.get_device_properties(0).total_memory / 2**30, 1
                )
        except Exception:
            pass
        return status


pipeline = HunyuanPipeline()
