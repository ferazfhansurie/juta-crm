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

function LoadingPage() {
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

  const [loadingPhase, setLoadingPhase] = useState<string>("initializing");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [webSocket, setWebSocket] = useState(null);
  const isMountedRef = useRef(true);
  
  const fetchQRCode = async () => {
    if (!isAuthReady || !isMountedRef.current) {
      return;
    }

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
      console.log("Bot status data:", data);
      console.log("Data phones:", data.phones);
      console.log("Data phones type:", typeof data.phones);
      console.log("Data phones is array:", Array.isArray(data.phones));
      
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
        setPhones(data.phones);
        if (!isMountedRef.current) return;
        setCompanyId(data.companyId);

        if (data.trialEndDate) {
          const trialEnd = new Date(data.trialEndDate);
          const now = new Date();
          if (now > trialEnd) {
            setTrialExpired(true);
            return;
          }
        }

        // Check if any phone needs QR code
        const phoneNeedingQR = data.phones.find(phone => phone.status === "qr");
        if (phoneNeedingQR && phoneNeedingQR.qrCode) {
          setQrCodeImage(phoneNeedingQR.qrCode);
          setSelectedPhoneIndex(phoneNeedingQR.phoneIndex);
          setBotStatus("qr");
          console.log("QR Code image:", phoneNeedingQR.qrCode);
        }
        // Check if all phones are ready/authenticated
        else if (data.phones.every(phone => phone.status === "ready" || phone.status === "authenticated")) {
          setBotStatus("ready");
          setShouldFetchContacts(true);
          console.log("All phones ready, navigating to /chat");
          navigate("/chat");
        }
        // Set status based on first phone or overall status
        else {
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
        
        setPhones([phone]);
        setCompanyId(data.companyId);
        setSelectedPhoneIndex(0);

        if (data.trialEndDate) {
          const trialEnd = new Date(data.trialEndDate);
          const now = new Date();
          if (now > trialEnd) {
            setTrialExpired(true);
            return;
          }
        }

        // Handle status based on old format
        if (data.status === "qr" && data.qrCode) {
          setQrCodeImage(data.qrCode);
          setBotStatus("qr");
          console.log("QR Code image:", data.qrCode);
        } else if (data.status === "ready" || data.status === "authenticated") {
          setBotStatus("ready");
          console.log("Setting shouldFetchContacts to true");
          setShouldFetchContacts(true);
          console.log("Old format: Status ready, navigating to /chat");
          navigate("/chat");
        } else {
          setBotStatus(data.status || "initializing");
        }
      }

      // Set up WebSocket for real-time updates with proper protocol handling
      const baseUrl = "https://juta-dev.ngrok.dev";
      const wsUrl = window.location.protocol === 'https:' 
        ? `${baseUrl.replace("https", "wss")}/ws/${userEmail}/${companyId}`
        : `${baseUrl.replace("https", "ws")}/ws/${userEmail}/${companyId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Failed to connect to server. Please try again.");
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
      };

      // setWebSocket(ws);
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
      console.error("Error in fetchQRCode:", error);
    } finally {
      console.log("fetchQRCode finally block: setting isLoading to false");
      setIsQRLoading(false);
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchQRCode();
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
    if (phones && phones.length > 0) {
      const phoneNeedingQR = phones.find(phone => phone.status === "qr");
      if (phoneNeedingQR) {
        setSelectedPhoneIndex(phoneNeedingQR.phoneIndex);
        if (phoneNeedingQR.qrCode) {
          setQrCodeImage(phoneNeedingQR.qrCode);
          setBotStatus("qr");
        }
      }
    }
  }, [phones]);
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

          // Connect to WebSocket with proper protocol handling
          const wsUrl = window.location.protocol === 'https:' 
            ? `wss://juta-dev.ngrok.dev/ws/${userEmail}/${companyId}`
            : `ws://juta-dev.ngrok.dev/ws/${userEmail}/${companyId}`;
          ws.current = new WebSocket(wsUrl);

          ws.current.onopen = () => {
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
                    navigate("/chat");
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
                    navigate("/chat");
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
                  navigate("/chat");
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
            console.error("WebSocket error:", error);
            setError("WebSocket connection error. Please try again.");
          };

          ws.current.onclose = () => {
            setWsConnected(false);
          };
        } catch (error) {
          console.error("Error initializing WebSocket:", error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError("Failed to initialize WebSocket. Please try again.");
          }

          if (retries > 0) {
            setTimeout(() => initWebSocket(retries - 1), 2000);
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
    };
  }, [processingComplete, isLoading, contacts]);

  useEffect(() => {
    if (shouldFetchContacts && !isLoading) {
      console.log("useEffect: shouldFetchContacts is true and not loading, navigating to /chat");
      navigate("/chat");
    }
  }, [shouldFetchContacts, isLoading, navigate]);

  useEffect(() => {
    if (contactsFetched && fetchedChats === totalChats && contacts && contacts.length > 0) {
      navigate("/chat");
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
        navigate("/chat");
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
      navigate("/chat");
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
          amount = 6800; // Default to blaster plan if no plan is specified
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
            companyData.plan?.toUpperCase() || "BLASTER"
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
          <button
            onClick={handleLogout}
            className="mt-6 px-6 py-3 bg-primary text-white text-lg font-semibold rounded hover:bg-blue-600 transition-colors"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-lg text-center px-4">
          {
            <>
              {botStatus === "qr" ? (
                <>
                  <div className="mt-2 text-md text-gray-800 dark:text-gray-200">
                    Please use your WhatsApp QR scanner to scan the code or
                    enter your phone number for a pairing code.
                  </div>
                  
                  {/* Phone Selection */}
                  {phones && phones.length > 1 && (
                    <div className="mt-4 w-full">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Phone Number:
                      </label>
                      <select
                        value={selectedPhoneIndex}
                        onChange={(e) => handlePhoneSelection(Number(e.target.value))}
                        className="w-full px-4 py-2 border rounded-md text-gray-700 focus:outline-none focus:border-blue-500"
                      >
                        {phones.map((phone, index) => (
                          <option key={phone.phoneIndex} value={phone.phoneIndex}>
                            {phone.phoneInfo} - {phone.status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <hr className="w-full my-4 border-t border-gray-300 dark:border-gray-700" />
                  {error && (
                    <div className="text-red-500 dark:text-red-400 mt-2">
                      {error}
                    </div>
                  )}
                  {isQRLoading ? (
                    <div className="mt-4">
                      <img
                        alt="Logo"
                        className="w-32 h-32 animate-spin mx-auto"
                        src={logoUrl}
                        style={{ animation: "spin 10s linear infinite" }}
                      />
                      <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Loading QR Code...
                      </p>
                    </div>
                  ) : qrCodeImage ? (
                    <div className="bg-white p-4 rounded-lg mt-4">
                      <img
                        src={qrCodeImage}
                        alt="QR Code"
                        className="max-w-full h-auto"
                      />
                      {phones && phones.length > 1 && (
                        <p className="mt-2 text-sm text-gray-600">
                          QR Code for: {phones.find(p => p.phoneIndex === selectedPhoneIndex)?.phoneInfo || ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 text-gray-600 dark:text-gray-400">
                      No QR Code available. Please try refreshing or use the
                      pairing code option below.
                    </div>
                  )}

                  <div className="mt-4 w-full">
                    <input
                      type="tel"
                      value={phoneNumber || (phones && phones.find(p => p.phoneIndex === selectedPhoneIndex)?.phoneInfo) || ""}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter phone number with country code eg: 60123456789"
                      className="w-full px-4 py-2 border rounded-md text-gray-700 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={requestPairingCode}
                      disabled={isPairingCodeLoading || !phoneNumber}
                      className="mt-2 px-6 py-3 bg-primary text-white text-lg font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full disabled:bg-gray-400"
                    >
                      {isPairingCodeLoading ? (
                        <span className="flex items-center justify-center">
                          <LoadingIcon
                            icon="three-dots"
                            className="w-5 h-5 mr-2"
                          />
                          Generating...
                        </span>
                      ) : (
                        "Get Pairing Code"
                      )}
                    </button>
                  </div>

                  {isPairingCodeLoading && (
                    <div className="mt-4 text-gray-600 dark:text-gray-400">
                      Generating pairing code...
                    </div>
                  )}

                  {pairingCode && (
                    <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                      Your pairing code: <strong>{pairingCode}</strong>
                      <p className="text-sm mt-2">
                        Enter this code in your WhatsApp app to authenticate.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-2 text-xs text-gray-800 dark:text-gray-200">
                    {phones && phones.length > 0 ? (
                      <div>
                        <div className="mb-2">
                          {phones.every(phone => phone.status === "ready" || phone.status === "authenticated")
                            ? "All phones authenticated. Loading contacts..."
                            : "Phone Status:"}
                        </div>
                        {phones && phones.map((phone, index) => (
                          <div key={phone.phoneIndex} className="text-xs mb-1 flex items-center justify-between">
                            <span>{phone.phoneInfo}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              phone.status === "ready" || phone.status === "authenticated" 
                                ? "bg-green-100 text-green-800" 
                                : phone.status === "qr" 
                                ? "bg-yellow-100 text-yellow-800" 
                                : "bg-gray-100 text-gray-800"
                            }`}>
                              {phone.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      botStatus === "authenticated" || botStatus === "ready"
                        ? "Authentication successful. Loading contacts..."
                        : botStatus === "initializing"
                        ? "Initializing WhatsApp connection..."
                        : "Fetching Data..."
                    )}
                  </div>
                  {isProcessingChats && (
                    <div className="space-y-2 mt-4">
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
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {processingComplete
                          ? contactsFetched
                            ? "Chats loaded. Preparing to navigate..."
                            : "Processing complete. Loading contacts..."
                          : `Processing ${fetchedChats} of ${totalChats} chats`}
                      </div>
                    </div>
                  )}
                  {(isLoading || !processingComplete || isFetchingChats) && (
                    <div className="mt-4 flex flex-col items-center">
                      <img
                        alt="Logo"
                        className="w-32 h-32 animate-spin mx-auto"
                        src={logoUrl}
                        style={{ animation: "spin 3s linear infinite" }}
                      />
                      <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {isQRLoading
                          ? "Please wait while QR code is loading..."
                          : "Please wait while QR Code is loading..."}
                      </p>
                    </div>
                  )}
                </>
              )}

              <hr className="w-full my-4 border-t border-gray-300 dark:border-gray-700" />

              <button
                onClick={handleRefresh}
                className="mt-4 px-6 py-3 bg-primary text-white text-lg font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full"
              >
                Refresh
              </button>
              <a
                href="https://wa.link/pcgo1k"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-6 py-3 bg-green-500 text-white text-lg font-semibold rounded hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 w-full inline-block text-center"
              >
                Need Help?
              </a>
              <button
                onClick={handleLogout}
                className="mt-4 px-6 py-3 bg-red-500 text-white text-lg font-semibold rounded hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 w-full"
              >
                Logout
              </button>

              {error && (
                <div className="mt-2 text-red-500 dark:text-red-400">
                  {error}
                </div>
              )}
            </>
          }
        </div>
      )}
    </div>
  );
}

export default LoadingPage;
