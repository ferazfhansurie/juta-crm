import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { FormInput, FormLabel, FormSelect, FormTextarea } from "@/components/Base/Form";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import logoUrl from "@/assets/images/logo.png";
import logoUrl2 from "@/assets/images/logo3.png";

interface Tag {
  id: string;
  name: string;
}

interface AIResponse {
  id: string;
  keywords: string[];
  description: string;
  status: 'active' | 'inactive';
  type: 'tag' | 'image';
  tags?: string[];
  removeTags?: string[];
  tagActionMode?: 'add' | 'delete';
  imageUrls?: string[];
  keywordSource: 'user' | 'bot' | 'own';
}

const OnboardingAIResponses: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [description, setDescription] = useState('');
  const [keywordSource, setKeywordSource] = useState<'user' | 'bot' | 'own'>('user');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();
  const baseUrl = 'https://juta-dev.ngrok.dev';

  const steps = [
    { id: 1, title: "Welcome", icon: "🤖" },
    { id: 2, title: "Choose Type", icon: "🎯" },
    { id: 3, title: "Configure", icon: "⚙️" },
    { id: 4, title: "Test & Learn", icon: "🧪" }
  ];

  // Fetch company ID on component mount
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const userEmail = localStorage.getItem('userEmail') || '';
        
        if (!userEmail) {
          console.error('No user email found');
          return;
        }

        const response = await fetch(
          `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`, 
          {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch user config');
        }

        const dataUser = await response.json();
        
        if (dataUser && dataUser.company_id) {
          setCompanyId(dataUser.company_id);
          localStorage.setItem('companyId', dataUser.company_id);
        }
      } catch (error) {
        console.error('Error fetching company ID:', error);
        toast.error('Error fetching company ID!');
      }
    };

    fetchCompanyDetails();
  }, []);



  const addKeywordField = () => {
    setKeywords([...keywords, '']);
  };

  const removeKeywordField = (index: number) => {
    if (keywords.length > 1) {
      setKeywords(keywords.filter((_, i) => i !== index));
    }
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map(file => URL.createObjectURL(file));
    setSelectedImages(files);
    setSelectedImageUrls(urls);
  };

  const handleImageRemove = (index: number) => {
    URL.revokeObjectURL(selectedImageUrls[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setSelectedImageUrls(prev => prev.filter((_, i) => i !== index));
  };



  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${baseUrl}/api/upload-media`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      return data.url;
    });

    return Promise.all(uploadPromises);
  };

  const createResponse = async () => {
    if (isCreating) {
      toast.warning("Response creation already in progress...");
      return;
    }

    const validKeywords = keywords.filter(k => k.trim() !== '');
    if (validKeywords.length === 0) {
      toast.error('Please provide at least one keyword');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is missing');
      return;
    }

    // Validate image selection
    if (selectedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setIsCreating(true);
    try {
      const imageUrls = await uploadFiles(selectedImages);
      const additionalData = { 
        image_urls: imageUrls,
        analysis_result: null
      };

      const responseData = {
        companyId: companyId,
        type: 'image',
        data: {
          keywords: validKeywords,
          description: description,
          status: 'active',
          keyword_source: keywordSource,
          ...additionalData
        }
      };

      const response = await fetch(`${baseUrl}/api/ai-responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(responseData)
      });

      if (!response.ok) {
        throw new Error('Failed to create response');
      }

      const result = await response.json();

      if (result.success) {
        toast.success('AI Response created successfully!');
        setTimeout(() => navigate('/loading'), 1500);
      } else {
        throw new Error(result.message || 'Failed to create response');
      }
    } catch (error) {
      console.error('Error creating response:', error);
      toast.error('Error creating response');
    } finally {
      setIsCreating(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                AI Responses
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Teach your AI how to respond automatically to customer messages
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">🖼️</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Image Responses</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Send visual content automatically</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">🏷️</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Tag Responses</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Auto-organize contacts</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">🎵</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Voice Responses</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Send audio messages</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">📄</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Document Responses</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Share files automatically</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">👥</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Assign Responses</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Route to team members</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">🎬</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Video Responses</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Share video content</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">💡</div>
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                  How AI Responses Work
                </h3>
              </div>
              <div className="text-xs text-green-800 dark:text-green-200 space-y-2">
                <p>• <strong>Keywords:</strong> Your AI watches for specific words in customer messages</p>
                <p>• <strong>Automatic Action:</strong> When keywords are detected, AI responds automatically</p>
                <p>• <strong>Smart Tagging:</strong> Add or remove tags to organize your contacts</p>
                <p>• <strong>Visual Support:</strong> Send relevant images to enhance customer experience</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                Choose Response Type
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select what type of AI response you want to create
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🖼️</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Image Response</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Send relevant images automatically when customers ask for visual information
                </p>
                <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                  Perfect for: Product demos, visual guides, brochures
                </div>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🏷️</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Tag Response</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically add or remove tags when customers use specific keywords
                </p>
                <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                  Perfect for: Lead qualification, customer categorization
                </div>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎵</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Voice Response</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Send audio messages and voice recordings automatically
                </p>
                <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
                  Perfect for: Audio guides, voice messages, podcasts
                </div>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Document Response</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically send relevant documents and files
                </p>
                <div className="mt-3 text-xs text-orange-600 dark:text-orange-400">
                  Perfect for: Brochures, contracts, guides, forms
                </div>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Assign Response</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Automatically assign customers to team members
                </p>
                <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400">
                  Perfect for: Lead distribution, customer support
                </div>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/20">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎬</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Video Response</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Send video content automatically when customers request it
                </p>
                <div className="mt-3 text-xs text-red-600 dark:text-red-400">
                  Perfect for: Product demos, tutorials, testimonials
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">💡 What Happens Next?</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                This onboarding focuses on Image Responses to teach you the basics. You'll learn how to upload images and set keywords that trigger automatic responses. Later, you can explore all these response types in the full AI Responses dashboard.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-lg mx-auto">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                Configure Your Response
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set up the keywords and actions for your AI response
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              {/* Keywords */}
              <div>
                <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  🔑 Trigger Keywords
                </FormLabel>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  When customers use these words, your AI will respond automatically
                </p>
                {keywords.map((keyword, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <FormInput
                      value={keyword}
                      onChange={(e) => updateKeyword(index, e.target.value)}
                      placeholder="e.g., pricing, demo, interested"
                      className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => removeKeywordField(index)}
                      disabled={keywords.length === 1}
                      className="px-2 py-1.5 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={addKeywordField}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  + Add another keyword
                </button>
              </div>

              {/* Description */}
              <div>
                <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  📝 Description (Optional)
                </FormLabel>
                <FormTextarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this response does..."
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none text-sm"
                  rows={2}
                />
              </div>

              {/* Keyword Source */}
              <div>
                <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  🎯 Keyword Source
                </FormLabel>
                <FormSelect
                  value={keywordSource}
                  onChange={(e) => setKeywordSource(e.target.value as 'user' | 'bot' | 'own')}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                >
                  <option value="user">Customer messages</option>
                  <option value="bot">AI bot responses</option>
                  <option value="own">Your team messages</option>
                </FormSelect>
              </div>

              {/* Image configuration */}
              <div>
                <div>
                  <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    🖼️ Images to Send
                  </FormLabel>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Upload images that will be sent automatically
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  />
                  
                  {selectedImageUrls.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Images:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedImageUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={url} 
                              alt={`Image ${index + 1}`}
                              className="w-full h-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                            />
                            <button
                              onClick={() => handleImageRemove(index)}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧪</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">
                Test & Learn
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                See how your AI response will work in practice
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">🎯 How It Works</h3>
              
              <div className="space-y-3 text-left text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">Customer sends message with keyword:</p>
                    <p className="italic text-gray-600 dark:text-gray-400">
                      "{keywords[0] || 'pricing'}"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">AI automatically detects keyword and:</p>
                    <p className="text-green-600 dark:text-green-400">
                      Sends {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} automatically
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">Result:</p>
                    <p className="text-purple-600 dark:text-purple-400">
                      Customer gets instant, relevant response without manual intervention
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">💡</div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Pro Tips
                </h3>
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <p>• Use common words customers actually say</p>
                <p>• Test with real conversations to refine keywords</p>
                <p>• Combine with follow-up sequences for complete automation</p>
                <p>• Monitor performance and adjust based on results</p>
              </div>
            </div>

            <Button
              onClick={createResponse}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow"
              disabled={isCreating}
            >
              {isCreating ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </span>
              ) : (
                '🚀 Create AI Response'
              )}
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
            AI Responses Setup
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Teach your AI how to respond automatically to customer messages
          </p>
          
          {/* Back to Follow-ups Button */}
          <div className="mt-2">
            <button
              onClick={() => navigate('/follow-ups-onboarding')}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium"
            >
              ← Back to Follow-ups
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-2xl mb-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}>
                  {currentStep > step.id ? '✓' : step.icon}
                </div>
                <div className="ml-2">
                  <p className={`text-xs font-medium ${
                    currentStep >= step.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-3 ${
                    currentStep > step.id ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-2xl max-h-[50vh] overflow-y-auto">
          {renderStepContent()}
        </div>
        
        {/* Skip Button */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/loading')}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:underline"
          >
            Skip setup and go to dashboard →
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
          ) : null}
        </div>

        {/* Additional Info */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ready to explore more? Visit the full AI Responses dashboard
          </p>
          <button
            onClick={() => navigate('/loading')}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline mt-1"
          >
            Go to Full Dashboard →
          </button>
        </div>
      </div>

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
      />
    </div>
  );
};

export default OnboardingAIResponses;
