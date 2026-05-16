import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function authHeader(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function authBearer(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function tarasUpload(files: File[]): Promise<{ draftId: string; paths: string[] }> {
  const token = await auth.currentUser?.getIdToken();
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const res = await fetch(`${API_URL}/api/ai/taras/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ draftId: string; paths: string[] }>;
}

export async function tarasAnalyzeTemplate(body: {
  draftId: string;
  pastedText?: string;
}): Promise<{ templateStyle: unknown }> {
  const res = await fetch(`${API_URL}/api/ai/taras/template-analyze`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ templateStyle: unknown }>;
}

export async function tarasGenerate(body: Record<string, unknown>): Promise<{ jobId: string }> {
  const res = await fetch(`${API_URL}/api/ai/taras/generate`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ jobId: string }>;
}

export async function tarasRefine(body: {
  jobId: string;
  instruction: string;
  idempotencyKey: string;
}): Promise<{ jobId: string }> {
  const res = await fetch(`${API_URL}/api/ai/taras/refine`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ jobId: string }>;
}

export async function tarasListJobs(): Promise<{ jobs: unknown[] }> {
  const res = await fetch(`${API_URL}/api/ai/taras/jobs`, { headers: await authHeader() });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ jobs: unknown[] }>;
}

export async function tarasRenameJob(jobId: string, title: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/ai/taras/jobs/${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: await authHeader(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function tarasDeleteJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/ai/taras/jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function tarasFetchJob(jobId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}/api/ai/taras/jobs/${encodeURIComponent(jobId)}`, {
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Record<string, unknown>>;
}

export async function tarasFetchReportJson(
  jobId: string,
  revision?: number
): Promise<Record<string, unknown>> {
  const qs =
    revision !== undefined ? `?revision=${encodeURIComponent(String(revision))}` : "";
  const res = await fetch(
    `${API_URL}/api/ai/taras/jobs/${encodeURIComponent(jobId)}/report-json${qs}`,
    { headers: await authBearer() }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Record<string, unknown>>;
}

export async function tarasRevertToRevision(jobId: string, revision: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/ai/taras/jobs/${encodeURIComponent(jobId)}/revert`, {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify({ revision }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export function tarasDocxDownloadUrl(jobId: string): string {
  return `${API_URL}/api/ai/taras/jobs/${encodeURIComponent(jobId)}/docx`;
}
