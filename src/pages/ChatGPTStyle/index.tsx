import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from "@/stores/hooks";
import { selectDarkMode } from "@/stores/darkModeSlice";
import Button from "@/components/Base/Button";

const baseUrl = "https://bisnesgpt.serveo.net";

interface ChatMessage {
  id: string;
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
  isLoading?: boolean;
  isBrainstorm?: boolean;
  isStreaming?: boolean;
}

interface AssistantInfo {
  name: string;
  description: string;
  instructions: string;
  metadata: {
    files: Array<{id: string, name: string, url: string}>;
  };
}

const Main: React.FC = () => {
  const darkMode = useAppSelector(selectDarkMode);
  const navigate = useNavigate();

  // Core states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>({
    name: '',
    description: '',
    instructions: '',
    metadata: { files: [] },
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [thinkingState, setThinkingState] = useState<{
    message: string;
    status: string;
    animation: string;
    color: string;
    icon: string;
    progress: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ws = useRef<WebSocket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);

  const scrollToBottom = (force = false) => {
    if (!force && isUserScrollingRef.current) {
      return; // Don't auto-scroll if user is manually scrolling
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
    
    // Detect if user is manually scrolling
    if (Math.abs(scrollTop - lastScrollTopRef.current) > 5) {
      isUserScrollingRef.current = !isAtBottom;
    }
    
    lastScrollTopRef.current = scrollTop;
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    // Reset thread ID when page loads
    localStorage.removeItem("threadId");
    localStorage.removeItem("thread_id");
    localStorage.removeItem("conversationId");
    localStorage.removeItem("conversation_id");
    localStorage.removeItem("chatThreadId");
    localStorage.removeItem("chat_thread_id");
    
    // Clear any existing messages to start fresh
    setMessages([]);
    setError(null);
    setStreamingMessageId(null);
    setThinkingState(null);
    
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
      fetchCompanyId(userEmail);
    }
    
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

  // Initialize WebSocket when companyId is available
  useEffect(() => {
    if (companyId) {
      initWebSocket();
    }
    
    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
        setWsConnected(false);
      }
    };
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // Only auto-scroll for new messages, not during streaming updates
    const lastMessage = messages[0]; // Since we reverse the array, first item is the latest
    if (lastMessage && !lastMessage.isStreaming) {
      scrollToBottom();
    } else if (lastMessage && lastMessage.isStreaming && !isUserScrollingRef.current) {
      // For streaming messages, only scroll if user hasn't manually scrolled away
      setTimeout(() => scrollToBottom(), 100); // Slight delay for smoother experience
    }
  }, [messages]);

  useEffect(() => {
    if (!loading) {
      focusInput();
    }
  }, [loading]);


  const fetchCompanyId = async (userEmail: string) => {
    try {
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
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
        setError("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;
      setCompanyId(companyId);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching company ID:", error);
      setError("Failed to fetch company ID");
      setLoading(false);
    }
  };

  const initWebSocket = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail || !companyId) return;

    try {
      // Always use WSS for ngrok HTTPS tunnel
      const wsUrl = `wss://bisnesgpt.serveo.net/ws/chatgpt/${userEmail}/${companyId}`;

      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("ChatGPT WebSocket connected");
        setWsConnected(true);
        setError(null);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.current.onerror = (error) => {
        console.error("ChatGPT WebSocket error:", error);
        setError("Connection error. Please try again.");
        setWsConnected(false);
      };

      ws.current.onclose = () => {
        console.log("ChatGPT WebSocket disconnected");
        setWsConnected(false);
      };

    } catch (error) {
      console.error("Error initializing WebSocket:", error);
      setError("Failed to connect. Please try again.");
    }
  };

  const handleWebSocketMessage = (data: any) => {
    console.log("WebSocket message received:", data);
    
    if (data.type === "ai_response_chunk") {
      // Handle streaming text chunks
      const { messageId, chunk, isComplete } = data;
      
      if (chunk) {
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                text: msg.text + chunk,
                isLoading: false,
                isStreaming: !isComplete
              };
            }
            return msg;
          });
        });
      }

      if (isComplete) {
        setStreamingMessageId(null);
        setIsSending(false);
      }
    } else if (data.type === "ai_response_complete") {
      // Handle complete response
      const { messageId, fullResponse } = data;
      
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              text: fullResponse,
              isLoading: false,
              isStreaming: false,
              isBrainstorm: true
            };
          }
          return msg;
        });
      });
      
      // Update assistant info
      setAssistantInfo(prevInfo => ({
        ...prevInfo,
        instructions: fullResponse
      }));
      
      setStreamingMessageId(null);
      setIsSending(false);
    } else if (data.type === "stream") {
      // Handle streaming chunks from backend - direct update approach
      console.log("Stream update - data:", data);
      
      // Directly update the loading message with streaming text
      setMessages(prevMessages => {
        const loadingMessageIndex = prevMessages.findIndex(msg => !msg.from_me && (msg.isLoading || msg.isStreaming || msg.text === ''));
        
        if (loadingMessageIndex !== -1) {
          const updated = [...prevMessages];
          updated[loadingMessageIndex] = {
            ...updated[loadingMessageIndex],
            text: data.fullContent || data.content,
            isLoading: false,
            isStreaming: !data.isComplete
          };
          return updated;
        }
        
        // Fallback: create new message if loading message not found
        const newAiMessage = {
          id: Date.now().toString(),
          from_me: false,
          type: 'text',
          text: data.fullContent || data.content,
          createdAt: new Date().toISOString(),
          isLoading: false,
          isStreaming: !data.isComplete
        };
        return [newAiMessage, ...prevMessages];
      });
      
      if (data.isComplete) {
        console.log("Stream complete, clearing streamingMessageId");
        setStreamingMessageId(null);
        setIsSending(false);
        setThinkingState(null);
      }
    } else if (data.type === "received") {
      // Handle instant message received feedback (0ms)
      console.log("Message received instantly:", data);
      setThinkingState({
        message: data.message || "📨 Message received!",
        status: data.status || "received",
        animation: data.animation || "quickFlash",
        color: data.color || "#22c55e",
        icon: data.icon || "📨",
        progress: data.progress || 0
      });
    } else if (data.type === "preparing") {
      // Handle preparing response feedback (~50ms)
      console.log("Preparing response:", data);
      setThinkingState({
        message: data.message || "⚡ Preparing AI response...",
        status: data.status || "preparing",
        animation: data.animation || "ripple",
        color: data.color || "#f97316",
        icon: data.icon || "⚡",
        progress: data.progress || 3
      });
    } else if (data.type === "thinking") {
      // Handle thinking state with enhanced visuals
      console.log("Thinking state received:", data);
      setThinkingState({
        message: data.message,
        status: data.status,
        animation: data.animation,
        color: data.color,
        icon: data.icon,
        progress: data.progress
      });
    } else if (data.type === "status") {
      // Handle status updates with animations
      console.log("Status update received:", data);
      setThinkingState({
        message: data.message,
        status: data.status,
        animation: data.animation,
        color: data.color,
        icon: data.icon,
        progress: data.progress
      });
    } else if (data.type === "complete") {
      // Handle stream completion
      const messageId = streamingMessageId;
      if (messageId) {
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                text: data.fullResponse,
                isLoading: false,
                isStreaming: false,
                isBrainstorm: true
              };
            }
            return msg;
          });
        });
        
        setStreamingMessageId(null);
        setIsSending(false);
      }
    } else if (data.type === "error") {
      setError(data.message || "An error occurred");
      setIsSending(false);
      setStreamingMessageId(null);
      
      // Remove loading message and show error
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          from_me: false,
          type: 'text',
          text: `❌ **Error**: ${data.message || "Something went wrong. Please try again."}`,
          createdAt: new Date().toISOString(),
        };
        return [errorMessage, ...filteredMessages];
      });
    }
  };

  const saveCurrentPrompt = async (messageText: string) => {
    if (!companyId || !messageText.trim()) {
      toast.error("Please provide instructions to save");
      return;
    }

    try {
      const timestamp = new Date().toLocaleString();

      const response = await axios.post(
        `${baseUrl}/api/instruction-templates`,
        {
          companyId,
          name: timestamp,
          instructions: messageText,
        }
      );

      if (response.data.success) {
        toast.success("Template saved successfully");
      } else {
        toast.error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const sendMessageToAssistant = async (messageText: string) => {
    if (isSending) return;
    
    // Check if WebSocket is connected
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError("Not connected. Please wait a moment and try again.");
      return;
    }
    
    setIsSending(true);
    setError(null);
    
    const messageId = Date.now().toString();
    const userMessageId = (Date.now() + 1).toString(); // Ensure unique IDs
    
    const newMessage: ChatMessage = {
      id: userMessageId,
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
  
    const loadingMessage: ChatMessage = {
      id: messageId,
      from_me: false,
      type: 'text',
      text: '',
      createdAt: new Date().toISOString(),
      isLoading: true,
      isStreaming: false,
    };
  
    setMessages(prevMessages => [loadingMessage, newMessage, ...prevMessages]);
    setStreamingMessageId(messageId);
    setThinkingState(null);
    console.log("Set streamingMessageId to:", messageId);
  
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setError("User not authenticated");
        setIsSending(false);
        return;
      }

      // Send message via WebSocket for streaming response
      const wsMessage = {
        type: 'ai-message',
        messageId: messageId,
        message: messageText,
        email: userEmail,
        companyId: companyId
      };

      ws.current.send(JSON.stringify(wsMessage));
      
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to send message. Please try again.");
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        from_me: false,
        type: 'text',
        text: `❌ **AI Creation Paused**

I encountered an error while creating your AI assistant. Here's what you can try:

🔄 **Quick Fixes:**
• Check your internet connection
• Try rephrasing your AI requirements
• Refresh the page if the problem persists

**💬 Try creating your AI with:**
"I want a customer service AI that can answer product questions and handle complaints professionally"

Let me know if you need help creating your AI assistant!`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
        return [errorMessage, ...filteredMessages];
      });
      
      setIsSending(false);
      setStreamingMessageId(null);
    }
  };

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      if (target.value.trim()) {
        sendMessageToAssistant(target.value.trim());
        target.value = '';
        target.style.height = 'auto';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
  };

  if (loading && !companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-4">
        <div className="text-center">
          <LoadingIcon icon="spinning-circles" className="w-2 h-2 mx-auto" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-purple-100/20 dark:from-blue-900/10 dark:via-transparent dark:to-purple-900/10"></div>
      <div className="absolute inset-0 bg-grid-slate-100/25 dark:bg-grid-slate-700/25 [mask-image:linear-gradient(0deg,#0000,black)]"></div>
      
      {/* Custom animations styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes slide-in {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes quick-flash {
          0% { opacity: 0; transform: scale(0.8); background-color: currentColor; }
          50% { opacity: 1; transform: scale(1.2); background-color: #22c55e; box-shadow: 0 0 20px #22c55e; }
          100% { opacity: 1; transform: scale(1); background-color: currentColor; }
        }
        
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes color-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        
        @keyframes glass-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.1), 0 0 40px rgba(139, 92, 246, 0.05); }
          50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.2), 0 0 60px rgba(139, 92, 246, 0.1); }
        }
        
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-quick-flash {
          animation: quick-flash 0.6s ease-out;
        }
        
        .animate-ripple {
          animation: ripple 0.8s ease-out infinite;
        }
        
        .animate-color-pulse {
          animation: color-pulse 1.5s ease-in-out infinite;
        }
        
        .animate-glass-glow {
          animation: glass-glow 3s ease-in-out infinite;
        }
        
        /* Glassmorphic styles */
        .glass-morphic {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }
        
        .glass-morphic-dark {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
        
        /* Grid pattern */
        .bg-grid-slate-100 {
          background-image: url("data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='%23f1f5f9' fill-opacity='0.4' fill-rule='evenodd'%3e%3cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3e%3c/g%3e%3c/svg%3e");
        }
        
        .bg-grid-slate-700 {
          background-image: url("data:image/svg+xml,%3csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='%23374151' fill-opacity='0.4' fill-rule='evenodd'%3e%3cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3e%3c/g%3e%3c/svg%3e");
        }
        
        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
        
        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.3) rgba(148, 163, 184, 0.1);
        }
      `}} />
      
      <div className="flex flex-col items-center w-full h-full max-w-6xl mx-auto px-4 py-6 relative z-10">
        
        {/* Main Title and Logo */}
        <div className="mb-4 flex-shrink-0 text-center">
          <div className="mb-3 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full opacity-20 blur-lg animate-pulse"></div>
              <img
                alt="Juta Software Logo"
                className="relative w-12 h-auto object-contain drop-shadow-lg"
                src={logoUrl}
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            AI Assistant Builder
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Create & customize your AI prompts with intelligence
          </p>
        </div>

        {/* Main Content Card */}
        <div className={`${
          darkMode 
            ? 'glass-morphic-dark' 
            : 'glass-morphic'
        } rounded-2xl w-full h-full flex flex-col p-4 sm:p-6 animate-glass-glow relative overflow-hidden`}>
          
          {/* Connection Status */}
          <div className="mb-4 flex justify-between items-center flex-shrink-0">
            <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium backdrop-blur-md ${
              wsConnected 
                ? 'bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50'
                : 'bg-amber-100/60 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/50'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full mr-2 ${
                wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
              }`}></div>
              {wsConnected ? '✨ Ready for AI magic' : '⚡ Connecting...'}
            </div>
    
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100/60 dark:bg-red-900/40 backdrop-blur-md border border-red-200/50 dark:border-red-700/50 rounded-xl flex-shrink-0 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-red-800 dark:text-red-200 font-medium text-sm">Connection Error</h4>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chat Interface */}
          {messages.length === 0 ? (
            <div className="text-center py-8 flex-1 flex flex-col justify-center animate-fade-in">
              <div className="mb-8">
               
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                  Hey, {localStorage.getItem("userEmail")?.split('@')[0] || 'there'}! 👋
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-2 text-lg font-medium">
                  Let's create your perfect AI assistant together
                </p>
                <p className="text-slate-500 dark:text-slate-500 text-sm">
                  Describe what you want your AI to do, and I'll help you build it
                </p>
              </div>

              {/* Input Field */}
              <div className="max-w-3xl mx-auto w-full">
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-left">
                    Describe what you want your AI to do
                  </label>
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                    <textarea
                      ref={inputRef}
                      className="relative w-full px-6 py-4 pr-16 text-base text-slate-900 dark:text-white bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none transition-all duration-300 placeholder-slate-500 dark:placeholder-slate-400"
                      placeholder="e.g., I want a customer service AI that can answer product questions, handle complaints professionally, and escalate complex issues to human agents..."
                      rows={4}
                      onKeyDown={handleSendMessage}
                      onChange={handleInputChange}
                    />
                    
                    <button
                      onClick={() => {
                        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                        if (textarea && textarea.value.trim()) {
                          sendMessageToAssistant(textarea.value.trim());
                          textarea.value = '';
                          textarea.style.height = 'auto';
                        }
                      }}
                      disabled={isSending}
                      className="absolute right-4 bottom-4 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
                    >
                      {isSending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Press <kbd className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded text-xs">Enter</kbd> to send, <kbd className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded text-xs">Shift+Enter</kbd> for new line
                    </p>
                    <div className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Secure & Private
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Chat Messages - Scrollable Area */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar min-h-[200px]">
                {messages.slice().reverse().map((message) => (
                  <div key={message.id} className={`flex ${message.from_me ? 'justify-end' : 'justify-start'} animate-slide-in`}>
                    <div className={`max-w-3xl ${message.from_me ? 'ml-auto' : 'mr-auto'} relative`}>
                      {/* Avatar for AI messages */}
                      {!message.from_me && (
                        <div className="absolute -left-12 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-md border border-blue-200/30 dark:border-blue-700/30 flex items-center justify-center text-sm">
                          🤖
                        </div>
                      )}
                      
                      <div className={`px-5 py-3 rounded-2xl break-words shadow-sm ${
                        message.from_me 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-12'
                          : 'bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-600/50 text-slate-900 dark:text-white'
                      }`}>
                        {message.isLoading ? (
                          <div className="flex flex-col space-y-4">
                            {/* Main thinking indicator with dynamic content */}
                            <div className="flex items-center space-x-4">
                              {/* Dynamic animated icon */}
                              <div 
                                className={`text-2xl transition-all duration-300 ${
                                  thinkingState?.animation === 'quickFlash' ? 'animate-quick-flash' :
                                  thinkingState?.animation === 'ripple' ? 'animate-ripple' :
                                  thinkingState?.animation === 'spin' ? 'animate-spin' :
                                  thinkingState?.animation === 'bounce' ? 'animate-bounce' :
                                  thinkingState?.animation === 'pulse' ? 'animate-pulse animate-color-pulse' :
                                  thinkingState?.animation === 'glow' ? 'animate-pulse' :
                                  thinkingState?.animation === 'fadeIn' ? 'animate-fade-in' :
                                  'animate-pulse'
                                }`}
                                style={{ 
                                  filter: thinkingState?.animation === 'glow' ? 'drop-shadow(0 0 15px currentColor)' : 'none',
                                  color: thinkingState?.color || '#6366f1'
                                }}
                              >
                                {thinkingState?.icon || '🤖'}
                              </div>
                              
                              {/* Dynamic message with color */}
                              <div className="flex flex-col">
                                <span 
                                  className={`text-base font-semibold transition-colors duration-500 ${
                                    thinkingState?.animation === 'slideIn' ? 'animate-slide-in' : ''
                                  }`}
                                  style={{ color: thinkingState?.color || '#6366f1' }}
                                >
                                  {thinkingState?.message || '🤖 AI is thinking...'}
                                </span>
                                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                  {thinkingState?.status === 'received' ? '✅ Your message was received instantly' :
                                   thinkingState?.status === 'preparing' ? '⚡ Setting up AI response systems' :
                                   thinkingState?.status === 'generating' ? '🚀 Starting AI process...' :
                                   thinkingState?.status === 'processing' ? '🧠 Processing your request...' :
                                   'Creating your personalized AI assistant'}
                                </span>
                              </div>
                            </div>

                            {/* Enhanced progress bar with smooth transitions */}
                            <div className="space-y-3">
                              <div className="w-full bg-slate-200/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-full h-3 overflow-hidden shadow-inner">
                                <div 
                                  className="h-3 rounded-full transition-all duration-1000 ease-out relative"
                                  style={{ 
                                    width: `${Math.max(thinkingState?.progress || 0, 0)}%`,
                                    backgroundColor: thinkingState?.color || '#6366f1',
                                    backgroundImage: `linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.4) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.4) 75%)`,
                                    backgroundSize: '30px 30px',
                                    animation: 'progress-shimmer 2s linear infinite',
                                    boxShadow: `0 0 15px ${thinkingState?.color || '#6366f1'}44`
                                  }}
                                >
                                  {/* Progress bar glow effect */}
                                  <div 
                                    className="absolute inset-0 rounded-full opacity-60"
                                    style={{
                                      background: `linear-gradient(90deg, transparent, ${thinkingState?.color || '#6366f1'}, transparent)`,
                                      animation: 'progress-shimmer 3s ease-in-out infinite'
                                    }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div className="flex justify-between items-center text-xs">
                                <span 
                                  className="font-medium transition-colors duration-500"
                                  style={{ color: thinkingState?.color || '#6366f1' }}
                                >
                                  {thinkingState?.status === 'received' ? '📨 Received' :
                                   thinkingState?.status === 'preparing' ? '⚡ Preparing' :
                                   thinkingState?.status === 'generating' ? '🚀 Starting' :
                                   thinkingState?.status === 'processing' ? '🧠 Processing' :
                                   'Progress'}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="text-sm font-bold transition-all duration-500"
                                    style={{ color: thinkingState?.color || '#6366f1' }}
                                  >
                                    {Math.max(thinkingState?.progress || 0, 0)}%
                                  </div>
                                  {(thinkingState?.progress || 0) > 0 && (thinkingState?.progress || 0) < 95 && (
                                    <div 
                                      className="w-2 h-2 rounded-full animate-ping"
                                      style={{ backgroundColor: thinkingState?.color || '#6366f1' }}
                                    ></div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Progress milestones */}
                              {(thinkingState?.progress || 0) > 0 && (
                                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                                  <span className={`transition-colors duration-300 ${(thinkingState?.progress || 0) >= 0 ? 'text-green-500' : ''}`}>Start</span>
                                  <span className={`transition-colors duration-300 ${(thinkingState?.progress || 0) >= 25 ? 'text-blue-500' : ''}`}>25%</span>
                                  <span className={`transition-colors duration-300 ${(thinkingState?.progress || 0) >= 50 ? 'text-purple-500' : ''}`}>50%</span>
                                  <span className={`transition-colors duration-300 ${(thinkingState?.progress || 0) >= 75 ? 'text-orange-500' : ''}`}>75%</span>
                                  <span className={`transition-colors duration-300 ${(thinkingState?.progress || 0) >= 90 ? 'text-emerald-500' : ''}`}>Ready</span>
                                </div>
                              )}
                            </div>

                            {/* Floating dots animation */}
                            <div className="flex justify-center space-x-1">
                              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ 
                                backgroundColor: thinkingState?.color || '#6366f1', 
                                animationDelay: '0ms' 
                              }}></div>
                              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ 
                                backgroundColor: thinkingState?.color || '#6366f1', 
                                animationDelay: '150ms' 
                              }}></div>
                              <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ 
                                backgroundColor: thinkingState?.color || '#6366f1', 
                                animationDelay: '300ms' 
                              }}></div>
                            </div>
                          </div>
              ) : (
                          <div className="whitespace-pre-wrap text-base leading-relaxed">
                            {message.text}
                            {message.isStreaming && (
                              <span className="inline-block w-0.5 h-5 bg-slate-600 dark:bg-slate-300 ml-1 animate-pulse rounded-full"></span>
                            )}
                          </div>
                        )}
          </div>

                    </div>
                  </div>
                ))}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Save Template Button - Compact mobile-friendly design */}
              {messages.some(msg => !msg.from_me && !msg.isLoading && msg.text.trim()) && (
                <div className="flex-shrink-0 mb-3 animate-fade-in">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 backdrop-blur-md border border-emerald-200/50 dark:border-emerald-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-white"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                            Save Your AI
                          </h3>
                          <p className="text-xs text-emerald-600 dark:text-emerald-300 truncate">
                            Save as template
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const latestAiMessage = messages.find(msg => !msg.from_me && !msg.isLoading && msg.text.trim());
                          if (latestAiMessage) {
                            saveCurrentPrompt(latestAiMessage.text);
                          }
                        }}
                        className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex items-center gap-1.5 backdrop-blur-sm flex-shrink-0"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                        </svg>
                        <span className="hidden sm:inline">Save</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area for ongoing chat - Fixed at bottom */}
              <div className="flex-shrink-0 pt-4 border-t border-slate-200/60 dark:border-slate-600/60 backdrop-blur-sm">
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 text-left">
                    Continue the conversation
                  </label>
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-15 group-hover:opacity-25 transition-opacity"></div>
                    <textarea
                      ref={inputRef}
                      className="relative w-full px-5 py-3 pr-14 text-base text-slate-900 dark:text-white bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none transition-all duration-300 placeholder-slate-500 dark:placeholder-slate-400"
                      placeholder="Ask follow-up questions or refine your AI assistant..."
                      rows={2}
                      onKeyDown={handleSendMessage}
                      onChange={handleInputChange}
                      style={{ minHeight: '50px', maxHeight: '150px' }}
                    />

                    <button
                      onClick={() => {
                        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                        if (textarea && textarea.value.trim()) {
                          sendMessageToAssistant(textarea.value.trim());
                          textarea.value = '';
                          textarea.style.height = 'auto';
                        }
                      }}
                      disabled={isSending}
                      className="absolute right-3 bottom-3 p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
                    >
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Navigation Button - Less intrusive */}
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => navigate('/follow-ups-onboarding')}
              className="px-3 py-2 bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 backdrop-blur-md border border-blue-200/30 dark:border-blue-700/30 rounded-lg text-center text-white font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center gap-1.5 text-sm"
            >
              <span className="hidden sm:inline">Continue to Follow-ups</span>
              <span className="sm:hidden">Next</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <ToastContainer />
    </div>
  );
};

export default Main;
