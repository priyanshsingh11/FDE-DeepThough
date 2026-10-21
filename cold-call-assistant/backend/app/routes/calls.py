import re
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from .. import schemas
from ..services import call_service
from ..services.database import Repo, get_repo

router = APIRouter(prefix="/api")

_ID = re.compile(r"^[A-Za-z0-9-]{8,64}$")


def owner_id(x_client_id: Annotated[str | None, Header()] = None) -> str:
    """Anonymous per-browser identity. Isolates demo visitors from one another; it is not authentication."""
    if not x_client_id or not _ID.match(x_client_id):
        raise HTTPException(400, "Missing or invalid X-Client-Id header.")
    return x_client_id


Owner = Annotated[str, Depends(owner_id)]
RepoDep = Annotated[Repo, Depends(get_repo)]


def _uuid(call_id: str) -> str:
    if not re.match(r"^[0-9a-fA-F-]{36}$", call_id):
        raise HTTPException(404, "Call not found.")
    return call_id


@router.post("/calls", response_model=schemas.CallOut, status_code=201)
def start_call(body: schemas.CallCreate, owner: Owner, repo: RepoDep):
    return call_service.start_call(repo, owner, body)


@router.get("/calls", response_model=schemas.CallList)
def list_calls(owner: Owner, repo: RepoDep, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    return {"items": repo.list_calls(owner, limit, offset), "limit": limit, "offset": offset}


@router.get("/calls/{call_id}", response_model=schemas.CallDetail)
def get_call(call_id: str, owner: Owner, repo: RepoDep):
    call = repo.get_call(owner, _uuid(call_id))
    if not call:
        raise HTTPException(404, "Call not found.")
    return {**call, "stage_results": repo.list_results(call_id)}


@router.post("/calls/{call_id}/stages", response_model=schemas.StageResultOut)
def save_stage(call_id: str, body: schemas.StageResultIn, owner: Owner, repo: RepoDep):
    from fastapi.responses import JSONResponse
    from fastapi.encoders import jsonable_encoder

    row, created = call_service.save_stage(repo, owner, _uuid(call_id), body)
    out = schemas.StageResultOut(**row)
    return JSONResponse(jsonable_encoder(out), status_code=201 if created else 200)


@router.post("/calls/{call_id}/advance", response_model=schemas.CallOut)
def advance(call_id: str, body: schemas.AdvanceIn, owner: Owner, repo: RepoDep):
    return call_service.advance(repo, owner, _uuid(call_id), body)


@router.post("/calls/{call_id}/close", response_model=schemas.CallOut)
def close_call(call_id: str, body: schemas.CloseIn, owner: Owner, repo: RepoDep):
    return call_service.close_call(repo, owner, _uuid(call_id), body)
