import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { nextStep, OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { requestMicrophonePermission } from '@/features/voice/useSpeechSession';
import { lightColors, spacing } from '@/theme/tokens';

/** The only place the microphone permission is requested (project rule). */
export default function VoiceStep() {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);

  const allow = async () => {
    setAsking(true);
    setGranted(await requestMicrophonePermission());
    setAsking(false);
  };

  return (
    <OnboardingStep
      step="voice"
      icon="mic"
      title="Use your voice"
      body="MeLedger listens on your phone only while you talk to it and turns your words into entries. Nothing you say is stored."
      primary={
        granted === null
          ? { label: 'Allow microphone', onPress: allow, loading: asking }
          : { label: 'Continue', onPress: () => nextStep('voice') }
      }
      secondary={
        granted === null
          ? { label: "I'll type instead", onPress: () => nextStep('voice') }
          : undefined
      }
    >
      {granted === true ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <Icon name="check" weight="bold" size={18} color={lightColors.positive} />
          <Text variant="bodyStrong" tone="income">
            Microphone enabled
          </Text>
        </View>
      ) : granted === false ? (
        <Text variant="body" tone="muted" align="center" accessibilityLiveRegion="polite">
          No problem. You can type everything, and turn the microphone on later in Settings.
        </Text>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
