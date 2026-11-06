from fastapi import APIRouter

from app.api.routes.auth.router import router as auth_router
from app.api.routes.charts.router import router as charts_router
from app.api.routes.jobs.router import router as jobs_router
from app.api.routes.matches.router import router as matches_router
from app.api.routes.users.router import router as users_router
from app.api.routes.info.router import router as info_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(charts_router)
api_router.include_router(jobs_router)
api_router.include_router(matches_router)
api_router.include_router(users_router)
api_router.include_router(info_router)
