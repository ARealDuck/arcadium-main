from app.config import settings
from app.mainrouter import api_router
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.include_router(api_router)
app.mount("/api/media", StaticFiles(directory=settings.media_dir), name="media")

@app.get("/health")
def health():
    return { "status": "ok" }