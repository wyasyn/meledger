import type { IconName } from '@/components/ui/Icon';

export interface TabSpec {
  label: string;
  /** Regular weight when idle, filled when the tab is active. */
  icon: IconName;
}

/** Bottom bar items keyed by route name. The mic sits in its own circle right of the pill. */
export const TABS: Record<string, TabSpec> = {
  index: { label: 'Home', icon: 'home' },
  report: { label: 'Report', icon: 'report' },
  plan: { label: 'Plan', icon: 'plan' },
  settings: { label: 'Settings', icon: 'settings' },
};
