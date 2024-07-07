import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, onSnapshot, setDoc, getDocs, addDoc, updateDoc, deleteDoc, query ,arrayRemove,arrayUnion} from "firebase/firestore";
import {QueryDocumentSnapshot, DocumentData ,Query,CollectionReference, startAfter,limit} from 'firebase/firestore'
import axios, { AxiosError } from "axios";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { Dialog, Menu } from "@/components/Base/Headless";
import { Link, useParams } from "react-router-dom";
import { FormInput } from "@/components/Base/Form";
import { format } from 'date-fns';
import { access } from "fs";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { time } from "console";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onMessage } from "firebase/messaging";
import { getFirebaseToken, messaging } from "../../firebaseconfig";
import { rateLimiter } from '../../utils/rate';
import errorIllustration from "@/assets/images/chat.svg";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useLocation } from "react-router-dom";
import { useContacts } from '../../contact';
import { Pin, PinOff } from "lucide-react";
import LZString from 'lz-string';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import Tippy from "@/components/Base/Tippy";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {  useNavigate } from "react-router-dom";
import noti from "../../assets/audio/noti.mp3";




interface Label {
  id: string;
  name: string;
  color: string;
  count: number;
}
interface Enquiry {
  id: string;
  contact_id: string;
  email: string;
  message: string;
  name:string;
  page_url: string;
  phone: string;
  source: string;
  timestamp: any;
  treatment:string;
  read:boolean;
}
interface Contact {
  conversation_id?: string | null;
  additionalEmails?: string[] | null;
  address1?: string | null;
  assignedTo?: string | null;
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
  chat_pic_full?: string | null;
  pinned?: boolean | null;
}
interface GhlConfig {
  ghl_id: string;
  ghl_secret: string;
  refresh_token: string;
  ghl_accessToken: string;
  ghl_location: string;
  whapiToken: string;
}
interface Chat {
  id?: string;
  name?: string;
  last_message?: Message | null;
  labels?: Label[];
  contact_id?: string;
  tags?: string[];
}

interface Message {
  chat_id: string;
  dateAdded: number;
  timestamp: number;
  id: string;
  text?: { body: string | "" ,  context?: any;};
  from_me?: boolean;
  from_name: string;
  createdAt: number;
  type?: string;
  from:string;
  image?: { link?: string; caption?: string };
  video?: { link?: string; caption?: string };
  gif?: { link?: string; caption?: string };
  audio?: { link?: string; caption?: string };
  voice?: { link?: string; caption?: string };
  document?: {
    file_name: string;
    file_size: number;
    filename: string;
    id: string;
    link: string;
    mime_type: string;
    page_count: number;
    preview: string;
    sha256: string;
  };
  link_preview?: { link: string; title: string; description: string ,body:string,preview:string};
  sticker?: { link: string; emoji: string };
  location?: { latitude: number; longitude: number; name: string };
  live_location?: { latitude: number; longitude: number; name: string };
  contact?: { name: string; phone: string };
  contact_list?: { contacts: { name: string; phone: string }[] };
  interactive?: any;
  poll?: any;
  hsm?: any;
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
  name?:string;
}interface Employee {
  id: string;
  name: string;
  role: string;
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
  text: string;
}
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}
interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
}
type Notification = {
  text: {
    body:string
  }
  from_name: string;
  timestamp: number;
  chat_id: string;
};

