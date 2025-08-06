import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from "@/components/Base/Button";
import LoadingIcon from '@/components/Base/LoadingIcon';
import axios from 'axios';

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
  const [responses, setResponses] = useState<{ [fieldId: string]: string | number }>({});
  const [phoneNumber, setPhoneNumber] = useState( '');
  const [baseUrl] = useState<string>('https://juta-dev.ngrok.dev');

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
    if (!validateForm() || !form) return;

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

      const response = await axios.post(`${baseUrl}/api/feedback-forms/submit`, formResponse);
      
      if (response.data.success) {
        alert('Thank you for your feedback!');
        navigate('/');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="flex gap-3">
              {Array.from({ length: field.ratingScale || 5 }, (_, i) => (
                <button
                  key={i + 1}
                  type="button"
                  onClick={() => handleResponseChange(field.id, i + 1)}
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                    value === i + 1
                      ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                      : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <span className="font-semibold">{i + 1}</span>
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
              <label key={index} className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleResponseChange(field.id, e.target.value)}
                  className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'yes-no':
        return (
          <div className="flex gap-4">
            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer flex-1">
              <input
                type="radio"
                name={field.id}
                value="Yes"
                checked={value === 'Yes'}
                onChange={(e) => handleResponseChange(field.id, e.target.value)}
                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 font-medium">Yes</span>
            </label>
            <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer flex-1">
              <input
                type="radio"
                name={field.id}
                value="No"
                checked={value === 'No'}
                onChange={(e) => handleResponseChange(field.id, e.target.value)}
                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-gray-900 font-medium">No</span>
            </label>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <textarea
              value={value as string}
              onChange={(e) => handleResponseChange(field.id, e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
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
        <LoadingIcon icon="three-dots" className="w-20 h-20" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Form Not Found</h1>
          <p className="text-gray-600">The form you're looking for doesn't exist or is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{form.title}</h1>
          {form.description && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">{form.description}</p>
          )}
          <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your responses are secure and private
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <form onSubmit={(e) => { e.preventDefault(); submitForm(); }} className="p-8">
            {/* Phone Number Field */}
            <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Contact Information
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="+60 12-345 6789"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-8">
              {form.fields.map((field, index) => (
                <div key={field.id} className="group">
                  <div className="p-6 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200">
                    <div className="mb-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-lg font-medium text-gray-900 mb-3">
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
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {form.fields.filter(f => f.required).length} required questions
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="px-8 py-4 text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Thank you for taking the time to provide your feedback!</p>
        </div>
      </div>
    </div>
  );
}

export default PublicFeedbackForm; 