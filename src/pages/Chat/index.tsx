import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, onSnapshot, setDoc, getDocs } from "firebase/firestore";
import axios from "axios";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { Dialog, Menu } from "@/components/Base/Headless";
import { Link } from "react-router-dom";
import { FormInput } from "@/components/Base/Form";
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
}interface Employee {
  id: string;
  name: string;
  role: string;
  // Add other properties as needed
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState(contacts);
  const myMessageClass = "flex-end bg-blue-500 max-w-30 md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 my-0.5 p-2 rounded-md self-end ml-auto text-white text-right";
  const otherMessageClass = "flex-start bg-gray-700 md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 my-0.5 p-2 rounded-md text-white self-start";
  let companyId = '014';
  let user_name = '';

  let ghlConfig = {
    ghl_id: '',
    ghl_secret: '',
    refresh_token: '',
  };

  useEffect(() => {
    fetchConfigFromDatabase();
  }, []);

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
              ghlConfig = {
                ghl_id: data.ghl_id,
                ghl_secret: data.ghl_secret,
                refresh_token: data.refresh_token
              };
              user_name = dataUser.name;
              await fetchContactsBackground(data.whapiToken, data.ghl_location, data.access_token, dataUser.name);
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
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const data = docSnapshot.data();
      ghlConfig = {
        ghl_id: data.ghl_id,
        ghl_secret: data.ghl_secret,
        refresh_token: data.refresh_token
      };
      setToken(data.whapiToken);
      user_name = dataUser.name;
      await fetchContacts(data.whapiToken, data.ghl_location, data.access_token, dataUser.name);
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

  const fetchContacts = async (whapiToken: string, locationId: string, ghlToken: string, user_name: string) => {
    try {
        setLoading(true);

        // Fetch user data
        const user = auth.currentUser;
        const docUserRef = doc(firestore, 'user', user?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
            console.log('No such document for user!');
            return;
        }
        const userData = docUserSnapshot.data();
        const companyId = userData.companyId;
        const role = userData.role;
        console.log(userData.notifications);
        const notifications = userData.notifications || [];

        // Fetch company data
        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
            console.log('No such document for company!');
            return;
        }
        const companyData = docSnapshot.data();

        // Update access token
        await setDoc(doc(firestore, 'companies', companyId), {
            access_token: companyData.access_token,
            refresh_token: companyData.refresh_token,
        }, { merge: true });

        // Fetch chat data
        const response = await fetch(`https://buds-359313.et.r.appspot.com/api/chats/${whapiToken}`);
        if (!response.ok) {
            throw new Error('Failed to fetch chats');
        }
        const chatData = await response.json();
        const [conversations, contacts] = await Promise.all([
            searchConversations(companyData.access_token, locationId),
            searchContacts(companyData.access_token, locationId)
        ]);

        // Map chats to contacts
        const mappedChats = chatData.chats.map((chat: Chat) => {
            if (!chat.id) return null;
            const phoneNumber = "+" + chat.id.split('@')[0];
            const contact = contacts.find((contact: any) => contact.phone === phoneNumber);
            const tags = contact ? contact.tags : [];
            const id = contact ? contact.id : "";
            const name = contact ? contact.contactName : "";
            const unreadCount = notifications.filter((notif: any) => notif.chat_id === chat.id && !notif.read).length;
            if (contact) {
                contact.chat_id = chat.id;
                contact.last_message = chat.last_message;
                contact.chat = chat;
                contact.unreadCount = unreadCount;
            }
            return {
                ...chat,
                tags: tags,
                name: name !== "" ? name : chat.name,
                lastMessageBody: '',
                id: chat.id,
                contact_id: id,
                unreadCount,
            };
        }).filter(Boolean);

        // Merge WhatsApp contacts with existing contacts
        const whatsappContacts = mappedChats.filter((chat: any) => !contacts.some(contact => contact.chat_id === chat.id));
        whatsappContacts.forEach((chat: any) => {
            const phoneNumber = "+" + chat.id.split('@')[0];
            const unreadCount = notifications.filter((notif: any) => notif.chat_id === chat.id && !notif.read).length;
            if (chat.id.includes('@s.whatsapp')) {
                contacts.push({
                    id: chat.contact_id,
                    phone: phoneNumber,
                    contactName: chat.name,
                    chat_id: chat.id,
                    last_message: chat.last_message || null,
                    chat: chat,
                    tags: chat.tags,
                    conversation_id: chat.id,
                    unreadCount,
                });
            }
        });

        // Merge and update contacts with conversations
        const mergedContacts = contacts.reduce((acc: any[], contact: any) => {
            const existingContact = acc.find(c => c.phone === contact.phone);
            if (existingContact) {
                existingContact.tags = [...new Set([...existingContact.tags, ...contact.tags])];
                if (!existingContact.last_message || (contact.last_message && getTimestamp(contact.last_message.createdAt) > getTimestamp(existingContact.last_message.createdAt))) {
                    existingContact.last_message = contact.last_message;
                }
                existingContact.chat = contact.chat || existingContact.chat;
                existingContact.chat_id = contact.chat_id || existingContact.chat_id;
                existingContact.conversation_id = contact.conversation_id || existingContact.conversation_id;
                existingContact.unreadCount = (existingContact.unreadCount || 0) + contact.unreadCount;
                if (!existingContact.contactName && contact.contactName) {
                    existingContact.contactName = contact.contactName;
                }
            } else {
                acc.push(contact);
            }
            return acc;
        }, []);

        // Update contacts with conversations
        const updatedContacts = mergedContacts.map((contact: any) => {
            const matchedConversation = conversations.find((conversation: any) => conversation.contactId === contact.id);
            if (matchedConversation) {
                contact.conversation_id = matchedConversation.id;
                contact.chat_id = (contact.chat_id === undefined) ? matchedConversation.id : contact.chat_id;
                contact.conversations = contact.conversations || [];
                contact.conversations.push(matchedConversation);

                contact.last_message = {
                    id: matchedConversation.id,
                    text: { body: matchedConversation.lastMessageBody },
                    from_me: matchedConversation.lastMessageDirection === 'outbound',
                    createdAt: matchedConversation.lastMessageDate,
                    type: matchedConversation.lastMessageType,
                    image: undefined,
                };
            }
            return contact;
        });

        // Ensure all contacts are unique and filter those with last messages
        let uniqueContacts = Array.from(new Map(updatedContacts.map(contact => [contact.phone, contact])).values());
        uniqueContacts = uniqueContacts.filter(contact => contact.last_message);
        const employeeRef = collection(firestore, `companies/${companyId}/employee`);
        const employeeSnapshot = await getDocs(employeeRef);
  
        const employeeListData: Employee[] = [];
        employeeSnapshot.forEach((doc) => {
          employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
        });
  console.log(employeeListData);
  setEmployeeList(employeeListData);
        // Fetch and update enquiries
        const enquriryRef = collection(firestore, `companies/${companyId}/conversations`);
        const enqurirySnapshot = await getDocs(enquriryRef);

        const enquriryListData: Enquiry[] = [];
        enqurirySnapshot.forEach((doc) => {
          enquriryListData.push({ id: doc.id, ...doc.data() } as Enquiry);
        });

        // Merge employee list data into unique contacts
        enquriryListData.forEach((enquiry: Enquiry) => {
            const existingContact = uniqueContacts.find(contact => contact.email === enquiry.email || contact.phone === enquiry.phone);
            if (existingContact) {
                existingContact.enquiries = existingContact.enquiries || [];
                existingContact.enquiries.push(enquiry);

                let createdAt: number | null = null;
                try {
                    if (enquiry.timestamp instanceof Object && enquiry.timestamp.seconds) {
                        createdAt = enquiry.timestamp.seconds * 1000;
                    } else if (typeof enquiry.timestamp === 'string') {
                        const parsedDate = new Date(enquiry.timestamp);
                        if (isNaN(parsedDate.getTime())) {
                            throw new Error('Invalid timestamp format');
                        }
                        createdAt = parsedDate.getTime();
                    } else if (typeof enquiry.timestamp === 'number') {
                        createdAt = (enquiry.timestamp > 10000000000) ? enquiry.timestamp : enquiry.timestamp * 1000;
                    } else {
                        throw new Error('Invalid timestamp format');
                    }

                    if (!existingContact.last_message || createdAt > getTimestamp(existingContact.last_message.createdAt)) {
                        existingContact.last_message = {
                            id: enquiry.id,
                            text: { body: enquiry.message },
                            from_me: false,
                            createdAt: createdAt,
                            type: 'text',
                            image: undefined,
                        };
                    }
                } catch (error) {
                    console.error(`Failed to process timestamp for contact ${existingContact.email}:`, error);
                }
            } else {
                let createdAt: number | null = null;
                try {
                    if (enquiry.timestamp instanceof Object && enquiry.timestamp.seconds) {
                        createdAt = enquiry.timestamp.seconds * 1000;
                    } else if (typeof enquiry.timestamp === 'string') {
                        const parsedDate = new Date(enquiry.timestamp);
                        if (isNaN(parsedDate.getTime())) {
                            throw new Error('Invalid timestamp format');
                        }
                        createdAt = parsedDate.getTime();
                    } else if (typeof enquiry.timestamp === 'number') {
                        createdAt = (enquiry.timestamp > 10000000000) ? enquiry.timestamp : enquiry.timestamp * 1000;
                    } else {
                        throw new Error('Invalid timestamp format');
                    }

                    uniqueContacts.push({
                        id: enquiry.id,
                        email: enquiry.email,
                        phone: enquiry.phone,
                        contactName: enquiry.name,
                        enquiries: [enquiry],
                        last_message: {
                            id: enquiry.id,
                            text: { body: enquiry.message },
                            from_me: false,
                            createdAt: createdAt,
                            type: 'text',
                            image: undefined,
                        },
                    });
                } catch (error) {
                    console.error(`Failed to process timestamp for enquiry ${enquiry.email}:`, error);
                }
            }
        });

        // Sort contacts by last message date
        uniqueContacts.sort((a: any, b: any) => {
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

        console.log(uniqueContacts);

        // Filter contacts by user name in tags if necessary
        if (role == 2 && companyId == '011') {
            const filteredContacts = uniqueContacts.filter((contact: { tags: any[] }) => {
                return contact.tags && contact.tags.some(tag => typeof tag == 'string' && tag.toLowerCase().includes(user_name.toLowerCase()));
            });
            setContacts(filteredContacts);
        } else {
            // Set contacts to state
            setContacts(uniqueContacts);
        }
  setFilteredContacts(contacts);
    } catch (error) {
        console.error('Failed to fetch contacts:', error);
    } finally {
        setLoading(false);
    }
};


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


    // Fetch user data
    const user = auth.currentUser;
    const docUserRef = doc(firestore, 'user', user?.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
    }
    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
    const role = userData.role;
    console.log(userData.notifications);
    const notifications = userData.notifications || [];

    // Fetch company data
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
    }
    const companyData = docSnapshot.data();

    // Update access token
    await setDoc(doc(firestore, 'companies', companyId), {
        access_token: companyData.access_token,
        refresh_token: companyData.refresh_token,
    }, { merge: true });

    // Fetch chat data
    const response = await fetch(`https://buds-359313.et.r.appspot.com/api/chats/${whapiToken}`);
    if (!response.ok) {
        throw new Error('Failed to fetch chats');
    }
    const chatData = await response.json();
    const [conversations, contacts] = await Promise.all([
        searchConversations(companyData.access_token, locationId),
        searchContacts(companyData.access_token, locationId)
    ]);

    // Map chats to contacts
    const mappedChats = chatData.chats.map((chat: Chat) => {
        if (!chat.id) return null;
        const phoneNumber = "+" + chat.id.split('@')[0];
        const contact = contacts.find((contact: any) => contact.phone === phoneNumber);
        const tags = contact ? contact.tags : [];
        const id = contact ? contact.id : "";
        const name = contact ? contact.contactName : "";
        const unreadCount = notifications.filter((notif: any) => notif.chat_id === chat.id && !notif.read).length;
        if (contact) {
            contact.chat_id = chat.id;
            contact.last_message = chat.last_message;
            contact.chat = chat;
            contact.unreadCount = unreadCount;
        }
        return {
            ...chat,
            tags: tags,
            name: name !== "" ? name : chat.name,
            lastMessageBody: '',
            id: chat.id,
            contact_id: id,
            unreadCount,
        };
    }).filter(Boolean);

    // Merge WhatsApp contacts with existing contacts
    const whatsappContacts = mappedChats.filter((chat: any) => !contacts.some(contact => contact.chat_id === chat.id));
    whatsappContacts.forEach((chat: any) => {
        const phoneNumber = "+" + chat.id.split('@')[0];
        const unreadCount = notifications.filter((notif: any) => notif.chat_id === chat.id && !notif.read).length;
        if (chat.id.includes('@s.whatsapp')) {
            contacts.push({
                id: chat.contact_id,
                phone: phoneNumber,
                contactName: chat.name,
                chat_id: chat.id,
                last_message: chat.last_message || null,
                chat: chat,
                tags: chat.tags,
                conversation_id: chat.id,
                unreadCount,
            });
        }
    });

    // Merge and update contacts with conversations
    const mergedContacts = contacts.reduce((acc: any[], contact: any) => {
        const existingContact = acc.find(c => c.phone === contact.phone);
        if (existingContact) {
            existingContact.tags = [...new Set([...existingContact.tags, ...contact.tags])];
            if (!existingContact.last_message || (contact.last_message && getTimestamp(contact.last_message.createdAt) > getTimestamp(existingContact.last_message.createdAt))) {
                existingContact.last_message = contact.last_message;
            }
            existingContact.chat = contact.chat || existingContact.chat;
            existingContact.chat_id = contact.chat_id || existingContact.chat_id;
            existingContact.conversation_id = contact.conversation_id || existingContact.conversation_id;
            existingContact.unreadCount = (existingContact.unreadCount || 0) + contact.unreadCount;
            if (!existingContact.contactName && contact.contactName) {
                existingContact.contactName = contact.contactName;
            }
        } else {
            acc.push(contact);
        }
        return acc;
    }, []);

    // Update contacts with conversations
    const updatedContacts = mergedContacts.map((contact: any) => {
        const matchedConversation = conversations.find((conversation: any) => conversation.contactId === contact.id);
        if (matchedConversation) {
            contact.conversation_id = matchedConversation.id;
            contact.chat_id = (contact.chat_id === undefined) ? matchedConversation.id : contact.chat_id;
            contact.conversations = contact.conversations || [];
            contact.conversations.push(matchedConversation);

            contact.last_message = {
                id: matchedConversation.id,
                text: { body: matchedConversation.lastMessageBody },
                from_me: matchedConversation.lastMessageDirection === 'outbound',
                createdAt: matchedConversation.lastMessageDate,
                type: matchedConversation.lastMessageType,
                image: undefined,
            };
        }
        return contact;
    });

    // Ensure all contacts are unique and filter those with last messages
    let uniqueContacts = Array.from(new Map(updatedContacts.map(contact => [contact.phone, contact])).values());
    uniqueContacts = uniqueContacts.filter(contact => contact.last_message);
    const employeeRef = collection(firestore, `companies/${companyId}/employee`);
    const employeeSnapshot = await getDocs(employeeRef);

    const employeeListData: Employee[] = [];
    employeeSnapshot.forEach((doc) => {
      employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
    });
setEmployeeList(employeeListData);
    // Fetch and update enquiries
    const enquriryRef = collection(firestore, `companies/${companyId}/conversations`);
    const enqurirySnapshot = await getDocs(enquriryRef);

    const enquriryListData: Enquiry[] = [];
    enqurirySnapshot.forEach((doc) => {
      enquriryListData.push({ id: doc.id, ...doc.data() } as Enquiry);
    });

    // Merge employee list data into unique contacts
    enquriryListData.forEach((enquiry: Enquiry) => {
        const existingContact = uniqueContacts.find(contact => contact.email === enquiry.email || contact.phone === enquiry.phone);
        if (existingContact) {
            existingContact.enquiries = existingContact.enquiries || [];
            existingContact.enquiries.push(enquiry);

            let createdAt: number | null = null;
            try {
                if (enquiry.timestamp instanceof Object && enquiry.timestamp.seconds) {
                    createdAt = enquiry.timestamp.seconds * 1000;
                } else if (typeof enquiry.timestamp === 'string') {
                    const parsedDate = new Date(enquiry.timestamp);
                    if (isNaN(parsedDate.getTime())) {
                        throw new Error('Invalid timestamp format');
                    }
                    createdAt = parsedDate.getTime();
                } else if (typeof enquiry.timestamp === 'number') {
                    createdAt = (enquiry.timestamp > 10000000000) ? enquiry.timestamp : enquiry.timestamp * 1000;
                } else {
                    throw new Error('Invalid timestamp format');
                }

                if (!existingContact.last_message || createdAt > getTimestamp(existingContact.last_message.createdAt)) {
                    existingContact.last_message = {
                        id: enquiry.id,
                        text: { body: enquiry.message },
                        from_me: false,
                        createdAt: createdAt,
                        type: 'text',
                        image: undefined,
                    };
                }
            } catch (error) {
                console.error(`Failed to process timestamp for contact ${existingContact.email}:`, error);
            }
        } else {
            let createdAt: number | null = null;
            try {
                if (enquiry.timestamp instanceof Object && enquiry.timestamp.seconds) {
                    createdAt = enquiry.timestamp.seconds * 1000;
                } else if (typeof enquiry.timestamp === 'string') {
                    const parsedDate = new Date(enquiry.timestamp);
                    if (isNaN(parsedDate.getTime())) {
                        throw new Error('Invalid timestamp format');
                    }
                    createdAt = parsedDate.getTime();
                } else if (typeof enquiry.timestamp === 'number') {
                    createdAt = (enquiry.timestamp > 10000000000) ? enquiry.timestamp : enquiry.timestamp * 1000;
                } else {
                    throw new Error('Invalid timestamp format');
                }
                uniqueContacts.push({
                    id: enquiry.id,
                    email: enquiry.email,
                    phone: enquiry.phone,
                    contactName: enquiry.name,
                    enquiries: [enquiry],
                    last_message: {
                        id: enquiry.id,
                        text: { body: enquiry.message },
                        from_me: false,
                        createdAt: createdAt,
                        type: 'text',
                        image: undefined,
                    },
                });
            } catch (error) {
                console.error(`Failed to process timestamp for enquiry ${enquiry.email}:`, error);
            }
        }
    });
    // Sort contacts by last message date
    uniqueContacts.sort((a: any, b: any) => {
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
    console.log(uniqueContacts);
    // Filter contacts by user name in tags if necessary
    if (role == 2 && companyId == '011') {
        const filteredContacts = uniqueContacts.filter((contact: { tags: any[] }) => {
            return contact.tags && contact.tags.some(tag => typeof tag == 'string' && tag.toLowerCase().includes(user_name.toLowerCase()));
        });
        setContacts(filteredContacts);
        setFilteredContacts(filteredContacts);
    } else {
        // Set contacts to state
        setContacts(uniqueContacts);
        setFilteredContacts(uniqueContacts);
    }

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
          limit: 100,
        }
      };
      const response = await axios.request(options);
      const contacts = response.data.contacts;
      allContacts = [...allContacts, ...contacts];
      return allContacts;
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }

  const handleIconClick = (iconId: string,selectedChatId:string) => {
    setMessages([]);
    setSelectedIcon(iconId);
    if(selectedChatId.includes('@s.')){
      fetchMessages(selectedChatId, whapiToken!);
    }else if (iconId === 'mail'){
     fetchEnquiries(selectedChatId);
    }else{
      fetchConversationMessages(selectedChatId);
    }
  };
  async function fetchConversationMessages(conversationId: string) {
    if (!conversationId) return;

    setSelectedIcon('fb');
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
      ghlConfig = {
        ghl_id: data2.ghl_id,
        ghl_secret: data2.ghl_secret,
        refresh_token: data2.refresh_token
      };
      setToken(data2.whapiToken);

  
      const leadConnectorResponse = await axios.get(`https://services.leadconnectorhq.com/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${data2.access_token}`,
          Version: '2021-04-15',
          Accept: 'application/json'
        }
      });
      const leadConnectorData = leadConnectorResponse.data;
