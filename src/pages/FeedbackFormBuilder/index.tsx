import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  form_title?: string;
  description: string;
  fields: FormField[];
  companyId: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
  shareLink?: string;
}

function FeedbackFormBuilder() {
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentForm, setCurrentForm] = useState<Form>({
    id: '',
    title: '',
    description: '',
    fields: [],
    companyId: '',
    createdBy: '',
    createdAt: new Date().toISOString(),
    isActive: true
  });
  const [companyId, setCompanyId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [baseUrl] = useState<string>('https://juta-dev.ngrok.dev');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const email = localStorage.getItem('userEmail');
      if (!email) {
        throw new Error('No user email found');
      }
      setUserEmail(email);

      const response = await axios.get(`${baseUrl}/api/user-data/${email}`);
      const userData = response.data;
      setCompanyId(userData.company_id);

      await fetchForms(userData.company_id);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchForms = async (companyId: string) => {
    try {
      const response = await axios.get(`${baseUrl}/api/feedback-forms/${companyId}`);
      console.log('Fetched forms:', response.data.forms);
      setForms(response.data.forms || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      type: 'rating',
      question: '',
      required: false,
      ratingScale: 5
    };
    setCurrentForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setCurrentForm(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const removeField = (fieldId: string) => {
    setCurrentForm(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  const saveForm = async () => {
    try {
      // Generate form_title if not already present
      let formTitle = currentForm.form_title;
      if (!formTitle) {
        formTitle = currentForm.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Remove multiple consecutive hyphens
          .trim();
      }

      const formData = {
        ...currentForm,
        form_title: formTitle, // Ensure form_title is included
        companyId,
        createdBy: userEmail,
        createdAt: isEditing ? currentForm.createdAt : new Date().toISOString()
      };

      console.log('Saving form data:', formData);

      let response;
      if (isEditing) {
        response = await axios.put(`${baseUrl}/api/feedback-forms/${currentForm.id}`, formData);
      } else {
        response = await axios.post(`${baseUrl}/api/feedback-forms`, formData);
      }
      
      console.log('Save response:', response.data);
      
      if (response.data.success) {
        alert(isEditing ? 'Form updated successfully!' : 'Form saved successfully!');
        setShowCreateForm(false);
        setIsEditing(false);
        setCurrentForm({
          id: '',
          title: '',
          description: '',
          fields: [],
          companyId: '',
          createdBy: '',
          createdAt: new Date().toISOString(),
          isActive: true
        });
        await fetchForms(companyId);
      }
    } catch (error) {
      console.error('Error saving form:', error);
      alert(isEditing ? 'Failed to update form' : 'Failed to save form');
    }
  };

  const generateShareLink = async (form: Form) => {
    try {
      // Use form_title from database if available, otherwise generate from title
      let formTitle = form.form_title;
      
      if (!formTitle) {
        // Generate URL-friendly form title
        formTitle = form.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Remove multiple consecutive hyphens
          .trim();
      }
      
      console.log('Original form title:', form.title);
      console.log('Form data:', form);
      console.log('Generated formTitle:', formTitle);
      
      // Test the API endpoint to see if it works
      try {
        const testResponse = await axios.get(`${baseUrl}/api/feedback-forms/public/${formTitle}`);
        console.log('API test response:', testResponse.data);
      } catch (apiError: any) {
        console.error('API test failed:', apiError.response?.data || apiError.message);
        
        // If the API test fails, try with the original title as fallback
        if (formTitle !== form.title) {
          console.log('Trying with original title as fallback...');
          try {
            const fallbackResponse = await axios.get(`${baseUrl}/api/feedback-forms/public/${form.title}`);
            console.log('Fallback API test response:', fallbackResponse.data);
            formTitle = form.title; // Use original title if it works
          } catch (fallbackError: any) {
            console.error('Fallback API test also failed:', fallbackError.response?.data || fallbackError.message);
          }
        }
      }
      
      // Generate the share link with the correct frontend route
      const shareLink = `${window.location.origin}/feedback/${formTitle}/{phone}`;
      console.log('Final share link:', shareLink);
      
      navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard! You can replace {phone} with the actual phone number when sharing.');
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('Failed to generate share link');
    }
  };

  const editForm = (form: Form) => {
    console.log('Editing form:', form);
    setCurrentForm({
      ...form,
      companyId: form.companyId || companyId,
      createdBy: form.createdBy || userEmail
    });
    setIsEditing(true);
    setShowCreateForm(true);
  };

  const deleteForm = async (formId: string) => {
    if (confirm('Are you sure you want to delete this form?')) {
      try {
        const response = await axios.delete(`${baseUrl}/api/feedback-forms/${formId}`);
        if (response.data.success) {
          alert('Form deleted successfully!');
          await fetchForms(companyId);
        }
      } catch (error) {
        console.error('Error deleting form:', error);
        alert('Failed to delete form');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingIcon icon="three-dots" className="w-20 h-20" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Feedback Form Builder</h1>
          <Link to="/settings">
            <Button variant="outline-secondary">Back to Settings</Button>
          </Link>
        </div>

        {!showCreateForm ? (
          <>
            <div className="mb-6">
              <Button 
                variant="primary" 
                onClick={() => setShowCreateForm(true)}
                className="shadow-md"
              >
                Create New Form
              </Button>
            </div>

            <div className="grid gap-6">
              {forms.map((form) => (
                <div key={form.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{form.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">{form.description}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Created: {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={() => editForm(form)}
                        className="text-sm"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="success"
                        onClick={() => generateShareLink(form)}
                        className="text-sm"
                      >
                        Copy Share Link
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteForm(form.id)}
                        className="text-sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {form.fields.length} questions
                  </div>
                </div>
              ))}
              
              {forms.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No forms created yet. Create your first feedback form!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{isEditing ? 'Edit Form' : 'Create New Form'}</h2>
              <Button 
                variant="outline-secondary" 
                onClick={() => {
                  setShowCreateForm(false);
                  setIsEditing(false);
                  setCurrentForm({
                    id: '',
                    title: '',
                    description: '',
                    fields: [],
                    companyId: '',
                    createdBy: '',
                    createdAt: new Date().toISOString(),
                    isActive: true
                  });
                }}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block mb-2 font-medium">Form Title</label>
                <input
                  type="text"
                  value={currentForm.title}
                  onChange={(e) => setCurrentForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Enter form title"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium">Description</label>
                <textarea
                  value={currentForm.description}
                  onChange={(e) => setCurrentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                  placeholder="Enter form description"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Questions</h3>
                  <Button variant="primary" onClick={addField} className="text-sm">
                    Add Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {currentForm.fields.map((field, index) => (
                    <div key={field.id} className="border rounded p-4 dark:border-gray-600">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium">Question {index + 1}</span>
                        <Button
                          variant="danger"
                          onClick={() => removeField(field.id)}
                          className="text-sm"
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block mb-1 text-sm">Question Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                          >
                            <option value="rating">Rating Scale</option>
                            <option value="multiple-choice">Multiple Choice</option>
                            <option value="text">Text Input</option>
                            <option value="yes-no">Yes/No</option>
                          </select>
                        </div>

                        <div>
                          <label className="block mb-1 text-sm">Question</label>
                          <input
                            type="text"
                            value={field.question}
                            onChange={(e) => updateField(field.id, { question: e.target.value })}
                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            placeholder="Enter your question"
                          />
                        </div>

                        {field.type === 'rating' && (
                          <div>
                            <label className="block mb-1 text-sm">Rating Scale</label>
                            <select
                              value={field.ratingScale}
                              onChange={(e) => updateField(field.id, { ratingScale: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                            >
                              <option value={3}>1-3</option>
                              <option value={5}>1-5</option>
                              <option value={10}>1-10</option>
                            </select>
                          </div>
                        )}

                        {field.type === 'multiple-choice' && (
                          <div>
                            <label className="block mb-1 text-sm">Options (one per line)</label>
                            <textarea
                              value={field.options?.join('\n') || ''}
                              onChange={(e) => updateField(field.id, { 
                                options: e.target.value.split('\n').filter(opt => opt.trim()) 
                              })}
                              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                              rows={3}
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                            />
                          </div>
                        )}

                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              className="form-checkbox"
                            />
                            <span className="text-sm">Required</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="primary"
                  onClick={saveForm}
                  disabled={!currentForm.title || currentForm.fields.length === 0}
                  className="shadow-md"
                >
                  {isEditing ? 'Update Form' : 'Save Form'}
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setShowCreateForm(false);
                    setIsEditing(false);
                    setCurrentForm({
                      id: '',
                      title: '',
                      description: '',
                      fields: [],
                      companyId: '',
                      createdBy: '',
                      createdAt: new Date().toISOString(),
                      isActive: true
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackFormBuilder; 