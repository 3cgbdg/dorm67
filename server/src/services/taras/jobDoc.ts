export function assertJobDocSize(data: Record<string, unknown>): void {
  const bytes = Buffer.byteLength(JSON.stringify(data), "utf8");
  const max = 500 * 1024;
  if (bytes > max) {
    throw new Error(`Job document exceeds ${max} bytes (${bytes})`);
  }
}
