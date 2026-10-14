import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Badge } from '@/components/ui/Progress';
import { Text } from '@/components/ui/Text';
import { nextStep, OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useOnboarding } from '@/features/onboarding/store';
import { spacing } from '@/theme/tokens';

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export default function LanguageStep() {
  const monthStartDay = useOnboarding((s) => s.monthStartDay);
  const set = useOnboarding((s) => s.set);

  return (
    <OnboardingStep
      step="language"
      icon="language"
      title="Language and currency"
      primary={{ label: 'Continue', onPress: () => nextStep('language') }}
    >
      <ListGroup title="Language">
        <ListRow title="English" icon="globe" iconColor="blue" selected />
        <ListRow
          title="Luganda"
          subtitle="Comes with MeLedger Pro"
          icon="language"
          iconColor="slate"
          trailing={<Badge label="Pro · beta" />}
        />
      </ListGroup>
      <ListGroup title="Currency">
        <ListRow
          title="Ugandan shilling"
          subtitle="UGX"
          icon="currency"
          iconColor="green"
          selected
        />
      </ListGroup>
      <Text variant="caption" tone="muted" style={styles.caption}>
        Your month starts on day {monthStartDay}. Pick your pay day so monthly totals match your
        salary.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.days}
      >
        {DAYS.map((day) => (
          <Chip
            key={day}
            label={String(day)}
            selected={day === monthStartDay}
            onPress={() => set({ monthStartDay: day })}
            accessibilityLabel={`Month starts on day ${day}`}
          />
        ))}
      </ScrollView>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  caption: { paddingHorizontal: spacing.xs, marginTop: spacing.sm },
  bleed: { marginHorizontal: -spacing.gutter, flexGrow: 0 },
  days: { gap: spacing.sm, paddingHorizontal: spacing.gutter, paddingVertical: 2 },
});
