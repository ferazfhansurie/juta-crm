import _ from "lodash";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { Menu } from "@/components/Base/Headless";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, updateDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
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
let companyId= "014";
let ghlConfig ={
  ghl_id:'',
  ghl_secret:'',
  refresh_token:'',
};
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);



interface Employee {
  id: string;
  name: string;
  role: string;
  // Add other properties as needed
}

function Main() {
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [contactData, setContactData] = useState<ContactData>({});
  const [response, setResponse] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  interface ContactData {
    country?: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string;
    website?: string | null;
    timezone?: string | null;
    dnd?: boolean;
    dndSettings?: any;
    inboundDndSettings?: any;
    tags?: string[];
    customFields?: any[];
    source?: string | null;
  }
  
  interface Props {
    accessToken: string;
    contactId: string;
  }

  let accessToken = "";
  
 
 useEffect(() => {
    fetchEmployees();
  }, []);
async function fetchEmployees() {
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
            console.log('No such document for company!');
            return;
          }
          const companyData = docSnapshot.data();

          accessToken = companyData.access_token;

          console.log(accessToken);

    const employeeRef = collection(firestore, `companies/${companyId}/employee`);
    const employeeSnapshot = await getDocs(employeeRef);

    const employeeListData: Employee[] = [];
    employeeSnapshot.forEach((doc) => {
      employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
    });

    console.log(employeeListData);
    setEmployeeList(employeeListData);
    
    // Check if user's role is 1
    if (dataUser.role === "1") {
      // If user's role is 1, set showAddUserButton to true
      setShowAddUserButton(true);
    } else {
      // If user's role is not 1, set showAddUserButton to false
      setShowAddUserButton(false);
    }
  
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
}

const handleUpdateContact = async (contactId: string, contact: any, companyId:any) => {
  try {
    const contactRef = doc(firestore, `companies/${companyId}/employee/${contactId}`);  // Adjust to your Firestore collection path
    const docSnap = await getDoc(contactRef);

    if (docSnap.exists()){
    await updateDoc(contactRef, contact);
    setResponse('Contact updated successfully');
    console.log("Updated contact successfully in Firestore");
    } else {
    setResponse('No document to update');
    console.log("No such document exists:", contactRef.path);
    } 
  } catch (error) {
    setResponse('Failed to update contact');
    console.error("Error updating contact:", error);
  }
};

const handleDeleteEmployee = async (employeeId: string, companyId: any) => {
  console.log("handleDeleteEmployee called with employeeId:", employeeId, "and companyId:", companyId);

  try {
    const employeeRef = doc(firestore, `companies/${companyId}/employee/${employeeId}`);
    console.log("Employee reference created:", employeeRef);

    await deleteDoc(employeeRef);
    console.log("Employee deleted from Firestore");

    console.log("Employee list before update:", employeeList);
    const updatedEmployeeList = employeeList.filter(employee => employee.id !== employeeId);
    console.log("Employee list after update:", updatedEmployeeList);

    setEmployeeList(updatedEmployeeList);
    setResponse('Employee deleted successfully');
    console.log("Employee list state updated:", updatedEmployeeList);
  } catch (error) {
    setResponse('Failed to delete employee');
    console.error("Error deleting employee:", error);
  }
};

  return (
    <>
      <h2 className="mt-10 text-lg font-medium intro-y">Users Layout</h2>
      <div className="grid grid-cols-12 gap-6 mt-5">
        <div className="flex flex-wrap items-center col-span-12 mt-2 intro-y sm:flex-nowrap">
        <Link to="crud-form">
            {showAddUserButton && ( // Render the button based on showAddUserButton state
              <Button variant="primary" className="mr-2 shadow-md">
                Add New User
              </Button>
            )}
          </Link>
       
       
          <div className="w-full mt-3 sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
            <div className="relative w-56 text-slate-500">
              <FormInput
                type="text"
                className="w-56 pr-10 !box"
                placeholder="Search..."
              />
              <Lucide
                icon="Search"
                className="absolute inset-y-0 right-0 w-4 h-4 my-auto mr-3"
              />
            </div>
          </div>
        </div>
        {/* BEGIN: Users Layout 
        (contactId: string, contact: any, companyId:any*/}
        {_.take(employeeList, 10).map((contacts, contactsKey) => (
          <div key={contactsKey} className="col-span-10 md:col-span-4 sm:col-span-4">
            <div className="box hover:bg-blue-100">
              <div className="flex flex-col lg:flex-row justify-between items-center p-5">
                {/* Contact name and role section */}
                <div className="flex flex-col font-medium dark:text-white">
                  <div>
                    <a className="font-medium">
                      {contacts.name}
                    </a>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {contacts.role === "2" ? 'Sales' : contacts.role === "1" ? 'Admin' : "Others"}
                  </div>
                </div>

                {/* Icon buttons for edit, view, and delete actions */}
                <div className="flex">
                <button
                    onClick={() => navigate(`crud-form`, { state: { contactId: contacts.id, contact: contacts, companyId: companyId || '' } })}
                    className="p-2 text-blue-500 hover:text-blue-600 relative"
                    aria-label="Edit"
                    type="button"
                  >
                    <Lucide icon="Pencil" className="w-5 h-5 mx-auto" />
                  </button>
                  <button 
                    className="p-2 text-green-500 hover:text-green-600 relative"
                    aria-label="View"
                    type="button"
                  >
                    <Lucide icon="Eye" className="w-5 h-5 mx-auto" />
                  </button>
                  <button 
                    onClick={toggleModal}
                    className="p-2 text-red-500 hover:text-red-600 relative"
                    aria-label="Delete"
                    type="button"
                  >
                    <Lucide icon="Trash" className="w-5 h-5 mx-auto" />
                  </button>

            {isModalOpen && (
                <div 
                    id="popup-modal" 
                    tabIndex={-1}  // Correct type for tabIndex in TypeScript
                    className="overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full flex"
                >
                    <div className="relative p-4 w-full max-w-md max-h-full">
                    <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
                        <button 
                        onClick={toggleModal} // Use toggleModal to close the modal
                        type="button" 
                        className="absolute top-3 end-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                        >
                        <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                        </svg>
                        <span className="sr-only">Close modal</span>
                        </button>
                        <div className="p-4 md:p-5 text-center">
                        <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Are you sure you want to delete User?</h3>
                        <button onClick={() => handleDeleteEmployee(contacts.id, companyId)} type="button" className="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center">
                            Yes, I'm sure
                        </button>
                        <button onClick={toggleModal} type="button" className="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
                            No, cancel
                        </button>
                        </div>
                    </div>
                    </div>
                </div>
            )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* BEGIN: contacts Layout */}
        {/* END: Pagination */}
    
        {/* END: Pagination */}
      </div>
    </>
  );
}

export default Main;
