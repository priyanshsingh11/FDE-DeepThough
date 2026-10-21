"""Storage backends. SupabaseRepo is used when credentials are set; MemoryRepo otherwise
(local development and tests only: data is lost on restart)."""
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional, Protocol

from ..config import get_settings


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Repo(Protocol):
    def create_call(self, owner_id: str, data: dict) -> dict: ...
    def get_call(self, owner_id: str, call_id: str) -> Optional[dict]: ...
    def update_call(self, owner_id: str, call_id: str, fields: dict) -> Optional[dict]: ...
    def list_calls(self, owner_id: str, limit: int, offset: int) -> list[dict]: ...
    def list_results(self, call_id: str) -> list[dict]: ...
    def upsert_result(self, call_id: str, data: dict) -> tuple[dict, bool]: ...


class MemoryRepo:
    def __init__(self) -> None:
        self.calls: dict[str, dict] = {}
        self.results: dict[tuple[str, int], dict] = {}

    def create_call(self, owner_id, data):
        now = _now()
        row = {"id": str(uuid.uuid4()), "owner_id": owner_id, "status": "in_progress", "current_stage": 1,
               "outcome": None, "close_notes": None, "ended_at": None, "started_at": now,
               "created_at": now, "updated_at": now, **data}
        self.calls[row["id"]] = row
        return dict(row)

    def get_call(self, owner_id, call_id):
        row = self.calls.get(call_id)
        return dict(row) if row and row["owner_id"] == owner_id else None

    def update_call(self, owner_id, call_id, fields):
        row = self.calls.get(call_id)
        if not row or row["owner_id"] != owner_id:
            return None
        row.update(fields, updated_at=_now())
        return dict(row)

    def list_calls(self, owner_id, limit, offset):
        rows = sorted((r for r in self.calls.values() if r["owner_id"] == owner_id),
                      key=lambda r: (r["created_at"], r["id"]), reverse=True)
        return [dict(r) for r in rows[offset:offset + limit]]

    def list_results(self, call_id):
        return sorted((dict(r) for (cid, _), r in self.results.items() if cid == call_id),
                      key=lambda r: r["stage_number"])

    def upsert_result(self, call_id, data):
        key = (call_id, data["stage_number"])
        existing = self.results.get(key)
        now = _now()
        if existing:
            existing.update(data, updated_at=now)
            return dict(existing), False
        row = {"id": str(uuid.uuid4()), "call_id": call_id, "created_at": now, "updated_at": now, **data}
        self.results[key] = row
        return dict(row), True


class SupabaseRepo:
    def __init__(self, url: str, key: str) -> None:
        from supabase import create_client

        self.db = create_client(url, key)

    def create_call(self, owner_id, data):
        res = self.db.table("calls").insert({"owner_id": owner_id, **data}).execute()
        return res.data[0]

    def get_call(self, owner_id, call_id):
        res = self.db.table("calls").select("*").eq("id", call_id).eq("owner_id", owner_id).execute()
        return res.data[0] if res.data else None

    def update_call(self, owner_id, call_id, fields):
        res = (self.db.table("calls").update({**fields, "updated_at": _now()})
               .eq("id", call_id).eq("owner_id", owner_id).execute())
        return res.data[0] if res.data else None

    def list_calls(self, owner_id, limit, offset):
        res = (self.db.table("calls").select("*").eq("owner_id", owner_id)
               .order("created_at", desc=True).order("id", desc=True)
               .range(offset, offset + limit - 1).execute())
        return res.data

    def list_results(self, call_id):
        res = (self.db.table("call_stage_results").select("*").eq("call_id", call_id)
               .order("stage_number").execute())
        return res.data

    def upsert_result(self, call_id, data):
        existing = (self.db.table("call_stage_results").select("id").eq("call_id", call_id)
                    .eq("stage_number", data["stage_number"]).execute()).data
        res = (self.db.table("call_stage_results")
               .upsert({"call_id": call_id, **data, "updated_at": _now()}, on_conflict="call_id,stage_number")
               .execute())
        return res.data[0], not existing


@lru_cache
def get_repo() -> Repo:
    s = get_settings()
    if s.supabase_url and s.supabase_service_role_key:
        return SupabaseRepo(s.supabase_url, s.supabase_service_role_key)
    return MemoryRepo()
