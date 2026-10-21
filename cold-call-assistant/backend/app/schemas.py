from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _clean(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    return v or None


class CallCreate(BaseModel):
    prospect_name: Optional[str] = Field(None, max_length=200)
    company_name: Optional[str] = Field(None, max_length=200)

    _strip = field_validator("prospect_name", "company_name")(_clean)


class StageResultIn(BaseModel):
    stage_number: int = Field(..., ge=1, le=8)
    selected_result: str = Field(..., min_length=1, max_length=64)
    prospect_words: Optional[str] = Field(None, max_length=5000)
    notes: Optional[str] = Field(None, max_length=5000)

    _strip = field_validator("prospect_words", "notes")(_clean)


class AdvanceIn(BaseModel):
    stage_number: int = Field(..., ge=1, le=8)


class CloseIn(BaseModel):
    outcome: str = Field(..., min_length=1, max_length=64)
    notes: Optional[str] = Field(None, max_length=5000)

    _strip = field_validator("notes")(_clean)


class StageResultOut(BaseModel):
    id: str
    call_id: str
    stage_number: int
    selected_result: str
    prospect_words: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CallOut(BaseModel):
    id: str
    prospect_name: Optional[str] = None
    company_name: Optional[str] = None
    status: str
    current_stage: int
    outcome: Optional[str] = None
    close_notes: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None


class CallDetail(CallOut):
    stage_results: list[StageResultOut]


class CallList(BaseModel):
    items: list[CallOut]
    limit: int
    offset: int