console.log(leadConnectorData);
      setMessages(
        leadConnectorData.messages.messages.map((message: any) => ({
          id: message.id,
          text: { body: message.body },
          from_me: message.direction === 'outbound' ? true : false,
          createdAt: message.timestamp,
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
 
      if(selectedChatId.includes('@s.')){
        fetchMessages(selectedChatId, whapiToken!);
      }else if (selectedChatId.includes('@')){
       fetchEnquiries(selectedChatId);
      }else{
        fetchConversationMessages(selectedChatId);
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
      ghlConfig = {
        ghl_id: data2.ghl_id,
        ghl_secret: data2.ghl_secret,
        refresh_token: data2.refresh_token
      };
      setToken(data2.whapiToken);

      if (selectedChatId.includes('@s.whatsapp.net')) {
        const response = await axios.get(`https://buds-359313.et.r.appspot.com/api/messages/${selectedChatId}/${data2.whapiToken}`);
        const data = response.data;
        console.log(data);
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
      ghlConfig = {
        ghl_id: data2.ghl_id,
        ghl_secret: data2.ghl_secret,
        refresh_token: data2.refresh_token
      };
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
      } else {
        setMessages([
        
        ]);}
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {

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
    ghlConfig = {
      ghl_id: data2.ghl_id,
      ghl_secret: data2.ghl_secret,
      refresh_token: data2.refresh_token
    };
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
      const ghlConfig = {
        ghl_id: companyData.ghl_id,
        ghl_secret: companyData.ghl_secret,
        refresh_token: companyData.refresh_token
      };
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
        console.log(message);
  
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
  ghlConfig = {
        ghl_id: companyData.ghl_id,
        ghl_secret: companyData.ghl_secret,
        refresh_token: companyData.refresh_token
      };

      // Update Firestore document with new token data
      await setDoc(doc(firestore, 'companies', companyId), {
        access_token: companyData.access_token,
        refresh_token: companyData.refresh_token,
      }, { merge: true });
      console.log(selectedEmployee);
      if (selectedEmployee) {
        const tagName = selectedEmployee;
    
        // Merge existing tags with the new tag
        const updatedTags = [...new Set([...(contact.tags || []), tagName])];
    
        const success = await updateContactTags(contact.id, companyData.access_token, updatedTags);
        if (success) {
          await fetchContacts(companyData.whapiToken, companyData.ghl_location, companyData.access_token, userData.name);
          await fetchMessages(selectedChatId!, companyData.whapiToken);
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
        console.log(response);
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
    if (searchQuery === '') {
      setFilteredContacts(contacts);
    } else {
      setFilteredContacts(
        contacts.filter((contact) =>
          contact.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.phone!.includes(searchQuery)
        )
      );
    }
  }, [searchQuery, contacts]);

  const handleSearchChange = (e: { target: { value: React.SetStateAction<string>; }; }) => {
    setSearchQuery(e.target.value);
  };

 
  return (
    <div className="flex overflow-hidden bg-gray-100 text-gray-800"  style={{ height: '85vh' }}>
    <div className="flex flex-col w-full sm:w-1/4 bg-gray-100 border-r border-gray-300">
    <div className="relative mr-3 intro-x sm:mr-6"></div>
    <div className="relative hidden sm:block p-4">
          <div className="relative">
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
              <div className="block w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-3">
                <span className="text-lg">{selectedContact.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"}</span>
              </div>
              <div>
                <div className="font-semibold text-gray-800">{selectedContact.contactName || selectedContact.phone}</div>
                <div className="text-sm text-gray-600">{selectedContact.phone}</div>
              </div>
            </div>
            <Menu as="div" className="relative inline-block text-left p-2">
  <div className="flex items-center space-x-3"> {/* Adjust the space-x value to increase the padding */}
    <button className="p-2 m-0 !box" onClick={handleEyeClick}>
      <span className="flex items-center justify-center w-5 h-5">
        <Lucide icon={isTabOpen ? "X" : "Eye"} className="w-5 h-5" />
      </span>
    </button>
    <Menu.Button as={Button} className="p-2 !box m-0">
      <span className="flex items-center justify-center w-5 h-5">
        <Lucide icon="Forward" className="w-5 h-5" />
      </span>
    </Menu.Button>
  </div>

  <Menu.Items className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-md p-2 z-10">
    {employeeList.map((employee) => (
      <Menu.Item key={employee.id}>
        <button
          className="flex items-center w-full text-left p-2 hover:bg-gray-100 rounded-md"
          onClick={() => handleAddTagToSelectedContacts(employee.name,selectedContact)}
        >
          <Lucide icon="User" className="w-4 h-4 mr-2" />
          {employee.name}
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
                width: `${message.type === 'image' ? '320' : Math.min((message.text!.body?.length || 0) * 15, 350)}px`,
              }}
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
                <div className="message-content">
                  {message.text?.body || ''}
                </div>
              )}
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
              onClick={() => handleIconClick('fb', selectedChatId!)}
              style={{ width: '30px', height: '30px' }}
            />
            <img
              className={`source-button ${selectedIcon === 'ig' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('ig', selectedChatId!)}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon3.png?alt=media&token=9395326d-ff56-45e7-8ebc-70df4be6971a"
              alt="Instagram"
              style={{ width: '30px', height: '30px' }}
            />
            <img
              className={`source-button ${selectedIcon === 'gmb' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('gmb', selectedChatId!)}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon1.png?alt=media&token=10842399-eca4-40d1-9051-ea70c72ac95b"
              alt="Google My Business"
              style={{ width: '20px', height: '20px' }}
            />
            <img
              className={`source-button ${selectedIcon === 'mail' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('mail', selectedChatId!)}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon2.png?alt=media&token=813f94d4-cad1-4944-805a-2454293278c9"
              alt="Email"
              style={{ width: '30px', height: '30px' }}
            />
          </div>
          <div className="flex items-center">
            <textarea
              className="flex-grow px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-lg mr-2 resize-none bg-gray-100 text-gray-800"
              placeholder="Type a message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                  setNewMessage('');
                }
              }}
            />
          </div>
        </div>
      </div>
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

    </div>
  );
};

export default Main;