import React, { useState, useEffect } from "react";
import logoUrl from "@/assets/images/logo_black.png";
import { useNavigate } from "react-router-dom";
import { useContacts } from "../../contact";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useConfig } from '../../config';
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
const firestore = getFirestore(app);

function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isLoading: contactsLoading } = useContacts();
  const { config: initialContacts } = useConfig();

  const fetchQRCode = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    setIsLoading(true);
    setError(null);
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        throw new Error("User document does not exist");
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        throw new Error("Company document does not exist");
      }

      const companyData = docSnapshot.data();
      if (!companyData.v2) {
        // If "v2" is not present or is false, navigate to the next page
        navigate('/chat');
        return;
      }
      //http://jutaserver.ddns.net:8443/api/bot-status

      const botStatusResponse = await axios.get(`http://jutaserver.ddns.net:8443/api/bot-status/${companyId}`);
      if (botStatusResponse.status !== 200) {
        throw new Error(`Unexpected response status: ${botStatusResponse.status}`);
      }

      const { status, qrCode } = botStatusResponse.data;
      setBotStatus(status);
      if (status === 'qr') {
        setQrCodeImage(qrCode);
        console.log({companyId});
      } else {
        navigate(status === 'authenticated' || status === 'ready' ? '/calendar' : '/chat');
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data || 'Failed to fetch QR code. Please try again.');
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      console.error("Error fetching QR code:", error);
    }
  };

  useEffect(() => {
    fetchQRCode();
  }, []);

  useEffect(() => {
    let progressInterval: string | number | NodeJS.Timeout | undefined;
    if (!contactsLoading && !isLoading && botStatus === 'qr') {
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 1 : prev));
      }, 500);
    }

    return () => clearInterval(progressInterval);
  }, [contactsLoading, isLoading, botStatus]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-15">
        <img alt="Logo" className="w-40 h-40 p-15" src={logoUrl} />
        {botStatus === 'qr' ? (
          <>
            <div className="mt-2 text-md p-15">
              Please use your WhatsApp QR scanner to scan the code and proceed.
            </div>
            {error && <div className="text-red-500">{error}</div>}
            {qrCodeImage && (
              <div>
                <img src={qrCodeImage} alt="QR Code" />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mt-2 text-xs p-15">
              Fetching Data...
            </div>
            <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
          </>
        )}
      </div>
    </div>
  );
}

export default LoadingPage;