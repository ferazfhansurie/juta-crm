import _ from "lodash";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { Menu } from "@/components/Base/Headless";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, getDoc,getDocs } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
let companyId='014';
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
    const companyId = dataUser.companyId;

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
        {/* BEGIN: Users Layout */}
        {_.take(employeeList, 10).map((faker, fakerKey) => (
          <div key={fakerKey} className="col-span-12 intro-y md:col-span-6">
            <div className="box">
              <div className="flex flex-col items-center p-5 lg:flex-row">
              
                <div className="mt-3 text-center lg:ml-2 lg:mr-auto lg:text-left lg:mt-0">
                  <a href="" className="font-medium">
                    {faker.name}
                  </a>
                  <div className="text-slate-500 text-xs mt-0.5">
                    {faker.role === "2"?'Sales':faker.role === "1"?'Admin':"Others"}
                  </div>
                </div>
               
              </div>
            </div>
          </div>
        ))}
        {/* BEGIN: Users Layout */}
        {/* END: Pagination */}
    
        {/* END: Pagination */}
      </div>
    </>
  );
}

export default Main;
