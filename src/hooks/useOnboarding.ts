import { useState, useEffect } from 'react';

export const useOnboarding = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding before
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    
    // Check if user is new (you can also check user creation date from your backend)
    const isNewUser = !hasCompletedOnboarding;
    
    setShouldShowOnboarding(isNewUser);
  }, []);

  const startOnboarding = () => {
    setIsOnboardingOpen(true);
  };

  const closeOnboarding = () => {
    setIsOnboardingOpen(false);
  };

  const completeOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setShouldShowOnboarding(false);
    setIsOnboardingOpen(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('onboardingCompleted');
    setShouldShowOnboarding(true);
  };

  return {
    shouldShowOnboarding,
    isOnboardingOpen,
    startOnboarding,
    closeOnboarding,
    completeOnboarding,
    resetOnboarding
  };
};
