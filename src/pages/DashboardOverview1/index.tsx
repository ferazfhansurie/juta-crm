import _ from "lodash";
import clsx from "clsx";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react";
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
import { getFirebaseToken, messaging } from "../../firebaseconfig";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, getDoc, onSnapshot } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { onMessage } from "firebase/messaging";
import { useNavigate } from "react-router-dom"; // Add this import
import LoadingIcon from "@/components/Base/LoadingIcon";

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

let companyId = "";
let total_contacts = 0;
let closed = 0;
let unclosed = 0;
let num_replies =0;
let role = 2;
function Main() {
  const [salesReportFilter, setSalesReportFilter] = useState<string>();
  const importantNotesRef = useRef<TinySliderElement>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [closed, setClosed] = useState(0);
  const [unclosed, setUnclosed] = useState(0);
  const [num_replies, setReplies] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: { target: { value: string; }; }) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const filteredNotifications = notifications.filter((notification) => {
    return (
      notification.from_name.toLowerCase().includes(searchQuery) ||
      (notification.text && notification.text.body.toLowerCase().includes(searchQuery))
    );
  });
  const saveTokenToFirestore = async (userId: string, token: string) => {
    try {
      await setDoc(doc(firestore, "user", userId), {
        fcmToken: token
      }, { merge: true });
      
    } catch (error) {
      console.error('Error saving token to Firestore:', error);
    }
  };

  const handleGetFirebaseToken = (userId: string) => {
    getFirebaseToken().then(async (firebaseToken: string | undefined) => {
      if (firebaseToken) {
        
        await saveTokenToFirestore(userId, firebaseToken);
      }
    });
  };

  const requestPermission = async (id: string) => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      
      handleGetFirebaseToken(id);
    } else {
      console.error('Notification permission denied.');
    }
  };

  useEffect(() => {
    fetchConfigFromDatabase();

    const unsubscribe = onSnapshot(doc(firestore, "user", auth.currentUser?.email!), (doc) => {
      const data = doc.data();
      if (data?.notifications) {
        setNotifications(data.notifications);
      }
    });

    const unsubscribeMessage = onMessage(messaging, (payload) => {
      
      setNotifications((prevNotifications) => [
        ...prevNotifications,
        payload.notification,
      ]);
    });

    return () => {
      unsubscribe();
      unsubscribeMessage();
    };
  }, []);

  async function fetchConfigFromDatabase() {
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user is currently authenticated.");
      return;
    }
  
    const userEmail = user.email;
  
    if (!userEmail) {
      console.error("Authenticated user has no email.");
      return;
    }
  
    try {
      
      const docUserRef = doc(firestore, 'user', userEmail);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
        return;
      }
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        
        return;
      }
  
      companyId = dataUser.companyId;
      role = dataUser.role;
      setNotifications(dataUser.notifications || []);
   
      setReplies(dataUser.notifications.length);
      
      if (!companyId) {
        
        return;
      }
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        
        return;
      }
      const data = docSnapshot.data();
      if (!data) {
        
        return;
      }
      
      await requestPermission(userEmail);
  
      await searchOpportunities( data.ghl_accessToken,data.ghl_location);
      //await searchContacts(data.ghl_accessToken, data.ghl_location);
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
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
        
        const contacts = response.data.contacts;
        allContacts = [...allContacts, ...contacts];
        if (contacts.length === 0) {
          break;
        }
        page++;
      }
      const filteredContacts = allContacts.filter(contact => contact.phone !== null);
      total_contacts = allContacts.length;
      setLoading(false);
      
    } catch (error) {
      console.error('Error searching conversation:', error);
    }
  }

  async function searchOpportunities(ghlToken: any, locationId: any) {
    setLoading(true);
    setError(null);
  console.log(locationId);
    let allOpportunities: any[] = [];
    let page = 1;
    let totalFetched = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get('https://services.leadconnectorhq.com/opportunities/search', {
        headers: {
          Authorization: `Bearer ${ghlToken}`,
          Version: '2021-07-28',
          Accept: 'application/json'
        },
        params: {
          location_id: locationId,
          limit: 100,
          page: page
        }
      });
console.log(response.data);
      const opportunities = response.data.opportunities;
      totalFetched = opportunities.length;
      allOpportunities = [...allOpportunities, ...opportunities];

      // Check if there are more opportunities to fetch
      if (totalFetched < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    

   const total_contacts = allOpportunities.length;
    const closedCount = allOpportunities.filter(opportunity => opportunity.status === 'won').length;
    const unclosedCount = allOpportunities.filter(opportunity => opportunity.status === 'open').length;
    setTotalContacts(total_contacts);
    setClosed(closedCount);
    setUnclosed(unclosedCount);
    setLoading(false);
  }

  const prevImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("prev");
  };

  const nextImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("next");
  };

  const [totalContacts, setTotalContacts] = useState(0);


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
  const navigate = useNavigate(); // Initialize useNavigate

  const handleNotificationClick = (chatId: any) => {
    navigate(`/chat/?chatId=${chatId}`);
  };
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
 

      // Assuming refreshAccessToken is defined elsewhere
