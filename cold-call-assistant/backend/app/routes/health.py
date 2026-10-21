from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict:
    # Process health only: deliberately does not touch the database or the LLM.
    return {"status": "ok", "service": "cold-call-assistant-api"}
