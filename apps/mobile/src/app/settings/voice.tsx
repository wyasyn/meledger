import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { showPermissionSheet } from '@/features/permissions/store';
import { Note, SettingsPage } from '@/features/settings/components';
import { forgetWord, type LearnedWord, useLearnedWords } from '@/features/settings/repo';
import { hasMicrophonePermission } from '@/features/voice/useSpeechSession';

const TARGET_LABELS: Record<LearnedWord['targetType'], string> = {
  category: 'Category',
  wallet: 'Wallet',
  person: 'Person',
};

export default function VoiceSettings() {
  const words = useLearnedWords();
  const [micAllowed, setMicAllowed] = useState<boolean>();

  useEffect(() => {
    const check = () => void hasMicrophonePermission().then(setMicAllowed);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  return (
    <SettingsPage title="Voice & input">
      <ListGroup title="Microphone">
        <ListRow
          title={micAllowed === false ? 'Microphone is off' : 'Microphone is on'}
          subtitle={
            micAllowed === false
              ? 'Allow it in Android settings to log by voice'
              : 'Listens only while you talk to MeLedger'
          }
          icon="mic"
          iconColor={micAllowed === false ? 'orange' : 'teal'}
          onPress={micAllowed === false ? () => showPermissionSheet('microphone') : undefined}
        />
      </ListGroup>

      <ListGroup title="Learned words">
        {words && words.length > 0 ? (
          words.map((w) => (
            <ListRow
              key={w.id}
              title={`"${w.phrase}"`}
              subtitle={`${TARGET_LABELS[w.targetType]}: ${w.targetName ?? 'deleted'}`}
              trailing={
                <IconButton
                  icon="trash"
                  label={`Forget "${w.phrase}"`}
                  variant="surface"
                  size={36}
                  onPress={() => void forgetWord(w.id)}
                />
              }
            />
          ))
        ) : (
          <EmptyState
            icon="mic"
            title="Nothing learned yet"
            body="When you change the category or wallet on a voice entry, MeLedger remembers the word for next time."
          />
        )}
      </ListGroup>
      <Note>Forget a word if MeLedger keeps picking the wrong category for it.</Note>
    </SettingsPage>
  );
}
