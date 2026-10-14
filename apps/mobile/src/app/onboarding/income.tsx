import { ScrollView, StyleSheet } from 'react-native';

import { AmountField } from '@/components/ui/AmountField';
import { Chip } from '@/components/ui/Chip';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Text } from '@/components/ui/Text';
import { nextStep, OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { type IncomeKind, useOnboarding } from '@/features/onboarding/store';
import { spacing } from '@/theme/tokens';

const KINDS: { kind: IncomeKind; title: string; subtitle: string; icon: string; color: string }[] =
  [
    {
      kind: 'salary',
      title: 'Salary',
      subtitle: 'A fixed amount each month',
      icon: 'salary',
      color: 'green',
    },
    {
      kind: 'freelance',
      title: 'Freelance',
      subtitle: 'Paid per job or contract',
      icon: 'freelance',
      color: 'blue',
    },
    {
      kind: 'business',
      title: 'Business',
      subtitle: 'Sales from my own business',
      icon: 'business',
      color: 'orange',
    },
    {
      kind: 'irregular',
      title: 'It varies',
      subtitle: 'Different amounts at different times',
      icon: 'coins',
      color: 'amber',
    },
  ];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function IncomeStep() {
  const { incomeKind, usualIncome, payDay, set } = useOnboarding();
  const regular = incomeKind !== null && incomeKind !== 'irregular';

  return (
    <OnboardingStep
      step="income"
      icon="coins"
      title="How you earn"
      body="This helps MeLedger plan around your pay. Amounts are optional."
      primary={{ label: 'Continue', onPress: () => nextStep('income') }}
      secondary={{ label: 'Skip', onPress: () => nextStep('income') }}
    >
      <ListGroup>
        {KINDS.map((k) => (
          <ListRow
            key={k.kind}
            title={k.title}
            subtitle={k.subtitle}
            icon={k.icon}
            iconColor={k.color}
            selected={incomeKind === k.kind}
            onPress={() => set({ incomeKind: k.kind })}
          />
        ))}
      </ListGroup>
      {incomeKind ? (
        <AmountField
          label={regular ? 'Usual amount (optional)' : 'Average a month (optional)'}
          value={usualIncome}
          onChange={(value) => set({ usualIncome: value })}
        />
      ) : null}
      {regular ? (
        <>
          <Text variant="caption" tone="muted" style={styles.caption}>
            Pay day (optional)
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
                selected={day === payDay}
                onPress={() => set({ payDay: day === payDay ? null : day })}
                accessibilityLabel={`Paid on day ${day}`}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  caption: { paddingHorizontal: spacing.xs },
  bleed: { marginHorizontal: -spacing.gutter, flexGrow: 0 },
  days: { gap: spacing.sm, paddingHorizontal: spacing.gutter, paddingVertical: 2 },
});
