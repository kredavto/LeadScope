import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import router
from app.config import settings

app = FastAPI(
    title=f"{settings.app_name} API",
    version="1.0.0",
    description=(
        "Lead intelligence with provenance, consent and policy enforcement. "
        "Technical controls require jurisdiction-specific legal review."
    ),
    docs_url="/docs",
    openapi_url="/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Tenant-ID",
        "Idempotency-Key",
        "X-CSRF-Token",
        "X-Webhook-Timestamp",
        "X-Webhook-Signature",
    ],
)

request_windows: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def security_and_rate_limit(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    key = f"{request.client.host if request.client else 'unknown'}:{request.url.path}"
    now = time.monotonic()
    window = request_windows[key]
    while window and window[0] < now - 60:
        window.popleft()
    limit = 30 if request.url.path.endswith("/auth/login") else 180
    if len(window) >= limit:
        return JSONResponse(
            {"detail": "Rate limit exceeded"}, status_code=429, headers={"Retry-After": "60"}
        )
    window.append(now)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; frame-ancestors 'none'; object-src 'none'; "
        "script-src 'self' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:"
    )
    return response


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "healthy", "service": "api"}


app.include_router(router)
