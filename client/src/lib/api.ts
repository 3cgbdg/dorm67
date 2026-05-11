import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export async function api<T>(
  path: string,
  options: RequestInit & { payload?: unknown } = {}
): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.payload ? JSON.stringify(options.payload) : options.body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "API request failed");
  }
  return (await response.json()) as T;
}
