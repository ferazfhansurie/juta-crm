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
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  phone: string ;
  postalCode: string | null;
  source: string | null;
  state: string | null;
  tags: string[];
  type: string;
  website: string | null;

}

interface Employee {
  id: string;
  name: string;
  role: string;
}

function Main() {
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
  const [editContactModal, setEditContactModal] = useState(false);
  const [viewContactModal, setViewContactModal] = useState(false);
  const deleteButtonRef = useRef(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [addContactModal, setAddContactModal] = useState(false);
  const [blastMessageModal, setBlastMessageModal] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [newContact, setNewContact] = useState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address1: '',
      companyName: '',
      locationId:'',
  });
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
        const accessToken = companyData.access_token; // Replace with your actual access token
        newContact.locationId =companyData.location_id;
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
      setShowAddUserButton(userData.role === "1");

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();

      await setDoc(doc(firestore, 'companies', companyId), {
        access_token: companyData.access_token,
        refresh_token: companyData.refresh_token,
      }, { merge: true });

      await searchContacts(companyData.access_token, companyData.location_id);

      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployeeList(employeeListData);
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  }

  const handleAddTagToSelectedContacts = async (selectedEmployee: string) => {
    setSelectedContacts([]);
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

    await setDoc(doc(firestore, 'companies', companyId), {
      access_token: companyData.access_token,
      refresh_token: companyData.refresh_token,
    }, { merge: true });

    if (selectedEmployee) {
      const tagName = selectedEmployee;
      const selectedContactsCopy = [...selectedContacts];

      for (const contact of selectedContactsCopy) {
        const success = await updateContactTags(contact.id, companyData.access_token, [tagName]);
        if (!success) {
          console.error(`Failed to add tag "${tagName}" to contact with ID ${contact.id}`);
        } else {
          console.log(`Tag "${tagName}" added to contact with ID ${contact.id}`);
        }
      }
      await searchContacts(companyData.access_token, companyData.location_id);
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

  async function searchContacts(accessToken: any, locationId: any) {
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
        const contacts = response.data.contacts;
        allContacts = [...allContacts, ...contacts];
        if (contacts.length === 0) {
          break;
        }
        page++;
      }
      const filteredContacts = allContacts.filter(contact => contact.phone !== null);
      setContacts(filteredContacts);
      setLoading(false);
    } catch (error) {
      console.error('Error searching contacts:', error);
      setLoading(false);
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
            const accessToken = companyData.access_token; // Replace with your actual access token
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
                setContacts(contacts.filter(contact => contact.id !== currentContact.id));
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
            const accessToken = companyData.access_token; // Replace with your actual access token
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

  const filteredContacts = contacts.filter(contact =>
    contact.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  const sendBlastMessage = async () => {
    if (selectedContacts.length === 0) {
      toast.error("No contacts selected!");
      return;
    }
    try {
      for (const contact of selectedContacts) {
        await sendTextMessage(contact.phone, blastMessage, contact);
      }
      toast.success("Messages sent successfully!");
      setBlastMessageModal(false);
      setBlastMessage("");
    } catch (error) {
      console.error('Error sending blast message:', error);
      toast.error("Failed to send messages.");
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
      const accessToken = companyData.access_token; // Assuming you store access token in company data
      const phoneNumber = id.split('+')[1];
      const chat_id = phoneNumber+"@s.whatsapp.net"
      console.log(chat_id);
      const response = await axios.post(
        `https://buds-359313.et.r.appspot.com/api/messages/text/${chat_id!}/${companyData.whapiToken}/${blastMessage!}`, // This URL should be your API endpoint for sending messages
        {
          
          contactId: id,
          message: blastMessage,
          additionalInfo: { ...contact },
          method: 'POST',
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
  
  

  return (
    <>
<div className="grid grid-cols-12 gap-6 mt-5">
  <div className="flex flex-wrap items-center col-span-12 mt-2 intro-y sm:flex-nowrap">
    <button className="p-2 m-0 !box"  onClick={() => setAddContactModal(true)}>
      <span className="flex items-center justify-center w-5 h-5">
        <Lucide icon= "Plus"className="w-5 h-5" />
      </span>
    </button>
    <div className="w-full mt-3 sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
      
      <div className="relative w-[500px] text-slate-500 p-4 m-2">
        
        <FormInput
          type="text"
          className="w-[500px] h-[40px] pr-0 !box text-md"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Lucide
          icon="Search"
          className="absolute inset-y-0 right-0 w-5 h-5 my-auto mr-0"
        />
      </div>
    </div>
    <div className="ml-4">
      <Menu>
        {showAddUserButton && (
          <Menu.Button as={Button} className="flex flex-wrap items-center justify-center col-span-12 px-2 py-2 mt-2 mx-2 mb-2 intro-y sm:flex-nowrap !box">
            <span className="flex items-center justify-center w-5 h-5">
              <Lucide icon="Tag" className="w-5 h-5" />
            </span>
          </Menu.Button>
        )}
        <Menu.Items className="w-60 mt-4">
          {employeeList.map((employee) => (
            <Menu.Item key={employee.id}>
              <span
                className="flex items-center"
                onClick={() => handleAddTagToSelectedContacts(employee.name)}
              >
                <Lucide icon="User" className="w-4 h-4 mr-2" />
                {employee.name}
              </span>
            </Menu.Item>
          ))}
        </Menu.Items>
      </Menu>
    </div>
    <div className="ml-0">
    <button 
      type="button"
      className="flex flex-wrap items-center justify-center col-span-12 !box focus:outline-none text-blue-600 bg-gray-800 hover:bg-gray-600 font-medium rounded-lg text-md px-2 py-2 mt-2 mx-2 mb-2 intro-y sm:flex-nowrap" 
      onClick={() => setBlastMessageModal(true)}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 mr-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
      </svg>
      <span className="hidden md:inline ml-1 font-medium">Send a Blast Message</span>
    </button>
    </div>
    <Dialog open={blastMessageModal} onClose={() => setBlastMessageModal(false)}>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md mt-40 p-6 bg-white rounded-md">
          <div className="mt-4 mb-4 text-lg font-semibold">Send Blast Message</div>
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Type your message here..."
            value={blastMessage}
            onChange={(e) => setBlastMessage(e.target.value)}
          ></textarea>
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              onClick={sendBlastMessage}>Send Message
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  </div>
</div>
      <div className="max-w-full overflow-x-auto shadow-md sm:rounded-lg">
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
              <th scope="col" className="px-6 py-3">Contact Name</th>
              <th scope="col" className="px-6 py-3">Phone Number</th>
              <th scope="col" className="px-6 py-3">Tags</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact, index) => (
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
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {contact.firstName ?? 'No Name'}
                </td>
                <td className="px-6 py-4">{contact.phone ?? contact.source}</td>
                <td className="px-6 py-4">
                  {contact.tags && contact.tags.length > 0 ? contact.tags.join(', ') : 'Unassigned'}
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 m-1 !box"onClick={() => {
                    setCurrentContact(contact);
                    setEditContactModal(true);
                  }}>
                    <span className="flex items-center justify-center w-5 h-5">
                      <Lucide icon="Eye" className="w-5 h-5" />
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
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={addContactModal} onClose={() => setAddContactModal(false)}>
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <Dialog.Panel className="w-full max-w-md mt-24 p-6 bg-white rounded-md">
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
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                onClick={handleSaveNewContact}
                            >
                                Save
                            </button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
            <ToastContainer />
      <Dialog open={editContactModal} onClose={() => setEditContactModal(false)}>

    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md mt-24 p-6 bg-white rounded-md">
            <div className="flex items-center p-4 border-b  ">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                    <span className="text-xl">{currentContact?.firstName.charAt(0).toUpperCase()}</span>
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
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    onClick={handleSaveContact}
                >
                    Save
                </button>
            </div>
        </Dialog.Panel>
    </div>
</Dialog>
<ToastContainer />
      {/* Delete Confirmation Modal */}
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
          </div>
          <div className="px-5 pb-8 text-center">
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => setDeleteConfirmationModal(false)}
              className="w-24 mr-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleDeleteContact}
              className="w-24"
              ref={deleteButtonRef}
            >
              Delete
            </Button>
          </div>
        </Dialog.Panel>
      </Dialog>
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
 
    </>
  );
}

export default Main;
