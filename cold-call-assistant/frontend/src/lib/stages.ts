import raw from "@/data/stages.json";
import type { StageData } from "./types";

export const stageData = raw as StageData;
export const STAGES = stageData.stages;
export const OUTCOMES = stageData.outcomes;

export const outcomeLabel = (v: string | null) => (v ? OUTCOMES.find((o) => o.value === v)?.label ?? v : "—");
export const resultLabel = (stage: number, v: string) =>
  STAGES[stage - 1]?.result_options.find((o) => o.value === v)?.label ?? v;
