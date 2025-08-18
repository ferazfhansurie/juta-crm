import React, { useEffect } from "react";
import { useOnboarding } from "../../hooks/useOnboarding";
import SimpleIconsOnboarding from "../OnboardingGuide/SimpleIcons";

interface AutoOnboardingTriggerProps {
  autoShow?: boolean;
  showBanner?: boolean;
  showFloatingButton?: boolean;
}

const AutoOnboardingTrigger: React.FC<AutoOnboardingTriggerProps> = ({
  autoShow = true,
  showBanner = true,
  showFloatingButton = true
}) => {
  const {
    shouldShowOnboarding,
    isOnboardingOpen,
    startOnboarding,
    closeOnboarding
  } = useOnboarding();

  useEffect(() => {
    // Automatically show onboarding for new users
    if (autoShow && shouldShowOnboarding) {
      startOnboarding();
    }
  }, [autoShow, shouldShowOnboarding, startOnboarding]);

  if (!shouldShowOnboarding) {
    return null;
  }

  return (
    <>
      {/* Banner for new users */}
      {showBanner && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Welcome to Juta CRM! 🎉</h3>
                <p className="text-sm text-gray-600">
                  Let's get you started with a quick tour of the system
                </p>
              </div>
            </div>
            <button
              onClick={startOnboarding}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Start Tour</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating help button */}
      {showFloatingButton && (
        <button
          onClick={startOnboarding}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 z-40 flex items-center justify-center animate-bounce"
          title="Need help? Start the onboarding guide"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* Onboarding Modal */}
      {isOnboardingOpen && (
        <SimpleIconsOnboarding onClose={closeOnboarding} />
      )}
    </>
  );
};

export default AutoOnboardingTrigger;
