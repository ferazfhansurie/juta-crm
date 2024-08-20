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
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc,updateDoc,addDoc, arrayUnion, arrayRemove, Timestamp, query, where, onSnapshot, orderBy, limit, serverTimestamp, writeBatch } from 'firebase/firestore';
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
import { format, compareAsc } from 'date-fns';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import ReactPaginate from 'react-paginate';

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
    profilePicUrl?: string | null;
    chat_id?:string| null;
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
    id?: string;
    chatIds: string[];
    message: string;
    mediaUrl?: string;
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
    count?: number;
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
      contactName: '',
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
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [editScheduledMessageModal, setEditScheduledMessageModal] = useState(false);
  const [currentScheduledMessage, setCurrentScheduledMessage] = useState<ScheduledMessage | null>(null);
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editDocumentFile, setEditDocumentFile] = useState<File | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stopbot, setStopbot] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 30;

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
  const handleExportContacts = () => {
    if (userRole === "3") {
      toast.error("You don't have permission to export contacts.");
      return;
    }
  
    // Prepare the data for CSV
    const csvData = contacts.map(contact => ({
      contactName: contact.contactName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address1 || '',
      company: contact.companyName || '',
      tags: (contact.tags || []).join(', ')
    }));
  
    // Convert to CSV
    const csv = Papa.unparse(csvData);
  
    // Create a Blob with the CSV data
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
    // Generate filename
    const fileName = `contacts_export_${new Date().toISOString()}.csv`;
  
    // Trigger the download
    saveAs(blob, fileName);
  
    toast.success("Contacts exported successfully!");
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

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If the number starts with '0', replace it with '60'
  // Otherwise, ensure it starts with '60'
  const formattedNumber = digits.startsWith('0')
    ? `60${digits.slice(1)}`
    : digits.startsWith('60')
    ? digits
    : `60${digits}`;
  
  // Add the '+' at the beginning
  return `+${formattedNumber}`;
};

const handleSaveNewContact = async () => {
  if (userRole === "3") {
    toast.error("You don't have permission to add contacts.");
    return;
  }

  try {
    if (!newContact.phone) {
      toast.error("Phone number is required.");
      return;
    }

    // Format the phone number
    const formattedPhone = formatPhoneNumber(newContact.phone);

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

    // Use the formatted phone number as the document ID
    const contactDocRef = doc(contactsCollectionRef, formattedPhone);

    // Check if a contact with this phone number already exists
    const existingContact = await getDoc(contactDocRef);
    if (existingContact.exists()) {
      toast.error("A contact with this phone number already exists.");
      return;
    }
    const chat_id = formattedPhone.split('+')[1]+"@c.us";
    // Prepare the contact data with the formatted phone number
    const contactData = {
      id: formattedPhone,
      chat_id:chat_id,
      contactName: newContact.contactName,
      lastName: newContact.lastName,
      email: newContact.email,
      phone: formattedPhone,
      address1: newContact.address1,
      companyName: newContact.companyName,
      locationId: newContact.locationId,
      dateAdded: new Date().toISOString(),
      unreadCount: 0
    };

    // Add new contact to Firebase
    await setDoc(contactDocRef, contactData);

    toast.success("Contact added successfully!");
    setAddContactModal(false);
    setContacts(prevContacts => [...prevContacts, contactData]);
    setNewContact({
      contactName: '',
      lastName: '',
      email: '',
      phone: '',
      address1: '',
      companyName: '',
      locationId: '',
    });
  } catch (error) {
    console.error('Error adding contact:', error);
    toast.error("An error occurred while adding the contact: " + error);
  }
};
const handleSaveNewTag = async () => {
  try {
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

    const companyRef = doc(firestore, 'companies', companyId);
    const companySnapshot = await getDoc(companyRef);
    if (!companySnapshot.exists()) {
      console.log('No such document for company!');
      return;
    }
    const companyData = companySnapshot.data();
    
    if (companyData.v2) {
      // For v2 users, add tag to Firestore under the company's tags collection
      const tagsCollectionRef = collection(firestore, `companies/${companyId}/tags`);
      const newTagRef = await addDoc(tagsCollectionRef, {
        name: newTag,
        createdAt: serverTimestamp()
      });

      setTagList([...tagList, { id: newTagRef.id, name: newTag }]);
    } else {
      // Existing code for non-v2 users (using GHL API)
      const accessToken = companyData.ghl_accessToken;
      if (!accessToken) {
        console.error('Access token not found in company data');
        toast.error("Access token not found. Please check your configuration.");
        return;
      }
      const locationId = companyData.ghl_location;
      if (!locationId) {
        console.error('Location ID not found in company data');
        toast.error("Location ID not found. Please check your configuration.");
        return;
      }

      const apiUrl = `https://services.leadconnectorhq.com/locations/${locationId}/tags`;
      const response = await axios.post(apiUrl, 
        { name: newTag },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );
      console.log(response.data);
      setTagList([...tagList, response.data.tag]);
    }

    setShowAddTagModal(false);
    setNewTag("");
    toast.success("Tag added successfully!");
  } catch (error) {
    console.error('Error adding tag:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error details:', error.response?.data);
    }
    toast.error("An error occurred while adding the tag.");
  }
};

