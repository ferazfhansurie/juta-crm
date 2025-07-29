import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';
import { format } from 'date-fns';

interface User {
    companyId: string;
}

interface Tag {
    id: string;
    name: string;
}

interface ScheduledMessage {
  id: string;
  messageContent: string;
  contactIds: string[];
  contactId?: string;
  companyId: string;
  createdAt: Date;
  scheduledTime: Date;
  status: 'scheduled' | 'completed' | 'failed';
  mediaUrl?: string;
  phoneIndex: number;
  multiple: boolean;
  attemptCount: number;
  lastAttempt?: Date;
  sentAt?: Date;
  fromMe: boolean;
}

const BlastHistoryPage: React.FC = () => {
    const [messages, setMessages] = useState<ScheduledMessage[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed' | 'failed'>('all');
    const [selectedRecipients, setSelectedRecipients] = useState<{name: string; phone: string;}[]>([]);
    const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [companyId, setCompanyId] = useState<string>("");

    const baseUrl = "https://juta-dev.ngrok.dev";

    useEffect(() => {
        const initialize = async () => {
            try {
                const userEmail = localStorage.getItem("userEmail");
                if (!userEmail) {
                    setError("User not authenticated");
                    return;
                }

                await fetchUserData();
            } catch (err) {
                console.error("Initialization error:", err);
                setError("Failed to initialize");
                toast.error("Failed to load data");
            }
        };

        initialize();
    }, []);

    const fetchUserData = async () => {
        try {
            const userEmail = localStorage.getItem("userEmail");
            if (!userEmail) {
                throw new Error("No user email found");
            }

            const userResponse = await fetch(
                `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    credentials: "include",
                }
            );

            if (!userResponse.ok) {
                throw new Error("Failed to fetch user config");
            }

            const userData = await userResponse.json();
            const fetchedCompanyId = userData?.company_id;
            
            if (!fetchedCompanyId) {
                throw new Error("Company ID not found");
            }

            setCompanyId(fetchedCompanyId);
        } catch (error) {
            console.error("Error fetching user data:", error);
            throw error;
        }
    };

    const fetchTags = async () => {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                if (!companyId) return;

                const tagsResponse = await fetch(
                    `${baseUrl}/api/companies/${companyId}/tags`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        credentials: "include",
                    }
                );

                if (!tagsResponse.ok) {
                    throw new Error("Failed to fetch tags");
                }

                const fetchedTags = await tagsResponse.json();
                setTags(fetchedTags);
                return;
            } catch (error) {
                retryCount++;
                console.error(`Error fetching tags (attempt ${retryCount}/${maxRetries}):`, error);
                
                if (retryCount === maxRetries) {
                    toast.error("Failed to fetch tags");
                    setError("Failed to fetch tags");
                } else {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                }
            }
        }
    };

    const fetchScheduledMessages = async () => {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                setLoading(true);
                
                if (!companyId) {
                    throw new Error("Company ID not available");
                }

                // Map frontend filter to API status
                const apiStatus = filter === 'completed' ? 'sent' : filter;

                const messagesResponse = await fetch(
                    `${baseUrl}/api/scheduled-messages?companyId=${companyId}&status=${apiStatus !== 'all' ? apiStatus : ''}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        credentials: "include",
                    }
                );

                if (!messagesResponse.ok) {
                    throw new Error("Failed to fetch scheduled messages");
                }

                const responseData = await messagesResponse.json();
                
                if (!responseData.success) {
                    throw new Error(responseData.message || "Failed to fetch scheduled messages");
                }

                const fetchedMessages = responseData.messages.map((messageData: any) => {
                    // Convert dates from API response
                    const convertToDate = (field: any): Date => {
                        if (!field) return new Date();
                        
                        if (field instanceof Date) {
                            return field;
                        }
                        
                        if (typeof field === 'string') {
                            return new Date(field);
                        }
                        
                        if (typeof field === 'number') {
                            return field > 100000000000 
                                ? new Date(field) // milliseconds
                                : new Date(field * 1000); // seconds
                        }
                        
                        return new Date();
                    };
                    
                    return {
                        id: messageData.id,
                        messageContent: messageData.messageContent || messageData.message_content || '',
                        contactIds: messageData.contactIds || messageData.contact_ids || [],
                        contactId: messageData.contactId || messageData.contact_id || '',
                        companyId: messageData.companyId || messageData.company_id,
                        createdAt: convertToDate(messageData.createdAt || messageData.created_at),
                        scheduledTime: convertToDate(messageData.scheduledTime || messageData.scheduled_time),
                        status: messageData.status === 'sent' ? 'completed' : messageData.status,
                        mediaUrl: messageData.mediaUrl || messageData.media_url,
                        phoneIndex: messageData.phoneIndex || messageData.phone_index || 0,
                        multiple: messageData.multiple || false,
                        attemptCount: messageData.attemptCount || messageData.attempt_count || 0,
                        lastAttempt: messageData.lastAttempt ? convertToDate(messageData.lastAttempt) : undefined,
                        sentAt: messageData.sentAt ? convertToDate(messageData.sentAt) : undefined,
                        fromMe: messageData.fromMe || messageData.from_me || false
                    } as ScheduledMessage;
                });

                setMessages(fetchedMessages);
                return;
            } catch (error) {
                retryCount++;
                console.error(`Error fetching messages (attempt ${retryCount}/${maxRetries}):`, error);
                
                if (error instanceof Error) {
                    console.error('Error details:', error.message);
                    console.error('Error stack:', error.stack);
                }
                
                if (retryCount === maxRetries) {
                    toast.error("Failed to fetch messages");
                    setError("Failed to fetch messages");
                } else {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                }
            } finally {
                setLoading(false);
            }
        }
    };

    // Re-fetch messages when filter or companyId changes
    useEffect(() => {
        if (companyId) {
            fetchScheduledMessages();
            fetchTags();
        }
    }, [filter, companyId]);

    const handleDeleteMessage = async (messageId: string) => {
        try {
            if (!companyId) {
                toast.error("Company ID not available");
                return;
            }

            const response = await fetch(
                `${baseUrl}/api/schedule-message/${companyId}/${messageId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete message");
            }

            // Update the local state
            setMessages(messages.filter(msg => msg.id !== messageId));
            toast.success('Message deleted successfully');
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Failed to delete message');
        }
    };

    const filteredMessages = messages.filter(message => {
        // First apply status filter
        if (filter !== 'all' && message.status !== filter) return false;
        
        // Then apply search filter if there's a search query
        if (searchQuery.trim()) {
            return message.messageContent.toLowerCase().includes(searchQuery.toLowerCase());
        }
        
        return true;
    }).sort((a, b) => {
        // Define status priority
        const statusPriority = {
            scheduled: 0,
            completed: 1,
            failed: 2
        };
        
        if (filter === 'all') {
            // First sort by status
            const statusCompare = statusPriority[a.status] - statusPriority[b.status];
            if (statusCompare !== 0) return statusCompare;
        }
        
        // Then sort by date (most recent first)
        try {
            return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
        } catch (error) {
            console.error('Error sorting by date:', error);
            return 0;
        }
    });

    const processScheduledMessage = (message: ScheduledMessage) => {
        try {
            if (!message.messageContent) return 'No message content';
            
            return message.messageContent;
        } catch (error) {
            console.error('Error processing message:', error);
            return 'Error displaying message';
        }
    };

    const formatDate = (date: Date) => {
        try {
            if (!date) return 'Unknown date';
            return format(date, "MMM d, yyyy 'at' h:mm a");
        } catch (error) {
            console.error('Error formatting date:', error, date);
            return 'Invalid date';
        }
    };

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
            {error ? (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p className="text-red-500 text-lg mb-4">{error}</p>
                        <Button 
                            onClick={() => window.location.reload()}
                            className="bg-primary hover:bg-primary-dark text-white font-medium px-6 py-2 rounded-md transition-colors duration-200"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="bg-white dark:bg-gray-800 shadow-sm mb-6 p-6">
                        <div className="max-w-7xl mx-auto">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Blast History</h1>
                            
                            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                                <div className="relative flex-grow">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search messages..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
                                <nav className="flex space-x-8">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            filter === 'all'
                                                ? 'border-primary text-primary dark:text-primary-light'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilter('scheduled')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            filter === 'scheduled'
                                                ? 'border-primary text-primary dark:text-primary-light'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        Scheduled
                                    </button>
                                    <button
                                        onClick={() => setFilter('completed')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            filter === 'completed'
                                                ? 'border-primary text-primary dark:text-primary-light'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        Completed
                                    </button>
                                    <button
                                        onClick={() => setFilter('failed')}
                                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                            filter === 'failed'
                                                ? 'border-primary text-primary dark:text-primary-light'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        Failed
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6">
                        <div className="max-w-7xl mx-auto">
                            {loading ? (
                                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {[...Array(6)].map((_, index) => (
                                        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
                                            <div className="p-4">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex justify-end">
                                                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                                    </svg>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No messages found</h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {searchQuery ? 'Try adjusting your search or filter criteria' : 'Your blast history will appear here'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredMessages.map(message => (
                                        <div key={message.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full border border-gray-200 dark:border-gray-700">
                                            <div className="p-5 flex-grow">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div className="flex items-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            message.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                            message.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                            'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
                                                        }`}>
                                                            {message.status === 'completed' && (
                                                                <svg className="mr-1.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
                                                                    <circle cx="4" cy="4" r="3" />
                                                                </svg>
                                                            )}
                                                            {message.status === 'failed' && (
                                                                <svg className="mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                            {message.status === 'scheduled' && (
                                                                <svg className="mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            )}
                                                            {message.status === 'scheduled' ? 'Scheduled' : message.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {formatDate(message.scheduledTime)}
                                                    </div>
                                                </div>
                                                
                                                <div className="text-gray-800 dark:text-gray-200 mb-3 font-medium">
                                                    {/* First Message */}
                                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
                                                        <p className="line-clamp-3 whitespace-pre-line">
                                                            {processScheduledMessage(message)}
                                                        </p>
                                                    </div>

                                                    {/* Media */}
                                                    {message.mediaUrl && (
                                                        <div className="mt-3">
                                                            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                                                                <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                </svg>
                                                                Media attached
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Message Details */}
                                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Details</h4>
                                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                                            {/* Phone Index */}
                                                            <div className="flex items-center">
                                                                <svg className="mr-1.5 h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                                <span className="text-gray-700 dark:text-gray-300">
                                                                    <span className="font-medium">Phone:</span> {message.phoneIndex + 1}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Contact Count */}
                                                            {((message.contactIds && message.contactIds.length > 0) || message.contactId) && (
                                                                <div className="flex items-center">
                                                                    <svg className="mr-1.5 h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                                    </svg>
                                                                    <span className="text-gray-700 dark:text-gray-300">
                                                                        <span className="font-medium">Recipients:</span> {
                                                                            message.contactIds && message.contactIds.length > 0 
                                                                                ? message.contactIds.length 
                                                                                : message.contactId ? 1 : 0
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Attempt Count */}
                                                            {message.attemptCount > 0 && (
                                                                <div className="flex items-center">
                                                                    <svg className="mr-1.5 h-3 w-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    <span className="text-gray-700 dark:text-gray-300">
                                                                        <span className="font-medium">Attempts:</span> {message.attemptCount}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 flex justify-end mt-auto">
                                                <Button
                                                    onClick={() => handleDeleteMessage(message.id)}
                                                    className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-md shadow-sm transition-colors duration-200 flex items-center"
                                                >
                                                    <svg className="mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {isRecipientsModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recipients List</h2>
                                    <button
                                        onClick={() => setIsRecipientsModalOpen(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none"
                                    >
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {selectedRecipients.map((recipient, index) => (
                                        <div key={index} className="py-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{recipient.name || 'No Name'}</p>
                                                <p className="text-gray-600 dark:text-gray-400">{recipient.phone}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedRecipients.length === 0 && (
                                        <div className="py-8 text-center">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <p className="mt-2 text-gray-500 dark:text-gray-400">No recipients found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
            <ToastContainer position="bottom-right" />
        </div>
    );
};

export default BlastHistoryPage;
