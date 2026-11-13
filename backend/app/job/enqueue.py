from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.jobs import Job

ACTIVE_STATUSES = ("pending", "running")

def enqueue_job(db: Session, user_id: int, job_type: str, payload: dict | None = None, run_after: datetime | None = None):
    payload = payload or {}

    existing = db.scalar(
        select(Job).where(
            Job.user_id == user_id,
            Job.type == job_type,
            Job.payload == payload,
            Job.status.in_(ACTIVE_STATUSES)
        )
    )

    if existing:
        return existing

    job = Job(user_id=user_id, type=job_type, payload=payload, run_after=run_after if run_after is not None else datetime.now(UTC))
    db.add(job)
    db.flush()
    return job

# For specific jobs that need to be enqueued without an endpoint

def enqueue_tachi_check(db, user_id: int, tachi_key: str) -> Job:
    return enqueue_job(db, user_id, "tachi_key_valid", {"key": tachi_key})

# This needs adjustment, I have no idea why I hardcoded this as playtype 7k lmao.
def enqueue_tachi_seed(db, user_id: int) -> Job:
    return enqueue_job(db, user_id, "tachi_seed_profile", {"playtype": "7k"})

def enqueue_match_final_check(db, user_id: int, match_id: int, match_cutoff: datetime) -> Job:
    return enqueue_job(db, user_id, "match_end_check", {"matchId": match_id}, run_after=match_cutoff)

def enqueue_match_pre_submission(db, user_id: int, match_id: int) -> Job:
    return enqueue_job(db, user_id, "match_pre_submission", {"matchId": match_id})

def enqueue_match_forfeit(db, user_id: int, match_id: int) -> Job:
    return enqueue_job(db, user_id, "match_forfeit", {"matchId": match_id})

def enqueue_match_cleanup(db, user_id: int) -> Job:
    return enqueue_job(db, user_id, "match_cleanup")

def enqueue_send_verify_email(db, user_id: int) -> Job:
    return enqueue_job(db, user_id, "send_verify_email")