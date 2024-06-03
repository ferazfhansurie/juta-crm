import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import axios from "axios";
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

        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          setIsLoading(false);
          return;
        }

        const data = docSnapshot.data();

        const url = `http://localhost:8443/api/chats/${data?.whapiToken}/${data?.ghl_location}/${data?.ghl_accessToken}/${dataUser.name}/${dataUser.role}/${dataUser.email}`;
        const response = await axios.get(url);

        setContacts(response.data.contacts);
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(response.data.contacts)));
        sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been fetched in this session
        navigate('/chat');  // Navigate to the chat page after fetching contacts
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
        navigate('/login');  // Redirect to login page if not authenticated
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
