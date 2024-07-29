import _ from "lodash";
import clsx from "clsx";
import React, { useState, useEffect, useRef } from "react";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { Dialog, Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc,updateDoc,addDoc, arrayUnion, arrayRemove, Timestamp, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { rateLimiter } from '../../utils/rate';
import { useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useContacts } from "@/contact";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LZString from 'lz-string';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
const auth = getAuth(app);
const firestore = getFirestore(app);


function Main() {
  interface Contact {
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
    chat_pic_full?: string | null;
  }
  
  interface Employee {
    id: string;
    name: string;
    role: string;
  }
  interface Tag {
    id: string;
    name: string;
  }
  interface TagsState {
    [key: string]: string[];
  }

  interface ScheduledMessage {
    chatId: string;
    message: string;
    imageUrl?: string;
    documentUrl?: string;
    mimeType?: string;
    fileName?: string;
    scheduledTime: Timestamp;
    batchQuantity: number;
    repeatInterval: number;
    repeatUnit: 'minutes' | 'hours' | 'days';
    additionalInfo: {
      contactName?: string;
      phone?: string;
      email?: string;
      // ... any other contact fields you want to include
    };
    status: 'scheduled' | 'sent' | 'failed';
    createdAt: Timestamp;
    sentAt?: Timestamp;
    error?: string;
  }
  
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
  const [editContactModal, setEditContactModal] = useState(false);
  const [viewContactModal, setViewContactModal] = useState(false);
  const deleteButtonRef = useRef(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isFetching, setFetching] = useState<boolean>(false);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [addContactModal, setAddContactModal] = useState(false);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [showDeleteTagModal, setShowDeleteTagModal] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [tags, setTags] = useState<TagsState>({}); 
  const [blastMessageModal, setBlastMessageModal] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [progress, setProgress] = useState<number>(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const contactsPerPage = 200;
  const contactListRef = useRef<HTMLDivElement>(null);
  const { contacts: initialContacts, refetchContacts } = useContacts();
  const [totalContacts, setTotalContacts] = useState(contacts.length);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address1: '',
      companyName: '',
      locationId:'',
  });
  const [total, setTotal] = useState(0);
  const [fetched, setFetched] = useState(0);
  const [allContactsLoaded, setAllContactsLoaded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [blastStartTime, setBlastStartTime] = useState<Date | null>(null);
  const [batchQuantity, setBatchQuantity] = useState<number>(10);
  const [repeatInterval, setRepeatInterval] = useState<number>(0);
  const [repeatUnit, setRepeatUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [showSyncConfirmationModal, setShowSyncConfirmationModal] = useState(false);

  useEffect(() => {
    if (initialContacts.length > 0) {
      loadMoreContacts();
    }
  }, [initialContacts]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        contactListRef.current &&
        contactListRef.current.scrollTop + contactListRef.current.clientHeight >=
          contactListRef.current.scrollHeight
      ) {
        loadMoreContacts();
      }
    };

    if (contactListRef.current) {
      contactListRef.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (contactListRef.current) {
        contactListRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [contacts]);

  const loadMoreContacts = () => {
    if (initialContacts.length <= contacts.length) return;

    const nextPage = currentPage + 1;
    const newContacts = initialContacts.slice(
      contacts.length,
      nextPage * contactsPerPage
    );

    setContacts((prevContacts) => [...prevContacts, ...newContacts]);
    setCurrentPage(nextPage);
  };

const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedMedia(file);
  }
};

const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedDocument(file);
  }
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

  
let role = 1;
let userName ='';
useEffect(() => {
  setTotalContacts(contacts.length);
}, [contacts]);
const handleTagFilterChange = (tag: string) => {
  setSelectedTagFilter(tag);
};

const handleSaveNewContact = async () => {
  try {
    console.log(newContact);
    
    const user = auth.currentUser;
    const docUserRef = doc(firestore, 'user', user?.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document for user!');
      return;
    }

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
    const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);

    // Add new contact to Firebase
    await addDoc(contactsCollectionRef, {
      firstName: newContact.firstName,
      lastName: newContact.lastName,
      email: newContact.email,
      phone: newContact.phone,
      address1: newContact.address1,
      companyName: newContact.companyName,
      locationId: newContact.locationId,
      dateAdded: new Date().toISOString()
    });

    toast.success("Contact added successfully!");
    setAddContactModal(false);
    setContacts(prevContacts => [...prevContacts, newContact]);
    setNewContact({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address1: '',
      companyName: '',
      locationId: '',
    });
  } catch (error) {
    console.error('Error adding contact:', error);
    toast.error("An error occurred while adding the contact." + error);
  }
};
const handleSaveNewTag = async () => {
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
    const accessToken = companyData.ghl_accessToken;
    const locationId = companyData.ghl_location;

    const apiUrl = `https://services.leadconnectorhq.com/locations/${locationId}/tags`;
    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      data: {
        name: newTag
      }
    };

    const response = await axios(apiUrl, options);
    console.log(response.data);
    setTagList([...tagList, response.data.tag]);
    setShowAddTagModal(false);
    setNewTag("");
    toast.success("Tag added successfully!");
  } catch (error) {
    console.error('Error adding tag:', error);
    toast.error("An error occurred while adding the tag.");
  }
};

