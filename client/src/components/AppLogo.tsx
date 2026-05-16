export function AppLogo({ compact }: { compact?: boolean }) {
  const mark = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <img src="/favicon.png" alt="Dorm67" className="h-full w-full object-cover scale-110" />
    </div>
  );
  if (compact) {
    return mark;
  }
  return (
    <div className="flex items-center gap-2 text-xl font-semibold text-ink">
      {mark}
      <span>
        Dorm<span className="text-brand">67</span>
      </span>
    </div>
  );
}
