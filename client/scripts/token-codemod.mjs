import fs from "node:fs";
import path from "node:path";

const root = path.join("..", "src");

const pairs = [
  ["text-primary-foreground", "text-brand-fg"],
  ["ring-offset-background", "ring-offset-bg"],
  ["placeholder:text-muted-foreground", "placeholder:text-ink-soft"],
  ["data-[placeholder]:text-muted-foreground", "data-[placeholder]:text-ink-soft"],
  ["bg-muted-foreground", "bg-ink-soft"],
  ["text-muted-foreground", "text-ink-soft"],
  ["bg-muted/", "bg-surface-2/"],
  ["hover:bg-muted/", "hover:bg-surface-2/"],
  ["from-muted", "from-surface-2"],
  ["to-muted", "to-surface-2"],
  ["bg-muted", "bg-surface-2"],
  ["hover:bg-muted", "hover:bg-surface-2"],
  ["border-muted", "border-border"],
  ["text-card-foreground", "text-ink"],
  ["bg-card/", "bg-surface/"],
  ["bg-card", "bg-surface"],
  ["text-foreground", "text-ink"],
  ["bg-background/", "bg-bg/"],
  ["ring-background", "ring-bg"],
  ["ring-4 ring-bg", "ring-4 ring-bg"],
  ["bg-background", "bg-bg"],
  ["from-background", "from-bg"],
  ["to-background", "to-bg"],
  ["bg-primary/", "bg-brand/"],
  ["hover:bg-primary/", "hover:bg-brand/"],
  ["text-primary/", "text-brand/"],
  ["from-primary", "from-brand"],
  ["to-primary", "to-brand"],
  ["fill-primary", "fill-brand"],
  ["ring-primary", "ring-brand"],
  ["border-primary", "border-brand"],
  ["hover:text-primary", "hover:text-brand"],
  ["text-primary", "text-brand"],
  ["bg-primary", "bg-brand"],
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

for (const file of walk(path.join(process.cwd(), "src"))) {
  let c = fs.readFileSync(file, "utf8");
  const orig = c;
  for (const [a, b] of pairs) {
    c = c.split(a).join(b);
  }
  if (c !== orig) fs.writeFileSync(file, c);
}

console.log("done");
