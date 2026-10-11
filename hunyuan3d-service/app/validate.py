"""Upload validation and filename sanitization for the local Hunyuan3D service.

Only the bytes of the uploaded image are ever handled. The client-supplied file
name is never used for anything - every stored file is renamed to a random id -
and uploaded data is never executed or passed to a shell.
"""
from __future__ import annotations

import io
import re

from PIL import Image

from app.config import config
from app.errors import ServiceError

# Extension chosen per detected image type (magic bytes, not trust of the
# declared MIME type).
_JPEG = (bytes.fromhex("FFD8FF"), ".jpg")
_PNG = (bytes.fromhex("89504E470D0A1A0A"), ".png")
_WEBP_A = (bytes.fromhex("52494646"), ".webp")
_WEBP_B = (bytes.fromhex("00000001"), ".webp")

_SUPPORTED_EXTENSIONS = {".jpg", ".png", ".webp"}
_MAGIC_CHECKS = [_JPEG, _PNG, _WEBP_A, _WEBP_B]


def _detect_extension(buffer: bytes) -> str | None:
    # WebP is "RIFF....WEBPVP8..."; sniff for the RIFF + WEBP markers.
    if len(buffer) >= 12 and buffer[:4] == b"RIFF" and buffer[8:12] == b"WEBP":
        return ".webp"
    if buffer.startswith(_JPEG[0]):
        return ".jpg"
    if buffer.startswith(_PNG[0]):
        return ".png"
    return None


def _pillow_can_decode(buffer: bytes) -> bool:
    try:
        with Image.open(io.BytesIO(buffer)) as img:
            img.verify()
        return True
    except Exception:
        return False


def sanitize_name(name: str) -> str:
    """Return a safe base name derived from a user-supplied string."""
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", name or "").strip("._")
    if not safe:
        safe = "product"
    return safe[:80]


def validate_image(buffer: bytes, declared_type: str = "") -> str:
    """Validate an uploaded image and return its safe file extension.

    Raises ServiceError with a structured code on any validation failure.
    """
    if not buffer:
        raise ServiceError("EMPTY_IMAGE", "The uploaded image is empty.")
    if len(buffer) > config.max_image_bytes:
        raise ServiceError(
            "IMAGE_TOO_LARGE",
            f"The uploaded image exceeds the maximum size of "
            f"{config.max_image_bytes // 1_000_000} MB.",
        )

    ext = _detect_extension(buffer)
    if ext not in _SUPPORTED_EXTENSIONS:
        # The declared MIME type may still be valid (e.g. a browser that names
        # jpeg differently); fall back to Pillow's decoder to be generous, but
        # never accept something Pillow cannot decode.
        declared_ok = declared_type.lower() in ("image/jpeg", "image/png", "image/webp")
        if not declared_ok or not _pillow_can_decode(buffer):
            raise ServiceError(
                "INVALID_IMAGE_TYPE",
                "Unsupported image type. The Hunyuan3D service accepts JPG, PNG and WebP "
                "images only.",
            )
        return ".jpg"

    if not _pillow_can_decode(buffer):
        raise ServiceError(
            "INVALID_IMAGE_TYPE",
            "The uploaded file is not a readable image. Only JPG, PNG and WebP are supported.",
        )
    return ext