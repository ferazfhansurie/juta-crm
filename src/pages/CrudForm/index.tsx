import { ClassicEditor } from "@/components/Base/Ckeditor";

import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import { FormInput, FormLabel } from "@/components/Base/Form";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged } from "firebase/auth";

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

function Main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState(["1"]);
  const [groups, setGroups] = useState<string[]>([]);
  const location = useLocation();
  const { contactId, contact } = location.state ?? {};

  const [companyId, setCompanyId] = useState("");
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(firestore, 'user', user.email!);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setCompanyId(userData.companyId);
            console.log("Fetched companyId:", userData.companyId);
          } else {
            console.log("No user document found");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        console.log("No user signed in");
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

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
  });

  useEffect(() => {
    if (contact) {
      setUserData({
        name: contact.name || "",
        phoneNumber: contact.phoneNumber ? contact.phoneNumber.split('+6')[1] ?? "" : "",
        email: contact.id || "",
        password: "",
        role: contact.role || "",
        companyId: companyId || "",
        group: contact.group || "",
        employeeId: contact.employeeId || "",
        notes: contact.notes || "",
        quotaLeads: contact.quotaLeads || 0,
        invoiceNumber: contact.invoiceNumber || null,
      });
      setCategories([contact.role]);
    }
    fetchGroups();
  }, [contact, companyId]);

  const fetchGroups = async () => {
    if (!companyId) {
      console.log("No companyId available");
      return;
    }
    console.log("Fetching groups for company:", companyId);
    try {
      const employeeCollectionRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeCollectionRef);
      const uniqueGroups = new Set<string>();
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.group) {
          uniqueGroups.add(data.group);
        }
      });
      const groupsArray = Array.from(uniqueGroups);
      console.log("Fetched groups:", groupsArray);
      setGroups(groupsArray);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
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
      setGroups(prev => [...prev, newGroup.trim()]);
      setUserData(prev => ({ ...prev, group: newGroup.trim() }));
      setIsAddingNewGroup(false);
      setNewGroup("");
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleEditorChange = (data: string) => {
    setUserData(prev => ({ ...prev, notes: data }));
  };

  const saveUser = async () => {
    try {
      setIsLoading(true);
      const userOri = auth.currentUser;
      if (!userOri || !userOri.email) {
        throw new Error("No authenticated user found");
      }

      const docUserRef = doc(firestore, 'user', userOri.email);
      const docUserSnapshot = await getDoc(docUserRef);
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser!.companyId;
      const company = dataUser!.company;

      const formatPhoneNumber = (phoneNumber: string) => {
        return phoneNumber && !phoneNumber.startsWith('+') ? "+6" + phoneNumber : phoneNumber;
      };

      const userDataToSend = {
        name: userData.name,
        phoneNumber: formatPhoneNumber(userData.phoneNumber),
        email: userData.email,
        role: userData.role,
        companyId: companyId,
        company: company,
        group: userData.group,
        employeeId: userData.employeeId || null,
        notes: userData.notes || null,
        quotaLeads: userData.quotaLeads || 0,
        invoiceNumber: userData.invoiceNumber || null,
      };

      if (contactId) {
        // Updating existing user
        await updateDoc(doc(firestore, `companies/${companyId}/employee`, contactId), userDataToSend);
        await updateDoc(doc(firestore, 'user', userData.email), userDataToSend);
        toast.success("User updated successfully");
      } else {
        // Adding new user
        const response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/create-user/${userData.email}/${formatPhoneNumber(userData.phoneNumber)}/${userData.password}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
        });
        const responseData = await response.json();
        
        if (responseData.message === 'User created successfully') {
          await setDoc(doc(firestore, 'user', userData.email), userDataToSend);
          await setDoc(doc(firestore, `companies/${companyId}/employee`, userData.email), userDataToSend);
          toast.success("User created successfully");
          setUserData({
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
          });
        } else {
          throw new Error(responseData.error);
        }
      }

      setSuccessMessage(contactId ? "User updated successfully" : "User created successfully");
      setErrorMessage('');
      setIsLoading(false);
    } catch (error) {
      console.error("Error saving user:", error);
      setErrorMessage('An error occurred while saving the user');
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

  return (
    <div className="w-full px-4 py-6 h-full flex flex-col">
      <div className="flex items-center mb-2">
        <h2 className="text-2xl font-semibold">
          {contactId ? "Update User" : "Add User"}
        </h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex-grow overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="name">Name</FormLabel>
            <FormInput
              id="name"
              name="name"
              type="text"
              value={userData.name}
              onChange={handleChange}
              placeholder="Name"
            />
          </div>
          <div>
            <FormLabel htmlFor="phoneNumber">Phone Number</FormLabel>
            <div className="flex">
              <FormInput
                type="text"
                value="+6"
                readOnly
                className="w-12 mr-2"
              />
              <FormInput
                id="phoneNumber"
                name="phoneNumber"
                type="text"
                value={userData.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number"
                className="flex-grow"
              />
            </div>
          </div>
          <div>
            <FormLabel htmlFor="email">Email</FormLabel>
            <FormInput
              id="email"
              name="email"
              type="text"
              value={userData.email}
              onChange={handleChange}
              placeholder="Email"
              readOnly={!!contactId}
            />
          </div>
          <div>
            <FormLabel htmlFor="group">Group</FormLabel>
            {isAddingNewGroup ? (
              <div className="flex items-center">
                <FormInput
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="Enter new group name"
                  className="w-full mr-2"
                />
                <Button
                  type="button"
                  variant="outline-secondary"
                  className="mr-2"
                  onClick={handleCancelNewGroup}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveNewGroup}
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center">
                <select
                  id="group"
                  name="group"
                  value={userData.group}
                  onChange={handleChange}
                  className="text-black dark:text-white-dark border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full mr-2 p-2.5"
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={handleAddNewGroup}
                  className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 inline-flex items-center whitespace-nowrap"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add New Group
                </Button>
              </div>
            )}
          </div>
          <div>
            <FormLabel htmlFor="role">Role</FormLabel>
            <select
              id="role"
              name="role"
              value={userData.role}
              onChange={(e) => {
                handleChange(e);
                setCategories([e.target.value]);
              }}
              className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full"
            >
              <option value="1">Admin</option>
              <option value="2">Sales</option>
              <option value="3">Observer</option>
              <option value="4">Others</option>
            </select>
          </div>
          <div>
            <FormLabel htmlFor="password">Password</FormLabel>
            <FormInput
              id="password"
              name="password"
              type="password"
              value={userData.password}
              onChange={handleChange}
              placeholder="Password"
            />
          </div>
          <div>
            <FormLabel htmlFor="employeeId">Employee ID</FormLabel>
            <FormInput
              id="employeeId"
              name="employeeId"
              type="text"
              value={userData.employeeId}
              onChange={handleChange}
              placeholder="Employee ID (optional)"
            />
          </div>
          <div>
            <FormLabel htmlFor="quotaLeads">Quota Leads</FormLabel>
            <FormInput
              id="quotaLeads"
              name="quotaLeads"
              type="number"
              value={userData.quotaLeads}
              onChange={(e) => setUserData(prev => ({ ...prev, quotaLeads: parseInt(e.target.value) || 0 }))}
              placeholder="Number of quota leads"
              min="0"
            />
          </div>
          <div>
            <FormLabel htmlFor="invoiceNumber">Invoice Number</FormLabel>
            <FormInput
              id="invoiceNumber"
              name="invoiceNumber"
              type="text"
              value={userData.invoiceNumber || ""}
              onChange={(e) => setUserData(prev => ({ ...prev, invoiceNumber: e.target.value || null }))}
              placeholder="Invoice Number (optional)"
            />
          </div>
        </div>
        <div className="mt-4">
          <FormLabel htmlFor="notes">Notes</FormLabel>
          <div className="relative rounded-lg focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark focus:border-transparent">
            <ClassicEditor
              value={userData.notes}
              onChange={handleEditorChange}
              config={editorConfig}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </div>
        {errorMessage && <div className="text-red-500 mt-4">{errorMessage}</div>}
        {successMessage && <div className="text-green-500 mt-4">{successMessage}</div>}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="outline-secondary"
          className="w-24 mr-4"
          onClick={handleGoBack}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          className="w-24"
          onClick={async () => {
            try {
              await saveUser();
              toast.success("User saved successfully");
              handleGoBack();
            } catch (error) {
              console.error("Error saving user:", error);
              toast.error("Failed to save user");
            }
          }}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default Main;