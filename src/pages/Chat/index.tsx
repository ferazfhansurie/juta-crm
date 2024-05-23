import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, onSnapshot, setDoc, getDocs, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import axios from "axios";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { Dialog, Menu } from "@/components/Base/Headless";
import { Link } from "react-router-dom";
import { FormInput } from "@/components/Base/Form";
import { format } from 'date-fns';
import { access } from "fs";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { time } from "console";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
}
interface Contact {
  conversation_id: string;
  additionalEmails: string[];
  address1: string | null;
  assignedTo: string | null;
  businessId: string | null;
  city: string | null;
  companyName: string | null;
  contactName: string;
  country: string;
  customFields: any[];
  dateAdded: string;
  dateOfBirth: string | null;
  dateUpdated: string;
  dnd: boolean;
  dndSettings: any;
  email: string | null;
  firstName: string;
  followers: string[];
  id: string;
  lastName: string;
  locationId: string;
  phone: string | null;
  postalCode: string | null;
  source: string | null;
  state: string | null;
  tags: string[];
  type: string;
  website: string | null;
  chat: Chat[];
  last_message?: Message | null;
  chat_id: string;
  unreadCount:number;
}
interface GhlConfig {
  ghl_id: string;
  ghl_secret: string;
  refresh_token: string;
  access_token: string;
  location_id: string;
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
  dateAdded: number;
  timestamp: number;
  id: string;
  text?: { body: string | "" };
  from_me?: boolean;
  createdAt: number;
  type?: string;
  image?: { link?: string; caption?: string };
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
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isLoading, setLoading] = useState<boolean>(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [stopBotLabelCheckedState, setStopBotLabelCheckedState] = useState<boolean[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedMessage2, setSelectedMessage2] = useState(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [isTagged, setIsTagged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [filteredContacts, setFilteredContacts] = useState(contacts);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const myMessageClass = "bg-blue-500 text-white rounded-md p-2 self-end ml-auto text-right";
  const otherMessageClass = "bg-gray-700 text-white rounded-md p-2 self-start text-left";
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
  let companyId = '014';
  let user_name = '';
  let user_role='2';

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
    const unsubscribe = onSnapshot(collection(firestore, 'message'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const messageData = change.doc.data();
          messageData.messages.forEach(async (message: any) => {
            if (selectedChatId === message.chat_id) {
              fetchMessagesBackground(selectedChatId!, whapiToken!);
            } else {
              const user = auth.currentUser;
              const docUserRef = doc(firestore, 'user', user?.email!);
              const docUserSnapshot = await getDoc(docUserRef);
              if (!docUserSnapshot.exists()) {
                console.log('No such document!');
                return;
              }
              const dataUser = docUserSnapshot.data();
              const newCompanyId = dataUser.companyId;
              const docRef = doc(firestore, 'companies', newCompanyId);
              const docSnapshot = await getDoc(docRef);
              if (!docSnapshot.exists()) {
                console.log('No such document!');
                return;
              }
              const data = docSnapshot.data();
              setGhlConfig({
                ghl_id: data.ghl_id,
                ghl_secret: data.ghl_secret,
                refresh_token: data.refresh_token,
                access_token: data.access_token,
                location_id: data.location_id,
                whapiToken: data.whapiToken,
              });
              user_name = dataUser.name;
              fetchContactsBackground(data.whapiToken,data.location_id,data.access_token,user_name)
             // await fetchMessagesBackground(selectedChatId!, whapiToken!);
            }
          });
        }
      });
    });
    return () => unsubscribe();
  }, [companyId, selectedChatId]);

  async function fetchConfigFromDatabase() {
    const user = auth.currentUser;
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document!');
        return;
       }
      const dataUser = docUserSnapshot.data() as UserData;
    
      setUserData(dataUser);
      user_role =dataUser.role;
      companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const data = docSnapshot.data();
  setGhlConfig({
        ghl_id: data.ghl_id,
        ghl_secret: data.ghl_secret,
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        location_id: data.location_id,
        whapiToken: data.whapiToken,
      });
     
  setToken(data.whapiToken);
      user_name = dataUser.name;
      fetchContacts(data.whapiToken, data.location_id, data.access_token, dataUser.name,dataUser.role);
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }

  const selectChat = async (chatId: string,id?:string) => {
    setContacts(prevContacts =>
      prevContacts.map(contact =>
        contact.chat_id === chatId ? { ...contact, unreadCount: 0 } : contact
      )
    );
    const contact = contacts.find(contact => contact.chat_id === chatId || contact.id === chatId);
    setSelectedContact(contact);
    if(chatId === undefined && id !== undefined){
      setSelectedChatId(id);
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(firestore, 'user', user.email!);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const notifications = userData?.notifications || [];
            const updatedNotifications = notifications.map((notification: any) => {
              if (notification.chat_id === id) {
                return { ...notification, read: true };
              }
              return notification;
            });
    
            // Update the user's notifications in the database
            await setDoc(userRef, { notifications: updatedNotifications }, { merge: true });
          }
        }
      } catch (error) {
        console.error('Error updating notifications:', error);
      }
    }else{
      setSelectedChatId(chatId);
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(firestore, 'user', user.email!);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const notifications = userData?.notifications || [];
            const updatedNotifications = notifications.map((notification: any) => {
              if (notification.chat_id === chatId) {
                return { ...notification, read: true };
              }
              return notification;
            });
    
            // Update the user's notifications in the database
            await setDoc(userRef, { notifications: updatedNotifications }, { merge: true });
          }
        }
      } catch (error) {
        console.error('Error updating notifications:', error);
      }
    }
  };
  const fetchTags = async (token:string,location:string) => {
    try {
      const options = {
        method: 'GET',
        url: `https://services.leadconnectorhq.com/locations/${location}/tags`,
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28',
        },
      };
      const response = await axios.request(options);
      setTagList(response.data.tags);
    } catch (error) {
      console.error('Error searching tags:', error);
      return [];
    }
  
  };
  const fetchContacts = async (whapiToken: any, locationId: string, ghlToken: string, user_name: string, role: string) => {
    try {
        setLoading(true);
        // Parallelize initial fetch operations including fetchTags
        const [tags, chatResponse, conversations, contacts, employeeSnapshot, enquirySnapshot] = await Promise.all([
            fetchTags(ghlToken, locationId),
            fetch(`https://buds-359313.et.r.appspot.com/api/chats/${whapiToken}`),
            searchConversations(ghlToken, locationId),
            searchContacts(ghlToken, locationId),
            getDocs(collection(firestore, `companies/${companyId}/employee`)),
            getDocs(collection(firestore, `companies/${companyId}/conversations`))
        ]);

        if (!chatResponse.ok) throw new Error('Failed to fetch chats');
        const chatData = await chatResponse.json();
        const user = auth.currentUser;

        const docUserRef = doc(firestore, 'user', user?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
            console.log('No such document!');
            return;
        }
        const dataUser = docUserSnapshot.data() as UserData;

        user_role = dataUser.role;

        // Process chat data
        const mappedChats = chatData.chats.map((chat: { id: string; last_message: any; name: any; }) => {
            if (!chat.id) return null;
            const phoneNumber = `+${chat.id.split('@')[0]}`;
            let contact = contacts.find(contact => contact.phone === phoneNumber);
            let unreadCount = 0;
            if (dataUser.notifications !== undefined) {
                unreadCount = dataUser.notifications.filter((notif: { chat_id: string; read: any; }) => notif.chat_id === chat.id && !notif.read).length;
            }

            if (contact) {
                contact.chat_id = chat.id;
                contact.last_message = chat.last_message;
                contact.chat = chat;
                contact.unreadCount = unreadCount ?? 0;
                contact.id = contact.id;
            }
            return {
                ...chat,
                tags: contact ? contact.tags : [],
                name: contact ? contact.contactName : chat.name,
                lastMessageBody: '',
                id: chat.id,
                contact_id: contact ? contact.id : "",
                unreadCount,
            };
        }).filter(Boolean);

        // Merge WhatsApp contacts with existing contacts
        mappedChats.forEach((chat: { id: string; last_message: any; unreadCount: any; tags: any; contact_id: any; name: any; }) => {
            const phoneNumber = `+${chat.id.split('@')[0]}`;
            const existingContact = contacts.find(contact => contact.phone === phoneNumber);
            if (existingContact) {
                existingContact.chat_id = chat.id;
                existingContact.last_message = chat.last_message || existingContact.last_message;
                existingContact.chat = chat;
                existingContact.unreadCount = (existingContact.unreadCount || 0) + chat.unreadCount;
                existingContact.tags = [...new Set([...existingContact.tags, ...chat.tags])];
            } else {
                contacts.push({
                    id: chat.contact_id,
                    phone: phoneNumber,
                    contactName: chat.name,
                    chat_id: chat.id,
                    last_message: chat.last_message || null,
                    chat: chat,
                    tags: chat.tags,
                    conversation_id: chat.id,
                    unreadCount: chat.unreadCount,
                });
            }
        });

        // Merge and update contacts with conversations
             contacts.forEach(contact => {
            const matchedConversation = conversations.find(conversation => conversation.contactId === contact.id);
            if (matchedConversation) {
                contact.conversation_id = matchedConversation.id;
                contact.chat_id = contact.chat_id || matchedConversation.id;
                contact.conversations = contact.conversations || [];
                contact.conversations.push(matchedConversation);
                if (!contact.last_message) {
                    contact.last_message = {
                        id: matchedConversation.id,
                        text: { body: matchedConversation.lastMessageBody },
                        from_me: matchedConversation.lastMessageDirection === 'outbound',
                        createdAt: matchedConversation.lastMessageDate,
                        type: matchedConversation.lastMessageType,
                        image: undefined,
                    };
                }
            }
        });

        // Ensure all contacts are unique and filter those with last messages
  

        // Fetch and update enquiries
        const employeeListData: Employee[] = [];
        employeeSnapshot.forEach((doc) => {
            employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
        });
        setEmployeeList(employeeListData);

        // Sort contacts by last message date
        contacts.sort((a, b) => {
            const dateA = a.last_message?.createdAt
                ? new Date(getTimestamp(a.last_message.createdAt))
                : a.last_message?.timestamp
                    ? new Date(getTimestamp(a.last_message.timestamp))
                    : new Date(0);
            const dateB = b.last_message?.createdAt
                ? new Date(getTimestamp(b.last_message.createdAt))
                : b.last_message?.timestamp
                    ? new Date(getTimestamp(b.last_message.timestamp))
                    : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        // Filter contacts by user name in tags if necessary
        if (user_role == '2') {
            const filteredContacts = contacts.filter(contact => contact.tags.some((tag: string) => typeof tag === 'string' && tag.toLowerCase().includes(user_name.toLowerCase())));
            setContacts(filteredContacts);
        } else {
            // Set contacts to state
            setContacts(contacts);
        }
        setFilteredContacts(contacts);
        setFilteredContactsForForwarding(contacts);
        console.log(contacts);
    } catch (error) {
        console.error('Failed to fetch contacts:', error);
    } finally {
        setLoading(false);
    }
};
// Helper function to parse various timestamp formats
const parseTimestamp = (timestamp: any): number => {
    if (timestamp instanceof Object && timestamp.seconds) {
        return timestamp.seconds * 1000;
    } else if (typeof timestamp === 'string') {
        const parsedDate = new Date(timestamp);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate.getTime();
        }
    } else if (typeof timestamp === 'number') {
        return (timestamp > 10000000000) ? timestamp : timestamp * 1000;
    }
    throw new Error('Invalid timestamp format');
};

async function getContact(name: any, number: string, location: any, access_token: any) {
  const options = {
    method: 'POST',
    url: 'https://services.leadconnectorhq.com/contacts/',
    data: {
      firstName: name,
      name: name,
      locationId: location,
      phone: number,
    },
    headers: {
      Authorization: `Bearer ${access_token}`,
      Version: '2021-07-28',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  };

  try {
    const response = await axios.request(options);

    return response.data.contact;
  } catch (error) {
    console.error(error);
    return null;
  }
}
const getTimestamp = (timestamp: number | string | { seconds: number, nanoseconds: number }): number => {
    if (typeof timestamp === 'number') {
        // Check if the timestamp is in seconds or milliseconds
        return timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    } else if (typeof timestamp === 'string') {
        // Convert string timestamp to number
        return new Date(timestamp).getTime();
    } else if (timestamp instanceof Object && timestamp.seconds) {
        // Handle Firestore Timestamp object
        return timestamp.seconds * 1000;
    } else {
        throw new Error('Invalid timestamp format');
    }
};
const fetchContactsBackground = async (whapiToken: string, locationId: string, ghlToken: string, user_name: string) => {
  try {
  
    // Parallelize initial fetch operations including fetchTags
    const [tags, chatResponse, conversations, contacts, employeeSnapshot, enquirySnapshot] = await Promise.all([
        fetchTags(ghlToken, locationId),
        fetch(`https://buds-359313.et.r.appspot.com/api/chats/${whapiToken}`),
        searchConversations(ghlToken, locationId),
        searchContacts(ghlToken, locationId),
        getDocs(collection(firestore, `companies/${companyId}/employee`)),
        getDocs(collection(firestore, `companies/${companyId}/conversations`))
    ]);

    if (!chatResponse.ok) throw new Error('Failed to fetch chats');
    const chatData = await chatResponse.json();
    const user = auth.currentUser;

    const docUserRef = doc(firestore, 'user', user?.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
        console.log('No such document!');
        return;
    }
    const dataUser = docUserSnapshot.data() as UserData;

    user_role = dataUser.role;

    // Process chat data
    const mappedChats = chatData.chats.map((chat: { id: string; last_message: any; name: any; }) => {
        if (!chat.id) return null;
        const phoneNumber = `+${chat.id.split('@')[0]}`;
        let contact = contacts.find(contact => contact.phone === phoneNumber);
        let unreadCount = 0;
        if (dataUser.notifications !== undefined) {
            unreadCount = dataUser.notifications.filter((notif: { chat_id: string; read: any; }) => notif.chat_id === chat.id && !notif.read).length;
        }

        if (contact) {
            contact.chat_id = chat.id;
            contact.last_message = chat.last_message;
            contact.chat = chat;
            contact.unreadCount = unreadCount ?? 0;
            contact.id = contact.id;
        }
        return {
            ...chat,
            tags: contact ? contact.tags : [],
            name: contact ? contact.contactName : chat.name,
            lastMessageBody: '',
            id: chat.id,
            contact_id: contact ? contact.id : "",
            unreadCount,
        };
    }).filter(Boolean);

    // Merge WhatsApp contacts with existing contacts
    mappedChats.forEach((chat: { id: string; last_message: any; unreadCount: any; tags: any; contact_id: any; name: any; }) => {
        const phoneNumber = `+${chat.id.split('@')[0]}`;
        const existingContact = contacts.find(contact => contact.phone === phoneNumber);
        if (existingContact) {
            existingContact.chat_id = chat.id;
            existingContact.last_message = chat.last_message || existingContact.last_message;
            existingContact.chat = chat;
            existingContact.unreadCount = (existingContact.unreadCount || 0) + chat.unreadCount;
            existingContact.tags = [...new Set([...existingContact.tags, ...chat.tags])];
        } else {
            contacts.push({
                id: chat.contact_id,
                phone: phoneNumber,
                contactName: chat.name,
                chat_id: chat.id,
                last_message: chat.last_message || null,
                chat: chat,
                tags: chat.tags,
                conversation_id: chat.id,
                unreadCount: chat.unreadCount,
            });
        }
    });

    // Merge and update contacts with conversations
         contacts.forEach(contact => {
        const matchedConversation = conversations.find(conversation => conversation.contactId === contact.id);
        if (matchedConversation) {
            contact.conversation_id = matchedConversation.id;
            contact.chat_id = contact.chat_id || matchedConversation.id;
            contact.conversations = contact.conversations || [];
            contact.conversations.push(matchedConversation);
            if (!contact.last_message) {
                contact.last_message = {
                    id: matchedConversation.id,
                    text: { body: matchedConversation.lastMessageBody },
                    from_me: matchedConversation.lastMessageDirection === 'outbound',
                    createdAt: matchedConversation.lastMessageDate,
                    type: matchedConversation.lastMessageType,
                    image: undefined,
                };
            }
        }
    });

    // Ensure all contacts are unique and filter those with last messages


    // Fetch and update enquiries
    const employeeListData: Employee[] = [];
    employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
    });
    setEmployeeList(employeeListData);

    // Sort contacts by last message date
    contacts.sort((a, b) => {
        const dateA = a.last_message?.createdAt
            ? new Date(getTimestamp(a.last_message.createdAt))
            : a.last_message?.timestamp
                ? new Date(getTimestamp(a.last_message.timestamp))
                : new Date(0);
        const dateB = b.last_message?.createdAt
            ? new Date(getTimestamp(b.last_message.createdAt))
            : b.last_message?.timestamp
                ? new Date(getTimestamp(b.last_message.timestamp))
                : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });

    // Filter contacts by user name in tags if necessary
    if (user_role == '2') {
        const filteredContacts = contacts.filter(contact => contact.tags.some((tag: string) => typeof tag === 'string' && tag.toLowerCase().includes(user_name.toLowerCase())));
        setContacts(filteredContacts);
    } else {
        // Set contacts to state
        setContacts(contacts);
    }
    setFilteredContacts(contacts);
    setFilteredContactsForForwarding(contacts);
    console.log(contacts);
} catch (error) {
    console.error('Failed to fetch contacts:', error);
} finally {
  
}
};


  

  async function searchConversations(accessToken: any, locationId: any): Promise<any[]> {
    try {
      let allConversation: any[] = [];
      let page = 1;
      const options = {
        method: 'GET',
        url: 'https://services.leadconnectorhq.com/conversations/search/',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-07-28',
        },
        params: {
          locationId: locationId,
          page: page,
          limit:100,
        }
      };
      const response = await axios.request(options);
      const conversations = response.data.conversations;
      allConversation = [...allConversation, ...conversations];

      return allConversation;
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }

  async function searchContacts(accessToken: any, locationId: any): Promise<any[]> {
    try {
      let allContacts: any[] = [];
      let page = 1;
      while (true) {
        const options = {
          method: 'GET',
          url: 'https://services.leadconnectorhq.com/contacts/',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
          },
          params: {
            locationId: locationId,
            page: page,
          }
        };
        const response = await axios.request(options);
        const contacts = response.data.contacts;
        allContacts = [...allContacts, ...contacts];
        if (contacts.length === 0) {
          break;
        }
        page++;
      }
  
      return allContacts;
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }
  const handleIconClick = (iconId: string,selectedChatId:string,id:string) => {
    setMessages([]);
   
    setSelectedIcon(iconId);
  
    if(iconId == 'ws'){
      fetchMessages(selectedChatId, whapiToken!);
    }else if (iconId === 'mail'){
     fetchEnquiries(selectedChatId);
    }else if(iconId == 'fb'){
    
      fetchConversationMessages(id,selectedContact);
    }
  };
  async function fetchConversationMessages(conversationId: string,contact?:any) {
    if (!conversationId) return;

if(contact.last_message.type != 'TYPE_INSTAGRAM'){
  setSelectedIcon('fb');
}else{
  setSelectedIcon('ig');
}
   
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

  
      const leadConnectorResponse = await axios.get(`https://services.leadconnectorhq.com/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${data2.access_token}`,
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
 
      if(selectedChatId.includes('@s.') || selectedChatId.includes('@g') ){
        fetchMessages(selectedChatId, whapiToken!);
      
      }else if (selectedChatId.includes('@')){
       fetchEnquiries(selectedChatId);
      }else{

        fetchConversationMessages(selectedChatId,selectedContact);
      }

    }
  }, [selectedChatId]);
  async function fetchEnquiries(email: string) {
    if (!email) return;
  
    setSelectedIcon('mail');
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
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
  
      const data2 = docSnapshot.data();
      setToken(data2.whapiToken);
  
      // Fetch enquiries from Firestore
      const employeeRef = collection(firestore, `companies/${companyId}/conversations`);
      const employeeSnapshot = await getDocs(employeeRef);
      const employeeListData: Enquiry[] = [];
  
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Enquiry);
      });
  
      // Ensure the phone number has "+" and "6" prefix if missing

  
      const matchingEnquiry = employeeListData.find(enquiry => {
 
        return enquiry.email === email;
      });
  
      if (matchingEnquiry) {
        console.log('Matching enquiry found:', matchingEnquiry);
        // Perform any additional operations with the matching enquiry
        let createdAt: number;
        if (typeof matchingEnquiry.timestamp === 'string') {
          createdAt = new Date(matchingEnquiry.timestamp).getTime();
        } else {
          createdAt = matchingEnquiry.timestamp * 1000;
        }
  
        // Set messages using the data from the matching enquiry
        setMessages([
          {
            id: matchingEnquiry.id,
            text: { body: matchingEnquiry.message },
            from_me: false, // Assuming the enquiry is inbound
            createdAt: createdAt, // Use the processed timestamp
            timestamp:createdAt,
            dateAdded:createdAt,
            type: 'text',
            image: undefined, // Assuming there is no image field in the enquiry
          }
        ]);
      
      }else{
        console.log('No matching enquiry found.');
        setMessages([
        
        ]);
      
      }
    } catch (error) {
      console.error('Failed to fetch enquiries:', error);
    }
  }


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

      if (selectedChatId.includes('@')) {
        const response = await axios.get(`https://buds-359313.et.r.appspot.com/api/messages/${selectedChatId}/${data2.whapiToken}`);
        const data = response.data;
     
        setMessages(
          data.messages.map((message: { id: any; text: { body: any; }; from_me: any; timestamp: any; type: any; image: any; document:any}) => ({
            id: message.id,
            text: { body: message.text ? message.text.body : '' },
            from_me: message.from_me,
            createdAt: message.timestamp,
            type: message.type,
            image: message.image ? message.image : undefined,
            document:message.document?message.document:undefined,
          }))
        );
        console.log( data.messages);
      } else {
        setMessages([
        
        ]);}
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }
  async function fetchMessagesBackground(selectedChatId: string, whapiToken: string) {


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

      if (selectedChatId.includes('@s.whatsapp.net')) {
        const response = await axios.get(`https://buds-359313.et.r.appspot.com/api/messages/${selectedChatId}/${data2.whapiToken}`);
        const data = response.data;
        setMessages(
          data.messages.map((message: { id: any; text: { body: any; }; from_me: any; timestamp: any; type: any; image: any; }) => ({
            id: message.id,
            text: { body: message.text ? message.text.body : '' },
            from_me: message.from_me,
            createdAt: message.timestamp,
            type: message.type,
            image: message.image ? message.image : undefined,
          }))
        );
        console.log(messages);
      } else {
        setMessages([
        
        ]);}
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
    const companyId = dataUser.companyId;
  
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
  
    const data2 = docSnapshot.data();
    const accessToken = data2.access_token;
  
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
      const response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/text/${selectedChatId!}/${data2.whapiToken}/${newMessage!}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      const data = await response.json();
      toast.success("Message sent successfully!");
      fetchMessagesBackground(selectedChatId!, whapiToken!);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRefreshClick = async () => {
    console.log('Refresh clicked');
    await fetchMessages(selectedChatId!, whapiToken!);
  };

  function adjustTextareaHeight() {
    const textarea = inputRef.current;
    if (textarea) {
      console.log("Textarea:", textarea);
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }

  const toggleStopBotLabel = async (chat: any, index: number, contact: any) => {
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
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
 
      const accessToken = companyData.access_token;
      const hasLabel = contact && contact.tags && Array.isArray(contact.tags) ? contact.tags.includes('stop bot') : false;
      const method = hasLabel ? 'DELETE' : 'POST';
  
      const response = await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}/tags`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken,
          'Version': '2021-07-28'
        },
        body: JSON.stringify({ tags: ["stop bot"] })
      });
  
      if (response.ok) {
        const message = await response.json();
       
  
        const updatedContacts = [...contacts];
        const updatedContact = { ...updatedContacts[index] };
  
        if (hasLabel) {
          updatedContact.tags = updatedContact.tags.filter(tag => tag !== "stop bot");
        } else {
          updatedContact.tags = updatedContact.tags ? [...updatedContact.tags, "stop bot"] : ["stop bot"];
        }
  
        updatedContacts[index] = updatedContact;
        setContacts(updatedContacts);
  
        const updatedState = [...stopBotLabelCheckedState];
        updatedState[index] = !hasLabel;
        setStopBotLabelCheckedState(updatedState);
      } else {
        console.error('Failed to toggle label');
      }
    } catch (error) {
      console.error('Error toggling label:', error);
    }
  };

  const handleAddTagToSelectedContacts = async (selectedEmployee:string,contact:any) => {
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
      // Assuming ghlConfig, setToken, and fetchChatsWithRetry are defined elsewhere
 
      // Update Firestore document with new token data
      await setDoc(doc(firestore, 'companies', companyId), {
        access_token: companyData.access_token,
        refresh_token: companyData.refresh_token,
      }, { merge: true });
  
      if (selectedEmployee) {
        const tagName = selectedEmployee;
    
        // Merge existing tags with the new tag
        const updatedTags = [...new Set([...(contact.tags || []), tagName])];

        const success = await updateContactTags(contact.id, companyData.access_token, updatedTags);
        if (success) {
          await fetchContacts(companyData.whapiToken, companyData.ghl_location, companyData.access_token, userData.name,userData.role);
          await fetchMessages(selectedChatId!, companyData.whapiToken);
          toast.success("Tag added successfully!");
        }
      }
  };
  async function updateContactTags(contactId: any, accessToken: any, tags: any) {
    try {
        const options = {
            method: 'PUT',
            url: `https://services.leadconnectorhq.com/contacts/${contactId}`,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Version: '2021-07-28',
                'Content-Type': 'application/json'
            },
            data: {
                tags: tags
            }
        };
        const response = await axios.request(options);
      
        if (response.status === 200) {
            console.log('Contact tags updated successfully');
            return true;
        } else {
            console.error('Failed to update contact tags:', response.statusText);
            return false;
        }
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
    let updatedContacts = contacts;

    if (searchQuery !== '') {
      updatedContacts = updatedContacts.filter((contact) =>
        contact.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone?.includes(searchQuery)
      );
    }

    if (activeTags.length > 0) {
      updatedContacts = updatedContacts.filter((contact) =>
        activeTags.every((tag) => contact.tags?.includes(tag))
      );
    }

    setFilteredContacts(updatedContacts);
  }, [searchQuery, activeTags, contacts]);

  const handleSearchChange = (e: { target: { value: React.SetStateAction<string>; }; }) => {
    setSearchQuery(e.target.value);
  };
  const handleSearchChange2 = (e: { target: { value: React.SetStateAction<string>; }; }) => {
    setSearchQuery2(e.target.value);
    filterContactsForForwarding(e.target.value.toString());
  };
  const filterContactsForForwarding = (query: string) => {
    const filtered = contacts.filter(contact =>
      contact.contactName?.toLowerCase().includes(query.toLowerCase()) ||
      contact.phone?.includes(query)
    );
    setFilteredContactsForForwarding(filtered);
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
                const message_string = formatTextForSending(message!.text?.body!);
                  response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/text/${contact.chat_id}/${whapiToken}/${message_string}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
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

  const handleForwardClick = () => {
    setActiveMenu('forward');
  };
  const handleImageUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    setLoading(true)
    const file = event.target.files && event.target.files[0];
    if (file) {
      const imageUrl = await uploadFile(file); // Implement uploadFile to handle the upload
      await sendImageMessage(selectedChatId!, imageUrl!,"");
    }
    setLoading(false)
  };
  
  const handleDocumentUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    setLoading(true)
    const file = event.target.files && event.target.files[0];
    console.log(file);
    if (file) {
      const imageUrl = await uploadFile(file); // Implement uploadFile to handle the upload
      await sendDocumentMessage(selectedChatId!, imageUrl!,file.type,file.name,"");
    }
    setLoading(false)
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
      const companyId = userData.companyId;
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
      fetchMessages(selectedChatId!,companyData.access_token);
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
      const companyId = userData.companyId;
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
      fetchMessages(selectedChatId!,companyData.access_token);
      console.log('Image message sent successfully:', data);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };
  return (
    <div className="flex overflow-hidden bg-gray-100 text-gray-800"  style={{ height: '85vh' }}>
    <div className="flex flex-col w-full sm:w-1/4 bg-gray-100 border-r border-gray-300">
    <div className="relative mr-3 intro-x sm:mr-6"></div>
    <div className="relative hidden sm:block p-4">
    <div className="flex items-center space-x-2">
  <div className="relative flex-grow">
    <input
      type="text"
      className="w-full py-1 pl-10 pr-4 bg-gray-100 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
      placeholder="Search..."
      value={searchQuery}
      onChange={handleSearchChange}
    />
    <Lucide
      icon="Search"
      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
    />
  </div>
  <div className="flex justify-end">
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
                          <Lucide icon="Filter" className="w-4 h-4 mr-2" />
                          {tag.name}
                        </button>
                      </Menu.Item>
                    ))}
                  </Menu.Items>
      </Menu>
  </div>
