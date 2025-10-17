import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Tab } from '@headlessui/react'
import { useNavigate } from 'react-router-dom';

const baseUrl = "https://bisnesgpt.jutateknologi.com";

let companyId = "001"; // Adjust the companyId as needed

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
  isLoading?: boolean;
  isLongContent?: boolean;
  sections?: {
    title: string;
    content: string;
  }[];
  isBrainstorm?: boolean;
  suggestions?: string[];
}

interface AssistantInfo {
  name: string;
  description: string;
  instructions: string;
  metadata: {
    files: Array<{id: string, name: string, url: string}>;
  };
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
  deleteThread: () => void;
  threadId: string;
  isApplyingChanges: boolean;
  applyProgress: number;
  onApplyChanges: () => void;
  // Thread management props
  availableThreads: Array<{
    threadId: string;
    templateName: string;
    lastUpdated: string;
    messageCount: number;
  }>;
  onLoadThread: (threadId: string) => void;
  onCreateNewThread: () => void;
  onClearCurrentThread: () => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onSendMessage, assistantName, deleteThread, threadId, isApplyingChanges, applyProgress, onApplyChanges, availableThreads, onLoadThread, onCreateNewThread, onClearCurrentThread }) => {
  const [newMessage, setNewMessage] = useState('');
  const navigate = useNavigate();

  const myMessageClass = "bg-gray-700 text-white dark:bg-gray-600 rounded-tr-lg rounded-tl-lg rounded-br-sm rounded-bl-lg shadow-md";
  const otherMessageClass = "bg-[#dcf8c6] dark:bg-green-700 text-black dark:text-white rounded-tr-lg rounded-tl-lg rounded-br-lg rounded-bl-sm shadow-md";

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSendMessage(newMessage);
        setNewMessage('');
      }
    }
  };

  // Render formatted message with special section markers
  const renderFormattedMessage = (rawText: string, isFromMe: boolean) => {
    const sectionRegex = /(\[(?:CHANGES|EXPLANATION)_START\])([\s\S]*?)(\[(?:CHANGES|EXPLANATION)_END\])/g;
    const elements: JSX.Element[] = [];
    let lastIndex = 0;

    const renderPlainBlock = (textBlock: string, leadingClass: string) => (
      <div className={`max-w-none text-sm ${leadingClass}`} key={`plain-${elements.length}`}> 
        {textBlock.split('\n').map((line, index) => {
          if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
            // Render bold-marked lines as plain text (show the ** literally)
            return (
              <p key={index} className={`mb-3 ${isFromMe ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{line}</p>
            );
          } else if (line.trim().match(/^\d+\./)) {
            return (
              <div key={index} className="ml-6 mb-3 flex items-start">
                <span className={`${isFromMe ? 'text-white' : 'text-[#2d5a2d] dark:text-green-400'} font-semibold mr-2 min-w-[20px]`}>{line.match(/^\d+\./)?.[0]}</span>
                <span className={`${isFromMe ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{line.replace(/^\d+\.\s*/, '')}</span>
              </div>
            );
          } else if (line.trim().startsWith('- ')) {
            // Render dash bullets as a textual dash prefix rather than a dot bullet
            return (
              <p key={index} className={`ml-6 mb-3 ${isFromMe ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{`- ${line.substring(2)}`}</p>
            );
          } else if (line.trim()) {
            return (
              <p key={index} className={`mb-3 ${isFromMe ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{line}</p>
            );
          } else {
            return <div key={index} className="h-3"></div>;
          }
        })}
      </div>
    );

    for (const match of rawText.matchAll(sectionRegex)) {
      const matchStart = match.index || 0;
      const matchEnd = matchStart + match[0].length;
      const startTag = match[1];
      const body = match[2].trim();

      if (matchStart > lastIndex) {
        const preceding = rawText.substring(lastIndex, matchStart);
        if (preceding.trim().length > 0) {
          elements.push(renderPlainBlock(preceding, 'leading-relaxed'));
        }
      }

      const isChanges = startTag.includes('[CHANGES_START]');
      const sectionTitle = isChanges ? 'Changes' : 'Explanation';

      elements.push(
        <div key={`section-${elements.length}`} className={`${isChanges ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'} mt-4 mb-4 p-3 rounded-lg border`}>
          <div className="mb-2">
            <span className={`inline-block rounded-full px-3 py-1 text-sm md:text-base font-semibold shadow-sm border ${
              isFromMe
                ? 'text-white border-white/30 bg-white/10'
                : isChanges
                  ? 'text-[#1f3d1f] dark:text-green-200 bg-[#dcf8c6] dark:bg-green-800/40 border-green-300 dark:border-green-700'
                  : 'text-gray-800 dark:text-gray-100 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
            }`}>{sectionTitle}</span>
          </div>
          <div className={`${isChanges ? 'font-mono' : ''}`}>
            {renderPlainBlock(body, isChanges ? 'leading-normal' : 'leading-relaxed')}
          </div>
        </div>
      );

      lastIndex = matchEnd;
    }

    if (lastIndex < rawText.length) {
      const trailing = rawText.substring(lastIndex);
      if (trailing.trim().length > 0) {
        elements.push(renderPlainBlock(trailing, 'leading-relaxed'));
      }
    }

    if (elements.length === 0) {
      elements.push(renderPlainBlock(rawText, 'leading-relaxed'));
    }

    return <>{elements}</>;
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-900 relative">
      <div className="p-3 border-b border-white/20 dark:border-gray-700/30 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-t-2xl">
        {/* Main Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
              title="Go back"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="bg-gray-600/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-500/30 dark:border-gray-600/30 rounded-xl px-3 py-2 shadow-lg">
              <div className="font-bold text-white dark:text-white text-base">Prompt Builder</div>
            </div>
          </div>
        </div>
        
        {/* Thread Management Section */}
        <div className="flex items-center gap-1.5">
          {/* Thread Selection Dropdown */}
          <div className="relative">
            <select
              value={threadId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  onLoadThread(e.target.value);
                }
              }}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            >
              <option value="">Select Conversation</option>
              {availableThreads.map((thread) => (
                <option key={thread.threadId} value={thread.threadId}>
                  {thread.templateName} - {new Date(thread.lastUpdated).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          
          {/* New Thread Button */}
          <button
            onClick={onCreateNewThread}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs active:scale-95 transition-all duration-200 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
          
          {/* Clear Thread Button */}
          {threadId && (
            <button
              onClick={onClearCurrentThread}
              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs active:scale-95 transition-all duration-200 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 dark:bg-gray-900">

        
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-[#dcf8c6]/30 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#2d5a2d] dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Welcome to AI Prompt Builder!</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              I'll help you brainstorm improvements to your prompt instructions. Ask me questions and I'll provide suggestions to make your assistant more effective.
            </p>
                    <div className="mt-4 p-3 bg-gradient-to-r from-[#dcf8c6]/20 to-green-50 dark:from-green-900/20 dark:to-green-900/20 rounded-lg border border-[#dcf8c6] dark:border-green-800">
          <p className="text-sm text-[#2d5a2d] dark:text-green-200">
                💡 <strong>Workflow:</strong> 
                <br />1. Ask me to improve your prompt
                <br />2. Review my suggestions
                <br />3. Click "Apply Changes" to implement them
              </p>
            </div>
            <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                🚀 <strong>Try asking:</strong> "Make this prompt more specific" or "Add examples to this instruction"
              </p>
            </div>
          </div>
        )}
        
        {messages.slice().reverse().map((message, index) => (
          <div
            className={`mb-3 ${message.from_me ? 'flex justify-end' : 'flex justify-start'}`}
            key={index}
          >
            <div
              className={`p-3 rounded-lg max-w-[80%] ${message.from_me ? myMessageClass : otherMessageClass}`}
              style={{
                maxWidth: '80%',
                minWidth: '60px',
                color: message.from_me ? 'white' : 'inherit'
              }}
            >
              {message.isLoading ? (
                <div className="flex items-center space-x-3 py-1">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">AI is thinking...</span>
                </div>
              ) : (
                <>
                  {message.type === 'text' && (
                    <div 
                      className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${message.from_me ? 'text-white user-message-text' : ''}`}
                      style={{ color: message.from_me ? 'white' : 'inherit' }}
                    >
                      {/* Format the AI response text nicely */}
                      <div className="max-w-none">
                        {renderFormattedMessage(message.text, !!message.from_me)}
                      </div>
                      
                      {/* Show Apply Changes button for brainstorm messages */}
                      {message.isBrainstorm && message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700">
                          {/* Progress bar for apply changes */}
                          {isApplyingChanges && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-green-600 dark:text-green-400 mb-1">
                                <span>Applying changes...</span>
                                <span>{applyProgress}%</span>
                              </div>
                              <div className="w-full bg-green-200 dark:bg-green-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${applyProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          <button
                            onClick={onApplyChanges}
                            disabled={isApplyingChanges}
                            className={`w-full px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                              isApplyingChanges 
                                ? 'bg-green-400 dark:bg-green-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                            }`}
                          >
                            {isApplyingChanges ? (
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Applying Changes...</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Apply Changes</span>
                              </div>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div 
                    className={`message-timestamp text-xs mt-2 opacity-70 ${message.from_me ? 'text-white user-message-timestamp' : 'text-gray-500 dark:text-gray-300'}`}
                    style={{ color: message.from_me ? 'white' : 'inherit' }}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              className="w-full min-h-[40px] max-h-32 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#2d5a2d] dark:focus:border-green-400 focus:ring-2 focus:ring-[#dcf8c6] dark:focus:ring-green-800 resize-none transition-all duration-200"
              placeholder="Ask me to brainstorm improvements for your prompt..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Auto-resize the textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={handleSendMessage}
              rows={1}
              style={{ 
                resize: 'none',
                minHeight: '40px',
                maxHeight: '128px',
                overflowY: 'auto'
              }}
            />
          </div>
          <button
            onClick={() => {
              if (newMessage.trim()) {
                onSendMessage(newMessage);
                setNewMessage('');
              }
            }}
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-[#dcf8c6] dark:bg-green-600 text-[#2d5a2d] dark:text-white rounded-lg hover:bg-green-500 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-[#dcf8c6] dark:focus:ring-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Send</span>
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>({
    name: '',
    description: '',
    instructions: '',
    metadata: {
      files: [],
    },
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>('');
  const [isScrolledToBottom, setIsScrolledToBottom] = useState<boolean>(false);
  const updateButtonRef = useRef<HTMLButtonElement>(null);
  const [isFloating, setIsFloating] = useState(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [brainstormSuggestions, setBrainstormSuggestions] = useState<string[]>([]);
  const [currentBrainstormMessage, setCurrentBrainstormMessage] = useState<string>('');
  
  // Thread management state
  const [availableThreads, setAvailableThreads] = useState<Array<{
    threadId: string;
    templateName: string;
    lastUpdated: string;
    messageCount: number;
  }>>([]);
  const [editingThreadName, setEditingThreadName] = useState<string | null>(null);
  const [editingThreadNameValue, setEditingThreadNameValue] = useState<string>('');

  const navigate = useNavigate();

  const exportPrompt = () => {
    const promptData = {
      name: assistantInfo.name,
      description: assistantInfo.description,
      instructions: assistantInfo.instructions,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(promptData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assistantInfo.name || 'prompt'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Prompt exported successfully!');
  };

  const importPrompt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const promptData = JSON.parse(e.target?.result as string);
        setAssistantInfo({
          name: promptData.name || '',
          description: promptData.description || '',
          instructions: promptData.instructions || '',
          metadata: { files: [] }
        });
        setHasChanges(true);
        toast.success('Prompt imported successfully!');
      } catch (error) {
        toast.error('Failed to import prompt. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };
  
  // Thread management functions
  const generateThreadId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const generateDefaultThreadName = () => {
    const chatNumber = availableThreads.length + 1;
    const date = new Date().toLocaleDateString();
    return `Prompt Builder Chat ${chatNumber} - ${date}`;
  };

  const saveChatHistory = async (threadId: string, messages: ChatMessage[], customName?: string) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return;
      }

      const threadName = customName || 'Prompt Builder Chat';

      const response = await axios.post('https://bisnesgpt.jutateknologi.com/api/ai-followup-builder-save-thread/save', {
        threadId,
        email: userEmail,
        messages: messages,
        templateName: threadName
      });

      if (response.data.success) {
        console.log('Chat history saved successfully');
        // Backend should now have the updated message count
      } else {
        console.error('Error saving chat history:', response.data.error);
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const loadChatHistory = async (threadId: string): Promise<ChatMessage[]> => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return [];
      }

      console.log('Loading chat history for thread:', threadId, 'email:', userEmail);
      const response = await axios.get(`https://bisnesgpt.jutateknologi.com/api/ai-followup-builder-save-thread/${threadId}?email=${encodeURIComponent(userEmail)}`);
      
      console.log('Chat history response:', response.data);
      console.log('Response data structure:', {
        success: response.data.success,
        hasData: !!response.data.data,
        dataKeys: response.data.data ? Object.keys(response.data.data) : 'no data',
        messages: response.data.data?.messages,
        messagesType: typeof response.data.data?.messages,
        messagesIsArray: Array.isArray(response.data.data?.messages)
      });
      
      if (response.data.success) {
        const messages = response.data.data.messages || [];
        console.log('Messages loaded:', messages);
        console.log('Messages length:', messages.length);
        return messages;
      } else {
        console.error('Error loading chat history:', response.data.error);
        return [];
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  };

  const getAvailableThreads = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return [];
      }

      const response = await axios.get(`https://bisnesgpt.jutateknologi.com/api/ai-followup-builder-save-thread?email=${encodeURIComponent(userEmail)}`);
      
      console.log('Backend response:', response.data);
      
      if (!response.data.success) {
        console.error('Error getting available threads:', response.data.error);
        return [];
      }
      
      const threads = response.data.data.threads || [];
      
      const validatedThreads = threads.map((thread: any) => {
        try {
          const messageCount = thread.messageCount || 0;
          console.log(`Thread ${thread.threadId}: backend messageCount = ${messageCount}`);
          
          return {
            ...thread,
            lastUpdated: thread.lastUpdated || new Date().toISOString(),
            createdAt: thread.createdAt || new Date().toISOString(),
            messageCount: messageCount
          };
        } catch (dateError) {
          console.error('Error processing thread dates:', dateError, thread);
          return {
            ...thread,
            lastUpdated: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            messageCount: thread.messageCount || 0
          };
        }
      });
      
      // Sort threads by last updated date (most recent first)
      const sortedThreads = validatedThreads.sort((a: any, b: any) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
      
      setAvailableThreads(sortedThreads);
      
      return sortedThreads;
    } catch (error) {
      console.error('Error getting available threads:', error);
      return [];
    }
  };

  const clearCurrentThread = async () => {
    if (threadId) {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          // Delete the thread from the backend
          await axios.delete(`https://bisnesgpt.jutateknologi.com/api/ai-followup-builder-save-thread/${threadId}?email=${encodeURIComponent(userEmail)}`);
          
          // Remove the thread from local state immediately
          setAvailableThreads(prevThreads => 
            prevThreads.filter(thread => thread.threadId !== threadId)
          );
        }
      } catch (error) {
        console.error('Error clearing thread history:', error);
      }
    }
    
    const newThreadId = generateThreadId();
    setThreadId(newThreadId);
    setMessages([]);
    
    await saveChatHistory(newThreadId, []);
    
    // Refresh threads from backend to ensure consistency
    await getAvailableThreads();
  };

  const loadThread = async (threadId: string) => {
    try {
      console.log('Loading thread:', threadId);
      const threadMessages = await loadChatHistory(threadId);
      console.log('Thread messages loaded:', threadMessages);
      console.log('Thread messages type:', typeof threadMessages, 'isArray:', Array.isArray(threadMessages));
      
      // Always set the threadId first, regardless of message count
      console.log('Setting threadId to:', threadId);
      setThreadId(threadId);
      
      // Ensure we have valid messages
      if (Array.isArray(threadMessages) && threadMessages.length > 0) {
        console.log('Setting messages in state:', threadMessages);
        setMessages(threadMessages);
        console.log('Thread loaded successfully, messages count:', threadMessages.length);
      } else {
        console.log('No valid messages found, setting empty array');
        setMessages([]);
      }
      
      // Note: We're not updating availableThreads locally anymore
      // The backend should return the correct message count
      console.log('Thread loaded, but backend should provide correct message count');
    } catch (error) {
      console.error('Error loading thread:', error);
    }
  };

  const createNewThread = async () => {
    const newThreadId = generateThreadId();
    const defaultName = generateDefaultThreadName();
    setThreadId(newThreadId);
    setMessages([]);
    
    await saveChatHistory(newThreadId, [], defaultName);
    
    await getAvailableThreads();
  };

  const startEditingThreadName = (threadId: string) => {
    const thread = availableThreads.find(t => t.threadId === threadId);
    if (thread) {
      setEditingThreadNameValue(thread.templateName);
      setEditingThreadName(threadId);
    }
  };

  const saveThreadName = async (threadId: string) => {
    try {
      await saveChatHistory(threadId, messages, editingThreadNameValue.trim());
      setEditingThreadName(null);
      await getAvailableThreads();
    } catch (error) {
      console.error('Error saving thread name:', error);
    }
  };
  
  useEffect(() => {
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchNeonConfig(companyId);
    }
  }, [companyId]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Adjust this breakpoint as needed
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Load threads when component mounts and auto-create new thread
  useEffect(() => {
    const initializeThreads = async () => {
      console.log('Initializing threads...');
      const threads = await getAvailableThreads();
      console.log('Available threads:', threads);
      
      // Always try to select the most recent thread on first load
      if (threads.length > 0) {
        console.log('Threads exist, selecting most recent one...');
        const mostRecentThread = threads[0]; // Assuming they're sorted by date
        if (mostRecentThread) {
          console.log('Loading most recent thread:', mostRecentThread.threadId);
          await loadThread(mostRecentThread.threadId);
        }
      } else {
        console.log('No threads exist, creating new one...');
        // No threads exist, create a new one
        await createNewThread();
      }
    };
    
    initializeThreads();
  }, []); // Only run once on mount

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth >= 1024); // Adjust this breakpoint as needed
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);

    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  // Debug: Monitor messages state changes
  useEffect(() => {
    console.log('Messages state changed:', messages.length, 'messages:', messages);
  }, [messages]);

  // Debug: Monitor availableThreads state changes
  useEffect(() => {
    console.log('AvailableThreads state changed:', availableThreads.length, 'threads:', availableThreads);
  }, [availableThreads]);

  const fetchCompanyId = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      console.error("No user email found");
      setError("No user email found");
      return;
    }
  
    try {
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
        console.error("Failed to fetch user config from Neon");
        setError("Failed to fetch user config from Neon");
        return;
      }

      const userData = await userResponse.json();
      console.log('User data received:', userData);
      
      const companyId = userData.company_id;
      const role = userData.role;
      const threadid = userData.threadid || '';
      
      console.log('Company ID:', companyId);
      console.log('User role:', role);
      console.log('Thread ID:', threadid);
      
      setCompanyId(companyId);
      setThreadId(threadid);
      setUserRole(role);
    } catch (error) {
      console.error("Error fetching company ID:", error);
      setError("Failed to fetch company ID");
    }
  };

  const fetchNeonConfig = async (companyId: string) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setError("No user email found");
        return;
      }

      const response = await axios.get(`https://bisnesgpt.jutateknologi.com/api/user-company-data?email=${encodeURIComponent(userEmail)}`);

      if (response.status === 200) {
        const { companyData } = response.data;
        console.log('Company data received:', companyData);
        console.log('Assistants IDs field:', companyData.assistants_ids);
        console.log('Type of assistants_ids:', typeof companyData.assistants_ids);
        
        // Parse assistant IDs (handle both string and array)
        let assistantIds: string[] = [];
        if (Array.isArray(companyData.assistants_ids)) {
          assistantIds = companyData.assistants_ids;
          console.log('Assistants IDs as array:', assistantIds);
        } else if (typeof companyData.assistants_ids === 'string') {
          // If stored as a comma-separated string in DB
          assistantIds = companyData.assistants_ids.split(',').map((id: string) => id.trim());
          console.log('Assistants IDs as string (parsed):', assistantIds);
        } else {
          console.log('Assistants IDs is neither array nor string:', companyData.assistants_ids);
        }

        // Check for alternative field names
        if (assistantIds.length === 0) {
          // Try alternative field names
          if (companyData.assistant_id) {
            assistantIds = [companyData.assistant_id];
            console.log('Found assistant_id field:', assistantIds);
          } else if (companyData.assistantId) {
            assistantIds = [companyData.assistantId];
            console.log('Found assistantId field:', assistantIds);
          } else if (companyData.assistants_id) {
            assistantIds = [companyData.assistants_id];
            console.log('Found assistants_id field:', assistantIds);
          }
        }

        // Get the first assistant ID (or you can add assistant selection logic)
        if (assistantIds.length > 0) {
          setAssistantId(assistantIds[0]);
          console.log('Setting assistant ID to:', assistantIds[0]);
          
          // Clear any previous errors since we found the assistant
          setError(null);
        } else {
          console.error("No assistant IDs found in company data");
          console.log('Available company data fields:', Object.keys(companyData));
          setError("No assistants configured for this company. Please contact your administrator.");
          return;
        }

        // Fetch API key from company config
        const response2 = await axios.get(`https://bisnesgpt.jutateknologi.com/api/company-config/${companyId}`);
        const { openaiApiKey } = response2.data;
        setApiKey(openaiApiKey);
        console.log('API key fetched successfully');
      }
    } catch (error) {
      console.error("Error fetching company config:", error);
      setError("Failed to fetch company configuration");
    }
  };

  const fetchAssistantInfo = async (assistantId: string, apiKey: string) => {
    console.log('fetching assistant info for ID:', assistantId);
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
      
      // Clear any errors since we successfully fetched the assistant info
      setError(null);
      console.log('Assistant info fetched successfully:', name);
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    } finally {
      setLoading(false);
    }
  };

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

    setIsUpdating(true);
    setError(null);

    const payload = {
      name: assistantInfo.name || '',
      description: assistantInfo.description || '',
      instructions: assistantInfo.instructions
    };

    try {
      const response = await axios.post(`https://api.openai.com/v1/assistants/${assistantId}`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      toast.success('Assistant updated successfully! 🎉');
      setHasChanges(false);
      
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        navigate('/inbox');
      }, 1500);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating assistant information:', error.response?.data);
        setError(`Failed to update assistant: ${error.response?.data?.error?.message || 'Unknown error'}`);
      } else {
        console.error('Error updating assistant information:', error);
        setError('Failed to update assistant. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };



  const sendMessageToAssistant = async (messageText: string) => {
    if (isSending) return; // Prevent multiple simultaneous requests
    
    setIsSending(true);
    setError(null);
    
    const newMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
  
    // Add loading message with better animation
    const loadingMessage: ChatMessage = {
      from_me: false,
      type: 'text',
      text: '',
      createdAt: new Date().toISOString(),
      isLoading: true,
    };
  
    setMessages(prevMessages => [loadingMessage, newMessage, ...prevMessages]);
  
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("User not authenticated");
        setError("User not authenticated");
        return;
      }
  
      // Use the brainstorming endpoint for suggestions
      const apiUrl = 'https://bisnesgpt.jutateknologi.com';
  
      // Send the full conversation history so AI remembers the context
      const conversationHistory = messages.map(msg => ({
        role: msg.from_me ? 'user' : 'assistant',
        content: msg.text
      }));
      
      console.log('Sending conversation history to AI:', conversationHistory);
      console.log('Current messages state:', messages);
      
      const res = await axios({
        method: 'post',
        url: `${apiUrl}/api/prompt-brainstorm/`,
        params: {
          message: messageText,
          email: userEmail,

        },
        data: {
          currentPrompt: assistantInfo.instructions || '',
          conversationHistory: conversationHistory
        }
      });
      
      if (!res.data.success) {
        throw new Error(res.data.details || 'Failed to process prompt');
      }
  
      // Extract the AI response from the suggestions field
      let responseText = 'No suggestions provided';
      let suggestions: string[] = [];
      
      // Debug logging
      console.log('Full API Response:', res.data);
      
      // The AI response is in the suggestions field
      if (res.data.data && res.data.data.suggestions) {
        responseText = res.data.data.suggestions;
        suggestions = [res.data.data.suggestions]; // Store as a single suggestion for now
      } else if (res.data.suggestions) {
        responseText = res.data.suggestions;
        suggestions = [res.data.suggestions];
      } else if (res.data.data && typeof res.data.data === 'string') {
        // If data is directly a string
        responseText = res.data.data;
      } else if (res.data.data && res.data.data.analysis) {
        // Fallback to analysis field
        responseText = res.data.data.analysis;
      } else if (res.data.data && res.data.data.message) {
        // Fallback to message field
        responseText = res.data.data.message;
      }
      
      // Clean up the response text - remove escape characters and format properly
      if (responseText && responseText !== 'No suggestions provided') {
        // Replace \n with actual line breaks and clean up formatting
        responseText = responseText
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t')
          .trim();
      }
      
      console.log('Extracted response text:', responseText);
      console.log('Extracted suggestions:', suggestions);
      
      // Store suggestions for later use
      setBrainstormSuggestions(suggestions);
      setCurrentBrainstormMessage(messageText);
      
      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: responseText,
        createdAt: new Date().toISOString(),
        isBrainstorm: true,
        suggestions: suggestions
      };
      

  
            // Remove loading message and add the real response
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(msg => !msg.isLoading);
        const updatedMessages = [assistantResponse, ...filteredMessages];
        
        // Save messages to current thread
        if (threadId) {
          saveChatHistory(threadId, updatedMessages);
        } else if (userEmail) {
          // Create new thread if none exists
          const newThreadId = generateThreadId();
          setThreadId(newThreadId);
          saveChatHistory(newThreadId, updatedMessages);
          getAvailableThreads();
        }
        
        return updatedMessages;
      });
  
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to process your request. Please try again.");
      // Remove loading message on error
      setMessages(prevMessages => prevMessages.filter(msg => !msg.isLoading));
    } finally {
      setIsSending(false);
    }
  };

  const applyChangesToPrompt = async () => {
    if (isApplyingChanges || !brainstormSuggestions.length) return;
    
    setIsApplyingChanges(true);
    setApplyProgress(0);
    setError(null);
    
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("User not authenticated");
      }
  
      // Start with initial progress
      setApplyProgress(1);
      
      // Call the apply changes API
      const apiUrl = 'https://bisnesgpt.jutateknologi.com';
      
      // Smooth progress animation that increments by 1% at a time
      const progressInterval = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 15) {
            clearInterval(progressInterval);
            return 15;
          }
          return prev + 1;
        });
      }, 50); // Update every 50ms for smooth animation
      
      // Update progress to show API call starting
      setApplyProgress(15);
      
      const res = await axios({
        method: 'post',
        url: `${apiUrl}/api/prompt-apply-changes/`,
        params: {
          email: userEmail
        },
        data: {
          currentPrompt: assistantInfo.instructions || '',
          changesToApply: currentBrainstormMessage,
          brainstormContext: brainstormSuggestions
        }
      });
      
      // Smooth progress animation to 60%
      const progressInterval2 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 60) {
            clearInterval(progressInterval2);
            return 60;
          }
          return prev + 1;
        });
      }, 30); // Update every 30ms for smooth animation
      
      // Update progress to show API call completed
      setApplyProgress(60);
      
      if (!res.data.success) {
        throw new Error(res.data.details || 'Failed to apply changes');
      }
  
      const { updatedPrompt, analysis } = res.data.data;
      
      // Smooth progress animation to 80%
      const progressInterval3 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval3);
            return 80;
          }
          return prev + 1;
        });
      }, 20); // Update every 20ms for smooth animation
      
      // Update progress to show processing
      setApplyProgress(80);
      
      // Update assistant instructions with the new prompt
      setAssistantInfo(prevInfo => ({
        ...prevInfo,
        instructions: updatedPrompt
      }));
      
      // Mark that there are unsaved changes
      setHasChanges(true);
      
      // Smooth progress animation to 100%
      const progressInterval4 = setInterval(() => {
        setApplyProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval4);
            return 100;
          }
          return prev + 1;
        });
      }, 15); // Update every 15ms for smooth animation
      
      // Complete progress
      setApplyProgress(100);
      
      // Add success message
      const successMessage: ChatMessage = {
        from_me: false,
        type: 'text',
        text: `✅ Changes applied successfully!\n\n${analysis || 'Your prompt has been updated with the requested changes.'}`,
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [successMessage, ...prevMessages]);
      
      // Clear suggestions after successful application
      setBrainstormSuggestions([]);
      setCurrentBrainstormMessage('');
      
      toast.success('Changes applied successfully! 🎉');
      
    } catch (error) {
      console.error('Error applying changes:', error);
      setError("Failed to apply changes. Please try again.");
      setApplyProgress(0);
    } finally {
      setIsApplyingChanges(false);
      // Reset progress after a delay
      setTimeout(() => setApplyProgress(0), 1000);
    }
  };

