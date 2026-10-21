"""Mirror backend/app/data/stages.json into the Supabase call_stages table.
Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/seed_stages.py"""
import json, os
from pathlib import Path
from supabase import create_client

db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
for s in json.loads((Path(__file__).parent.parent / "backend/app/data/stages.json").read_text())["stages"]:
    db.table("call_stages").upsert(s, on_conflict="stage_number").execute()
print("seeded")
