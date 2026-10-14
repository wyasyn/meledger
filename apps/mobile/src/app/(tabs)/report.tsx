import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';

export default function ReportScreen() {
  return (
    <Screen title="Report">
      <Card>
        <EmptyState
          icon="report"
          title="Your spending, explained"
          body="Charts, category breakdowns and month-on-month changes arrive in milestone 4."
        />
      </Card>
    </Screen>
  );
}