</div>
          <div className="border-b border-gray-300 mt-4"></div>
       
        </div>
  <div className="flex-1 overflow-y-auto">
    
    {filteredContacts.map((contact, index) => (
      <div
        key={contact.id || `${contact.phone}-${index}`}
        className={`p-2 mb-2 rounded cursor-pointer flex items-center space-x-3 ${
          contact.chat_id !== undefined
            ? selectedChatId === contact.chat_id
              ? 'bg-gray-700 text-white'
              : 'hover:bg-gray-300'
            : selectedChatId === contact.phone
            ? 'bg-gray-700 text-white'
            : 'hover:bg-gray-700'
        }`}
        onClick={() => selectChat(contact.chat_id!, contact.email!)}
      >
        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white text-xl">
          {contact.contactName ? contact.contactName.charAt(0).toUpperCase() : "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <span className="font-semibold truncate">{contact.contactName ?? contact.phone}</span>
            <span className="text-xs">
              {contact.last_message?.createdAt || contact.last_message?.timestamp
                ? formatDate(contact.last_message.createdAt || contact.last_message.timestamp * 1000)
                : 'No Messages'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm truncate">
              {(contact.last_message?.type == "text")?contact.last_message?.text?.body ?? "No Messages":"Photo"}
            </span>
            {contact.unreadCount > 0 && (
              <span className="bg-blue-900 text-white text-xs rounded-full px-2 py-1 ml-2">{contact.unreadCount}</span>
            )}
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              value=""
              className="sr-only peer"
              checked={contact.tags?.includes("stop bot")}
              onChange={() => toggleStopBotLabel(contact.chat, index, contact)}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-900 border-2 border-blue-500 p-1">
            </div>
          </label>
        </div>
      </div>
    ))}
  </div>
</div>

      <div className="flex flex-col w-full sm:w-3/4 bg-white relative">
      {selectedContact && (
          <div className="flex items-center justify-between p-2 border-b border-gray-300 bg-gray-100">
            <div className="flex items-center">
              <div className="w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-3">
                <span className="text-lg">{selectedContact.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"}</span>
              </div>
              <div>
                <div className="font-semibold text-gray-800">{selectedContact.contactName || selectedContact.phone}</div>
                <div className="text-sm text-gray-600">{selectedContact.phone}</div>
              </div>
            </div>
            <Menu as="div" className="relative inline-block text-left p-2">
            <div className="flex items-center space-x-3">
        {/* Adjust the space-x value to increase the padding */}
        <Menu.Button as={Button} className="p-2 !box m-0" onClick={handleTagClick}>
          <span className="flex items-center justify-center w-5 h-5">
            <Lucide icon="Tag" className="w-5 h-5" />
          </span>
        </Menu.Button>

        <button className="p-2 m-0 !box" onClick={handleEyeClick}>
      <span className="flex items-center justify-center w-5 h-5">
        <Lucide icon={isTabOpen ? "X" : "Eye"} className="w-5 h-5" />
      </span>
    </button>
      </div>

      <Menu.Items className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
    {(tagList).map((item) => (
      <Menu.Item key={item.id}>
        <button
          className="flex items-center w-full text-left p-2 hover:bg-gray-100 rounded-md"
          onClick={() =>
             handleAddTagToSelectedContacts(item.name, selectedContact)
          }
        >
          <Lucide icon="User" className="w-4 h-4 mr-2" />
          {item.name}
        </button>
      </Menu.Item>
    ))}
  </Menu.Items>
</Menu>
          </div>
        )}
           
        <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: "150px" }}>
           
        {isLoading && (
                <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50">
                  <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
                    <div role="status">
                      <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
          {messages.slice().reverse().map((message) => (
            <div
                   className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}
              key={message.id}
              style={{
                maxWidth: '70%',
                width: `${message.type === 'image' || message.type === 'document' ? '350' : Math.min((message.text?.body?.length || 0) * 10, 350)}px`,
                minWidth: '75px'  // Add a minimum width here
              }}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {message.type === 'image' && message.image && (
                <div className="message-content image-message">
                  <img
                    src={message.image.link}
                    alt="Image"
                    className="message-image"
                    style={{ maxWidth: '300px' }}
                  />
                  <div className="caption">{message.image.caption}</div>
                </div>
              )}
    {message.type === 'text' && (
  <div className="whitespace-pre-wrap break-words">
    {formatText(message.text?.body || '')}
  </div>
)}
{message.type === 'document' && message.document && (
  <div className="document-content flex flex-col items-center p-4 rounded-md shadow-md">
    <img
      src={message.document.preview}
      alt="Document Preview"
      className="w-40 h-40 mb-3 border rounded"
    />
    <div className="flex-1 text-justify">
      <div className="font-semibold">{message.document.file_name}</div>
      <div>{message.document.page_count} page{message.document.page_count > 1 ? 's' : ''} • PDF • {(message.document.file_size / 1024).toFixed(2)} kB</div>
    </div>
    <a href={message.document.link} target="_blank" rel="noopener noreferrer" className="mt-3">
      <Lucide icon="Download" className="w-6 h-6 text-white-700" />
    </a>
  </div>
)}

              <div className="message-timestamp text-xs text-gray-100 mt-1">
            {formatTimestamp(message.createdAt||message.dateAdded)}
            {(hoveredMessageId === message.id || selectedMessages.includes(message)) && (
                <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-900 transition duration-150 ease-in-out rounded-full ml-2"
                    checked={selectedMessages.includes(message)}
                    onChange={() => handleSelectMessage(message)}
                />
            )}
          </div>
         
            </div>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 w-full bg-white-100 border-t border-gray-300 py-2 px-4">
          <div className="message-source-buttons flex items-center mb-2 md:mb-0">
            <img
              className={`source-button ${selectedIcon === 'ws' ? 'border-2 border-blue-500' : ''}`}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon4.png?alt=media&token=d4ab65b6-9b90-4aca-9d69-6263300a91ec"
              alt="WhatsApp"
              onClick={() => handleWhatsappClick('ws')}
              style={{ width: '30px', height: '30px' }}
            />
            <img
              className={`source-button ${selectedIcon === 'fb' ? 'border-2 border-blue-500' : ''}`}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/facebook-logo-on-transparent-isolated-background-free-vector-removebg-preview.png?alt=media&token=c312eb23-dfee-40d3-a55c-476ef3041369"
              alt="Facebook"
              onClick={() => handleIconClick('fb', selectedChatId!,selectedContact.conversation_id)}
              style={{ width: '30px', height: '30px' }}
            />
            <img
              className={`source-button ${selectedIcon === 'ig' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('ig', selectedChatId!,selectedContact.id)}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon3.png?alt=media&token=9395326d-ff56-45e7-8ebc-70df4be6971a"
              alt="Instagram"
              style={{ width: '30px', height: '30px' }}
            />
            <img
              className={`source-button ${selectedIcon === 'gmb' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('gmb', selectedChatId!,selectedContact.id)}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon1.png?alt=media&token=10842399-eca4-40d1-9051-ea70c72ac95b"
              alt="Google My Business"
              style={{ width: '20px', height: '20px' }}
            />
            <img
              className={`source-button ${selectedIcon === 'mail' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('mail', selectedChatId!,selectedContact.id)}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon2.png?alt=media&token=813f94d4-cad1-4944-805a-2454293278c9"
              alt="Email"
              style={{ width: '30px', height: '30px' }}
            />
            
          </div>
          <div className="flex items-center">
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
               className="flex-grow px-5 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-lg mr-2 ml-4 resize-none bg-gray-100 text-gray-800"
              placeholder="Type a message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if(selectedIcon == 'ws'){
                    handleSendMessage();
                  }else{
              sendTextMessage(selectedContact.id,newMessage,selectedContact);
                  }
              
                  setNewMessage('');
                }
              }}
            />
          </div>
        </div>
      </div>
      {selectedMessages.length > 0 && (
    <button
        className="fixed bottom-20 right-10 bg-blue-900 text-white px-10 py-5 rounded-full shadow-lg"
        onClick={() => setIsForwardDialogOpen(true)}
    >
        Forward
    </button>
)}
      {isTabOpen && (
  <div className="w-2/4 bg-white border-l border-gray-300 overflow-y-auto">
    <div className="p-6">
      <div className="flex items-center p-4 border-b border-gray-300 bg-gray-100">
        <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
          <span className="text-xl">{selectedContact.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"}</span>
        </div>
        <div>
          <div className="font-semibold text-gray-800">{selectedContact.contactName || selectedContact.phone}</div>
          <div className="text-sm text-gray-600">{selectedContact.phone}</div>
        </div>
      </div>
      <div className="mt-6">
        <p className="font-semibold text-lg mb-4">Contact Info</p>
        <div className="space-y-2 text-gray-700">
          <p><span className="font-semibold text-blue-600">Tags:</span>
            <div className="flex flex-wrap mt-2">
              {selectedContact.tags.map((tag:any, index:any) => (
                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold mr-2 mb-2 px-3 py-1 rounded border border-blue-400">
                  {tag}
                </span>
              ))}
            </div>
          </p>
          <p><span className="font-semibold text-blue-600">Phone:</span> {selectedContact.phone}</p>
          <p><span className="font-semibold text-blue-600">Email:</span> {selectedContact.email || 'N/A'}</p>
          <p><span className="font-semibold text-blue-600">Company:</span> {selectedContact.companyName || 'N/A'}</p>
          <p><span className="font-semibold text-blue-600">Address:</span> {selectedContact.address1 || 'N/A'}</p>
          <p><span className="font-semibold text-blue-600">First Name:</span> {selectedContact.firstName}</p>
          <p><span className="font-semibold text-blue-600">Last Name:</span> {selectedContact.lastName}</p>
          <p><span className="font-semibold text-blue-600">Website:</span> {selectedContact.website || 'N/A'}</p>
          {/* Add more fields as necessary */}
        </div>
      </div>
    </div>
  </div>
)}
{isForwardDialogOpen && (
  <Dialog as="div" className="relative z-10" open={isForwardDialogOpen} onClose={() => setIsForwardDialogOpen(false)}>
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-full p-4 text-center sm:items-center sm:p-0">
        <Dialog.Panel className="relative bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Forward message to
                </Dialog.Title>
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
                  {filteredContactsForForwarding.map((contact) => (
                    <div
                      key={contact.id}
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
                          <div className="font-semibold">{contact.contactName || contact.phone}</div>
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
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={handleForwardMessage}
            >
              Forward
            </Button>
            <Button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
              onClick={() => setIsForwardDialogOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </div>
  </Dialog>
)}
      <ToastContainer />
      {isQuickRepliesOpen && (
  <div className="bg-gray-100 p-4 rounded-md shadow-lg mt-2">
    <div className="flex items-center mb-4">
      <input
        type="text"
        className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Add new quick reply"
        value={newQuickReply}
        onChange={(e) => setNewQuickReply(e.target.value)}
      />

      <button className="p-2 m-1 !box"  onClick={addQuickReply}>
                    <span className="flex items-center justify-center w-5 h-5">
                      <Lucide icon="Plus" className="w-5 h-5" />
                    </span>
                  </button>
    </div>
    <div className="max-h-40 overflow-y-auto">
      {quickReplies.map(reply => (
        <div key={reply.id} className="flex items-center justify-between mb-2 bg-gray-50">
          {editingReply?.id === reply.id ? (
            <>
              <input
                type="text"
                className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editingReply.text}
                onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
              />
             
              <button className="p-2 m-1 !box"  onClick={addQuickReply}>
                    <span className="flex items-center justify-center w-5 h-5">
                      <Lucide icon="Save" className="w-5 h-5" />
                    </span>
                  </button>
            </>
          ) : (
            <>
              <span className="px-4 py-2 flex-grow text-lg cursor-pointer" onClick={() => handleQRClick(reply.text)}>
                {reply.text}
              </span>
              <div>
              
                <button className="p-2 m-1 !box"  onClick={() => setEditingReply(reply)}>
                    <span className="flex items-center justify-center w-5 h-5">
                      <Lucide icon="Eye" className="w-5 h-5" />
                    </span>
                  </button>
                <button className="p-2 m-1 !box text-red-500"    onClick={() => deleteQuickReply(reply.id)}>
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
    </div>
  );
};

export default Main;