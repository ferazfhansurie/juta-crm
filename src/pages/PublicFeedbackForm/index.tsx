import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from "@/components/Base/Button";
import LoadingIcon from '@/components/Base/LoadingIcon';
import axios from 'axios';
// import { generateCertificate } from '@/utils/pdfCert';
import Papa from 'papaparse';

// CSV URL for participant data
const RSVP_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9Wlb5GVpeT1FUavQdufnLukU1oyRWh1AaKKSJlGoFAAgjqxIh4JeHcNkK58JHT4BBP_qrkQacDtYc/pub?output=csv";

interface FormField {
  id: string;
  type: 'rating' | 'multiple-choice' | 'text' | 'yes-no';
  question: string;
  required: boolean;
  options?: string[];
  ratingScale?: number;
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  companyId: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

interface FormResponse {
  formId: string;
  formTitle: string;
  phoneNumber: string;
  responses: {
    fieldId: string;
    question: string;
    answer: string | number;
  }[];
  submittedAt: string;
}

function PublicFeedbackForm() {
  const { formTitle, phone } = useParams<{ formTitle: string; phone: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [certificateStatus, setCertificateStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const [responses, setResponses] = useState<{ [fieldId: string]: string | number }>({});
  const [phoneNumber, setPhoneNumber] = useState( '+60');
  const [baseUrl] = useState<string>('https://juta-dev.ngrok.dev');
  const [showAlreadySubmittedAlert, setShowAlreadySubmittedAlert] = useState(false);

  useEffect(() => {
    if (formTitle) {
      fetchForm(formTitle);
    }
  }, [formTitle]);

  const fetchForm = async (title: string) => {
    try {
      const response = await axios.get(`${baseUrl}/api/feedback-forms/public/${title}`);
      if (response.data.success) {
        setForm(response.data.form);
      } else {
        alert('Form not found or inactive');
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching form:', error);
      alert('Failed to load form');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseChange = (fieldId: string, value: string | number) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateForm = () => {
    if (!form) return false;
    
    for (const field of form.fields) {
      if (field.required) {
        const response = responses[field.id];
        if (!response || (typeof response === 'string' && response.trim() === '')) {
          alert(`Please answer the required question: ${field.question}`);
          return false;
        }
      }
    }
    
    if (!phoneNumber.trim()) {
      alert('Please enter your phone number');
      return false;
    }
    
    return true;
  };

  const submitForm = async () => {
    const requestId = Math.random().toString(36).substring(2, 10);
    console.log(`[Form][${requestId}] ===== FORM SUBMISSION STARTED =====`);
    
    if (!validateForm() || !form) {
      console.log(`[Form][${requestId}] ❌ Form validation failed, cannot submit`);
      return;
    }

    console.log(`[Form][${requestId}] ✅ Form validation passed, starting submission...`);
    setIsSubmitting(true);
    
    try {
      const formResponse: FormResponse = {
        formId: form.id,
        formTitle: formTitle || '',
        phoneNumber: phoneNumber.trim(),
        responses: form.fields.map(field => ({
          fieldId: field.id,
          question: field.question,
          answer: responses[field.id] || ''
        })),
        submittedAt: new Date().toISOString()
      };

      console.log(`[Form][${requestId}] Form response prepared:`, JSON.stringify(formResponse, null, 2));
      console.log(`[Form][${requestId}] Submitting to: ${baseUrl}/api/feedback-forms/submit`);

      const startTime = Date.now();
      const response = await axios.post(`${baseUrl}/api/feedback-forms/submit`, formResponse);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[Form][${requestId}] Form submission completed in ${duration}ms`);
      console.log(`[Form][${requestId}] Response status: ${response.status}`);
      console.log(`[Form][${requestId}] Response data:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        console.log(`[Form][${requestId}] ✅ Form submitted successfully, initiating certificate generation...`);
        
        // Start certificate generation process
        setIsGeneratingCertificate(true);
        setCertificateStatus('pending');
        
        try {
          console.log(`[Form][${requestId}] Starting certificate generation process...`);
          await generateAndSendCertificate();
          console.log(`[Form][${requestId}] Certificate generation process completed`);
          setCertificateStatus('success');
          
          // Wait a moment to show success state before navigating
          setTimeout(() => {
            console.log(`[Form][${requestId}] Navigating to thank you page...`);
            navigate('/thank-you');
          }, 2000);
          
        } catch (certError) {
          console.error(`[Form][${requestId}] ❌ Error generating certificate:`, certError);
          setCertificateStatus('error');
          console.log(`[Form][${requestId}] Certificate generation failed, staying on page`);
          // Stay on page to show error and support options
        }
      } else {
        console.error(`[Form][${requestId}] ❌ Form submission failed:`, response.data.error);
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error(`[Form][${requestId}] ❌ Error submitting form:`, error);
      
      // Check if it's an axios error with response data
      if (error.response && error.response.data) {
        const errorMessage = error.response.data.error;
        console.log(`[Form][${requestId}] Error response data:`, JSON.stringify(error.response.data, null, 2));
        
        // Check if the error indicates the form has already been submitted
        if (errorMessage && errorMessage.includes('already submitted')) {
          console.log(`[Form][${requestId}] Form already submitted, showing alert and navigating to thank you page`);
          setShowAlreadySubmittedAlert(true);
          // Navigate after a short delay to allow user to see the message
          setTimeout(() => {
            navigate('/thank-you');
          }, 3000);
          return;
        }
        
        // For other specific errors, show the actual error message
        if (errorMessage) {
          console.log(`[Form][${requestId}] Showing error message to user: ${errorMessage}`);
          alert(errorMessage);
          return;
        }
      }
      
      // Generic error message for other cases
      console.log(`[Form][${requestId}] Showing generic error message to user`);
      alert('Failed to submit form. Please try again.');
    } finally {
      console.log(`[Form][${requestId}] Form submission process completed, setting isSubmitting to false`);
      setIsSubmitting(false);
    }
    
    console.log(`[Form][${requestId}] ===== FORM SUBMISSION COMPLETED =====`);
  };

  // Note: CSV parsing and participant lookup are now handled by the backend API
  /*
  // Helper function to fetch and parse CSV data
  const fetchParticipantData = async () => {
    try {
      const response = await fetch(RSVP_CSV_URL);
      const csvText = await response.text();
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data);
          },
          error: (error: any) => {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error fetching participant data:', error);
      return [];
    }
  };

  // Helper function to normalize phone number for comparison
  const normalizePhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, ""); // Remove all non-digits
  };

  // Helper function to find participant by phone number
  const findParticipantByPhone = (participants: any[], phoneNumber: string) => {
    const normalizedSearchPhone = normalizePhoneNumber(phoneNumber);
    
    return participants.find((participant: any) => {
      const participantPhone = participant.Phone || participant['Mobile Number'] || '';
      const normalizedParticipantPhone = normalizePhoneNumber(participantPhone);
      
      return normalizedParticipantPhone === normalizedSearchPhone;
    });
  };
  */

  // Helper function to get company data from NeonDB
  const getCompanyApiUrl = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      throw new Error("No user email found");
    }

    const response = await fetch(
      `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
        userEmail
      )}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch company data");
    }

    const data = await response.json();

    return {
      apiUrl:
        data.companyData.api_url || baseUrl,
      companyId: data.userData.companyId,
    };
  };

  // Helper function to get company ID
  const getCompanyId = async () => {
    try {
      console.log('[getCompanyId] Getting company data...');
      const { companyId } = await getCompanyApiUrl();
      console.log('[getCompanyId] Company ID retrieved:', companyId);
      return companyId;
    } catch (error) {
      console.error('[getCompanyId] Error getting company ID:', error);
      throw error;
    }
  };

  // Note: File upload is now handled by the backend API
  /*
  // Helper to upload a file to NeonDB storage and get a public URL
  const uploadFile = async (file: File | Blob, fileName: string): Promise<string> => {
    const { apiUrl, companyId } = await getCompanyApiUrl();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    formData.append('companyId', companyId);
    
    const response = await fetch(`${apiUrl}/api/upload-file`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload file');
    }
    
    const result = await response.json();
    return result.url;
  };
  */

  // Note: WhatsApp document messaging is now handled by the backend API
  /*
  // Helper to send a WhatsApp document message
  const sendDocumentMessage = async (chatId: string, documentUrl: string, fileName: string, caption: string) => {
    const { apiUrl, companyId } = await getCompanyId();
    const userName = localStorage.getItem("userName") || localStorage.getItem("userEmail") || '';
    // Use phoneIndex 0 for now (or extend if needed)
    const phoneIndex = 0;
    const response = await fetch(`${apiUrl}/api/v2/messages/document/${companyId}/${chatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentUrl: documentUrl,
        filename: fileName,
        phoneIndex: phoneIndex,
        userName: userName,
      }),
    });
    if (!response.ok) throw new Error(`API failed with status ${response.status}`);
    return await response.json();
  };
  */

  // Note: WhatsApp text messaging is now handled by the backend API
  /*
  // Helper to send a WhatsApp text message
  const sendTextMessage = async (chatId: string, text: string) => {
    const { apiUrl, companyId } = await getCompanyApiUrl();
    const userName = localStorage.getItem("userName") || localStorage.getItem("userEmail") || '';
    const phoneIndex = 0;
    const response = await fetch(`${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        phoneNumber: phoneNumber,
        phoneIndex: phoneIndex,
        userName: userName,
      }),
    });
    if (!response.ok) throw new Error(`API failed with status ${response.status}`);
    return await response.json();
  };
  */

  // Helper function to call backend API for certificate generation and WhatsApp sending
  const generateAndSendCertificate = async () => {
    const requestId = Math.random().toString(36).substring(2, 10);
    console.log(`[Frontend][${requestId}] ===== CERTIFICATE GENERATION STARTED =====`);
    
    try {
      // Get company ID first
      console.log(`[Frontend][${requestId}] Getting company ID...`);
      const companyId = await getCompanyId();
      console.log(`[Frontend][${requestId}] Company ID: ${companyId}`);
      
      // Prepare request payload
      const requestPayload = {
        phoneNumber: phoneNumber.trim(),
        formId: form?.id,
        formTitle: formTitle,
        companyId: companyId
      };
      
      console.log(`[Frontend][${requestId}] Request payload:`, JSON.stringify(requestPayload, null, 2));
      console.log(`[Frontend][${requestId}] API endpoint: ${baseUrl}/api/certificates/generate-and-send`);
      
      // Log individual field validation
      console.log(`[Frontend][${requestId}] Field validation:`);
      console.log(`[Frontend][${requestId}]   phoneNumber: ${requestPayload.phoneNumber ? `"${requestPayload.phoneNumber}"` : '❌ MISSING'}`);
      console.log(`[Frontend][${requestId}]   formId: ${requestPayload.formId ? `"${requestPayload.formId}"` : '❌ MISSING'}`);
      console.log(`[Frontend][${requestId}]   formTitle: ${requestPayload.formTitle ? `"${requestPayload.formTitle}"` : '❌ MISSING'}`);
      console.log(`[Frontend][${requestId}]   companyId: ${requestPayload.companyId ? `"${requestPayload.companyId}"` : '❌ MISSING'}`);
      
      // Validate all required fields are present
      if (!requestPayload.phoneNumber || !requestPayload.formId || !requestPayload.formTitle || !requestPayload.companyId) {
        console.error(`[Frontend][${requestId}] ❌ Validation failed - missing required fields`);
        console.error(`[Frontend][${requestId}] Cannot proceed with certificate generation`);
        throw new Error('Missing required fields for certificate generation');
      }
      
      console.log(`[Frontend][${requestId}] ✅ All required fields present, making API call...`);
      
      // Call backend API to handle certificate generation and WhatsApp sending
      const startTime = Date.now();
      console.log(`[Frontend][${requestId}] API call started at: ${new Date(startTime).toISOString()}`);
      
      const response = await axios.post(`${baseUrl}/api/certificates/generate-and-send`, requestPayload);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[Frontend][${requestId}] API call completed in ${duration}ms`);
      
      console.log(`[Frontend][${requestId}] Response status: ${response.status}`);
      console.log(`[Frontend][${requestId}] Response data:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        console.log(`[Frontend][${requestId}] ✅ Certificate generation and WhatsApp sending initiated successfully`);
        console.log(`[Frontend][${requestId}] Participant: ${response.data.participantName}`);
        console.log(`[Frontend][${requestId}] Certificate file: ${response.data.filename}`);
        console.log(`[Frontend][${requestId}] WhatsApp status: ${response.data.whatsappStatus}`);
        console.log(`[Frontend][${requestId}] Has WhatsApp client: ${response.data.hasWhatsAppClient}`);
        
        // Log success details
        if (response.data.certificatePath) {
          console.log(`[Frontend][${requestId}] Certificate saved to: ${response.data.certificatePath}`);
        }
      } else {
        console.error(`[Frontend][${requestId}] ❌ Certificate generation failed`);
        console.error(`[Frontend][${requestId}] Error: ${response.data.error}`);
        if (response.data.details) {
          console.error(`[Frontend][${requestId}] Details: ${response.data.details}`);
        }
        throw new Error(response.data.error || 'Certificate generation failed');
      }
      
    } catch (error: any) {
      console.error(`[Frontend][${requestId}] ❌ Error calling certificate API:`, error);
      
      // Log detailed error information
      if (error.response) {
        // Server responded with error status
        console.error(`[Frontend][${requestId}] Error response status: ${error.response.status}`);
        console.error(`[Frontend][${requestId}] Error response data:`, JSON.stringify(error.response.data, null, 2));
        console.error(`[Frontend][${requestId}] Error response headers:`, error.response.headers);
      } else if (error.request) {
        // Request was made but no response received
        console.error(`[Frontend][${requestId}] No response received from server`);
        console.error(`[Frontend][${requestId}] Request details:`, error.request);
      } else {
        // Something else happened
        console.error(`[Frontend][${requestId}] Error message: ${error.message}`);
        console.error(`[Frontend][${requestId}] Error stack:`, error.stack);
      }
      
      // Log network/connection details
      if (error.code) {
        console.error(`[Frontend][${requestId}] Error code: ${error.code}`);
      }
      if (error.syscall) {
        console.error(`[Frontend][${requestId}] System call: ${error.syscall}`);
      }
      
      // Re-throw the error so the calling function can handle it properly
      throw error;
    } finally {
      // Always set generating to false when done
      setIsGeneratingCertificate(false);
    }
    
    console.log(`[Frontend][${requestId}] ===== CERTIFICATE GENERATION COMPLETED =====`);
  };

  // Note: WhatsApp message sending is now handled by the backend API
  /*
  const sendWhatsAppMessage = async (participantName: string, certBlob: Blob, participant: any) => {
    try {
      // Format phone number for WhatsApp
      let phoneDigits = String(phoneNumber).replace(/\D/g, "");
      if (!phoneDigits.startsWith("6")) phoneDigits = "6" + phoneDigits;
      const chatId = phoneDigits + "@c.us";

      // Create thank you message based on program date
      let thankYouText = '';
      thankYouText = `Dear ${participantName}\n\nThank You for Attending FUTUREX.AI 2025\n\nOn behalf of the organizing team, we would like to extend our heartfelt thanks for your participation in FUTUREX.AI 2025 held on 7 August 2025.\n\nYour presence and engagement in the Business Automation & AI Chatbot Experience session greatly contributed to the success of the event.\n\nWe hope the experience was insightful and inspiring as we continue to explore how artificial intelligence and robotics can shape the future.\n\nWe hope you can join our next event as well.\n\nPlease find your digital certificate of participation attached.\n\nWarm regards,\nCo9P AI Chatbot`;

      // Send text message
      await sendTextMessage(chatId, thankYouText);

      // Upload certificate and send as document
      const fileName = `${participantName.replace(/[^a-zA-Z0-9]/g, "_")}_FUTUREX.AI_2025_Certificate.pdf`;
      const certUrl = await uploadFile(certBlob, fileName);
      await sendDocumentMessage(chatId, certUrl, fileName, "Certificate of Participation");

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      // Don't throw the error - just log it
      // This ensures the form submission still succeeds even if certificate generation fails
    }
  };
  */

  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';

    switch (field.type) {
      case 'rating':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span className="font-medium">Poor</span>
              <span className="font-medium">Excellent</span>
            </div>
            <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start">
              {Array.from({ length: field.ratingScale || 5 }, (_, i) => (
                <button
                  key={i + 1}
                  type="button"
                  onClick={() => handleResponseChange(field.id, i + 1)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                    value === i + 1
                      ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <span className="font-semibold text-sm sm:text-base">{i + 1}</span>
                </button>
              ))}
            </div>
            <div className="text-center text-sm text-gray-600">
              {value ? `You selected: ${value} out of ${field.ratingScale || 5}` : 'Click to rate'}
            </div>
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(field.id, e.target.value)}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-gray-900 text-sm sm:text-base">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'yes-no':
        return (
          <div className="flex gap-3 sm:gap-4">
            <label className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer flex-1">
              <input
                type="radio"
                name={field.id}
                value="Yes"
                checked={value === 'Yes'}
                onChange={(e) => handleResponseChange(field.id, e.target.value)}
                className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 font-medium text-sm sm:text-base">Yes</span>
            </label>
            <label className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer flex-1">
              <input
                type="radio"
                name={field.id}
                value="No"
                checked={value === 'No'}
                onChange={(e) => handleResponseChange(field.id, e.target.value)}
                className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 font-medium text-sm sm:text-base">No</span>
            </label>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <textarea
              value={value as string}
              onChange={(e) => handleResponseChange(field.id, e.target.value)}
              className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm sm:text-base"
              rows={4}
              placeholder="Type your answer here..."
            />
            <div className="text-sm text-gray-500">
              {typeof value === 'string' && value.length > 0 ? `${value.length} characters` : 'Share your thoughts...'}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingIcon icon="three-dots" className="w-16 h-16 sm:w-20 sm:h-20" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Form Not Found</h1>
          <p className="text-gray-600 text-sm sm:text-base">The form you're looking for doesn't exist or is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-4 sm:mb-6">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">{form.title}</h1>
          {form.description && (
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">{form.description}</p>
          )}
          <div className="mt-4 sm:mt-6 flex items-center justify-center text-xs sm:text-sm text-gray-500">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your responses are secure and private
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <form onSubmit={(e) => { e.preventDefault(); submitForm(); }} className="p-4 sm:p-6 md:p-8">
            {/* Phone Number Field */}
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-blue-50 rounded-xl border border-blue-100">
              <label className="block text-base sm:text-lg font-semibold text-gray-900 mb-3">
                Contact Information
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="flex-shrink-0 flex justify-center sm:justify-start">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                    placeholder="+60 12-345 6789"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-6 sm:space-y-8">
              {form.fields.map((field, index) => (
                <div key={field.id} className="group">
                  <div className="p-4 sm:p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200">
                    <div className="mb-4 sm:mb-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium text-gray-600">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="block text-base sm:text-lg font-medium text-gray-900 mb-3">
                            {field.question}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <div className="mt-4">
                            {renderField(field)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                  {form.fields.filter(f => f.required).length} required questions
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || isGeneratingCertificate}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : isGeneratingCertificate ? (
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating Certificate...</span>
                    </div>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </div>
            </div>

            {/* Certificate Status Display */}
            {isGeneratingCertificate && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <h3 className="font-medium text-blue-900">Generating Your Certificate</h3>
                    <p className="text-sm text-blue-700">Please wait while we create and send your certificate via WhatsApp...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate Success/Error Status */}
            {certificateStatus === 'success' && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-green-900">Certificate Sent Successfully!</h3>
                    <p className="text-sm text-green-700">Your certificate has been generated and sent to your WhatsApp. Redirecting to thank you page...</p>
                  </div>
                </div>
              </div>
            )}

            {certificateStatus === 'error' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-medium text-red-900">Certificate Generation Failed</h3>
                    <p className="text-sm text-red-700 mb-3">
                      We encountered an issue while generating your certificate. Don't worry, your feedback has been submitted successfully.
                    </p>
                    
                    {/* WhatsApp Support Button */}
                    <div className="space-y-3">
                      <p className="text-sm text-red-600 font-medium">
                        Need help? Contact our support team via WhatsApp:
                      </p>
                      
                      <a
                        href={`https://wa.me/601137206640?text=Hi, I'm having an issue with my feedback form certificate for ${formTitle || 'the event'}. My phone number is ${phoneNumber || 'not provided'}. Can you help me get my certificate?`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200 shadow hover:shadow-md"
                      >
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.86 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.88 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                        </svg>
                        Chat with Support
                      </a>
                      
                      <div className="text-center">
                        <button
                          onClick={() => {
                            setCertificateStatus(null);
                            setIsGeneratingCertificate(false);
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Already Submitted Alert */}
        {showAlreadySubmittedAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Already Submitted!</h3>
              <p className="text-gray-600 mb-4">
                You have already submitted this feedback form. Thank you for your participation!
              </p>
              <div className="text-sm text-gray-500 mb-4">
                Redirecting to thank you page in a few seconds...
              </div>
              <button
                onClick={() => navigate('/thank-you')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Go to Thank You Page
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-500 px-2">
          <p>Thank you for taking the time to provide your feedback!</p>
        </div>

        {/* WhatsApp Support Section */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you encounter any issues or need assistance, our support team is here to help!
            </p>
            
            <a
              href={`https://wa.me/601137206640?text=Hi, I need help with the feedback form for ${formTitle || 'the event'}. My phone number is ${phoneNumber || 'not provided'}. Can you assist me?`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200 shadow hover:shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.86 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.88 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Chat with Support via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicFeedbackForm; 