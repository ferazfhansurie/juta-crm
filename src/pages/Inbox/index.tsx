import { useRef, useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";

import { initializeApp } from "firebase/app";
import { updateDoc, getDoc } from "firebase/firestore";
import { getFirestore, doc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Tab } from "@headlessui/react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { json } from "stream/consumers";

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
  threadId: string;
  enterFullscreenMode: () => void;
  openPDFModal: (documentUrl: string, documentName?: string) => void;
  companyId: string | null;
  isAiThinking: boolean;
  // Thread management props
  onCreateNewThread: () => void;
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

const PDFModal: React.FC<PDFModalProps> = ({
  isOpen,
  onClose,
  documentUrl,
  documentName,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full md:w-[800px] h-auto md:h-[600px] p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Document Preview
          </h2>
          <button
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
        <div
          className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-3 flex justify-center items-center"
          style={{ height: "90%" }}
        >
          {documentUrl.toLowerCase().includes(".pdf") ? (
            <iframe
              src={documentUrl}
              width="100%"
              height="100%"
              title="PDF Document"
              className="border rounded"
            />
          ) : (
            <div className="text-center">
              <svg
                className="w-16 h-16 mb-1.5 mx-auto text-gray-600 dark:text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm">
                {documentName || "Document"}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-1.5 text-xs">
                Click Download to view this document
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-center">
          <button
            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
            onClick={() => window.open(documentUrl, "_blank")}
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
  isAiThinking,
  onCreateNewThread,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const myMessageClass =
    "flex flex-col max-w-xs lg:max-w-md px-4 py-2 mx-2 mb-3 bg-blue-500 text-white rounded-2xl rounded-br-md shadow-sm self-end ml-auto text-left";
  const otherMessageClass =
    "flex flex-col max-w-xs lg:max-w-md px-4 py-2 mx-2 mb-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md shadow-sm border border-gray-200 dark:border-gray-700 self-start text-left";

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking]);

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
    <div className="flex flex-col w-full h-full backdrop-blur-3xl bg-gradient-to-br from-white/30 via-white/20 to-white/10 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/40 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/40 dark:border-slate-600/30 relative overflow-hidden group">
      <div className="flex items-center justify-between p-4 border-b border-white/30 dark:border-slate-600/40 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/40 to-white/20 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/40 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-lg rounded-xl border border-white/30 dark:border-slate-600/40 shadow-lg">
            <svg
              className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 backdrop-blur-lg text-indigo-900 dark:text-indigo-100 rounded-xl shadow-lg font-semibold text-sm capitalize border border-white/30 dark:border-slate-600/40">
            {assistantName}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* New Chat Button - Enhanced glassmorphism design */}
          <button
            onClick={onCreateNewThread}
            className="group relative px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-600/20 backdrop-blur-lg text-emerald-700 dark:text-emerald-300 border border-emerald-200/40 dark:border-emerald-400/30 rounded-xl hover:from-emerald-500/30 hover:to-teal-600/30 hover:border-emerald-300/60 dark:hover:border-emerald-400/50 active:scale-95 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 text-sm font-medium"
          >
            <svg
              className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 backdrop-blur-2xl bg-gradient-to-br from-white/20 via-white/10 to-white/5 dark:from-slate-800/40 dark:via-slate-800/20 dark:to-slate-900/60 relative scrollbar-thin scrollbar-thumb-slate-300/50 dark:scrollbar-thumb-slate-600/50 scrollbar-track-transparent"
      >
        {/* Tool Buttons - Positioned at top of chat area */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/20 dark:border-slate-600/30"></div>

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mb-4 p-3 bg-gradient-to-r from-emerald-500/20 to-teal-600/20 backdrop-blur-lg border border-emerald-200/40 dark:border-emerald-400/30 rounded-2xl shadow-lg inline-block">
                <svg
                  className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/20 to-teal-600/20 backdrop-blur-lg text-emerald-900 dark:text-emerald-100 rounded-2xl shadow-lg font-semibold text-lg border border-emerald-200/40 dark:border-emerald-400/30">
                Chat With {assistantName}...
              </div>
              <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm">
                Start a conversation with your AI assistant
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages
              .slice()
              .reverse()
              .map((message, index) => (
                <div key={index}>
                  {message.text
                    .split("||")
                    .filter((splitText) => splitText.trim() !== "")
                    .map((splitText, splitIndex) => (
                      <div
                        key={`${index}-${splitIndex}`}
                        className={`flex ${
                          message.from_me ? "justify-end" : "justify-start"
                        } animate-fadeIn`}
                      >
                        <div
                          className={
                            message.from_me ? myMessageClass : otherMessageClass
                          }
                        >
                          {message.type === "text" && (
                            <div className="whitespace-pre-wrap break-words">
                              {splitText.trim()}
                            </div>
                          )}
                          {message.type === "image" && message.imageUrls && (
                            <div className="space-y-1.5">
                              {message.imageUrls.map((imageUrl, imgIndex) => (
                                <div key={imgIndex} className="relative">
                                  <img
                                    src={imageUrl}
                                    alt={`AI Response Image ${imgIndex + 1}`}
                                    className="max-w-full h-auto rounded-lg cursor-pointer"
                                    style={{ maxHeight: "300px" }}
                                    onClick={() => {
                                      // Open image in new tab or modal if needed
                                      window.open(imageUrl, "_blank");
                                    }}
                                  />
                                  {message.caption && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {message.caption}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {message.type === "document" &&
                            message.documentUrls && (
                              <div className="space-y-1.5">
                                {message.documentUrls.map(
                                  (documentUrl, docIndex) => (
                                    <div key={docIndex} className="relative">
                                      {/* Document Header */}
                                      <div className="flex items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 mb-1.5">
                                        <svg
                                          className="w-6 h-6 text-gray-500 dark:text-gray-400 mr-2"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {documentUrl
                                              .split("/")
                                              .pop()
                                              ?.split("?")[0] ||
                                              `Document ${docIndex + 1}`}
                                          </p>
                                          {message.caption && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              {message.caption}
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={() =>
                                            openPDFModal(
                                              documentUrl,
                                              documentUrl
                                                .split("/")
                                                .pop()
                                                ?.split("?")[0] ||
                                                `Document ${docIndex + 1}`
                                            )
                                          }
                                          className="px-2 py-0.5 text-xs bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                                        >
                                          View
                                        </button>
                                      </div>

                                      {/* Document Content Preview */}
                                      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                        {documentUrl
                                          .toLowerCase()
                                          .includes(".pdf") ? (
                                          <iframe
                                            src={documentUrl}
                                            width="100%"
                                            height="400"
                                            title={`Document ${docIndex + 1}`}
                                            className="border-0"
                                            style={{ minHeight: "400px" }}
                                          />
                                        ) : documentUrl
                                            .toLowerCase()
                                            .match(
                                              /\.(jpg|jpeg|png|gif|webp)$/i
                                            ) ? (
                                          <img
                                            src={documentUrl}
                                            alt={`Document ${docIndex + 1}`}
                                            className="w-full h-auto max-h-96 object-contain"
                                          />
                                        ) : (
                                          <div className="p-4 text-center">
                                            <svg
                                              className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-2"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M4 4a2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                              Document preview not available
                                            </p>
                                            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                                              Click Download to view this
                                              document
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          {splitIndex ===
                            message.text
                              .split("||")
                              .filter((splitText) => splitText.trim() !== "")
                              .length -
                              1 && (
                            <div
                              className={`text-xs text-gray-400 dark:text-gray-500 mt-1 ${
                                message.from_me ? "text-right" : "text-left"
                              } flex items-center gap-1 ${
                                message.from_me
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                              {message.from_me && (
                                <svg
                                  className="w-3 h-3 text-blue-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
          </>
        )}

        {/* AI Thinking Indicator - Enhanced Glassmorphism Style */}
        {isAiThinking && (
          <div className="flex justify-start mb-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-slate-100/80 to-slate-200/60 dark:from-slate-800/80 dark:to-slate-700/60 backdrop-blur-xl rounded-3xl rounded-bl-lg px-6 py-4 max-w-xs shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-slate-600/40">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1.5">
                  <div
                    className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-300 dark:to-purple-400 rounded-full animate-pulse shadow-lg"
                    style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-300 dark:to-purple-400 rounded-full animate-pulse shadow-lg"
                    style={{
                      animationDelay: "0.2s",
                      animationDuration: "1.4s",
                    }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-300 dark:to-purple-400 rounded-full animate-pulse shadow-lg"
                    style={{
                      animationDelay: "0.4s",
                      animationDuration: "1.4s",
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Invisible div for auto-scroll target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Action Buttons - Positioned inside chatbox */}
      <div className="absolute bottom-24 right-6 flex flex-col gap-3 z-10">
        {/* Guest Chat Button */}
        <a
          href={`https://web.jutateknologi.com/guest-chat/${companyId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <button
            className="group relative p-4 bg-gradient-to-r from-indigo-500/80 to-purple-600/80 backdrop-blur-lg text-white rounded-2xl hover:from-indigo-600/90 hover:to-purple-700/90 active:scale-95 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-white/20 dark:border-slate-600/30"
            title="Open Guest Chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 group-hover:scale-110 transition-transform duration-200"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </a>

        {/* Fullscreen Button */}
        <button
          onClick={enterFullscreenMode}
          className="group relative p-4 bg-gradient-to-r from-emerald-500/80 to-teal-600/80 backdrop-blur-lg text-white rounded-2xl hover:from-emerald-600/90 hover:to-teal-700/90 active:scale-95 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-white/20 dark:border-slate-600/30"
          title="Open in fullscreen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 group-hover:scale-110 transition-transform duration-200"
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
      </div>

      <div className="p-6 border-t border-white/30 dark:border-slate-700/40 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/40 to-white/20 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/40">
        <div className="flex items-end gap-4">
          <div className="flex-1 relative">
            <textarea
              className="w-full min-h-[48px] max-h-32 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-white/40 dark:border-slate-600/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/60 dark:focus:border-indigo-400/60 resize-none transition-all duration-300 shadow-lg placeholder-slate-500 dark:placeholder-slate-400"
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleSendMessage}
            />
          </div>
          <button
            onClick={() => onSendMessage(newMessage)}
            disabled={!newMessage.trim()}
            className="group relative px-6 py-3 bg-gradient-to-r from-indigo-500/80 to-purple-600/80 backdrop-blur-lg text-white rounded-2xl hover:from-indigo-600/90 hover:to-purple-700/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 dark:border-slate-600/30"
          >
            <span className="relative z-10 flex items-center space-x-2 font-medium text-sm">
              <span>Send</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </span>
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
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Thread management state
  const [editingThreadName, setEditingThreadName] = useState<string | null>(
    null
  );
  const [editingThreadNameValue, setEditingThreadNameValue] =
    useState<string>("");

  // AI Tools Modal state
  const [isAiToolsModalOpen, setIsAiToolsModalOpen] = useState(false);
  const [selectedToolCategory, setSelectedToolCategory] = useState<string>("");
  const [showAiToolsDropdown, setShowAiToolsDropdown] = useState(false);
  const [showAiToolsSection, setShowAiToolsSection] = useState(false);

  // Fullscreen mode state
  const location = useLocation();
  const navigate = useNavigate();
  const isFullscreenMode = location.pathname.includes("/fullscreen-chat/");
  const fullscreenCompanyId = location.pathname.match(
    /\/fullscreen-chat\/([^\/]+)/
  )?.[1];

  // AI Tools data
  const aiToolsData = {
    calendar: {
      title: "Calendar & Reminder Functions",
      description:
        "Tools for managing calendar events, appointments, and scheduling",
      examples: [
        {
          name: "checkAvailableTimeSlots",
          description: "Checks available appointment slots",
          example:
            "use 'checkAvailableTimeSlots' function to check available time slots for January 15th between 9 AM and 7 PM",
        },
        {
          name: "createCalendarEvent",
          description: "Creates calendar events/appointments",
          example:
            "use 'createCalendarEvent' function to create a calendar event for an appointment with John Doe on January 15th from 10 AM to 11 AM for a consultation",
        },
        {
          name: "rescheduleCalendarEvent",
          description: "Reschedules existing events",
          example:
            "use 'rescheduleCalendarEvent' function to reschedule event_123 to January 16th from 2 PM to 3 PM",
        },
        {
          name: "cancelCalendarEvent",
          description: "Cancels events",
          example: "use 'cancelCalendarEvent' function to cancel event_123",
        },
        {
          name: "searchUpcomingAppointments",
          description: "Searches for upcoming appointments",
          example:
            "use 'searchUpcomingAppointments' function to search for upcoming appointments between January 15th and January 31st",
        },
        {
          name: "sendRescheduleRequest",
          description: "Sends reschedule requests",
          example:
            "use 'sendRescheduleRequest' function to send a reschedule request for event_123 to January 17th at 3 PM",
        },
      ],
    },
    contact: {
      title: "Contact Management Functions",
      description: "Tools for managing contacts, tags, and contact data",
      examples: [
        {
          name: "tagContact",
          description: "Tags a contact",
          example:
            "use 'tagContact' function to tag contact_123 as 'VIP' with the description 'High Priority Client'",
        },
        {
          name: "manageContactTags",
          description: "Adds/removes tags from contacts",
          example:
            "use 'manageContactTags' function to add the 'Prospect' tag to contact_123",
        },
        {
          name: "listContactsWithTag",
          description: "Lists contacts with specific tags",
          example:
            "use 'listContactsWithTag' function to list all contacts with the 'VIP' tag, showing up to 20 results",
        },
        {
          name: "searchContacts",
          description: "Searches for contacts",
          example:
            "use 'searchContacts' function to search for contacts with the name 'John Doe'",
        },
        {
          name: "listContacts",
          description: "Lists contacts with pagination",
          example:
            "use 'listContacts' function to list contacts with pagination, showing 20 results starting from the beginning, sorted by creation date in descending order",
        },
        {
          name: "fetchContactData",
          description: "Gets contact data",
          example:
            "use 'fetchContactData' function to fetch the complete data for contact_123",
        },
        {
          name: "fetchMultipleContactsData",
          description: "Gets data for multiple contacts",
          example:
            "use 'fetchMultipleContactsData' function to fetch data for multiple contacts including contact_123 and contact_456",
        },
        {
          name: "listAssignedContacts",
          description: "Lists contacts assigned to specific person",
          example:
            "use 'listAssignedContacts' function to list all contacts assigned to john.doe@company.com",
        },
        {
          name: "getContactsAddedToday",
          description: "Gets contacts created today",
          example:
            "use 'getContactsAddedToday' function to get all contacts that were added today",
        },
        {
          name: "getTotalContacts",
          description: "Gets total contact count",
          example:
            "use 'getTotalContacts' function to get the total count of all contacts",
        },
      ],
    },
    database: {
      title: "Database & Custom Fields Functions",
      description: "Tools for managing custom fields and database operations",
      examples: [
        {
          name: "updateCustomFields",
          description: "Updates custom fields for contacts",
          example:
            "use 'updateCustomFields' function to update the custom fields for contact_123 to set industry as 'Technology' and company_size as '50-100'",
        },
        {
          name: "getCustomFields",
          description: "Retrieves custom fields for contacts",
          example:
            "use 'getCustomFields' function to retrieve all custom fields for contact_123",
        },
      ],
    },
    followUps: {
      title: "Follow-Up Management Functions",
      description:
        "Tools for creating, managing, and automating follow-up templates and sequences",
      examples: [
        {
          name: "createFollowUpTemplate",
          description: "Creates new follow-up email templates",
          example:
            "use 'createFollowUpTemplate' function to create a follow-up template for lead nurturing with the subject 'Following up on your interest' and personalized content",
        },
        {
          name: "editFollowUpTemplate",
          description: "Edits existing follow-up templates",
          example:
            "use 'editFollowUpTemplate' function to edit template_456 to update the subject line and add more personalization tokens",
        },
        {
          name: "deleteFollowUpTemplate",
          description: "Deletes follow-up templates",
          example:
            "use 'deleteFollowUpTemplate' function to delete template_456",
        },
        {
          name: "listFollowUpTemplates",
          description: "Lists all follow-up templates",
          example:
            "use 'listFollowUpTemplates' function to list all active follow-up templates with pagination",
        },
        {
          name: "scheduleFollowUp",
          description: "Schedules follow-up messages to contacts",
          example:
            "use 'scheduleFollowUp' function to schedule a follow-up email to contact_123 using template_456 for tomorrow at 2 PM",
        },
        {
          name: "createFollowUpSequence",
          description: "Creates automated follow-up sequences",
          example:
            "use 'createFollowUpSequence' function to create a 5-step nurturing sequence with emails sent every 3 days",
        },
        {
          name: "assignContactToSequence",
          description: "Assigns contacts to follow-up sequences",
          example:
            "use 'assignContactToSequence' function to assign contact_123 to the lead nurturing sequence starting immediately",
        },
        {
          name: "pauseFollowUpSequence",
          description: "Pauses follow-up sequences for contacts",
          example:
            "use 'pauseFollowUpSequence' function to pause the follow-up sequence for contact_123",
        },
        {
          name: "updateFollowUpStatus",
          description: "Updates follow-up status and tracking",
          example:
            "use 'updateFollowUpStatus' function to mark followup_789 as completed and add completion notes",
        },
      ],
    },
    utility: {
      title: "Utility Functions",
      description:
        "General utility tools for web search, date operations, and system functions",
      examples: [
        {
          name: "sendWhatsAppMessage",
          description:
            "Sends WhatsApp messages to any contact using their contact ID or phone number",
          example:
            "use 'sendWhatsAppMessage' function with contactId '0128-60123456789' and message 'Hello! Your appointment is confirmed for tomorrow at 2 PM. Please reply to confirm.'",
        },
        {
          name: "sendWhatsAppMessage",
          description:
            "Sends WhatsApp messages to a group using the group contact ID",
          example:
            "use 'sendWhatsAppMessage' function with contactId '0210-120363275496222216' and message 'Team meeting scheduled for Friday at 3 PM. Please confirm your attendance.'",
        },
        {
          name: "scheduleMessage",
          description:
            "Schedule WhatsApp messages to be sent at a specific time with AI-powered intelligent optimization",
          example:
            "use 'scheduleMessage' function with contactIds ['0128-60123456789', '0128-60987654321'] and message 'Special promotion ending soon!' and scheduledTime '2024-01-15T09:00:00+08:00'",
        },
        {
          name: "searchWeb",
          description: "Performs web searches",
          example:
            "use 'searchWeb' function to search the web for 'latest CRM software trends 2024'",
        },
        {
          name: "getTodayDate",
          description: "Gets current date",
          example: "use 'getTodayDate' function to get today's date",
        },
        {
          name: "calculateDateDifference",
          description: "Calculates difference between dates",
          example:
            "use 'calculateDateDifference' function to calculate the number of days between January 15th and January 30th",
        },
        {
          name: "formatDate",
          description: "Formats dates in different formats",
          example:
            "use 'formatDate' function to format '2024-01-15' to 'January 15, 2024'",
        },
        {
          name: "generateUUID",
          description: "Generates unique identifiers",
          example:
            "use 'generateUUID' function to generate a unique ID for a new record",
        },
        {
          name: "validateEmail",
          description: "Validates email addresses",
          example:
            "use 'validateEmail' function to check if 'user@example.com' is a valid email format",
        },
        {
          name: "exportData",
          description: "Exports data to various formats",
          example:
            "use 'exportData' function to export contact list to CSV format with selected fields",
        },
        {
          name: "importData",
          description: "Imports data from files",
          example:
            "use 'importData' function to import contacts from a CSV file with field mapping",
        },
        {
          name: "sendNotification",
          description: "Sends system notifications",
          example:
            "use 'sendNotification' function to send a notification to admin@company.com about system maintenance",
        },
      ],
    },
  };

  // Message classes for fullscreen mode
  const myMessageClass =
    "flex flex-col max-w-xs lg:max-w-md px-4 py-2 mx-2 mb-3 bg-blue-500 text-white rounded-2xl rounded-br-md shadow-sm self-end ml-auto text-left";
  const otherMessageClass =
    "flex flex-col max-w-xs lg:max-w-md px-4 py-2 mx-2 mb-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md shadow-sm border border-gray-200 dark:border-gray-700 self-start text-left";

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

  const openAiToolsModal = (category: string) => {
    setSelectedToolCategory(category);
    setIsAiToolsModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleAiToolsClick = () => {
    setShowAiToolsDropdown(!showAiToolsDropdown);
  };

  const handleAutomatedClick = () => {
    setShowAiToolsSection(true);
    setShowAiToolsDropdown(false);
  };

  const handleManualClick = () => {
    navigate("/a-i-responses");
    setShowAiToolsDropdown(false);
  };

  const handleFullscreenSendMessage = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAiToolsDropdown &&
        !(event.target as Element).closest(".ai-tools-dropdown")
      ) {
        setShowAiToolsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAiToolsDropdown]);

  const fetchCompanyId = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      toast.error("No user email found");
      return;
    }

    try {
      // Get user config to get companyId
      const userResponse = await fetch(
        `https://bisnesgpt.jutateknologi.com/api/user/config?email=${encodeURIComponent(
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
        `https://bisnesgpt.jutateknologi.com/api/user-company-data?email=${encodeURIComponent(
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
          `https://bisnesgpt.jutateknologi.com/api/company-config/${companyId}`
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
      console.log(
        "Skipping assistant info fetch - invalid assistantId or apiKey"
      );
      setLoading(false);
      return;
    }

    // Check if assistantId looks like a valid OpenAI assistant ID format
    if (!assistantId.startsWith("asst_")) {
      console.log(
        "Skipping assistant info fetch - invalid assistant ID format:",
        assistantId
      );
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
        console.log(
          "Assistant not found in OpenAI (404) - ID may be invalid:",
          assistantId
        );
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

    try {
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

      // Update the assistant in OpenAI
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

      // Also save the template version
      if (companyId && assistantInfo.instructions.trim()) {
        try {
          const timestamp = new Date().toLocaleString();
          const templateResponse = await axios.post(
            "https://bisnesgpt.jutateknologi.com/api/instruction-templates",
            {
              companyId,
              name: timestamp,
              instructions: assistantInfo.instructions,
            }
          );

          if (templateResponse.data.success) {
            fetchTemplates(); // Refresh templates list
            toast.success("Assistant updated and template saved successfully");
          } else {
            toast.success(
              "Assistant updated successfully, but template save failed"
            );
          }
        } catch (templateError) {
          console.error("Error saving template:", templateError);
          toast.success(
            "Assistant updated successfully, but template save failed"
          );
        }
      } else {
        toast.success("Assistant updated successfully");
      }
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

  const checkAIResponses = async (
    messageText: string,
    isUserMessage: boolean = true
  ): Promise<ChatMessage[]> => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail || !companyId) return [];

      // Get company API URL
      const baseUrl = "https://bisnesgpt.jutateknologi.com";
      const companyResponse = await fetch(
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

      if (!companyResponse.ok) return [];

      const companyData = await companyResponse.json();
      const apiUrl = companyData.companyData.api_url || baseUrl;

      // Fetch all AI responses by type since the API requires a type parameter
      console.log(
        "Fetching AI responses for company:",
        companyId,
        "from:",
        apiUrl
      );

      const responseTypes = [
        "image",
        "tag",
        "voice",
        "document",
        "assign",
        "video",
      ];
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
              const typedResponses = data.data.map((item: any) => ({
                ...item,
                type: responseType,
              }));
              allResponses.push(...typedResponses);
              console.log(
                `Found ${typedResponses.length} ${responseType} responses`
              );
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
        console.log("Message text:", messageText);

        if (response.status !== "active") {
          console.log("Skipping inactive response:", response.status);
          continue;
        }

        const keywords = Array.isArray(response.keywords)
          ? response.keywords
          : [response.keywords];
        const messageLower = messageText.toLowerCase();
        console.log(
          "Checking keywords:",
          keywords,
          "against message:",
          messageLower
        );

        // Check if any keyword matches the message
        // For user messages, check if user input triggers AI responses
        // For bot messages, check if bot output triggers AI responses
        let hasMatch = false;

        if (isUserMessage) {
          // Check if user message contains keywords (for user-triggered responses)
          hasMatch = keywords.some(
            (keyword: string) =>
              keyword && messageLower.includes(keyword.toLowerCase())
          );
        } else {
          // Check if bot message contains keywords (for bot-triggered responses)
          hasMatch = keywords.some(
            (keyword: string) =>
              keyword && messageLower.includes(keyword.toLowerCase())
          );
        }

        if (hasMatch) {
          console.log(
            "Keyword match found:",
            keywords,
            "for response:",
            response
          );
          // Create appropriate response based on type
          switch (response.type) {
            case "image":
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
            case "tag":
              // Handle tag responses if needed
              break;
            case "voice":
              // Handle voice responses if needed
              break;
            case "document":
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
            case "assign":
              // Handle assignment responses if needed
              break;
            case "video":
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
    // Ensure we have a threadId, create one if needed
    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = generateThreadId();
      setThreadId(currentThreadId);
      console.log("Created new threadId:", currentThreadId);
    }

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

    // Save user message to current thread
    saveChatHistory(currentThreadId, [newMessage, ...messages]);

    // Show AI thinking indicator
    setIsAiThinking(true);

    try {
      const userEmail = localStorage.getItem("userEmail");

      // Get the assistant response first
      // Send the full conversation history so AI remembers the context
      const conversationHistory = messages.map((msg) => ({
        role: msg.from_me ? "user" : "assistant",
        content: msg.text,
      }));

      console.log("Sending conversation history to AI:", conversationHistory);
      console.log("Current messages state:", messages);
      console.log("Using threadId:", currentThreadId);

      const res = await axios.get(
        `https://bisnesgpt.jutateknologi.com/api/assistant-test/`,
        {
          params: {
            message: messageText,
            email: userEmail,
            assistantid: assistantId,
            conversationHistory: JSON.stringify(conversationHistory),
          },
        }
      );
      const data = res.data;
      console.log("Assistant response received:", data);

      // Split the bot's response into individual messages using || separator
      let answer = data.data.answer;
      const botMessages =
        answer && typeof answer === "string"
          ? answer
              .split("||")
              .map((line: string) => line.trim())
              .filter((line: string) => line.length > 0) // Use length > 0 for robustness
          : [];
      console.log("botMessages after processing:", botMessages);
      console.log("Bot response split into messages:", botMessages);

      // Check for AI responses based on the BOT's message, not the user's
      const aiResponses = await checkAIResponses(answer, false);
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
        if (
          aiResponses.length > 0 &&
          botMessage
            .toLowerCase()
            .includes("your cnb carpets virtual admin assistant")
        ) {
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
      setMessages((prevMessages) => {
        const updatedMessages = [...reversedNewMessages, ...prevMessages];

        // Save messages to current thread
        saveChatHistory(currentThreadId, updatedMessages);

        return updatedMessages;
      });
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to send message");
    } finally {
      // Hide AI thinking indicator
      setIsAiThinking(false);
    }
  };

  useEffect(() => {
    if (
      assistantId &&
      apiKey &&
      assistantId.trim() &&
      apiKey.trim() &&
      assistantId.startsWith("asst_")
    ) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  }, [assistantId, apiKey]);

  // Always create a new thread when component mounts
  useEffect(() => {
    const initializeNewThread = async () => {
      console.log("Creating new chat thread...");
      await createNewThread();
    };

    initializeNewThread();
  }, []); // Only run once on mount

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

  // Thread management functions
  const generateThreadId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const generateDefaultThreadName = () => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    return `Chat ${date} ${time}`;
  };

  const saveChatHistory = async (
    threadId: string,
    messages: ChatMessage[],
    customName?: string
  ) => {
    try {
      const threadName = customName || "AI Assistant Chat";
      const threadData = {
        threadId,
        templateName: threadName,
        messages: messages,
        lastUpdated: new Date().toISOString(),
        messageCount: messages.length,
      };

      // Save to localStorage
      localStorage.setItem(
        `chat_thread_${threadId}`,
        JSON.stringify(threadData)
      );
      console.log("Chat history saved to local storage successfully");
    } catch (error) {
      console.error("Error saving chat history to local storage:", error);
    }
  };

  const loadChatHistory = async (threadId: string): Promise<ChatMessage[]> => {
    try {
      console.log(
        "Loading chat history from local storage for thread:",
        threadId
      );
      const threadData = localStorage.getItem(`chat_thread_${threadId}`);

      if (threadData) {
        const parsedData = JSON.parse(threadData);
        const messages = parsedData.messages || [];
        console.log("Messages loaded from local storage:", messages);
        return messages;
      } else {
        console.log("No chat history found for thread:", threadId);
        return [];
      }
    } catch (error) {
      console.error("Error loading chat history from local storage:", error);
      return [];
    }
  };

  const createNewThread = async () => {
    const newThreadId = generateThreadId();
    const defaultName = generateDefaultThreadName();
    setThreadId(newThreadId);
    setMessages([]);

    await saveChatHistory(newThreadId, [], defaultName);
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

  // Debug: Monitor messages state changes
  useEffect(() => {
    console.log(
      "Messages state changed:",
      messages.length,
      "messages:",
      messages
    );
  }, [messages]);

  const fetchFiles = async () => {
    if (!companyId) return;

    const baseUrl = "https://bisnesgpt.jutateknologi.com";

    try {
      // Get user email for API calls
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("No user email found");
      }

      // Get company API URL
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
      const apiUrl = data.companyData.api_url || baseUrl;

      // Fetch files from backend
      const filesResponse = await fetch(
        `${apiUrl}/api/assistant-files?companyId=${companyId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

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
    const baseUrl = "https://bisnesgpt.jutateknologi.com";

    try {
      // Get user email for API calls
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("No user email found");
      }

      // Get company API URL
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

    const baseUrl = "https://bisnesgpt.jutateknologi.com";

    try {
      // Get user email for API calls
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        throw new Error("No user email found");
      }

      // Get company API URL
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
      const apiUrl = data.companyData.api_url || baseUrl;

      // Delete file from backend
      const deleteResponse = await fetch(
        `${apiUrl}/api/assistant-files/${fileId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

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
    if (
      assistantId &&
      apiKey &&
      assistantId.trim() &&
      apiKey.trim() &&
      assistantId.startsWith("asst_")
    ) {
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
        `https://bisnesgpt.jutateknologi.com/api/instruction-templates?companyId=${encodeURIComponent(
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
        "https://bisnesgpt.jutateknologi.com/api/instruction-templates",
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
        `https://bisnesgpt.jutateknologi.com/api/instruction-templates/${templateId}`
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
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-1.5 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-1.5 text-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Version History
          </button>
        </div>
      </div>
    </div>
  );

  const fetchAiSettings = async () => {
    if (!companyId) return;

    try {
      const response = await axios.get(
        `https://bisnesgpt.jutateknologi.com/api/ai-settings?companyId=${encodeURIComponent(
          companyId
        )}`
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
        "https://bisnesgpt.jutateknologi.com/api/ai-settings",
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
    navigate("/inbox");
  };

  // If in fullscreen mode, show only the chat interface
  if (isFullscreenMode) {
    return (
      <div className="flex flex-col w-full h-screen backdrop-blur-3xl bg-gradient-to-br from-white/30 via-white/20 to-white/10 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/40 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/40 dark:border-slate-600/30 overflow-hidden">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/30 dark:border-slate-600/40 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/40 to-white/20 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/40 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-lg rounded-xl border border-white/30 dark:border-slate-600/40 shadow-lg">
                <svg
                  className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <div className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 backdrop-blur-lg text-indigo-900 dark:text-indigo-100 rounded-xl shadow-lg font-semibold text-lg capitalize border border-white/30 dark:border-slate-600/40">
                  {assistantInfo.name}
                </div>
                <div className="ml-1 mt-1 text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Fullscreen Chat Mode
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exitFullscreenMode}
              className="group relative px-6 py-3 bg-gradient-to-r from-red-500/20 to-pink-600/20 backdrop-blur-lg text-red-700 dark:text-red-300 border border-red-200/40 dark:border-red-400/30 rounded-xl hover:from-red-500/30 hover:to-pink-600/30 hover:border-red-300/60 dark:hover:border-red-400/50 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
            >
              <span className="relative z-10 flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span>Exit Fullscreen</span>
              </span>
            </button>
          </div>
        </div>

        {/* Fullscreen Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 backdrop-blur-2xl bg-gradient-to-br from-white/20 via-white/10 to-white/5 dark:from-slate-800/40 dark:via-slate-800/20 dark:to-slate-900/60 scrollbar-thin scrollbar-thumb-slate-300/50 dark:scrollbar-thumb-slate-600/50 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="mb-4 p-3 bg-gradient-to-r from-emerald-500/20 to-teal-600/20 backdrop-blur-lg border border-emerald-200/40 dark:border-emerald-400/30 rounded-2xl shadow-lg inline-block">
                  <svg
                    className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/20 to-teal-600/20 backdrop-blur-lg text-emerald-900 dark:text-emerald-100 rounded-2xl shadow-lg font-semibold text-lg border border-emerald-200/40 dark:border-emerald-400/30">
                  Start a conversation
                </div>
                <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm">
                  Send a message to begin chatting with your AI assistant
                </p>
              </div>
            </div>
          ) : (
            messages
              .slice()
              .reverse()
              .map((message, index) => (
                <div key={index}>
                  {message.text
                    .split("||")
                    .filter((splitText) => splitText.trim() !== "")
                    .map((splitText, splitIndex) => (
                      <div
                        key={`${index}-${splitIndex}`}
                        className={`flex ${
                          message.from_me ? "justify-end" : "justify-start"
                        } animate-fadeIn mb-4`}
                      >
                        <div
                          className={
                            message.from_me ? myMessageClass : otherMessageClass
                          }
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
                                      window.open(imageUrl, "_blank");
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
                          {message.type === "document" &&
                            message.documentUrls && (
                              <div className="space-y-2">
                                {message.documentUrls.map(
                                  (documentUrl, docIndex) => (
                                    <div key={docIndex} className="relative">
                                      <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                                        <svg
                                          className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {documentUrl
                                              .split("/")
                                              .pop()
                                              ?.split("?")[0] ||
                                              `Document ${docIndex + 1}`}
                                          </p>
                                          {message.caption && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              {message.caption}
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={() =>
                                            openPDFModal(
                                              documentUrl,
                                              documentUrl
                                                .split("/")
                                                .pop()
                                                ?.split("?")[0] ||
                                                `Document ${docIndex + 1}`
                                            )
                                          }
                                          className="px-3 py-1 text-xs bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
                                        >
                                          View
                                        </button>
                                      </div>

                                      {/* Document Content Preview */}
                                      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                                        {documentUrl
                                          .toLowerCase()
                                          .includes(".pdf") ? (
                                          <iframe
                                            src={documentUrl}
                                            width="100%"
                                            height="400"
                                            title={`Document ${docIndex + 1}`}
                                            className="border-0"
                                            style={{ minHeight: "400px" }}
                                          />
                                        ) : documentUrl
                                            .toLowerCase()
                                            .match(
                                              /\.(jpg|jpeg|png|gif|webp)$/i
                                            ) ? (
                                          <img
                                            src={documentUrl}
                                            alt={`Document ${docIndex + 1}`}
                                            className="w-full h-auto max-h-96 object-contain"
                                          />
                                        ) : (
                                          <div className="p-4 text-center">
                                            <svg
                                              className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-2"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path
                                                fillRule="evenodd"
                                                d="M4 4a2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                                clipRule="evenodd"
                                              />
                                            </svg>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                              Document preview not available
                                            </p>
                                            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                                              Click Download to view this
                                              document
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                </div>
              ))
          )}

          {/* AI Thinking Indicator for Fullscreen - Enhanced Glassmorphism Style */}
          {isAiThinking && (
            <div className="flex justify-start mb-8 animate-fadeIn">
              <div className="bg-gradient-to-r from-slate-100/80 to-slate-200/60 dark:from-slate-800/80 dark:to-slate-700/60 backdrop-blur-xl rounded-3xl rounded-bl-lg px-6 py-5 max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-slate-200/50 dark:border-slate-600/40">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2">
                    <div
                      className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-300 dark:to-purple-400 rounded-full animate-pulse shadow-lg"
                      style={{
                        animationDelay: "0ms",
                        animationDuration: "1.4s",
                      }}
                    ></div>
                    <div
                      className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-300 dark:to-purple-400 rounded-full animate-pulse shadow-lg"
                      style={{
                        animationDelay: "0.2s",
                        animationDuration: "1.4s",
                      }}
                    ></div>
                    <div
                      className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-500 dark:from-indigo-300 dark:to-purple-400 rounded-full animate-pulse shadow-lg"
                      style={{
                        animationDelay: "0.4s",
                        animationDuration: "1.4s",
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    AI is thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Message Input */}
        <div className="p-6 border-t border-white/30 dark:border-slate-700/40 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/40 to-white/20 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/40">
          <div className="flex items-end gap-4">
            <div className="flex-1 relative">
              <textarea
                className="w-full min-h-[60px] max-h-32 px-4 py-3 text-base text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-white/40 dark:border-slate-600/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300/60 dark:focus:border-indigo-400/60 resize-none transition-all duration-300 shadow-lg placeholder-slate-500 dark:placeholder-slate-400"
                placeholder="Type your message here..."
                value={fullscreenNewMessage}
                onChange={(e) => setFullscreenNewMessage(e.target.value)}
                onKeyDown={handleFullscreenSendMessage}
                rows={1}
              />
            </div>
            <button
              onClick={handleFullscreenSendClick}
              disabled={!fullscreenNewMessage.trim()}
              className="group relative px-6 py-3 bg-gradient-to-r from-indigo-500/80 to-purple-600/80 backdrop-blur-lg text-white rounded-2xl hover:from-indigo-600/90 hover:to-purple-700/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 dark:border-slate-600/30"
            >
              <span className="relative z-10 flex items-center space-x-2 font-medium">
                <span>Send</span>
                <svg
                  className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-red-500/90 to-pink-600/90 backdrop-blur-lg text-white px-6 py-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-red-400/30 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <svg
                className="w-5 h-5 text-red-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
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
    <div className="h-screen overflow-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Modern Glassmorphism Layout */}
      <div className="min-h-screen backdrop-blur-3xl">
        {/* Top Navigation Bar with Enhanced Glassmorphism */}
        <div className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border-b border-white/30 dark:border-slate-700/40 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/30">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-400/20 dark:to-emerald-400/20 backdrop-blur-sm border border-green-200/40 dark:border-green-700/40">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  AI Assistant Configuration
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area with Enhanced Glassmorphism */}
        <div className="max-w-7xl mx-auto p-4 pb-8">
          <div
            className={`w-full ${
              isWideScreen ? "flex gap-4" : ""
            } relative z-10`}
          >
            {isWideScreen ? (
              <>
                {/* Left Panel - Assistant Configuration */}
                <div className="w-2/5 group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60 h-[calc(100vh-120px)] overflow-hidden">
                  {/* Enhanced glassmorphic inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-700/20 dark:via-transparent dark:to-slate-700/10 rounded-3xl"></div>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-400/10 via-emerald-400/10 to-teal-400/10 dark:from-green-500/10 dark:via-emerald-500/10 dark:to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  {/* Scrollable content with proper border coverage */}
                  <div
                    className="relative z-10 h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300/50 dark:scrollbar-thumb-slate-600/50 scrollbar-track-transparent"
                    style={{
                      scrollbarGutter: "stable",
                      borderRadius: "inherit",
                      backgroundClip: "padding-box",
                    }}
                  >
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-400/20 dark:to-emerald-400/20 backdrop-blur-sm border border-green-200/40 dark:border-green-700/40">
                          <svg
                            className="w-8 h-8 text-green-600 dark:text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <h2 className="text-xl font-semibold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                          Assistant Configuration
                        </h2>
                      </div>
                      {loading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-6">
                            <img
                              alt="Logo"
                              className="w-20 h-20 mb-4"
                              src={logoUrl}
                            />
                            <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                              Fetching Assistant...
                            </div>
                            <LoadingIcon
                              icon="three-dots"
                              className="w-16 h-16 mt-4"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Assistant Selection */}
                          {assistants.length > 1 && (
                            <div className="mb-6">
                              <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                                <label className="block mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  Select Assistant
                                </label>
                                <select
                                  value={selectedAssistant}
                                  onChange={(e) =>
                                    handleAssistantChange(e.target.value)
                                  }
                                  className="w-full px-4 py-3 border border-white/30 dark:border-slate-600/40 rounded-2xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 focus:border-green-500/60 focus:ring-2 focus:ring-green-500/30 transition-all duration-300 font-medium shadow-lg hover:shadow-xl text-slate-700 dark:text-slate-200"
                                >
                                  {assistants.map((assistant) => (
                                    <option
                                      key={assistant.id}
                                      value={assistant.id}
                                    >
                                      {assistant.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Quick Action Tools */}
                          <div className="mb-6">
                            <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                              <label className="block mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Quick Tools
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={handleAutomatedClick}
                                  className="group bg-gradient-to-r from-blue-500/90 to-indigo-500/90 hover:from-blue-600/90 hover:to-indigo-600/90 backdrop-blur-sm border-blue-400/30 shadow-lg shadow-blue-500/20 transition-all duration-300 rounded-lg px-3 py-2 hover:scale-105 transform-gpu hover:shadow-xl hover:shadow-blue-500/30 text-white"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div className="p-0.5 rounded-md bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                    <span className="text-xs font-medium">
                                      AI Tools
                                    </span>
                                  </div>
                                </button>

                                <button
                                  onClick={handleManualClick}
                                  className="group bg-gradient-to-r from-indigo-500/90 to-purple-500/90 hover:from-indigo-600/90 hover:to-purple-600/90 backdrop-blur-sm border-indigo-400/30 shadow-lg shadow-indigo-500/20 transition-all duration-300 rounded-lg px-3 py-2 hover:scale-105 transform-gpu hover:shadow-xl hover:shadow-indigo-500/30 text-white"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div className="p-0.5 rounded-md bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm7-3h2v6H9V7zm0 8h2v2H9v-2z" />
                                      </svg>
                                    </div>
                                    <span className="text-xs font-medium">
                                      Keyword Tools
                                    </span>
                                  </div>
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-2 mt-2">
                                <Link to="/follow-ups">
                                  <button className="group bg-gradient-to-r from-teal-500/90 to-emerald-500/90 hover:from-teal-600/90 hover:to-emerald-600/90 backdrop-blur-sm border-teal-400/30 shadow-lg shadow-teal-500/20 transition-all duration-300 rounded-lg px-3 py-2 hover:scale-105 transform-gpu hover:shadow-xl hover:shadow-teal-500/30 text-white">
                                    <div className="flex items-center gap-1.5">
                                      <div className="p-0.5 rounded-md bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                        <svg
                                          className="w-3 h-3"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-medium">
                                        Follow-Ups
                                      </span>
                                    </div>
                                  </button>
                                </Link>

                                <Link to="/users-layout-2/builder2">
                                  <button className="group bg-gradient-to-r from-purple-500/90 to-pink-500/90 hover:from-purple-600/90 hover:to-pink-600/90 backdrop-blur-sm border-purple-400/30 shadow-lg shadow-purple-500/20 transition-all duration-300 rounded-lg px-3 py-2 hover:scale-105 transform-gpu hover:shadow-xl hover:shadow-purple-500/30 text-white">
                                    <div className="flex items-center gap-1.5">
                                      <div className="p-0.5 rounded-md bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                        <svg
                                          className="w-3 h-3"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                          <path
                                            fillRule="evenodd"
                                            d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-medium">
                                        Prompt Builder
                                      </span>
                                    </div>
                                  </button>
                                </Link>

                                <Link to="/split-test">
                                  <button className="group bg-gradient-to-r from-orange-500/90 to-red-500/90 hover:from-orange-600/90 hover:to-red-600/90 backdrop-blur-sm border-orange-400/30 shadow-lg shadow-orange-500/20 transition-all duration-300 rounded-lg px-3 py-2 hover:scale-105 transform-gpu hover:shadow-xl hover:shadow-orange-500/30 text-white">
                                    <div className="flex items-center gap-1.5">
                                      <div className="p-0.5 rounded-md bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                        <svg
                                          className="w-3 h-3"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-xs font-medium">
                                        Split Test
                                      </span>
                                    </div>
                                  </button>
                                </Link>
                              </div>
                            </div>
                          </div>

                          {/* AI Tools Section - Show when Automated is selected */}
                          {showAiToolsSection && (
                            <div className="mb-6 p-4 backdrop-blur-md bg-gradient-to-br from-blue-500/15 to-blue-600/15 dark:from-blue-400/20 dark:to-blue-500/20 rounded-2xl border border-blue-300/30 dark:border-blue-400/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] relative overflow-hidden group">
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-blue-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              
                              <div className="flex justify-between items-center mb-4 relative z-10">
                                <label className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <svg
                                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  AI Tools
                                </label>
                                <button
                                  onClick={() => setShowAiToolsSection(false)}
                                  className="p-1.5 rounded-lg bg-slate-100/60 dark:bg-slate-700/60 hover:bg-slate-200/80 dark:hover:bg-slate-600/80 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all duration-300 hover:scale-105"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
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
                              
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 relative z-10">
                                Click on any tool category to see examples and copy them directly to your chat
                              </p>
                              
                              <div className="grid grid-cols-2 gap-3 relative z-10">
                                <button
                                  onClick={() => openAiToolsModal("calendar")}
                                  className="p-3 backdrop-blur-md bg-gradient-to-br from-blue-500/80 to-blue-600/80 dark:from-blue-400/80 dark:to-blue-500/80 text-white border border-blue-300/30 dark:border-blue-400/30 rounded-xl hover:bg-gradient-to-br hover:from-blue-600/90 hover:to-blue-700/90 dark:hover:from-blue-500/90 dark:hover:to-blue-600/90 shadow-lg hover:shadow-xl transition-all duration-300 text-left hover:scale-105 relative overflow-hidden group"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/15 via-transparent to-blue-500/15 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative z-10">
                                    <div className="font-medium text-xs mb-1">
                                      Calendar & Reminders
                                    </div>
                                    <div className="text-xs opacity-90">
                                      Event management & scheduling
                                    </div>
                                  </div>
                                </button>
                                
                                <button
                                  onClick={() => openAiToolsModal("contact")}
                                  className="p-3 backdrop-blur-md bg-gradient-to-br from-purple-500/80 to-purple-600/80 dark:from-purple-400/80 dark:to-purple-500/80 text-white border border-purple-300/30 dark:border-purple-400/30 rounded-xl hover:bg-gradient-to-br hover:from-purple-600/90 hover:to-purple-700/90 dark:hover:from-purple-500/90 dark:hover:to-purple-600/90 shadow-lg hover:shadow-xl transition-all duration-300 text-left hover:scale-105 relative overflow-hidden group"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/15 via-transparent to-purple-500/15 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative z-10">
                                    <div className="font-medium text-xs mb-1">
                                      Contact Management
                                    </div>
                                    <div className="text-xs opacity-90">
                                      Contact & tag operations
                                    </div>
                                  </div>
                                </button>
                                
                                <button
                                  onClick={() => openAiToolsModal("database")}
                                  className="p-3 backdrop-blur-md bg-gradient-to-br from-orange-500/80 to-orange-600/80 dark:from-orange-400/80 dark:to-orange-500/80 text-white border border-orange-300/30 dark:border-orange-400/30 rounded-xl hover:bg-gradient-to-br hover:from-orange-600/90 hover:to-orange-700/90 dark:hover:from-orange-500/90 dark:hover:to-orange-600/90 shadow-lg hover:shadow-xl transition-all duration-300 text-left hover:scale-105 relative overflow-hidden group"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-orange-400/15 via-transparent to-orange-500/15 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative z-10">
                                    <div className="font-medium text-xs mb-1">
                                      Database & Custom Fields
                                    </div>
                                    <div className="text-xs opacity-90">
                                      Data management tools
                                    </div>
                                  </div>
                                </button>
                                
                                <button
                                  onClick={() => openAiToolsModal("followUps")}
                                  className="p-3 backdrop-blur-md bg-gradient-to-br from-pink-500/80 to-pink-600/80 dark:from-pink-400/80 dark:to-pink-500/80 text-white border border-pink-300/30 dark:border-pink-400/30 rounded-xl hover:bg-gradient-to-br hover:from-pink-600/90 hover:to-pink-700/90 dark:hover:from-pink-500/90 dark:hover:to-pink-600/90 shadow-lg hover:shadow-xl transition-all duration-300 text-left hover:scale-105 relative overflow-hidden group"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-pink-400/15 via-transparent to-pink-500/15 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative z-10">
                                    <div className="font-medium text-xs mb-1">
                                      Follow-Up Management
                                    </div>
                                    <div className="text-xs opacity-90">
                                      Templates & sequences
                                    </div>
                                  </div>
                                </button>
                                
                                <button
                                  onClick={() => openAiToolsModal("utility")}
                                  className="p-3 backdrop-blur-md bg-gradient-to-br from-teal-500/80 to-teal-600/80 dark:from-teal-400/80 dark:to-teal-500/80 text-white border border-teal-300/30 dark:border-teal-400/30 rounded-xl hover:bg-gradient-to-br hover:from-teal-600/90 hover:to-teal-700/90 dark:hover:from-teal-500/90 dark:hover:to-teal-600/90 shadow-lg hover:shadow-xl transition-all duration-300 text-left hover:scale-105 relative overflow-hidden group col-span-2"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-teal-400/15 via-transparent to-teal-500/15 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                  <div className="relative z-10">
                                    <div className="font-medium text-xs mb-1">
                                      Utility Functions
                                    </div>
                                    <div className="text-xs opacity-90">
                                      Web search, dates & system tools
                                    </div>
                                  </div>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Assistant Name Section */}
                          <div className="mb-6">
                            <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                              <label className="block mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Assistant Name
                              </label>
                              <div className="relative">
                                <input
                                  id="name"
                                  name="name"
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 pr-8 font-mono"
                                  placeholder="Name your assistant"
                                  value={assistantInfo.name}
                                  onChange={handleInputChange}
                                  onFocus={handleFocus}
                                  disabled={userRole === "3"}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="relative">
                              <textarea
                                id="instructions"
                                name="instructions"
                                className="w-full p-3 border border-gray-300 rounded-xl h-[500px] text-xs bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono shadow-sm"
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
                                  Version History
                                </button>
                              </div>

                              {/* Update Assistant Button - Positioned at bottom inside textarea */}
                              <button
                                ref={updateButtonRef}
                                onClick={updateAssistantInfo}
                                className={`absolute bottom-2 right-2 px-4 py-2 ${
                                  isSaving
                                    ? "bg-green-600 dark:bg-green-700"
                                    : "bg-green-500 dark:bg-green-600"
                                } text-white border-2 border-green-600 dark:border-green-500 rounded-lg hover:bg-green-600 dark:hover:bg-green-700 hover:border-green-700 dark:hover:border-green-600 shadow-lg active:scale-90 hover:scale-105 transform transition-all duration-200 ease-out flex items-center gap-2 ${
                                  userRole === "3"
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                onFocus={handleFocus}
                                disabled={userRole === "3"}
                              >
                                {isSaving ? (
                                  <svg
                                    className="animate-spin h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
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
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>

                          {/* AI Response Settings */}
                          <div className="mb-6">
                            <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                              <label className="block mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Response Delay Settings
                              </label>
                              <div className="space-y-4">
                                <div>
                                  <label className="block mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Delay (seconds)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="300"
                                    value={aiDelay}
                                    onChange={(e) =>
                                      setAiDelay(Number(e.target.value))
                                    }
                                    className="w-full px-4 py-3 border border-white/30 dark:border-slate-600/40 rounded-2xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 focus:border-green-500/60 focus:ring-2 focus:ring-green-500/30 transition-all duration-300 font-medium shadow-lg hover:shadow-xl text-slate-700 dark:text-slate-200"
                                    disabled={userRole === "3"}
                                  />
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Set how long the AI should wait before
                                    responding (0-300 seconds)
                                  </p>
                                </div>
                                <button
                                  onClick={handleSaveAiSettings}
                                  className="group bg-gradient-to-r from-green-500/90 to-emerald-500/90 hover:from-green-600/90 hover:to-emerald-600/90 backdrop-blur-sm border-green-400/30 shadow-xl shadow-green-500/30 transition-all duration-300 rounded-xl px-4 py-2 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-green-500/40 text-white flex items-center gap-2"
                                  disabled={userRole === "3"}
                                >
                                  <div className="p-1 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <svg
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                  <span className="text-sm font-medium">
                                    Save Delay Settings
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Knowledge Base */}
                          <div className="mb-6">
                            <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40">
                              <label className="block mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <svg
                                  className="w-5 h-5 text-slate-600 dark:text-slate-400"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L7.293 9.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Knowledge Base
                              </label>
                              <div className="relative mb-4">
                                <input
                                  id="file-upload"
                                  type="file"
                                  onChange={handleFileUpload}
                                  className="w-full px-4 py-3 border border-white/30 dark:border-slate-600/40 rounded-2xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 focus:border-green-500/60 focus:ring-2 focus:ring-green-500/30 transition-all duration-300 font-medium shadow-lg hover:shadow-xl text-slate-700 dark:text-slate-200"
                                  disabled={uploading || userRole === "3"}
                                />
                                {uploading && (
                                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-700/80 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                      <svg
                                        className="animate-spin h-5 w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                      </svg>
                                      <span className="text-sm font-medium">
                                        Uploading...
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Files List */}
                              <div className="space-y-3">
                                {(files || []).map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between p-3 bg-white/70 dark:bg-slate-700/70 rounded-xl border border-white/30 dark:border-slate-600/40 hover:border-green-300/60 dark:hover:border-green-700/60 transition-all duration-300 shadow-sm hover:shadow-md"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                                        <svg
                                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-slate-700 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 transition-colors font-medium"
                                      >
                                        {file.name}
                                      </a>
                                    </div>
                                    <button
                                      onClick={() => deleteFile(file.id)}
                                      className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50/60 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-red-200/40 dark:border-red-700/40"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))}
                                {files.length === 0 && (
                                  <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100/50 to-slate-200/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-600/40 mx-auto w-fit mb-3">
                                      <svg
                                        className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                    <p className="text-sm font-medium">
                                      No files uploaded yet
                                    </p>
                                    <p className="text-xs mt-1 opacity-75">
                                      Upload files to enhance your assistant's
                                      knowledge
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {error && (
                            <div className="mb-6">
                              <div className="bg-gradient-to-r from-red-50/50 to-red-100/30 dark:from-red-900/30 dark:to-red-800/20 backdrop-blur-xl rounded-2xl p-4 border border-red-200/40 dark:border-red-700/40">
                                <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                                  {error}
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel - Chat Interface */}
                <div className="w-3/5 group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-6 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60 h-[calc(100vh-120px)] overflow-hidden">
                  {/* Enhanced glassmorphic inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-700/20 dark:via-transparent dark:to-slate-700/10 rounded-3xl"></div>
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/10 via-indigo-400/10 to-purple-400/10 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="relative z-10 h-full">
                    {/* Header */}
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                        <svg
                          className="w-8 h-8 text-blue-600 dark:text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                        Chat Interface
                      </h2>
                    </div>

                    {/* Chat Component */}
                    <div className="h-[calc(100%-80px)]">
                      <MessageList
                        messages={messages}
                        onSendMessage={sendMessageToAssistant}
                        assistantName={assistantInfo?.name}
                        deleteThread={deleteThread}
                        threadId={threadId}
                        enterFullscreenMode={enterFullscreenMode}
                        openPDFModal={openPDFModal}
                        companyId={companyId}
                        isAiThinking={isAiThinking}
                        onCreateNewThread={createNewThread}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Mobile Layout */
              <Tab.Group
                as="div"
                className="flex flex-col w-full h-[calc(100vh-120px)]"
              >
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 overflow-hidden">
                  <Tab.List className="flex bg-gradient-to-r from-slate-100/50 to-slate-200/30 dark:from-slate-700/50 dark:to-slate-600/30 backdrop-blur-xl p-2 border-b border-white/30 dark:border-slate-700/40">
                    <Tab
                      className={({ selected }) =>
                        `flex-1 py-3 text-sm font-medium text-center rounded-xl transition-all duration-300 ${
                          selected
                            ? "bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white shadow-lg shadow-green-500/30"
                            : "text-slate-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
                        }`
                      }
                    >
                      Assistant Config
                    </Tab>
                    <Tab
                      className={({ selected }) =>
                        `flex-1 py-3 text-sm font-medium text-center rounded-xl transition-all duration-300 ${
                          selected
                            ? "bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white shadow-lg shadow-blue-500/30"
                            : "text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
                        }`
                      }
                    >
                      Chat
                    </Tab>
                  </Tab.List>
                  <Tab.Panels className="flex-1 overflow-hidden">
                    <Tab.Panel className="h-full overflow-auto p-4">
                      <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/40 dark:border-slate-600/40 h-full">
                        {loading ? (
                          <div className="flex items-center justify-center h-full">
                            <div className="flex flex-col items-center text-center">
                              <img
                                alt="Logo"
                                className="w-20 h-20 mb-4"
                                src={logoUrl}
                              />
                              <div className="text-sm text-slate-600 dark:text-slate-300">
                                Fetching Assistant...
                              </div>
                              <LoadingIcon
                                icon="three-dots"
                                className="w-16 h-16 mt-4"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Assistant Name
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-3 border border-white/30 dark:border-slate-600/40 rounded-2xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 focus:border-green-500/60 focus:ring-2 focus:ring-green-500/30 transition-all duration-300"
                                placeholder="Name your assistant"
                                value={assistantInfo.name}
                                onChange={handleInputChange}
                                name="name"
                                disabled={userRole === "3"}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Instructions
                              </label>
                              <textarea
                                className="w-full px-4 py-3 border border-white/30 dark:border-slate-600/40 rounded-2xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 focus:border-green-500/60 focus:ring-2 focus:ring-green-500/30 transition-all duration-300 h-[200px] resize-none"
                                placeholder="Tell your assistant what to do..."
                                value={assistantInfo.instructions}
                                onChange={handleInputChange}
                                name="instructions"
                                disabled={userRole === "3"}
                              />
                            </div>

                            <button
                              onClick={updateAssistantInfo}
                              className="w-full bg-gradient-to-r from-green-500/90 to-emerald-500/90 hover:from-green-600/90 hover:to-emerald-600/90 text-white py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-green-500/30"
                              disabled={userRole === "3" || isSaving}
                            >
                              {isSaving ? "Saving..." : "Save Configuration"}
                            </button>
                          </div>
                        )}
                      </div>
                    </Tab.Panel>
                    <Tab.Panel className="h-full overflow-hidden p-4">
                      <div className="h-full bg-gradient-to-r from-slate-50/50 to-slate-100/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-xl rounded-2xl border border-slate-200/40 dark:border-slate-600/40">
                        <MessageList
                          messages={messages}
                          onSendMessage={sendMessageToAssistant}
                          assistantName={
                            assistantInfo?.name || "Juta Assistant"
                          }
                          deleteThread={deleteThread}
                          threadId={threadId}
                          enterFullscreenMode={enterFullscreenMode}
                          openPDFModal={openPDFModal}
                          companyId={companyId}
                          isAiThinking={isAiThinking}
                          onCreateNewThread={createNewThread}
                        />
                      </div>
                    </Tab.Panel>
                  </Tab.Panels>
                </div>
              </Tab.Group>
            )}

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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
                    <Dialog.Panel className="w-screen h-screen transform overflow-hidden bg-gradient-to-br from-slate-50/95 via-blue-50/95 to-indigo-100/95 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 backdrop-blur-3xl p-6 text-left align-middle shadow-2xl transition-all">
                      {/* Glassmorphic overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 dark:from-slate-700/10 dark:via-transparent dark:to-slate-700/5"></div>

                      <div className="relative z-10 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6 p-4 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-xl">
                          <Dialog.Title
                            as="h3"
                            className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent flex items-center gap-3"
                          >
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-400/20 dark:to-emerald-400/20 backdrop-blur-sm border border-green-200/40 dark:border-green-700/40">
                              <svg
                                className="w-6 h-6 text-green-600 dark:text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </div>
                            Edit Instructions
                          </Dialog.Title>
                          <button
                            onClick={() => setIsFullscreenModalOpen(false)}
                            className="p-3 rounded-2xl bg-gradient-to-br from-slate-100/50 to-slate-200/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-600/40 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all duration-300 hover:bg-gradient-to-br hover:from-slate-200/50 hover:to-slate-300/30 dark:hover:from-slate-600/30 dark:hover:to-slate-500/20 hover:scale-105"
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
                        <div className="relative flex-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-xl p-6">
                          {/* Glassmorphic inner overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-700/20 dark:via-transparent dark:to-slate-700/10 rounded-3xl"></div>

                          <div className="relative z-10 h-full">
                            <textarea
                              className="w-full h-full p-4 text-base bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-white/30 dark:border-slate-600/40 rounded-2xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500/60 focus:border-green-500/60 font-mono shadow-lg transition-all duration-300 resize-none"
                              value={assistantInfo.instructions}
                              onChange={handleInputChange}
                              name="instructions"
                              placeholder="Tell your assistant what to do..."
                              disabled={userRole === "3"}
                            />

                            {/* Enhanced Template Button */}
                            <div className="absolute bottom-6 left-6">
                              <button
                                onClick={() => setIsTemplateModalOpen(true)}
                                className="px-4 py-3 bg-gradient-to-r from-blue-500/90 to-indigo-500/90 hover:from-blue-600/90 hover:to-indigo-600/90 backdrop-blur-sm border border-blue-300/40 dark:border-blue-700/40 rounded-2xl text-white transition-all duration-300 text-sm flex items-center gap-3 shadow-lg shadow-blue-500/30 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40"
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
                                Version History
                              </button>
                            </div>

                            {/* Enhanced Save Button */}
                            <div className="absolute bottom-6 right-6">
                              <button
                                onClick={updateAssistantInfo}
                                className={`px-6 py-3 ${
                                  isSaving
                                    ? "bg-gradient-to-r from-green-600/90 to-emerald-600/90"
                                    : "bg-gradient-to-r from-green-500/90 to-emerald-500/90 hover:from-green-600/90 hover:to-emerald-600/90"
                                } backdrop-blur-sm border border-green-300/40 dark:border-green-700/40 rounded-2xl text-white transition-all duration-300 text-base flex items-center gap-3 shadow-xl shadow-green-500/30 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/40 ${
                                  userRole === "3"
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                disabled={userRole === "3"}
                              >
                                {isSaving ? (
                                  <svg
                                    className="animate-spin h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
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
                                {isSaving
                                  ? "Saving Instructions..."
                                  : "Save Instructions"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          {/* Template Modal */}
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
                    <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-3xl border border-white/40 dark:border-slate-700/40 p-6 text-left align-middle shadow-2xl shadow-slate-200/30 dark:shadow-slate-900/50 transition-all">
                      {/* Enhanced glassmorphic overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-white/20 dark:from-slate-700/30 dark:via-slate-700/10 dark:to-slate-700/20 rounded-3xl"></div>
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-green-400/5 via-emerald-400/5 to-teal-400/5 dark:from-green-500/10 dark:via-emerald-500/10 dark:to-teal-500/10"></div>

                      <div className="relative z-10">
                        {/* Enhanced Header */}
                        <div className="flex items-center justify-between mb-6">
                          <Dialog.Title
                            as="h3"
                            className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent flex items-center gap-3"
                          >
                            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 dark:from-green-400/20 dark:to-emerald-400/20 backdrop-blur-sm border border-green-200/50 dark:border-green-700/50 shadow-lg shadow-green-500/20">
                              <svg
                                className="w-5 h-5 text-green-600 dark:text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <span>Version History</span>
                          </Dialog.Title>
                          <button
                            onClick={() => setIsTemplateModalOpen(false)}
                            className="p-2 rounded-xl bg-gradient-to-br from-slate-100/50 to-slate-200/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all duration-300 hover:bg-gradient-to-br hover:from-slate-200/60 hover:to-slate-300/40 dark:hover:from-slate-600/40 dark:hover:to-slate-500/30 hover:scale-105 shadow-lg hover:shadow-xl"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
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

                        {/* Enhanced Description */}
                        <div className="mb-4">
                          <div className="p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-900/30 dark:to-indigo-900/20 backdrop-blur-sm rounded-xl border border-blue-200/40 dark:border-blue-700/40">
                            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Select a saved template to restore previous
                              instructions
                            </p>
                          </div>
                        </div>

                        {/* Enhanced Content Area */}
                        <div className="max-h-[50vh] overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-300/50 dark:scrollbar-thumb-slate-600/50 scrollbar-track-transparent pr-2">
                          {templates.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100/60 to-slate-200/40 dark:from-slate-700/40 dark:to-slate-600/30 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 inline-block shadow-lg">
                                <svg
                                  className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                                <h4 className="text-base font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  No Templates Found
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  Save your current instructions to create your
                                  first template
                                </p>
                              </div>
                            </div>
                          ) : (
                            templates.map((template, index) => (
                              <div
                                key={template.id}
                                className="group relative p-4 ml-3 bg-gradient-to-r from-slate-50/60 to-slate-100/40 dark:from-slate-700/40 dark:to-slate-600/30 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] hover:bg-gradient-to-r hover:from-slate-100/70 hover:to-slate-200/50 dark:hover:from-slate-600/50 dark:hover:to-slate-500/40"
                              >
                                {/* Template number badge - positioned outside card */}
                                <div className="absolute -top-1 -left-3 w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-lg z-10">
                                  {index + 1}
                                </div>

                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 pr-2">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                                      <svg
                                        className="w-3 h-3 text-green-600 dark:text-green-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                      </svg>
                                      {template.name}
                                    </h4>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                      <svg
                                        className="w-2 h-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      Saved template
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        loadTemplate(template);
                                        setIsTemplateModalOpen(false);
                                      }}
                                      className="px-3 py-1.5 bg-gradient-to-r from-green-500/90 to-emerald-500/90 hover:from-green-600/90 hover:to-emerald-600/90 text-white rounded-lg transition-all duration-300 text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-green-500/30 hover:scale-105 hover:shadow-xl hover:shadow-green-500/40"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-2.5 w-2.5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                                      </svg>
                                      Load
                                    </button>
                                    <button
                                      onClick={() =>
                                        deleteTemplate(template.id)
                                      }
                                      className={`px-3 py-1.5 bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-600/90 hover:to-red-700/90 text-white rounded-lg transition-all duration-300 text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-red-500/30 hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 ${
                                        userRole === "3"
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      disabled={userRole === "3"}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-2.5 w-2.5"
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

                                {/* Enhanced preview */}
                                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg p-3 border border-slate-200/40 dark:border-slate-600/40 shadow-inner">
                                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                    {template.instructions}
                                  </p>
                                  {template.instructions.length > 150 && (
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                      <svg
                                        className="w-2 h-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M9 5l7 7-7 7"
                                        />
                                      </svg>
                                      Click "Load" to view full content
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Enhanced Footer */}
                        <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-200/50 dark:border-slate-600/50">
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {templates.length} template
                            {templates.length !== 1 ? "s" : ""} available
                          </div>
                          <button
                            type="button"
                            className="px-4 py-2 bg-gradient-to-r from-slate-100/80 to-slate-200/60 dark:from-slate-700/80 dark:to-slate-600/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-slate-200/80 hover:to-slate-300/60 dark:hover:from-slate-600/80 dark:hover:to-slate-500/60 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                            onClick={() => setIsTemplateModalOpen(false)}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          {/* AI Tools Modal */}
          <Transition appear show={isAiToolsModalOpen} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-50"
              onClose={() => setIsAiToolsModalOpen(false)}
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
                    <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-3xl border border-white/40 dark:border-slate-700/40 p-6 text-left align-middle shadow-2xl shadow-slate-200/30 dark:shadow-slate-900/50 transition-all">
                      {/* Enhanced glassmorphic overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-white/20 dark:from-slate-700/30 dark:via-slate-700/10 dark:to-slate-700/20 rounded-3xl"></div>
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/5 via-indigo-400/5 to-purple-400/5 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10"></div>

                      <div className="relative z-10">
                        {/* Enhanced Header */}
                        <div className="flex items-center justify-between mb-5">
                          <Dialog.Title
                            as="h3"
                            className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-3"
                          >
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 shadow-lg shadow-blue-500/20">
                              <svg
                                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            </div>
                            <span>
                              {
                                aiToolsData[
                                  selectedToolCategory as keyof typeof aiToolsData
                                ]?.title
                              }
                            </span>
                          </Dialog.Title>
                          <button
                            onClick={() => setIsAiToolsModalOpen(false)}
                            className="p-2 rounded-xl bg-gradient-to-br from-slate-100/50 to-slate-200/30 dark:from-slate-700/30 dark:to-slate-600/20 backdrop-blur-sm border border-slate-200/50 dark:border-slate-600/50 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all duration-300 hover:bg-gradient-to-br hover:from-slate-200/60 hover:to-slate-300/40 dark:hover:from-slate-600/40 dark:hover:to-slate-500/30 hover:scale-105 shadow-lg hover:shadow-xl"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
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

                        {/* Enhanced Description */}
                        <div className="mb-4">
                          <div className="p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-900/30 dark:to-indigo-900/20 backdrop-blur-sm rounded-xl border border-blue-200/40 dark:border-blue-700/40">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              {
                                aiToolsData[
                                  selectedToolCategory as keyof typeof aiToolsData
                                ]?.description
                              }
                            </p>
                          </div>
                        </div>

                        {/* Enhanced Content Area */}
                        <div className="max-h-[50vh] overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-300/50 dark:scrollbar-thumb-slate-600/50 scrollbar-track-transparent pr-2">
                          {aiToolsData[
                            selectedToolCategory as keyof typeof aiToolsData
                          ]?.examples.map((tool, index) => (
                            <div
                              key={index}
                              className="group p-3 bg-gradient-to-r from-slate-50/60 to-slate-100/40 dark:from-slate-700/40 dark:to-slate-600/30 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-slate-600/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] hover:bg-gradient-to-r hover:from-slate-100/70 hover:to-slate-200/50 dark:hover:from-slate-600/50 dark:hover:to-slate-500/40"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1 pr-3">
                                  {tool.name}
                                </h4>
                                <button
                                  onClick={() => copyToClipboard(tool.example)}
                                  className="px-3 py-1.5 bg-gradient-to-r from-green-500/90 to-emerald-500/90 hover:from-green-600/90 hover:to-emerald-600/90 text-white rounded-lg transition-all duration-300 text-xs flex items-center gap-2 shadow-lg shadow-green-500/30 hover:scale-105 flex-shrink-0"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                                  </svg>
                                  Copy
                                </button>
                              </div>

                              <div className="mb-3">
                                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/40 dark:border-slate-600/40 rounded-lg p-3 font-mono text-xs text-slate-800 dark:text-slate-200 break-all shadow-inner">
                                  {tool.example}
                                </div>
                              </div>

                              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                                {tool.description}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Enhanced Usage Instructions */}
                        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-900/30 dark:to-indigo-900/20 backdrop-blur-xl rounded-xl border border-blue-200/40 dark:border-blue-700/40">
                          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 text-sm flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            How to Use These Tools
                          </h4>
                          <div className="space-y-2 text-xs text-blue-600 dark:text-blue-300">
                            <p>
                              <strong>Copy & Paste Instructions:</strong> Copy
                              any example above and paste it directly into your
                              chat with the AI. The AI will understand what you
                              want and use the appropriate function.
                            </p>
                            <p>
                              <strong>Pro Tip:</strong> You can modify the
                              examples by changing dates, names, or other
                              details to match your specific needs before
                              copying them.
                            </p>
                          </div>
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          <ToastContainer />
        </div>
      </div>
    </div>
  );
};

export default Main;