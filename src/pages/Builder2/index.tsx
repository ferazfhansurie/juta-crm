import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Tab } from '@headlessui/react'
import { useNavigate } from 'react-router-dom';

const baseUrl = "https://juta-dev.ngrok.dev";

let companyId = "001"; // Adjust the companyId as needed

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
  isLoading?: boolean;
  isLongContent?: boolean;
  sections?: {
    title: string;
    content: string;
  }[];
  isBrainstorm?: boolean;
  suggestions?: string[];
}

interface AssistantInfo {
  name: string;
  description: string;
  instructions: string;
  metadata: {
    files: Array<{id: string, name: string, url: string}>;
  };
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
  deleteThread: () => void;
  threadId: string;
  isApplyingChanges: boolean;
  applyProgress: number;
  onApplyChanges: () => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onSendMessage, assistantName, deleteThread, threadId, isApplyingChanges, applyProgress, onApplyChanges }) => {
  const [newMessage, setNewMessage] = useState('');

  const myMessageClass = "bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white !text-white rounded-tr-lg rounded-tl-lg rounded-br-sm rounded-bl-lg shadow-md border border-blue-400 dark:border-blue-500";
  const otherMessageClass = "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-tr-lg rounded-tl-lg rounded-br-lg rounded-bl-sm shadow-md text-gray-800 dark:text-gray-200";

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
      <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center">
          <div className="w-10 h-10 overflow-hidden rounded-full shadow-lg flex items-center justify-center mr-3 bg-white dark:bg-gray-700">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-bold text-gray-800 dark:text-gray-200 text-lg">Prompt Builder</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">AI-powered prompt optimization</div>
          </div>
        </div>
        <div>
          <button 
            onClick={deleteThread} 
            className={`px-4 py-2 text-white rounded-lg flex items-center space-x-2 transition-all duration-200 ${!threadId ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700'} active:scale-95 shadow-md hover:shadow-lg`}
            disabled={!threadId}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 dark:bg-gray-900">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Welcome to AI Prompt Builder!</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              I'll help you brainstorm improvements to your prompt instructions. Ask me questions and I'll provide suggestions to make your assistant more effective.
            </p>
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Workflow:</strong> 
                <br />1. Ask me to improve your prompt
                <br />2. Review my suggestions
                <br />3. Click "Apply Changes" to implement them
              </p>
            </div>
            <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                🚀 <strong>Try asking:</strong> "Make this prompt more specific" or "Add examples to this instruction"
              </p>
            </div>
          </div>
        )}
        
        {messages.slice().reverse().map((message, index) => (
          <div
            className={`mb-3 ${message.from_me ? 'flex justify-end' : 'flex justify-start'}`}
            key={index}
          >
            <div
              className={`p-3 rounded-lg max-w-[80%] ${message.from_me ? myMessageClass : otherMessageClass}`}
              style={{
                maxWidth: '80%',
                minWidth: '60px',
                color: message.from_me ? 'white' : 'inherit'
              }}
            >
              {message.isLoading ? (
                <div className="flex items-center space-x-3 py-1">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">AI is thinking...</span>
                </div>
              ) : (
                <>
                  {message.type === 'text' && (
                    <div 
                      className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${message.from_me ? 'text-white user-message-text' : ''}`}
                      style={{ color: message.from_me ? 'white' : 'inherit' }}
                    >
                      {/* Format the AI response text nicely */}
                      <div className="max-w-none">
                        {message.text.split('\n').map((line, index) => {
                          // Handle different line types for better formatting
                          if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
                            // Bold headers
                            return (
                              <h4 key={index} className="font-bold text-blue-700 dark:text-blue-300 mt-4 mb-3 text-lg border-b border-blue-200 dark:border-blue-700 pb-1">
                                {line.replace(/\*\*/g, '')}
                              </h4>
                            );
                          } else if (line.trim().match(/^\d+\./)) {
                            // Numbered lists
                            return (
                              <div key={index} className="ml-6 mb-3 flex items-start">
                                <span className="text-blue-600 dark:text-blue-400 font-semibold mr-2 min-w-[20px]">{line.match(/^\d+\./)?.[0]}</span>
                                <span className="text-gray-800 dark:text-white leading-relaxed">{line.replace(/^\d+\.\s*/, '')}</span>
                              </div>
                            );
                          } else if (line.trim().startsWith('- ')) {
                            // Bullet points
                            return (
                              <div key={index} className="ml-6 mb-3 flex items-start">
                                <span className="text-blue-500 dark:text-blue-400 mr-3 mt-1">•</span>
                                <span className="text-gray-800 dark:text-white leading-relaxed">{line.substring(2)}</span>
                              </div>
                            );
                          } else if (line.trim()) {
                            // Regular text
                            return (
                              <p key={index} className="mb-3 text-gray-800 dark:text-white leading-relaxed">
                                {line}
                              </p>
                            );
                          } else {
                            // Empty lines for spacing
                            return <div key={index} className="h-3"></div>;
                          }
                        })}
                      </div>
                      
                      {/* Show Apply Changes button for brainstorm messages */}
                      {message.isBrainstorm && message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700">
                          {/* Progress bar for apply changes */}
                          {isApplyingChanges && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400 mb-1">
                                <span>Applying changes...</span>
                                <span>{applyProgress}%</span>
                              </div>
                              <div className="w-full bg-green-200 dark:bg-green-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${applyProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          <button
                            onClick={onApplyChanges}
                            disabled={isApplyingChanges}
                            className={`w-full px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                              isApplyingChanges 
                                ? 'bg-green-400 dark:bg-green-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                            }`}
                          >
                            {isApplyingChanges ? (
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Applying Changes...</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Apply Changes</span>
                              </div>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div 
                    className={`message-timestamp text-xs mt-2 opacity-70 ${message.from_me ? 'text-white user-message-timestamp' : 'text-gray-500 dark:text-gray-300'}`}
                    style={{ color: message.from_me ? 'white' : 'inherit' }}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              className="w-full min-h-[40px] max-h-32 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 resize-none transition-all duration-200"
              placeholder="Ask me to brainstorm improvements for your prompt..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Auto-resize the textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={handleSendMessage}
              rows={1}
              style={{ 
                resize: 'none',
                minHeight: '40px',
                maxHeight: '128px',
                overflowY: 'auto'
              }}
            />
          </div>
          <button
            onClick={() => {
              if (newMessage.trim()) {
                onSendMessage(newMessage);
                setNewMessage('');
              }
            }}
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Send</span>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>({
    name: '',
    description: '',
    instructions: '',
    metadata: {
      files: [],
    },
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>('');
  const [isScrolledToBottom, setIsScrolledToBottom] = useState<boolean>(false);
  const updateButtonRef = useRef<HTMLButtonElement>(null);
  const [isFloating, setIsFloating] = useState(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [brainstormSuggestions, setBrainstormSuggestions] = useState<string[]>([]);
  const [currentBrainstormMessage, setCurrentBrainstormMessage] = useState<string>('');

  const navigate = useNavigate();

  const exportPrompt = () => {
    const promptData = {
      name: assistantInfo.name,
      description: assistantInfo.description,
      instructions: assistantInfo.instructions,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(promptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assistantInfo.name || 'prompt'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Prompt exported successfully!');
  };

  const importPrompt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const promptData = JSON.parse(e.target?.result as string);
        setAssistantInfo({
          name: promptData.name || '',
          description: promptData.description || '',
          instructions: promptData.instructions || '',
          metadata: { files: [] }
        });
        setHasChanges(true);
        toast.success('Prompt imported successfully!');
      } catch (error) {
        toast.error('Failed to import prompt. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };
  
  useEffect(() => {
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchNeonConfig(companyId);
    }
  }, [companyId]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Adjust this breakpoint as needed
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth >= 1024); // Adjust this breakpoint as needed
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);

    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  const fetchCompanyId = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      console.error("No user email found");
      setError("No user email found");
      return;
    }
  
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
        console.error("Failed to fetch user config from Neon");
        setError("Failed to fetch user config from Neon");
        return;
      }

      const userData = await userResponse.json();
      console.log('User data received:', userData);
      
      const companyId = userData.company_id;
      const role = userData.role;
      const threadid = userData.threadid || '';
      
      console.log('Company ID:', companyId);
      console.log('User role:', role);
      console.log('Thread ID:', threadid);
      
      setCompanyId(companyId);
      setThreadId(threadid);
      setUserRole(role);
    } catch (error) {
      console.error("Error fetching company ID:", error);
      setError("Failed to fetch company ID");
    }
  };

  const fetchNeonConfig = async (companyId: string) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setError("No user email found");
        return;
      }

      const response = await axios.get(`https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(userEmail)}`);

      if (response.status === 200) {
        const { companyData } = response.data;
        console.log('Company data received:', companyData);
        console.log('Assistants IDs field:', companyData.assistants_ids);
        console.log('Type of assistants_ids:', typeof companyData.assistants_ids);
        
        // Parse assistant IDs (handle both string and array)
        let assistantIds: string[] = [];
        if (Array.isArray(companyData.assistants_ids)) {
          assistantIds = companyData.assistants_ids;
          console.log('Assistants IDs as array:', assistantIds);
        } else if (typeof companyData.assistants_ids === 'string') {
          // If stored as a comma-separated string in DB
          assistantIds = companyData.assistants_ids.split(',').map((id: string) => id.trim());
          console.log('Assistants IDs as string (parsed):', assistantIds);
        } else {
          console.log('Assistants IDs is neither array nor string:', companyData.assistants_ids);
        }

        // Check for alternative field names
        if (assistantIds.length === 0) {
          // Try alternative field names
          if (companyData.assistant_id) {
            assistantIds = [companyData.assistant_id];
            console.log('Found assistant_id field:', assistantIds);
          } else if (companyData.assistantId) {
            assistantIds = [companyData.assistantId];
            console.log('Found assistantId field:', assistantIds);
          } else if (companyData.assistants_id) {
            assistantIds = [companyData.assistants_id];
            console.log('Found assistants_id field:', assistantIds);
          }
        }

        // Get the first assistant ID (or you can add assistant selection logic)
        if (assistantIds.length > 0) {
          setAssistantId(assistantIds[0]);
          console.log('Setting assistant ID to:', assistantIds[0]);
          
          // Clear any previous errors since we found the assistant
          setError(null);
        } else {
          console.error("No assistant IDs found in company data");
          console.log('Available company data fields:', Object.keys(companyData));
          setError("No assistants configured for this company. Please contact your administrator.");
          return;
        }

        // Fetch API key from company config
        const response2 = await axios.get(`https://juta-dev.ngrok.dev/api/company-config/${companyId}`);
        const { openaiApiKey } = response2.data;
        setApiKey(openaiApiKey);
        console.log('API key fetched successfully');
      }
    } catch (error) {
      console.error("Error fetching company config:", error);
      setError("Failed to fetch company configuration");
    }
  };

  const fetchAssistantInfo = async (assistantId: string, apiKey: string) => {
    console.log('fetching assistant info for ID:', assistantId);
    setLoading(true);
    try {
      const response = await axios.get(`https://api.openai.com/v1/assistants/${assistantId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const { name, description = "", instructions = "" } = response.data;
      setAssistantInfo({ name, description, instructions, metadata: { files: [] } });
      
      // Clear any errors since we successfully fetched the assistant info
      setError(null);
      console.log('Assistant info fetched successfully:', name);
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    } finally {
      setLoading(false);
    }
  };

  const updateAssistantInfo = async () => {
    if (userRole === "3") {
      setError("You do not have permission to edit the assistant.");
      return;
    }

    if (!assistantInfo || !assistantId || !apiKey) {
      console.error("Assistant info, assistant ID, or API key is missing.");
      setError("Assistant info, assistant ID, or API key is missing.");
      return;
    }

    setIsUpdating(true);
    setError(null);

    const payload = {
      name: assistantInfo.name || '',
      description: assistantInfo.description || '',
      instructions: assistantInfo.instructions
    };

    try {
      const response = await axios.post(`https://api.openai.com/v1/assistants/${assistantId}`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      toast.success('Assistant updated successfully! 🎉');
      setHasChanges(false);
      
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        navigate('/inbox');
      }, 1500);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating assistant information:', error.response?.data);
        setError(`Failed to update assistant: ${error.response?.data?.error?.message || 'Unknown error'}`);
      } else {
        console.error('Error updating assistant information:', error);
        setError('Failed to update assistant. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };



  const sendMessageToAssistant = async (messageText: string) => {
    if (isSending) return; // Prevent multiple simultaneous requests
    
    setIsSending(true);
    setError(null);
    
    const newMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
  
    // Add loading message with better animation
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
        console.error("User not authenticated");
        setError("User not authenticated");
        return;
      }
  
      // Use the brainstorming endpoint for suggestions
      const apiUrl = 'https://juta-dev.ngrok.dev';
  
      const res = await axios({
        method: 'post',
        url: `${apiUrl}/api/prompt-brainstorm/`,
        params: {
          message: messageText,
          email: userEmail
        },
        data: {
          currentPrompt: assistantInfo.instructions || ''
        }
      });
      
      if (!res.data.success) {
        throw new Error(res.data.details || 'Failed to process prompt');
      }
  
      // Extract the AI response from the suggestions field
      let responseText = 'No suggestions provided';
      let suggestions: string[] = [];
      
      // Debug logging
      console.log('Full API Response:', res.data);
      
      // The AI response is in the suggestions field
      if (res.data.data && res.data.data.suggestions) {
        responseText = res.data.data.suggestions;
        suggestions = [res.data.data.suggestions]; // Store as a single suggestion for now
      } else if (res.data.suggestions) {
        responseText = res.data.suggestions;
        suggestions = [res.data.suggestions];
      } else if (res.data.data && typeof res.data.data === 'string') {
        // If data is directly a string
        responseText = res.data.data;
      } else if (res.data.data && res.data.data.analysis) {
        // Fallback to analysis field
        responseText = res.data.data.analysis;
      } else if (res.data.data && res.data.data.message) {
        // Fallback to message field
        responseText = res.data.data.message;
      }
      
      // Clean up the response text - remove escape characters and format properly
      if (responseText && responseText !== 'No suggestions provided') {
        // Replace \n with actual line breaks and clean up formatting
        responseText = responseText
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t')
          .trim();
      }
      
      console.log('Extracted response text:', responseText);
      console.log('Extracted suggestions:', suggestions);
      
      // Store suggestions for later use
      setBrainstormSuggestions(suggestions);
      setCurrentBrainstormMessage(messageText);
      
      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: responseText,
        createdAt: new Date().toISOString(),
        isBrainstorm: true,
        suggestions: suggestions
      };
      

  
      // Remove loading message and add the real response
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
        return [assistantResponse, ...filteredMessages];
      });
  
      setThreadId(userEmail);
  
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to process your request. Please try again.");
      // Remove loading message on error
      setMessages(prevMessages => prevMessages.filter(msg => !msg.isLoading));
    } finally {
      setIsSending(false);
    }
  };

  const applyChangesToPrompt = async () => {
    if (isApplyingChanges || !brainstormSuggestions.length) return;
    
    setIsApplyingChanges(true);
    setApplyProgress(0);
    setError(null);
    
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }
  
      // Start with initial progress
      setApplyProgress(1);
      
      // Call the apply changes API
      const apiUrl = 'https://juta-dev.ngrok.dev';
      
      // Smooth progress animation that increments by 1% at a time
      const progressInterval = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 15) {
            clearInterval(progressInterval);
            return 15;
          }
          return prev + 1;
        });
      }, 50); // Update every 50ms for smooth animation
      
      // Update progress to show API call starting
      setApplyProgress(15);
      
      const res = await axios({
        method: 'post',
        url: `${apiUrl}/api/prompt-apply-changes/`,
        params: {
          email: userEmail
        },
        data: {
          currentPrompt: assistantInfo.instructions || '',
          changesToApply: currentBrainstormMessage,
          brainstormContext: brainstormSuggestions
        }
      });
      
      // Smooth progress animation to 60%
      const progressInterval2 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 60) {
            clearInterval(progressInterval2);
            return 60;
          }
          return prev + 1;
        });
      }, 30); // Update every 30ms for smooth animation
      
      // Update progress to show API call completed
      setApplyProgress(60);
      
      if (!res.data.success) {
        throw new Error(res.data.details || 'Failed to apply changes');
      }
  
      const { updatedPrompt, analysis } = res.data.data;
      
      // Smooth progress animation to 80%
      const progressInterval3 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval3);
            return 80;
          }
          return prev + 1;
        });
      }, 20); // Update every 20ms for smooth animation
      
      // Update progress to show processing
      setApplyProgress(80);
      
      // Update assistant instructions with the new prompt
      setAssistantInfo(prevInfo => ({
        ...prevInfo,
        instructions: updatedPrompt
      }));
      
      // Mark that there are unsaved changes
      setHasChanges(true);
      
      // Smooth progress animation to 100%
      const progressInterval4 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval4);
            return 100;
          }
          return prev + 1;
        });
      }, 15); // Update every 15ms for smooth animation
      
      // Complete progress
      setApplyProgress(100);
      
      // Add success message
      const successMessage: ChatMessage = {
        from_me: false,
        type: 'text',
        text: `✅ Changes applied successfully!\n\n${analysis || 'Your prompt has been updated with the requested changes.'}`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [successMessage, ...prevMessages]);
      
      // Clear suggestions after successful application
      setBrainstormSuggestions([]);
      setCurrentBrainstormMessage('');
      
      toast.success('Changes applied successfully! 🎉');
      
    } catch (error) {
      console.error('Error applying changes:', error);
      setError("Failed to apply changes. Please try again.");
      setApplyProgress(0);
    } finally {
      setIsApplyingChanges(false);
      // Reset progress after a delay
      setTimeout(() => setApplyProgress(0), 1000);
    }
  };

