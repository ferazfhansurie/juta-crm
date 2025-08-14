import React, { useState } from "react";
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
  
      const response = await axios.post(
        'https://juta-dev.ngrok.dev/api/generate-followup-messages/',
        {
          message: messageText,
          email: userEmail
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
      const aiResponse = `I've generated a follow-up sequence with ${stageTemplates?.length || 0} stages:\n\n${workflowStages}\n\n${stageTemplates?.map((stage: StageTemplateData) => `• ${stage.stageName}: ${stage.purpose} (${stage.messageCount} messages)`).join('\n')}`;
      
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

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        sendMessageToAI(newMessage);
        setNewMessage('');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[1200px] max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
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
            <span>Chat with AI</span>
            <span>Review & Configure</span>
            <span>Apply Messages</span>
            <span>Success</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat Section */}
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
            <div className="h-full flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Welcome to AI Follow-up Builder!</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-lg text-base">
                      I already know about your current AI prompt and business context. Just chat with me to create effective follow-up message sequences.
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
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-3">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleSendMessage}
                    placeholder="Describe what kind of follow-up sequence you want to create..."
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
          <div className="w-1/2 p-6 overflow-y-auto">
            {currentStep >= 2 && generatedData && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Template Configuration</h3>
                  
                  {/* AI-Generated Template Information */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">AI-Generated Template Details</h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                        The AI has automatically generated the following template configuration based on your requirements:
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

                  {/* Action Buttons */}
                  <div className="flex justify-end">
                    <Button
                      onClick={applyMessages}
                      disabled={!generatedData.stageTemplates || !Array.isArray(generatedData.stageTemplates) || generatedData.stageTemplates.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base"
                    >
                      {isApplying ? "Applying..." : "Apply Messages"}
                    </Button>
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
                        ✅ Successfully created {generatedData.totalStages || generatedData.createdTemplates?.length || 0} stage templates for "{generatedData.originalTemplateName || generatedData.stageTemplates?.[0]?.stageName || 'AI Generated Follow-up'}"
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
  );
};

export default AIFollowupBuilder;
