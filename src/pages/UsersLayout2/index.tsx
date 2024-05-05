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


async function refreshAccessToken() {
  const encodedParams = new URLSearchParams();
  encodedParams.set('client_id', ghlConfig.ghl_id);
  encodedParams.set('client_secret', ghlConfig.ghl_secret);
  encodedParams.set('grant_type', 'refresh_token');
  encodedParams.set('refresh_token', ghlConfig.refresh_token);
  encodedParams.set('user_type', 'Location');
  const options = {
    method: 'POST',
    url: 'https://services.leadconnectorhq.com/oauth/token',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    data: encodedParams,
  };
  const { data: newTokenData } = await axios.request(options);
  return newTokenData;
}
interface Employee {
  id: string;
  name: string;
  role: string;
  // Add other properties as needed
}

function Main() {
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);

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
    
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    } finally {
  
    }
  }

  return (
    <>
      <h2 className="mt-10 text-lg font-medium intro-y">Users Layout</h2>
      <div className="grid grid-cols-12 gap-6 mt-5">
        <div className="flex flex-wrap items-center col-span-12 mt-2 intro-y sm:flex-nowrap">
        <Link to="crud-form">
  <Button variant="primary" className="mr-2 shadow-md">
    Add New User
  </Button>
</Link>
       
          <div className="hidden mx-auto md:block text-slate-500">
            Showing 1 to 10  entries
          </div>
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
                    {faker.role}
                  </div>
                </div>
               
              </div>
            </div>
          </div>
        ))}
        {/* BEGIN: Users Layout */}
        {/* END: Pagination */}
        <div className="flex flex-wrap items-center col-span-12 intro-y sm:flex-row sm:flex-nowrap">
          <Pagination className="w-full sm:w-auto sm:mr-auto">
            <Pagination.Link>
              <Lucide icon="ChevronsLeft" className="w-4 h-4" />
            </Pagination.Link>
            <Pagination.Link>
              <Lucide icon="ChevronLeft" className="w-4 h-4" />
            </Pagination.Link>
            <Pagination.Link>...</Pagination.Link>
            <Pagination.Link>1</Pagination.Link>
            <Pagination.Link active>2</Pagination.Link>
            <Pagination.Link>3</Pagination.Link>
            <Pagination.Link>...</Pagination.Link>
            <Pagination.Link>
              <Lucide icon="ChevronRight" className="w-4 h-4" />
            </Pagination.Link>
            <Pagination.Link>
              <Lucide icon="ChevronsRight" className="w-4 h-4" />
            </Pagination.Link>
          </Pagination>
          <FormSelect className="w-20 mt-3 !box sm:mt-0">
            <option>10</option>
            <option>25</option>
            <option>35</option>
            <option>50</option>
          </FormSelect>
        </div>
        {/* END: Pagination */}
      </div>
    </>
  );
}

export default Main;
