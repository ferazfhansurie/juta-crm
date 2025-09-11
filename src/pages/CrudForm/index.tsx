import { ClassicEditor } from "@/components/Base/Ckeditor";
import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { useLocation, useNavigate } from "react-router-dom";
import { FormInput, FormLabel } from "@/components/Base/Form";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Lucide from "@/components/Base/Lucide";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  phoneNumber?: string;
}

function Main() {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [categories, setCategories] = useState(["1"]);
  const [groups, setGroups] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { contactId, contact } = location.state ?? {};

  const [companyId, setCompanyId] = useState("");
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState("");

  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [filteredEmployeeList, setFilteredEmployeeList] = useState<Employee[]>(
    []
  );

  const [phoneOptions, setPhoneOptions] = useState<number[]>([]);
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});

  const [imageFile, setImageFile] = useState<File | null>(null);
  const baseUrl = "https://juta-dev.ngrok.dev";

  // Get current user email for comparison
  const getCurrentUserEmail = () => {
    try {
      const userDataStr = localStorage.getItem("userData");
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        return userData.email;
      }
    } catch (e) {
      console.error("Error parsing userData from localStorage");
    }
    return null;
  };

  const fetchGroups = async () => {
    if (!companyId) return;

    try {
      const response = await fetch(
        `${baseUrl}/api/company-groups?companyId=${companyId}`
      );
      if (!response.ok) throw new Error("Failed to fetch groups");

      const groupsArray = await response.json();
      setGroups(groupsArray);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  useEffect(() => {
    // Use user info from localStorage (set during API login)
    const userDataStr = localStorage.getItem("userData");
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        const email = userData.email;
        if (email) {
          (async () => {
            try {
              const response = await fetch(
                `${baseUrl}/api/user-page-context?email=${email}`
              );
              if (!response.ok) throw new Error("Failed to fetch user context");
              const data = await response.json();
              setCompanyId(data.companyId);
              setCurrentUserRole(data.role);
              // Process employee list
              const employeeListData: Employee[] = data.employees.map(
                (employee: any) => ({
                  id: employee.id,
                  name: employee.name,
                  email: employee.email || employee.id,
                  role: employee.role,
                  employeeId: employee.employeeId,
                  phoneNumber: employee.phoneNumber,
                })
              );
              setEmployeeList(employeeListData);
              // Set phone index data
              setPhoneNames(data.phoneNames);
              console.error("Phone Names:", data.phoneNames);
              setPhoneOptions(Object.keys(data.phoneNames).map(Number));
            } catch (error) {
              console.error("Error fetching user data:", error);
            }
          })();
        }
      } catch (e) {
        console.error("Invalid userData in localStorage");
      }
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchGroups();
    }
  }, [companyId]);

  const [userData, setUserData] = useState<{
    name: string;
    phoneNumber: string;
    email: string;
    password: string;
    role: string;
    companyId: string;
    group: string;
    employeeId: string;
    notes: string;
    quotaLeads: number;
    invoiceNumber: string | null;
    phone: number;
    phone2?: number;
    phone3?: number;
    imageUrl: string;
    weightage: number;
    weightage2?: number;
    weightage3?: number;
    viewEmployees: string[];
    viewEmployee: string | null;
    phoneAccess?: { [key: number]: boolean };
    phoneWeightages?: { [key: number]: number };
  }>({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    role: "",
    companyId: "",
    group: "",
    employeeId: "",
    notes: "",
    quotaLeads: 0,
    invoiceNumber: null,
    phone: 0,
    imageUrl: "",
    weightage: 0,
    viewEmployees: [],
    viewEmployee: null,
    phoneAccess: {},
    phoneWeightages: {},
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (contact && contact.id) {
        try {
          const response = await fetch(
            `${baseUrl}/api/user-page-details?id=${contact.id}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch user details");
          }

          const userDetails = await response.json();

          // Parse phone access and weightages from database format
          // phone_access is an object like {"0":true, "1":false, "2":true}
          const phoneAccessObj = userDetails.phone_access || {};
          // weightages is an object like {"0": 10, "1": 0, "2": 5}
          const weightagesObj = userDetails.weightages || {};

          // Convert string keys to number keys for consistency
          const phoneAccess: { [key: number]: boolean } = {};
          const phoneWeightages: { [key: number]: number } = {};
          
          Object.entries(phoneAccessObj).forEach(([key, value]) => {
            if (value === true) {
              phoneAccess[Number(key)] = true;
              phoneWeightages[Number(key)] = weightagesObj[key] || 0;
            }
          });

          // Get the first phone that has access (for primary phone field)
          const firstActivePhone = Object.entries(phoneAccessObj)
            .find(([_, v]) => v === true)?.[0];
          
          // Get all phones with access for additional phone fields
          const activePhones = Object.entries(phoneAccessObj)
            .filter(([_, v]) => v === true)
            .map(([k]) => Number(k));

          // Parse viewEmployees array from database
          const viewEmployeesArray = Array.isArray(userDetails.viewEmployees) ? userDetails.viewEmployees : [];

          setUserData({
            name: userDetails.name || "",
            phoneNumber: userDetails.phoneNumber || "",
            email: userDetails.email || "",
            password: "", // Don't populate password for security
            role: userDetails.role || "",
            companyId: userDetails.companyId || companyId,
            group: userDetails.group || "",
            employeeId: userDetails.employeeId || "",
            notes: userDetails.notes || "",
            quotaLeads: userDetails.quotaLeads || 0,
            invoiceNumber: userDetails.invoiceNumber || null,
            phone: firstActivePhone ? Number(firstActivePhone) : 0,
            phone2: activePhones.length > 1 ? activePhones[1] : undefined,
            phone3: activePhones.length > 2 ? activePhones[2] : undefined,
            imageUrl: userDetails.imageUrl || "",
            weightage: firstActivePhone ? (weightagesObj[firstActivePhone] || 0) : 0,
            weightage2: activePhones.length > 1 ? (weightagesObj[String(activePhones[1])] || 0) : undefined,
            weightage3: activePhones.length > 2 ? (weightagesObj[String(activePhones[2])] || 0) : undefined,
            viewEmployees: viewEmployeesArray,
            viewEmployee: null,
            phoneAccess: phoneAccess,
            phoneWeightages: phoneWeightages,
          });

          // Set selectedEmployees to match the loaded viewEmployees data
          setSelectedEmployees(viewEmployeesArray);

          // Note: Don't filter the employee list here since it depends on role hierarchy
          // The filtering will be handled by the useEffect that depends on currentUserRole and employeeList
        } catch (error) {
          console.error("Error fetching user details:", error);
          toast.error("Failed to load user details");
        }
      }
    };

    fetchUserData();
    fetchGroups();
  }, [contact, companyId, employeeList]);

  const handleChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target;
    setUserData((prev) => {
      const newData = { ...prev, [name]: value };

      // Reset phone to -1 if role is not "2" (Sales)
      if (name === "role" && value !== "2") {
        newData.phone = 0;
      }

      return newData;
    });
  };

  const handlePhoneToggle = (phoneIndex: number, isEnabled: boolean) => {
    setUserData((prev) => {
      const newPhoneAccess = { ...prev.phoneAccess };
      const newPhoneWeightages = { ...prev.phoneWeightages };
      
      if (isEnabled) {
        newPhoneAccess[phoneIndex] = true;
        // Set default weightage if not already set
        if (!newPhoneWeightages[phoneIndex]) {
          newPhoneWeightages[phoneIndex] = 0;
        }
      } else {
        delete newPhoneAccess[phoneIndex];
        delete newPhoneWeightages[phoneIndex];
      }
      
      return {
        ...prev,
        phoneAccess: newPhoneAccess,
        phoneWeightages: newPhoneWeightages,
      };
    });
  };

  const handleWeightageChange = (phoneIndex: number, weightage: number) => {
    setUserData((prev) => ({
      ...prev,
      phoneWeightages: {
        ...prev.phoneWeightages,
        [phoneIndex]: weightage,
      },
    }));
  };

  const handleAddNewGroup = () => {
    setIsAddingNewGroup(true);
  };

  const handleCancelNewGroup = () => {
    setIsAddingNewGroup(false);
    setNewGroup("");
  };

  const handleSaveNewGroup = () => {
    if (newGroup.trim()) {
      setGroups((prev) => [...prev, newGroup.trim()]);
      setUserData((prev) => ({ ...prev, group: newGroup.trim() }));
      setIsAddingNewGroup(false);
      setNewGroup("");
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleEditorChange = (data: string) => {
    setUserData((prev) => ({ ...prev, notes: data }));
  };

  const isFieldDisabled = (fieldName: string) => {
    if (currentUserRole === "1") return false; // Admin (role 1) can edit everything
    if (currentUserRole === "3") return fieldName !== "password"; // Observer can only edit password
    if (fieldName === "role") return false; // Allow role changes for non-admin users
    return userData.role === "3"; // For other roles, they can't edit users with role 3
  };

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    const requiredFields = ["name", "phoneNumber", "email", "role"];

    // Only require password for new users
    if (!contactId) {
      requiredFields.push("password");
    }

    requiredFields.forEach((field) => {
      if (!userData[field as keyof typeof userData]) {
        errors[field] = `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } is required`;
      }
    });

    // Password validation
    if (userData.password && userData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const response = await fetch(`${baseUrl}/api/upload-media`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleEmployeeSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Get all selected options (can be empty if user deselects all)
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setSelectedEmployees(selectedOptions);

    // Update both viewEmployees (array) and viewEmployee (used by Chat component)
    setUserData((prev) => ({
      ...prev,
      viewEmployees: selectedOptions,
      // If no employees are selected, set viewEmployee to null
      // Otherwise use the first selected employee
      // This ensures both fields are consistent for the Chat component
      viewEmployee: selectedOptions.length > 0 ? selectedOptions[0] : null,
    }));
  };

  const saveUser = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const userOri = userData;
      if (!userOri || !userOri.email) {
        setErrorMessage("No authenticated user found. Please log in again.");
        return;
      }

      // Check if the user is updating their own profile
      const currentUserEmail = getCurrentUserEmail();
      const isUpdatingSelf = currentUserEmail === userData.email;

      let imageUrl = userData.imageUrl;
      if (imageFile) {
        try {
          imageUrl = (await uploadImage()) || "";
        } catch (error: any) {
          setErrorMessage(`Failed to upload image: ${error.message}`);
          setIsLoading(false);
          return;
        }
      }

      if (currentUserRole !== "3" || isUpdatingSelf) {
        // Format phone number for API
        const formatPhoneNumber = (phoneNumber: string) => {
          return phoneNumber && !phoneNumber.startsWith("+")
            ? "+6" + phoneNumber
            : phoneNumber;
        };

        const userDataToSend = {
          name: userData.name,
          phoneNumber: formatPhoneNumber(userData.phoneNumber),
          email: userData.email,
          role: userData.role,
          companyId: companyId,
          group: userData.group,
          employeeId: userData.employeeId || null,
          notes: userData.notes || null,
          quotaLeads: userData.quotaLeads || 0,
          invoiceNumber: userData.invoiceNumber || null,
          phone: userData.phone ?? 0,
          weightage: Number(userData.weightage) || 0,
          imageUrl: imageUrl || "",
          viewEmployees: userData.viewEmployees || [],
          viewEmployee: userData.viewEmployee || null,
        };

        if (contactId) {
          // Build phone access and weightages objects for update using new structure
          const phoneAccessObj: { [key: string]: boolean } = {};
          const weightagesObj: { [key: string]: number } = {};

          // Use the new phoneAccess and phoneWeightages structure
          if (userData.phoneAccess) {
            Object.entries(userData.phoneAccess).forEach(([phoneIndex, isEnabled]) => {
              if (isEnabled) {
                phoneAccessObj[phoneIndex] = true;
                weightagesObj[phoneIndex] = userData.phoneWeightages?.[Number(phoneIndex)] || 0;
              }
            });
          }

          // Update user via API
          const updateData = {
            contactId: contact.id, // Use the email as contactId
            name: userData.name,
            phoneNumber: formatPhoneNumber(userData.phoneNumber),
            email: userData.email,
            password: userData.password || undefined, // Only send if provided
            role: userData.role,
            companyId: companyId,
            group: userData.group,
            employeeId: userData.employeeId || null,
            notes: userData.notes || null,
            quotaLeads: userData.quotaLeads || 0,
            invoiceNumber: userData.invoiceNumber || null,
            phone: userData.phone ?? 0,
            weightage: Number(userData.weightage) || 0,
            imageUrl: imageUrl || "",
            viewEmployees: userData.viewEmployees || [],
            viewEmployee: userData.viewEmployee || null,
            phoneAccess: phoneAccessObj,
            weightages: weightagesObj
          };

          const response = await fetch(`${baseUrl}/api/update-user`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update user");
          }
          toast.success("User updated successfully");
        } else {
          // Add user via API
          const phoneAccessObj: { [key: string]: boolean } = {};
          const weightagesObj: { [key: string]: number } = {};

          // Use the new phoneAccess and phoneWeightages structure
          if (userData.phoneAccess) {
            Object.entries(userData.phoneAccess).forEach(([phoneIndex, isEnabled]) => {
              if (isEnabled) {
                phoneAccessObj[phoneIndex] = true;
                weightagesObj[phoneIndex] = userData.phoneWeightages?.[Number(phoneIndex)] || 0;
              }
            });
          }

          const requestBody = {
            name: userData.name,
            employeeId: userData.employeeId || undefined,
            phoneAccess: Object.keys(phoneAccessObj).length > 0 ? phoneAccessObj : undefined,
            weightages: Object.keys(weightagesObj).length > 0 ? weightagesObj : undefined,
            company: undefined, // Add if needed
            imageUrl: imageUrl || undefined,
            notes: userData.notes || undefined,
            quotaLeads: userData.quotaLeads || undefined,
            viewEmployees: userData.viewEmployees?.length > 0 ? userData.viewEmployees : undefined,
            invoiceNumber: userData.invoiceNumber || undefined,
            empGroup: userData.group || undefined,
            profile: undefined, // Add if needed
            threadId: undefined // Add if needed
          };

          const response = await fetch(
            `${baseUrl}/api/add-user/${encodeURIComponent(companyId)}/${encodeURIComponent(userData.email)}/${encodeURIComponent(formatPhoneNumber(userData.phoneNumber))}/${encodeURIComponent(userData.password)}/${encodeURIComponent(userData.role)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error || `HTTP error! status: ${response.status}`
            );
          }
          toast.success("User created successfully");
        }
        setSuccessMessage(
          contactId ? "User updated successfully" : "User created successfully"
        );
      }

      setErrorMessage("");
      setIsLoading(false);
      navigate("/users-layout-2");
    } catch (error: any) {
      setErrorMessage(error.message || "Error saving user");
      setIsLoading(false);
    }
  };

  const editorConfig = {
    toolbar: {
      items: [
        "bold",
        "italic",
        "link",
        "bulletedList",
        "numberedList",
        "blockQuote",
        "insertTable",
        "undo",
        "redo",
        "heading",
        "alignment",
        "fontColor",
        "fontSize",
      ],
    },
  };

  const [editorData, setEditorData] = useState("<p>Content of the editor.</p>");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Filter employees based on role hierarchy
    const filterEmployeesByRole = () => {
      if (!currentUserRole || !employeeList) return;

      const roleHierarchy: { [key: string]: number } = {
        "1": 5, // Admin - highest level
        "4": 4, // Manager
        "5": 3, // Supervisor
        "2": 2, // Sales
        "3": 1, // Observer - lowest level
      };

      const currentRoleLevel = roleHierarchy[currentUserRole];

      const filtered = employeeList.filter((employee) => {
        const employeeRoleLevel = roleHierarchy[employee.role];
        return employeeRoleLevel < currentRoleLevel;
      });

      setFilteredEmployeeList(filtered);
    };

    filterEmployeesByRole();
  }, [currentUserRole, employeeList]);

  return (
    <div className="h-screen overflow-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="min-h-screen backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto p-4 pb-8">
          {/* Header Section */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-6 mb-6 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline-secondary"
                  className="group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-slate-300/60 dark:hover:border-slate-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/10 dark:hover:shadow-slate-500/20 rounded-xl hover:scale-105 transform-gpu px-4 py-2.5 flex items-center space-x-2"
                  onClick={() => navigate(-1)}
                >
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-600/20 dark:from-slate-400/20 dark:to-slate-500/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40 group-hover:scale-110 transition-transform duration-300">
                    <Lucide icon="ArrowLeft" className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Back</span>
                </Button>
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                    <Lucide icon="UserPlus" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    {contactId ? "Update User" : "Add User"}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Main Form Container */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-8 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <FormLabel htmlFor="name" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Lucide icon="User" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Name *</span>
                  </FormLabel>
                  <FormInput
                    id="name"
                    name="name"
                    type="text"
                    value={userData.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    disabled={isFieldDisabled("name")}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-600/40 backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/40 focus:border-transparent placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl focus:shadow-2xl hover:scale-[1.02] focus:scale-[1.02] font-medium text-slate-900 dark:text-white"
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-sm mt-1 flex items-center space-x-1">
                      <Lucide icon="AlertCircle" className="w-4 h-4" />
                      <span>{fieldErrors.name}</span>
                    </p>
                  )}
                </div>
                
                {/* Phone Number Field */}
                <div className="space-y-2">
                  <FormLabel htmlFor="phoneNumber" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Lucide icon="Phone" className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span>Phone Number *</span>
                  </FormLabel>
                  <FormInput
                    id="phoneNumber"
                    name="phoneNumber"
                    type="text"
                    value={userData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+60123456789"
                    className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-600/40 backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 focus:ring-2 focus:ring-green-500/50 dark:focus:ring-green-400/40 focus:border-transparent placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl focus:shadow-2xl hover:scale-[1.02] focus:scale-[1.02] font-medium text-slate-900 dark:text-white"
                    disabled={isFieldDisabled("phoneNumber")}
                    required
                  />
                  {fieldErrors.phoneNumber && (
                    <p className="text-red-500 text-sm mt-1 flex items-center space-x-1">
                      <Lucide icon="AlertCircle" className="w-4 h-4" />
                      <span>{fieldErrors.phoneNumber}</span>
                    </p>
                  )}
                </div>
                
                {/* Email Field */}
                <div className="space-y-2">
                  <FormLabel htmlFor="email" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Lucide icon="Mail" className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Email *</span>
                  </FormLabel>
                  <FormInput
                    id="email"
                    name="email"
                    type="email"
                    value={userData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    disabled={isFieldDisabled("email")}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-600/40 backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 focus:ring-2 focus:ring-purple-500/50 dark:focus:ring-purple-400/40 focus:border-transparent placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl focus:shadow-2xl hover:scale-[1.02] focus:scale-[1.02] font-medium text-slate-900 dark:text-white"
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center space-x-1">
                      <Lucide icon="AlertCircle" className="w-4 h-4" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>
                
                {/* Role Field */}
                <div className="space-y-2">
                  <FormLabel htmlFor="role" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Lucide icon="Shield" className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Role *</span>
                  </FormLabel>
                  <select
                    id="role"
                    name="role"
                    value={userData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      if (currentUserRole !== "1" && newRole === "1") {
                        toast.error("You don't have permission to assign admin role.");
                        return;
                      }
                      handleChange(e);
                      setCategories([newRole]);
                    }}
                    className="appearance-none w-full px-4 py-3 text-sm border border-white/40 dark:border-slate-600/40 rounded-xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                    disabled={isFieldDisabled("role")}
                    required
                  >
                    <option value="">Select role</option>
                    {currentUserRole === "1" && <option value="1">Admin</option>}
                    {currentUserRole === "1" && <option value="4">Manager</option>}
                    {currentUserRole === "1" && <option value="5">Supervisor</option>}
                    {currentUserRole === "4" && <option value="4">Manager</option>}
                    {currentUserRole === "5" && <option value="5">Supervisor</option>}
                    <option value="2">Sales</option>
                    <option value="3">Observer</option>
                  </select>
                  {fieldErrors.role && (
                    <p className="text-red-500 text-sm mt-1 flex items-center space-x-1">
                      <Lucide icon="AlertCircle" className="w-4 h-4" />
                      <span>{fieldErrors.role}</span>
                    </p>
                  )}
                </div>
                
                {/* Password Field */}
                <div className="space-y-2">
                  <FormLabel htmlFor="password" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Lucide icon="Lock" className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>Password {contactId ? "(Leave blank to keep current)" : "*"}</span>
                  </FormLabel>
                  <FormInput
                    id="password"
                    name="password"
                    type="password"
                    value={userData.password}
                    onChange={handleChange}
                    placeholder={contactId ? "New password (optional)" : "Enter password"}
                    disabled={isFieldDisabled("password")}
                    required={!contactId}
                    className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-600/40 backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-400/40 focus:border-transparent placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl focus:shadow-2xl hover:scale-[1.02] focus:scale-[1.02] font-medium text-slate-900 dark:text-white"
                  />
                  {fieldErrors.password && (
                    <p className="text-red-500 text-sm mt-1 flex items-center space-x-1">
                      <Lucide icon="AlertCircle" className="w-4 h-4" />
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                {/* Group Field */}
                <div className="space-y-2">
                  <FormLabel htmlFor="group" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Lucide icon="Users" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Group</span>
                  </FormLabel>
                  {isAddingNewGroup ? (
                    <div className="flex items-center space-x-2">
                      <FormInput
                        type="text"
                        value={newGroup}
                        onChange={(e) => setNewGroup(e.target.value)}
                        placeholder="Enter new group name"
                        className="flex-grow px-4 py-3 rounded-xl border border-white/40 dark:border-slate-600/40 backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 focus:ring-2 focus:ring-emerald-500/50 dark:focus:ring-emerald-400/40 focus:border-transparent placeholder-slate-500 dark:placeholder-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl focus:shadow-2xl hover:scale-[1.02] focus:scale-[1.02] font-medium text-slate-900 dark:text-white"
                        disabled={isFieldDisabled("group")}
                      />
                      <Button
                        type="button"
                        variant="outline-secondary"
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-slate-300/60 dark:hover:border-slate-500/60 transition-all duration-300 hover:shadow-xl hover:scale-105 transform-gpu"
                        onClick={handleCancelNewGroup}
                        disabled={isFieldDisabled("group")}
                      >
                        <Lucide icon="X" className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/90 to-green-500/90 hover:from-emerald-600/90 hover:to-green-600/90 backdrop-blur-sm border-emerald-400/30 shadow-xl shadow-emerald-500/30 transition-all duration-300 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-emerald-500/40"
                        onClick={handleSaveNewGroup}
                        disabled={isFieldDisabled("group")}
                      >
                        <Lucide icon="Check" className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <select
                        id="group"
                        name="group"
                        value={userData.group}
                        onChange={handleChange}
                        className="appearance-none flex-grow px-4 py-3 text-sm border border-white/40 dark:border-slate-600/40 rounded-xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/60 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                        disabled={isFieldDisabled("group")}
                      >
                        <option value="">Select a group</option>
                        {groups.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline-secondary"
                        className="px-4 py-3 rounded-xl bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-slate-300/60 dark:hover:border-slate-500/60 transition-all duration-300 hover:shadow-xl hover:scale-105 transform-gpu flex items-center space-x-2"
                        onClick={() => setIsAddingNewGroup(true)}
                        disabled={isFieldDisabled("group")}
                      >
                        <Lucide icon="Plus" className="w-4 h-4" />
                        <span className="text-sm font-medium">Add Group</span>
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* View Employees Field */}
                {(currentUserRole === "1" || currentUserRole === "4" || currentUserRole === "5") && (
                  <div className="space-y-2">
                    <FormLabel htmlFor="viewEmployees" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                      <Lucide icon="Eye" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>View Employee's Chats</span>
                    </FormLabel>
                    <div className="space-y-3 p-4 border border-white/30 dark:border-slate-600/30 rounded-xl bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm">
                      <select
                        id="viewEmployees"
                        name="viewEmployees"
                        multiple
                        value={selectedEmployees}
                        onChange={handleEmployeeSelection}
                        className="appearance-none w-full px-4 py-3 text-sm border border-white/40 dark:border-slate-600/40 rounded-xl backdrop-blur-sm bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                        size={5}
                      >
                        {filteredEmployeeList.map((employee) => (
                          <option key={employee.id} value={employee.email}>
                            {employee.name} -{" "}
                            {employee.role === "2"
                              ? "Sales"
                              : employee.role === "3"
                              ? "Observer"
                              : employee.role === "4"
                              ? "Manager"
                              : employee.role === "5"
                              ? "Supervisor"
                              : "Admin"}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                        <Lucide icon="Info" className="w-4 h-4" />
                        <span>Hold Ctrl/Cmd to select multiple employees</span>
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Phone Access Field */}
                <div className="space-y-2">
                  <FormLabel htmlFor="phoneAccess" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Lucide icon="Smartphone" className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Phone Access</span>
                  </FormLabel>
                  <div className="space-y-3 p-4 border border-white/30 dark:border-slate-600/30 rounded-xl bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm">
                    {Object.entries(phoneNames).length === 0 ? (
                      <div className="text-center py-4">
                        <Lucide icon="Phone" className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No phones available</p>
                      </div>
                    ) : (
                      Object.entries(phoneNames).map(([index, phoneName]) => {
                        const phoneIndex = parseInt(index);
                        const isEnabled = userData.phoneAccess?.[phoneIndex] || false;
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-white/50 to-white/30 dark:from-slate-800/50 dark:to-slate-700/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 hover:from-white/70 hover:to-white/50 dark:hover:from-slate-800/70 dark:hover:to-slate-700/50 transition-all duration-200">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id={`phone-${index}`}
                                checked={isEnabled}
                                onChange={(e) => handlePhoneToggle(phoneIndex, e.target.checked)}
                                disabled={
                                  isFieldDisabled("phone") ||
                                  (currentUserRole !== "1" && userData.role !== "2")
                                }
                                className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                              />
                              <label 
                                htmlFor={`phone-${index}`}
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2"
                              >
                                <Lucide icon="Phone" className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                <span>{phoneName || `Phone ${phoneIndex}`}</span>
                              </label>
                            </div>
                            {isEnabled && (
                              <div className="flex items-center space-x-2">
                                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                  Weightage:
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={userData.phoneWeightages?.[phoneIndex] || 0}
                                  onChange={(e) => handleWeightageChange(phoneIndex, parseInt(e.target.value) || 0)}
                                  disabled={
                                    isFieldDisabled("phone") ||
                                    (currentUserRole !== "1" && userData.role !== "2")
                                  }
                                  className="w-20 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white/60 dark:bg-slate-700/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/40 transition-all duration-200"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                
                {/* Profile Image Field */}
                <div className="space-y-2">
                  <FormLabel htmlFor="image" className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Lucide icon="Image" className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    <span>Profile Image</span>
                  </FormLabel>
                  <div className="space-y-4">
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full p-3 border border-white/40 dark:border-slate-600/40 rounded-xl backdrop-blur-md bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 focus:ring-2 focus:ring-pink-500/50 dark:focus:ring-pink-400/40 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-slate-900 dark:text-white"
                    />
                    {userData.imageUrl && (
                      <div className="flex justify-center">
                        <div className="relative group">
                          <img
                            src={userData.imageUrl}
                            alt="Profile"
                            className="w-32 h-32 object-cover rounded-2xl shadow-xl ring-4 ring-white/60 dark:ring-slate-600/60 group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-400/20 via-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Error and Success Messages */}
            {errorMessage && (
              <div className="backdrop-blur-md bg-gradient-to-r from-red-500/10 via-red-500/5 to-red-500/10 dark:from-red-500/20 dark:via-red-500/10 dark:to-red-500/20 border border-red-300/40 dark:border-red-600/40 text-red-700 dark:text-red-300 px-6 py-4 rounded-2xl relative shadow-xl" role="alert">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-red-500/20 backdrop-blur-sm">
                    <Lucide icon="AlertTriangle" className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <strong className="font-bold">Error: </strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="backdrop-blur-md bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/10 dark:from-green-500/20 dark:via-green-500/10 dark:to-green-500/20 border border-green-300/40 dark:border-green-600/40 text-green-700 dark:text-green-300 px-6 py-4 rounded-2xl relative shadow-xl" role="alert">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-green-500/20 backdrop-blur-sm">
                    <Lucide icon="CheckCircle" className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <strong className="font-bold">Success: </strong>
                    <span>{successMessage}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline-secondary"
              className="group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-slate-300/60 dark:hover:border-slate-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/10 dark:hover:shadow-slate-500/20 rounded-xl hover:scale-105 transform-gpu px-6 py-3 flex items-center space-x-2"
              onClick={handleGoBack}
            >
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/20 to-slate-600/20 dark:from-slate-400/20 dark:to-slate-500/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40 group-hover:scale-110 transition-transform duration-300">
                <Lucide icon="X" className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cancel</span>
            </Button>
            
            <Button
              type="button"
              variant="primary"
              className="group bg-gradient-to-r from-blue-500/90 to-indigo-500/90 hover:from-blue-600/90 hover:to-indigo-600/90 backdrop-blur-sm border-blue-400/30 shadow-xl shadow-blue-500/30 transition-all duration-300 rounded-xl px-6 py-3 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-blue-500/40 flex items-center space-x-2"
              onClick={saveUser}
              disabled={isLoading || (currentUserRole === "3" && !userData.password)}
            >
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Lucide icon="Save" className="w-4 h-4" />
                )}
              </div>
              <span className="text-sm font-medium">{isLoading ? "Saving..." : "Save"}</span>
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default Main;