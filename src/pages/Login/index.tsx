import logoUrl from "@/assets/images/logo.png";
import logoUrl2 from "@/assets/images/logo3.png";
import illustrationUrl from "@/assets/images/illustration.svg";
import { FormInput, FormCheck } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import clsx from "clsx";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { co } from "@fullcalendar/core/internal-common";
import { API_ENDPOINTS } from "@/config/backend";

function Main() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();
  const [resetPhoneNumber, setResetPhoneNumber] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: phone number, 2: code + new password
  const [formattedPhone, setFormattedPhone] = useState("");

  const handleSignIn = async () => {
    setError("");
    try {
      console.log('Sending login request with:', { email });
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      console.log('Login response:', data);
      if (response.ok) {
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userData', JSON.stringify(data.user));
        navigate('/loading');
      } else {
        setError(data.error || "An error occurred during sign-in. Please try again later.");
      }
    } catch (err) {
      console.error('Login error:', err);
      setError("An error occurred during sign-in. Please try again later.");
    }
  };

  const handleKeyDown = (event: { key: string; }) => {
    if (event.key === "Enter") {
      handleSignIn();
    }
  };

  const handleStartFreeTrial = () => {
    navigate('/register');
  };

  const formatPhoneNumber = (phone: string) => {
    let formatted = phone.toString();
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    if (formatted.startsWith('60')) {
      formatted = formatted;
    } else if (formatted.startsWith('0')) {
      formatted = '60' + formatted.substring(1);
    } else {
      formatted = '60' + formatted;
    }
    return formatted;
  };

  const handleForgotPassword = async () => {
    setError("");
    setResetMessage("");
    setIsResetting(true);
    
    if (!resetPhoneNumber) {
      setResetMessage("Please enter your phone number.");
      setIsResetting(false);
      return;
    }

    try {
      const formattedPhone = formatPhoneNumber(resetPhoneNumber);
      setFormattedPhone(formattedPhone);

      const response = await fetch(API_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage(`Password reset code sent to your WhatsApp number ${data.phoneNumber || formattedPhone.replace('60', '+60-')}. Please check your WhatsApp and enter the code below.`);
        setResetStep(2);
      } else {
        setResetMessage(data.error || "An error occurred. Please try again later.");
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setResetMessage("An error occurred. Please try again later.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword || !confirmPassword) {
      setResetMessage("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetMessage("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setResetMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsResetting(true);
    setResetMessage("");

    try {
      const response = await fetch(API_ENDPOINTS.resetPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: formattedPhone, 
          resetCode, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage("Password updated successfully! You can now sign in with your new password.");
        setTimeout(() => {
          setShowResetModal(false);
          setResetMessage("");
          setResetStep(1);
          setResetPhoneNumber("");
          setResetCode("");
          setNewPassword("");
          setConfirmPassword("");
          setFormattedPhone("");
        }, 3000);
      } else {
        setResetMessage(data.error || "An error occurred. Please try again later.");
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      setResetMessage("An error occurred. Please try again later.");
    } finally {
      setIsResetting(false);
    }
  };

  const resetModal = () => {
    setShowResetModal(false);
    setResetMessage("");
    setResetStep(1);
    setResetPhoneNumber("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setFormattedPhone("");
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-4">
        <div className="flex flex-col items-center w-full max-w-2xl text-center px-3 py-4">
          
          {/* Main Title and Logo */}
          <div className="mb-4">
            <div className="mb-3 flex justify-center">
              <img
                alt="Juta Software Logo"
                className="w-20 h-auto object-contain"
                src={logoUrl}
                onError={(e) => {
                  console.error('Logo failed to load:', logoUrl);
                  // Fallback to logo2 if logo fails
                  e.currentTarget.src = logoUrl2;
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1.5">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to your Juta Web account to continue
            </p>
          </div>

          {/* Main Content Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-full max-w-sm">
            
            {/* Sign In Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                  Email Address
                </label>
                <FormInput
                  type="email"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 text-sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                  Password
                </label>
                <FormInput
                  type="password"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button 
                  onClick={() => setShowResetModal(true)} 
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors duration-200"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In Button */}
              <Button
                variant="primary"
                className="w-full px-3 py-1.5 text-sm font-semibold rounded-md hover:shadow-md transition-all duration-200 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                onClick={handleSignIn}
              >
                Sign In
              </Button>

              {/* Error Message */}
              {error && (
                <div className="p-1.5 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-1 bg-white dark:bg-gray-800 text-gray-500">New to Juta?</span>
              </div>
            </div>

            {/* Register Button */}
            <Button
              variant="outline-secondary"
              className="w-full px-3 py-1.5 text-sm font-semibold rounded-md border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
              onClick={handleStartFreeTrial}
            >
              Create New Account
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Secure access to your business dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-full max-w-sm mx-2">
            <div className="text-center mb-3">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Reset Password</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {resetStep === 1 
                  ? "Enter your phone number to receive a password reset code via WhatsApp"
                  : "Enter the reset code sent to your WhatsApp and set a new password"
                }
              </p>
            </div>
            
            <div className="space-y-2">
              {resetStep === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                      Phone Number
                    </label>
                                          <FormInput
                        type="text"
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        placeholder="Enter your phone number (e.g., 0123456789)"
                        value={resetPhoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                          setResetPhoneNumber(value);
                        }}
                        maxLength={15}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-left">
                        Enter your phone number without country code (e.g., 0123456789)
                      </p>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full px-2 py-1.5 rounded-md text-sm"
                    onClick={handleForgotPassword}
                    disabled={isResetting}
                  >
                                         {isResetting ? "Sending..." : "Send WhatsApp Code"}
                  </Button>
                </>
              )}
              {resetStep === 2 && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                      Reset Code
                    </label>
                    <FormInput
                      type="text"
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                      placeholder="Enter 6-digit reset code"
                      value={resetCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setResetCode(value);
                      }}
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                      New Password
                    </label>
                    <FormInput
                      type="password"
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                      Confirm New Password
                    </label>
                    <FormInput
                      type="password"
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="primary"
                    className="w-full px-2 py-1.5 rounded-md text-sm"
                    onClick={handleResetPassword}
                    disabled={isResetting}
                  >
                    {isResetting ? "Resetting..." : "Reset Password"}
                  </Button>
                </>
              )}

              {resetMessage && (
                <div className={`p-1.5 rounded-md text-xs ${
                  resetMessage.includes("sent") || resetMessage.includes("successfully")
                    ? "bg-green-50 border border-green-200 text-green-700" 
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  {resetMessage}
                </div>
              )}

              <div className="flex gap-1.5 pt-1">
                <Button
                  variant="outline-secondary"
                  className="flex-1 px-2 py-1.5 rounded-md border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 text-sm"
                  onClick={resetModal}
                >
                  Cancel
                </Button>
                {/* Only show "Send WhatsApp Code" button if in step 1 */}
                {resetStep === 1 && (
                  <Button
                    variant="primary"
                    className="flex-1 px-2 py-1.5 rounded-md text-sm"
                    onClick={handleForgotPassword}
                    disabled={isResetting}
                  >
                    {isResetting ? "Sending..." : "Send WhatsApp Code"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Main;