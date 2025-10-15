import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import axios from "axios";
import { initializeApp } from "firebase/app";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Link } from "react-router-dom";
import Button from "@/components/Base/Button";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { selectColorScheme, setColorScheme } from "@/stores/colorSchemeSlice";
import { selectDarkMode, setDarkMode } from "@/stores/darkModeSlice";
import { toast } from "react-toastify";
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { BACKEND_URL } from "@/config/backend";

function SettingsPage() {
  const dispatch = useAppDispatch();
  const activeColorScheme = useAppSelector(selectColorScheme);
  const activeDarkMode = useAppSelector(selectDarkMode);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("09:00");
  const [groupId, setGroupId] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [phoneCount, setPhoneCount] = useState(0);
  const [role, setRole] = useState<string>("");
  const [aiDelay, setAiDelay] = useState<number>(0);
  const [aiAutoResponse, setAiAutoResponse] = useState(false);

  // Auto-reply settings state
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyHours, setAutoReplyHours] = useState("6");
  const [isSavingAutoReply, setIsSavingAutoReply] = useState(false);

  // Manual report trigger state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isTriggeringManualReport, setIsTriggeringManualReport] = useState(false);

  // New state for companyId change functionality
  const [userEmail, setUserEmail] = useState<string>("");
  const [showCompanyIdChange, setShowCompanyIdChange] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState("");
  const [isChangingCompanyId, setIsChangingCompanyId] = useState(false);

  // Bot disconnect functionality state
  const [botStatuses, setBotStatuses] = useState<Map<string, string>>(
    new Map()
  );
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectBotName, setDisconnectBotName] = useState<string>("");
  const [disconnectPhoneIndex, setDisconnectPhoneIndex] = useState<
    number | undefined
  >(undefined);

  interface Phone {
    phoneIndex: number;
    status: string;
    qrCode: string | null;
    phoneInfo: string;
  }

  interface QRCodeData {
    phoneIndex: number;
    status: string;
    qrCode: string | null;
    phoneInfo: string | null;
  }

  interface BotStatusResponse {
    qrCode: string | null;
    status: string;
    phoneInfo: boolean;
    phones: Phone[];
    companyId: string;
    v2: boolean;
    trialEndDate: string | null;
    apiUrl: string | null;
    phoneCount: number;
  }

  // Phone status and QR code data
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    fetchSettings();
   
  }, []);

  // Fetch phone status and names when both companyId and apiUrl are available
  useEffect(() => {
    if (companyId && apiUrl && userEmail) {
      fetchPhoneStatus();
      fetchPhoneNames();

      // Set up interval to refresh phone status
      const interval = setInterval(fetchPhoneStatus, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [companyId, apiUrl, userEmail]);

  const fetchSettings = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      setUserEmail(userEmail || "");

      if (!userEmail) {
        throw new Error("No user email found in localStorage");
      }

      // Check if email includes juta.com
      if (userEmail.includes("juta.com")) {
        setShowCompanyIdChange(true);
      }

      setIsLoading(true);

      // 1. Get user data (companyId and role) from user-data API
      const userResponse = await axios.get(
        `${BACKEND_URL.apiUrl}/user-data/${userEmail}`
      );
      const userData = userResponse.data;

      if (!userData) {
        throw new Error("User data not found");
      }
      console.log("userData in settings:", userData);

      const userCompanyId = userData.company_id;
      setCompanyId(userCompanyId);
      setShowAddUserButton(userData.role === "1" || userData.role === "admin");
      setRole(userData.role);

      // 2. Get comprehensive company data from company-config API
      const companyConfigResponse = await axios.get(
        `${BACKEND_URL.apiUrl}/company-config/${userCompanyId}`
      );
      const configData = companyConfigResponse.data;

      if (!configData || !configData.companyData) {
        throw new Error("Company configuration not found");
      }

      const { companyData } = configData;
      console.log("companyData:", companyData);

      // 3. Get API URL from user-company-data endpoint (for api_url field)
      const userCompanyResponse = await axios.get(
        `${BACKEND_URL.apiUrl}/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );
      const userCompanyData = userCompanyResponse.data;
      console.log("userCompanyData:", userCompanyData);

      // Set API URL - use the one from company data or fall back to default
      const dynamicApiUrl =
        userCompanyData?.companyData?.api_url || companyData.apiUrl;
 
      setApiUrl("https://bisnesgpt.serveo.net");

      // Set phone and AI settings from company config
      setPhoneCount(companyData.phoneCount || 0);
      setAiDelay(companyData.aiDelay || 0);
      setAiAutoResponse(companyData.aiAutoResponse || false);

      // 4. Handle daily report settings from dailyReport JSONB
      if (
        companyData.dailyReport &&
        typeof companyData.dailyReport === "object"
      ) {
        const dailyReportData = companyData.dailyReport;
        setEnabled(dailyReportData.enabled || false);
        setTime(dailyReportData.time || "09:00");
        setGroupId(dailyReportData.groupId || "");
        setLastRun(
          dailyReportData.lastRun
            ? new Date(dailyReportData.lastRun).toLocaleString()
            : null
        );
      } else {
        // If dailyReport is null or not an object, set defaults
        setEnabled(false);
        setTime("09:00");
        setGroupId("");
        setLastRun(null);
      }

      // 5. Fetch phone status and names now that we have both companyId and apiUrl
      const finalApiUrl = "https://bisnesgpt.serveo.net";
      if (userCompanyId && finalApiUrl) {
        try {
          // Fetch phone status immediately with the correct API URL
          const statusResponse = await axios.get(
            `${finalApiUrl}/api/bot-status/${userCompanyId}`
          );

          if (statusResponse.status === 200) {
            const data: BotStatusResponse = statusResponse.data;
            let qrCodesData: QRCodeData[] = [];

            if (data.phones && Array.isArray(data.phones)) {
              qrCodesData = data.phones.map((phone: Phone) => ({
                phoneIndex: phone.phoneIndex,
                status: phone.status,
                qrCode: phone.qrCode,
                phoneInfo:
                  typeof phone.phoneInfo === "string" ? phone.phoneInfo : null,
              }));
            } else if (
              (data.phoneCount === 1 || data.phoneCount === 0) &&
              data.phoneInfo
            ) {
              qrCodesData = [
                {
                  phoneIndex: 0,
                  status: data.status,
                  qrCode: data.qrCode,
                  phoneInfo:
                    typeof data.phoneInfo === "string" ? data.phoneInfo : null,
                },
              ];
            }
            setQrCodes(qrCodesData);
          }

          // Fetch phone names from user-page-context API
          try {
            const phoneNamesResponse = await axios.get(
              `${finalApiUrl}/api/user-page-context?email=${encodeURIComponent(
                userEmail
              )}`
            );

            if (
              phoneNamesResponse.status === 200 &&
              phoneNamesResponse.data.phoneNames
            ) {
              console.log(
                "Setting phone names from user-page-context:",
                phoneNamesResponse.data.phoneNames
              );
              setPhoneNames(phoneNamesResponse.data.phoneNames);
            } else {
              // Fallback: create default phone names based on phone count
              const phoneCount = companyData.phoneCount || 0;
              console.log(
                "Creating default phone names for phone count:",
                phoneCount
              );
              const defaultPhoneNames: { [key: number]: string } = {};
              for (let i = 0; i < phoneCount; i++) {
                defaultPhoneNames[i] = `Phone ${i + 1}`;
              }
              setPhoneNames(defaultPhoneNames);
            }
          } catch (phoneNamesError) {
            console.warn(
              "Error fetching phone names from user-page-context:",
              phoneNamesError
            );
            // Fallback: create default phone names based on phone count
            const phoneCount = companyData.phoneCount || 0;
            const defaultPhoneNames: { [key: number]: string } = {};
            for (let i = 0; i < phoneCount; i++) {
              defaultPhoneNames[i] = `Phone ${i + 1}`;
            }
            setPhoneNames(defaultPhoneNames);
          }
        } catch (phoneError) {
          console.warn(
            "Error fetching phone data during initial load:",
            phoneError
          );
          // Don't throw here as this is not critical for the settings page to function
        }
      }

      // 6. Fetch auto-reply settings
      if (userCompanyId && finalApiUrl) {
        try {
          const autoReplyResponse = await axios.get(
            `${finalApiUrl}/api/auto-reply/settings/${userCompanyId}`
          );

          if (
            autoReplyResponse.status === 200 &&
            autoReplyResponse.data.success
          ) {
            const autoReplySettings = autoReplyResponse.data.settings;
            setAutoReplyEnabled(autoReplySettings.enabled || false);
            setAutoReplyHours(autoReplySettings.autoReplyHours || "6");
            console.log("Auto-reply settings loaded:", autoReplySettings);
          } else {
            // Set defaults if no settings found
            setAutoReplyEnabled(false);
            setAutoReplyHours("6");
          }
        } catch (autoReplyError) {
          console.warn("Error fetching auto-reply settings:", autoReplyError);
          // Set defaults on error
          setAutoReplyEnabled(false);
          setAutoReplyHours("6");
        }
      }

      setIsLoading(false);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error fetching settings:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load settings"
      );
      setIsLoading(false);
    }
  };

  // Helper functions for phone status and names
  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "ready":
      case "authenticated":
        return {
          text: "Connected",
          color:
            "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200",
          icon: "CheckCircle",
        };
      case "qr":
        return {
          text: "Waiting for QR",
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200",
          icon: "QrCode",
        };
      case "initializing":
        return {
          text: "Starting up",
          color:
            "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
          icon: "RefreshCw",
        };
      default:
        return {
          text: "Not Connected",
          color: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200",
          icon: "XCircle",
        };
    }
  };

  const getPhoneName = (phoneIndex: number) => {
    return phoneNames[phoneIndex] || `Phone ${phoneIndex + 1}`;
  };

  // Fetch phone status and QR codes
  const fetchPhoneStatus = async () => {
    if (!companyId || !apiUrl) return;

    try {
      setIsLoadingStatus(true);
      const response = await axios.get(`${apiUrl}/api/bot-status/${companyId}`);

      if (response.status === 200) {
        const data: BotStatusResponse = response.data;
        let qrCodesData: QRCodeData[] = [];

        // Check if phones array exists before mapping
        if (data.phones && Array.isArray(data.phones)) {
          // Multiple phones: transform array to QRCodeData[]
          qrCodesData = data.phones.map((phone: Phone) => ({
            phoneIndex: phone.phoneIndex,
            status: phone.status,
            qrCode: phone.qrCode,
            phoneInfo:
              typeof phone.phoneInfo === "string" ? phone.phoneInfo : null,
          }));
          setQrCodes(qrCodesData);
        } else if (
          (data.phoneCount === 1 || data.phoneCount === 0) &&
          data.phoneInfo
        ) {
          // Single phone: create QRCodeData from flat structure
          qrCodesData = [
            {
              phoneIndex: 0,
              status: data.status,
              qrCode: data.qrCode,
              phoneInfo:
                typeof data.phoneInfo === "string" ? data.phoneInfo : null,
            },
          ];
          setQrCodes(qrCodesData);
        } else {
          setQrCodes([]);
        }
      }
    } catch (error) {
      console.error("Error fetching phone status:", error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Fetch phone names
  const fetchPhoneNames = async () => {
    if (!companyId || !apiUrl || !userEmail) return;

    try {
      const response = await axios.get(
        `${apiUrl}/api/user-page-context?email=${encodeURIComponent(userEmail)}`
      );

      if (response.status === 200 && response.data.phoneNames) {
        console.log(
          "Setting phone names from user-page-context:",
          response.data.phoneNames
        );
        setPhoneNames(response.data.phoneNames);
      } else {
        // Fallback: create default phone names based on phone count
        const defaultPhoneNames: { [key: number]: string } = {};
        for (let i = 0; i < phoneCount; i++) {
          defaultPhoneNames[i] = `Phone ${i + 1}`;
        }
        setPhoneNames(defaultPhoneNames);
      }
    } catch (error) {
      console.error("Error fetching phone names:", error);
      // Fallback: create default phone names based on phone count
      const defaultPhoneNames: { [key: number]: string } = {};
      for (let i = 0; i < phoneCount; i++) {
        defaultPhoneNames[i] = `Phone ${i + 1}`;
      }
      setPhoneNames(defaultPhoneNames);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await axios.post(
        `${apiUrl}/api/daily-report/${companyId}`,
        {
          enabled,
          time,
          groupId,
        }
      );

      if (response.data.success) {
        alert("Settings saved successfully!");
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerReport = async () => {
    try {
      const response = await axios.post(
        `${apiUrl}/api/daily-report/${companyId}/trigger`
      );
      if (response.data.success) {
        alert(
          `Report triggered successfully! Found ${response.data.count} leads today.`
        );
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error triggering report:", error);
      alert("Failed to trigger report");
    }
  };

  const handleTriggerManualReport = async () => {
    if (!selectedDate) {
      toast.error("Please select a date first");
      return;
    }

    setIsTriggeringManualReport(true);
    try {
      const response = await axios.post(
        `${apiUrl}/api/daily-report/${companyId}/trigger`,
        {
          date: selectedDate,
        }
      );
      if (response.data.success) {
        toast.success(
          `Report sent successfully for ${response.data.date}! Found ${response.data.count} contact(s).`
        );
        setSelectedDate(""); // Reset date after successful send
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error triggering manual report:", error);
      toast.error("Failed to send report. Please try again.");
    } finally {
      setIsTriggeringManualReport(false);
    }
  };

  const handleSaveAutoReply = async () => {
    setIsSavingAutoReply(true);
    setError(null);

    try {
      const response = await axios.post(
        `${apiUrl}/api/auto-reply/settings/${companyId}`,
        {
          enabled: autoReplyEnabled,
          autoReplyHours: autoReplyHours,
        }
      );

      if (response.data.success) {
        alert("Auto-reply settings saved successfully!");
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error saving auto-reply settings:", error);
      setError("Failed to save auto-reply settings");
    } finally {
      setIsSavingAutoReply(false);
    }
  };

  const handleChangeCompanyId = async () => {
    if (!newCompanyId.trim()) {
      alert("Please enter a valid Company ID");
      return;
    }

    setIsChangingCompanyId(true);
    setError(null);

    try {
      // Update user's company_id in the database
      const response = await axios.put(
        `${BACKEND_URL.apiUrl}/user-data/${userEmail}`,
        {
          company_id: newCompanyId.trim(),
        }
      );

      if (response.data.success) {
        alert(
          "Company ID changed successfully! Please refresh the page to see the changes."
        );
        setCompanyId(newCompanyId.trim());
        setNewCompanyId("");
        // Optionally refresh the page or refetch settings
        window.location.reload();
      } else {
        throw new Error(response.data.error || "Failed to change Company ID");
      }
    } catch (error) {
      console.error("Error changing Company ID:", error);
      setError("Failed to change Company ID. Please try again.");
    } finally {
      setIsChangingCompanyId(false);
    }
  };

  // Bot disconnect functionality
  const showNotification = (message: string, isError: boolean = false) => {
    if (isError) {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  const updateBotStatus = (
    botName: string,
    status: string,
    phoneIndex?: number
  ) => {
    const key = phoneIndex !== undefined ? `${botName}_${phoneIndex}` : botName;
    setBotStatuses((prev) => new Map(prev.set(key, status)));
  };

  const showDisconnectConfirmation = (botName: string, phoneIndex?: number) => {
    setDisconnectBotName(botName);
    setDisconnectPhoneIndex(phoneIndex);
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = async () => {
    if (!disconnectBotName) return;

    try {
      setIsDisconnecting(true);
      setShowDisconnectModal(false);

      // If disconnectPhoneIndex is undefined, disconnect all phones
      if (disconnectPhoneIndex === undefined) {
        console.log(`Disconnecting all phones for bot: ${disconnectBotName}`);

        // Show processing notification
        showNotification(
          `Disconnecting all phones for ${disconnectBotName}...`
        );

        // Disconnect all phones sequentially
        for (let i = 0; i < phoneCount; i++) {
          try {
            console.log(`Disconnecting phone ${i + 1} of ${phoneCount}`);

            const response = await fetch(
              `${apiUrl}/api/bots/${disconnectBotName}/disconnect`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ disconnectPhoneIndex: i }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.error || `Failed to disconnect phone ${i + 1}`
              );
            }

            const data = await response.json();

            // Update status for this phone
            updateBotStatus(disconnectBotName, "Disconnected", i);

            // Show progress notification
            showNotification(
              `Phone ${i + 1} of ${phoneCount} disconnected successfully`
            );

            // Add a small delay between disconnections to avoid overwhelming the server
            if (i < phoneCount - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (phoneError) {
            console.error(`Error disconnecting phone ${i + 1}:`, phoneError);
            showNotification(
              `Failed to disconnect phone ${
                i + 1
              }. Continuing with remaining phones.`,
              true
            );
          }
        }

        // Show final success notification
        showNotification(
          `All phones for ${disconnectBotName} have been processed`
        );
      } else {
        // Disconnect specific phone
        console.log(
          `Disconnecting bot: ${disconnectBotName}, Phone Index: ${disconnectPhoneIndex}`
        );

        // Show processing notification
        showNotification(
          `Disconnecting ${disconnectBotName} Phone ${
            disconnectPhoneIndex + 1
          }...`
        );

        const response = await fetch(
          `${apiUrl}/api/bots/${disconnectBotName}/disconnect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ disconnectPhoneIndex }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to disconnect bot");
        }

        const data = await response.json();

        // Update status for specified phone
        updateBotStatus(
          disconnectBotName,
          "Disconnected",
          disconnectPhoneIndex
        );

        // Show success notification
        showNotification(
          data.message ||
            `${disconnectBotName} Phone ${
              disconnectPhoneIndex + 1
            } disconnected successfully`
        );
      }
    } catch (error) {
      console.error("Error disconnecting bot:", error);
      showNotification("Failed to disconnect bot. Please try again.", true);
    } finally {
      setIsDisconnecting(false);
      setDisconnectBotName("");
      setDisconnectPhoneIndex(undefined);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingIcon icon="three-dots" className="w-20 h-20" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Modern Glassmorphism Layout */}
      <div className="min-h-screen backdrop-blur-3xl">
        {/* Top Navigation Bar with Enhanced Glassmorphism */}
        <div className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border-b border-white/30 dark:border-slate-700/40 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/30">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Link to="/users-layout-2">
                  <Button
                    variant="outline-secondary"
                    className="group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-slate-300/60 dark:hover:border-slate-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/10 dark:hover:shadow-slate-500/20 rounded-xl hover:scale-105 transform-gpu"
                  >
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-600/20 dark:from-slate-400/20 dark:to-slate-500/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40 group-hover:scale-110 transition-transform duration-300">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm font-medium">Back</span>
                  </Button>
                </Link>
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Settings
                </h1>
              </div>
              <ThemeSwitcher />
            </div>
          </div>
        </div>

        {/* Main Content Area with Enhanced Glassmorphism */}
        <div className="max-w-7xl mx-auto p-4 pb-8">
          {/* Navigation Buttons */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-4 mb-4 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            <div className="flex flex-wrap gap-4">
              <Link to="/loading2">
                {showAddUserButton && phoneCount >= 2 && (
                  <Button
                    variant="primary"
                    className="group bg-gradient-to-r from-blue-500/90 to-indigo-500/90 hover:from-blue-600/90 hover:to-indigo-600/90 backdrop-blur-sm border-blue-400/30 shadow-xl shadow-blue-500/30 transition-all duration-300 rounded-xl px-6 py-3 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-blue-500/40"
                  >
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm font-medium">Add Number</span>
                  </Button>
                )}
              </Link>

              <Link to="/quick-replies">
                <Button
                  variant="primary"
                  className="group bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600/90 hover:to-green-600/90 backdrop-blur-sm border-emerald-400/30 shadow-xl shadow-emerald-500/30 transition-all duration-300 rounded-xl px-6 py-3 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-emerald-500/40"
                >
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <span className="ml-2 text-sm font-medium">Quick Replies</span>
                </Button>
              </Link>

              {companyId === "0380" && (
                <Link to="/feedback-form-builder">
                  <Button
                    variant="primary"
                    className="group bg-gradient-to-r from-purple-500/90 to-pink-500/90 hover:from-purple-600/90 hover:to-pink-600/90 backdrop-blur-sm border-purple-400/30 shadow-xl shadow-purple-500/30 transition-all duration-300 rounded-xl px-6 py-3 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-purple-500/40"
                  >
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm font-medium">
                      Feedback Form Builder
                    </span>
                  </Button>
                </Link>
              )}

              {companyId === "0123" && (
                <Link to="/storage-pricing">
                  <Button
                    variant="primary"
                    className="group bg-gradient-to-r from-orange-500/90 to-red-500/90 hover:from-orange-600/90 hover:to-red-600/90 backdrop-blur-sm border-orange-400/30 shadow-xl shadow-orange-500/30 transition-all duration-300 rounded-xl px-6 py-3 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-orange-500/40"
                  >
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2"
                        />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm font-medium">Storage Pricing</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Theme Settings Section */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-4 mb-4 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-400/20 dark:to-purple-400/20 backdrop-blur-sm border border-indigo-200/40 dark:border-indigo-700/40">
                <svg
                  className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Theme Settings
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Appearance Mode
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => dispatch(setDarkMode(false))}
                    className={`group relative px-8 py-4 rounded-2xl border transition-all duration-300 backdrop-blur-sm ${
                      !activeDarkMode
                        ? "bg-gradient-to-r from-yellow-400/90 to-orange-500/90 text-white border-yellow-300/50 shadow-2xl shadow-yellow-500/40"
                        : "bg-white/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-white/30 dark:border-slate-600/40 hover:bg-white/70 dark:hover:bg-slate-600/60 hover:scale-105 transform-gpu"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 shadow-xl shadow-yellow-500/30"></div>
                      <span className="text-sm font-semibold">Light Mode</span>
                    </div>
                  </button>

                  <button
                    onClick={() => dispatch(setDarkMode(true))}
                    className={`group relative px-8 py-4 rounded-2xl border transition-all duration-300 backdrop-blur-sm ${
                      activeDarkMode
                        ? "bg-gradient-to-r from-slate-600/90 to-slate-800/90 text-white border-slate-500/50 shadow-2xl shadow-slate-700/40"
                        : "bg-white/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-white/30 dark:border-slate-600/40 hover:bg-white/70 dark:hover:bg-slate-600/60 hover:scale-105 transform-gpu"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-slate-600 to-slate-800 shadow-xl shadow-slate-700/30"></div>
                      <span className="text-sm font-semibold">Dark Mode</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Company ID Change Section - Only show for juta.com users */}
          {showCompanyIdChange && (
            <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-4 mb-4 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 dark:from-orange-400/20 dark:to-red-400/20 backdrop-blur-sm border border-orange-200/40 dark:border-orange-700/40">
                  <svg
                    className="w-6 h-6 text-orange-600 dark:text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
                  Change Company ID
                </h2>
              </div>

              {error && (
                <div className="backdrop-blur-sm bg-red-100/80 border border-red-400/50 text-red-700 px-6 py-4 rounded-2xl mb-6 shadow-lg">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                  <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Current Company ID
                  </label>
                  <input
                    type="text"
                    value={companyId || ""}
                    disabled
                    className="w-full px-6 py-4 border border-white/30 dark:border-slate-600/40 rounded-2xl backdrop-blur-sm bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-medium shadow-lg"
                  />
                </div>

                <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                  <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    New Company ID
                  </label>
                  <input
                    type="text"
                    value={newCompanyId}
                    onChange={(e) => setNewCompanyId(e.target.value)}
                    placeholder="Enter new Company ID"
                    className="w-full px-6 py-4 border border-white/30 dark:border-slate-600/40 rounded-2xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/30 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                  />
                </div>

                <Button
                  variant="warning"
                  onClick={handleChangeCompanyId}
                  disabled={isChangingCompanyId || !newCompanyId.trim()}
                  className="group bg-gradient-to-r from-orange-500/90 to-red-500/90 hover:from-orange-600/90 hover:to-red-600/90 backdrop-blur-sm border-orange-400/30 shadow-xl shadow-orange-500/30 transition-all duration-300 rounded-xl px-8 py-4 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-orange-500/40"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold">
                      {isChangingCompanyId
                        ? "Changing..."
                        : "Change Company ID"}
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Bot Management Section */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-4 mb-4 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 backdrop-blur-sm border border-red-200/40 dark:border-red-700/40">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-red-600 to-pink-600 dark:from-red-400 dark:to-pink-400 bg-clip-text text-transparent">
                Bot Management
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                <div className="flex flex-col space-y-4">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-red-200/40 dark:border-red-700/40">
                      <svg
                        className="w-8 h-8 text-red-600 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Disconnect Bot
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Disconnect your WhatsApp bot connection
                      {phoneCount > 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Single Phone or Multiple Phones Layout */}
                  {phoneCount <= 1 ? (
                    // Single phone layout
                    <div className="flex items-center justify-center">
                      <Button
                        variant="danger"
                        onClick={() =>
                          showDisconnectConfirmation(companyId || "", 0)
                        }
                        disabled={isDisconnecting || !companyId}
                        className="group bg-gradient-to-r from-red-500/90 to-pink-500/90 hover:from-red-600/90 hover:to-pink-600/90 backdrop-blur-sm border-red-400/30 shadow-xl shadow-red-500/30 transition-all duration-300 rounded-xl px-8 py-4 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-red-500/40"
                      >
                        {isDisconnecting ? (
                          <div className="flex items-center space-x-3">
                            <LoadingIcon
                              icon="three-dots"
                              className="w-5 h-5"
                            />
                            <span className="text-sm font-semibold">
                              Disconnecting...
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                                />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold">
                              Disconnect Bot
                            </span>
                          </div>
                        )}
                      </Button>
                    </div>
                  ) : (
                    // Multiple phones layout
                    <div className="space-y-4">
                      {/* Individual Phone Disconnect */}
                      <div className="bg-gradient-to-r from-slate-100/60 to-slate-200/40 dark:from-slate-600/40 dark:to-slate-500/30 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-600/50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-6">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                              <svg
                                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Disconnect specific phone:
                              </span>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Select a phone to disconnect individually
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <select
                                value={disconnectPhoneIndex ?? 0}
                                onChange={(e) =>
                                  setDisconnectPhoneIndex(
                                    Number(e.target.value)
                                  )
                                }
                                className="appearance-none pl-6 pr-12 py-3 text-sm border border-white/40 dark:border-slate-600/40 rounded-2xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 min-w-[280px] transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                                disabled={isDisconnecting}
                              >
                                {Object.keys(phoneNames).length > 0
                                  ? Object.keys(phoneNames).map((index) => {
                                      const phoneIndexOption = parseInt(index);
                                      const qrCode = qrCodes[phoneIndexOption];
                                      const phoneInfo =
                                        qrCode?.phoneInfo ||
                                        `Phone ${phoneIndexOption + 1}`;
                                      const statusInfo = qrCode
                                        ? getStatusInfo(qrCode.status)
                                        : isLoadingStatus
                                        ? {
                                            text: "Checking...",
                                            color:
                                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200",
                                            icon: "RefreshCw",
                                          }
                                        : {
                                            text: "Not Connected",
                                            color:
                                              "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200",
                                            icon: "XCircle",
                                          };
                                      return (
                                        <option
                                          key={phoneIndexOption}
                                          value={phoneIndexOption}
                                          className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                        >
                                          {`${getPhoneName(
                                            phoneIndexOption
                                          )} - (${phoneInfo}) ${
                                            qrCode
                                              ? "✅"
                                              : isLoadingStatus
                                              ? "⏳"
                                              : "❌"
                                          } ${statusInfo.text}`}
                                        </option>
                                      );
                                    })
                                  : Array.from(
                                      { length: phoneCount },
                                      (_, i) => (
                                        <option
                                          key={i}
                                          value={i}
                                          className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                        >
                                          Phone {i + 1}
                                        </option>
                                      )
                                    )}
                              </select>
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <svg
                                  className="w-5 h-5 text-slate-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </div>
                            <Button
                              variant="warning"
                              onClick={() =>
                                showDisconnectConfirmation(
                                  companyId || "",
                                  disconnectPhoneIndex ?? 0
                                )
                              }
                              disabled={isDisconnecting || !companyId}
                              className="group bg-gradient-to-r from-orange-500/90 to-red-500/90 hover:from-orange-600/90 hover:to-red-600/90 backdrop-blur-sm border-orange-400/30 shadow-xl shadow-orange-500/30 transition-all duration-300 rounded-xl px-6 py-3 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-orange-500/40"
                            >
                              {isDisconnecting ? (
                                <div className="flex items-center space-x-2">
                                  <LoadingIcon
                                    icon="three-dots"
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm font-medium">
                                    Disconnecting...
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="p-1 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                                      />
                                    </svg>
                                  </div>
                                  <span className="text-sm font-medium">
                                    Disconnect Selected
                                  </span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Separator */}
                        <div className="flex items-center py-4">
                          <div className="flex-1 border-t border-slate-300/50 dark:border-slate-600/50"></div>
                          <span className="px-6 text-sm font-medium text-slate-500 dark:text-slate-400 backdrop-blur-sm bg-white/60 dark:bg-slate-700/60 rounded-2xl border border-slate-200/50 dark:border-slate-600/50">
                            OR
                          </span>
                          <div className="flex-1 border-t border-slate-300/50 dark:border-slate-600/50"></div>
                        </div>

                        {/* Disconnect All Phones */}
                        <div className="bg-gradient-to-r from-red-50/60 to-pink-50/40 dark:from-red-900/30 dark:to-pink-900/20 backdrop-blur-xl rounded-2xl p-4 border border-red-200/50 dark:border-red-700/50">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-6">
                            <div className="flex items-center space-x-4">
                              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 backdrop-blur-sm border border-red-200/40 dark:border-red-700/40">
                                <svg
                                  className="w-5 h-5 text-red-600 dark:text-red-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Disconnect all phones ({phoneCount} phones)
                                </span>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  This will disconnect all {phoneCount} phone
                                  connections
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="danger"
                              onClick={() =>
                                showDisconnectConfirmation(
                                  companyId || "",
                                  undefined
                                )
                              }
                              disabled={isDisconnecting || !companyId}
                              className="group bg-gradient-to-r from-red-500/90 to-pink-500/90 hover:from-red-600/90 hover:to-pink-600/90 backdrop-blur-sm border-red-400/30 shadow-xl shadow-red-500/30 transition-all duration-300 rounded-xl px-6 py-3 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-red-500/40"
                            >
                              {isDisconnecting ? (
                                <div className="flex items-center space-x-2">
                                  <LoadingIcon
                                    icon="three-dots"
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm font-medium">
                                    Disconnecting All...
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="p-1 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                                      />
                                    </svg>
                                  </div>
                                  <span className="text-sm font-medium">
                                    Disconnect All
                                  </span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Daily Report Settings Section */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-4 mb-4 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-teal-500/20 dark:from-green-400/20 dark:to-teal-400/20 backdrop-blur-sm border border-green-200/40 dark:border-green-700/40">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400 bg-clip-text text-transparent">
                Daily Report Settings
              </h2>
            </div>

            {error && (
              <div className="backdrop-blur-sm bg-red-100/80 border border-red-400/50 text-red-700 px-6 py-4 rounded-2xl mb-6 shadow-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-green-500 rounded focus:ring-green-500/50 focus:ring-2"
                  />
                  <span className="text-sm font-medium">
                    Enable Daily Reports
                  </span>
                </label>
              </div>

              {enabled && (
                <>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Report Time
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-4 py-3 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm bg-white/10 dark:bg-gray-700/20 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      WhatsApp Group ID
                    </label>
                    <input
                      type="text"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      placeholder="Enter group ID"
                      className="w-full px-4 py-3 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm bg-white/10 dark:bg-gray-700/20 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-300"
                    />
                  </div>

                  {lastRun && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 backdrop-blur-sm bg-white/5 dark:bg-gray-800/20 rounded-lg p-3 border border-white/10">
                      Last report sent: {lastRun}
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-wrap gap-4">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="backdrop-blur-sm bg-gradient-to-r from-green-500/80 to-teal-500/80 border border-white/20 hover:from-green-600/80 hover:to-teal-600/80 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  <span className="text-sm">{isSaving ? "Saving..." : "Save Settings"}</span>
                </Button>

                {enabled && (
                  <Button
                    variant="success"
                    onClick={handleTriggerReport}
                    className="backdrop-blur-sm bg-gradient-to-r from-emerald-500/80 to-green-500/80 border border-white/20 hover:from-emerald-600/80 hover:to-green-600/80 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    <span className="text-sm">Send Report Now</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Manual Report Trigger Section */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-4 mb-4 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-400/20 dark:to-cyan-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Manual Report Trigger
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Send a daily contact report for a specific date. This is useful for generating historical reports or resending reports for specific dates.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-3 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm bg-white/50 dark:bg-gray-700/50 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Select a date to generate and send the contact report for that specific day
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleTriggerManualReport}
                    disabled={isTriggeringManualReport || !selectedDate || !companyId}
                    className="w-full group bg-gradient-to-r from-blue-500/90 to-cyan-500/90 hover:from-blue-600/90 hover:to-cyan-600/90 backdrop-blur-sm border-blue-400/30 shadow-xl shadow-blue-500/30 transition-all duration-300 rounded-xl px-8 py-4 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-blue-500/40"
                  >
                    {isTriggeringManualReport ? (
                      <div className="flex items-center justify-center space-x-3">
                        <LoadingIcon icon="three-dots" className="w-5 h-5" />
                        <span className="text-sm font-semibold">Sending Report...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold">Send Report for Selected Date</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Reply Settings Section */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-4 mb-4 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 dark:from-purple-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-purple-200/40 dark:border-purple-700/40">
                <svg
                  className="w-6 h-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Auto-Reply Settings
              </h2>
            </div>

            {error && (
              <div className="backdrop-blur-sm bg-red-100/80 border border-red-400/50 text-red-700 px-6 py-4 rounded-2xl mb-6 shadow-lg">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReplyEnabled}
                    onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-purple-500 rounded focus:ring-purple-500/50 focus:ring-2"
                  />
                  <span className="text-sm font-medium">Enable Auto-Reply</span>
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-8">
                  Automatically reply to messages that haven't been responded to
                  within the specified time frame
                </p>
              </div>

              {autoReplyEnabled && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-Reply Threshold (Hours)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={autoReplyHours}
                      onChange={(e) => setAutoReplyHours(e.target.value)}
                      className="w-24 px-4 py-3 border border-white/20 dark:border-gray-600/30 rounded-xl backdrop-blur-sm bg-white/10 dark:bg-gray-700/20 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      hours prior to reconnection
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Messages older than this threshold will NOT be auto-replied
                    to.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <Button
                  variant="primary"
                  onClick={handleSaveAutoReply}
                  disabled={isSavingAutoReply}
                  className="backdrop-blur-sm bg-gradient-to-r from-purple-500/80 to-indigo-500/80 border border-white/20 hover:from-purple-600/80 hover:to-indigo-600/80 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
                >
                  <span className="text-sm">{isSavingAutoReply ? "Saving..." : "Save Auto-Reply Settings"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Disconnect Confirmation Modal */}
        <Dialog
          open={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
        >
          <Dialog.Panel>
            <div className="backdrop-blur-2xl bg-white/20 dark:bg-gray-800/20 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/40 overflow-hidden max-w-md mx-auto">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-red-500/90 to-red-600/90 backdrop-blur-sm px-8 py-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <svg
                        className="w-7 h-7 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      ⚠️ Disconnect Bot
                    </h3>
                    <p className="text-red-100 text-xs">
                      This action requires confirmation
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="px-6 py-4">
                <div className="text-center space-y-4">
                  {/* Warning Icon */}
                  <div className="mx-auto w-20 h-20 bg-red-50/20 dark:bg-red-900/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-red-200/30">
                    <svg
                      className="w-10 h-10 text-red-500 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                      />
                    </svg>
                  </div>

                  {/* Main Message */}
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Are you absolutely sure?
                    </h4>
                    <div className="text-gray-600 dark:text-gray-400 space-y-2">
                      <p className="text-xs leading-relaxed">
                        {disconnectPhoneIndex !== undefined
                          ? `You're about to disconnect Phone ${
                              disconnectPhoneIndex + 1
                            } of ${disconnectBotName}.`
                          : `You're about to disconnect all phones of ${disconnectBotName}.`}
                      </p>
                      <div className="backdrop-blur-sm bg-amber-50/30 dark:bg-amber-900/20 border border-amber-200/40 dark:border-amber-800/40 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <svg
                            className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-xs text-amber-700 dark:text-amber-300 leading-tight">
                            <strong>Warning:</strong> This action cannot be
                            undone. You'll need to reconnect by scanning the QR
                            code again.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="backdrop-blur-sm bg-gray-50/30 dark:bg-gray-700/30 px-6 py-4 flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => setShowDisconnectModal(false)}
                  disabled={isDisconnecting}
                  className="flex-1 px-6 py-3 text-sm font-medium transition-all duration-300 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/30 dark:border-gray-700/40 hover:bg-white/30 dark:hover:bg-gray-700/30"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span className="text-sm">Cancel</span>
                  </div>
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  onClick={confirmDisconnect}
                  disabled={isDisconnecting}
                  className="flex-1 px-6 py-3 text-sm font-medium backdrop-blur-sm bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-700/90 hover:to-red-800/90 transition-all duration-300 shadow-xl hover:shadow-2xl border border-white/20"
                >
                  {isDisconnecting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingIcon icon="three-dots" className="w-4 h-4" />
                      <span className="text-sm">
                        {disconnectPhoneIndex !== undefined
                          ? "Disconnecting..."
                          : "Disconnecting All..."}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
                        />
                      </svg>
                      <span className="text-sm">
                        {disconnectPhoneIndex !== undefined
                          ? "Yes, Disconnect"
                          : "Yes, Disconnect All"}
                      </span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
      </div>
    </div>
  );
}

export default SettingsPage;