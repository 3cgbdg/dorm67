export function AppLogo() {
  return (
    <div className="flex items-center gap-2 text-xl font-semibold">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <img src="/favicon.png" alt="Dorm67 Logo" className="h-full w-full object-cover scale-110" />
      </div>
      <span>
        Dorm<span className="text-primary">67</span>
      </span>
    </div>
  );
}
