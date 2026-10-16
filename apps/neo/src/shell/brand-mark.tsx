import { motion } from 'motion/react';

type BrandMarkProps = {
  inverted?: boolean;
  title?: string;
  subtitle?: string | null;
  size?: 'default' | 'compact';
  contained?: boolean;
  bare?: boolean;
  animated?: boolean;
};

export function BrandMark({
  inverted = false,
  title = 'Jornada',
  subtitle = 'GranServices',
  size = 'default',
  contained = false,
  bare = false,
  animated = false,
}: BrandMarkProps) {
  const iconClasses =
    size === 'compact'
      ? inverted
        ? 'flex h-10 w-10 items-center justify-center rounded-[6px] bg-white/10 ring-1 ring-white/14 backdrop-blur-[2px]'
        : bare
          ? 'flex h-8 w-8 items-center justify-center'
        : contained
          ? 'flex h-8 w-8 items-center justify-center'
          : 'flex h-10 w-10 items-center justify-center rounded-[6px] bg-[rgba(109,118,128,0.10)] ring-1 ring-[rgba(109,118,128,0.18)]'
      : inverted
        ? 'flex h-11 w-11 items-center justify-center rounded-[6px] bg-white/10 ring-1 ring-white/14 backdrop-blur-[2px]'
        : bare
          ? 'flex h-9 w-9 items-center justify-center'
        : contained
          ? 'flex h-9 w-9 items-center justify-center'
          : 'flex h-11 w-11 items-center justify-center rounded-[6px] bg-[rgba(109,118,128,0.10)] ring-1 ring-[rgba(109,118,128,0.18)]';

  const titleClasses =
    size === 'compact'
      ? inverted
        ? 'text-sm font-semibold text-white'
        : bare
          ? 'text-sm font-semibold text-[rgba(226,232,240,0.76)]'
          : 'text-sm font-semibold text-[rgba(31,41,55,0.92)]'
      : inverted
        ? 'text-base font-semibold text-white'
        : bare
          ? 'text-base font-semibold text-[rgba(226,232,240,0.76)]'
          : 'text-base font-semibold text-[rgba(31,41,55,0.92)]';

  const subtitleClasses = inverted
    ? 'truncate text-xs text-white/70'
    : 'truncate text-xs text-[var(--text-muted)]';

  return (
    <div
      className={
        contained
          ? 'inline-flex items-center gap-2 rounded-[6px] border border-[rgba(109,118,128,0.16)] bg-[rgba(109,118,128,0.05)] px-3 py-2 backdrop-blur-[2px]'
          : bare
            ? 'inline-flex items-center gap-2'
            : 'flex items-center gap-3'
      }
    >
      <div className={iconClasses}>
        <motion.img
          src="/crew-logo.png"
          alt="Logo Jornada"
          animate={animated ? { rotate: 360 } : undefined}
          transition={
            animated
              ? {
                  duration: size === 'compact' ? 8.5 : 9.5,
                  ease: 'linear',
                  repeat: Number.POSITIVE_INFINITY,
                }
              : undefined
          }
          className={
            [
              size === 'compact'
                ? bare
                  ? 'h-6 w-6 object-contain opacity-60'
                  : 'h-6 w-6 object-contain'
                : bare
                  ? 'h-8 w-8 object-contain opacity-60'
                  : 'h-8 w-8 object-contain',
            ]
              .filter(Boolean)
              .join(' ')
          }
        />
      </div>
      <div className="min-w-0">
        <p className={titleClasses}>{title}</p>
        {subtitle ? <p className={subtitleClasses}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