console.log(companyData);

      await searchContacts(companyData.ghl_accessToken,companyData.ghl_location);


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
                      <div className="ml-auto"></div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                     
                      {!loading && totalContacts}
                      {loading && (
         <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
         <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
   
       </div>
      )}
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
                      <div className="ml-auto"></div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                    {!loading && num_replies}
                      {loading && (
         <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
         <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
        
       </div>
      )}
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
                      <div className="ml-auto"></div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                    {!loading && unclosed}
                      {loading && (
         <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
         <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
     
       </div>
      )}
                    </div>
                    <div className="mt-1 text-base text-slate-500">
                      Open
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
                      <div className="ml-auto"></div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                    {!loading && closed}
                      {loading && (
        <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
        <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
     
      </div>
      )}
                    </div>
                    <div className="mt-1 text-base text-slate-500">
                      Closed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
{/* Notifications */}
{role == 1 && (
 <div className="col-span-12 mt-8">
 <div className="flex items-center h-10 intro-y">
   <h2 className="mr-5 text-lg font-medium truncate">Recent Messages</h2>
 </div>
 <div className="relative">
   <input
     type="text"
     className="!box mt-2 mb-2 w-full py-2 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
     placeholder="Search..."
     onChange={handleSearchChange}
     value={searchQuery}
   />
 </div>
 <div className="mt-2 h-64 overflow-y-auto"> {/* Set height and enable scrolling */}
   {filteredNotifications && filteredNotifications.length > 0 ? (
     filteredNotifications.reduce((uniqueNotifications, notification) => {
       const existingNotificationIndex = uniqueNotifications.findIndex(
         (n: { chat_id: any; }) => n.chat_id === notification.chat_id
       );
       if (existingNotificationIndex !== -1) {
         // If a notification with the same chat_id exists, replace it with the new one
         uniqueNotifications[existingNotificationIndex] = notification;
       } else {
         // Otherwise, add the new notification
         uniqueNotifications.push(notification);
       }
       return uniqueNotifications;
     }, []).sort((a: { timestamp: number; }, b: { timestamp: number; }) => b.timestamp - a.timestamp).map((notification: { chat_id: any; from_name: string ; text: { body: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; }; timestamp: number; }, key: Key | null | undefined) => (
       <div key={key} className="w-70">
         <div
           className="flex items-center px-5 py-3 mb-3 box zoom-in w-70 cursor-pointer"
           onClick={() => handleNotificationClick(notification.chat_id)}
         >
           <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white text-xl">
             {notification.from_name ? notification.from_name.charAt(0).toUpperCase() : "?"}
           </div>
           <div className="ml-4 mr-auto">
             <div className="font-medium">{notification.from_name}</div>
             <div className="text-base text-slate-500">{notification.text ? notification.text.body : ""}</div>
             <div className="text-slate-500 text-xs mt-0.5">
               {new Date(notification.timestamp * 1000).toLocaleString()}
             </div>
           </div>
         </div>
       </div>
     ))
   ) : (
     <div className="text-center text-slate-500">No messages available</div>
   )}
 </div>
</div>
)}

{/* END: Notifications */}

        </div>
      </div>
    </div>
  );
}

export default Main;
