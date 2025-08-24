import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import MessagePreview from "@/components/MessagePreview";
import AIFollowupBuilder from "@/components/AIFollowupBuilder";
import axios from "axios";

interface FollowUpTemplate {
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
  batchSettings: BatchSettings;
}

// Add Tag interface
interface Tag {
  id: string;
  name: string;
}

interface FollowUp {
  id: string;
  message: string;
  interval: number;
  intervalUnit: "minutes" | "hours" | "days";
  previousMessageId: string | null;
  sequence: number;
  status: "active" | "inactive";
  createdAt: Date;
  document?: Document | null;
  image?: Image | null;
  video?: Video | null;
}

interface FollowUpMessage {
  id: string;
  message: string;
  dayNumber: number;
  sequence: number;
  status: "active" | "inactive";
  createdAt: Date;
  document?: Document | null;
  image?: Image | null;
  video?: Video | null;
  delayAfter?: {
    value: number;
    unit: "minutes" | "hours" | "days";
    isInstantaneous: boolean;
  };
  delay_after?: {
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

interface Document {
  url: string;
}

interface Image { 
  url: string;
}

interface Video {
  url: string;
}

interface User {
  companyId: string;
}

interface Tag {
  id: string;
  name: string;
}

// Add new interfaces for batch settings
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

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const ampm = hour < 12 ? "AM" : "PM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`,
    label: `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`,
  };
});

