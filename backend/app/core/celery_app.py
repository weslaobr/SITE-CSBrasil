import os
from celery import Celery

# Celery Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "tropa_tracker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.match_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    # Worker settings
    worker_concurrency=4,
    worker_prefetch_multiplier=1
)

# Phase 2: Celery Beat Schedule
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "sync-matches-every-4-hours": {
        "task": "sync_all_users_task",
        "schedule": crontab(minute=0, hour="*/4"), 
    },
}
