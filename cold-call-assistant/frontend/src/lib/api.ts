import type { Call, CallDetail, StageResult } from "./types";

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function clientId(): string {
  try {
    let id = localStorage.getItem("cca_client_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("cca_client_id", id); }
    return id;
  } catch { return "anonymous-session"; }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-Client-Id": clientId(), ...init?.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. It may be waking up — try again in a few seconds.", 0);
  }
  if (!res.ok) {
    let detail = "Something went wrong.";
    try {
      const j = await res.json();
      detail = typeof j.detail === "string" ? j.detail : "Invalid request.";
    } catch {}
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  startCall: (b: { prospect_name?: string; company_name?: string }) => req<Call>("/api/calls", post(b)),
  getCall: (id: string) => req<CallDetail>(`/api/calls/${id}`),
  listCalls: (limit = 50, offset = 0) =>
    req<{ items: Call[]; limit: number; offset: number }>(`/api/calls?limit=${limit}&offset=${offset}`),
  saveStage: (id: string, b: { stage_number: number; selected_result: string; prospect_words?: string; notes?: string }) =>
    req<StageResult>(`/api/calls/${id}/stages`, post(b)),
  advance: (id: string, stage_number: number) => req<Call>(`/api/calls/${id}/advance`, post({ stage_number })),
  closeCall: (id: string, b: { outcome: string; notes?: string }) => req<Call>(`/api/calls/${id}/close`, post(b)),
};
