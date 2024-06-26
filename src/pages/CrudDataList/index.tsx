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
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc,updateDoc } from 'firebase/firestore';
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
  chat_pic_full:string|null;
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
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
  const [editContactModal, setEditContactModal] = useState(false);
  const [viewContactModal, setViewContactModal] = useState(false);
  const deleteButtonRef = useRef(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isFetching, setFetching] = useState<boolean>(false);
  const { contacts: initialContacts} = useContacts();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
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
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage] = useState(10); // Adjust the number of contacts per page as needed
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedImage(file);
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
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
        const accessToken = companyData.ghl_accessToken; // Replace with your actual access token
      
        newContact.locationId =companyData.ghl_location;
        const apiUrl = 'https://services.leadconnectorhq.com/contacts';
        const options = {
          method: 'POST',
          url: 'https://services.leadconnectorhq.com/contacts/',
          data: {
            firstName: newContact.firstName,
            name:  newContact.firstName,
            locationId: newContact.locationId,
            phone: newContact.phone,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
            Accept: 'application/json',
            'Content-Type': 'application/json',
          }
        };
      

        const response = await axios.request(options);
console.log(response);
        if (response.status === 201) {
            toast.success("Contact added successfully!");
            setAddContactModal(false);
            setContacts(prevContacts => [...prevContacts, response.data.contact]); // Update the contacts state
            setNewContact({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                address1: '',
                companyName: '',
                locationId:'',
            });
        } else {
            console.error('Failed to add contact:', response.statusText);
            toast.error("Failed to add contact."+response.statusText);
        }
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
     
      await setDoc(doc(firestore, 'companies', companyId), {
        ghl_accessToken: companyData.ghl_accessToken,
        ghl_refreshToken: companyData.ghl_refreshToken,
      }, { merge: true });
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
      });
     console.log(employeeListData);
      setEmployeeList(employeeListData);
      const employeeNames = employeeListData.map(employee => employee.name.trim().toLowerCase());
      await fetchTags(companyData.ghl_accessToken,companyData.ghl_location,employeeNames);
      setLoading(false);
     // await searchContacts(companyData.ghl_accessToken, companyData.ghl_location);


    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  }
  const handleAddTagToSelectedContacts = async (selectedEmployee: string) => {
    if (!selectedEmployee) return;
  
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
  
    const tagName = selectedEmployee.toLowerCase();
    const updatedContacts = selectedContacts.map(contact => ({
        ...contact,
        tags: [...new Set([...(contact.tags || []), tagName])]
    }));
    const tagSessionMap: { [key: string]: number } = {
      '1 session': 1,
      '10 sessions': 10,
      '20 sessions': 20,
      '20 session': 20,
      '4 sessions': 4,
      'invoice duo 1 session': 1,
      'invoice duo 10 sessions': 10,
      'invoice duo 20 sessions': 20,
      'invoice duo 4 sessions': 4,
      'invoice private 1 session': 1,
      'invoice private 10 sessions': 10,
      // Add more mappings as needed
    };
    try {
      for (const contact of updatedContacts) {
        const success = await updateContactTags(contact.id, accessToken, contact.tags);
        if (!success) {
          console.error(`Failed to add tag "${tagName}" to contact with ID ${contact.id}`);
        } else {
          console.log(`Tag "${tagName}" added to contact with ID ${contact.id}`);

          if(companyId === "008")
          {
  // Determine the number of sessions based on the tag
  const sessionCount = tagSessionMap[tagName] || 0;
  
  if (sessionCount > 0) {
    // Fetch session data from the company collection
    const sessionDocRef = doc(firestore, `companies/${companyId}/session`, contact.id);
    const sessionDocSnapshot = await getDoc(sessionDocRef);
    
    if (sessionDocSnapshot.exists()) {
      const sessionData = sessionDocSnapshot.data();
      const currentSessionCount = sessionData.session || 0;

      // Update session count in the company collection
      const newSessionCount = currentSessionCount + sessionCount;
      await updateDoc(sessionDocRef, { session: newSessionCount });
      console.log(`Session count updated for contact ${contact.id} in company collection`);

      // Update session count in the user collection
      const appointmentsRef = collection(firestore, `user/${user?.email}/appointments`);
      const appointmentsSnapshot = await getDocs(appointmentsRef);
      appointmentsSnapshot.forEach(async (appointmentDoc) => {
        const appointmentData = appointmentDoc.data();
        const contactToUpdate = appointmentData.contacts.find((c: any) => c.id === contact.id);
        if (contactToUpdate) {
          contactToUpdate.session = newSessionCount;
          await updateDoc(doc(firestore, `user/${user?.email}/appointments`, appointmentDoc.id), {
            contacts: appointmentData.contacts
          });
          console.log(`Session count updated for contact ${contact.id} in user collection appointment ${appointmentDoc.id}`);
        }
      });
    }
  }
          }
        
        }
      }
  
      // Update the contacts state without refetching
      setContacts(prevContacts => 
        prevContacts.map(contact =>
          updatedContacts.find(updatedContact => updatedContact.id === contact.id) || contact
        )
      );
      const allContacts = contacts.map(contact =>
        updatedContacts.find(updatedContact => updatedContact.id === contact.id) || contact
      );
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
   
      setSelectedContacts([]);
      
    } catch (error) {
      console.error('Error tagging contacts:', error);
    }
    
  };
  
  