const handleConfirmDeleteTag = async () => {
  if (!tagToDelete) return;

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

    // Delete the tag from the tags collection
    const tagRef = doc(firestore, `companies/${companyId}/tags`, tagToDelete.id);
    await deleteDoc(tagRef);

    // Remove the tag from all contacts
    const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
    const contactsSnapshot = await getDocs(contactsRef);
    const batch = writeBatch(firestore);

    contactsSnapshot.forEach((doc) => {
      const contactData = doc.data();
      if (contactData.tags && contactData.tags.includes(tagToDelete.name)) {
        const updatedTags = contactData.tags.filter((tag: string) => tag !== tagToDelete.name);
        batch.update(doc.ref, { tags: updatedTags });
      }
    });

    await batch.commit();

    // Update local state
    setTagList(tagList.filter(tag => tag.id !== tagToDelete.id));
    setContacts(contacts.map(contact => ({
      ...contact,
      tags: contact.tags ? contact.tags.filter(tag => tag !== tagToDelete.name) : []
    })))

    setShowDeleteTagModal(false);
    setTagToDelete(null);
    toast.success("Tag deleted successfully!");
  } catch (error) {
    console.error('Error deleting tag:', error);
    toast.error("Failed to delete tag.");
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
  const fetchTags = async (token: string, location: string, employeeList: string[]) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        setLoading(false);
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) {
        console.log('No such document for company!');
        setLoading(false);
        return;
      }
      const companyData = companySnapshot.data();

      let tags: Tag[] = [];

      if (companyData.v2) {
        // For v2 users, fetch tags from Firestore
        const tagsCollectionRef = collection(firestore, `companies/${companyId}/tags`);
        const tagsSnapshot = await getDocs(tagsCollectionRef);
        tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      } else {
        // For non-v2 users, fetch tags from GHL API
        const maxRetries = 5;
        const baseDelay = 1000;

        const fetchData = async (url: string, retries: number = 0): Promise<any> => {
          const options = {
            method: 'GET',
            url: url,
            headers: {
              Authorization: `Bearer ${token}`,
              Version: '2021-07-28',
            },
          };
          await rateLimiter();
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

        const url = `https://services.leadconnectorhq.com/locations/${location}/tags`;
        const response = await fetchData(url);
        tags = response.data.tags;
      }

      // Filter out tags that match with employeeList
      const filteredTags = tags.filter((tag: Tag) => !employeeList.includes(tag.name));

      setTagList(filteredTags);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setLoading(false);
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
      setUserRole(userData.role); // Set the user's role

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      console.log(companyData.tags);
      console.log('tags');
      setStopbot(companyData.stopbot || false);
      console.log(stopbot);
      console.log('stopbot');
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
        const tagsCollectionRef = collection(firestore, `companies/${companyId}/tags`);
        const tagsSnapshot = await getDocs(tagsCollectionRef);
        const tagsArray = tagsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setTagList(tagsArray);
      }
      setLoading(false);
     // await searchContacts(companyData.ghl_accessToken, companyData.ghl_location);


    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  }
  const toggleBot = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        stopbot: !stopbot
      });
      setStopbot(!stopbot);
      toast.success(`Bot ${stopbot ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling bot:', error);
      toast.error('Failed to toggle bot status.');
    }
  };
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

  
  const handleAddTagToSelectedContacts = async (tagName: string, contact: Contact) => {
    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }
    try {
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
  
      if (!contact.id) {
        console.error('Contact ID is missing');
        return;
      }
  
      const contactRef = doc(firestore, `companies/${companyId}/contacts`, contact.id);
      
      // Add the new tag to the contact's tags array
      await updateDoc(contactRef, {
        tags: arrayUnion(tagName)
      });
  
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id ? { ...c, tags: [...(c.tags || []), tagName] } : c
        )
      );
  
      if (currentContact?.id === contact.id) {
        setCurrentContact((prevContact: any) => ({
          ...prevContact,
          tags: [...(prevContact.tags || []), tagName],
        }));
      }
  
      toast.success(`Tag "${tagName}" added successfully to ${contact.contactName ? contact.contactName : contact.phone}!`);
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error("An error occurred while adding the tag.");
    }
  };

  const handleSyncConfirmation = () => {
    if (!isSyncing) {
      setShowSyncConfirmationModal(true);
    }
  };

  const handleConfirmSync = async () => {
    setShowSyncConfirmationModal(false);
    await handleSyncContact();
  };

  const handleSyncContact = async () => {
    try {
      console.log('Starting contact synchronization process');
      setFetching(true);
      const user = auth.currentUser;
      if (!user) {
        console.log('User not authenticated');
        setFetching(false);
        toast.error("User not authenticated");
        return;
      }

      console.log('Fetching user document');
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('User document not found');
        setFetching(false);
        toast.error("User document not found");
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData?.companyId;
      if (!companyId) {
        console.log('Company ID not found');
        setFetching(false);
        toast.error("Company ID not found");
        return;
      }

      console.log(`Initiating sync for company ID: ${companyId}`);
      // Call the new API endpoint
      const response = await axios.post(`https://mighty-dane-newly.ngrok-free.app/api/sync-contacts/${companyId}`);

      if (response.status === 200 && response.data.success) {
        console.log('Contact synchronization started successfully');
        toast.success("Contact synchronization started successfully");
        // You might want to add some UI indication that sync is in progress
      } else {
        console.error('Failed to start contact synchronization:', response.data.error);
        throw new Error(response.data.error || "Failed to start contact synchronization");
      }

    } catch (error) {
      console.error('Error syncing contacts:', error);
      toast.error("An error occurred while syncing contacts: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      console.log('Contact synchronization process completed');
      setFetching(false);
    }
  };
  
  const handleRemoveTag = async (contactId: string, tagName: string) => {
    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) return;
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      const contactRef = doc(firestore, `companies/${companyId}/contacts`, contactId);
      
      // Remove the tag from the contact's tags array
      await updateDoc(contactRef, {
        tags: arrayRemove(tagName)
      });
  
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact.id === contactId
            ? { ...contact, tags: contact.tags?.filter(tag => tag !== tagName) }
            : contact
        )
      );
  
      if (currentContact?.id === contactId) {
        setCurrentContact((prevContact: any) => ({
          ...prevContact,
          tags: prevContact.tags?.filter((tag: string) => tag !== tagName),
        }));
      }
  
      toast.success(`Tag "${tagName}" removed successfully!`);
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
const chatId = tempphone + "@c.us"
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
    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }
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
        contactName: currentContact.contactName,
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

