import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routes import calls, health

log = logging.getLogger("api")

app = FastAPI(title="Cold Call Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Client-Id"],
)


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    log.exception("Unhandled error", exc_info=exc)
    return JSONResponse({"detail": "Unexpected server error."}, status_code=500)


app.include_router(health.router)
app.include_router(calls.router)