const handleRemoveTag = async (contactId: string, tagName: string) => {
  const user = auth.currentUser;

  const docUserRef = doc(firestore, 'user', user?.email!);
  const docUserSnapshot = await getDoc(docUserRef);
  if (!docUserSnapshot.exists()) {
    console.log('No such document for user!');
    return;
  }
  const userData = docUserSnapshot.data();

  // Check if the user has the "sales" role
  if (userData.role === '2') {
    toast.error("You do not have permission to remove tags.");
    return;
  }
  const companyId = userData.companyId;
  const docRef = doc(firestore, 'companies', companyId);
  const docSnapshot = await getDoc(docRef);
  if (!docSnapshot.exists()) {
    console.log('No such document for company!');
    return;
  }
  const companyData = docSnapshot.data();
  console.log(companyData.ghl_accessToken);
  const url = `https://services.leadconnectorhq.com/contacts/${contactId}/tags`;
  const options = {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${companyData.ghl_accessToken}`,
      Version: '2021-07-28',
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tags: [tagName]
    })
  };

  try {
    const response = await fetch(url, options);
    if (response.ok) {
      setTags((prevTags) => ({
        ...prevTags,
        [contactId]: (prevTags[contactId] || []).filter((tag) => tag !== tagName)
      }));

      // Update the contacts state
      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact.id === contactId
            ? { ...contact, tags: contact.tags.filter((tag) => tag !== tagName) }
            : contact
        )
      );
     
   
    } else {
      console.error('Failed to remove tag', await response.json());
      toast.error("Failed to remove tag.");
    }
   
  } catch (error) {
    console.error('Error removing tag', error);
    toast.error("An error occurred while removing the tag.");
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

        const maxRetries = 5; // Maximum number of retries
        const baseDelay = 5000; // Initial delay in milliseconds

        const fetchData = async (url: string, retries: number = 0): Promise<any> => {
            const options = {
                method: 'GET',
                url: url,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Version: '2021-07-28',
                },
            };
           // await rateLimiter(); // Ensure rate limit is respected before making the request
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
        // Fetch contacts in batches of 100
        while (fetchMore) {
            const response = await fetchData(nextPageUrl);
            const contacts = response.data.contacts;
            totalContacts = response.data.meta.total;
           
            if (contacts.length > 0) {
                allContacts = [...allContacts, ...contacts];
                if (role == 2) {
                  const filteredContacts = allContacts.filter(contact => contact.tags.some((tag: string) => typeof tag === 'string' && tag.toLowerCase().includes(userName.toLowerCase())));
                  setContacts([...filteredContacts]); // Update state with the new batch of contacts
                }else{
                  setContacts([...allContacts]); // Update state with the new batch of contacts
                }
            
                console.log(allContacts.length);
                fetchedContacts = allContacts.length;

              totalContacts = response.data.meta.total;
                setTotal(totalContacts);
                setFetched(fetchedContacts);
                setProgress((fetchedContacts / totalContacts) * 100);
                setLoading(false);
            }

            // Check if there's a next page
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
                method: 'PUT',
                url: apiUrl,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Version: '2021-07-28',
                    'Content-Type': 'application/json',
                },
                data: {
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
                    country: currentContact.country
                }
            };

            const response = await axios.request(options);
            if (response.status === 200) {
                setContacts(contacts.map(contact => (contact.id === currentContact.id ? response.data.contact : contact)));
                setEditContactModal(false);
                setCurrentContact(null);
                toast.success("Contact updated successfully!");
            } else {
                console.error('Failed to update contact:', response.statusText);
                toast.error("Failed to update contact.");
            }
        } catch (error) {
            console.error('Error saving contact:', error);
            toast.error("Failed to update contact.");
        }
    }
};

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const filteredContacts: Contact[] = contacts.filter(contact =>
    (contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery)) &&
    (selectedTagFilter ? contact.tags.includes(selectedTagFilter) : true)
  );
console.log(filteredContacts);
  // Get current contacts for pagination
  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);

  const sendBlastMessage = async () => {
    if (selectedContacts.length === 0) {
      toast.error("No contacts selected!");
      return;
    }
  
    try {
      let imageUrl = '';
      let documentUrl = '';
      if (selectedImage) {
        imageUrl = await uploadFile(selectedImage);
        console.log(imageUrl);
      }
      if (selectedDocument) {
        documentUrl = await uploadFile(selectedDocument);
      }
      setBlastMessageModal(false);
      toast.success("Messages sent successfully!");
      setBlastMessage("");
      for (const contact of selectedContacts) {
        if (imageUrl != '') {
          await sendImageMessage(contact.phone!, imageUrl, blastMessage);
        }else if (documentUrl != '') {
          const mimeType = selectedDocument!.type;
        const fileName = selectedDocument!.name;
        await sendDocumentMessage(contact.phone!, documentUrl, mimeType, fileName, blastMessage);
        }else if (!imageUrl && !documentUrl) {
          await sendTextMessage(contact.phone!, blastMessage, contact);
        }
      }
      
 
    } catch (error) {
      console.error('Error sending blast message:', error);
      toast.error("Failed to send messages.");
    }
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
      const response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/image/${companyData.whapiToken}`, {
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
      const response = await fetch(`https://buds-359313.et.r.appspot.com/api/messages/document/${companyData.whapiToken}`, {
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
      const accessToken = companyData.ghl_accessToken; // Assuming you store access token in company data
      const phoneNumber = id.split('+')[1];
      const chat_id = phoneNumber+"@s.whatsapp.net"
      console.log(chat_id);
      const response = await axios.post(
        `https://buds-359313.et.r.appspot.com/api/messages/text/${chat_id!}/${companyData.whapiToken}`, // This URL should be your API endpoint for sending messages
        {
          
          contactId: id,
          message: blastMessage,
          additionalInfo: { ...contact },
          method: 'POST',
          body: JSON.stringify({
            message: blastMessage,
          }),
          headers: { 'Content-Type': 'application/json' } // You can pass additional data if needed
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(response.data);
      
  
      if (response.status === 200) {
        console.log('Message sent successfully');
      } else {
        console.error('Failed to send message:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-grow overflow-y-auto">
        <div className="grid grid-cols-12 mt-5">
          <div className="flex items-center col-span-12 intro-y sm:flex-nowrap">
            <div className="w-full sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
              <div className="flex">
            
                {/* Add Contact Button */}
                <button className="flex inline p-2 m-2 !box" onClick={() => setAddContactModal(true)}>
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide icon="Plus" className="w-5 h-5" />
                  </span>
                  <span className="ml-2 font-medium">Add Contact</span>
                </button>
                {/* Other buttons and menus */}
                <Menu className="flex">
                  {showAddUserButton && (
                    <Menu.Button as={Button} className="p-2 m-2 !box">
                      <span className="flex items-center justify-center w-5 h-5">
                        <Lucide icon="User" className="w-5 h-5" />
                      </span>
                      <span className="ml-2">Assign User</span>
                    </Menu.Button>
                  )}
                  <Menu.Items className="w-150">
                    {employeeList.map((employee) => (
                      <Menu.Item key={employee.id}>
                        <span
                          className="flex items-center pb-2"
                          onClick={() => handleAddTagToSelectedContacts(employee.name)}
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
                    <Menu.Button as={Button} className="p-2 m-2 !box">
                      <span className="flex items-center justify-center w-5 h-5">
                        <Lucide icon="Tag" className="w-5 h-5" />
                      </span>
                      <span className="ml-2">Add Tag</span>
                    </Menu.Button>
                  )}
                  <Menu.Items className="w-150">
                    <div>
                      <button className="flex items-center p-2 font-medium" onClick={() => setShowAddTagModal(true)}>
                        <Lucide icon="Plus" className="w-4 h-4 mr-1" />
                        Add
                      </button>
                    </div>
                    {tagList.map((tag) => (
                      <div key={tag.id} className="flex flex-col items-start">
                        <span className="flex items-center w-full rounded hover:bg-gray-300">
                          <button
                            className="flex items-center p-2 text-sm"
                            onClick={() => handleAddTagToSelectedContacts(tag.name)}
                          >
                            {tag.name}
                          </button>
                          <button className="flex items-center p-2 m-2 text-sm" onClick={() => {
                            setTagToDelete(tag);
                            setShowDeleteTagModal(true);
                          }}>
                            <Lucide icon="Trash" className="w-4 h-4 mr-1 text-red-500" />
                          </button>
                        </span>
                      </div>
                    ))}
                  </Menu.Items>
                </Menu>
                <Menu>
                  <Menu.Button as={Button} className="p-2 m-2 !box">
                    <span className="flex items-center justify-center w-5 h-5">
                      <Lucide icon="Filter" className="w-5 h-5" />
                    </span>
                    <span className="ml-2">Filter by Tag</span>
                  </Menu.Button>
                  <Menu.Items className="w-150">
                    <div>
                      <button
                        className="flex items-center p-2 font-medium"
                        onClick={() => handleTagFilterChange("")}
                      >
                        <Lucide icon="X" className="w-4 h-4 mr-1" />
                        Clear Filter
                      </button>
                    </div>
                    {tagList.map((tag) => (
                      <Menu.Item key={tag.id}>
                        <span
                          className="flex items-center p-2 text-sm"
                          onClick={() => handleTagFilterChange(tag.name)}
                        >
                          {tag.name}
                        </span>
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Menu>
                <button className="flex inline p-2 m-2 !box" onClick={() => setBlastMessageModal(true)}>
                  <span className="flex items-center justify-center w-5 h-5">
                    <Lucide icon="Send" className="w-5 h-5" />
                  </span>
                  <span className="ml-2 font-medium">Send Blast Message</span>
                </button>
              </div>
              <div className="relative w-full text-slate-500 p-2 mb-3">
                {isFetching ? (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-primary h-4 rounded-full"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-right mt-2">
                      Fetched {fetched} of {total} contacts
                    </div>
                  </>
                ) : (
                  <>
                    <FormInput
                      type="text"
                      className="relative w-full h-[40px] pr-10 !box text-lg"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Lucide
                      icon="Search"
                      className="absolute inset-y-0 right-5 w-5 h-5 my-auto"
                    />
                  </>
                )}
              </div>
              <div className="text-lg font-semibold text-gray-700">
                Total Contacts: {filteredContacts.length}
                {selectedTagFilter && <span> (Filtered by: {selectedTagFilter})</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto shadow-md sm:rounded-lg">
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
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
                  const employeeTags = contact.tags.filter(tag => employeeNames.includes(tag.toLowerCase()));
                  const otherTags = contact.tags.filter(tag => tagList.some(listTag => listTag.name === tag));

                  return (
                    <tr
                      key={index}
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600`}
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
                      <td className="px-6 py-4 font-medium capitalize text-gray-900 whitespace-nowrap dark:text-white flex items-center w-44 overflow-hidden overflow-ellipsis">
  {contact.chat_pic_full ? (
    <img src={contact.chat_pic_full} className="w-8 h-8 rounded-full object-cover mr-3" />
  ) : (
    <div className="w-8 h-8 mr-3 border-2 border-gray-500 rounded-full flex items-center justify-center">
      <Lucide icon="User" className="w-6 h-6 rounded-full text-gray-500" />
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
                                onClick={() => handleRemoveTag(contact.id, tag)}
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
                                onClick={() => handleRemoveTag(contact.id, tag)}
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
                        <button className="p-2 m-1 !box" onClick={() => {
                          setCurrentContact(contact);
                          setEditContactModal(true);
                        }}>
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="Eye" className="w-5 h-5" />
                          </span>
                        </button>
                        <button className="p-2 m-1 !box text-primary" onClick={() => {
                          handleClick(contact.phone)
                        }}>
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="MessageSquare" className="w-5 h-5" />
                          </span>
                        </button>
                        <button className="p-2 m-1 !box text-red-500" onClick={() => {
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
            <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10">
              <div className="flex items-center p-4 border-b">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                  <Lucide icon="User" className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl">{'Add New User'}</span>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newContact.address1}
                    onChange={(e) => setNewContact({ ...newContact, address1: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={newContact.companyName}
                    onChange={(e) => setNewContact({ ...newContact, companyName: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  onClick={() => setAddContactModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md "
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
            <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10">
              <div className="flex items-center p-4 border-b  ">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                  <span className="text-xl">{(currentContact?.firstName) ? currentContact?.firstName.charAt(0).toUpperCase() : ""}</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{currentContact?.firstName} {currentContact?.lastName}</div>
                  <div className="text-sm text-gray-600">{currentContact?.phone}</div>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentContact?.firstName || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, firstName: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentContact?.lastName || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, lastName: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentContact?.email || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, email: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentContact?.phone || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, phone: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentContact?.address1 || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, address1: e.target.value } as Contact)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentContact?.companyName || ''}
                    onChange={(e) => setCurrentContact({ ...currentContact, companyName: e.target.value } as Contact)}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  onClick={() => setEditContactModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
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
    <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-40">
      <div className="mb-4 text-lg font-semibold">Send Blast Message</div>
      <textarea
        className="w-full p-2 border rounded"
        placeholder="Type your message here..."
        value={blastMessage}
        onChange={(e) => setBlastMessage(e.target.value)}
        rows={3}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      ></textarea>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Attach Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e)}
          className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Attach Document</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => handleDocumentUpload(e)}
          className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="flex justify-end mt-4">
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
          onClick={sendBlastMessage}
        >
          Send Message
        </button>
      </div>
    </Dialog.Panel>
  </div>
</Dialog>

        {showAddTagModal && (
          <Dialog open={showAddTagModal} onClose={() => setShowAddTagModal(false)}>
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-40">
                <div className="flex items-center p-4 border-b">
                  <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                    <Lucide icon="Plus" className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xl">Add New Tag</span>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tag Name</label>
                    <input
                      type="text"
                      className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                    onClick={() => setShowAddTagModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
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
              <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md">
                <div className="p-5 text-center">
                  <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
                  <div className="mt-5 text-3xl">Are you sure?</div>
                  <div className="mt-2 text-slate-500">
                    Do you really want to delete this tag? <br />
                    This process cannot be undone.
                  </div>
                </div>
                <div className="px-5 pb-8 text-center">
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => setShowDeleteTagModal(false)}
                    className="w-24 mr-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    onClick={handleConfirmDeleteTag}
                    className="w-24"
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
          <Dialog.Panel>
            <div className="p-5 text-center">
              <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
              <div className="mt-5 text-3xl">Are you sure?</div>
              <div className="mt-2 text-slate-500">
                Do you really want to delete this contact? <br />
                This process cannot be undone.
              </div>
              <div className="flex justify-center mt-4">
                <button
                  ref={deleteButtonRef}
                  className="px-4 py-2 mr-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  onClick={handleDeleteContact}
                >
                  Delete
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  onClick={() => setDeleteConfirmationModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
   
      </div>
    </div>
  );
}

export default Main;