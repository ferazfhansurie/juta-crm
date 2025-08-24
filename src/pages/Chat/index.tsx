import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Fragment,
} from "react";
import logoImage from "@/assets/images/logo.png";
import axios, { AxiosError } from "axios";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { Dialog, Menu } from "@/components/Base/Headless";
import { format } from "date-fns";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { rateLimiter } from "../../utils/rate";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useLocation } from "react-router-dom";
import { useContacts } from "../../contact";
import LZString from "lz-string";
import {
  handleBotStatusUpdate,
  handleContactAssignmentUpdate,
  handleContactTagsUpdate,
} from "../../utils/websocketHandlers";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import Tippy from "@/components/Base/Tippy";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { ReactMic } from "react-mic";
import { useNavigate } from "react-router-dom";
import noti from "../../assets/audio/noti.mp3";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { Lock, MessageCircle } from "lucide-react";
import {
  Menu as ContextMenu,
  Item,
  Separator,
  useContextMenu,
} from "react-contexify";
import "react-contexify/dist/ReactContexify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ReactPaginate from "react-paginate";
import { getFileTypeFromMimeType } from "../../utils/fileUtils";
import { Transition } from "@headlessui/react";
import VirtualContactList from "../../components/VirtualContactList";
import SearchModal from "@/components/SearchModal";
import { time } from "console";

interface Label {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface Contact {
  [x: string]: any;
  conversation_id?: string | null;
  additionalEmails?: string[] | null;
  address1?: string | null;
  assignedTo?: string[] | null;
  businessId?: string | null;
  city?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  country?: string | null;
  customFields?: any[] | null;
  dateAdded?: string | null;
  dateOfBirth?: string | null;
  dateUpdated?: string | null;
  dnd?: boolean | null;
  dndSettings?: any | null;
  email?: string | null;
  firstName?: string | null;
  followers?: string[] | null;
  id?: string | null;
  lastName?: string | null;
  locationId?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  source?: string | null;
  state?: string | null;
  tags?: string[] | null;
  type?: string | null;
  website?: string | null;
  chat?: Chat[] | null;
  last_message?: Message | null;
  chat_id?: string | null;
  unreadCount?: number | null;
  pinned?: boolean | null;
  profilePicUrl?: string;
  phoneIndex?: number | null;
  points?: number | null;
  phoneIndexes?: number[] | null;
  notes?: string | null;
}

export interface Message {
  created_at: any;
  chat_id: string;
  dateAdded?: number | 0;
  timestamp: number | 0;
  id: string;
  text?: { body: string | ""; context?: any };
  from_me?: boolean;
  from_name?: string | "";
  createdAt?: number;
  type?: string;
  from?: string | "";
  author?: string;
  phoneIndex: number;
  status?: "sent" | "failed" | "sending";
  error?: string;
  image?: {
    link?: string;
    caption?: string;
    url?: string;
    data?: string;
    mimetype?: string;
  };
  video?: { link?: string; caption?: string };
  gif?: { link?: string; caption?: string };
  audio?: { link?: string; caption?: string; data?: string; mimetype?: string };
  ptt?: { link?: string; caption?: string; data?: string; mimetype?: string };
  voice?: { link?: string; caption?: string };
  document?: {
    file_name: string;
    file_size: number;
    filename: string;
    id: string;
    link?: string;
    mime_type: string;
    page_count: number;
    preview: string;
    sha256: string;
    data?: string;
    caption?: string;
    mimetype?: string;
    fileSize?: number;
  };
  link_preview?: {
    link: string;
    title: string;
    description: string;
    body: string;
    preview: string;
  };
  sticker?: { link: string; emoji: string; mimetype: string; data: string };
  location?: {
    latitude: number;
    longitude: number;
    name: string;
    description: string;
  };
  live_location?: { latitude: number; longitude: number; name: string };
  contact?: { name: string; phone: string };
  contact_list?: { contacts: { name: string; phone: string }[] };
  interactive?: any;
  poll?: any;
  userName?: string;
  hsm?: any;
  edited?: boolean;
  system?: any;
  order?: any;
  group_invite?: any;
  admin_invite?: any;
  product?: any;
  catalog?: any;
  product_items?: any;
  action?: any;
  context?: any;
  reactions?: { emoji: string; from_name: string }[];
  name?: string;
  isPrivateNote?: boolean;
  call_log?: any;
}

interface Chat {
  id?: string;
  name?: string;
  last_message?: Message | null;
  labels?: Label[];
  contact_id?: string;
  tags?: string[];
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  phoneNumber?: string;
  phone?: string;
  group?: string;
  quotaLeads?: number;
  assignedContacts?: number;
  // Add other properties as needed
}
interface Tag {
  id: string;
  name: string;
}
interface UserData {
  companyId: string;
  name: string;
  role: string;
  [key: string]: any; // Add other properties as needed
}
// Define the QuickReply interface
interface QuickReply {
  id: string;
  keyword?: string;
  text: string;
  type?: string;
  category?: string;
  documents?:
    | {
        name: string;
        type: string;
        size: number;
        url: string;
        lastModified: number;
      }[]
    | null;
  images?: string[] | null;
  videos?:
    | {
        name: string;
        type: string;
        size: number;
        url: string;
        lastModified: number;
        thumbnail?: string;
      }[]
    | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  // Computed properties for compatibility
  title?: string;
  description?: string;
}
interface Category {
  id: string;
  name: string;
  createdAt: any;
  createdBy: string;
}
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}
interface Template {
  id: string;
  triggerTags?: string[];
  name?: string;
  messages?: {
    text: string;
    delay: number;
    delayUnit: string;
  }[];
  createdAt?: any;
  updatedAt?: any;
}
interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: File | null;
  onSend: (document: File | null, caption: string) => void;
  type: string;
  initialCaption?: string; // Add this prop
}
interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
}
type Notification = {
  from: string;
  text: {
    body: string;
  };
  from_name: string;
  timestamp: number;
  chat_id: string;
  type: string;
};

//testing
interface ScheduledMessage {
  messageContent: string;
  id?: string;
  chatIds: string[];
  message: string;
  messages?: Array<{
    [x: string]: string | boolean; // Changed to allow boolean values for isMain
    text: string;
  }>;
  messageDelays?: number[];
  mediaUrl?: string;
  documentUrl?: string;
  mimeType?: string;
  fileName?: string;
  scheduledTime: Date | string;
  batchQuantity: number;
  repeatInterval: number;
  repeatUnit: "minutes" | "hours" | "days";
  additionalInfo: {
    contactName?: string;
    phone?: string;
    email?: string;
    // ... any other contact fields you want to include
  };
  status: "scheduled" | "sent" | "failed";
  createdAt: Date | string;
  sentAt?: Date | string;
  error?: string;
  count?: number;
  v2?: boolean;
  whapiToken?: string;
  minDelay: number;
  maxDelay: number;
  activateSleep: boolean;
  sleepAfterMessages: number | null;
  sleepDuration: number | null;
  activeHours: {
    start: string;
    end: string;
  };
  infiniteLoop: boolean;
  numberOfBatches: number;
  processedMessages?: {
    chatId: string;
    message: string;
    contactData?: {
      contactName: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      vehicleNumber: string;
      branch: string;
      expiryDate: string;
      ic: string;
    };
  }[];
  templateData?: {
    hasPlaceholders: boolean;
    placeholdersUsed: string[];
  };
  isConsolidated?: boolean; // Added to indicate the new message structure
}

interface EditMessagePopupProps {
  editedMessageText: string;
  setEditedMessageText: (value: string) => void;
  handleEditMessage: () => void;
  cancelEditMessage: () => void;
}

interface QRCodeData {
  phoneIndex: number;
  status: string;
  qrCode: string | null;
}
interface Phone {
  phoneIndex: number;
  status: string;
  qrCode: string | null;
  phoneInfo: string;
}

interface BotStatusResponse {
  qrCode: string | null;
  status: string;
  phoneInfo: boolean;
  phones: Phone[];
  companyId: string;
  v2: boolean;
  trialEndDate: string | null;
  apiUrl: string | null;
  phoneCount: number;
}

const DatePickerComponent = DatePicker as any;

const ReactMicComponent = ReactMic as any;

const DocumentModal: React.FC<DocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  onSend,
  type,
  initialCaption,
}) => {
  const [caption, setCaption] = useState(initialCaption); // Initialize with initialCaption

  useEffect(() => {
    // Update caption when initialCaption changes
    setCaption(initialCaption);
  }, [initialCaption]);

  const handleSendClick = () => {
    if (document) {
      onSend(document, caption || "");
      onClose();
    }
    setCaption("");
  };

  if (!isOpen || !document) return null;

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
            <Lucide icon="X" className="w-6 h-6" />
          </button>
        </div>
        <div
          className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4 flex justify-center items-center"
          style={{ height: "90%" }}
        >
          {document.type === "application/pdf" ? (
            <iframe
              src={URL.createObjectURL(document)}
              width="100%"
              height="100%"
              title="PDF Document"
              className="border rounded"
            />
          ) : (
            <div className="text-center">
              <Lucide
                icon="File"
                className="w-20 h-20 mb-2 mx-auto text-gray-600 dark:text-gray-400"
              />
              <p className="text-gray-800 dark:text-gray-200 font-semibold">
                {document.name}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {(document.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-2">
          <input
            type="text"
            placeholder="Add a caption"
            className="flex-grow bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition duration-200"
            onClick={handleSendClick}
          >
            <Lucide icon="Send" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!isOpen) return null;

  const handleImageClick = () => {
    setZoomLevel((prevZoomLevel) => (prevZoomLevel === 1 ? 2 : 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={onClose}
    >
      <div
        className="relative mt-10 p-2 bg-white rounded-lg shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Modal Content"
          className="rounded-md cursor-pointer"
          style={{
            transform: `scale(${zoomLevel})`,
            transition: "transform 0.3s",
            maxWidth: "100%",
            maxHeight: "100%",
          }}
          onClick={handleImageClick}
        />
        <a
          href={imageUrl}
          download
          className="mt-2 block text-center text-blue-500 hover:underline"
        >
          Save Image
        </a>
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const PDFModal = ({ isOpen, onClose, pdfUrl }: PDFModalProps) => {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <Dialog.Panel className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed flex inset-0 bg-black/70 transition-opacity"
          onClick={onClose}
        />

        <div className="relative mt-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-5xl h-4/5">
          <button
            className="absolute top-4 right-4 text-white bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full p-2 transition-colors"
            onClick={onClose}
          >
            <Lucide icon="X" className="w-6 h-6" />
          </button>

          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            title="PDF Document"
            className="border rounded"
          />
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

interface ContactsState {
  items: Contact[];
  hasMore: boolean;
  lastVisible: any;
  isLoading: boolean;
  currentPage: number;
}

// Helper function to extract the most recent timestamp from a contact
const getContactTimestamp = (contact: Contact): number => {
  let timestamp = 0;
  let source = "none";

  // Try to get timestamp from last message first
  if (contact.last_message) {
    if (contact.last_message.createdAt) {
      timestamp = new Date(contact.last_message.createdAt).getTime();
      source = "last_message.createdAt";
    } else if (contact.last_message.timestamp) {
      // Handle both milliseconds and seconds timestamps
      const ts = contact.last_message.timestamp;
      timestamp = ts > 1000000000000 ? ts : ts * 1000; // If timestamp is in seconds, convert to milliseconds
      source = "last_message.timestamp";
    } else if (contact.last_message.dateAdded) {
      timestamp = new Date(contact.last_message.dateAdded).getTime();
      source = "last_message.dateAdded";
    }
  }

  // Fallback to contact-level timestamps if no message timestamp
  if (timestamp === 0) {
    if (contact.dateUpdated) {
      timestamp = new Date(contact.dateUpdated).getTime();
      source = "contact.dateUpdated";
    } else if (contact.dateAdded) {
      timestamp = new Date(contact.dateAdded).getTime();
      source = "contact.dateAdded";
    }
  }

  // Debug logging for problematic cases
 

  return timestamp || 0; // No timestamp available
};

function Main() {
  // Initial state setup with localStorage
  const { contacts: contextContacts, isLoading: contextLoading } =
    useContacts();
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const storedContacts = localStorage.getItem("contacts");
    if (storedContacts) {
      try {
        return JSON.parse(LZString.decompress(storedContacts)!);
      } catch (error) {
        console.error("Error parsing stored contacts:", error);
        return [];
      }
    }
    return [];
  });

  // Sync context contacts to local state
  useEffect(() => {
    if (contextContacts && contextContacts.length > 0) {
      setContacts(contextContacts as Contact[]);
      // Also update localStorage
      try {
        const compressedContacts = LZString.compress(
          JSON.stringify(contextContacts)
        );
        localStorage.setItem("contacts", compressedContacts);
      } catch (error) {
        console.error("Error saving contacts to localStorage:", error);
      }
    }
  }, [contextContacts]);

  // Additional state for NeonDB auth
  const [companyId, setCompanyId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [phoneOptions, setPhoneOptions] = useState<number[]>([]);
  const [baseUrl] = useState<string>("https://juta-dev.ngrok.dev");

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]); // Store all messages for filtering
  const [newMessage, setNewMessage] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading2, setLoading] = useState<boolean>(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQuery2, setSearchQuery2] = useState("");
  const [forwardDialogTags, setForwardDialogTags] = useState<string[]>([]);
  const [filteredForwardingContacts, setFilteredForwardingContacts] = useState<
    Contact[]
  >([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const baseMessageClass =
    "flex flex-col max-w-[auto] min-w-[auto] px-2 py-1.5 text-white";
  const myMessageClass = `flex flex-col max-w-[auto] min-w-[auto] px-2 py-1.5 self-end ml-auto text-left mb-0.5 mr-6 group`;
  const otherMessageClass = `${baseMessageClass} bg-white dark:bg-gray-800 self-start text-left mt-0.5 ml-2 group`;
  const myFirstMessageClass = `${myMessageClass} rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-2xl mt-1`;
  const myMiddleMessageClass = `${myMessageClass} rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-2xl`;
  const myLastMessageClass = `${myMessageClass} rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-2xl mb-1`;
  const otherFirstMessageClass = `${otherMessageClass} rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-2xl mt-1`;
  const otherMiddleMessageClass = `${otherMessageClass} rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-2xl`;
  const otherLastMessageClass = `${otherMessageClass} rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-2xl mb-1`;
  const privateNoteClass = `${baseMessageClass} bg-yellow-500 dark:bg-yellow-900 self-start text-left mt-1 ml-2 group rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-2xl`;
  const [messageMode, setMessageMode] = useState("reply");
  const myMessageTextClass = "text-black";
  const otherMessageTextClass = "text-black dark:text-white";
  const [activeTags, setActiveTags] = useState<string[]>(["all"]);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [selectedContactsForForwarding, setSelectedContactsForForwarding] =
    useState<Contact[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState<boolean>(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [newQuickReply, setNewQuickReply] = useState<string>("");
  const [newQuickReplyKeyword, setNewQuickReplyKeyword] = useState("");
  const [filteredContactsForForwarding, setFilteredContactsForForwarding] =
    useState<Contact[]>(contacts);
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const messageListRef = useRef<HTMLDivElement>(null);
  const prevNotificationsRef = useRef<number | null>(null);
  const [phoneCount, setPhoneCount] = useState<number>(1);
  const isInitialMount = useRef(true);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedMessageText, setEditedMessageText] = useState<string>("");
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isPDFModalOpen, setPDFModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isImageModalOpen2, setImageModalOpen2] = useState(false);
  const [pastedImageUrl, setPastedImageUrl] = useState<
    string | string[] | null
  >("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [contactsPerPage] = useState(20); // Show 20 contacts per page
  const contactListRef = useRef<HTMLDivElement>(null);
  const [response, setResponse] = useState<string>("");
  const [qrCodeImage, setQrCodeImage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [isAllBotsEnabled, setIsAllBotsEnabled] = useState(true);
  const [pinnedTags, setPinnedTags] = useState<string[]>([]);
  const [employeeTags, setEmployeeTags] = useState<string[]>([]);
  const [otherTags, setOtherTags] = useState<string[]>([]);
  const [tagsError, setTagsError] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);
  const [isV2User, setIsV2User] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [visibleTags, setVisibleTags] = useState<typeof tagList>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [privateNotes, setPrivateNotes] = useState<
    Record<string, Array<{ id: string; text: string; timestamp: number }>>
  >({});
  const [isPrivateNotesExpanded, setIsPrivateNotesExpanded] = useState(false);
  const privateNoteRef = useRef<HTMLDivElement>(null);
  const [newPrivateNote, setNewPrivateNote] = useState("");
  const [isPrivateNotesMentionOpen, setIsPrivateNotesMentionOpen] =
    useState(false);
  const [showAllContacts, setShowAllContacts] = useState(true);
  const [showUnreadContacts, setShowUnreadContacts] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isChatActive, setIsChatActive] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [editedName, setEditedName] = useState("");
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newContactNumber, setNewContactNumber] = useState("");
  const [showMineContacts, setShowMineContacts] = useState(false);
  const [showGroupContacts, setShowGroupContacts] = useState(false);
  const [showUnassignedContacts, setShowUnassignedContacts] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderText, setReminderText] = useState("");

  // Add state variables for sync/delete functionality
  const [syncDropdownOpen, setSyncDropdownOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Add state variables for message polling
  const [isPolling, setIsPolling] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserName = userData?.name || "";
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [messageSearchResults, setMessageSearchResults] = useState<any[]>([]);
  const messageSearchInputRef = useRef<HTMLInputElement>(null);
  const [showSnoozedContacts, setShowSnoozedContacts] = useState(false);
  const [blastMessageModal, setBlastMessageModal] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [blastStartTime, setBlastStartTime] = useState<Date | null>(null);
  const [blastStartDate, setBlastStartDate] = useState<Date>(new Date());
  const [batchQuantity, setBatchQuantity] = useState<number>(10);
  const [repeatInterval, setRepeatInterval] = useState<number>(0);
  const [repeatUnit, setRepeatUnit] = useState<"minutes" | "hours" | "days">(
    "days"
  );
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeQuickReplyTab, setActiveQuickReplyTab] = useState<
    "all" | "self"
  >("all");
  const [newQuickReplyType, setNewQuickReplyType] = useState<"all" | "self">(
    "all"
  );

  const quickRepliesRef = useRef<HTMLDivElement>(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [quickReplyFilter, setQuickReplyFilter] = useState("");
  const [phoneNames, setPhoneNames] = useState<Record<number, string>>({});
  const [userPhone, setUserPhone] = useState<number | null>(null);
  const [activeNotifications, setActiveNotifications] = useState<
    (string | number)[]
  >([]);
  const [isAssistantAvailable, setIsAssistantAvailable] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [caption, setCaption] = useState(""); // Add this line to define setCaption

  // Add new state variables for lazy loading pagination
  const [loadedContacts, setLoadedContacts] = useState<Contact[]>([]);
  const [isLoadingMoreContacts, setIsLoadingMoreContacts] = useState(false);
  const [hasMoreContacts, setHasMoreContacts] = useState(true);
  const [lastLoadedPage, setLastLoadedPage] = useState(-1);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [isTagFiltering, setIsTagFiltering] = useState(false);

  // Real progress tracking for loading contacts
  const [realLoadingProgress, setRealLoadingProgress] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState({
    userConfig: false,
    contactsFetch: false,
    contactsProcess: false,
    complete: false,
  });

  // Add back missing state variables
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecordingPopupOpen, setIsRecordingPopupOpen] = useState(false);
  const [selectedDocumentURL, setSelectedDocumentURL] = useState<string | null>(
    null
  );
  const [documentCaption, setDocumentCaption] = useState("");
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [showAllForwardTags, setShowAllForwardTags] = useState(false);
  const [visibleForwardTags, setVisibleForwardTags] = useState<typeof tagList>(
    []
  );
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<any>(null);
  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchPage, setGlobalSearchPage] = useState(1);
  const [totalGlobalSearchPages, setTotalGlobalSearchPages] = useState(1);
  const [aiMessageUsage, setAiMessageUsage] = useState<number>(0);
  const [blastedMessageUsage, setBlastedMessageUsage] = useState<number>(0);
  const [quotaAIMessage, setQuotaAIMessage] = useState<number>(0);
  const [quotaBlastedMessage, setQuotaBlastedMessage] = useState<number>(0);
  const [companyPlan, setCompanyPlan] = useState<string>("");

  // Usage Dashboard states
  const [isUsageDashboardOpen, setIsUsageDashboardOpen] =
    useState<boolean>(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState<boolean>(false);
  const [isTopUpAmountModalOpen, setIsTopUpAmountModalOpen] = useState<boolean>(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(10);
  const [isTopUpLoading, setIsTopUpLoading] = useState<boolean>(false);
  
  // Top-up calculator functions
  const calculateTopUpPrice = () => {
    return topUpAmount;
  };

  const calculateAIResponses = () => {
    // RM 10 = 100 AI responses, so rate is 10 AI responses per RM 1
    return topUpAmount * 10;
  };

  const handleTopUpPurchase = async () => {
    if (topUpAmount < 1) return;
    
    setIsTopUpLoading(true);
    
    try {
      console.log('Sending topup request with companyId:', companyId);
      const response = await fetch(`${baseUrl}/api/payex/create-topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: topUpAmount,
          aiResponses: calculateAIResponses(),
          email: localStorage.getItem('userEmail'),
          companyId: companyId
        }),
      });

      const data = await response.json();
console.log(data);
      if (response.ok && data.success) {
        if (data.paymentUrl) {
          // Store payment intent ID for tracking
          localStorage.setItem('pendingTopUpId', data.paymentIntentId);
          localStorage.setItem('pendingTopUpAmount', topUpAmount.toString());
          localStorage.setItem('pendingTopUpResponses', data.aiResponses.toString());
          
          // Show success message before redirect
          const message = data.message || `Payment initiated! You will receive ${data.aiResponses} AI responses for RM ${topUpAmount}.`;
          //alert(message);
          
          // Redirect to PayEx payment page
          // The backend should already include the return URL with payment ID
          window.open(data.paymentUrl, '_blank');
        } else {
          // Development mode or no payment URL
          toast.success(`Top-up created successfully! ${data.message || 'You will receive ' + data.aiResponses + ' AI responses.'}`);
        }
      } else {
        console.error('Top-up payment creation failed:', data.error);
        const errorMessage = data.details || data.error || 'Unknown error occurred';
        toast.error(`Payment creation failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Top-up payment error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsTopUpLoading(false);
    }
  };

    // Function to refresh user's quota display
  const refreshUserQuota = async () => {
    try {
      console.log('Refreshing user quota display...');
      setQuotaLoading(true);
      
      if (!companyId) {
        console.log('No company ID available, skipping quota refresh');
        return;
      }

      // Fetch current quota from the backend
      const response = await fetch(`${baseUrl}/api/usage/quota?companyId=${companyId}`);
      const data = await response.json();
      console.log("usagee",data);
      if (data.success) {
        console.log('Quota data received:', data.quota);
        
        // Update the existing quota state variables
        const { limit, used, remaining, percentageUsed } = data.quota;
        
        // Update AI message quota
        setQuotaAIMessage(limit);
        setAiMessageUsage(used);
        
        // Store full quota data for other uses - ensure consistent structure
        setQuotaData({
          limit: limit,
          used: used,
          remaining: remaining,
          percentageUsed: percentageUsed
        });
        
        // Show success toast with quota info
        toast.success(`Quota refreshed: ${aiMessageUsage}/${limit} AI responses used (${percentageUsed}% used)`);
        
      } else {
        console.error('Failed to fetch quota:', data.error);
        toast.error('Failed to refresh quota information');
      }
    } catch (error) {
      console.error('Error refreshing quota:', error);
      toast.error('Error refreshing quota information');
    } finally {
      setQuotaLoading(false);
    }
  };

  // Alternative function to get quota by email
  const getQuotaByEmail = async (email: string) => {
    try {
      console.log('Fetching quota by email:', email);
      
      const response = await fetch(`${baseUrl}/api/usage/quota?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Quota data by email received:', data.quota);
        return data.quota;
      } else {
        console.error('Failed to fetch quota by email:', data.error);
        toast.error('Failed to fetch quota information');
        return null;
      }
    } catch (error) {
      console.error('Error fetching quota by email:', error);
      toast.error('Error fetching quota information');
      return null;
    }
  };

  // Function to get usage history
  const getUsageHistory = async (months: number = 6) => {
    try {
      console.log('Fetching usage history for', months, 'months');
      
      if (!companyId) {
        console.log('No company ID available, skipping usage history');
        return null;
      }

      const response = await fetch(`${baseUrl}/api/usage/history?companyId=${companyId}&months=${months}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Usage history received:', data.usageHistory);
        return data;
      } else {
        console.error('Failed to fetch usage history:', data.error);
        toast.error('Failed to fetch usage history');
        return null;
      }
    } catch (error) {
      console.error('Error fetching usage history:', error);
      toast.error('Error fetching usage history');
      return null;
    }
  };



  // Check payment status when component mounts or when returning from PayEx
  useEffect(() => {
    const checkPaymentStatus = async () => {
      // Check if there's a payment ID in the URL (returning from PayEx)
      const urlParams = new URLSearchParams(window.location.search);
      const paymentId = urlParams.get('payment_intent') || urlParams.get('reference_number');
      const companyId = urlParams.get('company_id');
      const paymentStatus = urlParams.get('status');
      
      if (paymentId) {
        try {
          console.log('Payment return detected:', { paymentId, companyId, paymentStatus });
          
          // If status is already success from URL, handle it directly
          if (paymentStatus === 'success') {
            console.log('Payment success confirmed from URL parameters');
            // Show success message
            toast.success('Payment successful! Your AI quota has been updated.');
            // Clear any pending payment data
            localStorage.removeItem('pendingTopUpId');
            localStorage.removeItem('pendingTopUpAmount');
            localStorage.removeItem('pendingTopUpResponses');
            // Refresh user's quota display
            refreshUserQuota();
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('Payment completed successfully!');
            return;
          }
          
          // If status is not success, check with backend
          console.log('Checking payment status for ID:', paymentId);
          const response = await fetch(`${baseUrl}/api/payex/check-status/${paymentId}`);
          const data = await response.json();
          
          if (data.status === 'completed' || data.status === 'success') {
            // Show success message
            toast.success('Payment successful! Your AI quota has been updated.');
            // Clear any pending payment data
            localStorage.removeItem('pendingTopUpAmount');
            localStorage.removeItem('pendingTopUpResponses');
            // Refresh user's quota display
            refreshUserQuota();
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('Payment completed successfully!');
          } else if (data.status === 'failed') {
            toast.error('Payment failed. Please try again or contact support.');
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.log('Payment status:', data.status);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
          toast.error('Error checking payment status. Please contact support.');
        }
      } else {
        // Check if there's a pending payment in localStorage
        const pendingTopUpId = localStorage.getItem('pendingTopUpId');
        if (pendingTopUpId) {
          try {
            // Check if payment was completed
            const response = await fetch(`${baseUrl}/api/payex/quota-status/${companyId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                // Clear pending payment data
                localStorage.removeItem('pendingTopUpId');
                localStorage.removeItem('pendingTopUpAmount');
                localStorage.removeItem('pendingTopUpResponses');
                
                // Refresh usage data
                refreshUserQuota();
                console.log('Payment completed successfully!');
              }
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        }
      }
    };

    checkPaymentStatus();
  }, [companyId]);



  const [dailyUsageData, setDailyUsageData] = useState<any[]>([]);
  const [isLoadingUsageData, setIsLoadingUsageData] = useState<boolean>(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoCaption, setVideoCaption] = useState("");
  const [trialExpired, setTrialExpired] = useState(false);
  const [minDelay, setMinDelay] = useState(1);
  const [maxDelay, setMaxDelay] = useState(2);
  const [activateSleep, setActivateSleep] = useState(false);
  const [sleepAfterMessages, setSleepAfterMessages] = useState(20);
  const [sleepDuration, setSleepDuration] = useState(5);
  const [wsVersion, setWsVersion] = useState(0);
  const [scheduledMessages, setScheduledMessages] = useState<
    ScheduledMessage[]
  >([]);
  const [currentScheduledMessage, setCurrentScheduledMessage] =
    useState<ScheduledMessage | null>(null);
  const [editScheduledMessageModal, setEditScheduledMessageModal] =
    useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0);
  const [wsError, setWsError] = useState<string | null>(null);
  const maxReconnectAttempts = 5;
  
  // Quota state variables
  const [quotaData, setQuotaData] = useState<any>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(
    null
  );
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [quickReplyCategory, setQuickReplyCategory] = useState<string>("all");
  const [contactsState, setContactsState] = useState<ContactsState>({
    items: [],
    hasMore: true,
    lastVisible: null,
    isLoading: false,
    currentPage: 1,
  });
  const CONTACTS_PER_PAGE = 50;
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const planConfig = {
    free: {
      aiMessages: 100,
      contacts: 100,
      title: "Free Plan",
    },
    enterprise: {
      aiMessages: 5000,
      contacts: 10000,
      title: "Enterprise Plan",
    },
    pro: {
      aiMessages: 20000,
      contacts: 50000,
      title: "Pro Plan",
    },
  };
  const getCurrentPlanLimits = () => {
    const plan = companyPlan.toLowerCase();
    return planConfig[plan as keyof typeof planConfig] || planConfig.free;
  };

  const currentPlanLimits = getCurrentPlanLimits();

  // PayEx payment handler
  const handlePayExPayment = async (planType: string, amount: number) => {
    try {
      console.log('Sending payment request with companyId:', companyId);
      // Call your backend API to handle PayEx integration
      const response = await fetch(`${baseUrl}/api/payex/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          amount,
          email: localStorage.getItem('userEmail'),
          companyId: companyId
        }),
      });

      const data = await response.json();

      if (response.ok && data.paymentUrl) {
        // Redirect to PayEx payment page
        // The backend should already include the return URL with payment ID
        window.location.href = data.paymentUrl;
      } else {
        console.error('Payment creation failed:', data.error);
        toast.error(`Payment creation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment error occurred. Please try again.');
    }
  };

  // Initialize user context from localStorage and NeonDB
  useEffect(() => {
    // Use user info from localStorage (set during API login)
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
      try {
        const email = userEmail;
        if (email) {
          (async () => {
            try {
              const response = await fetch(
                `${baseUrl}/api/user-context?email=${email}`
              );
              if (!response.ok) throw new Error("Failed to fetch user context");
              const data = await response.json();
              setCompanyId(data.companyId);
              setCurrentUserRole(data.role);
              setUserRole(data.role);
              setUserData({
                email: email,
                companyId: data.companyId,
                role: data.role,
                name: data.name,
                phone: data.phone,
                viewEmployee: data.viewEmployee,
              });

              // Process employee list
              const employeeListData: Employee[] = data.employees.map(
                (employee: any) => ({
                  id: employee.id,
                  name: employee.name,
                  email: employee.email || employee.id,
                  role: employee.role,
                  employeeId: employee.employeeId,
                  phoneNumber: employee.phoneNumber,
                })
              );
              setEmployeeList(employeeListData);
            } catch (error) {
              console.error("Error fetching user data:", error);
            }
          })();
        }
      } catch (e) {
        console.error("Invalid userData in localStorage");
      }
    }
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const email = getCurrentUserEmail();
        if (!email || !companyId) return;

        const response = await fetch(
          `${baseUrl}/api/quick-reply-categories?companyId=${companyId}`
        );
        if (!response.ok) return;

        const data = await response.json();
        const fetchedCategories = data.categories || [];
        setCategories(["all", ...fetchedCategories]);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    if (companyId) {
      fetchCategories();
    }
  }, [companyId]);

  // Fetch daily usage data for the dashboard
  const fetchDailyUsageData = async () => {
    try {
      setIsLoadingUsageData(true);
      const email = getCurrentUserEmail();
      if (!email || !companyId) return;

      // Fix API endpoint to match backend expectations
      const response = await fetch(`${baseUrl}/api/daily-usage/${companyId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch usage data");
      }

      const data = await response.json();

      // Process actual API data
      const processedDailyData = [];

      // Get the last 7 days
      const today = new Date();
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split("T")[0]);
      }

      // Process each day
      for (const dateStr of last7Days) {
        const aiData = data.aiMessages?.find(
          (item: { date: string | number | Date }) =>
            new Date(item.date).toISOString().split("T")[0] === dateStr
        );
        const blastData = data.blastedMessages?.find(
          (item: { date: string | number | Date }) =>
            new Date(item.date).toISOString().split("T")[0] === dateStr
        );

        processedDailyData.push({
          date: dateStr,
          aiMessages: aiData?.usage_count || 0,
          blastMessages: blastData?.usage_count || 0,
        });
      }

      console.log("📊 [USAGE] Daily usage data:", processedDailyData);

      setDailyUsageData(processedDailyData);
    } catch (error) {
      console.error("Error fetching daily usage data:", error);
      toast.error("Failed to load usage data");

      // Fallback to mock data if API fails
      const mockDailyData = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        mockDailyData.push({
          date: date.toISOString().split("T")[0],
          aiMessages: Math.floor(Math.random() * 50) + 10,
          blastMessages: Math.floor(Math.random() * 100) + 20,
        });
      }

      setDailyUsageData(mockDailyData);
    } finally {
      setIsLoadingUsageData(false);
    }
  };

  // Open usage dashboard and fetch data
  const openUsageDashboard = () => {
    setIsUsageDashboardOpen(true);
    fetchDailyUsageData();
  };

  // Sync userPhone with userData.phone
  useEffect(() => {
    if (userData?.phone !== undefined && userData.phone !== null) {
      const phoneIndex =
        typeof userData.phone === "string"
          ? parseInt(userData.phone, 10)
          : userData.phone;
      setUserPhone(phoneIndex);
    }
  }, [userData]);

  // Add WebSocket status indicator component
  const WebSocketStatusIndicator = () => {
    if (!wsConnected) {
      return (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>Connecting...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-green-500 text-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Connected</span>
      </div>
    );
  };

  // Add polling status indicator component
  const PollingStatusIndicator = () => {
    if (!isPolling) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 text-blue-500 text-sm">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>Polling for messages...</span>
      </div>
    );
  };
  // Add reconnect button component
  const ReconnectButton = () => {
    if (wsConnected) return null;

    const handleReconnect = () => {
      if (wsConnection) {
        wsConnection.close(1000, "Manual reconnect");
      }
      setWsReconnectAttempts(0);
      setWsConnected(false);
      setWsConnection(null);
      setWsError(null);

      // This will trigger the useEffect to re-run and reconnect
      setWsVersion((v) => v + 1);
    };
    return (
      <button
        onClick={handleReconnect}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        disabled={wsReconnectAttempts >= maxReconnectAttempts}
      >
        {wsReconnectAttempts >= maxReconnectAttempts
          ? "Max retries reached"
          : "Reconnect"}
      </button>
    );
  };
  // Add WebSocket error handler
  const handleWebSocketError = (error: Event) => {
    console.error("WebSocket error:", error);
    setWsError("Connection error. Messages may not update in real-time.");
    setWsConnected(false);

    // Show toast notification to user
    toast.error("WebSocket connection lost. Attempting to reconnect...", {
      autoClose: 5000,
    });
  };
  // Add the handleNewMessage function

  const handleNewMessage = (data: any) => {
    console.log("📨 [WEBSOCKET] New message received:", data);

    try {
      // Handle both old and new message formats
      const chatId = data.chatId || data.chat_id;
      const messageContent = data.message || data.messageContent || "";
      const extractedNumber = data.extractedNumber || data.phone || "";
      const contactId = data.contactId || data.contact_id;
      const fromMe = data.fromMe || false;
      const timestamp = data.timestamp || Date.now();
      const messageType = data.messageType || data.type || "text";
      const contactName = data.contactName || data.from_name || extractedNumber;
      const currentWhapiToken = whapiToken;

      console.log("📨 [WEBSOCKET] Processed data:", {
        chatId,
        messageContent,
        extractedNumber,
        contactId,
        fromMe,
        timestamp,
        messageType,
        contactName,
      });

      // Create a proper message object that matches your Message interface
      const newMessage: Message = {
        id:
          data.messageId || data.message_id || `${Date.now()}-${Math.random()}`,
        chat_id: chatId,
        text: { body: messageContent },
        from_me: fromMe,
        from_name: contactName,
        timestamp: timestamp,
        created_at: new Date(timestamp),
        type: messageType,
        from: extractedNumber,
        author: contactName,
        phoneIndex: data.phoneIndex || 0,
        dateAdded: timestamp,
        userName: contactName,
      };

      console.log("📨 [WEBSOCKET] Created message object:", newMessage);
      console.log("📨 [WEBSOCKET] Current selected chat:", selectedChatId);
      console.log("📨 [WEBSOCKET] Message chat:", chatId);

      // If the message is for the currently viewed chat
      if (chatId === selectedChatId) {
        console.log(
          "📨 [WEBSOCKET] Message is for current chat - adding to messages"
        );

        // Add message to allMessages first
        setAllMessages((prevAllMessages) => {
          // Check if message already exists to prevent duplicates
          const messageExists = prevAllMessages.some(
            (msg) =>
              msg.id === newMessage.id ||
              (Math.abs((msg.timestamp || 0) - (newMessage.timestamp || 0)) <
                1000 &&
                msg.text?.body === newMessage.text?.body)
          );

          if (!messageExists) {
            console.log("📨 [WEBSOCKET] Adding new message to allMessages");
            return [...prevAllMessages, newMessage];
          } else {
            console.log(
              "📨 [WEBSOCKET] Message already exists in allMessages, skipping"
            );
            return prevAllMessages;
          }
        });

        // Update contact's last message for current chat as well
        if (selectedContact) {
          console.log(
            "📨 [WEBSOCKET] Updating current contact's last message:",
            selectedContact.contactName
          );

          const updateContactWithNewMessage = (contact: Contact) => {
            // Match by multiple criteria to ensure we find the right contact
            const contactMatches =
              contact.id === selectedContact.id ||
              contact.chat_id === selectedContact.chat_id ||
              contact.contact_id === selectedContact.contact_id ||
              contact.phone === selectedContact.phone;

            if (contactMatches) {
              console.log(
                "📨 [WEBSOCKET] Updating contact:",
                contact.contactName,
                "with new message:",
                messageContent
              );
              return {
                ...contact,
                last_message: newMessage,
                unreadCount: !fromMe
                  ? (contact.unreadCount || 0) + 1
                  : contact.unreadCount || 0,
              };
            }
            return contact;
          };

          setContacts((prevContacts) => {
            const updatedContacts = prevContacts.map(
              updateContactWithNewMessage
            );
            // Re-sort contacts to move the one with new message to top
            const sortedContacts = [...updatedContacts].sort((a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return getContactTimestamp(b) - getContactTimestamp(a);
            });
            console.log(
              "📨 [WEBSOCKET] Updated and re-sorted contacts for current chat"
            );
            return sortedContacts;
          });

          setLoadedContacts((prevLoadedContacts) => {
            const updatedLoadedContacts = prevLoadedContacts.map(
              updateContactWithNewMessage
            );
            // Re-sort loaded contacts to move the one with new message to top
            const sortedLoadedContacts = [...updatedLoadedContacts].sort(
              (a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return getContactTimestamp(b) - getContactTimestamp(a);
              }
            );
            console.log(
              "📨 [WEBSOCKET] Updated and re-sorted loaded contacts for current chat"
            );
            return sortedLoadedContacts;
          });

          setFilteredContacts((prevFilteredContacts) => {
            const updatedFilteredContacts = prevFilteredContacts.map(
              updateContactWithNewMessage
            );
            // Re-sort filtered contacts to move the one with new message to top
            const sortedFilteredContacts = [...updatedFilteredContacts].sort(
              (a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return getContactTimestamp(b) - getContactTimestamp(a);
              }
            );
            console.log(
              "📨 [WEBSOCKET] Updated and re-sorted filtered contacts for current chat"
            );
            return sortedFilteredContacts;
          });

          // Update localStorage for contacts
          const storedContacts = localStorage.getItem("contacts");
          if (storedContacts) {
            try {
              const decompressedContacts = JSON.parse(
                LZString.decompress(storedContacts)!
              );
              const updatedContacts = decompressedContacts.map(
                updateContactWithNewMessage
              );
              localStorage.setItem(
                "contacts",
                LZString.compress(JSON.stringify(updatedContacts))
              );
              console.log("📨 [WEBSOCKET] Updated contacts in localStorage");
            } catch (error) {
              console.error("Error updating contacts in localStorage:", error);
            }
          }
        }

        // Scroll to bottom to show new message
        setTimeout(() => {
          if (messageListRef.current) {
            messageListRef.current.scrollTop =
              messageListRef.current.scrollHeight;
          }
        }, 100);

        // Don't show notification for current chat if it's from someone else
        // Only show subtle indication
        if (!fromMe) {
          console.log("📨 [WEBSOCKET] New message in current chat");
        }
      } else {
        console.log(
          "📨 [WEBSOCKET] Message is for different chat - updating contact list"
        );

        // Message is for a different chat - update contact list only
        const updateContactWithNewMessage = (contact: Contact) => {
          // Try multiple ways to match the contact
          const contactMatches =
            contact.chat_id === chatId ||
            contact.id === contactId ||
            contact.contact_id === contactId ||
            contact.phone?.replace(/\D/g, "") ===
              extractedNumber?.replace(/\D/g, "") ||
            contact.chat_id === extractedNumber + "@c.us" ||
            contact.phone === extractedNumber;

          if (contactMatches) {
            console.log(
              "📨 [WEBSOCKET] Updating contact:",
              contact.contactName,
              "for chatId:",
              chatId,
              "contactId:",
              contactId,
              "message:",
              messageContent
            );
            return {
              ...contact,
              last_message: newMessage,
              unreadCount: !fromMe
                ? (contact.unreadCount || 0) + 1
                : contact.unreadCount || 0,
            };
          }
          return contact;
        };

        setContacts((prevContacts) => {
          const updatedContacts = prevContacts.map(updateContactWithNewMessage);
          // Re-sort contacts to move the one with new message to top
          const sortedContacts = [...updatedContacts].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return getContactTimestamp(b) - getContactTimestamp(a);
          });
          console.log(
            "📨 [WEBSOCKET] Updated and re-sorted contacts for different chat"
          );
          return sortedContacts;
        });

        setLoadedContacts((prevLoadedContacts) => {
          const updatedLoadedContacts = prevLoadedContacts.map(
            updateContactWithNewMessage
          );
          // Re-sort loaded contacts to move the one with new message to top
          const sortedLoadedContacts = [...updatedLoadedContacts].sort(
            (a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return getContactTimestamp(b) - getContactTimestamp(a);
            }
          );
          console.log(
            "📨 [WEBSOCKET] Updated and re-sorted loaded contacts for different chat"
          );
          return sortedLoadedContacts;
        });

        setFilteredContacts((prevFilteredContacts) => {
          const updatedFilteredContacts = prevFilteredContacts.map(
            updateContactWithNewMessage
          );
          // Re-sort filtered contacts to move the one with new message to top
          const sortedFilteredContacts = [...updatedFilteredContacts].sort(
            (a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return getContactTimestamp(b) - getContactTimestamp(a);
            }
          );
          console.log(
            "📨 [WEBSOCKET] Updated and re-sorted filtered contacts for different chat"
          );
          return sortedFilteredContacts;
        });

        // Update localStorage for contacts
        const storedContacts = localStorage.getItem("contacts");
        if (storedContacts) {
          try {
            const decompressedContacts = JSON.parse(
              LZString.decompress(storedContacts)!
            );
            const updatedContacts = decompressedContacts.map(
              updateContactWithNewMessage
            );
            localStorage.setItem(
              "contacts",
              LZString.compress(JSON.stringify(updatedContacts))
            );
            console.log(
              "📨 [WEBSOCKET] Updated contacts in localStorage for different chat"
            );
          } catch (error) {
            console.error("Error updating contacts in localStorage:", error);
          }
        }

        // Show notification for other chats only if not from me
        if (!fromMe) {
          console.log("📨 [WEBSOCKET] Showing notification for other chat");
          const messagePreview =
            messageContent?.substring(0, 50) || "New message";

          // Commented out toast notification for now
          // toast.info(`📱 ${contactName}: ${messagePreview}${messageContent && messageContent.length > 50 ? '...' : ''}`, {
          //   autoClose: 4000,
          //   onClick: () => {
          //     // Find and select the contact when notification is clicked
          //     const contact = contacts.find(c => c.chat_id === chatId || c.id === contactId);
          //     if (contact) {
          //       handleContactClick(contact);
          //     }
          //   }
          // });

          // // Play notification sound
          // try {
          //   if (audioRef.current) {
          //     audioRef.current.currentTime = 0;
          //     audioRef.current.play().catch(e => console.log("Could not play notification sound:", e));
          //   }
          // } catch (error) {
          //   console.log("Notification sound error:", error);
          // }
        }
      }
    } catch (error) {
      console.error("❌ [WEBSOCKET] Error processing new message:", error);
      console.error("❌ [WEBSOCKET] Raw data:", data);
    }
  };

  // Add WebSocket utility functions
  const sendWebSocketMessage = (message: any) => {
    if (wsConnection && wsConnected) {
      wsConnection.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message");
    }
  };

  // Add handleContactClick function for WebSocket notifications
  const handleContactClick = (contact: Contact) => {
    console.log("📨 [WEBSOCKET] Clicking contact from notification:", contact);
    if (contact.chat_id || contact.contact_id) {
      selectChat(contact.chat_id || contact.contact_id!, contact.id!, contact);
    }
  };

  // Send Now the Scheduled Message
  const handleSendNow = async (message: any) => {
    try {
      console.log("Sending message now:", message);
      // Get user and company data
      const email = getCurrentUserEmail();
      if (!email) throw new Error("User not authenticated");

      if (!companyId) throw new Error("Company ID not available");

      // Use the baseUrl from state or default
      const apiUrl = baseUrl;

      // Helper to determine API endpoint based on mediaUrl
      const getApiEndpoint = (mediaUrl: string | undefined, chatId: string) => {
        if (!mediaUrl)
          return `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`;
        const ext = mediaUrl.split(".").pop()?.toLowerCase();
        if (!ext)
          return `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`;
        if (["mp4", "mov", "avi", "webm"].includes(ext)) {
          return `${apiUrl}/api/v2/messages/video/${companyId}/${chatId}`;
        }
        if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) {
          return `${apiUrl}/api/v2/messages/image/${companyId}/${chatId}`;
        }
        if (
          ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)
        ) {
          return `${apiUrl}/api/v2/messages/document/${companyId}/${chatId}`;
        }
        return `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`;
      };

      // Try to get userData from employeeList or localStorage for phoneIndex/userName fallback
      let userData: any = null;
      const userDataStr = localStorage.getItem("userData");
      if (userDataStr) {
        try {
          userData = JSON.parse(userDataStr);
        } catch {}
      }

      // Derive chatIds from contactIds/contactId
      let chatIds: string[] = [];
      if (message.multiple && Array.isArray(message.contactIds)) {
        chatIds = message.contactIds
          .map((cid: string) => {
            const phone = cid.split("-")[1];
            return phone ? `${phone}@c.us` : null;
          })
          .filter(Boolean);
      } else if (!message.multiple && message.contactId) {
        const phone = message.contactId.split("-")[1];
        if (phone) chatIds = [`${phone}@c.us`];
      }

      const isConsolidated = message.isConsolidated === true;

      let contactList: Contact[] = [];
      if (isConsolidated && Array.isArray(message.contactIds)) {
        contactList = message.contactIds
          .map((cid: string) => {
            const phone = cid.split("-")[1];
            return contacts.find((c) => c.phone?.replace(/\D/g, "") === phone);
          })
          .filter(Boolean) as Contact[];
      } else if (!isConsolidated && message.contactId) {
        const phone = message.contactId.split("-")[1];
        const found = contacts.find(
          (c) => c.phone?.replace(/\D/g, "") === phone
        );
        if (found) contactList = [found];
      }

      // For each chatId, process placeholders before sending
      const sendPromises = chatIds.map(async (chatId: string, idx: number) => {
        let mainMessage =
          (isConsolidated &&
            Array.isArray(message.messages) &&
            message.messages.find((msg: any) => msg.isMain === true)) ||
          (Array.isArray(message.messages) && message.messages[0]) ||
          message;

        // Find the corresponding contact for this chatId
        let contact: Contact | undefined;
        if (contactList.length === chatIds.length) {
          contact = contactList[idx];
        } else {
          // fallback: match by phone number
          const phoneNumber = chatId.split("@")[0];
          contact = contacts.find(
            (c) => c.phone?.replace(/\D/g, "") === phoneNumber
          );
        }

        // Process message with contact data and custom fields
        let processedMessage =
          mainMessage.messageContent || mainMessage.text || "";

        if (contact) {
          processedMessage = processedMessage
            .replace(/@{contactName}/g, contact.contactName || "")
            .replace(/@{firstName}/g, contact.contactName?.split(" ")[0] || "")
            .replace(/@{lastName}/g, contact.lastName || "")
            .replace(/@{email}/g, contact.email || "")
            .replace(/@{phone}/g, contact.phone || "")
            .replace(/@{vehicleNumber}/g, contact.vehicleNumber || "")
            .replace(/@{branch}/g, contact.branch || "")
            .replace(/@{expiryDate}/g, contact.expiryDate || "")
            .replace(/@{ic}/g, contact.ic || "");

          if (contact.customFields) {
            Object.entries(contact.customFields).forEach(
              ([fieldName, value]) => {
                const placeholder = new RegExp(`@{${fieldName}}`, "g");
                processedMessage = processedMessage.replace(
                  placeholder,
                  value || ""
                );
              }
            );
          }
        }

        // If mediaUrl exists, send as media
        if (mainMessage.mediaUrl) {
          const endpoint = getApiEndpoint(mainMessage.mediaUrl, chatId);
          const body: any = {
            phoneIndex: message.phoneIndex || userData?.phone || 0,
            userName: userData?.name || email || "",
          };
          if (endpoint.includes("/video/")) {
            body.videoUrl = mainMessage.mediaUrl;
            body.caption = processedMessage;
          } else if (endpoint.includes("/image/")) {
            body.imageUrl = mainMessage.mediaUrl;
            body.caption = processedMessage;
          } else if (endpoint.includes("/document/")) {
            body.documentUrl = mainMessage.mediaUrl;
            body.filename = mainMessage.fileName || "";
            body.caption = processedMessage;
          }
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            throw new Error(`Failed to send media message to ${chatId}`);
          }
        } else {
          // No media, send as text
          const response = await fetch(
            `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: processedMessage,
                phoneIndex: message.phoneIndex || userData?.phone || 0,
                userName: userData?.name || email || "",
              }),
            }
          );
          if (!response.ok) {
            throw new Error(`Failed to send message to ${chatId}`);
          }
        }
      });
      // Delete the scheduled message
      if (message.scheduleId) {
        // Call NeonDB API to delete scheduled message using the correct endpoint
        const deleteResponse = await fetch(
          `${apiUrl}/api/schedule-message/${companyId}/${message.scheduleId}`,
          {
            method: "DELETE",
          }
        );
        if (!deleteResponse.ok) {
          console.warn("Failed to delete scheduled message from database");
        }
      }
      await Promise.all(sendPromises);
      toast.success("Messages sent successfully!");
      await fetchScheduledMessages(selectedContact.contact_id);
      return;
    } catch (error) {
      console.error("Error sending messages:", error);
      toast.error("Failed to send messages. Please try again.");
    }
  };

  const handleEditScheduledMessage = (message: ScheduledMessage) => {
    setCurrentScheduledMessage(message);
    setBlastMessage(message.message || ""); // Set the blast message to the current message text
    setEditScheduledMessageModal(true);
  };

  const handleDeleteScheduledMessage = async (messageId: string) => {
    try {
      const email = getCurrentUserEmail();
      if (!email || !companyId) return;

      // Call the backend API to delete the scheduled message
      const response = await axios.delete(
        `${baseUrl}/api/schedule-message/${companyId}/${messageId}`
      );
      if (response.status === 200) {
        setScheduledMessages(
          scheduledMessages.filter((msg) => msg.id !== messageId)
        );
        toast.success("Scheduled message deleted successfully!");
      } else {
        throw new Error("Failed to delete scheduled message.");
      }
    } catch (error) {
      console.error("Error deleting scheduled message:", error);
      toast.error("Failed to delete scheduled message.");
    }
  };

  // ... existing code ...

  useEffect(() => {
    const fetchPhoneStatuses = async () => {
      try {
        const email = getCurrentUserEmail();
        if (!email || !companyId) return;

        const botStatusResponse = await axios.get(
          `${baseUrl}/api/bot-status/${companyId}`
        );
        console.log(botStatusResponse);

        if (botStatusResponse.status === 200) {
          const data: BotStatusResponse = botStatusResponse.data;
          console.log("Bot status response data:", data);

          // Check if phones array exists before mapping
          if (data.phones && Array.isArray(data.phones)) {
            // Multiple phones: transform array to QRCodeData[]
            const qrCodesData: QRCodeData[] = data.phones.map((phone: any) => ({
              phoneIndex: phone.phoneIndex,
              status: phone.status,
              qrCode: phone.qrCode,
            }));
            console.log("Setting qrCodes for multiple phones:", qrCodesData);
            setQrCodes(qrCodesData);
          } else if (data.phoneCount === 1 && data.phoneInfo) {
            // Single phone: create QRCodeData from flat structure
            const singlePhoneData = [{
              phoneIndex: 0,
              status: data.status,
              qrCode: data.qrCode,
            }];
            console.log("Setting qrCodes for single phone:", singlePhoneData);
            setQrCodes(singlePhoneData);
          } else {
            console.log("No phone data found, setting empty qrCodes");
            setQrCodes([]);
          }
        }
      } catch (error) {
        console.error("Error fetching phone statuses:", error);
      }
    };

    // Only fetch if we have companyId
    if (companyId) {
      fetchPhoneStatuses();

      // Set up an interval to refresh the status every 10 seconds for more responsive updates
      const intervalId = setInterval(fetchPhoneStatuses, 10000);

      return () => clearInterval(intervalId);
    }
  }, [companyId]); // Add companyId as dependency

  // Additional useEffect to fetch phone status when phone names become available
  useEffect(() => {
    if (companyId && Object.keys(phoneNames).length > 0 && qrCodes.length === 0) {
      console.log("Phone names available, fetching phone status...");
      const fetchPhoneStatuses = async () => {
        try {
          const botStatusResponse = await axios.get(
            `${baseUrl}/api/bot-status/${companyId}`
          );
          console.log("Additional phone status fetch response:", botStatusResponse);

          if (botStatusResponse.status === 200) {
            const data: BotStatusResponse = botStatusResponse.data;
            console.log("Additional bot status response data:", data);

            if (data.phones && Array.isArray(data.phones)) {
              const qrCodesData: QRCodeData[] = data.phones.map((phone: any) => ({
                phoneIndex: phone.phoneIndex,
                status: phone.status,
                qrCode: phone.qrCode,
              }));
              console.log("Setting qrCodes from additional fetch:", qrCodesData);
              setQrCodes(qrCodesData);
            } else if (data.phoneCount === 1 && data.phoneInfo) {
              const singlePhoneData = [{
                phoneIndex: 0,
                status: data.status,
                qrCode: data.qrCode,
              }];
              console.log("Setting qrCodes for single phone from additional fetch:", singlePhoneData);
              setQrCodes(singlePhoneData);
            }
          }
        } catch (error) {
          console.error("Error in additional phone status fetch:", error);
        }
      };

      fetchPhoneStatuses();
    }
  }, [companyId, phoneNames, qrCodes.length]);

  // Debug useEffect to log phone status changes
  useEffect(() => {
    console.log("🔍 Phone status debug - qrCodes changed:", {
      qrCodes,
      qrCodesLength: qrCodes.length,
      phoneNames,
      phoneNamesCount: Object.keys(phoneNames).length,
      companyId
    });
  }, [qrCodes, phoneNames, companyId]);

  // Force refresh phone status when component becomes visible or user interacts
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && companyId) {
        console.log("Page became visible, refreshing phone status...");
        const fetchPhoneStatuses = async () => {
          try {
            const botStatusResponse = await axios.get(
              `${baseUrl}/api/bot-status/${companyId}`
            );
            if (botStatusResponse.status === 200) {
              const data: BotStatusResponse = botStatusResponse.data;
              if (data.phones && Array.isArray(data.phones)) {
                const qrCodesData: QRCodeData[] = data.phones.map((phone: any) => ({
                  phoneIndex: phone.phoneIndex,
                  status: phone.status,
                  qrCode: phone.qrCode,
                }));
                setQrCodes(qrCodesData);
              } else if (data.phoneCount === 1 && data.phoneInfo) {
                setQrCodes([{
                  phoneIndex: 0,
                  status: data.status,
                  qrCode: data.qrCode,
                }]);
              }
            }
          } catch (error) {
            console.error("Error refreshing phone status on visibility change:", error);
          }
        };
        fetchPhoneStatuses();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [companyId]);

  // Force phone status fetch on component mount and when dependencies change
  useEffect(() => {
    if (companyId) {
      console.log("🔄 Force fetching phone status on mount/dependency change...");
      const fetchPhoneStatuses = async () => {
        try {
          const botStatusResponse = await axios.get(
            `${baseUrl}/api/bot-status/${companyId}`
          );
          console.log("🔄 Force fetch response:", botStatusResponse);
          
          if (botStatusResponse.status === 200) {
            const data: BotStatusResponse = botStatusResponse.data;
            console.log("🔄 Force fetch data:", data);
            
            if (data.phones && Array.isArray(data.phones)) {
              const qrCodesData: QRCodeData[] = data.phones.map((phone: any) => ({
                phoneIndex: phone.phoneIndex,
                status: phone.status,
                qrCode: phone.qrCode,
              }));
              console.log("🔄 Setting qrCodes from force fetch:", qrCodesData);
              setQrCodes(qrCodesData);
            } else if (data.phoneCount === 1 && data.phoneInfo) {
              const singlePhoneData = [{
                phoneIndex: 0,
                status: data.status,
                qrCode: data.qrCode,
              }];
              console.log("🔄 Setting qrCodes for single phone from force fetch:", singlePhoneData);
              setQrCodes(singlePhoneData);
            }
          }
        } catch (error) {
          console.error("🔄 Error in force phone status fetch:", error);
        }
      };
      
      fetchPhoneStatuses();
    }
  }, [companyId, phoneNames]);

  // Fetch contacts with client-side lazy loading
  const fetchContactsWithLazyLoading = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      toast.error("No user email found");
      return;
    }

    setIsInitialLoading(true);
    setRealLoadingProgress(0);
    setLoadingSteps({
      userConfig: false,
      contactsFetch: false,
      contactsProcess: false,
      complete: false,
    });

    try {
      // Step 1: Get user config to get companyId (25%)
      setRealLoadingProgress(30);
      setLoadingSteps((prev) => ({ ...prev, userConfig: true }));

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
        toast.error("Failed to fetch user config");
        return;
      }

      setRealLoadingProgress(60);
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      // Step 2: Fetch contacts from database (50%)
      setRealLoadingProgress(80);
      setLoadingSteps((prev) => ({ ...prev, contactsFetch: true }));

      const contactsResponse = await fetch(
        `${baseUrl}/api/companies/${companyId}/contacts?email=${userEmail}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!contactsResponse.ok) {
        toast.error("Failed to fetch contacts");
        return;
      }

      setRealLoadingProgress(90);
      const data = await contactsResponse.json();

      // Step 3: Process contacts (75%)
      setRealLoadingProgress(95);
      setLoadingSteps((prev) => ({ ...prev, contactsProcess: true }));

      // Process contacts with real-time progress - ultra fast processing
      const allContacts = [];
      const totalContacts = data.contacts.length;

      // Process all contacts at once for maximum speed
      allContacts.push(
        ...data.contacts.map(
          (contact: any) =>
            ({
              ...contact,
              id: contact.id,
              chat_id: contact.chat_id,
              contactName: contact.name,
              phone: contact.phone,
              email: contact.email,
              profile: contact.profile,
              profilePicUrl: contact.profileUrl,
              tags: contact.tags,
              createdAt: contact.createdAt,
              lastUpdated: contact.lastUpdated,
              last_message: contact.last_message,
              isIndividual: contact.isIndividual,
            } as Contact)
        )
      );

      // Update progress to 100% immediately
      setRealLoadingProgress(100);
      setLoadingSteps((prev) => ({ ...prev, complete: true }));

      // Minimal delay for UI update
      await new Promise((resolve) => setTimeout(resolve, 5));

      // Set total contacts count
      setTotalContacts(allContacts.length);

      // Store all contacts but only display first 200
      // Sort contacts before setting them to ensure proper order
      const sortedContacts = [...allContacts].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return getContactTimestamp(b) - getContactTimestamp(a);
      });

      setContacts(sortedContacts);
      setLoadedContacts(sortedContacts.slice(0, 200));
      setLastLoadedPage(0);
      setHasMoreContacts(allContacts.length > 200);

      // Mark first 10 pages as loaded (200 contacts / 20 contacts per page = 10 pages)
      const initialLoadedPages = new Set<number>();
      for (let page = 0; page < 10; page++) {
        initialLoadedPages.add(page);
      }
      setLoadedPages(initialLoadedPages);

      // Step 4: Complete loading (100%)
      setRealLoadingProgress(100);
      setLoadingSteps((prev) => ({ ...prev, complete: true }));
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Error fetching contacts");
    } finally {
      setIsInitialLoading(false);
      setRealLoadingProgress(0);
      setLoadingSteps({
        userConfig: false,
        contactsFetch: false,
        contactsProcess: false,
        complete: false,
      });
    }
  };

  // Fetch contacts once on component mount (only if context contacts are empty)
  useEffect(() => {
    const fetchContactsOnce = async () => {
      // Only fetch if context contacts are empty
      if (contextContacts && contextContacts.length > 0) {
        return; // Context already has contacts
      }

      // Load contacts with lazy loading
      await fetchContactsWithLazyLoading();
    };

    // Only run once on mount
    fetchContactsOnce();
  }, []); // Empty dependency array = run only once

  // Add useEffect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (syncDropdownOpen && !target.closest(".relative")) {
        setSyncDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [syncDropdownOpen]);

  // Initial chat selection from URL

  // Add new useEffect to restore scroll position
  useEffect(() => {
    // After selecting a contact or when filtered contacts change, restore the scroll position
    const restoreScrollPosition = () => {
      if (contactListRef.current) {
        const savedScrollPosition = sessionStorage.getItem(
          "chatContactListScrollPosition"
        );
        if (savedScrollPosition) {
          contactListRef.current.scrollTop = parseInt(savedScrollPosition);
        }
      }
    };

    restoreScrollPosition();
  }, [selectedContact, filteredContacts]);

  // Update this function name
  const toggleForwardTagsVisibility = () => {
    setShowAllForwardTags(!showAllForwardTags);
  };

  // Helper function to get company data from NeonDB
  const getCompanyApiUrl = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      throw new Error("No user email found");
    }

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
    console.log("Company data:", data);
    return {
      apiUrl: data.companyData.api_url || baseUrl,
      companyId: data.userData.companyId,
    };
  };

  // Sync contact name function
  const handleSyncContactName = async () => {
    if (syncLoading) return;

    setSyncLoading(true);
    setSyncDropdownOpen(false);

    try {
      const { apiUrl, companyId } = await getCompanyApiUrl();

      if (!selectedContact.phone) {
        toast.error("Contact phone number is required for sync");
        return;
      }

      const phoneNumber = selectedContact.phone.replace(/\D/g, "");
      const response = await fetch(
        `${apiUrl}/api/sync-single-contact-name/${companyId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            phoneIndex: selectedContact.phoneIndex ?? 0,
            contactPhone: phoneNumber,
          }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        toast.success("Contact name synced successfully!");
        // Optionally refresh contact data here
      } else {
        const errorText = await response.text();
        console.error("Sync failed:", errorText);
        toast.error("Failed to sync contact name");
      }
    } catch (error) {
      console.error("Error syncing contact name:", error);
      toast.error("An error occurred while syncing contact name");
    } finally {
      setSyncLoading(false);
    }
  };

  // Sync messages function
  const handleSyncMessages = async () => {
    if (syncLoading) return;

    setSyncLoading(true);
    setSyncDropdownOpen(false);

    try {
      const { apiUrl, companyId } = await getCompanyApiUrl();

      if (!selectedContact.phone) {
        toast.error("Contact phone number is required for sync");
        return;
      }

      const phoneNumber = selectedContact.phone.replace(/\D/g, "");
      const response = await fetch(
        `${apiUrl}/api/sync-single-contact/${companyId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            phoneIndex: selectedContact.phoneIndex ?? 0,
            contactPhone: phoneNumber,
          }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        toast.success("Contact and messages synced successfully!");
        // Optionally refresh messages here
        fetchMessages(selectedChatId!, whapiToken!);
      } else {
        const errorText = await response.text();
        console.error("Sync failed:", errorText);
        toast.error("Failed to sync contact and messages");
      }
    } catch (error) {
      console.error("Error syncing contact and messages:", error);
      toast.error("An error occurred while syncing contact and messages");
    } finally {
      setSyncLoading(false);
    }
  };

  // Delete contact function with dependency handling
  const handleDeleteContact = async () => {
    if (deleteLoading) return;

    if (
      !window.confirm(
        "Are you sure you want to delete this contact? This will also remove all assignments and related data. This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleteLoading(true);

    try {
      const { apiUrl, companyId } = await getCompanyApiUrl();

      if (!selectedContact.contact_id) {
        toast.error("Contact ID is required for deletion");
        return;
      }

      toast.info("Preparing to delete contact...");

      // Step 1: Remove assignments first using the dedicated endpoint
      try {
        const assignmentsResponse = await fetch(
          `${apiUrl}/api/assignments/contact/${selectedContact.contact_id}?companyId=${companyId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (assignmentsResponse.ok) {
          console.log("Assignments removed successfully");
        } else if (assignmentsResponse.status === 404) {
          console.log("No assignments found for this contact");
        } else {
          console.warn(
            "Failed to remove assignments:",
            assignmentsResponse.status
          );
        }
      } catch (error) {
        console.warn("Error removing assignments:", error);
      }

      // Step 2: Delete the contact
      toast.info("Deleting contact...");

      const response = await fetch(
        `${apiUrl}/api/contacts/${selectedContact.contact_id}?companyId=${companyId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Contact deleted successfully!");

        // Update local state
        setContacts(
          contacts.filter((contact) => contact.id !== selectedContact.id)
        );

        // Comprehensive cleanup of related data
        const contactChatId =
          selectedContact.phone?.replace(/\D/g, "") + "@s.whatsapp.net";

        // Remove from scheduled messages
        setScheduledMessages((prev) =>
          prev.filter((msg) => !msg.chatIds.includes(contactChatId))
        );

        // Remove from notifications (if they have contactId property)
        setNotifications((prev) =>
          prev.filter(
            (notification: any) =>
              !notification.contactId ||
              notification.contactId !== selectedContact.id
          )
        );

        // Remove from quick replies if they were specific to this contact
        setQuickReplies((prev) =>
          prev.filter(
            (reply: any) =>
              !reply.contactSpecific || reply.contactId !== selectedContact.id
          )
        );

        // Clear any cached messages for this contact (if messageCache exists)
        if ((window as any).messageCache?.has(selectedContact.contact_id!)) {
          (window as any).messageCache.delete(selectedContact.contact_id!);
        }

        // Close the contact view
        setIsTabOpen(false);
        setSelectedContact(null);
        setSelectedChatId(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Delete failed:", errorData);

        // Check if this is a constraint error that can be resolved with force delete
        const canForceDelete =
          errorData.message &&
          (errorData.message.includes("active assignments") ||
            errorData.message.includes("associated messages") ||
            errorData.message.includes("Use /api/contacts/{contactId}/force"));

        if (canForceDelete) {
          // Offer to force delete with cascade
          if (
            window.confirm(
              "This contact has database dependencies. Would you like to force delete it and remove all related data? This is irreversible."
            )
          ) {
            try {
              const forceDeleteResponse = await fetch(
                `${apiUrl}/api/contacts/${selectedContact.contact_id}/force?companyId=${companyId}`,
                {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                }
              );

              if (forceDeleteResponse.ok) {
                toast.success("Contact force deleted successfully!");

                // Perform the same cleanup as successful deletion
                setContacts(
                  contacts.filter(
                    (contact) => contact.id !== selectedContact.id
                  )
                );
                const contactChatId =
                  selectedContact.phone?.replace(/\D/g, "") + "@s.whatsapp.net";
                setScheduledMessages((prev) =>
                  prev.filter((msg) => !msg.chatIds.includes(contactChatId))
                );
                setNotifications((prev) =>
                  prev.filter(
                    (notification: any) =>
                      !notification.contactId ||
                      notification.contactId !== selectedContact.id
                  )
                );
                setQuickReplies((prev) =>
                  prev.filter(
                    (reply: any) =>
                      !reply.contactSpecific ||
                      reply.contactId !== selectedContact.id
                  )
                );
                // Clear any cached messages for this contact (if messageCache exists)
                if (
                  (window as any).messageCache?.has(selectedContact.contact_id!)
                ) {
                  (window as any).messageCache.delete(
                    selectedContact.contact_id!
                  );
                }
                setIsTabOpen(false);
                setSelectedContact(null);
                setSelectedChatId(null);
                return;
              } else {
                toast.error(
                  "Force delete also failed. Please contact support."
                );
              }
            } catch (forceError) {
              console.error("Force delete error:", forceError);
              toast.error("Force delete failed. Please contact support.");
            }
          }
        } else if (response.status === 409) {
          // Handle conflict status - contact has dependencies
          toast.error(
            "Cannot delete contact: Contact has associated data. Please remove dependencies first."
          );
        } else {
          toast.error("Failed to delete contact");
        }

        // Revert the UI state
        setIsTabOpen(true);
        setSelectedContact(selectedContact);
        setSelectedChatId(selectedContact.contact_id);
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("An error occurred while deleting contact");

      // Revert the UI state
      setIsTabOpen(true);
      setSelectedContact(selectedContact);
      setSelectedChatId(selectedContact.contact_id);
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleRecordingPopup = () => {
    setIsRecordingPopupOpen(!isRecordingPopupOpen);
    if (!isRecordingPopupOpen) {
      setIsRecording(false);
      setAudioBlob(null);
      setAudioUrl(null);
    }
  };

  const onStop = (recordedBlob: { blob: Blob; blobURL: string }) => {
    setAudioBlob(recordedBlob.blob);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      setAudioBlob(null);
    }
  };
  // Add a handler for video uploads
  const handleVideoUpload = async (caption: string = "") => {
    if (!selectedVideo || !selectedChatId || !userData) return;

    try {
      // Get company data using the new approach
      const {
        companyId: cId,
        baseUrl,
        userData: uData,
        email,
      } = await getCompanyData();
      if (!uData) {
        throw new Error("User not authenticated");
      }
      // Check the size of the video file
      const maxSizeInMB = 20;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      if (selectedVideo.size > maxSizeInBytes) {
        toast.error(
          "The video file is too big. Please select a file smaller than 20MB."
        );
        return;
      }

      // First upload the video file to get a URL
      const videoFile = new File([selectedVideo], `video_${Date.now()}.mp4`, {
        type: selectedVideo.type,
      });
      const videoUrl = await uploadFile(videoFile);

      // Call the video message API
      const response = await axios.post(
        `${baseUrl}/api/v2/messages/video/${cId}/${selectedContactId}`,
        {
          videoUrl,
          caption,
          phoneIndex: selectedContact.phoneIndex || 0,
          userName: uData.name,
        }
      );

      if (response.data.success) {
        setVideoModalOpen(false);
        setSelectedVideo(null);
        setVideoCaption("");
        toast.success("Video sent successfully");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error uploading video:",
          error.response?.data || error.message
        );
      } else {
        console.error("Unexpected error:", error);
      }
      toast.error("Failed to send video message");
    }
  };

  const sendVoiceMessage = async () => {
    if (audioBlob && selectedChatId && userData) {
      try {
        const {
          companyId: cId,
          baseUrl,
          userData: uData,
          email,
        } = await getCompanyData();
        if (!uData) {
          console.error("User not authenticated");
          setError("User not authenticated");
          return;
        }

        // Convert the audio Blob to a File
        const audioFile = new File(
          [audioBlob],
          `voice_message_${Date.now()}.webm`,
          { type: "audio/webm" }
        );

        // Upload the audio file using the provided uploadFile function
        const audioUrl = await uploadFile(audioFile);

        const requestBody = {
          audioUrl,
          caption: "",
          phoneIndex: selectedContact?.phoneIndex || 0,
          userName: uData.name,
        };

        const response = await axios.post(
          `${baseUrl}/api/v2/messages/audio/${uData.companyId}/${selectedContactId}`,
          requestBody
        );

        if (response.data.success) {
          toast.success("Voice message sent successfully");
        } else {
          console.error("Failed to send voice message");
          toast.error("Failed to send voice message");
        }

        setAudioBlob(null);
        setIsRecordingPopupOpen(false);
      } catch (error) {
        console.error("Error sending voice message:", error);
        toast.error("Error sending voice message");
      }
    }
  };

  const handleReaction = async (message: any, emoji: string) => {
    try {
      console.log("Adding reaction:", emoji, "to message:", message);
      const { baseUrl, userData: uData } = await getCompanyData();
      if (!uData) {
        console.error("User not authenticated");
        setError("User not authenticated");
        return;
      }
      console.log("User data:", uData);

      // Fetch companyId from API
      const userEmail = localStorage.getItem("userEmail");
      let companyId = "";
      if (userEmail) {
        const userResponse = await fetch(
          `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail)}`,
          { credentials: "include" }
        );
        if (userResponse.ok) {
          const userData = await userResponse.json();
          companyId = userData.company_id;
        }
      }

      // Ensure we have all required data
      if (!companyId || !message.id) {
        throw new Error("Missing required data: companyId or messageId");
      }

      // Use the full message ID from Firebase
      const messageId = message.id;

      // Construct the endpoint with the full message ID
      const endpoint = `${baseUrl}/api/messages/react/${companyId}/${messageId}`;

      const payload = {
        reaction: emoji,
        phoneIndex: selectedContact?.phoneIndex || 0,
      };

      const response = await axios.post(endpoint, payload);

      if (response.data.success) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (msg.id === message.id) {
              return {
                ...msg,
                reactions: [
                  ...(msg.reactions || []),
                  { emoji, from_name: uData.name },
                ],
              };
            }
            return msg;
          })
        );

        toast.success("Reaction added successfully");
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
      if (axios.isAxiosError(error) && error.response?.data) {
        console.error("Error response:", error.response.data);
        const errorMessage =
          error.response.data.details ||
          error.response.data.error ||
          "Failed to add reaction";
        toast.error(errorMessage);
      } else {
        toast.error("Failed to add reaction. Please try again.");
      }
    } finally {
      setShowReactionPicker(false);
    }
  };

  const ReactionPicker = ({
    onSelect,
    onClose,
  }: {
    onSelect: (emoji: string) => void;
    onClose: () => void;
  }) => {
    const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    return (
      <div className="absolute bottom-40 right-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 z-50">
        <div className="flex items-center justify-between align-middle space-x-2">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors text-2xl"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Lucide icon="X" className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const uploadDocument = async (file: File): Promise<string> => {
    try {
      const { companyId: cId, baseUrl: apiUrl } = await getCompanyData();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiUrl}/api/upload-media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading document:", error);
      throw error;
    }
  };

  const handleMessageSearchClick = () => {
    setIsMessageSearchOpen(!isMessageSearchOpen);
    if (!isMessageSearchOpen) {
      setTimeout(() => {
        messageSearchInputRef.current?.focus();
      }, 0);
    }
  };

  const handleMessageSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMessageSearchQuery(e.target.value);
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (userEmail) {
        try {
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
          console.log("Company", data);
          // Set all the state values from the response
          setCurrentCompanyId(data.userData.companyId);
          setCompanyName(data.companyData.name);
          const ai = data.companyData.assistants_ids;
          setIsAssistantAvailable(Array.isArray(ai) && ai.length > 0);

          setPhoneCount(data.companyData.phoneCount);
          console.log("phoneCount:", phoneCount);
        } catch (error) {
          console.error("Error fetching company data:", error);
          // Handle error appropriately
        }
      }
    };

    fetchCompanyData();
  }, []);

  useEffect(() => {
    if (messageSearchQuery) {
      const results = messages.filter(
        (message) =>
          message.type === "text" &&
          message.text?.body
            .toLowerCase()
            .includes(messageSearchQuery.toLowerCase())
      );
      setMessageSearchResults(results);
    } else {
      setMessageSearchResults([]);
    }
  }, [messageSearchQuery, messages]);
  useEffect(() => {
    if (scrollToMessageId && messageListRef.current) {
      const messageElement = messageListRef.current.querySelector(
        `[data-message-id="${scrollToMessageId}"]`
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        messageElement.classList.add("highlight-message");
        setTimeout(() => {
          messageElement.classList.remove("highlight-message");
        }, 2000);
        setScrollToMessageId(null); // Reset after scrolling
        setIsMessageSearchOpen(false);
      }
    }
  }, [messages, scrollToMessageId]);
  const scrollToMessage = (messageId: string) => {
    console.log("scrolling message", messageId);
    if (messageListRef.current) {
      const messageElement = messageListRef.current.querySelector(
        `[data-message-id="${messageId}"]`
      );
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
        messageElement.classList.add("highlight-message");
        setTimeout(() => {
          messageElement.classList.remove("highlight-message");
        }, 100);
      }
    }
    setIsMessageSearchOpen(false); // Close the search panel after clicking a result
  };

  useEffect(() => {
    if (selectedContact) {
      setEditedName(
        selectedContact.contactName || selectedContact.firstName || ""
      );
    }
  }, [selectedContact]);

  useEffect(() => {
    /*updateEmployeeAssignedContacts();
    const initializeActiveTags = async () => {
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          const companyId = userData.companyId;
  
          if (companyId !== '042') {
        
            filterTagContact('all');
          } else {
            // Keep the existing logic for bot042
          
            filterTagContact('mine');
          }
        }
      }
    };
  
    initializeActiveTags();*/
  }, []);

  const handleBack = () => {
    navigate("/"); // or wherever you want to navigate to
    setIsChatActive(false);
    setSelectedChatId(null);
    setMessages([]);
    setAllMessages([]);
  };

  useEffect(() => {
    updateVisibleTags();
  }, [contacts, tagList, isTagsExpanded]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        privateNoteRef.current &&
        !privateNoteRef.current.contains(event.target as Node)
      ) {
        setIsPrivateNotesExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [privateNoteRef]);

  const updateVisibleTags = () => {
    const nonGroupContacts = contacts.filter(
      (contact) => contact.chat_id && !contact.chat_id.includes("@g.us")
    );

    const allUnreadTags = [
      {
        id: "all",
        name: "All",
        count: nonGroupContacts.length,
      },
      {
        id: "unread",
        name: "Unread",
        count: nonGroupContacts.filter(
          (contact) => (contact.unreadCount || 0) > 0
        ).length,
      },
    ];

    const updatedTagList = tagList.map((tag) => ({
      ...tag,
      count: nonGroupContacts.filter(
        (contact) =>
          contact.tags?.includes(tag.name) && (contact.unreadCount || 0) > 0
      ).length,
    }));

    if (isTagsExpanded) {
      setVisibleTags([...allUnreadTags, ...updatedTagList]);
    } else {
      const containerWidth = 300; // Adjust this based on your container width
      const tagWidth = 100; // Approximate width of each tag button
      const tagsPerRow = Math.floor(containerWidth / tagWidth);
      const visibleTagsCount = tagsPerRow * 2 - 3; // Two rows, minus All, Unread, and Group
      setVisibleTags([
        ...allUnreadTags,
        ...updatedTagList.slice(0, visibleTagsCount),
      ]);
    }
  };

  const toggleTagsExpansion = () => {
    setIsTagsExpanded(!isTagsExpanded);
  };
  const [stopbot, setStopbot] = useState(false);

  const handlePrivateNoteMentionSelect = (employee: Employee) => {
    const mentionText = `@${employee.name} `;
    const newValue = newMessage.replace(/@[^@]*$/, mentionText);
    setNewMessage(newValue);
    setIsPrivateNotesMentionOpen(false);
  };

  const filterContactsByUserRole = useCallback(
    (contacts: Contact[], userRole: string, userName: string) => {
      // If userRole is empty or undefined, return all contacts to avoid blank screen
      if (!userRole) {
        console.log(
          "User role not loaded yet, showing all contacts temporarily"
        );
        return contacts;
      }

      switch (userRole) {
        case "1": // Admin
          return contacts; // Admin sees all contacts
        case "admin": // Admin
          return contacts; // Admin sees all contacts
        case "user": // User
          return contacts.filter((contact) =>
            contact.tags?.some(
              (tag) =>
                (typeof tag === "string" ? tag : String(tag)).toLowerCase() ===
                userName.toLowerCase()
            )
          );
        case "2": // Sales
          return contacts.filter((contact) =>
            contact.tags?.some(
              (tag) =>
                (typeof tag === "string" ? tag : String(tag)).toLowerCase() ===
                userName.toLowerCase()
            )
          );

        case "3": // Observer
        case "4": // Manager
          // Sales, Observer, and Manager see only contacts assigned to them
          return contacts.filter((contact) =>
            contact.tags?.some(
              (tag) =>
                (typeof tag === "string" ? tag : String(tag)).toLowerCase() ===
                userName.toLowerCase()
            )
          );
        case "5": // Other role
          return contacts;
        default:
          console.log(`Unknown user role: ${userRole}, showing all contacts`);
          // Return all contacts instead of empty array to avoid blank screen
          return contacts;
      }
    },
    []
  );
  // Add this function to handle phone change
  const handlePhoneChange = async (newPhoneIndex: number) => {
    // Store the current phone index for potential rollback
    const currentPhoneIndex = userPhone;

    // Update local state immediately for instant filtering
    setUserPhone(newPhoneIndex);
    setUserData((prevState) => {
      if (prevState === null) {
        return {
          phone: newPhoneIndex,
          companyId: "",
          name: "",
          role: "",
        };
      }
      return {
        ...prevState,
        phone: newPhoneIndex,
      };
    });

    try {
      const {
        companyId: cId,
        baseUrl,
        userData: uData,
        email,
      } = await getCompanyData();
      if (!uData) {
        console.error("No authenticated user");
        // Rollback on error
        setUserPhone(currentPhoneIndex);
        setUserData((prevState) => {
          if (prevState === null) return null;
          return {
            ...prevState,
            phone: currentPhoneIndex,
          };
        });
        return;
      }
      console.log(baseUrl);
      // Update phone index via API
      const requestBody = {
        email,
        phoneIndex: newPhoneIndex,
      };
      console.log("Request body:", requestBody);
      console.log("Request URL:", `${baseUrl}/api/user/update-phone`);
      console.log("New phone index:", newPhoneIndex);

      const response = await fetch(`${baseUrl}/api/user/update-phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        // Rollback on API failure
        setUserPhone(currentPhoneIndex);
        setUserData((prevState) => {
          if (prevState === null) return null;
          return {
            ...prevState,
            phone: currentPhoneIndex,
          };
        });
        toast.error("Failed to update phone");
        return;
      }

      toast.success("Phone updated successfully");
    } catch (error) {
      console.error("Error updating phone:", error);
      // Rollback on error
      setUserPhone(currentPhoneIndex);
      setUserData((prevState) => {
        if (prevState === null) return null;
        return {
          ...prevState,
          phone: currentPhoneIndex,
        };
      });
      toast.error("Failed to update phone");
    }
  };

  const filteredContactsSearch = useMemo(() => {
    // Determine the current phone index to use for filtering
    let currentPhoneIndex = 0; // Default to first phone
    if (userPhone !== null && userPhone !== undefined) {
      currentPhoneIndex = userPhone;
    } else if (
      userData?.phone !== undefined &&
      userData.phone !== null &&
      userData.phone !== -1
    ) {
      currentPhoneIndex =
        typeof userData.phone === "string"
          ? parseInt(userData.phone, 10)
          : userData.phone;
    }

    // Set message mode based on current phone index
    if (
      currentPhoneIndex !== null &&
      phoneNames[currentPhoneIndex] !== undefined
    ) {
      setMessageMode(`phone${currentPhoneIndex + 1}`);
    }

    // For tag filtering, always use ALL contacts to ensure we find all tagged contacts
    // For regular browsing, use loaded contacts for performance
    const contactsToFilter =
      activeTags.length > 0 && activeTags[0] !== "all"
        ? contacts // Use all contacts when filtering by tags
        : loadedContacts.length > 0
        ? loadedContacts
        : contacts; // Use loaded contacts for regular browsing

    let fil = filterContactsByUserRole(
      contactsToFilter,
      userRole,
      userData?.name || ""
    );

    const activeTag = activeTags.length > 0 ? activeTags[0].toLowerCase() : "";

    // Check if we're using multi-phone API (contacts are already filtered by phone)
    const phoneCount = Object.keys(phoneNames).length;
    const hasMultiplePhones = phoneCount > 1;
    const isUsingMultiPhoneAPI =
      hasMultiplePhones && userPhone !== null && userPhone !== undefined;

 

    // Always apply phone filtering when userPhone is set
    if (userPhone !== null && userPhone !== undefined) {
   

     

      const beforeFilter = fil.length;
      fil = fil.filter((contact) => {
        // Check if contact has phoneIndexes and it's not empty
        let hasPhone =
          contact.phoneIndexes && contact.phoneIndexes.length > 0
            ? contact.phoneIndexes.includes(userPhone)
            : contact.phoneIndex === userPhone;

        // If not found in phoneIndex/phoneIndexes, check messages for this phone
        if (!hasPhone && contact.chat && contact.chat.length > 0) {
          hasPhone = contact.chat.some(
            (message: any) =>
              message.phoneIndex === userPhone ||
              (message.messages &&
                message.messages.some(
                  (msg: any) => msg.phoneIndex === userPhone
                ))
          );
        }

        // Also check last_message
        if (!hasPhone && contact.last_message) {
          hasPhone = contact.last_message.phoneIndex === userPhone;
        }

        // Debug first few contacts
        if (fil.indexOf(contact) < 3) {
   
        }

        return hasPhone;
      });
     
    } else if (!isUsingMultiPhoneAPI) {
      // Legacy filtering logic for single phone or when userPhone is not set
      let userPhoneIndex =
        userData?.phone !== undefined ? parseInt(userData.phone, 10) : 0;
      if (userPhoneIndex === -1) {
        userPhoneIndex = 0;
      }

      // Filter by user's selected phone first (only for legacy API)
      if (userPhoneIndex !== -1 && phoneCount > 1) {
        fil = fil.filter((contact) =>
          contact.phoneIndexes
            ? contact.phoneIndexes.includes(userPhoneIndex)
            : contact.phoneIndex === userPhoneIndex
        );
      }
    }

    // Check if the active tag matches any of the phone names
    if (activeTags.length > 0) {
      const phoneIndex = Object.entries(phoneNames).findIndex(
        ([_, name]) => name.toLowerCase() === activeTag
      );

      if (phoneIndex !== -1) {
        fil = fil.filter((contact) =>
          contact.phoneIndexes
            ? contact.phoneIndexes.includes(phoneIndex)
            : contact.phoneIndex === phoneIndex
        );
      }
    }

    // Apply search filter (works for both APIs)
    if (searchQuery.trim() !== "") {
      fil = fil.filter(
        (contact) =>
          (contact.contactName?.toLowerCase() || "").includes(
            searchQuery.toLowerCase()
          ) ||
          (contact.firstName?.toLowerCase() || "").includes(
            searchQuery.toLowerCase()
          ) ||
          (contact.phone?.toLowerCase() || "").includes(
            searchQuery.toLowerCase()
          ) ||
          contact.tags?.some((tag) =>
            (typeof tag === "string" ? tag : String(tag))
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          )
      );
    }

    // Filter by selected employee
    if (selectedEmployee) {
      fil = fil.filter((contact) =>
        contact.tags?.some(
          (tag) =>
            (typeof tag === "string" ? tag : String(tag)).toLowerCase() ===
            selectedEmployee.toLowerCase()
        )
      );
    }

    // Tag filtering
    if (activeTags.length > 0) {
      const tag = activeTags[0]?.toLowerCase() || "all";
     // console.log("🔍 Filtering by tag:", tag);
      //console.log("🔍 Active tags:", activeTags);

      fil = fil.filter((contact) => {
        const isGroup = contact.chat_id?.endsWith("@g.us");
        const contactTags =
          contact.tags?.map((t: string) =>
            (typeof t === "string" ? t : String(t)).toLowerCase()
          ) || [];

       

        const matchesTag =
          tag === "all"
            ? true // Show all conversations (both individual and groups)
            : tag === "unread"
            ? contact.unreadCount && contact.unreadCount > 0
            : tag === "mine"
            ? contact.tags?.includes(currentUserName)
            : tag === "unassigned"
            ? !contact.tags?.some((t: string) =>
                employeeList.some(
                  (e) =>
                    (e.name?.toLowerCase() || "") ===
                    (typeof t === "string" ? t : String(t)).toLowerCase()
                )
              )
            : tag === "snooze"
            ? contact.tags?.includes("snooze")
            : tag === "resolved"
            ? contact.tags?.includes("resolved")
            : tag === "group"
            ? isGroup
            : tag === "stop bot"
            ? contact.tags?.includes("stop bot")
            : contactTags.includes(tag);

       // console.log("🔍 Contact matches tag:", matchesTag);
        return matchesTag;
      });

    //  console.log("🔍 After tag filtering, contacts count:", fil.length);
    }

    // Sort by timestamp (works for both APIs)
    return fil.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      const timestampA = getContactTimestamp(a);
      const timestampB = getContactTimestamp(b);

      // Sort by most recent first (descending order)
      return timestampB - timestampA;
    });
  }, [
    contacts,
    searchQuery,
    activeTags,
    userPhone,
    userData,
    phoneNames,
    currentUserName,
    employeeList,
    userRole,
    selectedEmployee,
  ]);

  // Debug: Log the filtered results
  useEffect(() => {
   
    // Debug: Log all available tags from contacts
    const allTags = new Set<string>();
    contacts.forEach((contact) => {
      if (contact.tags && Array.isArray(contact.tags)) {
        contact.tags.forEach((tag) => {
          if (typeof tag === "string") {
            allTags.add(tag.toLowerCase());
          }
        });
      }
    });
   

    if (filteredContactsSearch.length > 0) {
      console.log("📊 SORTING - First 10 contacts sorted by timestamp:");
      filteredContactsSearch.slice(0, 10).forEach((contact, index) => {
        const timestampMs = getContactTimestamp(contact);
        const now = Date.now();
        const timeDiff = now - timestampMs;
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        let timeAgo = "Unknown";
        if (minutesAgo < 1) {
          timeAgo = "Just now";
        } else if (minutesAgo < 60) {
          timeAgo = `${minutesAgo}m ago`;
        } else if (hoursAgo < 24) {
          timeAgo = `${hoursAgo}h ago`;
        } else {
          timeAgo = `${daysAgo}d ago`;
        }

        const isGroup = contact.chat_id?.endsWith("@g.us")
          ? " [GROUP]"
          : " [INDIVIDUAL]";
        const timestamp =
          timestampMs > 0
            ? new Date(timestampMs).toLocaleString()
            : "No timestamp";

        // Show detailed timestamp info for debugging
        let timestampSource = "None";
        if (contact.last_message) {
          if (contact.last_message.createdAt) {
            timestampSource = `createdAt: ${contact.last_message.createdAt}`;
          } else if (contact.last_message.timestamp) {
            timestampSource = `timestamp: ${contact.last_message.timestamp}`;
          } else if (contact.last_message.dateAdded) {
            timestampSource = `msg.dateAdded: ${contact.last_message.dateAdded}`;
          }
        } else if (contact.dateUpdated) {
          timestampSource = `contact.dateUpdated: ${contact.dateUpdated}`;
        } else if (contact.dateAdded) {
          timestampSource = `contact.dateAdded: ${contact.dateAdded}`;
        }

        console.log(
          `📊 ${index + 1}. ${
            contact.contactName || contact.firstName || "Unknown"
          }${isGroup} - ${timeAgo} (${timestamp}) [${timestampSource}]`
        );
      });
    }
  }, [filteredContactsSearch]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        contactListRef.current &&
        contactListRef.current.scrollTop +
          contactListRef.current.clientHeight >=
          contactListRef.current.scrollHeight
      ) {
        // loadMoreContacts();
      }

      // Store the current scroll position when user scrolls
      if (contactListRef.current) {
        sessionStorage.setItem(
          "chatContactListScrollPosition",
          contactListRef.current.scrollTop.toString()
        );
      }
    };

    if (contactListRef.current) {
      contactListRef.current.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (contactListRef.current) {
        contactListRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [contacts]);

  // ... existing code ...
  useEffect(() => {
    try {
      const pinned = activeTags.filter((tag) => tag === "pinned");
      const employees = activeTags.filter((tag) =>
        employeeList.some(
          (employee) =>
            (employee.name?.toLowerCase() || "") ===
            (typeof tag === "string" ? tag : String(tag)).toLowerCase()
        )
      );
      const others = activeTags.filter(
        (tag) =>
          tag !== "pinned" &&
          !employeeList.some(
            (employee) =>
              (employee.name?.toLowerCase() || "") ===
              (typeof tag === "string" ? tag : String(tag)).toLowerCase()
          )
      );

      setPinnedTags(pinned);
      setEmployeeTags(employees);
      setOtherTags(others);
      setTagsError(false);
    } catch (error) {
      console.error("Error processing tags:", error);
      setTagsError(true);
    }
  }, [activeTags, employeeList]);
  // ... existing code ...
  const handleEmojiClick = (emojiObject: EmojiClickData) => {
    setNewMessage((prevMessage) => prevMessage + emojiObject.emoji);
  };

  const detectMentions = (message: string) => {
    const mentionRegex = /@(\w+)/g;
    const atSymbolRegex = /@$/;
    return (
      message.match(mentionRegex) || (message.match(atSymbolRegex) ? ["@"] : [])
    );
  };

  const sendWhatsAppAlert = async (employeeName: string, chatId: string) => {
    try {
      const {
        companyId: cId,
        baseUrl: apiUrl,
        userData: uData,
        email,
      } = await getCompanyData();
      if (!uData) {
        console.error("User not authenticated");
        return;
      }

      // Fetch employee's WhatsApp number from API
      const employeeResponse = await fetch(
        `${apiUrl}/api/employees?companyId=${cId}&name=${encodeURIComponent(
          employeeName
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!employeeResponse.ok) {
        console.error("Employee not found");
        return;
      }

      const employeeData = await employeeResponse.json();
      if (!employeeData.employee) {
        console.error("Employee not found");
        return;
      }

      const employeePhone = employeeData.employee.phoneNumber;
      const temp = employeePhone.split("+")[1];
      const employeeId = temp + `@c.us`;

      // Send WhatsApp alert using the API
      const response = await fetch(
        `${apiUrl}/api/v2/messages/text/${cId}/${employeeId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `You've been mentioned in a chat. Click here to view: https://web.jutasoftware.co/chat?chatId=${chatId}`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to send WhatsApp alert: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error sending WhatsApp alert:", error);
    }
  };

  const openPDFModal = (url: string) => {
    setPdfUrl(url);
    setPDFModalOpen(true);
  };

  const closePDFModal = () => {
    setPDFModalOpen(false);
    setPdfUrl("");
  };
  let user_name = "";
  let user_role = "2";
  let totalChats = 0;

  const openDeletePopup = () => {
    setIsDeletePopupOpen(true);
  };
  const closeDeletePopup = () => {
    setIsDeletePopupOpen(false);
  };

  const deleteMessages = async () => {
    try {
      const {
        companyId: cId,
        baseUrl: apiUrl,
        userData: uData,
        email,
      } = await getCompanyData();
      if (!uData) {
        console.error("No authenticated user");
        toast.error("Authentication error. Please try logging in again.");
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      const phoneIndex = selectedContact?.phoneIndex || 0;

      for (const message of selectedMessages) {
        try {
          const response = await axios.delete(
            `${apiUrl}/api/v2/messages/${cId}/${selectedContactId}/${message.id}`,
            {
              data: {
                deleteForEveryone: true,
                phoneIndex: phoneIndex,
                messageId: message.id,
                chatId: selectedChatId,
              },
            }
          );

          if (response.data.success) {
            setMessages((prevMessages) =>
              prevMessages.filter((msg) => msg.id !== message.id)
            );
            successCount++;
          } else {
            console.error(
              `Failed to delete message: ${message.id}`,
              response.data
            );
            failureCount++;
          }
        } catch (error) {
          console.error("Error deleting message:", message.id, error);
          if (axios.isAxiosError(error) && error.response) {
            console.error(
              "Error details:",
              error.response.status,
              error.response.data
            );
          }
          failureCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} message(s)`);
        // Refresh the chat to ensure WhatsApp changes are reflected
        await fetchMessages(selectedChatId!, whapiToken!);
      }
      if (failureCount > 0) {
        toast.error(`Failed to delete ${failureCount} message(s)`);
      }

      setSelectedMessages([]);
      closeDeletePopup();
    } catch (error) {
      console.error("Error in delete operation:", error);
      toast.error("Failed to delete messages. Please try again.");
    }
  };

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [selectedChatId, messages]);

  useEffect(() => {
    console.log("userRole changed:", userRole);
  }, [userRole]);

  useEffect(() => {
    fetchConfigFromDatabase().catch((error) => {
      console.error("Error in fetchConfigFromDatabase:", error);
      // Handle the error appropriately (e.g., show an error message to the user)
    });
  }, []);

  // Fetch quick replies once company data is loaded
  useEffect(() => {
    if (companyId && userData) {
      fetchQuickReplies();
    }
  }, [companyId, userData]);

  const fetchQuickReplies = async () => {
    try {
      const { baseUrl: apiUrl, email } = await getCompanyData();
      if (!email) {
        console.error("No authenticated user");
        return;
      }
      console.log("Fetching quick replies for email:", email);

      // Fetch quick replies from your backend API
      const response = await fetch(
        `${apiUrl}/api/quick-replies?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch quick replies");
        return;
      }

      const data = await response.json();

      if (data.quickReplies) {
        // Map the response to include computed fields for compatibility
        const mappedQuickReplies = data.quickReplies.map((reply: any) => ({
          ...reply,
          // Add computed fields for compatibility with existing UI
          title: reply.keyword || reply.title || "",
          description: reply.text || reply.description || "",
        }));
        setQuickReplies(mappedQuickReplies);
      } else {
        console.error("Failed to fetch quick replies:", data.error);
        setQuickReplies([]);
      }
    } catch (error) {
      console.error("Error fetching quick replies:", error);
      setQuickReplies([]);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const { companyId: cId, baseUrl: apiUrl } = await getCompanyData();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiUrl}/api/upload-media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const addQuickReply = async () => {
    if (newQuickReply.trim() === "") return;

    try {
      const {
        companyId: cId,
        baseUrl: apiUrl,
        userData: uData,
        email,
      } = await getCompanyData();
      if (!uData) {
        console.error("No authenticated user");
        return;
      }

      // Prepare media arrays for upload
      let uploadedDocuments = null;
      let uploadedImages = null;

      try {
        // Upload documents
        if (selectedDocuments.length > 0) {
          const documentPromises = selectedDocuments.map(uploadDocument);
          uploadedDocuments = await Promise.all(documentPromises);
        }

        // Upload images
        if (selectedImages.length > 0) {
          const imagePromises = selectedImages.map(uploadImage);
          uploadedImages = await Promise.all(imagePromises);
        }
      } catch (uploadError) {
        console.error("Error uploading media:", uploadError);
        toast.error("Failed to upload media files");
        return;
      }

      const quickReplyData = {
        email,
        category: null, // No category selection in chat component
        keyword: newQuickReplyKeyword || null,
        text: newQuickReply,
        type: newQuickReplyType || null,
        documents: uploadedDocuments,
        images: uploadedImages,
        videos: null, // No video support in current chat component
        created_by: email,
      };

      // Add quick reply via API
      const response = await fetch(`${apiUrl}/api/quick-replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quickReplyData),
      });

      if (!response.ok) {
        throw new Error("Failed to add quick reply");
      }

      const data = await response.json();

      if (data.success) {
        setNewQuickReply("");
        setSelectedDocuments([]);
        setSelectedImages([]);
        setNewQuickReplyKeyword("");
        setNewQuickReplyType("all");
        fetchQuickReplies();
        toast.success("Quick reply added successfully");
      } else {
        toast.error(data.error || "Failed to add quick reply");
      }
    } catch (error) {
      console.error("Error adding quick reply:", error);
      toast.error("Failed to add quick reply");
    }
  };
  const updateQuickReply = async (
    id: string,
    keyword: string,
    text: string,
    type: "all" | "self"
  ) => {
    try {
      const {
        companyId: cId,
        baseUrl: apiUrl,
        userData: uData,
        email,
      } = await getCompanyData();
      if (!uData) {
        console.error("No authenticated user");
        return;
      }

      const updateData: any = {
        updated_by: email,
      };

      if (keyword !== undefined) updateData.keyword = keyword;
      if (text !== undefined) updateData.text = text;
      if (type !== undefined) updateData.type = type;

      // Update quick reply via API
      const response = await fetch(`${apiUrl}/api/quick-replies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update quick reply");
      }

      const data = await response.json();

      if (data.success) {
        setEditingReply(null);
        fetchQuickReplies(); // Refresh quick replies
        toast.success("Quick reply updated successfully");
      } else {
        toast.error(data.error || "Failed to update quick reply");
      }
    } catch (error) {
      console.error("Error updating quick reply:", error);
      toast.error("Failed to update quick reply");
    }
  };
  const deleteQuickReply = async (id: string, type: "all" | "self") => {
    try {
      // Delete quick reply via API
      const response = await fetch(`${baseUrl}/api/quick-replies/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete quick reply");
      }

      const data = await response.json();

      if (data.success) {
        fetchQuickReplies(); // Refresh quick replies
        toast.success("Quick reply deleted successfully");
      } else {
        toast.error(data.error || "Failed to delete quick reply");
      }
    } catch (error) {
      console.error("Error deleting quick reply:", error);
      toast.error("Failed to delete quick reply");
    }
  };
  const handleQR = () => {
    setIsQuickRepliesOpen(!isQuickRepliesOpen);
    if (!isQuickRepliesOpen) {
      fetchQuickReplies(); // Fetch quick replies when opening the dropdown
    }
  };

  const handleQRClick = async (reply: QuickReply) => {
    try {
      // Handle videos first
      if (reply.videos?.length) {
        reply.videos.forEach((video) => {
          fetch(video.url)
            .then((response) => response.blob())
            .then((blob) => {
              const videoFile = new File([blob], video.name, {
                type: video.type,
                lastModified: video.lastModified,
              });
              setSelectedVideo(videoFile);
              setVideoModalOpen(true);
              setDocumentCaption(reply.text || "");
            })
            .catch((error) => {
              console.error("Error handling video:", error);
              toast.error("Failed to load video");
            });
        });
      }
      // Handle images
      else if (reply.images?.length) {
        setPastedImageUrl(reply.images);
        setDocumentCaption(reply.text || "");
        setImageModalOpen2(true);
      }
      // Handle documents
      else if (reply.documents?.length) {
        reply.documents.forEach((doc) => {
          fetch(doc.url)
            .then((response) => response.blob())
            .then((blob) => {
              const documentFile = new File([blob], doc.name, {
                type: doc.type,
                lastModified: doc.lastModified,
              });
              setSelectedDocument(documentFile);
              setDocumentModalOpen(true);
              setDocumentCaption(reply.text || "");
            })
            .catch((error) => {
              console.error("Error handling document:", error);
              toast.error("Failed to load document");
            });
        });
      }
      // Handle text-only replies
      else if (
        !reply.images?.length &&
        !reply.documents?.length &&
        !reply.videos?.length
      ) {
        setNewMessage(reply.text);
      }
      setIsQuickRepliesOpen(false);
    } catch (error) {
      console.error("Error in handleQRClick:", error);
      toast.error("Failed to process quick reply");
    }
  };

  let params: URLSearchParams;
  let chatId: any;
  if (location != undefined) {
    params = new URLSearchParams(location.search);
    chatId = params.get("chatId");
    if (chatId && !chatId.endsWith("@g.us")) {
      chatId += "@c.us";
    }
  }

  const handleNotificationClick = (chatId: string, index: number) => {
    selectChat(chatId);
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  // Update the showNotificationToast function
  const showNotificationToast = (notification: Notification, index: number) => {
    // Check if a notification with the same chat_id and timestamp already exists
    const isDuplicate = activeNotifications.some((id) => {
      const existingToast = toast.isActive(id);
      if (existingToast) {
        const content = document.getElementById(`toast-${id}`)?.textContent;
        return (
          content?.includes(notification.from) &&
          content?.includes(notification.text.body)
        );
      }
      return false;
    });

    if (isDuplicate) {
      return;
    }

    let displayText = "New message";

    switch (notification.type) {
      case "text":
        displayText =
          notification.text?.body?.substring(0, 100) || "New message"; // Truncate text to 100 characters
        break;
      case "image":
        displayText = "Image";
        break;
      case "video":
        displayText = "Video";
        break;
      case "audio":
        displayText = "Audio";
        break;
      case "document":
        displayText = "Document";
        break;
      case "location":
        displayText = "Location";
        break;
      case "contact":
        displayText = "Contact";
        break;
      default:
        displayText = "New message";
    }
    const toastId = toast(
      <div id={`toast-${Date.now()}`} className="flex flex-col mr-2 pr-2">
        <p className="truncate max-w-xs pr-6">{displayText}</p>
      </div>,
      {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        onClick: () => handleNotificationClick(notification.chat_id, index),
        onClose: () => {
          setActiveNotifications((prev) => prev.filter((id) => id !== toastId));
        },
        closeButton: (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(toastId);
            }}
          >
            <Lucide
              icon="X"
              className="absolute top-1 right-1 w-5 h-5 text-black"
            />
          </button>
        ),
      }
    );

    setActiveNotifications((prev) => [...prev, toastId]);
  };

  // New separate useEffect for message listener
  // Main WebSocket connection useEffect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) {
          console.error("No user email found for WebSocket connection");
          return;
        }

        // Get user config to get companyId
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
        const companyId = userData.company_id;
        console.log("🔗 [WEBSOCKET] Connecting for company:", companyId);
        console.log("🔗 [WEBSOCKET] User email:", userEmail);

        // Create WebSocket connection with proper protocol handling
        const wsUrl = `wss://juta-dev.ngrok.dev/ws/${userEmail}/${companyId}`;
        console.log("🔗 [WEBSOCKET] WebSocket URL:", wsUrl);
        ws = new WebSocket(wsUrl);
        setWsConnection(ws);

        ws.onopen = () => {
          console.log("WebSocket connected successfully");
          setWsConnected(true);
          setWsError(null);
          setWsReconnectAttempts(0);

          // Show success notification
          toast.success("Real-time connection established", {
            autoClose: 200,
          });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data);

            if (data.type === "new_message") {
              console.log("📨 [WEBSOCKET] Received new_message:", data);
              handleNewMessage(data);
            }
            else if (data.type === "contact_assignment_update") {
              console.log(
                "👤 [WEBSOCKET] Received contact_assignment_update:",
                data
              );
              handleContactAssignmentUpdate(
                data,
                setContacts,
                setLoadedContacts,
                setFilteredContacts,
                setSelectedContact,
                selectedContact,
                contacts
              );
            } else if (data.type === "contact_tags_update") {
              console.log("🏷️ [WEBSOCKET] Received contact_tags_update:", data);
              handleContactTagsUpdate(
                data,
                setContacts,
                setLoadedContacts,
                setFilteredContacts,
                setSelectedContact,
                selectedContact,
                contacts
              );
            } else if (data.type === "error") {
              console.error("WebSocket error message:", data.message);
              setWsError(data.message);
            } else {
              console.log("Unknown WebSocket message type:", data.type, data);
            }
          } catch (err) {
            console.error("WebSocket message parsing error:", err);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          // Check if it's a security error (insecure connection from HTTPS)
          if (error instanceof Event && window.location.protocol === "https:") {
            console.warn(
              "Security error detected. This might be due to insecure WebSocket connection from HTTPS page."
            );
            setWsError(
              "WebSocket connection failed. Server may not support secure connections."
            );
          } else {
            handleWebSocketError(error);
          }
        };

        ws.onclose = (event) => {
          console.log("WebSocket connection closed:", event.code, event.reason);
          setWsConnected(false);
          setWsConnection(null);

          // Attempt to reconnect if not a normal closure and under max attempts
          if (
            event.code !== 1000 &&
            wsReconnectAttempts < maxReconnectAttempts
          ) {
            const delay = Math.min(
              1000 * Math.pow(2, wsReconnectAttempts),
              30000
            ); // Exponential backoff, max 30s
            console.log(
              `Attempting to reconnect in ${delay}ms (attempt ${
                wsReconnectAttempts + 1
              }/${maxReconnectAttempts})`
            );

            toast.info(
              `Connection lost. Reconnecting in ${Math.round(
                delay / 1000
              )}s...`,
              {
                autoClose: delay,
              }
            );

            reconnectTimeout = setTimeout(() => {
              setWsReconnectAttempts((prev) => prev + 1);
              connectWebSocket();
            }, delay);
          } else if (wsReconnectAttempts >= maxReconnectAttempts) {
            toast.error(
              "Failed to reconnect after multiple attempts. Please refresh the page.",
              {
                autoClose: false,
              }
            );
          }
        };
      } catch (error) {
        console.error("Error establishing WebSocket connection:", error);
        setWsConnected(false);
        setWsError("Failed to establish connection");
      }
    };

    // Connect when component mounts
    connectWebSocket();

    // Cleanup function
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close(1000, "Component unmounting");
      }
    };
  }, [wsVersion]); // Empty dependency array - only run on mount

  /*useEffect(() => {
    const fetchContact = async () => {
      const params = new URLSearchParams(location.search);
      const chatIdFromUrl = params.get('chatId');
  
      if (!chatIdFromUrl || !auth.currentUser) return;
  
      setLoading(true);
      try {
        const userDocRef = doc(firestore, 'user', auth.currentUser.email!);
        const userDocSnapshot = await getDoc(userDocRef);
        if (!userDocSnapshot.exists()) throw new Error('No user document found');
  
        const userData = userDocSnapshot.data() as UserData;
        if (!userData.companyId) throw new Error('Invalid user data or companyId');
  
        setUserData(userData);
        user_role = userData.role;
        companyId = userData.companyId;
  
        const companyDocRef = doc(firestore, 'companies', companyId);
        const companyDocSnapshot = await getDoc(companyDocRef);
        if (!companyDocSnapshot.exists()) throw new Error('No company document found');
  
        const companyData = companyDocSnapshot.data();
        const phone = "+" + chatIdFromUrl.split('@')[0];
  
        let contact;
        if (companyData.v2) {
          contact = contacts.find(c => c.phone === phone || c.chat_id === chatIdFromUrl);
          if (!contact) throw new Error('Contact not found in contacts');
        }
  
        setSelectedContact(contact);
        setSelectedChatId(chatIdFromUrl);
      } catch (error) {
        console.error('Error fetching contact:', error);
        // Handle error (e.g., show error message to user)
      } finally {
        setLoading(false);
      }
    };
  
    fetchContact();
  }, [location.search]);
  */
  async function fetchConfigFromDatabase() {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      throw new Error("No user email found");
    }

    try {
      const response = await fetch(
        `${baseUrl}/api/user-config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch config data");
      }

      const data = await response.json();

      // Set user data
      setUserData(data.userData);
      console.log("datas:", data);

      //console.log('role',data.userData.role);

      user_role = data.userData.role;
      setCompanyId(data.userData.companyId);
      user_name = data.userData.name;

      // Set company data
      setCompanyPlan(data.companyData.plan);
      setPhoneCount(data.companyData.phoneCount);
      if (data.companyData.phoneCount >= 2) {
        setMessageMode("phone1");
      }
      // Set phone index data
      console.log("Full API response data:", data);
      console.log("companyData:", data.companyData);
      console.log("Raw phoneNames from API:", data.companyData.phoneNames);
      if (data.companyData.phoneNames) {
        let phoneNamesObject: Record<number, string> = {};
        if (Array.isArray(data.companyData.phoneNames)) {
          data.companyData.phoneNames.forEach((name: string, index: number) => {
            // Clean the phone name to remove connection status
            const cleanName = name.replace(/\s+(Connected|Not Connected)$/, "");
            phoneNamesObject[index] = cleanName;
          });
        } else if (typeof data.companyData.phoneNames === "object") {
          // Clean each phone name in the object
          Object.entries(data.companyData.phoneNames).forEach(
            ([index, name]) => {
              const cleanName = (name as string).replace(
                /\s+(Connected|Not Connected)$/,
                ""
              );
              phoneNamesObject[parseInt(index)] = cleanName;
            }
          );
        }
        console.log("Transformed phoneNames object:", phoneNamesObject);
        setPhoneNames(phoneNamesObject);
        // Initialize userPhone with first phone if not set
        if (userPhone === null && Object.keys(phoneNamesObject).length > 0) {
          setUserPhone(0);
        }
      } else {
        console.log(
          "phoneNames is not an array or is undefined:",
          data.companyData.phoneNames
        );
        // Create default phone names based on phoneCount
        if (data.companyData.phoneCount > 0) {
          const defaultPhoneNames: Record<number, string> = {};
          for (let i = 0; i < data.companyData.phoneCount; i++) {
            defaultPhoneNames[i] = `Phone ${i + 1}`;
          }
          console.log("Created default phone names:", defaultPhoneNames);
          setPhoneNames(defaultPhoneNames);
        }
        // Set default userPhone if no phoneNames available
        if (userPhone === null) {
          setUserPhone(0);
        }
      }
      setToken(data.companyData.whapiToken);

      // Set message usage for all plans (including free plan)
      if (
        data.companyData.plan === "enterprise" ||
        data.companyData.plan === "free"
      ) {
     
      }
      setAiMessageUsage(data.messageUsage.aiMessages || 0);
      setBlastedMessageUsage(data.messageUsage.blastedMessages || 0);
      setQuotaAIMessage(data.usageQuota.aiMessages || 0)
      var quota = 0;
      if (data.companyData.plan === "enterprise") {
        quota = (data.usageQuota.aiMessages || 0) + 5000;
      } else if (data.companyData.plan === "pro") {
        quota = (data.usageQuota.aiMessages || 0) + 20000;
      } else {
        quota = (data.usageQuota.aiMessages || 0) + 100;
      }
      setQuotaData({ limit: quota, used: data.messageUsage.aiMessages || 0, remaining: quota - (data.messageUsage.aiMessages || 0), percentageUsed: ((data.messageUsage.aiMessages || 0) / quota) * 100 });
      console.log("AI Message Usage:", data.messageUsage.aiMessages);
      console.log("Blasted Message Usage:", data.messageUsage.blastedMessages);
      console.log("Quota AI Message:", currentPlanLimits.aiMessages);

      // Set employee list
      setEmployeeList(data.employeeList);

      // Handle selected employee based on viewEmployee
      if (data.userData.viewEmployee) {
        if (typeof data.userData.viewEmployee === "string") {
          const employee = data.employeeList.find(
            (emp: { id: any }) => emp.id === data.userData.viewEmployee
          );
          if (employee) {
            setSelectedEmployee(employee.name);
          } else {
            const emailUsername = data.userData.viewEmployee.split("@")[0];
            const employeeByUsername = data.employeeList.find(
              (emp: { id: string }) =>
                (typeof emp.id === "string" ? emp.id : String(emp.id))
                  .toLowerCase()
                  .includes(emailUsername.toLowerCase())
            );
            if (employeeByUsername) {
              setSelectedEmployee(employeeByUsername.name);
            }
          }
        } else if (
          Array.isArray(data.userData.viewEmployee) &&
          data.userData.viewEmployee.length > 0
        ) {
          const viewEmployeeEmail = data.userData.viewEmployee[0];
          const employee = data.employeeList.find(
            (emp: { id: any }) => emp.id === viewEmployeeEmail
          );
          if (employee) {
            setSelectedEmployee(employee.name);
          } else {
            const emailUsername = viewEmployeeEmail.split("@")[0];
            const employeeByUsername = data.employeeList.find(
              (emp: { id: string }) =>
                (typeof emp.id === "string" ? emp.id : String(emp.id))
                  .toLowerCase()
                  .includes(emailUsername.toLowerCase())
            );
            if (employeeByUsername) {
              setSelectedEmployee(employeeByUsername.name);
            }
          }
        }
      }

      await fetchTags(data.employeeList.map((emp: any) => emp.name));
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  }

  // Add useEffect to initialize userPhone when phoneNames are loaded
  useEffect(() => {
    if (userPhone === null && Object.keys(phoneNames).length > 0) {
      setUserPhone(0);
    }
  }, [phoneNames, userPhone]);

  // Add the fetchTags function
  const fetchTags = async (employeeList: string[]) => {
    setLoading(true);
    console.log("fetching tags");
    try {
      // Get user email from localStorage or context
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setLoading(false);
        return;
      }

      // Fetch user/company info from your backend
      const userResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!userResponse.ok) {
        setLoading(false);
        return;
      }
      const userJson = await userResponse.json();
      console.log(userJson);
      const companyData = userJson.userData;
      const companyId = companyData.companyId;
      if (!companyId) {
        setLoading(false);
        return;
      }

      // Fetch tags from your SQL backend
      const tagsResponse = await fetch(
        `${baseUrl}/api/companies/${companyId}/tags`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!tagsResponse.ok) {
        setLoading(false);
        return;
      }
      console.log("tags", tagsResponse);
      const tags: Tag[] = await tagsResponse.json();

      // Filter out tags that match employee names (case-insensitive)
      const normalizedEmployeeNames = employeeList
        .filter((name) => typeof name === "string" && name)
        .map((name) => name.toLowerCase());
      const filteredTags = tags.filter(
        (tag: Tag) => !normalizedEmployeeNames.includes(tag.name.toLowerCase())
      );

      setTagList(filteredTags);
      console.log(tagList);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setLoading(false);
    }
  };

  const selectChat = useCallback(
    async (chatId: string, contactId?: string, contactSelect?: Contact) => {
      setMessages([]);
      setAllMessages([]); // Clear all messages as well
      console.log("selecting chat");

      try {
        // Stop current polling before switching chats
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPolling(false);
        setLastMessageTimestamp(0); // Reset timestamp for new chat

        // Save current scroll position before making any state changes
        if (contactListRef.current) {
          sessionStorage.setItem(
            "chatContactListScrollPosition",
            contactListRef.current.scrollTop.toString()
          );
        }

        // Permission check
        if (
          userRole === "3" &&
          contactSelect &&
          !(
            Array.isArray(contactSelect.assignedTo) &&
            contactSelect.assignedTo.some(
              (assignedTo) =>
                (typeof assignedTo === "string"
                  ? assignedTo
                  : String(assignedTo)
                ).toLowerCase() === userData?.name?.toLowerCase()
            )
          )
        ) {
          toast.error("You don't have permission to view this chat.");
          return;
        }

        // Find contact
        let contact = contactSelect || contacts.find((c) => c.id === contactId);
        if (!contact) {
          console.error("Contact not found");
          return;
        }
        console.log(contact);
        // Update UI state immediately
        setSelectedContact(contact);
        setSelectedContactId(contact.chat_id ?? null);
        setSelectedChatId(chatId);
        setIsChatActive(true);

        // Run background tasks in parallel
        const backgroundTasks = [updateFirebaseUnreadCount(contact)];

        await Promise.all(backgroundTasks);

        // Immediately reset unread count in local state
        const resetUnreadCount = (contactItem: Contact) => {
          const contactMatches =
            contactItem.id === contact.id ||
            contactItem.chat_id === contact.chat_id ||
            contactItem.contact_id === contact.contact_id ||
            contactItem.phone === contact.phone;

          if (contactMatches) {
            return {
              ...contactItem,
              unreadCount: 0,
            };
          }
          return contactItem;
        };

        // Update all contact lists immediately
        setContacts((prevContacts) => {
          const updatedContacts = prevContacts.map(resetUnreadCount);
          return updatedContacts;
        });

        setLoadedContacts((prevLoadedContacts) => {
          const updatedLoadedContacts =
            prevLoadedContacts.map(resetUnreadCount);
          return updatedLoadedContacts;
        });

        setFilteredContacts((prevFilteredContacts) => {
          const updatedFilteredContacts =
            prevFilteredContacts.map(resetUnreadCount);
          return updatedFilteredContacts;
        });

        // Update localStorage for contacts
        const storedContacts = localStorage.getItem("contacts");
        if (storedContacts) {
          try {
            const decompressedContacts = JSON.parse(
              LZString.decompress(storedContacts)!
            );
            const updatedContacts = decompressedContacts.map(resetUnreadCount);
            localStorage.setItem(
              "contacts",
              LZString.compress(JSON.stringify(updatedContacts))
            );
          } catch (error) {
            console.error("Error updating contacts in localStorage:", error);
          }
        }

        // Update URL
        const newUrl = `/chat?chatId=${chatId.replace("@c.us", "")}`;
        window.history.pushState({ path: newUrl }, "", newUrl);

        // Immediately fetch messages and check for updates to ensure real-time reflection
        setTimeout(() => {
          if (whapiToken) {
            fetchMessages(chatId, whapiToken);
            // Also trigger a quick poll for new messages
            setTimeout(() => {
              pollForNewMessages();
            }, 1000);
          }
        }, 100);

        // Restore scroll position after a short delay to allow rendering
        setTimeout(() => {
          if (contactListRef.current) {
            const savedScrollPosition = sessionStorage.getItem(
              "chatContactListScrollPosition"
            );
            if (savedScrollPosition) {
              contactListRef.current.scrollTop = parseInt(savedScrollPosition);
            }
          }
        }, 50);
      } catch (error) {
        console.error("Error in selectChat:", error);
        toast.error(
          "An error occurred while loading the chat. Please try again."
        );
      } finally {
      }
    },
    [contacts, userRole, userData?.name, whapiToken]
  );
  const getTimestamp = (timestamp: any): number => {
    // If timestamp is missing, return 0 to put it at the bottom
    if (!timestamp) return 0;

    // If timestamp is already a number
    if (typeof timestamp === "number") {
      // Convert to milliseconds if needed (check if it's in seconds)
      return timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    }

    // If timestamp is a Firestore timestamp
    if (timestamp?.seconds) {
      return timestamp.seconds * 1000;
    }

    // If timestamp is an ISO string or other date format
    if (typeof timestamp === "string") {
      const parsed = Date.parse(timestamp);
      return isNaN(parsed) ? 0 : parsed;
    }

    // Default case - invalid timestamp
    //console.warn("Invalid timestamp format:", timestamp);
    return 0;
  };
  // Add this helper function above your component
  const updateFirebaseUnreadCount = async (contact: Contact) => {
    if (!contact?.contact_id) return;

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Get user/company info
      const userResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );
      if (!userResponse.ok) return;
      const userData = await userResponse.json();
      const companyId = userData.userData.companyId;
      console.log("contact_id", contact.contact_id);

      // Call the reset unread API
      await fetch(
        `${baseUrl}/api/contacts/${contact.contact_id}/reset-unread`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        }
      );
    } catch (error) {
      console.error("Failed to reset unread count:", error);
    }
  };

  const fetchContactsBackground = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      toast.error("No user email found");
      return;
    }
    try {
      // Get user config to get companyId
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
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;

      // Fetch contacts from SQL database
      const contactsResponse = await fetch(
        `${baseUrl}/api/companies/${companyId}/contacts?email=${userEmail}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!contactsResponse.ok) {
        toast.error("Failed to fetch contacts");
        return;
      }

      const data = await contactsResponse.json();
      const updatedContacts = data.contacts.map((contact: any) => ({
        ...contact,
        id: contact.id,
        chat_id: contact.chat_id,
        contactName: contact.name,
        phone: contact.phone,
        email: contact.email,
        profile: contact.profile,
        profilePicUrl: contact.profileUrl,
        tags: contact.tags,
        createdAt: contact.createdAt,
        lastUpdated: contact.lastUpdated,
        last_message: contact.last_message,
        isIndividual: contact.isIndividual,
      }));

      setContacts(updatedContacts);
      setLoadedContacts(updatedContacts);
      localStorage.setItem(
        "contacts",
        LZString.compress(JSON.stringify(updatedContacts))
      );
      sessionStorage.setItem("contactsFetched", "true");
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Error fetching contacts");
    }
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (userEmail) {
        try {
          const response = await fetch(
            `${baseUrl}/api/user-role?email=${encodeURIComponent(userEmail)}`,
            {
              method: "GET",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error("Failed to fetch user role");
          }

          const data = await response.json();

          setUserRole(data.role);
        } catch (error) {
          console.error("Error fetching user role:", error);
          // Handle error appropriately
        }
      }
    };

    fetchUserRole();
  }, []);

  useEffect(() => {
    const cleanupStorage = () => {
      const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit
      let totalSize = 0;

      // Calculate total size and remove expired caches
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("messages_") || key === "messagesCache") {
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length;

            // Remove expired caches
            try {
              const cache = JSON.parse(LZString.decompress(item));
              if (cache.expiry && cache.expiry < Date.now()) {
                localStorage.removeItem(key);
              }
            } catch (error) {
              localStorage.removeItem(key); // Remove invalid cache
            }
          }
        }
      }

      // If total size exceeds limit, clear all message caches
      if (totalSize > MAX_CACHE_SIZE) {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith("messages_") || key === "messagesCache") {
            localStorage.removeItem(key);
          }
        }
      }
    };

    cleanupStorage();
    window.addEventListener("beforeunload", cleanupStorage);
    return () => window.removeEventListener("beforeunload", cleanupStorage);
  }, []);

  const storeMessagesInLocalStorage = (chatId: string, messages: any[]) => {
    try {
      const storageKey = `messages_${chatId}`;

      // Limit messages to most recent 100
      const limitedMessages = messages.slice(-100);

      // Try to compress and store
      try {
        const compressedMessages = LZString.compress(
          JSON.stringify({
            messages: limitedMessages,
            timestamp: Date.now(),
            expiry: Date.now() + 30 * 60 * 1000, // 30 min expiry
          })
        );

        // Check available space
        const MAX_ITEM_SIZE = 2 * 1024 * 1024; // 2MB per chat
        if (compressedMessages.length > MAX_ITEM_SIZE) {
          // If too large, store even fewer messages
          const veryLimitedMessages = messages.slice(-50);
          const smallerCompressedMessages = LZString.compress(
            JSON.stringify({
              messages: veryLimitedMessages,
              timestamp: Date.now(),
              expiry: Date.now() + 30 * 60 * 1000,
            })
          );
          localStorage.setItem(storageKey, smallerCompressedMessages);
        } else {
          localStorage.setItem(storageKey, compressedMessages);
        }
      } catch (quotaError) {
        // If still getting quota error, clear old caches

        clearOldCaches();

        // Try one more time with very limited messages
        const minimalMessages = messages.slice(-25);
        const minimalCompressed = LZString.compress(
          JSON.stringify({
            messages: minimalMessages,
            timestamp: Date.now(),
            expiry: Date.now() + 30 * 60 * 1000,
          })
        );
        localStorage.setItem(storageKey, minimalCompressed);
      }
    } catch (error) {
      console.error("Error storing messages in localStorage:", error);
    }
  };

  const clearOldCaches = () => {
    const currentTime = Date.now();
    const keys = Object.keys(localStorage);

    // Sort keys by timestamp (oldest first)
    const messageCacheKeys = keys
      .filter((key) => key.startsWith("messages_"))
      .sort((a, b) => {
        const timeA = localStorage.getItem(a)
          ? JSON.parse(LZString.decompress(localStorage.getItem(a)!)).timestamp
          : 0;
        const timeB = localStorage.getItem(b)
          ? JSON.parse(LZString.decompress(localStorage.getItem(b)!)).timestamp
          : 0;
        return timeA - timeB;
      });

    // Remove oldest 50% of caches
    const removeCount = Math.ceil(messageCacheKeys.length / 2);
    messageCacheKeys.slice(0, removeCount).forEach((key) => {
      localStorage.removeItem(key);
    });
  };

  // Add this to your existing cleanup useEffect
  useEffect(() => {
    const cleanup = () => {
      try {
        clearOldCaches();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    };

    // Run cleanup every 5 minutes
    const interval = setInterval(cleanup, 5 * 60 * 1000);

    // Run cleanup on mount
    cleanup();

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getMessagesFromLocalStorage = (chatId: string): any[] | null => {
    try {
      const storageKey = `messages_${chatId}`;
      const compressedMessages = localStorage.getItem(storageKey);
      const timestamp = localStorage.getItem(`${storageKey}_timestamp`);

      if (!compressedMessages || !timestamp) {
        return null;
      }

      if (Date.now() - parseInt(timestamp) > 3600000) {
        return null;
      }

      const messages = JSON.parse(LZString.decompress(compressedMessages));

      return messages;
    } catch (error) {
      console.error("Error retrieving messages from localStorage:", error);
      return null;
    }
  };
  useEffect(() => {
    if (selectedChatId) {
      console.log(selectedContact);
      console.log(selectedChatId);
      fetchMessages(selectedChatId, whapiToken!);

      // Immediately check for new messages to ensure real-time updates
      setTimeout(() => {
        pollForNewMessages();
      }, 2000);
    }
  }, [selectedChatId]);

  // Filter messages based on selected phone index
  useEffect(() => {
    if (!allMessages.length) {
      setMessages([]);
      return;
    }

    const hasMultiplePhones = Object.keys(phoneNames).length > 1;
    const shouldFilterByPhone =
      hasMultiplePhones && userPhone !== null && userPhone !== undefined;

    console.log(
      "Filtering messages - hasMultiplePhones:",
      hasMultiplePhones,
      "userPhone:",
      userPhone,
      "shouldFilterByPhone:",
      shouldFilterByPhone
    );

    if (shouldFilterByPhone) {
      // Filter messages by selected phone index
      const filteredMessages = allMessages.filter(
        (message) => message.phoneIndex === userPhone
      );
      console.log(
        `Filtered ${filteredMessages.length} messages from ${allMessages.length} total for phone index ${userPhone}`
      );
      setMessages(filteredMessages);
    } else {
      // Show all messages if no phone filtering is needed
      setMessages(allMessages);
    }
  }, [allMessages, userPhone, phoneNames]);
  async function fetchMessages(selectedChatId: string, whapiToken: string) {
    setLoading(true);
    setSelectedIcon("ws");

    const userEmail = localStorage.getItem("userEmail");
    try {
      // Get user data and company info from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }

      const userData = await userResponse.json();

      const companyId = userData.company_id;
      console.log(userData);
      console.log(companyId);
      // Get company data
      const companyResponse: Response = await fetch(
        `${baseUrl}/api/company-data?companyId=${companyId}`,
        {
          credentials: "include",
        }
      );

      if (!companyResponse.ok) {
        throw new Error("Failed to fetch company data");
      }

      const companyData = await companyResponse.json();
      setToken(companyData.whapiToken);

      // Fetch all messages from SQL (without phone filtering)
      const messagesResponse = await fetch(
        `${baseUrl}/api/messages?chatId=${selectedChatId}&companyId=${companyId}`,
        {
          credentials: "include",
        }
      );

      if (!messagesResponse.ok) {
        throw new Error("Failed to fetch messages");
      }

      const messages = await messagesResponse.json();
      console.log("meesages:", messages);
      const formattedMessages: any[] = [];
      const reactionsMap: Record<string, any[]> = {};

      messages.forEach(async (message: any) => {
        if (
          message.message_type === "action" &&
          message.content?.type === "reaction"
        ) {
          const targetMessageId = message.content.target;
          if (!reactionsMap[targetMessageId]) {
            reactionsMap[targetMessageId] = [];
          }
          reactionsMap[targetMessageId].push({
            emoji: message.content.emoji,
            from_name: message.author,
          });
        } else {
          const formattedMessage: any = {
            id:
              message.message_id ||
              `main-${message.chat_id}-${message.timestamp}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            from_me: message.from_me,
            from_name: message.author,
            from: message.customer_phone,
            chat_id: message.chat_id,
            type: message.message_type,
            author: message.author,
            name: message.author,
            phoneIndex: message.phone_index,
            userName: message.author,
            edited: message.edited || false,
          };

          // Handle timestamp
          const timestamp = new Date(message.timestamp).getTime() / 1000;
          formattedMessage.createdAt = timestamp;
          formattedMessage.timestamp = timestamp;

          // Include message-specific content
          switch (message.message_type) {
            case "text":
            case "chat":
              let quotedContext = null;
              if (message.quoted_message) {
                try {
                  quotedContext = {
                    id: message.quoted_message.message_id,
                    type: message.quoted_message.message_type,
                    from: message.quoted_message.quoted_author,
                    body: message.quoted_message.quoted_content?.body || "",
                    ...message.quoted_message.quoted_content,
                  };
                } catch (error) {
                  console.error("Error parsing quoted message:", error);
                }
              }

              formattedMessage.text = {
                body: message.content || "",
                context: quotedContext,
              };
              break;

            case "image":
              formattedMessage.image = {
                link: message.media_url,
                data: message.media_data,
                mimetype: message.media_metadata?.mimetype,
                filename: message.media_metadata?.filename,
                caption: message.media_metadata?.caption,
                width: message.media_metadata?.width,
                height: message.media_metadata?.height,
                thumbnail: message.media_metadata?.thumbnail,
              };
              break;

            case "video":
              formattedMessage.video = {
                link: message.media_url,
                data: message.media_data,
                mimetype: message.media_metadata?.mimetype,
                filename: message.media_metadata?.filename,
                caption: message.media_metadata?.caption,
                thumbnail: message.media_metadata?.thumbnail,
              };
              break;

            case "audio":
            case "ptt":
              formattedMessage.audio = {
                link: message.media_url,
                data: message.media_data,
                mimetype:
                  message.media_metadata?.mimetype || "audio/ogg; codecs=opus",
              };
              if (
                message.content &&
                message.content !== message.media_metadata?.caption
              ) {
                formattedMessage.text = { body: message.content };
              }
              break;

            case "document":
              formattedMessage.document = {
                link: message.media_url,
                data: message.media_data,
                mimetype: message.media_metadata?.mimetype,
                filename: message.media_metadata?.filename,
                caption: message.media_metadata?.caption,
                pageCount: message.media_metadata?.page_count,
                fileSize: message.media_metadata?.file_size,
              };
              break;

            case "location":
              formattedMessage.location = message.content
                ? JSON.parse(message.content)
                : null;
              break;

            case "order":
              formattedMessage.order = message.content
                ? JSON.parse(message.content)
                : null;
              break;

            case "sticker":
              formattedMessage.sticker = {
                data: message.media_data,
                mimetype: message.media_metadata?.mimetype,
              };
              break;

            case "call_log":
              formattedMessage.call_log = {
                status: "missed", // Default status
                duration: 0,
                timestamp: timestamp,
              };
              if (message.content) {
                const callData = JSON.parse(message.content);
                formattedMessage.call_log = {
                  status: callData.status || "missed",
                  duration: callData.duration || 0,
                  timestamp: callData.timestamp || timestamp,
                };
              }
              break;

            case "privateNote":
              formattedMessage.text = {
                body: message.content || "",
              };
              formattedMessage.from_me = true;
              formattedMessage.from_name = message.author;
              break;

            default:
              console.warn(`Unknown message type: ${message.message_type}`);
              if (message.media_data || message.media_url) {
                formattedMessage[message.message_type] = {
                  data: message.media_data,
                  url: message.media_url,
                  metadata: message.media_metadata
                    ? JSON.parse(message.media_metadata)
                    : null,
                };
              } else {
                formattedMessage.text = {
                  body: message.content || "",
                };
              }
          }

          formattedMessages.push(formattedMessage);
        }
      });

      // Add reactions to the respective messages
      formattedMessages.forEach((message) => {
        if (reactionsMap[message.id]) {
          message.reactions = reactionsMap[message.id];
        }
      });

      // Sort messages by timestamp to ensure proper chronological order
      formattedMessages.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.createdAt || 0).getTime();
        const bTime = new Date(b.timestamp || b.createdAt || 0).getTime();
        return aTime - bTime; // Oldest first
      });
      console.log("formattedMessages:", formattedMessages);
      setAllMessages(formattedMessages); // Store all messages for filtering

      // Update last message timestamp for polling
      if (formattedMessages.length > 0) {
        const latestMessage = formattedMessages[formattedMessages.length - 1];
        const latestTimestamp = new Date(
          latestMessage.timestamp || latestMessage.createdAt || 0
        ).getTime();
        setLastMessageTimestamp(latestTimestamp);
      }

      //  fetchContactsBackground();
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }

  // Add polling function to check for new messages every 5 seconds for better real-time updates
  const pollForNewMessages = useCallback(async () => {
    if (!selectedChatId || !userData) return;

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Get user data and company info from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail)}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) return;

      const userData = await userResponse.json();
      const companyId = userData.company_id;

      // Fetch all messages from SQL (without phone filtering)
      const messagesResponse = await fetch(
        `${baseUrl}/api/messages?chatId=${selectedChatId}&companyId=${companyId}`,
        {
          credentials: "include",
        }
      );

      if (!messagesResponse.ok) return;

      const messages = await messagesResponse.json();

      // Filter messages that are newer than our last known timestamp
      const newMessages = messages.filter((message: any) => {
        const messageTimestamp = new Date(message.timestamp).getTime();
        return messageTimestamp > lastMessageTimestamp;
      });

      if (newMessages.length > 0) {
        console.log(`Found ${newMessages.length} new messages`);

        // Format new messages using the same logic as fetchMessages
        const formattedNewMessages: any[] = [];
        const reactionsMap: Record<string, any[]> = {};

        newMessages.forEach((message: any) => {
          if (
            message.message_type === "action" &&
            message.content?.type === "reaction"
          ) {
            const targetMessageId = message.content.target;
            if (!reactionsMap[targetMessageId]) {
              reactionsMap[targetMessageId] = [];
            }
            reactionsMap[targetMessageId].push({
              emoji: message.content.emoji,
              from_name: message.author,
            });
          } else {
            const formattedMessage: any = {
              id:
                message.message_id ||
                `poll-${message.chat_id}-${message.timestamp}-${Math.random()
                  .toString(36)
                  .substr(2, 9)}`,
              from_me: message.from_me,
              from_name: message.author,
              from: message.customer_phone,
              chat_id: message.chat_id,
              type: message.message_type,
              author: message.author,
              name: message.author,
              phoneIndex: message.phone_index,
              userName: message.author,
              edited: message.edited || false,
            };

            // Handle timestamp
            const timestamp = new Date(message.timestamp).getTime() / 1000;
            formattedMessage.createdAt = timestamp;
            formattedMessage.timestamp = timestamp;

            // Include message-specific content (same switch logic as fetchMessages)
            switch (message.message_type) {
              case "text":
              case "chat":
                let quotedContext = null;
                if (message.quoted_message) {
                  try {
                    quotedContext = {
                      id: message.quoted_message.message_id,
                      type: message.quoted_message.message_type,
                      from: message.quoted_message.quoted_author,
                      body: message.quoted_message.quoted_content?.body || "",
                      ...message.quoted_message.quoted_content,
                    };
                  } catch (error) {
                    console.error("Error parsing quoted message:", error);
                  }
                }

                formattedMessage.text = {
                  body: message.content || "",
                  context: quotedContext,
                };
                break;

              case "image":
                formattedMessage.image = {
                  link: message.media_url,
                  data: message.media_data,
                  mimetype: message.media_metadata?.mimetype,
                  filename: message.media_metadata?.filename,
                  caption: message.media_metadata?.caption,
                  width: message.media_metadata?.width,
                  height: message.media_metadata?.height,
                  thumbnail: message.media_metadata?.thumbnail,
                };
                break;

              case "video":
                formattedMessage.video = {
                  link: message.media_url,
                  data: message.media_data,
                  mimetype: message.media_metadata?.mimetype,
                  filename: message.media_metadata?.filename,
                  caption: message.media_metadata?.caption,
                  thumbnail: message.media_metadata?.thumbnail,
                };
                break;

              case "audio":
              case "ptt":
                formattedMessage.audio = {
                  link: message.media_url,
                  data: message.media_data,
                  mimetype:
                    message.media_metadata?.mimetype ||
                    "audio/ogg; codecs=opus",
                };
                if (
                  message.content &&
                  message.content !== message.media_metadata?.caption
                ) {
                  formattedMessage.text = { body: message.content };
                }
                break;

              case "document":
                formattedMessage.document = {
                  link: message.media_url,
                  data: message.media_data,
                  mimetype: message.media_metadata?.mimetype,
                  filename: message.media_metadata?.filename,
                  caption: message.media_metadata?.caption,
                  pageCount: message.media_metadata?.page_count,
                  fileSize: message.media_metadata?.file_size,
                };
                break;

              case "location":
                formattedMessage.location = message.content
                  ? JSON.parse(message.content)
                  : null;
                break;

              case "order":
                formattedMessage.order = message.content
                  ? JSON.parse(message.content)
                  : null;
                break;

              case "sticker":
                formattedMessage.sticker = {
                  data: message.media_data,
                  mimetype: message.media_metadata?.mimetype,
                };
                break;

              case "call_log":
                formattedMessage.call_log = {
                  status: "missed",
                  duration: 0,
                  timestamp: timestamp,
                };
                if (message.content) {
                  const callData = JSON.parse(message.content);
                  formattedMessage.call_log = {
                    status: callData.status || "missed",
                    duration: callData.duration || 0,
                    timestamp: callData.timestamp || timestamp,
                  };
                }
                break;

              case "privateNote":
                formattedMessage.text = {
                  body: message.content || "",
                };
                formattedMessage.from_me = true;
                formattedMessage.from_name = message.author;
                break;

              default:
                console.warn(`Unknown message type: ${message.message_type}`);
                if (message.media_data || message.media_url) {
                  formattedMessage[message.message_type] = {
                    data: message.media_data,
                    url: message.media_url,
                    metadata: message.media_metadata
                      ? JSON.parse(message.media_metadata)
                      : null,
                  };
                } else {
                  formattedMessage.text = {
                    body: message.content || "",
                  };
                }
            }

            formattedNewMessages.push(formattedMessage);
          }
        });

        // Add reactions to the respective messages
        formattedNewMessages.forEach((message) => {
          if (reactionsMap[message.id]) {
            message.reactions = reactionsMap[message.id];
          }
        });

        // Sort new messages by timestamp
        formattedNewMessages.sort((a, b) => {
          const aTime = new Date(a.timestamp || a.createdAt || 0).getTime();
          const bTime = new Date(b.timestamp || b.createdAt || 0).getTime();
          return aTime - bTime; // Oldest first
        });

        // Add new messages to existing all messages
        setAllMessages((prevAllMessages) => {
          // Filter out any messages that already exist to prevent duplicates
          const existingMessageIds = new Set(
            prevAllMessages.map((msg) => msg.id)
          );
          const uniqueNewMessages = formattedNewMessages.filter(
            (msg) => !existingMessageIds.has(msg.id)
          );

          // Only add truly new messages
          if (uniqueNewMessages.length > 0) {
            const updatedAllMessages = [
              ...prevAllMessages,
              ...uniqueNewMessages,
            ];
            // Store updated messages in localStorage
            storeMessagesInLocalStorage(selectedChatId, updatedAllMessages);

            // Update last message timestamp only for unique new messages
            const latestMessage =
              uniqueNewMessages[uniqueNewMessages.length - 1];
            const latestTimestamp = new Date(
              latestMessage.timestamp || latestMessage.createdAt || 0
            ).getTime();
            setLastMessageTimestamp(latestTimestamp);

            // Scroll to bottom when new messages arrive
            setTimeout(() => {
              if (messageListRef.current) {
                messageListRef.current.scrollTop =
                  messageListRef.current.scrollHeight;
              }
            }, 100);

            return updatedAllMessages;
          }

          // No new messages, return previous state
          return prevAllMessages;
        });

        // Remove the duplicate timestamp update code below
      }
    } catch (error) {
      console.error("Error polling for new messages:", error);
    }
  }, [selectedChatId, userData, lastMessageTimestamp, baseUrl]);

  // Start/stop polling based on chat selection
  useEffect(() => {
    if (selectedChatId && userData) {
      console.log("Starting message polling for chat:", selectedChatId);
      setIsPolling(true);

      // Start polling every 15 seconds
      pollingIntervalRef.current = setInterval(pollForNewMessages, 5000); // Poll every 5 seconds for better real-time updates
    } else {
      console.log("Stopping message polling");
      setIsPolling(false);

      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedChatId, userData, pollForNewMessages]);

  async function fetchMessagesBackground(
    selectedChatId: string,
    whapiToken: string
  ) {
    const userEmail = localStorage.getItem("userEmail");
    try {
      // Get user data and company info from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;

      // Get company data
      const companyResponse = await fetch(
        `${baseUrl}/api/company-data?companyId=${companyId}`,
        {
          credentials: "include",
        }
      );

      if (!companyResponse.ok) {
        throw new Error("Failed to fetch company data");
      }

      const companyData = await companyResponse.json();

      // Fetch all messages from SQL (without phone filtering)
      const messagesResponse = await fetch(
        `${baseUrl}/api/messages?chatId=${selectedChatId}&companyId=${companyId}`,
        {
          credentials: "include",
        }
      );

      if (!messagesResponse.ok) {
        throw new Error("Failed to fetch messages");
      }

      const messages = await messagesResponse.json();

      const formattedMessages: any[] = [];
      const reactionsMap: Record<string, any[]> = {};

      messages.forEach(async (message: any) => {
        if (
          message.message_type === "action" &&
          message.content?.type === "reaction"
        ) {
          const targetMessageId = message.content.target;
          if (!reactionsMap[targetMessageId]) {
            reactionsMap[targetMessageId] = [];
          }
          reactionsMap[targetMessageId].push({
            emoji: message.content.emoji,
            from_name: message.author,
          });
        } else {
          const formattedMessage: any = {
            id: message.message_id,
            from_me: message.from_me,
            from_name: message.author,
            from: message.customer_phone,
            chat_id: message.chat_id,
            type: message.message_type,
            author: message.author,
            name: message.author,
            phoneIndex: message.phone_index,
            userName: message.author,
            edited: message.edited || false,
          };

          // Handle timestamp
          const timestamp = new Date(message.timestamp).getTime() / 1000;
          formattedMessage.createdAt = timestamp;
          formattedMessage.timestamp = timestamp;

          // Include message-specific content
          switch (message.message_type) {
            case "text":
            case "chat":
              let quotedContext = null;
              if (message.quoted_message) {
                try {
                  const quotedData = JSON.parse(message.quoted_message);
                  quotedContext = {
                    id: quotedData.message_id,
                    type: quotedData.message_type,
                    from: quotedData.quoted_author,
                    body: quotedData.quoted_content?.body || "",
                    ...quotedData.quoted_content,
                  };
                } catch (error) {
                  console.error("Error parsing quoted message:", error);
                }
              }

              formattedMessage.text = {
                body: message.content || "",
                context: quotedContext,
              };
              break;

            case "image":
              formattedMessage.image = {
                data: message.media_data,
                mimetype: message.media_metadata?.mimetype,
                filename: message.media_metadata?.filename,
                caption: message.media_metadata?.caption,
                width: message.media_metadata?.width,
                height: message.media_metadata?.height,
                thumbnail: message.media_metadata?.thumbnail,
              };
              break;

            case "video":
              formattedMessage.video = {
                link: message.media_url,
                data: message.media_data,
                mimetype: message.media_metadata?.mimetype,
                filename: message.media_metadata?.filename,
                caption: message.media_metadata?.caption,
                thumbnail: message.media_metadata?.thumbnail,
              };
              break;

            case "audio":
            case "ptt":
              formattedMessage.audio = {
                data: message.media_data,
                mimetype:
                  message.media_metadata?.mimetype || "audio/ogg; codecs=opus",
              };
              if (
                message.content &&
                message.content !== message.media_metadata?.caption
              ) {
                formattedMessage.text = { body: message.content };
              }
              break;

            case "document":
              formattedMessage.document = {
                data: message.media_data,
                mimetype: message.media_metadata?.mimetype,
                filename: message.media_metadata?.filename,
                caption: message.media_metadata?.caption,
                pageCount: message.media_metadata?.page_count,
                fileSize: message.media_metadata?.file_size,
              };
              break;

            case "location":
              formattedMessage.location = message.content
                ? JSON.parse(message.content)
                : null;
              break;

            case "order":
              formattedMessage.order = message.content
                ? JSON.parse(message.content)
                : null;
              break;

            case "sticker":
              formattedMessage.sticker = {
                data: message.media_data,
                mimetype: message.media_metadata?.mimetype,
              };
              break;

            case "call_log":
              formattedMessage.call_log = {
                status: "missed", // Default status
                duration: 0,
                timestamp: timestamp,
              };
              if (message.content) {
                const callData = JSON.parse(message.content);
                formattedMessage.call_log = {
                  status: callData.status || "missed",
                  duration: callData.duration || 0,
                  timestamp: callData.timestamp || timestamp,
                };
              }
              break;

            case "privateNote":
              formattedMessage.text = {
                body: message.content || "",
              };
              formattedMessage.from_me = true;
              formattedMessage.from_name = message.author;
              break;

            default:
              console.warn(`Unknown message type: ${message.message_type}`);
              if (message.media_data || message.media_url) {
                formattedMessage[message.message_type] = {
                  data: message.media_data,
                  url: message.media_url,
                  metadata: message.media_metadata
                    ? JSON.parse(message.media_metadata)
                    : null,
                };
              } else {
                formattedMessage.text = {
                  body: message.content || "",
                };
              }
          }

          formattedMessages.push(formattedMessage);
        }
      });

      // Add reactions to the respective messages
      formattedMessages.forEach((message) => {
        if (reactionsMap[message.id]) {
          message.reactions = reactionsMap[message.id];
        }
      });

      // Sort messages by timestamp to ensure proper chronological order
      formattedMessages.sort((a, b) => {
        const aTime = new Date(a.timestamp || a.createdAt || 0).getTime();
        const bTime = new Date(b.timestamp || b.createdAt || 0).getTime();
        return aTime - bTime; // Oldest first
      });

      storeMessagesInLocalStorage(selectedChatId, formattedMessages);
      setAllMessages(formattedMessages); // Store all messages for filtering
      console.log(messages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  }

  const handleAddPrivateNote = async (newMessage: string) => {
    if (!newMessage.trim() || !selectedChatId) return;

    try {
      // Get user info from localStorage or state
      const userEmail = localStorage.getItem("userEmail") || userData?.email;
      const from = userData?.name || userEmail || "";
      const companyIdToUse = companyId || userData?.companyId;

      if (!companyIdToUse || !selectedChatId || !from) {
        toast.error("Missing required fields for private note");
        return;
      }

      // Compose API payload
      const payload = {
        companyId: companyIdToUse,
        chatId: selectedChatId,
        text: newMessage,
        from,
        fromEmail: userEmail || "",
      };

      // Call the backend API
      const response = await fetch(`${baseUrl}/api/private-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        toast.error("Failed to add private note");
        return;
      }

      const data = await response.json();
      if (!data.success) {
        toast.error("Failed to add private note");
        return;
      }

      // Update local state
      setPrivateNotes((prevNotes) => ({
        ...prevNotes,
        [selectedChatId]: [
          ...(prevNotes[selectedChatId] || []),
          {
            id: data.note.id,
            text: data.note.text,
            timestamp: new Date(data.note.timestamp).getTime(),
          },
        ],
      }));

      fetchMessages(selectedChatId, "");

      setNewMessage("");
      toast.success("Private note added successfully!");
    } catch (error) {
      console.error("Error adding private note:", error);
      toast.error("Failed to add private note");
    }
  };

  const handleSendMessage = async (retryMessage?: any) => {
    const messageToSend = retryMessage || newMessage;
    if (!messageToSend.trim() || !selectedChatId) return;

    // Store the message text before clearing input
    const messageText = messageToSend;
    if (!retryMessage) {
      setNewMessage("");
      setReplyToMessage(null);
    }

    // Get the current phoneIndex the user is using
    const currentPhoneIndex = userData?.phone;
    const userEmail = localStorage.getItem("userEmail");

    // Create temporary message object for immediate display
    const tempMessage = {
      id: `temp_${Date.now()}`,
      from_me: true,
      text: { body: messageText },
      createdAt: new Date().toISOString(),
      type: "text",
      phoneIndex: currentPhoneIndex,
      chat_id: selectedChatId,
      from_name: userEmail || "",
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Update UI immediately for instant feedback
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        ...tempMessage,
      } as unknown as Message,
    ]);

    // Also update allMessages to ensure consistency
    setAllMessages((prevAllMessages) => [
      ...prevAllMessages,
      {
        ...tempMessage,
      } as unknown as Message,
    ]);

    // Update localStorage immediately
    const currentMessages = getMessagesFromLocalStorage(selectedChatId) || [];
    const updatedMessages = [...currentMessages, tempMessage];
    storeMessagesInLocalStorage(selectedChatId, updatedMessages);

    try {
      const userEmail = localStorage.getItem("userEmail");

      // Get user data from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;
      const phoneIndex = currentPhoneIndex;
      const userName = userData.name || userData.email || "";

      // Get company data from SQL
      const companyResponse: Response = await fetch(
        `${baseUrl}/api/company-data?companyId=${companyId}`,
        {
          credentials: "include",
        }
      );

      if (!companyResponse.ok) throw new Error("Failed to fetch company data");
      const companyData = await companyResponse.json();
      const apiUrl = companyData.api_url || "https://juta-dev.ngrok.dev";

      if (messageMode === "privateNote") {
        handleAddPrivateNote(messageText);
        return;
      }

      // Send message to API
      // changed in backend from using contactID (companyID-PhoneNumber) to chatID (@c.us or @g.us)
      const url = `${baseUrl}/api/v2/messages/text/${companyId}/${selectedContactId}`;
      const requestBody = {
        message: messageText,
        quotedMessageId: replyToMessage?.id || null,
        phoneIndex: phoneIndex,
        userName: userData?.name || "",
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const now = new Date();
      const data = await response.json();

      // Create the final message object with the server response
      // const finalMessage: Message = {
      //   id: data.message_id || tempMessage.id,
      //   from_me: true,
      //   text: { body: messageText },
      //   createdAt: new Date().getTime(),
      //   type: "text",
      //   phoneIndex: phoneIndex,
      //   chat_id: selectedChatId,
      //   from_name: userName,
      //   timestamp: Math.floor(now.getTime() / 1000),
      //   author: userName,
      // };

      // Handle special case for company 0123
      if (companyId === "0123" && selectedContact?.id) {
        // Update contact in SQL
        const updateResponse = await fetch(
          `${baseUrl}/api/contacts/${selectedContact.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              company_id: companyId,
              tags: ["stop bot"],
              last_message: {
                text: { body: messageText },
                chat_id: selectedContact.chat_id || "",
                timestamp: Math.floor(now.getTime() / 1000),
                id: selectedContact.last_message?.id || `temp_${now.getTime()}`,
                from_me: true,
                type: "text",
                phoneIndex,
              },
            }),
          }
        );

        if (updateResponse.ok) {
          setContacts((prevContacts) =>
            prevContacts.map((contact) =>
              contact.id === selectedContact.id
                ? { ...contact, tags: [...(contact.tags || []), "stop bot"] }
                : contact
            )
          );
        }
      } else {
        // Update contact's last message in SQL
        /* const updateResponse = await fetch(`${baseUrl}/api/contacts/${selectedContact?.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            company_id: companyId,
            last_message: {
              text: { body: messageText },
              chat_id: selectedContact?.chat_id || '',
              timestamp: Math.floor(now.getTime() / 1000),
              id: selectedContact?.last_message?.id || `temp_${now.getTime()}`,
              from_me: true,
              type: 'text',
              phoneIndex,
            }
          })
        });*/
      }

      // Fetch updated messages in the background to ensure consistency
      fetchMessagesBackground(selectedChatId, companyData.api_token);

      // Update the temporary message with the actual server response
      if (data && data.message_id) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === tempMessage.id
              ? { ...msg, id: data.message_id, status: "sent" }
              : msg
          )
        );

        setAllMessages((prevAllMessages) =>
          prevAllMessages.map((msg) =>
            msg.id === tempMessage.id
              ? { ...msg, id: data.message_id, status: "sent" }
              : msg
          )
        );
      }

      // Immediately trigger a message refresh to ensure the system reflects the sent message
      setTimeout(() => {
        pollForNewMessages();
      }, 1000);

      // Update the contact's last message in the contact list
      if (selectedContact) {
        const finalMessage: Message = {
          id: data?.message_id || tempMessage.id,
          text: { body: messageText },
          chat_id: selectedChatId,
          timestamp: Math.floor(now.getTime() / 1000),
          from_me: true,
          type: "text",
          phoneIndex: phoneIndex,
          from_name: userName,
          status: "sent" as const,
          created_at: new Date().toISOString(),
        };

        const updateContactWithNewMessage = (contact: Contact) => {
          if (
            contact.id === selectedContact.id ||
            contact.chat_id === selectedContact.chat_id ||
            contact.contact_id === selectedContact.contact_id
          ) {
            return {
              ...contact,
              last_message: {
                ...finalMessage,
                created_at: new Date().toISOString(),
                status: "sent" as const,
              },
            };
          }
          return contact;
        };

        setContacts((prevContacts) =>
          prevContacts.map(updateContactWithNewMessage)
        );

        setFilteredContacts((prevFilteredContacts) =>
          prevFilteredContacts.map(updateContactWithNewMessage)
        );

        // Update localStorage for contacts
        const storedContacts = localStorage.getItem("contacts");
        if (storedContacts) {
          try {
            const decompressedContacts = JSON.parse(
              LZString.decompress(storedContacts)!
            );
            const updatedContacts = decompressedContacts.map(
              updateContactWithNewMessage
            );
            localStorage.setItem(
              "contacts",
              LZString.compress(JSON.stringify(updatedContacts))
            );
          } catch (error) {
            console.error("Error updating contacts in localStorage:", error);
          }
        }
      }

      // Update localStorage with the final message
      const currentMessages = getMessagesFromLocalStorage(selectedChatId) || [];
      const updatedMessages = currentMessages.map((msg) =>
        msg.id === tempMessage.id
          ? { ...msg, id: data?.message_id || tempMessage.id, status: "sent" }
          : msg
      );
      storeMessagesInLocalStorage(selectedChatId, updatedMessages);
    } catch (error) {
      console.error("Error sending message:", error);

      // Keep the message in UI but mark it as failed
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === tempMessage.id
            ? {
                ...msg,
                status: "failed",
                error:
                  error instanceof Error ? error.message : "Failed to send",
              }
            : msg
        )
      );

      setAllMessages((prevAllMessages) =>
        prevAllMessages.map((msg) =>
          msg.id === tempMessage.id
            ? {
                ...msg,
                status: "failed",
                error:
                  error instanceof Error ? error.message : "Failed to send",
              }
            : msg
        )
      );

      // Update localStorage with failed status
      const currentMessages = getMessagesFromLocalStorage(selectedChatId) || [];
      const updatedMessages = currentMessages.map((msg) =>
        msg.id === tempMessage.id
          ? {
              ...msg,
              status: "failed",
              error: error instanceof Error ? error.message : "Failed to send",
            }
          : msg
      );
      storeMessagesInLocalStorage(selectedChatId, updatedMessages);

      // Show error toast but keep message visible
      toast.error(
        "Message sent but may not have been delivered. Please check your connection."
      );
    }
  };

  const handleRetryMessage = async (message: any) => {
    try {
      // Remove the failed message from UI
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== message.id)
      );

      setAllMessages((prevAllMessages) =>
        prevAllMessages.filter((msg) => msg.id !== message.id)
      );

      // Remove from localStorage
      const currentMessages =
        getMessagesFromLocalStorage(selectedChatId || "") || [];
      const filteredMessages = currentMessages.filter(
        (msg) => msg.id !== message.id
      );
      storeMessagesInLocalStorage(selectedChatId || "", filteredMessages);

      // Retry sending the message
      await handleSendMessage(message.text?.body || message.text);

      toast.success("Message retried successfully!");
    } catch (error) {
      console.error("Error retrying message:", error);
      toast.error("Failed to retry message. Please try again.");
    }
  };

  // const updateContactWithNewMessage = (
  //   contact: Contact,
  //   newMessage: string,
  //   now: Date,
  //   phoneIndex: number
  // ): Contact => {
  //   const updatedLastMessage: Message = {
  //     text: { body: newMessage },
  //     chat_id: contact.chat_id || "",
  //     timestamp: Math.floor(now.getTime() / 1000),
  //     id: contact.last_message?.id || `temp_${now.getTime()}`,
  //     from_me: true,
  //     type: "text",
  //     from_name: contact.last_message?.from_name || "",
  //     phoneIndex,
  //     // Add any other required fields with appropriate default values
  //   };

  //   return {
  //     ...contact,
  //     last_message: updatedLastMessage,
  //   };
  // };
  const openNewChatModal = () => {
    setIsNewChatModalOpen(true);
  };

  const closeNewChatModal = () => {
    setIsNewChatModalOpen(false);
    setNewContactNumber("");
  };

  const handleCreateNewChat = async () => {
    if (userRole === "3") {
      toast.error("You don't have permission to create new chats.");
      return;
    }

    if (!newContactNumber) return;

    try {
      // Format the phone number (basic: ensure it starts with +, remove spaces)
      const formattedPhone = newContactNumber.startsWith("+")
        ? newContactNumber.replace(/\s+/g, "")
        : "+" + newContactNumber.replace(/\s+/g, "");

      // Get user/company info from localStorage or your app state
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }

      // Fetch user config to get companyId
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
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData?.company_id;
      if (!companyId) {
        toast.error("Company ID not found!");
        return;
      }

      // Generate contact_id as companyId + phone
      const contact_id = companyId + "-" + formattedPhone.replace("+", "");
      const chat_id = formattedPhone.replace("+", "") + "@c.us";

      // Prepare the contact data
      const contactData: { [key: string]: any } = {
        contact_id,
        companyId,
        contactName: formattedPhone,
        name: formattedPhone,
        phone: formattedPhone,
        chat_id,
        tags: [],
        unreadCount: 0,
      };

      // Send POST request to your SQL backend
      const response = await fetch(`${baseUrl}/api/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(contactData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Contact added successfully!");
        setContacts((prevContacts) => [
          ...prevContacts,
          contactData as Contact,
        ]);
        closeNewChatModal();
        // Select the new chat
        selectChat(chat_id, contact_id, contactData as Contact);
      } else {
        toast.error(data.message || "Failed to add contact");
      }
    } catch (error: any) {
      console.error("Error creating new chat:", error);
      toast.error(
        "An error occurred while creating the chat: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const actionPerformedRef = useRef(false);
  const toggleStopBotLabel = useCallback(
    async (
      contact: Contact,
      index: number,
      event: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (actionPerformedRef.current) return;
      actionPerformedRef.current = true;

      if (userRole === "3") {
        toast.error("You don't have permission to control the bot.");
        return;
      }

      try {
        const userEmail = localStorage.getItem("userEmail");

        // Get user data from SQL
        const userResponse = await fetch(
          `${baseUrl}/api/user-data?email=${encodeURIComponent(
            userEmail || ""
          )}`,
          {
            credentials: "include",
          }
        );

        if (!userResponse.ok) throw new Error("Failed to fetch user data");
        const userData = await userResponse.json();
        const companyId = userData.company_id;

        console.log(companyId);
        if (!companyId || !contact.contact_id) {
          toast.error("Missing company or contact ID");
          return;
        }

        const hasLabel = contact.tags?.includes("stop bot") || false;
        let response, data, newTags;

        if (!hasLabel) {
          // Add the tag
          response = await fetch(
            `${baseUrl}/api/contacts/${companyId}/${contact.contact_id}/tags`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tags: ["stop bot"] }),
            }
          );
        } else {
          // Remove the tag
          response = await fetch(
            `${baseUrl}/api/contacts/${companyId}/${contact.contact_id}/tags`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tags: ["stop bot"] }),
            }
          );
        }

        if (!response.ok) {
          throw new Error("Failed to toggle bot status");
        }

        data = await response.json();
        const apiTags = data.tags || [];

        // Manually construct the new tags to ensure we preserve existing tags
        const currentTags = contact.tags || [];
        if (!hasLabel) {
          // Adding "stop bot" tag - preserve all existing tags
          newTags = currentTags.includes("stop bot")
            ? currentTags
            : [...currentTags, "stop bot"];
        } else {
          // Removing "stop bot" tag - preserve all other tags
          newTags = currentTags.filter((tag) => tag !== "stop bot");
        }

        // Update all contact states immediately with better matching - preserve all existing data
        const updateContactsList = (prevContacts: Contact[]) =>
          prevContacts.map((c) => {
            if (c.id === contact.id || c.contact_id === contact.contact_id) {
              // Preserve all existing contact data, only update tags
              return {
                ...c,
                tags: newTags,
                // Ensure other fields are preserved
                assignedTo: c.assignedTo,
                notes: c.notes,
                points: c.points,
                // Preserve any other custom fields
                ...Object.fromEntries(
                  Object.entries(c).filter(([key]) => !["tags"].includes(key))
                ),
              };
            }
            return c;
          });

        setContacts(updateContactsList);
        setLoadedContacts((prevLoadedContacts) =>
          updateContactsList(prevLoadedContacts)
        );
        setFilteredContacts((prevFilteredContacts) =>
          updateContactsList(prevFilteredContacts)
        );

        // Update selectedContact if it's the same contact - preserve all fields
        if (
          selectedContact &&
          (selectedContact.id === contact.id ||
            selectedContact.contact_id === contact.contact_id)
        ) {
          setSelectedContact((prevContact: Contact) => ({
            ...prevContact,
            tags: newTags,
            // Explicitly preserve critical fields
            assignedTo: prevContact.assignedTo,
            notes: prevContact.notes,
            points: prevContact.points,
          }));
        }

        // Update localStorage immediately
        const storedContacts = localStorage.getItem("contacts");
        if (storedContacts) {
          try {
            const decompressedContacts = JSON.parse(
              LZString.decompress(storedContacts)!
            );
            const updatedContacts = decompressedContacts.map((c: Contact) => {
              if (c.id === contact.id || c.contact_id === contact.contact_id) {
                // Preserve all existing contact data, only update tags
                return {
                  ...c,
                  tags: newTags,
                  // Ensure critical fields are preserved
                  assignedTo: c.assignedTo,
                  notes: c.notes,
                  points: c.points,
                };
              }
              return c;
            });
            localStorage.setItem(
              "contacts",
              LZString.compress(JSON.stringify(updatedContacts))
            );
          } catch (error) {
            console.error("Error updating contacts in localStorage:", error);
          }
        }
        sessionStorage.setItem("contactsFetched", "true");

        console.log(
          "📝 [TAG] Updated contact tags for:",
          contact.contactName,
          "new tags:",
          newTags
        );

        // Send WebSocket message to notify other clients
        if (wsConnection && wsConnected) {
          const wsMessage = {
            type: "bot_status_update",
            contactId: contact.contact_id,
            botEnabled: !hasLabel,
            updatedTags: newTags,
            timestamp: Date.now(),
          };
          wsConnection.send(JSON.stringify(wsMessage));
          console.log("🤖 [WEBSOCKET] Sent bot status update:", wsMessage);
        }

        // Show a success toast
        toast.success(
          `Bot ${!hasLabel ? "disabled" : "enabled"} for ${
            contact.contactName || contact.firstName || contact.phone
          }`
        );
      } catch (error) {
        console.error("Error toggling label:", error);
        toast.error("Failed to toggle bot status");
      } finally {
        setTimeout(() => {
          actionPerformedRef.current = false;
        }, 100);
      }
    },
    [contacts, userRole]
  );

  useEffect(() => {
    setFilteredContacts(loadedContacts.length > 0 ? loadedContacts : contacts);
  }, [contacts]);

  // Update selectedContact when contacts array changes (for real-time updates)
  useEffect(() => {
    if (selectedContact && contacts.length > 0) {
      const updatedSelectedContact = contacts.find(
        (c) =>
          c.id === selectedContact.id ||
          c.contact_id === selectedContact.contact_id
      );

      if (
        updatedSelectedContact &&
        JSON.stringify(updatedSelectedContact) !==
          JSON.stringify(selectedContact)
      ) {
        console.log(
          "📝 [REALTIME] Updating selectedContact from contacts array changes"
        );
        console.log(
          "📝 [REALTIME] Old selectedContact tags:",
          selectedContact.tags
        );
        console.log(
          "📝 [REALTIME] New selectedContact tags:",
          updatedSelectedContact.tags
        );
        console.log(
          "📝 [REALTIME] Old selectedContact assignedTo:",
          selectedContact.assignedTo
        );
        console.log(
          "📝 [REALTIME] New selectedContact assignedTo:",
          updatedSelectedContact.assignedTo
        );
        setSelectedContact(updatedSelectedContact);
      }
    }
  }, [contacts]);

  // Also watch filteredContacts for real-time updates
  useEffect(() => {
    if (selectedContact && filteredContacts.length > 0) {
      const updatedSelectedContact = filteredContacts.find(
        (c) =>
          c.id === selectedContact.id ||
          c.contact_id === selectedContact.contact_id
      );

      if (
        updatedSelectedContact &&
        JSON.stringify(updatedSelectedContact) !==
          JSON.stringify(selectedContact)
      ) {
        console.log(
          "📝 [REALTIME] Updating selectedContact from filteredContacts array changes"
        );
        setSelectedContact(updatedSelectedContact);
      }
    }
  }, [filteredContacts]);

  // Add this function to your Chat page
  const handleTagFollowUp = async (
    selectedContacts: Contact[],
    templateId: string
  ) => {
    try {
      // Get company and user data
      const userEmail = localStorage.getItem("userEmail");
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId) {
        toast.error("Missing company ID");
        return;
      }

      // Prepare the requests for each contact
      const requests = selectedContacts.map((contact) => {
        const phoneNumber = contact.phone?.replace(/\D/g, "");
        return fetch(`${baseUrl}/api/tag/followup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestType: "startTemplate",
            phone: phoneNumber,
            first_name:
              contact.contactName ||
              contact.firstName ||
              contact.name ||
              phoneNumber,
            phoneIndex: contact.phoneIndex || 0,
            templateId: templateId,
            idSubstring: companyId,
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(
                `Follow-up API error for ${phoneNumber}: ${response.statusText}`
              );
            }
            return { success: true, phone: phoneNumber };
          })
          .catch((error) => {
            console.error(`Error processing ${phoneNumber}:`, error);
            return { success: false, phone: phoneNumber, error };
          });
      });

      // Process requests in batches (you can adjust these values)
      const BATCH_SIZE = 5;
      const DELAY_BETWEEN_BATCHES = 1000; // 1 second

      const results = await processBatchRequests(
        requests,
        BATCH_SIZE,
        DELAY_BETWEEN_BATCHES
      );

      // Count successes and failures
      const successes = results.filter((r) => r.success).length;
      const failures = results.filter((r) => !r.success).length;

      // Show appropriate toast messages
      if (successes > 0) {
        toast.success(`Follow-up sequences started for ${successes} contacts`);
      }
      if (failures > 0) {
        toast.error(
          `Failed to start follow-up sequences for ${failures} contacts`
        );
      }
    } catch (error) {
      console.error("Error processing follow-up sequences:", error);
      toast.error("Failed to process follow-up sequences");
    }
  };

  // Helper function for batch processing (add this if you don't have it)
  const processBatchRequests = async (
    requests: Promise<any>[],
    batchSize: number,
    delay: number
  ) => {
    const results = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < requests.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return results;
  };

  // Example usage in your existing handleAddTagToSelectedContacts function:
  const handleAddTagToSelectedContacts = async (
    tagName: string,
    contact: Contact
  ) => {
    console.log("🏷️ [TAG ASSIGNMENT] Starting tag assignment:");
    console.log("🏷️ [TAG ASSIGNMENT] Tag name:", tagName);
    console.log("🏷️ [TAG ASSIGNMENT] Contact:", contact);
    console.log("🏷️ [TAG ASSIGNMENT] Contact ID:", contact?.contact_id);
    console.log(
      "🏷️ [TAG ASSIGNMENT] Contact Name:",
      contact?.contactName || contact?.firstName
    );

    if (!contact || !contact.contact_id) {
      toast.error("No contact selected or contact ID missing");
      console.error("🏷️ [TAG ASSIGNMENT] Missing contact or contact ID");
      return;
    }

    try {
      // Get company and user data from your backend
      const userEmail = localStorage.getItem("userEmail");

      // Get user data from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId || !contact.contact_id) {
        toast.error("Missing company or contact ID");
        return;
      }

      // Check if the tag is an employee name
      const employee = employeeList.find((emp) => emp.name === tagName);
      console.log("🔍 Employee search for tag:", tagName, "found:", employee);
      console.log(
        "🔍 Available employees:",
        employeeList.map((emp) => emp.name)
      );
      console.log("🔍 Employee list length:", employeeList.length);

      if (employeeList.length === 0) {
        console.warn("🔍 Employee list is empty, may need to fetch employees");
        toast.warning(
          "Employee list not loaded yet. Please try again in a moment."
        );
        return;
      }

      if (employee) {
        // Assign employee to contact (requires backend endpoint for assignment logic)
        const response = await fetch(
          `${baseUrl}/api/contacts/${companyId}/${contact.contact_id}/assign-employee`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: employee.id,
              employeeName: employee.name,
            }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to assign employee:", errorText);
          toast.error(`Failed to assign ${tagName} to contact: ${errorText}`);
          return;
        }

        const assignmentResult = await response.json();
        console.log("✅ Employee assignment successful:", assignmentResult);

        // Update contact immediately with the new assignment
        // Remove any existing employee tags first, then add the new one
        const currentTags = contact.tags || [];
        const nonEmployeeTags = currentTags.filter(
          (tag) => !employeeList.some((emp) => emp.name === tag)
        );
        const updatedTags = [...nonEmployeeTags, tagName];
        console.log("🏷️ [EMPLOYEE ASSIGNMENT] Updated tags:", updatedTags);
        console.log("🏷️ [EMPLOYEE ASSIGNMENT] Previous tags:", currentTags);

        const updateContactsList = (prevContacts: Contact[]) =>
          prevContacts.map((c) =>
            c.id === contact.id || c.contact_id === contact.contact_id
              ? { ...c, tags: updatedTags, assignedTo: [tagName] }
              : c
          );

        setContacts(updateContactsList);
        setLoadedContacts((prevLoadedContacts) =>
          updateContactsList(prevLoadedContacts)
        );
        setFilteredContacts((prevFilteredContacts) =>
          updateContactsList(prevFilteredContacts)
        );

        // Update selectedContact if it's the same contact
        if (
          selectedContact &&
          (selectedContact.id === contact.id ||
            selectedContact.contact_id === contact.contact_id)
        ) {
          setSelectedContact((prevContact: Contact) => ({
            ...prevContact,
            tags: updatedTags,
            assignedTo: [tagName],
          }));
        }

        // Update localStorage immediately
        const updatedContacts = updateContactsList(contacts);
        localStorage.setItem(
          "contacts",
          LZString.compress(JSON.stringify(updatedContacts))
        );

        // Send WebSocket message to notify other clients
        if (wsConnection && wsConnected) {
          const wsMessage = {
            type: "contact_assignment_update",
            contactId: contact.contact_id,
            assignedTo: tagName,
            updatedTags: updatedTags,
            timestamp: Date.now(),
          };
          wsConnection.send(JSON.stringify(wsMessage));
          console.log(
            "👤 [WEBSOCKET] Sent contact assignment update:",
            wsMessage
          );
        }

        toast.success(`Contact assigned to ${tagName}`);
        return;
      }
      console.log(
        "Adding tag",
        tagName,
        "to contact",
        contact.contact_id,
        "in company",
        companyId
      );
      // Handle non-employee tags (add tag to contact)
      const hasTag = contact.tags?.includes(tagName) || false;
      if (!hasTag) {
        console.log(
          "Adding tag",
          tagName,
          "to contact",
          contact.contact_id,
          "in company",
          companyId
        );
        const response = await fetch(
          `${baseUrl}/api/contacts/${companyId}/${contact.contact_id}/tags`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: [tagName] }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to add tag to contact:", errorText);
          toast.error("Failed to add tag to contact");
          return;
        }
        const data = await response.json();
        const newTags = data.tags || [];

        // Update both contacts and filteredContacts states immediately
        const updateContactsList = (prevContacts: Contact[]) =>
          prevContacts.map((c) =>
            c.id === contact.id || c.contact_id === contact.contact_id
              ? { ...c, tags: newTags }
              : c
          );

        setContacts(updateContactsList);
        setLoadedContacts((prevLoadedContacts) =>
          updateContactsList(prevLoadedContacts)
        );
        setFilteredContacts((prevFilteredContacts) =>
          updateContactsList(prevFilteredContacts)
        );

        // Update localStorage immediately
        const updatedContacts = updateContactsList(contacts);
        localStorage.setItem(
          "contacts",
          LZString.compress(JSON.stringify(updatedContacts))
        );

        // Update selectedContact if it's the same contact
        if (
          selectedContact &&
          (selectedContact.id === contact.id ||
            selectedContact.contact_id === contact.contact_id)
        ) {
          setSelectedContact((prevContact: Contact) => ({
            ...prevContact,
            tags: newTags,
          }));
        }

        // Send WebSocket message to notify other clients
        if (wsConnection && wsConnected) {
          const wsMessage = {
            type: "contact_tags_update",
            contactId: contact.contact_id,
            action: "add",
            tagName: tagName,
            updatedTags: newTags,
            timestamp: Date.now(),
          };
          wsConnection.send(JSON.stringify(wsMessage));
          console.log("🏷️ [WEBSOCKET] Sent contact tags update:", wsMessage);
        }

        console.log(
          "📝 [TAG] Added tag to contact:",
          contact.contactName,
          "tag:",
          tagName,
          "new tags:",
          newTags
        );
        toast.success(`Tag "${tagName}" added to contact`);
      } else {
        toast.info(`Tag "${tagName}" already exists for this contact`);
      }
    } catch (error) {
      console.error("Error adding tag to contact:", error);
      toast.error("Failed to add tag to contact");
    }
  };

  // Fetch scheduled messages for a specific chat
  const fetchScheduledMessages = async (contact_id: string) => {
    try {
      // Get user/company info
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail || !companyId) return [];

      // Call the backend API to fetch scheduled messages for this contact
      const response = await fetch(
        `${baseUrl}/api/scheduled-messages/contact?companyId=${companyId}&contactId=${contact_id}&status=scheduled`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch scheduled messages");
      }

      const data = await response.json();
      // The API returns the scheduled messages sorted already
      return data.messages || [];
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
      return [];
    }
  };

  const formatText = (text: string) => {
    // Enhanced regex to capture more formatting patterns
    const segments = text.split(
      /(\*[^*]+\*|~[^~]+~|_[^_]+_|`[^`]+`|```[^`]+```|https?:\/\/[^\s]+|@[a-zA-Z0-9_]+)/g
    );

    return segments.map((segment, index) => {
      // Check if segment is bold (surrounded by *)
      if (
        segment.startsWith("*") &&
        segment.endsWith("*") &&
        segment.length > 2
      ) {
        return (
          <span key={index} className="font-bold">
            {segment.slice(1, -1)}
          </span>
        );
      }

      // Check if segment is italic (surrounded by _)
      if (
        segment.startsWith("_") &&
        segment.endsWith("_") &&
        segment.length > 2
      ) {
        return (
          <span key={index} className="italic">
            {segment.slice(1, -1)}
          </span>
        );
      }

      // Check if segment is strikethrough (surrounded by ~)
      if (
        segment.startsWith("~") &&
        segment.endsWith("~") &&
        segment.length > 2
      ) {
        return (
          <span key={index} className="line-through">
            {segment.slice(1, -1)}
          </span>
        );
      }

      // Check if segment is inline code (surrounded by `)
      if (
        segment.startsWith("`") &&
        segment.endsWith("`") &&
        segment.length > 2 &&
        !segment.startsWith("```")
      ) {
        return (
          <span
            key={index}
            className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono"
          >
            {segment.slice(1, -1)}
          </span>
        );
      }

      // Check if segment is code block (surrounded by ```)
      if (
        segment.startsWith("```") &&
        segment.endsWith("```") &&
        segment.length > 6
      ) {
        return (
          <div
            key={index}
            className="bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 mb-1 font-mono text-sm overflow-x-auto"
          >
            <pre className="whitespace-pre-wrap">{segment.slice(3, -3)}</pre>
          </div>
        );
      }

      // Check if segment is a URL
      if (segment.match(/^https?:\/\/[^\s]+$/)) {
        return (
          <a
            key={index}
            href={segment}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-blue-400 underline hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
          >
            {segment}
          </a>
        );
      }

      // Check if segment is a mention (starts with @)
      if (segment.match(/^@[a-zA-Z0-9_]+$/)) {
        return (
          <span
            key={index}
            className="text-blue-600 dark:text-blue-400 font-medium"
          >
            {segment}
          </span>
        );
      }

      // Return regular text with improved line spacing
      return <span key={index}>{segment}</span>;
    });
  };
  const openEditMessage = (message: Message) => {
    setEditingMessage(message);
    setEditedMessageText(message.text?.body || "");
  };

  function formatDate(timestamp: string | number | Date) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  const handleEyeClick = () => {
    setIsTabOpen(!isTabOpen);
    const fetchAndDisplayScheduledMessages = async () => {
      const messages = await fetchScheduledMessages(selectedContact.contact_id); // Assuming fetchScheduledMessages is modified to accept a contact ID
      setScheduledMessages(messages || []);
      console.log(messages); // Store the messages in state
    };

    fetchAndDisplayScheduledMessages();
  };

  const handlePageChange = async ({ selected }: { selected: number }) => {
    setCurrentPage(selected);

    // Calculate how many contacts we need to display
    const startIndex = selected * contactsPerPage;
    const endIndex = startIndex + contactsPerPage;

    // Check if this page is already loaded
    const isPageLoaded = loadedPages.has(selected);

    // Only show loading if we need to load more contacts and this page isn't already loaded
    if (
      endIndex > loadedContacts.length &&
      hasMoreContacts &&
      !isLoadingMoreContacts &&
      !isPageLoaded
    ) {
      setIsLoadingMoreContacts(true);
      setLoadingProgress(0);

      try {
        // Add a small delay to show the loading state
        await new Promise((resolve) => setTimeout(resolve, 100));
        setLoadingProgress(10);

        // Calculate the range of pages to load (10 pages around the target)
        const targetPage = selected;
        const startPage = Math.max(0, targetPage - 5); // 5 pages before target
        const endPage = Math.min(
          Math.floor(totalContacts / contactsPerPage) - 1,
          targetPage + 5
        ); // 5 pages after target

        setLoadingProgress(20);
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Calculate the exact contacts needed for this specific range
        const rangeStartIndex = startPage * contactsPerPage;
        const rangeEndIndex = (endPage + 1) * contactsPerPage;

        // Calculate how many contacts we need to load to reach this range
        const contactsNeeded = Math.max(
          0,
          rangeEndIndex - loadedContacts.length
        );

        setLoadingProgress(30);
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Load contacts for the 10-page range
        if (contactsNeeded > 0) {
          const batchesNeeded = Math.ceil(contactsNeeded / 200);

          console.log(
            `Loading ${contactsNeeded} contacts in ${batchesNeeded} batches for pages ${startPage}-${endPage}`
          );

          // Load the required number of batches (200 contacts each)
          for (let i = 0; i < batchesNeeded; i++) {
            const batchStart = loadedContacts.length + i * 200;
            const batchEnd = Math.min(batchStart + 200, contacts.length);
            const nextBatch = contacts.slice(batchStart, batchEnd);

            console.log(
              `Loading batch ${i + 1}/${batchesNeeded}: ${
                nextBatch.length
              } contacts`
            );

            setLoadedContacts((prevLoaded) => [...prevLoaded, ...nextBatch]);

            // Update progress for each batch
            const batchProgress =
              30 + Math.floor(((i + 1) / batchesNeeded) * 60);
            setLoadingProgress(batchProgress);
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Update hasMoreContacts after each batch
            setHasMoreContacts(batchEnd < contacts.length);
          }
        } else {
          console.log("No contacts needed to load for this range");
        }

        setLoadingProgress(95);
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Mark the 10-page range as loaded
        const newLoadedPages = new Set<number>(loadedPages);
        for (let page = startPage; page <= endPage; page++) {
          newLoadedPages.add(page);
        }
        setLoadedPages(newLoadedPages);

        setLastLoadedPage(Math.floor(loadedContacts.length / 200));

        setLoadingProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 100));

        console.log(
          `Successfully loaded contacts for pages ${startPage}-${endPage}`
        );
      } catch (error) {
        console.error("Error loading more contacts:", error);
        toast.error("Error loading more contacts");
      } finally {
        console.log("Finishing loading process");
        setIsLoadingMoreContacts(false);
        setLoadingProgress(0);
      }
    }
  };

  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [paginatedContacts, setPaginatedContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (filteredContacts.length === 0) {
      setLoadingMessage("Fetching contacts...");
    } else {
      setLoadingMessage("Fetching contacts...");
      const timer = setTimeout(() => {
        if (paginatedContacts.length === 0) {
          setLoadingMessage(
            "There are a lot of contacts, fetching them might take some time..."
          );
        }
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [filteredContacts, paginatedContacts, activeTags]);

  // useEffect(() => {

  //   console.log('userData', userData);

  //   if(userData?.viewEmployee){
  //     // Fix: Check if viewEmployee is an array or an object with name property or a string
  //     if (Array.isArray(userData.viewEmployee)) {
  //       // If it's an array of employee IDs, we need to find the corresponding employee names
  //       const viewEmployeeNames = employeeList
  //         .filter(emp => userData.viewEmployee.includes(emp.id))
  //         .map(emp => emp.name.toLowerCase());
  //
  //       setPaginatedContacts(contacts.filter(contact =>
  //         viewEmployeeNames.some(empName =>
  //           contact.assignedTo?.toLowerCase() === empName ||
  //           contact.tags?.some(tag => tag.toLowerCase() === empName)
  //         )
  //       ));
  //     } else if (typeof userData.viewEmployee === 'object' && userData.viewEmployee.name) {
  //       // If it's an object with a name property
  //       const empName = userData.viewEmployee.name.toLowerCase();
  //       setPaginatedContacts(contacts.filter(contact =>
  //         contact.assignedTo?.toLowerCase() === empName ||
  //         contact.tags?.some(tag => tag.toLowerCase() === empName)
  //       ));
  //     } else if (typeof userData.viewEmployee === 'string') {
  //       // If it's a single employee ID string
  //       const employee = employeeList.find(emp => emp.id === userData.viewEmployee);
  //       if (employee) {
  //         const empName = employee.name.toLowerCase();
  //         setPaginatedContacts(contacts.filter(contact =>
  //           contact.assignedTo?.toLowerCase() === empName ||
  //           contact.tags?.some(tag => tag.toLowerCase() === empName)
  //         ));
  //       }
  //     }
  //   } else if (selectedEmployee) {
  //     setPaginatedContacts(contacts.filter(contact =>
  //       contact.assignedTo?.toLowerCase() === selectedEmployee.toLowerCase()
  //     ));
  //   } else {
  //     let filtered = contacts;

  //     // Apply role-based filtering
  //     if (userRole === "3") {
  //       filtered = filtered.filter(contact =>
  //         contact.assignedTo?.toLowerCase() === userData?.name?.toLowerCase() ||
  //         contact.tags?.some(tag => tag.toLowerCase() === userData?.name?.toLowerCase())
  //       );
  //     }

  //     // Apply tag filter
  //     if (activeTags.length > 0) {
  //       filtered = filtered.filter((contact) => {
  //         if (activeTags.includes('Mine')) {
  //           return contact.assignedTo?.toLowerCase() === userData?.name?.toLowerCase() ||
  //                  contact.tags?.some(tag => tag.toLowerCase() === userData?.name?.toLowerCase());
  //         }
  //         if (activeTags.includes('Unassigned')) {
  //           return !contact.assignedTo && !contact.tags?.some(tag => employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase()));
  //         }
  //         if (activeTags.includes('All')) {
  //           return true;
  //         }
  //         return contact.tags?.some(tag => activeTags.includes(tag));
  //       });
  //     }

  //     // Apply search filter
  //     if (searchQuery.trim() !== '') {
  //       filtered = filtered.filter((contact) =>
  //         (contact.contactName?.toLowerCase() || '')
  //           .includes(searchQuery.toLowerCase()) ||
  //         (contact.firstName?.toLowerCase() || '')
  //           .includes(searchQuery.toLowerCase()) ||
  //         (contact.phone?.toLowerCase() || '')
  //           .includes(searchQuery.toLowerCase()) ||
  //         (contact.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  //       );
  //     }

  //     setFilteredContacts(filtered);
  //     if (searchQuery.trim() !== '') {
  //       setCurrentPage(0); // Reset to first page when searching
  //     }

  //     setPaginatedContacts(filtered);
  //   }
  // }, [contacts, searchQuery, activeTags, currentUserName, employeeList, userRole, userData, selectedEmployee]);

  // Update the pagination logic to work with loaded contacts

  useEffect(() => {
    const startIndex = currentPage * contactsPerPage;
    const endIndex = startIndex + contactsPerPage;
    // Use filteredContactsSearch instead of loadedContacts to ensure proper sorting
    const paginated = filteredContactsSearch.slice(startIndex, endIndex);
    setPaginatedContacts(paginated);
    console.log("Pagination:", {
      currentPage,
      startIndex,
      endIndex,
      filteredContactsLength: filteredContactsSearch.length,
      paginatedLength: paginated.length,
    });
  }, [currentPage, contactsPerPage, filteredContactsSearch]);

  const getSortedContacts = useCallback((contactsToSort: Contact[]) => {
    return [...contactsToSort].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      const timestampA = getContactTimestamp(a);
      const timestampB = getContactTimestamp(b);

      // Sort by most recent first (descending order)
      return timestampB - timestampA;
    });
  }, []);

  useEffect(() => {
    // Use loaded contacts for filtering instead of all contacts
    const filteredFromLoaded = filteredContactsSearch.filter((contact) =>
      loadedContacts.some((loadedContact) => loadedContact.id === contact.id)
    );
    setFilteredContacts(filteredFromLoaded);
  }, [filteredContactsSearch, loadedContacts]);

  const filterTagContact = (tag: string) => {
    console.log("🔍 filterTagContact called with tag:", tag);
    console.log("🔍 Current employeeList:", employeeList);

    // Set loading state for tag filtering
    setIsTagFiltering(true);

    if (
      employeeList.some(
        (employee) =>
          (employee.name?.toLowerCase() || "") ===
          (typeof tag === "string" ? tag : String(tag)).toLowerCase()
      )
    ) {
      console.log("🔍 Tag is an employee, setting selectedEmployee:", tag);
      setSelectedEmployee(tag === selectedEmployee ? null : tag);
    } else {
      console.log("🔍 Tag is not an employee, setting activeTags:", [
        tag.toLowerCase(),
      ]);
      setActiveTags([
        (typeof tag === "string" ? tag : String(tag)).toLowerCase(),
      ]);
    }
    setSearchQuery("");

    // Reset loading state after a short delay to allow filtering to complete
    setTimeout(() => {
      setIsTagFiltering(false);
    }, 1000);
  };

  const filterForwardDialogContacts = (tag: string) => {
    setForwardDialogTags((prevTags) =>
      prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag)
        : [...prevTags, tag]
    );
  };

  // Modify the handleSearchChange function
  const handleSearchChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery2(e.target.value);
  };

  // Add this function to get filtered contacts
  const getFilteredForwardingContacts = () => {
    return contacts.filter((contact) => {
      const matchesSearch =
        contact.contactName
          ?.toLowerCase()
          .includes(searchQuery2.toLowerCase()) ||
        contact.firstName?.toLowerCase().includes(searchQuery2.toLowerCase()) ||
        contact.phone?.toLowerCase().includes(searchQuery2.toLowerCase());

      const matchesTags =
        forwardDialogTags.length === 0 ||
        contact.tags?.some((tag) => forwardDialogTags.includes(tag));

      return matchesSearch && matchesTags;
    });
  };

  // Update the total pages calculation
  const totalPages = Math.ceil(filteredContactsSearch.length / contactsPerPage);

  const handleSnoozeContact = async (contact: Contact) => {
    try {
      const tagName = "snooze";
      // Get company and user data from your backend
      const userEmail = localStorage.getItem("userEmail");

      // Get user data from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId || !contact.contact_id) {
        toast.error("Missing company or contact ID");
        return;
      }
      // Handle non-employee tags (add tag to contact)
      const hasTag = contact.tags?.includes(tagName) || false;
      if (!hasTag) {
        const response = await fetch(
          `${baseUrl}/api/contacts/${companyId}/${contact.contact_id}/tags`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: [tagName] }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          toast.error("Failed to snooze the contact");
          return;
        }
        const data = await response.json();
        const newTags = data.tags || [];

        setContacts((prevContacts) =>
          prevContacts.map((c) =>
            c.id === contact.id ? { ...c, tags: newTags } : c
          )
        );

        toast.success(`Successfully snoozed contact`);
      } else {
        toast.info(`Contact is already snoozed`);
      }
    } catch (error) {
      toast.error("Failed to snooze the contact");
    }
  };

  const handleUnsnoozeContact = async (contact: Contact) => {
    try {
      const tagName = "snooze";
      const userEmail = localStorage.getItem("userEmail");

      // Get user data from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId || !contact.contact_id) {
        toast.error("Missing company or contact ID");
        return;
      }

      const response = await fetch(
        `${baseUrl}/api/contacts/${companyId}/${contact.contact_id}/tags`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: [tagName] }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        toast.error("Failed to unsnooze the contact");
        return;
      }
      const data = await response.json();
      const newTags = data.tags || [];

      setContacts((prevContacts) =>
        prevContacts.map((c) =>
          c.id === contact.id ? { ...c, tags: newTags } : c
        )
      );

      toast.success("Contact unsnoozed successfully");
    } catch (error) {
      toast.error("Failed to unsnooze contact");
    }
  };

  // Mark contact as resolved (SQL API version)
  const handleResolveContact = async (contact: Contact) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No authenticated user");
        return;
      }

      // Get user data from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId || !contact.contact_id) {
        toast.error("Missing company or contact ID");
        return;
      }

      // Add "resolved" tag via SQL API
      const response = await fetch(
        `${baseUrl}/api/contacts/${companyId}/${contact.contact_id}/tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: ["resolved"] }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        toast.error("Failed to mark contact as resolved");
        return;
      }
      const data = await response.json();
      const newTags = data.tags || [];

      setContacts((prevContacts) =>
        prevContacts.map((c) =>
          c.id === contact.id ? { ...c, tags: newTags } : c
        )
      );

      toast.success("Contact marked as resolved");
    } catch (error) {
      console.error("Error resolving contact:", error);
      toast.error("Failed to mark contact as resolved");
    }
  };

  // Unmark contact as resolved (SQL API version)
  const handleUnresolveContact = async (contact: Contact) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No authenticated user");
        return;
      }

      // Get user data from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId || !contact.contact_id) {
        toast.error("Missing company or contact ID");
        return;
      }

      // Remove "resolved" tag via SQL API
      const response = await fetch(
        `${baseUrl}/api/contacts/${companyId}/${contact.contact_id}/tags`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: ["resolved"] }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        toast.error("Failed to unmark contact as resolved");
        return;
      }
      const data = await response.json();
      const newTags = data.tags || [];

      setContacts((prevContacts) =>
        prevContacts.map((c) =>
          c.id === contact.id ? { ...c, tags: newTags } : c
        )
      );

      toast.success("Contact unmarked as resolved");
    } catch (error) {
      console.error("Error unresolving contact:", error);
      toast.error("Failed to unmark contact as resolved");
    }
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessages((prevSelectedMessages) =>
      prevSelectedMessages.includes(message)
        ? prevSelectedMessages.filter((m) => m.id !== message.id)
        : [...prevSelectedMessages, message]
    );
  };

  const handleForwardMessage = async () => {
    if (
      selectedMessages.length === 0 ||
      selectedContactsForForwarding.length === 0
    )
      return;

    try {
      // Use getCompanyData for authentication and config
      const {
        companyId: cId,
        baseUrl: apiUrl,
        userData: uData,
        email,
      } = await getCompanyData();
      if (!uData) throw new Error("No authenticated user");

      for (const contact of selectedContactsForForwarding) {
        for (const message of selectedMessages) {
          try {
            if (message.type === "image") {
              let imageUrl = message.image?.link || message.image?.url;

              if (!imageUrl && message.image?.data) {
                // If we have base64 data, upload it to get a URL
                const base64Data = message.image.data.startsWith("data:")
                  ? message.image.data
                  : `data:${message.image?.mimetype};base64,${message.image?.data}`;
                imageUrl = await uploadBase64Image(
                  base64Data,
                  message.image?.mimetype || ""
                );
              }

              if (!imageUrl) {
                console.error(
                  "No valid image data found for message:",
                  message
                );
                toast.error(`Failed to forward image: No valid image data`);
                continue;
              }

              await sendImageMessage(
                contact.chat_id ?? "",
                imageUrl,
                message.image?.caption ?? ""
              );
            } else if (message.type === "document") {
              // Ensure we have a valid document link
              const documentLink = message.document?.link;
              if (!documentLink) {
                throw new Error("Invalid document link");
              }
              await sendDocumentMessage(
                contact.chat_id ?? "",
                documentLink,
                message.document?.mimetype ?? "",
                message.document?.filename ?? "",
                message.document?.caption ?? ""
              );
            } else {
              // For text messages, use the existing API call
              const response = await fetch(
                `${apiUrl}/api/v2/messages/text/${cId}/${contact.chat_id}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    message: message.text?.body || "",
                    phoneIndex: uData.phone || 0,
                    userName: uData.name || email || "",
                  }),
                }
              );

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                  `Failed to forward text message: ${response.status} ${errorText}`
                );
              }
            }
          } catch (error) {
            console.error("Error forwarding message:", error);
            toast.error(
              `Failed to forward a message: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      }

      setIsForwardDialogOpen(false);
      setSelectedMessages([]);
      setSelectedContactsForForwarding([]);
      toast.success("Messages forwarded successfully");
    } catch (error) {
      console.error("Error in forward process:", error);
      toast.error(
        `Error in forward process: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const uploadBase64Image = async (
    base64Data: string,
    mimeType: string
  ): Promise<string> => {
    try {
      const { companyId: cId, baseUrl: apiUrl } = await getCompanyData();

      const response = await fetch(base64Data);
      const blob = await response.blob();
      const file = new File([blob], `image.${mimeType.split("/")[1]}`, {
        type: mimeType,
      });

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`${apiUrl}/api/upload-media`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      const data = await uploadResponse.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading base64 image:", error);
      throw error;
    }
  };

  const handleSelectContactForForwarding = (contact: Contact) => {
    setSelectedContactsForForwarding((prevContacts) =>
      prevContacts.includes(contact)
        ? prevContacts.filter((c) => c.id !== contact.id)
        : [...prevContacts, contact]
    );
  };
  const formatTimestamp = (timestamp: number | string | undefined): string => {
    if (!timestamp) {
      return "Invalid date";
    }

    let date: Date;

    if (typeof timestamp === "number") {
      if (isNaN(timestamp)) {
        return "Invalid date";
      }
      date = new Date(timestamp * 1000);
    } else if (typeof timestamp === "string") {
      date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
    } else {
      return "Invalid date";
    }

    try {
      return format(date, "p");
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid date";
    }
  };
  const handleTagClick = () => {
    setSelectedEmployee(null);
  };
  useEffect(() => {
    const handleKeyDown = (event: { key: string }) => {
      if (event.key === "Escape") {
        setIsTabOpen(false);
        setSelectedContact(null);
        setSelectedChatId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleDocumentUpload: React.ChangeEventHandler<
    HTMLInputElement
  > = async (event) => {
    setLoading(true);
    const files = event.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        const fileUrl = await uploadFile(file);
        await sendDocumentMessage(
          selectedChatId!,
          fileUrl!,
          file.type,
          file.name,
          ""
        );
      }
    }
    setLoading(false);
  };

  const uploadFile = async (file: File): Promise<string> => {
    try {
      const { companyId: cId, baseUrl: apiUrl } = await getCompanyData();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiUrl}/api/upload-media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const sendImageMessage = async (
    chatId: string,
    imageUrl: string,
    caption?: string
  ) => {
    try {
      const {
        companyId: cId,
        baseUrl: apiUrl,
        userData: uData,
        email,
      } = await getCompanyData();

      // Use selectedContact's phoneIndex
      if (!selectedContact) throw new Error("No contact selected");
      const phoneIndex = selectedContact.phoneIndex ?? 0;

      const userName = uData?.name || email || "";

      let response;
      try {
        response = await fetch(
          `${apiUrl}/api/v2/messages/image/${cId}/${chatId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageUrl: imageUrl,
              caption: caption || "",
              phoneIndex: phoneIndex,
              userName: userName,
            }),
          }
        );

        if (!response.ok)
          throw new Error(`API failed with status ${response.status}`);
      } catch (error) {
        console.error("Error sending image:", error);
        throw error;
      }

      const data = await response.json();

      fetchMessages(chatId, whapiToken || "");
    } catch (error) {
      console.error("Error sending image message:", error);
      //  toast.error(`Failed to send image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };
  const sendDocumentMessage = async (
    chatId: string,
    documentUrl: string,
    mimeType: string,
    fileName: string,
    caption?: string
  ) => {
    try {
      const {
        companyId: cId,
        baseUrl: apiUrl,
        userData: uData,
        email,
      } = await getCompanyData();

      // Use selectedContact's phoneIndex
      if (!selectedContact) throw new Error("No contact selected");
      const phoneIndex = selectedContact.phoneIndex ?? 0;

      const userName = uData?.name || email || "";

      let response;
      try {
        response = await fetch(
          `${apiUrl}/api/v2/messages/document/${cId}/${selectedContactId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              documentUrl: documentUrl,
              filename: fileName,
              caption: caption || "",
              phoneIndex: phoneIndex,
              userName: userName,
            }),
          }
        );

        if (!response.ok)
          throw new Error(`API failed with status ${response.status}`);
      } catch (error) {
        console.error("Error sending document:", error);
        throw error;
      }

      const data = await response.json();

      fetchMessages(chatId, whapiToken || "");
    } catch (error) {
      console.error("Error sending document message:", error);
      // toast.error(`Failed to send document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const handleCloseForwardDialog = () => {
    setIsForwardDialogOpen(false);
    setSearchQuery2(""); // Clear the search query
  };

  const togglePinConversation = async (chatId: string) => {
    try {
      // Find the contact to toggle
      const contactToToggle = contacts.find(
        (contact) => contact.chat_id === chatId
      );
      if (!contactToToggle || !contactToToggle.contact_id) {
        console.error("Contact not found for chatId:", chatId);
        return;
      }

      // Get companyId from userData or state
      const cId = userData?.companyId || companyId;
      if (!cId) {
        console.error("Company ID is missing");
        return;
      }

      // Toggle the pinned status
      const newPinnedStatus = !contactToToggle.pinned;

      // Call the backend API to update pinned status
      const response = await fetch(
        `${baseUrl}/api/contacts/${contactToToggle.contact_id}/pinned`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            companyId: cId,
            pinned: newPinnedStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update pin status");
      }

      // Update the local state
      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact.id === contactToToggle.id
            ? { ...contact, pinned: newPinnedStatus }
            : contact
        )
      );

      toast.success(`Conversation ${newPinnedStatus ? "pinned" : "unpinned"}`);
    } catch (error) {
      console.error("Error toggling chat pin state:", error);
      toast.error("Failed to update pin status");
    }
  };

  const openImageModal = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setImageModalOpen(true);
  };

  const handleSave = async () => {
    try {
      // Get user/company info from localStorage or state
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }

      // Fetch user context to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user-context?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!userResponse.ok) {
        toast.error("Failed to fetch user context");
        return;
      }
      const userData = await userResponse.json();
      const companyId = userData.companyId;

      // Call the SQL API to update contact name
      const response = await fetch(
        `${baseUrl}/api/contacts/${selectedContact.contact_id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            companyId,
            name: editedName,
          }),
        }
      );

      if (!response.ok) {
        toast.error("Failed to update contact name");
        return;
      }

      // Update local state
      setSelectedContact((prevContact: any) => ({
        ...prevContact,
        contactName: editedName,
      }));

      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact.id === selectedContact.id
            ? { ...contact, contactName: editedName }
            : contact
        )
      );

      // Update localStorage
      const storedContacts = localStorage.getItem("contacts");
      if (storedContacts) {
        const decompressedContacts = JSON.parse(
          LZString.decompress(storedContacts)!
        );
        const updatedContacts = decompressedContacts.map((contact: any) =>
          contact.id === selectedContact.id
            ? { ...contact, contactName: editedName }
            : contact
        );
        localStorage.setItem(
          "contacts",
          LZString.compress(JSON.stringify(updatedContacts))
        );
      }

      setIsEditing(false);
      toast.success("Contact name updated successfully!");
    } catch (error) {
      console.error("Error updating contact name:", error);
      toast.error("Failed to update contact name.");
    }
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setModalImageUrl("");
  };

  // Handle keydown event
  const handleKeyDown = (event: { key: string }) => {
    if (event.key === "Escape") {
      setSelectedMessages([]);
    }
  };
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const formatDateHeader = (timestamp: string | number | Date) => {
    let date: Date;

    if (typeof timestamp === "number") {
      // Unix timestamps are in seconds, convert to milliseconds
      date = new Date(timestamp * 1000);
    } else if (typeof timestamp === "string") {
      // Handle ISO date string format like '2025-07-07 11:34:06+08'
      if (
        timestamp.includes("-") &&
        (timestamp.includes("+") || timestamp.includes("T"))
      ) {
        // Convert PostgreSQL timestamp format to ISO format if needed
        let isoString = timestamp;
        if (!timestamp.includes("T")) {
          // Replace space with T and ensure timezone format
          isoString = timestamp.replace(" ", "T");
          // Handle timezone offset format like +08 -> +08:00
          if (/[+-]\d{2}$/.test(isoString)) {
            isoString = isoString + ":00";
          }
        }
        date = new Date(isoString);
      } else {
        // Try to parse as number first
        const numTimestamp = parseFloat(timestamp);
        if (!isNaN(numTimestamp)) {
          // For reasonable Unix timestamps (between 1970 and 2100), multiply by 1000
          if (numTimestamp > 0 && numTimestamp < 4102444800) {
            // 2100 in seconds
            date = new Date(numTimestamp * 1000);
          } else {
            date = new Date(numTimestamp);
          }
        } else {
          // Try as date string
          date = new Date(timestamp);
        }
      }
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) {
      console.log("Invalid date detected:", timestamp);
      return "Invalid date";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  useEffect(() => {
    // Add event listener for keydown
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // First, ensure you have the Template interface defined
  interface Template {
    id: string;
    triggerTags?: string[];
    name?: string;
    messages?: {
      text: string;
      delay: number;
      delayUnit: string;
    }[];
    createdAt?: any;
    updatedAt?: any;
  }

  const handleRemoveTag = async (contactId: string, tagName: string) => {
    try {
      // Get user/company info
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;
      const userResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );
      if (!userResponse.ok)
        throw new Error("Failed to fetch user/company data");
      const userData = await userResponse.json();
      const companyId = userData.userData.companyId;
      const companyData = userData.companyData;
      const apiUrl = companyData.apiUrl || baseUrl;

      // Get contact info (from your local state or fetch if needed)
      const contact = contacts.find((c: Contact) => c.contact_id === contactId);
      if (!contact) throw new Error("Contact not found");
      console.log(contact);

      // Remove tag from contact via your backend
      const response = await fetch(
        `${apiUrl}/api/contacts/${companyId}/${contactId}/tags`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: [tagName] }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to remove tag from contact");
      }

      // Update state immediately
      const updateContactsList = (prevContacts: Contact[]) =>
        prevContacts.map((contact) =>
          contact.id === contactId || contact.contact_id === contactId
            ? {
                ...contact,
                tags: contact.tags!.filter((tag) => tag !== tagName),
                assignedTo: undefined,
              }
            : contact
        );

      setContacts(updateContactsList);
      setLoadedContacts((prevLoadedContacts) =>
        updateContactsList(prevLoadedContacts)
      );
      setFilteredContacts((prevFilteredContacts) =>
        updateContactsList(prevFilteredContacts)
      );

      // Update localStorage immediately
      const updatedContacts = updateContactsList(contacts);
      localStorage.setItem(
        "contacts",
        LZString.compress(JSON.stringify(updatedContacts))
      );

      // Update selectedContact if it's the same contact
      if (
        selectedContact &&
        (selectedContact.id === contactId ||
          selectedContact.contact_id === contactId)
      ) {
        setSelectedContact((prevContact: Contact) => ({
          ...prevContact,
          tags: prevContact.tags!.filter((tag: string) => tag !== tagName),
          assignedTo: undefined,
        }));
      }

      // Send WebSocket message to notify other clients
      if (wsConnection && wsConnected) {
        const wsMessage = {
          type: "contact_tags_update",
          contactId: contactId,
          action: "remove",
          tagName: tagName,
          updatedTags: contact.tags!.filter((tag) => tag !== tagName),
          timestamp: Date.now(),
        };
        wsConnection.send(JSON.stringify(wsMessage));
        console.log("🏷️ [WEBSOCKET] Sent contact tags update:", wsMessage);
      }

      console.log(
        "📝 [TAG] Removed tag from contact:",
        contactId,
        "tag:",
        tagName
      );

      // The backend API already handles follow-up template cleanup in handleTagDeletion
      // So we just show success message - the cleanup was done in the main API call above
      toast.success("Tag removed successfully!");
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag.");
    }
  };

  const adjustHeight = (textarea: HTMLTextAreaElement, reset = false) => {
    if (reset) {
      textarea.style.height = "auto";
    }
    const lineHeight = 24; // Approximate line height in pixels
    const maxLines = 8;
    const maxHeight = lineHeight * maxLines;

    textarea.style.height = "auto";
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = "scroll";
    } else {
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflowY = "hidden";
    }
  };

  // Adjust height on new message change
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight(textareaRef.current);
    }
  }, [newMessage]);
  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditedMessageText("");
  };

  const handleEditMessage = async () => {
    if (!editedMessageText.trim() || !editingMessage) return;

    try {
      // Only allow editing within 15 minutes of sending
      const messageTimestamp =
        typeof editingMessage.timestamp === "number"
          ? editingMessage.timestamp * 1000
          : new Date(editingMessage.timestamp).getTime();
      const currentTime = Date.now();
      const diffInMinutes = (currentTime - messageTimestamp) / (1000 * 60);

      if (diffInMinutes > 15) {
        toast.error(
          "Message cannot be edited as it has been more than 15 minutes since it was sent."
        );
        return;
      }

      // Get user/company info from SQL
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) throw new Error("No authenticated user");

      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail)}`,
        { credentials: "include" }
      );
      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;
      const phoneIndex = userData.phone || 0;

      // Use selectedContactId for chatId
      const chatId = selectedContactId;

      // Call the backend API to edit the message
      const response = await fetch(
        `${baseUrl}/api/v2/messages/${companyId}/${chatId}/${editingMessage.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            newMessage: editedMessageText,
            phoneIndex,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Message edited successfully");

        // Update the message locally
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === editingMessage.id
              ? {
                  ...msg,
                  text: { ...msg.text, body: editedMessageText },
                  edited: true,
                }
              : msg
          )
        );

        setEditingMessage(null);
        setEditedMessageText("");
      } else {
        throw new Error(data.error || "Failed to edit message");
      }
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error("Failed to edit message. Please try again.");
    }
  };

  const sendDocument = async (file: File, caption: string) => {
    setLoading(true);
    try {
      const uploadedDocumentUrl = await uploadFile(file);
      if (uploadedDocumentUrl) {
        await sendDocumentMessage(
          selectedChatId!,
          uploadedDocumentUrl,
          file.type,
          file.name,
          caption
        );
      }
    } catch (error) {
      console.error("Error sending document:", error);
      //toast.error('Failed to send document. Please try again.');
    } finally {
      setLoading(false);
      setDocumentModalOpen(false);
    }
  };

  const uploadLocalImageUrl = async (
    localUrl: string
  ): Promise<string | null> => {
    try {
      const { companyId: cId, baseUrl: apiUrl } = await getCompanyData();

      const response = await fetch(localUrl);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `image_${Date.now()}.${blob.type.split("/")[1]}`,
        { type: blob.type }
      );

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`${apiUrl}/api/upload-media`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      const data = await uploadResponse.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const sendImage = async (imageUrl: string, caption: string) => {
    setLoading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });

      const uploadedImageUrl = await uploadFile(file);
      if (uploadedImageUrl) {
        await sendImageMessage(selectedContactId!, uploadedImageUrl, caption);
      }
    } catch (error) {
      console.error("Error sending image:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        quickRepliesRef.current &&
        !quickRepliesRef.current.contains(event.target as Node)
      ) {
        setIsQuickRepliesOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [allBotsStopped, setAllBotsStopped] = useState(false);
  const [botsStatus, setBotsStatus] = useState<
    "allStopped" | "allRunning" | "mixed"
  >("mixed");

  useEffect(() => {
    const checkAllBotsStopped = () => {
      const allStopped = contacts.every((contact) =>
        contact.tags?.includes("stop bot")
      );
      setAllBotsStopped(allStopped);
    };

    checkAllBotsStopped();
  }, [contacts]);

  useEffect(() => {
    const checkBotsStatus = () => {
      const allStopped = contacts.every((contact) =>
        contact.tags?.includes("stop bot")
      );
      const allRunning = contacts.every(
        (contact) => !contact.tags?.includes("stop bot")
      );
      if (allStopped) {
        setBotsStatus("allStopped");
      } else if (allRunning) {
        setBotsStatus("allRunning");
      } else {
        setBotsStatus("mixed");
      }
    };

    checkBotsStatus();
  }, [contacts]);

  useEffect(() => {
    const checkAllBotsStopped = () => {
      const allStopped = contacts.every((contact) =>
        contact.tags?.includes("stop bot")
      );
      setAllBotsStopped(allStopped);
    };

    checkAllBotsStopped();
  }, [contacts]);

  useEffect(() => {
    const checkBotsStatus = () => {
      const allStopped = contacts.every((contact) =>
        contact.tags?.includes("stop bot")
      );
      const allRunning = contacts.every(
        (contact) => !contact.tags?.includes("stop bot")
      );
      if (allStopped) {
        setBotsStatus("allStopped");
      } else if (allRunning) {
        setBotsStatus("allRunning");
      } else {
        setBotsStatus("mixed");
      }
    };

    checkBotsStatus();
  }, [contacts]);

  const [companyStopBot, setCompanyStopBot] = useState(false);
  const [companyBaseUrl, setCompanyBaseUrl] = useState<string>("");

  // Update the useEffect that fetches company stop bot status
  useEffect(() => {
    let isMounted = true;

    function getEffectiveStopBot(
      companyData: any,
      currentPhoneIndex: string | number
    ) {
      const index = String(currentPhoneIndex);
      if (
        companyData.stopbots &&
        Object.keys(companyData.stopbots).length > 0
      ) {
        return !!companyData.stopbots[index];
      }
      return !!companyData.stopbot;
    }

    const fetchCompanyStopBot = async () => {
      try {
        const {
          companyId: cId,
          userData: uData,
          stopbot,
          stopbots,
        } = await getCompanyData();
        if (isMounted && uData) {
          if (phoneCount > 1) {
            const currentPhoneIndex = uData.phone || 0;
            const effectiveStopBot = getEffectiveStopBot(
              { stopbot, stopbots },
              currentPhoneIndex
            );
            setCompanyStopBot(effectiveStopBot);
            console.log("Effective stop bot status:", effectiveStopBot);
          } else {
            if (phoneCount === 1) {
              setCompanyStopBot(!!stopbot);
              console.log("Single phone stop bot status:", stopbot);
            } else {
              setCompanyStopBot(false);
              console.log("No phones available, stop bot set to false");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching company stopbot status:", error);
      }
    };

    fetchCompanyStopBot();

    // Optional: Poll every 10 seconds for updates (remove if not needed)
    const interval = setInterval(fetchCompanyStopBot, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Helper function to get current user email from localStorage
  const getCurrentUserEmail = () => {
    return localStorage.getItem("userEmail");
  };

  // Helper to get company data from localStorage and API
  const getCompanyData = async () => {
    const userDataStr = localStorage.getItem("userData");
    if (!userDataStr) {
      throw new Error("User not authenticated");
    }
    let parsedUserData: any;
    try {
      parsedUserData = JSON.parse(userDataStr);
    } catch {
      throw new Error("Invalid userData in localStorage");
    }
    const email = parsedUserData.email;
    if (!email) {
      throw new Error("User email not found");
    }

    const response = await fetch(`${baseUrl}/api/user-context?email=${email}`);
    if (!response.ok) throw new Error("Failed to fetch user context");
    const data = await response.json();

    setCompanyId(data.companyId);
    setCurrentUserRole(data.role);
    setCompanyBaseUrl(data.apiUrl || baseUrl);
    setEmployeeList(
      (data.employees || []).map((employee: any) => ({
        id: employee.id,
        name: employee.name,
        email: employee.email || employee.id,
        role: employee.role,
        employeeId: employee.employeeId,
        phoneNumber: employee.phoneNumber,
      }))
    );
    setPhoneCount(data.phoneCount);

    return {
      companyId: data.companyId,
      baseUrl: baseUrl,
      userData: parsedUserData,
      email,
      stopbot: data.stopBot || false,
      stopbots: data.stopBots || {},
    };
  };

  // Helper function to construct full image URL
  const getFullImageUrl = (imageUrl: string | undefined | null): string => {
    // Handle cases where imageUrl is not a string
    if (!imageUrl || typeof imageUrl !== "string") {
      return "";
    }

    // If it's already a full URL (starts with http/https), return as is
    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://") ||
      imageUrl.startsWith("data:")
    ) {
      return imageUrl;
    }

    // If it's a relative URL, combine with base URL
    if (imageUrl.startsWith("/") && companyBaseUrl) {
      return `${companyBaseUrl}${imageUrl}`;
    }

    // Fallback to default base URL if companyBaseUrl is not set
    const defaultBaseUrl = baseUrl;
    return imageUrl.startsWith("/") ? `${defaultBaseUrl}${imageUrl}` : imageUrl;
  };

  const toggleBot = async () => {
    try {
      const {
        userData: uData,
        companyId: cId,
        baseUrl,
      } = await getCompanyData();

      if (!uData) {
        throw new Error("User data not available");
      }

      // Determine the current phone index (default to 0 if not set)
      const phoneIndex =
        typeof uData.phone === "number"
          ? uData.phone
          : typeof uData.phone === "string"
          ? parseInt(uData.phone, 10)
          : 0;

      // For now, simplified bot toggle logic until we have full company data structure
      const newStopBot = !companyStopBot;
      const stopbotPayload = { stopbot: newStopBot, phoneIndex };

      // Update your backend here
      await fetch(`${baseUrl}/api/company/update-stopbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          companyId: uData.companyId || cId,
          ...stopbotPayload,
        }),
      });

      setCompanyStopBot(newStopBot);
      toast.success(`Bot ${newStopBot ? "disabled" : "enabled"} successfully`);
    } catch (error) {
      console.error("Error toggling bot status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle bot status"
      );
    }
  };

  const { show } = useContextMenu({
    id: "contact-context-menu",
  });

  const handleContextMenu = (event: React.MouseEvent, contact: Contact) => {
    event.preventDefault();
    show({
      event,
      props: {
        contact,
        onSnooze: () => handleSnoozeContact(contact),
        onUnsnooze: () => handleUnsnoozeContact(contact),
        isSnooze: contact.tags?.includes("snooze"),
        onResolve: () => handleResolveContact(contact),
        onUnresolve: () => handleUnresolveContact(contact),
        isResolved: contact.tags?.includes("resolved"),
      },
    });
  };
  const markAsUnread = async (contact: Contact) => {
    if (!contact?.contact_id) return;

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Get user/company info
      const userResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );
      if (!userResponse.ok) return;
      const userData = await userResponse.json();
      const companyId = userData.userData.companyId;
      console.log("contact_id", contact.contact_id);

      // Call the mark as unread API
      const response = await fetch(
        `${baseUrl}/api/contacts/${contact.contact_id}/mark-unread`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: companyId, increment: 1 }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark contact as unread");
      }

      const result = await response.json();

      if (result.success) {
        // Update the contact's unread count in the local state
        setContacts((prevContacts) =>
          prevContacts.map((c) =>
            c.contact_id === contact.contact_id
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
              : c
          )
        );

        setLoadedContacts((prevLoadedContacts) =>
          prevLoadedContacts.map((c) =>
            c.contact_id === contact.contact_id
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
              : c
          )
        );

        setFilteredContacts((prevFilteredContacts) =>
          prevFilteredContacts.map((c) =>
            c.contact_id === contact.contact_id
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
              : c
          )
        );

        toast.success("Marked as unread");
      } else {
        throw new Error(result.error || "Failed to mark contact as unread");
      }
    } catch (error) {
      console.error("Failed to mark contact as unread:", error);
      toast.error("Failed to mark as unread");
    }
  };

  const markAsRead = async (contact: Contact) => {
    if (!contact?.contact_id) return;

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Get user/company info
      const userResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );
      if (!userResponse.ok) return;
      const userData = await userResponse.json();
      const companyId = userData.userData.companyId;
      console.log("contact_id", contact.contact_id);

      // Call the mark as read API
      const response = await fetch(
        `${baseUrl}/api/contacts/${contact.contact_id}/mark-read`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: companyId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark contact as read");
      }

      const result = await response.json();

      if (result.success) {
        // Update the contact's unread count in the local state
        setContacts((prevContacts) =>
          prevContacts.map((c) =>
            c.contact_id === contact.contact_id ? { ...c, unreadCount: 0 } : c
          )
        );

        setLoadedContacts((prevLoadedContacts) =>
          prevLoadedContacts.map((c) =>
            c.contact_id === contact.contact_id ? { ...c, unreadCount: 0 } : c
          )
        );

        setFilteredContacts((prevFilteredContacts) =>
          prevFilteredContacts.map((c) =>
            c.contact_id === contact.contact_id ? { ...c, unreadCount: 0 } : c
          )
        );

        toast.success("Marked as read");
      } else {
        throw new Error(result.error || "Failed to mark contact as read");
      }
    } catch (error) {
      console.error("Failed to mark contact as read:", error);
      toast.error("Failed to mark as read");
    }
  };
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMedia(file);
    }
  };
  const sendBlastMessage = async () => {
    // Ensure selectedChatId is valid
    if (!selectedChatId) {
      toast.error("No chat selected!");
      return;
    }

    // Combine date and time
    const scheduledTime = blastStartTime || new Date();
    const now = new Date();
    if (scheduledTime <= now) {
      toast.error("Please select a future time for the blast message.");
      return;
    }

    setIsScheduling(true);
    try {
      let mediaUrl = "";
      let documentUrl = "";

      if (selectedMedia) {
        mediaUrl = await uploadFile(selectedMedia);
      }

      if (selectedDocument) {
        documentUrl = await uploadFile(selectedDocument);
      }

      const apiUrl = baseUrl;
      const companyId = userData?.companyId; // Get from your existing userData state

      if (!companyId) {
        toast.error("Company ID not found!");
        return;
      }

      const chatIds = [selectedChatId]; // Use selectedChatId directly
      const processedMessages = [selectedContact].map((contact) => {
        let processedMessage = blastMessage;
        // Replace placeholders
        processedMessage = processedMessage.replace(
          /@{contactName}/g,
          contact.contactName || ""
        );
        processedMessage = processedMessage.replace(
          /@{firstName}/g,
          contact.firstName || ""
        );
        processedMessage = processedMessage.replace(
          /@{lastName}/g,
          contact.lastName || ""
        );
        processedMessage = processedMessage.replace(
          /@{email}/g,
          contact.email || ""
        );
        processedMessage = processedMessage.replace(
          /@{phone}/g,
          contact.phone || ""
        );
        processedMessage = processedMessage.replace(
          /@{vehicleNumber}/g,
          contact.vehicleNumber || ""
        );
        processedMessage = processedMessage.replace(
          /@{branch}/g,
          contact.branch || ""
        );
        processedMessage = processedMessage.replace(
          /@{expiryDate}/g,
          contact.expiryDate || ""
        );
        // Add more placeholders as needed
        return {
          chatId: contact.phone?.replace(/\D/g, "") + "@s.whatsapp.net",
          message: processedMessage,
        };
      });

      const scheduledMessageData = {
        chatIds: chatIds,
        message: blastMessage,
        messages: processedMessages,
        batchQuantity: batchQuantity,
        companyId: companyId,
        createdAt: new Date().toISOString(), // Use ISO string instead of Firebase Timestamp
        documentUrl: documentUrl || "",
        fileName: selectedDocument ? selectedDocument.name : null,
        image: selectedImage ? await uploadImage(selectedImage) : null,
        mediaUrl: mediaUrl || "",
        mimeType: selectedMedia
          ? selectedMedia.type
          : selectedDocument
          ? selectedDocument.type
          : null,
        repeatInterval: repeatInterval,
        repeatUnit: repeatUnit,
        scheduledTime: scheduledTime.toISOString(), // Use ISO string instead of Firebase Timestamp
        status: "scheduled",
        v2: true,
        whapiToken: null,
        phoneIndex: userData?.phoneIndex,
        minDelay,
        maxDelay,
        activateSleep,
        sleepAfterMessages: activateSleep ? sleepAfterMessages : null,
        sleepDuration: activateSleep ? sleepDuration : null,
      };

      // Make API call to juta-dev.ngrok.dev
      const response = await axios.post(
        `${apiUrl}/api/schedule-message/${companyId}`,
        scheduledMessageData
      );
      console.log(response);
      toast.success(`Blast message scheduled successfully.`);
      toast.info(
        `Message will be sent at: ${scheduledTime.toLocaleString()} (local time)`
      );

      // Close the modal and reset state
      setBlastMessageModal(false);
      setBlastMessage("");
      setBlastStartTime(null);
      setBatchQuantity(10);
      setRepeatInterval(0);
      setRepeatUnit("days");
      setSelectedMedia(null);
      setSelectedDocument(null);
    } catch (error) {
      console.error("Error scheduling blast message:", error);
      toast.error(
        "An error occurred while scheduling the blast message. Please try again."
      );
    } finally {
      setIsScheduling(false);
    }
  };
  const handleReminderClick = () => {
    setIsReminderModalOpen(true);
  };
  const authorColors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F06292",
    "#AED581",
    "#7986CB",
    "#4DB6AC",
    "#9575CD",
  ];

  function getAuthorColor(author?: string | null) {
    // Handle undefined/null/empty cases by providing a default string
    const authorString = author || "anonymous";

    const index =
      authorString
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      authorColors.length;

    return authorColors[index];
  }

  // Next Agenda (Dont know what this is for, but keeping it for now)
  const handleSetReminder = async (text: string) => {
    if (!reminderDate) {
      toast.error("Please select a date and time for the reminder");
      return;
    }

    if (!selectedContact) {
      toast.error("No contact selected for the reminder");
      return;
    }

    const now = new Date();
    if (reminderDate <= now) {
      toast.error("Please select a future time for the reminder.");
      return;
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return "0s";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];

    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    if (remainingSeconds > 0 || parts.length === 0) {
      parts.push(`${remainingSeconds}s`);
    }

    return parts.join(" ");
  };
  // Track chat activity
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsChatActive(!document.hidden);
    };

    const handleFocus = () => {
      setIsChatActive(true);
    };

    const handleBlur = () => {
      setIsChatActive(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Cleanup useEffect to stop polling when component unmounts
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
    };
  }, []);

  const handleGenerateAIResponse = async () => {
    if (messages.length === 0) return;

    try {
      setIsGeneratingResponse(true);

      // Prepare the context from recent messages
      // Prepare the context from all messages in reverse order
      // Prepare the context from the last 20 messages in reverse order
      const context = messages
        .slice(0, 10)
        .reverse()
        .map((msg) => `${msg.from_me ? "Me" : "User"}: ${msg.text?.body || ""}`)
        .join("\n");

      const prompt = `
        Your goal is to act like you are Me, and generate a response to the last message in the conversation, if the last message is from "Me", continue or add to that message appropriately, maintaining the same language and style. Note that "Me" indicates messages I sent, and "User" indicates messages from the person I'm talking to.

        Based on this conversation:
        ${context}

        :`;

      // Use the sendMessageToAssistant function
      const aiResponse = await sendMessageToAssistant(prompt);

      // Set the AI's response as the new message
      setNewMessage(aiResponse);
    } catch (error) {
      console.error("Error generating AI response:", error);
      toast.error("Failed to generate AI response");
    } finally {
      setIsGeneratingResponse(false);
    }
  };
  const visiblePhoneTags = useMemo(() => {
    if (userData?.role === "1") {
      // Admin users can see all phone tags
      return Object.entries(phoneNames)
        .slice(0, phoneCount)
        .map(([_, name]) => name);
    } else if (userData?.phone && userData.phone !== "0") {
      // Regular users can only see their associated phone tag
      const phoneIndex = Object.keys(phoneNames).findIndex(
        (index) => phoneNames[Number(index)] === userData.phone
      );
      if (phoneIndex !== -1 && phoneIndex < phoneCount) {
        return [phoneNames[phoneIndex]];
      }
    }
    return [];
  }, [userData, phoneNames, phoneCount]);

  const sendMessageToAssistant = async (messageText: string) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("User not authenticated");
        toast.error("User not authenticated");
        return;
      }

      const response = await axios.get(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );

      if (response.status !== 200) {
        toast.error("Failed to fetch company data");
        return;
      }

      const { companyData } = response.data;
      let assistantIds: string[] = [];
      if (Array.isArray(companyData.assistants_ids)) {
        assistantIds = companyData.assistants_ids;
      } else if (typeof companyData.assistants_ids === "string") {
        assistantIds = companyData.assistants_ids
          .split(",")
          .map((id: string) => id.trim());
      }

      const assistantId = assistantIds[0] || "";

      const res = await axios.get(
        `${companyData.apiUrl || baseUrl}/api/assistant-test/`,
        {
          params: {
            message: messageText,
            email: userEmail,
            assistantid: assistantId,
          },
        }
      );

      return res.data.answer;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send message to assistant");
      throw error;
    }
  };

  const NotificationPopup: React.FC<{ notifications: any[] }> = ({
    notifications: initialNotifications,
  }) => {
    const [notifications, setNotifications] = useState(initialNotifications);
    const navigate = useNavigate(); // Initialize useNavigate
    const handleDelete = (index: number) => {
      setNotifications(notifications.filter((_, i) => i !== index));
    };
    const handleNotificationClick = (chatId: string, index: number) => {
      setNotifications(notifications.filter((_, i) => i !== index));
      navigate(`/chat/?chatId=${chatId}`);
    };

    return (
      <div>
        {notifications.slice(-1).map((notification, index) => (
          <div key={index}></div>
        ))}
      </div>
    );
  };

  const updateEmployeeAssignedContacts = async () => {
    try {
      // 1. Get user and company info
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No authenticated user");
        return;
      }
      const userRes = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`
      );
      if (!userRes.ok) throw new Error("Failed to fetch user/company data");
      const { userData, companyData } = await userRes.json();
      const companyId = userData.companyId;

      // 2. Get all contacts
      const contactsRes = await fetch(
        `${baseUrl}/api/companies/${companyId}/contacts`
      );
      if (!contactsRes.ok) throw new Error("Failed to fetch contacts");
      const contacts = await contactsRes.json();

      // 3. Get all employees
      const employeesRes = await fetch(
        `${baseUrl}/api/companies/${companyId}/employees`
      );
      if (!employeesRes.ok) throw new Error("Failed to fetch employees");
      const employeeList = await employeesRes.json();

      // 4. Count assignments
      const employeeAssignments: { [key: string]: number } = {};
      employeeList.forEach((emp: any) => {
        employeeAssignments[emp.id] = 0;
      });

      contacts.forEach((contact: any) => {
        if (contact.tags) {
          contact.tags.forEach((tag: string) => {
            const employee = employeeList.find(
              (emp: any) =>
                emp.name.toLowerCase() ===
                (typeof tag === "string" ? tag : String(tag)).toLowerCase()
            );
            if (employee) {
              employeeAssignments[employee.id] =
                (employeeAssignments[employee.id] || 0) + 1;
            }
          });
        }
      });

      // 5. Update employees
      await Promise.all(
        employeeList.map(async (employee: any) => {
          const newAssignedCount = employeeAssignments[employee.id] || 0;
          const assignedDiff =
            newAssignedCount - (employee.assignedContacts || 0);
          const newQuotaLeads = Math.max(
            0,
            (employee.quotaLeads || 0) - (assignedDiff > 0 ? assignedDiff : 0)
          );

          await fetch(
            `${baseUrl}/api/companies/${companyId}/employees/${employee.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assignedContacts: newAssignedCount,
                quotaLeads: newQuotaLeads,
              }),
            }
          );
        })
      );

      // Optionally show a success toast here
      // toast.success('Employee assigned contacts and quota leads updated!');
    } catch (error) {
      console.error(
        "❌ Error updating employee assigned contacts and quota leads:",
        error
      );
      toast.error(
        "Failed to update employee assigned contacts and quota leads."
      );
    }
  };

  const insertPlaceholder = (field: string) => {
    const placeholder = `@{${field}}`;
    setBlastMessage((prevMessage) => prevMessage + placeholder);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact | null>(null);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedContact({ ...selectedContact });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContact(null);
  };

  const handleSaveContact = async () => {
    if (!editedContact) return;

    try {
      // List of fields supported by the API
      const apiFields = [
        "companyId",
        "name",
        "lastName",
        "email",
        "phone",
        "address1",
        "city",
        "state",
        "postalCode",
        "website",
        "dnd",
        "dndSettings",
        "tags",
        "source",
        "country",
        "companyName",
        "branch",
        "expiryDate",
        "vehicleNumber",
        "points",
        "IC",
        "assistantId",
        "threadid",
        "notes",
        "customFields",
      ];

      // Prepare updateData with only API fields
      const updateData: { [key: string]: any } = {};
      const customFields: { [key: string]: any } = {};

      Object.keys(editedContact).forEach((field) => {
        if (apiFields.includes(field)) {
          updateData[field] = editedContact[field as keyof Contact];
        } else if (
          field !== "id" &&
          field !== "contact_id" &&
          field !== "chat_id"
        ) {
          customFields[field] = editedContact[field as keyof Contact];
        }
      });

      // Merge customFields (existing + new)
      updateData.customFields = {
        ...(editedContact.customFields || {}),
        ...customFields,
      };

      // Use contact_id from editedContact
      const contact_id = editedContact.contact_id;
      if (!contact_id) {
        toast.error("Contact ID not found");
        return;
      }

      // Get companyId from userData or state
      const companyIdToUse = userData?.companyId || companyId;
      if (!companyIdToUse) {
        toast.error("Company ID not found");
        return;
      }

      updateData.companyId = companyIdToUse;
      updateData.name =
        updateData.contactName || editedContact.contactName || "";

      const response = await fetch(`${baseUrl}/api/contacts/${contact_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        toast.error("Failed to update contact.");
        return;
      }

      setSelectedContact({ ...selectedContact, ...updateData });
      setIsEditing(false);
      setEditedContact(null);
      toast.success("Contact updated successfully!");
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error("Failed to update contact.");
    }
  };

  return (
    <div
      className="flex flex-col md:flex-row overflow-y-auto bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-2"
      style={{ height: "100vh" }}
    >
      <audio ref={audioRef} src={noti} />
      <div
        className={`flex flex-col w-full md:min-w-[30%] md:max-w-[30%] bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 ${
          selectedChatId ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="flex items-center justify-between pl-3 pr-3 pt-4 pb-2 sticky top-0 z-10 bg-gray-100 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-start text-xl font-bold capitalize text-gray-800 dark:text-gray-200 mb-1">
                {companyName}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-start text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Total Contacts: {totalContacts}
                </div>

                {/* Error Message - Show below if there's an error */}
                {wsError && (
                  <div className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-1 rounded-md font-medium">
                    {wsError}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {
              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <Menu.Button className="flex items-center space-x-1.5 text-sm font-bold opacity-75 bg-white dark:bg-gray-800 px-2 py-1.5 rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500 transition-all duration-200">
                    <Lucide
                      icon="Phone"
                      className="w-3 h-3 text-gray-800 dark:text-white"
                    />
                    <span className="text-gray-800 font-bold dark:text-white">
                      {userData?.phone !== undefined &&
                      phoneNames[userData.phone]
                        ? phoneNames[userData.phone]
                        : Object.keys(phoneNames).length === 1
                        ? Object.values(phoneNames)[0]
                        : Object.keys(phoneNames).length > 1
                        ? "Select phone"
                        : ``}
                    </span>
                    <Lucide
                      icon="ChevronDown"
                      className="w-2.5 h-2.5 text-gray-500"
                    />
                  </Menu.Button>
                </div>
                <Menu.Items className="absolute right-0 mt-1.5 w-32 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
                  <div
                    className="py-1 max-h-30 overflow-y-auto"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu"
                  >
                    {Object.entries(phoneNames).map(([index, phoneName]) => {
                      const phoneStatus =
                        qrCodes[parseInt(index)]?.status || "unknown";
                      const isConnected =
                        phoneStatus === "ready" ||
                        phoneStatus === "authenticated";

                      return (
                        <Menu.Item key={index}>
                          {({ active }) => (
                            <button
                              onClick={() => handlePhoneChange(parseInt(index))}
                              className={`${
                                active
                                  ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                                  : "text-gray-700 dark:text-gray-200"
                              } block w-full text-left px-2.5 py-1.5 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200`}
                            >
                              <span className="font-medium">{phoneName}</span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                  isConnected
                                    ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
                                }`}
                              >
                                {isConnected ? "Connected" : "Not Connected"}
                              </span>
                            </button>
                          )}
                        </Menu.Item>
                      );
                    })}
                  </div>
                </Menu.Items>
              </Menu>
            }

            {/* WebSocket Status - Clickable to disconnect */}
            <div className="flex items-center gap-1.5 w-full">
              <button
                onClick={() => {
                  if (wsConnection && wsConnected) {
                    wsConnection.close(1000, "Manual disconnect");
                    setWsConnected(false);
                    setWsConnection(null);
                    setWsError(null);
                  }
                }}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-md shadow-md border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer w-full ${
                  wsConnected
                    ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                }`}
                disabled={!wsConnected}
              >
                {wsConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-green-600 dark:text-green-400">
                      Live
                    </span>
                    <svg
                      className="w-2 h-2 text-gray-400"
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
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">
                      Offline
                    </span>
                  </>
                )}
              </button>

              {/* Reconnect Button - Only show when disconnected */}
              {!wsConnected && (
                <button
                  onClick={() => {
                    if (wsConnection) {
                      wsConnection.close(1000, "Manual reconnect");
                    }
                    setWsReconnectAttempts(0);
                    setWsConnected(false);
                    setWsConnection(null);
                    setWsError(null);
                    // This will trigger the useEffect to re-run and create a new connection
                    setWsVersion((prev) => prev + 1);
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full"
                  disabled={wsReconnectAttempts >= maxReconnectAttempts}
                >
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {wsReconnectAttempts >= maxReconnectAttempts
                    ? "Max retries"
                    : "Reconnect"}
                </button>
              )}
            </div>
          </div>
        </div>
        {(companyPlan === "enterprise" || companyPlan === "free") && (
          <div
            className="px-2 py-1.5 rounded-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 mb-1.5 cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={openUsageDashboard}
            title="Click to view detailed usage analytics"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Lucide icon="Sparkles" className="w-2.5 h-2.5 text-primary" />
                AI Messages
              </span>
              <div className="flex items-center gap-2">
                {quotaLoading ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Loading...
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {aiMessageUsage || 0}
                    <span className="opacity-70 font-normal">
                      /{quotaData?.limit || currentPlanLimits.aiMessages}
                    </span>
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTopUpModalOpen(true);
                  }}
                  className="px-2 py-1 text-xs bg-primary hover:bg-primary/80 text-white rounded-md transition-all duration-200 hover:scale-105 active:scale-95 font-medium"
                >
                  Top-up
                </button>
              </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-primary/10 to-gray-200 dark:from-primary/20 dark:to-gray-700 mb-1 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ease-in-out ${
                  (aiMessageUsage || 0) > (quotaData?.limit || currentPlanLimits.aiMessages || 0)
                    ? "bg-gradient-to-r from-red-600 to-red-800"
                    : (aiMessageUsage || 0) > (quotaData?.limit || currentPlanLimits.aiMessages || 0) * 0.9
                    ? "bg-gradient-to-r from-red-500 to-red-700"
                    : (aiMessageUsage || 0) > (quotaData?.limit || currentPlanLimits.aiMessages || 0) * 0.7
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                    : "bg-gradient-to-r from-green-500 to-green-700"
                }`}
                style={{
                  width: `${Math.min(
                    ((aiMessageUsage || 0) / (quotaData?.limit || currentPlanLimits.aiMessages || 1)) * 100,
                    100
                  )}%`,
                }}
              ></div>
                                {(aiMessageUsage || 0) > (quotaData?.limit || currentPlanLimits.aiMessages || 0) && (
                    <div className="text-xs text-red-600 dark:text-red-400 text-center mt-0.5 font-medium">
                      ⚠️ Limit exceeded by{" "}
                      {(aiMessageUsage || 0) - (quotaData?.limit || currentPlanLimits.aiMessages || 0)} responses
                    </div>
                  )}
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Lucide icon="Contact" className="w-2.5 h-2.5 text-primary" />
                Contacts
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {contacts.length}
                  <span className="opacity-70 font-normal">
                    /{currentPlanLimits.contacts || 0}
                  </span>
                </span>
              </div>
            </div>

            <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-emerald-400/10 to-gray-200 dark:from-emerald-400/20 dark:to-gray-700 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ease-in-out ${
                  contacts.length > (currentPlanLimits.contacts || 0)
                    ? "bg-gradient-to-r from-red-600 to-red-800"
                    : contacts.length > (currentPlanLimits.contacts || 0) * 0.9
                    ? "bg-gradient-to-r from-red-500 to-red-700"
                    : contacts.length > (currentPlanLimits.contacts || 0) * 0.7
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-700"
                }`}
                style={{
                  width: `${Math.min(
                    (contacts.length / (currentPlanLimits.contacts || 1)) * 100,
                    120
                  )}%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-1"></div>
            {contacts.length > (currentPlanLimits.contacts || 0) && (
              <div className="mt-1 text-center">
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                  ⚠️ Contact limit exceeded - upgrade plan for more contacts
                </span>
              </div>
            )}

            {/* Analytics button */}
            <div className="flex items-center justify-center mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openUsageDashboard();
                }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95 font-medium"
              >
                <Lucide icon="BarChart3" className="w-3 h-3" />
                View Analytics
              </button>
            </div>
          </div>
        )}
        <div className="sticky top-20 bg-gray-100 dark:bg-gray-900 p-2">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900">
            {notifications.length > 0 && (
              <NotificationPopup notifications={notifications} />
            )}

            {/* WhatsApp Web-style search bar */}
            <div className="relative flex-grow">
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center w-full h-7 py-1.5 pl-6 pr-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              >
                <Lucide icon="Search" className="absolute left-2 w-3 h-3" />
                <span className="ml-1.5 text-sm">Search contacts...</span>
              </button>

              <SearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                companyId={currentCompanyId || ""}
                initial={contacts}
                onSelectResult={(type, id, contactId) => {
                  if (type === "contact") {
                    const contact = contacts.find((c) => c.id === id);
                    if (contact) {
                      selectChat(contact.contact_id!, contact.id!, contact);
                    }
                  } else if (type === "message") {
                    const contact = contacts.find(
                      (c) => c.contact_id === contactId
                    );
                    if (contact) {
                      selectChat(
                        contact.contact_id!,
                        contact.id!,
                        contact
                      ).then(() => {
                        setTimeout(() => {
                          scrollToMessage(id);
                        }, 5000);
                      });
                    }
                  }
                  setSearchQuery("");
                  setIsSearchModalOpen(false);
                }}
                contacts={contacts}
              />
            </div>

            {/* Action buttons with WhatsApp Web styling */}
            <div className="flex items-center space-x-1.5">
              {isAssistantAvailable && (
                <button
                  className={`flex items-center justify-center p-1.5 rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${
                    companyStopBot
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  } ${userRole === "3" ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={toggleBot}
                  disabled={userRole === "3"}
                  title={companyStopBot ? "Stop Bot" : "Start Bot"}
                >
                  <Lucide
                    icon={companyStopBot ? "PowerOff" : "Power"}
                    className="w-3 h-3"
                  />
                </button>
              )}

              {/* Employee assignment button */}
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="flex items-center justify-center p-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-all duration-200">
                  <Lucide
                    icon="Users"
                    className="w-3 h-3 text-gray-800 dark:text-gray-200"
                  />
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-1.5 w-36 shadow-lg rounded-md bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 p-1.5 z-10 max-h-40 overflow-y-auto">
                  <div className="p-1.5">
                    <input
                      type="text"
                      placeholder="Search employees..."
                      className="w-full p-1.5 border rounded-md mb-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                    />
                  </div>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`flex items-center w-full text-left p-1.5 rounded-md transition-colors duration-200 text-sm ${
                          !selectedEmployee
                            ? "bg-blue-500 text-white"
                            : active
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            : "text-gray-700 dark:text-gray-200"
                        }`}
                        onClick={() => setSelectedEmployee(null)}
                      >
                        <span>All Contacts</span>
                      </button>
                    )}
                  </Menu.Item>
                  {employeeList
                    .filter(
                      (employee) =>
                        (employee.name?.toLowerCase() || "").includes(
                          (employeeSearch || "").toLowerCase()
                        ) &&
                        (userRole === "1" || employee.name === currentUserName)
                    )
                    .sort((a, b) => {
                      if (!a.name && !b.name) return 0;
                      if (!a.name) return 1;
                      if (!b.name) return 1;
                      return a.name.localeCompare(b.name);
                    })
                    .map((employee) => (
                      <Menu.Item key={employee.id}>
                        {({ active }) => (
                          <button
                            className={`flex items-center justify-between w-full text-left p-1.5 rounded-md transition-colors duration-200 text-sm ${
                              selectedEmployee === employee.name
                                ? "bg-blue-500 text-white"
                                : active
                                ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                : "text-gray-700 dark:text-gray-200"
                            }`}
                            onClick={() =>
                              setSelectedEmployee(
                                employee.name === selectedEmployee
                                  ? null
                                  : employee.name
                              )
                            }
                          >
                            <span>{employee.name}</span>
                            <div className="flex items-center space-x-1.5 text-xs">
                              {employee.quotaLeads !== undefined && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {employee.assignedContacts || 0}/
                                  {employee.quotaLeads} leads
                                </span>
                              )}
                            </div>
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                </Menu.Items>
              </Menu>

              {/* Tags expansion toggle */}
              <button
                className="p-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-all duration-200"
                onClick={toggleTagsExpansion}
                title={isTagsExpanded ? "Show Less Tags" : "Show More Tags"}
              >
                <Lucide
                  icon={isTagsExpanded ? "ChevronUp" : "ChevronDown"}
                  className="w-3 h-3 text-gray-800 dark:text-gray-200"
                />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 mb-1 px-2 max-h-20 overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {[
              "Mine",
              "All",
              "Unassigned",
              ...(isTagsExpanded
                ? [
                    "Group",
                    "Unread",
                    "Snooze",
                    "Stop Bot",
                    "Active Bot",
                    "Resolved",
                    ...(userData?.phone !== undefined && userData.phone !== -1
                      ? [
                          phoneNames[userData.phone] ||
                            `Phone ${userData.phone + 1}`,
                        ]
                      : Object.values(phoneNames)),
                    ...visibleTags.filter(
                      (tag) =>
                        ![
                          "All",
                          "Unread",
                          "Mine",
                          "Unassigned",
                          "Snooze",
                          "Group",
                          "stop bot",
                          "Active Bot",
                        ].includes(tag.name) &&
                        !visiblePhoneTags.includes(tag.name)
                    ),
                  ]
                : []),
            ].map((tag) => {
              const tagName =
                typeof tag === "string" ? tag : tag.name || String(tag);
              const tagLower = tagName.toLowerCase();
              let newfilter = contacts;
              if (userData?.phone !== undefined && userData.phone !== -1) {
                const userPhoneIndex = parseInt(userData.phone, 10);
                newfilter = contacts.filter(
                  (contact) => contact.phoneIndex === userPhoneIndex
                );
              }
              const unreadCount = newfilter.filter((contact) => {
                const contactTags =
                  contact.tags?.map((t) =>
                    typeof t === "string" ? t.toLowerCase() : ""
                  ) || [];
                const isGroup = contact.chat_id?.endsWith("@g.us");
                const phoneIndex = Object.entries(phoneNames).findIndex(
                  ([_, name]) => name.toLowerCase() === tagLower
                );

                return (
                  (tagLower === "all"
                    ? !isGroup
                    : tagLower === "unread"
                    ? contact.unreadCount && contact.unreadCount > 0
                    : tagLower === "mine"
                    ? contactTags.includes(currentUserName.toLowerCase())
                    : tagLower === "unassigned"
                    ? contact.tags?.some((t) =>
                        employeeList.some(
                          (e) =>
                            (typeof e.name === "string"
                              ? e.name.toLowerCase()
                              : "") ===
                            (typeof t === "string"
                              ? t.toLowerCase()
                              : String(t).toLowerCase())
                        )
                      )
                    : tagLower === "snooze"
                    ? contactTags.includes("snooze")
                    : tagLower === "resolved"
                    ? contactTags.includes("resolved")
                    : tagLower === "group"
                    ? isGroup
                    : tagLower === "stop bot"
                    ? contactTags.includes("stop bot")
                    : tagLower === "active bot"
                    ? !contactTags.includes("stop bot")
                    : phoneIndex !== -1
                    ? contact.phoneIndex === phoneIndex
                    : contactTags.includes(tagLower)) &&
                  (tagLower !== "all" && tagLower !== "unassigned"
                    ? contact.unreadCount && contact.unreadCount > 0
                    : true)
                );
              }).length;

              return (
                <button
                  key={typeof tag === "string" ? tag : tag.id}
                  onClick={() => filterTagContact(tagName)}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                    tagLower === activeTags[0]
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    <span>{tagName}</span>
                    {userData?.role === "1" && unreadCount > 0 && (
                      <span
                        className={`px-1 py-0.5 rounded-full text-xs font-bold ${
                          tagName.toLowerCase() === "stop bot"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : tagName.toLowerCase() === "active bot"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        }`}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <span
          className="flex items-center justify-center p-1.5 cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 font-medium text-xs"
          onClick={toggleTagsExpansion}
        >
          <span className="flex items-center space-x-1">
            <span>{isTagsExpanded ? "Show Less" : "Show More"}</span>
            <Lucide
              icon={isTagsExpanded ? "ChevronUp" : "ChevronDown"}
              className="w-2 h-2"
            />
          </span>
        </span>
        <div
          className="bg-white dark:bg-gray-900 flex-1 overflow-y-scroll h-full relative dark:border-gray-700 p-2"
          ref={contactListRef}
        >
          {isLoadingMoreContacts && (
            <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 flex items-center justify-center z-10">
              <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-3 rounded-md shadow-md">
                <LoadingIcon icon="oval" className="w-4 h-4 text-blue-500" />
                <span className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Loading more contacts...
                </span>
              </div>
            </div>
          )}
          {loadedContacts.length === 0 ? ( // Check if loadedContacts is empty
            <div className="flex items-center justify-center h-full min-h-[400px]">
              {loadedContacts.length === 0 && (
                <div className="flex flex-col items-center text-center max-w-md mx-auto">
                  {/* Modern icon with gradient background */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                    <Lucide
                      icon="MessageCircle"
                      className="h-5 w-5 text-white"
                    />
                  </div>

                  {/* Main heading with better typography */}
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                    {isInitialLoading
                      ? "Loading contacts..."
                      : isTagFiltering
                      ? "Searching contacts..."
                      : "No contacts found"}
                  </h2>

                  {/* Subtitle with better styling */}
                  <p className="text-gray-600 dark:text-gray-400 mb-3 text-center text-sm">
                    {isInitialLoading
                      ? "Please wait while we load your contacts"
                      : isTagFiltering
                      ? "Searching through all your contacts..."
                      : "Start by adding your first contact or importing from your phone"}
                  </p>

                  {/* Enhanced loading progress */}
                  {isInitialLoading && (
                    <div className="w-full max-w-sm bg-gray-100 dark:bg-gray-800 rounded-lg p-3 shadow-inner">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                        <span className="font-medium">Loading progress</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {realLoadingProgress}%
                        </span>
                      </div>

                      {/* Modern progress bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                          style={{ width: `${realLoadingProgress}%` }}
                        ></div>
                      </div>

                      {/* Loading steps with better visual hierarchy */}
                      <div className="mt-4 space-y-2">
                        {loadingSteps.userConfig && (
                          <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>User configuration loaded</span>
                          </div>
                        )}
                        {loadingSteps.contactsFetch && (
                          <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Contacts fetched</span>
                          </div>
                        )}
                        {loadingSteps.contactsProcess && (
                          <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                            <span>Processing contacts...</span>
                          </div>
                        )}
                        {loadingSteps.complete && (
                          <div className="flex items-center text-xs text-green-600 dark:text-green-400 font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span>Loading complete!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Enhanced tag filtering state */}
                  {isTagFiltering && (
                    <div className="w-full max-w-sm bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-medium text-center">
                        Searching through {contacts.length.toLocaleString()}{" "}
                        contacts...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : !isInitialLoading ? (
            paginatedContacts.map((contact, index) => (
              <React.Fragment
                key={
                  `${contact.contact_id}-${index}` ||
                  `${contact.phone}-${index}`
                }
              >
                <div
                  className={`px-2 py-1.5 cursor-pointer transition-all duration-200 group hover:bg-gray-100/50 dark:hover:bg-gray-700/30 mx-1 my-0.5 select-none ${
                    contact.contact_id !== undefined
                      ? selectedChatId === contact.contact_id
                        ? "bg-blue-100/50 dark:bg-blue-900/20 border border-blue-500/30 rounded-lg"
                        : "bg-transparent"
                      : selectedChatId === contact.contact_id
                      ? "bg-blue-100/50 dark:bg-blue-900/20 border border-blue-500/30 rounded-lg"
                      : "bg-transparent"
                  }`}
                  onClick={() => selectChat(contact.contact_id!, contact.id!)}
                  onContextMenu={(e) => handleContextMenu(e, contact)}
                  title="Right-click for more options"
                >
                  <div className="flex items-center space-x-1.5">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 overflow-hidden">
                        {contact &&
                          (contact.chat_id &&
                          contact.chat_id.includes("@g.us") ? (
                            contact.profilePicUrl ? (
                              <img
                                src={contact.profilePicUrl}
                                alt="Profile"
                                className="w-full h-full object-cover rounded-full"
                                onError={(e) => {
                                  const originalSrc = e.currentTarget.src;
                                  if (originalSrc !== logoImage) {
                                    e.currentTarget.src = logoImage;
                                  }
                                }}
                              />
                            ) : (
                              <Lucide
                                icon="Users"
                                className="w-2.5 h-2.5 text-white dark:text-gray-200"
                              />
                            )
                          ) : contact.profilePicUrl ? (
                            <img
                              src={contact.profilePicUrl}
                              alt={contact.contactName || "Profile"}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              <Lucide icon="User" className="w-2.5 h-2.5" />
                            </div>
                          ))}
                      </div>

                      {/* Unread badge - Show prominently when count > 0, show plain text when count = 0 */}
                      {contact.unreadCount !== undefined && (
                        <>
                          {/* Prominent badge for unread messages */}
                          {(contact.unreadCount ?? 0) > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-green-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[14px] h-[14px] flex items-center justify-center font-bold">
                              {(contact.unreadCount ?? 0) > 99
                                ? "99+"
                                : contact.unreadCount ?? 0}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col space-y-0.5">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate mb-0">
                              {(
                                contact.contactName ??
                                contact.firstName ??
                                contact.phone ??
                                ""
                              ).slice(0, 25)}
                              {(
                                contact.contactName ??
                                contact.firstName ??
                                contact.phone ??
                                ""
                              ).length > 25
                                ? "..."
                                : ""}
                            </h3>

                            <div className="flex items-center space-x-0.5 text-xs text-gray-600 dark:text-gray-400">
                              <div className="flex flex-grow items-center">
                                {(() => {
                                  const employeeTags =
                                    contact.tags?.filter((tag) =>
                                      employeeList.some(
                                        (employee) =>
                                          (employee.name?.toLowerCase() ||
                                            "") ===
                                          (typeof tag === "string"
                                            ? tag
                                            : String(tag)
                                          ).toLowerCase()
                                      )
                                    ) || [];

                                  const otherTags =
                                    contact.tags?.filter(
                                      (tag) =>
                                        !employeeList.some(
                                          (employee) =>
                                            (employee.name?.toLowerCase() ||
                                              "") ===
                                            (typeof tag === "string"
                                              ? tag
                                              : String(tag)
                                            ).toLowerCase()
                                        )
                                    ) || [];

                                  const uniqueTags = Array.from(
                                    new Set([...otherTags])
                                  );

                                  return (
                                    <>
                                      <button
                                        className={`text-sm ${
                                          contact.pinned
                                            ? "text-blue-600 dark:text-blue-400 font-bold"
                                            : "text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:font-bold mr-1"
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          togglePinConversation(
                                            contact.chat_id!
                                          );
                                        }}
                                      >
                                        {contact.pinned ? (
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="9"
                                            height="9"
                                            viewBox="0 0 48 48"
                                            className="text-blue-600 dark:text-blue-400 fill-current mr-0.5"
                                          >
                                            <mask id="ipSPin0">
                                              <path
                                                fill="#fff"
                                                stroke="#fff"
                                                strokeLinejoin="round"
                                                strokeWidth="4"
                                                d="M10.696 17.504c2.639-2.638 5.774-2.565 9.182-.696L32.62 9.745l-.721-4.958L43.213 16.1l-4.947-.71l-7.074 12.73c1.783 3.638 1.942 6.544-.697 9.182l-7.778-7.778L6.443 41.556l11.995-16.31l-7.742-7.742Z"
                                              />
                                            </mask>
                                            <path
                                              fill="currentColor"
                                              d="M0 0h48v48H0z"
                                              mask="url(#ipSPin0)"
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="18"
                                            height="18"
                                            viewBox="0 0 48 48"
                                            className="group-hover:block hidden"
                                          >
                                            <path
                                              fill="none"
                                              stroke="currentColor"
                                              strokeLinejoin="round"
                                              strokeWidth="4"
                                              d="M10.696 17.504c2.639-2.638 5.774-2.565 9.182-.696L32.62 9.745l-.721-4.958L43.213 16.1l-4.947-.71l-7.074 12.73c1.783 3.638 1.942 6.544-.697 9.182l-7.778-7.778L6.443 41.556l11.995-16.31l-7.742-7.742Z"
                                            />
                                          </svg>
                                        )}
                                      </button>
                                      {uniqueTags.filter(
                                        (tag) =>
                                          (typeof tag === "string"
                                            ? tag
                                            : String(tag)
                                          ).toLowerCase() !== "stop bot"
                                      ).length > 0 && (
                                        <span className="bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-1.5 py-0.5 rounded-full mr-1">
                                          <Lucide
                                            icon="Tag"
                                            className="w-3 h-3 inline-block mr-0.5"
                                          />
                                          {
                                            uniqueTags.filter(
                                              (tag) =>
                                                (typeof tag === "string"
                                                  ? tag
                                                  : String(tag)
                                                ).toLowerCase() !== "stop bot"
                                            ).length
                                          }
                                        </span>
                                      )}
                                      {employeeTags.length > 0 && (
                                        <span className="bg-green-100 dark:bg-green-600/30 text-green-700 dark:text-green-300 text-xs font-medium px-1.5 py-0.5 rounded-full mr-1">
                                          <Lucide
                                            icon="Users"
                                            className="w-3 h-3 inline-block mr-0.5"
                                          />
                                          {employeeTags.length === 1
                                            ? employeeList.find(
                                                (e) =>
                                                  (e.name?.toLowerCase() ||
                                                    "") ===
                                                  (typeof employeeTags[0] ===
                                                  "string"
                                                    ? employeeTags[0]
                                                    : String(employeeTags[0])
                                                  ).toLowerCase()
                                              )?.employeeId ||
                                              (employeeTags[0]?.length > 8
                                                ? employeeTags[0].slice(0, 6)
                                                : employeeTags[0])
                                            : employeeTags.length}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end space-y-0 ml-1">
                            <span
                              className={`text-xs ${
                                contact.unreadCount && contact.unreadCount > 0
                                  ? "text-green-600 dark:text-green-400 font-medium"
                                  : "text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              {contact.last_message?.createdAt ||
                              contact.last_message?.timestamp
                                ? formatDate(
                                    contact.last_message.createdAt ||
                                      (contact.last_message.timestamp &&
                                        contact.last_message.timestamp * 1000)
                                  )
                                : "New"}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="mt-0.5">
                              <span className="text-xs text-gray-700 dark:text-gray-400 truncate block">
                                {contact.last_message ? (
                                  <>
                                    {contact.last_message.from_me && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="inline-block w-3 h-3 text-blue-600 dark:text-blue-400 mr-1"
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
                                    {(() => {
                                      const message = contact.last_message;
                                      if (!message) return "No Messages";

                                      const getMessageContent = () => {
                                        switch (message.type) {
                                          case "text":
                                          case "chat":
                                            return (
                                              message.text?.body || "Message"
                                            );
                                          case "image":
                                            return message.text?.body
                                              ? `📷 ${message.text?.body}`
                                              : "📷 Photo";
                                          case "document":
                                            return `📄 ${
                                              message.document?.filename ||
                                              message.text?.body ||
                                              "Document"
                                            }`;
                                          case "audio":
                                          case "ptt":
                                            return "🎵 Audio";
                                          case "video":
                                            return message.text?.body
                                              ? `🎥 ${message.text?.body}`
                                              : "🎥 Video";
                                          case "voice":
                                            return "🎤 Voice message";
                                          case "sticker":
                                            return "😊 Sticker";
                                          case "location":
                                            return "📍 Location";
                                          case "call_log":
                                            return `📞 ${
                                              message.call_log?.status || "Call"
                                            }`;
                                          case "order":
                                            return "🛒 Order";
                                          case "gif":
                                            return "🎞️ GIF";
                                          case "link_preview":
                                            return "🔗 Link";
                                          case "privateNote":
                                            return "📝 Private note";
                                          default:
                                            return (
                                              message.text?.body || "Message"
                                            );
                                        }
                                      };

                                      const content = getMessageContent();
                                      return message.from_me
                                        ? content
                                        : content;
                                    })()}
                                  </>
                                ) : (
                                  "No Messages"
                                )}
                              </span>
                            </div>
                          </div>

                          {isAssistantAvailable && (
                            <div
                              onClick={(e) =>
                                toggleStopBotLabel(contact, index, e)
                              }
                              className="cursor-pointer ml-2"
                              title={
                                contact.tags?.includes("stop bot")
                                  ? "Bot Disabled"
                                  : "Bot Enabled"
                              }
                            >
                              <label className="inline-flex items-center cursor-pointer group">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={contact.tags?.includes("stop bot")}
                                  readOnly
                                />
                                <span
                                  className={`relative w-8 h-4 flex items-center rounded-full transition-colors duration-300 ${
                                    contact.tags?.includes("stop bot")
                                      ? "bg-gradient-to-r from-red-500 to-red-700"
                                      : "bg-gradient-to-r from-green-500 to-green-700"
                                  }`}
                                >
                                  <span
                                    className={`absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-300 ${
                                      contact.tags?.includes("stop bot")
                                        ? "translate-x-4"
                                        : "translate-x-0"
                                    }`}
                                  ></span>
                                </span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
              
                  </div>
                </div>
              </React.Fragment>
            ))
          ) : null}
        </div>
        <div
          className={`flex flex-col justify-center items-center gap-1.5 mt-3 mb-3 px-2 ${
            isLoadingMoreContacts ? "opacity-50" : ""
          }`}
        >
          {/* Main Pagination */}
          <div className="flex justify-center items-center">
            <ReactPaginate
              breakLabel="…"
              nextLabel="Next"
              onPageChange={isLoadingMoreContacts ? () => {} : handlePageChange}
              pageRangeDisplayed={2}
              marginPagesDisplayed={2}
              pageCount={Math.ceil(totalContacts / contactsPerPage)}
              previousLabel="Previous"
              renderOnZeroPageCount={null}
              containerClassName="flex justify-center items-center flex-wrap gap-0.5"
              pageClassName="mx-0.25"
              pageLinkClassName="px-1.5 py-1 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs min-w-[18px] text-center font-medium transition-all duration-200 border border-gray-200 dark:border-gray-600"
              previousClassName="mx-0.5"
              nextClassName="mx-0.5"
              previousLinkClassName="px-1.5 py-1 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition-all duration-200 border border-gray-200 dark:border-gray-600"
              nextLinkClassName="px-1.5 py-1 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition-all duration-200 border border-gray-200 dark:border-gray-600"
              disabledClassName="opacity-50 cursor-not-allowed"
              activeClassName="font-bold"
              activeLinkClassName="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 border-blue-500"
              forcePage={currentPage}
            />
          </div>
        </div>
        {isLoadingMoreContacts && (
          <div className="flex flex-col items-center justify-center mt-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
            <LoadingIcon icon="oval" className="w-3 h-3 text-primary" />
            <span className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Loading more contacts...
            </span>
            <div className="mt-1 w-full max-w-xs">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                <div className="bg-primary h-1 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col w-full sm:w-3/4  dark:bg-gray-900 relative flext-1 overflow-hidden">
        {selectedChatId ? (
          <>
            <div className="flex items-center justify-between p-3 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
              <div className="flex items-center">
                <button
                  onClick={handleBack}
                  className="back-button p-1.5 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                >
                  <Lucide icon="ChevronLeft" className="w-3.5 h-3.5" />
                </button>
                <div className="w-8 h-8 overflow-hidden rounded-full shadow-md bg-gray-700 flex items-center justify-center text-white mr-2 ml-1.5">
                  {selectedContact?.profilePicUrl ? (
                    <img
                      src={selectedContact.profilePicUrl}
                      alt={selectedContact.contactName || "Profile"}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold">
                      {selectedContact?.contactName
                        ? selectedContact.contactName.charAt(0).toUpperCase()
                        : "?"}
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize mb-0.5">
                    {selectedContact.contactName && selectedContact.lastName
                      ? `${selectedContact.contactName} ${selectedContact.lastName}`
                      : selectedContact.contactName ||
                        selectedContact.firstName ||
                        selectedContact.phone}
                  </div>

                  {userRole === "1" && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedContact.phone}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex space-x-2">
                  <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button
                      as={Button}
                      className="p-2 !box m-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    >
                      <span className="flex items-center justify-center w-8 h-8">
                        <Lucide
                          icon="Users"
                          className="w-5 h-5 text-gray-800 dark:text-gray-200"
                        />
                      </span>
                    </Menu.Button>
                    <Menu.Items className="absolute right-0 mt-2 w-64 shadow-xl rounded-xl p-4 z-10 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Search employees..."
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                        />
                      </div>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`flex items-center w-full text-left px-4 py-3 rounded-lg text-base font-medium ${
                              !selectedEmployee
                                ? "bg-blue-600 text-white dark:bg-blue-600 dark:text-white"
                                : active
                                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                : "text-gray-700 dark:text-gray-200"
                            }`}
                            onClick={() => setSelectedEmployee(null)}
                          >
                            <span>All Contacts</span>
                          </button>
                        )}
                      </Menu.Item>
                      {employeeList
                        .filter(
                          (employee) =>
                            (employee.name?.toLowerCase() || "").includes(
                              employeeSearch?.toLowerCase() || ""
                            ) &&
                            (userRole === "1" ||
                              employee.name === currentUserName)
                        )
                        .sort((a, b) =>
                          (a.name?.toLowerCase() || "").localeCompare(
                            b.name?.toLowerCase() || ""
                          )
                        )
                        .map((employee) => (
                          <Menu.Item key={employee.id}>
                            {({ active }) => (
                              <button
                                className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-lg text-base ${
                                  selectedEmployee === employee.name
                                    ? "bg-blue-600 text-white dark:bg-blue-600 dark:text-white"
                                    : active
                                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                    : "text-gray-700 dark:text-gray-200"
                                }`}
                                onClick={() => {
                                  console.log(
                                    "🎯 [UI] Employee assignment clicked:",
                                    employee.name,
                                    selectedContact
                                  );
                                  handleAddTagToSelectedContacts(
                                    employee.name,
                                    selectedContact
                                  );
                                }}
                              >
                                <span className="font-medium">
                                  {employee.name}
                                </span>
                                <div className="flex items-center space-x-2 text-sm">
                                  {employee.quotaLeads !== undefined && (
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {employee.assignedContacts || 0}/
                                      {employee.quotaLeads} leads
                                    </span>
                                  )}
                                </div>
                              </button>
                            )}
                          </Menu.Item>
                        ))}
                    </Menu.Items>
                  </Menu>
                  <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button
                      as={Button}
                      className="p-2 !box m-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    >
                      <span className="flex items-center justify-center w-8 h-8">
                        <Lucide
                          icon="Tag"
                          className="w-5 h-5 text-gray-800 dark:text-gray-200"
                        />
                      </span>
                    </Menu.Button>
                    <Menu.Items className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-4 z-10 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700">
                      {tagList.map((tag) => (
                        <Menu.Item key={tag.id}>
                          <button
                            className={`flex items-center w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-base ${
                              activeTags.includes(tag.name)
                                ? "bg-gray-200 dark:bg-gray-700"
                                : ""
                            }`}
                            onClick={() => {
                              console.log(
                                "🎯 [UI] Tag assignment clicked:",
                                tag.name,
                                selectedContact
                              );
                              handleAddTagToSelectedContacts(
                                tag.name,
                                selectedContact
                              );
                            }}
                          >
                            <Lucide
                              icon="User"
                              className="w-5 h-5 mr-3 text-gray-800 dark:text-gray-200"
                            />
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {tag.name}
                            </span>
                          </button>
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Menu>
                  <button
                    className="p-3 m-0 !box hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    onClick={handleEyeClick}
                  >
                    <span className="flex items-center justify-center w-6 h-6">
                      <Lucide
                        icon={isTabOpen ? "X" : "Eye"}
                        className="w-6 h-6 text-gray-800 dark:text-gray-200"
                      />
                    </span>
                  </button>
                  <button
                    className="p-3 m-0 !box hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    onClick={handleMessageSearchClick}
                  >
                    <span className="flex items-center justify-center w-6 h-6">
                      <Lucide
                        icon={isMessageSearchOpen ? "X" : "Search"}
                        className="w-6 h-6 text-gray-800 dark:text-gray-200"
                      />
                    </span>
                  </button>
                </div>
                <Menu
                  as="div"
                  className="sm:hidden relative inline-block text-left"
                >
                  <Menu.Button
                    as={Button}
                    className="p-3 !box m-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  >
                    <span className="flex items-center justify-center w-6 h-6">
                      <Lucide
                        icon="MoreVertical"
                        className="w-6 h-6 text-gray-800 dark:text-gray-200"
                      />
                    </span>
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-3 z-10 border border-gray-200 dark:border-gray-700">
                    <Menu.Item>
                      <Menu
                        as="div"
                        className="relative inline-block text-left w-full"
                      >
                        <Menu.Button className="flex items-center w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-base">
                          <Lucide
                            icon="Users"
                            className="w-5 h-5 mr-3 text-gray-800 dark:text-gray-200"
                          />
                          <span className="text-gray-800 dark:text-gray-200">
                            Assign Employee
                          </span>
                        </Menu.Button>
                        <Menu.Items className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-4 z-10 overflow-y-auto max-h-96 border border-gray-200 dark:border-gray-700">
                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="Search employees..."
                              value={employeeSearch}
                              onChange={(e) =>
                                setEmployeeSearch(e.target.value)
                              }
                              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            />
                          </div>
                          {employeeList
                            .filter((employee) => {
                              if (userRole === "4" || userRole === "2") {
                                const shouldInclude =
                                  employee.role === "2" &&
                                  (employee.name?.toLowerCase() || "").includes(
                                    employeeSearch?.toLowerCase() || ""
                                  );
                                return shouldInclude;
                              }
                              const shouldInclude = (
                                employee.name?.toLowerCase() || ""
                              ).includes(employeeSearch?.toLowerCase() || "");
                              return shouldInclude;
                            })
                            .map((employee) => {
                              return (
                                <Menu.Item key={employee.id}>
                                  <button
                                    className="flex items-center w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-base"
                                    onClick={() =>
                                      handleAddTagToSelectedContacts(
                                        employee.name,
                                        selectedContact
                                      )
                                    }
                                  >
                                    <span className="text-gray-800 dark:text-gray-200">
                                      {employee.name}
                                    </span>
                                  </button>
                                </Menu.Item>
                              );
                            })}
                        </Menu.Items>
                      </Menu>
                    </Menu.Item>
                    <Menu.Item>
                      <Menu
                        as="div"
                        className="relative inline-block text-left w-full"
                      >
                        <Menu.Button className="flex items-center w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-base">
                          <Lucide
                            icon="Tag"
                            className="w-5 h-5 mr-3 text-gray-800 dark:text-gray-200"
                          />
                          <span className="text-gray-800 dark:text-gray-200">
                            Add Tag
                          </span>
                        </Menu.Button>
                        <Menu.Items className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 shadow-xl rounded-xl p-4 z-10 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700">
                          {tagList.map((tag) => (
                            <Menu.Item key={tag.id}>
                              <button
                                className="flex items-center w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-base"
                                onClick={() => {
                                  console.log(
                                    "🎯 [UI] Tag assignment clicked (menu 2):",
                                    tag.name,
                                    selectedContact
                                  );
                                  handleAddTagToSelectedContacts(
                                    tag.name,
                                    selectedContact
                                  );
                                }}
                              >
                                <span className="text-gray-800 dark:text-gray-200 font-medium">
                                  {tag.name}
                                </span>
                              </button>
                            </Menu.Item>
                          ))}
                        </Menu.Items>
                      </Menu>
                    </Menu.Item>
                    <Menu.Item>
                      <button
                        className="flex items-center w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-base"
                        onClick={handleEyeClick}
                      >
                        <Lucide
                          icon={isTabOpen ? "X" : "Eye"}
                          className="w-5 h-5 mr-3 text-gray-800 dark:text-gray-200"
                        />
                        <span className="text-gray-800 dark:text-gray-200">
                          {isTabOpen ? "Close" : "View"} Details
                        </span>
                      </button>
                    </Menu.Item>
                    <Menu.Item>
                      <button
                        className="flex items-center w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-base"
                        onClick={handleMessageSearchClick}
                      >
                        <Lucide
                          icon={isMessageSearchOpen ? "X" : "Search"}
                          className="w-5 h-5 mr-3 text-gray-800 dark:text-gray-200"
                        />
                        <span className="text-gray-800 dark:text-gray-200">
                          {isMessageSearchOpen ? "Close" : "Open"} Search
                        </span>
                      </button>
                    </Menu.Item>
                  </Menu.Items>
                </Menu>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto p-2"
              style={{
                paddingBottom: "75px",
                backgroundColor: selectedContact
                  ? "transparent"
                  : "bg-white dark:bg-gray-800",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
              }}
              ref={messageListRef}
            >
              {isLoading2 && (
                <div className="fixed top-0 left-0 right-10 bottom-0 flex justify-center items-center bg-opacity-50">
                  <div className="items-center absolute top-1/2 left-1/2 transform translate-x-[200%] -translate-y-1/2 p-6">
                    <div role="status">
                      <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
                        <LoadingIcon
                          icon="spinning-circles"
                          className="w-24 h-24 p-6 text-blue-500 dark:text-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {selectedChatId && (
                <>
                  {messages
                    .filter(
                      (message) =>
                        message.type !== "action" &&
                        message.type !== "e2e_notification" &&
                        message.type !== "notification_template" &&
                        (userData?.company !== "Revotrend" ||
                          userData?.phone === undefined ||
                          phoneCount === undefined ||
                          phoneCount === 0 ||
                          message.phoneIndex === undefined ||
                          message.phoneIndex === null ||
                          message.phoneIndex.toString() ===
                            userData?.phone.toString())
                    )
                    .map((message, index, array) => {
                      //
                      const previousMessage =
                        index > 0 ? array[index - 1] : null;

                      // Get the current message date
                      const currentDate = new Date(
                        (message.timestamp ?? message.createdAt ?? 0) * 1000
                      );

                      // Get the previous message date
                      const previousDate = previousMessage
                        ? new Date(
                            (previousMessage.timestamp ??
                              previousMessage.createdAt ??
                              0) * 1000
                          )
                        : null;

                      const showDateHeader =
                        index === 0 ||
                        !previousMessage ||
                        !previousDate ||
                        isNaN(previousDate.getTime()) ||
                        isNaN(currentDate.getTime()) ||
                        !isSameDay(previousDate, currentDate);

                      const isMyMessage = message.from_me;
                      const prevMessage = messages[index - 1];
                      const nextMessage = messages[index + 1];

                      const isFirstInSequence =
                        !prevMessage || prevMessage.from_me !== message.from_me;
                      const isLastInSequence =
                        !nextMessage || nextMessage.from_me !== message.from_me;

                      let messageClass;
                      if (isMyMessage) {
                        messageClass = isFirstInSequence
                          ? myFirstMessageClass
                          : isLastInSequence
                          ? myLastMessageClass
                          : myMiddleMessageClass;
                      } else {
                        messageClass = isFirstInSequence
                          ? otherFirstMessageClass
                          : isLastInSequence
                          ? otherLastMessageClass
                          : otherMiddleMessageClass;
                      }

                      return (
                        <React.Fragment
                          key={`${message.id}-${index}-${
                            message.timestamp || message.createdAt || index
                          }`}
                        >
                          {showDateHeader && (
                            <div className="flex justify-center my-3">
                              <div className="inline-block bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold py-1 px-3 rounded-lg shadow-md text-sm">
                                {(() => {
                                  const messageDate = new Date(
                                    (message.timestamp ||
                                      message.createdAt ||
                                      0) * 1000
                                  );
                                  const today = new Date();

                                  if (isSameDay(messageDate, today)) {
                                    return "Today";
                                  } else if (
                                    isSameDay(
                                      messageDate,
                                      new Date(
                                        today.getTime() - 24 * 60 * 60 * 1000
                                      )
                                    )
                                  ) {
                                    return "Yesterday";
                                  } else {
                                    return formatDateHeader(
                                      message.timestamp ||
                                        message.createdAt ||
                                        ""
                                    );
                                  }
                                })()}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 relative">
                            <div
                              data-message-id={message.id}
                              className={`p-2 mr-5 mb-2 ${
                                message.type === "privateNote"
                                  ? privateNoteClass
                                  : messageClass
                              } relative`}
                              style={{
                                maxWidth:
                                  message.type === "document" ? "90%" : "70%",
                                width: `${
                                  message.type === "document"
                                    ? "600"
                                    : message.type !== "text"
                                    ? "500"
                                    : message.text?.body
                                    ? Math.min(
                                        Math.max(
                                          message.text.body.length,
                                          message.text?.context?.quoted_content
                                            ?.body?.length || 0
                                        ) * 40,
                                        500
                                      )
                                    : "250"
                                }px`,
                                minWidth: "300px",
                                backgroundColor: message.from_me
                                  ? "#dcf8c6"
                                  : undefined,
                              }}
                              onMouseEnter={() =>
                                setHoveredMessageId(message.id)
                              }
                              onMouseLeave={() => setHoveredMessageId(null)}
                            >
                              {/* Sender name display */}
                              {!message.isPrivateNote && (
                                <div className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                                  {message.from_me
                                    ? userData?.name || "Me"
                                    : selectedContact?.contactName ||
                                      selectedContact?.firstName ||
                                      selectedContact?.phone ||
                                      "Contact"}
                                </div>
                              )}
                              {message.isPrivateNote && (
                                <div className="flex items-center mb-1.5">
                                  <Lock size={10} className="mr-1.5" />
                                  <span className="text-sm font-semibold">
                                    Private Note
                                  </span>
                                </div>
                              )}
                              {message.chat_id &&
                                (message.chat_id.includes("@g.us") ||
                                  (userData?.companyId === "0123" &&
                                    message.chat_id.includes("@c.us"))) &&
                                message.author && (
                                  <div
                                    className="pb-1 text-sm font-medium capitalize mb-1.5"
                                    style={{
                                      color: getAuthorColor(
                                        message.author.split("@")[0]
                                      ),
                                    }}
                                  >
                                    {message.author.split("@")[0].toLowerCase()}
                                  </div>
                                )}
                              {message.type === "text" &&
                                message.text?.context && (
                                  <div
                                    className="p-2 mb-2 rounded-lg bg-gray-200 dark:bg-gray-800 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200"
                                    onClick={() => {
                                      const quotedMessageId =
                                        message.text?.context?.id;
                                      const quotedContent =
                                        message.text?.context?.body;

                                      // First try by ID if available
                                      if (quotedMessageId) {
                                        scrollToMessage(quotedMessageId);
                                        const element =
                                          messageListRef.current?.querySelector(
                                            `[data-message-id="${quotedMessageId}"]`
                                          );
                                        if (element) {
                                          element.classList.add(
                                            "highlight-message"
                                          );
                                          setTimeout(() => {
                                            element.classList.remove(
                                              "highlight-message"
                                            );
                                          }, 2000);
                                          return;
                                        }
                                      }
                                      //

                                      // If ID not found or no match, search by content
                                      if (quotedContent) {
                                        const matchingMessage = messages.find(
                                          (msg) =>
                                            msg.type === "text" &&
                                            msg.text?.body === quotedContent
                                        );

                                        if (matchingMessage) {
                                          scrollToMessage(matchingMessage.id);
                                          const element =
                                            messageListRef.current?.querySelector(
                                              `[data-message-id="${matchingMessage.id}"]`
                                            );
                                          if (element) {
                                            element.classList.add(
                                              "highlight-message"
                                            );
                                            setTimeout(() => {
                                              element.classList.remove(
                                                "highlight-message"
                                              );
                                            }, 2000);
                                          }
                                        }
                                      }
                                    }}
                                  >
                                    <div
                                      className="text-sm font-medium mb-1"
                                      style={{
                                        color: getAuthorColor(
                                          message.text.context.from
                                        ),
                                      }}
                                    >
                                      {message.text.context.from === "Me"
                                        ? "Me"
                                        : selectedContact?.contactName ||
                                          selectedContact?.firstName ||
                                          selectedContact?.phone ||
                                          message.text.context.from ||
                                          ""}
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                      {message.text.context.body || ""}
                                    </div>
                                  </div>
                                )}
                              {message.type === "privateNote" && (
                                <div className="inline-block whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 text-sm">
                                  {(() => {
                                    const text =
                                      typeof message.text === "string"
                                        ? message.text
                                        : message.text?.body || "No content";
                                    const parts = text.split(/(@\w+)/g);
                                    return parts.map((part, index) =>
                                      part.startsWith("@") ? (
                                        <span key={index} className="underline">
                                          {part}
                                        </span>
                                      ) : (
                                        part
                                      )
                                    );
                                  })()}
                                </div>
                              )}
                              {(message.type === "text" ||
                                message.type === "chat") &&
                                message.text?.body && (
                                  <div>
                                    {message.from_me &&
                                      message.userName &&
                                      message.userName !== "" &&
                                      message.chat_id &&
                                      message.chat_id.includes("@g.us") && (
                                        <div className="text-sm text-gray-300 dark:text-gray-300 mb-1.5 capitalize font-medium">
                                          {message.userName}
                                        </div>
                                      )}
                                    <div
                                      className={`whitespace-pre-wrap break-words overflow-hidden leading-relaxed text-sm font-normal ${
                                        message.from_me
                                          ? `${myMessageTextClass}`
                                          : `${otherMessageTextClass}`
                                      }`}
                                      style={{
                                        wordBreak: "break-word",
                                        overflowWrap: "break-word",
                                        lineHeight: "1.4",
                                        letterSpacing: "0.01em",
                                      }}
                                    >
                                      {formatText(message.text.body)}
                                    </div>
                                    {message.edited && (
                                      <div className="text-sm text-gray-500 mt-1.5 italic">
                                        Edited
                                      </div>
                                    )}
                                  </div>
                                )}
                              {message.type === "image" && message.image && (
                                <>
                                  <div className="p-0 message-content image-message">
                                    <img
                                      src={(() => {
                                        // Priority: base64 data > url > link
                                        if (
                                          message.image.data &&
                                          message.image.mimetype
                                        ) {
                                          return `data:${message.image.mimetype};base64,${message.image.data}`;
                                        }
                                        if (message.image.url) {
                                          return getFullImageUrl(
                                            message.image.url
                                          );
                                        }
                                        if (message.image.link) {
                                          return getFullImageUrl(
                                            message.image.link
                                          );
                                        }
                                        console.warn(
                                          "No valid image source found:",
                                          message.image
                                        );
                                        return logoImage; // Fallback to placeholder
                                      })()}
                                      alt="Image"
                                      className="rounded-2xl message-image cursor-pointer"
                                      style={{
                                        maxWidth: "auto",
                                        maxHeight: "auto",
                                        objectFit: "contain",
                                      }}
                                      onClick={() => {
                                        const imageUrl =
                                          message.image?.data &&
                                          message.image?.mimetype
                                            ? `data:${message.image.mimetype};base64,${message.image.data}`
                                            : message.image?.url
                                            ? getFullImageUrl(message.image.url)
                                            : message.image?.link
                                            ? getFullImageUrl(
                                                message.image.link
                                              )
                                            : "";
                                        if (imageUrl) {
                                          openImageModal(imageUrl);
                                        }
                                      }}
                                      onError={(e) => {
                                        const originalSrc = e.currentTarget.src;
                                        console.error(
                                          "Error loading image:",
                                          originalSrc
                                        );
                                        console.error(
                                          "Image object:",
                                          message.image
                                        );
                                        // Prevent infinite loop by checking if we're already showing the fallback
                                        if (originalSrc !== logoImage) {
                                          e.currentTarget.src = logoImage;
                                        }
                                      }}
                                    />
                                  </div>
                                  {message.image?.caption && (
                                    <div
                                      className="mb-4"
                                      style={{
                                        maxWidth: "70%",
                                        width: `${Math.min(
                                          (message.image.caption.length || 0) *
                                            15,
                                          500
                                        )}px`,
                                        minWidth: "120px",
                                      }}
                                    >
                                      <div
                                        className={`whitespace-pre-wrap break-words leading-relaxed text-lg font-normal ${
                                          message.from_me
                                            ? "text-white dark:text-white"
                                            : "text-black dark:text-white"
                                        }`}
                                        style={{
                                          lineHeight: "1.7",
                                          letterSpacing: "0.03em",
                                        }}
                                      >
                                        {formatText(message.image.caption)}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                              {message.type === "order" && message.order && (
                                <div className="p-0 message-content">
                                  <div className="flex items-center space-x-2.5 bg-emerald-800 rounded-lg p-2.5">
                                    <img
                                      src={`data:image/jpeg;base64,${message.order.thumbnail}`}
                                      alt="Order"
                                      className="w-10 h-10 rounded-lg object-cover"
                                      onError={(e) => {
                                        const originalSrc = e.currentTarget.src;
                                        console.error(
                                          "Error loading order image:",
                                          originalSrc
                                        );
                                        // Prevent infinite loop by checking if we're already showing the fallback
                                        if (originalSrc !== logoImage) {
                                          e.currentTarget.src = logoImage;
                                        }
                                      }}
                                    />
                                    <div className="text-white">
                                      <div className="flex items-center mb-1">
                                        <Lucide
                                          icon="ShoppingCart"
                                          className="w-3 h-3 mr-1.5"
                                        />
                                        <span className="text-sm">
                                          {message.order.itemCount} item
                                        </span>
                                      </div>
                                      <p className="text-sm opacity-90">
                                        MYR{" "}
                                        {(
                                          message.order.totalAmount1000 / 1000
                                        ).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {message.type === "video" && message.video && (
                                <div className="video-content p-0 message-content image-message">
                                  <video
                                    controls
                                    src={message.video.link}
                                    className="rounded-lg message-image cursor-pointer"
                                    style={{
                                      width: "auto",
                                      height: "auto",
                                      maxWidth: "100%",
                                    }}
                                  />
                                </div>
                              )}
                              {message.type === "gif" && message.gif && (
                                <>
                                  <div className="gif-content p-0 message-content image-message">
                                    <img
                                      src={message.gif.link}
                                      alt="GIF"
                                      className="rounded-lg message-image cursor-pointer"
                                      style={{ maxWidth: "200px" }}
                                      onClick={() =>
                                        openImageModal(message.gif?.link || "")
                                      }
                                    />
                                  </div>
                                  {message.gif?.caption && (
                                    <div
                                      className="mb-2"
                                      style={{
                                        maxWidth: "70%",
                                        width: `${Math.min(
                                          (message.gif.caption.length || 0) *
                                            7.5,
                                          250
                                        )}px`,
                                        minWidth: "60px",
                                      }}
                                    >
                                      <div
                                        className={`whitespace-pre-wrap break-words leading-relaxed text-sm font-normal ${
                                          message.from_me
                                            ? "text-white dark:text-white"
                                            : "text-black dark:text-white"
                                        }`}
                                        style={{
                                          lineHeight: "1.7",
                                          letterSpacing: "0.03em",
                                        }}
                                      >
                                        {formatText(message.gif.caption)}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                              {(message.type === "audio" ||
                                message.type === "ptt") &&
                                (message.audio || message.ptt) && (
                                  <>
                                    <div className="audio-content p-0 message-content image-message">
                                      <audio
                                        controls
                                        className="rounded-2xl message-image cursor-pointer"
                                        src={(() => {
                                          const audioData =
                                            message.audio?.data ||
                                            message.ptt?.data;
                                          const mimeType =
                                            message.audio?.mimetype ||
                                            message.ptt?.mimetype;
                                          if (audioData && mimeType) {
                                            const byteCharacters =
                                              atob(audioData);
                                            const byteNumbers = new Array(
                                              byteCharacters.length
                                            );
                                            for (
                                              let i = 0;
                                              i < byteCharacters.length;
                                              i++
                                            ) {
                                              byteNumbers[i] =
                                                byteCharacters.charCodeAt(i);
                                            }
                                            const byteArray = new Uint8Array(
                                              byteNumbers
                                            );
                                            const blob = new Blob([byteArray], {
                                              type: mimeType,
                                            });
                                            return URL.createObjectURL(blob);
                                          }
                                          return "";
                                        })()}
                                      />
                                    </div>
                                    {(message.audio?.caption ||
                                      message.ptt?.caption) && (
                                      <div
                                        className="mb-4"
                                        style={{
                                          maxWidth: "70%",
                                          width: `${Math.min(
                                            ((
                                              message.audio?.caption ||
                                              message.ptt?.caption ||
                                              ""
                                            ).length || 0) * 15,
                                            500
                                          )}px`,
                                          minWidth: "120px",
                                        }}
                                      >
                                        <div
                                          className={`whitespace-pre-wrap break-words leading-relaxed text-lg font-normal ${
                                            message.from_me
                                              ? "text-white dark:text-white"
                                              : "text-black dark:text-white"
                                          }`}
                                          style={{
                                            lineHeight: "1.7",
                                            letterSpacing: "0.03em",
                                          }}
                                        >
                                          {formatText(
                                            message.audio?.caption ||
                                              message.ptt?.caption ||
                                              ""
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              {message.type === "voice" && message.voice && (
                                <div className="voice-content p-0 message-content image-message w-auto h-auto">
                                  <audio
                                    controls
                                    src={message.voice.link}
                                    className="rounded-2xl message-image cursor-pointer"
                                  />
                                </div>
                              )}
                              {message.type === "document" &&
                                message.document && (
                                  <>
                                    <div className="document-content flex flex-col items-center p-8 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                                      <div
                                        className="w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 p-5 rounded-2xl"
                                        onClick={() => {
                                          if (message.document) {
                                            const docUrl =
                                              message.document.link ||
                                              (message.document.data
                                                ? `data:${message.document.mimetype};base64,${message.document.data}`
                                                : null);
                                            if (docUrl) {
                                              openPDFModal(docUrl);
                                            }
                                          }
                                        }}
                                      >
                                        <div className="flex items-center">
                                          {message.document.mimetype?.startsWith(
                                            "video/"
                                          ) ? (
                                            <Lucide
                                              icon="Video"
                                              className="w-6 h-6 text-gray-500 dark:text-gray-400 mr-2.5"
                                            />
                                          ) : message.document.mimetype?.startsWith(
                                              "image/"
                                            ) ? (
                                            <Lucide
                                              icon="Image"
                                              className="w-6 h-6 text-gray-500 dark:text-gray-400 mr-2.5"
                                            />
                                          ) : message.document.mimetype?.includes(
                                              "pdf"
                                            ) ? (
                                            <Lucide
                                              icon="FileText"
                                              className="w-6 h-6 text-gray-500 dark:text-gray-400 mr-2.5"
                                            />
                                          ) : (
                                            <Lucide
                                              icon="File"
                                              className="w-6 h-6 text-gray-500 dark:text-gray-400 mr-2.5"
                                            />
                                          )}

                                          <div className="flex-1">
                                            <div className="font-semibold text-gray-800 dark:text-gray-200 truncate text-sm">
                                              {message.document.file_name ||
                                                message.document.filename ||
                                                "Document"}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                              {message.document.page_count &&
                                                `${
                                                  message.document.page_count
                                                } page${
                                                  message.document.page_count >
                                                  1
                                                    ? "s"
                                                    : ""
                                                } • `}
                                              {message.document.mimetype ||
                                                "Unknown"}{" "}
                                              •{" "}
                                              {(
                                                (message.document.file_size ||
                                                  message.document.fileSize ||
                                                  0) /
                                                (1024 * 1024)
                                              ).toFixed(2)}{" "}
                                              MB
                                            </div>
                                          </div>
                                          <Lucide
                                            icon="ExternalLink"
                                            className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 ml-2.5"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    {message.document?.caption && (
                                      <div
                                        className="mb-2"
                                        style={{
                                          maxWidth: "70%",
                                          width: `${Math.min(
                                            (message.document.caption.length ||
                                              0) * 7.5,
                                            250
                                          )}px`,
                                          minWidth: "60px",
                                        }}
                                      >
                                        <div
                                          className={`whitespace-pre-wrap break-words leading-relaxed text-sm font-normal ${
                                            message.from_me
                                              ? "text-white dark:text-white"
                                              : "text-black dark:text-white"
                                          }`}
                                          style={{
                                            lineHeight: "1.7",
                                            letterSpacing: "0.03em",
                                          }}
                                        >
                                          {formatText(message.document.caption)}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              {message.type === "link_preview" &&
                                message.link_preview && (
                                  <div className="link-preview-content p-0 message-content image-message rounded-lg overflow-hidden text-gray-800 dark:text-gray-200">
                                    <a
                                      href={message.link_preview.body}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block"
                                    >
                                      <img
                                        src={message.link_preview.preview}
                                        alt="Preview"
                                        className="w-full"
                                      />
                                      <div className="p-2.5">
                                        <div className="font-bold text-lg mb-1.5">
                                          {message.link_preview.title}
                                        </div>
                                        <div className="text-sm text-gray-800 dark:text-gray-200 mb-1.5">
                                          {message.link_preview.description}
                                        </div>
                                        <div className="text-blue-500 text-sm">
                                          {message.link_preview.body}
                                        </div>
                                      </div>
                                    </a>
                                  </div>
                                )}
                              {message.type === "sticker" &&
                                message.sticker && (
                                  <div className="sticker-content p-0 message-content image-message">
                                    <img
                                      src={`data:${message.sticker.mimetype};base64,${message.sticker.data}`}
                                      alt="Sticker"
                                      className="rounded-lg message-image cursor-pointer"
                                      style={{
                                        maxWidth: "auto",
                                        maxHeight: "auto",
                                        objectFit: "contain",
                                      }}
                                      onClick={() =>
                                        openImageModal(
                                          `data:${message.sticker?.mimetype};base64,${message.sticker?.data}`
                                        )
                                      }
                                    />
                                  </div>
                                )}
                              {message.type === "location" &&
                                message.location && (
                                  <div className="location-content p-0 message-content image-message">
                                    <button
                                      className="text-white bg-blue-500 hover:bg-blue-600 rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-200"
                                      onClick={() =>
                                        window.open(
                                          `https://www.google.com/maps?q=${message.location?.latitude},${message.location?.longitude}`,
                                          "_blank"
                                        )
                                      }
                                    >
                                      Open Location in Google Maps
                                    </button>
                                    {message.location?.description && (
                                      <div className="text-sm text-white mt-1.5">
                                        {message.location.description}
                                      </div>
                                    )}
                                  </div>
                                )}
                              {message.type === "poll" && message.poll && (
                                <div className="poll-content p-0 message-content image-message">
                                  <div className="text-sm text-gray-800 dark:text-gray-200">
                                    Poll: {message.poll.title}
                                  </div>
                                </div>
                              )}
                              {message.type === "hsm" && message.hsm && (
                                <div className="hsm-content p-0 message-content image-message">
                                  <div className="text-sm text-gray-800 dark:text-gray-200">
                                    HSM: {message.hsm.title}
                                  </div>
                                </div>
                              )}
                              {message.type === "action" && message.action && (
                                <div className="action-content flex flex-col p-4 rounded-lg shadow-lg bg-white dark:bg-gray-800">
                                  {message.action.type === "delete" ? (
                                    <div className="text-gray-400 dark:text-gray-600 text-sm">
                                      This message was deleted
                                    </div>
                                  ) : (
                                    /* Handle other action types */
                                    <div className="text-gray-800 dark:text-gray-200 text-sm">
                                      {message.action.emoji}
                                    </div>
                                  )}
                                </div>
                              )}
                              {message.type === "call_log" && (
                                <div className="call-logs-content p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-2">
                                    {message.call_log?.status === "missed" ? (
                                      <Lucide
                                        icon="PhoneMissed"
                                        className="w-3.5 h-3.5 text-red-500"
                                      />
                                    ) : message.call_log?.status ===
                                      "outgoing" ? (
                                      <Lucide
                                        icon="PhoneOutgoing"
                                        className="w-3.5 h-3.5 text-green-500"
                                      />
                                    ) : (
                                      <Lucide
                                        icon="PhoneIncoming"
                                        className="w-3.5 h-3.5 text-blue-500"
                                      />
                                    )}
                                    <span className="font-medium text-gray-800 dark:text-gray-200 capitalize text-sm">
                                      {message.call_log?.status || "Missed"}{" "}
                                      Call
                                    </span>
                                  </div>

                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {message.call_log?.duration ? (
                                      <span>
                                        Duration:{" "}
                                        {formatDuration(
                                          message.call_log.duration
                                        )}
                                      </span>
                                    ) : (
                                      <span>Call ended</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {showReactionPicker &&
                                reactionMessage?.id === message.id && (
                                  <ReactionPicker
                                    onSelect={(emoji) =>
                                      handleReaction(message, emoji)
                                    }
                                    onClose={() => setShowReactionPicker(false)}
                                  />
                                )}
                              {message.reactions &&
                                message.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5 rounded-full px-2 py-1 w-fit">
                                    {message.reactions.map(
                                      (reaction: any, index: number) => (
                                        <span key={index} className="text-lg">
                                          {reaction.emoji}
                                        </span>
                                      )
                                    )}
                                  </div>
                                )}
                              <div className="flex justify-between items-center mt-1">
                                <div
                                  className={`message-timestamp text-xs ${
                                    message.from_me
                                      ? myMessageTextClass
                                      : otherMessageTextClass
                                  } flex items-center h-4 ml-auto`}
                                >
                                  <div className="flex items-center mr-1">
                                    {(hoveredMessageId === message.id ||
                                      selectedMessages.includes(message)) && (
                                      <>
                                        <button
                                          className="ml-1 text-black hover:text-blue-600 dark:text-white dark:hover:text-blue-300 transition-colors duration-200 mr-1"
                                          onClick={() =>
                                            setReplyToMessage(message)
                                          }
                                        >
                                          <Lucide
                                            icon="MessageCircleReply"
                                            className="w-4 h-4"
                                          />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setReactionMessage(message);
                                            setShowReactionPicker(true);
                                          }}
                                          className="mr-1 p-0.5 text-black hover:text-blue-500 dark:text-white dark:hover:text-blue-300"
                                        >
                                          <Lucide
                                            icon="Heart"
                                            className="w-4 h-4"
                                          />
                                        </button>
                                        {showReactionPicker &&
                                          reactionMessage?.id ===
                                            message.id && (
                                            <ReactionPicker
                                              onSelect={(emoji) =>
                                                handleReaction(message, emoji)
                                              }
                                              onClose={() =>
                                                setShowReactionPicker(false)
                                              }
                                            />
                                          )}
                                        {message.from_me &&
                                          message.createdAt &&
                                          new Date().getTime() -
                                            new Date(
                                              message.createdAt
                                            ).getTime() <
                                            15 * 60 * 1000 &&
                                          userRole !== "3" && (
                                            <button
                                              className="ml-2 mr-2 text-white hover:text-blue-500 dark:text-white dark:hover:text-blue-300 transition-colors duration-200"
                                              onClick={() =>
                                                openEditMessage(message)
                                              }
                                            >
                                              <Lucide
                                                icon="PencilLine"
                                                className="w-4 h-4"
                                              />
                                            </button>
                                          )}
                                        <input
                                          type="checkbox"
                                          className="mr-2 form-checkbox h-4 w-4 text-blue-500 transition duration-150 ease-in-out rounded-full"
                                          checked={selectedMessages.includes(
                                            message
                                          )}
                                          onChange={() =>
                                            handleSelectMessage(message)
                                          }
                                        />
                                      </>
                                    )}
                                    {message.phoneIndex !== undefined && (
                                      <div
                                        className={`text-xs px-2 py-1 ${
                                          message.from_me
                                            ? "text-black"
                                            : "text-black dark:text-gray-400"
                                        }`}
                                      >
                                        {phoneNames[message.phoneIndex] ||
                                          `Phone ${message.phoneIndex + 1}`}
                                      </div>
                                    )}
                                    {formatTimestamp(
                                      message.createdAt ||
                                        message.dateAdded ||
                                        message.timestamp
                                    )}

                                    {/* Message status indicator for sent messages */}
                                    {message.from_me && (
                                      <div className="flex items-center ml-4">
                                        {message.status === "failed" ? (
                                          <div className="flex items-center space-x-2">
                                            <Lucide
                                              icon="XCircle"
                                              className="w-4 h-4 text-red-500"
                                              title={
                                                message.error ||
                                                "Failed to send"
                                              }
                                            />
                                            <button
                                              onClick={() =>
                                                handleRetryMessage(message)
                                              }
                                              className="text-xs text-blue-500 hover:text-blue-700 underline"
                                              title="Retry sending message"
                                            >
                                              Retry
                                            </button>
                                          </div>
                                        ) : message.status === "sent" ? (
                                          <Lucide
                                            icon="Check"
                                            className="w-4 h-4 text-green-500"
                                            title="Message sent"
                                          />
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                </>
              )}
            </div>

            <div className="absolute bottom-0 left-0 w-500px !box m-1 py-1 px-2">
              {replyToMessage && (
                <div className="p-2 mb-2 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      {replyToMessage.from_me
                        ? "Me"
                        : selectedContact?.contactName ||
                          selectedContact?.firstName ||
                          selectedContact?.phone ||
                          replyToMessage.from_name}
                    </div>
                    <div>
                      {replyToMessage.type === "text" &&
                        replyToMessage.text?.body}
                      {replyToMessage.type === "link_preview" &&
                        replyToMessage.link_preview?.body}
                      {replyToMessage.type === "image" && (
                        <img
                          src={replyToMessage.image?.link}
                          alt="Image"
                          style={{ maxWidth: "200px" }}
                        />
                      )}
                      {replyToMessage.type === "video" && (
                        <video
                          controls
                          src={replyToMessage.video?.link}
                          style={{ maxWidth: "200px" }}
                        />
                      )}
                      {replyToMessage.type === "gif" && (
                        <img
                          src={replyToMessage.gif?.link}
                          alt="GIF"
                          style={{ maxWidth: "200px" }}
                        />
                      )}
                      {replyToMessage.type === "audio" && (
                        <audio controls src={replyToMessage.audio?.link} />
                      )}
                      {replyToMessage.type === "voice" && (
                        <audio controls src={replyToMessage.voice?.link} />
                      )}
                      {replyToMessage.type === "document" && (
                        <iframe
                          src={replyToMessage.document?.link}
                          width="100%"
                          height="200px"
                        />
                      )}
                      {replyToMessage.type === "sticker" && (
                        <img
                          src={replyToMessage.sticker?.link}
                          alt="Sticker"
                          style={{ maxWidth: "150px" }}
                        />
                      )}
                      {replyToMessage.type === "location" && (
                        <div className="text-gray-800 dark:text-gray-200">
                          Location: {replyToMessage.location?.latitude},{" "}
                          {replyToMessage.location?.longitude}
                        </div>
                      )}
                      {replyToMessage.type === "poll" && (
                        <div className="text-gray-800 dark:text-gray-200">
                          Poll: {replyToMessage.poll?.title}
                        </div>
                      )}
                      {replyToMessage.type === "hsm" && (
                        <div className="text-gray-800 dark:text-gray-200">
                          HSM: {replyToMessage.hsm?.title}
                        </div>
                      )}
                      {replyToMessage.type === "call_log" && (
                        <div className="text-gray-800 dark:text-gray-200">
                          Call Logs: {replyToMessage.call_log?.title}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setReplyToMessage(null)}>
                    <Lucide
                      icon="X"
                      className="w-5 h-5 text-gray-800 dark:text-gray-200"
                    />
                  </button>
                </div>
              )}
              <div className="flex mb-1">
                <button
                  className={`px-4 py-2 mr-1 rounded-lg ${
                    messageMode === "reply" ||
                    messageMode === `phone${selectedContact?.phoneIndex + 1}`
                      ? "bg-primary text-white"
                      : "bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                  onClick={() => {
                    const phoneIndex = selectedContact?.phoneIndex || 0;
                    setMessageMode(`phone${phoneIndex + 1}`);
                  }}
                >
                  Reply
                </button>
                <button
                  className={`px-4 py-2 rounded-lg ${
                    messageMode === "privateNote"
                      ? "bg-yellow-600 text-white"
                      : "bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                  onClick={() => setMessageMode("privateNote")}
                >
                  Private Note
                </button>
              </div>
              {isPrivateNotesMentionOpen && messageMode === "privateNote" && (
                <div className="absolute bottom-full left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto mb-1">
                  {employeeList.map((employee) => (
                    <div
                      key={employee.id}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-200"
                      onClick={() => handlePrivateNoteMentionSelect(employee)}
                    >
                      {employee.name}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center w-full bg-white dark:bg-gray-800 pl-1 pr-1 rounded-md">
                <button
                  className="p-1 m-0 !box"
                  onClick={() => setEmojiPickerOpen(!isEmojiPickerOpen)}
                >
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide
                      icon="Smile"
                      className="w-5 h-5 text-gray-800 dark:text-gray-200"
                    />
                  </span>
                </button>
                <Menu as="div" className="relative inline-block text-left p-1">
                  <div className="flex items-center space-x-1.5">
                    <Menu.Button
                      as={Button}
                      className="p-1 !box m-0"
                      onClick={handleTagClick}
                    >
                      <span className="flex items-center justify-center w-5 h-5">
                        <Lucide
                          icon="Paperclip"
                          className="w-5 h-5 text-gray-800 dark:text-gray-200"
                        />
                      </span>
                    </Menu.Button>
                  </div>
                  <Menu.Items className="absolute left-0 bottom-full mb-1 w-20 bg-white dark:bg-gray-800 shadow-md rounded-md p-1 z-10 max-h-30 overflow-y-auto">
                    <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <label
                        htmlFor="imageUpload"
                        className="flex items-center cursor-pointer text-gray-800 dark:text-gray-200 w-full"
                      >
                        <Lucide icon="Image" className="w-5 h-5 mr-2" />
                        Image
                        <input
                          type="file"
                          id="imageUpload"
                          accept="image/*"
                          multiple // Add this attribute
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              const imageUrls = Array.from(files).map((file) =>
                                URL.createObjectURL(file)
                              );
                              setPastedImageUrl(imageUrls); // Update state type to handle array
                              setImageModalOpen2(true);
                            }
                          }}
                        />
                      </label>
                    </button>
                    <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <label
                        htmlFor="videoUpload"
                        className="flex items-center cursor-pointer text-gray-800 dark:text-gray-200 w-full"
                      >
                        <Lucide icon="Video" className="w-4 h-4 mr-2" />
                        Video
                        <input
                          type="file"
                          id="videoUpload"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedVideo(file);
                              setVideoModalOpen(true);
                            }
                          }}
                        />
                      </label>
                    </button>
                    <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                      <label
                        htmlFor="documentUpload"
                        className="flex items-center cursor-pointer text-gray-800 dark:text-gray-200 w-full"
                      >
                        <Lucide icon="File" className="w-5 h-5 mr-2" />
                        Document
                        <input
                          type="file"
                          id="documentUpload"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedDocument(file);
                              setDocumentModalOpen(true);
                            }
                          }}
                        />
                      </label>
                    </button>
                  </Menu.Items>
                </Menu>
                <button
                  className="p-2 m-0 !box ml-2"
                  onClick={toggleRecordingPopup}
                >
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide
                      icon="Mic"
                      className="w-5 h-5 text-gray-800 dark:text-gray-200"
                    />
                  </span>
                </button>

                {isRecordingPopupOpen && (
                  <div className="absolute bottom-full mb-1 left-0 w-32 bg-white dark:bg-gray-800 rounded-md shadow-md p-2">
                    <div className="flex items-center mb-1">
                      <button
                        className={`p-1 rounded-md ${
                          isRecording
                            ? "bg-red-500 text-white"
                            : "bg-primary text-white"
                        }`}
                        onClick={toggleRecording}
                      >
                        <Lucide
                          icon={isRecording ? "StopCircle" : "Mic"}
                          className="w-2.5 h-2.5"
                        />
                      </button>
                      <ReactMicComponent
                        record={isRecording}
                        className="w-22 rounded-md h-5 mr-1 ml-1"
                        onStop={onStop}
                        strokeColor="#0000CD"
                        backgroundColor="#FFFFFF"
                        mimeType="audio/webm"
                      />
                    </div>
                    <div className="flex flex-col space-y-1">
                      {audioBlob && (
                        <>
                          <audio
                            src={URL.createObjectURL(audioBlob)}
                            controls
                            className="w-full h-5 mb-1"
                          />
                          <div className="flex justify-between">
                            <button
                              className="px-1.5 py-0.5 rounded bg-gray-500 text-white text-xs"
                              onClick={() => setAudioBlob(null)}
                            >
                              Remove
                            </button>
                            <button
                              className="px-1.5 py-0.5 rounded bg-green-700 text-white text-xs"
                              onClick={sendVoiceMessage}
                            >
                              Send
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {userData?.company === "Juta Software" && (
                  <button
                    className="p-2 m-0 !box ml-2"
                    onClick={handleGenerateAIResponse}
                    disabled={isGeneratingResponse}
                  >
                    <span className="flex items-center justify-center w-5 h-5">
                      {isGeneratingResponse ? (
                        <Lucide
                          icon="Loader"
                          className="w-5 h-5 text-gray-800 dark:text-gray-200 animate-spin"
                        />
                      ) : (
                        <Lucide
                          icon="Sparkles"
                          className="w-5 h-5 text-gray-800 dark:text-gray-200"
                        />
                      )}
                    </span>
                  </button>
                )}
                <textarea
                  ref={textareaRef}
                  className={`flex-grow h-8 px-1 py-1 m-0.5 ml-1 border rounded-md focus:outline-none focus:border-info text-sm resize-none overflow-hidden ${"bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400"} border-gray-300 dark:border-gray-700`}
                  placeholder={
                    messageMode === "privateNote"
                      ? "Type a private note..."
                      : "Type a message..."
                  }
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    adjustHeight(e.target);
                    const lastAtSymbolIndex = e.target.value.lastIndexOf("@");
                    if (
                      lastAtSymbolIndex !== -1 &&
                      lastAtSymbolIndex === e.target.value.length - 1
                    ) {
                      setIsPrivateNotesMentionOpen(true);
                    } else {
                      setIsPrivateNotesMentionOpen(false);
                    }
                    if (e.target.value === "\\") {
                      handleQR();
                      setNewMessage("");
                    }
                    // Update this condition for quick reply search
                    if (e.target.value.startsWith("/")) {
                      setIsQuickRepliesOpen(true);
                      setQuickReplyFilter(e.target.value.slice(1));
                    } else {
                      setIsQuickRepliesOpen(false);
                      setQuickReplyFilter("");
                    }
                  }}
                  rows={1}
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  onKeyDown={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    const handleKeyDown = (
                      e: React.KeyboardEvent<HTMLTextAreaElement>
                    ) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      } else if (e.key === "Enter") {
                        if (e.shiftKey) {
                          e.preventDefault();
                          setNewMessage((prev) => prev + "\n");
                        } else {
                          e.preventDefault();
                          if (selectedIcon === "ws") {
                            if (messageMode !== "privateNote") {
                              handleSendMessage();
                            } else {
                              handleAddPrivateNote(newMessage);
                            }
                          }
                          setNewMessage("");
                          adjustHeight(target, true); // Reset height after sending message
                        }
                      }
                    };
                    handleKeyDown(e);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const items = e.clipboardData?.items;
                    if (items) {
                      for (const item of items) {
                        const blob = item.getAsFile();
                        if (blob) {
                          const fileType = getFileTypeFromMimeType(item.type);
                          if (fileType === "Unknown") {
                            console.warn("Unsupported file type:", item.type);
                            continue;
                          }

                          const url = URL.createObjectURL(blob);
                          if (
                            ["JPEG", "PNG", "GIF", "WebP", "SVG"].includes(
                              fileType
                            )
                          ) {
                            setPastedImageUrl(url);
                            setImageModalOpen2(true);
                          } else {
                            setSelectedDocument(blob);
                            setDocumentModalOpen(true);
                          }
                          return;
                        }
                      }
                    }
                    const text = e.clipboardData?.getData("text");
                    if (text) {
                      setNewMessage((prev) => prev + text);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const file = files[0];
                      const fileType = getFileTypeFromMimeType(file.type);
                      if (fileType === "Unknown") {
                        console.warn("Unsupported file type:", file.type);
                        return;
                      }

                      const url = URL.createObjectURL(file);
                      if (
                        ["JPEG", "PNG", "GIF", "WebP", "SVG"].includes(fileType)
                      ) {
                        setPastedImageUrl(url);
                        setImageModalOpen2(true);
                      } else {
                        setSelectedDocument(file);
                        setDocumentModalOpen(true);
                      }
                    }
                  }}
                  disabled={userRole === "3"}
                />
                {isQuickRepliesOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-[95%] max-w-6xl max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
                      {/* Header */}
                      <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Lucide
                              icon="MessageSquare"
                              className="w-6 h-6 text-primary"
                            />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                              Quick Replies
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Select a quick reply to send
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsQuickRepliesOpen(false)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Close (ESC)"
                        >
                          <Lucide
                            icon="X"
                            className="w-6 h-6 text-gray-500 dark:text-gray-400"
                          />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {/* Tabs */}
                        <div className="flex space-x-4 mb-4">
                          <button
                            className={`px-4 py-2 rounded-lg ${
                              activeQuickReplyTab === "all"
                                ? "bg-primary text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}
                            onClick={() => setActiveQuickReplyTab("all")}
                          >
                            All
                          </button>
                          <button
                            className={`px-4 py-2 rounded-lg ${
                              activeQuickReplyTab === "self"
                                ? "bg-primary text-white"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            }`}
                            onClick={() => setActiveQuickReplyTab("self")}
                          >
                            Personal
                          </button>
                        </div>

                        {/* Search and Filter */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex space-x-4">
                            <select
                              value={quickReplyCategory}
                              onChange={(e) =>
                                setQuickReplyCategory(e.target.value)
                              }
                              className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                              <option value="all">All Categories</option>
                              {categories
                                .filter((cat) => cat !== "all")
                                .map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                            </select>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search quick replies..."
                                value={quickReplyFilter}
                                onChange={(e) =>
                                  setQuickReplyFilter(e.target.value)
                                }
                                className="pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              />
                              <Lucide
                                icon="Search"
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick Replies List */}
                        <div
                          className="overflow-y-auto"
                          style={{ maxHeight: "calc(90vh - 200px)" }}
                        >
                          {quickReplies
                            .filter(
                              (reply) =>
                                activeQuickReplyTab === "all" ||
                                reply.type === "self"
                            )
                            .filter(
                              (reply) =>
                                quickReplyCategory === "all" ||
                                reply.category === quickReplyCategory
                            )
                            .filter(
                              (reply) =>
                                (reply.keyword ?? "")
                                  .toLowerCase()
                                  .includes(quickReplyFilter.toLowerCase()) ||
                                (reply.text ?? "")
                                  .toLowerCase()
                                  .includes(quickReplyFilter.toLowerCase())
                            )
                            .sort((a, b) =>
                              (a.keyword ?? "").localeCompare(b.keyword ?? "")
                            )
                            .map((reply) => (
                              <div
                                key={reply.id}
                                className="flex items-center justify-between mb-2 bg-white dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-200"
                                onClick={() => {
                                  if (editingReply?.id !== reply.id) {
                                    // Handle videos first
                                    if (reply.videos?.length) {
                                      reply.videos.forEach((video) => {
                                        fetch(video.url)
                                          .then((response) => response.blob())
                                          .then((blob) => {
                                            const videoFile = new File(
                                              [blob],
                                              video.name,
                                              {
                                                type: video.type,
                                                lastModified:
                                                  video.lastModified,
                                              }
                                            );
                                            setSelectedVideo(videoFile);
                                            setVideoModalOpen(true);
                                            setDocumentCaption(
                                              reply.text || ""
                                            );
                                          })
                                          .catch((error) => {
                                            console.error(
                                              "Error handling video:",
                                              error
                                            );
                                            toast.error("Failed to load video");
                                          });
                                      });
                                    }
                                    // Handle images
                                    else if (reply.images?.length) {
                                      setPastedImageUrl(reply.images);
                                      setDocumentCaption(reply.text || "");
                                      setImageModalOpen2(true);
                                    }
                                    // Handle documents
                                    else if (reply.documents?.length) {
                                      reply.documents.forEach((doc) => {
                                        fetch(doc.url)
                                          .then((response) => response.blob())
                                          .then((blob) => {
                                            const documentFile = new File(
                                              [blob],
                                              doc.name,
                                              {
                                                type: doc.type,
                                                lastModified: doc.lastModified,
                                              }
                                            );
                                            setSelectedDocument(documentFile);
                                            setDocumentModalOpen(true);
                                            setDocumentCaption(
                                              reply.text || ""
                                            );
                                          })
                                          .catch((error) => {
                                            console.error(
                                              "Error handling document:",
                                              error
                                            );
                                            toast.error(
                                              "Failed to load document"
                                            );
                                          });
                                      });
                                    }
                                    // Handle text-only replies
                                    else if (
                                      !reply.images?.length &&
                                      !reply.documents?.length &&
                                      !reply.videos?.length
                                    ) {
                                      setNewMessage(reply.text);
                                    }
                                    setIsQuickRepliesOpen(false);
                                  }
                                }}
                              >
                                {editingReply?.id === reply.id ? (
                                  <div className="flex items-center w-full space-x-4">
                                    <input
                                      className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                      value={editingReply.keyword}
                                      onChange={(e) =>
                                        setEditingReply({
                                          ...editingReply,
                                          keyword: e.target.value,
                                        })
                                      }
                                      placeholder="Keyword"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <select
                                      className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                      value={editingReply.category || ""}
                                      onChange={(e) =>
                                        setEditingReply({
                                          ...editingReply,
                                          category: e.target.value,
                                        })
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="">Select Category</option>
                                      {categories
                                        .filter((cat: string) => cat !== "all")
                                        .map((category) => (
                                          <option
                                            key={category}
                                            value={category}
                                          >
                                            {category}
                                          </option>
                                        ))}
                                    </select>
                                    <textarea
                                      className="flex-grow px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                      value={editingReply.text || ""}
                                      onChange={(e) =>
                                        setEditingReply({
                                          ...editingReply,
                                          text: e.target.value,
                                        })
                                      }
                                      placeholder="Message text (optional)"
                                      rows={1}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateQuickReply(
                                            reply.id,
                                            editingReply.keyword ?? "",
                                            editingReply.text || "",
                                            editingReply.type as "all" | "self"
                                          );
                                        }}
                                      >
                                        <Lucide
                                          icon="Save"
                                          className="w-5 h-5"
                                        />
                                      </button>
                                      <button
                                        className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingReply(null);
                                        }}
                                      >
                                        <Lucide icon="X" className="w-5 h-5" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex flex-col flex-grow">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                          {reply.keyword}
                                        </span>
                                        {reply.category && (
                                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                                            {reply.category}
                                          </span>
                                        )}
                                      </div>
                                      {reply.text && (
                                        <span
                                          className="px-2 py-1 text-gray-800 dark:text-gray-200"
                                          style={{
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          {reply.text}
                                        </span>
                                      )}
                                      <div className="grid grid-cols-2 gap-2 mt-2">
                                        {reply.documents &&
                                          reply.documents.length > 0 &&
                                          reply.documents.map((doc, index) => (
                                            <div
                                              key={index}
                                              className="relative group"
                                            >
                                              <a
                                                href={doc.url}
                                                target="_blank"
                                                className="p-2 bg-gray-100 dark:bg-gray-600 rounded-md flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-500"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <Lucide
                                                  icon="File"
                                                  className="w-4 h-4"
                                                />
                                                <span className="text-sm truncate">
                                                  {doc.name}
                                                </span>
                                              </a>
                                            </div>
                                          ))}
                                        {(reply.images?.length ?? 0) > 0 &&
                                          (reply.images as string[]).map(
                                            (img, index) => (
                                              <div
                                                key={index}
                                                className="relative group"
                                              >
                                                <img
                                                  src={img}
                                                  alt={`Preview ${index + 1}`}
                                                  className="w-16 h-16 object-cover rounded-md hover:opacity-90 transition-opacity"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                />
                                              </div>
                                            )
                                          )}
                                        {reply.videos &&
                                          reply.videos.length > 0 &&
                                          reply.videos.map((video, index) => (
                                            <div
                                              key={`video-${index}`}
                                              className="relative group"
                                            >
                                              <div
                                                className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-md flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                {video.thumbnail ? (
                                                  <img
                                                    src={video.thumbnail}
                                                    alt={`Video ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-md"
                                                  />
                                                ) : (
                                                  <Lucide
                                                    icon="Video"
                                                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                                                  />
                                                )}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                  <div className="bg-black/60 rounded-full p-1">
                                                    <Lucide
                                                      icon="Play"
                                                      className="w-3 h-3 text-white"
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                      <button
                                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingReply(reply);
                                        }}
                                      >
                                        <Lucide
                                          icon="PencilLine"
                                          className="w-5 h-5"
                                        />
                                      </button>
                                      <button
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteQuickReply(
                                            reply.id,
                                            reply.type as "all" | "self"
                                          );
                                        }}
                                      >
                                        <Lucide
                                          icon="Trash"
                                          className="w-5 h-5"
                                        />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {isEmojiPickerOpen && (
                <div className="absolute bottom-20 left-2 z-10">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-col w-full h-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 items-center justify-center">
            <div className="flex flex-col items-center justify-center p-9 rounded-xl shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 mb-4 overflow-hidden rounded-xl shadow-lg">
                <img
                  src={logoImage}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mb-3">
                Welcome to Chat
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg text-center mb-6 max-w-sm leading-relaxed">
                Select a contact from the list to start messaging, or create a
                new conversation to get started.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={openNewChatModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <div className="flex items-center space-x-2">
                    <Lucide icon="Plus" className="w-4 h-4" />
                    <span>Start New Chat</span>
                  </div>
                </button>
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg transition-all duration-200 border border-gray-300 dark:border-gray-600"
                >
                  <div className="flex items-center space-x-2">
                    <Lucide icon="Search" className="w-4 h-4" />
                    <span>Search Contacts</span>
                  </div>
                </button>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Quick Tips:
                </p>
                <div className="flex flex-col sm:flex-row gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Click on any contact to start chatting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Use search to find specific contacts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Create new conversations anytime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedMessages.length > 0 && (
        <div className="fixed bottom-16 right-2 md:right-10 space-y-2 md:space-y-0 md:space-x-4 flex flex-col md:flex-row">
          <button
            className="bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
            onClick={() => setIsForwardDialogOpen(true)}
          >
            Forward
          </button>
          <button
            className="bg-red-800 dark:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
            onClick={openDeletePopup}
          >
            Delete
          </button>
          <button
            className="bg-gray-700 dark:bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
            onClick={() => setSelectedMessages([])}
            onKeyDown={handleKeyDown}
          >
            Cancel
          </button>
        </div>
      )}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Start New Chat
            </h2>
            <div className="mb-4">
              <label
                htmlFor="newContactNumber"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Enter contact number (include country code)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600 dark:text-gray-400">
                  +
                </span>
                <input
                  type="text"
                  id="newContactNumber"
                  value={newContactNumber}
                  onChange={(e) => setNewContactNumber(e.target.value)}
                  placeholder="60123456789"
                  className="w-full p-2 pl-6 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeNewChatModal}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewChat}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition duration-200"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
      {isTabOpen && (
        <div className="absolute top-0 right-0 h-full w-full md:w-1/4 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 overflow-y-auto z-50 shadow-lg transition-all duration-300 ease-in-out">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 shadow-lg"></div>

                <div className="flex flex-col">
                  {isEditing ? (
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="font-semibold bg-transparent text-gray-800 dark:text-gray-200 capitalize border-b-2 border-primary dark:border-primary-400 focus:outline-none focus:border-primary-600 dark:focus:border-primary-300 mr-2 px-1 py-0.5 transition-all duration-200"
                        onKeyPress={(e) => e.key === "Enter" && handleSave()}
                      />
                      <button
                        onClick={handleSave}
                        className="p-1 bg-primary hover:bg-primary-600 text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        <Lucide icon="Save" className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="font-semibold text-gray-800 dark:text-gray-200 capitalize cursor-pointer hover:text-primary dark:hover:text-primary-400 transition-colors duration-200 flex items-center group"
                      onClick={() => setIsEditing(true)}
                    >
                      <span>
                        {selectedContact?.contactName ||
                          selectedContact?.firstName ||
                          selectedContact?.phone ||
                          ""}
                      </span>
                      <Lucide
                        icon="PencilLine"
                        className="w-4 h-4 ml-2 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      />
                    </div>
                  )}
                  {userRole === "1" && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedContact.phone}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleEyeClick}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-all duration-200"
              >
                <Lucide
                  icon="X"
                  className="w-6 h-6 text-gray-800 dark:text-gray-200"
                />
              </button>
            </div>
            {/* Enhanced Content Area */}
            <div className="flex-grow overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900">
              {/* Contact Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
                <div className="bg-blue-50 dark:bg-blue-900 px-2 py-1.5 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Contact Information
                    </h3>
                    <div className="flex space-x-1">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setEditedContact({ ...selectedContact });
                            }}
                            className="px-1.5 py-0.5 bg-primary text-white rounded-md hover:bg-primary-dark transition duration-200 text-xs"
                          >
                            Edit
                          </button>

                          <Menu
                            as="div"
                            className="relative inline-block text-left"
                          >
                            <Menu.Button className="px-1.5 py-0.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200 text-xs">
                              Sync
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 mt-1 w-20 bg-white dark:bg-gray-800 shadow-md rounded-md p-1 z-10">
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`w-full text-left px-3 py-1 rounded-md ${
                                      active
                                        ? "bg-blue-100 dark:bg-blue-700"
                                        : ""
                                    }`}
                                    onClick={async () => {
                                      try {
                                        if (!selectedContact.phone) {
                                          toast.error(
                                            "Contact phone number is required for syncing"
                                          );
                                          return;
                                        }
                                        const userEmail =
                                          localStorage.getItem("userEmail");
                                        if (!userEmail) {
                                          toast.error("User not authenticated");
                                          return;
                                        }
                                        // Get user/company info from your backend
                                        const userRes = await fetch(
                                          `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
                                            userEmail
                                          )}`
                                        );
                                        if (!userRes.ok) {
                                          toast.error(
                                            "Failed to fetch user/company data"
                                          );
                                          return;
                                        }
                                        const { userData, companyData } =
                                          await userRes.json();
                                        const companyId = userData.companyId;
                                        const apiUrl =
                                          companyData.apiUrl || baseUrl;
                                        const phoneNumber =
                                          selectedContact.phone.replace(
                                            /\D/g,
                                            ""
                                          );
                                        const response = await fetch(
                                          `${apiUrl}/api/sync-single-contact-name/${companyId}`,
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                            },
                                            body: JSON.stringify({
                                              companyId,
                                              contactPhone: phoneNumber,
                                              phoneIndex:
                                                selectedContact.phoneIndex ?? 0,
                                            }),
                                          }
                                        );
                                        if (response.ok) {
                                          toast.success(
                                            "Contact name synced successfully!"
                                          );
                                        } else {
                                          const errorText =
                                            await response.text();
                                          console.error(
                                            "Sync failed:",
                                            errorText
                                          );
                                          toast.error(
                                            "Failed to sync contact name"
                                          );
                                        }
                                      } catch (error) {
                                        console.error(
                                          "Error syncing contact:",
                                          error
                                        );
                                        toast.error(
                                          "An error occurred while syncing contact name"
                                        );
                                      }
                                    }}
                                  >
                                    Sync Name
                                  </button>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    className={`w-full text-left px-3 py-1 rounded-md ${
                                      active
                                        ? "bg-blue-100 dark:bg-blue-700"
                                        : ""
                                    }`}
                                    onClick={async () => {
                                      try {
                                        if (!selectedContact.phone) {
                                          toast.error(
                                            "Contact phone number is required for sync"
                                          );
                                          return;
                                        }
                                        const userEmail =
                                          localStorage.getItem("userEmail");
                                        if (!userEmail) {
                                          toast.error("User not authenticated");
                                          return;
                                        }
                                        // Get user/company info from your backend
                                        const userRes = await fetch(
                                          `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
                                            userEmail
                                          )}`
                                        );
                                        if (!userRes.ok) {
                                          toast.error(
                                            "Failed to fetch user/company data"
                                          );
                                          return;
                                        }
                                        const { userData, companyData } =
                                          await userRes.json();
                                        const companyId = userData.companyId;
                                        const apiUrl =
                                          companyData.apiUrl || baseUrl;
                                        const phoneNumber =
                                          selectedContact.phone.replace(
                                            /\D/g,
                                            ""
                                          );
                                        const response = await fetch(
                                          `${apiUrl}/api/sync-single-contact/${companyId}`,
                                          {
                                            method: "POST",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                            },
                                            body: JSON.stringify({
                                              companyId,
                                              contactPhone: phoneNumber,
                                              phoneIndex:
                                                selectedContact.phoneIndex ?? 0,
                                            }),
                                          }
                                        );
                                        if (response.ok) {
                                          toast.success(
                                            "Contact messages synced successfully!"
                                          );
                                        } else {
                                          const errorText =
                                            await response.text();
                                          console.error(
                                            "Sync failed:",
                                            errorText
                                          );
                                          toast.error(
                                            "Failed to sync contact messages"
                                          );
                                        }
                                      } catch (error) {
                                        console.error(
                                          "Error syncing contact:",
                                          error
                                        );
                                        toast.error(
                                          "An error occurred while syncing contact messages"
                                        );
                                      }
                                    }}
                                  >
                                    Sync Messages
                                  </button>
                                )}
                              </Menu.Item>
                            </Menu.Items>
                          </Menu>
                          {/* Updated Delete Button */}
                          <button
                            onClick={handleDeleteContact}
                            disabled={deleteLoading}
                            className={`px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200 flex items-center space-x-1 ${
                              deleteLoading
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {deleteLoading ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
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
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <span>Delete</span>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveContact}
                            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-200"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditedContact(null);
                            }}
                            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* Phone Index Selector */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Active Phone:
                      </p>
                      <button
                        onClick={async () => {
                          if (companyId) {
                            try {
                              const botStatusResponse = await axios.get(
                                `${baseUrl}/api/bot-status/${companyId}`
                              );
                              if (botStatusResponse.status === 200) {
                                const data: BotStatusResponse = botStatusResponse.data;
                                if (data.phones && Array.isArray(data.phones)) {
                                  const qrCodesData: QRCodeData[] = data.phones.map((phone: any) => ({
                                    phoneIndex: phone.phoneIndex,
                                    status: phone.status,
                                    qrCode: phone.qrCode,
                                  }));
                                  setQrCodes(qrCodesData);
                                  toast.success("Phone status refreshed!");
                                } else if (data.phoneCount === 1 && data.phoneInfo) {
                                  setQrCodes([{
                                    phoneIndex: 0,
                                    status: data.status,
                                    qrCode: data.qrCode,
                                  }]);
                                  toast.success("Phone status refreshed!");
                                }
                              }
                            } catch (error) {
                              console.error("Error refreshing phone status:", error);
                              toast.error("Failed to refresh phone status");
                            }
                          }
                        }}
                        className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                        title="Refresh phone connection status"
                      >
                        <span className="mr-1">🔄</span>
                        Refresh Status
                      </button>
                      <button
                        onClick={async () => {
                          if (companyId) {
                            try {
                              const botStatusResponse = await axios.get(
                                `${baseUrl}/api/bot-status/${companyId}`
                              );
                              if (botStatusResponse.status === 200) {
                                const data: BotStatusResponse = botStatusResponse.data;
                                if (data.phones && Array.isArray(data.phones)) {
                                  const qrCodesData: QRCodeData[] = data.phones.map((phone: any) => ({
                                    phoneIndex: phone.phoneIndex,
                                    status: phone.status,
                                    qrCode: phone.qrCode,
                                  }));
                                  setQrCodes(qrCodesData);
                                  toast.success("Phone status refreshed!");
                                } else if (data.phoneCount === 1 && data.phoneInfo) {
                                  setQrCodes([{
                                    phoneIndex: 0,
                                    status: data.status,
                                    qrCode: data.qrCode,
                                  }]);
                                  toast.success("Phone status refreshed!");
                                }
                              }
                            } catch (error) {
                              console.error("Error refreshing phone status:", error);
                              toast.error("Failed to refresh phone status");
                            }
                          }
                        }}
                        className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
                        title="Refresh phone connection status"
                      >
                        <span className="mr-1">🔄</span>
                        Refresh Status
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Status indicators: ✅ Connected • ❌ Not Connected • ⏳ Checking
                    </div>
                    <select
                      value={selectedContact.phoneIndex ?? 0}
                      onChange={async (e) => {
                        const newPhoneIndex = parseInt(e.target.value);
                        // Update local contact state
                        setSelectedContact({
                          ...selectedContact,
                          phoneIndex: newPhoneIndex,
                        });
                        // Update the global phone selection which triggers message filtering
                        await handlePhoneChange(newPhoneIndex);
                        toast.info(
                          `Phone updated to ${phoneNames[newPhoneIndex]}`
                        );
                      }}
                      className="px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-4 w-32"
                    >
                      {Object.entries(phoneNames).map(([index, name]) => {
                        const phoneIndex = parseInt(index);
                        const qrCode = qrCodes[phoneIndex];
                        const isConnected = qrCode && ["ready", "authenticated"].includes(qrCode.status?.toLowerCase());
                        
                        // Debug logging for phone status in dropdown
                        console.log(`Phone ${phoneIndex} dropdown status debug:`, {
                          phoneIndex,
                          qrCode,
                          status: qrCode?.status,
                          statusLower: qrCode?.status?.toLowerCase(),
                          isConnected,
                          validStatuses: ["ready", "authenticated"],
                          qrCodesLength: qrCodes.length,
                          statusComparison: qrCode ? {
                            statusExists: !!qrCode.status,
                            statusType: typeof qrCode.status,
                            statusValue: qrCode.status,
                            readyCheck: qrCode.status === "ready",
                            authenticatedCheck: qrCode.status === "authenticated",
                            readyLowerCheck: qrCode.status?.toLowerCase() === "ready",
                            authenticatedLowerCheck: qrCode.status?.toLowerCase() === "authenticated"
                          } : "No qrCode"
                        });
                        
                        // Show loading state when status is not yet available
                        if (!qrCode && qrCodes.length === 0) {
                          return (
                            <option key={index} value={index}>
                              {`${name} - ⏳ Checking...`}
                            </option>
                          );
                        }
                        
                        const statusIcon = isConnected ? '✅' : '❌';
                        const statusText = isConnected ? 'Connected' : 'Not Connected';
                        
                        return (
                          <option key={index} value={index}>
                            {`${name} - ${statusIcon} ${statusText}`}
                          </option>
                        );
                      })}
                    </select>
                    
                    {/* Phone Connection Status Indicator */}
                    {selectedContact.phoneIndex !== null && phoneNames[selectedContact.phoneIndex ?? 0] && (
                      <div className="mt-2">
                        {(() => {
                          const currentPhoneIndex = selectedContact.phoneIndex ?? 0;
                          const qrCode = qrCodes[currentPhoneIndex];
                          const isConnected = qrCode && ["ready", "authenticated"].includes(qrCode.status?.toLowerCase());
                          
                          // Debug logging
                          console.log("Phone status debug:", {
                            currentPhoneIndex,
                            qrCode,
                            qrCodes,
                            isConnected,
                            phoneNames: phoneNames[currentPhoneIndex]
                          });
                          
                          // Show loading state when status is not yet available
                          if (!qrCode && qrCodes.length === 0) {
                            return (
                              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                                <span className="mr-1">⏳</span>
                                Checking connection...
                              </div>
                            );
                          }
                          
                          return (
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isConnected 
                                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200" 
                                : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
                            }`}>
                              <span className="mr-1">
                                {isConnected ? '✅' : '❌'}
                              </span>
                              {isConnected ? 'Connected' : 'Not Connected'}
                              {qrCode && !isConnected && ` (${qrCode.status})`}
                              {!qrCode && ` (Status not available)`}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* Warning when no phones are connected */}
                    {Object.keys(phoneNames).length > 0 && !Object.values(qrCodes).some(qr => qr && ["ready", "authenticated"].includes(qr.status?.toLowerCase())) && (
                      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
                        ⚠️ No phones are currently connected. Please ensure your WhatsApp bot is running and connected before sending messages.
                      </div>
                    )}
                    
                    {/* Debug Panel - Remove this in production */}
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
                      <div className="font-semibold mb-2">Debug Info:</div>
                      <div>Company ID: {companyId || 'Not set'}</div>
                      <div>Phone Names: {JSON.stringify(phoneNames)}</div>
                      <div>QR Codes: {JSON.stringify(qrCodes)}</div>
                      <div>Selected Phone Index: {selectedContact.phoneIndex ?? 'Not set'}</div>
                      <div>Phone Names Count: {Object.keys(phoneNames).length}</div>
                      <div>QR Codes Count: {qrCodes.length}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "First Name", key: "contactName" },
                      { label: "Last Name", key: "lastName" },
                      { label: "Email", key: "email" },
                      { label: "Phone", key: "phone" },
                      { label: "Company", key: "companyName" },
                      { label: "Address", key: "address1" },
                      { label: "Website", key: "website" },
                      ...(userData?.companyId === "095"
                        ? [
                            { label: "Country", key: "country" },
                            { label: "Nationality", key: "nationality" },
                            {
                              label: "Highest Education",
                              key: "highestEducation",
                            },
                            {
                              label: "Program of Study",
                              key: "programOfStudy",
                            },
                            {
                              label: "Intake Preference",
                              key: "intakePreference",
                            },
                            {
                              label: "English Proficiency",
                              key: "englishProficiency",
                            },
                            { label: "Passport Validity", key: "passport" },
                          ]
                        : []),
                      ...(["079", "001"].includes(userData?.companyId ?? "")
                        ? [
                            { label: "IC", key: "ic" },
                            { label: "Points", key: "points" },
                            { label: "Branch", key: "branch" },
                            { label: "Expiry Date", key: "expiryDate" },
                            { label: "Vehicle Number", key: "vehicleNumber" },
                          ]
                        : []),
                      ...(userData?.companyId === "001"
                        ? [
                            { label: "Assistant ID", key: "assistantId" },
                            { label: "Thread ID", key: "threadid" },
                          ]
                        : []),
                      ...(selectedContact.customFields
                        ? Object.entries(selectedContact.customFields).map(
                            ([key, value]) => ({
                              label: key,
                              key: `customFields.${key}`,
                              isCustom: true,
                            })
                          )
                        : []),
                    ].map((item, index) => (
                      <div key={index} className="col-span-1">
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                          {item.label}
                        </p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={
                              editedContact?.[item.key as keyof Contact] || ""
                            }
                            onChange={(e) =>
                              setEditedContact({
                                ...editedContact,
                                [item.key]: e.target.value,
                              } as Contact)
                            }
                            className="w-full mt-1 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                        ) : (
                          <p className="text-gray-800 dark:text-gray-200">
                            {selectedContact[item.key as keyof Contact] ||
                              "N/A"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Enhanced Employee Assignment Section */}
                  {selectedContact.tags.some((tag: string) =>
                    employeeList.some(
                      (employee) =>
                        (employee.name?.toLowerCase() || "") ===
                        (typeof tag === "string"
                          ? tag
                          : String(tag)
                        ).toLowerCase()
                    )
                  ) && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-6 border border-green-200 dark:border-green-700 mb-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <Lucide icon="Users" className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-bold text-lg text-green-800 dark:text-green-200">
                          Assigned Employees
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedContact.tags
                          ?.filter((tag: string) =>
                            employeeList.some(
                              (employee) =>
                                (employee.name?.toLowerCase() || "") ===
                                (typeof tag === "string"
                                  ? tag
                                  : String(tag)
                                ).toLowerCase()
                            )
                          )
                          .map((employeeTag: string, index: number) => (
                            <div
                              key={index}
                              className="inline-flex items-center bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 text-sm font-semibold px-4 py-2 rounded-full border-2 border-green-300 dark:border-green-600 shadow-sm hover:shadow-md transition-all duration-200 group"
                            >
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              <span>{employeeTag}</span>
                              <button
                                className="ml-3 p-1 rounded-full hover:bg-green-200 dark:hover:bg-green-700 transition-colors duration-200 focus:outline-none"
                                onClick={() =>
                                  handleRemoveTag(
                                    selectedContact.contact_id,
                                    employeeTag
                                  )
                                }
                              >
                                <Lucide
                                  icon="X"
                                  className="w-4 h-4 text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100"
                                />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Enhanced Tags Section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-shadow duration-300">
                <div className="bg-indigo-50 dark:bg-indigo-900 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Tags
                  </h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedContact &&
                    selectedContact.tags &&
                    selectedContact.tags.length > 0 ? (
                      <>
                        {selectedContact.tags
                          .filter(
                            (tag: string) =>
                              (typeof tag === "string"
                                ? tag
                                : String(tag)
                              ).toLowerCase() !== "stop bot" &&
                              !employeeList.some(
                                (employee) =>
                                  (employee.name?.toLowerCase() || "") ===
                                  (typeof tag === "string"
                                    ? tag
                                    : String(tag)
                                  ).toLowerCase()
                              )
                          )
                          .map((tag: string, index: number) => (
                            <div
                              key={index}
                              className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-sm font-semibold px-3 py-1 rounded-full border border-blue-400 dark:border-blue-600"
                            >
                              <span>{tag}</span>
                              <button
                                className="ml-2 focus:outline-none"
                                onClick={() =>
                                  handleRemoveTag(
                                    selectedContact.contact_id,
                                    tag
                                  )
                                }
                              >
                                <Lucide
                                  icon="X"
                                  className="w-4 h-4 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                                />
                              </button>
                            </div>
                          ))}
                      </>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        No tags assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden">
                <div className="bg-yellow-50 dark:bg-yellow-900 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Scheduled Messages
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {scheduledMessages.length} scheduled
                  </span>
                </div>
                <div className="p-4">
                  {scheduledMessages.length > 0 ? (
                    <div className="overflow-x-auto">
                      <div
                        className="flex gap-4 pb-2"
                        style={{ minWidth: "min-content" }}
                      >
                        {scheduledMessages.map((message) => (
                          <div
                            key={message.id}
                            className="flex-none w-[320px] bg-gradient-to-br from-yellow-50/80 dark:from-yellow-900/40 to-white dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow hover:shadow-lg transition-shadow duration-200"
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  {new Date(
                                    message.scheduledTime
                                  ).toLocaleString()}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    message.status === "scheduled"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                                      : message.status === "sent"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                      : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                  }`}
                                >
                                  {message.status
                                    ? message.status.charAt(0).toUpperCase() +
                                      message.status.slice(1)
                                    : "Scheduled"}
                                </span>
                              </div>
                              <div className="flex-1 mb-2">
                                <p className="text-gray-800 dark:text-gray-200 break-words whitespace-pre-line text-sm">
                                  {message.messageContent}
                                </p>
                                {message.mediaUrl && (
                                  <div className="mt-2">
                                    {message.mediaUrl.match(
                                      /\.(jpg|jpeg|png|gif)$/i
                                    ) ? (
                                      <img
                                        src={message.mediaUrl}
                                        alt="Scheduled Media"
                                        className="w-full h-32 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                                      />
                                    ) : message.mediaUrl.match(
                                        /\.(mp4|webm|ogg)$/i
                                      ) ? (
                                      <video
                                        src={message.mediaUrl}
                                        controls
                                        className="w-full h-32 object-cover rounded-md border border-gray-200 dark:border-gray-700"
                                      />
                                    ) : null}
                                  </div>
                                )}
                                {message.documentUrl && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Lucide
                                      icon="FileText"
                                      className="w-4 h-4 text-gray-500"
                                    />
                                    <a
                                      href={message.documentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 dark:text-blue-300 underline break-all"
                                    >
                                      {message.fileName || "Document"}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleSendNow(message)}
                                  className="flex-1 px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition duration-200 font-medium"
                                  title="Send this message now"
                                >
                                  Send Now
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditScheduledMessage(message);
                                    setEditScheduledMessageModal(true);
                                  }}
                                  className="flex-1 px-3 py-1 bg-primary text-white text-xs rounded-md hover:bg-primary-dark transition duration-200 font-medium"
                                  title="Edit scheduled message"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteScheduledMessage(message.id!)
                                  }
                                  className="flex-1 px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 transition duration-200 font-medium"
                                  title="Delete scheduled message"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Lucide
                        icon="Clock"
                        className="w-10 h-10 text-yellow-400 mb-2"
                      />
                      <p className="text-gray-500 dark:text-gray-400 text-center">
                        No scheduled messages for this contact.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Add the new Notes section */}
              <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden ">
                <div className="bg-yellow-50 dark:bg-yellow-900 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    Notes
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setEditedContact({ ...selectedContact });
                      }}
                      className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dark transition duration-200"
                    >
                      Edit Notes
                    </button>
                  )}
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <textarea
                      value={editedContact?.notes || ""}
                      onChange={(e) =>
                        setEditedContact({
                          ...editedContact,
                          notes: e.target.value,
                        } as Contact)
                      }
                      className="w-full h-32 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Add notes about this contact..."
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                      {selectedContact.notes || "No notes added yet."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isMessageSearchOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => {
            setIsMessageSearchOpen(false);
            setMessageSearchQuery("");
          }}
        >
          <div
            className="absolute top-16 right-0 w-full md:w-1/3 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 p-4 shadow-lg z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={messageSearchInputRef}
              type="text"
              placeholder="Search messages..."
              value={messageSearchQuery}
              onChange={handleMessageSearchChange}
              className="w-full border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <div className="mt-4 max-h-96 overflow-y-auto">
              {messageSearchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                  onClick={() => scrollToMessage(result.id)}
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {result.from_me
                      ? "You"
                      : selectedContact.contactName ||
                        selectedContact.firstName ||
                        result.from.split("@")[0]}
                  </p>
                  <p className="text-gray-800 dark:text-gray-200">
                    {result.text.body.length > 100
                      ? result.text.body.substring(0, 100) + "..."
                      : result.text.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <DocumentModal
        isOpen={documentModalOpen}
        type={selectedDocument?.type || ""}
        onClose={() => setDocumentModalOpen(false)}
        document={selectedDocument}
        onSend={(document, caption) => {
          if (document) {
            sendDocument(document, caption);
          }
          setDocumentModalOpen(false);
        }}
        initialCaption={documentCaption}
      />

      {/* Usage Dashboard Modal */}
      {isUsageDashboardOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsUsageDashboardOpen(false)}
          />
          {/* Modal Content */}
          <div className="relative flex flex-col w-full h-full bg-white dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                    <Lucide icon="BarChart3" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Usage Analytics
                    </h2>
                    <p className="text-gray-200 text-sm">
                      Real-time monitoring and insights
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchDailyUsageData}
                    disabled={isLoadingUsageData}
                    className="flex items-center gap-2 px-3 py-2 bg-white/15 hover:bg-white/25 disabled:bg-white/10 text-white rounded-lg transition-all duration-200 text-sm font-medium border border-white/20 backdrop-blur-sm"
                  >
                    <Lucide
                      icon={isLoadingUsageData ? "Loader2" : "RefreshCw"}
                      className={`w-4 h-4 ${
                        isLoadingUsageData ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </button>
                  <button
                    onClick={() => setIsUsageDashboardOpen(false)}
                    className="p-2 hover:bg-white/15 rounded-lg transition-all duration-200 border border-white/20"
                  >
                    <Lucide icon="X" className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto bg-gray-50 dark:bg-gray-800">
              <div className="max-w-7xl mx-auto">
                {isLoadingUsageData ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-4">
                      <LoadingIcon
                        icon="oval"
                        className="w-10 h-10 text-blue-500"
                      />
                      <p className="text-gray-600 dark:text-gray-400 font-medium">
                        Loading analytics data...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Current Usage Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 dark:from-blue-950/50 dark:via-blue-900/30 dark:to-blue-800/20 p-6 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 group hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-12 translate-x-12"></div>
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                              <Lucide
                                icon="Sparkles"
                                className="w-6 h-6 text-white"
                              />
                            </div>
                            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                              AI Messages
                            </h3>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-end justify-between">
                              <span className="text-4xl font-black text-blue-900 dark:text-blue-100 tracking-tight">
                                {aiMessageUsage.toLocaleString()}
                              </span>
                              <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                / {(quotaData?.limit || currentPlanLimits.aiMessages || 500).toLocaleString()}
                              </span>
                            </div>
                            <div className="relative w-full bg-blue-200/50 dark:bg-blue-800/50 rounded-full h-4 overflow-hidden">
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 rounded-full transition-all duration-700 ease-out shadow-sm"
                                style={{
                                  width: `${Math.min(
                                    ((aiMessageUsage || 0) / (quotaData?.limit || currentPlanLimits.aiMessages || 500)) *
                                      100,
                                    100
                                  )}%`,
                                }}
                              >
                                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              {(
                                ((aiMessageUsage || 0) / (quotaData?.limit || currentPlanLimits.aiMessages || 500)) *
                                100
                              ).toFixed(1)}
                              % quota utilized this month
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:via-emerald-900/30 dark:to-emerald-800/20 p-6 rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50 group hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-12 translate-x-12"></div>
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                              <Lucide icon="Users" className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                              Contacts
                            </h3>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-end justify-between">
                              <span className="text-4xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight">
                                {contacts.length.toLocaleString()}
                              </span>
                              <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                / {(currentPlanLimits.contacts || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="relative w-full bg-emerald-200/50 dark:bg-emerald-800/50 rounded-full h-4 overflow-hidden">
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 rounded-full transition-all duration-700 ease-out shadow-sm"
                                style={{
                                  width: `${Math.min(
                                    (contacts.length / (currentPlanLimits.contacts || 1)) * 100,
                                    100
                                  )}%`,
                                }}
                              >
                                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                              {(
                                (contacts.length / (currentPlanLimits.contacts || 1)) * 100
                              ).toFixed(1)}% quota utilized for this account
                            </p>
                            {contacts.length > currentPlanLimits.contacts && (
                              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700/50">
                                <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                                  ⚠️ You have{" "}
                                  {(contacts.length - currentPlanLimits.contacts).toLocaleString()}{" "}
                                  contacts over your plan limit. Consider upgrading to manage all contacts effectively.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Daily Usage Chart */}
                    <div className="bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50 dark:from-gray-900/50 dark:via-gray-800 dark:to-gray-900/50 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden shadow-lg">
                      <div className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-750 px-6 py-5 border-b border-gray-200/50 dark:border-gray-600/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
                              <Lucide
                                icon="TrendingUp"
                                className="w-5 h-5 text-white"
                              />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                7-Day Usage Trend
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                AI messages activity
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-8">
                        {dailyUsageData.length > 0 ? (
                          <div className="space-y-8">
                            {/* Enhanced Line Chart */}
                            <div className="relative h-96 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-inner overflow-hidden">
                              {(() => {
                                return (
                                  <div className="w-full h-full p-4">
                                    <canvas
                                      ref={(canvas) => {
                                        if (
                                          canvas &&
                                          dailyUsageData.length > 0
                                        ) {
                                          // Use a timeout to ensure proper destruction
                                          setTimeout(() => {
                                            // Destroy any existing chart instance
                                            const existingChart = (canvas as any).chart;
                                            if (existingChart) {
                                              try {
                                                existingChart.destroy();
                                              } catch (e) {
                                                console.warn('Error destroying chart:', e);
                                              }
                                              (canvas as any).chart = null;
                                            }

                                            // Clear the canvas
                                            const ctx = canvas.getContext("2d");
                                            if (ctx) {
                                              ctx.clearRect(0, 0, canvas.width, canvas.height);
                                            }

                                            import("chart.js/auto").then(
                                              (Chart) => {
                                                if (ctx && !(canvas as any).chart) {
                                                  const isDark =
                                                    document.documentElement.classList.contains(
                                                      "dark"
                                                    );
                                                  const formatDateLabel = (
                                                    dateString: string
                                                  ) => {
                                                    const date = new Date(
                                                      dateString
                                                    );
                                                    const monthNames = [
                                                      "JAN",
                                                      "FEB",
                                                      "MAR",
                                                      "APR",
                                                      "MAY",
                                                      "JUN",
                                                      "JUL",
                                                      "AUG",
                                                      "SEP",
                                                      "OCT",
                                                      "NOV",
                                                      "DEC",
                                                    ];
                                                    const month =
                                                      monthNames[date.getMonth()];
                                                    const day = date
                                                      .getDate()
                                                      .toString()
                                                      .padStart(2, "0");
                                                    return `${month} ${day}`;
                                                  };

                                                  try {
                                                    (canvas as any).chart =
                                                      new Chart.default(ctx, {
                                                        type: "line",
                                                        data: {
                                                          labels:
                                                            dailyUsageData.map(
                                                              (day) =>
                                                                formatDateLabel(
                                                                  day.date
                                                                )
                                                            ),
                                                          datasets: [
                                                            {
                                                              label: "AI Messages",
                                                              data: dailyUsageData.map(
                                                                (day) =>
                                                                  day.aiMessages
                                                              ),
                                                              borderColor:
                                                                "#3B82F6",
                                                              backgroundColor:
                                                                "rgba(59, 130, 246, 0.1)",
                                                              borderWidth: 3,
                                                              pointBackgroundColor:
                                                                "#3B82F6",
                                                              pointBorderColor:
                                                                "#ffffff",
                                                              pointBorderWidth: 2,
                                                              pointRadius: 6,
                                                              pointHoverRadius: 8,
                                                              tension: 0.4,
                                                              fill: true,
                                                            },
                                                          ],
                                                        },
                                                        options: {
                                                          responsive: true,
                                                          maintainAspectRatio:
                                                            false,
                                                          interaction: {
                                                            intersect: false,
                                                            mode: "index" as const,
                                                          },
                                                          plugins: {
                                                            legend: {
                                                              position:
                                                                "top" as const,
                                                              labels: {
                                                                usePointStyle: true,
                                                                pointStyle:
                                                                  "circle" as const,
                                                                padding: 20,
                                                                color: isDark
                                                                  ? "#9CA3AF"
                                                                  : "#6B7280",
                                                                font: {
                                                                  size: 14,
                                                                },
                                                              },
                                                            },
                                                            tooltip: {
                                                              backgroundColor:
                                                                isDark
                                                                  ? "#1F2937"
                                                                  : "#FFFFFF",
                                                              titleColor: isDark
                                                                ? "#F3F4F6"
                                                                : "#1F2937",
                                                              bodyColor: isDark
                                                                ? "#D1D5DB"
                                                                : "#4B5563",
                                                              borderColor: isDark
                                                                ? "#374151"
                                                                : "#E5E7EB",
                                                              borderWidth: 1,
                                                              cornerRadius: 8,
                                                              displayColors: true,
                                                              padding: 12,
                                                            },
                                                          },
                                                          scales: {
                                                            x: {
                                                              grid: {
                                                                display: true,
                                                                color: isDark
                                                                  ? "#374151"
                                                                  : "#F3F4F6",
                                                              },
                                                              ticks: {
                                                                color: isDark
                                                                  ? "#9CA3AF"
                                                                  : "#6B7280",
                                                                font: {
                                                                  size: 12,
                                                                },
                                                                padding: 10,
                                                              },
                                                            },
                                                            y: {
                                                              beginAtZero: true,
                                                              grid: {
                                                                display: true,
                                                                color: isDark
                                                                  ? "#374151"
                                                                  : "#F3F4F6",
                                                              },
                                                              ticks: {
                                                                color: isDark
                                                                  ? "#9CA3AF"
                                                                  : "#6B7280",
                                                                font: {
                                                                  size: 12,
                                                                },
                                                                padding: 10,
                                                                callback: function (
                                                                  value: any
                                                                ) {
                                                                  return Number.isInteger(
                                                                    value
                                                                  )
                                                                    ? value
                                                                    : "";
                                                                },
                                                              },
                                                            },
                                                          },
                                                        },
                                                      });
                                                  } catch (error) {
                                                    console.error('Error creating chart:', error);
                                                  }
                                                }
                                              }
                                            ).catch((error) => {
                                              console.error('Error importing Chart.js:', error);
                                            });
                                          }, 100);
                                        }
                                      }}
                                      className="w-full h-full"
                                    />
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Enhanced Usage Summary */}
                            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
                              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-2xl border border-blue-200/30 dark:border-blue-700/30">
                                <div className="flex items-center justify-center mb-2">
                                  <Lucide
                                    icon="Sparkles"
                                    className="w-6 h-6 text-blue-500"
                                  />
                                </div>
                                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">
                                  {dailyUsageData
                                    .reduce(
                                      (sum, day) => sum + day.aiMessages,
                                      0
                                    )
                                    .toLocaleString()}
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                                  Total AI Messages
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  Past 7 days
                                </div>
                              </div>
                              <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-2xl border border-emerald-200/30 dark:border-emerald-700/30">
                                <div className="flex items-center justify-center mb-2">
                                  <Lucide
                                    icon="UserPlus"
                                    className="w-6 h-6 text-emerald-500"
                                  />
                                </div>
                                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
                                  {dailyUsageData
                                    .reduce(
                                      (sum, day) => sum + (day.contacts || 0),
                                      0
                                    )
                                    .toLocaleString()}
                                </div>
                                <div className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                                  New Contacts
                                </div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                  Past 7 days
                                </div>
                              </div>
                              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-2xl border border-purple-200/30 dark:border-purple-700/30">
                                <div className="flex items-center justify-center mb-2">
                                  <Lucide
                                    icon="Users"
                                    className="w-6 h-6 text-purple-500"
                                  />
                                </div>
                                <div className="text-3xl font-black text-purple-600 dark:text-purple-400 mb-1">
                                  {contacts.length || 0}
                                </div>
                                <div className="text-sm text-purple-700 dark:text-purple-300 font-semibold">
                                  Total Contacts
                                </div>
                                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                  Available for blasts
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                            <div className="text-center">
                              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lucide
                                  icon="BarChart3"
                                  className="w-10 h-10 text-gray-400 dark:text-gray-500"
                                />
                              </div>
                              <p className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                                No usage data yet
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-500 max-w-sm">
                                Your usage analytics will appear here once you
                                start sending AI and blast messages
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-3xl p-5 border border-gray-200/50 dark:border-gray-600/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => {
                              toast.info(
                                "📊 Export functionality will be available soon with CSV, PDF, and Excel formats!"
                              );
                            }}
                            className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md group"
                          >
                            <Lucide
                              icon="Download"
                              className="w-5 h-5 group-hover:scale-110 transition-transform"
                            />
                            <span className="font-semibold">
                              Export Analytics
                            </span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setIsUsageDashboardOpen(false);
                            setIsTopUpModalOpen(true);
                          }}
                          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-2xl hover:from-slate-600 hover:to-gray-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 group"
                        >
                          <Lucide
                            icon="Plus"
                            className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300"
                          />
                          <span className="font-semibold">Upgrade Quota</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={closeImageModal}
        imageUrl={modalImageUrl}
      />
      <ImageModal2
        isOpen={isImageModalOpen2}
        onClose={() => setImageModalOpen2(false)}
        imageUrl={pastedImageUrl}
        onSend={async (urls, caption) => {
          if (Array.isArray(urls)) {
            // Handle multiple images
            for (let i = 0; i < urls.length; i++) {
              const isLastImage = i === urls.length - 1;
              // Only send caption with the last image
              await sendImage(urls[i], isLastImage ? caption : "");
            }
          } else if (urls) {
            // Handle single image
            await sendImage(urls, caption);
          }
          setImageModalOpen2(false);
        }}
        initialCaption={documentCaption}
      />
      {videoModalOpen &&
        selectedVideo &&
        (() => {
          if (selectedVideo.size > 20 * 1024 * 1024) {
            setVideoModalOpen(false);
            toast.error(
              "The video file is too big. Please select a file smaller than 20MB."
            );
            return null; // Return null to render nothing
          }

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full">
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                  Send Video
                </h2>
                <video
                  src={URL.createObjectURL(selectedVideo)}
                  controls
                  className="w-full mb-4 rounded"
                  style={{ maxHeight: "400px" }}
                />
                <textarea
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full p-2 mb-4 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={() => {
                      setVideoModalOpen(false);
                      setSelectedVideo(null);
                      setVideoCaption("");
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!isScheduling) {
                        setIsScheduling(true);
                        try {
                          await handleVideoUpload(videoCaption);
                          setVideoModalOpen(false);
                          setSelectedVideo(null);
                          setVideoCaption("");
                        } finally {
                          setIsScheduling(false);
                        }
                      }
                    }}
                    className={`px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors ${
                      isScheduling ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    disabled={isScheduling}
                  >
                    {isScheduling ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin h-5 w-5 mr-2 text-white"
                          xmlns="http://www.w3.org/2000/svg"
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
                        Sending...
                      </span>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setVideoModalOpen(false)}
                  className="absolute top-2 right-2 text-gray-800 dark:text-gray-200"
                >
                  &times;
                </button>
              </div>
            </div>
          );
        })()}
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

      <ContextMenu id="contact-context-menu">
        <Item onClick={({ props }) => markAsUnread(props.contact)}>
          Mark as Unread
        </Item>
        <Item onClick={({ props }) => markAsRead(props.contact)}>
          Mark as Read
        </Item>
        <Separator />
        <Item
          onClick={({ props }) =>
            props.isSnooze
              ? props.onUnsnooze(props.contact)
              : props.onSnooze(props.contact)
          }
        >
          Snooze/Unsnooze
        </Item>
        <Separator />
        <Item
          onClick={({ props }) =>
            props.isResolved
              ? props.onUnresolve(props.contact)
              : props.onResolve(props.contact)
          }
        >
          Resolve/Unresolve
        </Item>
      </ContextMenu>
      {isReminderModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsReminderModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Set Reminder
            </h2>
            <textarea
              placeholder="Enter reminder message..."
              className="w-full md:w-96 lg:w-120 p-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 mb-4"
              rows={3}
              onChange={(e) => setReminderText(e.target.value)}
              value={reminderText}
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reminder Date and Time
              </label>
              <DatePickerComponent
                selected={reminderDate}
                onChange={(date: Date) => setReminderDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="w-full md:w-96 lg:w-120 p-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                placeholderText="Select date and time"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setIsReminderModalOpen(false);
                  setReminderText("");
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetReminder(reminderText)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition duration-200"
              >
                Set Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-up Modal */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsTopUpModalOpen(false)}
          />
          {/* Modal Content */}
          <div className="relative flex flex-col w-full h-full bg-white dark:bg-gray-900 overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                    <Lucide icon="Sparkles" className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      AI Response Top-up & Plans
                    </h2>
                    <p className="text-gray-200 text-sm mt-1">
                      Upgrade your plan or top up your AI responses
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="p-2 hover:bg-white/15 rounded-xl transition-all duration-200 border border-white/20"
                >
                  <Lucide icon="X" className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto bg-gray-50 dark:bg-gray-800">
              <div className="max-w-7xl mx-auto">
                {/* AI Response Calculator - Moved to Top */}
                <div className="mb-10 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-2xl border border-green-200/50 dark:border-green-700/50">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">
                      AI Response Calculator
                    </h3>
                    <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                      Calculate how many AI responses you need and get instant pricing
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-green-200 dark:border-green-700">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Amount in RM
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-lg font-semibold"
                          placeholder="Enter amount in RM"
                        />
                      </div>
                      
                      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            RM {calculateTopUpPrice()}
                          </div>
                          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            for {calculateAIResponses()} AI Responses
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            (RM 10 = 100 AI responses)
                          </div>
                          <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
                            💡 Great value for your AI needs!
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleTopUpPurchase()}
                        disabled={topUpAmount < 1 || isTopUpLoading}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        {isTopUpLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          `Buy Now - RM ${calculateTopUpPrice()}`
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current Usage Summary */}
                <div className="mb-10 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    Current Usage
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {aiMessageUsage}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        AI Responses Used
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {currentPlanLimits.aiMessages}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        Monthly Limit ({currentPlanLimits.title})
                      </div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${
                          (currentPlanLimits.aiMessages || 0) - (aiMessageUsage || 0) >= 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {(currentPlanLimits.aiMessages || 0) - (aiMessageUsage || 0)}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        Remaining
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Plans */}
                <div className="mb-10">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
                    Choose Your Plan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Free Plan */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all duration-300 hover:shadow-xl hover:scale-105">
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Free Plan
                        </h4>
                        <div className="text-2xl font-black text-primary mb-3">
                          RM 0
                          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                            /month
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-xs">
                          Perfect for getting started. Get 100 AI responses monthly and 100 contacts with full access to all system features.
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 font-semibold py-2 px-4 rounded-xl text-sm text-center">
                          Current Plan
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {[
                          "100 AI Responses Monthly",
                          "100 Contacts",
                          "AI Follow-Up System",
                          "AI Booking System",
                          "AI Tagging System",
                          "AI Assign System",
                          "Mobile App Access",
                          "Desktop App Access",
                        ].map((benefit, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                            <Lucide
                              icon="Check"
                              className="w-3 h-3 text-green-500 mr-2 flex-shrink-0"
                            />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Standard Plan */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all duration-300 hover:shadow-xl hover:scale-105">
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Standard Plan
                        </h4>
                        <div className="text-2xl font-black text-primary mb-3">
                          RM 500
                          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                            /month
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-xs">
                          Perfect for small businesses. Get 1000 AI responses monthly and 5000 contacts with full access to all system features.
                        </p>
                        <a 
                          href="https://api.payex.io/Payment/Details?key=78cd6WScl365InsA&amount=500&payment_type=fpx&description=Standard%20Plan&signature=8f619e38ff161beeb887286cc69b2aaf1bdf278df51249436c7ce0063179a617"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full bg-primary hover:bg-primary/80 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm text-center"
                        >
                          Upgrade Now
                        </a>
                      </div>
                      <div className="mt-4 space-y-2">
                        {[
                          "1000 AI Responses Monthly",
                          "5000 Contacts",
                          "AI Follow-Up System",
                          "AI Booking System",
                          "AI Tagging System",
                          "AI Assign System",
                          "Mobile App Access",
                          "Desktop App Access",
                        ].map((benefit, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                            <Lucide
                              icon="Check"
                              className="w-3 h-3 text-green-500 mr-2 flex-shrink-0"
                            />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pro Support Plan - Most Popular */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-primary shadow-xl scale-105">
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Pro Support Plan
                        </h4>
                        <div className="text-2xl font-black text-primary mb-3">
                          RM 950
                          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                            /month
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-xs">
                          Premium support with 5,000 AI responses monthly and 10,000 contacts. We handle your prompting, follow-ups, and maintenance.
                        </p>
                        <a 
                          href="https://api.payex.io/Payment/Details?key=78cd6WScl365InsA&amount=950&payment_type=fpx&description=Pro%20Plan&signature=c33c1d57c6ddb0976c02f5dab08bc683b25e01d099e92e707b82a607268e28a7"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full bg-primary hover:bg-primary/80 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm text-center"
                        >
                          Upgrade Now
                        </a>
                      </div>
                      <div className="mt-4 space-y-2">
                        {[
                          "5,000 AI Responses Monthly",
                          "10,000 Contacts",
                          "AI Follow-Up System",
                          "AI Booking System",
                          "AI Tagging System",
                          "AI Assign System",
                          "Mobile App Access",
                          "Desktop App Access",
                          "Full Maintenance & Support",
                        ].map((benefit, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                            <Lucide
                              icon="Check"
                              className="w-3 h-3 text-green-500 mr-2 flex-shrink-0"
                            />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all duration-300 hover:shadow-xl hover:scale-105">
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                          Enterprise Plan
                        </h4>
                        <div className="text-2xl font-black text-primary mb-3">
                          RM XXXX+
                          <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                            /month
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 text-xs">
                          Complete solution with 20,000 AI responses, 50,000 contacts, custom integrations, full setup and maintenance included.
                        </p>
                        <a 
                          href="https://wa.me/601121677522?text=Hi%20i%20would%20like%20to%20know%20more%20about%20your%20enterprise%20plan"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full bg-primary hover:bg-primary/80 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
                        >
                          Learn More
                        </a>
                      </div>
                      <div className="mt-4 space-y-2">
                        {[
                          "20,000 AI Responses Monthly",
                          "50,000 Contacts",
                          "AI Follow-Up System",
                          "AI Booking System",
                          "AI Tagging System",
                          "AI Assign System",
                          "Mobile App Access",
                          "Desktop App Access",
                          "Full Maintenance & Support",
                          "Full AI Setup & Custom Automations",
                        ].map((benefit, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                            <Lucide
                              icon="Check"
                              className="w-3 h-3 text-green-500 mr-2 flex-shrink-0"
                            />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ImageModalProps2 {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | string[] | null;
  onSend: (url: string | string[] | null, caption: string) => void;
  initialCaption?: string;
}

const ImageModal2: React.FC<ImageModalProps2> = ({
  isOpen,
  onClose,
  imageUrl,
  onSend,
  initialCaption,
}) => {
  const [caption, setCaption] = useState(initialCaption); // Initialize with initialCaption

  useEffect(() => {
    // Update caption when initialCaption changes
    setCaption(initialCaption || "");
  }, [initialCaption]);

  const handleSendClick = () => {
    if (!imageUrl) return;
    onSend(imageUrl, caption || "");
    setCaption("");
    onClose(); // Close the modal after sending
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-400 bg-opacity-75"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-400 dark:bg-gray-800 rounded-lg shadow-lg w-full md:w-[800px] h-[90vh] md:h-[600px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <button
            className="text-black hover:text-gray-800 dark:text-gray-200 dark:hover:text-gray-400"
            onClick={onClose}
          >
            <Lucide icon="X" className="w-6 h-6" />
          </button>
        </div>
        <div
          className="bg-slate-400 dark:bg-gray-800 p-4 rounded-lg mb-4 overflow-auto"
          style={{ height: "70%" }}
        >
          <div className="grid grid-cols-2 gap-4">
            {Array.isArray(imageUrl) ? (
              imageUrl.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="w-full h-auto rounded-md object-contain"
                  />
                </div>
              ))
            ) : (
              <img
                src={imageUrl || ""}
                alt="Modal Content"
                className="w-full h-auto rounded-md object-contain"
              />
            )}
          </div>
        </div>
        <div className="flex items-center bg-slate-500 dark:bg-gray-700 rounded-lg p-2">
          <input
            type="text"
            placeholder="Add a caption"
            className="flex-grow bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded-lg focus:outline-none"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            className="ml-2 bg-primary dark:bg-blue-600 text-white p-2 rounded-lg"
            onClick={handleSendClick}
          >
            <Lucide icon="Send" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Main;