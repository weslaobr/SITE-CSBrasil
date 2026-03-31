from app.core.celery_app import celery_app
from app.tasks.match_tasks import process_match_task

if __name__ == "__main__":
    celery_app.start()