interface EditMessagePopupProps {
  editedMessageText: string;
  setEditedMessageText: (value: string) => void;
  handleEditMessage: () => void;
  cancelEditMessage: () => void;
}
const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl }) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!isOpen) return null;

  const handleImageClick = () => {
    setZoomLevel(prevZoomLevel => (prevZoomLevel === 1 ? 2 : 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div
        className="relative mt-10 p-2 bg-white rounded-lg shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Modal Content"
          className="rounded-md cursor-pointer"
          style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.3s', maxWidth: '100%', maxHeight: '100%' }}
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
const PDFModal: React.FC<PDFModalProps> = ({ isOpen, onClose, pdfUrl }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div
        className="relative mt-10 p-2 bg-white rounded-lg shadow-lg w-full max-w-5xl h-4/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-white bg-gray-800 hover:bg-gray-900 rounded-full p-2"
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
    </div>
  );
};



const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

function Main() {
  const { contacts: initialContacts, isLoading } = useContacts();
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
   const [numPages, setNumPages] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading2, setLoading] = useState<boolean>(false);
  const [isFetching, setFetching] = useState<boolean>(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [stopBotLabelCheckedState, setStopBotLabelCheckedState] = useState<boolean[]>([]);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [selectedMessage2, setSelectedMessage2] = useState(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [isTagged, setIsTagged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const myMessageClass = "flex flex-col w-full max-w-[320px] leading-1.5 p-1 bg-[#dcf8c6] text-black rounded-tr-xl rounded-tl-xl rounded-br-sm rounded-bl-xl self-end ml-auto mr-2 text-left";
  const otherMessageClass = "bg-white text-black rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-sm p-1 self-start text-left";
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [ghlConfig, setGhlConfig] = useState<GhlConfig | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [selectedMessageForForwarding, setSelectedMessageForForwarding] = useState<Message | null>(null);
  const [selectedContactsForForwarding, setSelectedContactsForForwarding] = useState<Contact[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState<boolean>(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [newQuickReply, setNewQuickReply] = useState<string>('');
  const [filteredContactsForForwarding, setFilteredContactsForForwarding] = useState<Contact[]>(contacts);
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [fetched, setFetched] = useState(0);
  const [total, setTotal] = useState(0);
  const prevNotificationsRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [isGroupFilterActive, setIsGroupFilterActive] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedMessageText, setEditedMessageText] = useState<string>("");
const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
const [isPDFModalOpen, setPDFModalOpen] = useState(false);
const [pdfUrl, setPdfUrl] = useState('');
const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
const [isImageModalOpen2, setImageModalOpen2] = useState(false);
const [pastedImageUrl, setPastedImageUrl] = useState('');
const [notifications, setNotifications] = useState<Notification[]>([]);
const audioRef = useRef<HTMLAudioElement>(null);

console.log(initialContacts);
useEffect(() => {
  if (initialContacts.length > 1) {
    setContacts(initialContacts.slice(0, 2000));
  
  }
}, [initialContacts]);
const handleEmojiClick = (emojiObject: EmojiClickData) => {
  setNewMessage(prevMessage => prevMessage + emojiObject.emoji);
};
const handlereplyMessage = async () => {
  if (!newMessage.trim() || !selectedChatId) return;
  
  // Your existing send message logic

  if (replyToMessage) {
    // Logic to handle replying to a specific message
    // Use replyToMessage.id to send the reply
  }

  // Clear the reply state after sending the message
  setReplyToMessage(null);
};

const openPDFModal = (url: string) => {
  setPdfUrl(url);
  setPDFModalOpen(true);
};

const closePDFModal = () => {
  setPDFModalOpen(false);
  setPdfUrl('');
};
  let companyId = "";
  let user_name = '';
  let user_role='2';
  let totalChats = 0;
  const getQueryParams = (query: string | string[][] | Record<string, string> | URLSearchParams | undefined) => {
    return new URLSearchParams(query);
  };


  const openDeletePopup = () => {
    setIsDeletePopupOpen(true);
  };
  const closeDeletePopup = () => {
    setIsDeletePopupOpen(false);
  };
  const deleteMessages = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
       companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
  
      for (const message of selectedMessages) {
        const response = await axios.delete(`https://gate.whapi.cloud/messages/${message.id}`, {
          headers: {
            'Authorization': `Bearer ${companyData.whapiToken}`,
            'Accept': 'application/json',
          },
        });
  
        if (response.status === 200) {
          setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== message.id));
        } else {
          throw new Error(`Failed to delete message: ${response.statusText}`);
        }
      }
  
      toast.success('Messages deleted successfully');
      setSelectedMessages([]);
      closeDeletePopup();
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast.error('Failed to delete messages');
    }
  };
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [selectedChatId, messages]);

  useEffect(() => {
   fetchConfigFromDatabase();
    fetchQuickReplies();
    
  }, []);
  const fetchQuickReplies = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    const quickRepliesCollection = collection(firestore, `user/${user.email}/quickreplies`);
    const quickRepliesSnapshot = await getDocs(quickRepliesCollection);
    const quickRepliesList: QuickReply[] = quickRepliesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as QuickReply[];
    setQuickReplies(quickRepliesList);
  };
  const addQuickReply = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const quickRepliesCollection = collection(firestore, `user/${user.email}/quickreplies`);
    await addDoc(quickRepliesCollection, { text: newQuickReply });
    setNewQuickReply('');
    fetchQuickReplies(); // Refresh quick replies
  };

 
  const updateQuickReply = async (id: string, text: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const quickReplyDoc = doc(firestore, `user/${user.email}/quickreplies`, id);
    await updateDoc(quickReplyDoc, { text });
    setEditingReply(null);
    fetchQuickReplies(); // Refresh quick replies
  };

  const deleteQuickReply = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const quickReplyDoc = doc(firestore, `user/${user.email}/quickreplies`, id);
    await deleteDoc(quickReplyDoc);
    fetchQuickReplies(); // Refresh quick replies
  };
  const handleQR = () => {
    setIsQuickRepliesOpen(!isQuickRepliesOpen);
    if (!isQuickRepliesOpen) {
      fetchQuickReplies(); // Fetch quick replies when opening the dropdown
    }
  };

  const handleQRClick = (text: string) => {
    setNewMessage(text);
    setIsQuickRepliesOpen(false);
  };
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, 'user', auth.currentUser?.email!, 'notifications'),
      async (snapshot) => {
        const currentNotifications = snapshot.docs.map(doc => doc.data() as Notification);
  
        // Prevent running on initial mount
        if (isInitialMount.current) {
          isInitialMount.current = false;
          prevNotificationsRef.current = currentNotifications.length;
          return;
        }
  
        // Check if a new notification has been added
        if (prevNotificationsRef.current !== null && currentNotifications.length > prevNotificationsRef.current) {
          // Sort notifications by timestamp to ensure the latest one is picked
          currentNotifications.sort((a, b) => b.timestamp - a.timestamp);
          const latestNotification = currentNotifications[0];
          console.log(latestNotification);
  
          // Add new notification to the state
          setNotifications(prev => [...prev, latestNotification]);
          if (audioRef.current) {
            audioRef.current.play();
          }
          if (selectedChatId === latestNotification.chat_id) {
            fetchMessagesBackground(selectedChatId!, whapiToken!);
          } else {
            console.log('Received a new notification');
            const userDocRef = doc(firestore, 'user', auth.currentUser?.email!);
            const userDocSnapshot = await getDoc(userDocRef);
            if (!userDocSnapshot.exists()) {
              console.log('No such user document!');
              return;
            }
            const dataUser = userDocSnapshot.data();
            const newCompanyId = dataUser.companyId;
            const companyDocRef = doc(firestore, 'companies', newCompanyId);
            const companyDocSnapshot = await getDoc(companyDocRef);
            if (!companyDocSnapshot.exists()) {
              console.log('No such company document!');
              return;
            }
            const data = companyDocSnapshot.data();
            setGhlConfig({
              ghl_id: data.ghl_id,
              ghl_secret: data.ghl_secret,
              refresh_token: data.refresh_token,
              ghl_accessToken: data.ghl_accessToken,
              ghl_location: data.ghl_location,
              whapiToken: data.whapiToken,
            });
            const user_name = dataUser.name;
         fetchContactsBackground(
              data.whapiToken,
              data.ghl_location,
              data.ghl_accessToken,
              user_name,
              dataUser.role,
              dataUser.email
            );
          }
        }
  
        // Update the previous notifications count
        prevNotificationsRef.current = currentNotifications.length;
      }
    );
  
    return () => unsubscribe();
  }, [companyId, selectedChatId, whapiToken]);
  
  let params :URLSearchParams;
  let chatId: any ;
  if(location != undefined){
    params =new URLSearchParams(location.search);
    chatId =  params.get("chatId");
  }


  useEffect(() => {
    const fetchContact = async () => {

      console.log(chatId);
      if (chatId) {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) {
          console.error('No user is authenticated');
          return;
        }
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.error('No such document for user!');
      return;
    }
    const dataUser = docUserSnapshot.data() as UserData;

    if (!dataUser || !dataUser.companyId) {
      console.error('Invalid user data or companyId');
      return;
    }

    setUserData(dataUser);
    user_role = dataUser.role;
    companyId = dataUser.companyId;

    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.error('No such document for company!');
      return;
    }
    const data = docSnapshot.data();
        const phone = "+" + chatId.split('@')[0];
        const contact = await fetchDuplicateContact(phone, data.ghl_location, data.ghl_accessToken);
        setSelectedContact(contact);
        console.log(selectedContact + " contact");
        setSelectedChatId(chatId);
        setLoading(false);
      }
    };
  
    fetchContact();
  }, [chatId]);
  async function fetchConfigFromDatabase() {
    const user = auth.currentUser;
  
    if (!user) {
      console.error('No user is authenticated');
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const dataUser = docUserSnapshot.data() as UserData;
  
      if (!dataUser || !dataUser.companyId) {
        console.error('Invalid user data or companyId');
        return;
      }
  
      setUserData(dataUser);
      user_role = dataUser.role;
      companyId = dataUser.companyId;
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error('No such document for company!');
        return;
      }
      const data = docSnapshot.data();
  
      if (!data) {
        console.error('Invalid company data');
        return;
      }
  
      setGhlConfig({
        ghl_id: data.ghl_id,
        ghl_secret: data.ghl_secret,
        refresh_token: data.refresh_token,
        ghl_accessToken: data.ghl_accessToken,
        ghl_location: data.ghl_location,
        whapiToken: data.whapiToken,
      });
  
      setToken(data.whapiToken);
      user_name = dataUser.name;
  
      // Set wallpaper URL if available
      if (dataUser.wallpaper_url) {
        setWallpaperUrl(dataUser.wallpaper_url);
      }
  //
  const employeeRef = collection(firestore, `companies/${companyId}/employee`);
  const employeeSnapshot = await getDocs(employeeRef);

  const employeeListData: Employee[] = [];
  employeeSnapshot.forEach((doc) => {
    employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
  });
 
  setEmployeeList(employeeListData);
  console.log(employeeListData);
  const employeeNames = employeeListData.map(employee => employee.name.trim().toLowerCase());
      await fetchTags(data.ghl_accessToken, data.ghl_location, employeeNames);
  
      if (chatId) {
        setLoading(true);
        const phone = "+" + chatId.split('@')[0];
        const contact = await fetchDuplicateContact(phone, data.ghl_location, data.ghl_accessToken);
        setSelectedContact(contact);
        console.log(contact);
        console.log(selectedContact);
        setSelectedChatId(chatId);
        setLoading(false);
      }
     
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  }
  const updateConversation = async (conversationId: string, token: string, locationId: string,) => {
    const url = `https://services.leadconnectorhq.com/conversations/${conversationId}`;
    const options = {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Version: '2021-04-15',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      data: {
        locationId: locationId,
        unreadCount: 0,
      },
    };
  
    try {
      const response = await axios(url, options);
      console.log(response.data);
      const data = response.data;
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  };

  const selectChat = async (chatId: string, id?: string, contactSelect?: Contact) => {
    const updatedContacts = contacts.map(contact =>
      contact.chat_id === chatId ? { ...contact, unreadCount: 0 } : contact
    );
  
    setContacts(updatedContacts);
  
    // Update local storage to reflect the updated contacts
    localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
    sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been updated in this session
  
    let contact = contacts.find(contact => contact.chat_id === chatId || contact.id === chatId);
    console.log('Selected Contact:', contact);
 
    // If the contact does not exist and contactSelect is provided, create the contact
    if (!contact!.id && contactSelect) {
      console.log('creating contact');
      try {
       // contact = await createContact(contactSelect!.firstName!, contactSelect.phone!);
        //updatedContacts.push(contact);
        //setContacts(updatedContacts);
  
        // Update local storage again to reflect the newly added contact
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
        sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been updated in this session
      } catch (error) {
        console.error('Failed to create contact:', error);
      }
    }
    setSelectedContact(contact);
    setSelectedChatId(chatId);
    try {
      const user = auth.currentUser;
      if (user) {
        console.log('Fetching notifications for user:', user.email);
        const notificationsRef = collection(firestore, 'user', user.email!, 'notifications');
        console.log('Notifications Reference Path:', notificationsRef.path);
  
        const notificationsSnapshot = await getDocs(notificationsRef);
        if (notificationsSnapshot.empty) {
          console.log('No notifications found for user:', user.email);
        } else {
          const notifications = notificationsSnapshot.docs.map(doc => ({
            docId: doc.id,
            ...doc.data()
          }));
          console.log('Fetched Notifications:', notifications);
  
          const notificationsToDelete = notifications.filter((notification: any) => notification.chat_id === chatId);
  
          // Delete each notification document in the subcollection
          for (const notification of notificationsToDelete) {
            const notificationDocRef = doc(firestore, 'user', user.email!, 'notifications', notification.docId);
            await deleteDoc(notificationDocRef);
            console.log('Deleted notification:', notification.docId);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };
  const fetchTags = async (token: string, location: string, employeeList: string[]) => {
    const maxRetries = 5; // Maximum number of retries
    const baseDelay = 1000; // Initial delay in milliseconds

    const fetchData = async (url: string, retries: number = 0): Promise<any> => {
        const options = {
            method: 'GET',
            url: url,
            headers: {
                Authorization: `Bearer ${token}`,
                Version: '2021-07-28',
            },
        };
        await rateLimiter(); // Ensure rate limit is respected before making the request
        try {
            const response = await axios.request(options);
            return response;
        } catch (error: any) {
            if (error.response && error.response.status === 429 && retries < maxRetries) {
                const delay = baseDelay * Math.pow(2, retries);
                console.warn(`Rate limit hit, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchData(url, retries + 1);
            } else {
                throw error;
            }
        }
    };

    try {
        const url = `https://services.leadconnectorhq.com/locations/${location}/tags`;
        const response = await fetchData(url);
        const filteredTags = response.data.tags.filter((tag: Tag) => !employeeList.includes(tag.name));
        setTagList(filteredTags);
    } catch (error) {
        console.error('Error fetching tags:', error);
        return [];
    }
};
async function createContact(name: string, number: string): Promise<Contact> {
  const options = {
    method: 'POST',
    url: 'https://services.leadconnectorhq.com/contacts/',
    headers: {
      Authorization: `Bearer ${ghlConfig!.ghl_accessToken}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data: {
      firstName: name,
      name: name,
      locationId: ghlConfig!.ghl_location,
      phone: number,
    },
  };

  try {
    const response = await axios.request(options);
    const data = response.data;
    return {
      chat_id: data.id,
      id: data.id,
      firstName: name,
      phone: number,
      unreadCount: 0,
      conversation_id: '', // Default values
      additionalEmails: [],
      address1: null,
      assignedTo: null,
      businessId: null,
      city: null,
      companyName: null,
      contactName: name,
      country: '',
      customFields: [],
      dateAdded: new Date().toISOString(),
      dateOfBirth: null,
      dateUpdated: new Date().toISOString(),
      dnd: false,
      dndSettings: {},
      email: null,
      followers: [],
      lastName: '',
      locationId: ghlConfig!.ghl_location,
      postalCode: null,
      source: null,
      state: null,
      tags: [],
      type: '',
      website: null,
      chat: [],
      last_message: null,
      chat_pic_full: '',
      pinned: false,
    };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to create contact');
  }
}
const fetchDuplicateContact = async (phone: string, locationId: string, accessToken: string) => {
  const url = `https://services.leadconnectorhq.com/contacts/search/duplicate?locationId=${locationId}${phone ? `&number=${phone}` : ''}`;
  try {
      const response = await axios.get(url, {
          headers: {
              Authorization: `Bearer ${accessToken}`,
              Version: '2021-07-28',
              Accept: 'application/json',
          },
      });
      return response.data.contact;
  } catch (err) {
      const error = err as AxiosError;
      if (error.response && error.response.status === 429) {
        
          // Handle rate limit error gracefully
          return null;
      } else if (axios.isCancel(error)) {
          console.warn('Fetch cancelled:', error.message);
      } else {
          console.error('Error fetching duplicate contact:', error);
          throw error;
      }
  }
};

const fetchContacts = async (whapiToken: any, locationId: any, ghlToken: any, user_name: string, role: string, userEmail: string, callback?: Function) => {
  try {
    // Set contacts to state
    setContacts(initialContacts);
    setFilteredContacts(initialContacts);
    setFilteredContactsForForwarding(initialContacts);
   
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
  } finally {
  
  }
};


const getTimestamp = (timestamp: any): number => {
  if (typeof timestamp === 'number') {
      // Assume timestamp is in seconds if it's less than 10000000000
      return timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  } else if (typeof timestamp === 'object' && timestamp.seconds) {
      // Firestore timestamp
      return timestamp.seconds * 1000;
  } else if (typeof timestamp === 'string') {
      // Convert string timestamp to milliseconds
      return new Date(timestamp).getTime();
  } else {
      return 0;
  }
};

const fetchContactsBackground = async (whapiToken: string, locationId: string, ghlToken: string, user_name: string, role: string, userEmail: string | null | undefined) => {
  try {
    if (!userEmail) {
      throw new Error("User email is not provided.");
    }
    
    const docUserRef = doc(firestore, 'user', userEmail);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      return;
    }

    const dataUser = docUserSnapshot.data();
    const companyId = dataUser?.companyId;
    if (!companyId) {
      return;
    }

    // Pagination settings
    const batchSize = 500;
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    const phoneSet = new Set<string>();
    let allContacts: Contact[] = [];

    // Fetch contacts in batches
    while (true) {
      let queryRef: Query<DocumentData>;
      const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`) as CollectionReference<DocumentData>;
      
      if (lastVisible) {
        queryRef = query(contactsCollectionRef, startAfter(lastVisible), limit(batchSize));
      } else {
        queryRef = query(contactsCollectionRef, limit(batchSize));
      }

      const contactsSnapshot = await getDocs(queryRef);
      const contactsBatch: Contact[] = contactsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact));

      if (contactsBatch.length === 0) break; // Exit if no more documents

      contactsBatch.forEach(contact => {
        if (contact.phone && !phoneSet.has(contact.phone)) {
          phoneSet.add(contact.phone);
          allContacts.push(contact);
        }
      });

      lastVisible = contactsSnapshot.docs[contactsSnapshot.docs.length - 1];
    }

    // Fetch pinned chats
    const pinnedChatsRef = collection(firestore, `user/${userEmail}/pinned`);
    const pinnedChatsSnapshot = await getDocs(pinnedChatsRef);
    const pinnedChats = pinnedChatsSnapshot.docs.map(doc => doc.data() as Contact);

    // Add pinned status to contactsData and update in Firebase
    const updatePromises = allContacts.map(async contact => {
      const isPinned = pinnedChats.some(pinned => pinned.chat_id === contact.chat_id);
      if (isPinned) {
        contact.pinned = true;
        if (companyId && contact.id) {
          const contactDocRef = doc(firestore, `companies/${companyId}/contacts`, contact.id);
          // Further code to use contactDocRef
          await setDoc(contactDocRef, contact, { merge: true });
        } else {
          console.error('companyId or contact.id is null or undefined');
        }
    
      }
    });

    await Promise.all(updatePromises);

   // await Promise.all(updatePromises);

    // Sort contactsData by pinned status and last_message timestamp
    allContacts.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const dateA = a.last_message?.createdAt
        ? new Date(a.last_message.createdAt)
        : a.last_message?.timestamp
          ? new Date(a.last_message.timestamp * 1000)
          : new Date(0);
      const dateB = b.last_message?.createdAt
        ? new Date(b.last_message.createdAt)
        : b.last_message?.timestamp
          ? new Date(b.last_message.timestamp * 1000)
          : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    console.log("all");
    console.log(allContacts);
    setContacts(allContacts);
    localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
    sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been fetched in this session
  } catch (error) {
    console.error('Error fetching contacts:', error);
  }
};


  async function fetchConversationMessages(conversationId: string,contact:any) {
    if (!conversationId) return;
    console.log(contact);
    console.log(selectedIcon);
    const auth = getAuth(app);
    const user = auth.currentUser;
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const data2 = docSnapshot.data();
      await updateConversation(conversationId,data2.ghl_accessToken,data2.ghl_location)
      setToken(data2.whapiToken);
      const leadConnectorResponse = await axios.get(`https://services.leadconnectorhq.com/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${data2.ghl_accessToken}`,
          Version: '2021-04-15',
          Accept: 'application/json'
        }
      });
      const leadConnectorData = leadConnectorResponse.data;
      setMessages(
        leadConnectorData.messages.messages.map((message: any) => ({
          id: message.id,
          text: { body: message.body },
          from_me: message.direction === 'outbound' ? true : false,
          createdAt: message.dateAdded,
          type: 'text',
          image: message.image ? message.image : undefined,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }
  const handleWhatsappClick = (iconId: string) => {
    setSelectedIcon(iconId);
    fetchMessages(selectedChatId!, whapiToken!);
  };
  useEffect(() => {
    if (selectedChatId) {
      console.log(selectedContact);
      fetchMessages(selectedChatId, whapiToken!);
    }
  }, [selectedChatId]);
  async function fetchMessages(selectedChatId: string, whapiToken: string) {
    setLoading(true);
    setSelectedIcon('ws');
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      
      if (!docUserSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const dataUser = docUserSnapshot.data();
      
      companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const data2 = docSnapshot.data();
      
      setToken(data2.whapiToken);
      
      let messages = await fetchMessagesFromApi(selectedChatId, data2.whapiToken, dataUser?.email);
  
      // If no messages, try with whapiToken2
      if ( data2.whapiToken2) {
        messages = await fetchMessagesFromApi(selectedChatId, data2.whapiToken2, dataUser?.email);
      }
  
      const formattedMessages: any[] = [];
      const reactionsMap: Record<string, any[]> = {};
  
      messages.forEach(async (message: any) => {
        if (message.type === 'action' && message.action.type === 'reaction') {
          const targetMessageId = message.action.target;
          if (!reactionsMap[targetMessageId]) {
            reactionsMap[targetMessageId] = [];
          }
          reactionsMap[targetMessageId].push({
            emoji: message.action.emoji,
            from_name: message.from_name
          });
        } else {
          const formattedMessage: any = {
            id: message.id,
            from_me: message.from_me,
            from_name: message.from_name,
            from: message.from,
            chat_id: message.chat_id,
            createdAt: new Date(message.timestamp * 1000).toISOString(), // Ensure the timestamp is correctly formatted
            type: message.type,
            name: message.name
          };
  
          // Include message-specific content
          switch (message.type) {
            case 'text':
              formattedMessage.text = {
                body: message.text ? message.text.body : '', // Include the message body
                context: message.context ? message.context : '' // Include the context
              };
              break;
            case 'image':
              formattedMessage.image = message.image ? message.image : undefined;
              break;
            case 'video':
              formattedMessage.video = message.video ? message.video : undefined;
              break;
            case 'gif':
              formattedMessage.gif = message.gif ? message.gif : undefined;
              break;
            case 'audio':
              formattedMessage.audio = message.audio ? message.audio : undefined;
              break;
            case 'voice':
              formattedMessage.voice = message.voice ? message.voice : undefined;
              break;
            case 'document':
              formattedMessage.document = message.document ? message.document : undefined;
              break;
            case 'link_preview':
              formattedMessage.link_preview = message.link_preview ? message.link_preview : undefined;
              break;
            case 'sticker':
              formattedMessage.sticker = message.sticker ? message.sticker : undefined;
              break;
            case 'location':
              formattedMessage.location = message.location ? message.location : undefined;
              break;
            case 'live_location':
              formattedMessage.live_location = message.live_location ? message.live_location : undefined;
              break;
            case 'contact':
              formattedMessage.contact = message.contact ? message.contact : undefined;
              break;
            case 'contact_list':
              formattedMessage.contact_list = message.contact_list ? message.contact_list : undefined;
              break;
            case 'interactive':
              formattedMessage.interactive = message.interactive ? message.interactive : undefined;
              break;
            case 'poll':
              formattedMessage.poll = message.poll ? message.poll : undefined;
              break;
            case 'hsm':
              formattedMessage.hsm = message.hsm ? message.hsm : undefined;
              break;
            case 'system':
              formattedMessage.system = message.system ? message.system : undefined;
              break;
            case 'order':
              formattedMessage.order = message.order ? message.order : undefined;
              break;
            case 'group_invite':
              formattedMessage.group_invite = message.group_invite ? message.group_invite : undefined;
              break;
            case 'admin_invite':
              formattedMessage.admin_invite = message.admin_invite ? message.admin_invite : undefined;
              break;
            case 'product':
              formattedMessage.product = message.product ? message.product : undefined;
              break;
            case 'catalog':
              formattedMessage.catalog = message.catalog ? message.catalog : undefined;
              break;
            case 'product_items':
              formattedMessage.product_items = message.product_items ? message.product_items : undefined;
              break;
            case 'action':
              formattedMessage.action = message.action ? message.action : undefined;
              break;
            case 'context':
              formattedMessage.context = message.context ? message.context : undefined;
              break;
            case 'reactions':
              formattedMessage.reactions = message.reactions ? message.reactions : undefined;
              break;
            default:
              console.warn(`Unknown message type: ${message.type}`);
          }
  
          formattedMessages.push(formattedMessage);
        }
      });
  
      // Add reactions to the respective messages
      formattedMessages.forEach(message => {
        if (reactionsMap[message.id]) {
          message.reactions = reactionsMap[message.id];
        }
      });
  
      setMessages(formattedMessages);
  
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchMessagesFromApi(chatId: string, token: string, userEmail: string) {
    const response = await axios.get(`https://buds-359313.et.r.appspot.com/api/messages/${chatId}/${token}/${userEmail}`);
    return response.data.messages;
  }
async function fetchMessagesBackground(selectedChatId: string, whapiToken: string) {

  setSelectedIcon('ws');
  const auth = getAuth(app);
  const user = auth.currentUser;
  try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
    
      if (!docUserSnapshot.exists()) {
          console.log('No such document!');
          return;
      }
      const dataUser = docUserSnapshot.data();
 

      companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
          console.log('No such document!');
          return;
      }
      const data2 = docSnapshot.data();

      setToken(data2.whapiToken);


          const response = await axios.get(`https://buds-359313.et.r.appspot.com/api/messages/${selectedChatId}/${data2.whapiToken}/${user?.email}`);
      
          const data = response.data;
          console.log("pure");
          console.log(data);
          const formattedMessages: any[] = [];
          const reactionsMap: Record<string, any[]> = {};

          data.messages.forEach(async (message: any) => {
     
              if (message.type === 'action' && message.action.type === 'reaction') {
                  const targetMessageId = message.action.target;
                  if (!reactionsMap[targetMessageId]) {
                      reactionsMap[targetMessageId] = [];
                  }
                  reactionsMap[targetMessageId].push({
                      emoji: message.action.emoji,
                      from_name: message.from_name
                  });
              } else {
            
               
                  const formattedMessage: any = {
                      id: message.id,
                      from_me: message.from_me,
                      from_name: message.from_name,
                      from:message.from,
                      chat_id: message.chat_id,
                      createdAt: new Date(message.timestamp * 1000).toISOString(), // Ensure the timestamp is correctly formatted
                      type: message.type,
                      name:message.name 
                  };

                  // Include message-specific content
                  switch (message.type) {
                      case 'text':
                          formattedMessage.text = {
                              body: message.text ? message.text.body : '', // Include the message body
                              context: message.context ? message.context : '' // Include the context
                          };
                          break;
                      case 'image':
                          formattedMessage.image = message.image ? message.image : undefined;
                          break;
                      case 'video':
                          formattedMessage.video = message.video ? message.video : undefined;
                          break;
                      case 'gif':
                          formattedMessage.gif = message.gif ? message.gif : undefined;
                          break;
                      case 'audio':
                          formattedMessage.audio = message.audio ? message.audio : undefined;
                          break;
                      case 'voice':
                          formattedMessage.voice = message.voice ? message.voice : undefined;
                          break;
                      case 'document':
                          formattedMessage.document = message.document ? message.document : undefined;
                          break;
                      case 'link_preview':
                          formattedMessage.link_preview = message.link_preview ? message.link_preview : undefined;
                          break;
                      case 'sticker':
                          formattedMessage.sticker = message.sticker ? message.sticker : undefined;
                          break;
                      case 'location':
                          formattedMessage.location = message.location ? message.location : undefined;
                          break;
                      case 'live_location':
                          formattedMessage.live_location = message.live_location ? message.live_location : undefined;
                          break;
                      case 'contact':
                          formattedMessage.contact = message.contact ? message.contact : undefined;
                          break;
                      case 'contact_list':
                          formattedMessage.contact_list = message.contact_list ? message.contact_list : undefined;
                          break;
                      case 'interactive':
                          formattedMessage.interactive = message.interactive ? message.interactive : undefined;
                          break;
                      case 'poll':
                          formattedMessage.poll = message.poll ? message.poll : undefined;
                          break;
                      case 'hsm':
                          formattedMessage.hsm = message.hsm ? message.hsm : undefined;
                          break;
                      case 'system':
                          formattedMessage.system = message.system ? message.system : undefined;
                          break;
                      case 'order':
                          formattedMessage.order = message.order ? message.order : undefined;
                          break;
                      case 'group_invite':
                          formattedMessage.group_invite = message.group_invite ? message.group_invite : undefined;
                          break;
                      case 'admin_invite':
                          formattedMessage.admin_invite = message.admin_invite ? message.admin_invite : undefined;
                          break;
                      case 'product':
                          formattedMessage.product = message.product ? message.product : undefined;
                          break;
                      case 'catalog':
                          formattedMessage.catalog = message.catalog ? message.catalog : undefined;
                          break;
                      case 'product_items':
                          formattedMessage.product_items = message.product_items ? message.product_items : undefined;
                          break;
                      case 'action':
                          formattedMessage.action = message.action ? message.action : undefined;
                          break;
                      case 'context':
                          formattedMessage.context = message.context ? message.context : undefined;
                          break;
                      case 'reactions':
                          formattedMessage.reactions = message.reactions ? message.reactions : undefined;
                          break;
                      default:
                          console.warn(`Unknown message type: ${message.type}`);
                  }

                  formattedMessages.push(formattedMessage);
              }
          });

          // Add reactions to the respective messages
          formattedMessages.forEach(message => {
              if (reactionsMap[message.id]) {
                  message.reactions = reactionsMap[message.id];
              }
          });
       
          setMessages(formattedMessages);
   
  } catch (error) {
      console.error('Failed to fetch messages:', error);
  } finally {
   
  }
}
  async function sendTextMessage(selectedChatId: string, newMessage: string,contact:any): Promise<void> {
    if (!newMessage.trim() || !selectedChatId) return;
  console.log(selectedChatId)
    const user = auth.currentUser;
    if (!user) {
      console.log('User not authenticated');
      return;
    }
  
    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
  
    const dataUser = docUserSnapshot.data();
     companyId = dataUser.companyId;
  
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
  
    const data2 = docSnapshot.data();
    const accessToken = data2.ghl_accessToken;
  
    try {
      const options = {
        method: 'POST',
        url: 'https://services.leadconnectorhq.com/conversations/messages',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-04-15',
        },
        data: {
          type: (selectedIcon =='fb')?'FB':'IG',
          contactId: selectedChatId,
          message: newMessage
        }
      };
  
      const response = await axios.request(options);
      console.log(response.data);
  
      console.log('Message sent successfully:', response.data);
      toast.success("Message sent successfully!");
      fetchConversationMessages(contact.conversation_id,selectedContact);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId) return;
    const user = auth.currentUser;
    const docUserRef = doc(firestore, 'user', user?.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
    const dataUser = docUserSnapshot.data();
    companyId = dataUser.companyId;
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
    const data2 = docSnapshot.data();
  
    setToken(data2.whapiToken);
    try {
      const response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/text/${selectedChatId!}/${data2.whapiToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          quotedMessageId: replyToMessage?.id || null // Add the quotedMessageId here
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
     
      const data = await response.json();
      console.log(data.message);
    const messagesCollectionRef = collection(firestore, 'companies',  companyId, 'messages');
try {
  await setDoc(doc(messagesCollectionRef, data.message.id), {
    message: data.message,
    from:dataUser.name,
  });
} catch (error) {
  console.error('Error adding message: ', error);
}
      toast.success("Message sent successfully!");
      fetchMessagesBackground(selectedChatId!, whapiToken!);
      setReplyToMessage(null); // Clear the replyToMessage state after sending the message
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const toggleStopBotLabel = async (contact: Contact, index: number) => {
    console.log(contact);
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
       companyId = userData.companyId;
       if (companyId && contact.id) {
        const docRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        // Further code to use contactDocRef
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          console.log('No such document for contact!');
          return;
        }
        const hasLabel = contact.tags!.includes('stop bot');
        if (hasLabel) {
          await updateDoc(docRef, {
            tags: arrayRemove('stop bot')
          });
        } else {
          await updateDoc(docRef, {
            tags: arrayUnion('stop bot')
          });
        }
    
        const updatedContacts = [...contacts];
        const updatedContact = { ...updatedContacts[index] };
    
        if (hasLabel) {
          updatedContact.tags = updatedContact.tags!.filter(tag => tag !== "stop bot");
        } else {
          updatedContact.tags = [...updatedContact.tags!, "stop bot"];
        }
    
        updatedContacts[index] = updatedContact;
        setContacts(updatedContacts);
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
      sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been updated in this session
        const updatedState = [...stopBotLabelCheckedState];
        updatedState[index] = !hasLabel;
        setStopBotLabelCheckedState(updatedState);
      } else {
        console.error('companyId or contact.id is null or undefined');
      }
   
     
     
  
    
  
    } catch (error) {
      console.error('Error toggling label:', error);
    }
  };

  const handleAddTagToSelectedContacts = async (selectedEmployee: string, contact: any) => {
    const user = auth.currentUser;
    console.log(selectedEmployee);
    if (!user) {
      console.log('No authenticated user');
      return;
    }
  
    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document for user!');
      return;
    }
    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document for company!');
      return;
    }
    const companyData = docSnapshot.data();
  
    console.log(selectedEmployee);
    if (selectedEmployee) {
      const tagName = selectedEmployee;
  
      // Merge existing tags with the new tag
      const updatedTags = [...new Set([...(contact.tags || []), tagName])];
  
      const success = await updateContactTags(contact.id, updatedTags, true);
      if (success) {
        // Update the selected contact's tags directly
        setContacts(prevContacts =>
          prevContacts.map(c =>
            c.id === contact.id ? { ...c, tags: updatedTags } : c
          )
        );
  
        // Update the selected contact if it's the same as the one being updated
        if (selectedContact?.id === contact.id) {
          setSelectedContact((prevContact: any) => ({
            ...prevContact,
            tags: updatedTags,
          }));
        }
  
        // Update local storage
        let storedContacts = [];
        try {
          storedContacts = JSON.parse(LZString.decompress(localStorage.getItem('contacts') || '[]'));
          if (!Array.isArray(storedContacts)) {
            throw new Error('Parsed data is not an array');
          }
        } catch (error) {
          console.error('Error parsing contacts from local storage:', error);
          storedContacts = [];
        }
  
        const updatedContacts = storedContacts.map((c: Contact) =>
          c.id === contact.id
            ? { ...c, tags: updatedTags }
            : c
        );
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
  
        sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been updated in this session
        toast.success("Tag added successfully!");
      }
    }
  };
  
  async function updateContactTags(contactId: string, tags: string[], addTag: boolean) {
    try {
      const user = auth.currentUser;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
    
       companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId, 'contacts', contactId);
      const docSnapshot = await getDoc(docRef);
  
      if (!docSnapshot.exists()) {
        console.error(`No document to update: companies/${companyId}/contacts/${contactId}`);
        return false;
      }
  
      if (addTag) {
        await updateDoc(docRef, {
          tags: arrayUnion(...tags)
        });
      } else {
        await updateDoc(docRef, {
          tags: arrayRemove(...tags)
        });
      }
    
      console.log('Contact tags updated successfully');
   
      return true;
    } catch (error) {
      console.error('Error updating contact tags:', error);
      return false;
    }
  }
  
const formatText = (text: string) => {
  const parts = text.split(/(\*[^*]+\*|\*\*[^*]+\*\*)/g);
  return parts.map((part: string, index: any) => {
 if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={index}>{part.slice(1, -1)}</strong>;
    } else {
      return part;
    }
  });
};
const openEditMessage = (message: Message) => {
  setEditingMessage(message);
  setEditedMessageText(message.text?.body || "");
};

  function formatDate(timestamp: string | number | Date) {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
  
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
  
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }
  const handleEyeClick = () => {
    setIsTabOpen(!isTabOpen);
  };
  useEffect(() => {
    let updatedContacts = [...contacts];
  
    try {
      // Apply group filter if active
      if (isGroupFilterActive) {
        updatedContacts = updatedContacts.filter(contact => contact.chat_id?.includes('@g.us'));
      }
    
      // Apply search query filter
      if (searchQuery) {
        updatedContacts = updatedContacts.filter(contact =>
          contact.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.phone?.includes(searchQuery)
        );
      }
    
      // Apply tag filter
      if (activeTags.length > 0) {
        updatedContacts = updatedContacts.filter(contact =>
          activeTags.every(tag => contact.tags?.includes(tag))
        );
      }
    
      // Sort contacts by pinned status
      updatedContacts.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    
    setFilteredContacts(updatedContacts);
    } catch (error) {
      console.error('Error filtering contacts:', error);
      // Optionally, handle the error in a user-friendly way
    }
  }, [contacts, searchQuery, activeTags, isGroupFilterActive]);
  
  useEffect(() => {
    let updatedContacts = contacts;
    updatedContacts = contacts.filter(contact =>
      contact.contactName?.toLowerCase().includes(searchQuery2.toLowerCase()) ||
      contact.firstName?.toLowerCase().includes(searchQuery2.toLowerCase()) ||
      contact.phone?.includes(searchQuery2)
    );
    setFilteredContactsForForwarding(updatedContacts);
  }, [searchQuery2, contacts]);
  const handleSearchChange = (e: { target: { value: React.SetStateAction<string>; }; }) => {
    setSearchQuery(e.target.value);
  };
  const handleSearchChange2 = (e: { target: { value: React.SetStateAction<string>; }; }) => {
    setSearchQuery2(e.target.value);
  };

  const filterTagContact = (tag: string) => {
    setIsTagged(!isTagged);
    setActiveTags((prevTags) =>
      prevTags.includes(tag) ? prevTags.filter((t) => t !== tag) : [...prevTags, tag]
    );
  };
  const handleSelectMessage = (message: Message) => {
    setSelectedMessages(prevSelectedMessages =>
        prevSelectedMessages.includes(message)
            ? prevSelectedMessages.filter(m => m.id !== message.id)
            : [...prevSelectedMessages, message]
    );
  };
const formatTextForSending = (text: string) => {
  // Step 1: Ensure proper spacing between items
  text = text.replace(/- /g, '\n- ');

  // Step 2: Ensure proper new lines between items
  text = text.replace(/(\w)(?=\w*\()|\b\(/g, '$&\n');

  // Step 3: Add asterisks for emphasis
  text = text.replace(/(?:^|\n)-\s*([^\n]+)/g, '- *$1*');

  // Step 4: Add a new line after every sentence
  text = text.replace(/\.(\s)/g, '.\n$1');

  return text.trim();
};
const handleForwardMessage = async () => {
  if (selectedMessages.length === 0 || selectedContactsForForwarding.length === 0) return;

  try {
      for (const contact of selectedContactsForForwarding) {
          for (const message of selectedMessages) {
              let response;
              if (message.type === 'image') {
                  response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/image/${whapiToken}`, {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                          chatId: contact.chat_id,
                          imageUrl: message.image?.link,
                          caption: message.image?.caption || '',
                      }),
                  });
              } else if (message.type === 'document') {
                  response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/document/${whapiToken}`, {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                          chatId: contact.chat_id,
                          imageUrl: message.document?.link,
                          fileName: message.document?.file_name,
                          mimeType: message.document?.mime_type,
                      }),
                  });
              } else {
                const message_string = message!.text?.body!;
                  response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/text/${contact.chat_id}/${whapiToken}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: message_string,
              
                      }),
                  });
              }
              if (!response.ok) throw new Error('Failed to forward message');
          }
      }

      setIsForwardDialogOpen(false);
      setSelectedMessages([]);
      setSelectedContactsForForwarding([]);
      toast.success('Messages forwarded successfully');
  } catch (error) {
      console.error('Error forwarding messages:', error);
      alert('Failed to forward messages');
  }
};

  const handleOpenForwardDialog = (message: Message) => {
    setSelectedMessageForForwarding(message);
    setIsForwardDialogOpen(true);
  };

  const handleSelectContactForForwarding = (contact: Contact) => {
    setSelectedContactsForForwarding(prevContacts => 
      prevContacts.includes(contact) ? prevContacts.filter(c => c.id !== contact.id) : [...prevContacts, contact]
    );
  };
  const formatTimestamp = (timestamp: number | string | undefined): string => {

    if (!timestamp) {
      return 'Invalid date';
    }
    
    let date: Date;
  
    if (typeof timestamp === 'number') {
      if (isNaN(timestamp)) {
        return 'Invalid date';
      }
      date = new Date(timestamp * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
    } else {
      return 'Invalid date';
    }
  
    try {
      return format(date, 'p');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };
  const handleTagClick = () => {
 
  };
  useEffect(() => {
    const handleKeyDown = (event: { key: string; }) => {
      if (event.key === "Escape") {
        console.log('escape');
        setSelectedContact(null);
        setSelectedChatId(null);
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
  
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  const handleForwardClick = () => {
    setActiveMenu('forward');
  };
  const handleImageUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    setLoading(true);
    const files = event.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        const imageUrl = await uploadFile(file);
        await sendImageMessage(selectedChatId!, imageUrl!, "");
      }
    }
    setLoading(false);
  };
  
  const handleDocumentUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    setLoading(true);
    const files = event.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        const imageUrl = await uploadFile(file);
        await sendDocumentMessage(selectedChatId!, imageUrl!, file.type, file.name, "");
      }
    }
    setLoading(false);
  };
  
  const uploadFile = async (file: any): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, `${file.name}`);
    
    // Upload the file
    await uploadBytes(storageRef, file);
  
    // Get the file's download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };
  
  
  const sendImageMessage = async (chatId: string, imageUrl: string,caption?: string) => {
    try {
      const user = auth.currentUser;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
       companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      const response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/image/${companyData.whapiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          imageUrl: imageUrl,
          caption: caption || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to send image message: ${response.statusText}`);
      }
  
      const data = await response.json();
      fetchMessages(selectedChatId!,companyData.ghl_accessToken);
      console.log('Image message sent successfully:', data);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };
  
  const sendDocumentMessage = async (chatId: string, imageUrl: string,mime_type:string,fileName:string, caption?: string,) => {
    try {
      const user = auth.currentUser;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
       companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      const response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/document/${companyData.whapiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chatId,
          imageUrl: imageUrl,
          mimeType:mime_type,
          fileName:fileName,
          caption: caption || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to send image message: ${response.statusText}`);
      }
  
      const data = await response.json();
      fetchMessages(selectedChatId!,companyData.ghl_accessToken);
      console.log('Image message sent successfully:', data);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };
  const handleCloseForwardDialog = () => {
    setIsForwardDialogOpen(false);
    setSearchQuery2(''); // Clear the search query
  };
  const togglePinConversation = async (chatId: string) => {
    setContacts((prevContacts) => {
      const contactToToggle = prevContacts.find(contact => contact.chat_id === chatId);
      if (!contactToToggle) {
        console.error("Contact not found in state for chatId:", chatId);
        return prevContacts;
      }
  
      const updatedContacts = prevContacts.map((contact) =>
        contact.chat_id === chatId ? { ...contact, pinned: !contact.pinned } : contact
      );
  
      const sortedContacts = [...updatedContacts].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
  
      return sortedContacts;
    });
  
    try {
      const user = auth.currentUser;
      if (!user) return;
  
      const pinnedCollection = collection(firestore, `user/${user.email}/pinned`);
      const contactDocRef = doc(pinnedCollection, chatId);
  
      const contactToToggle = contacts.find(contact => contact.chat_id === chatId);
      if (!contactToToggle) {
        console.error("Contact not found for chatId:", chatId);
        return;
      }
  
      const userDataToSend = { ...contactToToggle, pinned: !contactToToggle.pinned };
  
      if (contactToToggle.pinned) {
        // Unpin the chat
        await deleteDoc(contactDocRef);
        console.log(`Chat ${chatId} unpinned`);
      } else {
        // Pin the chat
        await setDoc(contactDocRef, userDataToSend);
        console.log(`Chat ${chatId} pinned`);
      }
    } catch (error) {
      console.error('Error toggling chat pin state:', error);
    }
  };
  const openImageModal = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setModalImageUrl('');
  };

  // Handle keydown event
  const handleKeyDown = (event: { key: string; }) => {
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
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  useEffect(() => {
    // Add event listener for keydown
    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  const handleRemoveTag = async (contactId: string, tagName: string) => {
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
  
      // Update Firestore
      await updateDoc(doc(firestore, 'companies', companyId, 'contacts', contactId), {
        tags: arrayRemove(tagName)
      });
  
      // Update state
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact.id === contactId
            ? { ...contact, tags: contact.tags!.filter(tag => tag !== tagName) }
            : contact
        )
      );
      const updatedContacts = contacts.map((contact: Contact) =>
        contact.id === contactId
          ? { ...contact, tags: contact.tags!.filter((tag: string) => tag !== tagName) }
          : contact
      );
      const updatedSelectedContact = updatedContacts.find(contact => contact.id === contactId);
      if (updatedSelectedContact) {
        setSelectedContact(updatedSelectedContact);
      }
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
      sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been updated in this session
    
      toast.success('Tag removed successfully!');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag.');
    }
  };
  const adjustHeight = (textarea: HTMLTextAreaElement, reset = false) => {
    if (reset) {
      textarea.style.height = 'auto';
    }
    const lineHeight = 24; // Approximate line height in pixels
    const maxLines = 8;
    const maxHeight = lineHeight * maxLines;

    textarea.style.height = 'auto';
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'scroll';
    } else {
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
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
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
  
      const response = await axios.post(`https://gate.whapi.cloud/messages/text`, {
        to: editingMessage.chat_id,
        body: editedMessageText,
        edit: editingMessage.id,
      }, {
        headers: {
          'Authorization': `Bearer ${companyData.whapiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
  console.log(response);
      if (response.status === 200) {
        toast.success('Message edited successfully');
        fetchMessages(editingMessage.chat_id, companyData.whapiToken);
        setEditingMessage(null);
        setEditedMessageText("");
      } else {
        console.log(response);
      }
    } catch (error) {
     
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };
  const DeleteConfirmationPopup = () => (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Delete message</h3>
              <p>Are you sure you want to delete this message?</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <Button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
           onClick={deleteMessages}
          >
            Delete
          </Button>
          <Button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            onClick={closeDeletePopup}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
  const uploadLocalImageUrl = async (localUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(localUrl);
      const blob = await response.blob();
  
      // Check the blob content
      console.log('Blob type:', blob.type);
      console.log('Blob size:', blob.size);
  
      const storageRef = ref(getStorage(), `${Date.now()}_${blob.type.split('/')[1]}`);
      const uploadResult = await uploadBytes(storageRef, blob);
  
      console.log('Upload result:', uploadResult);
  
      const publicUrl = await getDownloadURL(storageRef);
      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };
  const sendImage = async (imageUrl: string | null, caption: string) => {
    console.log('Image URL:', imageUrl);
    console.log('Caption:', caption);
    setLoading(true);
    if (imageUrl) {
      const publicUrl = await uploadLocalImageUrl(imageUrl);
      console.log(publicUrl);
      if (publicUrl) {
     await sendImageMessage(selectedChatId!, publicUrl, caption);
      }
    }
    setLoading(false);
    //setImageModalOpen2(false);
  };
  
  return (
    
    <div className="flex overflow-hidden bg-gray-100 text-gray-800" style={{ height: '100vh' }}>
       <audio ref={audioRef} src={noti} />
    <div className="flex flex-col min-w-[35%] max-w-[35%] bg-gray-100 border-r border-gray-300">
    <div className="relative hidden sm:block p-2">
    <div className="flex items-center space-x-2">
    {notifications.length > 0 && <NotificationPopup notifications={notifications} />}
    {isDeletePopupOpen && <DeleteConfirmationPopup />}
    <PDFModal isOpen={isPDFModalOpen} onClose={closePDFModal} pdfUrl={pdfUrl} />
    {editingMessage && (
     <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
     <div className="bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
       <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
         <div className="sm:flex sm:items-start">
           <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
             <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Edit message</h3>
             <textarea
               className="w-full h-24 px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-info text-md resize-none overflow-hidden bg-gray-100 text-gray-800"
               placeholder="Edit your message"
               value={editedMessageText}
               onChange={(e) => setEditedMessageText(e.target.value)}
               style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
             />
           </div>
         </div>
       </div>
       <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
         <Button
           type="button"
           className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-500 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
           onClick={handleEditMessage}
         >
           Save
         </Button>
         <Button
           type="button"
           className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
           onClick={cancelEditMessage}
         >
           Cancel
         </Button>
       </div>
     </div>
   </div>
    )}
    {isForwardDialogOpen && (
  <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Forward message to</h3>
            <div className="relative mb-4">
              <input
                type="text"
                className="w-full py-2 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search..."
                value={searchQuery2}
                onChange={handleSearchChange2}
              />
              <Lucide
                icon="Search"
                className="absolute top-2 right-3 w-5 h-5 text-gray-500"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredContactsForForwarding.map((contact, index) => (
                <div
                key={contact.id || `${contact.phone}-${index}`}
                  className="flex items-center p-2 border-b border-gray-200 hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={selectedContactsForForwarding.includes(contact)}
                    onChange={() => handleSelectContactForForwarding(contact)}
                  />
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-300 rounded-full mr-3 text-white">
                      {contact.contactName ? contact.contactName.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="flex-grow">
                      <div className="font-semibold capitalize">{contact.contactName || contact.firstName || contact.phone}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <Button
          type="button"
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          onClick={handleForwardMessage}
        >
          Forward
        </Button>
        <Button
          type="button"
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
          onClick={() => handleCloseForwardDialog()}
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
)} {isFetching && (
  <div className="w-full">
    <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 relative">
      <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
    </div>
    <div className="text-right mt-1">
      <span className="font-semibold truncate">{progress.toFixed(2)}%</span>
    </div>
  </div>
)}
{!isFetching && (
 <div className="relative flex-grow">
 <input
   type="text"
   className="!box w-full py-1 pl-10 pr-4 bg-gray-100 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
   placeholder="Search..."
   value={searchQuery}
   onChange={handleSearchChange}
 />
 <Lucide
   icon="Search"
   className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
 />
</div>
)}
  <div className="flex justify-end space-x-3">
  <Menu as="div" className="relative inline-block text-left">
    <div className="flex items-right space-x-3">
      <Menu.Button as={Button} className="p-2 !box m-0" onClick={handleTagClick}>
        <span className="flex items-center justify-center w-5 h-5">
          <Lucide icon="Filter" className="w-5 h-5" />
        </span>
      </Menu.Button>
    </div>
    <Menu.Items className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
      {tagList.map((tag) => (
        <Menu.Item key={tag.id}>
          <button
            className={`flex items-center w-full text-left p-2 hover:bg-gray-100 rounded-md ${
              activeTags.includes(tag.name) ? 'bg-gray-200' : ''
            }`}
            onClick={() => filterTagContact(tag.name)}
          >
            <Lucide icon="Tag" className="w-4 h-4 mr-2" />
            {tag.name}
          </button>
        </Menu.Item>
      ))}
    </Menu.Items>
  </Menu>
  <Menu as="div" className="relative inline-block text-left">
    <div className="flex items-right space-x-3">
      <Menu.Button as={Button} className="p-2 !box m-0" onClick={handleTagClick}>
        <span className="flex items-center justify-center w-5 h-5">
          <Lucide icon="Users" className="w-5 h-5" />
        </span>
      </Menu.Button>
    </div>
    <Menu.Items className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
      {employeeList.map((tag) => (
        <Menu.Item key={tag.id}>
          <button
            className={`flex items-center w-full text-left p-2 hover:bg-gray-100 rounded-md ${
              activeTags.includes(tag.name) ? 'bg-gray-200' : ''
            }`}
            onClick={() => filterTagContact(tag.name.toLowerCase())}
          >
            <Lucide icon="User" className="w-4 h-4 mr-2" />
            {tag.name}
          </button>
        </Menu.Item>
      ))}
    </Menu.Items>
  </Menu>
  {/* <button 
    className={`p-2 !box m-0`} 
    onClick={() => setIsGroupFilterActive(!isGroupFilterActive)}
  >
    <span className="flex items-center justify-center w-5 h-5">
      <Lucide icon={isGroupFilterActive ? "X" : "Users"} className="w-5 h-5" />
    </span>
  </button> */}
</div>
</div>
          <div className="border-b border-gray-300 mt-4"></div>
       
        </div>
  <div className="flex-1 overflow-y-auto">
    
  {filteredContacts.map((contact, index) => (
  <React.Fragment key={contact.id || `${contact.phone}-${index}`}>
    <div
      className={`m-2 pl-2 pr-3 pb-4 pt-4 rounded-lg cursor-pointer flex items-center space-x-3 group ${
        contact.chat_id !== undefined
          ? selectedChatId === contact.chat_id
            ? 'bg-gray-700 text-white'
            : 'hover:bg-gray-300'
          : selectedChatId === contact.phone
          ? 'bg-gray-700 text-white'
          : 'hover:bg-gray-300'
      }`}
      onClick={() => selectChat(contact.chat_id!, contact.id!)}
    >
      <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center text-white text-xl">
      {contact && contact.chat_pic_full ? (
  <img src={contact.chat_pic_full} className="w-full h-full rounded-full object-cover" />
) : (
  contact && contact.chat_id && contact.chat_id.includes('@g.us') ? (
    <Lucide icon="Users" className="w-6 h-6 text-white" />
  ) : (
    <Lucide icon="User" className="w-6 h-6 text-white" />
  )
)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
        <span className="font-semibold capitalize truncate w-36">{contact.contactName ?? contact.firstName ?? contact.phone}</span>

          <span className="text-xs flex items-center space-x-2">
          <div className="ml-2 flex flex-wrap">
  {(() => {
    const employeeTags = contact.tags?.filter(tag =>
      employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
    ) || [];

    const otherTags = contact.tags?.filter(tag =>
      !employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
    ) || [];

    return (
      <>
        {employeeTags.length > 0 && (
          <Tippy content={employeeTags.join(', ')}>
            <span className="bg-green-100 text-green-800 text-xs font-semibold mr-2 mb-2 px-2.5 py-0.5 rounded-full cursor-pointer">
              <Lucide icon="User" className="w-4 h-4 inline-block" />
              <span className="ml-1">{employeeTags.length}</span>
            </span>
          </Tippy>
        )}
        {otherTags.length > 0 && (
          <Tippy content={otherTags.join(', ')}>
            <span className="bg-green-100 text-primary text-xs font-semibold mr-2 mb-2 px-2.5 py-0.5 rounded-full cursor-pointer">
              <Lucide icon="Tag" className="w-4 h-4 inline-block" />
              <span className="ml-1">{otherTags.length}</span>
            </span>
          </Tippy>
        )}
      </>
    );
  })()}
</div>

            <button
              className={`text-md font-medium mr-2 ${
                contact.pinned ? 'text-blue-500' : 'text-gray-500 group-hover:text-blue-500'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                togglePinConversation(contact.chat_id!);
              }}
            >
              {contact.pinned ? (
                <Pin size={16} color="#2D2D2D" strokeWidth={1.25} absoluteStrokeWidth fill="#2D2D2D" />
              ) : (
                <PinOff size={16} color="currentColor" className="group-hover:block hidden" strokeWidth={1.25} absoluteStrokeWidth />
              )}
            </button>
            {contact.last_message?.createdAt || contact.last_message?.timestamp
              ? formatDate(contact.last_message.createdAt || contact.last_message.timestamp * 1000)
              : 'No Messages'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm truncate" style={{ width: '200px' }}>
            {(contact.last_message?.type === "text") ? contact.last_message?.text?.body ?? "No Messages" : "Photo"}
          </span>
          {contact.unreadCount! > 0 && (
            <span className="bg-primary text-white text-xs rounded-full px-2 py-1 ml-2">{contact.unreadCount}</span>
          )}
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              value=""
              className="sr-only peer"
              checked={contact.tags?.includes("stop bot")}
              onChange={() => toggleStopBotLabel(contact, index)}
            />
            <div className="mt-1 ml-0 relative w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-400 peer-checked:bg-primary">
            </div>
          </label>
        </div>
      </div>
    </div>
    {index < filteredContacts.length - 1 && <hr className="my-2 border-gray-300" />}
  </React.Fragment>
))}
  </div>
</div>
      <div className="flex flex-col w-full sm:w-3/4 bg-slate-300 relative">
      {selectedContact && (
  <div className="flex items-center justify-between p-1 border-b border-gray-300 bg-gray-100">
    <div className="flex items-center">
      <div className="w-10 h-10 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-3 ml-2">
        {selectedContact.chat_pic_full ? (
          <img src={selectedContact.chat_pic_full} className="w-full h-full rounded-full object-cover" />
        ) : (
          selectedContact.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"
        )}
      </div>
      <div>
        <div className="font-semibold text-gray-800 capitalize">{selectedContact.contactName || selectedContact.firstName || selectedContact.phone}</div>
        <div className="text-sm text-gray-600">{selectedContact.phone}</div>
      </div>
    </div>
    <div className="flex items-center space-x-3">
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button as={Button} className="p-2 !box m-0">
          <span className="flex items-center justify-center w-5 h-5">
            <Lucide icon="Users" className="w-5 h-5" />
          </span>
        </Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
          {employeeList.map((tag) => (
            <Menu.Item key={tag.id}>
              <button
                className={`flex items-center w-full text-left p-2 hover:bg-gray-100 rounded-md ${
                  activeTags.includes(tag.name) ? 'bg-gray-200' : ''
                }`}
                onClick={() => handleAddTagToSelectedContacts(tag.name, selectedContact)}
              >
                <Lucide icon="User" className="w-4 h-4 mr-2" />
                {tag.name}
              </button>
            </Menu.Item>
          ))}
        </Menu.Items>
      </Menu>
      <Menu as="div" className="relative inline-block text-left">
        <Menu.Button as={Button} className="p-2 !box m-0">
          <span className="flex items-center justify-center w-5 h-5">
            <Lucide icon="Tag" className="w-5 h-5" />
          </span>
        </Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
          {tagList.map((tag) => (
            <Menu.Item key={tag.id}>
              <button
                className={`flex items-center w-full text-left p-2 hover:bg-gray-100 rounded-md ${
                  activeTags.includes(tag.name) ? 'bg-gray-200' : ''
                }`}
                onClick={() => handleAddTagToSelectedContacts(tag.name, selectedContact)}
              >
                <Lucide icon="User" className="w-4 h-4 mr-2" />
                {tag.name}
              </button>
            </Menu.Item>
          ))}
        </Menu.Items>
      </Menu>
      <button className="p-2 m-0 !box" onClick={handleEyeClick}>
        <span className="flex items-center justify-center w-5 h-5">
          <Lucide icon={isTabOpen ? "X" : "Eye"} className="w-5 h-5" />
        </span>
      </button>
    </div>
  </div>
)}
           
        <div className="flex-1 overflow-y-auto p-4" 
       style={{
        paddingBottom: "150px",
        backgroundImage: selectedContact 
          ? 'url(https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/wallpaper_1.png?alt=media&token=0391060c-fcb4-4760-8172-d8f341127ea6)' 
          : 'none',
        backgroundColor: selectedContact ? 'transparent' : 'bg-slate-400',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    ref={messageListRef}>
           
        {isLoading2 && (
                <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50">
                  <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
                    <div role="status">
                    <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
          <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
          <div className="mt-2 text-xs text-center">Fetching Data...</div>
        </div>
                    </div>
                  </div>
                </div>
              )}
  {selectedChatId && (
    messages
      .filter((message) => message.type !== 'action') // Filter out action type messages
      .slice()
      .reverse()
      .map((message, index,array) => {
        const previousMessage = messages[index - 1];
        const showDateHeader =
          index === 0 ||
          !isSameDay(
            new Date(array[index - 1]?.createdAt || array[index - 1]?.dateAdded),
            new Date(message.createdAt || message.dateAdded)
          );
        return (
          <React.Fragment key={message.id}>
           {showDateHeader && (
          <div className="flex justify-center my-4">
            <div className="inline-block bg-white text-gray-800 font-bold py-1 px-4 rounded-lg shadow-md">
              {formatDateHeader(message.createdAt || message.dateAdded)}
            </div>
          </div>
        )}
            <div
              className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}
              style={{
                maxWidth: message.type === 'document' ? '90%' : '70%',
                width: `${
                  message.type === 'document'
                    ? '400'
                    : message.type !== 'text'
                    ? '320'
                    : message.text?.body
                    ? Math.min(Math.max(message.text.body.length, message.text?.context?.quoted_content?.body?.length || 0) * 10, 320)
                    : '100'
                }px`,
                minWidth: '150px',
              }}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {message.chat_id.includes('@g.us') && (
                <div className="pb-1 text-gray-400  font-medium">{message.from_name||'+'+message.from}</div>
              )}
              {message.type === 'text' && message.text?.context && (
                <div className="p-2 mb-2 rounded bg-gray-300">
                  <div className="text-sm font-medium">{message.text.context.quoted_author || ''}</div>
                  <div className="text-sm">{message.text.context.quoted_content?.body || ''}</div>
                </div>
              )}
              {message.type === 'text' && (
                <div className="whitespace-pre-wrap break-words text-black">
                  {formatText(message.text?.body || '')}
                </div>
              )}
              {message.type === 'image' && message.image && (
                <div className="p-0 message-content image-message">
                  <img
                    src={message.image.link}
                    alt="Image"
                    className="rounded-lg message-image cursor-pointer"
                    style={{ maxWidth: '300px' }}
                    onClick={() => openImageModal(message.image?.link || '')}
                  />
                  <div className="caption">{message.image.caption}</div>
                </div>
              )}
              {message.type === 'video' && message.video && (
                <div className="video-content p-0 message-content image-message">
                  <video
                    controls
                    src={message.video.link}
                    className="rounded-lg message-image cursor-pointer"
                    style={{ maxWidth: '300px' }}
                  />
                  <div className="caption text-black">{message.video.caption}</div>
                </div>
              )}
              {message.type === 'gif' && message.gif && (
                <div className="gif-content p-0 message-content image-message">
                  <img
                    src={message.gif.link}
                    alt="GIF"
                    className="rounded-lg message-image cursor-pointer"
                    style={{ maxWidth: '300px' }}
                    onClick={() => openImageModal(message.gif?.link || '')}
                  />
                  <div className="caption text-black">{message.gif.caption}</div>
                </div>
              )}
              {message.type === 'audio' && message.audio && (
                <div className="audio-content p-0 message-content image-message">
                  <audio controls src={message.audio.link} className="rounded-lg message-image cursor-pointer" />
                </div>
              )}
              {message.type === 'voice' && message.voice && (
                <div className="voice-content p-0 message-content image-message">
                  <audio controls src={message.voice.link} className="rounded-lg message-image cursor-pointer" />
                </div>
              )}
              {message.type === 'document' && message.document && (
                <div className="document-content flex flex-col items-center p-4 rounded-md shadow-md">
                  <iframe
                    src={message.document.link}
                    width="100%"
                    height="500px"
                    title="PDF Document"
                    className="border rounded cursor-pointer"
                    onClick={() => openPDFModal(message.document?.link || '')}
                  />
                  <div className="flex-1 text-justify mt-3">
                    <div className="font-semibold text-black">{message.document.file_name}</div>
                    <div>
                      {message.document.page_count} page
                      {message.document.page_count > 1 ? 's' : ''} • PDF •{' '}
                      {(message.document.file_size / 1024).toFixed(2)} kB
                    </div>
                  </div>
                  <button
                    onClick={() => openPDFModal(message.document!.link)}
                    className="mt-3"
                  >
                    <Lucide icon="ExternalLink" className="w-6 h-6 text-white-700" />
                  </button>
                </div>
              )}
              {message.type === 'link_preview' && message.link_preview && (
                <div className="link-preview-content p-0 message-content image-message rounded-lg overflow-hidden text-black">
                  <a href={message.link_preview.body} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={message.link_preview.preview}
                      alt="Preview"
                      className="w-full"
                    />
                    <div className="p-2">
                      <div className="font-bold text-lg">{message.link_preview.title}</div>
                      <div className="text-sm text-black">{message.link_preview.description}</div>
                      <div className="text-blue-500 mt-1">{message.link_preview.body}</div>
                    </div>
                  </a>
                </div>
              )}
              {message.type === 'sticker' && message.sticker && (
                <div className="sticker-content p-0 message-content image-message">
                  <img
                    src={message.sticker.link}
                    alt="Sticker"
                    className="rounded-lg message-image cursor-pointer"
                    style={{ maxWidth: '150px' }}
                    onClick={() => openImageModal(message.sticker?.link || '')}
                  />
                </div>
              )}
              {message.type === 'location' && message.location && (
                <div className="location-content p-0 message-content image-message">
                  <div className="text-sm">Location: {message.location.latitude}, {message.location.longitude}</div>
                </div>
              )}
              {message.type === 'poll' && message.poll && (
                <div className="poll-content p-0 message-content image-message">
                  <div className="text-sm">Poll: {message.poll.title}</div>
                </div>
              )}
              {message.type === 'hsm' && message.hsm && (
                <div className="hsm-content p-0 message-content image-message">
                  <div className="text-sm">HSM: {message.hsm.title}</div>
                </div>
              )}
              {message.type === 'action' && message.action && (
                <div className="action-content flex flex-col p-4 rounded-md shadow-md">
                  {message.action.type === 'delete' ? (
                    <div className="text-gray-400">This message was deleted</div>
                  ) : (
                    /* Handle other action types */
                    <div>{message.action.emoji}</div>
                  )}
                </div>
              )}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex items-center space-x-2 mt-1">
                  {message.reactions.map((reaction, index) => (
                    <div key={index} className="text-gray-500 text-sm flex items-center space-x-1">
                      <span
                        className="inline-flex items-center justify-center border border-white rounded-full"
                        style={{ padding: '10px', backgroundColor: '#F0F0F0' }}
                      >
                        {reaction.emoji}
                      </span>
                    
                    </div>
                  ))}
                </div>
              )}

        <div className="message-timestamp text-xs text-black mt-1">
          {formatTimestamp(message.createdAt || message.dateAdded)}
          {message.name && (
    <span className="ml-2 text-gray-400">{message.name}</span>
  )}
          {(hoveredMessageId === message.id || selectedMessages.includes(message)) && (
            <div className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-5 w-5 text-blue-500 transition duration-150 ease-in-out rounded-full ml-2"
                checked={selectedMessages.includes(message)}
                onChange={() => handleSelectMessage(message)}
              />
           <button
                  className="ml-2 text-blue-500 hover:text-gray-400 fill-current"
                  onClick={() => setReplyToMessage(message)}
                >
                  <Lucide icon="MessageSquare" className="w-5 h-5" />
                </button>
               {message.from_me && new Date().getTime() - new Date(message.createdAt).getTime() < 15 * 60 * 1000 && (
                <button
                  className="ml-2 text-white hover:text-gray-400 fill-current"
                  onClick={() => openEditMessage(message)}
                >
                  <Lucide icon="Pencil" className="w-5 h-5" />
                </button>
              )}
         
            </div>
          )}
        </div>
            </div>
          </React.Fragment>
        );
      })
  )}
        </div>

        <div className="absolute bottom-0 left-0 w-500px !box m-1 py-1 px-2">
        {replyToMessage && (
    <div className="p-2 mb-2 rounded bg-gray-200 flex items-center justify-between">
      <div>
        <div className="font-semibold">{replyToMessage.from_name}</div>
        <div>
          {replyToMessage.type === 'text' && replyToMessage.text?.body}
          {replyToMessage.type === 'link_preview' && replyToMessage.link_preview?.body}
          {replyToMessage.type === 'image' && <img src={replyToMessage.image?.link} alt="Image" style={{ maxWidth: '200px' }} />}
          {replyToMessage.type === 'video' && <video controls src={replyToMessage.video?.link} style={{ maxWidth: '200px' }} />}
          {replyToMessage.type === 'gif' && <img src={replyToMessage.gif?.link} alt="GIF" style={{ maxWidth: '200px' }} />}
          {replyToMessage.type === 'audio' && <audio controls src={replyToMessage.audio?.link} />}
          {replyToMessage.type === 'voice' && <audio controls src={replyToMessage.voice?.link} />}
          {replyToMessage.type === 'document' && <iframe src={replyToMessage.document?.link} width="100%" height="200px" />}
          {replyToMessage.type === 'sticker' && <img src={replyToMessage.sticker?.link} alt="Sticker" style={{ maxWidth: '150px' }} />}
          {replyToMessage.type === 'location' && (
            <div>
              Location: {replyToMessage.location?.latitude}, {replyToMessage.location?.longitude}
            </div>
          )}
          {replyToMessage.type === 'poll' && <div>Poll: {replyToMessage.poll?.title}</div>}
          {replyToMessage.type === 'hsm' && <div>HSM: {replyToMessage.hsm?.title}</div>}
        </div>
      </div>
      <button onClick={() => setReplyToMessage(null)}>
        <Lucide icon="X" className="w-5 h-5" />
      </button>
    </div>
  )}
<div className="flex items-center w-full">
  <button className="p-2 m-0 !box" onClick={() => setEmojiPickerOpen(!isEmojiPickerOpen)}>
    <span className="flex items-center justify-center w-5 h-5">
      <Lucide icon="Smile" className="w-5 h-5" />
    </span>
  </button>
  <Menu as="div" className="relative inline-block text-left p-2">
    <div className="flex items-center space-x-3">
      <Menu.Button as={Button} className="p-2 !box m-0" onClick={handleTagClick}>
        <span className="flex items-center justify-center w-5 h-5">
          <Lucide icon="Paperclip" className="w-5 h-5" />
        </span>
      </Menu.Button>
    </div>
    <Menu.Items className="absolute left-0 bottom-full mb-2 w-40 bg-white shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
      <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 rounded-md">
        <label htmlFor="imageUpload" className="flex items-center cursor-pointer">
          <Lucide icon="Image" className="w-4 h-4 mr-2" />
          Image
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            multiple
          />
        </label>
      </button>
      <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 rounded-md">
        <label htmlFor="documentUpload" className="flex items-center cursor-pointer">
          <Lucide icon="File" className="w-4 h-4 mr-2" />
          Document
          <input
            type="file"
            id="documentUpload"
            accept="application/pdf"
            className="hidden"
            onChange={handleDocumentUpload}
            multiple
          />
        </label>
      </button>
    </Menu.Items>
  </Menu>
  <button className="p-2 m-0 !box" onClick={handleQR}>
    <span className="flex items-center justify-center w-5 h-5">
      <Lucide icon='Zap' className="w-5 h-5" />
    </span>
  </button>
  <textarea
  ref={textareaRef}
  className="flex-grow h-10 px-2 py-1.5 m-1 ml-2 border border-gray-300 rounded-lg focus:outline-none focus:border-info text-md resize-none overflow-hidden bg-gray-100 text-gray-800"
  placeholder="Type a message"
  value={newMessage}
  onChange={(e) => {
    setNewMessage(e.target.value);
    adjustHeight(e.target);
  }}
  rows={1}
  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
  onKeyDown={(e) => {
    const target = e.target as HTMLTextAreaElement;
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        e.preventDefault();
        setNewMessage((prev) => prev + '\n');
      } else {
        e.preventDefault();
        if (selectedIcon === 'ws') {
          handleSendMessage();
        } else {
          sendTextMessage(selectedContact.id, newMessage, selectedContact);
        }
        setNewMessage('');
        adjustHeight(target, true); // Reset height after sending message
      }
    }
  }}
  onPaste={(e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const url = URL.createObjectURL(blob);
            setPastedImageUrl(url);
            setImageModalOpen2(true);
          }
          break;
        }
      }
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
      const url = URL.createObjectURL(file);
      setPastedImageUrl(url);
      setImageModalOpen2(true);
    }
  }}
