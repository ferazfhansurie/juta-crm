import React, { useState } from "react";

interface SimpleIconsOnboardingProps {
  onClose?: () => void;
}

const SimpleIconsOnboarding: React.FC<SimpleIconsOnboardingProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Juta CRM!",
      description: "Let's get you started with a quick tour of the system",
      icon: "🎉"
    },
    {
      title: "WhatsApp Chat Management",
      description: "Manage all your WhatsApp conversations in one place",
      icon: "💬"
    },
    {
      title: "Contact Management",
      description: "Organize and manage your customer database",
      icon: "👥"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose?.();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">{steps[currentStep].icon}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {steps[currentStep].title}
          </h2>
          <p className="text-gray-600">
            {steps[currentStep].description}
          </p>
        </div>

        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
          >
            Previous
          </button>
          
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleIconsOnboarding;
