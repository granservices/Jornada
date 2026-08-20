export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(199,53,44,0.10)] ring-1 ring-[rgba(199,53,44,0.14)]">
        <div className="relative h-6 w-6">
          <span className="absolute inset-y-0 left-0 w-3 rounded-sm bg-[var(--brand-600)]" />
          <span className="absolute bottom-0 right-0 h-4 w-2 rounded-sm bg-[var(--text-muted)]" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold text-[var(--text-primary)]">
          Jornada
        </p>
        <p className="truncate text-xs text-[var(--text-muted)]">
          Gran Services
        </p>
      </div>
    </div>
  );
}