/>



</div>

          {isEmojiPickerOpen && (
         <div className="absolute bottom-20 left-2">
       <EmojiPicker onEmojiClick={handleEmojiClick} />
       </div>
      )}
        </div>
      </div>
    
      {selectedMessages.length > 0 && (
      <div className="fixed bottom-20 right-10 space-x-4">
        <button
          className="bg-blue-800 text-white px-4 py-3 rounded-xl shadow-lg"
          onClick={() => setIsForwardDialogOpen(true)}>
          Forward
        </button>

        <button
      className="bg-red-800 text-white px-4 py-3 rounded-xl shadow-lg"
      onClick={openDeletePopup}>
      Delete
    </button>
        <button
          className="bg-gray-700 text-white px-4 py-3 rounded-xl shadow-lg"
          onClick={() => setSelectedMessages([])}
          onKeyDown={handleKeyDown}>
          Cancel
        </button>
      </div>
    )}
{isTabOpen && (
  <div className="absolute top-0 right-0 h-full w-full md:w-1/3 bg-white border-l border-gray-300 overflow-y-auto z-50">
    <div className="p-6">
      <div className="flex items-center justify-between p-4 border-b border-gray-300 bg-gray-100">
        <div className="flex items-center">
          <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
          {selectedContact.chat_pic_full ? (
          <img src={selectedContact.chat_pic_full} className="w-full h-full rounded-full object-cover" />
        ) : (
          selectedContact.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"
        )}
          </div>
          <div>
            <div className="font-semibold text-gray-800 capitalize">{selectedContact.contactName || selectedContact.firstName || selectedContact.phone}</div>
            <div className="text-sm text-gray-600">{selectedContact.phone}</div>
          </div>
        </div>
        <button onClick={handleEyeClick} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 focus:outline-none">
          <Lucide icon="X" className="w-6 h-6 text-gray-800" />
        </button>
      </div>
      <div className="mt-6">
        <p className="font-semibold text-lg mb-4">Contact Info</p>
        <div className="space-y-2 text-gray-700">
        <p>
  <span className="font-semibold text-blue-600">Tags:</span>
  <div className="flex flex-wrap mt-2">
    {selectedContact.tags.length > 0 ? (
      selectedContact.tags.map((tag: string, index: number) => (
        <div key={index} className="flex items-center mr-2 mb-2">
          <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded border border-blue-400 mr-1">{tag}</span>
          <button
            className="p-1"
            onClick={() => handleRemoveTag( selectedContact.id, tag)}
          >
            <Lucide icon="Trash" className="w-4 h-4 text-red-500 hover:text-red-700" />
          </button>
        </div>
      ))
    ) : (
      'Unassigned'
    )}
  </div>
</p>
          <p><span className="font-semibold text-blue-600">Phone:</span> {selectedContact.phone}</p>
          <p><span className="font-semibold text-blue-600">Email:</span> {selectedContact.email || 'N/A'}</p>
          <p><span className="font-semibold text-blue-600">Company:</span> {selectedContact.companyName || 'N/A'}</p>
          <p><span className="font-semibold text-blue-600">Address:</span> {selectedContact.address1 || 'N/A'}</p>
          <p><span className="font-semibold text-blue-600">First Name:</span> {selectedContact.contactName ?? selectedContact.firstName}</p>
          <p><span className="font-semibold text-blue-600">Last Name:</span> {selectedContact.lastName}</p>
          <p><span className="font-semibold text-blue-600">Website:</span> {selectedContact.website || 'N/A'}</p>
          {/* Add more fields as necessary */}
        </div>
      </div>
    </div>
  </div>
)}
 {isQuickRepliesOpen && (
  <div className="absolute bottom-20 left-2 w-full max-w-md bg-gray-100 p-2 rounded-md shadow-lg mt-2">
    <div className="flex items-center mb-4">
      <textarea
        className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Add new quick reply"
        value={newQuickReply}
        onChange={(e) => setNewQuickReply(e.target.value)}
        rows={3}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      />
      <button className="p-2 m-1 !box" onClick={addQuickReply}>
        <span className="flex items-center justify-center w-5 h-5">
          <Lucide icon="Plus" className="w-5 h-5" />
        </span>
      </button>
    </div>
    <div className="max-h-60 overflow-y-auto">
      {quickReplies.map(reply => (
        <div key={reply.id} className="flex items-center justify-between mb-2 bg-gray-50">
          {editingReply?.id === reply.id ? (
            <>
              <textarea
                className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingReply.text}
                onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              />
              <button className="p-2 m-1 !box" onClick={() => updateQuickReply(reply.id, editingReply.text)}>
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Save" className="w-5 h-5" />
                </span>
              </button>
            </>
          ) : (
            <>
              <span
                className="px-4 py-2 flex-grow text-lg cursor-pointer"
                onClick={() => handleQRClick(reply.text)}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {reply.text}
              </span>
              <div>
                <button className="p-2 m-1 !box" onClick={() => setEditingReply(reply)}>
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide icon="Eye" className="w-5 h-5" />
                  </span>
                </button>
                <button className="p-2 m-1 !box text-red-500" onClick={() => deleteQuickReply(reply.id)}>
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide icon="Trash" className="w-5 h-5" />
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
)}

      <ImageModal isOpen={isImageModalOpen} onClose={closeImageModal} imageUrl={modalImageUrl} />
      <ImageModal2 isOpen={isImageModalOpen2} onClose={() => setImageModalOpen2(false)} imageUrl={pastedImageUrl} onSend={sendImage} />

      <ToastContainer />

    </div>
  );
};
interface ImageModalProps2 {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSend: (url: string | null, caption: string) => void;
}

const ImageModal2: React.FC<ImageModalProps2> = ({ isOpen, onClose, imageUrl, onSend }) => {
  const [caption, setCaption] = useState('');


  const handleSendClick = () => {
    setCaption('');
    onSend(imageUrl, caption);
   onClose(); // Close the modal after sending
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-400 bg-opacity-75" onClick={onClose}>
      <div
        className="relative bg-slate-400 rounded-lg shadow-lg w-[800px] h-[600px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <button
            className="text-black hover:text-gray-800"
            onClick={onClose}
          >
            <Lucide icon="X" className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-slate-400 p-4 rounded-lg mb-4 flex justify-center items-center" style={{ height: '70%' }}>
          <img
            src={imageUrl}
            alt="Modal Content"
            className="rounded-md"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
        <div className="flex items-center bg-slate-500 rounded-lg p-2">
          <input
            type="text"
            placeholder="Add a caption"
            className="flex-grow bg-white text-gray-800 p-2 rounded-lg focus:outline-none"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            className="ml-2 bg-primary text-white p-2 rounded-lg"
            onClick={handleSendClick}
          >
            <Lucide icon="Send" className="w-5 h-5" />
          </button>
         
        </div>
      </div>
    </div>
  );
};
const NotificationPopup: React.FC<{ notifications: any[] }> = ({ notifications: initialNotifications }) => {
  const [notifications, setNotifications] = useState(initialNotifications);
  const navigate = useNavigate(); // Initialize useNavigate
  const handleDelete = (index: number) => {
    setNotifications(notifications.filter((_, i) => i !== index));
  };
  const handleNotificationClick = (chatId: string,index: number) => {
    setNotifications(notifications.filter((_, i) => i !== index));
    navigate(`/chat/?chatId=${chatId}`);
  };
  
  return (
    <div className="fixed top-5 right-10 z-50">
      {notifications.map((notification, index) => (
        <div key={index} className="relative bg-white rounded-lg shadow-lg mb-2 px-4 py-2" style={{ width: '250px' }}>
         <button
            className="absolute top-1 left-1 text-black hover:text-gray-800 p-2"
            onClick={() => handleDelete(index)}
          >
            <Lucide icon="X" className="w-4 h-4" />
          </button>
          <div className="flex justify-between items-center ">
            <div className="flex-grow px-10">
              <div className="font-semibold text-primary">{notification.from_name}</div>
              <div className="text-gray-700">{notification.text.body}</div>
            </div>
            <div className="mx-2 h-full flex items-center">
              <div className="border-l border-gray-300 h-12"></div>
            </div>
            <button 
            className="bg-primary text-white py-1 px-4 rounded"
            onClick={() => handleNotificationClick(notification.chat_id,index)}
            >
              Show</button>
          </div>
        </div>
      ))}
    </div>
  );
};




export default Main;