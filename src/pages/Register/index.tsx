import ThemeSwitcher from "@/components/ThemeSwitcher";

import logoUrl from "@/assets/images/logo.png";
import logoUrl2 from "@/assets/images/logo3.png";
import { FormInput } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import clsx from "clsx";
import { Link, useNavigate } from "react-router-dom";
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, getDocs, addDoc, query, where, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from "axios";
import { getCountries, getCountryCallingCode, parsePhoneNumber, AsYouType, CountryCode } from 'libphonenumber-js'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function Main() {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [quotaLeads, setQuotaLeads] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [weightage, setWeightage] = useState(0);

  
  const [registerResult, setRegisterResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('MY');
  const navigate = useNavigate();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldown]);

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const formatPhoneNumber = (number: string) => {
    try {
      const phoneNumber = parsePhoneNumber(number, selectedCountry);
      return phoneNumber ? phoneNumber.format('E.164') : number;
    } catch (error) {
      // If parsing fails, return the original format with country code
      const countryCode = getCountryCallingCode(selectedCountry);
      const cleaned = number.replace(/[^\d]/g, '');
      return `+${countryCode}${cleaned}`;
    }
  };

  const sendVerificationCode = async () => {
    try {
      // Validate phone number
      if (phoneNumber.length < 10) {
        toast.error("Please enter a valid phone number");
        return;
      }
      // Double check if phone number is still available
      const isRegistered = await isPhoneNumberRegistered(phoneNumber);
      if (isRegistered) {
        toast.error("This phone number is already registered");
        return;
      }
      const formattedPhone = formatPhoneNumber(phoneNumber).substring(1) + '@c.us'; // Remove '+' for WhatsApp
      const code = generateVerificationCode();
      localStorage.setItem('verificationCode', code);
      const user = getAuth().currentUser;
      if (!user) {
        console.error("User not authenticated");
      }
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
        return;
      }
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        
        return;
      }
      const data2 = docSnapshot.data();
      const baseUrl = data2.apiUrl || 'https://juta-dev.ngrok.dev';
      const response = await fetch(`${baseUrl}/api/v2/messages/text/001/${formattedPhone}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Your verification code is: ${code}`,
          phoneIndex: 0,
          userName: "System"
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send verification code');
      }

      setIsVerificationSent(true);
      setVerificationStep(true);
      setCooldown(10);
      toast.success("Verification code sent!");
    } catch (error) {
      toast.error("Failed to send verification code");
      console.error(error);
    }
  };

  const isPhoneNumberRegistered = async (phoneNumber: string) => {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const usersRef = collection(firestore, "user");
      // Check both phone and phoneNumber fields
      const q1 = query(usersRef, where("phone", "==", formattedPhone));
      const q2 = query(usersRef, where("phoneNumber", "==", formattedPhone));
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      return !snapshot1.empty || !snapshot2.empty;
    } catch (error) {
      console.error("Error checking phone number:", error);
      throw error;
    }
  };

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      // Validate plan selection
      // The plan selection is now automatic for all users
  
      // Generate a unique company ID with proper padding
      const timestamp = Date.now().toString().slice(-6);
      const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const newCompanyId = `${randomPart}${timestamp.slice(-3)}`;

      // Call the localhost API endpoint to create user with companyId
      const userResponse = await axios.post(`https://juta-dev.ngrok.dev/api/create-user/${encodeURIComponent(email)}/${encodeURIComponent(formatPhoneNumber(phoneNumber))}/${encodeURIComponent(password)}/1/${newCompanyId}`);
  
            if (userResponse.data) {
        // Call the channel create endpoint with additional data
        const channelResponse = await axios.post(`https://juta-dev.ngrok.dev/api/channel/create/${newCompanyId}`, {
          name: name,
          companyName: companyName,
          phoneNumber: formatPhoneNumber(phoneNumber),
          email: email,
          password: password,
          plan: 'free', // All users are now free
          country: selectedCountry
        });
  
        if (channelResponse.data) {
          // Sign in the user after successful registration
          navigate('/onboarding');
          toast.success("Registration successful!");
        }
      }
  
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", error.response?.data || error.message);
        toast.error(`Registration failed: ${error.response?.data?.message || error.message}`);
      } else if (error instanceof Error) {
        console.error("Error registering user:", error);
        setRegisterResult(error.message);
        toast.error("Failed to register user: " + error.message);
      } else {
        console.error("Unexpected error:", error);
        setRegisterResult("Unexpected error occurred");
        toast.error("Failed to register user: Unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: { key: string; }) => {
    if (event.key === "Enter") {
      handleRegister();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatter = new AsYouType(selectedCountry);
    const formatted = formatter.input(e.target.value);
    setPhoneNumber(formatted);
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
                  console.error('Logo failed to load:', logoUrl2);
                  // Fallback to logo2 if logo fails
                  e.currentTarget.src = logoUrl2;
                }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create your account to start managing your business
            </p>
          </div>

          {/* Main Content Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-full max-w-lg">
            
            {/* Sign Up Form */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                    Full Name
                  </label>
                  <FormInput
                    type="text"
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 text-sm"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                    Company Name
                  </label>
                  <FormInput
                    type="text"
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 text-sm"
                    placeholder="Enter company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">
                  Phone Number
                </label>
                <FormInput
                  type="tel"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200 text-sm"
                  placeholder={`Phone Number (e.g., ${getCountryCallingCode(selectedCountry)}123456789)`}
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onKeyDown={handleKeyDown}
                />
              </div>

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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

           

              {/* Register Button */}
              <Button
                variant="primary"
                className="w-full px-3 py-1.5 text-sm font-semibold rounded-md hover:shadow-md transition-all duration-200 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>

              {/* Error Message */}
              {registerResult && (
                <div className="p-1.5 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-xs">{registerResult}</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-1 bg-white dark:bg-gray-800 text-gray-500">Already have an account?</span>
              </div>
            </div>

            {/* Back to Login Button */}
            <Link to="/login">
              <Button
                variant="outline-secondary"
                className="w-full px-3 py-1.5 text-sm font-semibold rounded-md border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Back to Login
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
             Join Us to Automate
            </p>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default Main;