// Add this function to combine similar scheduled messages
const combineScheduledMessages = (messages: ScheduledMessage[]): ScheduledMessage[] => {
  const combinedMessages: { [key: string]: ScheduledMessage } = {};

  messages.forEach(message => {
    const key = `${message.message}-${message.scheduledTime.toDate().getTime()}`;
    if (combinedMessages[key]) {
      combinedMessages[key].count = (combinedMessages[key].count || 1) + 1;
    } else {
      combinedMessages[key] = { ...message, count: 1 };
    }
  });

  // Convert the object to an array and sort it
  return Object.values(combinedMessages).sort((a, b) => 
    compareAsc(a.scheduledTime.toDate(), b.scheduledTime.toDate())
  );
};

useEffect(() => {
  fetchCompanyData();
}, []);

const filteredContacts = contacts.filter(contact => {
  const lowerCaseQuery = searchQuery.toLowerCase();
  return (
    (contact.contactName?.toLowerCase().includes(lowerCaseQuery) ||
      contact.phone?.includes(lowerCaseQuery) ||
      contact.contactName?.toLowerCase().includes(lowerCaseQuery)) &&
    (selectedTagFilter ? (contact.tags ?? []).includes(selectedTagFilter) : true)
  );
});

const endOffset = itemOffset + itemsPerPage;
const currentContacts = filteredContacts.slice(itemOffset, endOffset);
const pageCount = Math.ceil(filteredContacts.length / itemsPerPage);

