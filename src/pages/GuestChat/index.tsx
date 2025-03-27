import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
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
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
  onDeleteThread?: () => void;  // Add this prop
}

const MessageList: React.FC<MessageListProps> = ({ messages, onSendMessage, assistantName, onDeleteThread }) => {
  const [newMessage, setNewMessage] = useState('');

  const myMessageClass = "flex flex-col w-full max-w-[320px] leading-1.5 p-1 bg-[#dcf8c6] dark:bg-green-700 text-black dark:text-white rounded-tr-xl rounded-tl-xl rounded-br-sm rounded-bl-xl self-end ml-auto mr-2 text-left";
  const otherMessageClass = "bg-gray-700 text-white dark:bg-gray-600 rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-sm p-1 self-start text-left";

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSendMessage(newMessage);
        setNewMessage('');
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-900 relative">
      <div className="flex items-center justify-between p-2 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center">
          <div className="w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center text-white mr-3">
            <span className="text-lg capitalize">{assistantName.charAt(0)}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{assistantName}</div>
          </div>
        </div>
        {onDeleteThread && (
          <button
            onClick={onDeleteThread}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 focus:outline-none"
          >
            Clear Chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 dark:bg-gray-900">
        {messages.slice().reverse().map((message, index) => (
          // Split message text by '||' if it exists
          message.type === 'text' && message.text.includes('||') ? (
            message.text.split('||').map((subMessage, subIndex) => (
              <div
                className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}
                key={`${index}-${subIndex}`}
                style={{
                  maxWidth: '70%',
                  width: `${Math.min((subMessage?.length || 0) * 10, 350)}px`,
                  minWidth: '75px'
                }}
              >
                <div className="whitespace-pre-wrap break-words">
                  {subMessage.trim()}
                </div>
                {subIndex === message.text.split('||').length - 1 && (
                  <div className="message-timestamp text-xs text-gray-500 dark:text-gray-300 mt-1">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div
              className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}
              key={index}
              style={{
                maxWidth: '70%',
                width: `${message.type === 'image' || message.type === 'document' ? '350' : Math.min((message.text?.length || 0) * 10, 350)}px`,
                minWidth: '75px'
              }}
            >
              {message.type === 'text' && (
                <div className="whitespace-pre-wrap break-words">
                  {message.text}
                </div>
              )}
              <div className="message-timestamp text-xs text-gray-500 dark:text-gray-300 mt-1">
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        ))}
      </div>

      <div className="p-4 border-t border-gray-300 dark:border-gray-700">
        <div className="flex items-center">
          <textarea
            className="w-full h-10 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 resize-none"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleSendMessage}
          />
          <button
            onClick={() => {
              if (newMessage.trim()) {
                onSendMessage(newMessage);
                setNewMessage('');
              }
            }}
            className="px-4 py-2 ml-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none"
          >
            Send
          </button>
        </div>
      </div>
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
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    if (companyId) {
      fetchCompanyConfig(companyId);
      // Generate a unique session ID for this guest
      const newSessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(newSessionId);
      
      // Log the session ID
      console.log(`Guest session started: ${newSessionId}`);
     // logSessionToFirestore(newSessionId, companyId);
    } else {
      setError("Company ID not provided in URL");
      setLoading(false);
    }
  }, [companyId]);

  // Function to log the session ID to Firestore
  const logSessionToFirestore = async (sessionId: string, companyId: string) => {
    try {
      const sessionsRef = doc(firestore, "guestSessions", sessionId);
      await updateDoc(sessionsRef, {
        sessionId,
        companyId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }).catch(() => {
        // If document doesn't exist yet, create it
        return updateDoc(doc(firestore, "guestSessions", sessionId), {
          sessionId,
          companyId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      });
    } catch (error) {
      console.error("Error logging session:", error);
      // Don't set error state to avoid disrupting user experience
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
        
        // Add welcome message
        const welcomeMessage: ChatMessage = {
          from_me: false,
          type: 'text',
          text: companyData.welcomeMessage || 'Hello! How can I help you today?',
          createdAt: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
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
  const deleteThread = async () => {

   
  
    try {
      const docUserRef = doc(firestore, 'user', 'admin@juta.com');
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document does not exist");
        setError("User document does not exist");
        return;
      }
  
      await updateDoc(docUserRef, { threadid: '' });
    
      
      // Clear the messages state
      setMessages([]);
    } catch (error) {
      console.error("Error updating thread ID:", error);
      setError("Failed to update thread ID");
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
  
    try {
      if (!companyId || !assistantId) {
        throw new Error("Missing company ID or assistant ID");
      }
      
      const companyDoc = await getDoc(doc(firestore, "companies", companyId));
      if (!companyDoc.exists()) {
        throw new Error("Company not found");
      }
      
      const data = companyDoc.data();
      const baseUrl = data.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      
      const res = await axios.get(`${baseUrl}/api/assistant-test-guest`, {
        params: {
          message: messageText,
          sessionId: sessionId, // Use the session ID instead of email
          assistantid: assistantId
        },
      });
      
      const responseData = res.data;
      
      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: responseData.answer,
        createdAt: new Date().toISOString(),
      };
  
      setMessages(prevMessages => [assistantResponse, ...prevMessages]);
  
    } catch (error) {
      console.error('Error sending message:', error);
      setError("Failed to send message");
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        from_me: false,
        type: 'text',
        text: "Sorry, I'm having trouble responding right now. Please try again later.",
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [errorMessage, ...prevMessages]);
    }
  };

  return (
    <div className="flex justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-lg">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-4">
              <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
              <div className="mt-2 text-xs p-2 dark:text-gray-200">Loading chat...</div>
              <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4 bg-red-100 dark:bg-red-900 rounded-lg">
              <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">Error</h2>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        ) : (
          <MessageList 
            messages={messages} 
            onSendMessage={sendMessageToAssistant} 
            assistantName={assistantName}
            onDeleteThread={deleteThread}  // Pass 
          />
        )}
        <ToastContainer />
      </div>
    </div>
  );
};

export default GuestChat;

function setThreadId(arg0: string) {
    throw new Error("Function not implemented.");
}
