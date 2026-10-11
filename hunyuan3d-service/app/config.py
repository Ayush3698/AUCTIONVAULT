"""Runtime configuration for the local Hunyuan3D service.

Every setting can be overridden with an environment variable so that the
service can be configured without touching code. All defaults are tuned for a
low-end local GPU (4–8 GB VRAM): the lightweight Hunyuan3D-2mini-Turbo shape
model is used and, by default, texture generation (which needs ~16 GB VRAM) is
disabled.
"""
from __future__ import annotations

import os
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        return default


def _bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


class Config:
    # HTTP server
    host: str = os.environ.get("HUNYUAN3D_HOST", "127.0.0.1")
    port: int = _int("HUNYUAN3D_PORT", 8000)

    # Where the official Hunyuan3D-2 repository lives. The service imports the
    # repo's `hy3dgen` package, so this folder must contain the cloned repo with
    # its Python requirements installed.
    hunyuan3d_root: Path = Path(os.environ.get("HUNYUAN3D_ROOT", str(SERVICE_ROOT / "Hunyuan3D-2")))

    # Accelerator. "auto" prefers CUDA and falls back to CPU.
    device: str = os.environ.get("HUNYUAN3D_DEVICE", "auto").strip()
    texture_enabled: bool = _bool("HUNYUAN3D_TEXTURE", False)

    # Replace the bundled VAE with the larger turbo VAE (enable_flashvdm). It
    # needs ~4 GB more system RAM, so "auto" turns it off when RAM is tight.
    flash_vdm: str = os.environ.get("HUNYUAN3D_FLASH_VDM", "auto").strip().lower() or "auto"

    # rembg segmentation checkpoint. "auto" keeps the Hunyuan3D default
    # (bria-rmbg, ~1 GB) but drops to the much lighter u2net (~176 MB) when
    # system memory is tight.
    rembg_model: str = os.environ.get("HUNYUAN3D_REMBG_MODEL", "auto").strip() or "auto"

    # Model identifiers (Hugging Face ids + subfolders inside the repo).
    shape_model: str = os.environ.get("HUNYUAN3D_MODEL", "tencent/Hunyuan3D-2mini")
    shape_subfolder: str = os.environ.get("HUNYUAN3D_SUBFOLDER", "hunyuan3d-dit-v2-mini-turbo")
    tex_model: str = os.environ.get("HUNYUAN3D_TEX_MODEL", "tencent/Hunyuan3D-2")

    # Generation parameters (mirrors the official api_server.py defaults).
    octree_resolution: int = _int("HUNYUAN3D_OCTREE_RESOLUTION", 128)
    num_inference_steps: int = _int("HUNYUAN3D_STEPS", 5)
    guidance_scale: float = _float("HUNYUAN3D_GUIDANCE", 5.0)
    seed: int = _int("HUNYUAN3D_SEED", 1234)

    # Preload models on startup (adds ~10-20 s at boot, removes it from the
    # first request). Recommended for development.
    preload_model: bool = _bool("HUNYUAN3D_PRELOAD", False)

    # Upload limits / storage.
    max_image_bytes: int = _int("HUNYUAN3D_MAX_IMAGE_MB", 10) * 1_000_000
    outputs_dir: Path = Path(os.environ.get("HUNYUAN3D_OUTPUTS", str(SERVICE_ROOT / "outputs")))

    @property
    def is_cuda_enabled(self) -> bool:
        return self.device == "cuda"


config = Config()