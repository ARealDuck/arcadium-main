import time
import traceback

from sqlalchemy import func, select

from app.core.db import SessionLocal
from app.job.handlers import HANDLERS, JobError
from app.models import Job

REQUESTS_PER_MINUTE = 60
DELAY_BETWEEN_JOBS = 60 / REQUESTS_PER_MINUTE
IDLE_WAIT = 1

def claim_next_job(db):
    job = db.scalar(
        select(Job)
        .where(
            Job.status == "pending",
            Job.run_after <= func.now()
            )
        .order_by(Job.run_after)
        .limit(1)
        .with_for_update(skip_locked=True)
    )

    if job is None:
        return None;

    job.status = "running"
    job.started_at = func.now()
    job.attempts += 1
    db.commit()
    return job

def run_job(db, job):
    handler = HANDLERS.get(job.type)

    try:
        if handler is None:
            raise JobError(f"Unknown job type: {job.type}")
        result = handler(db, job)
        job.status = "done"
        job.result = result
    except JobError as e:
        db.rollback()
        job.status = "failed"
        job.error = str(e)
    except Exception as e: # noqa: BLE001 - worker must survive any job failure
        db.rollback()
        traceback.print_exc()
        job.status = "failed"
        job.error = "Something went wrong while processing this job"
        print(f"Job {job.id} crashed: {e!r}", flush=True)

    job.finished_at = func.now()
    db.commit()

def main():
    print("Worker started", flush=True)
    while True:
        with SessionLocal() as db:
            job = claim_next_job(db)
            if job is None:
                time.sleep(IDLE_WAIT)
                continue

            print(f"Running job {job.id} ({job.type})", flush=True)
            run_job(db, job)
            print(f"Job {job.id} finished: {job.status}", flush=True)

        time.sleep(DELAY_BETWEEN_JOBS)

if __name__ == "__main__":
    main()