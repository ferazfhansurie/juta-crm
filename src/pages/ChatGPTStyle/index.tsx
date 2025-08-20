import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useNavigate } from 'react-router-dom';
const baseUrl = "https://juta-dev.ngrok.dev";

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
  isLoading?: boolean;
  isBrainstorm?: boolean;
  suggestions?: string[];
  isVisible?: boolean;
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from_me: false,
      type: 'text',
      text: `**🎉 Welcome to AI Assistant Builder!**

I'm here to help you create the perfect AI assistant. Let me guide you through the process step by step!

**🎯 Here's how it works:**

1. **Describe Your AI Idea** - Tell me what you want your AI to do
2. **Get AI Suggestions** - I'll analyze and improve your instructions  
3. **Apply the Changes** - Save the final result to your AI assistant

**💡 Try these examples:**
• "I want a customer service AI that can answer product questions and handle complaints professionally"
• "Create a sales AI that qualifies leads and explains our pricing clearly"
• "I need an onboarding AI that guides new users through our platform step by step"

**🚀 Ready to start?** Just type your message below describing what you want your AI to do!`,
      createdAt: new Date().toISOString(),
      isBrainstorm: false,
      suggestions: [],
      isVisible: false
    },
    {
      from_me: false,
      type: 'text',
      text: `**📋 What Makes a Great AI Prompt?**

When describing your AI, be specific about:

• **Role & Personality** - What should your AI act like?
• **Target Audience** - Who will it be talking to?
• **Main Tasks** - What should it help with?
• **Response Style** - Formal, casual, friendly, professional?
• **Examples** - What kind of responses do you want?

**💬 Example:** Instead of "I want a customer service AI", try:
"I want a friendly, professional customer service AI that can answer product questions, handle complaints empathetically, and escalate complex issues to human agents. It should respond in a warm, helpful tone and always offer solutions before asking for more information."

The more detail you provide, the better your AI will be!`,
      createdAt: new Date().toISOString(),
      isBrainstorm: false,
      suggestions: [],
      isVisible: false
    },
    {
      from_me: false,
      type: 'text',
      text: `**🎯 See What You'll Get**

Here's an example of a complete, professional AI prompt that you'll receive:

**📝 Sample AI Sales Assistant Prompt:**
\`\`\`
### *Role*  
- You are Faeez, Juta Teknologi's AI Sales Assistant.  
- Confident, persistent, and focused on converting every user to a free trial + meeting by using the conversation flow.  
- *Urgency Driver*: Highlight limited slots, time-sensitive offers, and FOMO.  
- You will always use the stages of the conversation flow to close customers.

*Change Language*:  
- Respond in the user's detected language (Mandarin/Malay/English).

*Key Traits*:  
- **Empathy + Persistence**: Acknowledge emotions briefly (1–5 words) and then pivot to solutions.
\`\`\`

**💡 This is just the beginning!** Your prompt will include:
• Complete conversation flows
• Objection handling examples  
• Case studies and testimonials
• Pricing and package details
• Calendar management instructions

**🚀 Ready to create your own?** Start typing below!`,
      createdAt: new Date().toISOString(),
      isBrainstorm: false,
      suggestions: [],
      isVisible: false
    }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [brainstormSuggestions, setBrainstormSuggestions] = useState<string[]>([]);
  const [currentBrainstormMessage, setCurrentBrainstormMessage] = useState<string>('');
  const [showFullExample, setShowFullExample] = useState(false);
  const [hasAppliedChanges, setHasAppliedChanges] = useState(false);
  const [messageTimers, setMessageTimers] = useState<{[key: number]: number}>({});
  const [showCenteredInput, setShowCenteredInput] = useState(true);
  const [userHasStarted, setUserHasStarted] = useState(false);
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

  const navigate = useNavigate();

  // Calculate reading time for a message (words per minute)
  const calculateReadingTime = (text: string): number => {
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 200; // Faster reading speed for better flow
    const readingTimeMinutes = words / wordsPerMinute;
    const readingTimeMs = readingTimeMinutes * 60 * 1000;
    
    // Minimum 4 seconds, maximum 12 seconds per message
    return Math.max(4000, Math.min(12000, readingTimeMs));
  };

  // Animate messages one by one when component mounts
  useEffect(() => {
    if (messages.length > 0) {
      console.log('Starting animation sequence...');
      
      // Start with first message visible
      const timer = setTimeout(() => {
        console.log('Making first message visible');
        setMessages(prevMessages => 
          prevMessages.map((msg, index) => ({
            ...msg,
            isVisible: index === 0
          }))
        );
        
        // Ensure first message is at the top of the viewport
        const chatContainer = document.querySelector('.flex-1.overflow-y-auto');
        if (chatContainer) {
          chatContainer.scrollTop = 0;
        }
      }, 1500); // Reduced to 1.5 seconds

      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Animate subsequent messages with smart timing
  useEffect(() => {
    if (messages.length > 0) {
      const animateMessages = async () => {
        console.log('Starting subsequent message animations...');
        
        // Wait for first message to be visible
        if (messages[0]?.isVisible) {
          for (let i = 1; i < messages.length; i++) {
            const currentMessage = messages[i];
            const readingTime = calculateReadingTime(currentMessage.text);
            
            console.log(`Message ${i} has ${currentMessage.text.split(/\s+/).length} words, will wait ${Math.round(readingTime/1000)}s`);
            
            // Wait based on reading time of the previous message + extra delay
            const extraDelay = 2000; // 2 extra seconds for comfortable reading
            await new Promise(resolve => setTimeout(resolve, readingTime + extraDelay));
            
            console.log(`Making message ${i} visible`);
            setMessages(prevMessages => 
              prevMessages.map((msg, index) => ({
                ...msg,
                isVisible: index <= i
              }))
            );
            
            // Ensure new message is visible without scrolling
            const chatContainer = document.querySelector('.flex-1.overflow-y-auto');
            if (chatContainer) {
              const messageElement = chatContainer.querySelector(`[data-message-index="${i}"]`);
              if (messageElement) {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }
          }
          // Animation complete
          setTimeout(() => {
            console.log('Animation complete');
          }, 3000); // Increased from 1000ms to 3000ms
        }
      };

      // Start animation sequence
      const timer = setTimeout(() => {
        animateMessages();
      }, 3000); // Reduced from 6000ms to 3000ms (3 seconds)

      return () => clearTimeout(timer);
    }
  }, [messages.length, messages[0]?.isVisible]);

  // Countdown timer effect for visible messages
  useEffect(() => {
    if (messages.length > 0) {
      const interval = setInterval(() => {
        setMessageTimers(prev => {
          const newTimers = { ...prev };
          
          messages.forEach((message, index) => {
            if (message.isVisible && !message.from_me) {
              const readingTime = calculateReadingTime(message.text);
              const elapsed = Date.now() - (message.createdAt ? new Date(message.createdAt).getTime() : Date.now());
              const remaining = Math.max(0, readingTime - elapsed);
              
              newTimers[index] = remaining;
            }
          });
          
          return newTimers;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [messages]);

  useEffect(() => {
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchNeonConfig(companyId);
    }
  }, [companyId]);

  useEffect(() => {
    if (assistantId && apiKey) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  }, [assistantId, apiKey]);

  // Auto-scroll only when user sends a new message, not during initial animation
  useEffect(() => {
    if (!loading && messages.some(m => m.from_me)) {
      scrollToBottom();
    }
  }, [messages, isSending]);

  // Auto-focus input when component mounts and animation is complete
  useEffect(() => {
    if (!loading && !isSending) {
      focusInput();
    }
  }, [loading, isSending]);

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

      const response = await axios.get(`${baseUrl}/api/user-company-data?email=${encodeURIComponent(userEmail)}`);

      if (response.status === 200) {
        const { companyData } = response.data;
        console.log('Company data received:', companyData);
        
        let assistantIds: string[] = [];
        if (Array.isArray(companyData.assistants_ids)) {
          assistantIds = companyData.assistants_ids;
        } else if (typeof companyData.assistants_ids === 'string') {
          assistantIds = companyData.assistants_ids.split(',').map((id: string) => id.trim());
        }

        if (assistantIds.length === 0) {
          if (companyData.assistant_id) {
            assistantIds = [companyData.assistant_id];
          } else if (companyData.assistantId) {
            assistantIds = [companyData.assistantId];
          } else if (companyData.assistants_id) {
            assistantIds = [companyData.assistants_id];
          }
        }

        if (assistantIds.length > 0) {
          setAssistantId(assistantIds[0]);
          setError(null);
        } else {
          console.error("No assistant IDs found in company data");
          setError("No assistants configured for this company. Please contact your administrator.");
          return;
        }

        const response2 = await axios.get(`${baseUrl}/api/company-config/${companyId}`);
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
      
      setError(null);
      console.log('Assistant info fetched successfully:', name);
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    } finally {
      setLoading(false);
    }
  };

  const sendMessageToAssistant = async (message: string) => {
    if (!message.trim()) return;
    
    setIsSending(true);
    
    // Add user message
    const userMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: message,
      createdAt: new Date().toISOString(),
      isVisible: true
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // If this is the first user message, show welcome messages
    if (!userHasStarted) {
      setUserHasStarted(true);
      setShowCenteredInput(false);
      
      // Make all welcome messages visible immediately
      setMessages(prev => 
        prev.map(msg => ({
          ...msg,
          isVisible: true
        }))
      );
      
      // Add AI response after a short delay
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          from_me: false,
          type: 'text',
          text: `Thank you for your message! I can see you want to create an AI assistant. Let me help you build the perfect prompt based on what you've described.

Could you please tell me more specifically about:
• What type of AI assistant you want to create?
• What should it do for you?
• Who will be using it?
• What tone or personality should it have?

The more details you provide, the better I can help you create an effective AI prompt!`,
          createdAt: new Date().toISOString(),
          isVisible: true
        };
        
        setMessages(prev => [...prev, aiResponse]);
      }, 1000);
    } else {
      // Regular AI response for subsequent messages
      try {
        // Your existing AI response logic here
        const aiResponse: ChatMessage = {
          from_me: false,
          type: 'text',
          text: `I understand you want to create an AI assistant. Let me help you refine your idea and create a comprehensive prompt.

Based on what you've described, here are some suggestions to make your AI assistant more effective:

1. **Be Specific About the Role**: Instead of "customer service AI", try "friendly customer service AI that specializes in product support and complaint resolution"

2. **Define the Target Audience**: Who will this AI be talking to? Customers, employees, students?

3. **Set Clear Boundaries**: What should the AI NOT do? What topics should it avoid?

4. **Specify Response Style**: Professional, casual, empathetic, technical?

Would you like me to help you expand on any of these areas, or do you have a specific aspect you'd like to focus on?`,
          createdAt: new Date().toISOString(),
          isVisible: true
        };
        
        setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error getting AI response:', error);
      }
    }
    
    setIsSending(false);
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
  
      setApplyProgress(1);
      
      const apiUrl = 'https://juta-dev.ngrok.dev';
      
      const progressInterval = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 15) {
            clearInterval(progressInterval);
            return 15;
          }
          return prev + 1;
        });
      }, 50);
      
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
      
      const progressInterval2 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 60) {
            clearInterval(progressInterval2);
            return 60;
          }
          return prev + 1;
        });
      }, 30);
      
      setApplyProgress(60);
      
      if (!res.data.success) {
        throw new Error(res.data.details || 'Failed to apply changes');
      }
  
      const { updatedPrompt, analysis } = res.data.data;
      
      const progressInterval3 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval3);
            return 80;
          }
          return prev + 1;
        });
      }, 20);
      
      setApplyProgress(80);
      
      setAssistantInfo(prevInfo => ({
        ...prevInfo,
        instructions: updatedPrompt
      }));
      
      const progressInterval4 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval4);
            return 100;
          }
          return prev + 1;
        });
      }, 15);
      
      setApplyProgress(100);
      
      const successMessage: ChatMessage = {
        from_me: false,
        type: 'text',
        text: `✅ Changes applied successfully!\n\n${analysis || 'Your prompt has been updated with the requested changes.'}`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [successMessage, ...prevMessages]);
      setHasAppliedChanges(true);
      
      setBrainstormSuggestions([]);
      setCurrentBrainstormMessage('');
      
      toast.success('Changes applied successfully! 🎉');
      
    } catch (error) {
      console.error('Error applying changes:', error);
      setError("Failed to apply changes. Please try again.");
      setApplyProgress(0);
    } finally {
      setIsApplyingChanges(false);
      setTimeout(() => setApplyProgress(0), 1000);
    }
  };

  const deleteThread = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      console.error("No user email found");
      setError("No user email found");
      return;
    }
  
    try {
      setThreadId('');
      setMessages([]);
      setHasAppliedChanges(false);
      toast.success('Thread cleared successfully');
    } catch (error) {
      console.error("Error clearing thread:", error);
      setError("Failed to clear thread");
    }
  };

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      if (textarea.value.trim()) {
        // Move input to bottom when user starts chatting
        setShowCenteredInput(false);
        sendMessageToAssistant(textarea.value.trim());
        textarea.value = '';
        textarea.style.height = 'auto';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingIcon icon="spinning-circles" className="w-2 h-2 mx-auto" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading ..</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <img
                  alt="Juta Software Logo"
                  className="w-8 h-8 object-contain"
                  src={logoUrl}
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">AI Assistant Builder</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">Create & customize your AI prompts</p>
              </div>
            </div>

            {/* Center - Assistant Info */}
            <div className="hidden md:flex items-center space-x-4">
              {assistantInfo.name && (
                <div className="text-center">
                  <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-600">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-white">{assistantInfo.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Active Assistant</p>
                </div>
              )}
            </div>

            {/* Right side - Actions and User */}
            <div className="flex items-center space-x-3">
              {/* Animation Status and Skip Button */}
              {/* Removed animation status and skip button */}
              
              {/* Follow-ups Navigation */}
              <button
                onClick={() => navigate('/follow-ups-onboarding')}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-all duration-300 border ${
                  hasAppliedChanges 
                    ? 'bg-blue-500 hover:bg-blue-600 border-blue-400 shadow-lg animate-pulse' 
                    : 'bg-blue-600 hover:bg-blue-700 border-blue-500 hover:border-blue-400'
                }`}
                title="Go to Follow-ups"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span>Follow-ups</span>
                  {hasAppliedChanges && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-yellow-800 animate-bounce">
                      Ready!
                    </span>
                  )}
                </div>
              </button>

           


              {/* Help Button */}
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors" title="Help">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* User Avatar */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {localStorage.getItem("userEmail")?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col h-[calc(100vh-4rem)]">

     

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 pt-0">
 
          
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-4xl mx-auto">
              <div className="w-24 h-24 flex items-center justify-center mb-4">
                <img
                  alt="Juta Software Logo"
                  className="w-24 h-24 object-contain"
                  src={logoUrl}
                />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                Welcome to Juta AI Assistant
              </h1>
              <p className="text-sm text-gray-400 mb-4 max-w-2xl">
                Let's create your first AI assistant together! I'll help you design the perfect instructions.
              </p>
              
              {/* Visual Interactive Instructions */}
              <div className="w-full max-w-7xl">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                    
                    {/* Left Side - Visual Steps */}
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        🚀 Welcome to AI Assistant Builder
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Step 1 */}
                        <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                            1
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              ✍️ Describe Your AI Idea
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                              Type a message below explaining what you want your AI to do. Be specific about the role, tasks, and goals.
                            </p>
                            <div className="bg-white dark:bg-gray-700 p-2 rounded border border-blue-200 dark:border-blue-600">
                              <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                                💬 "I want a customer service AI that can answer product questions and handle complaints professionally"
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Step 2 */}
                        <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg border border-green-200 dark:border-green-700">
                          <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                            2
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                              🤖 Get AI Suggestions
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                              I'll analyze your idea and provide improved instructions, examples, and best practices.
                            </p>
                            <div className="bg-white dark:bg-gray-700 p-2 rounded border border-green-200 dark:border-green-600">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                                  AI is analyzing your request...
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Step 3 */}
                        <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg border border-purple-200 dark:border-purple-700">
                          <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                            3
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                              ✅ Apply the Changes
                            </p>
                            <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                              When you're satisfied with the suggestions, click "Apply Changes" to save them to your AI assistant.
                            </p>
                            <div className="bg-white dark:bg-gray-700 p-2 rounded border border-purple-200 dark:border-purple-600">
                              <button className="w-full px-3 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded-md hover:bg-purple-600 transition-colors">
                                Apply Changes
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side - Interactive Examples */}
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        🚀 Try These Examples
                      </h3>
                      
                      <div className="space-y-3">
                        {/* Example 1 */}
                        <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-700 hover:shadow-md transition-all duration-200 cursor-pointer group">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0 w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              💼
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                                Customer Service AI
                              </p>
                              <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                                Perfect for handling customer inquiries and support
                              </p>
                              <div className="bg-white dark:bg-gray-700 p-2 rounded border border-orange-200 dark:border-orange-600">
                                <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                                  "I want a customer service AI that can answer product questions and handle complaints professionally"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Example 2 */}
                        <div className="p-3 bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-lg border border-teal-200 dark:border-teal-700 hover:shadow-md transition-all duration-200 cursor-pointer group">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0 w-4 h-4 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              📈
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-teal-900 dark:text-teal-100 mb-1">
                                Sales AI
                              </p>
                              <p className="text-xs text-teal-700 dark:text-teal-300 mb-2">
                                Great for qualifying leads and explaining pricing
                              </p>
                              <div className="bg-white dark:bg-gray-700 p-2 rounded border border-teal-200 dark:border-teal-600">
                                <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                                  "Create a sales AI that qualifies leads and explains our pricing clearly"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Example 3 */}
                        <div className="p-3 bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-lg border border-pink-200 dark:border-pink-700 hover:shadow-md transition-all duration-200 cursor-pointer group">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0 w-4 h-4 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              🎓
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-pink-900 dark:text-pink-100 mb-1">
                                Onboarding AI
                              </p>
                              <p className="text-xs text-pink-700 dark:text-pink-300 mb-2">
                                Ideal for guiding new users through your platform
                              </p>
                              <div className="bg-white dark:bg-gray-700 p-2 rounded border border-pink-200 dark:border-pink-600">
                                <p className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                                  "I need an onboarding AI that guides new users through our platform step by step"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Start Tip */}
                      <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                          <p className="text-xs font-medium text-indigo-900 dark:text-indigo-100">
                            💡 Pro Tip
                          </p>
                        </div>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300">
                          Be specific about your AI's role, target audience, and the types of responses you want. The more detail you provide, the better your AI will be!
                        </p>
                      </div>
                      
                      {/* See the Result Section */}
                      <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            🎯
                          </div>
                          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                            See the Result
                          </p>
                        </div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-2">
                          This is what your final AI prompt will look like:
                        </p>
                        <div className="bg-white dark:bg-gray-700 p-3 rounded border border-emerald-200 dark:border-emerald-600 max-h-32 overflow-y-auto">
                          <div className="text-xs text-gray-600 dark:text-gray-300 font-mono leading-relaxed">
                            <div className="font-semibold text-emerald-600">### *Role*</div>
                            <div>• You are Faeez, Juta Teknologi's AI Sales Assistant</div>
                            <div>• Confident, persistent, and focused on converting...</div>
                            <div className="text-emerald-500">[Click to see full example →]</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowFullExample(!showFullExample)}
                          className="w-full mt-2 px-2 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-md hover:bg-emerald-600 transition-colors"
                        >
                          {showFullExample ? 'Hide Full Example' : 'Show Full Example'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  data-message-index={index}
                  className={`flex ${message.from_me ? 'justify-end' : 'justify-start'} mb-6 transition-all duration-700 ease-out ${
                    message.isVisible 
                      ? 'opacity-100 translate-y-0 rotate-0 scale-100' 
                      : 'opacity-0 translate-y-8 rotate-1 scale-95'
                  }`}
                  style={{
                    animationDelay: `${index * 300}ms`,
                    transform: message.isVisible ? 'translateY(0) rotate(0deg) scale(1)' : 'translateY(20px) rotate(1deg) scale(0.95)',
                    transitionDelay: `${index * 100}ms`
                  }}
                >
                  <div className={`max-w-3xl ${message.from_me ? 'ml-auto' : 'mr-auto'}`}>
                    <div className={`px-4 py-3 rounded-lg transform transition-all duration-700 ease-out shadow-lg relative ${
                      message.from_me 
                        ? 'bg-gray-700 dark:bg-gray-700 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    } ${
                      message.isVisible 
                        ? 'scale-100 opacity-100 shadow-xl' 
                        : 'scale-90 opacity-0 shadow-none'
                    } ${
                      message.isVisible && !message.from_me 
                        ? 'ring-2 ring-blue-500/20' 
                        : ''
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
                        <div className="whitespace-pre-wrap text-xs leading-relaxed prose prose-xs max-w-none">
                          {message.text.split('\n').map((line, lineIndex) => {
                            // Handle markdown-style formatting
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return (
                                <div 
                                  key={lineIndex} 
                                  className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-2 transition-all duration-500 ease-out overflow-hidden"
                                  style={{
                                    animationDelay: `${lineIndex * 100}ms`,
                                    opacity: message.isVisible ? 1 : 0,
                                    transform: message.isVisible ? 'translateX(0)' : 'translateX(-20px)',
                                    maxHeight: message.isVisible ? '100px' : '0px'
                                  }}
                                >
                                  <span className={`inline-block transition-all duration-700 ease-out ${
                                    message.isVisible ? 'opacity-100' : 'opacity-0'
                                  }`}>
                                    {line.replace(/\*\*/g, '')}
                                  </span>
                                </div>
                              );
                            }
                            if (line.startsWith('•')) {
                              return (
                                <div 
                                  key={lineIndex} 
                                  className="flex items-start space-x-2 mb-2 transition-all duration-500 ease-out overflow-hidden"
                                  style={{
                                    animationDelay: `${lineIndex * 150}ms`,
                                    opacity: message.isVisible ? 1 : 0,
                                    transform: message.isVisible ? 'translateX(0)' : 'translateX(-20px)',
                                    maxHeight: message.isVisible ? '100px' : '0px'
                                  }}
                                >
                                  <span className="text-blue-500 text-lg animate-pulse">•</span>
                                  <span className="text-gray-700 dark:text-gray-300 text-gray-600">{line.substring(1).trim()}</span>
                                </div>
                              );
                            }
                            if (line.startsWith('```')) {
                              return (
                                <div 
                                  key={lineIndex} 
                                  className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 my-2 font-mono text-xs overflow-x-auto transition-all duration-500 ease-out overflow-hidden"
                                  style={{
                                    animationDelay: `${lineIndex * 200}ms`,
                                    opacity: message.isVisible ? 1 : 0,
                                    transform: message.isVisible ? 'translateX(0)' : 'translateX(-20px)',
                                    maxHeight: message.isVisible ? '200px' : '0px'
                                  }}
                                >
                                  <span className={`inline-block transition-all duration-700 ease-out text-gray-800 dark:text-gray-200 ${
                                    message.isVisible ? 'opacity-100' : 'opacity-0'
                                  }`}>
                                    {line.replace(/```/g, '')}
                                  </span>
                                </div>
                              );
                            }
                            if (line.trim() === '') {
                              return <div key={lineIndex} className="h-2"></div>;
                            }
                            return (
                              <div 
                                key={lineIndex} 
                                className="mb-2 transition-all duration-500 ease-out overflow-hidden"
                                style={{
                                  animationDelay: `${lineIndex * 100}ms`,
                                  opacity: message.isVisible ? 1 : 0,
                                  transform: message.isVisible ? 'translateX(0)' : 'translateX(-20px)',
                                  maxHeight: message.isVisible ? '100px' : '0px'
                                }}
                              >
                                <span className={`inline-block transition-all duration-700 ease-out text-gray-800 dark:text-gray-200 ${
                                  message.isVisible ? 'opacity-100' : 'opacity-0'
                                }`}>
                                  {line}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Centered Input Area - Shows when no messages */}
        {showCenteredInput && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-2xl text-center">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Ready when you are.
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Start typing below to create your AI assistant
                </p>
              </div>
              
              <div className="relative">
                <textarea
                  ref={inputRef}
                  className="w-full px-4 py-4 pr-20 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-lg"
                  placeholder="Ask anything..."
                  rows={1}
                  onKeyDown={handleSendMessage}
                  onChange={handleInputChange}
                  style={{ minHeight: '60px', maxHeight: '200px' }}
                />
                
                <button
                  onClick={() => {
                    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (textarea && textarea.value.trim()) {
                      setShowCenteredInput(false);
                      sendMessageToAssistant(textarea.value.trim());
                      textarea.value = '';
                      textarea.style.height = 'auto';
                    }
                  }}
                  disabled={isSending}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Juta Assistant can make mistakes. Consider checking important information.
              </div>
            </div>
          </div>
        )}

        {/* Bottom Input Area - Shows when chatting */}
        {!showCenteredInput && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  className="w-full px-3 py-2 pr-16 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Ask anything..."
                  rows={1}
                  onKeyDown={handleSendMessage}
                  onChange={handleInputChange}
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
                
                <button
                  onClick={() => {
                    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (textarea && textarea.value.trim()) {
                      // Move input to bottom when user starts chatting
                      setShowCenteredInput(false);
                      sendMessageToAssistant(textarea.value.trim());
                      textarea.value = '';
                      textarea.style.height = 'auto';
                    }
                  }}
                  disabled={isSending}
                  className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-2 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Juta Assistant can make mistakes. Consider checking important information.
                </div>
                
                {/* Animation Progress */}
                {/* Removed animation progress */}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <ToastContainer />
    </div>
  );
};

export default Main;
