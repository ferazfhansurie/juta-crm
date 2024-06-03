import React, { useState, useEffect } from "react";
import logoUrl from "@/assets/images/logo_black.png";
import { useNavigate } from "react-router-dom";
import { useContacts } from "../../contact";
import LoadingIcon from "@/components/Base/LoadingIcon";

function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { isLoading } = useContacts();

  useEffect(() => {
    let progressInterval: string | number | NodeJS.Timeout | undefined;
    if (!isLoading) {
      navigate('/chat');
    } else {
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 1 : prev));
      }, 350);
    }

    return () => clearInterval(progressInterval);
  }, [isLoading, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center w-3/4 max-w-lg text-center">
        <img alt="Logo" className="w-24 h-24" src={logoUrl} />
        <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
        <div className="w-full bg-gray-400 rounded-full h-2.5 dark:bg-gray-700 mt-4 relative">
          <div className="bg-blue-900 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="mt-1 w-full text-center">
          <span className="font-semibold truncate">{progress.toFixed(2)}%</span>
        </div>
        <div className="mt-2 text-xs">
          Fetching Data...
        </div>
      </div>
    </div>
  );
}

export default LoadingPage;
