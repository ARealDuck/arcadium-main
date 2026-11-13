from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func

from app.api.dependencies import CurrentUser, DbSession
from app.job.enqueue import enqueue_job
from app.models import Job
from app.schemas.job import JobOut

router = APIRouter(prefix="/jobs", tags=["jobs"])

def check_tachi_key(user: CurrentUser):
    if not user.tachi_api_key:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Link your Bokutachi account first!")

@router.post("/tachi-recent-score", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
def request_tachi_recent_score(user: CurrentUser, db: DbSession):
    check_tachi_key(user)

    job = enqueue_job(db, user.id, "tachi_recent_score", {"playtype": "7k"})
    db.commit()
    return job

@router.post("/tachi-rating", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
def request_tachi_rating(user: CurrentUser, db: DbSession):
    check_tachi_key(user)

    job = enqueue_job(db, user.id, "tachi_rating", {"playtype": "7k"})
    db.commit()
    return job

@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, user: CurrentUser, db: DbSession):
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")

    return job

@router.post("/{job_id}/retry", response_model=JobOut)
def retry_job(job_id: int, user: CurrentUser, db: DbSession):
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND)

    job.status = "pending"
    job.run_after = func.now()
    job.error = None

    db.commit()
    db.refresh(job)

    return job