const handlePageClick = (event: { selected: number }) => {
  const newOffset = (event.selected * itemsPerPage) % filteredContacts.length;
  setItemOffset(newOffset);
};

useEffect(() => {
  console.log('Contacts:', contacts);
  console.log('Filtered Contacts:', filteredContacts);
  console.log('Search Query:', searchQuery);
}, [contacts, filteredContacts, searchQuery]);
console.log(filteredContacts);

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

    setIsScheduling(true);

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

      const chatIds = selectedContacts.map(contact => {
        const phoneNumber = contact.phone?.replace(/\D/g, '');
        return phoneNumber ? phoneNumber + "@s.whatsapp.net" : null;
      }).filter(chatId => chatId !== null) as string[];

      const scheduledMessageData = {
        batchQuantity: batchQuantity,
        chatIds: chatIds,
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

      // Show success toast
      toast.success(`Blast messages scheduled successfully for ${chatIds.length} contacts.`);
      toast.info(`Messages will be sent at: ${scheduledTime.toLocaleString()} (local time)`);

      // Refresh the scheduled messages list
      await fetchScheduledMessages();

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
    } finally {
      setIsScheduling(false);
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
  
  useEffect(() => {
    fetchScheduledMessages();
  }, []);

  const fetchScheduledMessages = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const scheduledMessagesRef = collection(firestore, `companies/${companyId}/scheduledMessages`);
      const q = query(scheduledMessagesRef, where("status", "==", "scheduled"));
      const querySnapshot = await getDocs(q);

      const messages: ScheduledMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({ 
          id: doc.id, 
          ...data,
          chatIds: data.chatIds || [], // Ensure chatIds is always an array
        } as ScheduledMessage);
      });

      // Sort messages by scheduledTime
      messages.sort((a, b) => a.scheduledTime.toDate().getTime() - b.scheduledTime.toDate().getTime());

      setScheduledMessages(messages);
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
    }
  };

  const handleEditScheduledMessage = (message: ScheduledMessage) => {
    setCurrentScheduledMessage(message);
    setEditScheduledMessageModal(true);
  };

  const handleDeleteScheduledMessage = async (messageId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      await deleteDoc(doc(firestore, `companies/${companyId}/scheduledMessages`, messageId));
      setScheduledMessages(scheduledMessages.filter(msg => msg.id !== messageId));
      toast.success("Scheduled message deleted successfully!");
    } catch (error) {
      console.error("Error deleting scheduled message:", error);
      toast.error("Failed to delete scheduled message.");
    }
  };

  const handleEditMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditMediaFile(e.target.files[0]);
    }
  };

  const handleEditDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditDocumentFile(e.target.files[0]);
    }
  };

  const handleSaveScheduledMessage = async () => {
    if (!currentScheduledMessage) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Upload new media file if selected
      let newMediaUrl = currentScheduledMessage.mediaUrl;
      if (editMediaFile) {
        newMediaUrl = await uploadFile(editMediaFile);
      }

      // Upload new document file if selected
      let newDocumentUrl = currentScheduledMessage.documentUrl;
      let newFileName = currentScheduledMessage.fileName;
      if (editDocumentFile) {
        newDocumentUrl = await uploadFile(editDocumentFile);
        newFileName = editDocumentFile.name;
      }

      // Prepare the updated message data
      const updatedMessageData = {
        ...currentScheduledMessage,
        scheduledTime: Timestamp.fromDate(currentScheduledMessage.scheduledTime.toDate()),
        mediaUrl: newMediaUrl,
        documentUrl: newDocumentUrl,
        fileName: newFileName,
      };

      // Send PUT request to update the scheduled message
      const response = await axios.put(
        `https://mighty-dane-newly.ngrok-free.app/api/schedule-message/${companyId}/${currentScheduledMessage.id}`,
        updatedMessageData
      );

      if (response.status === 200) {
        // Update the local state
        setScheduledMessages(scheduledMessages.map(msg => 
          msg.id === currentScheduledMessage.id ? updatedMessageData : msg
        ));

        setEditScheduledMessageModal(false);
        setEditMediaFile(null);
        setEditDocumentFile(null);
        toast.success("Scheduled message updated successfully!");
      } else {
        throw new Error("Failed to update scheduled message");
      }
    } catch (error) {
      console.error("Error updating scheduled message:", error);
      toast.error("Failed to update scheduled message.");
    }
  };

  // Add this function to format the date
  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts([...filteredContacts]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex-grow overflow-y-auto">
        <div className="grid grid-cols-12 mt-5">
          <div className="flex items-center col-span-12 intro-y sm:flex-nowrap">
            <div className="w-full sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
              <div className="flex">
                {/* Add Contact Button */}
                <div className="w-full">
                  {/* Desktop view */}
                  <div className="hidden sm:flex sm:w-full sm:space-x-2">
                    <button 
                      className={`flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (userRole !== "3") {
                          setAddContactModal(true);
                        } else {
                          toast.error("You don't have permission to add contacts.");
                        }
                      }}
                      disabled={userRole === "3"}
                    >
                      <Lucide icon="Plus" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Add Contact</span>
                    </button>
                    <Menu>
                      {showAddUserButton && (
                        <Menu.Button as={Button} className="flex items-center justify-start p-2 !box bg-white text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Lucide icon="User" className="w-5 h-5 mr-2" />
                          <span>Assign User</span>
                        </Menu.Button>
                      )}
                      <Menu.Items className="w-full bg-white text-gray-800 dark:text-gray-200">
                        {employeeList.map((employee) => (
                          <Menu.Item key={employee.id}>
                            <span
                              className="flex items-center p-2"
                              onClick={() => {
                                selectedContacts.forEach(contact => {
                                  handleAddTagToSelectedContacts(employee.name, contact);
                                });
                              }}
                            >
                              <Lucide icon="User" className="w-4 h-4 mr-2" />
                              <span className="truncate">{employee.name}</span>
                            </span>
                          </Menu.Item>
                        ))}
                      </Menu.Items>
                    </Menu>
                    <Menu>
                      {showAddUserButton && (
                        <Menu.Button as={Button} className="flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Lucide icon="Tag" className="w-5 h-5 mr-2" />
                          <span>Add Tag</span>
                        </Menu.Button>
                      )}
                      <Menu.Items className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md mt-1 shadow-lg">
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
                      <Menu.Button as={Button} className="flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Lucide icon="Filter" className="w-5 h-5 mr-2" />
                        <span>Filter by Tag</span>
                      </Menu.Button>
                      <Menu.Items className="w-full bg-white text-gray-800 dark:text-gray-200">
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
                    <button 
                      className={`flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (userRole !== "3") {
                          setBlastMessageModal(true);
                        } else {
                          toast.error("You don't have permission to send blast messages.");
                        }
                      }}
                      disabled={userRole === "3"}
                    >
                      <Lucide icon="Send" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Send Blast Message</span>
                    </button>
                    <button 
  className={`flex items-center justify-start p-2 !box ${
    isSyncing || userRole === "3"
      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
      : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
  } text-gray-700 dark:text-gray-300`}
  onClick={() => {
    if (userRole !== "3") {
      handleSyncConfirmation();
    } else {
      toast.error("You don't have permission to sync the database.");
    }
  }}
  disabled={isSyncing || userRole === "3"}
