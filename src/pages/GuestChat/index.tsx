import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { getAuth } from "firebase/auth";

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

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
  imageUrls?: string[];
  documentUrls?: string[];
  caption?: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
  onDeleteThread?: () => void;
  isLoading?: boolean;
}

// PDF Modal Component
interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName?: string;
}

const PDFModal: React.FC<PDFModalProps> = ({ isOpen, onClose, documentUrl, documentName }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full md:w-[800px] h-auto md:h-[600px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Document Preview
          </h2>
          <button
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4 flex justify-center items-center"
          style={{ height: "90%" }}
        >
          {documentUrl.toLowerCase().includes('.pdf') ? (
            <iframe
              src={documentUrl}
              width="100%"
              height="100%"
              title="PDF Document"
              className="border rounded"
            />
          ) : (
            <div className="text-center">
              <svg className="w-20 h-20 mb-2 mx-auto text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-800 dark:text-gray-200 font-semibold">
                {documentName || "Document"}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Click Download to view this document
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-center">
          <button
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            onClick={() => window.open(documentUrl, '_blank')}
          >
            Download Document
          </button>
        </div>
      </div>
    </div>
  );
};

const MessageList: React.FC<MessageListProps> = ({ messages, onSendMessage, assistantName, onDeleteThread, isLoading }) => {
  const [newMessage, setNewMessage] = useState('');
  
  // PDF Modal state
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    documentUrl: string;
    documentName?: string;
  }>({
    isOpen: false,
    documentUrl: "",
    documentName: "",
  });

  const openPDFModal = (documentUrl: string, documentName?: string) => {
    setPdfModal({
      isOpen: true,
      documentUrl,
      documentName,
    });
  };

  const closePDFModal = () => {
    setPdfModal({
      isOpen: false,
      documentUrl: "",
      documentName: "",
    });
  };

  const myMessageClass = "bg-gray-700 text-white dark:bg-gray-600 rounded-2xl p-3 self-end text-left relative";
  const otherMessageClass = "bg-[#dcf8c6] dark:bg-green-700 text-black dark:text-white rounded-2xl p-3 self-start text-left relative";

  const LoadingDots = () => (
    <div className="flex space-x-1.5 items-center p-3">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
  //hi hi hi hi
  const handleSendMessage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSendMessage(newMessage);
        setNewMessage('');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
            <span className="text-lg font-semibold">{assistantName.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Chat with {assistantName}</h2>
            <p className="text-sm text-gray-500">{assistantName} Specialized Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {onDeleteThread && (
            <button
              onClick={onDeleteThread}
              className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.slice().reverse().map((message, index) => (
            <div key={index}>
              {message.text.split('||').map((splitText, splitIndex) => (
                <div
                  key={`${index}-${splitIndex}`}
                  className={`flex ${message.from_me ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  <div
                    className={`${message.from_me ? myMessageClass : otherMessageClass} max-w-[70%]`}
                  >
                    <div className="whitespace-pre-wrap">{splitText.trim()}</div>
                    
                    {/* AI Response Content */}
                    {message.type === "image" && message.imageUrls && (
                      <div className="space-y-2 mt-2">
                        {message.imageUrls.map((imageUrl, imgIndex) => (
                          <div key={imgIndex} className="relative">
                            <img
                              src={imageUrl}
                              alt={`AI Response Image ${imgIndex + 1}`}
                              className="max-w-full h-auto rounded-lg cursor-pointer"
                              style={{ maxHeight: "300px" }}
                              onClick={() => {
                                window.open(imageUrl, '_blank');
                              }}
                            />
                            {message.caption && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {message.caption}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {message.type === "document" && message.documentUrls && (
                      <div className="space-y-2 mt-2">
                        {message.documentUrls.map((documentUrl, docIndex) => (
                          <div key={docIndex} className="relative">
                            {/* Document Header */}
                            <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 mb-2">
                              <svg className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {documentUrl.split('/').pop()?.split('?')[0] || `Document ${docIndex + 1}`}
                                </p>
                                {message.caption && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {message.caption}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => openPDFModal(documentUrl, documentUrl.split('/').pop()?.split('?')[0] || `Document ${docIndex + 1}`)}
                                className="px-3 py-1 text-xs bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                              >
                                View
                              </button>
                            </div>
                            
                            {/* Document Content Preview */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                              {documentUrl.toLowerCase().includes('.pdf') ? (
                                <iframe
                                  src={documentUrl}
                                  width="100%"
                                  height="400"
                                  title={`Document ${docIndex + 1}`}
                                  className="border-0"
                                  style={{ minHeight: '400px' }}
                                />
                              ) : documentUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                  src={documentUrl}
                                  alt={`Document ${docIndex + 1}`}
                                  className="w-full h-auto max-h-96 object-contain"
                                />
                              ) : (
                                <div className="p-4 text-center">
                                  <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                  </svg>
                                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Document preview not available
                                  </p>
                                  <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                                    Click Download to view this document
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {splitIndex === message.text.split('||').length - 1 && (
                      <div className={`text-xs mt-1 ${message.from_me ? 'text-white/80' : 'text-gray-500'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={otherMessageClass}>
                <LoadingDots />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleSendMessage}
            placeholder="Type your message here..."
            className="w-full px-4 py-2 border rounded-full focus:outline-none focus:border-green-400"
          />
          <button
            onClick={() => {
              if (newMessage.trim()) {
                onSendMessage(newMessage);
                setNewMessage('');
              }
            }}
            className="p-2 rounded-full bg-green-500 text-white hover:bg-green-600"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* PDF Modal */}
      <PDFModal
        isOpen={pdfModal.isOpen}
        onClose={closePDFModal}
        documentUrl={pdfModal.documentUrl}
        documentName={pdfModal.documentName}
      />
    </div>
  );
};

const GuestChat: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [assistantName, setAssistantName] = useState<string>('Assistant');
  const [loading, setLoading] = useState<boolean>(true);
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');

  // Add function to save messages to Firestore
  const saveMessagesToFirestore = async (messages: ChatMessage[]) => {
    if (!companyId || !sessionId) return;
    
    try {
      // Changed path to include company ID in the structure
      const chatRef = doc(firestore, "companies", companyId, "guestChats", sessionId);
      await updateDoc(chatRef, {
        messages,
        lastUpdated: new Date().toISOString()
      }).catch(() => {
        // If document doesn't exist, create it
        return setDoc(doc(firestore, "companies", companyId, "guestChats", sessionId), {
          messages,
          lastUpdated: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  };

  // Add function to load messages from Firestore
  const loadMessagesFromFirestore = async (sessionId: string) => {
    try {
      // Changed path to include company ID in the structure
      if (!companyId) return;
      const chatRef = doc(firestore, "companies", companyId, "guestChats", sessionId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // Modify useEffect to load messages when session is retrieved
  useEffect(() => {
    const initializeChat = async () => {
      if (companyId) {
        const existingSessionId = localStorage.getItem(`guest-session-${companyId}`);
        
        if (existingSessionId) {
          setSessionId(existingSessionId);
          // First load existing messages
          await loadMessagesFromFirestore(existingSessionId);
          // Then fetch company config (which will only add welcome message if no messages exist)
          await fetchCompanyConfig(companyId);
          console.log(`Existing guest session resumed: ${existingSessionId}`);
        } else {
          const newSessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          setSessionId(newSessionId);
          localStorage.setItem(`guest-session-${companyId}`, newSessionId);
          // For new sessions, fetch config first (which will add welcome message)
          await fetchCompanyConfig(companyId);
          console.log(`New guest session started: ${newSessionId}`);
        }
      } else {
        setError("Company ID not provided in URL");
        setLoading(false);
      }
    };

    initializeChat();
  }, [companyId]);

  // Add useEffect to save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToFirestore(messages);
    }
  }, [messages]);

  // Modify deleteThread to also delete messages from Firestore
  const deleteThread = async () => {
    try {
      if (!companyId || !sessionId) {
        throw new Error("Missing company ID or session ID");
      }

      // Delete the chat document from Firestore
      const chatRef = doc(firestore, "companies", companyId, "guestChats", sessionId);
      await deleteDoc(chatRef);

      // Clear messages from state
      setMessages([]);

      // Generate new session ID
      const newSessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(newSessionId);

      toast.success('Chat cleared successfully');
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    }
  };

  const fetchCompanyConfig = async (companyId: string) => {
    try {
      const companyDoc = await getDoc(doc(firestore, "companies", companyId));
      const tokenDoc = await getDoc(doc(firestore, "setting", "token"));
      
      if (companyDoc.exists() && tokenDoc.exists()) {
        const companyData = companyDoc.data();
        const tokenData = tokenDoc.data();
        
        setApiKey(tokenData.openai);
        setAssistantId(companyData.assistantId);
        setAssistantName(companyData.name || 'Assistant');
        
        // Check if there are existing messages in Firestore
        if (sessionId) {
          const chatRef = doc(firestore, "companies", companyId, "guestChats", sessionId);
          const chatDoc = await getDoc(chatRef);
          
        }
      } else {
        setError("Company not found");
      }
    } catch (error) {
      console.error("Error fetching company config:", error);
      setError("Failed to fetch company configuration");
    } finally {
      setLoading(false);
    }
  };
  // AI Response checking function
  const checkAIResponses = async (messageText: string, isUserMessage: boolean = true): Promise<ChatMessage[]> => {
    try {
      if (!companyId) return [];

      // Get company API URL
      const baseUrl = 'https://mighty-dane-newly.ngrok-free.app';
      const companyResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=guest&companyId=${companyId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!companyResponse.ok) return [];

      const companyData = await companyResponse.json();
      const apiUrl = companyData.companyData?.api_url || baseUrl;

      // Fetch all AI responses by type since the API requires a type parameter
      console.log("Fetching AI responses for company:", companyId, "from:", apiUrl);
      
      const responseTypes = ['image', 'tag', 'voice', 'document', 'assign', 'video'];
      const allResponses = [];
      
      // Fetch responses for each type
      for (const responseType of responseTypes) {
        try {
          const endpoint = `${apiUrl}/api/ai-responses?companyId=${companyId}&type=${responseType}`;
          console.log(`Fetching ${responseType} responses from:`, endpoint);
          
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Add type to each response for easier processing
              const typedResponses = data.data.map((item: any) => ({ ...item, type: responseType }));
              allResponses.push(...typedResponses);
              console.log(`Found ${typedResponses.length} ${responseType} responses`);
            }
          } else {
            console.log(`${responseType} responses failed:`, response.status);
          }
        } catch (error) {
          console.log(`Error fetching ${responseType} responses:`, error);
        }
      }
      
      console.log("Total AI responses found:", allResponses.length);
      console.log("All responses data:", allResponses);
      
      const triggeredResponses: ChatMessage[] = [];

      // Check each AI response for keyword matches
      for (const response of allResponses) {
        console.log("Processing response:", response);
        console.log("Response status:", response.status);
        console.log("Response keywords:", response.keywords);
        
        if (response.status !== 'active') {
          console.log("Skipping inactive response:", response.status);
          continue;
        }

        const keywords = Array.isArray(response.keywords) ? response.keywords : [response.keywords];
        const messageLower = messageText.toLowerCase();
        console.log("Checking keywords:", keywords, "against message:", messageLower);

        // Check if any keyword matches the message
        let hasMatch = false;
        
        if (isUserMessage) {
          // Check if user message contains keywords (for user-triggered responses)
          hasMatch = keywords.some((keyword: string) => 
            keyword && messageLower.includes(keyword.toLowerCase())
          );
        } else {
          // Check if bot message contains keywords (for bot-triggered responses)
          hasMatch = keywords.some((keyword: string) => 
            keyword && messageLower.includes(keyword.toLowerCase())
          );
        }

        if (hasMatch) {
          console.log("Keyword match found:", keywords, "for response:", response);
          // Create appropriate response based on type
          switch (response.type) {
            case 'image':
              console.log("Processing image response:", response);
              if (response.image_urls && response.image_urls.length > 0) {
                console.log("Image URLs found:", response.image_urls);
                triggeredResponses.push({
                  from_me: false,
                  type: "image",
                  text: response.description || "AI Image Response",
                  imageUrls: response.image_urls,
                  caption: response.description,
                  createdAt: new Date().toISOString(),
                });
                console.log("Added image response to triggeredResponses");
              } else {
                console.log("No image URLs found in response:", response);
              }
              break;
            case 'document':
              console.log("Processing document response:", response);
              if (response.document_urls && response.document_urls.length > 0) {
                console.log("Document URLs found:", response.document_urls);
                triggeredResponses.push({
                  from_me: false,
                  type: "document",
                  text: response.description || "AI Document Response",
                  documentUrls: response.document_urls,
                  caption: response.description,
                  createdAt: new Date().toISOString(),
                });
                console.log("Added document response to triggeredResponses");
              } else {
                console.log("No document URLs found in response:", response);
              }
              break;
            case 'tag':
              // Handle tag responses if needed
              break;
            case 'voice':
              // Handle voice responses if needed
              break;
            case 'assign':
              // Handle assignment responses if needed
              break;
            case 'video':
              // Handle video responses if needed
              break;
          }
        } else {
          console.log("No keyword match for:", keywords);
        }
      }
      
      console.log("Final triggeredResponses:", triggeredResponses);

      return triggeredResponses;
    } catch (error) {
      console.error("Error checking AI responses:", error);
      return [];
    }
  };

  const sendMessageToAssistant = async (messageText: string) => {
    const newMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
  
    setMessages(prevMessages => [newMessage, ...prevMessages]);
    setMessageLoading(true);
  
    try {
      if (!companyId || !assistantId) {
        throw new Error("Missing company ID or assistant ID");
      }
      
      const companyDoc = await getDoc(doc(firestore, "companies", companyId));
      if (!companyDoc.exists()) {
        throw new Error("Company not found");
      }
      
      const data = companyDoc.data();
      const baseUrl = 'https://mighty-dane-newly.ngrok-free.app';
      //const baseUrl = data.apiUrl || 'https://juta-dev.ngrok.dev';
      
      const res = await axios.get(`${baseUrl}/api/assistant-test-guest/`, {
        params: {
          message: messageText,
          sessionId: sessionId,
          assistantid: assistantId,
          idSubstring: companyId
        },
      });
      
      const responseData = res.data;
      
      // Split the bot's response into individual messages using || separator
      const botMessages = responseData.answer.split('||').filter((line: string) => line.trim() !== '');
      console.log("Bot response split into messages:", botMessages);
      
      // Check for AI responses based on the BOT's message, not the user's
      const aiResponses = await checkAIResponses(responseData.answer, false);
      console.log("AI Responses found for bot message:", aiResponses);
      
      // Create messages array - each || separated part becomes a separate message
      const newMessages: ChatMessage[] = [];
      
      // Process each bot message part and insert AI responses after the triggering part
      for (let i = 0; i < botMessages.length; i++) {
        const botMessage = botMessages[i];
        console.log(`Processing bot message part ${i}:`, botMessage);
        
        // Add the bot message part
        newMessages.push({
          from_me: false,
          type: "text",
          text: botMessage,
          createdAt: new Date().toISOString(),
        });
        
        // If this message part contains the keyword, add AI responses immediately after
        if (aiResponses.length > 0 && botMessage.toLowerCase().includes('your cnb carpets virtual admin assistant')) {
          console.log("Adding AI responses after message part:", botMessage);
          newMessages.push(...aiResponses);
        }
      }
      
      console.log("Final newMessages array:", newMessages);
      
      // Reverse the messages so newest appears first in the chat display
      const reversedNewMessages = [...newMessages].reverse();
      console.log("Reversed for chat display:", reversedNewMessages);
      
      // Add all messages to the chat (newest first)
      setMessages(prevMessages => [...reversedNewMessages, ...prevMessages]);
  
    } catch (error) {
      console.error('Error sending message:', error);
      setError("Failed to send message");
      
      const errorMessage: ChatMessage = {
        from_me: false,
        type: 'text',
        text: "Please hold on ya.",
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [errorMessage, ...prevMessages]);
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div
      className="h-screen w-screen bg-white"
    >
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center text-center">
            <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
            <div className="mt-2 text-xs p-2">Loading chat...</div>
            <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-4 bg-red-100 rounded-lg">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      ) : (
        <MessageList 
          messages={messages} 
          onSendMessage={sendMessageToAssistant} 
          assistantName={assistantName}
          onDeleteThread={deleteThread}
          isLoading={messageLoading}
        />
      )}
      <ToastContainer />
    </div>
  );
};

export default GuestChat;