// ... existing code ...

  useEffect(() => {
    if (assistantId && apiKey) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  }, [assistantId, apiKey]);

  // Reset textarea heights when instructions change
  useEffect(() => {
    const instructionsTextarea = document.getElementById('instructions') as HTMLTextAreaElement;
    if (instructionsTextarea) {
      instructionsTextarea.style.height = 'auto';
      instructionsTextarea.style.height = Math.min(instructionsTextarea.scrollHeight, window.innerHeight - 300) + 'px';
    }
  }, [assistantInfo.instructions]);

  const deleteThread = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      console.error("No user email found");
      setError("No user email found");
      return;
    }
  
    try {
      // Clear thread ID in state
      setThreadId('');
      
      // Clear the messages state
      setMessages([]);
      
      toast.success('Thread cleared successfully');
    } catch (error) {
      console.error("Error clearing thread:", error);
      setError("Failed to clear thread");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setError(null);
    const { name, value } = e.target;
    setAssistantInfo({ ...assistantInfo, [name]: value });
    setHasChanges(true);
  };
  
  const handleFocus = () => {
    setError(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight;
      setIsFloating(!scrolledToBottom);
    };
  
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize on mount
  
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);








return (
    <div className="flex justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className={`w-full ${isWideScreen ? 'max-w-6xl flex' : 'max-w-lg'}`}>
        {isWideScreen ? (
          <>
            {/* Chat section moved to left side */}
            <div className="w-1/2 pr-2">
              <MessageList 
                messages={messages} 
                onSendMessage={sendMessageToAssistant} 
                assistantName={assistantInfo?.name} 
                deleteThread={deleteThread} 
                threadId={threadId}
                isApplyingChanges={isApplyingChanges}
                applyProgress={applyProgress}
                onApplyChanges={applyChangesToPrompt}
              />
            </div>
            {/* Assistant details moved to right side */}
            <div className="w-1/2 pl-2 pr-2 ml-2 mr-2 mt-4 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-4">
                    <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
                    <div className="mt-2 text-xs p-2 dark:text-gray-200">Fetching Assistant...</div>
                    <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <h1 className="text-2xl font-bold dark:text-gray-200">{assistantInfo.name || "Assistant Name"}</h1>
                  </div>
               
                  <div className="flex-1 flex flex-col">
                    <label className="mb-2 text-lg font-medium dark:text-gray-200 flex items-center space-x-2" htmlFor="instructions">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Assistant Instructions</span>
                    </label>
                    <div className="relative flex-1">
                      <textarea
                        id="instructions"
                        name="instructions"
                        className="w-full h-full p-4 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                        placeholder="Tell your assistant what to do. Be specific about its role, tone, and capabilities..."
                        value={assistantInfo.instructions}
                        onChange={(e) => {
                          handleInputChange(e);
                          // Auto-resize the textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, window.innerHeight - 300) + 'px';
                        }}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                        style={{ 
                          minHeight: 'calc(100vh - 300px)',
                          maxHeight: 'calc(100vh - 200px)',
                          overflowY: 'auto'
                        }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      💡 Use the chat below to ask AI to improve these instructions
                    </div>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      {hasChanges && (
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-3">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-xs text-yellow-800 dark:text-yellow-200">
                              Unsaved changes
                            </span>
                          </div>
                        </div>
                      )}
                      

                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={exportPrompt}
                        className="px-3 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export</span>
                      </button>
                      
                      <label className="px-3 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 text-sm cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Import</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={importPrompt}
                          className="hidden"
                        />
                      </label>
                      
                      <button 
                        ref={updateButtonRef}
                        onClick={updateAssistantInfo} 
                        disabled={userRole === "3" || isUpdating}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-sm"
                        onFocus={handleFocus}
                      >
                        {isUpdating ? (
                          <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {error && <div className="mt-4 text-red-500">{error}</div>}
                </>
              )}
            </div>
          </>
        ) : (
          <Tab.Group as="div" className="flex flex-col w-full h-full">
            <Tab.List className="flex bg-gray-100 dark:bg-gray-900 p-2 sticky top-0 z-10">
              <Tab
                className={({ selected }) =>
                  `w-1/2 py-2 text-sm font-medium text-center rounded-lg ${
                    selected
                      ? 'bg-white text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  } transition-colors duration-200`
                }
              >
                Assistant Config
              </Tab>
              <Tab
                className={({ selected }) =>
                  `w-1/2 py-2 text-sm font-medium text-center rounded-lg ${
                    selected
                      ? 'bg-white text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  } transition-colors duration-200`
                }
              >
                Chat
              </Tab>
            </Tab.List>
            <Tab.Panels className="flex-1 overflow-hidden">
              <Tab.Panel className="h-full overflow-auto p-4 dark:bg-gray-900">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-15">
                      <img alt="Logo" className="w-24 h-24 p-15" src={logoUrl} />
                      <div className="mt-2 text-xs p-15 dark:text-gray-200">Fetching Assistant...</div>
                      <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="mb-2 text-lg font-medium capitalize dark:text-gray-200" htmlFor="name">
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Name your assistant"
                        value={assistantInfo.name}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="description">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        className="w-full p-3 border border-gray-300 rounded-lg h-24 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a short description of what this assistant does"
                        value={assistantInfo.description}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="instructions">
                        Instructions
                      </label>
                      <div className="relative flex-1">
                        <textarea
                          id="instructions"
                          name="instructions"
                          className="w-full h-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                          placeholder="Tell your assistant what to do. Be specific about its role, tone, and capabilities..."
                          value={assistantInfo.instructions}
                          onChange={(e) => {
                            handleInputChange(e);
                            // Auto-resize the textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, window.innerHeight - 400) + 'px';
                          }}
                          onFocus={handleFocus}
                          disabled={userRole === "3"}
                          style={{ 
                            minHeight: 'calc(100vh - 400px)',
                            maxHeight: 'calc(100vh - 300px)',
                            overflowY: 'auto'
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {hasChanges && (
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-xs text-yellow-800 dark:text-yellow-200">
                              Unsaved changes
                            </span>
                          </div>
                        </div>
                      )}
                      

                      
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={exportPrompt}
                          className="px-3 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Export</span>
                        </button>
                        
                        <label className="px-3 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 text-sm cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Import</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={importPrompt}
                            className="hidden"
                          />
                        </label>
                        
                        <button 
                          ref={updateButtonRef}
                          onClick={updateAssistantInfo} 
                          disabled={userRole === "3" || isUpdating}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-sm"
                          onFocus={handleFocus}
                        >
                          {isUpdating ? (
                            <>
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {error && <div className="mt-4 text-red-500">{error}</div>}
                  </>
                )}
              </Tab.Panel>
              <Tab.Panel className="h-full flex flex-col">
                <MessageList 
                  messages={messages} 
                  onSendMessage={sendMessageToAssistant} 
                  assistantName={assistantInfo?.name || 'Juta Assistant'} 
                  deleteThread={deleteThread} 
                  threadId={threadId}
                  isApplyingChanges={isApplyingChanges}
                  applyProgress={applyProgress}
                  onApplyChanges={applyChangesToPrompt}
                />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        )}
        <ToastContainer />
      </div>
    </div>
  );
}

export default Main;