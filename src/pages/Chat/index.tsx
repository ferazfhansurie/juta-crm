  import React, { useState, useEffect, useRef } from "react";

  import { getAuth } from "firebase/auth";
  import { initializeApp } from "firebase/app";
  import { DocumentReference, getDoc } from 'firebase/firestore';
  import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import axios from "axios";
import Lucide from "@/components/Base/Lucide";
import { Menu, Popover } from "@/components/Base/Headless";
interface Label {
  id: string;
  name: string;
  color: string; // Should be one of the provided color options
  count: number;
}
// Example usage:
interface Contact {
  additionalEmails: string[];
  address1: string | null;
  assignedTo: string | null;
  businessId: string | null;
  city: string | null;
  companyName: string | null;
  contactName: string;
  country: string;
  customFields: any[]; // Adjust the type if custom fields have a specific structure
  dateAdded: string;
  dateOfBirth: string | null;
  dateUpdated: string;
  dnd: boolean;
  dndSettings: any; // Adjust the type if DND settings have a specific structure
  email: string | null;
  firstName: string;
  followers: string[]; // Assuming followers are represented by user IDs
  id: string;
  lastName: string;
  locationId: string;
  phone: string | null;
  postalCode: string | null;
  source: string | null;
  state: string | null;
  tags: string[]; // Assuming tags are strings
  type: string;
  website: string | null;
  // Add more properties as needed
}
interface Chat {
  id?: string;
  name?: string;
  last_message?: Message | null;
  labels?: Label[]; // Array of Label objects
  contact_id?:string;
  tags?:string[];
}

  interface Message {
    id: string;
    text?: {
      body: string | "";
    };
    from_me?: boolean;
    createdAt?: number;
    type?: string;
    image?: {
      link?: string;
      caption?: string;
    };
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
    const [isLoading, setLoading] = useState<boolean>(false); // Loading state
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null); 
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [stopBotLabelCheckedState, setStopBotLabelCheckedState] = useState<boolean[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedMessage2, setSelectedMessage2] = useState(null); 
    const myMessageClass = "flex-end bg-blue-500 max-w-30 md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 my-0.5 p-2 rounded-md self-end ml-auto text-white text-right";
    const otherMessageClass = "flex-start bg-gray-700 md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 my-0.5 p-2 rounded-md text-white self-start";
    let companyId='014';
    let ghlConfig ={
      ghl_id:'',
      ghl_secret:'',
      refresh_token:'',
    };
    useEffect(() => {
      fetchConfigFromDatabase();
    }, []);
    

    const hasStopBotLabel = (chat: Chat) => {
      // Check if the chat has the "Stop bot" label
      const hasLabel = chat.labels && chat.labels.some(label => label.name === "Stop bot");
      return hasLabel;
    };
    async function fetchConfigFromDatabase() {
 
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
        const data = docSnapshot.data();
        ghlConfig = {
          ghl_id: data.ghl_id,
          ghl_secret: data.ghl_secret,
          refresh_token: data.refresh_token
        };
        setToken(data.whapiToken);
console.log(data)
       const { ghl_id, ghl_secret, refresh_token } = ghlConfig;

        await fetchChatsWithRetry(data.whapiToken,data.ghl_location,data.access_token,dataUser.name);
        await setDoc(doc(firestore, 'companies', companyId), {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        }, { merge: true });
      
      } catch (error) {
        console.error('Error fetching config:', error);
        throw error;
      } finally {
    
      }
    }
    const fetchChatsWithRetry = async (whapiToken: string, locationId: string, ghlToken: string, user_name: string) => {
      console.log(whapiToken);
      try {
        setLoading(true);
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
    
      console.log(companyData)
          // Update Firestore document with new token data
          await setDoc(doc(firestore, 'companies', companyId), {
            access_token: companyData.access_token,
            refresh_token: companyData.refresh_token,
          }, { merge: true });
        const contacts =  await searchContacts(companyData.access_token,companyData.locationId);
        console.log(contacts);
        const response = await fetch(`https://buds-359313.et.r.appspot.com/api/chats/${whapiToken}`); // Pass whapitoken as a request parameter
        console.log(response);
        if (!response.ok) {
          throw new Error('Failed to fetch chats');
        }
        
        const data = await response.json();
        console.log("data"+data.chats);
        console.log(locationId);
                
        // Map chats with initialized tags array
        
        // Map chats with initialized tags array and match with contacts
        const mappedChats = data.chats.map((chat: Chat) => {
          // Extract the phone number from chat.id
          const phoneNumber ="+"+ chat.id!.split('@')[0];
          // Find the corresponding contact for the chat based on phone number
          const contact = contacts.find((contact: any) => contact.phone === phoneNumber);
          // Initialize tags array
          const tags = contact ? contact.tags : [];
          const id = contact? contact.id:"";
          // Return the mapped chat
          return {
            ...chat,
            tags: tags,
            lastMessageBody: '', // Initialize lastMessageBody
            id: chat.id!, // Use phone number as ID
            contact_id:id
          };
        });
        
        console.log("mappedChats Chats:", mappedChats); // Corrected logging statement
        // Fetch contacts
        const conversations = await searchConversations(ghlToken, locationId);
        console.log(conversations);
    
        // Map conversations to chat list and add their numbers
        const mappedConversations = conversations.map((conversation: any) => ({
          id: conversation.id, // Use conversation id as ID
          name: conversation.fullName,
          tags: conversation.tags,
          lastMessageBody: conversation.lastMessageBody
        }));
     
        // Merge conversations into mappedChats based on phone numbers
        mappedConversations.forEach((conversation: any) => {
          const existingChat = mappedChats.find((chat: any) => chat.id === conversation.id);
          console.log(conversation.lastMessageBody);
          if (existingChat) {
            existingChat.tags.push(...conversation.tags);
            existingChat.lastMessageBody = conversation.lastMessageBody;
            existingChat.name = conversation.name;
          } else {
            // If conversation does not exist in mappedChats, add it
            mappedChats.push({
              id: conversation.id,
              name: conversation.name,
              tags: conversation.tags,
              lastMessageBody: conversation.lastMessageBody
            });
          }
        });
      if(companyId === '011'){
    // Check if 'user_name' is in tags before including the chat
    const filteredChats = mappedChats.filter((chat: { tags: any[] }) => {
      return chat.tags && chat.tags.some(tag => typeof tag === 'string' && tag.toLowerCase() === user_name.toLowerCase());
    });
    console.log("Filtered Chats:", filteredChats); // Corrected logging statement
        setChats(filteredChats);
       
        // Log all the chats with tags
        filteredChats.forEach((chat: { id: any; tags: any[]; }) => {
          console.log("Chat ID:", chat.id);
          console.log("Tags:", chat.tags);
        });
      }else{
        setChats(mappedChats);
      }
    
        console.log("user_name:", user_name); // Corrected logging statement
 
        
      
        // Exit the loop if chats are fetched successfully
        return;
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    async function searchConversations(accessToken: any, locationId: any): Promise<any[]> {
      setLoading(true);
      
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
        console.log('Search Conversation Response (Page ' + page + '):', response.data);

        const conversations = response.data.conversations;

        // Concatenate contacts to allContacts array
        allConversation = [...allConversation, ...conversations];
  
          setLoading(false);
          console.log('Search Conversation Response:', allConversation);
          return allConversation;
      } catch (error) {
          console.error('Error searching contacts:', error);
          setLoading(false);
          return [];
      }
  }
  async function searchContacts(accessToken: any, locationId: any): Promise<any[]> {
    setLoading(true);
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
            console.log('Search Contacts Response (Page ' + page + '):', response.data);

            const contacts = response.data.contacts;

            // Concatenate contacts to allContacts array
            allContacts = [...allContacts, ...contacts];
     
            if (contacts.length === 0) {
                // If no contacts received in the current page, we've reached the end
                break;
            }

            // Increment page for the next request
            page++;
        }

        setLoading(false);
        console.log('Search Contacts Response:', allContacts);
        return allContacts;
    } catch (error) {
        console.error('Error searching contacts:', error);
        setLoading(false);
        return [];
    }
}
  
