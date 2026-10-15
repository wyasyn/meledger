import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GroupForm } from '@/features/plan/components/GroupForm';
import { parseMembers } from '@/features/plan/logic';
import { updateSavingsGroup } from '@/features/plan/repo';
import { usePlanData } from '@/features/plan/usePlanData';

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlanData();
  if (!plan) return <LoadingScreen />;
  const group = plan.groups.find((g) => g.id === id);
  if (!group) {
    return (
      <>
        <ScreenHeader title="Savings group" />
        <EmptyState icon="group" title="This group no longer exists" />
      </>
    );
  }
  return (
    <GroupForm
      title="Edit group"
      initial={{
        name: group.name,
        contributionAmount: group.contributionAmount,
        frequency: group.frequency,
        members: parseMembers(group.members),
        payoutTurn: group.payoutTurn,
        cycleStart: group.cycleStart,
      }}
      onSubmit={async (values) => {
        await updateSavingsGroup(group.id, values);
        router.back();
      }}
    />
  );
}
