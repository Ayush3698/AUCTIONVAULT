"""Local Hunyuan3D HTTP service for the auction platform.

Endpoints:
  GET  /health                    -> status of models/GPU/dependencies
  POST /load                      -> load (or reload) the models into memory
  POST /generate (multipart)      -> image-to-3D generation
  GET  /models/{model_id}/model.glb -> serve a generated GLB back to callers

The service binds to 127.0.0.1 by default so it is never exposed to the
public internet. Use --host 0.0.0.0 only if you run it inside WSL2 / an
isolated network on purpose.

Security:
  * validate every upload (magic bytes + Pillow decode + size limit)
  * never trust or execute an uploaded filename (always renamed to a uuid)
  * no external API keys, no cloud calls, no credit usage - ever
"""
from __future__ import annotations

import argparse
import logging
import sys
import threading
import time
import traceback
import urllib.parse
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app import config as cfg
from app.errors import ServiceError
from app.pipeline import _OUTPUTS_DIR, pipeline
from app.validate import sanitize_name, validate_image

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Local Hunyuan3D Service", version="1.0.0", docs_url="/docs", redoc_url=None)

_generation_lock = threading.Lock()


@app.get("/")
def index() -> dict:
    return {
        "ok": True,
        "service": "local-hunyuan3d",
        "endpoints": ["/health", "/diagnose", "/load", "/generate", "/models/{model_id}/model.glb"],
        "device": cfg.config.device,
    }


@app.get("/health")
def health() -> JSONResponse:
    try:
        return JSONResponse({"ok": True, "status": "ok", **pipeline.describe()})
    except ServiceError as exc:
        return JSONResponse({"ok": True, "status": "degraded", "code": exc.code, "error": exc.message},
                            status_code=200)
    except Exception as exc:
        return JSONResponse({"ok": True, "status": "degraded", "error": str(exc)}, status_code=200)


@app.post("/diagnose")
def diagnose() -> JSONResponse:
    """Report why generation is or is not available, without generating anything."""
    report: dict = {"ok": True, **pipeline.describe()}
    try:
        pipeline.ensure_dependencies()
        report["hy3dgenImport"] = "ok"
    except ServiceError as exc:
        report["ok"] = False
        report["code"] = exc.code
        report["error"] = exc.message
        return JSONResponse(report, status_code=200)
    try:
        import torch

        report["torch"] = {"version": torch.__version__, "cudaAvailable": torch.cuda.is_available(),
                           "cudaVersion": torch.version.cuda}
    except ImportError as exc:
        report["ok"] = False
        report["code"] = "DEPENDENCIES_MISSING"
        report["error"] = (
            f"PyTorch is not installed for {sys.executable} ({exc}). Start the service with "
            r".venv\Scripts\python.exe server.py."
        )
    return JSONResponse(report, status_code=200)


@app.post("/load")
def load() -> JSONResponse:
    if not _generation_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Generation is already running; cannot reload now.")
    try:
        pipeline.load()
        return JSONResponse({"ok": True, **pipeline.describe()})
    except ServiceError as exc:
        return JSONResponse(status_code=exc.status, content=exc.to_json())
    finally:
        _generation_lock.release()


@app.post("/generate")
def generate(image: UploadFile = File(...), productName: str = Form(""), name: str = Form("")) -> JSONResponse:
    # Only one heavy generation at a time. A second concurrent request receives a
    # clear 409 instead of silently starving the GPU/CPU.
    if not _generation_lock.acquire(blocking=False):
        return JSONResponse(
            status_code=409,
            content={
                "ok": False,
                "code": "SERVICE_BUSY",
                "error": "Another 3D model is currently being generated on this machine. "
                         "Wait for it to finish before starting a new one.",
            },
        )
    started = time.time()
    try:
        raw = image.file.read() if hasattr(image, "file") else b""
        try:
            ext = validate_image(raw, image.content_type or "")
        except ServiceError as exc:
            return JSONResponse(status_code=exc.status, content=exc.to_json())

        # Sanitize the human-readable product name, never use the raw filename.
        label = sanitize_name(productName or name)

        if pipeline.pipeline is None:
            try:
                pipeline.load()
            except ServiceError as exc:
                return JSONResponse(status_code=exc.status, content=exc.to_json())

        out_path, model_id = pipeline.generate(raw)
        duration_s = round(time.time() - started, 1)
        size_kb = round(out_path.stat().st_size / 1024, 1)
        return JSONResponse(
            {
                "ok": True,
                "modelId": model_id,
                "filename": "model.glb",
                "sizeKb": size_kb,
                "durationSeconds": duration_s,
                "device": pipeline.device,
                "model": cfg.config.shape_model,
                "modelUrl": f"/models/{model_id}/model.glb",
                "label": label,
            }
        )
    except ServiceError as exc:
        return JSONResponse(status_code=exc.status, content=exc.to_json())
    except Exception as exc:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "code": "GENERATION_FAILED",
                "error": f"Unexpected failure in the Hunyuan3D service ({type(exc).__name__}). "
                         "Check the service log for details.",
            },
        )
    finally:
        _generation_lock.release()


@app.get("/models/{model_id}/model.glb")
def model_file(model_id: str) -> FileResponse:
    # Reject any id that escapes the outputs directory.
    parsed = urllib.parse.unquote(model_id)
    if not parsed or parsed != model_id or any(part in ("..", "") for part in parsed.split("/")):
        raise HTTPException(status_code=400, detail="Invalid model id.")
    path = _OUTPUTS_DIR / model_id / "model.glb"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Model not found.")
    return FileResponse(path, media_type="model/gltf-binary", filename="model.glb")


def _print_environment() -> None:
    """Fail loudly and usefully when the wrong interpreter started the service."""
    print(f"Python:    {sys.executable}")
    try:
        import torch

        cuda = bool(getattr(torch, "cuda", None) and torch.cuda.is_available())
        print(f"PyTorch:   {torch.__version__} (CUDA build {torch.version.cuda}, CUDA available: {cuda})")
        if cuda:
            print(f"GPU:       {torch.cuda.get_device_name(0)}")
    except ImportError as exc:
        print(f"[ERROR] PyTorch is not available for this interpreter: {exc}")
        print("        The service will start, but /generate reports DEPENDENCIES_MISSING.")
        print("        Start it with the project virtual environment instead:")
        print(r"          cd hunyuan3d-service")
        print(r"          .\.venv\Scripts\python.exe server.py")
        print("        (or just run start_hunyuan3d.bat)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Hunyuan3D service")
    parser.add_argument("--host", default=cfg.config.host)
    parser.add_argument("--port", type=int, default=cfg.config.port)
    args = parser.parse_args()

    print(f"Local Hunyuan3D service starting on http://{args.host}:{args.port}")
    _print_environment()
    print(f"Model: {cfg.config.shape_model} [{cfg.config.shape_subfolder}] "
          f"texture={'on' if cfg.config.texture_enabled else 'off'} "
          f"outputs={_OUTPUTS_DIR}")

    if cfg.config.preload_model:
        print("Preloading models...")
        try:
            pipeline.load()
            print(f"Models loaded. {pipeline.model_log}")
        except ServiceError as exc:
            print(f"[warn] Model preload failed ({exc.code}): {exc.message}")

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()