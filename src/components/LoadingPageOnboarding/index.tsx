import React, { useState, useEffect, useRef } from "react";
import { X, Check, ChevronLeft, ChevronRight, Zap, TrendingUp, HelpCircle } from "lucide-react";

interface LoadingPageOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ButtonGuide {
  id: string;
  title: string;
  description: string;
  features: string[];
  benefits: string[];
  selector: string; // CSS selector to find the button
}

const LoadingPageOnboarding: React.FC<LoadingPageOnboardingProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const buttonGuides: ButtonGuide[] = [
    {
      id: "qr-scan",
      title: "Scan QR Code to Connect",
      description: "This is the main purpose of this page - scan the QR code with your WhatsApp to connect your business account.",
      selector: "qr-code",
      features: [
        "Open WhatsApp on your phone",
        "Go to Settings > Linked Devices",
        "Tap 'Link a Device'",
        "Point camera at the QR code above",
        "Wait for 'Device linked successfully' message"
      ],
      benefits: [
        "Connect WhatsApp Business to Juta CRM",
        "Access all CRM features",
        "Manage customer conversations",
        "Use automation tools"
      ]
    },
    {
      id: "wait-authentication",
      title: "Wait for Authentication",
      description: "After scanning, wait for the system to authenticate your WhatsApp connection.",
      selector: "authentication-status",
      features: [
        "Monitor connection status",
        "Wait for WhatsApp verification",
        "See real-time progress updates"
      ],
      benefits: [
        "Ensures secure connection",
        "Prevents unauthorized access",
        "Prepares your CRM environment"
      ]
    },
    {
      id: "navigate-chat",
      title: "Go to Chat Dashboard",
      description: "Once authenticated, you'll automatically be taken to the main chat interface.",
      selector: "chat-navigation",
      features: [
        "Automatic redirect to chat page",
        "Access to all customer conversations",
        "Full CRM functionality unlocked"
      ],
      benefits: [
        "Start managing customer chats",
        "Use automation features",
        "Access business tools"
      ]
    },
    {
      id: "refresh-button",
      title: "Refresh Connection",
      description: "Updates your WhatsApp connection status and fetches the latest data from your WhatsApp account.",
      selector: "refresh",
      features: [
        "Reconnects to WhatsApp servers",
        "Fetches latest chat updates",
        "Updates connection status",
        "Refreshes QR codes if needed"
      ],
      benefits: [
        "Ensures real-time data synchronization",
        "Resolves connection issues automatically",
        "Keeps your CRM up-to-date",
        "Maintains stable WhatsApp integration"
      ]
    },
    {
      id: "reinitialize-bot",
      title: "Reinitialize Bot",
      description: "Completely restarts your WhatsApp bot connection. Use this when experiencing persistent connection issues.",
      selector: "reinitialize",
      features: [
        "Restarts WhatsApp bot service",
        "Clears connection cache",
        "Re-establishes WebSocket connection",
        "Resets authentication state"
      ],
      benefits: [
        "Resolves persistent connection problems",
        "Fixes authentication issues",
        "Improves system stability",
        "Ensures fresh connection state"
      ]
    },
    {
      id: "pairing-code-toggle",
      title: "Pairing Code Toggle",
      description: "Switch between QR code scanning and phone number pairing methods for WhatsApp authentication.",
      selector: "pairing-code-toggle",
      features: [
        "Toggle between QR and phone methods",
        "Alternative authentication option",
        "Useful when QR scanning fails",
        "Backup connection method"
      ],
      benefits: [
        "Flexible authentication options",
        "Backup when QR codes don't work",
        "Easier for some users",
        "Multiple connection strategies"
      ]
    },
    {
      id: "get-pairing-code",
      title: "Get Pairing Code",
      description: "Generate a pairing code to authenticate your WhatsApp account using your phone number instead of scanning QR codes.",
      selector: "get-pairing-code",
      features: [
        "Phone number authentication",
        "Generates unique pairing codes",
        "Alternative to QR scanning",
        "Secure authentication method"
      ],
      benefits: [
        "No need for camera access",
        "Works on all devices",
        "Reliable authentication method",
        "User-friendly alternative"
      ]
    },
    {
      id: "need-help",
      title: "Need Help?",
      description: "Access our support resources and get assistance when you encounter issues with the system.",
      selector: "need-help",
      features: [
        "Direct support access",
        "Help documentation",
        "Contact support team",
        "Troubleshooting guides"
      ],
      benefits: [
        "Quick problem resolution",
        "Professional assistance",
        "Reduced downtime",
        "Better user experience"
      ]
    },
    {
      id: "logout",
      title: "Logout",
      description: "Securely sign out of your Juta CRM account and return to the login page.",
      selector: "logout",
      features: [
        "Secure session termination",
        "Clears authentication data",
        "Returns to login page",
        "Protects account security"
      ],
      benefits: [
        "Account security protection",
        "Clean session management",
        "Safe account switching",
        "Privacy protection"
      ]
    },
    {
      id: "retry-connection",
      title: "Retry Connection",
      description: "Attempt to reconnect to the WebSocket server when experiencing connection issues.",
      selector: "retry-connection",
      features: [
        "WebSocket reconnection",
        "Error recovery",
        "Automatic retry logic",
        "Connection troubleshooting"
      ],
      benefits: [
        "Faster issue resolution",
        "Improved reliability",
        "Better user experience",
        "Reduced support tickets"
      ]
    }
  ];

  // Custom function to find buttons by their content
  const findButtonByContent = (selector: string): HTMLElement | null => {
    const buttonTexts: { [key: string]: string[] } = {
      'qr-code': ['QR Code', 'Scan', 'QR'],
      'authentication-status': ['Loading', 'Authenticating', 'Status', 'Connecting'],
      'chat-navigation': ['Navigate', 'Chat', 'Dashboard'],
      'refresh': ['Refresh', 'refresh', 'Refreshing...'],
      'reinitialize': ['Reinitialize', 'reinitialize', 'Reinitializing...'],
      'pairing-code-toggle': ['Link With Phone Number', 'pairing code', 'Pairing', 'Hide'],
      'get-pairing-code': ['Get Pairing Code', 'Generating...'],
      'need-help': ['Need Help?'],
      'logout': ['Logout', 'Back to Login'],
      'retry-connection': ['Retry Connection']
    };

    const texts = buttonTexts[selector];
    if (!texts) return null;

    console.log(`Looking for element with selector:`, selector);

    // Special handling for QR code - find the actual QR image
    if (selector === 'qr-code') {
      const qrImage = document.querySelector('img[alt="QR Code"]');
      if (qrImage) {
        console.log('✅ Found QR code image');
        return qrImage as HTMLElement;
      }
      
      // Fallback: look for any image that might be a QR code
      const allImages = document.querySelectorAll('img');
      for (const img of allImages) {
        if (img.src && (img.src.includes('data:image') || img.src.includes('qr'))) {
          console.log('✅ Found QR code image by src pattern');
          return img as HTMLElement;
        }
      }
      
      console.log('❌ No QR code image found');
      return null;
    }

    // For other selectors, find buttons and links
    const allButtons = document.querySelectorAll('button, a[href]');
    console.log(`Found ${allButtons.length} total buttons/links on page`);
    
    for (const button of allButtons) {
      const buttonText = button.textContent?.trim() || '';
      console.log(`Checking button: "${buttonText}"`);
      
      if (texts.some(text => buttonText.includes(text))) {
        console.log(`✅ Found matching button: "${buttonText}" for selector "${selector}"`);
        return button as HTMLElement;
      }
    }
    
    console.log(`❌ No button found for selector "${selector}"`);
    
    // Fallback: try to find by partial text match
    for (const button of allButtons) {
      const buttonText = button.textContent?.trim() || '';
      const selectorWords = selector.split('-');
      
      if (selectorWords.some(word => 
        buttonText.toLowerCase().includes(word.toLowerCase())
      )) {
        console.log(`🔄 Found button by partial match: "${buttonText}" for selector "${selector}"`);
        return button as HTMLElement;
      }
    }
    
    return null;
  };

  useEffect(() => {
    console.log('useEffect triggered - isOpen:', isOpen, 'currentStep:', currentStep);
    if (isOpen) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        console.log('Timeout completed, calling showCurrentButtonTooltip');
        showCurrentButtonTooltip();
      }, 100);
    } else {
      console.log('Removing highlights');
      removeAllHighlights();
    }
  }, [isOpen, currentStep]);

  const showCurrentButtonTooltip = () => {
    const currentGuide = buttonGuides[currentStep];
    console.log('Looking for button with selector:', currentGuide.selector);
    
    const button = findButtonByContent(currentGuide.selector);
    console.log('Found button:', button);
    
    if (button) {
      removeAllHighlights();
      button.classList.add('onboarding-highlight');
      
      // Scroll button into view smoothly
      button.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
      
      console.log('✅ Button highlighted successfully');
      
    } else {
      console.error('Button not found with selector:', currentGuide.selector);
      console.log('Available buttons on page:');
      const allButtons = document.querySelectorAll('button, a[href]');
      allButtons.forEach((btn, index) => {
        console.log(`${index}:`, btn.textContent?.trim(), btn.tagName, btn.className);
      });
    }
  };



  const removeAllHighlights = () => {
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
  };

  const handleNext = () => {
    if (currentStep < buttonGuides.length - 1) {
      setCurrentStep(currentStep + 1);
      setCompletedSteps(prev => new Set([...prev, buttonGuides[currentStep].id]));
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

  const handleClose = () => {
    onClose();
    localStorage.setItem('loadingPageOnboardingCompleted', 'true');
    removeAllHighlights();
  };

  if (!isOpen) {
    return null;
  }

  const currentGuide = buttonGuides[currentStep];

  return (
    <>
      {/* Overlay Background */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={handleClose} />
      
      {/* Fixed Onboarding Panel on Right Side */}
      <div className="fixed top-4 right-4 w-96 bg-white rounded-lg border border-gray-200 shadow-xl z-50 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <HelpCircle className="w-6 h-6" />
              <h3 className="font-semibold text-xl">Getting Started Guide</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center space-x-1 overflow-x-auto">
            {buttonGuides.map((guide, index) => (
              <button
                key={guide.id}
                onClick={() => handleStepClick(index)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-all whitespace-nowrap text-xs ${
                  index === currentStep
                    ? 'bg-white/20 text-white border border-white/30'
                    : completedSteps.has(guide.id)
                    ? 'bg-green-500/20 text-green-100 border border-green-300/30'
                    : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20'
                }`}
              >
                {completedSteps.has(guide.id) ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="w-3 h-3 rounded-full border-2 border-current flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                )}
                <span className="font-medium">{guide.id === 'qr-scan' ? 'QR' : 
                  guide.id === 'wait-authentication' ? 'Auth' :
                  guide.id === 'navigate-chat' ? 'Chat' :
                  guide.id === 'refresh-button' ? 'Refresh' :
                  guide.id === 'reinitialize-bot' ? 'Restart' :
                  guide.id === 'pairing-code' ? 'Pair' :
                  guide.id === 'get-pairing-code' ? 'Pair' :
                  guide.id === 'need-help' ? 'Help' :
                  guide.id === 'logout' ? 'Logout' :
                  guide.id === 'retry-connection' ? 'Retry' :
                  guide.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              {currentGuide.title}
            </h2>
            <p className="text-gray-600 text-base">
              {currentGuide.description}
            </p>
          </div>

          {/* Features & Benefits */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <Zap className="w-5 h-5 text-yellow-500 mr-3" />
                What it does
              </h4>
              <ul className="space-y-2">
                {currentGuide.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 text-blue-500 mr-3" />
                Why it's useful
              </h4>
              <ul className="space-y-2">
                {currentGuide.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tip */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                <strong>Tip:</strong> {currentGuide.id === 'qr-scan' ? 'Follow the steps above: Open WhatsApp > Settings > Linked Devices > Link a Device, then scan this QR code!' : 
                  currentGuide.id === 'wait-authentication' ? 'Watch the status indicators to see your connection progress!' :
                  currentGuide.id === 'navigate-chat' ? 'You\'ll be automatically redirected once everything is ready!' :
                  currentGuide.id === 'refresh-button' ? 'Click this button to update your WhatsApp connection status and fetch the latest data!' :
                  currentGuide.id === 'reinitialize-bot' ? 'Click this button to completely restart your WhatsApp bot connection if you encounter persistent issues.' :
                  currentGuide.id === 'pairing-code-toggle' ? 'If QR scanning doesn\'t work, you can switch to phone number pairing.' :
                  currentGuide.id === 'get-pairing-code' ? 'If you prefer not to use QR codes, you can generate a pairing code to authenticate your WhatsApp account.' :
                  currentGuide.id === 'need-help' ? 'If you need assistance, our support team is here to help!' :
                  currentGuide.id === 'logout' ? 'If you want to sign out of your Juta CRM account, click this button.' :
                  currentGuide.id === 'retry-connection' ? 'If you\'re experiencing connection issues, clicking this button will attempt to reconnect to the WebSocket server.' :
                  'The highlighted element below shows you exactly where this feature is located!'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="text-xs text-gray-500">
              {currentStep + 1} of {buttonGuides.length}
            </div>

            {currentStep === buttonGuides.length - 1 ? (
              <button
                onClick={handleClose}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Complete Guide
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoadingPageOnboarding;