>
  <Lucide icon="FolderSync" className="w-5 h-5 mr-2" />
  <span className="font-medium">
    {isSyncing ? 'Syncing...' : 'Sync Database'}
  </span>
</button>

<button 
  className={`flex items-center justify-start p-2 !box ${
    userRole === "3"
      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
      : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
  } text-gray-700 dark:text-gray-300`}
  onClick={() => {
    if (userRole !== "3") {
      setShowCsvImportModal(true);
    } else {
      toast.error("You don't have permission to import CSV files.");
    }
  }}
  disabled={userRole === "3"}
>
  <Lucide icon="Upload" className="w-5 h-5 mr-2" />
  <span className="font-medium">Import CSV</span>
</button>
<button 
  className={`flex items-center justify-start p-2 !box ${
    userRole === "3"
      ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
      : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
  } text-gray-700 dark:text-gray-300`}
  onClick={handleExportContacts}
  disabled={userRole === "3"}
>
  <Lucide icon="FolderUp" className="w-5 h-5 mr-2" />
  <span className="font-medium">Export Contacts</span>
</button>
              
                  </div>
                  
                  {/* Mobile view */}
                  <div className="sm:hidden grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setAddContactModal(true)}>
                      <Lucide icon="Plus" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Add Contact</span>
                    </button>
                    <Menu className="w-full">
                      {showAddUserButton && (
                        <Menu.Button as={Button} className="flex items-center justify-start p-2 w-full !box bg-white text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Lucide icon="User" className="w-5 h-5 mr-2" />
                          <span>Assign User</span>
                        </Menu.Button>
                      )}
                      <Menu.Items className="w-full bg-white text-gray-800 dark:text-gray-200">
                        {employeeList.map((employee) => (
                          <Menu.Item key={employee.id}>
                            <span
                              className="flex items-center p-2"
                              onClick={() => {
                                selectedContacts.forEach(contact => {
                                  handleAddTagToSelectedContacts(employee.name, contact);
                                });
                              }}
                            >
                              <Lucide icon="User" className="w-4 h-4 mr-2" />
                              <span className="truncate">{employee.name}</span>
                            </span>
                          </Menu.Item>
                        ))}
                      </Menu.Items>
                    </Menu>
                    <Menu className="w-full">
                      {showAddUserButton && (
                        <Menu.Button as={Button} className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Lucide icon="Tag" className="w-5 h-5 mr-2" />
                          <span>Add Tag</span>
                        </Menu.Button>
                      )}
                      <Menu.Items className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md mt-1 shadow-lg">
                        {/* ... (same content as desktop view) ... */}
                      </Menu.Items>
                    </Menu>
                    <Menu className="w-full">
                      <Menu.Button as={Button} className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Lucide icon="Filter" className="w-5 h-5 mr-2" />
                        <span>Filter by Tag</span>
                      </Menu.Button>
                      <Menu.Items className="w-full bg-white text-gray-800 dark:text-gray-200">
                        {/* ... (same content as desktop view) ... */}
                      </Menu.Items>
                    </Menu>
                    <button className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setBlastMessageModal(true)}>
                      <Lucide icon="Send" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Send Blast</span>
                    </button>
                    <button 
                      className={`flex items-center justify-start p-2 w-full !box ${
                        isSyncing 
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } text-gray-700 dark:text-gray-300`}
                      onClick={handleSyncConfirmation}
                      disabled={isSyncing}
                    >
                      <Lucide icon="FolderSync" className="w-5 h-5 mr-2" />
                      <span className="font-medium">
                        {isSyncing ? 'Syncing...' : 'Sync DB'}
                      </span>
                    </button>
                    
                    <button className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowCsvImportModal(true)}>
                      <Lucide icon="Upload" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Import CSV</span>
                    </button>
                  
                  </div>
                </div>
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
                    <div className="relative">
                      <FormInput
                        type="text"
                        className="relative w-full h-[40px] !box text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery ? (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                        >
                          <Lucide
                            icon="X"
                            className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          />
                        </button>
                      ) : (
                        <Lucide
                          icon="Search"
                          className="absolute inset-y-0 right-0 items-center w-5 h-5 m-2 text-gray-500 dark:text-gray-400"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* Scheduled Messages Section */}
              <div className="mt-3 mb-5">
                <h2 className="z-10 text-xl font-semibold mb-1 text-gray-700 dark:text-gray-300">Scheduled Messages</h2>
                {scheduledMessages.length > 0 ? (
                  <div className="z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {combineScheduledMessages(scheduledMessages).map((message) => (
                      <div key={message.id} className="z-10 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full">
                        <div className="z-10 p-4 flex-grow">
                          <div className="z-10 flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              {message.status === 'scheduled' ? 'Scheduled' : message.status}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(message.scheduledTime.toDate())}
                            </span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 mb-2 font-medium text-md line-clamp-2">{message.message}</p>
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                            <Lucide icon="Users" className="w-4 h-4 mr-1" />
                            <span>{message.chatIds.length} recipient{message.chatIds.length !== 1 ? 's' : ''}</span>
                          </div>
                          {message.mediaUrl && (
                            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
                              <Lucide icon="Image" className="w-4 h-4 mr-1" />
                              <span>Media attached</span>
                            </div>
                          )}
                          {message.documentUrl && (
                            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
                              <Lucide icon="File" className="w-4 h-4 mr-1" />
                              <span>{message.fileName || 'Document attached'}</span>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex justify-end mt-auto">
                          <button
                            onClick={() => handleEditScheduledMessage(message)}
                            className="text-sm bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium py-1 px-3 rounded-md shadow-sm transition-colors duration-200 mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteScheduledMessage(message.id!)}
                            className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-md shadow-sm transition-colors duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="z-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
                    <Lucide icon="Calendar" className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">No scheduled messages yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">When you schedule messages, they will appear here.</p>
                  </div>
                )}
              </div>
              {/* Edit Scheduled Message Modal */}
              <Dialog open={editScheduledMessageModal} onClose={() => setEditScheduledMessageModal(false)}>
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
                  <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white">
                    <div className="mb-4 text-lg font-semibold">Edit Scheduled Message</div>
                    <textarea
                      className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={currentScheduledMessage?.message || ''}
                      onChange={(e) => setCurrentScheduledMessage({...currentScheduledMessage!, message: e.target.value})}
                      rows={3}
                    ></textarea>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Scheduled Time</label>
                      <DatePicker
                        selected={currentScheduledMessage?.scheduledTime.toDate()}
                        onChange={(date: Date) => setCurrentScheduledMessage({...currentScheduledMessage!, scheduledTime: Timestamp.fromDate(date)})}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Media (Image or Video)</label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleEditMediaUpload(e)}
                        className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Document</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        onChange={(e) => handleEditDocumentUpload(e)}
                        className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                        onClick={() => setEditScheduledMessageModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                        onClick={handleSaveScheduledMessage}
                      >
                        Save
                      </button>
                    </div>
                  </Dialog.Panel>
                </div>
              </Dialog>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="sticky top-0 bg-gray-100 dark:bg-gray-900 z-10 py-2">
            <div className="flex flex-col md:flex-row items-start md:items-center text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex-grow">
                <span className="mb-2 md:mb-0 text-2xl text-left">Contacts</span>
                <button
                  onClick={handleSelectAll}
                  className="inline-flex items-center p-2 m-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors duration-200"
                >
                  <Lucide 
                    icon={selectedContacts.length === filteredContacts.length ? "CheckSquare" : "Square"} 
                    className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-300" 
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">
                    Select All
                  </span>
                </button>
                {selectedTagFilter && (
                  <div 
                    className="inline-flex items-center p-2 mt-2 md:mt-0 md:ml-2 bg-blue-100 dark:bg-blue-900 rounded-md self-start md:self-auto cursor-pointer"
                    onClick={() => setSelectedTagFilter('')}
                  >
                    <span className="text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap font-medium">{selectedTagFilter}</span>
                    <Lucide icon="X" className="w-4 h-4 ml-2 text-blue-700 dark:text-blue-300" />
                  </div>
                )}
                {selectedContacts.length > 0 && (
                  <div className="inline-flex items-center p-2 mt-2 md:mt-0 md:ml-2 bg-gray-200 dark:bg-gray-700 rounded-md self-start md:self-auto">
                    <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">{selectedContacts.length} selected</span>
                    <button
                      onClick={() => setSelectedContacts([])}
                      className="ml-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none"
                    >
                      <Lucide icon="X" className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end items-center font-medium">
              <ReactPaginate
                breakLabel="..."
                nextLabel="Next >"
                onPageChange={handlePageClick}
                pageRangeDisplayed={5}
                pageCount={pageCount}
                previousLabel="< Previous"
                renderOnZeroPageCount={null}
                containerClassName="flex justify-center items-center"
                pageClassName="mx-1"
                pageLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                previousClassName="mx-1"
                nextClassName="mx-1"
                previousLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                nextLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                disabledClassName="opacity-50 cursor-not-allowed"
                activeClassName="font-bold"
                activeLinkClassName="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              />
              </div>
            </div>
          </div>
          <div className="w-full flex-shrink">
            <div className="h-[calc(150vh-200px)] overflow-y-auto" ref={contactListRef}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 m-1">
                {currentContacts.map((contact, index) => {
                  const isSelected = selectedContacts.some((c) => c.phone === contact.phone);
                  return (
                    <div 
                      key={index} 
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-col cursor-pointer transition-all duration-200 ${
                        isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                      }`}
                      onClick={() => toggleContactSelection(contact)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center overflow-hidden">
                        {contact.profilePicUrl ? (
  <img 
    src={contact.profilePicUrl} 
    alt={contact.contactName || "Profile"} 
    className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0" 
  />
) : (
  <div className="w-10 h-10 mr-3 border-2 border-gray-500 dark:border-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
    {contact.chat_id && contact.chat_id.includes('@g.us') ? (
      <Lucide icon="Users" className="w-6 h-6 text-gray-500 dark:text-gray-400" />
    ) : (
      <Lucide icon="User" className="w-6 h-6 text-gray-500 dark:text-gray-400" />
    )}
  </div>
)}
                          <div className="overflow-hidden">
                            <h3 className="font-medium text-lg text-gray-900 dark:text-white truncate">
                            {contact.contactName ? (contact.lastName ? `${contact.contactName} ${contact.lastName}` : contact.contactName) : (contact.contactName || contact.phone)}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{contact.phone ?? contact.source}</p>
                          </div>
                        </div>
                        <Menu as="div" className="relative inline-block text-left ml-2">
                          <Menu.Button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors duration-200">
                            <Lucide icon="MoreVertical" className="w-4 h-4" />
                          </Menu.Button>
                          <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200`}
                                  onClick={() => {
                                    setCurrentContact(contact);
                                    setEditContactModal(true);
                                  }}
                                >
                                  <Lucide icon="Eye" className="mr-3 h-5 w-5" />
                                  View/Edit
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200`}
                                  onClick={() => handleClick(contact.phone)}
                                >
                                  <Lucide icon="MessageSquare" className="mr-3 h-5 w-5" />
                                  Chat
                                </button>
                              )}
                            </Menu.Item>
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''} group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200`}
                                  onClick={() => {
                                    setCurrentContact(contact);
                                    setDeleteConfirmationModal(true);
                                  }}
                                >
                                  <Lucide icon="Trash" className="mr-3 h-5 w-5" />
                                  Delete
                                </button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Menu>
                      </div>
                      <div className="flex items-center mt-1">
                        <div className="flex-grow">
                          <div className="flex flex-wrap gap-2">
                            {contact.tags && contact.tags.length > 0 ? (
                              contact.tags.map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                                  {tag}
                                  <button
                                    className="ml-1 text-blue-400 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-100"
                                    onClick={() => handleRemoveTag(contact.id!, tag)}
                                  >
                                    <Lucide icon="X" className="w-3 h-3" />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">No tags</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
                    value={newContact.contactName}
                    onChange={(e) => setNewContact({ ...newContact, contactName: e.target.value })}
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
  {currentContact?.profilePicUrl ? (
    <img 
      src={currentContact.profilePicUrl} 
      alt={currentContact.contactName || "Profile"} 
      className="w-full h-full object-cover"
    />
  ) : (
    <span className="text-xl">
      {currentContact?.contactName ? currentContact.contactName.charAt(0).toUpperCase() : ""}
    </span>
  )}
</div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{currentContact?.contactName} {currentContact?.lastName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{currentContact?.phone}</div>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={currentContact?.contactName || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, contactName: e.target.value } as Contact)}
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
              <div className="mb-4 text-lg font-semibold">Send Blast Message</div>
              {userRole === "3" ? (
                <div className="text-red-500">You don't have permission to send blast messages.</div>
              ) : (
                <>
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
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={sendBlastMessage}
                      disabled={isScheduling}
                    >
                      {isScheduling ? (
                        <div className="flex items-center">
                          Scheduling...
                        </div>
                      ) : (
                        "Send Blast Message"
                      )}
                    </button>
                  </div>
                  {isScheduling && (
                    <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Please wait while we schedule your messages...
                    </div>
                  )}
                </>
              )}
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