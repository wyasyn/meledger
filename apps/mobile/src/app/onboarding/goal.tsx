import { AmountField } from '@/components/ui/AmountField';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { nextStep, OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useOnboarding } from '@/features/onboarding/store';

const TEMPLATES = [
  { name: 'Emergency fund', icon: 'insurance', color: 'teal' },
  { name: 'Laptop', icon: 'electronics', color: 'blue' },
  { name: 'School fees', icon: 'school', color: 'orange' },
  { name: 'Land', icon: 'land', color: 'green' },
  { name: 'Wedding', icon: 'family', color: 'pink' },
] as const;

export default function GoalStep() {
  const goal = useOnboarding((s) => s.goal);
  const set = useOnboarding((s) => s.set);

  return (
    <OnboardingStep
      step="goal"
      icon="target"
      title="Your first goal"
      body="Saving for something? Pick one to start. You can change it or add more later."
      primary={{
        label: 'Continue',
        onPress: () => nextStep('goal'),
        disabled: goal !== null && goal.target <= 0,
      }}
      secondary={{
        label: 'Skip for now',
        onPress: () => {
          set({ goal: null });
          nextStep('goal');
        },
      }}
    >
      <ListGroup>
        {TEMPLATES.map((t) => (
          <ListRow
            key={t.name}
            title={t.name}
            icon={t.icon}
            iconColor={t.color}
            selected={goal?.name === t.name}
            onPress={() =>
              set({
                goal:
                  goal?.name === t.name
                    ? null
                    : { name: t.name, icon: t.icon, target: goal?.target ?? 0 },
              })
            }
          />
        ))}
      </ListGroup>
      {goal ? (
        <AmountField
          label={`How much for ${goal.name.toLowerCase()}?`}
          value={goal.target}
          onChange={(target) => set({ goal: { ...goal, target } })}
        />
      ) : null}
    </OnboardingStep>
  );
}
