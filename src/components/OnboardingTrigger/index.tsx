import React, { useState } from "react";
import { HelpCircle, Play } from "lucide-react";
import SimpleIconsOnboarding from "../OnboardingGuide/SimpleIcons";
import AutoOnboardingTrigger from "./AutoTrigger";

interface OnboardingTriggerProps {
  variant?: "button" | "floating" | "banner";
  className?: string;
}

const OnboardingTrigger: React.FC<OnboardingTriggerProps> = ({ 
  variant = "button", 
  className = "" 
}) => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
  };

  const renderTrigger = () => {
    switch (variant) {
      case "floating":
        return (
          <button
            onClick={handleStartOnboarding}
            className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 z-40 flex items-center justify-center"
            title="Start Onboarding Guide"
          >
            <HelpCircle className="w-8 h-8" />
          </button>
        );

      case "banner":
        return (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">New to Juta CRM?</h3>
                  <p className="text-sm text-gray-600">
                    Get started with our step-by-step guide to learn the system
                  </p>
                </div>
              </div>
              <button
                onClick={handleStartOnboarding}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Start Guide</span>
              </button>
            </div>
          </div>
        );

      default:
        return (
          <button
            onClick={handleStartOnboarding}
            className={`inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all ${className}`}
          >
            <HelpCircle className="w-5 h-5" />
            <span>Get Started Guide</span>
          </button>
        );
    }
  };

  return (
    <>
      {renderTrigger()}
      {showOnboarding && (
        <SimpleIconsOnboarding onClose={handleCloseOnboarding} />
      )}
    </>
  );
};

export default OnboardingTrigger;
export { AutoOnboardingTrigger };
