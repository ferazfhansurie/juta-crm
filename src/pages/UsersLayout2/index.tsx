import _ from "lodash";
import clsx from "clsx";
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
    <div className="h-full relative overflow-hidden">
      {/* Animated background with floating orbs */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-900/50 dark:via-blue-900/20 dark:to-purple-900/30"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-400/10 to-orange-400/10 dark:from-pink-500/20 dark:to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 dark:from-cyan-500/20 dark:to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      
      {/* Enhanced glassmorphic inner glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10"></div>
      <div className="relative z-10">
      {/* Header Section */}
      <div className="sticky top-0 z-40 backdrop-blur-2xl bg-gradient-to-r from-white/60 via-white/50 to-white/40 dark:from-gray-800/60 dark:via-gray-800/50 dark:to-gray-800/40 shadow-2xl border-b border-white/40 dark:border-gray-600/50 relative overflow-hidden group">
        {/* Enhanced glassmorphic inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10"></div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/5 via-purple-400/5 to-pink-400/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div className="relative z-10 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                  <Lucide icon="Users" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Users Directory</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Manage your team members</p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-full text-sm font-semibold backdrop-blur-md bg-gradient-to-r from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 text-primary border border-primary/40 dark:border-primary/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                {employeeList.length} Users
              </div>
              {showAddUserButton && (
                <Link to="crud-form">
                  <Button variant="primary" className="px-4 py-2.5 text-sm font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-blue-500/90 to-indigo-500/90 hover:from-blue-600/90 hover:to-indigo-600/90 backdrop-blur-sm border border-blue-400/30 dark:border-blue-300/30 hover:scale-105 transform-gpu">
                    <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <ThemeSwitcher />
              <div className="flex items-center px-4 py-2.5 rounded-xl backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 border border-white/40 dark:border-slate-600/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                  <Lucide icon="User" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-2">
                  {currentUserEmail && currentUserEmail.split('@')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex items-center justify-between mt-4 pb-4 border-b border-white/20 dark:border-gray-600/30">
            <div className="flex items-center space-x-3">
              <Link to="settings">
                <Button variant="primary" className="px-4 py-2.5 text-sm font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600/90 hover:to-green-600/90 backdrop-blur-sm border border-emerald-400/30 dark:border-emerald-300/30 hover:scale-105 transform-gpu">
                  <Lucide icon="Settings" className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Menu>
                <Menu.Button as={Button} variant="outline-secondary" className="px-4 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 border border-white/40 dark:border-slate-600/40 hover:scale-105 transform-gpu">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 mr-2">
                    <Lucide icon="Users" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  {selectedGroup || "All Groups"}
                  <Lucide icon="ChevronDown" className="w-4 h-4 ml-2" />
                </Menu.Button>
                <Menu.Items className="absolute z-50 mt-2 w-48 rounded-xl backdrop-blur-md bg-white/90 dark:bg-darkmode-800/90 shadow-xl ring-1 ring-black/10 dark:ring-white/10 focus:outline-none border border-white/20 dark:border-darkmode-700/20">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setSelectedGroup('')}
                          className={`${
                            active ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'text-slate-700 dark:text-slate-300'
                          } flex items-center w-full px-4 py-2 text-sm transition-all duration-200`}
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
                              active ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'text-slate-700 dark:text-slate-300'
                            } flex items-center w-full px-4 py-2 text-sm transition-all duration-200`}
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
            <div className="flex items-center space-x-3">
              {phoneCount >= 2 && (
                <Menu>
                  <Menu.Button as={Button} variant="outline-secondary" className="px-3 py-1.5 text-sm shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm bg-white/70 dark:bg-darkmode-800/70 border border-slate-200/50 dark:border-darkmode-600/50">
                    <Lucide icon="Phone" className="w-4 h-4 mr-1" />
                    Phone Names
                    <Lucide icon="ChevronDown" className="w-4 h-4 ml-1" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 z-50 mt-2 w-72 rounded-xl backdrop-blur-md bg-white/90 dark:bg-darkmode-800/90 shadow-xl ring-1 ring-black/10 dark:ring-white/10 focus:outline-none border border-white/20 dark:border-darkmode-700/20">
                    <div className="p-2">
                      {Object.entries(phoneNames).map(([index, phoneName]) => (
                        <Menu.Item key={index}>
                          {({ active }) => (
                            <div className={`${
                              active ? 'bg-slate-50/80 dark:bg-darkmode-700/80' : ''
                            } px-3 py-2.5 rounded-lg flex items-center justify-between group`}>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white text-sm">
                                  {companyData?.[`phone${index}`] || `Phone ${index}`}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {phoneName || `Phone ${index}`}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const newName = prompt(`Enter new name for ${phoneName || `Phone ${index}`}`, phoneName);
                                  if (newName) updatePhoneName(parseInt(index), newName);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full hover:bg-slate-100/80 dark:hover:bg-darkmode-600/80"
                              >
                                <Lucide icon="Pencil" className="w-3 h-3 text-primary" />
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
        <div className="px-6 py-5">
          <div className="max-w-lg">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 group-focus-within:scale-110 transition-transform duration-300">
                <Lucide
                  icon="Search"
                  className="w-4 h-4 text-blue-600 dark:text-blue-400"
                />
              </div>
              <FormInput
                type="text"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/40 dark:border-slate-600/40 backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/40 focus:border-transparent placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl focus:shadow-2xl hover:scale-[1.02] focus:scale-[1.02]"
                placeholder="Search users by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      {isDataLoaded && (
        <div className="flex-1 px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedEmployees.map((employee, index) => (
            <div 
              key={index} 
              className="backdrop-blur-2xl bg-gradient-to-br from-white/60 via-white/50 to-white/40 dark:from-gray-800/60 dark:via-gray-800/50 dark:to-gray-800/40 rounded-3xl shadow-2xl border border-white/40 dark:border-gray-600/50 overflow-hidden hover:shadow-3xl transition-all duration-500 hover:scale-[1.05] relative group"
            >
              {/* Enhanced glassmorphic inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-pink-400/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10 rounded-3xl"></div>
              
              <div className="relative z-10 p-6">
                <div className="flex items-start space-x-4">
                  {employee.imageUrl ? (
                    <div className="relative group/avatar">
                      <img
                        src={employee.imageUrl}
                        alt={employee.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/60 dark:ring-gray-600/60 shadow-xl group-hover/avatar:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl backdrop-blur-md bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center ring-2 ring-white/60 dark:ring-gray-600/60 shadow-xl border border-primary/40 dark:border-primary/50 group-hover:scale-110 transition-transform duration-300">
                      <Lucide icon="User" className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {employee.email}
                    </p>
                    <div className="mt-3 flex items-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                        employee.role === "1" ? 'bg-gradient-to-r from-red-500/20 to-red-600/10 text-red-700 dark:text-red-300 border border-red-300/40 dark:border-red-600/40' :
                        employee.role === "2" ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-300/40 dark:border-blue-600/40' :
                        employee.role === "3" ? 'bg-gradient-to-r from-green-500/20 to-green-600/10 text-green-700 dark:text-green-300 border border-green-300/40 dark:border-green-600/40' :
                        employee.role === "4" ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-600/40' :
                        'bg-gradient-to-r from-slate-500/20 to-slate-600/10 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-600/40'
                      }`}>
                        {employee.role === "1" ? 'Admin' :
                         employee.role === "2" ? 'Sales' :
                         employee.role === "3" ? 'Observer' :
                         employee.role === "4" ? 'Manager' :
                         employee.role === "5" ? 'Supervisor' : 'Other'}
                      </span>
                    </div>
                    {employee.group && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md bg-gradient-to-r from-slate-500/20 to-slate-600/10 text-slate-700 dark:text-slate-300 border border-slate-300/40 dark:border-slate-600/40 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                          <Lucide icon="Users" className="w-3 h-3 mr-1.5" />
                          {employee.group}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    {(role === "1" || (role !== "1" && employee.email === currentUserEmail)) && (
                      <button
                        onClick={() => navigate(`crud-form`, { state: { contactId: employee.email, contact: { ...employee, id: employee.email }, companyId: companyId || '' } })}
                        className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-blue-600/10 dark:hover:from-blue-400/20 dark:hover:to-blue-500/10 transition-all duration-300 backdrop-blur-sm hover:scale-110 transform-gpu shadow-md hover:shadow-lg"
                        aria-label="Edit"
                      >
                        <Lucide icon="Pencil" className="w-4 h-4" />
                      </button>
                    )}
                    {role === "1" && (
                      <button 
                        onClick={() => toggleModal(employee.email)}
                        className="p-2.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/10 dark:hover:from-red-400/20 dark:hover:to-red-500/10 transition-all duration-300 backdrop-blur-sm hover:scale-110 transform-gpu shadow-md hover:shadow-lg"
                        aria-label="Delete"
                      >
                        <Lucide icon="Trash" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex justify-center">
          <div className="backdrop-blur-xl bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-700/60 dark:to-slate-600/40 rounded-2xl p-2 shadow-2xl border border-white/40 dark:border-slate-600/40">
            <ReactPaginate
              breakLabel="..."
              nextLabel={<div className="flex items-center font-semibold">Next <Lucide icon="ChevronRight" className="w-4 h-4 ml-1" /></div>}
              previousLabel={<div className="flex items-center font-semibold"><Lucide icon="ChevronLeft" className="w-4 h-4 mr-1" /> Previous</div>}
              onPageChange={handlePageChange}
              pageRangeDisplayed={3}
              marginPagesDisplayed={1}
              pageCount={Math.ceil(filteredEmployees.length / itemsPerPage)}
              renderOnZeroPageCount={null}
              containerClassName="flex justify-center items-center space-x-1"
              pageClassName="inline-flex"
              pageLinkClassName="inline-flex items-center px-4 py-2.5 rounded-xl backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 text-slate-700 dark:text-slate-300 hover:from-blue-500/20 hover:to-blue-600/10 dark:hover:from-blue-400/20 dark:hover:to-blue-500/10 border border-white/40 dark:border-slate-600/40 text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 transform-gpu"
              previousClassName="inline-flex"
              nextClassName="inline-flex"
              previousLinkClassName="inline-flex items-center px-4 py-2.5 rounded-xl backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 text-slate-700 dark:text-slate-300 hover:from-blue-500/20 hover:to-blue-600/10 dark:hover:from-blue-400/20 dark:hover:to-blue-500/10 border border-white/40 dark:border-slate-600/40 text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 transform-gpu"
              nextLinkClassName="inline-flex items-center px-4 py-2.5 rounded-xl backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 text-slate-700 dark:text-slate-300 hover:from-blue-500/20 hover:to-blue-600/10 dark:hover:from-blue-400/20 dark:hover:to-blue-500/10 border border-white/40 dark:border-slate-600/40 text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 transform-gpu"
              disabledClassName="opacity-50 cursor-not-allowed"
              activeClassName="font-bold"
              activeLinkClassName="!bg-gradient-to-r !from-blue-500/30 !to-blue-600/20 !text-blue-700 dark:!text-blue-300 !border-blue-400/50 dark:!border-blue-500/50 backdrop-blur-md shadow-xl"
              breakClassName="px-3 py-2 text-slate-500 dark:text-slate-400 font-semibold"
            />
          </div>
        </div>
      </div>
      )}

      {/* Enhanced Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-3xl bg-gradient-to-br from-white/90 via-white/80 to-white/70 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-800/70 backdrop-blur-2xl text-left shadow-3xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-white/40 dark:border-gray-600/50">
              {/* Enhanced glassmorphic inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10 rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 via-orange-400/5 to-yellow-400/5 dark:from-red-500/10 dark:via-orange-500/10 dark:to-yellow-500/10 rounded-3xl"></div>
              
              <div className="relative z-10 bg-gradient-to-br from-white/90 via-white/80 to-white/70 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-800/70 backdrop-blur-2xl px-6 pb-6 pt-6 sm:p-8 sm:pb-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 dark:from-red-400/20 dark:to-red-500/10 backdrop-blur-md sm:mx-0 sm:h-12 sm:w-12 border border-red-300/40 dark:border-red-600/40 shadow-xl">
                    <Lucide icon="AlertTriangle" className="h-7 w-7 text-red-600 dark:text-red-400" aria-hidden="true" />
                  </div>
                  <div className="mt-4 text-center sm:ml-6 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-bold leading-6 text-slate-900 dark:text-white">
                      Delete User
                    </h3>
                    <div className="mt-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Are you sure you want to delete this user? This action cannot be undone and will permanently remove all associated data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 bg-gradient-to-r from-slate-50/80 via-slate-100/60 to-slate-50/80 dark:from-gray-700/80 dark:via-gray-800/60 dark:to-gray-700/80 backdrop-blur-md px-6 py-4 sm:flex sm:flex-row-reverse sm:px-8 border-t border-white/30 dark:border-gray-600/40">
                <button
                  type="button"
                  onClick={() => handleDeleteEmployee(employeeIdToDelete)}
                  disabled={!isDataLoaded || isLoading}
                  className={`inline-flex w-full justify-center rounded-xl px-6 py-3 text-sm font-bold text-white shadow-xl sm:ml-4 sm:w-auto transition-all duration-300 hover:scale-105 transform-gpu ${
                    !isDataLoaded || isLoading 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-600/90 hover:to-red-700/90 border border-red-400/30 dark:border-red-300/30 backdrop-blur-sm hover:shadow-2xl'
                  }`}
                >
                  {isLoading ? 'Deleting...' : 'Delete User'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleModal()}
                  className="mt-3 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-white/80 to-white/60 dark:from-gray-700/80 dark:to-gray-600/60 px-6 py-3 text-sm font-bold text-slate-900 dark:text-white shadow-lg ring-1 ring-inset ring-slate-300/50 dark:ring-gray-600/50 hover:from-white/90 hover:to-white/70 dark:hover:from-gray-600/90 dark:hover:to-gray-500/70 sm:mt-0 sm:w-auto backdrop-blur-sm transition-all duration-300 hover:scale-105 transform-gpu hover:shadow-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default Main;