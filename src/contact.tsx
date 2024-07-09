import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getAuth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, getDocs, query, startAfter, limit, QueryDocumentSnapshot, DocumentData, Query, CollectionReference, writeBatch } from "firebase/firestore";
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
  totalContacts: number;
}

const ContactsContext = createContext<ContactsContextProps | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
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
      const storedContacts = localStorage.getItem('contacts');
      if (storedContacts) {
        const parsedContacts = JSON.parse(LZString.decompress(storedContacts)!);
        setContacts(parsedContacts);
        setTotalContacts(parsedContacts.length);
        setIsLoading(false);
      } else {
        fetchContactsOnAuthChange();
      }
    } else {
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  const fetchContactsOnAuthChange = useCallback(() => {
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
        const batchSize = 1000;
        let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
        const phoneSet = new Set<string>();
        let allContacts: Contact[] = [];

        // New function to fetch a batch of contacts
        const fetchBatch = async (limitCount: number) => {
          const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`) as CollectionReference<DocumentData>;
          const queryRef = lastVisible
            ? query(contactsCollectionRef, startAfter(lastVisible), limit(limitCount))
            : query(contactsCollectionRef, limit(limitCount));

          const contactsSnapshot = await getDocs(queryRef);
          const contactsBatch: Contact[] = contactsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact));

          if (contactsBatch.length === 0) return false;

          contactsBatch.forEach(contact => {
            if (contact.phone && !phoneSet.has(contact.phone)) {
              phoneSet.add(contact.phone);
              allContacts.push(contact);
            }
          });

          lastVisible = contactsSnapshot.docs[contactsSnapshot.docs.length - 1];
          return true;
        };

        // Fetch and display initial batch of 2000 contacts
        for (let i = 0; i < 2; i++) {
          const hasMore = await fetchBatch(batchSize);
          if (!hasMore) break;
        }

        // Fetch pinned chats
        const pinnedChatsRef = collection(firestore, `user/${user.email!}/pinned`);
        const pinnedChatsSnapshot = await getDocs(pinnedChatsRef);
        const pinnedChats = pinnedChatsSnapshot.docs.map(doc => doc.data() as Contact);

        // Add pinned status to allContacts
        allContacts = allContacts.map(contact => {
          const isPinned = pinnedChats.some(pinned => pinned.chat_id === contact.chat_id);
          if (isPinned) {
            contact.pinned = true;
          }
          return contact;
        });

        // Sort contactsData by pinned status and most recent message
        const sortContacts = (contacts: Contact[]) => {
          return contacts.sort((a, b) => {
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
        };

        // Set initial contacts state
        const initialSortedContacts = sortContacts([...allContacts]);
        setContacts(initialSortedContacts);
        setTotalContacts(allContacts.length);
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(initialSortedContacts)));
        sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been fetched in this session
        setIsLoading(false);

        // Fetch remaining contacts in the background
        while (await fetchBatch(batchSize)) {
          // Add pinned status to new contacts
          allContacts = allContacts.map(contact => {
            const isPinned = pinnedChats.some(pinned => pinned.chat_id === contact.chat_id);
            if (isPinned) {
              contact.pinned = true;
            }
            return contact;
          });

          // Update contacts state in the background
          const sortedContacts = sortContacts([...allContacts]);
          setContacts(sortedContacts);
          setTotalContacts(allContacts.length);
          localStorage.setItem('contacts', LZString.compress(JSON.stringify(sortedContacts)));
        }

        // Update pinned contacts in batches
        const batch = writeBatch(firestore);
        allContacts.forEach(contact => {
          if (contact.pinned) {
            const contactDocRef = doc(firestore, `companies/${companyId}/contacts`, contact.id);
            batch.set(contactDocRef, contact, { merge: true });
          }
        });
        await batch.commit();

      } catch (error) {
        console.error('Error fetching contacts:', error);
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
  }, []);

  return (
    <ContactsContext.Provider value={{ contacts, isLoading, totalContacts }}>
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