const handleConfirmDeleteTag = async () => {
  if (!tagToDelete) return;

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
    const accessToken = companyData.ghl_accessToken;
    const locationId = companyData.ghl_location;

    const apiUrl = `https://services.leadconnectorhq.com/locations/${locationId}/tags/${tagToDelete.id}`;
    const options = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        Accept: 'application/json'
      }
    };

    const response = await axios(apiUrl, options);
    if (response.status === 200) {
      setTagList(tagList.filter(tag => tag.id !== tagToDelete.id));
      setShowDeleteTagModal(false);
      setTagToDelete(null);
      toast.success("Tag deleted successfully!");
    } else {
      console.error('Failed to delete tag:', response.statusText);
      toast.error("Failed to delete tag.");
    }
  } catch (error) {
    console.error('Error deleting tag:', error);
    toast.error("An error occurred while deleting the tag.");
  }
};

  const handleEyeClick = () => {
    setIsTabOpen(!isTabOpen);
  };
  
  const toggleContactSelection = (contact: Contact) => {
    const isSelected = selectedContacts.some((c) => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const isContactSelected = (contact: Contact) => {
    return selectedContacts.some((c) => c.id === contact.id);
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedContacts([...contacts]);
    } else {
      setSelectedContacts([]);
    }
  };
  const fetchTags = async (token:string, location:string, employeeList: string[]) => {
    const maxRetries = 5; // Maximum number of retries
    const baseDelay = 1000; // Initial delay in milliseconds
setLoading(true);
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
            // Filter out tags that match with employeeList
      const filteredTags = response.data.tags.filter((tag: Tag) => !employeeList.includes(tag.name));
      
      setTagList(filteredTags);
      setLoading(true);
    } catch (error) {
        console.error('Error fetching tags:', error);
        setLoading(true);
        return [];
    }
};
  async function fetchCompanyData() {
    const user = auth.currentUser;
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      role = userData.role;
      userName = userData.name;
      setShowAddUserButton(userData.role === "1");

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      console.log(companyData.tags);
      console.log('tags');
 
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
      });
     console.log(employeeListData);
      setEmployeeList(employeeListData);
      const employeeNames = employeeListData.map(employee => employee.name.trim().toLowerCase());
     
      if (companyData.v2 !== true) {
        await fetchTags(companyData.ghl_accessToken, companyData.ghl_location, employeeNames);
      } else {
        console.log('v2');
            if (companyData.tags) {
        let tagsArray: Tag[] = [];
        
        if (Array.isArray(companyData.tags)) {
          tagsArray = companyData.tags.map((tag: any) => ({
            id: tag.id.toString(),
            name: tag.name
          }));
        } else if (typeof companyData.tags === 'object') {
          tagsArray = Object.entries(companyData.tags).map(([id, name]) => ({
            id: id.toString(),
            name: name as string
          }));
        }
        
        setTagList(tagsArray);
        console.log('Tags set:', tagsArray);
      } else {
        setTagList([]);
        console.log('No tags found, setting empty array');
      }
      }
      setLoading(false);
     // await searchContacts(companyData.ghl_accessToken, companyData.ghl_location);


    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  }

  const verifyContactIdExists = async (contactId: string, accessToken: string) => {
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return false;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, `companies/${companyId}/contacts`, contactId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for contact!');
        return false;
      }
  
      // If the contact exists, return true
      return true;
    } catch (error) {
      console.error('Error verifying contact ID:', error);
      return false;
    }
  };

  
  const handleAddTagToSelectedContacts = async (selectedEmployee: string, contact: Contact) => {
    const user = auth.currentUser;
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
  
    if (selectedEmployee) {
      const tagName = selectedEmployee;
      const updatedTags = [...new Set([...(contact.tags || []), tagName])];
  
      if (!contact.id) {
        console.error('Contact ID is missing');
        return;
      }
  
      const contactExists = await verifyContactIdExists(contact.id, companyData.ghl_accessToken);
      if (!contactExists) {
        console.error(`Contact with ID ${contact.id} not found`);
        toast.error(`Contact with ID ${contact.id} not found`);
        return;
      }
  
      const success = await updateContactTags(contact.id, companyData.ghl_accessToken, updatedTags, tagName);
      if (success) {
        setContacts(prevContacts =>
          prevContacts.map(c =>
            c.id === contact.id ? { ...c, tags: updatedTags } : c
          )
        );
  
        if (currentContact?.id === contact.id) {
          setCurrentContact((prevContact: any) => ({
            ...prevContact,
            tags: updatedTags,
          }));
        }
  
        localStorage.setItem('contacts', LZString.compress(JSON.stringify((prevContacts: any[]) =>
          prevContacts.map(c =>
            c.id === contact.id ? { ...c, tags: updatedTags } : c
          ))));
        sessionStorage.setItem('contactsFetched', 'true');
        toast.success("Tag added successfully!");
      }
    }
  };

  const handleSyncConfirmation = () => {
    setShowSyncConfirmationModal(true);
  };

  const handleConfirmSync = async () => {
    setShowSyncConfirmationModal(false);
    await handleSyncContact();
  };

  const handleSyncContact = async () => {
    try {
      setFetching(true);
      const user = auth.currentUser;
      if (!user) {
        setFetching(false);
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        setFetching(false);
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser?.companyId;
      if (!companyId) {
        setFetching(false);
        return;
      }
  
      const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsCollectionRef);
  
      // Delete existing documents in the collection
      const deletePromises = contactsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        setFetching(false);
        return;
      }
  
      const dataCompany = docSnapshot.data();
      console.log(dataCompany);
  
      const url = `http://localhost:8444/api/chats/${dataCompany?.whapiToken}/${dataCompany?.ghl_location}/${dataCompany?.ghl_accessToken}/${dataUser.name}/${dataUser.role}/${dataUser.email}/${dataUser.companyId}`;
      const response = await axios.get(url);
      let allContacts = response.data.contacts;
      console.log(allContacts.length);
  
      setContacts(allContacts);
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
      sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been fetched in this session
  
      // Add new contacts to the Firebase subcollection
      const addPromises = allContacts.map(async (contact: any) => {
        try {
          const contactDocRef = doc(contactsCollectionRef, contact.phone); // Use contact.phone as the document ID
          await setDoc(contactDocRef, contact);
          console.log("Added contact to Firebase:", contact);
        } catch (error) {
          console.error('Error adding contact to Firebase:', error);
        }
      });
  
      await Promise.all(addPromises);
  
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setFetching(false);
    }
  };
  
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
  
      await updateDoc(doc(firestore, `companies/${companyId}/contacts`, contactId), {
        tags: arrayRemove(tagName)
      });
  
      // Update state
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact.id === contactId
            ? { ...contact, tags: (contact.tags ?? []).filter(tag => tag !== tagName) }
            : contact
        )
      );
  
      const updatedContacts = contacts.map((contact: Contact) =>
        contact.id === contactId
          ? { ...contact, tags: (contact.tags ?? []).filter((tag: string) => tag !== tagName) }
          : contact
      );
  
      const updatedSelectedContact = updatedContacts.find(contact => contact.id === contactId);
      if (updatedSelectedContact) {
        setSelectedContacts(prevSelectedContacts =>
          prevSelectedContacts.map(contact =>
            contact.id === contactId
              ? { ...contact, tags: (contact.tags ?? []).filter(tag => tag !== tagName) }
              : contact
          )
        );
      }
  
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
      sessionStorage.setItem('contactsFetched', 'true');
  
      toast.success('Tag removed successfully!');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag.');
    }
  };
  

  async function updateContactTags(contactId: string, accessToken: string, tags: string[], tagName:string) {
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
        setSelectedContacts(prevSelectedContacts =>
          prevSelectedContacts.map(contact =>
            contact.id === contactId
              ? { ...contact, tags: contact.tags!.filter(tag => tag !== tagName) }
              : contact
          )
        );
      }
      
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
      sessionStorage.setItem('contactsFetched', 'true');
      
      toast.success('Tag removed successfully!');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating contact tags:', error.response?.data || error.message);
      } else {
        console.error('Unexpected error updating contact tags:', error);
      }
      return false;
    }
  }

  const navigate = useNavigate(); // Initialize useNavigate
  const handleClick = (phone: any) => {
const tempphone = phone.split('+')[1];
const chatId = tempphone + "@s.whatsapp.net"
    navigate(`/chat/?chatId=${chatId}`);
  };
  async function searchContacts(accessToken: string, locationId: string) {
    setLoading(true);
    setFetching(true);
    setProgress(0);
    try {
      let allContacts: any[] = [];
      let fetchMore = true;
      let nextPageUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`;
  
      const maxRetries = 5;
      const baseDelay = 5000;
  
      const fetchData = async (url: string, retries: number = 0): Promise<any> => {
        const options = {
          method: 'GET',
          url: url,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
          },
        };
        try {
          const response = await axios.request(options);
          console.log(response.data.meta.total);
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
  
      let fetchedContacts = 0;
      let totalContacts = 0;
      while (fetchMore) {
        const response = await fetchData(nextPageUrl);
        const contacts = response.data.contacts;
        totalContacts = response.data.meta.total;
  
        if (contacts.length > 0) {
          allContacts = [...allContacts, ...contacts];
          if (role === 2) {
            const filteredContacts = allContacts.filter(contact => contact.tags.some((tag: string) => typeof tag === 'string' && tag.toLowerCase().includes(userName.toLowerCase())));
            setContacts([...filteredContacts]);
          } else {
            setContacts([...allContacts]);
          }
  
          fetchedContacts = allContacts.length;
          setTotal(totalContacts);
          setFetched(fetchedContacts);
          setProgress((fetchedContacts / totalContacts) * 100);
          setLoading(false);
        }
  
        if (response.data.meta.nextPageUrl) {
          nextPageUrl = response.data.meta.nextPageUrl;
        } else {
          fetchMore = false;
        }
      }
    } catch (error) {
      console.error('Error searching contacts:', error);
    } finally {
      setFetching(false);
    }
  }
  const handleEditContact = (contact: Contact) => {
    setCurrentContact(contact);
    setEditContactModal(true);
  };

  const handleViewContact = (contact: Contact) => {
    setCurrentContact(contact);
    setViewContactModal(true);
  };

  const handleDeleteContact = async () => {
    if (currentContact) {
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
            const accessToken = companyData.ghl_accessToken; // Replace with your actual access token
            const apiUrl = `https://services.leadconnectorhq.com/contacts/${currentContact.id}`;

            const options = {
                method: 'DELETE',
                url: apiUrl,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Version: '2021-07-28',
                    Accept: 'application/json'
                }
            };

            const response = await axios.request(options);
            if (response.status === 200) {
              setContacts(prevContacts => prevContacts.filter(contact => contact.id !== currentContact.id));
              localStorage.setItem('contacts', LZString.compress(JSON.stringify(contacts)));
              setDeleteConfirmationModal(false);
              setCurrentContact(null);
              toast.success("Contact deleted successfully!");
            } else {
                console.error('Failed to delete contact:', response.statusText);
                toast.error("Failed to delete contact.");
            }
        } catch (error) {
            console.error('Error deleting contact:', error);
            toast.error("An error occurred while deleting the contact.");
        }
    }
};