const extractPhoneNumber = (chatId: string): string => {
  // Assuming chatId format is "phone_number_timestamp"
  const parts = chatId.split('@');
  const phoneNumber = parts.length > 0 ? parts[0] : '';
  return `+${phoneNumber}`; // Adding '+' in front of the extracted phone number
};
  // Function to clear messages when a non-WhatsApp icon is clicked
  const handleIconClick =  (iconId: string) => {

    setMessages([]);
    setSelectedIcon(iconId);
  };
  const handleWhatsappClick =  (iconId: string) => {
    // Clear selected chat and messages
    setSelectedIcon(iconId);
    fetchMessages(selectedChatId!,whapiToken!) ;
  };
  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId,whapiToken!);
    }
  }, [selectedChatId]);
  async function fetchMessages(selectedChatId: string, whapiToken: string) {
    if (!selectedChatId) return;
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
      setLoading(true);
      console.log(selectedChatId);
  
      // Check if conversation ID is in WhatsApp format
      if (selectedChatId.includes('@s.whatsapp.net')) {
        // Fetch messages from the WhatsApp API
        const response = await axios.get(`https://buds-359313.et.r.appspot.com/api/messages/${selectedChatId}/${data2.whapiToken}`);
  
        const data = response.data; // AxiosResponse data is accessed directly
  
        // Now you can use the data as needed
       
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
      }else {
        // Fetch messages from the Lead Connector API
        const leadConnectorResponse = await axios.get(`https://services.leadconnectorhq.com/conversations/${selectedChatId}/messages`, {
          headers: {
            Authorization: `Bearer ${data2.access_token}`,
            Version: '2021-04-15',
            Accept: 'application/json'
          }
        });
      
        const leadConnectorData = leadConnectorResponse.data;
        // Map lead connector messages and set them to state
        console.log('Lead Connector Messages:', leadConnectorData.messages.messages);
        setMessages(
          leadConnectorData.messages.messages.map((message: any) => ({
            id: message.id,
            text: { body: message.body },
            from_me: message.direction === 'outbound'?true:false,
            createdAt: message.timestamp,
            type: 'text',
            image: message.image ? message.image : undefined,
          }))
        );
      }
  
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }

