import { formatMoney } from '@meledger/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { groupTotals } from '@/features/plan/logic';
import { usePlanData, usePlanTransactions } from '@/features/plan/usePlanData';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { lightColors, spacing } from '@/theme/tokens';

/** Archived savings groups (the link at the end of Savings groups on the Plan tab). */
export default function ArchivedGroupsScreen() {
  const insets = useSafeAreaInsets();
  const plan = usePlanData();
  const data = useLedgerData();
  const transactions = usePlanTransactions(data);
  if (!plan || !data) return <LoadingScreen />;
  const archived = plan.groups.filter((g) => g.archived);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Archived groups" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        {archived.length === 0 ? (
          <EmptyState
            icon="archive"
            title="No archived groups"
            body="Groups you archive are kept here with their contributions."
          />
        ) : (
          <ListGroup>
            {archived.map((group) => (
              <ListRow
                key={group.id}
                title={group.name}
                subtitle={`${formatMoney(group.contributionAmount)} ${group.frequency}`}
                icon="savings-group"
                iconColor="teal"
                value={formatMoney(groupTotals(group.walletId, transactions).contributed)}
                onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })}
              />
            ))}
          </ListGroup>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.xxl },
});
