"""Call lifecycle rules. Deterministic; the LLM never touches this."""
from datetime import datetime, timezone

from fastapi import HTTPException

from ..schemas import AdvanceIn, CallCreate, CloseIn, StageResultIn
from ..stages import OUTCOMES, valid_results
from .database import Repo


def _open_call(repo: Repo, owner: str, call_id: str) -> dict:
    call = repo.get_call(owner, call_id)
    if not call:
        raise HTTPException(404, "Call not found.")
    if call["status"] != "in_progress":
        raise HTTPException(409, "Call is already closed.")
    return call


def start_call(repo: Repo, owner: str, body: CallCreate) -> dict:
    return repo.create_call(owner, body.model_dump())


def save_stage(repo: Repo, owner: str, call_id: str, body: StageResultIn) -> tuple[dict, bool]:
    call = _open_call(repo, owner, call_id)
    if body.selected_result not in valid_results(body.stage_number):
        raise HTTPException(400, "Invalid result for this stage.")
    if body.stage_number > call["current_stage"]:
        raise HTTPException(409, "Stage has not been reached yet.")
    return repo.upsert_result(call_id, body.model_dump())


def advance(repo: Repo, owner: str, call_id: str, body: AdvanceIn) -> dict:
    call = _open_call(repo, owner, call_id)
    if body.stage_number > call["current_stage"] + 1:
        raise HTTPException(409, "Stages cannot be skipped.")
    if body.stage_number <= call["current_stage"]:
        return call  # last stage reached never moves backwards
    return repo.update_call(owner, call_id, {"current_stage": body.stage_number})


def close_call(repo: Repo, owner: str, call_id: str, body: CloseIn) -> dict:
    _open_call(repo, owner, call_id)
    if body.outcome not in OUTCOMES:
        raise HTTPException(400, "Invalid outcome.")
    # current_stage deliberately untouched: it records the last stage actually reached.
    return repo.update_call(owner, call_id, {
        "status": "completed", "outcome": body.outcome, "close_notes": body.notes,
        "ended_at": datetime.now(timezone.utc).isoformat()})
