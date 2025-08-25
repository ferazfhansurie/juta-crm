import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";

interface AIResponseBuilderProps {
  onClose: () => void;
}

// Basic AI response types
type AIResponseType = 'tag' | 'image' | 'voice' | 'document' | 'assign' | 'video';

interface AIResponseData {
  type: AIResponseType;
  keywords: string[];
  description: string;
  status: 'active' | 'inactive';
  // Type-specific data
  tags?: string[];
  tagActionMode?: 'add' | 'delete';
  imageUrls?: string[];
  voiceUrls?: string[];
  documentUrls?: string[];
  assignedEmployees?: string[];
  videoUrls?: string[];
}

const AIResponseBuilder: React.FC<AIResponseBuilderProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Array<{ text: string; fromUser: boolean; data?: any }>>([
    { text: "Hi! I can help you create AI responses. What type of response would you like to create?\n\nAvailable types:\n• Tag responses (add/remove tags)\n• Image responses\n• Voice responses\n• Document responses\n• Assign responses (assign to employees)\n• Video responses\n\nJust tell me what you want to create!", fromUser: false }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [currentResponse, setCurrentResponse] = useState<AIResponseData | null>(null);
  const [responseType, setResponseType] = useState<AIResponseType | null>(null);
  const [conversationStep, setConversationStep] = useState<'type' | 'keywords' | 'details' | 'review'>('type');
  const [collectedData, setCollectedData] = useState<Partial<AIResponseData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);

  // Base URL for API calls
  const baseUrl = 'https://juta-dev.ngrok.dev';

  // File upload functions
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${baseUrl}/api/upload-media`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(file => uploadFile(file));
    return Promise.all(uploadPromises);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { text: newMessage, fromUser: true }]);
    
    // Process the message and generate AI response
    processUserMessage(newMessage);
    
    setNewMessage("");
  };

  const processUserMessage = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    if (conversationStep === 'type') {
      // Use the backend API to brainstorm responses
      handleBrainstormRequest(message);
    } else if (conversationStep === 'keywords') {
      // Extract keywords from message
      const keywords = extractKeywords(message);
      setCollectedData(prev => ({ ...prev, keywords }));
      setConversationStep('details');
      handleKeywordsCollected(keywords);
    } else if (conversationStep === 'details') {
      // Collect type-specific details
      handleDetailsCollection(message);
    } else if (conversationStep === 'review') {
      // Handle modifications or confirmations
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage.includes('create') || 
          lowerMessage.includes('save') || lowerMessage.includes('save it') || lowerMessage.includes('save this') ||
          lowerMessage.includes('go ahead') || lowerMessage.includes('do it') || lowerMessage.includes('proceed')) {
        // Send the save command to the AI assistant instead of directly creating
        setMessages(prev => [...prev, { 
          text: "🤖 Processing your request to save the AI response...", 
          fromUser: false 
        }]);
        handleBrainstormRequest(`Please save and create the AI response with the following details: Type: ${collectedData.type}, Keywords: ${collectedData.keywords?.join(', ')}, Description: ${collectedData.description || 'None'}`);
      } else if (lowerMessage.includes('change') || lowerMessage.includes('modify') || lowerMessage.includes('edit')) {
        setMessages(prev => [...prev, { 
          text: "Sure! What would you like to change? You can modify:\n• Keywords\n• Description\n• Response type\n• Any other details\n\nJust tell me what to change!", 
          fromUser: false 
        }]);
      } else if (lowerMessage.includes('start over') || lowerMessage.includes('reset') || lowerMessage.includes('new')) {
        setCollectedData({});
        setResponseType(null);
        setConversationStep('type');
        setMessages(prev => [...prev, { 
          text: "🔄 **Starting Over!**\n\nI'm ready to help you create a new AI response. What would you like to build?\n\nExamples:\n• 'Create a tag response for customer inquiries'\n• 'Make an image response for product questions'\n• 'Build a voice response for support requests'", 
          fromUser: false 
        }]);
      } else {
        // Send any other message to the AI assistant for processing
        handleBrainstormRequest(message);
      }
    }
  };

  const extractKeywords = (message: string): string[] => {
    // Simple keyword extraction - look for words after "keywords:" or common patterns
    if (message.toLowerCase().includes('keywords:')) {
      const afterKeywords = message.split(/keywords?:\s*/i)[1];
      return afterKeywords?.split(/[,\s]+/).filter(k => k.trim().length > 0) || [];
    }
    
    // Look for quoted words or words after "trigger"
    const quoted = message.match(/"([^"]+)"/g);
    if (quoted) {
      return quoted.map(q => q.replace(/"/g, ''));
    }
    
    // Look for words after "trigger"
    if (message.toLowerCase().includes('trigger')) {
      const afterTrigger = message.split(/trigger\s+/i)[1];
      return afterTrigger?.split(/[,\s]+/).filter(k => k.trim().length > 0) || [];
    }
    
    // Default: extract meaningful words
    return message.split(/\s+/).filter(word => word.length > 3 && !['the', 'and', 'for', 'with'].includes(word.toLowerCase()));
  };

  const handleTagResponse = (message: string) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "Great! I'll help you create a tag response. Now please provide the keywords that should trigger this response.\n\nYou can say something like:\n• 'Keywords: customer, inquiry, help'\n• 'Trigger: support, question, assistance'\n• Or just list the words: 'customer inquiry help'", 
        fromUser: false 
      }]);
    }, 1000);
  };

  const handleImageResponse = (message: string) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "Perfect! I'll help you create an image response. Now please provide the keywords that should trigger this response.\n\nYou can say something like:\n• 'Keywords: product, image, show'\n• 'Trigger: display, picture, visual'\n• Or just list the words: 'product image show'", 
        fromUser: false 
      }]);
    }, 1000);
  };

  const handleVoiceResponse = (message: string) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "Excellent! I'll help you create a voice response. Now please provide the keywords that should trigger this response.\n\nYou can say something like:\n• 'Keywords: voice, audio, play'\n• 'Trigger: sound, listen, hear'\n• Or just list the words: 'voice audio play'", 
        fromUser: false 
      }]);
    }, 1000);
  };

  const handleDocumentResponse = (message: string) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "Great choice! I'll help you create a document response. Let me ask a few questions:\n\n1. What keywords should trigger this response?\n2. What documents should be shared?\n3. Any specific description for the response?\n\nPlease provide these details so I can build your response.", 
        fromUser: false 
      }]);
    }, 1000);
  };

  const handleAssignResponse = (message: string) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "Perfect! I'll help you create an assign response. Let me ask a few questions:\n\n1. What keywords should trigger this response?\n2. Which employees should be assigned?\n3. Any specific description for the response?\n\nPlease provide these details so I can build your response.", 
        fromUser: false 
      }]);
    }, 1000);
  };

  const handleVideoResponse = (message: string) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "Excellent! I'll help you create a video response. Now please provide the keywords that should trigger this response.\n\nYou can say something like:\n• 'Keywords: video, tutorial, show'\n• 'Trigger: display, watch, learn'\n• Or just list the words: 'video tutorial show'", 
        fromUser: false 
      }]);
    }, 1000);
  };

  const handleBrainstormRequest = async (message: string) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setMessages(prev => [...prev, { 
          text: "Error: No user email found. Please log in again.", 
          fromUser: false 
        }]);
        return;
      }

      // Check if companyId is available
      if (!companyId) {
        setMessages(prev => [...prev, { 
          text: "Error: Company information not loaded. Please try again in a moment.", 
          fromUser: false 
        }]);
        return;
      }

      // Show loading message
      let loadingText = "🤖 Analyzing your request and generating AI response suggestions...";
      if (uploadedFiles.length > 0) {
        loadingText += `\n\n📎 Processing ${uploadedFiles.length} uploaded file(s)...`;
      }
      
      setMessages(prev => [...prev, { 
        text: loadingText, 
        fromUser: false 
      }]);

      // Upload files first if any are selected
      let fileUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        try {
          fileUrls = await uploadFiles(uploadedFiles);
          setUploadedFileUrls(fileUrls); // Store the URLs for later use
          setMessages(prev => [...prev, { 
            text: `📎 Successfully uploaded ${uploadedFiles.length} file(s)`, 
            fromUser: false 
          }]);
        } catch (error) {
          setMessages(prev => [...prev, { 
            text: `❌ Error uploading files: ${error instanceof Error ? error.message : 'Upload failed'}`, 
            fromUser: false 
          }]);
          return;
        }
      }

      // Prepare the request data with file URLs instead of raw files
      const requestData = {
        message: message,
        email: userEmail,
        currentPrompt: "AI Response Builder",
        currentResponses: {},
        fileUrls: fileUrls, // Send URLs instead of raw files
        companyId: companyId // Include companyId for backend processing
      };

      // Log the request data for debugging
      console.log('AI Response Builder - Request Data:', requestData);

      // Send the request with JSON data instead of FormData
      const queryParams = new URLSearchParams({
        message: message,
        email: userEmail
      });

      const response = await fetch(`${baseUrl}/api/ai-response-brainstorm/?${queryParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const { explanation, suggestedResponse, alternatives, fileUrls } = result.data;
        
        console.log('Brainstorm response:', result.data);
        
        if (!suggestedResponse || !suggestedResponse.type) {
          throw new Error('Invalid response structure from AI');
        }
        
        // Set the response type and data
        setResponseType(suggestedResponse.type as AIResponseType);
        setCollectedData({
          type: suggestedResponse.type,
          keywords: suggestedResponse.keywords || [],
          description: suggestedResponse.description || '',
          status: 'active',
          ...suggestedResponse
        });
        setConversationStep('review');

        // Show the AI suggestions with enhanced formatting
        let suggestionsText = `${explanation}\n\n📋 **Suggested Response:**\n`;
        suggestionsText += `• Type: ${suggestedResponse.type}\n`;
        suggestionsText += `• Keywords: ${suggestedResponse.keywords?.join(', ')}\n`;
        suggestionsText += `• Description: ${suggestedResponse.description}\n`;
        
        // Add type-specific information
        if (suggestedResponse.tags) {
          suggestionsText += `• Tags: ${suggestedResponse.tags.join(', ')}\n`;
        }
        if (suggestedResponse.imageUrls && suggestedResponse.imageUrls.length > 0) {
          suggestionsText += `• Images: ${suggestedResponse.imageUrls.length} file(s)\n`;
        }
        if (suggestedResponse.voiceUrls && suggestedResponse.voiceUrls.length > 0) {
          suggestionsText += `• Voice: ${suggestedResponse.voiceUrls.length} file(s)\n`;
        }
        if (suggestedResponse.documentUrls && suggestedResponse.documentUrls.length > 0) {
          suggestionsText += `• Documents: ${suggestedResponse.documentUrls.length} file(s)\n`;
        }
        if (suggestedResponse.videoUrls && suggestedResponse.videoUrls.length > 0) {
          suggestionsText += `• Videos: ${suggestedResponse.videoUrls.length} file(s)\n`;
        }
        if (suggestedResponse.assignedEmployees) {
          suggestionsText += `• Employees: ${suggestedResponse.assignedEmployees.join(', ')}\n`;
        }

        // Show alternatives if available
        if (alternatives && alternatives.length > 0) {
          suggestionsText += `\n🔄 **Alternative Types:**\n`;
          alternatives.forEach((alt: any, index: number) => {
            suggestionsText += `${index + 1}. ${alt.type} - ${alt.description}\n`;
          });
        }

        // Show file information if files were processed
        if (fileUrls && fileUrls.length > 0) {
          suggestionsText += `\n📎 **Processed Files:**\n`;
          fileUrls.forEach((url: string, index: number) => {
            const fileName = uploadedFiles[index]?.name || `File ${index + 1}`;
            // Clean up the filename display and show a shorter version of the URL
            const cleanFileName = fileName.replace(/[^\x00-\x7F]/g, '').trim(); // Remove non-ASCII characters
            const shortUrl = url.length > 50 ? url.substring(0, 50) + '...' : url;
            suggestionsText += `• ${cleanFileName}\n  → ${shortUrl}\n`;
          });
        }

        suggestionsText += `\n✅ **Ready to create?** Just type 'save' or 'create' to save this response, or ask me to modify anything first.`;

        setMessages(prev => [...prev, { 
          text: suggestionsText, 
          fromUser: false 
        }]);
      } else {
        throw new Error(result.details || 'Failed to generate suggestions');
      }
    } catch (error) {
      console.error('Brainstorm error:', error);
      let errorMessage = 'Failed to generate AI response suggestions.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error: Unable to connect to the AI service. Please check your connection and try again.';
        } else if (error.message.includes('Invalid response structure')) {
          errorMessage = 'AI service returned an invalid response. Please try again.';
        } else if (error.message.includes('FILE_UPLOAD_ERROR')) {
          errorMessage = 'File upload failed. Please check your files and try again.';
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = 'Server error: The AI service encountered an issue. Please try again later.';
        } else if (error.message.includes('HTTP 400')) {
          errorMessage = 'Invalid request: Please check your input and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setMessages(prev => [...prev, { 
        text: `❌ Error: ${errorMessage}\n\nPlease try again or contact support if the problem persists.`, 
        fromUser: false 
      }]);
    }
  };

  const createFinalResponse = async () => {
    if (!collectedData.type || !collectedData.keywords) {
      setMessages(prev => [...prev, { 
        text: "❌ Error: Missing required data. Please start over.", 
        fromUser: false 
      }]);
      return;
    }

    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail || !companyId) {
        setMessages(prev => [...prev, { 
          text: "❌ Error: User authentication failed. Please try again.", 
          fromUser: false 
        }]);
        return;
      }

      // Show saving message
      setMessages(prev => [...prev, { 
        text: "💾 Saving your AI response to the database...", 
        fromUser: false 
      }]);

      const responseData: AIResponseData = {
        type: collectedData.type as AIResponseType,
        keywords: collectedData.keywords,
        description: collectedData.description || '',
        status: 'active',
        ...collectedData
      };

      await saveResponseToBackend(responseData);
      
      // Show success message (only one, not duplicate)
      setMessages(prev => [...prev, { 
        text: `🎉 **AI Response Created Successfully!**\n\n✅ Type: ${collectedData.type}\n✅ Keywords: ${collectedData.keywords?.join(', ')}\n✅ Description: ${collectedData.description || 'None'}\n\nYour AI response is now active and will trigger automatically when the specified keywords are detected!\n\n💡 **Want to create another?** Just tell me what type of response you'd like to build next.`, 
        fromUser: false 
      }]);
      
      // Reset the form for next use
      setCollectedData({});
      setResponseType(null);
      setConversationStep('type');
      setUploadedFiles([]);
      setUploadedFileUrls([]);
      
    } catch (error) {
      console.error('Error creating final response:', error);
      setMessages(prev => [...prev, { 
        text: `❌ Error: Failed to create response. ${error instanceof Error ? error.message : 'Please try again.'}`, 
        fromUser: false 
      }]);
    }
  };

  const handleKeywordsCollected = (keywords: string[]) => {
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: `Great! I've captured these keywords: ${keywords.join(', ')}\n\nNow let me ask for the specific details for your ${responseType} response. What would you like to configure next?`, 
        fromUser: false 
      }]);
    }, 1000);
  };

  const handleDetailsCollection = (message: string) => {
    // This will be expanded in the next step
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "I'm collecting the details. This feature will be expanded in the next step!", 
        fromUser: false 
      }]);
    }, 1000);
  };

  // Fetch company ID on component mount
  useEffect(() => {
    fetchCompanyId();
  }, []);

  // File upload handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      setMessages(prev => [...prev, { 
        text: `📎 Added ${files.length} image file(s) to upload queue`, 
        fromUser: false 
      }]);
    }
    // Clear the input value to allow re-uploading the same file
    e.target.value = '';
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      setMessages(prev => [...prev, { 
        text: `📎 Added ${files.length} document file(s) to upload queue`, 
        fromUser: false 
      }]);
    }
    e.target.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      setMessages(prev => [...prev, { 
        text: `📎 Added ${files.length} audio file(s) to upload queue`, 
        fromUser: false 
      }]);
    }
    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      setMessages(prev => [...prev, { 
        text: `📎 Added ${files.length} video file(s) to upload queue`, 
        fromUser: false 
      }]);
    }
    e.target.value = '';
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedFileUrls(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    setUploadedFileUrls([]);
    setMessages(prev => [...prev, { 
      text: `🗑️ Cleared all uploaded files`, 
      fromUser: false 
    }]);
  };

  const fetchCompanyId = async () => {
    setIsLoadingCompany(true);
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setMessages(prev => [...prev, { 
          text: "Error: No user email found. Please log in again.", 
          fromUser: false 
        }]);
        return;
      }

      const response = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user config');
      }

      const data = await response.json();
      if (data.company_id) {
        setCompanyId(data.company_id);
        console.log('AI Response Builder - Company ID fetched:', data.company_id);
      } else {
        console.error('AI Response Builder - No company_id in response:', data);
      }
    } catch (error) {
      console.error('Error fetching company ID:', error);
      setMessages(prev => [...prev, { 
        text: "Error: Failed to fetch company information. Please try again.", 
        fromUser: false 
      }]);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const saveResponseToBackend = async (responseData: AIResponseData) => {
    if (!companyId) {
      setMessages(prev => [...prev, { 
        text: "Error: Company ID not found. Please try again.", 
        fromUser: false 
      }]);
      return;
    }

    setIsSaving(true);
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('No user email found');
      }

      // Prepare the response data for the backend
      const backendData = {
        companyId: companyId,
        type: responseData.type,
        data: {
          keywords: responseData.keywords,
          description: responseData.description || '',
          status: responseData.status,
          keyword_source: 'user',
          ...getTypeSpecificData(responseData)
        }
      };

      const response = await fetch(`${baseUrl}/api/ai-responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData)
      });

      if (!response.ok) {
        throw new Error('Failed to save response');
      }

      const result = await response.json();
      
      if (result.success) {
        // Success message is now handled in createFinalResponse
        // Just log the result for debugging
        console.log('Response saved successfully:', result.data);
      } else {
        throw new Error(result.message || 'Failed to save response');
      }
    } catch (error) {
      console.error('Error saving response:', error);
      setMessages(prev => [...prev, { 
        text: `❌ Error: Failed to save response. ${error instanceof Error ? error.message : 'Please try again.'}`, 
        fromUser: false 
      }]);
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeSpecificData = (responseData: AIResponseData) => {
    switch (responseData.type) {
      case 'tag':
        return {
          tags: responseData.tags || [],
          tag_action_mode: responseData.tagActionMode || 'add',
          remove_tags: responseData.tagActionMode === 'delete' ? responseData.tags || [] : []
        };
      case 'image':
        // Use uploaded file URLs if available, otherwise use stored URLs
        const imageUrls = uploadedFileUrls.length > 0 ? uploadedFileUrls : (responseData.imageUrls || []);
        return {
          image_urls: imageUrls,
          analysis_result: null
        };
      case 'voice':
        // Use uploaded file URLs if available, otherwise use stored URLs
        const voiceUrls = uploadedFileUrls.length > 0 ? uploadedFileUrls : (responseData.voiceUrls || []);
        return {
          voice_urls: voiceUrls,
          audio_url: voiceUrls[0] || '',
          captions: [],
          transcription: '',
          language: 'en',
          analysis_result: null
        };
      case 'document':
        // Use uploaded file URLs if available, otherwise use stored URLs
        const documentUrls = uploadedFileUrls.length > 0 ? uploadedFileUrls : (responseData.documentUrls || []);
        return {
          document_urls: documentUrls,
          document_names: uploadedFiles.map(file => file.name),
          document_url: documentUrls[0] || '',
          extracted_text: '',
          analysis_result: null
        };
      case 'assign':
        return {
          assigned_employees: responseData.assignedEmployees || []
        };
      case 'video':
        // Use uploaded file URLs if available, otherwise use stored URLs
        const videoUrls = uploadedFileUrls.length > 0 ? uploadedFileUrls : (responseData.videoUrls || []);
        return {
          video_urls: videoUrls,
          captions: [],
          analysis_result: null
        };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl w-[900px] h-[700px] flex flex-col border border-white/30 dark:border-gray-700/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/30 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Response Builder</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Create intelligent responses with AI assistance</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 bg-white/20 dark:bg-gray-700/20 hover:bg-white/30 dark:hover:bg-gray-600/30 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200"
          >
            ✕
          </button>
        </div>

        {/* Main Chat Area - Full Height */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages - Takes up most of the space */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.fromUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl backdrop-blur-sm border ${
                  message.fromUser 
                    ? 'bg-gradient-to-r from-blue-500/90 to-blue-600/90 text-white border-blue-400/30 shadow-lg' 
                    : 'bg-white/70 dark:bg-gray-700/70 text-gray-800 dark:text-gray-200 border-white/30 dark:border-gray-600/30 shadow-md'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Single Input Area at Bottom */}
          <div className="border-t border-white/20 dark:border-gray-700/30 p-4 bg-white/10 dark:bg-gray-800/10 backdrop-blur-sm">
            {/* Company Loading Indicator */}
            {isLoadingCompany && (
              <div className="mb-3 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Loading company information...</span>
                </div>
              </div>
            )}
            {/* File Upload Row */}
            <div className="mb-3">
              <div className="flex gap-2">
                <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg cursor-pointer bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Images</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isLoadingCompany} />
                </label>

                <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-green-300 dark:border-green-600 rounded-lg cursor-pointer bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-green-600 dark:text-green-400">Docs</span>
                  <input type="file" accept=".pdf,.doc,.docx,.txt" multiple className="hidden" onChange={handleDocumentUpload} disabled={isLoadingCompany} />
                </label>

                <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg cursor-pointer bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span className="text-xs text-purple-600 dark:text-purple-400">Audio</span>
                  <input type="file" accept="audio/*" multiple className="hidden" onChange={handleAudioUpload} disabled={isLoadingCompany} />
                </label>

                <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-orange-300 dark:border-orange-600 rounded-lg cursor-pointer bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                  <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-orange-600 dark:text-orange-400">Video</span>
                  <input type="file" accept="video/*" multiple className="hidden" onChange={handleVideoUpload} disabled={isLoadingCompany} />
                </label>
              </div>

              {/* Uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      📎 {uploadedFiles.length} file(s) ready to upload
                    </span>
                    <button
                      onClick={clearAllFiles}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-white/70 dark:bg-gray-600/70 rounded-lg border border-white/30 dark:border-gray-500/30">
                        <span className="text-xs text-gray-700 dark:text-gray-300">{file.name}</span>
                        <button
                          onClick={() => removeUploadedFile(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Single Message Input */}
            <div className="flex gap-3">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim()) {
                      processUserMessage(newMessage);
                      setNewMessage('');
                    }
                  }
                }}
                placeholder={isLoadingCompany ? "Loading company information..." : "Describe what AI response you want to create..."}
                className="flex-1 px-4 py-3 border border-white/40 dark:border-gray-600/40 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm shadow-sm text-sm"
                rows={2}
                disabled={isLoadingCompany}
              />
              <Button
                onClick={() => {
                  if (newMessage.trim()) {
                    processUserMessage(newMessage);
                    setNewMessage('');
                  }
                }}
                disabled={!newMessage.trim() || isLoadingCompany}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v8" />
                </svg>
                Send
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              Press Enter to send • Upload files to include them in your response
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIResponseBuilder;
