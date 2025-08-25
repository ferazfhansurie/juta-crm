import _ from "lodash";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { Menu } from "@/components/Base/Headless";
import axios from "axios";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import ReactPaginate from 'react-paginate';
import ThemeSwitcher from "@/components/ThemeSwitcher";

// Configuration
const baseUrl = "https://juta-dev.ngrok.dev"; // Your PostgreSQL server URL

// Types
interface Employee {
  id: string;
  name: string;
  role: string;
  group?: string;
  email?: string;
  assignedContacts?: number;
  employeeId?: string;
  phoneNumber?: string;
  phoneNames?: { [key: number]: string };
  imageUrl?: string;
}

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

function Main() {
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [contactData, setContactData] = useState<ContactData>({});
  const [response, setResponse] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const navigate = useNavigate();
  const [employeeIdToDelete, setEmployeeIdToDelete] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");
  const [phoneCount, setPhoneCount] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 21;
  const [companyId, setCompanyId] = useState<string>("");

  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});
  const [companyData, setCompanyData] = useState<any>(null);

  const toggleModal = (id?: string) => {
    setIsModalOpen(!isModalOpen);
    setEmployeeIdToDelete(id!);
  };

  useEffect(() => {
    fetchUserContext();
  }, []);

  const fetchUserContext = async () => {
    try {
      setIsLoading(true);
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }

      setCurrentUserEmail(userEmail);

      console.log('Fetching user context for email:', userEmail);

      // Fetch user context which includes user data, company data, and employees
      const response = await axios.get(`${baseUrl}/api/user-page-context?email=${encodeURIComponent(userEmail)}`);
      const data = response.data;

      console.log('User context data received:', data);

      // Set user data
      setRole(data.role);
      setCompanyId(data.companyId);
      setCurrentUserEmail(data.email);

      console.log('Setting companyId:', data.companyId);

      // Set company data
      setCompanyData(data.companyData);
      setPhoneCount(data.companyData.phoneCount || 1);
      setPhoneNames(data.phoneNames || {});

      // Set employees
      setEmployeeList(data.employees || []);

      // Filter employees based on role
      const filteredEmployees = data.role === "3" 
        ? data.employees.filter((employee: Employee) => employee.email === userEmail)
        : data.employees;
      
      setEmployeeList(filteredEmployees);
      setShowAddUserButton(data.role === "1");

      // Fetch groups
      if (data.companyId) {
        await fetchGroups(data.companyId);
      }

      setIsDataLoaded(true);
      console.log('User context loaded successfully');

    } catch (error) {
      console.error('Error fetching user context:', error);
      toast.error("Failed to fetch user data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async (companyId: string) => {
    try {
      const response = await axios.get(`${baseUrl}/api/company-groups?companyId=${companyId}`);
      setGroups(response.data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  // Update the updatePhoneName function to use API
  const updatePhoneName = async (index: number, name: string) => {
    try {
      // You'll need to implement this API endpoint in your server
      const response = await axios.put(`${baseUrl}/api/update-phone-name`, {
        companyId,
        phoneIndex: index,
        phoneName: name
      });

      if (response.data.success) {
        setPhoneNames(prev => ({ ...prev, [index]: name }));
        toast.success(`Phone ${index + 1} name updated successfully`);
      } else {
        throw new Error(response.data.message || 'Failed to update phone name');
      }
    } catch (error) {
      console.error('Error updating phone name:', error);
      toast.error('Failed to update phone name');
    }
  };

  const handleDeleteEmployee = async (employeeEmail: string) => {
    try {
      if (!employeeEmail) {
        throw new Error('Employee email not found');
      }

      if (!isDataLoaded) {
        throw new Error('Data is still loading. Please wait a moment and try again.');
      }

      if (!companyId) {
        throw new Error('Company ID not available. Please wait for data to load.');
      }

      setIsLoading(true);
      console.log('Attempting to delete employee:', { email: employeeEmail, companyId });

      // Delete user via API
      const response = await axios.delete(`${baseUrl}/api/delete-user`, {
        data: { 
          email: employeeEmail,
          companyId: companyId 
        }
      });

      if (response.data.success) {
        // Update UI
        const updatedEmployeeList = employeeList.filter(employee => employee.email !== employeeEmail);
        setEmployeeList(updatedEmployeeList);
        
        toast.success('Employee deleted successfully');
        toggleModal();
      } else {
        throw new Error(response.data.message || 'Failed to delete employee');
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      if (axios.isAxiosError(error)) {
        console.error('API Error details:', {
          status: error.response?.status,
          data: error.response?.data
        });
        toast.error(`Failed to delete employee: ${error.response?.data?.message || error.message}`);
      } else {
        toast.error('Failed to delete employee: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
  };

  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = useMemo(() => {
    let filtered = employeeList;
    
    if (searchTerm.trim()) {
      const lowercaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(employee => 
        employee.name.toLowerCase().includes(lowercaseSearchTerm) ||
        employee.email?.toLowerCase().includes(lowercaseSearchTerm) ||
        employee.employeeId?.toLowerCase().includes(lowercaseSearchTerm) ||
        employee.phoneNumber?.toLowerCase().includes(lowercaseSearchTerm)
      );
    }

    if (selectedGroup) {
      filtered = filtered.filter(employee => employee.group === selectedGroup);
    }

    return filtered;
  }, [employeeList, searchTerm, selectedGroup]);

  const paginatedEmployees = filteredEmployees
    .sort((a, b) => {
      const roleOrder = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };
      return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
    })
    .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-darkmode-900">
      {/* Header Section */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-darkmode-800/80 backdrop-blur-md shadow-sm border-b border-white/20 dark:border-darkmode-700/20">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Users Directory</h2>
              <div className="px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 backdrop-blur-sm border border-primary/30 dark:border-primary/40">
                <span className="text-sm font-medium text-primary dark:text-primary">
                  {employeeList.length} Users
                </span>
              </div>
              {showAddUserButton && (
                <Link to="crud-form">
                  <Button variant="primary" className="shadow-sm hover:shadow-md transition-all duration-200 bg-primary/90 hover:bg-primary border border-primary/30 backdrop-blur-sm">
                    <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                    Add New User
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <ThemeSwitcher />
              <div className="flex items-center px-4 py-2 rounded-lg bg-slate-100/80 dark:bg-darkmode-700/80 backdrop-blur-sm border border-slate-200/50 dark:border-darkmode-600/50">
                <Lucide icon="User" className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {currentUserEmail && currentUserEmail.split('@')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex items-center justify-between mt-4 pb-3 border-b border-slate-200/50 dark:border-darkmode-700/50">
            <div className="flex items-center space-x-3">
              <Link to="settings">
                <Button variant="primary" className="shadow-sm hover:shadow-md transition-all duration-200 bg-primary/90 hover:bg-primary border border-primary/30 backdrop-blur-sm">
                  <Lucide icon="Settings" className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Menu>
                <Menu.Button as={Button} variant="outline-secondary" className="shadow-sm hover:shadow-md transition-all duration-200 bg-white/70 dark:bg-darkmode-800/70 hover:bg-white/90 dark:hover:bg-darkmode-800/90 border border-slate-200/50 dark:border-darkmode-600/50 backdrop-blur-sm">
                  <Lucide icon="Users" className="w-4 h-4 mr-2" />
                  {selectedGroup || "All Groups"}
                  <Lucide icon="ChevronDown" className="w-4 h-4 ml-2" />
                </Menu.Button>
                <Menu.Items className="absolute z-50 mt-2 w-48 rounded-lg bg-white/90 dark:bg-darkmode-800/90 backdrop-blur-md shadow-lg ring-1 ring-black/10 dark:ring-white/10 focus:outline-none border border-white/20 dark:border-darkmode-700/20">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setSelectedGroup('')}
                          className={`${
                            active ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary' : 'text-slate-700 dark:text-slate-300'
                          } flex items-center w-full px-4 py-2 text-sm`}
                        >
                          <Lucide icon="Users" className="w-4 h-4 mr-2" />
                          All Groups
                        </button>
                      )}
                    </Menu.Item>
                    {groups.map(group => (
                      <Menu.Item key={group}>
                        {({ active }) => (
                          <button
                            onClick={() => setSelectedGroup(group)}
                            className={`${
                              active ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary' : 'text-slate-700 dark:text-slate-300'
                            } flex items-center w-full px-4 py-2 text-sm`}
                          >
                            <Lucide icon="Users" className="w-4 h-4 mr-2" />
                            {group}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Menu>
            </div>
            <div className="flex items-center space-x-4">
              {phoneCount >= 2 && (
                <Menu>
                  <Menu.Button as={Button} variant="outline-secondary" className="shadow-sm hover:shadow-md transition-all duration-200 bg-white/70 dark:bg-darkmode-800/70 hover:bg-white/90 dark:hover:bg-darkmode-800/90 border border-slate-200/50 dark:border-darkmode-600/50 backdrop-blur-sm">
                    <Lucide icon="Phone" className="w-4 h-4 mr-2" />
                    Phone Names
                    <Lucide icon="ChevronDown" className="w-4 h-4 ml-2" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 z-50 mt-2 w-72 rounded-lg bg-white/90 dark:bg-darkmode-800/90 backdrop-blur-md shadow-lg ring-1 ring-black/10 dark:ring-white/10 focus:outline-none border border-white/20 dark:border-darkmode-700/20">
                    <div className="p-2">
                      {Object.entries(phoneNames).map(([index, phoneName]) => (
                        <Menu.Item key={index}>
                          {({ active }) => (
                            <div className={`${
                              active ? 'bg-slate-50/80 dark:bg-darkmode-700/80' : ''
                            } px-4 py-3 rounded-md flex items-center justify-between group`}>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {companyData?.[`phone${index}`] || `Phone ${index}`}
                                </span>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  {phoneName || `Phone ${index}`}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const newName = prompt(`Enter new name for ${phoneName || `Phone ${index}`}`, phoneName);
                                  if (newName) updatePhoneName(parseInt(index), newName);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-darkmode-600/80"
                              >
                                <Lucide icon="Pencil" className="w-4 h-4 text-primary dark:text-primary" />
                              </button>
                            </div>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Menu>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading Indicator */}
      {isLoading && !isDataLoaded && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading user data...</p>
          </div>
        </div>
      )}
      
      {/* Search Section */}
      {isDataLoaded && (
        <div className="px-5 py-4">
          <div className="max-w-md">
            <div className="relative">
              <FormInput
                type="text"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/30 dark:border-darkmode-600/30 bg-white/60 dark:bg-darkmode-700/60 backdrop-blur-sm focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/40 focus:border-transparent placeholder-slate-500 dark:placeholder-slate-400"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Lucide
                icon="Search"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      {isDataLoaded && (
        <div className="flex-1 px-5 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedEmployees.map((employee, index) => (
            <div 
              key={index} 
              className="bg-white/70 dark:bg-darkmode-800/70 backdrop-blur-md rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-white/30 dark:border-darkmode-700/30 hover:border-white/50 dark:hover:border-darkmode-600/50"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {employee.imageUrl ? (
                    <img
                      src={employee.imageUrl}
                      alt={employee.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-white/50 dark:ring-darkmode-600/50"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center ring-2 ring-white/50 dark:ring-darkmode-600/50 backdrop-blur-sm">
                      <Lucide icon="User" className="w-8 h-8 text-primary dark:text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {employee.email}
                    </p>
                    <div className="mt-2 flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                        employee.role === "1" ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border border-primary/30 dark:border-primary/40' :
                        employee.role === "2" ? 'bg-info/10 text-info dark:bg-info/20 dark:text-info border border-info/30 dark:border-info/40' :
                        employee.role === "3" ? 'bg-success/10 text-success dark:bg-success/20 dark:text-success border border-success/30 dark:border-success/40' :
                        employee.role === "4" ? 'bg-warning/10 text-warning dark:bg-warning/20 dark:text-warning border border-warning/30 dark:border-warning/40' :
                        'bg-slate-100/80 text-slate-800 dark:bg-darkmode-700/80 dark:text-slate-200 border border-slate-200/50 dark:border-darkmode-600/50'
                      }`}>
                        {employee.role === "1" ? 'Admin' :
                         employee.role === "2" ? 'Sales' :
                         employee.role === "3" ? 'Observer' :
                         employee.role === "4" ? 'Manager' :
                         employee.role === "5" ? 'Supervisor' : 'Other'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {(role === "1" || (role !== "1" && employee.email === currentUserEmail)) && (
                      <button
                        onClick={() => navigate(`crud-form`, { state: { contactId: employee.email, contact: { ...employee, id: employee.email }, companyId: companyId || '' } })}
                        className="p-2 text-slate-400 hover:text-primary dark:hover:text-primary rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 backdrop-blur-sm"
                        aria-label="Edit"
                      >
                        <Lucide icon="Pencil" className="w-5 h-5" />
                      </button>
                    )}
                    {role === "1" && (
                      <button 
                        onClick={() => toggleModal(employee.email)}
                        className="p-2 text-slate-400 hover:text-danger dark:hover:text-danger rounded-full hover:bg-danger/10 dark:hover:bg-danger/20 transition-all duration-200 backdrop-blur-sm"
                        aria-label="Delete"
                      >
                        <Lucide icon="Trash" className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-6">
          <ReactPaginate
            breakLabel="..."
            nextLabel={<div className="flex items-center">Next <Lucide icon="ChevronRight" className="w-4 h-4 ml-1" /></div>}
            previousLabel={<div className="flex items-center"><Lucide icon="ChevronLeft" className="w-4 h-4 mr-1" /> Previous</div>}
            onPageChange={handlePageChange}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            pageCount={Math.ceil(filteredEmployees.length / itemsPerPage)}
            renderOnZeroPageCount={null}
            containerClassName="flex justify-center items-center space-x-2"
            pageClassName="inline-flex"
            pageLinkClassName="inline-flex items-center px-4 py-2 rounded-lg bg-white/70 dark:bg-darkmode-800/70 text-slate-700 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-darkmode-800/90 border border-white/30 dark:border-darkmode-600/30 text-sm font-medium backdrop-blur-sm transition-all duration-200 hover:shadow-md"
            previousClassName="inline-flex"
            nextClassName="inline-flex"
            previousLinkClassName="inline-flex items-center px-4 py-2 rounded-lg bg-white/70 dark:bg-darkmode-800/70 text-slate-700 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-darkmode-800/90 border border-white/30 dark:border-darkmode-600/30 text-sm font-medium backdrop-blur-sm transition-all duration-200 hover:shadow-md"
            nextLinkClassName="inline-flex items-center px-4 py-2 rounded-lg bg-white/70 dark:bg-darkmode-800/70 text-slate-700 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-darkmode-800/90 border border-white/30 dark:border-darkmode-600/30 text-sm font-medium backdrop-blur-sm transition-all duration-200 hover:shadow-md"
            disabledClassName="opacity-50 cursor-not-allowed"
            activeClassName="font-bold"
            activeLinkClassName="!bg-primary/10 !text-primary dark:!bg-primary/20 dark:!text-primary !border-primary/30 dark:!border-primary/40 backdrop-blur-sm"
            breakClassName="px-2 py-2 text-slate-500 dark:text-slate-400"
          />
        </div>
      </div>
      )}

      {/* Rest of the modals remain unchanged */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white/90 dark:bg-darkmode-800/90 backdrop-blur-md text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-white/20 dark:border-darkmode-700/20">
              <div className="bg-white/90 dark:bg-darkmode-800/90 backdrop-blur-md px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-danger/10 dark:bg-danger/20 backdrop-blur-sm sm:mx-0 sm:h-10 sm:w-10 border border-danger/30 dark:border-danger/40">
                    <Lucide icon="AlertTriangle" className="h-6 w-6 text-danger" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-slate-900 dark:text-white">
                      Delete User
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Are you sure you want to delete this user? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/80 dark:bg-darkmode-700/80 backdrop-blur-sm px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-slate-200/50 dark:border-darkmode-600/50">
                <button
                  type="button"
                  onClick={() => handleDeleteEmployee(employeeIdToDelete)}
                  disabled={!isDataLoaded || isLoading}
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto transition-all duration-200 ${
                    !isDataLoaded || isLoading 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-danger/90 hover:bg-danger border border-danger/30 backdrop-blur-sm'
                  }`}
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleModal()}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white/70 dark:bg-darkmode-800/70 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300/50 dark:ring-darkmode-600/50 hover:bg-white/90 dark:hover:bg-darkmode-800/90 sm:mt-0 sm:w-auto backdrop-blur-sm transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Main;