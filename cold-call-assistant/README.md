# Cold Call Assistant

A small web app for a caller who is on the phone: it shows the current stage of an eight-stage cold call,
saves what happened at each stage as they go, lets them end the call at any point, and keeps a reviewable history.
It is **not** a dialer, voice bot, transcriber or CRM.

- **Live app (Vercel):** _TODO add URL_
- **API health (Render):** _TODO add URL_`/health`

> **Status of stage content:** the eight source materials (DeepThought guide, reference screen, 100 transcripts)
> were not available when this was scaffolded. `backend/app/data/stages.json` currently holds the spec's *working
> labels* with generic guidance, and the UI says so ("Placeholder guidance"). Replace names/purposes with the exact
> DeepThought wording and add transcript-derived `common_responses` (see *Transcript analysis*), then set
> `"verified": true`. Both copies must match: `backend/app/data/stages.json` and `frontend/src/data/stages.json`.

## Features
Live call screen (progress, purpose, guidance, stage-specific result buttons, prospect's words, notes) ·
save on every stage · save & next · end early with outcome · history with last stage/outcome/early-end flag ·
call detail with "Not reached" stages · unsaved-change warnings · retry on failure (typed text is preserved).

## Architecture
```
Browser → Next.js (Vercel) → FastAPI (Render) → Supabase Postgres
                                 └─ (no runtime LLM calls)
transcripts → scripts/analyze_transcripts.py → LLM (dev time) → reviewed JSON → stages.json
```
- Stage flow is deterministic and enforced by the backend (no skipping, last-reached never moves backwards,
  closing keeps the real last stage, closed calls are read-only → `409`).
- **Isolation:** each browser gets a random `X-Client-Id` (localStorage); every query filters by it. This keeps demo
  visitors apart but is **not authentication**; anyone who obtains an id can read that id's calls.
- `GET /health` reports process health only (no DB/LLM check).

## API
`POST /api/calls` · `GET /api/calls?limit&offset` · `GET /api/calls/{id}` · `POST /api/calls/{id}/stages` (upsert; 201/200) ·
`POST /api/calls/{id}/advance` · `POST /api/calls/{id}/close` · `GET /health`. Errors: `{"detail": "..."}`.

## Setup
### Supabase
Run `supabase/schema.sql` in the SQL editor, then optionally `python scripts/seed_stages.py` (mirrors stage reference data).
Put the project URL and **service-role key** only in Render's env.

### Backend (`backend/`)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # fill in; with no Supabase vars it uses an in-memory store (dev only)
uvicorn app.main:app --reload
```
### Frontend (`frontend/`)
```bash
cp .env.local.example .env.local
npm install && npm run dev
```
### Env vars (names only)
Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` (exact Vercel origin, comma-separated), `LLM_API_KEY`, `LLM_MODEL` (script only).
Frontend: `NEXT_PUBLIC_API_BASE_URL`.

### Deploy
Render: use `backend/render.yaml` (root `backend`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
Vercel: root `frontend`, set `NEXT_PUBLIC_API_BASE_URL`. Then set `ALLOWED_ORIGINS` on Render to the Vercel URL.

## LLM use
- **Provider/model:** Google Gemini via REST, default `gemini-2.0-flash` (set `LLM_MODEL`); prompt version `v1`.
- **Role:** development-time transcript analysis only. It does not run in the deployed app, so the live screen is fast
  and immune to rate limits, and the LLM never controls navigation, saving or closing.
- **Input/output:** one transcript in → JSON `{last_stage_reached, final_outcome, agreed_next_step, observations[stage, pattern, quote, uncertain]}`.
- **Validation:** Pydantic schema; quotes must be verbatim substrings of the source (else dropped); counts are computed
  from validated records, not by the model; retries with exponential backoff (max 4); failures are listed in output, not hidden.
- **Limitations:** stage mapping is model-judged (ambiguities flagged `uncertain`); review before publishing guidance.

## Transcript analysis
`python scripts/analyze_transcripts.py <dir>` → `scripts/out/records.json`, `stage_patterns.json`. Transcripts and
`scripts/out/` are git-ignored; publish only aggregate findings and short examples.

## Testing
`cd backend && pytest` (11 tests: lifecycle, validation, idempotent save, early close, isolation). Manual E2E:
start → save → advance → end early → history → open → refresh.

## Known limitations
Render free tier sleeps (first request is slow); free LLM quotas; anonymous-id isolation is not real auth;
in-memory fallback loses data on restart; stage content is placeholder until verified (above).
