import { MoonStar, SunMedium } from 'lucide-react';
import { Button } from '../ui/button';
import {
  toggleThemePreference,
  useThemePreference,
} from './theme-preference';

export function ThemeToggleButton() {
  const theme = useThemePreference();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className="h-8 min-h-8 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 text-[var(--admin-text-secondary)] hover:bg-[var(--admin-panel-active)] hover:text-[var(--admin-text-primary)]"
      onPress={toggleThemePreference}
    >
      {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
    </Button>
  );
}
