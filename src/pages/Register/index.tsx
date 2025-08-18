import ThemeSwitcher from "@/components/ThemeSwitcher";
import logoUrl from "@/assets/images/logo3.png";
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
  const [selectedPlan, setSelectedPlan] = useState<'blaster' | 'enterprise' | null>(null);
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
      if (!selectedPlan) {
        toast.error("Please select a plan to continue");
        setIsLoading(false);
        return;
      }
  
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
          plan: selectedPlan,
          country: selectedCountry
        });
  
        if (channelResponse.data) {
          // Sign in the user after successful registration
          navigate('/loading');
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="flex flex-col items-center w-full max-w-5xl text-center px-6 py-8">
          
          {/* Main Title and Logo */}
          <div className="mb-8">
            <div className="mb-6 flex justify-center">
              <img
                alt="Juta Software Logo"
                className="w-40 h-auto object-contain"
                src={logoUrl}
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-3">
              Join Juta Web
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Create your account to start managing your business
            </p>
          </div>

          {/* Main Content Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 w-full max-w-2xl">
            
            {/* Sign Up Form */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                    Full Name
                  </label>
                  <FormInput
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                    Company Name
                  </label>
                  <FormInput
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                    placeholder="Enter company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  Phone Number
                </label>
                <FormInput
                  type="tel"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder={`Phone Number (e.g., ${getCountryCallingCode(selectedCountry)}123456789)`}
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  Email Address
                </label>
                <FormInput
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  Password
                </label>
                <FormInput
                  type="password"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Plan Selection Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-left">
                  Choose Your Plan
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ['blaster', 'Team Inbox', 'Perfect for small teams'],
                    ['enterprise', 'Standard AI', 'Advanced features for growing businesses'],
                  ].map(([id, name, description]) => (
                    <div 
                      key={id}
                      className={clsx(
                        "p-4 border-2 rounded-lg cursor-pointer transition-all duration-200",
                        selectedPlan === id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      )}
                      onClick={() => setSelectedPlan(id as 'blaster' | 'enterprise')}
                    >
                      <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">{name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Register Button */}
              <Button
                variant="primary"
                className="w-full px-6 py-3 text-base font-semibold rounded-lg hover:shadow-md transition-all duration-200 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>

              {/* Error Message */}
              {registerResult && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{registerResult}</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Already have an account?</span>
              </div>
            </div>

            {/* Back to Login Button */}
            <Link to="/login">
              <Button
                variant="outline-secondary"
                className="w-full px-6 py-3 text-base font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Back to Login
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Start your journey with Juta CRM today
            </p>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default Main;