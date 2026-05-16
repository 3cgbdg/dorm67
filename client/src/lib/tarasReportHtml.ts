import DOMPurify from "dompurify";

type ReportJson = {
  metadata?: { title?: string };
  sections?: Array<{
    heading?: string;
    paragraphs?: string[];
    bullets?: string[];
    table?: { headers: string[]; rows: string[][] };
    formula?: string;
  }>;
  conclusions?: string[];
};

export function reportJsonToHtml(report: ReportJson): string {
  const parts: string[] = [];
  const title = report.metadata?.title ?? "Report";
  parts.push(`<h1 class="text-xl font-bold mb-4">${escapeHtml(title)}</h1>`);
  for (const s of report.sections ?? []) {
    if (s.heading) parts.push(`<h2 class="text-lg font-semibold mt-4 mb-2">${escapeHtml(s.heading)}</h2>`);
    for (const p of s.paragraphs ?? []) {
      parts.push(`<p class="mb-2 leading-relaxed">${escapeHtml(p)}</p>`);
    }
    for (const b of s.bullets ?? []) {
      parts.push(`<li class="ml-4 list-disc">${escapeHtml(b)}</li>`);
    }
    if (s.table?.headers?.length) {
      const th = s.table.headers
        .map((h) => `<th class="border px-2 py-1 text-left">${escapeHtml(h)}</th>`)
        .join("");
      const trs = (s.table.rows ?? [])
        .map(
          (row) =>
            `<tr>${row.map((c) => `<td class="border px-2 py-1">${escapeHtml(c)}</td>`).join("")}</tr>`
        )
        .join("");
      parts.push(
        `<table class="w-full border-collapse text-sm my-2"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`
      );
    }
    if (s.formula) parts.push(`<pre class="bg-surface-2 p-2 rounded text-sm my-2">${escapeHtml(s.formula)}</pre>`);
  }
  parts.push(`<h2 class="text-lg font-semibold mt-6 mb-2">Conclusions</h2>`);
  for (const c of report.conclusions ?? []) {
    parts.push(`<p class="mb-2">${escapeHtml(c)}</p>`);
  }
  return DOMPurify.sanitize(parts.join(""), { USE_PROFILES: { html: true } });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
