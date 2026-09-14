export interface ApiErrorBody {
  error: string | Record<string, unknown>;
  message?: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  ts: string;
  checks: Record<string, string>;
}
