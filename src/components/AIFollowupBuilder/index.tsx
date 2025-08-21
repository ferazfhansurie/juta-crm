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
}

interface StageTemplateData {
  stageName: string;
  purpose: string;
  triggerTags: string[];
  triggerKeywords: string[];
  messages: string[];
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
  const [isApplying, setIsApplying] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // New state for current follow-up data
  const [currentFollowUps, setCurrentFollowUps] = useState<{
    templates: CurrentFollowUpTemplate[];
    messages: { [templateId: string]: CurrentFollowUpMessage[] };
  }>({ templates: [], messages: {} });
  const [isLoadingCurrentFollowUps, setIsLoadingCurrentFollowUps] = useState(false);
  
  // New state for expanded templates
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Fetch current follow-up templates and messages on component mount
  useEffect(() => {
    fetchCurrentFollowUps();
  }, []);

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

      // Add initial AI message showing current follow-ups
      if (templates.length > 0) {
        const initialMessage: ChatMessage = {
          from_me: false,
          type: 'text',
          text: `I can see you currently have ${templates.length} follow-up template(s) in your system:\n\n${templates.map((template: CurrentFollowUpTemplate, index: number) => 
            `${index + 1}. **${template.name}** (${template.status})\n   - Created: ${new Date(template.createdAt).toLocaleDateString()}\n   - Messages: ${messagesData[template.templateId]?.length || 0}\n   - Trigger Tags: ${template.triggerTags?.join(', ') || 'None'}\n   - Trigger Keywords: ${template.triggerKeywords?.join(', ') || 'None'}`
          ).join('\n\n')}\n\nI can help you:\n• Modify existing templates\n• Create new templates\n• Adjust message sequences\n• Update trigger conditions\n\nWhat would you like me to help you with?`,
          createdAt: new Date().toISOString(),
        };
        setMessages([initialMessage]);
      }

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
        throw new Error("User not authenticated");
      }
  
      // Prepare current follow-up data to send to AI
      const currentFollowUpData = {
        templates: currentFollowUps.templates,
        messages: currentFollowUps.messages,
        totalTemplates: currentFollowUps.templates.length,
        totalMessages: Object.values(currentFollowUps.messages).reduce((sum, msgs) => sum + msgs.length, 0)
      };
  
      const response = await axios.post(
        'https://juta-dev.ngrok.dev/api/generate-followup-messages/',
        {
          message: messageText,
          email: userEmail,
          currentFollowUps: currentFollowUpData // Send current follow-up data to AI
        }
      );
      
      if (!response.data.success) {
        throw new Error(response.data.details || 'Failed to generate follow-up messages');
      }
  
      const { workflowStages, stageTemplates } = response.data.data;
      
      // Store the generated data
      setGeneratedData({
        workflowStages,
        stageTemplates
      });
      
      // Move to step 2
      setCurrentStep(2);
      
      // Create AI response message
      const aiResponse = `I've analyzed your current follow-up templates and generated an updated sequence with ${stageTemplates?.length || 0} stages:\n\n${workflowStages}\n\n${stageTemplates?.map((stage: StageTemplateData) => `• ${stage.stageName}: ${stage.purpose} (${stage.messageCount} messages)`).join('\n')}\n\nThis sequence takes into account your existing templates and optimizes them based on your requirements.`;
      
      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: aiResponse,
        createdAt: new Date().toISOString(),
      };
      
      // Remove loading message and add the real response
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
        return [assistantResponse, ...filteredMessages];
      });
  
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to generate follow-up messages. Please try again.");
      setMessages(prevMessages => prevMessages.filter(msg => !msg.isLoading));
    } finally {
      setIsSending(false);
    }
  };

  const applyMessages = async () => {
    if (!generatedData?.stageTemplates || !Array.isArray(generatedData.stageTemplates) || generatedData.stageTemplates.length === 0) {
      toast.error("No stage templates available");
      return;
    }

    setIsApplying(true);
    setError(null);

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

      // Auto-generate template name based on the first stage
      const autoTemplateName = generatedData.stageTemplates[0]?.stageName || "AI Generated Follow-up";
      
      // Extract all unique trigger tags and keywords from all stages
      const allTriggerTags = new Set<string>();
      const allTriggerKeywords = new Set<string>();
      
      generatedData.stageTemplates.forEach((stage: StageTemplateData) => {
        if (stage.triggerTags && Array.isArray(stage.triggerTags)) {
          stage.triggerTags.forEach(tag => allTriggerTags.add(tag));
        }
        if (stage.triggerKeywords && Array.isArray(stage.triggerKeywords)) {
          stage.triggerKeywords.forEach(keyword => allTriggerKeywords.add(keyword));
        }
      });

      // Call the apply follow-up messages API
      const response = await axios.post(
        `https://juta-dev.ngrok.dev/api/apply-followup-messages/?email=${encodeURIComponent(userEmail)}`,
        {
          companyId: companyId,
          templateName: autoTemplateName,
          workflowStages: generatedData.workflowStages,
          stageTemplates: generatedData.stageTemplates,
          triggerTags: Array.from(allTriggerTags),
          triggerKeywords: Array.from(allTriggerKeywords)
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.details || "Failed to apply follow-up messages");
      }

      const templateStructure = response.data.data;
      setGeneratedData(prev => ({ ...prev, templateStructure }));
      setCurrentStep(3);

      toast.success("Follow-up messages applied successfully!");

    } catch (error) {
      console.error("Error applying messages:", error);
      setError("Failed to apply follow-up messages. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const createTemplate = async () => {
    if (!generatedData?.templateStructure) {
      toast.error("No template structure available");
      return;
    }

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

      // Auto-generate template name based on the first stage
      const autoTemplateName = generatedData.stageTemplates?.[0]?.stageName || "AI Generated Follow-up";
      
      // Extract all unique trigger tags and keywords from all stages
      const allTriggerTags = new Set<string>();
      const allTriggerKeywords = new Set<string>();
      
      if (generatedData.stageTemplates && Array.isArray(generatedData.stageTemplates)) {
        generatedData.stageTemplates.forEach((stage: StageTemplateData) => {
          if (stage.triggerTags && Array.isArray(stage.triggerTags)) {
            stage.triggerTags.forEach(tag => allTriggerTags.add(tag));
          }
          if (stage.triggerKeywords && Array.isArray(stage.triggerKeywords)) {
            stage.triggerKeywords.forEach(keyword => allTriggerKeywords.add(keyword));
          }
        });
      }

      // Call the create AI follow-up template API
      const response = await axios.post(
        "https://juta-dev.ngrok.dev/api/create-ai-followup-template/",
        {
          companyId: companyId,
          templateName: autoTemplateName,
          workflowStages: generatedData.workflowStages,
          stageTemplates: generatedData.stageTemplates,
          triggerTags: Array.from(allTriggerTags),
          triggerKeywords: Array.from(allTriggerKeywords)
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.details || "Failed to create template");
      }

      // Handle multiple stage templates response
      const { createdTemplates, totalStages, originalTemplateName }: CreateTemplateResponse = response.data.data;
      
      // Store the created templates data for display
      setGeneratedData(prev => ({
        ...prev,
        createdTemplates,
        totalStages,
        originalTemplateName
      }));
      
      // Set current step to success
      setCurrentStep(4);
      
      // Show success message with template count
      toast.success(`✅ Successfully created ${totalStages} stage templates for "${originalTemplateName}"`);
      
      // Call the parent callback to apply the messages with the new template structure
      onApplyMessages(
        generatedData.stageTemplates || [],
        originalTemplateName,
        Array.from(allTriggerTags),
        Array.from(allTriggerKeywords)
      );
      
      // Add success message to chat
      const successMessage: ChatMessage = {
        from_me: false,
        type: "text",
        text: `🎉 Successfully created ${totalStages} stage templates!\n\n${createdTemplates.map((template: StageTemplate) => 
          `• ${template.templateName} (${template.messageCount} messages)\n  Stage: ${template.stageName}${template.purpose ? `\n  Purpose: ${template.purpose}` : ''}`
        ).join('\n\n')}\n\nEach stage template has been created and is ready to use.`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [successMessage, ...prevMessages]);

    } catch (error) {
      console.error("Error creating template:", error);
      setError("Failed to create template. Please try again.");
    }
  };

  // New function to update existing templates
  const updateExistingTemplates = async () => {
    if (!generatedData?.stageTemplates || !Array.isArray(generatedData.stageTemplates) || generatedData.stageTemplates.length === 0) {
      toast.error("No stage templates available for update");
      return;
    }

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

      // Update existing templates with new data
      const updatePromises = currentFollowUps.templates.map(async (template) => {
        try {
          const response = await axios.put(
            `https://juta-dev.ngrok.dev/api/followup-templates/${template.templateId}`,
            {
              companyId: companyId,
              name: template.name,
              status: template.status,
              triggerTags: generatedData.stageTemplates?.[0]?.triggerTags || template.triggerTags,
              triggerKeywords: generatedData.stageTemplates?.[0]?.triggerKeywords || template.triggerKeywords
            }
          );
          return { success: true, templateId: template.templateId };
        } catch (error) {
          console.error(`Error updating template ${template.templateId}:`, error);
          return { success: false, templateId: template.templateId, error };
        }
      });

      const results = await Promise.all(updatePromises);
      const successfulUpdates = results.filter(r => r.success).length;
      const failedUpdates = results.filter(r => !r.success).length;

      if (successfulUpdates > 0) {
        toast.success(`✅ Successfully updated ${successfulUpdates} template(s)`);
        if (failedUpdates > 0) {
          toast.warning(`⚠️ Failed to update ${failedUpdates} template(s)`);
        }
        
        // Refresh current follow-up data
        await fetchCurrentFollowUps();
        
        // Move to success step
        setCurrentStep(4);
        
        // Add success message to chat
        const successMessage: ChatMessage = {
          from_me: false,
          type: "text",
          text: `🎉 Successfully updated ${successfulUpdates} existing template(s)!\n\n${failedUpdates > 0 ? `Note: ${failedUpdates} template(s) could not be updated.` : ''}\n\nYour follow-up sequences have been optimized based on your requirements.`,
          createdAt: new Date().toISOString(),
        };
        
        setMessages(prevMessages => [successMessage, ...prevMessages]);
      } else {
        throw new Error("Failed to update any templates");
      }

    } catch (error) {
      console.error("Error updating templates:", error);
      setError("Failed to update existing templates. Please try again.");
    }
  };

  // New function to analyze and optimize individual messages
  const analyzeAndOptimizeMessages = async () => {
    if (!currentFollowUps.templates.length) {
      toast.error("No templates available for message analysis");
      return;
    }

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Prepare message data for AI analysis
      const messageAnalysisData = {
        templates: currentFollowUps.templates.map(template => ({
          ...template,
          messages: currentFollowUps.messages[template.templateId] || []
        })),
        analysisRequest: "Please analyze and optimize each message for better conversion rates, engagement, and follow-up effectiveness"
      };

      // Call AI API for message-level analysis
      const response = await axios.post(
        'https://juta-dev.ngrok.dev/api/analyze-followup-messages/',
        {
          message: "Please analyze and optimize the individual messages in my follow-up templates for better conversion and engagement",
          email: userEmail,
          messageData: messageAnalysisData
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.details || 'Failed to analyze messages');
      }

      const { messageOptimizations, overallMessageAnalysis } = response.data.data;
      
      // Update generated data with message optimizations
      setGeneratedData(prev => ({
        ...prev,
        messageOptimizations,
        overallMessageAnalysis
      }));

      // Move to step 2 to show message optimizations
      setCurrentStep(2);

      // Add AI response about message analysis
      const analysisMessage: ChatMessage = {
        from_me: false,
        type: 'text',
        text: `I've analyzed ${overallMessageAnalysis?.totalMessages || 0} messages across your templates and found ${overallMessageAnalysis?.messagesOptimized || 0} that could be optimized for better results.\n\nKey improvements identified:\n${overallMessageAnalysis?.keyImprovements?.map((imp: string) => `• ${imp}`).join('\n') || '• Message timing and sequencing\n• Call-to-action effectiveness\n• Personalization opportunities\n• Conversion optimization'}\n\nCheck the right panel to review specific message improvements.`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [analysisMessage, ...prevMessages]);

    } catch (error) {
      console.error("Error analyzing messages:", error);
      setError("Failed to analyze messages. Please try again.");
    }
  };

  // New function to apply message-level updates
  const applyMessageUpdates = async () => {
    if (!generatedData?.messageOptimizations) {
      toast.error("No message optimizations available");
      return;
    }

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Apply message updates to each template
      const updatePromises = generatedData.messageOptimizations.map(async (templateOptimization) => {
        const messageUpdates = templateOptimization.messageUpdates.map(async (messageUpdate) => {
          try {
            const response = await axios.put(
              `https://juta-dev.ngrok.dev/api/followup-templates/${templateOptimization.templateId}/messages/${messageUpdate.messageId}`,
              {
                message: messageUpdate.suggestedMessage,
                optimized: true,
                optimizationReason: messageUpdate.reason,
                improvements: messageUpdate.improvements
              }
            );
            return { success: true, messageId: messageUpdate.messageId };
          } catch (error) {
            console.error(`Error updating message ${messageUpdate.messageId}:`, error);
            return { success: false, messageId: messageUpdate.messageId, error };
          }
        });

        return Promise.all(messageUpdates);
      });

      const allResults = await Promise.all(updatePromises);
      const flatResults = allResults.flat();
      const successfulUpdates = flatResults.filter(r => r.success).length;
      const failedUpdates = flatResults.filter(r => !r.success).length;

      if (successfulUpdates > 0) {
        toast.success(`✅ Successfully optimized ${successfulUpdates} message(s)`);
        if (failedUpdates > 0) {
          toast.warning(`⚠️ Failed to optimize ${failedUpdates} message(s)`);
        }
        
        // Refresh current follow-up data
        await fetchCurrentFollowUps();
        
        // Move to success step
        setCurrentStep(4);
        
        // Add success message to chat
        const successMessage: ChatMessage = {
          from_me: false,
          type: "text",
          text: `🎉 Successfully optimized ${successfulUpdates} message(s)!\n\n${failedUpdates > 0 ? `Note: ${failedUpdates} message(s) could not be updated.` : ''}\n\nYour follow-up messages have been enhanced for better conversion and engagement.`,
          createdAt: new Date().toISOString(),
        };
        
        setMessages(prevMessages => [successMessage, ...prevMessages]);
      } else {
        throw new Error("Failed to update any messages");
      }

    } catch (error) {
      console.error("Error updating messages:", error);
      setError("Failed to update messages. Please try again.");
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
              <p className="text-gray-600 dark:text-gray-400">Create effective follow-up sequences with AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Analyze & Chat</span>
            <span>Review & Configure</span>
            <span>Apply Messages</span>
            <span>Success</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Chat Section */}
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 ai-followup-builder-scroll" style={{ minHeight: 0 }}>
                {messages.length === 0 && isLoadingCurrentFollowUps && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Loading Your Follow-up Data...</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-lg text-base">
                      I'm analyzing your current follow-up templates and messages to provide personalized assistance.
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
                      I'll analyze your current follow-up templates and help you improve or create new ones based on your requirements.
                    </p>
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
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.text}</div>
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
                    placeholder="Describe what you'd like me to help you with regarding your follow-up templates..."
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
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 ai-followup-builder-scroll" style={{ minHeight: 0 }}>
            {/* Current Follow-ups Overview */}
            {currentStep === 1 && isLoadingCurrentFollowUps && (
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

            {currentStep === 1 && !isLoadingCurrentFollowUps && currentFollowUps.templates.length > 0 && (
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
                            <p><strong>Created:</strong> {new Date(template.createdAt).toLocaleDateString()}</p>
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
                      💡 <strong>Tip:</strong> I can help you modify these existing templates, create new ones, or improve your current follow-up sequences. Just tell me what you'd like to achieve!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && !isLoadingCurrentFollowUps && currentFollowUps.templates.length === 0 && (
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
                      You don't have any follow-up templates yet. I can help you create your first one!
                    </p>
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

            {currentStep >= 2 && generatedData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Template Configuration</h3>
                  
                  {/* Current vs New Template Comparison */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Template Analysis & Updates</h4>
                    
                    {/* Current Templates Summary */}
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <h5 className="font-medium text-gray-800 dark:text-white mb-2">Current Templates Summary</h5>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p><strong>Total Templates:</strong> {currentFollowUps.templates.length}</p>
                        <p><strong>Total Messages:</strong> {Object.values(currentFollowUps.messages).reduce((sum, msgs) => sum + msgs.length, 0)}</p>
                        <p><strong>Active Templates:</strong> {currentFollowUps.templates.filter(t => t.status === 'active').length}</p>
                      </div>
                    </div>
                    
                    {/* AI-Generated Template Information */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                        The AI has analyzed your current templates and generated an optimized configuration based on your requirements:
                      </p>
                      
                      {generatedData.stageTemplates && Array.isArray(generatedData.stageTemplates) ? (
                        <div className="space-y-4">
                          {generatedData.stageTemplates.map((stage: StageTemplateData, index: number) => (
                            <div key={index} className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-blue-200 dark:border-blue-600">
                              <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                                Stage {index + 1}: {stage.stageName}
                              </h5>
                              <div className="space-y-2 text-sm">
                                <p><strong>Purpose:</strong> {stage.purpose}</p>
                                <p><strong>Messages:</strong> {stage.messageCount}</p>
                                
                                {/* Trigger Tags */}
                                {stage.triggerTags && stage.triggerTags.length > 0 && (
                                  <div>
                                    <strong>Trigger Tags:</strong>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {stage.triggerTags.map((tag, tagIndex) => (
                                        <span key={tagIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Trigger Keywords */}
                                {stage.triggerKeywords && stage.triggerKeywords.length > 0 && (
                                  <div>
                                    <strong>Trigger Keywords:</strong>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {stage.triggerKeywords.map((keyword, keywordIndex) => (
                                        <span key={keywordIndex} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                          {keyword}
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
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          No stage templates generated yet. Please wait for the AI to complete the generation.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Generated Content Preview */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Generated Content</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Workflow Stages:</strong>
                        <div className="mt-2 whitespace-pre-wrap">{generatedData.workflowStages || "Not specified"}</div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                        <strong>Generated Stage Templates:</strong>
                        <div className="mt-2 whitespace-pre-wrap">
                          {generatedData.stageTemplates && Array.isArray(generatedData.stageTemplates) ? generatedData.stageTemplates.map((stage: StageTemplateData) => 
                            `• ${stage.stageName}: ${stage.purpose} (${stage.messageCount} messages)`
                          ).join('\n') : "No stage templates generated"}
                        </div>
                      </div>
                    </div>
                  </div>

                      {/* AI Suggestions Summary */}
                      <div className="mb-6">
                        <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">AI Recommendations</h4>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                            <p><strong>🎯 Key Improvements Suggested:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              {currentFollowUps.templates.length > 0 && (
                                <li>Optimize existing template sequences based on your requirements</li>
                              )}
                              <li>Enhance trigger conditions for better lead qualification</li>
                              <li>Improve message timing and sequencing</li>
                              <li>Add new stages if needed for better conversion flow</li>
                            </ul>
                            <p className="mt-3 text-xs">
                              <strong>Note:</strong> The AI has analyzed your current templates and suggested optimizations. You can choose to update existing templates or create new ones.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Message Optimizations */}
                      {generatedData.messageOptimizations && generatedData.messageOptimizations.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Message-Level Optimizations</h4>
                          
                          {/* Overall Message Analysis */}
                          {generatedData.overallMessageAnalysis && (
                            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Message Analysis Summary</h5>
                              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                                <p><strong>Total Messages Analyzed:</strong> {generatedData.overallMessageAnalysis.totalMessages}</p>
                                <p><strong>Messages Optimized:</strong> {generatedData.overallMessageAnalysis.messagesOptimized}</p>
                                <p><strong>Conversion Potential:</strong> {generatedData.overallMessageAnalysis.conversionPotential}</p>
                              </div>
                            </div>
                          )}

                          {/* Individual Template Message Optimizations */}
                          <div className="space-y-4">
                            {generatedData.messageOptimizations.map((templateOptimization, templateIndex) => (
                              <div key={templateIndex} className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                <h5 className="font-medium text-gray-800 dark:text-white mb-3">
                                  {templateOptimization.templateName}
                                </h5>
                                
                                <div className="space-y-3">
                                  {templateOptimization.messageUpdates.map((messageUpdate, messageIndex) => (
                                    <div key={messageIndex} className="border-l-4 border-blue-500 pl-4">
                                      <div className="text-sm space-y-2">
                                        <div>
                                          <strong className="text-gray-700 dark:text-gray-300">Current Message:</strong>
                                          <p className="text-gray-600 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                            {messageUpdate.currentMessage}
                                          </p>
                                        </div>
                                        
                                        <div>
                                          <strong className="text-green-700 dark:text-green-300">Optimized Message:</strong>
                                          <p className="text-gray-600 dark:text-gray-400 mt-1 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                                            {messageUpdate.suggestedMessage}
                                          </p>
                                        </div>
                                        
                                        <div>
                                          <strong className="text-blue-700 dark:text-blue-300">Improvements:</strong>
                                          <ul className="list-disc list-inside mt-1 text-gray-600 dark:text-gray-400">
                                            {messageUpdate.improvements.map((improvement, impIndex) => (
                                              <li key={impIndex}>{improvement}</li>
                                            ))}
                                          </ul>
                                        </div>
                                        
                                        <div>
                                          <strong className="text-purple-700 dark:text-purple-300">Reason:</strong>
                                          <p className="text-gray-600 dark:text-gray-400 mt-1 italic">
                                            {messageUpdate.reason}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Choose how you want to proceed:</p>
                    </div>
                    <div className="flex gap-3">
                      {generatedData.messageOptimizations && generatedData.messageOptimizations.length > 0 && (
                        <Button
                          onClick={applyMessageUpdates}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 text-base"
                        >
                          Apply Message Updates
                        </Button>
                      )}
                      {currentFollowUps.templates.length > 0 && (
                        <Button
                          onClick={updateExistingTemplates}
                          disabled={!generatedData.stageTemplates || !Array.isArray(generatedData.stageTemplates) || generatedData.stageTemplates.length === 0}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-base"
                        >
                          Update Existing
                        </Button>
                      )}
                    <Button
                      onClick={applyMessages}
                      disabled={!generatedData.stageTemplates || !Array.isArray(generatedData.stageTemplates) || generatedData.stageTemplates.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base"
                    >
                        {isApplying ? "Applying..." : "Create New"}
                    </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Apply Messages */}
            {currentStep >= 3 && generatedData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Apply Messages</h3>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-6">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✅ Messages have been applied successfully! Now you can create the template.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={createTemplate}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base"
                    >
                      Create Template
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {currentStep >= 4 && generatedData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Success!</h3>
                  
                  {/* Success Summary */}
                  <div className="mb-6">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                        ✅ {generatedData.createdTemplates ? 
                          `Successfully created ${generatedData.totalStages || generatedData.createdTemplates?.length || 0} stage templates for "${generatedData.originalTemplateName || generatedData.stageTemplates?.[0]?.stageName || 'AI Generated Follow-up'}"` :
                          `Successfully updated your existing follow-up templates with AI optimizations!`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Created Templates Details */}
                  {generatedData.createdTemplates && Array.isArray(generatedData.createdTemplates) && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Created Templates</h4>
                      <div className="space-y-3">
                        {generatedData.createdTemplates.map((template: StageTemplate, index: number) => (
                          <div key={index} className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                            <h5 className="font-medium text-gray-800 dark:text-white mb-2">
                              {template.templateName}
                            </h5>
                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                              <p><strong>Stage:</strong> {template.stageName}</p>
                              <p><strong>Messages:</strong> {template.messageCount}</p>
                              {template.purpose && <p><strong>Purpose:</strong> {template.purpose}</p>}
                              
                              {/* Trigger Tags */}
                              {template.triggerTags && Array.isArray(template.triggerTags) && template.triggerTags.length > 0 && (
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
                              
                              {/* Trigger Keywords */}
                              {template.triggerKeywords && Array.isArray(template.triggerKeywords) && template.triggerKeywords.length > 0 && (
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
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary of Changes */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Summary of Changes</h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                        <p><strong>🎯 What was accomplished:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          {generatedData.messageOptimizations && generatedData.messageOptimizations.length > 0 && (
                            <>
                              <li>Optimized {generatedData.overallMessageAnalysis?.messagesOptimized || 0} individual messages for better conversion</li>
                              <li>Enhanced message content and engagement</li>
                              <li>Improved call-to-action effectiveness</li>
                            </>
                          )}
                          {generatedData.createdTemplates ? (
                            <>
                              <li>Created {generatedData.totalStages || generatedData.createdTemplates?.length || 0} new stage templates</li>
                              <li>Optimized trigger conditions and keywords</li>
                              <li>Established a structured follow-up workflow</li>
                            </>
                          ) : (
                            <>
                              <li>Updated existing template configurations</li>
                              <li>Optimized trigger conditions and keywords</li>
                              <li>Improved message sequencing and timing</li>
                            </>
                          )}
                        </ul>
                        <p className="mt-3 text-xs">
                          <strong>Next Steps:</strong> Your follow-up templates and messages are now optimized and ready to use. You can monitor their performance and make further adjustments as needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={onClose}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 text-base"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFollowupBuilder;
