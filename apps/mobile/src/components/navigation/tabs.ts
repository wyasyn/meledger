import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface TabSpec {
  label: string;
  icon: IconName;
  activeIcon: IconName;
}

/** Bottom bar items keyed by route name. The mic sits in its own circle right of the pill. */
export const TABS: Record<string, TabSpec> = {
  index: { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  report: { label: 'Report', icon: 'chart-box-outline', activeIcon: 'chart-box' },
  plan: { label: 'Plan', icon: 'clipboard-text-outline', activeIcon: 'clipboard-text' },
  settings: { label: 'Settings', icon: 'cog-outline', activeIcon: 'cog' },
};
