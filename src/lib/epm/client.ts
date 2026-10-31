// Minimal client for the Oracle EPM Cloud Planning REST API (works for
// Planning / EPBCS / FCCS / Tax Reporting, which share the same API).
// Docs: https://docs.oracle.com/en/cloud/saas/enterprise-performance-management-common/prest/

export type EpmConfig = {
  baseUrl: string; // e.g. https://epm-xxxx.epm.us-phoenix-1.ocs.oraclecloud.com
  authHeader: string;
  defaultApp?: string;
};

/** Reads EPM settings from env. Returns null when not configured (demo mode). */
export function getEpmConfig(): EpmConfig | null {
  const baseUrl = process.env.EPM_URL?.replace(/\/+$/, "");
  if (!baseUrl) return null;

  let authHeader: string;
  if (process.env.EPM_ACCESS_TOKEN) {
    authHeader = `Bearer ${process.env.EPM_ACCESS_TOKEN}`;
  } else if (process.env.EPM_USERNAME && process.env.EPM_PASSWORD) {
    // Classic pods expect "identitydomain.username"; OCI pods expect just "username".
    const user = process.env.EPM_USERNAME;
    authHeader = `Basic ${Buffer.from(`${user}:${process.env.EPM_PASSWORD}`).toString("base64")}`;
  } else {
    throw new Error("EPM_URL is set but no credentials: set EPM_USERNAME/EPM_PASSWORD or EPM_ACCESS_TOKEN.");
  }

  return { baseUrl, authHeader, defaultApp: process.env.EPM_APPLICATION || undefined };
}

const PLANNING = "/HyperionPlanning/rest/v3";

export class EpmError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export async function epmRequest<T = unknown>(
  config: EpmConfig,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${config.baseUrl}${PLANNING}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: config.authHeader,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new EpmError(`EPM API ${res.status} on ${path}: ${text.slice(0, 500)}`, res.status);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

const enc = encodeURIComponent;

export const epm = {
  listApplications: (c: EpmConfig) => epmRequest(c, "/applications"),

  getMember: (c: EpmConfig, app: string, dimension: string, member: string) =>
    epmRequest(c, `/applications/${enc(app)}/dimensions/${enc(dimension)}/members/${enc(member)}`),

  listSubstitutionVariables: (c: EpmConfig, app: string) =>
    epmRequest(c, `/applications/${enc(app)}/substitutionvariables`),

  exportDataSlice: (c: EpmConfig, app: string, cube: string, grid: unknown) =>
    epmRequest(c, `/applications/${enc(app)}/plantypes/${enc(cube)}/exportdataslice`, {
      method: "POST",
      body: { exportPlanningData: false, gridDefinition: grid },
    }),

  listJobs: (c: EpmConfig, app: string, limit: number) =>
    epmRequest(c, `/applications/${enc(app)}/jobs?limit=${limit}&offset=0`),

  getJob: (c: EpmConfig, app: string, jobId: number) =>
    epmRequest(c, `/applications/${enc(app)}/jobs/${jobId}`),
};