const handleSaveContact = async () => {
  if (currentContact) {
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
      const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);

      if (!currentContact.phone) {
        console.error('Contact phone is missing');
        return;
      }
      
      const contactDocRef = doc(contactsCollectionRef, currentContact.phone);

      // Update contact in Firebase
      await updateDoc(contactDocRef, {
        firstName: currentContact.firstName,
        lastName: currentContact.lastName,
        email: currentContact.email,
        phone: currentContact.phone,
        address1: currentContact.address1,
        city: currentContact.city,
        state: currentContact.state,
        postalCode: currentContact.postalCode,
        website: currentContact.website,
        dnd: currentContact.dnd,
        dndSettings: currentContact.dndSettings,
        tags: currentContact.tags,
        customFields: currentContact.customFields,
        source: currentContact.source,
        country: currentContact.country,
        dateUpdated: new Date().toISOString()
      });

      setContacts(contacts.map(contact => (contact.phone === currentContact.phone ? currentContact : contact)));
      setEditContactModal(false);
      setCurrentContact(null);
      toast.success("Contact updated successfully!");
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error("Failed to update contact.");
    }
  }
};



  useEffect(() => {
    fetchCompanyData();
  }, []);

  const filteredContacts = contacts.filter(contact => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    return (
      (contact.firstName?.toLowerCase().includes(lowerCaseQuery) ||
        contact.phone?.includes(lowerCaseQuery) ||
        contact.contactName?.toLowerCase().includes(lowerCaseQuery)) &&
      (selectedTagFilter ? (contact.tags ?? []).includes(selectedTagFilter) : true)
    );
  });


  useEffect(() => {
    console.log('Contacts:', contacts);
    console.log('Filtered Contacts:', filteredContacts);
    console.log('Search Query:', searchQuery);
  }, [contacts, filteredContacts, searchQuery]);