// ... existing code ...

  useEffect(() => {
    if (assistantId && apiKey) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  }, [assistantId, apiKey]);

  // Reset textarea heights when instructions change
  useEffect(() => {
    const instructionsTextarea = document.getElementById('instructions') as HTMLTextAreaElement;
    if (instructionsTextarea) {
      instructionsTextarea.style.height = 'auto';
      instructionsTextarea.style.height = Math.min(instructionsTextarea.scrollHeight, window.innerHeight - 300) + 'px';
    }
  }, [assistantInfo.instructions]);

  const deleteThread = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      console.error("No user email found");
      setError("No user email found");
      return;
    }
  
    try {
      // Clear thread ID in state
      setThreadId('');
      
      // Clear the messages state
      setMessages([]);
      
      toast.success('Thread cleared successfully');
    } catch (error) {
      console.error("Error clearing thread:", error);
      setError("Failed to clear thread");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setError(null);
    const { name, value } = e.target;
    setAssistantInfo({ ...assistantInfo, [name]: value });
    setHasChanges(true);
  };
  
  const handleFocus = () => {
    setError(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight;
      setIsFloating(!scrolledToBottom);
    };
  
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize on mount
  
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);








return (
    <div className="flex justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className={`w-full ${isWideScreen ? 'max-w-6xl flex' : 'max-w-lg'}`}>
        {isWideScreen ? (
          <>
            {/* Chat section moved to left side */}
            <div className="w-1/2 pr-2">
              <MessageList 
                messages={messages} 
                onSendMessage={sendMessageToAssistant} 
                assistantName={assistantInfo?.name} 
                deleteThread={deleteThread} 
                threadId={threadId}
                isApplyingChanges={isApplyingChanges}
                applyProgress={applyProgress}
                onApplyChanges={applyChangesToPrompt}
                availableThreads={availableThreads}
                onLoadThread={loadThread}
                onCreateNewThread={createNewThread}
                onClearCurrentThread={clearCurrentThread}
              />
            </div>
            {/* Assistant details moved to right side */}
            <div className="w-1/2 pl-2 pr-2 ml-2 mr-2 mt-4 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-4">
                    <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
                    <div className="mt-2 text-xs p-2 dark:text-gray-200">Fetching Assistant...</div>
                    <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                        title="Go back"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h1 className="text-2xl font-bold dark:text-gray-200">{assistantInfo.name || "Assistant Name"}</h1>
                    </div>
                  </div>
               
                  <div className="flex-1 flex flex-col">
                    <label className="mb-2 text-lg font-medium dark:text-gray-200 flex items-center space-x-2" htmlFor="instructions">
                      <svg className="w-5 h-5 text-[#2d5a2d] dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Assistant Instructions</span>
                    </label>
                    <div className="relative flex-1">
                      <textarea
                        id="instructions"
                        name="instructions"
                        className="w-full h-full p-4 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#dcf8c6] focus:border-[#2d5a2d] transition-all duration-200 resize-none font-mono"
                        placeholder="Tell your assistant what to do. Be specific about its role, tone, and capabilities..."
                        value={assistantInfo.instructions}
                        onChange={(e) => {
                          handleInputChange(e);
                          // Auto-resize the textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, window.innerHeight - 300) + 'px';
                        }}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                        style={{ 
                          minHeight: 'calc(100vh - 300px)',
                          maxHeight: 'calc(100vh - 200px)',
                          overflowY: 'auto'
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      {hasChanges && (
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-3">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-xs text-yellow-800 dark:text-yellow-200">
                              Unsaved changes
                            </span>
                          </div>
                        </div>
                      )}
                      

                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={exportPrompt}
                        className="px-3 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export</span>
                      </button>
                      
                      <label className="px-3 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 text-sm cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Import</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={importPrompt}
                          className="hidden"
                        />
                      </label>
                      
                      <button 
                        ref={updateButtonRef}
                        onClick={updateAssistantInfo} 
                        disabled={userRole === "3" || isUpdating}
                        className="px-4 py-2 bg-[#dcf8c6] hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-700 text-[#2d5a2d] dark:text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#dcf8c6] dark:focus:ring-green-800 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-sm"
                        onFocus={handleFocus}
                      >
                        {isUpdating ? (
                          <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {error && <div className="mt-4 text-red-500">{error}</div>}
                </>
              )}
            </div>
          </>
        ) : (
          <Tab.Group as="div" className="flex flex-col w-full h-full">
            <Tab.List className="flex bg-gray-100 dark:bg-gray-900 p-2 sticky top-0 z-10">
              <Tab
                className={({ selected }) =>
                  `w-1/2 py-2 text-sm font-medium text-center rounded-lg ${
                    selected
                      ? 'bg-white text-[#2d5a2d] dark:bg-gray-800 dark:text-green-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  } transition-colors duration-200`
                }
              >
                Assistant Config
              </Tab>
              <Tab
                className={({ selected }) =>
                  `w-1/2 py-2 text-sm font-medium text-center rounded-lg ${
                    selected
                      ? 'bg-white text-[#2d5a2d] dark:bg-gray-800 dark:text-green-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  } transition-colors duration-200`
                }
              >
                Chat
              </Tab>
            </Tab.List>
            <Tab.Panels className="flex-1 overflow-hidden">
              <Tab.Panel className="h-full overflow-auto p-4 dark:bg-gray-900">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-15">
                      <img alt="Logo" className="w-24 h-24 p-15" src={logoUrl} />
                      <div className="mt-2 text-xs p-15 dark:text-gray-200">Fetching Assistant...</div>
                      <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <button
                          onClick={() => navigate(-1)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                          title="Go back"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">AI Prompt Builder</h2>
                      </div>
                      <label className="mb-2 text-lg font-medium capitalize dark:text-gray-200" htmlFor="name">
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#dcf8c6] pr-10"
                        placeholder="Name your assistant"
                        value={assistantInfo.name}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="description">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        className="w-full p-3 border border-gray-300 rounded-lg h-24 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#dcf8c6]"
                        placeholder="Add a short description of what this assistant does"
                        value={assistantInfo.description}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="instructions">
                        Instructions
                      </label>
                      <div className="relative flex-1">
                        <textarea
                          id="instructions"
                          name="instructions"
                          className="w-full h-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#dcf8c6] focus:border-[#2d5a2d] transition-all duration-200 resize-none font-mono"
                          placeholder="Tell your assistant what to do. Be specific about its role, tone, and capabilities..."
                          value={assistantInfo.instructions}
                          onChange={(e) => {
                            handleInputChange(e);
                            // Auto-resize the textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, window.innerHeight - 400) + 'px';
                          }}
                          onFocus={handleFocus}
                          disabled={userRole === "3"}
                          style={{ 
                            minHeight: 'calc(100vh - 400px)',
                            maxHeight: 'calc(100vh - 300px)',
                            overflowY: 'auto'
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {hasChanges && (
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-xs text-yellow-800 dark:text-yellow-200">
                              Unsaved changes
                            </span>
                          </div>
                        </div>
                      )}
                      

                      
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={exportPrompt}
                          className="px-3 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Export</span>
                        </button>
                        
                        <label className="px-3 py-2 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2 text-sm cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Import</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={importPrompt}
                            className="hidden"
                          />
                        </label>
                        
                        <button 
                          ref={updateButtonRef}
                          onClick={updateAssistantInfo} 
                          disabled={userRole === "3" || isUpdating}
                          className="px-4 py-2 bg-[#dcf8c6] hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-700 text-[#2d5a2d] dark:text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#dcf8c6] dark:focus:ring-green-800 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 text-sm"
                          onFocus={handleFocus}
                        >
                          {isUpdating ? (
                            <>
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Save</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {error && <div className="mt-4 text-red-500">{error}</div>}
                  </>
                )}
              </Tab.Panel>
              <Tab.Panel className="h-full flex flex-col">
                <MessageList 
                  messages={messages} 
                  onSendMessage={sendMessageToAssistant} 
                  assistantName={assistantInfo?.name || 'Juta Assistant'} 
                  deleteThread={deleteThread} 
                  threadId={threadId}
                  isApplyingChanges={isApplyingChanges}
                  applyProgress={applyProgress}
                  onApplyChanges={applyChangesToPrompt}
                  availableThreads={availableThreads}
                  onLoadThread={loadThread}
                  onCreateNewThread={createNewThread}
                  onClearCurrentThread={clearCurrentThread}
                />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        )}
        <ToastContainer />
      </div>
    </div>
  );
}

export default Main;