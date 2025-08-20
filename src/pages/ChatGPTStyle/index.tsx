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

const baseUrl = "https://juta-dev.ngrok.dev";

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
  isLoading?: boolean;
  isBrainstorm?: boolean;
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
      fetchCompanyId(userEmail);
    }
    
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (companyId) {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    scrollToBottom();
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
    
    setIsSending(true);
    setError(null);
    
    const newMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
  
    const loadingMessage: ChatMessage = {
      from_me: false,
      type: 'text',
      text: '',
      createdAt: new Date().toISOString(),
      isLoading: true,
    };
  
    setMessages(prevMessages => [loadingMessage, newMessage, ...prevMessages]);
  
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setError("User not authenticated");
        return;
      }
  
      const res = await axios({
        method: 'post',
        url: `${baseUrl}/api/ai-assistant-brainstorm/`,
        data: {
          message: messageText,
          email: userEmail
        }
      });
      
      if (!res.data.success) {
        throw new Error(res.data.details || 'Failed to create AI assistant');
      }
  
      let responseText = 'No AI configuration provided';
      
      if (res.data.data && res.data.data.aiConfiguration) {
        responseText = res.data.data.aiConfiguration;
      } else if (res.data.data && typeof res.data.data === 'string') {
        responseText = res.data.data;
      } else if (res.data.aiConfiguration) {
        responseText = res.data.aiConfiguration;
      }
      
      if (responseText && responseText !== 'No AI configuration provided') {
        responseText = responseText
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t')
          .trim();
      }
      
      // Update assistant info with the response
      setAssistantInfo(prevInfo => ({
        ...prevInfo,
        instructions: responseText
      }));
      
      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: responseText,
        createdAt: new Date().toISOString(),
        isBrainstorm: true,
      };
      
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
        return [assistantResponse, ...filteredMessages];
      });
  
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to create your AI assistant. Please try again.");
      
      const errorMessage: ChatMessage = {
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
    } finally {
      setIsSending(false);
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
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-4 overflow-hidden">
      <div className="flex flex-col items-center w-full h-full max-w-4xl mx-auto px-3 py-4">
        
        {/* Main Title and Logo */}
        <div className="mb-2 flex-shrink-0">
          <div className="mb-1 flex justify-center">
            <img
              alt="Juta Software Logo"
              className="w-10 h-auto object-contain"
              src={logoUrl}
            />
          </div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-0.5">
            AI Assistant Builder
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Create & customize your AI prompts
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-full h-full flex flex-col">
          
          {/* Error Display */}
          {error && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex-shrink-0">
              <p className="text-red-700 dark:text-red-200 text-sm">
                {error}
              </p>
            </div>
          )}

          {/* Chat Interface */}
          {messages.length === 0 ? (
            <div className="text-center py-6 flex-1 flex flex-col justify-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                Hey, {localStorage.getItem("userEmail")?.split('@')[0] || 'there'}! 👋
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-base">
                Let's create your perfect AI assistant together
              </p>

          {/* Input Field */}
              <div className="max-w-2xl mx-auto w-full">
                <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                    Describe what you want your AI to do
            </label>
            <div className="relative">
              <textarea
                      ref={inputRef}
                      className="w-full px-4 py-3 pr-16 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                      placeholder="e.g., I want a customer service AI that can answer product questions and handle complaints professionally..."
                rows={3}
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
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-left">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Chat Messages - Scrollable Area */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                {messages.slice().reverse().map((message, index) => (
                  <div key={index} className={`flex ${message.from_me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl ${message.from_me ? 'ml-auto' : 'mr-auto'}`}>
                      <div className={`px-3 py-2 rounded-lg break-words ${
                        message.from_me 
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}>
                        {message.isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
                            <span className="text-sm">AI is thinking...</span>
                </div>
              ) : (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.text}
                          </div>
                        )}
          </div>

                      {/* Save Button for AI Responses */}
                      {!message.from_me && !message.isLoading && message.text.trim() && (
                        <div className="mt-3 ml-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            💡 Keep chatting to refine your AI assistant further!
                          </div>
              <button
                            onClick={() => saveCurrentPrompt(message.text)}
                            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                            </svg>
                            Save to Template
              </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area for ongoing chat - Fixed at bottom */}
              <div className="flex-shrink-0 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                    Continue the conversation
                  </label>
                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      className="w-full px-3 py-2 pr-12 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
                      placeholder="Type your message here..."
                      rows={2}
                      onKeyDown={handleSendMessage}
                      onChange={handleInputChange}
                      style={{ minHeight: '40px', maxHeight: '120px' }}
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
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
              </button>
            </div>
          </div>
        </div>
            </div>
          )}

          {/* Navigation Link - Always visible at bottom */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
            <button
              onClick={() => navigate('/follow-ups-onboarding')}
              className="w-full text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
            >
              Continue to Follow-ups
            </button>
          </div>
        </div>
      </div>
      
      <ToastContainer />
    </div>
  );
};

export default Main;
