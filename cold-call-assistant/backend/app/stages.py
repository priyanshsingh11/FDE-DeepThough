import json
from pathlib import Path

_DATA = json.loads((Path(__file__).parent / "data" / "stages.json").read_text())

STAGES: dict[int, dict] = {s["stage_number"]: s for s in _DATA["stages"]}
OUTCOMES: set[str] = {o["value"] for o in _DATA["outcomes"]}


def valid_results(stage_number: int) -> set[str]:
    return {o["value"] for o in STAGES[stage_number]["result_options"]}