const FollowUpsPage: React.FC = () => {
  const [templates, setTemplates] = useState<FollowUpTemplate[]>([]);
  const [messages, setMessages] = useState<FollowUpMessage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTemplate2, setSelectedTemplate2] = useState<string | null>(
    null
  );
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isAIBuilderOpen, setIsAIBuilderOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isEditingMessage, setIsEditingMessage] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<FollowUpMessage | null>(
    null
  );
  const [isCustomStartTime, setIsCustomStartTime] = useState(false);
  const [customStartTime, setCustomStartTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [customInterval, setCustomInterval] = useState({
    value: "",
    unit: "minutes" as "minutes" | "hours" | "days", // Update this type
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [isEditingTemplate, setIsEditingTemplate] = useState<string | null>(
    null
  );
  const [editingTemplate, setEditingTemplate] =
    useState<FollowUpTemplate | null>(null);
  const [batchSettings, setBatchSettings] = useState<BatchSettings>({
    startDateTime: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:mm
    contactsPerBatch: 10,
    repeatEvery: {
      value: 0,
      unit: "minutes",
    },
    messageDelay: {
      min: 1,
      max: 2,
      unit: "seconds",
    },
    sleepSettings: {
      enabled: false,
      activeHours: {
        start: "09:00",
        end: "17:00",
      },
    },
    isNeverending: false,
  });

  useEffect(() => {
    fetchTags();
  }, []);

  const BackButton: React.FC = () => {
    const navigate = useNavigate();

    return (
      <Button 
        onClick={() => navigate("/inbox")} 
        className="mr-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-slate-800 dark:text-slate-100 shadow-lg transition-all duration-300 hover:shadow-xl"
      >
        ← Back
      </Button>
    );
  };

  const fetchTags = async () => {
    try {
      // Get user email from localStorage or context
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Fetch user/company info from your backend
      const userResponse = await fetch(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!userResponse.ok) return;
      const userJson = await userResponse.json();
      const companyId = userJson.userData.companyId;
      if (!companyId) return;

      // Fetch tags from your SQL backend
      const tagsResponse = await fetch(
        `https://juta-dev.ngrok.dev/api/companies/${companyId}/tags`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!tagsResponse.ok) return;
      const tags: Tag[] = await tagsResponse.json();

      setTags(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    triggerTags: [] as string[],
    triggerKeywords: [] as string[],
    startType: "immediate" as "immediate" | "delayed" | "custom",
  });

  const [newFollowUp, setNewFollowUp] = useState({
    message: "",
    interval: 5,
    intervalUnit: "minutes" as "minutes" | "hours" | "days",
    previousMessageId: null as string | null,
    status: "active" as const,
    sequence: 1,
  });

  type NewMessageState = {
    message: string;
    dayNumber: number;
    sequence: number;
    status: "active" | "inactive";
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
  } & Partial<Omit<FollowUpMessage, "id" | "createdAt">>;

  // Update initial state
  const [newMessage, setNewMessage] = useState<NewMessageState>({
    message: "",
    dayNumber: 1,
    sequence: 1,
    status: "active",
    delayAfter: {
      value: 5,
      unit: "minutes",
      isInstantaneous: false,
    },
    specificNumbers: {
      enabled: false,
      numbers: [],
    },
    useScheduledTime: false,
    scheduledTime: "",
    templateId: undefined,
    addTags: [],
    removeTags: [],
  });

  useEffect(() => {
    // fetchFollowUps();
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchFollowUps = async () => {
    // This function is deprecated in favor of the new message-based system
    // Messages are now fetched through fetchMessages for each template
  };

  const uploadDocument = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "https://juta-dev.ngrok.dev/api/upload-media",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.url;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "https://juta-dev.ngrok.dev/api/upload-media",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const uploadVideo = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "https://juta-dev.ngrok.dev/api/upload-media",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.url;
    } catch (error) {
      console.error("Error uploading video:", error);
      throw error;
    }
  };

  // Add new template
  const addTemplate = async () => {
    if (!newTemplate.name.trim()) return;

    try {
      // Get user/company info
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Get companyId from backend
      const userResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );
      const companyId = userResponse.data.userData.companyId;

      let startTime: Date;
      switch (newTemplate.startType) {
        case "immediate":
          startTime = new Date();
          break;
        case "delayed":
          startTime = new Date();
          startTime.setHours(startTime.getHours() + 24);
          break;
        case "custom":
          startTime = new Date(customStartTime);
          break;
        default:
          startTime = new Date();
      }

      const templateData = {
        companyId,
        name: newTemplate.name,
        status: "active",
        createdAt: new Date().toISOString(),
        startTime: startTime.toISOString(),
        isCustomStartTime: newTemplate.startType === "custom",
        trigger_tags: newTemplate.triggerTags,
        trigger_keywords: newTemplate.triggerKeywords,
        batchSettings: batchSettings,
      };

      const response = await axios.post(
        "https://juta-dev.ngrok.dev/api/followup-templates",
        templateData
      );

      if (response.data.success) {
        setIsAddingTemplate(false);
        setNewTemplate({
          name: "",
          triggerTags: [],
          triggerKeywords: [],
          startType: "immediate",
        });
        setCustomStartTime("");
        fetchTemplates();
        toast.success("Template created successfully");
      } else {
        toast.error("Failed to create template");
      }
    } catch (error) {
      console.error("Error adding template:", error);
      toast.error("Failed to create template");
    }
  };
  const updateMessage = async (messageId: string) => {
    if (!editingMessage || !selectedTemplate2) {
      console.error("No editing message or selected template");
      return;
    }

    // Validate message for duplicates
    if (
      !validateEditingMessage(
        editingMessage.dayNumber,
        editingMessage.sequence,
        messageId
      )
    ) {
      toast.error("A message with this day and sequence number already exists");
      return;
    }

    try {
      // Create update data with all necessary fields
      const updateData: any = {
        message: editingMessage.message,
        dayNumber: editingMessage.dayNumber,
        sequence: editingMessage.sequence,
        status: editingMessage.status || "active",
        delayAfter: editingMessage.useScheduledTime
          ? {
              value: 0,
              unit: "minutes",
              isInstantaneous: false,
            }
          : {
              value: editingMessage.delayAfter?.value || 5,
              unit: editingMessage.delayAfter?.unit || "minutes",
              isInstantaneous:
                editingMessage.delayAfter?.isInstantaneous || false,
            },
        specificNumbers: {
          enabled: editingMessage.specificNumbers?.enabled || false,
          numbers: editingMessage.specificNumbers?.numbers || [],
        },
        useScheduledTime: editingMessage.useScheduledTime || false,
        scheduledTime: editingMessage.scheduledTime || "",
        addTags: editingMessage.addTags || [],
        removeTags: editingMessage.removeTags || [],
      };

      // Handle document upload if a new document is selected
      if (selectedDocument) {
        updateData.document = await uploadDocument(selectedDocument);
      }

      // Handle image upload if a new image is selected
      if (selectedImage) {
        updateData.image = await uploadImage(selectedImage);
      }

      // Handle video upload if a new video is selected
      if (selectedVideo) {
        updateData.video = await uploadVideo(selectedVideo);
      }

      // Update the message via API
      const response = await axios.put(
        `https://juta-dev.ngrok.dev/api/followup-templates/${selectedTemplate2}/messages/${messageId}`,
        updateData
      );

      if (response.data.success) {
        // Reset states
        setIsEditingMessage(null);
        setEditingMessage(null);
        setSelectedDocument(null);
        setSelectedImage(null);
        setSelectedVideo(null);

        // Fetch updated messages
        await fetchMessages(selectedTemplate2);
        toast.success("Message updated successfully");
      } else {
        toast.error("Failed to update message");
      }
    } catch (error) {
      console.error("Error updating message:", error);
      toast.error("Failed to update message");
    }
  };
  const deleteMessage = async (messageId: string) => {
    if (!selectedTemplate2) return;

    try {
      const response = await axios.delete(
        `https://juta-dev.ngrok.dev/api/followup-templates/${selectedTemplate2}/messages/${messageId}`
      );

      if (response.data.success) {
        await fetchMessages(selectedTemplate2);
        toast.success("Message deleted successfully");
      } else {
        toast.error("Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const response = await axios.delete(
        `https://juta-dev.ngrok.dev/api/followup-templates/${templateId}`
      );

      if (response.data.success) {
        // Clear selected template if it was the one deleted
        if (selectedTemplate2 === templateId) {
          setSelectedTemplate2(null);
          setMessages([]);
        }

        // Refresh templates list
        fetchTemplates();
        toast.success("Template deleted successfully");
      } else {
        toast.error("Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      const userResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );
      const companyId = userResponse.data.userData.companyId;

      const response = await axios.get(
        `https://juta-dev.ngrok.dev/api/followup-templates?companyId=${encodeURIComponent(
          companyId
        )}`
      );
      if (response.data.success) {
        console.log(response.data.templates);
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  // Fetch messages for selected template
  const fetchMessages = async (templateId: string) => {
    try {
      console.log("Fetching messages for template:", templateId);
      const response = await axios.get(
        `https://juta-dev.ngrok.dev/api/followup-templates/${templateId}/messages`
      );
      console.log("Messages response:", response.data);
      if (response.data.success && Array.isArray(response.data.messages)) {
        // If createdAt is a string, convert to Date for display
        const fetchedMessages = response.data.messages.map((msg: any) => ({
          ...msg,
          createdAt: msg.createdAt ? new Date(msg.createdAt) : null,
        }));
        console.log("Setting messages:", fetchedMessages);
        setMessages(fetchedMessages);
      } else {
        console.log("No messages found or invalid response format");
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };

  // Add this helper function to check for duplicate messages
  const isDuplicateMessage = (dayNumber: number, sequence: number) => {
    return messages.some(
      (message) =>
        message.dayNumber === dayNumber && message.sequence === sequence
    );
  };

  // Add message to template
  const addMessage = async () => {
    if (!selectedTemplate || !newMessage.message.trim()) return;

    // Double-check for duplicates before saving
    if (isDuplicateMessage(newMessage.dayNumber, newMessage.sequence)) {
      toast.error("A message with this day and sequence number already exists");
      return;
    }
    try {
      // Prepare message data
      const messageData = {
        templateId: selectedTemplate2,
        message: newMessage.message,
        dayNumber: newMessage.dayNumber,
        sequence: newMessage.sequence,
        status: "active",
        createdAt: new Date().toISOString(),
        document: selectedDocument
          ? await uploadDocument(selectedDocument)
          : null,
        image: selectedImage ? await uploadImage(selectedImage) : null,
        video: selectedVideo ? await uploadVideo(selectedVideo) : null,
        delayAfter: newMessage.useScheduledTime
          ? {
              value: 0,
              unit: "minutes",
              isInstantaneous: false,
            }
          : {
              value: newMessage.delayAfter.value,
              unit: newMessage.delayAfter.unit,
              isInstantaneous: newMessage.delayAfter.isInstantaneous,
            },
        specificNumbers: {
          enabled: newMessage.specificNumbers.enabled,
          numbers: newMessage.specificNumbers.numbers,
        },
        useScheduledTime: newMessage.useScheduledTime,
        scheduledTime: newMessage.useScheduledTime
          ? newMessage.scheduledTime
          : "",
        addTags: newMessage.addTags || [],
        removeTags: newMessage.removeTags || [],
      };

      // Send to backend
      const response = await axios.post(
        `https://juta-dev.ngrok.dev/api/followup-templates/${selectedTemplate2}/messages`,
        messageData
      );

      if (response.data.success) {
        // Reset form
        setNewMessage({
          message: "",
          dayNumber: 1,
          sequence: getNextSequenceNumber(newMessage.dayNumber),
          templateId: selectedTemplate2 || undefined,
          status: "active",
          delayAfter: {
            value: 5,
            unit: "minutes",
            isInstantaneous: false,
          },
          specificNumbers: {
            enabled: false,
            numbers: [],
          },
          useScheduledTime: false,
          scheduledTime: "",
          addTags: [],
          removeTags: [],
        });
        setNewNumber("");
        setSelectedDocument(null);
        setSelectedImage(null);
        setSelectedVideo(null);

        if (selectedTemplate2) {
          fetchMessages(selectedTemplate2);
        }
        toast.success("Message added successfully");
      } else {
        toast.error("Failed to add message");
      }
    } catch (error) {
      console.error("Error adding message:", error);
      toast.error("Failed to add message");
    }
  };

  // Add this helper function to get the next available sequence number for a given day
  const getNextSequenceNumber = (dayNumber: number) => {
    const dayMessages = messages.filter(
      (message) => message.dayNumber === dayNumber
    );
    if (dayMessages.length === 0) return 1;

    const maxSequence = Math.max(
      ...dayMessages.map((message) => message.sequence)
    );
    return maxSequence + 1;
  };

  const editTemplate = async (templateId: string) => {
    if (!editingTemplate) return;

    try {
      const updateData = {
        name: editingTemplate.name,
        status: editingTemplate.status,
        trigger_tags: editingTemplate.triggerTags || [],
        trigger_keywords: editingTemplate.triggerKeywords || [],
        batchSettings: editingTemplate.batchSettings || batchSettings,
      };

      const response = await axios.put(
        `https://juta-dev.ngrok.dev/api/followup-templates/${templateId}`,
        updateData
      );

      if (response.data.success) {
        setIsEditingTemplate(null);
        setEditingTemplate(null);
        fetchTemplates();
        toast.success("Template updated successfully");
      } else {
        toast.error("Failed to update template");
      }
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Add validation for duplicate messages function
  const validateEditingMessage = (
    dayNumber: number,
    sequence: number,
    currentMessageId: string
  ): boolean => {
    return !messages.some(
      (message) =>
        message.dayNumber === dayNumber &&
        message.sequence === sequence &&
        message.id !== currentMessageId // Exclude the current message
    );
  };

  // Add the callback function to handle AI-generated messages
  const handleAIGeneratedMessages = async (
    stageTemplates: any[],
    templateName: string,
    triggerTags: string[],
    triggerKeywords: string[]
  ) => {
    try {
      // Get user/company info
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Get companyId from backend
      const userResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );
      const companyId = userResponse.data.userData.companyId;

      // Create the template with AI-generated data
      const templateData = {
        companyId,
        name: templateName,
        status: "active",
        createdAt: new Date().toISOString(),
        startTime: new Date().toISOString(),
        isCustomStartTime: false,
        trigger_tags: triggerTags,
        trigger_keywords: triggerKeywords,
        batchSettings: batchSettings,
      };

      const response = await axios.post(
        "https://juta-dev.ngrok.dev/api/followup-templates",
        templateData
      );

      if (response.data.success) {
        // Refresh templates list
        await fetchTemplates();
        
        // Find the newly created template
        const newTemplate = response.data.template;
        if (newTemplate) {
          // Set it as selected
          setSelectedTemplate(newTemplate.id);
          setSelectedTemplate2(newTemplate.templateId);
          
          // If there are AI-generated stage templates, show success message
          if (stageTemplates && stageTemplates.length > 0) {
            toast.success(`AI stage templates created successfully! Created ${stageTemplates.length} stage templates for "${templateName}"`);
          }
        }
        
        toast.success("AI template created successfully");
      } else {
        toast.error("Failed to create AI template");
      }
    } catch (error) {
      console.error("Error creating AI template:", error);
      toast.error("Failed to create AI template");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/20 bg-white/10 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Follow Up Templates
          </h2>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsAddingTemplate(true)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-slate-800 dark:text-slate-100 shadow-lg transition-all duration-300 hover:shadow-xl"
          >
            Add Template
          </Button>
          <Button
            onClick={() => setIsAIBuilderOpen(true)}
            className="bg-gradient-to-r from-blue-500/80 to-purple-600/80 hover:from-blue-600/90 hover:to-purple-700/90 backdrop-blur-sm border border-white/30 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Builder
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Templates List */}
        <div className="w-1/3 border-r border-white/20 overflow-y-auto">
          <div className="p-6">
            <div className="grid gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-5 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedTemplate === template.id
                      ? "bg-white/30 backdrop-blur-md border border-white/40 shadow-xl"
                      : "bg-white/20 backdrop-blur-sm border border-white/20 hover:bg-white/25 hover:border-white/30 hover:shadow-lg"
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setSelectedTemplate2(template.templateId);
                    fetchMessages(template.templateId);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                        {template.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                        Created:{" "}
                        {template.createdAt
                          ? new Date(template.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>

                      {/* Tags */}
                      {template.triggerTags &&
                        template.triggerTags.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                              Trigger Tags
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {template.triggerTags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-300/30 backdrop-blur-sm"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Keywords */}
                      {template.triggerKeywords &&
                        template.triggerKeywords.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                              Trigger Keywords
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {template.triggerKeywords.map(
                                (keyword, index) => (
                                  <span
                                    key={index}
                                    className="text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-300/30 backdrop-blur-sm"
                                  >
                                    {keyword}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setIsEditingTemplate(template.id);
                          setEditingTemplate(template);
                        }}
                        className="text-slate-700 dark:text-slate-200 bg-white/30 hover:bg-white/40 backdrop-blur-sm border border-white/30 shadow-sm transition-all duration-200"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "Are you sure you want to delete this template?"
                            )
                          ) {
                            deleteTemplate(template.id);
                          }
                        }}
                        className="text-white bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm border border-red-300/30 shadow-sm transition-all duration-200"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Messages */}
        <div className="flex-1 overflow-y-auto">
          {selectedTemplate ? (
            <div className="p-6">
              {/* Add Message Form */}
              <div className="bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-6 mb-8">
                <h3 className="text-lg font-semibold mb-6 text-slate-800 dark:text-slate-100">
                  Add New Message
                </h3>
                <div className="flex gap-4 mb-6">
                  <div className="w-1/4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Day Number
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                      placeholder="Day #"
                      value={newMessage.dayNumber}
                      onChange={(e) =>
                        setNewMessage({
                          ...newMessage,
                          dayNumber: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="w-1/4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Sequence
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                      placeholder="Sequence #"
                      value={newMessage.sequence}
                      onChange={(e) =>
                        setNewMessage({
                          ...newMessage,
                          sequence: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Warning for duplicate messages */}
                {isDuplicateMessage(
                  newMessage.dayNumber,
                  newMessage.sequence
                ) && (
                  <div className="mb-6 p-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-300/30 backdrop-blur-sm">
                    ⚠️ A message with this day and sequence number already
                    exists.
                  </div>
                )}

                {/* Message Input */}
                <div className="relative mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Message Content
                  </label>
                  <textarea
                    className="w-full px-4 py-4 border border-white/30 rounded-lg resize-none min-h-[120px] bg-white/50 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your message here..."
                    value={newMessage.message}
                    onChange={(e) =>
                      setNewMessage({
                        ...newMessage,
                        message: e.target.value,
                      })
                    }
                  />
                  <div className="absolute bottom-3 right-3 text-sm text-slate-500 bg-white/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    {newMessage.message.length} characters
                  </div>
                </div>

                {/* Timing Settings */}
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-500 rounded border-white/30 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0 transition-all duration-200"
                      checked={newMessage.useScheduledTime}
                      onChange={(e) =>
                        setNewMessage({
                          ...newMessage,
                          useScheduledTime: e.target.checked,
                          delayAfter: {
                            ...newMessage.delayAfter,
                            value: e.target.checked ? 0 : 5,
                            isInstantaneous: false,
                          },
                        })
                      }
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Send at specific time
                    </span>
                  </label>

                  {!newMessage.useScheduledTime && (
                    <div className="flex items-center gap-3 mt-3">
                      <select
                        className="flex-1 px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                        value={`${newMessage.delayAfter.value}_${newMessage.delayAfter.unit}`}
                        onChange={(e) => {
                          const [value, unit] = e.target.value.split("_");
                          setNewMessage({
                            ...newMessage,
                            delayAfter: {
                              ...newMessage.delayAfter,
                              value: parseInt(value),
                              unit: unit as "minutes" | "hours" | "days",
                            },
                          });
                        }}
                      >
                        {TIME_INTERVALS.map((interval) => (
                          <option
                            key={`${interval.value}_${interval.unit}`}
                            value={`${interval.value}_${interval.unit}`}
                          >
                            {interval.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {newMessage.dayNumber === 1 && newMessage.sequence === 1
                          ? "after template starts"
                          : "after previous message"}
                      </span>
                    </div>
                  )}
                  {!newMessage.useScheduledTime &&
                    newMessage.dayNumber === 1 &&
                    newMessage.sequence === 1 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-white/30 px-3 py-2 rounded-lg backdrop-blur-sm">
                        For the first message, this delay will be applied after
                        the template is triggered.
                      </p>
                    )}

                  {newMessage.useScheduledTime && (
                    <div className="flex items-center gap-3 mt-3">
                      <select
                        className="flex-1 px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                        value={newMessage.scheduledTime}
                        onChange={(e) =>
                          setNewMessage({
                            ...newMessage,
                            scheduledTime: e.target.value,
                          })
                        }
                      >
                        <option value="">Select time</option>
                        {TIME_OPTIONS.map((time) => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Tag Management */}
                <div className="mb-6 border-t border-white/20 pt-6 mt-6">
                  <h4 className="text-md font-semibold mb-4 text-slate-800 dark:text-slate-200">
                    Tag Management
                  </h4>

                  {/* Add Tags */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Add Tags
                    </label>
                    <Select
                      isMulti
                      options={tags.map((tag) => ({
                        value: tag.name,
                        label: tag.name,
                      }))}
                      value={(newMessage.addTags || []).map((tag) => ({
                        value: tag,
                        label: tag,
                      }))}
                      onChange={(selected) => {
                        const selectedTags = selected
                          ? selected.map((option) => option.value)
                          : [];
                        setNewMessage({
                          ...newMessage,
                          addTags: selectedTags,
                        });
                      }}
                      placeholder="Select tags to add..."
                      className="basic-multi-select"
                      classNamePrefix="select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          backgroundColor: "rgba(255, 255, 255, 0.5)",
                          borderColor: "rgba(255, 255, 255, 0.3)",
                          color: "#1e293b",
                          backdropFilter: "blur(8px)",
                          borderRadius: "8px",
                          minHeight: "48px",
                          boxShadow: "none",
                          "&:hover": {
                            borderColor: "rgba(255, 255, 255, 0.5)",
                          },
                          "&:focus-within": {
                            borderColor: "rgba(59, 130, 246, 0.5)",
                            boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.25)",
                          },
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255, 255, 255, 0.3)",
                          borderRadius: "8px",
                          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                          zIndex: 9999,
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? "rgba(59, 130, 246, 0.1)"
                            : "transparent",
                          color: state.isFocused
                            ? "#1e293b"
                            : "#475569",
                          "&:active": {
                            backgroundColor: "rgba(59, 130, 246, 0.2)",
                          },
                        }),
                        multiValue: (base) => ({
                          ...base,
                          backgroundColor: "rgba(59, 130, 246, 0.2)",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          borderRadius: "16px",
                        }),
                        multiValueLabel: (base) => ({
                          ...base,
                          color: "#1e40af",
                          fontWeight: "500",
                        }),
                        multiValueRemove: (base) => ({
                          ...base,
                          color: "#1e40af",
                          ":hover": {
                            backgroundColor: "rgba(59, 130, 246, 0.3)",
                            color: "#1e40af",
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          color: "#1e293b",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#64748b",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "#1e293b",
                        }),
                      }}
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-white/30 px-3 py-2 rounded-lg backdrop-blur-sm">
                      These tags will be added to the contact when this message
                      is sent
                    </p>
                  </div>

                  {/* Remove Tags */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Remove Tags
                    </label>
                    <Select
                      isMulti
                      options={tags.map((tag) => ({
                        value: tag.name,
                        label: tag.name,
                      }))}
                      value={(newMessage.removeTags || []).map((tag) => ({
                        value: tag,
                        label: tag,
                      }))}
                      onChange={(selected) => {
                        const selectedTags = selected
                          ? selected.map((option) => option.value)
                          : [];
                        setNewMessage({
                          ...newMessage,
                          removeTags: selectedTags,
                        });
                      }}
                      placeholder="Select tags to remove..."
                      className="basic-multi-select"
                      classNamePrefix="select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          backgroundColor: "rgba(255, 255, 255, 0.5)",
                          borderColor: "rgba(255, 255, 255, 0.3)",
                          color: "#1e293b",
                          backdropFilter: "blur(8px)",
                          borderRadius: "8px",
                          minHeight: "48px",
                          boxShadow: "none",
                          "&:hover": {
                            borderColor: "rgba(255, 255, 255, 0.5)",
                          },
                          "&:focus-within": {
                            borderColor: "rgba(239, 68, 68, 0.5)",
                            boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.25)",
                          },
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255, 255, 255, 0.3)",
                          borderRadius: "8px",
                          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                          zIndex: 9999,
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused
                            ? "rgba(239, 68, 68, 0.1)"
                            : "transparent",
                          color: state.isFocused
                            ? "#1e293b"
                            : "#475569",
                          "&:active": {
                            backgroundColor: "rgba(239, 68, 68, 0.2)",
                          },
                        }),
                        multiValue: (base) => ({
                          ...base,
                          backgroundColor: "rgba(239, 68, 68, 0.2)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "16px",
                        }),
                        multiValueLabel: (base) => ({
                          ...base,
                          color: "#dc2626",
                          fontWeight: "500",
                        }),
                        multiValueRemove: (base) => ({
                          ...base,
                          color: "#dc2626",
                          ":hover": {
                            backgroundColor: "rgba(239, 68, 68, 0.3)",
                            color: "#dc2626",
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          color: "#1e293b",
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#64748b",
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "#1e293b",
                        }),
                      }}
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-white/30 px-3 py-2 rounded-lg backdrop-blur-sm">
                      These tags will be removed from the contact when this
                      message is sent
                    </p>
                  </div>
                </div>

                {/* File Attachments */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Attach Document
                    </label>
                    <input
                      type="file"
                      className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-700 hover:file:bg-blue-500/30"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedDocument(e.target.files[0]);
                        }
                      }}
                    />
                    {selectedDocument && (
                      <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white/30 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center justify-between">
                        <span>Selected: {selectedDocument.name}</span>
                        <button
                          className="text-red-500 hover:text-red-700 transition-colors duration-200"
                          onClick={() => setSelectedDocument(null)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Attach Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-700 hover:file:bg-emerald-500/30"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedImage(e.target.files[0]);
                        }
                      }}
                    />
                                          {selectedImage && (
                        <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white/30 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center justify-between">
                          <span>Selected: {selectedImage.name}</span>
                          <button
                            className="text-red-500 hover:text-red-700 transition-colors duration-200"
                            onClick={() => setSelectedImage(null)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Attach Video
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-700 hover:file:bg-purple-500/30"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedVideo(e.target.files[0]);
                        }
                      }}
                    />
                    {selectedVideo && (
                      <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 bg-white/30 px-3 py-2 rounded-lg backdrop-blur-sm flex items-center justify-between">
                        <span>Selected: {selectedVideo.name}</span>
                        <button
                          className="text-red-500 hover:text-red-700 transition-colors duration-200"
                          onClick={() => setSelectedVideo(null)}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Section */}
                <div className="bg-white/30 backdrop-blur-md p-6 rounded-xl mb-6 border border-white/30 shadow-lg">
                  <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Message Preview
                  </h5>
                  <MessagePreview
                    message={newMessage.message}
                    document={null}
                    image={null}
                    video={null}
                    timestamp={
                      newMessage.useScheduledTime
                        ? `Scheduled: ${formatTime(newMessage.scheduledTime)}`
                        : newMessage.delayAfter.isInstantaneous
                        ? "Sends immediately"
                        : `After: ${newMessage.delayAfter.value} ${newMessage.delayAfter.unit}`
                    }
                  />

                  {/* Display Tags */}
                  <div className="mt-4 space-y-3">
                    {newMessage.addTags && newMessage.addTags.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Tags to add:
                        </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {newMessage.addTags.map((tag, index) => (
                            <span
                              key={index}
                              className="text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-300/30 backdrop-blur-sm"
                            >
                              +{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {newMessage.removeTags &&
                      newMessage.removeTags.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Tags to remove:
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {newMessage.removeTags.map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs bg-red-500/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full border border-red-300/30 backdrop-blur-sm"
                              >
                                -{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end">
                  <Button
                    onClick={addMessage}
                    className="bg-blue-500/80 hover:bg-blue-600/90 backdrop-blur-sm border border-white/30 text-white shadow-lg transition-all duration-300 hover:shadow-xl px-8 py-3 rounded-lg"
                    disabled={
                      !newMessage.message.trim() ||
                      isDuplicateMessage(
                        newMessage.dayNumber,
                        newMessage.sequence
                      ) ||
                      (newMessage.useScheduledTime && !newMessage.scheduledTime)
                    }
                  >
                    Add Message
                  </Button>
                </div>
              </div>

              {/* Messages List */}
              <div className="space-y-6">
                {messages.length > 0 ? (
                  Object.entries(
                    messages.reduce((acc, message) => {
                      const day = message.dayNumber || 1;
                      if (!acc[day]) {
                        acc[day] = [];
                      }
                      acc[day].push(message);
                      return acc;
                    }, {} as Record<number, FollowUpMessage[]>)
                  )
                    .sort(([dayA], [dayB]) => Number(dayA) - Number(dayB))
                    .map(([day, dayMessages]) => (
                      <div
                        key={day}
                        className="bg-white/20 backdrop-blur-md rounded-xl shadow-lg border border-white/30 p-6"
                      >
                        <h4 className="text-lg font-semibold mb-6 text-slate-800 dark:text-slate-100">
                          Day {day}
                        </h4>
                        <div className="space-y-4">
                          {dayMessages
                            .sort(
                              (a, b) => (a.sequence || 0) - (b.sequence || 0)
                            )
                            .map((message: FollowUpMessage) => (
                              <div key={message.id} className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Message {message.sequence}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setIsEditingMessage(message.id);
                                        setEditingMessage(message);
                                      }}
                                      className="text-slate-700 dark:text-slate-200 bg-white/30 hover:bg-white/40 backdrop-blur-sm border border-white/30 shadow-sm transition-all duration-200"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        if (
                                          window.confirm(
                                            "Are you sure you want to delete this message?"
                                          )
                                        ) {
                                          deleteMessage(message.id);
                                        }
                                      }}
                                      className="text-white bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm border border-red-300/30 shadow-sm transition-all duration-200"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>

                                {isEditingMessage === message.id ? (
                                  <div className="space-y-4 border border-white/30 rounded-xl p-6 bg-white/30 backdrop-blur-md shadow-lg">
                                    {/* Message Input */}
                                    <div className="relative">
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Message Content
                                      </label>
                                      <textarea
                                        className="w-full px-4 py-3 border rounded-lg resize-none min-h-[100px] bg-white dark:bg-gray-700"
                                        placeholder="Enter your message here..."
                                        value={editingMessage?.message || ""}
                                        onChange={(e) => {
                                          if (editingMessage) {
                                            setEditingMessage({
                                              ...editingMessage,
                                              message: e.target.value,
                                            });
                                          }
                                        }}
                                      />
                                      <div className="absolute bottom-2 right-2 text-sm text-gray-500">
                                        {editingMessage?.message?.length || 0}{" "}
                                        characters
                                      </div>
                                    </div>

                                    {/* Day and Sequence */}
                                    <div className="flex gap-4">
                                      <div className="w-1/4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                          Day Number
                                        </label>
                                        <input
                                          type="number"
                                          className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
                                          value={editingMessage?.dayNumber || 1}
                                          onChange={(e) => {
                                            if (editingMessage) {
                                              setEditingMessage({
                                                ...editingMessage,
                                                dayNumber:
                                                  parseInt(e.target.value) || 1,
                                              });
                                            }
                                          }}
                                          min="1"
                                        />
                                      </div>
                                      <div className="w-1/4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                          Sequence
                                        </label>
                                        <input
                                          type="number"
                                          className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
                                          value={editingMessage?.sequence || 1}
                                          onChange={(e) => {
                                            if (editingMessage) {
                                              setEditingMessage({
                                                ...editingMessage,
                                                sequence:
                                                  parseInt(e.target.value) || 1,
                                              });
                                            }
                                          }}
                                          min="1"
                                        />
                                      </div>
                                    </div>

                                    {/* Timing Settings */}
                                    <div className="space-y-2">
                                      <label className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          className="form-checkbox h-4 w-4 text-primary"
                                          checked={
                                            editingMessage?.useScheduledTime ||
                                            false
                                          }
                                          onChange={(e) => {
                                            if (editingMessage) {
                                              setEditingMessage({
                                                ...editingMessage,
                                                useScheduledTime:
                                                  e.target.checked,
                                                delayAfter: {
                                                  value: e.target.checked
                                                    ? 0
                                                    : 5,
                                                  unit: "minutes",
                                                  isInstantaneous: false,
                                                },
                                              });
                                            }
                                          }}
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Send at specific time
                                        </span>
                                      </label>

                                      {!editingMessage?.useScheduledTime && (
                                        <div className="flex items-center gap-2 mt-2">
                                          <select
                                            className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
                                            value={`${
                                              editingMessage?.delayAfter
                                                ?.value || 5
                                            }_${
                                              editingMessage?.delayAfter
                                                ?.unit || "minutes"
                                            }`}
                                            onChange={(e) => {
                                              if (editingMessage) {
                                                const [value, unit] =
                                                  e.target.value.split("_");
                                                setEditingMessage({
                                                  ...editingMessage,
                                                  delayAfter: {
                                                    value: parseInt(value),
                                                    unit: unit as
                                                      | "minutes"
                                                      | "hours"
                                                      | "days",
                                                    isInstantaneous: false,
                                                  },
                                                });
                                              }
                                            }}
                                          >
                                            {TIME_INTERVALS.map((interval) => (
                                              <option
                                                key={`${interval.value}_${interval.unit}`}
                                                value={`${interval.value}_${interval.unit}`}
                                              >
                                                {interval.label}
                                              </option>
                                            ))}
                                          </select>
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {editingMessage?.dayNumber === 1 &&
                                            editingMessage?.sequence === 1
                                              ? "after template starts"
                                              : "after previous message"}
                                          </span>
                                        </div>
                                      )}
                                      {!editingMessage?.useScheduledTime &&
                                        editingMessage?.dayNumber === 1 &&
                                        editingMessage?.sequence === 1 && (
                                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            For the first message, this delay
                                            will be applied after the template
                                            is triggered.
                                          </p>
                                        )}

                                      {editingMessage?.useScheduledTime && (
                                        <div className="flex items-center gap-2 mt-2">
                                          <select
                                            className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
                                            value={
                                              editingMessage?.scheduledTime ||
                                              ""
                                            }
                                            onChange={(e) => {
                                              if (editingMessage) {
                                                setEditingMessage({
                                                  ...editingMessage,
                                                  scheduledTime: e.target.value,
                                                });
                                              }
                                            }}
                                          >
                                            <option value="">
                                              Select time
                                            </option>
                                            {TIME_OPTIONS.map((time) => (
                                              <option
                                                key={time.value}
                                                value={time.value}
                                              >
                                                {time.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                    </div>

                                    {/* Tag Management */}
                                    <div className="space-y-2 mb-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                      <h4 className="text-md font-semibold mb-3">
                                        Tag Management
                                      </h4>

                                      {/* Add Tags */}
                                      <div className="mb-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                          Add Tags
                                        </label>
                                        <Select
                                          isMulti
                                          options={tags.map((tag) => ({
                                            value: tag.name,
                                            label: tag.name,
                                          }))}
                                          value={(
                                            editingMessage?.addTags || []
                                          ).map((tag) => ({
                                            value: tag,
                                            label: tag,
                                          }))}
                                          onChange={(selected) => {
                                            if (editingMessage) {
                                              const selectedTags = selected
                                                ? selected.map(
                                                    (option) => option.value
                                                  )
                                                : [];
                                              setEditingMessage({
                                                ...editingMessage,
                                                addTags: selectedTags,
                                              });
                                            }
                                          }}
                                          placeholder="Select tags to add..."
                                          className="basic-multi-select"
                                          classNamePrefix="select"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                          These tags will be added to the
                                          contact when this message is sent
                                        </p>
                                      </div>

                                      {/* Remove Tags */}
                                      <div className="mb-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                          Remove Tags
                                        </label>
                                        <Select
                                          isMulti
                                          options={tags.map((tag) => ({
                                            value: tag.name,
                                            label: tag.name,
                                          }))}
                                          value={(
                                            editingMessage?.removeTags || []
                                          ).map((tag) => ({
                                            value: tag,
                                            label: tag,
                                          }))}
                                          onChange={(selected) => {
                                            if (editingMessage) {
                                              const selectedTags = selected
                                                ? selected.map(
                                                    (option) => option.value
                                                  )
                                                : [];
                                              setEditingMessage({
                                                ...editingMessage,
                                                removeTags: selectedTags,
                                              });
                                            }
                                          }}
                                          placeholder="Select tags to remove..."
                                          className="basic-multi-select"
                                          classNamePrefix="select"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                          These tags will be removed from the
                                          contact when this message is sent
                                        </p>
                                      </div>
                                    </div>

                                    {/* Preview Section */}
                                    <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Message Preview
                                      </h5>
                                      <MessagePreview
                                        message={editingMessage?.message || ""}
                                        document={editingMessage?.document?.url}
                                        image={editingMessage?.image?.url}
                                        video={editingMessage?.video?.url}
                                        timestamp={
                                          editingMessage?.useScheduledTime
                                            ? `Scheduled: ${formatTime(
                                                editingMessage.scheduledTime
                                              )}`
                                            : editingMessage?.delayAfter
                                                ?.isInstantaneous
                                            ? "Sends immediately"
                                            : `After: ${editingMessage?.delayAfter?.value} ${editingMessage?.delayAfter?.unit}`
                                        }
                                      />

                                      {/* Display Tags */}
                                      <div className="mt-3 space-y-2">
                                        {editingMessage?.addTags &&
                                          editingMessage.addTags.length > 0 && (
                                            <div>
                                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                Tags to add:
                                              </span>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {editingMessage.addTags.map(
                                                  (tag, index) => (
                                                    <span
                                                      key={index}
                                                      className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
                                                    >
                                                      +{tag}
                                                    </span>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )}

                                        {editingMessage?.removeTags &&
                                          editingMessage.removeTags.length >
                                            0 && (
                                            <div>
                                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                Tags to remove:
                                              </span>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {editingMessage.removeTags.map(
                                                  (tag, index) => (
                                                    <span
                                                      key={index}
                                                      className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full"
                                                    >
                                                      -{tag}
                                                    </span>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          setIsEditingMessage(null);
                                          setEditingMessage(null);
                                          setSelectedDocument(null);
                                          setSelectedImage(null);
                                          setSelectedVideo(null);
                                        }}
                                        className="bg-gray-500 hover:bg-gray-600 text-white"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        onClick={(e: React.MouseEvent) =>
                                          updateMessage(message.id)
                                        }
                                        className="bg-primary hover:bg-primary-dark text-white"
                                        disabled={
                                          !editingMessage ||
                                          !editingMessage.message ||
                                          editingMessage.message.trim() === ""
                                        }
                                      >
                                        Save Changes
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <MessagePreview
                                      message={message.message}
                                      document={message.document?.url}
                                      image={message.image?.url}
                                      video={message.video?.url}
                                      timestamp={
                                        message.useScheduledTime
                                          ? `Scheduled: ${formatTime(
                                              message.scheduledTime
                                            )}`
                                          : message.delayAfter?.isInstantaneous
                                          ? "Sends immediately"
                                          : `After: ${message.delayAfter?.value} ${message.delayAfter?.unit}`
                                      }
                                    />

                                    {/* Display Tags */}
                                    <div className="mt-3 space-y-2">
                                      {message.addTags &&
                                        message.addTags.length > 0 && (
                                          <div>
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                              Tags to add:
                                            </span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {message.addTags.map(
                                                (tag, index) => (
                                                  <span
                                                    key={index}
                                                    className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
                                                  >
                                                    +{tag}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {message.removeTags &&
                                        message.removeTags.length > 0 && (
                                          <div>
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                              Tags to remove:
                                            </span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {message.removeTags.map(
                                                (tag, index) => (
                                                  <span
                                                    key={index}
                                                    className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full"
                                                  >
                                                    -{tag}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-16 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                      No messages yet. Add your first message above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  Select a template to view and manage messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keep the modals outside the main layout */}
      {isEditingTemplate && editingTemplate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl w-[700px] max-h-[90vh] overflow-y-auto border border-white/30 shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-100">Edit Template</h3>

            {/* Template Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Template Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                value={editingTemplate.name}
                onChange={(e) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    name: e.target.value,
                  })
                }
              />
            </div>

            {/* Trigger Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Tags
              </label>
              <Select
                isMulti
                options={tags.map((tag) => ({
                  value: tag.name,
                  label: tag.name,
                }))}
                value={(editingTemplate.triggerTags || []).map((tag) => ({
                  value: tag,
                  label: tag,
                }))}
                onChange={(selected) => {
                  const selectedTags = selected
                    ? selected.map((option) => option.value)
                    : [];
                  setEditingTemplate({
                    ...editingTemplate,
                    triggerTags: selectedTags,
                  });
                }}
                className="basic-multi-select"
                classNamePrefix="select"
              />
            </div>

            {/* Trigger Keywords */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Keywords
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 border rounded-lg"
                  placeholder="Enter keyword and press Enter"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newNumber.trim()) {
                      setEditingTemplate({
                        ...editingTemplate,
                        triggerKeywords: [
                          ...(editingTemplate.triggerKeywords || []),
                          newNumber.trim(),
                        ],
                      });
                      setNewNumber("");
                      e.preventDefault();
                    }
                  }}
                />
                <Button
                  onClick={(e: React.MouseEvent) => {
                    if (newNumber.trim()) {
                      setEditingTemplate({
                        ...editingTemplate,
                        triggerKeywords: [
                          ...(editingTemplate.triggerKeywords || []),
                          newNumber.trim(),
                        ],
                      });
                      setNewNumber("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              {/* Display Keywords */}
              <div className="flex flex-wrap gap-2 mt-2">
                {(editingTemplate.triggerKeywords || []).map(
                  (keyword, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                    >
                      <span>{keyword}</span>
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setEditingTemplate({
                            ...editingTemplate,
                            triggerKeywords:
                              editingTemplate.triggerKeywords?.filter(
                                (_, i) => i !== index
                              ),
                          });
                        }}
                        className="text-red-500 hover:text-red-700 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Batch Settings Section */}
            <div className="mb-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-md font-semibold mb-3">Batch Settings</h4>

              {/* Contacts Per Batch */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contacts Per Batch
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg"
                  min="1"
                  max="100"
                  value={editingTemplate.batchSettings?.contactsPerBatch || 10}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      batchSettings: {
                        ...editingTemplate.batchSettings,
                        contactsPerBatch: parseInt(e.target.value) || 10,
                      },
                    })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of contacts to process in each batch
                </p>
              </div>

              {/* Message Delay */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message Delay
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Min:</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded-lg"
                      min="0"
                      value={
                        editingTemplate.batchSettings?.messageDelay?.min || 1
                      }
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          batchSettings: {
                            ...editingTemplate.batchSettings,
                            messageDelay: {
                              ...editingTemplate.batchSettings?.messageDelay,
                              min: parseInt(e.target.value) || 1,
                            },
                          },
                        })
                      }
                    />
                    <span className="text-sm text-gray-600">Max:</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded-lg"
                      min="0"
                      value={
                        editingTemplate.batchSettings?.messageDelay?.max || 2
                      }
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          batchSettings: {
                            ...editingTemplate.batchSettings,
                            messageDelay: {
                              ...editingTemplate.batchSettings?.messageDelay,
                              max: parseInt(e.target.value) || 2,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <select
                    className="px-2 py-1 border rounded-lg"
                    value={
                      editingTemplate.batchSettings?.messageDelay?.unit ||
                      "seconds"
                    }
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        batchSettings: {
                          ...editingTemplate.batchSettings,
                          messageDelay: {
                            ...editingTemplate.batchSettings?.messageDelay,
                            unit: e.target.value as "seconds" | "minutes",
                          },
                        },
                      })
                    }
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Random delay between messages to appear more natural
                </p>
              </div>

              {/* Sleep Settings */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="sleep-enabled"
                    checked={
                      editingTemplate.batchSettings?.sleepSettings?.enabled ||
                      false
                    }
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        batchSettings: {
                          ...editingTemplate.batchSettings,
                          sleepSettings: {
                            ...editingTemplate.batchSettings?.sleepSettings,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="sleep-enabled"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Enable Sleep Hours
                  </label>
                </div>

                {editingTemplate.batchSettings?.sleepSettings?.enabled && (
                  <div className="flex items-center gap-3 mt-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Active Hours Start
                      </label>
                      <select
                        className="px-2 py-1 border rounded-lg"
                        value={
                          editingTemplate.batchSettings?.sleepSettings
                            ?.activeHours?.start || "09:00"
                        }
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            batchSettings: {
                              ...editingTemplate.batchSettings,
                              sleepSettings: {
                                ...editingTemplate.batchSettings?.sleepSettings,
                                activeHours: {
                                  ...editingTemplate.batchSettings
                                    ?.sleepSettings?.activeHours,
                                  start: e.target.value,
                                },
                              },
                            },
                          })
                        }
                      >
                        {TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Active Hours End
                      </label>
                      <select
                        className="px-2 py-1 border rounded-lg"
                        value={
                          editingTemplate.batchSettings?.sleepSettings
                            ?.activeHours?.end || "17:00"
                        }
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            batchSettings: {
                              ...editingTemplate.batchSettings,
                              sleepSettings: {
                                ...editingTemplate.batchSettings?.sleepSettings,
                                activeHours: {
                                  ...editingTemplate.batchSettings
                                    ?.sleepSettings?.activeHours,
                                  end: e.target.value,
                                },
                              },
                            },
                          })
                        }
                      >
                        {TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Only send messages during active hours
                </p>
              </div>

              {/* Continuous Follow-Ups */}
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="neverending"
                    checked={
                      editingTemplate.batchSettings?.isNeverending || false
                    }
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        batchSettings: {
                          ...editingTemplate.batchSettings,
                          isNeverending: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="neverending"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Continuous Follow-Ups (Restart sequence after completion)
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setIsEditingTemplate(null);
                  setEditingTemplate(null);
                }}
                className="text-slate-700 dark:text-slate-200 bg-white/30 hover:bg-white/40 backdrop-blur-sm border border-white/30 shadow-sm transition-all duration-200 px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={(e: React.MouseEvent) =>
                  editTemplate(editingTemplate.templateId)
                }
                disabled={!editingTemplate.name.trim()}
                className="text-white bg-blue-500/80 hover:bg-blue-600/90 backdrop-blur-sm border border-white/30 shadow-sm transition-all duration-200 px-6 py-2"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {isAddingTemplate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-2xl w-[700px] max-h-[90vh] overflow-y-auto border border-white/30 shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-100">New Template</h3>

            {/* Template Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Template Name
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-white/30 rounded-lg bg-white/50 backdrop-blur-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                placeholder="Template Name"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Trigger Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Tags
              </label>
              <Select
                isMulti
                options={tags.map((tag) => ({
                  value: tag.name,
                  label: tag.name,
                }))}
                value={newTemplate.triggerTags.map((tag) => ({
                  value: tag,
                  label: tag,
                }))}
                onChange={(selected) => {
                  const selectedTags = selected
                    ? selected.map((option) => option.value)
                    : [];
                  setNewTemplate((prev) => ({
                    ...prev,
                    triggerTags: selectedTags,
                  }));
                }}
                placeholder="Select tags to trigger follow-ups..."
                className="basic-multi-select"
                classNamePrefix="select"
              />
              <p className="mt-1 text-sm text-gray-500">
                Follow-up sequence will start when any of these tags are applied
              </p>
            </div>

            {/* Add Trigger Keywords section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Keywords
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 border rounded-lg"
                  placeholder="Enter keyword and press Enter"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newNumber.trim()) {
                      setNewTemplate((prev) => ({
                        ...prev,
                        triggerKeywords: [
                          ...prev.triggerKeywords,
                          newNumber.trim(),
                        ],
                      }));
                      setNewNumber("");
                      e.preventDefault();
                    }
                  }}
                />
                <Button
                  onClick={(e: React.MouseEvent) => {
                    if (newNumber.trim()) {
                      setNewTemplate((prev) => ({
                        ...prev,
                        triggerKeywords: [
                          ...prev.triggerKeywords,
                          newNumber.trim(),
                        ],
                      }));
                      setNewNumber("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              {/* Display added keywords */}
              <div className="flex flex-wrap gap-2 mt-2">
                {newTemplate.triggerKeywords.map((keyword, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"
                  >
                    <span>{keyword}</span>
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setNewTemplate((prev) => ({
                          ...prev,
                          triggerKeywords: prev.triggerKeywords.filter(
                            (_, i) => i !== index
                          ),
                        }));
                      }}
                      className="text-red-500 hover:text-red-700 ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Follow-up sequence will start when any of these keywords are
                detected
              </p>
            </div>

            {/* Start Time Options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={newTemplate.startType === "immediate"}
                    onChange={() =>
                      setNewTemplate((prev) => ({
                        ...prev,
                        startType: "immediate",
                        isCustomStartTime: false,
                      }))
                    }
                  />
                  Start immediately when tag is applied
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={newTemplate.startType === "delayed"}
                    onChange={() =>
                      setNewTemplate((prev) => ({
                        ...prev,
                        startType: "delayed",
                        isCustomStartTime: false,
                      }))
                    }
                  />
                  Start 24 hours after tag is applied
                </label>

                {newTemplate.triggerTags.length > 0 && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="mr-2"
                      checked={newTemplate.startType === "custom"}
                      onChange={() =>
                        setNewTemplate((prev) => ({
                          ...prev,
                          startType: "custom",
                          isCustomStartTime: true,
                        }))
                      }
                    />
                    Custom start time after tag is applied
                  </label>
                )}
              </div>
            </div>

            {/* Custom Start Time Input */}
            {newTemplate.startType === "custom" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Start Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2 border rounded-lg"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                />
              </div>
            )}

            {/* Batch Settings Section */}
            <div className="mb-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-md font-semibold mb-3">Batch Settings</h4>

              {/* Contacts Per Batch */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contacts Per Batch
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg"
                  min="1"
                  max="100"
                  value={batchSettings.contactsPerBatch}
                  onChange={(e) =>
                    setBatchSettings({
                      ...batchSettings,
                      contactsPerBatch: parseInt(e.target.value) || 10,
                    })
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of contacts to process in each batch
                </p>
              </div>

              {/* Message Delay */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message Delay
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Min:</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded-lg"
                      min="0"
                      value={batchSettings.messageDelay.min}
                      onChange={(e) =>
                        setBatchSettings({
                          ...batchSettings,
                          messageDelay: {
                            ...batchSettings.messageDelay,
                            min: parseInt(e.target.value) || 1,
                          },
                        })
                      }
                    />
                    <span className="text-sm text-gray-600">Max:</span>
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border rounded-lg"
                      min="0"
                      value={batchSettings.messageDelay.max}
                      onChange={(e) =>
                        setBatchSettings({
                          ...batchSettings,
                          messageDelay: {
                            ...batchSettings.messageDelay,
                            max: parseInt(e.target.value) || 2,
                          },
                        })
                      }
                    />
                  </div>
                  <select
                    className="px-2 py-1 border rounded-lg"
                    value={batchSettings.messageDelay.unit}
                    onChange={(e) =>
                      setBatchSettings({
                        ...batchSettings,
                        messageDelay: {
                          ...batchSettings.messageDelay,
                          unit: e.target.value as "seconds" | "minutes",
                        },
                      })
                    }
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Random delay between messages to appear more natural
                </p>
              </div>

              {/* Sleep Settings */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="sleep-enabled-new"
                    checked={batchSettings.sleepSettings.enabled}
                    onChange={(e) =>
                      setBatchSettings({
                        ...batchSettings,
                        sleepSettings: {
                          ...batchSettings.sleepSettings,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="sleep-enabled-new"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Enable Sleep Hours
                  </label>
                </div>

                {batchSettings.sleepSettings.enabled && (
                  <div className="flex items-center gap-3 mt-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Active Hours Start
                      </label>
                      <select
                        className="px-2 py-1 border rounded-lg"
                        value={batchSettings.sleepSettings.activeHours.start}
                        onChange={(e) =>
                          setBatchSettings({
                            ...batchSettings,
                            sleepSettings: {
                              ...batchSettings.sleepSettings,
                              activeHours: {
                                ...batchSettings.sleepSettings.activeHours,
                                start: e.target.value,
                              },
                            },
                          })
                        }
                      >
                        {TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Active Hours End
                      </label>
                      <select
                        className="px-2 py-1 border rounded-lg"
                        value={batchSettings.sleepSettings.activeHours.end}
                        onChange={(e) =>
                          setBatchSettings({
                            ...batchSettings,
                            sleepSettings: {
                              ...batchSettings.sleepSettings,
                              activeHours: {
                                ...batchSettings.sleepSettings.activeHours,
                                end: e.target.value,
                              },
                            },
                          })
                        }
                      >
                        {TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Only send messages during active hours
                </p>
              </div>

              {/* Continuous Follow-Ups */}
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="neverending-new"
                    checked={batchSettings.isNeverending}
                    onChange={(e) =>
                      setBatchSettings({
                        ...batchSettings,
                        isNeverending: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="neverending-new"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Continuous Follow-Ups (Restart sequence after completion)
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setIsAddingTemplate(false);
                  setNewTemplate({
                    name: "",
                    triggerTags: [],
                    triggerKeywords: [],
                    startType: "immediate",
                  });
                  setCustomStartTime("");
                }}
                className="text-slate-700 dark:text-slate-200 bg-white/30 hover:bg-white/40 backdrop-blur-sm border border-white/30 shadow-sm transition-all duration-200 px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={(e: React.MouseEvent) => addTemplate()}
                disabled={!newTemplate.name.trim()}
                className="text-white bg-blue-500/80 hover:bg-blue-600/90 backdrop-blur-sm border border-white/30 shadow-sm transition-all duration-200 px-6 py-2"
              >
                Add Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Follow-up Builder Modal */}
      {isAIBuilderOpen && (
        <AIFollowupBuilder
          onClose={() => setIsAIBuilderOpen(false)}
          onApplyMessages={handleAIGeneratedMessages}
          tags={tags}
        />
      )}

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastClassName="bg-white/90 backdrop-blur-md border border-white/30 shadow-lg rounded-xl"
        progressClassName="bg-blue-500/50"
      />
    </div>
  );
};

export default FollowUpsPage;