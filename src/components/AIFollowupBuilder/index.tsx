import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { toast } from "react-toastify";
import axios from "axios";

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
  isLoading?: boolean;
  isBrainstorm?: boolean;
  suggestions?: string[];
  progress?: number;
  threadId?: string;
}

interface StageTemplateData {
  templateId: string;
  stageName: string;
  purpose: string;
  triggerTags: string[];
  triggerKeywords: string[];
  messages: Array<{
    dayNumber: number;
    sequence: number;
    message: string;
    delayAfter: {
      value: number;
      unit: "minutes" | "hours" | "days";
      isInstantaneous: boolean;
    };
    description: string;
  }>;
  messageCount: number;
}

interface StageTemplate {
  stageName: string;
  templateId: string;
  templateName: string;
  messageCount: number;
  purpose?: string;
  triggerTags?: string[];
  triggerKeywords?: string[];
}

interface CreateTemplateResponse {
  message: string;
  createdTemplates: StageTemplate[];
  totalStages: number;
  originalTemplateName: string;
}

interface GeneratedData {
  workflowStages?: string;
  stageTemplates?: StageTemplateData[];
  templateStructure?: any;
  createdTemplates?: StageTemplate[];
  totalStages?: number;
  originalTemplateName?: string;
  // New fields for message-level analysis
  messageOptimizations?: {
    templateId: string;
    templateName: string;
    messageUpdates: {
      messageId: string;
      currentMessage: string;
      suggestedMessage: string;
      improvements: string[];
      reason: string;
    }[];
  }[];
  overallMessageAnalysis?: {
    totalMessages: number;
    messagesOptimized: number;
    keyImprovements: string[];
    conversionPotential: string;
  };
}

// New interfaces for current follow-up data
interface CurrentFollowUpTemplate {
  id: string;
  templateId: string;
  name: string;
  status: "active" | "inactive";
  createdAt: Date;
  created_at: Date;
  startTime: Date;
  isCustomStartTime: boolean;
  triggerTags?: string[];
  triggerKeywords?: string[];
  batchSettings: any;
}

interface CurrentFollowUpMessage {
  id: string;
  message: string;
  dayNumber: number;
  sequence: number;
  status: "active" | "inactive";
  createdAt: Date;
  delayAfter: {
    value: number;
    unit: "minutes" | "hours" | "days";
    isInstantaneous: boolean;
  };
  specificNumbers: {
    enabled: boolean;
    numbers: string[];
  };
  useScheduledTime: boolean;
  scheduledTime: string;
  templateId?: string;
  addTags: string[];
  removeTags: string[];
}

// Add interface for AI Assistant Info
interface AssistantInfo {
  name: string;
  description: string;
  instructions: string;
  metadata: {
    files: Array<{id: string, name: string, url: string}>;
  };
}

interface AIFollowupBuilderProps {
  onClose: () => void;
  onApplyMessages: (stageTemplates: StageTemplateData[], templateName: string, triggerTags: string[], triggerKeywords: string[]) => void;
  tags: Array<{ id: string; name: string }>;
}

