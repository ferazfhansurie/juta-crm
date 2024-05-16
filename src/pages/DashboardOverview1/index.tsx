import _ from "lodash";
import clsx from "clsx";
import React, { useState, useEffect, useRef } from "react";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import TinySlider, { TinySliderElement } from "@/components/Base/TinySlider";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import Litepicker from "@/components/Base/Litepicker";
import ReportDonutChart from "@/components/ReportDonutChart";
import ReportLineChart from "@/components/ReportLineChart";
import ReportPieChart from "@/components/ReportPieChart";
import ReportDonutChart1 from "@/components/ReportDonutChart1";
import SimpleLineChart1 from "@/components/SimpleLineChart1";
import LeafletMap from "@/components/LeafletMap";
import { Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import axios from "axios";
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { initializeApp } from "firebase/app";

// Assuming 'app' is your Firebase app instance
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
let companyId='014';
let ghlConfig ={
  ghl_id:'',
  ghl_secret:'',
  refresh_token:'',
};

function Main() {
  const [salesReportFilter, setSalesReportFilter] = useState<string>();
  const importantNotesRef = useRef<TinySliderElement>();
  const prevImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("prev");
  };
  const nextImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("next");
  };

  const [totalContacts, setTotalContacts] = useState(0);

  async function searchContacts(accessToken: any, locationId: any) {
   
    try {
        let allContacts: any[] = [];
        let page = 1;
        const options = {
          method: 'GET',
          url: 'https://services.leadconnectorhq.com/contacts/',
          headers: {
              Authorization: `Bearer ${accessToken}`,
              Version: '2021-07-28',
          },
          params: {
              locationId: locationId
          }
      };
      const response = await axios.request(options);
      console.log('Search Conversation Response:', response.data);
      const contacts = response.data.contacts;
      // Concatenate contacts to allContacts array
      allContacts = [...allContacts, ...contacts];
        // Filter contacts where phone number is not null
        const filteredContacts = allContacts.filter(contact => contact.phone !== null);
        setTotalContacts(filteredContacts.length);
        console.log('Search Conversation Response:', filteredContacts);
        console.log(filteredContacts.length);
    } catch (error) {
        console.error('Error searching conversation:', error);
    }
}

  async function fetchOpportunities(accessToken: any, locationId: any) {
    try {
      const options = {
        method: 'GET',
        url: `https://services.leadconnectorhq.com/opportunities/${locationId}`,  // Adjust the URL if necessary
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-07-28',
        }
      };

      const response = await axios.request(options);
      console.log('Fetch Opportunities Response:', response.data);
      return response.data.opportunities;  // Make sure the key matches the API response
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      return [];
    }
  }

  useEffect(() => {
    fetchCompanyData();
  }, []);
  //requesting Opportunities (Contacts)
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

    
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
 
      // Assuming ghlConfig, setToken, and fetchChatsWithRetry are defined elsewhere
  ghlConfig = {
        ghl_id: companyData.ghl_id,
        ghl_secret: companyData.ghl_secret,
        refresh_token: companyData.refresh_token
      };

      // Assuming refreshAccessToken is defined elsewhere
console.log(companyData);

      await searchContacts(companyData.access_token,companyData.ghl_location);


    } catch (error) {
      console.error('Error fetching company data:', error);
    }

  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 2xl:col-span-9">
        <div className="grid grid-cols-12 gap-6">
          {/* BEGIN: General Report */}
          <div className="col-span-12 mt-8">
            <div className="flex items-center h-10 intro-y">
              <h2 className="mr-5 text-lg font-medium truncate">
                General Report
              </h2>
              <a href="" className="flex items-center ml-auto text-primary">
                <Lucide icon="RefreshCcw" className="w-4 h-4 mr-3" /> Reload
                Data
              </a>
            </div>
            <div className="grid grid-cols-12 gap-6 mt-5">
              <div className="col-span-12 sm:col-span-6 xl:col-span-3 intro-y">
                <div
                  className={clsx([
                    "relative zoom-in",
                    "before:box before:absolute before:inset-x-3 before:mt-3 before:h-full before:bg-slate-50 before:content-['']",
                  ])}
                >
                  <div className="p-5 box">
                    <div className="flex">
                      <Lucide
                        icon="ShoppingCart"
                        className="w-[28px] h-[28px] text-primary"
                      />
                      <div className="ml-auto">
                        <Tippy
                          as="div"
                          className="cursor-pointer bg-success py-[3px] flex rounded-full text-white text-xs pl-2 pr-1 items-center font-medium"
                          content="33% Higher than last month"
                        >
                          33%
                          <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                        </Tippy>
                      </div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                      {totalContacts}
                    </div>
                    <div className="mt-1 text-base text-slate-500">
                    Total Contacts 
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-6 xl:col-span-3 intro-y">
                <div
                  className={clsx([
                    "relative zoom-in",
                    "before:box before:absolute before:inset-x-3 before:mt-3 before:h-full before:bg-slate-50 before:content-['']",
                  ])}
                >
                  <div className="p-5 box">
                    <div className="flex">
                      <Lucide
                        icon="CreditCard"
                        className="w-[28px] h-[28px] text-pending"
                      />
                      <div className="ml-auto">
                        <Tippy
                          as="div"
                          className="cursor-pointer bg-danger py-[3px] flex rounded-full text-white text-xs pl-2 pr-1 items-center font-medium"
                          content="2% Lower than last month"
                        >
                          2%
                          <Lucide
                            icon="ChevronDown"
                            className="w-4 h-4 ml-0.5"
                          />
                        </Tippy>
                      </div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                      0
                    </div>
                    <div className="mt-1 text-base text-slate-500">
                      Number Of Replies
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-6 xl:col-span-3 intro-y">
                <div
                  className={clsx([
                    "relative zoom-in",
                    "before:box before:absolute before:inset-x-3 before:mt-3 before:h-full before:bg-slate-50 before:content-['']",
                  ])}
                >
                  <div className="p-5 box">
                    <div className="flex">
                      <Lucide
                        icon="Monitor"
                        className="w-[28px] h-[28px] text-warning"
                      />
                      <div className="ml-auto">
                        <Tippy
                          as="div"
                          className="cursor-pointer bg-success py-[3px] flex rounded-full text-white text-xs pl-2 pr-1 items-center font-medium"
                          content="12% Higher than last month"
                        >
                          12%{" "}
                          <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                        </Tippy>
                      </div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                      0
                    </div>
                    <div className="mt-1 text-base text-slate-500">
                      Unclosed
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-12 sm:col-span-6 xl:col-span-3 intro-y">
                <div
                  className={clsx([
                    "relative zoom-in",
                    "before:box before:absolute before:inset-x-3 before:mt-3 before:h-full before:bg-slate-50 before:content-['']",
                  ])}
                >
                  <div className="p-5 box">
                    <div className="flex">
                      <Lucide
                        icon="User"
                        className="w-[28px] h-[28px] text-success"
                      />
                      <div className="ml-auto">
                        <Tippy
                          as="div"
                          className="cursor-pointer bg-success py-[3px] flex rounded-full text-white text-xs pl-2 pr-1 items-center font-medium"
                          content="22% Higher than last month"
                        >
                          22%{" "}
                          <Lucide icon="ChevronUp" className="w-4 h-4 ml-0.5" />
                        </Tippy>
                      </div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                      0
                    </div>
                    <div className="mt-1 text-base text-slate-500">
                      Closed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
         
       
          
      
     
         
        </div>
      </div>
    </div>
  );
}

export default Main;
