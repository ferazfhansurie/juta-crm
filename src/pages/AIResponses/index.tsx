import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from "@/components/Base/Button";
import { FormInput, FormLabel, FormSelect, FormTextarea, FormSwitch } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import { selectDarkMode } from "@/stores/darkModeSlice";
import { AIDocumentResponse, AIResponse, AIVoiceResponse, AITagResponse, AIImageResponse, AIAssignResponse, AIVideoResponse } from "@/types/AIResponses";
import clsx from "clsx";
import TagResponseForm from "@/components/AIResponses/TagResponseForm";
import ImageResponseForm from "@/components/AIResponses/ImageResponseForm";
import VoiceResponseForm from "@/components/AIResponses/VoiceResponseForm";
import AssignResponseForm from "@/components/AIResponses/AssignResponseForm";
import DocumentResponseForm from "@/components/AIResponses/DocumentResponseForm";
import VideoResponseForm from "@/components/AIResponses/VideoResponseForm";

interface Tag {
    id: string;
    name: string;
}
interface Employee {
    id: string;
    name: string;
    email: string;
    role?: string;
}

type AIResponseType = 'video' | 'voice' | 'tag' | 'document' | 'image' | 'assign';

function AIResponses() {
    const [responses, setResponses] = useState<AIResponse[]>([]);
    const [responseType, setResponseType] = useState<AIResponseType>('tag');
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedRemoveTags, setSelectedRemoveTags] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentResponseMedia, setCurrentResponseMedia] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [newResponse, setNewResponse] = useState({
        keywords: [''],
        description: '',
        status: 'active' as const
    });

    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
    const [selectedAudios, setSelectedAudios] = useState<File[]>([]);
    const [selectedAudioUrls, setSelectedAudioUrls] = useState<string[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<File[]>([]);
    const [selectedDocUrls, setSelectedDocUrls] = useState<string[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
    const [selectedVideoUrls, setSelectedVideoUrls] = useState<string[]>([]);

    const [keywordSource, setKeywordSource] = useState<'user' | 'bot' | 'own'>('user');
    const [tagActionMode, setTagActionMode] = useState<'add' | 'delete'>('add');
    const [companyId, setCompanyId] = useState<string>('');
    const [apiUrl, setApiUrl] = useState<string>('');
    const baseUrl = 'http://juta-dev.ngrok.dev';

    const darkMode = useAppSelector(selectDarkMode);

    // Fetch company ID
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

    useEffect(() => {
        if (companyId) {
            fetchResponses();
            fetchApiUrl();
            if (responseType === 'tag') {
                fetchTags();
            } else if (responseType === 'assign') {
                fetchEmployees();
            }
        }
    }, [responseType, companyId]);

    const fetchApiUrl = async () => {
      try{
        const response = await fetch(
            `${baseUrl}/api/company-data?companyId=${companyId}`, 
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) throw new Error('Failed to fetch API URL');
        const data = await response.json();
        
        if (data.api_url) {
            setApiUrl(data.api_url);
            localStorage.setItem('apiUrl', data.api_url);
        } 
      } catch (error) {
        console.error('Error fetching API URL:', error);
        toast.error('Error fetching API URL!');
      }
    };

    const fetchResponses = async () => {
        if (!companyId) return;
        
        setIsLoading(true);
        try {
            const response = await fetch(`${baseUrl}/api/ai-responses?companyId=${companyId}&type=${responseType}`);
            if (!response.ok) {
                throw new Error('Failed to fetch responses');
            }
            const data = await response.json();
            
            if (data.success) {
                const fetchedResponses: AIResponse[] = data.data.map((item: any) => {
                    const baseResponse = {
                        id: item.response_id,
                        keywords: Array.isArray(item.keywords) ? item.keywords : [item.keywords || ''],
                        description: item.description || '',
                        createdAt: new Date(item.created_at),
                        status: item.status || 'active',
                        keywordSource: item.keyword_source || 'user'
                    };

                    switch (responseType) {
                        case 'tag':
                            return { 
                                ...baseResponse, 
                                type: 'tag', 
                                tags: item.tags || [],
                                removeTags: item.remove_tags || [],
                                tagActionMode: item.tag_action_mode || 'add',
                                confidence: item.confidence || null
                            } as AITagResponse;
                        case 'image':
                            return { 
                                ...baseResponse, 
                                type: 'image', 
                                imageUrls: item.image_urls || [],
                                analysisResult: item.analysis_result || null
                            } as AIImageResponse;
                        case 'voice':
                            return { 
                                ...baseResponse, 
                                type: 'voice', 
                                voiceUrls: item.voice_urls || [],
                                audioUrl: item.audio_url || '',
                                captions: item.captions || [],
                                transcription: item.transcription || '',
                                language: item.language || 'en',
                                analysisResult: item.analysis_result || null
                            } as AIVoiceResponse;
                        case 'document':
                            return { 
                                ...baseResponse, 
                                type: 'document', 
                                documentUrls: item.document_urls || [],
                                documentNames: item.document_names || [],
                                documentUrl: item.document_url || '',
                                extractedText: item.extracted_text || '',
                                analysisResult: item.analysis_result || null
                            } as AIDocumentResponse;
                        case 'assign':
                            return {
                                ...baseResponse,
                                type: 'assign',
                                assignedEmployees: item.assigned_employees || []
                            } as AIAssignResponse;
                        case 'video':
                            return {
                                ...baseResponse,
                                type: 'video',
                                videoUrls: item.video_urls || [],
                                captions: item.captions || [],
                                analysisResult: item.analysis_result || null
                            } as AIVideoResponse;
                        default:
                            return baseResponse as AIResponse;
                    }
                });

                setResponses(fetchedResponses);
            }
        } catch (error) {
            console.error('Error fetching responses:', error);
            toast.error('Error fetching responses');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTags = async () => {
        if (!companyId) return;
        
        try {
            console.log(`Fetching available tags for company ID: ${companyId} at ${baseUrl}...`);
            const response = await fetch(`${baseUrl}/api/companies/${companyId}/tags`);
            if (!response.ok) {
                throw new Error('Failed to fetch tags');
            }
            const tags = await response.json();
            setAvailableTags(tags);
        } catch (error) {
            console.error('Error fetching tags:', error);
            toast.error('Error fetching tags');
        }
    };

    const fetchEmployees = async () => {
        if (!companyId) return;
        
        try {
            const response = await fetch(`${baseUrl}/api/employees-data/${companyId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch employees');
            }
            const employees = await response.json();
            setEmployees(employees);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Error fetching employees');
        }
    };

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

    const addResponse = async () => {
        const validKeywords = newResponse.keywords.filter(k => k.trim() !== '');
        if (validKeywords.length === 0) {
            toast.error('Please provide at least one keyword');
            return;
        }
        console.log(`[AIResponses] Adding new response: ${JSON.stringify(newResponse)}`);

        if (!companyId) {
            toast.error('Company ID is missing');
            return;
        }

        setIsLoading(true);
        try {
            let additionalData = {};
            
            // Handle different response types
            switch (responseType) {
                case 'tag':
                    if (selectedTags.length === 0 && (tagActionMode === 'add' || selectedRemoveTags.length === 0)) {
                        toast.error(tagActionMode === 'add' 
                            ? 'Please select at least one tag to add' 
                            : 'Please select at least one tag to remove'
                        );
                        return;
                    }
                    const tagNames = selectedTags.map(tagId => {
                        const tag = availableTags.find(t => t.id === tagId);
                        return tag ? tag.name : '';
                    }).filter(name => name !== '');

                    const removeTagNames = selectedRemoveTags.map(tagId => {
                        const tag = availableTags.find(t => t.id === tagId);
                        return tag ? tag.name : '';
                    }).filter(name => name !== '');

                    additionalData = {
                        tags: tagNames,
                        keyword_source: keywordSource,
                        tag_action_mode: tagActionMode,
                        remove_tags: removeTagNames,
                        confidence: 0.9 // Default confidence
                    };
                    break;
                case 'image':
                    if (selectedImages.length === 0) {
                        toast.error('Please select at least one image');
                        return;
                    }
                    const imageUrls = await uploadFiles(selectedImages);
                    additionalData = { 
                        image_urls: imageUrls,
                        analysis_result: null
                    };
                    break;
                case 'voice':
                    if (selectedAudios.length === 0) {
                        toast.error('Please select an audio file');
                        return;
                    }
                    const voiceUrls = await uploadFiles(selectedAudios);
                    additionalData = { 
                        voice_urls: voiceUrls,
                        audio_url: voiceUrls[0],
                        captions: selectedAudios.map(() => ''),
                        transcription: '',
                        language: 'en',
                        analysis_result: null
                    };
                    break;
                case 'document':
                    if (selectedDocs.length === 0) {
                        toast.error('Please select a document');
                        return;
                    }
                    const docUrls = await uploadFiles(selectedDocs);
                    additionalData = { 
                        document_urls: docUrls,
                        document_names: selectedDocs.map(doc => doc.name),
                        document_url: docUrls[0],
                        extracted_text: '',
                        analysis_result: null
                    };
                    break;
                case 'assign':
                    if (selectedEmployees.length === 0) {
                        toast.error('Please select at least one employee');
                        return;
                    }
                    additionalData = {
                        assigned_employees: selectedEmployees
                    };
                    break;
                case 'video':
                    if (selectedVideos.length === 0) {
                        toast.error('Please select at least one video');
                        return;
                    }
                    const videoUrls = await uploadFiles(selectedVideos);
                    additionalData = { 
                        video_urls: videoUrls,
                        captions: selectedVideos.map(() => ''),
                        analysis_result: null
                    };
                    break;
            }

            const responseData = {
                companyId: companyId,
                type: responseType,
                data: {
                    keywords: validKeywords,
                    description: newResponse.description,
                    status: newResponse.status,
                    keyword_source: keywordSource,
                    ...additionalData
                }
            };
            console.log(`[AIResponses] Created new response: ${JSON.stringify(responseData)}`);

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
                // Reset form
                setNewResponse({
                    keywords: [''],
                    description: '',
                    status: 'active'
                });
                setSelectedTags([]);
                setSelectedRemoveTags([]);
                setSelectedImages([]);
                setSelectedImageUrls([]);
                setSelectedAudios([]);
                setSelectedAudioUrls([]);
                setSelectedDocs([]);
                setSelectedDocUrls([]);
                setSelectedEmployees([]);
                setSelectedVideos([]);
                setSelectedVideoUrls([]);
                
                fetchResponses();
                toast.success('Response added successfully');
            } else {
                throw new Error(result.message || 'Failed to create response');
            }
        } catch (error) {
            console.error('Error adding response:', error);
            toast.error('Error adding response');
        } finally {
            setIsLoading(false);
        }
    };

    const updateResponse = async (id: string) => {
        setIsLoading(true);
        try {
            const response = responses.find(r => r.id === id);
            if (!response) {
                toast.error('Response not found');
                return;
            }

            let additionalData = {};
            
            switch (responseType) {
                case 'tag':
                    const tagNames = selectedTags.map(tagId => {
                        const tag = availableTags.find(t => t.id === tagId);
                        return tag ? tag.name : '';
                    }).filter(name => name !== '');
                    
                    const removeTagNames = selectedRemoveTags.map(tagId => {
                        const tag = availableTags.find(t => t.id === tagId);
                        return tag ? tag.name : '';
                    }).filter(name => name !== '');
                    
                    if (tagActionMode === 'add' && tagNames.length === 0 && removeTagNames.length === 0) {
                        toast.error('Please select at least one tag to add or remove.');
                        return;
                    } else if (tagActionMode === 'delete' && tagNames.length === 0) {
                        toast.error('Please select at least one tag to remove.');
                        return;
                    }
                    
                    additionalData = {
                        tags: tagNames,
                        remove_tags: removeTagNames,
                        tag_action_mode: tagActionMode
                    };
                    break;
                case 'image':
                    let imageUrls = [...currentResponseMedia];
                    if (selectedImages.length > 0) {
                        const newImageUrls = await uploadFiles(selectedImages);
                        imageUrls = [...imageUrls, ...newImageUrls];
                    }
                    additionalData = {
                        image_urls: imageUrls
                    };
                    break;
                case 'voice':
                    let voiceUrls = [...currentResponseMedia];
                    if (selectedAudios.length > 0) {
                        const newVoiceUrls = await uploadFiles(selectedAudios);
                        voiceUrls = [...voiceUrls, ...newVoiceUrls];
                    }
                    additionalData = {
                        voice_urls: voiceUrls,
                        audio_url: voiceUrls[0] || '',
                        captions: voiceUrls.map((_, i) => {
                            if (i < ((response as AIVoiceResponse).captions?.length || 0)) {
                                return (response as AIVoiceResponse).captions?.[i] || '';
                            }
                            return '';
                        })
                    };
                    break;
                case 'document':
                    let docUrls = [...currentResponseMedia];
                    let docNames = [...(response as AIDocumentResponse).documentNames || []];
                    if (selectedDocs.length > 0) {
                        const newDocUrls = await uploadFiles(selectedDocs);
                        docUrls = [...docUrls, ...newDocUrls];
                        docNames = [...docNames, ...selectedDocs.map(doc => doc.name)];
                    }
                    additionalData = {
                        document_urls: docUrls,
                        document_names: docNames,
                        document_url: docUrls[0] || ''
                    };
                    break;
                case 'assign':
                    if (selectedEmployees.length > 0) {
                        additionalData = {
                            assigned_employees: selectedEmployees
                        };
                    }
                    break;
                case 'video':
                    let videoUrls = [...currentResponseMedia];
                    if (selectedVideos.length > 0) {
                        const newVideoUrls = await uploadFiles(selectedVideos);
                        videoUrls = [...videoUrls, ...newVideoUrls];
                    }
                    additionalData = {
                        video_urls: videoUrls
                    };
                    break;
            }

            const updateData = {
                type: responseType,
                data: {
                    keywords: response.keywords,
                    description: response.description,
                    status: response.status,
                    keyword_source: keywordSource,
                    ...additionalData
                }
            };

            const apiResponse = await fetch(`${baseUrl}/api/ai-responses/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!apiResponse.ok) {
                throw new Error('Failed to update response');
            }

            const result = await apiResponse.json();

            if (result.success) {
                setIsEditing(null);
                setCurrentResponseMedia([]);
                resetForm();
                fetchResponses();
                toast.success('Response updated successfully');
            } else {
                throw new Error(result.message || 'Failed to update response');
            }
        } catch (error) {
            console.error('Error updating response:', error);
            toast.error('Error updating response');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteResponse = async (id: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${baseUrl}/api/ai-responses/${id}?type=${responseType}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete response');
            }

            const result = await response.json();

            if (result.success) {
                fetchResponses();
                toast.success('Response deleted successfully');
            } else {
                throw new Error(result.message || 'Failed to delete response');
            }
        } catch (error) {
            console.error('Error deleting response:', error);
            toast.error('Error deleting response');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (response: AIResponse) => {
        try {
            const newStatus = response.status === 'active' ? 'inactive' : 'active';
            
            const updateData = {
                type: response.type,
                data: {
                    status: newStatus
                }
            };

            const apiResponse = await fetch(`${baseUrl}/api/ai-responses/${response.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!apiResponse.ok) {
                throw new Error('Failed to update response status');
            }

            const result = await apiResponse.json();
            const updateResponseStatus = (responses: AIResponse[], id: string, newStatus: 'active' | 'inactive'): AIResponse[] => {
                return responses.map(r => 
                    r.id === id ? { ...r, status: newStatus } : r
                );
            };

            if (result.success) {
                setResponses(updateResponseStatus(responses, response.id, newStatus));
                toast.success(`Response ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
            } else {
                throw new Error(result.message || 'Failed to update response status');
            }
        } catch (error) {
            console.error('Error toggling response status:', error);
            toast.error('Error updating response status');
        }
    };

    // UI helper functions (unchanged from your original code)
    const addKeywordField = () => {
        setNewResponse(prev => ({
            ...prev,
            keywords: [...prev.keywords, '']
        }));
    };

    const removeKeywordField = (index: number) => {
        setNewResponse(prev => ({
            ...prev,
            keywords: prev.keywords.filter((_, i) => i !== index)
        }));
    };

    const updateKeyword = (index: number, value: string) => {
        setNewResponse(prev => ({
            ...prev,
            keywords: prev.keywords.map((keyword, i) => 
                i === index ? value : keyword
            )
        }));
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

    const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const urls = files.map(file => URL.createObjectURL(file));
        setSelectedAudios(files);
        setSelectedAudioUrls(urls);
    };

    const handleAudioRemove = (index: number) => {
        URL.revokeObjectURL(selectedAudioUrls[index]);
        setSelectedAudios(prev => prev.filter((_, i) => i !== index));
        setSelectedAudioUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const urls = files.map(file => URL.createObjectURL(file));
        setSelectedDocs(files);
        setSelectedDocUrls(urls);
    };

    const handleDocumentRemove = (index: number) => {
        URL.revokeObjectURL(selectedDocUrls[index]);
        setSelectedDocs(prev => prev.filter((_, i) => i !== index));
        setSelectedDocUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleTagSelection = (tagId: string) => {
        setSelectedTags(prev => 
            prev.includes(tagId) 
                ? prev.filter(id => id !== tagId) 
                : [...prev, tagId]
        );
    };

    const handleRemoveTagSelection = (tagId: string) => {
        setSelectedRemoveTags(prev => 
            prev.includes(tagId) 
                ? prev.filter(id => id !== tagId) 
                : [...prev, tagId]
        );
    };

    const handleEmployeeSelection = (employeeId: string) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        
        // Check file sizes (20MB = 20 * 1024 * 1024 bytes)
        const MAX_FILE_SIZE = 20 * 1024 * 1024;
        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
        
        if (oversizedFiles.length > 0) {
            toast.error(`Some files exceed the 20MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
            return;
        }

        const urls = files.map(file => URL.createObjectURL(file));
        setSelectedVideos(files);
        setSelectedVideoUrls(urls);
    };

    const handleVideoRemove = (index: number) => {
        URL.revokeObjectURL(selectedVideoUrls[index]);
        setSelectedVideos(prev => prev.filter((_, i) => i !== index));
        setSelectedVideoUrls(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingMedia = (index: number) => {
        const response = responses.find(r => r.id === isEditing);
        if (!response) return;

        if (response.type === 'document') {
            const docResponse = response as AIDocumentResponse;
            const updatedUrls = currentResponseMedia.filter((_, i) => i !== index);
            const updatedNames = docResponse.documentNames.filter((_, i) => i !== index);
            
            const updatedResponses = responses.map(r => 
                r.id === isEditing 
                    ? { ...r, documentUrls: updatedUrls, documentNames: updatedNames } 
                    : r
            );
            setResponses(updatedResponses);
            setCurrentResponseMedia(updatedUrls);
        } else {
            setCurrentResponseMedia(prev => prev.filter((_, i) => i !== index));
        }
    };

    const resetForm = () => {
        setNewResponse({
            keywords: [''],
            description: '',
            status: 'active'
        });
        setSelectedTags([]);
        setSelectedRemoveTags([]);
        setSelectedImages([]);
        setSelectedImageUrls([]);
        setSelectedAudios([]);
        setSelectedAudioUrls([]);
        setSelectedDocs([]);
        setSelectedDocUrls([]);
        setSelectedEmployees([]);
        setSelectedVideos([]);
        setSelectedVideoUrls([]);
    };

    const filteredResponses = responses.filter(response =>
        response && (
            response.keywords?.some(keyword => 
                keyword.toLowerCase().includes(searchQuery.toLowerCase())
            ) ||
            response.description?.toLowerCase().includes(searchQuery.toLowerCase() || '')
        )
    );

    const startEditing = (response: AIResponse) => {
        setIsEditing(response.id);
        setKeywordSource(response.keywordSource || 'user');
        
        switch (response.type) {
            case 'tag':
                const tagResponse = response as AITagResponse;
                const selectedTagIds = tagResponse.tags
                    .map(tagName => availableTags.find(t => t.name === tagName)?.id)
                    .filter((id): id is string => id !== undefined);
                setSelectedTags(selectedTagIds);
                
                const selectedRemoveTagIds = tagResponse.removeTags
                    ? tagResponse.removeTags
                        .map(tagName => availableTags.find(t => t.name === tagName)?.id)
                        .filter((id): id is string => id !== undefined)
                    : [];
                setSelectedRemoveTags(selectedRemoveTagIds);
                
                setTagActionMode(tagResponse.tagActionMode || 'add');
                break;
            case 'image':
                const imageResponse = response as AIImageResponse;
                setSelectedImageUrls([]);
                setCurrentResponseMedia(imageResponse.imageUrls || []);
                break;
            case 'voice':
                const voiceResponse = response as AIVoiceResponse;
                setSelectedAudioUrls([]);
                setCurrentResponseMedia(voiceResponse.voiceUrls || []);
                break;
            case 'document':
                const docResponse = response as AIDocumentResponse;
                setSelectedDocUrls([]);
                setCurrentResponseMedia(docResponse.documentUrls || []);
                break;
            case 'assign':
                const assignResponse = response as AIAssignResponse;
                setSelectedEmployees(assignResponse.assignedEmployees || []);
                break;
            case 'video':
                const videoResponse = response as AIVideoResponse;
                setSelectedVideoUrls([]);
                setCurrentResponseMedia(videoResponse.videoUrls || []);
                break;
        }
    };

    // The JSX rendering remains the same as in your original file
    // Only the data handling methods have been changed to use the API instead of Firebase

    return (
        <div className="h-screen overflow-y-auto pb-10">
            <div className="mt-10 ml-2 flex items-center gap-4 intro-y">
                <h2 className="text-lg font-medium">AI Responses</h2>
                <FormSelect
                    value={responseType}
                    onChange={(e) => setResponseType(e.target.value as AIResponseType)}
                    className="w-48"
                >
                    <option value="tag">Tag Responses</option>
                    <option value="image">Image Responses</option>
                    <option value="voice">Voice Responses</option>
                    <option value="document">Document Responses</option>
                    <option value="assign">Assign Responses</option>
                    <option value="video">Video Responses</option>
                </FormSelect>
            </div>

            <div className="grid grid-cols-12 gap-6 mt-5">
                {/* Add Response Form */}
                <div className="intro-y col-span-12 lg:col-span-6">
                    <div className="intro-y box">
                        <div className="p-5">
                            {/* Keywords Section */}
                            <div className="mb-4">
                                <FormLabel>Keywords</FormLabel>
                                {newResponse.keywords.map((keyword, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <FormInput
                                            value={keyword}
                                            onChange={(e) => updateKeyword(index, e.target.value)}
                                            placeholder="Enter keyword"
                                        />
                                        <Button
                                            variant="danger"
                                            onClick={() => removeKeywordField(index)}
                                            disabled={newResponse.keywords.length === 1}
                                        >
                                            <Lucide icon="X" className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="secondary"
                                    onClick={addKeywordField}
                                    className="mt-2"
                                >
                                    <Lucide icon="Plus" className="w-4 h-4 mr-2" /> Add Keyword
                                </Button>
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormTextarea
                                    value={newResponse.description}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        description: e.target.value
                                    }))}
                                    placeholder="Enter description"
                                />
                            </div>

                            {/* Type-specific forms */}
                            {responseType === 'tag' && (
                                <TagResponseForm
                                    availableTags={availableTags}
                                    selectedTags={selectedTags}
                                    onTagSelection={handleTagSelection}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                    tagActionMode={tagActionMode}
                                    onTagActionModeChange={setTagActionMode}
                                    removeTags={selectedRemoveTags}
                                    onRemoveTagSelection={handleRemoveTagSelection}
                                />
                            )}
                            {responseType === 'image' && (
                                <ImageResponseForm
                                    selectedImageUrls={selectedImageUrls}
                                    onImageSelect={handleImageSelect}
                                    onImageRemove={handleImageRemove}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}
                            {responseType === 'voice' && (
                                <VoiceResponseForm
                                    selectedAudioUrls={selectedAudioUrls}
                                    onAudioSelect={handleAudioSelect}
                                    onAudioRemove={handleAudioRemove}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}
                            {responseType === 'document' && (
                                <DocumentResponseForm
                                    selectedDocUrls={selectedDocUrls}
                                    onDocumentSelect={handleDocumentSelect}
                                    onDocumentRemove={handleDocumentRemove}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                    selectedDocs={selectedDocs}
                                />
                            )}
                            {responseType === 'assign' && (
                                <AssignResponseForm
                                    employees={employees}
                                    selectedEmployees={selectedEmployees}
                                    onEmployeeSelection={handleEmployeeSelection}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}
                            {responseType === 'video' && (
                                <VideoResponseForm
                                    selectedVideoUrls={selectedVideoUrls}
                                    onVideoSelect={handleVideoSelect}
                                    onVideoRemove={handleVideoRemove}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}

                            {/* Status and Submit */}
                            <div className="mt-4">
                                <FormLabel>Status</FormLabel>
                                <FormSelect
                                    value={newResponse.status}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        status: e.target.value as 'active'
                                    }))}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </FormSelect>
                            </div>

                            <Button
                                variant="primary"
                                onClick={addResponse}
                                className="mt-4"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <Lucide icon="Loader" className="animate-spin w-4 h-4 mr-2" />
                                        Processing...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Lucide icon="Plus" className="w-4 h-4 mr-2" /> Add Response
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Response List */}
                <div className="intro-y col-span-12 lg:col-span-6">
                    <div className="intro-y box dark:bg-gray-700">
                        <div className="p-5">
                            {/* Add Search Input */}
                            <FormInput
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search responses..."
                                className="mb-5 dark:bg-darkmode-800 dark:border-darkmode-400 dark:text-slate-200"
                            />

                            <div className="grid gap-5">
                                {filteredResponses.map((response) => (
                                    <div key={response.id} className="intro-y">
                                        <div className={clsx(
                                            "box p-5",
                                            darkMode ? "bg-darkmode-600" : "bg-white"
                                        )}>
                                            {isEditing === response.id ? (
                                                <div className="space-y-4" data-editing="true">
                                                    {/* Keywords Edit */}
                                                    <div>
                                                        <FormLabel>Keywords</FormLabel>
                                                        {response.keywords.map((keyword, index) => (
                                                            <div key={index} className="flex gap-2 mb-2">
                                                                <FormInput
                                                                    value={keyword}
                                                                    onChange={(e) => {
                                                                        const updatedResponses = responses.map(r =>
                                                                            r.id === response.id
                                                                                ? {
                                                                                    ...r,
                                                                                    keywords: r.keywords.map((k, i) =>
                                                                                        i === index ? e.target.value : k
                                                                                    )
                                                                                }
                                                                                : r
                                                                        );
                                                                        setResponses(updatedResponses);
                                                                    }}
                                                                />
                                                                <Button
                                                                    variant="danger"
                                                                    onClick={() => {
                                                                        const updatedResponses = responses.map(r =>
                                                                            r.id === response.id
                                                                                ? {
                                                                                    ...r,
                                                                                    keywords: r.keywords.filter((_, i) => i !== index)
                                                                                }
                                                                                : r
                                                                        );
                                                                        setResponses(updatedResponses);
                                                                    }}
                                                                >
                                                                    <Lucide icon="X" className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => {
                                                                const updatedResponses = responses.map(r =>
                                                                    r.id === response.id
                                                                        ? {
                                                                            ...r,
                                                                            keywords: [...r.keywords, '']
                                                                        }
                                                                        : r
                                                                );
                                                                setResponses(updatedResponses);
                                                            }}
                                                        >
                                                            <Lucide icon="Plus" className="w-4 h-4 mr-2" /> Add Keyword
                                                        </Button>
                                                    </div>

                                                    {/* Description Edit */}
                                                    <div>
                                                        <FormLabel>Description</FormLabel>
                                                        <FormTextarea
                                                            value={response.description}
                                                            onChange={(e) => {
                                                                const updatedResponses = responses.map(r =>
                                                                    r.id === response.id
                                                                        ? { ...r, description: e.target.value }
                                                                        : r
                                                                );
                                                                setResponses(updatedResponses);
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Type-specific Edit Forms */}
                                                    {response.type === 'tag' && (
                                                        <TagResponseForm
                                                            availableTags={availableTags}
                                                            selectedTags={selectedTags}
                                                            onTagSelection={handleTagSelection}
                                                            keywordSource={keywordSource}
                                                            onKeywordSourceChange={setKeywordSource}
                                                            tagActionMode={tagActionMode}
                                                            onTagActionModeChange={setTagActionMode}
                                                            removeTags={selectedRemoveTags}
                                                            onRemoveTagSelection={handleRemoveTagSelection}
                                                        />
                                                    )}
                                                    {response.type === 'image' && (
                                                        <div>
                                                            {/* Display existing images with delete option */}
                                                            {currentResponseMedia.length > 0 && (
                                                                <>
                                                                    <div className="mb-4">
                                                                        <FormLabel>Current Images</FormLabel>
                                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                                            {currentResponseMedia.map((url, idx) => (
                                                                                <div key={idx} className="relative">
                                                                                    <img 
                                                                                        src={url} 
                                                                                        alt={`Response ${idx + 1}`}
                                                                                        className="w-full h-40 object-cover rounded-lg"
                                                                                    />
                                                                                    <Button
                                                                                        variant="danger"
                                                                                        className="absolute top-1 right-1 w-8 h-8 p-0 rounded-full"
                                                                                        onClick={() => removeExistingMedia(idx)}
                                                                                    >
                                                                                        <Lucide icon="X" className="w-4 h-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {/* Form to add new images */}
                                                            <ImageResponseForm
                                                                selectedImageUrls={selectedImageUrls}
                                                                onImageSelect={handleImageSelect}
                                                                onImageRemove={handleImageRemove}
                                                                keywordSource={keywordSource}
                                                                onKeywordSourceChange={setKeywordSource}
                                                            />
                                                        </div>
                                                    )}
                                                    {response.type === 'voice' && (
                                                        <div>
                                                            {/* Display existing audio files with delete option */}
                                                            {currentResponseMedia.length > 0 && (
                                                                <>
                                                                    <div className="mb-4">
                                                                        <FormLabel>Current Audio Files</FormLabel>
                                                                        <div className="space-y-2">
                                                                            {currentResponseMedia.map((url, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-darkmode-400 rounded">
                                                                                    <audio controls className="w-full max-w-md">
                                                                                        <source src={url} type="audio/mpeg" />
                                                                                        Your browser does not support the audio element.
                                                                                    </audio>
                                                                                    <Button
                                                                                        variant="danger"
                                                                                        className="ml-2"
                                                                                        onClick={() => removeExistingMedia(idx)}
                                                                                    >
                                                                                        <Lucide icon="X" className="w-4 h-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <VoiceResponseForm
                                                                selectedAudioUrls={selectedAudioUrls}
                                                                onAudioSelect={handleAudioSelect}
                                                                onAudioRemove={handleAudioRemove}
                                                                keywordSource={keywordSource}
                                                                onKeywordSourceChange={setKeywordSource}
                                                            />
                                                        </div>
                                                    )}
                                                    {response.type === 'document' && (
                                                        <div>
                                                            {/* Display existing documents with delete option */}
                                                            {currentResponseMedia.length > 0 && (
                                                                <>
                                                                    <div className="mb-4">
                                                                        <FormLabel>Current Documents</FormLabel>
                                                                        <div className="space-y-2">
                                                                            {currentResponseMedia.map((url, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-darkmode-400 rounded">
                                                                                    <div className="flex items-center">
                                                                                        <Lucide icon="FileText" className="w-4 h-4 mr-2" />
                                                                                        <span>{(response as AIDocumentResponse).documentNames[idx]}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <a 
                                                                                            href={url}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="text-primary hover:underline"
                                                                                        >
                                                                                            <Lucide icon="Download" className="w-4 h-4" />
                                                                                        </a>
                                                                                        <Button
                                                                                            variant="danger"
                                                                                            className="p-1"
                                                                                            onClick={() => removeExistingMedia(idx)}
                                                                                        >
                                                                                            <Lucide icon="X" className="w-4 h-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <DocumentResponseForm
                                                                selectedDocUrls={selectedDocUrls}
                                                                onDocumentSelect={handleDocumentSelect}
                                                                onDocumentRemove={handleDocumentRemove}
                                                                keywordSource={keywordSource}
                                                                onKeywordSourceChange={setKeywordSource}
                                                                selectedDocs={selectedDocs}
                                                            />
                                                        </div>
                                                    )}
                                                    {response.type === 'assign' && (
                                                        <AssignResponseForm
                                                            employees={employees}
                                                            selectedEmployees={selectedEmployees}
                                                            onEmployeeSelection={handleEmployeeSelection}
                                                            keywordSource={keywordSource}
                                                            onKeywordSourceChange={setKeywordSource}
                                                        />
                                                    )}
                                                    {response.type === 'video' && (
                                                        <div>
                                                            {/* Display existing videos with delete option */}
                                                            {currentResponseMedia.length > 0 && (
                                                                <>
                                                                    <div className="mb-4">
                                                                        <FormLabel>Current Videos</FormLabel>
                                                                        <div className="space-y-4">
                                                                            {currentResponseMedia.map((url, idx) => (
                                                                                <div key={idx} className="relative">
                                                                                    <video controls className="w-full rounded-lg">
                                                                                        <source src={url} type="video/mp4" />
                                                                                        Your browser does not support the video element.
                                                                                    </video>
                                                                                    <Button
                                                                                        variant="danger"
                                                                                        className="absolute top-2 right-2"
                                                                                        onClick={() => removeExistingMedia(idx)}
                                                                                    >
                                                                                        <Lucide icon="X" className="w-4 h-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {/* Form to add new videos */}
                                                            <VideoResponseForm
                                                                selectedVideoUrls={selectedVideoUrls}
                                                                onVideoSelect={handleVideoSelect}
                                                                onVideoRemove={handleVideoRemove}
                                                                keywordSource={keywordSource}
                                                                onKeywordSourceChange={setKeywordSource}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Status Edit */}
                                                    <div>
                                                        <FormLabel>Status</FormLabel>
                                                        <div className="text-slate-500">
                                                            <div className="flex items-center gap-2">
                                                                Status: 
                                                                <FormSwitch>
                                                                    <FormSwitch.Input
                                                                        type="checkbox"
                                                                        checked={response.status === 'active'}
                                                                        onChange={() => handleToggleStatus(response)}
                                                                    />
                                                                </FormSwitch>
                                                                <span className={clsx(
                                                                    "ml-2",
                                                                    response.status === 'active' ? 'text-success' : 'text-danger'
                                                                )}>
                                                                    {response.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex space-x-2">
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => updateResponse(response.id)}
                                                            disabled={isLoading}
                                                        >
                                                            {isLoading ? (
                                                                <span className="flex items-center">
                                                                    <Lucide icon="Loader" className="animate-spin w-4 h-4 mr-2" />
                                                                    Saving...
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center">
                                                                    <Lucide icon="Save" className="w-4 h-4 mr-2" /> Save
                                                                </span>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => {
                                                                setIsEditing(null);
                                                                resetForm();
                                                            }}
                                                            disabled={isLoading}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div>
                                                            <div className="font-medium text-base">
                                                                Keywords: {Array.isArray(response.keywords) ? 
                                                                    response.keywords.join(', ') : 
                                                                    response.keywords || 'No keywords'}
                                                            </div>
                                                            <div className="text-slate-500">
                                                                <div className="flex items-center gap-2">
                                                                    Status: 
                                                                    <FormSwitch>
                                                                        <FormSwitch.Input
                                                                            type="checkbox"
                                                                            checked={response.status === 'active'}
                                                                            onChange={() => handleToggleStatus(response)}
                                                                        />
                                                                    </FormSwitch>
                                                                    <span className={clsx(
                                                                        "ml-2",
                                                                        response.status === 'active' ? 'text-success' : 'text-danger'
                                                                    )}>
                                                                        {response.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="text-slate-500">
                                                                Created: {response.createdAt.toLocaleDateString()}
                                                            </div>
                                                            {response.description && (
                                                                <div className="text-slate-500">
                                                                    Description: {response.description}
                                                                </div>
                                                            )}
                                                            <div className="text-slate-500">
                                                                Action: {(response as AITagResponse).tagActionMode === 'delete' ? 'Remove Tags' : 'Add Tags'}
                                                                {(response as AITagResponse).removeTags && (response as AITagResponse).removeTags!.length > 0 && 
                                                                    ` (with ${(response as AITagResponse).removeTags!.length} tags to remove)`}
                                                            </div>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <Button variant="primary" onClick={() => startEditing(response)}>
                                                                <Lucide icon="PenSquare" className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="danger" onClick={() => deleteResponse(response.id)}>
                                                                <Lucide icon="Trash" className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border border-slate-200/60 dark:border-darkmode-400 p-4">
                                                        {response.type === 'tag' && (
                                                            <div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {(response as AITagResponse).tags.map((tag, index) => (
                                                                        <span key={index} className="inline-block bg-slate-100 dark:bg-darkmode-400 rounded px-2 py-1">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                {(response as AITagResponse).removeTags && (response as AITagResponse).removeTags!.length > 0 && (
                                                                    <div className="mt-2">
                                                                        <div className="text-slate-500 font-medium mb-1">Tags to remove:</div>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {(response as AITagResponse).removeTags!.map((tag, index) => (
                                                                                <span key={index} className="inline-block bg-rose-100 dark:bg-red-900 rounded px-2 py-1">
                                                                                    {tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {response.type === 'image' && (
                                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                {((response as AIImageResponse).imageUrls ?? []).map((url, idx) => (
                                                                    <div key={idx} className="relative">
                                                                        <img 
                                                                            src={url} 
                                                                            alt={`Response ${idx + 1}`}
                                                                            className="w-full h-48 object-cover rounded-lg shadow-md"
                                                                            onError={(e) => {
                                                                                console.error(`Error loading image: ${url}`);
                                                                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {response.type === 'voice' && (
                                                            <div className="space-y-2">
                                                                {(response as AIVoiceResponse).voiceUrls.map((url, idx) => (
                                                                    <audio key={idx} controls className="w-full">
                                                                        <source src={url} type="audio/mpeg" />
                                                                        Your browser does not support the audio element.
                                                                    </audio>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {response.type === 'document' && (
                                                            <div className="space-y-2">
                                                                {(response as AIDocumentResponse).documentUrls.map((url, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-darkmode-400 rounded">
                                                                        <div className="flex items-center">
                                                                            <Lucide icon="FileText" className="w-4 h-4 mr-2" />
                                                                            <span>{(response as AIDocumentResponse).documentNames[idx]}</span>
                                                                        </div>
                                                                        <a 
                                                                            href={url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-primary hover:underline"
                                                                        >
                                                                            <Lucide icon="Download" className="w-4 h-4" />
                                                                        </a>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {response.type === 'assign' && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {(response as AIAssignResponse).assignedEmployees.map((employeeId) => {
                                                                    const employee = employees.find(e => e.id === employeeId);
                                                                    return (
                                                                        <span 
                                                                            key={employeeId} 
                                                                            className="inline-block bg-slate-100 dark:bg-darkmode-400 rounded px-2 py-1"
                                                                        >
                                                                            {employee?.name || 'Unknown Employee'}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {response.type === 'video' && (
                                                            <div className="space-y-2">
                                                                {(response as AIVideoResponse).videoUrls.map((url, idx) => (
                                                                    <video key={idx} controls className="w-full">
                                                                        <source src={url} type="video/mp4" />
                                                                        Your browser does not support the video element.
                                                                    </video>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
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
}

export default AIResponses;
