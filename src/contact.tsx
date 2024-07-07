import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs,setDoc,query, startAfter, limit, QueryDocumentSnapshot, DocumentData ,Query,CollectionReference} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { useNavigate } from "react-router-dom";
import LZString from 'lz-string';

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
interface Contact {
  chat_id: string;
  chat_pic?: string | null;
  chat_pic_full?: string | null;
  contactName: string;
  conversation_id: string;
  id: string;
  last_message?: {
    chat_id: string;
    from: string;
    from_me: boolean;
    id: string;
    source: string;
    text: {
      body: string;
    };
    timestamp: number;
    createdAt?: string;
    type: string;
  };
  phone: string;
  pinned?: boolean;
  tags: string[];
  unreadCount: number;
}

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

interface ContactsContextProps {
  contacts: any[];
  isLoading: boolean;
}

const ContactsContext = createContext<ContactsContextProps | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear the session flag when the page reloads
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem('contactsFetched');
    });

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave? Changes you made may not be saved.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const shouldFetchContacts = !sessionStorage.getItem('contactsFetched');

    if (shouldFetchContacts) {
      fetchContactsOnAuthChange();
    } else {
      const storedContacts = localStorage.getItem('contacts');
      if (storedContacts) {
        setContacts(JSON.parse(LZString.decompress(storedContacts)!));
      }
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  const fetchContactsOnAuthChange = () => {
    const fetchContacts = async (user: User) => {
      try {
        setIsLoading(true);
    
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          setIsLoading(false);
          return;
        }
    
        const dataUser = docUserSnapshot.data();
        const companyId = dataUser?.companyId;
        if (!companyId) {
          setIsLoading(false);
          return;
        }
    
        // Pagination settings
        const batchSize = 4000;
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
        const pinnedChatsRef = collection(firestore, `user/${user.email!}/pinned`);
        const pinnedChatsSnapshot = await getDocs(pinnedChatsRef);
        const pinnedChats = pinnedChatsSnapshot.docs.map(doc => doc.data() as Contact);
    
        // Add pinned status to contactsData and update in Firebase
        const updatePromises = allContacts.map(async contact => {
          const isPinned = pinnedChats.some(pinned => pinned.chat_id === contact.chat_id);
          if (isPinned) {
            contact.pinned = true;
            const contactDocRef = doc(firestore, `companies/${companyId}/contacts`, contact.id);
            await setDoc(contactDocRef, contact, { merge: true });
          }
        });
    
        await Promise.all(updatePromises);
    
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
      } finally {
        setIsLoading(false);
      }
    };
    
    

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchContacts(user);
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  };

  return (
    <ContactsContext.Provider value={{ contacts, isLoading }}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};

export { ContactsContext };
