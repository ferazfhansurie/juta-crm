import _ from "lodash";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
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
import axios from 'axios';

import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, getDoc, onSnapshot } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
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
const firestore = getFirestore(app);
const auth = getAuth(app);
let companyId ="";
let total_contacts = 0;
let closed = 0;
let unclosed = 0;
let num_replies = 0;
function Main() {
  const [salesReportFilter, setSalesReportFilter] = useState<string>();
  const importantNotesRef = useRef<TinySliderElement>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {


    fetchConfigFromDatabase();
  }, []);
  async function fetchConfigFromDatabase() {
 
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
        console.log('No such document!');
        return;
      }
      const data = docSnapshot.data();
     console.log(data);
     await searchOpportunities(data.location_id,data.access_token);
    await searchContacts(data.access_token,data.location_id);
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    } finally {
  
    }
  }
  async function searchContacts(accessToken: any, locationId: any) {
    setLoading(true);
    try {
        let allContacts: any[] = [];
        let page = 1;
        while (true) {
            const options = {
                method: 'GET',
                url: 'https://services.leadconnectorhq.com/contacts/',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Version: '2021-07-28',
                },
                params: {
                    locationId: locationId,
                    page: page,
                }
            };
            const response = await axios.request(options);
            console.log('Search Conversation Response:', response.data);
            const contacts = response.data.contacts;
            // Concatenate contacts to allContacts array
            allContacts = [...allContacts, ...contacts];
            if (contacts.length === 0) {
                // If no contacts received in the current page, we've reached the end
                break;
            }
            // Increment page for the next request
            page++;
        }
        // Filter contacts where phone number is not null
        const filteredContacts = allContacts.filter(contact => contact.phone !== null);
        total_contacts = allContacts.length;
        setLoading(false);
        console.log('Search Conversation Response:', filteredContacts);
    } catch (error) {
        console.error('Error searching conversation:', error);
    }
}
const searchOpportunities = async (locationId: any, ghlToken: any) => {
  setLoading(true);
  setError(null);

  try {
    const response = await axios.get('https://services.leadconnectorhq.com/opportunities/search', {
      headers: {
        Authorization: `Bearer ${ghlToken}`,
        Version: '2021-07-28',
        Accept: 'application/json'
      },
      params: {
        location_id: locationId
      }
    });

const opportunities = response.data.opportunities;
const closed_temp = opportunities.filter((opportunity: { status: string; }) => opportunity.status === 'won').length;

const unclosed_temp = opportunities.filter((opportunity: { status: string; }) => opportunity.status === 'open').length;

closed = closed_temp;
unclosed = unclosed_temp;

  } catch (error) {
    setError('An error occurred while fetching the opportunities.');
  } finally {
    setLoading(false);
  }
};
  const prevImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("prev");
  };
  const nextImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("next");
  };

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
                       
                      </div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                      {total_contacts}
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
                      
                      </div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                      {unclosed}
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
                     
                      </div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                      {closed}
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
