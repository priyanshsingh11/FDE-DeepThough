export type Option = { value: string; label: string };
export type CommonResponse = { text: string; pattern?: string; source_transcript_id?: string };
export type Stage = {
  stage_number: number; name: string; purpose: string; guidance: string[];
  common_responses: CommonResponse[]; result_options: Option[];
};
export type StageData = { verified: boolean; notice: string; outcomes: Option[]; stages: Stage[] };

export type Call = {
  id: string; prospect_name: string | null; company_name: string | null;
  status: "in_progress" | "completed"; current_stage: number; outcome: string | null;
  close_notes: string | null; started_at: string; ended_at: string | null;
};
export type StageResult = {
  id: string; call_id: string; stage_number: number; selected_result: string;
  prospect_words: string | null; notes: string | null; created_at: string; updated_at: string;
};
export type CallDetail = Call & { stage_results: StageResult[] };
