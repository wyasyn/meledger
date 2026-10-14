import { showSnackbar } from '@/features/feedback/snackbar';
import { nextStep, OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { SpokenLineDemo } from '@/features/onboarding/SpokenLineDemo';
import { Orb } from '@/features/voice/components/Orb';

export default function WelcomeStep() {
  return (
    <OnboardingStep
      step="index"
      hero={<Orb size={200} mode="idle" />}
      title="Say it, and it's logged."
      body="Tell MeLedger what you spent or earned in your own words. It keeps your money organised, even offline."
      primary={{ label: 'Get started', onPress: () => nextStep('index') }}
      secondary={{
        label: 'Already have an account? Sign in',
        onPress: () => showSnackbar({ message: 'Sign in arrives with MeLedger Pro' }),
      }}
    >
      <SpokenLineDemo />
    </OnboardingStep>
  );
}
