"""
app/main.py
ASX Portfolio OS - Main FastAPI application.

This is the entry point for the API. All route handlers are organized
in separate modules under app/routes/.
"""

import os
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from slowapi.errors import RateLimitExceeded

from app.core import logger
from app.routes import (
    health, refresh, model, portfolio, loan, signals, insights, fusion, jobs, drift,
    portfolio_management, fundamentals, ensemble, auth_routes, user_routes,
    notification_routes, search, watchlist, prices, sentiment, news
)
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler

# Initialize Sentry (if DSN provided)
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    SENTRY_DSN = os.getenv("SENTRY_DSN")
    if SENTRY_DSN:
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            # Set traces_sample_rate to capture 10% of transactions for performance monitoring
            traces_sample_rate=0.1,
            # Set profiles_sample_rate to profile 10% of sampled transactions
            profiles_sample_rate=0.1,
            environment=os.getenv("RENDER_ENV", "production"),
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            # Automatically capture breadcrumbs (logs, HTTP requests, DB queries)
            enable_tracing=True,
        )
        logger.info("✅ Sentry error tracking initialized")
    else:
        logger.warning("⚠️ SENTRY_DSN not set - error tracking disabled")
except ImportError:
    logger.warning("⚠️ sentry-sdk not installed - error tracking disabled")

# Initialize FastAPI app
app = FastAPI(title="ASX Portfolio OS", version="0.4.0")

# CORS configuration - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        # Production frontend (Vercel)
        "https://asx-portfolio-os.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting configuration
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


@app.get("/")
def home():
    """Root endpoint."""
    return {"message": "ASX Portfolio OS API is running ✅"}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    logger.info("➡️ %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
        logger.info("⬅️ %s %s", response.status_code, request.url.path)
        return response
    except Exception as e:
        logger.exception("💥 Exception during %s %s: %s", request.method, request.url.path, e)
        raise


# Include all route modules
app.include_router(health.router)
app.include_router(auth_routes.router)  # Authentication (login, register, token management)
app.include_router(user_routes.router)  # User management (settings, preferences, profile)
app.include_router(notification_routes.router)  # Notifications
app.include_router(notification_routes.alert_router)  # Alert preferences
app.include_router(search.router)  # Stock search and autocomplete
app.include_router(watchlist.router)  # User watchlist management
app.include_router(prices.router)  # Historical price data for charts
app.include_router(refresh.router)
app.include_router(model.router)
app.include_router(portfolio.router)
app.include_router(portfolio_management.router)  # User portfolio management (upload, holdings, rebalancing)
app.include_router(loan.router)
app.include_router(signals.router)
app.include_router(insights.router)
app.include_router(fusion.router)
app.include_router(jobs.router)
app.include_router(drift.router)
app.include_router(fundamentals.router)  # V2: Fundamental analysis endpoints
app.include_router(ensemble.router)  # V2: Ensemble signals (Model A + Model B)
app.include_router(sentiment.router)  # V2: Sentiment analysis (Model C)
app.include_router(news.router)  # V2: News scraping and sentiment


@app.get("/openapi-actions.json", include_in_schema=False)
def openapi_actions(request: Request):
    """Generate OpenAPI schema for ChatGPT Actions integration."""
    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    host = request.headers.get("host")
    if host:
        schema["servers"] = [{"url": f"https://{host}"}]
    else:
        schema["servers"] = [{"url": "http://127.0.0.1:8788"}]

    schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["ApiKeyAuth"] = {
        "type": "apiKey",
        "in": "header",
        "name": "x-api-key",
    }

    allowed_paths = {
        "/health",
        # Authentication endpoints
        "/auth/login",
        "/auth/register",
        "/auth/me",
        "/auth/refresh",
        "/auth/logout",
        # User management endpoints
        "/users/me",
        "/users/me/settings",
        "/users/me/password",
        # Notification endpoints
        "/notifications",
        "/notifications/{notification_id}/read",
        "/notifications/{notification_id}",
        "/notifications/mark-all-read",
        # Alert preferences
        "/alerts/preferences",
        "/alerts/preferences/{alert_type}",
        "/dashboard/model_a_v1_1",
        "/model/status/summary",
        "/model/compare",
        "/signals/live",
        "/property/valuation",
        "/loan/simulate",
        "/loan/summary",
        "/portfolio/attribution",
        "/portfolio/overview",
        "/portfolio/risk",
        "/portfolio/allocation",
        "/portfolio/refresh",
        "/portfolio/performance",
        "/portfolio/upload",  # User portfolio CSV upload
        "/portfolio",  # Get user holdings
        "/portfolio/rebalancing",  # AI rebalancing suggestions
        "/portfolio/risk-metrics",  # Portfolio risk calculations
        "/stock/{code}/history",  # Historical price data for charts
        "/jobs/history",
        "/jobs/summary",
        "/drift/summary",
        "/drift/features",
        "/drift/history",
        "/jobs/health",
        "/ingest/asx_announcements",
        "/insights/asx_announcements",
        "/assistant/chat",
        "/model/explainability",
        # V2: Fundamental analysis endpoints
        "/fundamentals/metrics",
        "/fundamentals/quality",
        "/signals/model_b/latest",
        "/signals/model_b/{ticker}",
        # V2: Ensemble endpoints
        "/signals/ensemble/latest",
        "/signals/ensemble/{ticker}",
        "/signals/compare",
    }
    schema["paths"] = {p: v for p, v in schema["paths"].items() if p in allowed_paths}

    # Add Bearer token security scheme
    schema["components"]["securitySchemes"]["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }

    # Public endpoints (no auth required)
    public_paths = {"/health", "/auth/login", "/auth/register"}

    for path, ops in schema["paths"].items():
        for op in ops.values():
            if path in public_paths:
                op["security"] = []
            else:
                # Support both API key and Bearer token auth
                op["security"] = [{"ApiKeyAuth": []}, {"BearerAuth": []}]

    return schema
