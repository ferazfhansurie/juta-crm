import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from "@/components/Base/Button";

function ThankYou() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Thank You!
          </h1>
          
          <p className="text-lg text-gray-600 leading-relaxed">
            Your feedback has been successfully submitted. We appreciate you taking the time to share your thoughts with us.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Submission Confirmed</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Your response has been recorded and will be reviewed by our team.
          </div>
        </div>


        {/* Footer */}
        <div className="mt-8 text-xs text-gray-400">
          <p>Thank you for your valuable feedback!</p>
        </div>
      </div>
    </div>
  );
}

export default ThankYou; 