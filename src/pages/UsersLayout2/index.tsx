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
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
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
let companyId= "014";
let role= "1";
let ghlConfig ={
  ghl_id:'',
  ghl_secret:'',
  ghl_refreshToken:'',
};
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);



interface Employee {
  id: string;
  name: string;
  role: string;
  groups?: string[];
  email?: string;
  assignedContacts?: number;
  employeeId?: string;
  phoneNumber?: string; // Added phone field
  // Add other properties as needed
}

function Main() {
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [contactData, setContactData] = useState<ContactData>({});
  const [response, setResponse] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [employeeIdToDelete, setEmployeeIdToDelete] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string>(""); // Added role state

  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 21; // Show 9 employees per page

  const toggleModal = (id?:string) => {
    setIsModalOpen(!isModalOpen);
    setEmployeeIdToDelete(id!)
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

  useEffect(() => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (user) {
      console.log("Current user:", user.email);
      setCurrentUserEmail(user.email);
      fetchEmployees();
    } else {
      console.log("No user is signed in.");
      // Handle the case when no user is signed in
    }
  }, []);

  
  async function fetchEmployees() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    setCurrentUserEmail(user?.email || null);
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
    
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      setRole(dataUser.role);
      setCanEdit(dataUser.role !== "3");
      console.log("User role:", dataUser.role);

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        return;
      }
      const companyData = docSnapshot.data();

      accessToken = companyData.ghl_accessToken;

      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        employeeListData.push({ 
          id: doc.id, 
          ...data,
          groups: data.groups || [],
          email: data.email
        } as Employee);
      });

      console.log("All employees:", employeeListData);
      console.log("Current user email:", user?.email);

      // Filter the employee list if the user is an observer
      const filteredEmployeeList = dataUser.role === "3"
        ? employeeListData.filter(employee => employee.email === user?.email)
        : employeeListData;
      
      console.log("Filtered employees:", filteredEmployeeList);
      setEmployeeList(filteredEmployeeList);
      
      // Check if user's role is 1
      setShowAddUserButton(dataUser.role === "1");
    
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }



const handleDeleteEmployee = async (employeeId: string, companyId: any) => {
  try {
    const employeeRef = doc(firestore, `companies/${companyId}/employee/${employeeId}`);

    await deleteDoc(employeeRef);
    
    const updatedEmployeeList = employeeList.filter(employee => employee.id !== employeeId);
    
    setEmployeeList(updatedEmployeeList);
    setResponse('Employee deleted successfully');
    
    toggleModal();
  } catch (error) {
    setResponse('Failed to delete employee');
    console.error("Error deleting employee:", error);
  }
};

const handlePageChange = ({ selected }: { selected: number }) => {
  setCurrentPage(selected);
};

const [searchTerm, setSearchTerm] = useState("");

const filteredEmployees = useMemo(() => {
  if (!searchTerm.trim()) return employeeList;
  
  const lowercaseSearchTerm = searchTerm.toLowerCase();
  return employeeList.filter(employee => 
    employee.name.toLowerCase().includes(lowercaseSearchTerm) ||
    employee.email?.toLowerCase().includes(lowercaseSearchTerm) ||
    employee.employeeId?.toLowerCase().includes(lowercaseSearchTerm) ||
    employee.phoneNumber?.toLowerCase().includes(lowercaseSearchTerm)
  );
}, [employeeList, searchTerm]);

const paginatedEmployees = filteredEmployees
  .sort((a, b) => {
    const roleOrder = { "1": 0, "2": 1, "3": 2, "4": 3 };
    return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
  })
  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <h2 className="ml-4 mt-10 text-2xl font-bold intro-y text-gray-800 dark:text-gray-200">Users Directory</h2>
      <div className="flex-grow p-5">
        <div className="sticky top-0 bg-gray-100 dark:bg-gray-900 z-10 py-2">
          <div className="flex flex-wrap items-center mt-2 intro-y sm:flex-nowrap">
            <Link to="crud-form">
              {showAddUserButton && role !== "3" && (
                <Button variant="primary" className="mr-2 shadow-md">
                  Add New User
                </Button>
              )}
            </Link>
            <Link to="loading2">
              {showAddUserButton && role !== "3" && (
                <Button variant="primary" className="mr-2 shadow-md">
                  Add Number
                </Button>
              )}
            </Link>
            <div className="w-full mt-3 sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
              <div className="relative w-56 text-slate-500">
                <FormInput
                  type="text"
                  className="w-56 pr-10 !box"
                  placeholder="Search name, ID, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Lucide
                  icon="Search"
                  className="absolute inset-y-0 right-0 w-4 h-4 my-auto mr-3"
                />
              </div>
            </div>
            <div className="flex-grow"></div>
            <div className="flex justify-end items-center font-medium">
              <ReactPaginate
                  breakLabel="..."
                  nextLabel="Next >"
                  onPageChange={handlePageChange}
                  pageRangeDisplayed={5}
                  pageCount={Math.ceil(filteredEmployees.length / itemsPerPage)}
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-5">
          {paginatedEmployees.map((contact, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                      {contact.name.length > 20 ? contact.name.substring(0, 20) + '...' : contact.name}
                      {contact.employeeId && (
                        <span className={`ml-2 text-md font-medium ${
                          contact.role === "1" ? 'text-indigo-600 dark:text-indigo-400' :
                          contact.role === "2" ? 'text-teal-600 dark:text-teal-400' :
                          contact.role === "3" ? 'text-purple-600 dark:text-purple-400' :
                          'text-amber-600 dark:text-amber-400'
                        }`}>
                          {contact.employeeId}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {contact.email}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {contact.role === "1" ? 'Admin' : contact.role === "2" ? 'Sales' : contact.role === "3" ? 'Observer' : "Other"}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => navigate(`crud-form`, { state: { contactId: contact.id, contact: contact, companyId: companyId || '' } })}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors duration-300"
                          aria-label="Edit"
                        >
                          <Lucide icon="Pencil" className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => toggleModal(contact.id)}
                          className="p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors duration-300"
                          aria-label="Delete"
                        >
                          <Lucide icon="Trash" className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isModalOpen && (
        <div 
          id="popup-modal" 
          tabIndex={-1} 
          className="overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full flex"
        >
          <div className="relative p-4 w-full max-w-md max-h-full">
            <div className="relative bg-white rounded-lg shadow dark:bg-gray-700">
              <button 
                onClick={() => toggleModal()}
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
                <button onClick={() => handleDeleteEmployee(employeeIdToDelete, companyId)} type="button" className="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center">
                  Yes, I'm sure
                </button>
                <button onClick={() => toggleModal()} type="button" className="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
                  No, cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default Main;