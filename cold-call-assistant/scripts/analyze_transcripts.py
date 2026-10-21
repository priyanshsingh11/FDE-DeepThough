"""Development-time transcript analysis (run locally; not part of the deployed app).

Usage (Groq, recommended):
  export LLM_PROVIDER=groq LLM_API_KEY=gsk_... LLM_MODEL=llama-3.3-70b-versatile
Usage (Gemini):
  export LLM_PROVIDER=gemini LLM_API_KEY=... LLM_MODEL=gemini-2.0-flash
  python scripts/analyze_transcripts.py path/to/transcripts_dir

For each transcript the LLM returns structured JSON (validated with Pydantic). Every quoted example
is checked to be a verbatim substring of the source transcript, otherwise it is dropped. Counts are computed
here from the validated records, never taken from the model. Output: scripts/out/{records,stage_patterns}.json
Review the output, then merge verified patterns into backend/app/data/stages.json (and frontend copy).

Transcripts are read locally and never committed (see .gitignore).
"""
import json
import os
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import httpx
from pydantic import BaseModel, Field, ValidationError

PROMPT_VERSION = "v1"
GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
GROQ_API = "https://api.groq.com/openai/v1/chat/completions"
STAGES_FILE = Path(__file__).parent.parent / "backend/app/data/stages.json"


class Observation(BaseModel):
    stage_number: int = Field(ge=1, le=8)
    pattern: str = Field(min_length=2, max_length=80)  # short snake_case label, e.g. callback_request
    quote: str = Field(min_length=3, max_length=300)   # verbatim prospect words
    uncertain: bool = False


class TranscriptRecord(BaseModel):
    last_stage_reached: int = Field(ge=1, le=8)
    final_outcome: str = Field(max_length=80)
    agreed_next_step: str | None = None
    observations: list[Observation]


def build_prompt(text: str) -> str:
    stages = json.loads(STAGES_FILE.read_text())["stages"]
    names = "\n".join(f'{s["stage_number"]}. {s["name"]}' for s in stages)
    return (
        "You analyse a recorded cold-call transcript. Stages of the call:\n" + names + "\n\n"
        "Return JSON: {last_stage_reached:int, final_outcome:str, agreed_next_step:str|null, "
        "observations:[{stage_number:int, pattern:str (short snake_case), quote:str (EXACT prospect words copied "
        "from the transcript), uncertain:bool}]}. Do not assume every stage occurs. Set uncertain=true when the "
        "stage mapping is ambiguous. Only quote the prospect.\n\nTRANSCRIPT:\n" + text
    )


def _extract(r: httpx.Response) -> dict:
    """Pull the JSON text out of either provider's response shape."""
    j = r.json()
    if "choices" in j:                      # Groq / OpenAI-compatible
        return json.loads(j["choices"][0]["message"]["content"])
    return json.loads(j["candidates"][0]["content"]["parts"][0]["text"])   # Gemini


def _post(url: str, headers: dict, body: dict) -> httpx.Response:
    return httpx.post(url, headers=headers, json=body, timeout=90)


def call_llm(prompt: str, model: str, key: str, provider: str, retries: int = 4) -> dict:
    if provider == "groq":
        url = GROQ_API
        headers = {"Authorization": f"Bearer {key}"}
        body = {"model": model, "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": prompt}]}
    else:
        url = GEMINI_API.format(model=model, key=key)
        headers = {}
        body = {"contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}

    for attempt in range(retries):
        try:
            r = _post(url, headers, body)
            if r.status_code in (429, 500, 503):
                raise httpx.HTTPError(f"transient {r.status_code}")
            r.raise_for_status()
            return _extract(r)
        except (httpx.HTTPError, KeyError, json.JSONDecodeError):
            if attempt == retries - 1:
                raise
            time.sleep(2 ** (attempt + 1))
    raise RuntimeError("unreachable")


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    key = os.environ.get("LLM_API_KEY")
    provider = os.environ.get("LLM_PROVIDER", "groq").lower()
    default_model = "llama-3.3-70b-versatile" if provider == "groq" else "gemini-2.0-flash"
    model = os.environ.get("LLM_MODEL", default_model)
    if not key:
        sys.exit("LLM_API_KEY is not set")
    files = sorted(p for p in Path(sys.argv[1]).rglob("*") if p.suffix.lower() in {".txt", ".md", ".json"})
    print(f"{len(files)} transcript files")

    records, failures = [], []
    for p in files:
        text = p.read_text(errors="ignore")
        try:
            rec = TranscriptRecord(**call_llm(build_prompt(text), model, key, provider))
        except (ValidationError, httpx.HTTPError, KeyError, json.JSONDecodeError) as e:
            failures.append({"id": p.stem, "error": type(e).__name__})
            continue
        kept = [o for o in rec.observations if o.quote.strip().lower() in text.lower()]  # verbatim check
        records.append({"id": p.stem, **rec.model_dump(exclude={"observations"}),
                        "observations": [o.model_dump() for o in kept],
                        "dropped_unverified_quotes": len(rec.observations) - len(kept)})
        print(f"ok {p.name}")

    by_stage: dict[int, dict[str, list]] = defaultdict(lambda: defaultdict(list))
    for r in records:
        for o in r["observations"]:
            by_stage[o["stage_number"]][o["pattern"]].append((r["id"], o["quote"], o["uncertain"]))
    patterns = {
        str(n): sorted(
            ({"label": lbl, "count": len(set(i for i, _, _ in ex)),  # transcripts, not mentions
              "uncertain_count": sum(1 for *_, u in ex if u),
              "examples": [{"quote": q, "source_transcript_id": i} for i, q, _ in ex[:3]]}
             for lbl, ex in pats.items()), key=lambda x: -x["count"])
        for n, pats in sorted(by_stage.items())
    }
    out = Path(__file__).parent / "out"
    out.mkdir(exist_ok=True)
    meta = {"provider": provider, "model": model, "prompt_version": PROMPT_VERSION, "analyzed": len(records), "failed": failures,
            "last_stage_distribution": dict(Counter(r["last_stage_reached"] for r in records))}
    (out / "records.json").write_text(json.dumps({"meta": meta, "records": records}, indent=2))
    (out / "stage_patterns.json").write_text(json.dumps({"meta": meta, "stages": patterns}, indent=2))
    print(f"analyzed {len(records)}, failed {len(failures)} -> {out}")


if __name__ == "__main__":
    main()
