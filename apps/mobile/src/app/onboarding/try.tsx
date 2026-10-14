import { Button } from '@/components/ui/Button';
import { nextStep, OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { Orb } from '@/features/voice/components/Orb';
import { openVoiceSheet } from '@/features/voice/store';

export default function TryStep() {
  return (
    <OnboardingStep
      step="try"
      hero={<Orb size={180} mode="idle" />}
      title="Try it"
      body={'Tap below and say: "lunch 10k cash". Check the card, then save your first entry.'}
      primary={{ label: 'Continue', onPress: () => nextStep('try') }}
      secondary={{ label: 'Skip', onPress: () => nextStep('try') }}
    >
      <Button
        label="Talk to MeLedger"
        icon="mic"
        variant="secondary"
        block
        onPress={() => openVoiceSheet()}
      />
    </OnboardingStep>
  );
}
