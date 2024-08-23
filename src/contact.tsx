import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs,setDoc,query, startAfter, limit, QueryDocumentSnapshot, DocumentData ,Query,CollectionReference} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { useNavigate, useLocation } from "react-router-dom";
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
  additionalEmails?: string[];
  address1?: string | null;
  assignedTo?: string | null;
  businessId?: string | null;
  chat?: {
    contact_id: string;
    id: string;
  };
  name?: string;
  not_spam?: boolean;
  timestamp?: number;
  type?: string;
  city?: string | null;
  companyName?: string | null;
  threadid?: string;
}

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

interface ContactsContextProps {
  contacts: any[];
  isLoading: boolean;
  refetchContacts: () => Promise<void>;
}

const ContactsContext = createContext<ContactsContextProps | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [v2, setV2] = useState<boolean | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();

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

      // Check for v2
      const companyDocRef = doc(firestore, 'companies', companyId);
      const companyDocSnapshot = await getDoc(companyDocRef);
      if (companyDocSnapshot.exists()) {
        const companyData = companyDocSnapshot.data();
        setV2(companyData.v2 || false);
        if (companyData.v2) {
          // If v2 is true, navigate to loading page and return
          if (location.pathname.includes('/chat')) {
            
          }
          else{
            navigate('/loading');
            return;
          }
       
        }
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
        const contactsBatch: Contact[] = contactsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            additionalEmails: data.additionalEmails || [],
            address1: data.address1 || null,
            assignedTo: data.assignedTo || null,
            businessId: data.businessId || null,
            chat: data.chat || {},
            name: data.name || '',
            not_spam: data.not_spam || false,
            timestamp: data.timestamp || 0,
            type: data.type || '',
            city: data.city || null,
            companyName: data.companyName || null,
            threadid: data.threadid || '',
            unreadCount:data.unreadCount ||0,
          } as Contact;
        });
    
        if (contactsBatch.length === 0) break; // Exit if no more documents
    
        contactsBatch.forEach(contact => {
          if (contact.phone && !phoneSet.has(contact.phone)) {
            phoneSet.add(contact.phone);
            allContacts.push(contact);
          }
        });
    console.log(allContacts);
        lastVisible = contactsSnapshot.docs[contactsSnapshot.docs.length - 1];
      }
    

    
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

  const refetchContacts = async () => {
    const user = auth.currentUser;
    if (user) {
      await fetchContacts(user);
    }
  };

  useEffect(() => {
    // Clear the session flag when the page reloads
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem('contactsFetched');
      sessionStorage.removeItem('contacts');
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

  useEffect(() => {
    if (!isLoading && v2 === false && location.pathname === '/loading') {
      navigate('/chat');
    }
  }, [isLoading, v2, location.pathname, navigate]);

  const fetchContactsOnAuthChange = () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchContacts(user);
      } else {
        setIsLoading(false);
        setV2(undefined);
      }
    });

    return () => unsubscribe();
  };

  return (
    <ContactsContext.Provider value={{ contacts, isLoading, refetchContacts }}>
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