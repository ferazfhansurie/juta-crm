import React, { useState, useEffect } from "react";
import logoUrl from "@/assets/images/logo_black.png";
import { useNavigate } from "react-router-dom";
import { useContacts } from "../../contact";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useConfig } from '../../config';

function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { isLoading } = useContacts();
  const { config: initialContacts } = useConfig();

  useEffect(() => {
    let progressInterval: string | number | NodeJS.Timeout | undefined;
    if (!isLoading) {
      console.log(initialContacts.name);
      if(initialContacts.name === "Infinity Pilates & Physiotherapy")
    {
      navigate('/calendar');
    }else{
      navigate('/chat');
    }
    } else {
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 1 : prev));
      }, 500);
    }

    return () => clearInterval(progressInterval);
  }, [isLoading, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center w-3/4 max-w-lg text-center">
        <img alt="Logo" className="w-24 h-24" src={logoUrl} />
        <LoadingIcon icon="spinning-circles" className="w-12 h-12"  />
        <div className="mt-2 text-xs">
          Fetching Data...
        </div>
      </div>
    </div>
  );
}

export default LoadingPage;
