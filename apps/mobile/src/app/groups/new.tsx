import { startOfDay } from 'date-fns';
import { router } from 'expo-router';

import { GroupForm } from '@/features/plan/components/GroupForm';
import { createSavingsGroup } from '@/features/plan/repo';

export default function NewGroupScreen() {
  return (
    <GroupForm
      title="New savings group"
      autoFocus
      initial={{
        name: '',
        contributionAmount: 0,
        frequency: 'weekly',
        members: [],
        payoutTurn: null,
        cycleStart: startOfDay(new Date()),
      }}
      onSubmit={async (values) => {
        await createSavingsGroup(values);
        router.back();
      }}
    />
  );
}
