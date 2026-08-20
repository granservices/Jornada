export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(197,0,0,0.08)] ring-1 ring-[rgba(197,0,0,0.12)]">
        <img
          src="/crew-logo.png"
          alt="Logo Jornada"
          className="h-8 w-8 object-contain"
        />
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
