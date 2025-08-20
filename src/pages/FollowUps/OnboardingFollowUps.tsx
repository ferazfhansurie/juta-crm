import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logoUrl from "@/assets/images/logo.png";
import logoUrl2 from "@/assets/images/logo3.png";

interface FollowUpTemplate {
  id: string;
  templateId: string;
  name: string;
  status: "active" | "inactive";
  createdAt: Date;
  startTime: Date;
  isCustomStartTime: boolean;
  triggerTags?: string[];
  triggerKeywords?: string[];
  batchSettings: BatchSettings;
}

interface FollowUpMessage {
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
  addTags?: string[];
  removeTags?: string[];
}

interface TimeInterval {
  value: number;
  unit: "minutes" | "hours" | "days";
  label: string;
}

interface BatchSettings {
  startDateTime: string;
  contactsPerBatch: number;
  repeatEvery: {
    value: number;
    unit: "minutes";
  };
  messageDelay: {
    min: number;
    max: number;
    unit: "seconds" | "minutes";
  };
  sleepSettings: {
    enabled: boolean;
    activeHours: {
      start: string;
      end: string;
    };
  };
  isNeverending: boolean;
}

const TIME_INTERVALS: TimeInterval[] = [
  { value: 1, unit: "minutes", label: "1 minute" },
  { value: 5, unit: "minutes", label: "5 minutes" },
  { value: 10, unit: "minutes", label: "10 minutes" },
  { value: 15, unit: "minutes", label: "15 minutes" },
  { value: 30, unit: "minutes", label: "30 minutes" },
  { value: 45, unit: "minutes", label: "45 minutes" },
  { value: 1, unit: "hours", label: "1 hour" },
  { value: 2, unit: "hours", label: "2 hours" },
  { value: 3, unit: "hours", label: "3 hours" },
  { value: 4, unit: "hours", label: "4 hours" },
  { value: 6, unit: "hours", label: "6 hours" },
  { value: 8, unit: "hours", label: "8 hours" },
  { value: 12, unit: "hours", label: "12 hours" },
  { value: 24, unit: "hours", label: "1 day" },
  { value: 48, unit: "hours", label: "2 days" },
  { value: 72, unit: "hours", label: "3 days" },
  { value: 96, unit: "hours", label: "4 days" },
  { value: 120, unit: "hours", label: "5 days" },
  { value: 144, unit: "hours", label: "6 days" },
  { value: 168, unit: "hours", label: "1 week" },
  { value: 336, unit: "hours", label: "2 weeks" },
  { value: 504, unit: "hours", label: "3 weeks" },
  { value: 720, unit: "hours", label: "1 month" },
];

