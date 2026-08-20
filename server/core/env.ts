/** Portable runtime configuration for any Node host. */
export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  appPassword: process.env.APP_PASSWORD ?? "",
  appUsername: process.env.APP_USERNAME ?? "admin",
  ownerName: process.env.APP_OWNER_NAME ?? "Admin",
  ownerEmail: process.env.APP_OWNER_EMAIL ?? null,
  appBaseUrl: process.env.APP_BASE_URL ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  llmBaseUrl: (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
  llmModel: process.env.LLM_MODEL ?? "gpt-4o-mini",
  alertEmail: process.env.OUTREACH_ALERT_EMAIL ?? null,
  isProduction: process.env.NODE_ENV === "production",
};

export function requireEnv(value: string, label: string) {
  if (!value) throw new Error(`${label} környezeti változó nincs beállítva.`);
  return value;
}
