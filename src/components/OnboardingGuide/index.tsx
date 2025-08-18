import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageCircle, 
  Users, 
  Settings, 
  Zap, 
  Calendar, 
  FileText, 
  BarChart3, 
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    route: string;
    description: string;
  };
}

interface OnboardingGuideProps {
  onClose?: () => void;
}

const OnboardingGuideComponent: React.FC<OnboardingGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(true);
  const navigate = useNavigate();

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to Juta CRM!",
      description: "Let's get you started with a quick tour of the system",
      icon: <HelpCircle className="w-8 h-8 text-blue-500" />,
      content: (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome to Juta CRM</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Your all-in-one customer relationship management solution for WhatsApp Business. 
            Let's explore the key features that will help you grow your business.
          </p>
        </div>
      )
    },
    {
      id: "chat",
      title: "WhatsApp Chat Management",
      description: "Manage all your WhatsApp conversations in one place",
      icon: <MessageCircle className="w-8 h-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Centralized Chat Hub</h3>
              <p className="text-sm text-gray-600">All conversations in one organized interface</p>
            </div>
          </div>
          <ul className="space-y-2 text-left">
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Real-time message synchronization</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Contact management and tagging</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Quick reply templates</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Message history and search</span>
            </li>
          </ul>
        </div>
      ),
      action: {
        label: "Try Chat",
        route: "/chat",
        description: "Start managing your WhatsApp conversations"
      }
    },
    {
      id: "contacts",
      title: "Contact Management",
      description: "Organize and manage your customer database",
      icon: <Users className="w-8 h-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Smart Contact Organization</h3>
              <p className="text-sm text-gray-600">Build and maintain your customer database</p>
            </div>
          </div>
          <ul className="space-y-2 text-left">
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-blue-500" />
              <span>Import contacts from various sources</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-blue-500" />
              <span>Custom tags and categories</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-blue-500" />
              <span>Contact activity tracking</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-blue-500" />
              <span>Bulk contact operations</span>
            </li>
          </ul>
        </div>
      ),
      action: {
        label: "Manage Contacts",
        route: "/data-import",
        description: "Import and organize your contacts"
      }
    },
    {
      id: "automations",
      title: "Marketing Automations",
      description: "Automate your marketing campaigns and follow-ups",
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Powerful Automation Tools</h3>
              <p className="text-sm text-gray-600">Set up automated marketing workflows</p>
            </div>
          </div>
          <ul className="space-y-2 text-left">
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-yellow-500" />
              <span>Welcome message sequences</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-yellow-500" />
              <span>Follow-up campaigns</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-yellow-500" />
              <span>Trigger-based messaging</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-yellow-500" />
              <span>Campaign performance tracking</span>
            </li>
          </ul>
        </div>
      ),
      action: {
        label: "Create Automations",
        route: "/automations",
        description: "Build your first automation workflow"
      }
    },
    {
      id: "ai-responses",
      title: "AI-Powered Responses",
      description: "Generate intelligent responses with AI assistance",
      icon: <BarChart3 className="w-8 h-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">AI Response Generation</h3>
              <p className="text-sm text-gray-600">Let AI help you craft perfect responses</p>
            </div>
          </div>
          <ul className="space-y-2 text-left">
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-purple-500" />
              <span>Context-aware message suggestions</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-purple-500" />
              <span>Multi-language support</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-purple-500" />
              <span>Brand voice customization</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-purple-500" />
              <span>Response quality scoring</span>
            </li>
          </ul>
        </div>
      ),
      action: {
        label: "Try AI Responses",
        route: "/a-i-generative-responses",
        description: "Generate AI-powered responses"
      }
    },
    {
      id: "analytics",
      title: "Analytics & Reports",
      description: "Track performance and gain insights",
      icon: <FileText className="w-8 h-8 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Comprehensive Analytics</h3>
              <p className="text-sm text-gray-600">Monitor your business performance</p>
            </div>
          </div>
          <ul className="space-y-2 text-left">
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-indigo-500" />
              <span>Message delivery statistics</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-indigo-500" />
              <span>Campaign performance metrics</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-indigo-500" />
              <span>Customer engagement insights</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-indigo-500" />
              <span>Exportable reports</span>
            </li>
          </ul>
        </div>
      ),
      action: {
        label: "View Analytics",
        route: "/dashboard",
        description: "Check your performance metrics"
      }
    },
    {
      id: "settings",
      title: "System Configuration",
      description: "Customize your CRM settings and preferences",
      icon: <Settings className="w-8 h-8 text-gray-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">System Settings</h3>
              <p className="text-sm text-gray-600">Configure your CRM preferences</p>
            </div>
          </div>
          <ul className="space-y-2 text-left">
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-gray-500" />
              <span>WhatsApp connection setup</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-gray-500" />
              <span>User permissions and roles</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-gray-500" />
              <span>Notification preferences</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-gray-500" />
              <span>Integration settings</span>
            </li>
          </ul>
        </div>
      ),
      action: {
        label: "Configure Settings",
        route: "/settings",
        description: "Set up your system preferences"
      }
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]));
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleActionClick = (route: string) => {
    navigate(route);
  };

  const handleSkip = () => {
    setShowOnboarding(false);
    // You can save this preference to localStorage or your backend
    localStorage.setItem('onboardingCompleted', 'true');
    onClose?.();
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]));
    setShowOnboarding(false);
    localStorage.setItem('onboardingCompleted', 'true');
    onClose?.();
  };

  if (!showOnboarding) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Getting Started Guide</h1>
            <button
              onClick={handleSkip}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-2 mt-6">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-white text-blue-600'
                    : completedSteps.has(step.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
              >
                {completedSteps.has(step.id) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                )}
                <span className="text-sm font-medium hidden sm:block">{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">
          <div className="text-center mb-8">
            {steps[currentStep].icon}
            <h2 className="text-3xl font-bold text-gray-800 mt-4 mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-600 text-lg">
              {steps[currentStep].description}
            </p>
          </div>

          <div className="mb-8">
            {steps[currentStep].content}
          </div>

          {/* Action Button */}
          {steps[currentStep].action && (
            <div className="text-center mb-6">
              <button
                onClick={() => handleActionClick(steps[currentStep].action!.route)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
              >
                {steps[currentStep].action!.label}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                {steps[currentStep].action!.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>

            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </div>

            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleComplete}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Complete Guide
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuideComponent;
