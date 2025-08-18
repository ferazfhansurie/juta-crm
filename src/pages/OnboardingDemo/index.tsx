import React, { useState } from "react";
import OnboardingTrigger, { AutoOnboardingTrigger } from "../../components/OnboardingTrigger";
import { useOnboarding } from "../../hooks/useOnboarding";
import TestComponent from "../../components/TestComponent";

const OnboardingDemo: React.FC = () => {
  const { resetOnboarding } = useOnboarding();
  const [showAutoTrigger, setShowAutoTrigger] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Onboarding System Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the step-by-step onboarding guide designed to help new users 
            understand and navigate the Juta CRM system effectively.
          </p>
        </div>

        {/* Test Component */}
        <div className="bg-green-100 rounded-lg p-4 mb-4">
          <TestComponent />
        </div>

        {/* Demo Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Demo Controls</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={resetOnboarding}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset Onboarding (Show for New Users)
            </button>
            <button
              onClick={() => setShowAutoTrigger(!showAutoTrigger)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showAutoTrigger ? 'Hide' : 'Show'} Auto Trigger
            </button>
          </div>
        </div>

        {/* Auto Onboarding Trigger */}
        {showAutoTrigger && (
          <div className="mb-8">
            <AutoOnboardingTrigger 
              autoShow={false}
              showBanner={true}
              showFloatingButton={true}
            />
          </div>
        )}

        {/* Manual Trigger Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Button Variant */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Button Trigger</h3>
            <p className="text-gray-600 mb-4">
              Simple button that users can click to start the onboarding guide.
            </p>
            <OnboardingTrigger variant="button" />
          </div>

          {/* Banner Variant */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Banner Trigger</h3>
            <p className="text-gray-600 mb-4">
              Prominent banner that draws attention and encourages users to start the guide.
            </p>
            <OnboardingTrigger variant="banner" />
          </div>

          {/* Floating Variant */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Floating Button</h3>
            <p className="text-gray-600 mb-4">
              Floating action button that's always accessible to users.
            </p>
            <OnboardingTrigger variant="floating" />
          </div>
        </div>

        {/* Feature Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Onboarding Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Interactive Steps</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Welcome introduction</li>
                <li>• WhatsApp chat management</li>
                <li>• Contact organization</li>
                <li>• Marketing automations</li>
                <li>• AI-powered responses</li>
                <li>• Analytics & reporting</li>
                <li>• System configuration</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">User Experience</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Progress tracking</li>
                <li>• Skip/complete options</li>
                <li>• Direct navigation to features</li>
                <li>• Responsive design</li>
                <li>• Smooth animations</li>
                <li>• Persistent state management</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Implementation</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`// 1. Import the components
import OnboardingTrigger from './components/OnboardingTrigger';
import AutoOnboardingTrigger from './components/OnboardingTrigger/AutoTrigger';

// 2. Use manual trigger anywhere in your app
<OnboardingTrigger variant="button" />

// 3. Use auto trigger for new users (automatically shows)
<AutoOnboardingTrigger 
  autoShow={true}
  showBanner={true}
  showFloatingButton={true}
/>

// 4. Customize the trigger appearance
<OnboardingTrigger 
  variant="banner" 
  className="custom-styles"
/>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingDemo;