const OnboardingFollowUps: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [messages, setMessages] = useState<FollowUpMessage[]>([]);
  const [templateName, setTemplateName] = useState("Welcome Sequence");
  const [newMessage, setNewMessage] = useState({
    message: "",
    dayNumber: 1,
    sequence: 1,
    status: "active" as const,
    delayAfter: {
      value: 1,
      unit: "days" as "minutes" | "hours" | "days",
      isInstantaneous: false,
    },
    specificNumbers: {
      enabled: false,
      numbers: [],
    },
    useScheduledTime: false,
    scheduledTime: "09:00",
    addTags: [],
    removeTags: [],
  });

  const [timingSettings, setTimingSettings] = useState({
    firstMessage: "immediate" as "immediate" | "delayed" | "custom",
    followUpInterval: { value: 1, unit: "days" as "minutes" | "hours" | "days" },
    customStartTime: new Date().toISOString().slice(0, 16),
    activeHours: { start: "09:00", end: "17:00" },
    sleepEnabled: false,
  });

  const [batchSettings, setBatchSettings] = useState<BatchSettings>({
    startDateTime: new Date().toISOString().slice(0, 16),
    contactsPerBatch: 10,
    repeatEvery: { value: 0, unit: "minutes" },
    messageDelay: { min: 1, max: 2, unit: "seconds" },
    sleepSettings: { enabled: false, activeHours: { start: "09:00", end: "17:00" } },
    isNeverending: false,
  });

  const [keywords, setKeywords] = useState<string[]>(["interested", "pricing", "demo", "trial"]);
  const [newKeyword, setNewKeyword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  const navigate = useNavigate();

  const steps = [
    { id: 1, title: "Welcome", icon: "🎯" },
    { id: 2, title: "Create Template", icon: "📝" },
    { id: 3, title: "Add Messages", icon: "💬" },
    { id: 4, title: "Set Timing", icon: "⏰" },
    { id: 5, title: "Keywords", icon: "🔑" },
    { id: 6, title: "Launch", icon: "🚀" }
  ];

  const sampleMessages = [
    {
      id: "1",
      message: "Hi {{firstName}}! Thanks for your interest. How can I help you get started?",
      dayNumber: 1,
      sequence: 1,
      status: "active" as const,
      delayAfter: { value: 0, unit: "minutes" as const, isInstantaneous: true },
      specificNumbers: { enabled: false, numbers: [] },
      useScheduledTime: false,
      scheduledTime: "09:00",
      addTags: [],
      removeTags: [],
      createdAt: new Date()
    },
    {
      id: "2",
      message: "Hey {{firstName}}! Just checking in about our proposal. Any questions?",
      dayNumber: 3,
      sequence: 2,
      status: "active" as const,
      delayAfter: { value: 2, unit: "days" as const, isInstantaneous: false },
      specificNumbers: { enabled: false, numbers: [] },
      useScheduledTime: false,
      scheduledTime: "10:00",
      addTags: [],
      removeTags: [],
      createdAt: new Date()
    }
  ];

  useEffect(() => {
    setMessages(sampleMessages);
    fetchUserPrompt();
  }, []);

  const fetchUserPrompt = async () => {
    setIsLoadingPrompt(true);
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.log("No user email found");
        return;
      }

      // First get the company ID
      const userResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(userEmail)}`
      );
      
      if (!userResponse.data?.userData?.companyId) {
        console.log("No company ID found");
        return;
      }

      const companyId = userResponse.data.userData.companyId;
      
      // Get company config to find assistant ID
      const configResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/company-config/${companyId}`
      );
      
      if (!configResponse.data?.openaiApiKey) {
        console.log("No API key found");
        return;
      }

      // Get assistant info from OpenAI
      const assistantIds = userResponse.data.companyData?.assistants_ids || [];
      if (assistantIds.length === 0) {
        console.log("No assistant IDs found");
        return;
      }

      const assistantId = Array.isArray(assistantIds) ? assistantIds[0] : assistantIds;
      
      const openaiResponse = await axios.get(
        `https://api.openai.com/v1/assistants/${assistantId}`,
        {
          headers: {
            'Authorization': `Bearer ${configResponse.data.openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        }
      );

      if (openaiResponse.data?.instructions) {
        setUserPrompt(openaiResponse.data.instructions);
      }
    } catch (error) {
      console.error("Error fetching user prompt:", error);
    } finally {
      setIsLoadingPrompt(false);
    }
  };



  const handleAddMessage = () => {
    if (!newMessage.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const message: FollowUpMessage = {
      id: Date.now().toString(),
      ...newMessage,
      sequence: messages.length + 1,
      createdAt: new Date()
    };

    setMessages([...messages, message]);
    setNewMessage({
      message: "",
      dayNumber: newMessage.dayNumber + 1,
      sequence: messages.length + 2,
      status: "active",
      delayAfter: { value: 1, unit: "days", isInstantaneous: false },
      specificNumbers: { enabled: false, numbers: [] },
      useScheduledTime: false,
      scheduledTime: "09:00",
      addTags: [],
      removeTags: [],
    });
    toast.success("Message added");
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(messages.filter(msg => msg.id !== id));
    toast.success("Message removed");
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const createTemplateAndMessages = async () => {
    if (isCreating) {
      toast.warning("Template creation already in progress...");
      return;
    }

    setIsCreating(true);
    
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("User not authenticated");
        setIsCreating(false);
        return;
      }

      // Get company ID
      const userResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(userEmail)}`
      );
      
      if (!userResponse.data || !userResponse.data.userData || !userResponse.data.userData.companyId) {
        console.error("Invalid user response:", userResponse.data);
        throw new Error("Failed to get company information");
      }
      
      const companyId = userResponse.data.userData.companyId;

      // Create template
      const templateData = {
        companyId,
        name: templateName,
        status: "active",
        createdAt: new Date().toISOString(),
        startTime: timingSettings.firstMessage === "custom" 
          ? new Date(timingSettings.customStartTime).toISOString()
          : new Date().toISOString(),
        isCustomStartTime: timingSettings.firstMessage === "custom",
        trigger_tags: [],
        trigger_keywords: keywords, // Include the keywords from the keywords step
        batchSettings: {
          ...batchSettings,
          sleepSettings: {
            ...batchSettings.sleepSettings,
            activeHours: timingSettings.activeHours
          }
        },
      };

      const templateResponse = await axios.post(
        "https://juta-dev.ngrok.dev/api/followup-templates",
        templateData
      );

      console.log("Template response:", templateResponse.data); // Debug log

      if (!templateResponse.data.success) {
        throw new Error("Failed to create template");
      }

      // Handle different possible response structures
      let templateId;
      console.log("Full template response:", JSON.stringify(templateResponse.data, null, 2));
      
      // The API expects templateId, not the internal database id
      if (templateResponse.data.template && templateResponse.data.template.templateId) {
        templateId = templateResponse.data.template.templateId;
      } else if (templateResponse.data.templateId) {
        templateId = templateResponse.data.templateId;
      } else if (templateResponse.data.data && templateResponse.data.data.templateId) {
        templateId = templateResponse.data.data.templateId;
      } else if (templateResponse.data.data && templateResponse.data.data.id) {
        templateId = templateResponse.data.data.id;
      } else if (templateResponse.data.id) {
        templateId = templateResponse.data.id;
      } else {
        console.error("Unexpected template response structure:", templateResponse.data);
        throw new Error("Template created but no ID returned");
      }
      
      console.log("Using template ID:", templateId);

      // Add messages to template
      let messageCount = 0;
      for (const message of messages) {
        try {
          const messageData = {
            templateId,
            message: message.message,
            dayNumber: message.dayNumber,
            sequence: message.sequence,
            status: "active",
            createdAt: new Date().toISOString(),
            delayAfter: message.delayAfter,
            specificNumbers: message.specificNumbers,
            useScheduledTime: message.useScheduledTime,
            scheduledTime: message.scheduledTime,
            addTags: message.addTags || [],
            removeTags: message.removeTags || [],
          };

          console.log(`Attempting to add message ${message.sequence} to template ${templateId}`);
          console.log("Message data:", messageData);
          
          // Add a small delay to ensure template is fully created in database
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const messageResponse = await axios.post(
            `https://juta-dev.ngrok.dev/api/followup-templates/${templateId}/messages`,
            messageData
          );

          if (messageResponse.data.success) {
            messageCount++;
          } else {
            console.warn(`Failed to add message ${message.sequence}:`, messageResponse.data);
          }
        } catch (error) {
          console.error(`Error adding message ${message.sequence}:`, error);
          // Continue with other messages instead of failing completely
        }
      }

      if (messageCount > 0) {
        toast.success(`Template created successfully with ${messageCount} messages!`);
      } else {
        toast.warning("Template created but no messages were added. Please check the console for errors.");
      }
      setTimeout(() => navigate('/follow-ups'), 1500);
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template and messages");
    } finally {
      setIsCreating(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🎯</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Welcome to Follow-Ups
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Learn how automated follow-up sequences can boost customer engagement
              </p>
            </div>

     

            {/* Loading state for prompt */}
            {isLoadingPrompt && (
              <div className="mb-4">
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Loading your AI assistant configuration...</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <span className="text-sm">📈</span>
                </div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Engagement</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Follow up automatically</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <span className="text-sm">⏰</span>
                </div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Save Time</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Set once, run always</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <span className="text-sm">💰</span>
                </div>
                <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-1">Boost Sales</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Convert more leads</p>
              </div>
            </div>

            {/* How Follow-ups Work with AI */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">💡</div>
                <h3 className="text-xs font-semibold text-green-900 dark:text-green-100">
                  How Follow-ups Work with Your AI
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-green-800 dark:text-green-200">
                <div>
                  <p className="font-medium mb-1">🤖 AI Assistant (First Contact)</p>
                  <ul className="space-y-0.5 ml-3">
                    <li>• Handles initial customer inquiries</li>
                    <li>• Provides immediate responses</li>
                    <li>• Qualifies leads and gathers info</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">📱 Follow-up Sequences (Ongoing Engagement)</p>
                  <ul className="space-y-0.5 ml-3">
                    <li>• Sends scheduled follow-up messages</li>
                    <li>• Maintains customer interest</li>
                    <li>• Drives conversions over time</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Create Template</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set up your follow-up sequence template
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  placeholder="Enter template name"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Message Timing
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="immediate"
                      name="firstMessage"
                      value="immediate"
                      checked={timingSettings.firstMessage === "immediate"}
                      onChange={() => setTimingSettings({...timingSettings, firstMessage: "immediate"})}
                      className="w-3 h-3 text-blue-600"
                    />
                    <label htmlFor="immediate" className="text-xs text-gray-700 dark:text-gray-300">Send immediately</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="delayed"
                      name="firstMessage"
                      value="delayed"
                      checked={timingSettings.firstMessage === "delayed"}
                      onChange={() => setTimingSettings({...timingSettings, firstMessage: "delayed"})}
                      className="w-3 h-3 text-blue-600"
                    />
                    <label htmlFor="delayed" className="text-xs text-gray-700 dark:text-gray-300">Send after 24 hours</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="custom"
                      name="firstMessage"
                      value="custom"
                      checked={timingSettings.firstMessage === "custom"}
                      onChange={() => setTimingSettings({...timingSettings, firstMessage: "custom"})}
                      className="w-3 h-3 text-blue-600"
                    />
                    <label htmlFor="custom" className="text-xs text-gray-700 dark:text-gray-300">Custom time</label>
                  </div>
                </div>

                {timingSettings.firstMessage === "custom" && (
                  <div className="mt-3">
                    <input
                      type="datetime-local"
                      value={timingSettings.customStartTime}
                      onChange={(e) => setTimingSettings({...timingSettings, customStartTime: e.target.value})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Add Messages</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Write your follow-up messages
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-4">
              <textarea
                value={newMessage.message}
                onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                placeholder="Write your message here... Use {{firstName}} to personalize it"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none text-sm"
                rows={3}
              />
              
              <div className="mt-3 flex justify-end">
                <Button
                  onClick={handleAddMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Add Message
                </Button>
              </div>
            </div>

            {messages.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Your Messages</h3>
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div key={message.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {index === 0 ? 'Immediate' : `Day ${message.dayNumber}`}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200">{message.message}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 ml-2 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Set Timing</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure when your follow-up messages will be sent
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Follow-up Interval</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Interval</label>
                    <select
                      value={`${timingSettings.followUpInterval.value}-${timingSettings.followUpInterval.unit}`}
                      onChange={(e) => {
                        const [value, unit] = e.target.value.split('-');
                        setTimingSettings({
                          ...timingSettings,
                          followUpInterval: { value: parseInt(value), unit: unit as "minutes" | "hours" | "days" }
                        });
                      }}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    >
                      {TIME_INTERVALS.map((interval) => (
                        <option key={`${interval.value}-${interval.unit}`} value={`${interval.value}-${interval.unit}`}>
                          {interval.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Active Hours</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sleepEnabled"
                      checked={timingSettings.sleepEnabled}
                      onChange={(e) => setTimingSettings({...timingSettings, sleepEnabled: e.target.checked})}
                      className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="sleepEnabled" className="text-xs text-gray-700 dark:text-gray-300">
                      Only send during business hours
                    </label>
                  </div>
                  
                  {timingSettings.sleepEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Start</label>
                        <input
                          type="time"
                          value={timingSettings.activeHours.start}
                          onChange={(e) => setTimingSettings({
                            ...timingSettings,
                            activeHours: {...timingSettings.activeHours, start: e.target.value}
                          })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">End</label>
                        <input
                          type="time"
                          value={timingSettings.activeHours.end}
                          onChange={(e) => setTimingSettings({
                            ...timingSettings,
                            activeHours: {...timingSettings.activeHours, end: e.target.value}
                          })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🔑</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Keywords & AI Triggers</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Set up keywords that will automatically trigger your follow-up sequences when detected by your AI
              </p>
            </div>

            {/* User's AI Assistant Info - Show how keywords relate to their AI */}
            {userPrompt && (
              <div className="mb-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">🤖</div>
                    <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                      Your AI Assistant's Role
                    </h3>
                  </div>
                  <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                    This is what your AI is configured to do. When customers interact with your AI and use certain keywords, 
                    it will automatically trigger your follow-up sequences.
                  </p>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-600 max-h-24 overflow-y-auto">
                    <div className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
                      {userPrompt.length > 200 
                        ? `${userPrompt.substring(0, 200)}...` 
                        : userPrompt
                      }
                    </div>
                  </div>
                  {userPrompt.length > 200 && (
                    <button 
                      onClick={() => setUserPrompt(userPrompt)}
                      className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                    >
                      Show full prompt
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Loading state for prompt */}
            {isLoadingPrompt && (
              <div className="mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Loading your AI assistant configuration...</span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🎯 How Keywords Trigger Follow-ups</h3>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-green-800 dark:text-green-200">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">1</div>
                      <p className="font-medium">Customer Message</p>
                      <p className="text-xs mt-1">Customer types something with your keyword</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">2</div>
                      <p className="font-medium">AI Detection</p>
                      <p className="text-xs mt-1">Your AI detects the keyword and triggers follow-up</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">3</div>
                      <p className="font-medium">Sequence Starts</p>
                      <p className="text-xs mt-1">Follow-up messages are sent automatically</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🔑 Add Trigger Keywords
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  These keywords will automatically start your follow-up sequence when detected in customer messages
                </p>
                <div className="flex space-x-2 mb-3">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Type a keyword (e.g., 'interested', 'pricing', 'demo')"
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                        setKeywords([...keywords, newKeyword.trim()]);
                        setNewKeyword("");
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
                        setKeywords([...keywords, newKeyword.trim()]);
                        setNewKeyword("");
                      }
                    }}
                    className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-full text-sm">
                      <span className="font-medium">{keyword}</span>
                      <button
                        onClick={() => setKeywords(keywords.filter((_, i) => i !== index))}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example Scenarios */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">💡 Example Scenarios</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">Customer says:</p>
                        <p className="italic">"I'm interested in your pricing"</p>
                        <p className="text-green-600 dark:text-green-400">→ Triggers follow-up sequence!</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">Customer says:</p>
                        <p className="italic">"Can you send me a demo?"</p>
                        <p className="text-green-600 dark:text-green-400">→ Triggers follow-up sequence!</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">Customer says:</p>
                        <p className="italic">"Tell me more about your services"</p>
                        <p className="text-blue-600 dark:text-blue-400">→ AI responds + starts follow-up</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">Customer says:</p>
                        <p className="italic">"What's included in the trial?"</p>
                        <p className="text-blue-600 dark:text-blue-400">→ AI responds + starts follow-up</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">💡</div>
                  <div className="text-xs text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">Pro Tips for Keywords:</p>
                    <ul className="space-y-1 ml-2">
                      <li>• Use common words customers actually say</li>
                      <li>• Include variations (e.g., "pricing", "price", "cost")</li>
                      <li>• Think about what indicates buying intent</li>
                      <li>• Test with real customer conversations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to Launch</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your follow-up sequence is ready to go!
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Summary</h3>
              
              <div className="text-left space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Template Name:</span>
                  <span className="font-medium">{templateName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Messages:</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>First Message:</span>
                  <span className="font-medium">{timingSettings.firstMessage}</span>
                </div>
                <div className="flex justify-between">
                  <span>Follow-up Interval:</span>
                  <span className="font-medium">{timingSettings.followUpInterval.value} {timingSettings.followUpInterval.unit}</span>
                </div>
                {timingSettings.sleepEnabled && (
                  <div className="flex justify-between">
                    <span>Active Hours:</span>
                    <span className="font-medium">{timingSettings.activeHours.start} - {timingSettings.activeHours.end}</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={createTemplateAndMessages}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow"
            >
              🚀 Create & Launch
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-4">
      <div className="flex flex-col items-center w-full max-w-4xl text-center px-3 py-4">
              {/* Header with Logo */}
        <div className="mb-4">
          <div className="mb-2 flex justify-center">
            <img
              alt="Juta Software Logo"
              className="w-14 h-auto object-contain"
              src={logoUrl}
              onError={(e) => {
                console.error('Logo failed to load:', logoUrl);
                e.currentTarget.src = logoUrl2;
              }}
            />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">
            Follow-Ups Setup
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Learn how automated follow-up sequences can boost customer engagement
          </p>
          
          {/* Back to Onboarding Button */}
          <div className="mt-2">
            <button
              onClick={() => navigate('/onboarding')}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium"
            >
              ← Back to Prompt Builder
            </button>
          </div>
        </div>

              {/* Progress Bar */}
        <div className="w-full max-w-2xl mb-4">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}>
                  {currentStep > step.id ? '✓' : step.icon}
                </div>
                <div className="ml-1">
                  <p className={`text-xs font-medium ${
                    currentStep >= step.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-3xl max-h-[60vh] overflow-y-auto">
          {renderStepContent()}
        </div>

              {/* Skip Button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/ai-responses-onboarding')}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:underline"
          >
            Skip setup and continue to AI Responses →
          </button>
        </div>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between w-full max-w-2xl">
          <Button
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-md text-sm ${
              currentStep === 1 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            ← Previous
          </Button>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Step {currentStep} of {steps.length}
          </div>
          
          {currentStep < steps.length ? (
            <Button
              onClick={handleNextStep}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={createTemplateAndMessages}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
            >
              Launch
            </Button>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ready to explore more? Continue to AI Responses setup
          </p>
          <button
            onClick={() => navigate('/ai-responses-onboarding')}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline mt-1"
          >
            Continue to AI Responses →
          </button>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default OnboardingFollowUps;
