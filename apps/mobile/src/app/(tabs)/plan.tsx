import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

export default function PlanScreen() {
  return (
    <Screen title="My Plan">
      <Card>
        <EmptyState
          icon="plan"
          title="Goals and budgets live here"
          body="Savings goals, budgets, debts and recurring bills arrive in milestone 4."
        />
      </Card>
    </Screen>
  );
}
