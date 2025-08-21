import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";

import { initializeApp } from "firebase/app";
import {
  updateDoc,
  getDoc,
} from "firebase/firestore";
import {
  getFirestore,
  doc,
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Tab } from "@headlessui/react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL:
    "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L",
};



const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
  imageUrls?: string[];
  documentUrls?: string[];
  caption?: string;
}

interface AssistantInfo {
  name: string;
  description: string;
  instructions: string;
  metadata: {
    files: Array<{
      id: string;
      name: string;
      url: string;
      vectorStoreId?: string;
      openAIFileId?: string;
    }>;
  };
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
  deleteThread: () => void;
  threadId: string; // Add this line
  enterFullscreenMode: () => void; // Add this line
  openPDFModal: (documentUrl: string, documentName?: string) => void; // Add this line
  companyId: string | null; // Add this line
}
interface AssistantConfig {
  id: string;
  name: string;
}

interface InstructionTemplate {
  id: string;
  name: string;
  instructions: string;
}

// PDF Modal Component
interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName?: string;
}

const PDFModal: React.FC<PDFModalProps> = ({ isOpen, onClose, documentUrl, documentName }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full md:w-[800px] h-auto md:h-[600px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
            Document Preview
          </h2>
          <button
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4 flex justify-center items-center"
          style={{ height: "90%" }}
        >
          {documentUrl.toLowerCase().includes('.pdf') ? (
            <iframe
              src={documentUrl}
              width="100%"
              height="100%"
              title="PDF Document"
              className="border rounded"
            />
          ) : (
            <div className="text-center">
              <svg className="w-20 h-20 mb-2 mx-auto text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-800 dark:text-gray-200 font-semibold">
                {documentName || "Document"}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Click Download to view this document
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-center">
          <button
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            onClick={() => window.open(documentUrl, '_blank')}
          >
            Download Document
          </button>
        </div>
      </div>
    </div>
  );
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  onSendMessage,
  assistantName,
  deleteThread,
  threadId,
  enterFullscreenMode,
  openPDFModal,
  companyId,
}) => {
  const [newMessage, setNewMessage] = useState("");

  const myMessageClass =
    "flex flex-col w-full max-w-[320px] leading-1.5 p-1 bg-gray-700 text-white dark:bg-gray-600 rounded-tr-xl rounded-tl-xl rounded-br-sm rounded-bl-xl self-end ml-auto mr-2 text-left";
  const otherMessageClass =
    "bg-[#dcf8c6] dark:bg-green-700 text-black dark:text-white rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-sm p-1 self-start text-left";

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSendMessage(newMessage);
        setNewMessage("");
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-900 relative">
      <div className="flex items-center justify-between p-2 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center">
          <div className="w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center text-white mr-3">
            <span className="text-lg capitalize">
              {assistantName.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
              {assistantName}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={deleteThread}
            className={`px-4 py-2 text-white rounded flex items-center text-sm ${
              !threadId
                ? "bg-gray-500 dark:bg-gray-600 cursor-not-allowed"
                : "bg-red-500 dark:bg-red-600"
            } active:scale-95 transition-all duration-200`}
            disabled={!threadId}
          >
            Reset Conversation
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 dark:bg-gray-900 relative">
                {/* Tool Buttons - Positioned at top of chat area */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          {/* Add subtle background for better visual separation */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/50 pointer-events-none rounded-t-lg"></div>
          <Link to="/a-i-responses">
            <button className="px-3 py-2 bg-blue-500 dark:bg-blue-600 text-white border-2 border-blue-600 dark:border-blue-500 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 hover:border-blue-700 dark:hover:border-blue-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 whitespace-nowrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              AI Tools
            </button>
          </Link>
          <Link to="/follow-ups">
            <button className="px-3 py-2 bg-teal-500 dark:bg-teal-600 text-white border-2 border-teal-600 dark:border-teal-500 rounded-lg hover:bg-teal-600 dark:hover:bg-teal-700 hover:border-teal-700 dark:hover:border-teal-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 whitespace-nowrap">
            <svg
              xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
              Follow-Ups
          </button>
          </Link>
          <Link to="/users-layout-2/builder2">
            <button className="px-3 py-2 bg-purple-500 dark:bg-purple-600 text-white border-2 border-purple-600 dark:border-purple-500 rounded-lg hover:bg-purple-600 dark:hover:bg-purple-700 hover:border-purple-700 dark:hover:border-purple-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
              Prompt Builder
          </button>
          </Link>
          <Link to="/split-test">
            <button className="px-3 py-2 bg-orange-500 dark:bg-orange-600 text-white border-2 border-orange-600 dark:border-orange-500 rounded-lg hover:bg-orange-600 dark:hover:bg-orange-700 hover:border-orange-700 dark:hover:border-orange-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Split Test
            </button>
          </Link>
          <a
            href={`https://web.jutateknologi.com/guest-chat/${companyId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="px-3 py-2 bg-indigo-500 dark:bg-indigo-600 text-white border-2 border-indigo-600 dark:border-indigo-500 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-700 hover:border-indigo-700 dark:hover:border-indigo-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 whitespace-nowrap">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
                <path
                  fillRule="evenodd"
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                  clipRule="evenodd"
                />
          </svg>
              Guest Chat
        </button>
          </a>
        </div>
        
        {messages
          .slice()
          .reverse()
          .map((message, index) => (
            <div key={index}>
              {message.text.split("||")
                .filter(splitText => splitText.trim() !== "")
                .map((splitText, splitIndex) => (
                <div
                  key={`${index}-${splitIndex}`}
                  className={`p-2 mb-2 rounded ${
                    message.from_me ? myMessageClass : otherMessageClass
                  }`}
                  style={{
                    maxWidth: "70%",
                    width: `${
                      message.type === "image" || message.type === "document"
                        ? "350"
                        : Math.min((splitText.trim().length || 0) * 10, 350)
                    }px`,
                    minWidth: "75px",
                  }}
                >
                  {message.type === "text" && (
                    <div className="whitespace-pre-wrap break-words">
                      {splitText.trim()}
                    </div>
                  )}
                  {message.type === "image" && message.imageUrls && (
                    <div className="space-y-2">
                      {message.imageUrls.map((imageUrl, imgIndex) => (
                        <div key={imgIndex} className="relative">
                          <img
                            src={imageUrl}
                            alt={`AI Response Image ${imgIndex + 1}`}
                            className="max-w-full h-auto rounded-lg cursor-pointer"
                            style={{ maxHeight: "300px" }}
                            onClick={() => {
                              // Open image in new tab or modal if needed
                              window.open(imageUrl, '_blank');
                            }}
                          />
                          {message.caption && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {message.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {message.type === "document" && message.documentUrls && (
                    <div className="space-y-2">
                      {message.documentUrls.map((documentUrl, docIndex) => (
                        <div key={docIndex} className="relative">
                          {/* Document Header */}
                          <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 mb-2">
                            <svg className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {documentUrl.split('/').pop()?.split('?')[0] || `Document ${docIndex + 1}`}
                              </p>
                              {message.caption && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {message.caption}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => openPDFModal(documentUrl, documentUrl.split('/').pop()?.split('?')[0] || `Document ${docIndex + 1}`)}
                              className="px-3 py-1 text-xs bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                            >
                              View
                            </button>
                          </div>
                          
                          {/* Document Content Preview */}
                          <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                            {documentUrl.toLowerCase().includes('.pdf') ? (
                              <iframe
                                src={documentUrl}
                                width="100%"
                                height="400"
                                title={`Document ${docIndex + 1}`}
                                className="border-0"
                                style={{ minHeight: '400px' }}
                              />
                            ) : documentUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img
                                src={documentUrl}
                                alt={`Document ${docIndex + 1}`}
                                className="w-full h-auto max-h-96 object-contain"
                              />
                            ) : (
                              <div className="p-4 text-center">
                                <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                  Document preview not available
                                </p>
                                <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                                  Click Download to view this document
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {splitIndex === message.text.split("||").filter(splitText => splitText.trim() !== "").length - 1 && (
                    <div className="message-timestamp text-xs text-gray-400 dark:text-gray-500 mt-2 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-full inline-block">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
      
      {/* Fullscreen Button - Positioned inside chatbox */}
      <button
        onClick={enterFullscreenMode}
        className="absolute bottom-20 right-4 p-3 bg-green-500 dark:bg-green-600 text-white rounded-full hover:bg-green-600 dark:hover:bg-green-700 active:scale-95 transition-colors z-10 shadow-lg"
        title="Open in fullscreen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>

      <div className="p-4 border-t border-gray-300 dark:border-gray-700">
        <div className="flex items-center">
          <textarea
            className="w-full h-10 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-green-500 dark:focus:border-green-400 resize-none"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleSendMessage}
          />
          <button
            onClick={() => onSendMessage(newMessage)}
            className="px-4 py-2 ml-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
          >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>({
    name: "",
    description: "",
    instructions: "",
    metadata: {
      files: [],
    },
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [assistantId, setAssistantId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>("");
  const [isScrolledToBottom, setIsScrolledToBottom] = useState<boolean>(false);
  const updateButtonRef = useRef<HTMLButtonElement>(null);
  const [isFloating, setIsFloating] = useState(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [files, setFiles] = useState<
    Array<{
      id: string;
      name: string;
      url: string;
      vectorStoreId?: string;
    }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [assistants, setAssistants] = useState<AssistantConfig[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>("");
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [isToolsCollapsed, setIsToolsCollapsed] = useState(false);
  const [aiAutoResponse, setAiAutoResponse] = useState<boolean>(false);
  const [aiDelay, setAiDelay] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Fullscreen mode state
  const location = useLocation();
  const navigate = useNavigate();
  const isFullscreenMode = location.pathname.includes('/fullscreen-chat/');
  const fullscreenCompanyId = location.pathname.match(/\/fullscreen-chat\/([^\/]+)/)?.[1];

  // Message classes for fullscreen mode
  const myMessageClass =
    "flex flex-col w-full max-w-[320px] leading-1.5 p-1 bg-gray-700 text-white dark:bg-gray-600 rounded-tr-xl rounded-tl-xl rounded-br-sm rounded-bl-xl self-end ml-auto mr-2 text-left";
  const otherMessageClass =
    "bg-[#dcf8c6] dark:bg-green-700 text-black dark:text-white rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-sm p-1 self-start text-left";

  // Fullscreen message handling
  const [fullscreenNewMessage, setFullscreenNewMessage] = useState("");
  
  // PDF Modal state
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    documentUrl: string;
    documentName?: string;
  }>({
    isOpen: false,
    documentUrl: "",
    documentName: "",
  });

  const openPDFModal = (documentUrl: string, documentName?: string) => {
    setPdfModal({
      isOpen: true,
      documentUrl,
      documentName,
    });
  };

  const closePDFModal = () => {
    setPdfModal({
      isOpen: false,
      documentUrl: "",
      documentName: "",
    });
  };
  
  const handleFullscreenSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (fullscreenNewMessage.trim()) {
        sendMessageToAssistant(fullscreenNewMessage);
        setFullscreenNewMessage("");
      }
    }
  };

  const handleFullscreenSendClick = () => {
    if (fullscreenNewMessage.trim()) {
      sendMessageToAssistant(fullscreenNewMessage);
      setFullscreenNewMessage("");
    }
  };

  useEffect(() => {
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchFirebaseConfig();
      fetchFiles();
    }
  }, [companyId]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Adjust this breakpoint as needed
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth >= 1024); // Adjust this breakpoint as needed
    };

    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);

    return () => window.removeEventListener("resize", checkScreenWidth);
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchTemplates();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchAiSettings();
    }
  }, [companyId]);

  const fetchCompanyId = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      toast.error("No user email found");
      return;
    }

    try {
      // Get user config to get companyId
      const userResponse = await fetch(
        `https://juta-dev.ngrok.dev/api/user/config?email=${encodeURIComponent(
          userEmail
        )}`,
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
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      console.log(userData);
      setCompanyId(userData.company_id);
      setThreadId(userData.thread_id);
      setUserRole(userData.role);
    } catch (error) {
      console.error("Error fetching company ID:", error);
      toast.error("Failed to fetch company ID");
    }
  };

  // Assuming axios is imported: import axios from 'axios';

  const fetchFirebaseConfig = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setError("No user email found");
        return;
      }

      const response = await axios.get(
        `https://juta-dev.ngrok.dev/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );

      if (response.status === 200) {
        const { companyData } = response.data;
        console.log(companyData);
        // Parse assistant IDs (handle both string and array)
        let assistantIds: string[] = [];
        if (Array.isArray(companyData.assistants_ids)) {
          assistantIds = companyData.assistants_ids;
        } else if (typeof companyData.assistants_ids === "string") {
          // If stored as a comma-separated string in DB
          assistantIds = companyData.assistants_ids
            .split(",")
            .map((id: string) => id.trim());
        }

        // If you have phone names, use them; otherwise, default names
        const assistantConfigs: AssistantConfig[] = assistantIds.map(
          (id, idx) => ({
            id,
            name: `Assistant ${idx + 1}`,
          })
        );

        console.log("Assistant configs found:", assistantConfigs);
        console.log("Setting assistants state:", assistantConfigs);
        setAssistants(assistantConfigs);
        
        const response2 = await axios.get(
          `https://juta-dev.ngrok.dev/api/company-config/${companyId}`
        );

        const { openaiApiKey } = response2.data;
        setApiKey(openaiApiKey);
        console.log("API Key set:", openaiApiKey ? "Present" : "Missing");
        console.log("Assistant configs:", assistantConfigs);
        // Set default selected assistant
        if (assistantConfigs.length > 0) {
          console.log("Setting selected assistant to:", assistantConfigs[0].id);
          setSelectedAssistant(assistantConfigs[0].id);
          setAssistantId(assistantConfigs[0].id);
        } else {
          console.log("No assistant configs found, not setting assistantId");
        }
      }
    } catch (error) {
      console.error("Error fetching company config:", error);
      setError("Failed to fetch company configuration");
    }
  };
  const fetchAssistantInfo = async (assistantId: string, apiKey: string) => {
    // Validate inputs before making API call
    if (!assistantId || !assistantId.trim() || !apiKey || !apiKey.trim()) {
      console.log("Skipping assistant info fetch - invalid assistantId or apiKey");
      setLoading(false);
      return;
    }

    // Check if assistantId looks like a valid OpenAI assistant ID format
    if (!assistantId.startsWith('asst_')) {
      console.log("Skipping assistant info fetch - invalid assistant ID format:", assistantId);
      setLoading(false);
      return;
    }

    console.log("Fetching assistant info for ID:", assistantId);
    setLoading(true);
    try {
      const response = await axios.get(
        `https://api.openai.com/v1/assistants/${assistantId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );
      const { name, description = "", instructions = "" } = response.data;
      setAssistantInfo({
        name,
        description,
        instructions,
        metadata: { files: [] },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log("Assistant not found in OpenAI (404) - ID may be invalid:", assistantId);
        // Don't set error for 404s, just log it
        setError(null);
      } else {
        console.error("Error fetching assistant information:", error);
        setError("Failed to fetch assistant information");
      }
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

    setIsSaving(true);

    // Get all unique vector store IDs from files
    const vectorStoreIds = [
      ...new Set(files.map((file) => file.vectorStoreId).filter(Boolean)),
    ];

    const payload = {
      name: assistantInfo.name || "",
      description: assistantInfo.description || "",
      instructions: assistantInfo.instructions,
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: vectorStoreIds,
        },
      },
    };

    try {
      const response = await axios.post(
        `https://api.openai.com/v1/assistants/${assistantId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );

      toast.success("Assistant updated successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error updating assistant information:",
          error.response?.data
        );
        setError(
          `Failed to update assistant information: ${error.response?.data.error.message}`
        );
      } else {
        console.error("Error updating assistant information:", error);
        setError("Failed to update assistant information");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const checkAIResponses = async (messageText: string, isUserMessage: boolean = true): Promise<ChatMessage[]> => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail || !companyId) return [];

      // Get company API URL
      const baseUrl = "https://juta-dev.ngrok.dev";
      const companyResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!companyResponse.ok) return [];

      const companyData = await companyResponse.json();
      const apiUrl = companyData.companyData.api_url || baseUrl;

      // Fetch all AI responses by type since the API requires a type parameter
      console.log("Fetching AI responses for company:", companyId, "from:", apiUrl);
      
      const responseTypes = ['image', 'tag', 'voice', 'document', 'assign', 'video'];
      const allResponses = [];
      
      // Fetch responses for each type
      for (const responseType of responseTypes) {
        try {
          const endpoint = `${apiUrl}/api/ai-responses?companyId=${companyId}&type=${responseType}`;
          console.log(`Fetching ${responseType} responses from:`, endpoint);
          
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });
          
          if (response.ok) {
            const data = await response.json();
                         if (data.success && data.data) {
               // Add type to each response for easier processing
               const typedResponses = data.data.map((item: any) => ({ ...item, type: responseType }));
               allResponses.push(...typedResponses);
               console.log(`Found ${typedResponses.length} ${responseType} responses`);
             }
          } else {
            console.log(`${responseType} responses failed:`, response.status);
          }
        } catch (error) {
          console.log(`Error fetching ${responseType} responses:`, error);
        }
      }
      
            console.log("Total AI responses found:", allResponses.length);
      console.log("All responses data:", allResponses);
      
      const triggeredResponses: ChatMessage[] = [];

      // Check each AI response for keyword matches
      for (const response of allResponses) {
        console.log("Processing response:", response);
        console.log("Response status:", response.status);
        console.log("Response keywords:", response.keywords);
        
        if (response.status !== 'active') {
          console.log("Skipping inactive response:", response.status);
          continue;
        }

        const keywords = Array.isArray(response.keywords) ? response.keywords : [response.keywords];
        const messageLower = messageText.toLowerCase();
        console.log("Checking keywords:", keywords, "against message:", messageLower);

        // Check if any keyword matches the message
        // For user messages, check if user input triggers AI responses
        // For bot messages, check if bot output triggers AI responses
        let hasMatch = false;
        
        if (isUserMessage) {
          // Check if user message contains keywords (for user-triggered responses)
          hasMatch = keywords.some((keyword: string) => 
            keyword && messageLower.includes(keyword.toLowerCase())
          );
        } else {
          // Check if bot message contains keywords (for bot-triggered responses)
          hasMatch = keywords.some((keyword: string) => 
            keyword && messageLower.includes(keyword.toLowerCase())
          );
        }

        if (hasMatch) {
          console.log("Keyword match found:", keywords, "for response:", response);
          // Create appropriate response based on type
          switch (response.type) {
            case 'image':
              console.log("Processing image response:", response);
              if (response.image_urls && response.image_urls.length > 0) {
                console.log("Image URLs found:", response.image_urls);
                triggeredResponses.push({
                  from_me: false,
                  type: "image",
                  text: response.description || "AI Image Response",
                  imageUrls: response.image_urls,
                  caption: response.description,
                  createdAt: new Date().toISOString(),
                });
                console.log("Added image response to triggeredResponses");
              } else {
                console.log("No image URLs found in response:", response);
              }
              break;
            case 'tag':
              // Handle tag responses if needed
              break;
            case 'voice':
              // Handle voice responses if needed
              break;
            case 'document':
              console.log("Processing document response:", response);
              if (response.document_urls && response.document_urls.length > 0) {
                console.log("Document URLs found:", response.document_urls);
                triggeredResponses.push({
                  from_me: false,
                  type: "document",
                  text: response.description || "AI Document Response",
                  documentUrls: response.document_urls,
                  caption: response.description,
                  createdAt: new Date().toISOString(),
                });
                console.log("Added document response to triggeredResponses");
              } else {
                console.log("No document URLs found in response:", response);
              }
              break;
            case 'assign':
              // Handle assignment responses if needed
              break;
            case 'video':
              // Handle video responses if needed
              break;
          }
        } else {
          console.log("No keyword match for:", keywords);
        }
      }
      
      console.log("Final triggeredResponses:", triggeredResponses);

      return triggeredResponses;
    } catch (error) {
      console.error("Error checking AI responses:", error);
      return [];
    }
  };

  const sendMessageToAssistant = async (messageText: string) => {
    const newMessage: ChatMessage = {
      from_me: true,
      type: "text",
      text: messageText,
      createdAt: new Date().toISOString(),
    };

    // Clear dummy messages if they are present
    setMessages((prevMessages) => {
      if (
        prevMessages.some(
          (message) =>
            message.createdAt === "2024-05-29T10:00:00Z" ||
            message.createdAt === "2024-05-29T10:01:00Z"
        )
      ) {
        return [newMessage];
      } else {
        return [newMessage, ...prevMessages];
      }
    });

    // Log assistantId

    try {
      const userEmail = localStorage.getItem("userEmail");

      // Get the assistant response first
      const res = await axios.get(
        `https://juta-dev.ngrok.dev/api/assistant-test/`,
        {
          params: {
            message: messageText,
            email: userEmail,
            assistantid: assistantId,
          },
        }
      );
      const data = res.data;

      // Split the bot's response into individual messages using || separator
      const botMessages = data.answer.split('||').filter((line: string) => line.trim() !== '');
      console.log("Bot response split into messages:", botMessages);
      
      // Check for AI responses based on the BOT's message, not the user's
      const aiResponses = await checkAIResponses(data.answer, false);
      console.log("AI Responses found for bot message:", aiResponses);
      
      // Create messages array - each || separated part becomes a separate message
      const newMessages: ChatMessage[] = [];
      
      // Process each bot message part and insert AI responses after the triggering part
      for (let i = 0; i < botMessages.length; i++) {
        const botMessage = botMessages[i];
        console.log(`Processing bot message part ${i}:`, botMessage);
        
        // Add the bot message part
        newMessages.push({
          from_me: false,
          type: "text",
          text: botMessage,
          createdAt: new Date().toISOString(),
        });
        
        // If this message part contains the keyword, add AI responses immediately after
        if (aiResponses.length > 0 && botMessage.toLowerCase().includes('your cnb carpets virtual admin assistant')) {
          console.log("Adding AI responses after message part:", botMessage);
          newMessages.push(...aiResponses);
        }
      }
      
      console.log("Final newMessages array:", newMessages);
      
      // Reverse the messages so newest appears first in the chat display
      const reversedNewMessages = [...newMessages].reverse();
      console.log("Reversed for chat display:", reversedNewMessages);
      
      // Add all messages to the chat (newest first)
      // The image should appear after the greeting message that triggered it
      setMessages((prevMessages) => [...reversedNewMessages, ...prevMessages]);
      if (userEmail) {
        setThreadId(userEmail); // Update the threadId to user email as a placeholder
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to send message");
    }
  };

  useEffect(() => {
    if (assistantId && apiKey && assistantId.trim() && apiKey.trim() && assistantId.startsWith('asst_')) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  }, [assistantId, apiKey]);

  const deleteThread = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      console.error("No user is logged in");
      setError("No user is logged in");
      return;
    }

    try {
      // Clear the threadId in state
      setThreadId("");
      
      // Clear the messages state
      setMessages([]);
      
      // Optionally, you can also clear from localStorage if needed
      localStorage.removeItem("threadId");
      
      console.log("Thread deleted successfully");
    } catch (error) {
      console.error("Error deleting thread:", error);
      setError("Failed to delete thread");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setError(null);
    const { name, value } = e.target;
    setAssistantInfo({ ...assistantInfo, [name]: value });
  };

  const handleFocus = () => {
    setError(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight;
      setIsFloating(!scrolledToBottom);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initialize on mount

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const fetchFiles = async () => {
    if (!companyId) return;

    const baseUrl = "https://juta-dev.ngrok.dev";
    
    try {
      // Get user email for API calls
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("No user email found");
      }

      // Get company API URL
      const response = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(userEmail)}`,
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
      const apiUrl = data.companyData.api_url || baseUrl;

      // Fetch files from backend
      const filesResponse = await fetch(`${apiUrl}/api/assistant-files?companyId=${companyId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!filesResponse.ok) {
        throw new Error("Failed to fetch files from backend");
      }

      const fileList = await filesResponse.json();
      
      // Ensure fileList is an array, handle different response formats
      if (Array.isArray(fileList)) {
        setFiles(fileList);
      } else if (fileList && Array.isArray(fileList.files)) {
        setFiles(fileList.files);
      } else if (fileList && Array.isArray(fileList.data)) {
        setFiles(fileList.data);
      } else {
        console.warn("Unexpected response format for files:", fileList);
        setFiles([]);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to fetch files");
      setFiles([]); // Ensure files is always an array
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    setUploading(true);
    const baseUrl = "https://juta-dev.ngrok.dev";

    try {
      // Get user email for API calls
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("No user email found");
      }

      // Get company API URL
      const response = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(userEmail)}`,
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
      const apiUrl = data.companyData.api_url || baseUrl;

      // Upload file to backend storage
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("fileName", file.name);
      uploadFormData.append("companyId", companyId);

      const uploadResponse = await fetch(`${apiUrl}/api/upload-file`, {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to backend storage");
      }

      const uploadResult = await uploadResponse.json();
      const downloadURL = uploadResult.url;

      // Upload file to OpenAI
      const openAIFormData = new FormData();
      openAIFormData.append("file", file);
      openAIFormData.append("purpose", "assistants");

      const openAIFileResponse = await axios.post(
        "https://api.openai.com/v1/files",
        openAIFormData,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Create or get existing vector store
      let vectorStoreId;
      try {
        // List all vector stores to find one with matching name
        const listVectorStoresResponse = await axios.get(
          "https://api.openai.com/v1/vector_stores",
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "OpenAI-Beta": "assistants=v2",
            },
          }
        );
        
        // Find existing vector store with matching name
        const existingVectorStore = listVectorStoresResponse.data.data.find(
          (store: any) => store.name === `${companyId}-knowledge-base`
        );
        
        if (existingVectorStore) {
          vectorStoreId = existingVectorStore.id;
        } else {
          // Create new vector store if not found
          const createVectorStoreResponse = await axios.post(
            "https://api.openai.com/v1/vector_stores",
            {
              name: `${companyId}-knowledge-base`,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "OpenAI-Beta": "assistants=v2",
              },
            }
          );
          vectorStoreId = createVectorStoreResponse.data.id;
        }
      } catch (error) {
        // If listing fails, try to create a new vector store
        try {
          const createVectorStoreResponse = await axios.post(
            "https://api.openai.com/v1/vector_stores",
            {
              name: `${companyId}-knowledge-base`,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "OpenAI-Beta": "assistants=v2",
              },
            }
          );
          vectorStoreId = createVectorStoreResponse.data.id;
        } catch (createError) {
          console.error("Failed to create vector store:", createError);
          throw new Error("Failed to create or access vector store");
        }
      }

      // Add file to vector store
      await axios.post(
        `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
        {
          file_id: openAIFileResponse.data.id,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );

      // Save file info to backend database instead of Firestore
      const fileData = {
        name: file.name,
        url: downloadURL,
        vectorStoreId: vectorStoreId,
        openAIFileId: openAIFileResponse.data.id,
        companyId: companyId,
        createdBy: userEmail,
      };

      const saveFileResponse = await fetch(`${apiUrl}/api/assistant-files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(fileData),
      });

      if (!saveFileResponse.ok) {
        throw new Error("Failed to save file info to database");
      }

      const savedFile = await saveFileResponse.json();

      const newFile = {
        id: savedFile.id || `file-${Date.now()}`,
        name: file.name,
        url: downloadURL,
        vectorStoreId: vectorStoreId,
      };
      setFiles((prevFiles) => [...prevFiles, newFile]);

      // Update the assistant with the new vector store
      await updateAssistantInfo();

      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const updateAssistantWithFile = async (file: {
    id: string;
    name: string;
    url: string;
  }) => {
    try {
      const updatedFiles = [...(assistantInfo.metadata?.files || []), file];
      await updateAssistantMetadata(updatedFiles);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error updating assistant with file:",
          error.response?.data
        );
        toast.error(
          `Failed to update assistant with file: ${
            error.response?.data?.error?.message || "Unknown error"
          }`
        );
      } else {
        console.error("Error updating assistant with file:", error);
        toast.error("Failed to update assistant with file: Unknown error");
      }
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!companyId) return;

    const baseUrl = "https://juta-dev.ngrok.dev";

    try {
      // Get user email for API calls
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("No user email found");
      }

      // Get company API URL
      const response = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(userEmail)}`,
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
      const apiUrl = data.companyData.api_url || baseUrl;

      // Delete file from backend
      const deleteResponse = await fetch(`${apiUrl}/api/assistant-files/${fileId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!deleteResponse.ok) {
        throw new Error("Failed to delete file from backend");
      }

      // Remove file from local state
      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));

      // Update assistant metadata to remove the file
      const updatedFiles =
        assistantInfo.metadata?.files.filter((file) => file.id !== fileId) ||
        [];
      await updateAssistantMetadata(updatedFiles);

      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const updateAssistantMetadata = async (
    updatedFiles: Array<{ id: string; name: string; url: string }>
  ) => {
    try {
      const response = await axios.post(
        `https://api.openai.com/v1/assistants/${assistantId}`,
        {
          metadata: {
            ...assistantInfo.metadata,
            files: JSON.stringify(updatedFiles),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );

      // Update local state
      setAssistantInfo((prevInfo) => ({
        ...prevInfo,
        metadata: {
          ...prevInfo.metadata,
          files: updatedFiles,
        },
      }));

      toast.success("Assistant metadata updated successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error updating assistant metadata:",
          error.response?.data
        );
        toast.error(
          `Failed to update assistant metadata: ${
            error.response?.data?.error?.message || "Unknown error"
          }`
        );
      } else {
        console.error("Error updating assistant metadata:", error);
        toast.error("Failed to update assistant metadata: Unknown error");
      }
    }
  };
  const handleAssistantChange = (assistantId: string) => {
    setSelectedAssistant(assistantId);
    setAssistantId(assistantId);
    setMessages([]); // Clear messages when switching assistants
    
    // Only fetch assistant info if we have valid data
    if (assistantId && apiKey && assistantId.trim() && apiKey.trim() && assistantId.startsWith('asst_')) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  };

  // Only show the assistant selector if there are multiple assistants
  const renderAssistantSelector = () => {
    if (assistants.length <= 1) return null;

    return (
      <div className="w-full mb-4">
        <select
          value={selectedAssistant}
          onChange={(e) => handleAssistantChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
        >
          {assistants.map((assistant) => (
            <option key={assistant.id} value={assistant.id}>
              {assistant.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const fetchTemplates = async () => {
    if (!companyId) return;

    try {
      // Fetch templates from your SQL backend
      const response = await axios.get(
        `https://juta-dev.ngrok.dev/api/instruction-templates?companyId=${encodeURIComponent(
          companyId
        )}`
      );
      if (response.status === 200 && Array.isArray(response.data.templates)) {
        setTemplates(response.data.templates);
      } else {
        toast.error("Failed to fetch templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    }
  };

  const saveTemplate = async () => {
    if (!companyId || !assistantInfo.instructions.trim()) {
      toast.error("Please provide instructions to save");
      return;
    }

    try {
      const timestamp = new Date().toLocaleString(); // Format: M/D/YYYY, H:MM:SS AM/PM

      // Send to your SQL backend
      const response = await axios.post(
        "https://juta-dev.ngrok.dev/api/instruction-templates",
        {
          companyId,
          name: timestamp,
          instructions: assistantInfo.instructions,
        }
      );

      if (response.data.success) {
        toast.success("Template saved successfully");
        fetchTemplates(); // Refresh templates list
      } else {
        toast.error("Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  const loadTemplate = (template: InstructionTemplate) => {
    setAssistantInfo((prev) => ({
      ...prev,
      instructions: template.instructions,
    }));
    toast.success("Template loaded");
  };

  const deleteTemplate = async (templateId: string) => {
    if (!companyId) return;

    try {
      // Delete template from backend
      const response = await axios.delete(
        `https://juta-dev.ngrok.dev/api/instruction-templates/${templateId}`
      );

      if (response.data.success) {
        toast.success("Template deleted successfully");
        fetchTemplates(); // Refresh templates list
      } else {
        throw new Error("Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const renderTemplateSection = () => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          <button
            onClick={saveTemplate}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
            disabled={userRole === "3"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
            </svg>
            Save Current
          </button>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            View Saved Versions
          </button>
        </div>
      </div>

      <Transition appear show={isTemplateModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsTemplateModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4"
                  >
                    Saved Templates
                  </Dialog.Title>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {templates.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No templates saved yet
                      </p>
                    ) : (
                      templates.map((template) => (
                        <div
                          key={template.id}
                          className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {template.name}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  loadTemplate(template);
                                  setIsTemplateModalOpen(false);
                                }}
                                className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 text-sm flex items-center gap-1"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                                </svg>
                                Load
                              </button>
                              <button
                                onClick={() => deleteTemplate(template.id)}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm flex items-center gap-1"
                                disabled={userRole === "3"}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {template.instructions}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                      onClick={() => setIsTemplateModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );

  const fetchAiSettings = async () => {
    if (!companyId) return;

    try {
      const response = await axios.get(
        `https://juta-dev.ngrok.dev/api/ai-settings?companyId=${encodeURIComponent(companyId)}`
      );
      if (response.status === 200 && response.data.settings) {
        setAiAutoResponse(response.data.settings.autoResponse ?? false);
        setAiDelay(response.data.settings.aiDelay ?? 0);
      } else {
        toast.error("Failed to fetch AI settings");
      }
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      toast.error("Failed to fetch AI settings");
    }
  };

  const handleSaveAiSettings = async () => {
    if (!companyId) return;

    try {
      const response = await axios.put(
        "https://juta-dev.ngrok.dev/api/ai-settings",
        {
          companyId,
          settings: {
            autoResponse: aiAutoResponse,
            aiDelay: aiDelay,
          },
        }
      );
      if (response.data.success) {
        toast.success("AI settings saved successfully");
      } else {
        toast.error("Failed to save AI settings");
      }
    } catch (error) {
      console.error("Error saving AI settings:", error);
      toast.error("Failed to save AI settings");
    }
  };

  const enterFullscreenMode = () => {
    if (companyId) {
      navigate(`/inbox/fullscreen-chat/${companyId}`);
    }
  };

  const exitFullscreenMode = () => {
    navigate('/inbox');
  };

  // If in fullscreen mode, show only the chat interface
  if (isFullscreenMode) {
    return (
      <div className="flex flex-col w-full h-screen bg-white dark:bg-gray-900">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
          <div className="flex items-center">
            <div className="w-10 h-10 overflow-hidden rounded-full shadow-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center text-white mr-3">
              <span className="text-xl capitalize">
                {assistantInfo.name.charAt(0)}
              </span>
            </div>
            <div>
              <div className="font-semibold text-xl text-gray-800 dark:text-gray-200 capitalize">
                {assistantInfo.name}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Fullscreen Chat
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exitFullscreenMode}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Exit Fullscreen
            </button>
          </div>
        </div>

        {/* Fullscreen Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 dark:bg-gray-900">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <div className="text-2xl mb-2">👋</div>
                <div className="text-lg mb-2">Welcome to {assistantInfo.name}</div>
                <div className="text-sm">Start a conversation by typing a message below</div>
              </div>
            </div>
          ) : (
            messages
              .slice()
              .reverse()
              .map((message, index) => (
                <div key={index}>
                  {message.text.split("||")
                    .filter(splitText => splitText.trim() !== "")
                    .map((splitText, splitIndex) => (
                    <div
                      key={`${index}-${splitIndex}`}
                      className={`p-3 mb-3 rounded-lg ${
                        message.from_me ? myMessageClass : otherMessageClass
                      }`}
                      style={{
                        maxWidth: "70%",
                        width: `${
                          message.type === "image" || message.type === "document"
                            ? "350"
                            : Math.min((splitText.trim().length || 0) * 10, 350)
                        }px`,
                        minWidth: "75px",
                      }}
                    >
                      {message.type === "text" && (
                        <div className="whitespace-pre-wrap break-words">
                          {splitText.trim()}
                        </div>
                      )}
                      {message.type === "image" && message.imageUrls && (
                        <div className="space-y-2">
                          {message.imageUrls.map((imageUrl, imgIndex) => (
                            <div key={imgIndex} className="relative">
                              <img
                                src={imageUrl}
                                alt={`AI Response Image ${imgIndex + 1}`}
                                className="max-w-full h-auto rounded-lg cursor-pointer"
                                style={{ maxHeight: "300px" }}
                                onClick={() => {
                                  // Open image in new tab or modal if needed
                                  window.open(imageUrl, '_blank');
                                }}
                              />
                              {message.caption && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {message.caption}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {message.type === "document" && message.documentUrls && (
                        <div className="space-y-2">
                          {message.documentUrls.map((documentUrl, docIndex) => (
                            <div key={docIndex} className="relative">
                              <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                                <svg className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {documentUrl.split('/').pop()?.split('?')[0] || `Document ${docIndex + 1}`}
                                  </p>
                                  {message.caption && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {message.caption}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => openPDFModal(documentUrl, documentUrl.split('/').pop()?.split('?')[0] || `Document ${docIndex + 1}`)}
                                  className="px-3 py-1 text-xs bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                                >
                                  View
                                </button>
                              </div>
                              
                              {/* Document Content Preview */}
                              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                {documentUrl.toLowerCase().includes('.pdf') ? (
                                  <iframe
                                    src={documentUrl}
                                    width="100%"
                                    height="400"
                                    title={`Document ${docIndex + 1}`}
                                    className="border-0"
                                    style={{ minHeight: '400px' }}
                                  />
                                ) : documentUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <img
                                    src={documentUrl}
                                    alt={`Document ${docIndex + 1}`}
                                    className="w-full h-auto max-h-96 object-contain"
                                  />
                                ) : (
                                  <div className="p-4 text-center">
                                    <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                      Document preview not available
                                    </p>
                                    <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                                      Click Download to view this document
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              ))
          )}
        </div>

        {/* Fullscreen Message Input */}
        <div className="p-4 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <textarea
              className="flex-1 h-12 px-4 py-3 text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Type a message..."
              value={fullscreenNewMessage}
              onChange={(e) => setFullscreenNewMessage(e.target.value)}
              onKeyDown={handleFullscreenSendMessage}
              rows={1}
            />
            <button
              onClick={handleFullscreenSendClick}
              className="px-6 py-3 bg-green-500 dark:bg-green-600 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              Send
            </button>
          </div>
        </div>

        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}

        <ToastContainer />
        
        {/* PDF Modal */}
        <PDFModal
          isOpen={pdfModal.isOpen}
          onClose={closePDFModal}
          documentUrl={pdfModal.documentUrl}
          documentName={pdfModal.documentName}
        />
      </div>
    );
  }

  return (
    <div className="flex justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className={`w-full ${isWideScreen ? "max-w-7xl flex" : "max-w-lg"}`}>
        {isWideScreen ? (
          <>
            <div className="w-1/2 pl-2 pr-2 ml-2 mr-2 mt-4 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-4">
                    <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
                    <div className="mt-2 text-xs p-2 dark:text-gray-200">
                      Fetching Assistant...
                    </div>
                    <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    {assistants.length > 1 ? (
                      <select
                        value={selectedAssistant}
                        onChange={(e) => handleAssistantChange(e.target.value)}
                        className="w-full p-2 text-2xl font-bold border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {assistants.map((assistant) => (
                          <option key={assistant.id} value={assistant.id}>
                            {assistant.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <h1 className="text-2xl font-bold dark:text-gray-200">
                        {assistantInfo.name || "Assistant Name"}
                      </h1>
                    )}
                  </div>
                                      <div className="mb-4">
                      <label
                        className="mb-2 text-lg font-medium capitalize dark:text-gray-200"
                        htmlFor="name"
                      >
                        Name
                      </label>
                      <div className="relative">
                        <input
                          id="name"
                          name="name"
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                          placeholder="Name your assistant"
                          value={assistantInfo.name}
                          onChange={handleInputChange}
                          onFocus={handleFocus}
                          disabled={userRole === "3"}
                        />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label
                      className="mb-2 text-lg font-medium dark:text-gray-200"
                      htmlFor="instructions"
                    >
                      Instructions
                    </label>
                    <div className="relative">
                      <textarea
                        id="instructions"
                        name="instructions"
                        className="w-full p-4 border border-gray-300 rounded-xl h-[600px] text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono shadow-sm"
                        placeholder="Tell your assistant what to do"
                        value={assistantInfo.instructions}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        rows={35}
                        disabled={userRole === "3"}
                      />
                      <button
                        onClick={() => {
                          console.log("Opening fullscreen modal");
                          setIsFullscreenModalOpen(true);
                        }}
                        className="absolute top-2 right-2 px-3 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                        title="Edit in fullscreen"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                      </button>
                      
                      {/* Template Buttons - Positioned at bottom left inside textarea */}
                      <div className="absolute bottom-2 left-2 flex gap-2">
                        <button
                          onClick={saveTemplate}
                          className="px-3 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                          disabled={userRole === "3"}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                          </svg>
                          Save Current
                        </button>
                        <button
                          onClick={() => setIsTemplateModalOpen(true)}
                          className="px-3 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          View Saved Versions
                        </button>
                      </div>
                      
                      {/* Update Assistant Button - Positioned at bottom inside textarea */}
                      <button
                        ref={updateButtonRef}
                        onClick={updateAssistantInfo}
                        className={`absolute bottom-2 right-2 px-4 py-2 ${isSaving ? 'bg-green-600 dark:bg-green-700' : 'bg-green-500 dark:bg-green-600'} text-white border-2 border-green-600 dark:border-green-500 rounded-lg hover:bg-green-600 dark:hover:bg-green-700 hover:border-green-700 dark:hover:border-green-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 ${
                          userRole === "3"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      >
                          {isSaving ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          )}
                        {isSaving ? 'Saving...' : 'Save Instructions'}
                      </button>
                    </div>
                  </div>







                                      <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800 shadow-sm">
                    <div className="space-y-4">
                          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">
                              Response Delay (seconds)
                          </h3>

                          <div>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              value={aiDelay}
                              onChange={(e) =>
                                setAiDelay(Number(e.target.value))
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                              disabled={userRole === "3"}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Set how long the AI should wait before responding
                              (0-300 seconds)
                            </p>
                          </div>

                          <div>
                            <button
                              onClick={handleSaveAiSettings}
                              className="px-4 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                              disabled={userRole === "3"}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Save Response Delay
                            </button>
                          </div>
                        </div>
                  </div>

                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label
                      className="mb-3 text-lg font-medium dark:text-gray-200 flex items-center gap-2"
                      htmlFor="file-upload"
                    >
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L7.293 9.293z" clipRule="evenodd" />
                      </svg>
                      Knowledge Base
                    </label>
                    <div className="relative">
                      <input
                        id="file-upload"
                        type="file"
                        onChange={handleFileUpload}
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={uploading || userRole === "3"}
                      />
                      {uploading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-700/80 rounded-lg flex items-center justify-center">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm font-medium">Uploading...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="space-y-2">
                      {(files || []).map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors font-medium"
                            >
                              {file.name}
                            </a>
                          </div>
                          <button
                            onClick={() => deleteFile(file.id)}
                            className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                      {files.length === 0 && (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm">No files uploaded yet</p>
                          <p className="text-xs mt-1">Upload files to enhance your assistant's knowledge</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && <div className="mt-4 text-red-500">{error}</div>}
                </>
              )}
            </div>
            <div className="w-3/5 pr-2">
              <MessageList
                messages={messages}
                onSendMessage={sendMessageToAssistant}
                assistantName={assistantInfo?.name}
                deleteThread={deleteThread}
                threadId={threadId}
                enterFullscreenMode={enterFullscreenMode}
                openPDFModal={openPDFModal}
                companyId={companyId}
              />
            </div>
          </>
        ) : (
          <Tab.Group as="div" className="flex flex-col w-full h-full">
            <Tab.List className="flex bg-gray-100 dark:bg-gray-900 p-2 sticky top-0 z-10">
              <Tab
                className={({ selected }) =>
                  `w-1/2 py-2 text-sm font-medium text-center rounded-lg ${
                    selected
                      ? "bg-white text-green-600 dark:bg-gray-800 dark:text-green-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  } transition-colors duration-200`
                }
              >
                Assistant Config
              </Tab>
              <Tab
                className={({ selected }) =>
                  `w-1/2 py-2 text-sm font-medium text-center rounded-lg ${
                    selected
                      ? "bg-white text-green-600 dark:bg-gray-800 dark:text-green-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
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
                      <img
                        alt="Logo"
                        className="w-24 h-24 p-15"
                        src={logoUrl}
                      />
                      <div className="mt-2 text-xs p-15 dark:text-gray-200">
                        Fetching Assistant...
                      </div>
                      <LoadingIcon
                        icon="three-dots"
                        className="w-20 h-20 p-4"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label
                        className="mb-2 text-lg font-medium capitalize dark:text-gray-200"
                        htmlFor="name"
                      >
                        Name
                      </label>
                                              <input
                          id="name"
                          name="name"
                          type="text"
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                          placeholder="Name your assistant"
                          value={assistantInfo.name}
                          onChange={handleInputChange}
                          onFocus={handleFocus}
                          disabled={userRole === "3"}
                        />
                    </div>
                    <div className="mb-4">
                      <label
                        className="mb-2 text-lg font-medium dark:text-gray-200"
                        htmlFor="description"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                                                    className="w-full p-3 border border-gray-300 rounded-lg h-24 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Add a short description of what this assistant does"
                        value={assistantInfo.description}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      />
                    </div>
                    <div className="mb-4">
                      <label
                        className="mb-2 text-lg font-medium dark:text-gray-200"
                        htmlFor="instructions"
                      >
                        Instructions
                      </label>
                      <div className="relative">
                        <textarea
                          id="instructions"
                          name="instructions"
                          className="w-full p-3 border border-gray-300 rounded-lg h-[600px] text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Tell your assistant what to do"
                          value={assistantInfo.instructions}
                          onChange={handleInputChange}
                          onFocus={handleFocus}
                          rows={35}
                          disabled={userRole === "3"}
                        />
                        <button
                          onClick={() => {
                            console.log("Opening fullscreen modal");
                            setIsFullscreenModalOpen(true);
                          }}
                          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Edit in fullscreen"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                          </svg>
                        </button>
                        
                        {/* Template Buttons - Positioned at bottom left inside textarea */}
                        <div className="absolute bottom-2 left-2 flex gap-2">
                          <button
                            onClick={saveTemplate}
                            className="px-3 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                            disabled={userRole === "3"}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                            </svg>
                            Save Current
                          </button>
                          <button
                            onClick={() => setIsTemplateModalOpen(true)}
                            className="px-3 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            View Templates
                          </button>
                        </div>
                        
                        {/* Update Assistant Button - Positioned at bottom inside textarea */}
                        <button
                          ref={updateButtonRef}
                          onClick={updateAssistantInfo}
                          className={`absolute bottom-2 right-2 px-4 py-2 ${isSaving ? 'bg-green-600 dark:bg-green-700' : 'bg-green-500 dark:bg-green-600'} text-white border-2 border-green-600 dark:border-green-500 rounded-lg hover:bg-green-600 dark:hover:bg-green-700 hover:border-green-700 dark:hover:border-green-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 ${
                            userRole === "3"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          onFocus={handleFocus}
                          disabled={userRole === "3"}
                        >
                                                        {isSaving ? (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            )}
                          {isSaving ? 'Saving...' : 'Save Instructions'}
                        </button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label
                        className="mb-2 text-lg font-medium dark:text-gray-200"
                        htmlFor="file-upload"
                      >
                        Knowledge Base
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        onChange={handleFileUpload}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        disabled={uploading}
                      />
                      {uploading && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Uploading...
                        </p>
                      )}
                    </div>
                    <div className="mb-4">
                      <ul className="list-disc list-inside">
                        {files.map((file) => (
                          <li
                            key={file.id}
                            className="text-sm text-green-500 flex items-center justify-between"
                          >
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {file.name}
                            </a>
                            <button
                              onClick={() => deleteFile(file.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>





                    {/* Response Delay Setting for mobile */}
                    <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800 shadow-sm">
                      <div className="space-y-4">
                        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">
                          Response Delay
                        </h3>

                        <div>
                          <label className="block mb-2 text-gray-700 dark:text-gray-300">
                            Response Delay (seconds)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={aiDelay}
                            onChange={(e) => setAiDelay(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={userRole === "3"}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Set how long the AI should wait before responding
                            (0-300 seconds)
                          </p>
                        </div>

                        <div>
                          <button
                            onClick={handleSaveAiSettings}
                            className="px-4 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                            disabled={userRole === "3"}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Save AI Settings
                          </button>
                        </div>
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
                  assistantName={assistantInfo?.name || "Juta Assistant"}
                  deleteThread={deleteThread}
                  threadId={threadId}
                  enterFullscreenMode={enterFullscreenMode}
                  openPDFModal={openPDFModal}
                  companyId={companyId}
                />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        )}
        <ToastContainer />
        
        {/* PDF Modal */}
        <PDFModal
          isOpen={pdfModal.isOpen}
          onClose={closePDFModal}
          documentUrl={pdfModal.documentUrl}
          documentName={pdfModal.documentName}
        />
      </div>

      {/* Fullscreen Modal */}
      <Transition appear show={isFullscreenModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsFullscreenModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-screen h-screen transform overflow-hidden bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
                    >
                      Edit Instructions
                    </Dialog.Title>
                    <button
                      onClick={() => setIsFullscreenModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="relative w-full h-[calc(100vh-180px)]">
                    <textarea
                      className="w-full h-full p-4 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                      value={assistantInfo.instructions}
                      onChange={handleInputChange}
                      name="instructions"
                      placeholder="Tell your assistant what to do"
                      disabled={userRole === "3"}
                    />
                    
                    {/* Template Buttons - Positioned at bottom left inside textarea */}
                    <div className="absolute bottom-2 left-2 flex gap-2">
                      <button
                        onClick={saveTemplate}
                        className="px-3 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                        disabled={userRole === "3"}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                        </svg>
                        Save Current
                      </button>
                      <button
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="px-3 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        View Saved Versions
                      </button>
                    </div>
                    
                    {/* Save Instructions Button - Positioned at bottom right inside textarea */}
                    <button
                      onClick={updateAssistantInfo}
                      className={`absolute bottom-2 right-2 px-4 py-2 ${isSaving ? 'bg-green-600 dark:bg-green-700' : 'bg-green-500 dark:bg-green-600'} text-white border-2 border-green-600 dark:border-green-500 rounded-lg hover:bg-green-600 dark:hover:bg-green-700 hover:border-green-700 dark:hover:border-green-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 ${
                        userRole === "3"
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={userRole === "3"}
                    >
                      {isSaving ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {isSaving ? 'Saving...' : 'Save Instructions'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default Main;