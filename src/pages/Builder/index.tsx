import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, updateDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

// Firebase config remains the same
const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

interface AssistantInfo {
  name: string;
  description: string;
  instructions: string;
  metadata: {
    files: Array<{id: string, name: string, url: string}>;
  };
}

// Step interface for our wizard
interface PromptStep {
  id: string;
  title: string;
  description: string;
  fieldName: keyof PromptData;
  placeholder: string;  exampleValue?: string;
}

// Data structure for our prompt builder
interface PromptData {
  aiName: string;
  aiRole: string;
  aiPersonality: string;
  aiExpertise: string;
  aiResponseStyle: string;
  aiConversationFlow: string;
  aiObjectives: string;
  aiGuidelines: string;
}

// Add these interfaces at the top with other interfaces
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url: string;
  content?: string;
}

const Main: React.FC = () => {
  // Original state variables
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>({
    name: '',
    description: '',
    instructions: '',
    metadata: {
      files: [],
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>("");
  const navigate = useNavigate();
  
  // State variables for step-by-step prompt builder
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [promptData, setPromptData] = useState<PromptData>({
    aiName: '',
    aiRole: '',
    aiPersonality: '',
    aiExpertise: '',
    aiResponseStyle: '',
    aiConversationFlow: '',
    aiObjectives: '',
    aiGuidelines: ''
  });
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Add these state variables in the Main component
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [useDatabaseResults, setUseDatabaseResults] = useState<boolean>(true);

  // Define the steps for our prompt builder
  const promptSteps: PromptStep[] = [
    {
      id: 'name',
      title: 'Name Your AI',
      description: 'What would you like to call your AI assistant?',
      fieldName: 'aiName',
      placeholder: 'e.g., Hadri, Alex, SalesBot',
      exampleValue: 'Hadri'
    },
    {
      id: 'role',
      title: 'Define the Role',
      description: 'What role will your AI assistant play?',
      fieldName: 'aiRole',
      placeholder: 'e.g., Sales Assistant, Customer Support, Marketing Specialist',
      exampleValue: "AI Sales Assistant"
    },
    {
      id: 'personality',
      title: 'Personality Traits',
      description: 'Describe the personality of your AI assistant',
      fieldName: 'aiPersonality',
      placeholder: 'e.g., Confident, empathetic, professional, creative',
      exampleValue: 'Confident, creative, and persistent'
    },
    {
      id: 'expertise',
      title: 'Areas of Expertise',
      description: 'What specific knowledge or expertise should your AI have?',
      fieldName: 'aiExpertise',
      placeholder: 'e.g., Marketing strategies, product knowledge, industry trends',
      exampleValue: 'Converting prospects into booking a free Brand Health Report and strategy session'
    },
    {
      id: 'responseStyle',
      title: 'Response Style',
      description: 'How should your AI communicate with users?',
      fieldName: 'aiResponseStyle',
      placeholder: 'e.g., Formal, casual, concise, detailed',
      exampleValue: 'Respond in the user\'s detected language (English, Malay, or Manglish)'
    },
    {
      id: 'conversationFlow',
      title: 'Conversation Flow',
      description: 'Outline the typical conversation flow your AI should follow',
      fieldName: 'aiConversationFlow',
      placeholder: 'e.g., Greeting → Qualification → Solution → Close',
      exampleValue: 'Introduction → Profiling Questions → Tailored Pitch → Appointment Booking → Client Details → Booking Confirmation'
    },
    {
      id: 'objectives',
      title: 'Key Objectives',
      description: 'What are the main goals your AI should achieve?',
      fieldName: 'aiObjectives',
      placeholder: 'e.g., Generate leads, provide support, educate customers',
      exampleValue: 'Emphasize limited availability, time-sensitive offers, and the competitive edge of a powerful brand'
    },
    {
      id: 'guidelines',
      title: 'Special Guidelines',
      description: 'Any specific instructions or guidelines for your AI?',
      fieldName: 'aiGuidelines',
      placeholder: 'e.g., Compliance requirements, escalation procedures, specific phrases to use',
      exampleValue: 'For marketing, branding, and creative strategy inquiries, adjust approach to reflect comprehensive services'
    }
  ];

  // Update the quickStartTemplates array with more options
  const quickStartTemplates = [
    {
      name: "Sales Assistant",
      description: "Perfect for lead generation and sales conversion",
      template: {
        aiName: "SalesBot",
        aiRole: "Sales Assistant",
        aiPersonality: "Professional, persuasive, and solution-oriented",
        aiExpertise: "Product knowledge, objection handling, and closing deals",
        aiResponseStyle: "Clear, confident, and engaging",
        aiConversationFlow: "Introduction → Needs Assessment → Solution Presentation → Objection Handling → Close",
        aiObjectives: "Generate qualified leads and close sales",
        aiGuidelines: "Always maintain professionalism, focus on value proposition, and follow up consistently"
      }
    },
    {
      name: "Customer Support",
      description: "Ideal for handling customer inquiries and support",
      template: {
        aiName: "SupportBot",
        aiRole: "Customer Support Specialist",
        aiPersonality: "Empathetic, patient, and helpful",
        aiExpertise: "Product troubleshooting and customer service",
        aiResponseStyle: "Clear, friendly, and solution-focused",
        aiConversationFlow: "Greeting → Problem Identification → Solution → Confirmation → Follow-up",
        aiObjectives: "Resolve customer issues efficiently and maintain high satisfaction",
        aiGuidelines: "Always verify understanding, provide step-by-step solutions, and ensure resolution"
      }
    },
    {
      name: "Marketing Assistant",
      description: "Great for content creation and marketing campaigns",
      template: {
        aiName: "MarketingBot",
        aiRole: "Marketing Assistant",
        aiPersonality: "Creative, strategic, and data-driven",
        aiExpertise: "Content creation, campaign planning, and market analysis",
        aiResponseStyle: "Engaging, persuasive, and brand-consistent",
        aiConversationFlow: "Discovery → Strategy → Content Creation → Review → Implementation",
        aiObjectives: "Create compelling content and drive marketing success",
        aiGuidelines: "Maintain brand voice, focus on target audience, and track performance metrics"
      }
    },
    {
      name: "HR Assistant",
      description: "Perfect for recruitment and employee support",
      template: {
        aiName: "HRBot",
        aiRole: "HR Assistant",
        aiPersonality: "Professional, supportive, and confidential",
        aiExpertise: "Recruitment, employee relations, and HR policies",
        aiResponseStyle: "Clear, professional, and empathetic",
        aiConversationFlow: "Initial Contact → Needs Assessment → Solution → Follow-up",
        aiObjectives: "Streamline HR processes and support employee needs",
        aiGuidelines: "Maintain confidentiality, follow HR policies, and provide accurate information"
      }
    }
  ];

  // Fetch company ID on component mount
  useEffect(() => {
    fetchCompanyId();
  }, []);

  // Fetch Firebase config when company ID is available
  useEffect(() => {
    if (companyId) {
      fetchFirebaseConfig(companyId);
    }
  }, [companyId]);

  // Fetch assistant info when assistant ID and API key are available
  useEffect(() => {
    if (assistantId && apiKey) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  }, [assistantId, apiKey]);

  // Update completed steps
  useEffect(() => {
    const newCompletedSteps = new Set<number>();
    for (let i = 0; i < promptSteps.length; i++) {
      const fieldName = promptSteps[i].fieldName;
      if (promptData[fieldName]) {
        newCompletedSteps.add(i);
      } else {
        break;
      }
    }
    setCompletedSteps(newCompletedSteps);
  }, [promptData]);

  // Function to fetch company ID
  const fetchCompanyId = async () => {
    const user = getAuth().currentUser;
    if (!user) {
      console.error("No user is logged in");
      setError("No user is logged in");
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document does not exist");
        setError("User document does not exist");
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      setCompanyId(dataUser.companyId);
      setUserRole(dataUser.role);
    } catch (error) {
      console.error("Error fetching company ID:", error);
      setError("Failed to fetch company ID");
    }
  };

  // Function to fetch Firebase config
  const fetchFirebaseConfig = async (companyId: string) => {
    try {
      const companyDoc = await getDoc(doc(firestore, "companies", companyId));
      const tokenDoc = await getDoc(doc(firestore, "setting", "token"));
      if (companyDoc.exists() && tokenDoc.exists()) {
        const companyData = companyDoc.data();
        const tokenData = tokenDoc.data();
        
        setAssistantId(companyData.assistantId);
        setApiKey(tokenData.openai);
      } else {
        console.error("Company or token document does not exist");
      }
    } catch (error) {
      console.error("Error fetching Firebase config:", error);
      setError("Failed to fetch Firebase config");
    }
  };

  // Function to fetch assistant info
  const fetchAssistantInfo = async (assistantId: string, apiKey: string) => {
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
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    } finally {
      setLoading(false);
    }
  };

  // Function to update assistant info
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

    const payload = {
      name: promptData.aiName || assistantInfo.name,
      description: `AI Assistant for ${promptData.aiRole}` || assistantInfo.description,
      instructions: generatedPrompt || assistantInfo.instructions
    };

    try {
      const response = await axios.post(`https://api.openai.com/v1/assistants/${assistantId}`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      toast.success('Assistant updated successfully');
      navigate('/inbox');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating assistant information:', error.response?.data);
        setError(`Failed to update assistant information: ${error.response?.data.error.message}`);
      } else {
        console.error('Error updating assistant information:', error);
        setError('Failed to update assistant information');
      }
    }
  };

  // Function to handle input change for prompt data
  const handlePromptDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPromptData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to go to the next step
  const goToNextStep = () => {
    const currentFieldName = promptSteps[currentStep].fieldName;
    if (!promptData[currentFieldName]) {
      toast.error('Please fill in this field before continuing');
      return;
    }
    
    if (currentStep < promptSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      generateFinalPrompt();
    }
  };

  // Function to go to the previous step
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Function to use example value
  const useExampleValue = () => {
    const currentField = promptSteps[currentStep].fieldName;
    const exampleValue = promptSteps[currentStep].exampleValue || '';
    
    setPromptData(prev => ({
      ...prev,
      [currentField]: exampleValue
    }));
  };

  // Function to generate the final prompt using AI
  const generateFinalPrompt = async () => {
    setIsGeneratingPrompt(true);
    
    // Create a draft prompt to send to the AI
    const draftPrompt = `Create a detailed AI assistant prompt with the following specifications:\n\n` +
      `Name: ${promptData.aiName}\n` +
      `Role: ${promptData.aiRole}\n` +
      `Personality: ${promptData.aiPersonality}\n` +
      `Expertise: ${promptData.aiExpertise}\n` +
      `Response Style: ${promptData.aiResponseStyle}\n` +
      `Conversation Flow: ${promptData.aiConversationFlow}\n` +
      `Objectives: ${promptData.aiObjectives}\n` +
      `Guidelines: ${promptData.aiGuidelines}\n\n` +
      `Format the prompt similar to this example:\n\n` +
      `Role\nYou are Hadri, an AI Sales Assistant.\n\n` +
      `Confident, creative, and persistent—focused on converting every prospect into booking a free Brand Health Report and strategy session.\n\n` +
      `Urgency Driver: Emphasize limited availability, time-sensitive offers, and the competitive edge of a powerful brand.\n\n` +
      `Follow the detailed conversation flow to engage, qualify, and convert leads.\n\n` +
      `Change Language: Respond in the user's detected language (English, Malay, or Manglish).\n\n` +
      `Key Traits: Empathy + Persistence: Acknowledge concerns in 1–5 words then pivot to your proven solutions.`;

    try {
      const user = getAuth().currentUser;
      if (!user) {
        console.error("User not authenticated");
        setError("User not authenticated");
        setIsGeneratingPrompt(false);
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        setIsGeneratingPrompt(false);
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        setIsGeneratingPrompt(false);
        return;
      }

      const data2 = docSnapshot.data();
      const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';

      // Call the AI prompt engineer API
      const res = await axios({
        method: 'post',
        url: `${baseUrl}/api/prompt-engineer/`,
        params: {
          message: draftPrompt,
          email: user.email!
        },
        data: {
          currentPrompt: assistantInfo.instructions || ''
        }
      });
      
      if (!res.data.success) {
        throw new Error(res.data.details || 'Failed to process prompt');
      }

      const { updatedPrompt } = res.data.data;

      // Update assistant instructions with the new prompt
      setAssistantInfo(prevInfo => ({
        ...prevInfo,
        instructions: updatedPrompt
      }));

      // Set the generated prompt
      setGeneratedPrompt(updatedPrompt);

    } catch (error) {
      console.error('Error:', error);
      setError("Failed to generate prompt");
      
      // Create a simple prompt as fallback
      const fallbackPrompt = `Role\nYou are ${promptData.aiName}, ${promptData.aiRole}.\n\n${promptData.aiPersonality}—focused on ${promptData.aiExpertise}.\n\nUrgency Driver: ${promptData.aiObjectives}\n\nFollow the detailed conversation flow to engage, qualify, and convert leads.\n\nChange Language:\n${promptData.aiResponseStyle}\n\nKey Traits:\nEmpathy + Persistence: Acknowledge concerns in 1–5 words then pivot to proven solutions.\n\nGuidelines\n${promptData.aiGuidelines}\n\nConversation Flow (Always Follow This Flow)\n${promptData.aiConversationFlow}`;
      
      setGeneratedPrompt(fallbackPrompt);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Function to edit the generated prompt
  const handleGeneratedPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedPrompt(e.target.value);
    setAssistantInfo(prev => ({
      ...prev,
      instructions: e.target.value
    }));
  };

  // Function to reset the builder
  const resetBuilder = () => {
    setCurrentStep(0);
    setPromptData({
      aiName: '',
      aiRole: '',
      aiPersonality: '',
      aiExpertise: '',
      aiResponseStyle: '',
      aiConversationFlow: '',
      aiObjectives: '',
      aiGuidelines: ''
    });
    setGeneratedPrompt('');
    setCompletedSteps(new Set());
  };

  // Add this helper function
  const generatePreviewPrompt = () => {
    return `Role\nYou are ${promptData.aiName}, ${promptData.aiRole}.\n\n${promptData.aiPersonality}—focused on ${promptData.aiExpertise}.\n\nUrgency Driver: ${promptData.aiObjectives}\n\nFollow the detailed conversation flow to engage, qualify, and convert leads.\n\nChange Language:\n${promptData.aiResponseStyle}\n\nKey Traits:\nEmpathy + Persistence: Acknowledge concerns in 1–5 words then pivot to proven solutions.\n\nGuidelines\n${promptData.aiGuidelines}\n\nConversation Flow (Always Follow This Flow)\n${promptData.aiConversationFlow}`;
  };

  // Add these functions to handle file uploads
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsProcessingFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileId = Math.random().toString(36).substring(7);
        
        // Upload to Firebase Storage
        const storage = getStorage();
        const storageRef = ref(storage, `prompt-files/${fileId}-${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        // If it's a PDF or text file, extract content
        let content = '';
        if (file.type === 'application/pdf' || file.type === 'text/plain') {
          const response = await fetch(url);
          const text = await response.text();
          content = text;
        }

        setUploadedFiles(prev => [...prev, {
          id: fileId,
          name: file.name,
          type: file.type,
          url,
          content
        }]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Add this function to analyze file content
  const analyzeFileContent = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessingFile(true);
    try {
      const user = getAuth().currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) return;

      const data2 = docSnapshot.data();
      const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';

      // Send files to AI for conversation style analysis
      const response = await axios.post(`${baseUrl}/api/analyze-files/`, {
        files: uploadedFiles.map(file => ({
          name: file.name,
          content: file.content,
          type: file.type
        })),
        analysisType: 'conversation_style',
        useDatabaseResults: useDatabaseResults
      });

      // Update prompt data with AI suggestions based on conversation style
      if (response.data.suggestions) {
        setPromptData(prev => ({
          ...prev,
          aiPersonality: response.data.suggestions.personality || prev.aiPersonality,
          aiResponseStyle: response.data.suggestions.responseStyle || prev.aiResponseStyle,
          aiConversationFlow: response.data.suggestions.conversationFlow || prev.aiConversationFlow,
          aiGuidelines: response.data.suggestions.guidelines || prev.aiGuidelines
        }));
        
        toast.success('Conversation style analyzed successfully');
      }
    } catch (error) {
      console.error('Error analyzing conversation style:', error);
      toast.error('Failed to analyze conversation style');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Render the prompt builder interface
  return (
    <div className="flex justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
          <div className="flex items-center">
            <div className="w-8 h-8 overflow-hidden rounded-full shadow-lg flex items-center justify-center mr-3">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-semibold text-xl text-gray-800 dark:text-gray-200">AI Prompt Builder</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {generatedPrompt ? 'Review & Save' : `Step ${currentStep + 1} of ${promptSteps.length}`}
              </div>
            </div>
          </div>
          <div>
            <button 
              onClick={resetBuilder} 
              className="px-3 py-1.5 text-sm text-white bg-red-500 dark:bg-red-600 rounded hover:bg-red-600 dark:hover:bg-red-700 active:scale-95 transition-all duration-200"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center text-center p-8">
                <img alt="Logo" className="w-24 h-24 mb-6" src={logoUrl} />
                <LoadingIcon icon="three-dots" className="w-16 h-16 mb-4" />
                <div className="text-lg font-medium dark:text-gray-200">Loading your AI Assistant...</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait while we fetch your configuration</div>
              </div>
            </div>
          ) : generatedPrompt ? (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 dark:text-gray-200">Review Your AI Assistant</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Review and edit your AI assistant's configuration before saving.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assistant Name
                </label>
                <input
                  type="text"
                  value={promptData.aiName}
                  onChange={(e) => setPromptData({...promptData, aiName: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isGeneratingPrompt}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prompt Instructions
                </label>
                {isGeneratingPrompt ? (
                  <div className="w-full h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <LoadingIcon icon="three-dots" className="w-12 h-12" />
                    <div className="ml-3 text-gray-600 dark:text-gray-300">Generating your AI prompt...</div>
                  </div>
                ) : (
                  <textarea
                    value={generatedPrompt}
                    onChange={handleGeneratedPromptChange}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={15}
                  />
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => {
                    setGeneratedPrompt('');
                    setCurrentStep(promptSteps.length - 1);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  disabled={isGeneratingPrompt}
                >
                  Back to Editor
                </button>
                <button
                  onClick={updateAssistantInfo}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-200"
                  disabled={userRole === "3" || isGeneratingPrompt}
                >
                  Save Assistant
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Templates section - first step */}
              {!generatedPrompt && currentStep === 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-4 dark:text-gray-200">Choose a Template</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Select a template to get started, or continue with a blank template
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quickStartTemplates.map((template) => (
                      <button
                        key={template.name}
                        onClick={() => {
                          setPromptData(template.template);
                          setCompletedSteps(new Set([...Array(promptSteps.length).keys()]));
                        }}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 text-left"
                      >
                        <div className="text-lg font-medium dark:text-gray-200 mb-1">{template.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {template.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* File upload section - last step */}
              {!generatedPrompt && currentStep === promptSteps.length - 1 && (
                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-4 dark:text-gray-200">Upload Past Conversations</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Upload your past conversations (PDF, text files, or chat logs) to help the AI learn your communication style and tone
                  </p>
                  
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Use Database Results</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Include past successful conversations from the database
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useDatabaseResults}
                          onChange={(e) => setUseDatabaseResults(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="file"
                        accept=".pdf,.txt,.csv,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        multiple
                      />
                      <label
                        htmlFor="file-upload"
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer transition-all duration-200"
                      >
                        Upload Conversations
                      </label>
                      {uploadedFiles.length > 0 && (
                        <button
                          onClick={analyzeFileContent}
                          disabled={isProcessingFile}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-all duration-200"
                        >
                          {isProcessingFile ? (
                            <>
                              <LoadingIcon icon="three-dots" className="w-4 h-4 mr-2 inline" />
                              Analyzing Style...
                            </>
                          ) : 'Analyze Conversation Style'}
                        </button>
                      )}
                    </div>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-lg font-medium mb-2 dark:text-gray-200">Uploaded Conversations:</h4>
                      <div className="space-y-2">
                        {uploadedFiles.map(file => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">({file.type})</span>
                            </div>
                            <button
                              onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                              className="text-red-500 hover:text-red-600 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        The AI will analyze these conversations to match your communication style, tone, and approach
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Main content */}
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2 dark:text-gray-200">{promptSteps[currentStep].title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {promptSteps[currentStep].description}
                </p>
                
                <div className="mb-4">
                  <textarea
                    name={promptSteps[currentStep].fieldName}
                    value={promptData[promptSteps[currentStep].fieldName]}
                    onChange={handlePromptDataChange}
                    placeholder={promptSteps[currentStep].placeholder}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                  <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{promptData[promptSteps[currentStep].fieldName].length} characters</span>
                    <span>Recommended: 20-100 characters</span>
                  </div>
                </div>
                
                {promptSteps[currentStep].exampleValue && (
                  <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Example:</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {promptSteps[currentStep].exampleValue}
                    </div>
                    <button
                      onClick={useExampleValue}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Use this example
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between mt-4">
                <button
                  onClick={goToPreviousStep}
                  disabled={currentStep === 0}
                  className={`px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200 text-sm ${currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  Previous
                </button>
                <button
                  onClick={goToNextStep}
                  disabled={isGeneratingPrompt}
                  className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center"
                >
                  {currentStep === promptSteps.length - 1 ? (
                    isGeneratingPrompt ? (
                      <>
                        <LoadingIcon icon="three-dots" className="w-4 h-4 mr-2" />
                        Generating...
                      </>
                    ) : 'Generate Prompt'
                  ) : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Main;
