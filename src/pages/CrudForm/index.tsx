import { ClassicEditor } from "@/components/Base/Ckeditor";
import TomSelect from "@/components/Base/TomSelect";
import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
import { FormInput, FormLabel } from "@/components/Base/Form";

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
  const [categories, setCategories] = useState(["1"]);
  const location = useLocation();
  const { contactId, contact, companyId } = location.state ?? [];

  console.log('Contact ID:', contactId);
  console.log('Contact:', contact);
  console.log('Company ID:', companyId);

  const [userData, setUserData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    role: "",
    companyId: ""
  });

  useEffect(() => {
    if (contact) {
      setUserData({
        name: contact.name || "",
        phoneNumber: contact.phoneNumber || "",
        email: contact.id || "",
        password: "",
        role: contact.role || "",
        companyId: companyId || ""
      });
      setCategories([contact.role]);
    }
  }, [contact, companyId]);

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setUserData((prevUserData) => ({
      ...prevUserData,
      [name]: value
    }));
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const saveUser = async () => {
    try {
        setIsLoading(true);
        const userOri = auth.currentUser;
        const docUserRef = doc(firestore, 'user', userOri?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        
    const dataUser = docUserSnapshot.data();
    const companyId = dataUser!.companyId;
    const company = dataUser!.company;
        if (!userOri || !userOri.email) {
            console.log('No authenticated user or user email is null!');
            return;
        }

        const formatPhoneNumber = (phoneNumber: string) => {
            // Ensure phone number is in E.164 format
            if (phoneNumber && !phoneNumber.startsWith('+')) {
               phoneNumber = "+6"+phoneNumber;
            }
            return phoneNumber;
        };
    
        // Prepare user data
     
   
if (contactId) {
  const userDataToSend = {
    uid: contact.id ,
    email: userData.email,
    phoneNumber: formatPhoneNumber(userData.phoneNumber),
    password: userData.password,
    name: userData.name,
    role:userData.role,
    companyId:userData.companyId,
    company:company
};
  const response = await fetch('https://buds-359313.et.r.appspot.com/api/update-user', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(userDataToSend)
});

if (!response.ok) {
    throw new Error('Failed to update user');
}

console.log("User updated successfully");
  await updateDoc(doc(firestore, `companies/${companyId}/employee`, contactId), userDataToSend);
  await updateDoc(doc(firestore, 'user', userData.email), userDataToSend);
  console.log("Contact updated successfully");
  setUserData({
    name: userData.name,
    phoneNumber: userData.phoneNumber,
    email: userData.email,
    password: userData.password,
    role: userData.role,
    companyId: userData.companyId,
});
} else {
     
  // Prepare user data to be sent to the server
  const userDataToSend = {
    name: userData.name,
    phoneNumber: userData.phoneNumber,
    email: userData.email,
    role: categories.toString(),
    companyId: companyId,
    company: company
    // Add any other required fields here
  };
  const response = await fetch(`https://buds-359313.et.r.appspot.com/api/create-user/${userData.email}/${formatPhoneNumber(userData.phoneNumber)}/${userData.password}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
  });
  const responseData = await response.json();
  console.log("Response" + responseData);
  await setDoc(doc(firestore, 'user', userData.email), userDataToSend);
  await setDoc(doc(firestore, `companies/${companyId}/employee`, userData.email), userDataToSend);
  console.log("User created successfully");
  setErrorMessage('');
  setUserData({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    role: "",
    companyId: ""
});
}
      
    
        setIsLoading(false);
    } catch (error) {
        console.error("Error updating user:", error);
        setErrorMessage('An error occurred while saving the user');
        setIsLoading(false);
    }
};
  const editorConfig = {
    toolbar: {
      items: ["bold", "italic", "link"],
    },
  };

  const [editorData, setEditorData] = useState("<p>Content of the editor.</p>");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <div className="flex items-center mt-8 intro-y">
        <h2 className="mr-auto text-lg font-medium">
          {contactId ? "Update User" : "Add User"}
        </h2>
      </div>
      <div className="grid grid-cols-12 gap-6 mt-5">
        <div className="col-span-12 intro-y lg:col-span-6">
          <div className="p-5 intro-y box">
            <div>
              <FormInput
                name="name"
                type="text"
                value={userData.name}
                onChange={handleChange}
                placeholder="Name"
              />
            </div>
            <div className="mt-3">
              <span className="ml-1">+60</span>
              <FormInput
                name="phoneNumber"
                type="text"
                value={userData.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number"
              />
            </div>
            <div className="mt-3">
              <FormInput
                name="email"
                type="text"
                value={userData.email}
                onChange={handleChange}
                placeholder="Email"
                readOnly={!!contactId} // Make email read-only if updating a contact
              />
            </div>
            <div className="mt-3">
              <FormLabel htmlFor="crud-form-2">Role</FormLabel>
              <TomSelect
                id="crud-form-2"
                value={categories}
                onChange={setCategories}
                className="w-full"
              >
                <option value="1">Admin</option>
                <option value="2">Sales</option>
                <option value="3">Others</option>
              </TomSelect>
            </div>
            <div className="mt-3">
              <FormInput
                name="password"
                type="password"
                value={userData.password}
                onChange={handleChange}
                placeholder="Password"
              />
            </div>
            {errorMessage && <div className="text-red-500">{errorMessage}</div>}
            <div className="mt-5 text-right">
              <Button
                type="button"
                variant="outline-secondary"
                className="w-24 mr-1"
                onClick={handleGoBack}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="w-24"
                onClick={saveUser}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Main;