const AIFollowupBuilder: React.FC<AIFollowupBuilderProps> = ({
  onClose,
  onApplyMessages,
  tags
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [brainstormSuggestions, setBrainstormSuggestions] = useState<string[]>([]);
  const [currentBrainstormMessage, setCurrentBrainstormMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [aiThinkingProgress, setAiThinkingProgress] = useState(0);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [availableThreads, setAvailableThreads] = useState<Array<{
    threadId: string;
    lastUpdated: string;
    templateName: string;
    messageCount: number;
  }>>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [editingThreadName, setEditingThreadName] = useState<string | null>(null);
  const [editingThreadNameValue, setEditingThreadNameValue] = useState<string>('');
  
  // Add state for expanded templates
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  
  // Add state for editable messages
  const [editableMessages, setEditableMessages] = useState<{[key: string]: string}>({});
  
  // New state for current follow-up data
  const [currentFollowUps, setCurrentFollowUps] = useState<{
    templates: CurrentFollowUpTemplate[];
    messages: { [templateId: string]: CurrentFollowUpMessage[] };
  }>({ templates: [], messages: {} });
  const [isLoadingCurrentFollowUps, setIsLoadingCurrentFollowUps] = useState(false);

  // Add state for AI Assistant Info (like in Prompt Builder)
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>({
    name: '',
    description: '',
    instructions: '',
    metadata: {
      files: [],
    },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Functions from Prompt Builder to fetch assistant info
  const fetchCompanyId = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      console.error("No user email found");
      setError("No user email found");
      return;
    }

    console.log('Fetching company ID for user email:', userEmail);

    try {
      const userResponse = await fetch(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(userEmail)}`,
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
      
      const companyId = userData.userData.companyId;
      
      console.log('Company ID:', companyId);
      
      setCompanyId(companyId);
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

      console.log('Fetching company config for company ID:', companyId);

      // Use the same endpoint as the main application to get company data
      const response = await axios.get(`https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(userEmail)}`);

      if (response.status === 200) {
        const { companyData } = response.data;
        console.log('Company data received:', companyData);
        
        // Get assistant IDs from company data (same as main app)
        let assistantIds: string[] = [];
        if (companyData.assistants_ids) {
        if (Array.isArray(companyData.assistants_ids)) {
          assistantIds = companyData.assistants_ids;
        } else if (typeof companyData.assistants_ids === 'string') {
          assistantIds = companyData.assistants_ids.split(',').map((id: string) => id.trim());
          }
        }

        // Check for alternative field names
        if (assistantIds.length === 0) {
          if (companyData.assistant_id) {
            assistantIds = [companyData.assistant_id];
          } else if (companyData.assistantId) {
            assistantIds = [companyData.assistantId];
          } else if (companyData.assistants_id) {
            assistantIds = [companyData.assistants_id];
          }
        }

        console.log('Found assistant IDs:', assistantIds);

        // Get the first assistant ID
        if (assistantIds.length > 0) {
          setAssistantId(assistantIds[0]);
          console.log('Setting assistant ID to:', assistantIds[0]);
          setError(null);
        } else {
          console.error("No assistant IDs found in company data");
          setError("No assistants configured for this company. Please contact your administrator.");
          return;
        }

        // Try to get API key from company data first
        let apiKey = companyData.openaiApiKey;
        
        // If not found in company data, try to fetch from company-config endpoint
        if (!apiKey) {
          console.log('API key not found in company data, trying company-config endpoint...');
          try {
            const configResponse = await axios.get(`https://juta-dev.ngrok.dev/api/company-config/${companyId}`);
            if (configResponse.data.openaiApiKey) {
              apiKey = configResponse.data.openaiApiKey;
              console.log('API key fetched from company-config endpoint');
            }
          } catch (configError) {
            console.log('Failed to fetch from company-config endpoint:', configError);
          }
        }

        // Set API key if found
        if (apiKey) {
          setApiKey(apiKey);
          console.log('API key fetched successfully for company:', companyId);
        } else {
          console.error("No OpenAI API key found in company data or company-config");
          setError("No OpenAI API key configured for this company. Please contact your administrator.");
        }
      }
    } catch (error) {
      console.error("Error fetching company config:", error);
      setError("Failed to fetch company configuration");
    }
  };

  const fetchAssistantInfo = async (assistantId: string, apiKey: string) => {
    console.log('fetching assistant info for ID:', assistantId);
    console.log('Using API key for company:', companyId);
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
      console.log('Assistant instructions length:', instructions.length);
      console.log('Assistant instructions preview:', instructions.substring(0, 200) + '...');
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    } finally {
      setLoading(false);
    }
  };

  // Fetch company ID and assistant info on component mount (like in Prompt Builder)
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

  // Initialize thread and load existing history
  useEffect(() => {
    const initializeThread = async () => {
      setIsLoadingThreads(true);
      try {
        const availableThreads = await getAvailableThreads();
        
        if (availableThreads.length > 0) {
          // Load the most recent thread
          const mostRecentThread = availableThreads[0];
          await loadThread(mostRecentThread.threadId);
        } else {
          // Create new thread
          const newThreadId = generateThreadId();
          const defaultName = generateDefaultThreadName();
          setCurrentThreadId(newThreadId);
          await saveChatHistory(newThreadId, [], defaultName);
        }
      } catch (error) {
        console.error('Error initializing thread:', error);
        // Create new thread on error
        const newThreadId = generateThreadId();
        const defaultName = generateDefaultThreadName();
        setCurrentThreadId(newThreadId);
        await saveChatHistory(newThreadId, [], defaultName);
      } finally {
        setIsLoadingThreads(false);
      }
    };
    
    initializeThread();
  }, []);

  // Auto-refresh threads every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (!isLoadingThreads) {
        await getAvailableThreads();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [isLoadingThreads]);

  // Auto-refresh when modal is opened (component mounts)
  useEffect(() => {
    const refreshOnOpen = async () => {
      if (currentThreadId) {
        // Refresh threads list
        await getAvailableThreads();
        
        // Also refresh the current thread to ensure we have the latest data
        await loadThread(currentThreadId);
      }
    };
    
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(refreshOnOpen, 100);
    return () => clearTimeout(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingThreadName === 'dropdown') {
        const target = event.target as Element;
        if (!target.closest('.thread-selector-dropdown')) {
          setEditingThreadName(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingThreadName]);

  // Fetch current follow-up templates and messages after assistant info is loaded
  useEffect(() => {
    if (assistantInfo.instructions && !loading) {
      fetchCurrentFollowUps();
    }
  }, [assistantInfo.instructions, loading]);

  // Function to generate unique template IDs
  const generateTemplateId = () => {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Function to generate unique thread ID
  const generateThreadId = () => {
    return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Function to generate default thread name
  const generateDefaultThreadName = () => {
    const date = new Date().toLocaleDateString();
    return `Chat 1`;
  };

  // Function to get next available chat number
  const getNextChatNumber = () => {
    const existingNames = availableThreads.map(thread => thread.templateName);
    let chatNumber = 1;
    
    while (existingNames.some(name => name.startsWith(`Chat ${chatNumber}`))) {
      chatNumber++;
    }
    
    return chatNumber;
  };

  // Function to save chat history to Neon database
  const saveChatHistory = async (threadId: string, messages: ChatMessage[], customName?: string) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return;
      }

      // Add generated data metadata to the last message if available
      let messagesToSave = [...messages];
      if (generatedData && generatedData.stageTemplates && generatedData.stageTemplates.length > 0) {
        // Add metadata about generated templates to help with restoration
        const lastMessage = messagesToSave[messagesToSave.length - 1];
        if (lastMessage && !lastMessage.isLoading) {
          const enhancedMessage = {
            ...lastMessage,
            text: lastMessage.text + `\n\n[METADATA: Generated ${generatedData.stageTemplates.length} templates with changes ready to apply]`
          };
          messagesToSave[messagesToSave.length - 1] = enhancedMessage;
        }
      }

      // Get current thread name or use custom name
      const currentThread = availableThreads.find(t => t.threadId === threadId);
      const threadName = customName || currentThread?.templateName || 'AI Follow-up Builder';

      const response = await axios.post('https://juta-dev.ngrok.dev/api/ai-followup-builder-save-thread/save', {
        threadId,
        email: userEmail,
        threadData: {
          messages: messagesToSave,
          metadata: {
            createdAt: new Date().toISOString()
          }
        },
        templateName: threadName
      });

      // Backend response is already handled, no need to check success flag
      console.log('Chat history saved successfully');
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  // Function to load chat history from Neon database
  const loadChatHistory = async (threadId: string): Promise<ChatMessage[]> => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return [];
      }

      const response = await axios.get(`https://juta-dev.ngrok.dev/api/threads/${threadId}`, {
        params: { email: userEmail, page: 'aifollowup' }
      });
      
      // Transform backend response to match frontend expectations
      return response.data.data?.messages || [];
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  };

  // Utility function to safely parse dates
  const safeParseDate = (dateString: any): string => {
    if (!dateString) return new Date().toISOString();
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  // Function to get all available chat threads from Neon database
  const getAvailableThreads = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return [];
      }

      const response = await axios.get(`https://juta-dev.ngrok.dev/api/ai-followup-builder-save-thread?email=${encodeURIComponent(userEmail)}`);
      
      console.log('Backend response:', response.data);
      
      // Transform backend response to match frontend expectations
      const threads = response.data.data?.threads || [];
      
      // Ensure all threads have proper date fields
      const validatedThreads = threads.map((thread: any) => {
        try {
          return {
            ...thread,
            lastUpdated: safeParseDate(thread.lastUpdated),
            createdAt: safeParseDate(thread.createdAt)
          };
        } catch (dateError) {
          console.error('Error processing thread dates:', dateError, thread);
          return {
            ...thread,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
        }
      });
      
      setAvailableThreads(validatedThreads);
      
      // If no threads exist, automatically create one
      if (threads.length === 0 && !currentThreadId) {
        const newThreadId = generateThreadId();
        const defaultName = generateDefaultThreadName();
        setCurrentThreadId(newThreadId);
        
        try {
          await saveChatHistory(newThreadId, [], defaultName);
          
          // Add the new thread to available threads
          const newThread = {
            threadId: newThreadId,
            templateName: defaultName,
            lastUpdated: new Date().toISOString(),
            messageCount: 0
          };
          const updatedThreads = [newThread];
          setAvailableThreads(updatedThreads);
          return updatedThreads;
        } catch (saveError) {
          console.error('Error auto-creating thread:', saveError);
          // Return empty array if auto-creation fails
          return [];
        }
      }
      
      return threads;
    } catch (error) {
      console.error('Error getting available threads:', error);
      return [];
    }
  };

  // Function to clear current thread history
  const clearCurrentThread = async () => {
    if (currentThreadId) {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          await axios.delete(`https://juta-dev.ngrok.dev/api/threads/${currentThreadId}`, {
            params: { email: userEmail, page: 'aifollowup' }
          });
        }
      } catch (error) {
        console.error('Error clearing thread history:', error);
      }
    }
    
    // Generate new thread ID and clear messages
    const newThreadId = generateThreadId();
    setCurrentThreadId(newThreadId);
    setMessages([]);
    setGeneratedData(null);
    setHasChanges(false);
    setAiThinkingProgress(0);
    
    // Save empty thread
    await saveChatHistory(newThreadId, []);
    
    // Refresh available threads
    await getAvailableThreads();
    setShowClearConfirm(false);
  };

  // Function to load a specific thread
  const loadThread = async (threadId: string) => {
    try {
      const threadMessages = await loadChatHistory(threadId);
      setCurrentThreadId(threadId);
      setMessages(threadMessages);
      
      // Check if there are any generated templates in the loaded messages
      const lastBrainstormMessage = threadMessages
        .filter(msg => msg.isBrainstorm)
        .pop();
      
      if (lastBrainstormMessage && lastBrainstormMessage.text) {
        // Check if this thread has generated templates that need to be restored
        const hasGeneratedTemplates = threadMessages.some(msg => 
          msg.text && (
            msg.text.includes('[METADATA: Generated') ||
            msg.text.includes('Templates ready to apply') ||
            msg.text.includes('Changes Ready to Apply') ||
            msg.text.includes('stageTemplates')
          )
        );
        
        if (hasGeneratedTemplates) {
          // Set hasChanges to true if we have generated templates
          setHasChanges(true);
          
          // Create a basic generated data structure to show that changes are pending
          setGeneratedData({
            stageTemplates: [],
            workflowStages: 'Templates previously generated - please regenerate to see full details and apply changes'
          });
          
          // Show a message to the user about regenerating templates
          const infoMessage: ChatMessage = {
            from_me: false,
            type: 'text',
            text: `ℹ️ **Previous Session Detected**\n\nI can see you had generated templates in your previous session. To see the full details and apply changes, please ask me to regenerate the templates or continue with your previous request.`,
            createdAt: new Date().toISOString(),
            threadId: threadId
          };
          
          // Add info message if it doesn't already exist
          if (!threadMessages.some(msg => msg.text.includes('Previous Session Detected'))) {
            setMessages(prev => [...prev, infoMessage]);
            // Save the updated messages
            saveChatHistory(threadId, [...threadMessages, infoMessage]);
          }
        } else {
          setHasChanges(false);
        }
      } else {
        setHasChanges(false);
      }
      
      // Refresh available threads to update last updated time
      await getAvailableThreads();
    } catch (error) {
      console.error('Error loading thread:', error);
      setMessages([]);
      setHasChanges(false);
      setGeneratedData(null);
    }
  };

  // Function to create new thread
  const createNewThread = async () => {
    const newThreadId = generateThreadId();
    const chatNumber = getNextChatNumber();
    const defaultName = `Chat ${chatNumber} - ${new Date().toLocaleDateString()}`;
    
    setCurrentThreadId(newThreadId);
    setMessages([]);
    setGeneratedData(null);
    setHasChanges(false);
    setAiThinkingProgress(0);
    
    // Save empty thread with default name
    await saveChatHistory(newThreadId, [], defaultName);
    
    // Refresh available threads
    await getAvailableThreads();
  };

  // Function to start editing thread name
  const startEditingThreadName = (threadId: string) => {
    const thread = availableThreads.find(t => t.threadId === threadId);
    if (thread) {
      setEditingThreadName(threadId);
      setEditingThreadNameValue(thread.templateName);
    }
  };

  // Function to save thread name
  const saveThreadName = async (threadId: string) => {
    if (editingThreadNameValue.trim()) {
      try {
        // Update the thread name in the database
        await saveChatHistory(threadId, messages, editingThreadNameValue.trim());
        
        // Refresh available threads to get updated names
        await getAvailableThreads();
        
        // Exit edit mode
        setEditingThreadName(null);
        setEditingThreadNameValue('');
      } catch (error) {
        console.error('Error saving thread name:', error);
      }
    }
  };

  // Function to cancel editing thread name
  const cancelEditingThreadName = () => {
    setEditingThreadName(null);
    setEditingThreadNameValue('');
  };

  // Function to toggle template expansion
  const toggleTemplateExpansion = (templateId: string) => {
    setExpandedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  // Function to handle message editing
  const handleMessageEdit = (templateId: string, messageIndex: number, newText: string) => {
    const key = `${templateId}_${messageIndex}`;
    setEditableMessages(prev => ({
      ...prev,
      [key]: newText
    }));
  };

  // Function to save message edits
  const saveMessageEdit = (templateId: string, messageIndex: number) => {
    const key = `${templateId}_${messageIndex}`;
    const newText = editableMessages[key];
    
    if (newText && generatedData?.stageTemplates) {
      const updatedTemplates = generatedData.stageTemplates.map(template => {
        if (template.templateId === templateId) {
          const updatedMessages = [...template.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            message: newText
          };
          return { ...template, messages: updatedMessages };
        }
        return template;
      });
      
      setGeneratedData({
        ...generatedData,
        stageTemplates: updatedTemplates
      });
      
      // Remove from editable state
      setEditableMessages(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };

  // Function to cancel message edit
  const cancelMessageEdit = (templateId: string, messageIndex: number) => {
    const key = `${templateId}_${messageIndex}`;
    setEditableMessages(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  // Add custom styles for better scrolling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ai-followup-builder-scroll {
        scrollbar-width: thin;
        scrollbar-color: #d1d5db transparent;
      }
      .ai-followup-builder-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .ai-followup-builder-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .ai-followup-builder-scroll::-webkit-scrollbar-thumb {
        background-color: #d1d5db;
        border-radius: 3px;
      }
      .ai-followup-builder-scroll::-webkit-scrollbar-thumb:hover {
        background-color: #9ca3af;
      }
      .dark .ai-followup-builder-scroll::-webkit-scrollbar-thumb {
        background-color: #4b5563;
      }
      .dark .ai-followup-builder-scroll::-webkit-scrollbar-thumb:hover {
        background-color: #6b7280;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const fetchCurrentFollowUps = async () => {
    setIsLoadingCurrentFollowUps(true);
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Get company ID
      const userResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(userEmail)}`
      );
      const companyId = userResponse.data.userData.companyId;

      // Fetch current follow-up templates
      const templatesResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/followup-templates?companyId=${encodeURIComponent(companyId)}`
      );

      if (!templatesResponse.data.success) {
        throw new Error("Failed to fetch follow-up templates");
      }

      const templates = templatesResponse.data.templates;
      
      // Fetch messages for each template
      const messagesData: { [templateId: string]: CurrentFollowUpMessage[] } = {};
      
      for (const template of templates) {
        try {
          const messagesResponse = await axios.get(
            `https://juta-dev.ngrok.dev/api/followup-templates/${template.templateId}/messages`
          );
          
          if (messagesResponse.data.success && Array.isArray(messagesResponse.data.messages)) {
            messagesData[template.templateId] = messagesResponse.data.messages.map((msg: any) => ({
              ...msg,
              createdAt: msg.createdAt ? new Date(msg.createdAt) : null,
            }));
          } else {
            messagesData[template.templateId] = [];
          }
        } catch (error) {
          console.error(`Error fetching messages for template ${template.templateId}:`, error);
          messagesData[template.templateId] = [];
        }
      }

      setCurrentFollowUps({ templates, messages: messagesData });

      // Don't add any initial message - keep it empty like new threads
      // This makes the behavior consistent between opening modal and creating new threads

    } catch (error) {
      console.error("Error fetching current follow-ups:", error);
      setError("Failed to fetch current follow-up data. Please try again.");
    } finally {
      setIsLoadingCurrentFollowUps(false);
    }
  };

  const sendMessageToAI = async (messageText: string) => {
    if (isSending) return;
    
    setIsSending(true);
    setError(null);
    setAiThinkingProgress(0);
    
    const newMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
      threadId: currentThreadId,
    };
  
    const loadingMessage: ChatMessage = {
      from_me: false,
      type: 'text',
      text: '',
      createdAt: new Date().toISOString(),
      isLoading: true,
      threadId: currentThreadId,
    };
  
    const updatedMessages = [...messages, newMessage, loadingMessage];
    setMessages(updatedMessages);
    
    // Save to localStorage
    saveChatHistory(currentThreadId, updatedMessages);
  
    // Start progress simulation
    let progressInterval: NodeJS.Timeout;
    progressInterval = setInterval(() => {
      setAiThinkingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }
  
      // Prepare current follow-up data to send to AI
      const currentFollowUpData = {
        templates: currentFollowUps.templates,
        messages: currentFollowUps.messages,
        totalTemplates: currentFollowUps.templates.length,
        totalMessages: Object.values(currentFollowUps.messages).reduce((sum, msgs) => sum + msgs.length, 0)
      };
  
      // Use the brainstorming endpoint for follow-up suggestions with current prompt
      const response = await axios.post(
        'https://juta-dev.ngrok.dev/api/followup-brainstorm/',
        {
          message: messageText,
          email: userEmail,
          currentPrompt: assistantInfo.instructions, // Include current AI assistant instructions
          currentFollowUps: currentFollowUpData
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.details || 'Failed to generate follow-up suggestions');
      }

      // Debug: Log the full response structure
      console.log("=== BRAINSTORM RESPONSE DEBUG ===");
      console.log("Full response:", response);
      console.log("Response.data:", response.data);
      console.log("Response.data.data:", response.data?.data);
      console.log("Response.data.suggestions:", response.data?.suggestions);
      console.log("Response.data.data?.suggestions:", response.data?.data?.suggestions);
      
      // Extract the AI response and templates
      let responseText = 'No response provided';
      let templates: StageTemplateData[] = [];
      
      // The AI response should contain templates
      if (response.data?.data?.templates && Array.isArray(response.data.data.templates)) {
        templates = response.data.data.templates;
        responseText = response.data.data.explanation || 'Templates generated successfully';
        console.log("✅ Found templates in response.data.data.templates");
      } else if (response.data?.templates && Array.isArray(response.data.templates)) {
        templates = response.data.templates;
        responseText = response.data.explanation || 'Templates generated successfully';
        console.log("✅ Found templates in response.data.templates");
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // If data is directly an array of templates
        templates = response.data.data;
        responseText = 'Templates generated successfully';
        console.log("✅ Found templates in response.data.data (array)");
      } else {
        console.log("❌ No templates found in response");
        console.log("Available fields:", Object.keys(response.data || {}));
        if (response.data?.data) {
          console.log("Data fields:", Object.keys(response.data.data));
        }
      }
      
      // Clean up the response text
      if (responseText && responseText !== 'No response provided') {
        responseText = responseText
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t')
          .trim();
        console.log("✅ Cleaned response text:", responseText.substring(0, 100) + "...");
      } else {
        console.log("❌ Response text is empty or 'No response provided'");
      }
      
      // Process templates and add templateId if missing
      const processedTemplates = templates.map((template: any) => ({
        templateId: template.templateId || generateTemplateId(),
        stageName: template.stageName || template.name || 'Unknown Stage',
        purpose: template.purpose || template.description || 'Follow-up sequence',
        triggerTags: template.triggerTags || template.trigger_tags || [],
        triggerKeywords: template.triggerKeywords || template.trigger_keywords || [],
        messages: template.messages || template.messageArray || [],
        messageCount: template.messageCount || template.message_count || (template.messages || template.messageArray || []).length
      }));
      
      // Store templates for later use
      setGeneratedData({
        stageTemplates: processedTemplates,
        workflowStages: responseText
      });
      
      // Mark that there are changes to be applied
      if (processedTemplates.length > 0) {
        setHasChanges(true);
        console.log("✅ Templates ready to apply:", processedTemplates.length);
      } else {
        setHasChanges(false);
        console.log("❌ No templates generated");
      }
      
      console.log("=== END BRAINSTORM DEBUG ===");
      
      // Complete the progress to 100%
      setAiThinkingProgress(100);
      
      // Small delay to show 100% before revealing the answer
      setTimeout(async () => {
        const assistantResponse: ChatMessage = {
          from_me: false,
          type: 'text',
          text: responseText,
          createdAt: new Date().toISOString(),
          isBrainstorm: true,
          threadId: currentThreadId
        };
        
        // Remove loading message and add the real response
        setMessages(prevMessages => {
          const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
          const finalMessages = [...filteredMessages, assistantResponse];
          
          // Save updated messages to localStorage
          saveChatHistory(currentThreadId, finalMessages);
          
          return finalMessages;
        });
      }, 300);
  
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to generate follow-up suggestions. Please try again.");
      // Remove loading message on error
      setMessages(prevMessages => prevMessages.filter(msg => !msg.isLoading));
      // Reset progress on error
      setAiThinkingProgress(0);
      // Clear progress interval
      if (progressInterval) clearInterval(progressInterval);
    } finally {
      setIsSending(false);
      // Reset progress when done
      setAiThinkingProgress(0);
      // Clear progress interval
      if (progressInterval) clearInterval(progressInterval);
    }
  };

  const applyChangesToFollowUps = async () => {
    if (isApplyingChanges || !generatedData?.stageTemplates?.length) return;
    
    setIsApplyingChanges(true);
    setApplyProgress(0);
    setError(null);

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Get company ID first
      const userResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(userEmail)}`
      );
      const companyId = userResponse.data.userData.companyId;

      // Start with initial progress
      setApplyProgress(1);
      
      // Smooth progress animation
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

      // Transform the data to match your existing API format
      const templatesToSave = generatedData.stageTemplates.map((template: StageTemplateData) => {
        // Validate message structure
        if (!template.messages || !Array.isArray(template.messages)) {
          console.error(`Template ${template.stageName} has invalid messages:`, template.messages);
          return null;
        }
        
        // Transform messages: keep full objects and normalize timing rules
        const defaultTimes = ["09:00", "10:00", "14:00", "16:00"];
        const transformedMessages = template.messages.map((msg: any, index: number) => {
          if (!msg || typeof msg !== 'object') {
            console.error(`Invalid message at index ${index}:`, msg);
            return null;
          }

          if (typeof msg.message !== 'string') {
            console.error(`Message at index ${index} has invalid message field:`, msg.message);
            return null;
          }

          // Clean up the message content (remove artifacts like "||")
          let cleanMessage = msg.message.trim();
          cleanMessage = cleanMessage.replace(/\|\s*$/, '');
          cleanMessage = cleanMessage.replace(/\|\|\s*$/, '');
          cleanMessage = cleanMessage.replace(/^\|\s*/, '');

          const isFirst = index === 0;

          if (isFirst) {
            const delayAfter = msg.delayAfter && typeof msg.delayAfter.value === 'number'
              ? { value: msg.delayAfter.value, unit: msg.delayAfter.unit || 'minutes', isInstantaneous: false }
              : { value: 30, unit: 'minutes', isInstantaneous: false };

            return {
              ...msg,
              message: cleanMessage,
              sequence: typeof msg.sequence === 'number' ? msg.sequence : index + 1,
              dayNumber: 0,
              useScheduledTime: false,
              scheduledTime: '',
              delayAfter
            };
          }

          const time = (typeof msg.scheduledTime === 'string' && msg.scheduledTime.trim())
            ? msg.scheduledTime
            : defaultTimes[(index - 1) % defaultTimes.length];

          return {
            ...msg,
            message: cleanMessage,
            sequence: typeof msg.sequence === 'number' ? msg.sequence : index + 1,
            dayNumber: typeof msg.dayNumber === 'number' && msg.dayNumber >= 1 ? msg.dayNumber : 1,
            useScheduledTime: true,
            scheduledTime: time,
            // Remove delayAfter to avoid UI falling back to Instant
            delayAfter: null
          };
        }).filter(Boolean);
        
        return {
          templateId: template.templateId,
          stageName: template.stageName,
          purpose: template.purpose,
          triggerTags: template.triggerTags,
          triggerKeywords: template.triggerKeywords,
          messages: transformedMessages,
          messageCount: transformedMessages.length
        };
      }).filter(Boolean); // Remove any null templates
      
      console.log("=== SAVE DEBUG ===");
      console.log("Original templates:", generatedData.stageTemplates);
      console.log("Transformed templates to save:", templatesToSave);
      console.log("Sample message transformation:");
      if (generatedData.stageTemplates[0]?.messages[0] && templatesToSave[0]) {
        console.log("Original message object:", generatedData.stageTemplates[0].messages[0]);
        console.log("Transformed message string:", templatesToSave[0].messages[0]);
      }
      console.log("=== END SAVE DEBUG ===");
    
    // Validate that we have templates to save
    if (!templatesToSave || templatesToSave.length === 0) {
      throw new Error("No valid templates to save. Please check the message structure.");
    }
    
    // Validate that each template has messages
    const invalidTemplates = templatesToSave.filter((template: any) => template && (!template.messages || template.messages.length === 0));
    if (invalidTemplates.length > 0) {
      console.error("Templates without messages:", invalidTemplates);
      throw new Error("Some templates have no messages. Please check the data.");
    }
    
    // Final validation: ensure each message is an object with non-empty text
    const finalValidation = templatesToSave.map((template: any, templateIndex: number) => {
      console.log(`Validating template ${templateIndex}: ${template.stageName}`);
      console.log(`Original messages count: ${template.messages.length}`);
      console.log(`Original messages:`, template.messages);

      const validMessages = template.messages.filter((msg: any, msgIndex: number) => {
        const isValid = msg && typeof msg.message === 'string' && msg.message.trim();
        if (!isValid) {
          console.error(`Template ${templateIndex}, Message ${msgIndex} invalid:`, msg);
        } else {
          console.log(`Template ${templateIndex}, Message ${msgIndex} is valid:`, msg.message);
        }
        return Boolean(isValid);
      });

      console.log(`Valid messages count: ${validMessages.length}`);
      console.log(`Valid messages:`, validMessages);

      return {
        ...template,
        messages: validMessages,
        messageCount: validMessages.length
      };
    }).filter(Boolean);
    
    console.log("=== FINAL VALIDATION ===");
    console.log("Final templates to save:", finalValidation);
    console.log("Message count per template:", finalValidation.map(t => ({ name: t.stageName, count: t.messageCount })));
    
    // Debug: Check each template's messages
    finalValidation.forEach((template: any, index: number) => {
      console.log(`Template ${index} (${template.stageName}):`);
      console.log(`  - Messages count: ${template.messages.length}`);
      console.log(`  - Messages:`, template.messages);
      console.log(`  - Message type check:`, template.messages.map((msg: any, i: number) => ({ index: i, type: typeof msg, content: msg })));
    });
    
    console.log("=== END FINAL VALIDATION ===");
    
    // Log detailed structure of each template
    finalValidation.forEach((template: any, index: number) => {
      console.log(`Template ${index} details:`, {
        templateId: template.templateId,
        stageName: template.stageName,
        purpose: template.purpose,
        triggerTags: template.triggerTags,
        triggerKeywords: template.triggerKeywords,
        messages: template.messages,
        messageCount: template.messageCount,
        messagesType: Array.isArray(template.messages) ? 'array' : typeof template.messages,
        messagesLength: Array.isArray(template.messages) ? template.messages.length : 'not array'
      });
    });
    
    console.log("=== END FINAL VALIDATION ===");
      
      // Call the direct save API
    console.log("=== SAVE API CALL ===");
    console.log("Request payload:", {
      companyId: companyId,
      email: userEmail,
      templates: finalValidation
    });
    
    // Debug: Show detailed template structure
    console.log("Detailed templates structure:");
    finalValidation.forEach((template: any, index: number) => {
      console.log(`Template ${index}:`, {
        templateId: template.templateId,
        stageName: template.stageName,
        purpose: template.purpose,
        triggerTags: template.triggerTags,
        triggerKeywords: template.triggerKeywords,
        messages: template.messages,
        messageCount: template.messageCount
      });
    });
    
      const response = await axios.post(
        'https://juta-dev.ngrok.dev/api/followup-save-templates/',
        {
          companyId: companyId,
          email: userEmail,
        templates: finalValidation
      }
    );
    
    console.log("Save API response:", response.data);
    console.log("=== END SAVE API CALL ===");
    
    // Validate the response
    if (!response.data.success) {
      console.error("Save API returned error:", response.data);
      throw new Error(response.data.details || response.data.error || 'Failed to save templates');
    }
    
    // Log the response details
    const { templatesUpdated, templatesCreated, totalChanges } = response.data.data || {};
    console.log("Save API success details:", {
      templatesUpdated,
      templatesCreated,
      totalChanges,
      fullResponse: response.data
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
      }, 30);
      
      setApplyProgress(60);

      if (!response.data.success) {
        throw new Error(response.data.details || 'Failed to save templates');
      }
      
      // Smooth progress animation to 80%
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
      
      // Refresh current follow-up data to show the changes
        await fetchCurrentFollowUps();
        
      // Mark that there are no pending changes (they've been applied)
      setHasChanges(false);
        
      // Add success message
        const successMessage: ChatMessage = {
        from_me: false,
        type: 'text',
        text: `🎉 Templates saved successfully!\n\n• Templates Updated: ${templatesUpdated || 0}\n• Templates Created: ${templatesCreated || 0}\n• Total Changes: ${totalChanges || 0}\n\nYour follow-up templates have been saved to the database.`,
        createdAt: new Date().toISOString(),
        threadId: currentThreadId,
      };
      
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, successMessage];
        // Save updated messages to localStorage
        saveChatHistory(currentThreadId, updatedMessages);
        return updatedMessages;
      });
      
      toast.success(`Templates saved successfully! 🎉\n${totalChanges || 0} template(s) processed.`);
      
      // Clear generated data after successful save
      setGeneratedData(null);
      
      // Smooth progress animation to 100%
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

    } catch (error) {
      console.error('Error saving templates:', error);
      setError("Failed to save templates. Please try again.");
      setApplyProgress(0);
    } finally {
      setIsApplyingChanges(false);
      // Reset progress after a delay
      setTimeout(() => setApplyProgress(0), 1000);
    }
  };

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        sendMessageToAI(newMessage);
        setNewMessage('');
      }
    }
  };

  // Show loading state while fetching assistant info
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[1200px] h-[95vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Loading AI Assistant...</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-lg text-base">
                Fetching your AI assistant instructions to understand your business context.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[1200px] h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Follow-up Builder</h2>
              <p className="text-gray-600 dark:text-gray-400">Create and optimize follow-up sequences with AI</p>
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Chat Section */}
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Thread Management Controls */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between gap-3">
                  {/* Left side - New Thread, Clear History, and Thread Selector */}
                  <div className="flex items-center gap-3">
                    {/* New Thread Button */}
                    <Button
                      onClick={createNewThread}
                      className="p-2 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700 rounded-lg"
                      title="New Thread"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </Button>
                    
                    {/* Clear History Button */}
                    <Button
                      onClick={() => setShowClearConfirm(true)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-300 border border-red-300 dark:border-red-700 rounded-lg"
                      title="Clear History"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                    
                    {/* Thread Selector */}
                    <div className="relative thread-selector-dropdown">
                      <button
                        onClick={() => setEditingThreadName(editingThreadName ? null : 'dropdown')}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between min-w-[200px]"
                        disabled={isLoadingThreads}
                      >
                        {isLoadingThreads ? (
                          <span>Loading threads...</span>
                        ) : availableThreads.length > 0 ? (
                          <span className="truncate">
                            {availableThreads.find(t => t.threadId === currentThreadId)?.templateName || 'Select Thread'}
                          </span>
                        ) : (
                          <span>No threads available</span>
                        )}
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Custom Dropdown */}
                      {editingThreadName === 'dropdown' && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                          {availableThreads.map((thread) => (
                            <div key={thread.threadId} className="border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                              <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                                {editingThreadName === thread.threadId ? (
                                  // Edit mode for this thread
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={editingThreadNameValue}
                                      onChange={(e) => setEditingThreadNameValue(e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Enter thread name..."
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          saveThreadName(thread.threadId);
                                        } else if (e.key === 'Escape') {
                                          cancelEditingThreadName();
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => saveThreadName(thread.threadId)}
                                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={cancelEditingThreadName}
                                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // Display mode for this thread
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900 dark:text-white truncate">
                                        {thread.templateName}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {thread.messageCount} messages - {thread.lastUpdated ? new Date(thread.lastUpdated).toLocaleDateString() : 'Unknown date'}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingThreadName(thread.threadId);
                                        }}
                                        className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        title="Edit thread name"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          loadThread(thread.threadId);
                                          setEditingThreadName(null);
                                        }}
                                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                                      >
                                        Select
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right side - Empty for balance */}
                  <div className="flex items-center gap-3">
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 ai-followup-builder-scroll" style={{ minHeight: 0 }}>
                {messages.length === 0 && isLoadingCurrentFollowUps && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Loading Your Follow-up Data...</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-lg text-base">
                      I'm analyzing your current AI assistant instructions and follow-up templates to provide personalized assistance.
                    </p>
                  </div>
                )}
                
                {messages.length === 0 && !isLoadingCurrentFollowUps && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Welcome to AI Follow-up Builder!</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-lg text-base">
                      I've analyzed your AI assistant's conversation flow and business context. I can help you build intelligent follow-up sequences that automatically nurture leads through your sales pipeline, optimize conversion rates, and create personalized customer journeys based on your existing conversation stages.
                    </p>
                    <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        💡 <strong>Examples:</strong> 
                        <br />• "Create follow-up templates based on my prompt stages"
                        <br />• "Change Stage 2 Day 2 message to be more urgent"
                        <br />• "Optimize my follow-up sequences for better conversion"
                      </p>
                    </div>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-4 ${message.from_me ? 'text-right' : 'text-left'}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-4 rounded-lg ${
                        message.from_me
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center space-x-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                              <span>AI is thinking...</span>
                            </span>
                            <span className="font-medium">{Math.round(aiThinkingProgress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${aiThinkingProgress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {aiThinkingProgress < 30 && "Analyzing your request..."}
                            {aiThinkingProgress >= 30 && aiThinkingProgress < 60 && "Processing your follow-up data..."}
                            {aiThinkingProgress >= 60 && aiThinkingProgress < 90 && "I am building your follow-up templates..."}
                            {aiThinkingProgress >= 90 && aiThinkingProgress < 100 && "Builder is taking longer than expected...Please wait for a while"}
                            {aiThinkingProgress >= 100 && "Response ready!"}
                          </div>
                        </div>
                      ) : (
                        <>
                        <div className="whitespace-pre-wrap">{message.text}</div>
                          
                          {/* Show Apply Changes button for brainstorm messages */}
                          {message.isBrainstorm && hasChanges && generatedData?.stageTemplates && generatedData.stageTemplates.length > 0 && (
                            <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700">
                              {/* Progress bar for apply changes */}
                              {isApplyingChanges && (
                                <div className="mb-3">
                                  <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400 mb-1">
                                    <span>Preparing changes...</span>
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
                                onClick={applyChangesToFollowUps}
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
                                                                      <div className="flex items-center space-x-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span>Apply Changes</span>
                                    </div>
                                )}
                              </button>
                            </div>
                          )}
                          
                          {/* Drafted Templates Section */}
                          {message.isBrainstorm && generatedData?.stageTemplates && generatedData.stageTemplates.length > 0 && (
                            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <h4 className="font-medium text-gray-800 dark:text-white">Drafted Templates ({generatedData.stageTemplates.length})</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Review the templates before applying</p>
                              </div>

                              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                                {generatedData.stageTemplates.map((template, index) => (
                                  <div key={template.templateId} className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-gray-800 dark:text-white mb-1">
                                          {template.stageName}
                                        </h5>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                          {template.purpose}
                                        </p>
                                        
                                        {/* Trigger Tags */}
                                        {template.triggerTags && template.triggerTags.length > 0 && (
                                          <div className="mb-2">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Trigger Tags:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {template.triggerTags.map((tag, tagIndex) => (
                                                <span key={tagIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Trigger Keywords */}
                                        {template.triggerKeywords && template.triggerKeywords.length > 0 && (
                                          <div className="mb-2">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Trigger Keywords:</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {template.triggerKeywords.map((keyword, keywordIndex) => (
                                                <span key={keywordIndex} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                  {keyword}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="text-right ml-4">
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                          {template.messageCount} messages
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Messages Preview */}
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-3">
                                        <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400">Messages:</h6>
                                        <button
                                          onClick={() => toggleTemplateExpansion(template.templateId)}
                                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                        >
                                          {expandedTemplates.has(template.templateId) ? (
                                            <>
                                              <span>Show Less</span>
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                              </svg>
                                            </>
                                          ) : (
                                            <>
                                              <span>Show All ({template.messages.length})</span>
                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" />
                                              </svg>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        {template.messages.slice(0, expandedTemplates.has(template.templateId) ? template.messages.length : 3).map((messageObj: any, msgIndex) => (
                                          <div key={msgIndex} className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 p-3 rounded border">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                #{msgIndex + 1} - {messageObj.day ? `Day ${messageObj.day}` : 'Day 0'}, {messageObj.sequence ? `Seq ${messageObj.sequence}` : 'Seq 1'}
                                              </span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {messageObj.delay ? `${messageObj.delay}` : (messageObj.timing ? `${messageObj.timing}` : 'Immediate')}
                                              </span>
                                            </div>
                                            <div className="mb-2">
                                              <div className="text-gray-700 dark:text-gray-300">
                                                {messageObj.message}
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                {messageObj.delay && (
                                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                                    {messageObj.delay}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleSendMessage}
                    placeholder="Ask me to create or modify follow-up templates based on your AI assistant stages..."
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                  <Button
                    onClick={() => {
                      if (newMessage.trim()) {
                        sendMessageToAI(newMessage);
                        setNewMessage('');
                      }
                    }}
                    disabled={!newMessage.trim() || isSending}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
                {error && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Press Enter to send, Shift+Enter for new line
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 ai-followup-builder-scroll" style={{ minHeight: 0 }}>
              {/* Current AI Assistant Instructions */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Current AI Assistant Context</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Assistant: {assistantInfo.name || 'Loading...'}
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-950/30 p-3 rounded border max-h-32 overflow-y-auto">
                    <strong>Instructions:</strong>
                    <div className="mt-2 font-mono text-xs whitespace-pre-wrap">
                      {assistantInfo.instructions || 'Loading instructions...'}
                    </div>
                  </div>
                </div>
              </div>

            {/* Current Follow-ups Overview */}
              {isLoadingCurrentFollowUps && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Loading Follow-up Data...</h3>
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Analyzing your current templates...</span>
                  </div>
                </div>
              </div>
            )}

              {!isLoadingCurrentFollowUps && currentFollowUps.templates.length > 0 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Current Follow-up Templates</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Click on any template to view its messages and details
                      </p>
                    </div>
                    <Button
                      onClick={fetchCurrentFollowUps}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {currentFollowUps.templates.map((template: CurrentFollowUpTemplate, index: number) => (
                      <div key={template.templateId} className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                        {/* Template Header - Clickable */}
                        <div 
                          className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => toggleTemplateExpansion(template.templateId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-800 dark:text-white">
                                {template.name}
                              </h4>
                              <svg 
                                className={`w-4 h-4 text-gray-500 transition-transform ${
                                  expandedTemplates.has(template.templateId) ? 'rotate-180' : ''
                                }`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              template.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
                            }`}>
                              {template.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <p><strong>Created:</strong> {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Unknown date'}</p>
                            <p><strong>Messages:</strong> {currentFollowUps.messages[template.templateId]?.length || 0}</p>
                            
                            {template.triggerTags && template.triggerTags.length > 0 && (
                              <div>
                                <strong>Trigger Tags:</strong>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {template.triggerTags.map((tag, tagIndex) => (
                                    <span key={tagIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {template.triggerKeywords && template.triggerKeywords.length > 0 && (
                              <div>
                                <strong>Trigger Keywords:</strong>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {template.triggerKeywords.map((keyword, keywordIndex) => (
                                    <span key={keywordIndex} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Messages Section - Expandable */}
                        {expandedTemplates.has(template.templateId) && (
                          <div className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                            <div className="p-4">
                              <h5 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Messages ({currentFollowUps.messages[template.templateId]?.length || 0})
                              </h5>
                              
                              {currentFollowUps.messages[template.templateId] && currentFollowUps.messages[template.templateId].length > 0 ? (
                                <div className="space-y-3">
                                  {currentFollowUps.messages[template.templateId]
                                    .sort((a, b) => a.dayNumber - b.dayNumber || a.sequence - b.sequence)
                                    .map((message, messageIndex) => (
                                    <div key={message.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                            Day {message.dayNumber}, Seq {message.sequence}
                                          </span>
                                        </div>
                                                                          <div className="text-right">
                                    {message.useScheduledTime && message.scheduledTime ? (
                                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                                        {message.scheduledTime}
                                      </span>
                                    ) : message.delayAfter && !message.delayAfter.isInstantaneous ? (
                                      <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                        {message.delayAfter.value} {message.delayAfter.unit} after prev
                                      </span>
                                    ) : (
                                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                        Instant
                                      </span>
                                    )}
                                  </div>
                                      </div>
                                      
                                                                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {message.message}
                                </div>
                                      
                                      {/* Message Metadata */}
                                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                                        {message.addTags && message.addTags.length > 0 && (
                                          <div>
                                            <strong>Add Tags:</strong>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {message.addTags.map((tag, tagIndex) => (
                                                <span key={tagIndex} className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs">
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {message.removeTags && message.removeTags.length > 0 && (
                                          <div>
                                            <strong>Remove Tags:</strong>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {message.removeTags.map((tag, tagIndex) => (
                                                <span key={tagIndex} className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-xs">
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  <p className="text-sm">No messages in this template yet</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        💡 <strong>Tip:</strong> I can help you modify these existing templates, create new ones based on your AI assistant stages, or improve your current follow-up sequences. Just tell me what you'd like to achieve!
                    </p>
                  </div>
                </div>
              </div>
            )}

              {!isLoadingCurrentFollowUps && currentFollowUps.templates.length === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">No Follow-up Templates Found</h3>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You don't have any follow-up templates yet, but I have your AI assistant instructions loaded! I can create follow-up sequences based on your conversation stages.
                    </p>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-4">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          <strong>Try asking:</strong> "Create follow-up templates based on my current prompt stages"
                        </p>
                      </div>
                    <Button
                      onClick={fetchCurrentFollowUps}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            )}

              {/* Show prepared changes */}
              {hasChanges && generatedData && (
                <div className="mt-6 space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Changes Ready to Apply</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                      I've prepared optimizations for your follow-up templates based on your AI assistant context. Click "Apply Changes" to save these changes.
                    </p>
                        <Button
                      onClick={applyChangesToFollowUps}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg"
                    >
                      Apply Changes
                    </Button>
                    </div>
                  
                  {/* Drafted Templates Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h4 className="font-medium text-gray-800 dark:text-white">Drafted Templates ({generatedData.stageTemplates?.length || 0})</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Review the templates before applying</p>
                  </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-600">
                      {generatedData.stageTemplates?.map((template, index) => (
                        <div key={template.templateId} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-800 dark:text-white mb-1">
                                {template.stageName}
                              </h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {template.purpose}
                              </p>
                              
                              {/* Trigger Tags */}
                              {template.triggerTags && template.triggerTags.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Trigger Tags:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.triggerTags.map((tag, tagIndex) => (
                                      <span key={tagIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Trigger Keywords */}
                              {template.triggerKeywords && template.triggerKeywords.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Trigger Keywords:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.triggerKeywords.map((keyword, keywordIndex) => (
                                      <span key={keywordIndex} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right ml-4">
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                {template.messageCount} messages
                              </span>
                          </div>
                      </div>
                          
                          {/* Messages Preview */}
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="text-xs font-medium text-gray-600 dark:text-gray-400">Messages:</h6>
                              <button
                                onClick={() => toggleTemplateExpansion(template.templateId)}
                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                              >
                                {expandedTemplates.has(template.templateId) ? (
                                  <>
                                    <span>Show Less</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    <span>Show All ({template.messages.length})</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </>
                                )}
                              </button>
                            </div>
                            
                            <div className="space-y-2">
                              {template.messages.slice(0, expandedTemplates.has(template.templateId) ? template.messages.length : 3).map((messageObj: any, msgIndex) => {
                                const editKey = `${template.templateId}_${msgIndex}`;
                                const isEditing = editableMessages[editKey] !== undefined;
                                const currentText = isEditing ? editableMessages[editKey] : messageObj.message;
                                
                                return (
                                  <div key={msgIndex} className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 p-3 rounded border">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        #{msgIndex + 1} - Day {messageObj.dayNumber}, Seq {messageObj.sequence}
                                      </span>
                                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                                        {messageObj.delayAfter?.isInstantaneous ? 'Instant' : 
                                         `${messageObj.delayAfter?.value} ${messageObj.delayAfter?.unit}`}
                                      </span>
                                </div>
                                    
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                      {messageObj.description}
                                    </div>
                                    
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={currentText}
                                          onChange={(e) => handleMessageEdit(template.templateId, msgIndex, e.target.value)}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                          rows={3}
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => saveMessageEdit(template.templateId, msgIndex)}
                                            className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => cancelMessageEdit(template.templateId, msgIndex)}
                                            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="text-sm whitespace-pre-wrap">
                                            {messageObj.message}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleMessageEdit(template.templateId, msgIndex, messageObj.message)}
                                          className="ml-3 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex-shrink-0"
                                        >
                                          Edit
                                        </button>
                    </div>
                  )}
                      </div>
                                );
                              })}
                              
                              {!expandedTemplates.has(template.templateId) && template.messages.length > 3 && (
                                <div className="text-center">
                                  <button
                                    onClick={() => toggleTemplateExpansion(template.templateId)}
                                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-2 rounded-lg border border-blue-300 hover:border-blue-400 transition-colors"
                                  >
                                    Show {template.messages.length - 3} More Messages
                                  </button>
                                </div>
                              )}
                            </div>
                    </div>
                  </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Clear History Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Clear Chat History?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to clear the current chat thread? All messages and generated templates will be permanently deleted.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={clearCurrentThread}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white"
              >
                Clear History
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIFollowupBuilder;
