import React, { useState, useEffect, useRef } from "react";
import logoUrl from "@/assets/images/logo.png";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useConfig } from "../../config";
import Progress from "@/components/Base/Progress";
import LZString from "lz-string";
interface Contact {
  chat_id: string;
  chat_pic?: string | null;
  chat_pic_full?: string | null;
  contactName: string;
  conversation_id: string;
  id: string;
  last_message?: {
    chat_id: string;
    from: string;
    from_me: boolean;
    id: string;
    source: string;
    text: {
      body: string;
    };
    timestamp: number;
    createdAt?: string;
    type: string;
  };
  phone: string;
  pinned?: boolean;
  tags: string[];
  unreadCount: number;
}

interface MessageCache {
  [chatId: string]: any[];
}

interface Phone {
  phoneIndex: number;
  status: string;
  qrCode: string | null;
  phoneInfo: string;
}

interface BotStatusResponse {
  phones?: Phone[];
  companyId: string;
  v2: boolean;
  trialEndDate: string | null;
  apiUrl: string | null;
  phoneCount?: number;
  // Old format properties
  status?: string;
  qrCode?: string | null;
  phoneInfo?: string;
}

function LoadingPage2() {
  const baseUrl = "https://juta-dev.ngrok.dev";
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<string | null>(null);
  const [phones, setPhones] = useState<Phone[]>([]);
  const [selectedPhoneIndex, setSelectedPhoneIndex] = useState<number>(0);
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const { config: initialContacts } = useConfig();
  const [v2, setV2] = useState<boolean | undefined>(undefined);
  const [fetchedChats, setFetchedChats] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [isProcessingChats, setIsProcessingChats] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsFetched, setContactsFetched] = useState(false);
  const [shouldFetchContacts, setShouldFetchContacts] = useState(false);
  const location = useLocation();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [isQRLoading, setIsQRLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairingCodeLoading, setIsPairingCodeLoading] = useState(false);
  const [showPairingCode, setShowPairingCode] = useState(false);

  const [loadingPhase, setLoadingPhase] = useState<string>("initializing");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [webSocket, setWebSocket] = useState(null);
  const isMountedRef = useRef(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReinitializing, setIsReinitializing] = useState(false);
  const [reinitializeCooldown, setReinitializeCooldown] = useState(0);
  const [reinitializeTimer, setReinitializeTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Debug useEffect to monitor state changes
  useEffect(() => {
    console.log("State changed - isQRLoading:", isQRLoading, "qrCodeImage:", !!qrCodeImage, "isLoading:", isLoading);
  }, [isQRLoading, qrCodeImage, isLoading]);

  // Debug useEffect to monitor phones changes
  useEffect(() => {
    console.log("=== useEffect: phones changed ===");
    console.log("phones:", phones);
    console.log("phones length:", phones.length);
  }, [phones]);

  // Debug useEffect to monitor QR code changes
  useEffect(() => {
    console.log("=== useEffect: QR code changed ===");
    console.log("qrCodeImage:", !!qrCodeImage);
    console.log("botStatus:", botStatus);
    console.log("selectedPhoneIndex:", selectedPhoneIndex);
    
    if (qrCodeImage) {
      console.log("QR code is set and should be displayed");
    } else {
      console.log("No QR code to display");
    }
  }, [qrCodeImage, botStatus, selectedPhoneIndex]);
  
  const fetchQRCode = async () => {
    if (!isMountedRef.current) return;
    
    console.log("fetchQRCode: Starting...");
    setIsLoading(true);
    setIsQRLoading(true);
    setError(null);

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("No user email found");
      }

      // Get user config to get companyId
      const userResponse = await fetch(
        `https://juta-dev.ngrok.dev/api/user/config?email=${encodeURIComponent(
          userEmail
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user config");
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;
      setCompanyId(companyId);

      // Get all bot status and company data in one call
      const statusResponse = await fetch(
        `https://juta-dev.ngrok.dev/api/bot-status/${companyId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );
      if (!statusResponse.ok) {
        throw new Error("Failed to fetch bot status");
      }

      const data: BotStatusResponse = await statusResponse.json();
      console.log("=== fetchQRCode API Response ===");
      console.log("Bot status data:", data);
      console.log("Data phones:", data.phones);
      console.log("Data phones type:", typeof data.phones);
      console.log("Data phones is array:", Array.isArray(data.phones));
      console.log("Data status:", data.status);
      console.log("Data qrCode:", data.qrCode);
      console.log("Data companyId:", data.companyId);
      console.log("Data v2:", data.v2);
      console.log("=== End API Response ===");
      
      // Validate the response data
      if (!data) {
        throw new Error("Invalid response data received");
      }
      
      // Set all the necessary state
      if (!isMountedRef.current) return;
      setV2(data.v2 || false);
      
      // Handle both old and new API response formats
      if (data.phones && Array.isArray(data.phones)) {
        // New format with phones array
        if (!isMountedRef.current) return;
        console.log("Setting phones array (new format):", data.phones);
        setPhones(data.phones);
        if (!isMountedRef.current) return;
        console.log("Setting companyId:", data.companyId);
        setCompanyId(data.companyId);

        if (data.trialEndDate) {
          const trialEnd = new Date(data.trialEndDate);
          const now = new Date();
          if (now > trialEnd) {
            setTrialExpired(true);
            // Don't return here, let the finally block handle loading states
          }
        }

        // Check if any phone needs QR code
        const phoneNeedingQR = data.phones.find(phone => phone.status === "qr");
        console.log("=== fetchQRCode: Phone QR Check ===");
        console.log("phoneNeedingQR:", phoneNeedingQR);
        console.log("All phones statuses:", data.phones.map(p => ({ index: p.phoneIndex, status: p.status, hasQR: !!p.qrCode })));
        
        if (phoneNeedingQR && phoneNeedingQR.qrCode) {
          console.log("Setting QR code image:", phoneNeedingQR.qrCode);
          setQrCodeImage(phoneNeedingQR.qrCode);
          setSelectedPhoneIndex(phoneNeedingQR.phoneIndex);
          setBotStatus("qr");
          console.log("QR Code image set successfully");
        } else if (data.phones.every(phone => phone.status === "ready" || phone.status === "authenticated")) {
          setBotStatus("ready");
          setShouldFetchContacts(true);
          console.log("All phones ready, navigating to /chat");
          
      } else {
          console.log("Setting botStatus to:", data.phones[0]?.status || "initializing");
          setBotStatus(data.phones[0]?.status || "initializing");
        }
      } else {
        // Old format with individual properties
        console.log("Using old API response format");
        const phone: Phone = {
          phoneIndex: 0,
          status: data.status || "initializing",
          qrCode: data.qrCode || null,
          phoneInfo: data.phoneInfo || ""
        };
        
        console.log("Setting phones array (old format):", [phone]);
        setPhones([phone]);
        console.log("Setting companyId (old format):", data.companyId);
        setCompanyId(data.companyId);
        setSelectedPhoneIndex(0);

        if (data.trialEndDate) {
          const trialEnd = new Date(data.trialEndDate);
          const now = new Date();
          if (now > trialEnd) {
            setTrialExpired(true);
            // Don't return here, let the finally block handle loading states
          }
        }

        // Handle status based on old format
        if (data.status === "qr" && data.qrCode) {
          console.log("Old format: Setting QR code image:", data.qrCode);
          setQrCodeImage(data.qrCode);
          setBotStatus("qr");
          console.log("Old format: QR Code image set successfully");
        } else if (data.status === "ready" || data.status === "authenticated") {
          setBotStatus("ready");
          console.log("Setting shouldFetchContacts to true");
          setShouldFetchContacts(true);
          console.log("Old format: Status ready, navigating to /chat");
          
        } else {
          setBotStatus(data.status || "initializing");
        }
      }

      // Remove duplicate WebSocket creation - it's handled in initWebSocket useEffect
      // setWebSocket(ws);
    } catch (error) {
      console.error("Error in fetchQRCode:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
    } finally {
      console.log("fetchQRCode finally block: setting isLoading to false");
      if (isMountedRef.current) {
        setIsQRLoading(false);
        setIsLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) {
      console.log("Refresh already in progress, ignoring click");
      return;
    }
    
    console.log("Refresh button clicked - starting refresh process...");
    console.log("Current states before refresh - isLoading:", isLoading, "isQRLoading:", isQRLoading, "qrCodeImage:", !!qrCodeImage, "phones:", phones.length);
    
    setIsRefreshing(true);
    setError(""); // Clear any existing errors
    
    // Don't clear phones array immediately - let fetchQRCode handle it
    setQrCodeImage(null);
    setBotStatus(null);
    setPairingCode(null);
    setPhoneNumber("");
    
    // Close existing WebSocket connection
    if (ws.current) {
      ws.current.close();
      ws.current = null;
      setWsConnected(false);
    }
    
    try {
      console.log("Calling fetchQRCode...");
      // Simply call the API again - like refreshing the page
      await fetchQRCode();
      console.log("Refresh completed successfully");
      
      // Wait a bit for state updates to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Use a callback to get the current state values
      setPhones(prevPhones => {
        console.log("=== REFRESH STATE CHECK ===");
        console.log("Current phones in state:", prevPhones);
        console.log("Current phones count:", prevPhones.length);
        
        // Check if any phone needs QR
        const phoneNeedingQR = prevPhones.find(phone => phone.status === "qr");
        if (phoneNeedingQR) {
          console.log("Found phone needing QR:", phoneNeedingQR);
          console.log("Phone has QR code:", !!phoneNeedingQR.qrCode);
        }
        
        return prevPhones;
      });
      
      // Also check other states
      console.log("Other states after refresh:");
      console.log("- isLoading:", isLoading);
      console.log("- isQRLoading:", isQRLoading);
      console.log("- qrCodeImage:", !!qrCodeImage);
      console.log("- botStatus:", botStatus);
      console.log("- selectedPhoneIndex:", selectedPhoneIndex);
      
    } catch (error) {
      console.error("Refresh failed:", error);
      setError("Refresh failed. Please try again.");
    } finally {
      console.log("Setting isRefreshing to false");
      setIsRefreshing(false);
      console.log("=== REFRESH PROCESS COMPLETED ===");
    }
  };

  const reinitializeBot = async (phoneIndex?: number) => {
    if (isReinitializing || reinitializeCooldown > 0) {
      console.log("Reinitialize already in progress or cooldown active, ignoring click");
      return;
    }

    const confirmMessage = phoneIndex !== undefined 
      ? `Are you sure you want to reinitialize Phone ${phoneIndex + 1}?`
      : `Are you sure you want to reinitialize all phones?`;
      
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setIsReinitializing(true);
      setError(null);
      
      // Show processing notification
      console.log(`Reinitializing ${phoneIndex !== undefined ? `Phone ${phoneIndex + 1}` : 'all phones'}...`);

      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Get user config to get companyId
      const userResponse = await fetch(
        `https://juta-dev.ngrok.dev/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );
      
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user config");
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;

      const response = await fetch('https://juta-dev.ngrok.dev/api/bots/reinitialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          botName: companyId, 
          phoneIndex 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reinitialize bot');
      }
      
      // Update phone statuses to "initializing"
      if (phoneIndex !== undefined) {
        setPhones(prevPhones => 
          prevPhones.map(phone => 
            phone.phoneIndex === phoneIndex 
              ? { ...phone, status: 'initializing' }
              : phone
          )
        );
      } else {
        setPhones(prevPhones => 
          prevPhones.map(phone => ({ ...phone, status: 'initializing' }))
        );
      }

      // Set bot status to initializing
      setBotStatus('initializing');
      
      // Show success notification
      console.log(`${phoneIndex !== undefined ? `Phone ${phoneIndex + 1}` : 'All phones'} is being reinitialized`);
      
      // Start cooldown timer (30-45 seconds)
      const cooldownDuration = Math.floor(Math.random() * 16) + 30; // Random between 30-45 seconds
      setReinitializeCooldown(cooldownDuration);
      
      const timer = setInterval(() => {
        setReinitializeCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      setReinitializeTimer(timer);
      
      // Clear QR code and other states
      setQrCodeImage(null);
      setPairingCode(null);
      setPhoneNumber("");
      setShouldFetchContacts(false);
      
    } catch (error) {
      console.error('Error reinitializing bot:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to reinitialize bot. Please try again.');
      }
    } finally {
      setIsReinitializing(false);
    }
  };

  const handlePhoneSelection = (phoneIndex: number) => {
    setSelectedPhoneIndex(phoneIndex);
    const selectedPhone = phones && phones.find(p => p.phoneIndex === phoneIndex);
    if (selectedPhone?.status === "qr" && selectedPhone.qrCode) {
      setQrCodeImage(selectedPhone.qrCode);
      setBotStatus("qr");
    } else if (selectedPhone?.status === "ready" || selectedPhone?.status === "authenticated") {
      setQrCodeImage(null);
      setBotStatus(selectedPhone.status);
    }
  };

  useEffect(() => {
    if (isAuthReady) {
    fetchQRCode();
    }
  }, [isAuthReady]);

  // Auto-select first phone that needs QR code
  useEffect(() => {
    console.log("=== Phone Selection useEffect triggered ===");
    console.log("phones:", phones);
    console.log("phones length:", phones?.length);
    console.log("Current qrCodeImage:", !!qrCodeImage);
    console.log("Current selectedPhoneIndex:", selectedPhoneIndex);
    
    if (phones && phones.length > 0) {
      const phoneNeedingQR = phones.find(phone => phone.status === "qr");
      console.log("phoneNeedingQR:", phoneNeedingQR);
      
      // Only set QR code if we don't already have one or if the selected phone changed
      if (phoneNeedingQR && (!qrCodeImage || selectedPhoneIndex !== phoneNeedingQR.phoneIndex)) {
        console.log("Setting selectedPhoneIndex to:", phoneNeedingQR.phoneIndex);
        setSelectedPhoneIndex(phoneNeedingQR.phoneIndex);
        
        if (phoneNeedingQR.qrCode) {
          console.log("Setting QR code image:", phoneNeedingQR.qrCode);
          setQrCodeImage(phoneNeedingQR.qrCode);
          setBotStatus("qr");
        } else {
          console.log("Phone needs QR but no QR code available");
        }
      } else if (phoneNeedingQR) {
        console.log("Phone needs QR but QR code already set or phone already selected");
      } else {
        console.log("No phone needs QR code");
      }
      
      // Check if any phone is ready and set shouldFetchContacts
      const readyPhone = phones.find(phone => phone.status === "ready" || phone.status === "authenticated");
      if (readyPhone) {
        console.log("Phone ready detected, setting shouldFetchContacts to true");
        setShouldFetchContacts(true);
      }
      
      // Log all phone statuses for debugging
      console.log("All phone statuses:", phones.map(p => ({ index: p.phoneIndex, status: p.status, hasQR: !!p.qrCode })));
    } else {
      console.log("No phones available for selection");
    }
  }, [phones, qrCodeImage, selectedPhoneIndex]);
  useEffect(() => {
    const initWebSocket = async (retries = 3) => {
      if (!isAuthReady || !isMountedRef.current) {
        return;
      }

      if (!wsConnected) {
        try {
          const userEmail = localStorage.getItem("userEmail");
          if (!userEmail) {
            throw new Error("No user email found");
          }

          // Get company ID from SQL database
          const response = await fetch(
            `https://juta-dev.ngrok.dev/api/user/config?email=${encodeURIComponent(
              userEmail
            )}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch user config");
          }

          const userData = await response.json();
          const companyId = userData.company_id;

          // Test if WebSocket endpoint is accessible
          console.log("Testing WebSocket endpoint accessibility...");
          try {
            const testResponse = await fetch(`https://juta-dev.ngrok.dev/api/health`, { 
              method: 'GET',
              mode: 'cors'
            });
            console.log("Backend health check response:", testResponse.status, testResponse.statusText);
          } catch (testError) {
            console.warn("Backend health check failed:", testError);
            console.log("This might indicate WebSocket connectivity issues");
          }

          // Test basic WebSocket connectivity
          console.log("Testing basic WebSocket connectivity...");
          try {
            const testWs = new WebSocket('wss://echo.websocket.org');
            testWs.onopen = () => {
              console.log("Basic WebSocket test successful - WebSocket is supported");
              testWs.close();
            };
            testWs.onerror = (error) => {
              console.warn("Basic WebSocket test failed:", error);
              console.log("This might indicate a WebSocket support issue");
            };
          } catch (testWsError) {
            console.warn("Could not create test WebSocket:", testWsError);
          }

          // Connect to WebSocket with proper protocol handling
          let wsUrl = window.location.protocol === 'https:' 
            ? `wss://juta-dev.ngrok.dev/ws/${userEmail}/${companyId}`
            : `ws://juta-dev.ngrok.dev/ws/${userEmail}/${companyId}`;
          
          console.log("Attempting WebSocket connection to:", wsUrl);
          console.log("User email:", userEmail);
          console.log("Company ID:", companyId);
          console.log("Current protocol:", window.location.protocol);
          console.log("Current location:", window.location.href);
          
          // Try to establish WebSocket connection
          try {
        ws.current = new WebSocket(wsUrl);
            console.log("WebSocket object created successfully");
          } catch (wsError) {
            console.error("Error creating WebSocket:", wsError);
            
            // Try alternative WebSocket URL if first fails
            const alternativeUrl = wsUrl.includes('wss://') 
              ? `ws://juta-dev.ngrok.dev/ws/${userEmail}/${companyId}`
              : `wss://juta-dev.ngrok.dev/ws/${userEmail}/${companyId}`;
            
            console.log("Trying alternative WebSocket URL:", alternativeUrl);
            try {
              ws.current = new WebSocket(alternativeUrl);
              console.log("Alternative WebSocket connection created successfully");
            } catch (altError) {
              console.error("Alternative WebSocket also failed:", altError);
              throw new Error(`Failed to create WebSocket with both protocols: ${wsError}`);
            }
          }

          // Add connection timeout
          const connectionTimeout = setTimeout(() => {
            if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
              console.error("WebSocket connection timeout");
              ws.current.close();
              setError("WebSocket connection timeout. Please try again.");
              setWsConnected(false);
            }
          }, 10000); // 10 second timeout

          ws.current.onopen = () => {
            clearTimeout(connectionTimeout);
          setWsConnected(true);
            setError("");
        };
        
        ws.current.onmessage = async (event) => {
            try {
          const data = JSON.parse(event.data);
              console.log("WebSocket message:", data);
              
              // Validate the message data
              if (!data || typeof data !== 'object') {
                console.warn("Invalid WebSocket message received:", event.data);
                return;
              }
              
              console.log("WebSocket data phones:", data.phones);
              console.log("WebSocket data phones type:", typeof data.phones);
              console.log("WebSocket data phones is array:", Array.isArray(data.phones));
              if (data.type === "auth_status") {
                // Handle phone status updates
                if (data.phones && Array.isArray(data.phones)) {
                  // New format with phones array
                  if (!isMountedRef.current) return;
                  setPhones(data.phones);
                  
                  // Check if any phone needs QR code
                  const phoneNeedingQR = data.phones.find((phone: Phone) => phone.status === "qr");
                  if (phoneNeedingQR && phoneNeedingQR.qrCode) {
                    if (!isMountedRef.current) return;
                    setQrCodeImage(phoneNeedingQR.qrCode);
                    if (!isMountedRef.current) return;
                    setSelectedPhoneIndex(phoneNeedingQR.phoneIndex);
                    if (!isMountedRef.current) return;
                    setBotStatus("qr");
                  }
                  // Check if all phones are ready/authenticated
                  else if (data.phones.every((phone: Phone) => phone.status === "ready" || phone.status === "authenticated")) {
                    if (!isMountedRef.current) return;
                    setBotStatus("ready");
                    if (!isMountedRef.current) return;
                    setShouldFetchContacts(true);
                    console.log("WebSocket: All phones ready, navigating to /chat");
                    
                    return;
                  }
                  // Set status based on first phone
                  else {
                    if (!isMountedRef.current) return;
                    setBotStatus(data.phones[0]?.status || "initializing");
                  }
                } else {
                  // Old format with individual properties
                  console.log("WebSocket: Using old API response format");
                  const phone: Phone = {
                    phoneIndex: 0,
                    status: data.status || "initializing",
                    qrCode: data.qrCode || null,
                    phoneInfo: data.phoneInfo || ""
                  };
                  
                  if (!isMountedRef.current) return;
                  setPhones([phone]);
                  if (!isMountedRef.current) return;
                  setSelectedPhoneIndex(0);
                  
                  // Handle status based on old format
                  if (data.status === "qr" && data.qrCode) {
                    if (!isMountedRef.current) return;
                    setQrCodeImage(data.qrCode);
                    if (!isMountedRef.current) return;
                    setBotStatus("qr");
                  } else if (data.status === "authenticated" || data.status === "ready") {
                    if (!isMountedRef.current) return;
                    setBotStatus("ready");
                    if (!isMountedRef.current) return;
                    setShouldFetchContacts(true);
                    console.log("WebSocket old format: Status ready, navigating to /chat");
                    
                    return;
                  } else {
                    if (!isMountedRef.current) return;
                    setBotStatus(data.status || "initializing");
                  }
                }
              } else if (data.type === "progress") {
                setBotStatus(data.status);
            setCurrentAction(data.action);
            setFetchedChats(data.fetchedChats);
            setTotalChats(data.totalChats);

                if (data.action === "done_process") {
                  setBotStatus(data.status);
              setProcessingComplete(true);
                  
                  return;
                }
              } else if (data.type === "bot_activity") {
                // Handle bot activity messages
                console.log("Bot activity message received:", data);
                // This message type doesn't require any state updates for the loading page
              } else {
                // Handle unknown message types
                console.log("Unknown WebSocket message type:", data.type, data);
              }
            } catch (error) {
              console.error("Error parsing WebSocket message:", error);
              console.error("Raw message data:", event.data);
          }
        };
        
        ws.current.onerror = (error) => {
            clearTimeout(connectionTimeout);
            console.error("WebSocket error:", error);
            console.error("WebSocket URL attempted:", wsUrl);
            console.error("Current protocol:", window.location.protocol);
            console.error("WebSocket readyState:", ws.current?.readyState);
            console.error("Error details:", error);
            setError("WebSocket connection error. Please try again.");
            setWsConnected(false);
          };

          ws.current.onclose = (event) => {
            clearTimeout(connectionTimeout);
            console.log("WebSocket connection closed:", event.code, event.reason);
            console.log("Close event details:", event);
          setWsConnected(false);
            if (event.code !== 1000) { // Not a normal closure
              console.error("WebSocket closed with error code:", event.code, "Reason:", event.reason);
              setError("WebSocket connection lost. Please refresh the page.");
            }
          };
        } catch (error) {
          console.error("Error initializing WebSocket:", error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError("Failed to initialize WebSocket. Please try again.");
          }

          // Try alternative protocol if available
          if (retries > 0) {
            console.log(`Retrying WebSocket connection in 2 seconds... (${retries} attempts remaining)`);
            setTimeout(() => initWebSocket(retries - 1), 2000);
          } else {
            console.error("WebSocket connection failed after all retries");
            setError("Unable to establish WebSocket connection. Please check your internet connection and try again.");
          }
        }
      }
    };

    if (isAuthReady) {
    initWebSocket();
    }
  }, [isAuthReady]);
  // New useEffect for WebSocket cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (
        ws.current &&
        processingComplete &&
        !isLoading &&
        contacts && contacts.length > 0
      ) {
        ws.current.close();
      }
      
      // Clean up reinitialize timer
      if (reinitializeTimer) {
        clearInterval(reinitializeTimer);
      }
    };
  }, [processingComplete, isLoading, contacts, reinitializeTimer]);

  useEffect(() => {
    if (shouldFetchContacts && !isLoading) {
      console.log("useEffect: shouldFetchContacts is true and not loading, navigating to /chat");
  
    }
  }, [shouldFetchContacts, isLoading, navigate]);

    useEffect(() => {
    if (contactsFetched && fetchedChats === totalChats && contacts && contacts.length > 0) {
      console.log("All contacts fetched and processed - staying on connection page");
      // Don't navigate - this page is for connecting phones, not navigation
    }
  }, [contactsFetched, fetchedChats, totalChats, contacts, navigate]);

  const fetchContacts = async () => {
    try {
      setLoadingPhase("fetching_contacts");

      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("No user email found");
      }

      // Get user context from SQL database
      const userResponse = await fetch(
        `${baseUrl}/api/user-context?email=${userEmail}`
      );
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user context");
      }

      const userData = await userResponse.json();
      const companyId = userData.companyId;
      if (!companyId) throw new Error("Company ID not found");

      // Fetch contacts from SQL database
      setLoadingPhase("fetching_contacts");
      const contactsResponse = await fetch(
        `${baseUrl}/api/contacts?companyId=${companyId}`
      );
      if (!contactsResponse.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const contactsData = await contactsResponse.json();
      let allContacts: Contact[] = contactsData.contacts || [];

      const totalDocs = allContacts.length;
      let processedDocs = 0;

      // Update progress for contacts processing
      for (let i = 0; i < allContacts.length; i++) {
        processedDocs++;
        setLoadingProgress((processedDocs / totalDocs) * 100);
      }

      // Fetch pinned chats from SQL database
      setLoadingPhase("processing_pinned");
      const pinnedResponse = await fetch(
        `${baseUrl}/api/pinned-chats?email=${userEmail}`
      );
      let pinnedChats: Contact[] = [];

      if (pinnedResponse.ok) {
        const pinnedData = await pinnedResponse.json();
        pinnedChats = pinnedData.pinnedChats || [];
      }

      // Update contacts with pinned status
      setLoadingPhase("updating_pins");
      allContacts = allContacts.map((contact, index) => {
        const isPinned = pinnedChats.some(
          (pinned) => pinned.chat_id === contact.chat_id
        );
        if (isPinned) {
          contact.pinned = true;
        }
        setLoadingProgress((index / allContacts.length) * 100);
        return contact;
      });

      // Sort contacts
      setLoadingPhase("sorting_contacts");
      allContacts.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const dateA = a.last_message?.createdAt
          ? new Date(a.last_message.createdAt)
          : a.last_message?.timestamp
          ? new Date(a.last_message.timestamp * 1000)
          : new Date(0);
        const dateB = b.last_message?.createdAt
          ? new Date(b.last_message.createdAt)
          : b.last_message?.timestamp
          ? new Date(b.last_message.timestamp * 1000)
          : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      // Cache the contacts
      setLoadingPhase("caching");
      localStorage.setItem(
        "contacts",
        LZString.compress(JSON.stringify(allContacts))
      );
      sessionStorage.setItem("contactsFetched", "true");
      sessionStorage.setItem("contactsCacheTimestamp", Date.now().toString());

      setContacts(allContacts);
      setContactsFetched(true);

      // Cache messages for first 10 contacts
      await fetchAndCacheMessages(allContacts, companyId, userEmail);

      setLoadingPhase("complete");

      // After contacts are loaded, fetch chats
      await fetchChatsData();
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setError("Failed to fetch contacts. Please try again.");
      setLoadingPhase("error");
    }
  };

  const getLoadingMessage = () => {
    switch (loadingPhase) {
      case "initializing":
        return "Initializing...";
      case "fetching_contacts":
        return "Fetching contacts...";
      case "processing_pinned":
        return "Processing pinned chats...";
      case "updating_pins":
        return "Updating pin status...";
      case "sorting_contacts":
        return "Organizing contacts...";
      case "caching":
        return "Caching data...";
      case "complete":
        return "Loading complete!";
      case "error":
        return "Error loading contacts";
      case "caching_messages":
        return "Caching recent messages...";
      default:
        return "Loading...";
    }
  };

  {
    isProcessingChats && (
      <div className="space-y-2 mt-4">
        <Progress className="w-full">
          <Progress.Bar
            className="transition-all duration-300 ease-in-out"
            style={{ width: `${loadingProgress}%` }}
          >
            {Math.round(loadingProgress)}%
          </Progress.Bar>
        </Progress>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {getLoadingMessage()}
        </div>
        {loadingPhase === "complete" && (
          <div className="text-green-500">All data loaded successfully!</div>
        )}
      </div>
    );
  }

    useEffect(() => {
    if (processingComplete && contactsFetched && !isLoading) {
      const timer = setTimeout(() => {
        console.log("All conditions met - staying on connection page");
        // Don't navigate - this page is for connecting phones, not navigation
      }, 1000); // Add a small delay to ensure smooth transition
      return () => clearTimeout(timer);
    }
  }, [processingComplete, contactsFetched, isLoading, navigate]);

  const fetchChatsData = async () => {
    setIsFetchingChats(true);
    try {
      // Assuming the existing WebSocket connection handles chat fetching
      // You might need to send a message to the WebSocket to start fetching chats
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: "fetch_chats" }));
      } else {
        throw new Error("WebSocket is not connected");
      }
    } catch (error) {
      console.error("Error initiating chat fetch:", error);
      setError("Failed to fetch chats. Please try again.");
    } finally {
      setIsFetchingChats(false);
    }
  };

  useEffect(() => {}, [botStatus, isProcessingChats, fetchedChats, totalChats]);

  useEffect(() => {
    let progressInterval: string | number | NodeJS.Timeout | undefined;
    if (!isLoading && botStatus === "qr") {
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 1 : prev));
      }, 500);
    }

    return () => clearInterval(progressInterval);
  }, [isLoading, botStatus]);

  const handleLogout = async () => {
    try {
      // Close WebSocket connection if it exists
      if (ws.current) {
        ws.current.close();
        setWsConnected(false);
      }

      // Clear localStorage and navigate to login
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userData");
      localStorage.removeItem("contacts");
      localStorage.removeItem("messagesCache");
      localStorage.removeItem("userEmail");
      sessionStorage.clear();

      navigate("/login");
    } catch (error) {
      console.error("Error signing out: ", error);
      setError("Failed to log out. Please try again.");
    }
  };

  const requestPairingCode = async () => {
    setIsPairingCodeLoading(true);
    setError(null);
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Get user context from SQL database
      const userResponse = await fetch(
        `${baseUrl}/api/user-context?email=${userEmail}`
      );
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user context");
      }

      const userData = await userResponse.json();
      const companyId = userData.companyId;
      if (!companyId) {
        throw new Error("Company ID not found");
      }

      // Request pairing code
      const response = await fetch(
        `${baseUrl}/api/request-pairing-code/${companyId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
        phoneNumber,
        phoneIndex: selectedPhoneIndex
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to request pairing code");
      }

      const data = await response.json();
      setPairingCode(data.pairingCode);
    } catch (error) {
      console.error("Error requesting pairing code:", error);
      setError("Failed to request pairing code. Please try again.");
    } finally {
      setIsPairingCodeLoading(false);
    }
  };
  
  useEffect(() => {
    // Check if user is authenticated via localStorage
    const userEmail = localStorage.getItem("userEmail");
    setIsAuthReady(true);
    if (!userEmail) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (botStatus === "ready" || botStatus === "authenticated") {
      setShouldFetchContacts(true);
      
    }
  }, [botStatus, navigate]);

  const fetchAndCacheMessages = async (
    contacts: Contact[],
    companyId: string,
    userEmail: string
  ) => {
    setLoadingPhase("caching_messages");
    console.log("fetchAndCacheMessages");

    // Reduce number of cached contacts
    const mostRecentContacts = contacts
      .sort((a, b) => {
        const getTimestamp = (contact: Contact) => {
          if (!contact.last_message) return 0;
          return contact.last_message.createdAt
            ? new Date(contact.last_message.createdAt).getTime()
            : contact.last_message.timestamp
            ? contact.last_message.timestamp * 1000
            : 0;
        };
        return getTimestamp(b) - getTimestamp(a);
      })
      .slice(0, 10); // Reduce from 100 to 10 most recent contacts

    // Only cache last 20 messages per contact
    const messagePromises = mostRecentContacts.map(async (contact) => {
      try {
        // Get messages from SQL database
        const response = await fetch(
          `${baseUrl}/api/messages/${contact.chat_id}?limit=20&companyId=${companyId}`
        );

        if (!response.ok) {
          console.error(`Failed to fetch messages for chat ${contact.chat_id}`);
          return null;
        }

        const data = await response.json();
        return {
          chatId: contact.chat_id,
          messages: data.messages || [],
        };
      } catch (error) {
        console.error(
          `Error fetching messages for chat ${contact.chat_id}:`,
          error
        );
        return null;
      }
    });

    // Wait for all message fetching promises to complete
    const results = await Promise.all(messagePromises);

    // Create messages cache object from results
    const messagesCache = results.reduce<MessageCache>((acc, result) => {
      if (result) {
        acc[result.chatId] = result.messages;
      }
      return acc;
    }, {});

    const cacheData = {
      messages: messagesCache,
      timestamp: Date.now(),
      expiry: Date.now() + 30 * 60 * 1000,
    };

    const compressedData = LZString.compress(JSON.stringify(cacheData));
    localStorage.setItem("messagesCache", compressedData);
  };

  // Add storage cleanup on page load/refresh
  useEffect(() => {
    const cleanupStorage = () => {
      // Clear old message caches
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("messages_") || key?.startsWith("messagesCache")) {
          localStorage.removeItem(key);
        }
      }
    };

    cleanupStorage();

    // Also clean up on page unload
    window.addEventListener("beforeunload", cleanupStorage);
    return () => window.removeEventListener("beforeunload", cleanupStorage);
  }, []);

  const handlePayment = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Get user context from SQL database
      const userResponse = await fetch(
        `${baseUrl}/api/user-context?email=${userEmail}`
      );
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user context");
      }

      const userData = await userResponse.json();
      const companyId = userData.companyId;
      if (!companyId) {
        throw new Error("Company ID not found");
      }

      // Get company data from SQL database
      const companyResponse = await fetch(
        `${baseUrl}/api/company-details?companyId=${companyId}`
      );
      if (!companyResponse.ok) {
        throw new Error("Failed to fetch company details");
      }

      const companyData = await companyResponse.json();
      let amount: number;

      // Set amount based on plan
      switch (companyData.plan) {
        case "free":
          amount = 0; // Free plan - no payment required
          break;
        case "blaster":
          amount = 6800; // RM 68.00
          break;
        case "enterprise":
          amount = 31800; // RM 318.00
          break;
        case "unlimited":
          amount = 71800; // RM 718.00
          break;
        default:
          amount = 0; // Default to free plan if no plan is specified
      }

      const response = await fetch(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          name: userData.name || userEmail,
          amount,
          description: `WhatsApp Business API Subscription - ${
            companyData.plan?.toUpperCase() || "FREE"
          } Plan`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment");
      }

      const paymentData = await response.json();
      if (paymentData?.paymentUrl) {
        window.location.href = paymentData.paymentUrl;
      } else {
        throw new Error("Payment URL not received");
      }
    } catch (error: unknown) {
      console.error("Payment error:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to initialize payment. Please try again.");
      }
    }
  };

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 py-8">
      {!isAuthReady ? (
        <div className="text-center">
          <LoadingIcon icon="spinning-circles" className="w-8 h-8 mx-auto" />
          <p className="mt-2">Initializing...</p>
        </div>
      ) : trialExpired ? (
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Trial Period Expired
          </h2>
          <p className="text-gray-600 mb-4">
            Your trial period has ended. Please subscribe to continue using the
            service.
          </p>
          <button
            onClick={handlePayment}
            className="mt-4 px-6 py-3 bg-green-500 text-white text-lg font-semibold rounded hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 w-full"
          >
            Pay Now
          </button>
     
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-4xl text-center px-6 py-1">
        <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
          
          {/* Connection Summary Header */}
          {phones && phones.length > 0 && (
            <div className="w-full max-w-2xl mx-auto mb-4">
              <div className="text-center mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  WhatsApp Phone Connection
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connect all your business phone numbers to get started
                </p>
                </div>
            
              {/* Quick Status Overview */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {phones.filter(p => p.status === "ready" || p.status === "authenticated").length}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-600">Connected</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {phones.filter(p => p.status === "qr").length}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-600">Need QR</div>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                    {phones.filter(p => p.status === "initializing").length}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-600">Initializing</div>
                </div>
              </div>
                  </div>
                )}
                
          {v2 ? (
            <>
              <div className="mt-0 text-base text-gray-800 dark:text-gray-200 w-full">
                Please use your WhatsApp QR scanner to scan the code or
                enter your phone number for a pairing code.
              </div>
              
              {/* Connection Status Indicator */}
              <div className="mt-1 flex items-center justify-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  qrCodeImage ? 'bg-green-500' : wsConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {qrCodeImage ? 'QR Code Active' : 
                    wsConnected ? 'Connected to server' : 
                    error ? (error.includes('WebSocket') ? 'WebSocket failed' : 'Connection failed') : 
                    'Connecting to server...'}
                </span>
              </div>
              
              <hr className="w-full my-1 border-t border-gray-300 dark:border-gray-700" />
              {error && !qrCodeImage && (
                <div className="mt-0.5 p-2 bg-red-50 border border-red-200 rounded-md w-full max-w-2xl mx-auto">
                  <div className="text-red-700 font-medium mb-1 text-sm">
                    {error}
                  </div>
                  {error.includes("WebSocket") && (
                    <div className="text-sm text-red-600">
                      <p className="mb-1 text-sm">Troubleshooting tips:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-sm">
                        <li>Check your internet connection</li>
                        <li>Try refreshing the page</li>
                        <li><strong>Backend WebSocket endpoint not responding</strong></li>
                        <li>Contact support if the issue persists</li>
                      </ul>
                      <button
                        onClick={() => {
                          setError("");
                          setWsConnected(false);
                          if (isAuthReady) {
                            // Trigger WebSocket reconnection
                            const userEmail = localStorage.getItem("userEmail");
                            if (userEmail) {
                              // Force a re-fetch of user config and WebSocket connection
                              fetchQRCode();
                            }
                          }
                        }}
                        className="mt-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                      >
                        Retry Connection
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isQRLoading ? (
                <div className="mt-0.5">
                  <img
                    alt="Logo"
                    className="w-20 h-20 animate-spin mx-auto"
                    src={logoUrl}
                    style={{ animation: "spin 10s linear infinite" }}
                  />
                  <p className="mt-0.5 text-gray-600 dark:text-gray-400 text-sm">
                    Loading QR Code...
                  </p>
                </div>
              ) : qrCodeImage ? (
                <div className="mt-0.5 w-full flex flex-col items-center">
                  {/* Phone Selection for Multiple Phones */}
                  {phones && phones.length > 1 && (
                    <div className="w-full max-w-md mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">
                        Select Phone to Connect:
                      </label>
                      <select
                        value={selectedPhoneIndex}
                        onChange={(e) => handlePhoneSelection(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-md text-gray-700 focus:outline-none focus:border-blue-500 text-sm"
                      >
                        {phones.map((phone, index) => (
                          <option key={phone.phoneIndex} value={phone.phoneIndex}>
                            {phone.phoneInfo || `Phone ${phone.phoneIndex + 1}`} - {
                              phone.status === "ready" ? "✅ Connected" :
                              phone.status === "authenticated" ? "✅ Authenticated" :
                              phone.status === "qr" ? "🔴 Needs QR Scan" :
                              phone.status === "initializing" ? "🔄 Initializing" :
                              phone.status
                            }
    </option>
  ))}
</select>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                        {phones.find(p => p.phoneIndex === selectedPhoneIndex)?.status === "qr" 
                          ? "This phone needs QR code scanning" 
                          : phones.find(p => p.phoneIndex === selectedPhoneIndex)?.status === "ready" || phones.find(p => p.phoneIndex === selectedPhoneIndex)?.status === "authenticated"
                          ? "This phone is already connected"
                          : "Select a phone that needs connection"}
                      </div>
                      
                      {/* Individual Phone Reinitialize Buttons for v2 */}
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400 text-center mb-1">
                          Quick Actions:
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {phones.map((phone) => (
                            <button
                              key={phone.phoneIndex}
                              onClick={() => reinitializeBot(phone.phoneIndex)}
                              disabled={isReinitializing || reinitializeCooldown > 0}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                isReinitializing || reinitializeCooldown > 0
                                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                  : 'bg-orange-500 text-white hover:bg-orange-600'
                              }`}
                              title={reinitializeCooldown > 0 ? `Cooldown: ${reinitializeCooldown}s remaining` : `Reinitialize ${phone.phoneInfo || `Phone ${phone.phoneIndex + 1}`}`}
                            >
                              {isReinitializing && reinitializeCooldown > 0 ? 'Wait...' : `Reinit ${phone.phoneInfo ? phone.phoneInfo.split(' ')[0] : `P${phone.phoneIndex + 1}`}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* QR Code Container - Always Centered */}
                  <div className="bg-white p-2 rounded-lg w-full max-w-lg flex flex-col items-center">
                    <img
                      src={qrCodeImage}
                      alt="QR Code"
                      className="max-w-full h-auto max-h-80"
                    />
                    {phones && phones.length > 1 && (
                      <p className="mt-1 text-sm text-gray-600 text-center">
                        QR Code for: {phones.find(p => p.phoneIndex === selectedPhoneIndex)?.phoneInfo || ""}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-0.5 text-gray-600 dark:text-gray-400 text-sm">
                  No QR Code available. Please try refreshing or use the
                  pairing code option below.
                </div>
              )}

              {/* Success Message when QR Code is Working */}
              {qrCodeImage && (
                <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded-md w-full max-w-2xl mx-auto">
                  <div className="text-green-700 font-medium mb-1 text-sm text-center">
                    QR Code Ready - Scan to Connect
                  </div>
                </div>
              )}

              {/* Pairing Code Toggle Button */}
              <div className="mt-0.5 text-center">
                <button
                  onClick={() => setShowPairingCode(!showPairingCode)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 underline focus:outline-none"
                >
                  {showPairingCode ? 'Hide' : 'Link With Phone Number (Optional)'}
                </button>
              </div>

              {/* Pairing Code Section - Hidden by Default */}
              {showPairingCode && (
                <div className="mt-1 w-full max-w-md mx-auto">
                  <input
                    type="tel"
                    value={phoneNumber || (phones && phones.find(p => p.phoneIndex === selectedPhoneIndex)?.phoneInfo) || ""}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number with country code eg: 60123456789"
                    className="w-full px-3 py-2 border rounded-md text-gray-700 focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <button
                    onClick={requestPairingCode}
                    disabled={isPairingCodeLoading || !phoneNumber}
                    className="mt-1 px-4 py-2 bg-primary text-white text-sm font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full disabled:bg-gray-400"
                  >
                    {isPairingCodeLoading ? (
                      <span className="flex items-center justify-center">
                        <LoadingIcon
                          icon="three-dots"
                          className="w-4 h-4 mr-1"
                        />
                        Generating...
                      </span>
                    ) : (
                      "Get Pairing Code"
                    )}
                  </button>
                </div>
              )}

              {isPairingCodeLoading && (
                <div className="mt-1 text-gray-600 dark:text-gray-400 text-sm">
                  Generating pairing code...
                </div>
              )}
                
                {pairingCode && (
                <div className="mt-1 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-sm w-full max-w-md mx-auto">
                    Your pairing code: <strong>{pairingCode}</strong>
                  <p className="text-sm mt-1">
                    Enter this code in your WhatsApp app to authenticate.
                  </p>
                  </div>
                )}
              </>
            ) : (
              <>
              {/* Phone Status Overview - Enhanced for Multiple Phones */}
              {phones && phones.length > 0 && (
                <div className="mt-2 w-full max-w-2xl mx-auto">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                    Phone Connection Status
                </div>
                  <div className="space-y-2">
                    {phones.map((phone, index) => (
                      <div key={phone.phoneIndex} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            phone.status === "ready" || phone.status === "authenticated" 
                              ? "bg-green-500" 
                              : phone.status === "qr" 
                              ? "bg-yellow-500" 
                              : "bg-gray-400"
                          }`}></div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {phone.phoneInfo || `Phone ${phone.phoneIndex + 1}`}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Index: {phone.phoneIndex}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            phone.status === "ready" || phone.status === "authenticated" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                              : phone.status === "qr" 
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" 
                              : phone.status === "initializing"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}>
                            {phone.status === "ready" ? "Connected" : 
                             phone.status === "authenticated" ? "Authenticated" :
                             phone.status === "qr" ? "Needs QR Scan" :
                             phone.status === "initializing" ? "Initializing" :
                             phone.status}
                          </span>
                          {phone.status === "qr" && (
                            <button
                              onClick={() => handlePhoneSelection(phone.phoneIndex)}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            >
                              Connect
                            </button>
                          )}
                          {/* Add reinitialize button for each phone */}
                          <button
                            onClick={() => reinitializeBot(phone.phoneIndex)}
                            disabled={isReinitializing || reinitializeCooldown > 0}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              isReinitializing || reinitializeCooldown > 0
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                            }`}
                            title={reinitializeCooldown > 0 ? `Cooldown: ${reinitializeCooldown}s remaining` : 'Reinitialize this phone'}
                          >
                            {isReinitializing && reinitializeCooldown > 0 ? 'Wait...' : 'Reinit'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Overall Progress Indicator */}
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Connection Progress
                      </span>
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        {phones.filter(p => p.status === "ready" || p.status === "authenticated").length} of {phones.length} connected
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(phones.filter(p => p.status === "ready" || p.status === "authenticated").length / phones.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* All Phones Ready Status */}
                  {phones.every(phone => phone.status === "ready" || phone.status === "authenticated") && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-green-800 dark:text-green-200">
                            All Phones Connected! 🎉
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            Preparing to load contacts and navigate to chat...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Status Message for Non-Phone States */}
              {(!phones || phones.length === 0) && (
                <div className="mt-2 text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {botStatus === "authenticated" || botStatus === "ready"
                      ? "Authentication successful. Loading contacts..."
                      : botStatus === "initializing"
                      ? "Initializing WhatsApp connection..."
                      : "Fetching Data..."}
                  </div>
                </div>
              )}
                {isProcessingChats && (
                <div className="space-y-0.5 mt-0.5">
                    <Progress className="w-full">
                      <Progress.Bar 
                        className="transition-all duration-300 ease-in-out"
                      style={{
                        width: `${(fetchedChats / totalChats) * 100}%`,
                      }}
                      >
                      {Math.round((fetchedChats / totalChats) * 100)}%
                      </Progress.Bar>
                    </Progress>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {processingComplete
                      ? contactsFetched
                        ? "Chats loaded. Preparing to navigate..."
                        : "Processing complete. Loading contacts..."
                      : `Processing ${fetchedChats} of ${totalChats} chats`}
                    </div>
                  </div>
                )}
                {(isLoading || !processingComplete || isFetchingChats) && (
                <div className="mt-0.5 flex flex-col items-center">
                  <img
                    alt="Logo"
                    className="w-16 h-16 animate-spin mx-auto"
                    src={logoUrl}
                    style={{ animation: "spin 3s linear infinite" }}
                  />
                  <p className="mt-0.5 text-gray-600 dark:text-gray-400 text-xs">
                    {isQRLoading
                      ? "Please wait while QR code is loading..."
                      : "Please wait while QR Code is loading..."}
                  </p>
                  </div>
                )}
              </>
            )}
            
          <hr className="w-full my-1 border-t border-gray-300 dark:border-gray-700" />
            
          {/* Action Buttons Section */}
          <div className="mt-2 space-y-2 w-full max-w-2xl mx-auto">
            {/* Refresh Progress Indicator */}
            {isRefreshing && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 text-blue-600 text-sm">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-medium">Refreshing connection...</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">Please wait while we reconnect to WhatsApp</p>
                </div>
              </div>
            )}
            
            {/* Primary Actions Row */}
            <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-sm hover:shadow-md ${
                isRefreshing 
                  ? 'bg-blue-500 text-white cursor-not-allowed' 
                  : 'bg-primary text-white hover:bg-blue-600 focus:ring-blue-500'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {isRefreshing ? (
                  <div className="relative">
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span className="font-medium">
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </span>
              </div>
            </button>
            
            {/* Reinitialize Bot Button */}
            <button
              onClick={() => reinitializeBot()}
              disabled={isReinitializing || reinitializeCooldown > 0 || !phones || phones.length === 0}
              className={`flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-sm hover:shadow-md ${
                isReinitializing || reinitializeCooldown > 0
                  ? 'bg-orange-500 text-white cursor-not-allowed' 
                  : 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {isReinitializing ? (
                  <div className="relative">
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M9 14l3-3m0 0l3 3m-3-3V4" />
                  </svg>
                )}
                <span className="font-medium">
                  {isReinitializing 
                    ? 'Reinitializing...' 
                    : reinitializeCooldown > 0 
                      ? `Cooldown (${reinitializeCooldown}s)` 
                      : 'Reinitialize Bot'
                  }
                </span>
              </div>
            </button>
            
            <a
              href="https://wa.link/pcgo1k"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-3 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 shadow-sm hover:shadow-md text-center"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Need Help?</span>
              </div>
            </a>
            </div>
            
     
          </div>


          </div>
        )}
    </div>
  );
}

export default LoadingPage2;