console.log(filteredContacts);
  // Get current contacts for pagination
  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);

  const sendBlastMessage = async () => {
    console.log('Starting sendBlastMessage function');

    if (selectedContacts.length === 0) {
      console.log('No contacts selected');
      toast.error("No contacts selected!");
      return;
    }

    if (!blastStartTime) {
      console.log('No start time selected');
      toast.error("Please select a start time for the blast message.");
      return;
    }

    const now = new Date();
    const scheduledTime = new Date(blastStartTime);

    if (scheduledTime <= now) {
      console.log('Selected time is in the past');
      toast.error("Please select a future time for the blast message.");
      return;
    }

    try {
      let mediaUrl = '';
      let documentUrl = '';
      if (selectedMedia) {
        console.log('Uploading media...');
        mediaUrl = await uploadFile(selectedMedia);
        console.log(`Media uploaded. URL: ${mediaUrl}`);
      }
      if (selectedDocument) {
        console.log('Uploading document...');
        documentUrl = await uploadFile(selectedDocument);
        console.log(`Document uploaded. URL: ${documentUrl}`);
      }

      const user = auth.currentUser;
      console.log(`Current user: ${user?.email}`);

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      console.log(`Company ID: ${companyId}`);

      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = companySnapshot.data();
      const isV2 = companyData.v2 || false;
      const whapiToken = companyData.whapiToken || '';

      for (const contact of selectedContacts) {
        const phoneNumber = contact.phone?.replace(/\D/g, '');
        if (!phoneNumber) {
          console.error(`Invalid phone number for contact: ${contact.id}`);
          continue;
        }
        const chat_id = phoneNumber + "@s.whatsapp.net";
        console.log(`Scheduling message for chat_id: ${chat_id}`);
        
        const scheduledMessageData = {
          batchQuantity: batchQuantity,
          chatId: chat_id,
          companyId: companyId,
          createdAt: Timestamp.now(),
          documentUrl: documentUrl || "",
          fileName: selectedDocument ? selectedDocument.name : null,
          mediaUrl: mediaUrl || "",
          message: blastMessage,
          mimeType: selectedMedia ? selectedMedia.type : (selectedDocument ? selectedDocument.type : null),
          repeatInterval: repeatInterval,
          repeatUnit: repeatUnit,
          scheduledTime: Timestamp.fromDate(scheduledTime),
          status: "scheduled",
          v2: isV2,
          whapiToken: isV2 ? null : whapiToken,
        };

        console.log(scheduledTime);

        // Make API call to schedule the message
        const response = await axios.post(`https://mighty-dane-newly.ngrok-free.app/api/schedule-message/${companyId}`, scheduledMessageData);

        console.log(`Scheduled message added. Document ID: ${response.data.id}`);
      }

      // Show success toast
      toast.success(`Blast messages scheduled successfully for ${selectedContacts.length} contacts.`);
      toast.info(`Messages will be sent at: ${scheduledTime.toLocaleString()} (local time)`);

      // Close the modal and reset state
      setBlastMessageModal(false);
      setBlastMessage("");
      setBlastStartTime(null);
      setBatchQuantity(10);
      setRepeatInterval(0);
      setRepeatUnit('days');
      setSelectedMedia(null);
      setSelectedDocument(null);

    } catch (error) {
      console.error('Error scheduling blast messages:', error);
      toast.error("An error occurred while scheduling blast messages. Please try again.");
    }

    console.log('sendBlastMessage function completed');
  };
  

  const sendImageMessage = async (id: string, imageUrl: string,caption?: string) => {
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
      const phoneNumber = id.split('+')[1];
      const chat_id = phoneNumber+"@s.whatsapp.net"
      const companyData = docSnapshot.data();
      const response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/messages/image/${companyData.whapiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chat_id,
          imageUrl: imageUrl,
          caption: caption || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to send image message: ${response.statusText}`);
      }
  
      const data = await response.json();
    
      console.log('Image message sent successfully:', data);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };
  
  const sendDocumentMessage = async (id: string, imageUrl: string,mime_type:string,fileName:string, caption?: string,) => {
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
      const phoneNumber = id.split('+')[1];
      const chat_id = phoneNumber+"@s.whatsapp.net"
      const companyData = docSnapshot.data();
      const response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/messages/document/${companyData.whapiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chat_id,
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
  
      console.log('Image message sent successfully:', data);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCsvFile(file);
    }
  };

  const handleCsvImport = async () => {
    if (!selectedCsvFile) {
      toast.error("Please select a CSV file to import.");
      return;
    }
  
    try {
      setLoading(true);
      // Upload CSV file to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, `csv_imports/${selectedCsvFile.name}`);
      await uploadBytes(storageRef, selectedCsvFile);
      const csvUrl = await getDownloadURL(storageRef);
  
      // Get company ID
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        throw new Error('No such document for user!');
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      console.log(`Sending request to: https://mighty-dane-newly.ngrok-free.app/api/import-csv/${companyId}`);
      console.log('CSV URL:', csvUrl);

      // Call server API to process CSV
      const response = await axios.post(`https://mighty-dane-newly.ngrok-free.app/api/import-csv/${companyId}`, { csvUrl });

      console.log('Server response:', response);

      if (response.status === 200) {
        toast.success("CSV imported successfully!");
        setShowCsvImportModal(false);
        setSelectedCsvFile(null);
        
        // Fetch updated contacts and store them in local storage
        await refetchContacts();
        
        toast.info("Contacts updated and stored in local storage.");
      } else {
        throw new Error(`Failed to import CSV: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data);
      }
      toast.error("An error occurred while importing the CSV.");
    } finally {
      setLoading(false);
    }
  };

  async function sendTextMessage(id: string, blastMessage: string, contact: Contact): Promise<void> {
    if (!blastMessage.trim()) {
      console.error('Blast message is empty');
      return;
    }
  
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('User document not found!');
        return;
      }
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error('Company document not found!');
        return;
      }
  
      const companyData = docSnapshot.data();
      const accessToken = companyData.ghl_accessToken;
      const whapiToken = companyData.whapiToken;
      const phoneNumber = id.split('+')[1];
      const chat_id = phoneNumber + "@s.whatsapp.net";
      console.log(chat_id);

      if (companyData.v2) {
        // Handle v2 users
        const messagesRef = collection(firestore, `companies/${companyId}/contacts/${contact.phone}/messages`);
        await addDoc(messagesRef, {
          message: blastMessage,
          timestamp: new Date(),
          from_me: true,
          chat_id: chat_id,
          type: 'chat',
          // Add any other necessary fields
        });

        console.log("Message added to Firestore for v2 user");
      } else {
        // Handle non-v2 users
        const response = await axios.post(
          `https://mighty-dane-newly.ngrok-free.app/api/messages/text/${chat_id}/${whapiToken}`,
          {
            contactId: id,
            message: blastMessage,
            additionalInfo: { ...contact },
            method: 'POST',
            body: JSON.stringify({
              message: blastMessage,
            }),
            headers: { 'Content-Type': 'application/json' }
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.message) {
          // Store the message in Firebase for non-v2 users
          const messagesCollectionRef = collection(firestore, 'companies', companyId, 'messages');
          await setDoc(doc(messagesCollectionRef, response.data.message.id), {
            message: response.data.message,
            from: userData.name,
            timestamp: new Date(),
            whapiToken: whapiToken,
            chat_id: chat_id,
            type: 'chat',
            from_me: true,
            text: { body: blastMessage },
          });
        }

        console.log("Message sent and stored for non-v2 user");
      }

      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex-grow overflow-y-auto">
        <div className="grid grid-cols-12 mt-5">
          <div className="flex items-center col-span-12 intro-y sm:flex-nowrap">
            <div className="w-full sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
              <div className="flex">
            
                {/* Add Contact Button */}
                <button className="flex inline p-2 m-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setAddContactModal(true)}>
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide icon="Plus" className="w-5 h-5" />
                  </span>
                  <span className="ml-2 font-medium">Add Contact</span>
                </button>
                {/* Other buttons and menus */}
                <Menu className="flex">
                  {showAddUserButton && (
                    <Menu.Button as={Button} className="p-2 m-2 !box bg-white text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <span className="flex items-center justify-center w-5 h-5">
                        <Lucide icon="User" className="w-5 h-5" />
                      </span>
                      <span className="ml-2">Assign User</span>
                    </Menu.Button>
                  )}
                  <Menu.Items className="w-150 bg-white text-gray-800 dark:text-gray-200">
                    {employeeList.map((employee) => (
                      <Menu.Item key={employee.id}>
                        <span
                          className="flex items-center pb-2"
                          onClick={() => {
                            selectedContacts.forEach(contact => {
                              handleAddTagToSelectedContacts(employee.name, contact);
                            });
                          }}
                        >
                          <Lucide icon="User" className="w-4 h-4 mr-4" />
                          <span className="truncate max-w-xs">{employee.name}</span>
                        </span>
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Menu>
                <Menu>
                  {showAddUserButton && (
                    <Menu.Button as={Button} className="p-2 m-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <span className="flex items-center justify-center w-5 h-5">
                        <Lucide icon="Tag" className="w-5 h-5" />
                      </span>
                      <span className="ml-2">Add Tag</span>
                    </Menu.Button>
                  )}
                  <Menu.Items className="w-150 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md mt-1 shadow-lg">
                    <div className="p-2">
                      <button className="flex items-center p-2 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 w-full rounded-md" onClick={() => setShowAddTagModal(true)}>
                        <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                        Add
                      </button>
                    </div>
                    {tagList.map((tag) => (
                      <div key={tag.id} className="flex items-center justify-between w-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md">
                        <button
                          className="flex-grow p-2 text-sm text-left"
                          onClick={() => {
                            selectedContacts.forEach(contact => {
                              handleAddTagToSelectedContacts(tag.name, contact);
                            });
                          }}
                        >
                          {tag.name}
                        </button>
                        <button 
                          className="p-2 text-sm"
                          onClick={() => {
                            setTagToDelete(tag);
                            setShowDeleteTagModal(true);
                          }}
                        >
                          <Lucide icon="Trash" className="w-4 h-4 text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                    ))}
                  </Menu.Items>
                </Menu>
                <Menu>
                  <Menu.Button as={Button} className="p-2 m-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <span className="flex items-center justify-center w-5 h-5">
                      <Lucide icon="Filter" className="w-5 h-5" />
                    </span>
                    <span className="ml-2">Filter by Tag</span>
                  </Menu.Button>
                  <Menu.Items className="w-150 bg-white text-gray-800 dark:text-gray-200">
                    <div>
                      <button
                        className="flex items-center p-2 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 w-full rounded-md"
                        onClick={() => handleTagFilterChange("")}
                      >
                        <Lucide icon="X" className="w-4 h-4 mr-1" />
                        Clear Filter
                      </button>
                    </div>
                    {tagList.map((tag) => (
                      <Menu.Item key={tag.id}>
                        <span
                          className="flex items-center p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full rounded-md"
                          onClick={() => handleTagFilterChange(tag.name)}
                        >
                          {tag.name}
                        </span>
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Menu>
                <button className="flex inline p-2 m-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"   onClick={() => setBlastMessageModal(true)}>
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide icon="Send" className="w-5 h-5" />
                  </span>
                  <span className="ml-2 font-medium">Send Blast Message</span>
                </button>
                <button className="flex inline p-2 m-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={handleSyncConfirmation}>
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide icon="FolderSync" className="w-5 h-5" />
                  </span>
                  <span className="ml-2 font-medium">Sync Database</span>
                </button>
                <button className="flex inline p-2 m-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowCsvImportModal(true)}>
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide icon="Upload" className="w-5 h-5" />
                  </span>
                  <span className="ml-2 font-medium">Import CSV</span>
                </button>
                {/* Add this new element to display the number of selected contacts */}
              </div>
              <div className="relative w-full text-slate-500 p-2 mb-3">
                {isFetching ? (
                <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-white dark:bg-gray-900 bg-opacity-50">
                  <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white dark:bg-gray-800 p-4 rounded-md shadow-lg">
                    <div role="status">
                    <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
          <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
          <div className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400">Fetching Data...</div>
        </div>
                    </div>
                  </div>
                </div>
              ) : (
                  <>
                    <FormInput
                      type="text"
                      className="relative w-full h-[40px] pr-10 !box text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Lucide
                      icon="Search"
                      className="absolute inset-y-0 right-5 w-5 h-5 my-auto text-gray-500 dark:text-gray-400"
                    />
                  </>
                )}
              </div>
              <div className="flex items-center text-lg font-semibold text-gray-700 dark:text-gray-300">
                <span>Total Contacts: {initialContacts.length}</span>
                {selectedTagFilter && <span className="m-2">(Filtered by: {selectedTagFilter})</span>}
                {selectedContacts.length > 0 && (
                  <div className="inline-flex items-center p-2 m-2 bg-gray-200 dark:bg-gray-700 rounded-md">
                    <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">Selected: {selectedContacts.length}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto shadow-md sm:rounded-lg">
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto" ref={contactListRef}>
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th scope="col" className="p-4">
                    <div className="flex items-center">
                      <input
                        id="checkbox-select-all"
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                      />
                      <label htmlFor="checkbox-select-all" className="sr-only">
                        Select All
                      </label>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3">Contact</th>
                  <th scope="col" className="px-6 py-3">Phone Number</th>
                  <th scope="col" className="px-6 py-3">Assigned To</th>
                  <th scope="col" className="px-6 py-3">Tags</th>
                  <th scope="col" className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
              {filteredContacts.map((contact, index) => {
                const employeeNames = employeeList.map(employee => employee.name.toLowerCase());
                const employeeTags = (contact.tags ?? []).filter(tag => employeeNames.includes(tag.toLowerCase()));
                const otherTags = (contact.tags ?? []).filter(tag => tagList.some(listTag => listTag.name === tag));
                return (
                  <tr
                    key={index}
                    className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} border-b dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600`}
                  >
                    <td className="w-4 p-4">
                      <div className="flex items-center">
                        <input
                          id={`checkbox-table-search-${index}`}
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          checked={selectedContacts.some((c) => c.phone === contact.phone)}
                          onChange={() => toggleContactSelection(contact)}
                        />
                        <label htmlFor={`checkbox-table-search-${index}`} className="sr-only">
                          checkbox
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-medium capitalize text-gray-900 dark:text-white whitespace-nowrap flex items-center w-44 overflow-hidden overflow-ellipsis">
                      {contact.chat_pic_full ? (
                        <img src={contact.chat_pic_full ?? ''} className="w-8 h-8 rounded-full object-cover mr-3" />
                      ) : (
                        <div className="w-8 h-8 mr-3 border-2 border-gray-500 dark:border-gray-400 rounded-full flex items-center justify-center">
                          <Lucide icon="User" className="w-6 h-6 rounded-full text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                      {contact.contactName ? (contact.lastName ? `${contact.contactName}` : contact.contactName) : contact.phone}
                    </td>
                    <td className="px-6 py-4">{contact.phone ?? contact.source}</td>
                    <td className="px-6 py-4 whitespace-nowrap dark:text-white">
                      {employeeTags.length > 0 ? (
                        employeeTags.map((tag, index) => (
                          <div key={index} className="flex items-center mr-2">
                            <span className="mr-1">{tag}</span>
                            <button
                              className="p-1"
                              onClick={() => handleRemoveTag(contact.id!, tag)}
                            >
                              <Lucide icon="Trash" className="w-4 h-4 text-red-500 hover:text-red-700" />
                            </button>
                          </div>
                        ))
                      ) : (
                        'Unassigned'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap dark:text-white">
                      {otherTags.length > 0 ? (
                        otherTags.map((tag, index) => (
                          <div key={index} className="flex items-center mr-2">
                            <span className="mr-1">{tag}</span>
                            <button
                              className="p-1"
                              onClick={() => handleRemoveTag(contact.id!, tag)}
                            >
                              <Lucide icon="Trash" className="w-4 h-4 text-red-500 hover:text-red-700" />
                            </button>
                          </div>
                        ))
                      ) : (
                        ''
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 m-1 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => {
                        setCurrentContact(contact);
                        setEditContactModal(true);
                      }}>
                        <span className="flex items-center justify-center w-5 h-5">
                          <Lucide icon="Eye" className="w-5 h-5" />
                        </span>
                      </button>
                      <button className="p-2 m-1 !box text-primary bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => {
                        handleClick(contact.phone)
                      }}>
                        <span className="flex items-center justify-center w-5 h-5">
                          <Lucide icon="MessageSquare" className="w-5 h-5" />
                        </span>
                      </button>
                      <button className="p-2 m-1 !box text-red-500 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => {
                        setCurrentContact(contact);
                        setDeleteConfirmationModal(true);
                      }}>
                        <span className="flex items-center justify-center w-5 h-5">
                          <Lucide icon="Trash" className="w-5 h-5" />
                        </span>
                      </button>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <Dialog open={addContactModal} onClose={() => setAddContactModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white">
              <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-white mr-4">
                  <Lucide icon="User" className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl text-gray-900 dark:text-white">Add New User</span>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.address1}
                    onChange={(e) => setNewContact({ ...newContact, address1: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.companyName}
                    onChange={(e) => setNewContact({ ...newContact, companyName: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setAddContactModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  onClick={handleSaveNewContact}
                >
                  Save
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      
        <Dialog open={editContactModal} onClose={() => setEditContactModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white">
              <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-white mr-4">
                  <span className="text-xl">{(currentContact?.firstName) ? currentContact?.firstName.charAt(0).toUpperCase() : ""}</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{currentContact?.firstName} {currentContact?.lastName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{currentContact?.phone}</div>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={currentContact?.firstName || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, firstName: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={currentContact?.lastName || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, lastName: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={currentContact?.email || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, email: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={currentContact?.phone || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, phone: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={currentContact?.address1 || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, address1: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={currentContact?.companyName || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, companyName: e.target.value } as Contact)}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setEditContactModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  onClick={handleSaveContact}
                >
                  Save
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
     
        <Dialog open={blastMessageModal} onClose={() => setBlastMessageModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-40 text-gray-900 dark:text-white">
              <div className="mb-4 text-lg font-semibold">Schedule Blast Message</div>
              <textarea
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Type your message here..."
                value={blastMessage}
                onChange={(e) => setBlastMessage(e.target.value)}
                rows={3}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              ></textarea>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Media (Image or Video)</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => handleMediaUpload(e)}
                  className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Document</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => handleDocumentUpload(e)}
                  className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                <DatePicker
                  selected={blastStartTime}
                  onChange={(date: Date) => setBlastStartTime(date)}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch Quantity</label>
                <input
                  type="number"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(parseInt(e.target.value))}
                  min={1}
                  className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Repeat Every</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={repeatInterval}
                    onChange={(e) => setRepeatInterval(parseInt(e.target.value))}
                    min={0}
                    className="w-20 mr-2 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <select
                    value={repeatUnit}
                    onChange={(e) => setRepeatUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                    className="border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  onClick={sendBlastMessage}
                >
                  Schedule Message
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {showAddTagModal && (
          <Dialog open={showAddTagModal} onClose={() => setShowAddTagModal(false)}>
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-40 text-gray-900 dark:text-white">
                <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-white mr-4">
                    <Lucide icon="Plus" className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xl text-gray-900 dark:text-white">Add New Tag</span>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag Name</label>
                    <input
                      type="text"
                      className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => setShowAddTagModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    onClick={handleSaveNewTag}
                  >
                    Save
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
        {showDeleteTagModal && (
          <Dialog open={showDeleteTagModal} onClose={() => setShowDeleteTagModal(false)}>
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-white">
                <div className="p-5 text-center">
                  <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
                  <div className="mt-5 text-3xl text-gray-900 dark:text-white">Are you sure?</div>
                  <div className="mt-2 text-gray-600 dark:text-gray-400">
                    Do you really want to delete this tag? <br />
                    This process cannot be undone.
                  </div>
                </div>
                <div className="px-5 pb-8 text-center">
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => setShowDeleteTagModal(false)}
                    className="w-24 mr-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    onClick={handleConfirmDeleteTag}
                    className="w-24 bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
        <Dialog
          open={deleteConfirmationModal}
          onClose={() => setDeleteConfirmationModal(false)}
          initialFocus={deleteButtonRef}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-white">
              <div className="p-5 text-center">
                <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
                <div className="mt-5 text-3xl text-gray-900 dark:text-white">Are you sure?</div>
                <div className="mt-2 text-gray-600 dark:text-gray-400">
                  Do you really want to delete this contact? <br />
                  This process cannot be undone.
                </div>
              </div>
              <div className="px-5 pb-8 text-center">
                <button
                  ref={deleteButtonRef}
                  className="px-4 py-2 mr-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  onClick={handleDeleteContact}
                >
                  Delete
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setDeleteConfirmationModal(false)}
                >
                  Cancel
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
        <Dialog open={showCsvImportModal} onClose={() => setShowCsvImportModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white">
              <div className="mb-4 text-lg font-semibold">Import CSV</div>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileSelect}
                className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="flex justify-end mt-4">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setShowCsvImportModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  onClick={handleCsvImport}
                  disabled={!selectedCsvFile || isLoading}
                >
                  {isLoading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
        <Dialog open={showSyncConfirmationModal} onClose={() => setShowSyncConfirmationModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-white mt-20">
              <div className="p-5 text-center">
                <Lucide icon="AlertTriangle" className="w-16 h-16 mx-auto mt-3 text-warning" />
                <div className="mt-5 text-3xl text-gray-900 dark:text-white">Are you sure?</div>
                <div className="mt-2 text-gray-600 dark:text-gray-400">
                  Do you really want to sync the database? This action may take some time and affect your current data.
                </div>
              </div>
              <div className="px-5 pb-8 text-center">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setShowSyncConfirmationModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  onClick={handleConfirmSync}
                >
                  Confirm Sync
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
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
      </div>
    </div>
  );
}

export default Main;