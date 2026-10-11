"""Service-level error type shared across the local Hunyuan3D service."""
from __future__ import annotations

SERVICE_ERROR_CODES = {
    "INVALID_IMAGE_TYPE": 400,
    "IMAGE_TOO_LARGE": 400,
    "EMPTY_IMAGE": 400,
    "VALIDATION_FAILED": 400,
    "GENERATION_IN_PROGRESS": 409,
    "SERVICE_BUSY": 429,
    "DEPENDENCIES_MISSING": 503,
    "GPU_UNAVAILABLE": 503,
    "MODEL_DOWNLOAD_FAILED": 503,
    "MODEL_LOAD_FAILED": 503,
    "NOT_FOUND": 404,
    "GENERATION_FAILED": 500,
    "MODEL_NOT_RETURNED": 500,
}


class ServiceError(Exception):
    """An error that can be turned into a structured HTTP response."""

    def __init__(self, code: str, message: str, status: int | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status or SERVICE_ERROR_CODES.get(code, 500)

    def to_json(self) -> dict:
        return {"ok": False, "code": self.code, "error": self.message}