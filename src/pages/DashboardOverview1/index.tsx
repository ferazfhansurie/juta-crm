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
  const saveTokenToFirestore = async (userId: string, token: string) => {
    try {
      await setDoc(doc(firestore, "user", userId), {
        fcmToken: token
      }, { merge: true });
      console.log('Token saved to Firestore successfully');
    } catch (error) {
      console.error('Error saving token to Firestore:', error);
    }
  };

  const handleGetFirebaseToken = (userId: string) => {
    getFirebaseToken().then(async (firebaseToken: string | undefined) => {
      if (firebaseToken) {
        console.log(firebaseToken);
        await saveTokenToFirestore(userId, firebaseToken);
      }
    });
  };

  const requestPermission = async (id: string) => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
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
      console.log('Message received. ', payload);
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
        console.log('No such document!');
        return;
      }
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        console.log('User document has no data!');
        return;
      }
  
      companyId = dataUser.companyId;
      setNotifications(dataUser.notifications || []);
   
      setReplies(dataUser.notifications.length);
      console.log(dataUser.notifications);
      if (!companyId) {
        console.log('User document has no companyId!');
        return;
      }
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const data = docSnapshot.data();
      if (!data) {
        console.log('Company document has no data!');
        return;
      }
      console.log(data);
      await requestPermission(userEmail);
      await searchOpportunities( data.access_token,data.location_id,);
      //await searchContacts(data.access_token, data.location_id);
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
        console.log('Search Conversation Response:', response.data);
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
      console.log('Search Conversation Response:', filteredContacts);
    } catch (error) {
      console.error('Error searching conversation:', error);
    }
  }

  async function searchOpportunities(ghlToken: any, locationId: any) {
    setLoading(true);
    setError(null);
  
    try {
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
  
      console.log(allOpportunities);
  
      total_contacts = allOpportunities.length;
      const closedCount = allOpportunities.filter(opportunity => opportunity.status === 'won').length;
      const unclosedCount = allOpportunities.filter(opportunity => opportunity.status === 'open').length;
      
      setClosed(closedCount);
      setUnclosed(unclosedCount);
    } catch (error) {
      setError('An error occurred while fetching the opportunities.');
    } finally {
      setLoading(false);
    }
  }

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
                      <div className="ml-auto"></div>
                    </div>
                    <div className="mt-6 text-3xl font-medium leading-8">
                    {num_replies}
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
                      {unclosed}
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

          {/* Notifications */}
     <div className="col-span-12 mt-8">
  <div className="flex items-center h-10 intro-y">
    <h2 className="mr-5 text-lg font-medium truncate">Recent Messages</h2>
  </div>
  <div className="mt-5">
    {notifications && notifications.length > 0 ? (
      notifications.reduce((uniqueNotifications, notification) => {
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
      }, []).sort((a: { timestamp: number; }, b: { timestamp: number; }) => b.timestamp - a.timestamp).map((notification: { from_name: string ; text: { body: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; } | undefined; timestamp: number; }, key: Key | null | undefined) => (
        <div key={key} className="w-70">
          <div className="flex items-center px-5 py-3 mb-3 box zoom-in w-70">
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white text-xl">
              {notification.from_name ? notification.from_name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="ml-4 mr-auto">
              <div className="font-medium">{notification.from_name}</div>
              <div className="text-base text-slate-500">{(notification.text != undefined) ? notification.text.body : ""}</div>
              <div className="text-slate-500 text-xs mt-0.5">{new Date(notification.timestamp * 1000).toLocaleString()}</div>
            </div>
          </div>
        </div>
      ))
    ) : (
      <div className="text-center text-slate-500">No messages available</div>
    )}
  </div>
</div>
{/* END: Notifications */}
        </div>
      </div>
    </div>
  );
}

export default Main;
