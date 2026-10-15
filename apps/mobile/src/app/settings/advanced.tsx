import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/repo';
import { Note, SettingsPage } from '@/features/settings/components';
import { forgetAllWords, setStoreTranscripts, useLearnedWords } from '@/features/settings/repo';
import { spacing } from '@/theme/tokens';

export default function AdvancedSettings() {
  const profile = useProfile();
  const words = useLearnedWords();
  const [resetDone, setResetDone] = useState(false);
  const resetSheet = useRef<SheetRef>(null);
  if (!profile) return <SettingsPage title="Advanced">{null}</SettingsPage>;

  const count = words?.length ?? 0;

  return (
    <SettingsPage title="Advanced">
      <ListGroup title="Voice">
        <ListRow
          title="Keep what I say"
          subtitle="Save the words with each voice entry"
          icon="note"
          iconColor="teal"
          trailing={
            <Switch
              value={profile.storeTranscripts}
              onValueChange={(on) => void setStoreTranscripts(on)}
              accessibilityLabel="Keep what I say"
            />
          }
        />
      </ListGroup>
      <Note>
        Only the text is kept, never a recording. Turning this off also deletes the words already
        saved.
      </Note>

      <ListGroup title="Learning">
        <ListRow
          title="Reset learned words"
          subtitle={
            resetDone
              ? 'Done. MeLedger starts learning again.'
              : count === 0
                ? 'Nothing learned yet'
                : `${count} ${count === 1 ? 'word' : 'words'} learned`
          }
          icon="restore"
          iconColor="orange"
          onPress={count > 0 ? () => resetSheet.current?.present() : undefined}
        />
      </ListGroup>

      <Sheet ref={resetSheet} title="Reset learned words?">
        <View style={styles.sheetBody}>
          <Text variant="body" tone="muted">
            MeLedger forgets the words it learned from your corrections. Your entries stay as they
            are.
          </Text>
          <Button
            label="Reset"
            variant="danger"
            block
            onPress={async () => {
              await forgetAllWords();
              setResetDone(true);
              resetSheet.current?.dismiss();
            }}
          />
          <Button
            label="Cancel"
            variant="ghost"
            block
            onPress={() => resetSheet.current?.dismiss()}
          />
        </View>
      </Sheet>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  sheetBody: { paddingHorizontal: spacing.gutter, gap: spacing.md },
});