const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedChatId) return;
  const auth = getAuth(app);
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
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Failed to send message');
    }

    const data = await response.json();
    console.log('Message sent:', data);
    fetchMessages(selectedChatId!,whapiToken!);
    // Handle any further actions upon successful message sending

} catch (error) {
    console.error('Error sending message:', error);
    // Handle error state or display an error message to the user
}
};

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'visible';
      };
    }, []);
 
  

  
    const handleForwardToChat = (chatId: string) => {
      if (selectedMessage) {
        handleForwardMessage(selectedMessage, chatId);
        hideContextMenu();
      }
    };
  
    const hideContextMenu = () => {
      const contextMenu = document.getElementById('contextMenu');
      if (contextMenu) {
        contextMenu.style.display = 'none';
      }
    };
  
    const handleForwardMessage = async (message: Message, chatId: string) => {
     
    };
    const handleRefreshClick = async () => {
      // Add your refresh logic here
      console.log('Refresh clicked');
   
      await fetchMessages(selectedChatId!,whapiToken!);

    
    };
   
    
  useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}, [selectedChatId, messages]);
    function adjustTextareaHeight() {
      const textarea = inputRef.current;
      if (textarea) {
        console.log("Textarea:", textarea);
        textarea.style.height = 'auto'; // Reset the height to auto to ensure accurate height calculation
        textarea.style.height = textarea.scrollHeight + 'px'; // Set the height to match the content height
      }
    }

  const toggleStopBotLabel = async (chat: any, index: number) => {
    const updatedChats = [...chats]; // Create a copy of the chats array
        const updatedChat = { ...updatedChats[index] }; // Create a copy of the chat object to be updated

        // Toggle the presence of the "stop bot" tag
        if (updatedChat.tags!.includes("stop bot")) {
            // Remove the "stop bot" tag
            updatedChat.tags = updatedChat.tags!.filter(tag => tag !== "stop bot");
        } else {
            // Add the "stop bot" tag
            updatedChat.tags!.push("stop bot");
        }

        // Update the chat in the copied chats array
        updatedChats[index] = updatedChat;

        // Update the state with the modified chats array
        setChats(updatedChats);
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
 
      // Assuming ghlConfig, setToken, and fetchChatsWithRetry are defined elsewhere
  ghlConfig = {
        ghl_id: companyData.ghl_id,
        ghl_secret: companyData.ghl_secret,
        refresh_token: companyData.refresh_token
      };


      const accessToken = companyData.access_token;
        // Check if the chat already has the "Stop bot" label
        const hasLabel = chat.tags.includes('stop bot');

        // If the chat already has the "Stop bot" label, remove it; otherwise, add it
        const method = hasLabel ? 'DELETE' : 'POST';
        let labelId = '';

        // If label exists, get its ID
        if (hasLabel && chat.tags) {
            labelId = chat.tags.find((tags: { name: string; }) => tags.name === "stop bot")?.id || '';

            // Proceed with toggling the label association
            const associationId = chat.contact_id;
            const response = await fetch(`https://services.leadconnectorhq.com/contacts/${associationId}/tags`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer '+accessToken,
                    'Version': '2021-07-28'
                },
                body: JSON.stringify({
                    tags: ["stop bot"]
                })
            });
            console.log(response);
            if (response.ok) {
                const message = await response.json();
                console.log(message);
            } else {
                console.error('Failed to toggle label');
            }
        } else {
            const associationId = chat.contact_id;
            const addLabelResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${associationId}/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer '+accessToken,
                    'Version': '2021-07-28'
                },
                body: JSON.stringify({
                    tags: ["stop bot"]
                })
            });

            if (addLabelResponse.ok) {
                const responseData = await addLabelResponse.json();
                console.log(responseData);
                labelId = responseData.labelId;
            } else {
                console.error('Failed to add label');
            }
        }

        // Update the label state in stopBotLabelCheckedState array
        const updatedState = [...stopBotLabelCheckedState]; // Create a copy of the stopBotLabelCheckedState array
        updatedState[index] = !hasLabel; // Toggle the label state for the specified index
        setStopBotLabelCheckedState(updatedState); // Update the state with the modified stopBotLabelCheckedState array
    } catch (error) {
        console.error('Error toggling label:', error);
    }
};

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <div className="flex h-screen overflow-hidden">
          <div className="w-full sm:w-1/5 p-4 bg-gray-200 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              {/* Refresh icon */}
              <button className="flex items-center px-4 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-300 transform bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring focus:ring-indigo-300 focus:ring-opacity-80" onClick={handleRefreshClick}>
                <svg className="w-5 h-5 mx-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div>
              {chats.map((chat, index) => (
                <div key={chat.id} className={`p-2 mb-2 rounded cursor-pointer ${selectedChatId === chat.id ? 'bg-gray-300' : 'hover:bg-gray-100'}`} onClick={() => setSelectedChatId(chat.id!)}>
                  <span className="font-semibold truncate">{chat.name ?? extractPhoneNumber(chat.id!)}</span>
                  {chat.last_message ? (
                    <span className="text-gray-500 block" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {chat.last_message.text ? chat.last_message.text.body : 'No Messages'}
                    </span>
                  ) : (
                    <span className="text-gray-500 block">No Messages</span>
                  )}
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      value="" 
                      className="sr-only peer" 
                      checked={chat.tags?.includes("stop bot")} 
                      onChange={() => toggleStopBotLabel(chat, index)} // Pass index to identify the chat
                    />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 border-2 border-blue-500 p-1">
                    </div>
                  </label>
                  {index !== chats.length - 1 && <hr className="my-2 border-gray-300" />} {/* Add divider except for the last chat */}
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full sm:w-4/5 p-4 bg-white overflow-y-auto relative" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="h-full overflow-y-auto" style={{ paddingBottom: "200px" }}>
              {isLoading && (
                <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50 ">
                  <div className=" items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
                    <div role="status">
                      <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
              {/* Messages content */}
              {messages.slice().reverse().map((message) => (
   <div
   className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}


   style={{
     maxWidth: '70%',
     width: `${message.type === 'image' ? '320' : Math.min(message.text!.body?.length * 15 || 0, 350)}px`,
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
              <div ref={messagesEndRef}></div>
            </div>
            <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-300 py-2 px-4 sm:px-20">
            <div className="message-source-buttons flex items-center mb-2 md:mb-0">
            <img
              className={`source-button ${selectedIcon === 'ws' ? 'border-2 border-blue-500' : ''}`}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon4.png?alt=media&token=d4ab65b6-9b90-4aca-9d69-6263300a91ec"
              alt="WhatsApp"
              onClick={() => handleWhatsappClick('ws')}
              style={{ width: '30px', height: '30px' }} // Adjust size as needed
            />
            <img
              className={`source-button ${selectedIcon === 'fb' ? 'border-2 border-blue-500' : ''}`}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/facebook-logo-on-transparent-isolated-background-free-vector-removebg-preview.png?alt=media&token=c312eb23-dfee-40d3-a55c-476ef3041369"
              alt="Facebook"
              onClick={() => handleIconClick('fb')}
              style={{ width: '30px', height: '30px' }} // Adjust size as needed
            />
            <img
              className={`source-button ${selectedIcon === 'ig' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('ig')}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon3.png?alt=media&token=9395326d-ff56-45e7-8ebc-70df4be6971a"
              alt="Instagram"
              style={{ width: '30px', height: '30px' }} // Adjust size as needed
            />
            <img
              className={`source-button ${selectedIcon === 'gmb' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('gmb')}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon1.png?alt=media&token=10842399-eca4-40d1-9051-ea70c72ac95b"
              alt="Google My Business"
              style={{ width: '20px', height: '20px' }} // Adjust size as needed
            />
            <img
              className={`source-button ${selectedIcon === 'mail' ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleIconClick('mail')}
              src="https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/icon2.png?alt=media&token=813f94d4-cad1-4944-805a-2454293278c9"
              alt="Email"
              style={{ width: '30px', height: '30px' }} // Adjust size as needed
            />
       
          </div>
              <div className="flex items-center">
                <textarea
                  className="flex-grow px-4 py-2 border border-gray-400 rounded focus:outline-none focus:border-blue-500 text-lg mr-2 resize-none"
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault(); // Prevents the default behavior of adding a new line in the textarea
                      handleSendMessage();
                      setNewMessage('');
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
            }  

  export default Main;
