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
import { DocumentData, DocumentReference, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { onMessage } from "firebase/messaging";
import { useNavigate } from "react-router-dom"; // Add this import
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Bar, Doughnut } from "react-chartjs-2";
import { BarChart } from "lucide-react";
import { useContacts } from "@/contact";
import { User } from 'lucide-react'; // Add this import

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
let role = 2;
function Main() {

  interface Contact {
    additionalEmails: string[];
    address1: string | null;
    assignedTo: string | null;
    businessId: string | null;
    city: string | null;
    companyName: string | null;
    contactName: string;
    country: string;
    customFields: any[];
    dateAdded: string;
    dateOfBirth: string | null;
    dateUpdated: string;
    dnd: boolean;
    dndSettings: any;
    email: string | null;
    firstName: string;
    followers: string[];
    id: string;
    lastName: string;
    locationId: string;
    phone: string | null;
    postalCode: string | null;
    source: string | null;
    state: string | null;
    tags: string[];
    type: string;
    website: string | null;
  
  }

  interface Employee {
    id: string;
    name: string;
    role: string;
    conversations?: number; // Add this line
    // Add other properties as needed
  }
  
  const [salesReportFilter, setSalesReportFilter] = useState<string>();
  const importantNotesRef = useRef<TinySliderElement>();
  const [, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { contacts: initialContacts} = useContacts();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [totalContacts, setTotalContacts] = useState(initialContacts.length);
  const [closed, setClosed] = useState(0);
  const [unclosed, setUnclosed] = useState(0);
  const [numReplies, setReplies] = useState(0);
  const [abandoned, setAbandoned] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    fetchCompanyData();
    fetchEmployees();
  }, []);
  

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

      // Fetch notifications from the notifications subcollection
    const notificationsRef = collection(firestore, 'user', userEmail, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsRef);
    const notifications = notificationsSnapshot.docs.map((doc: { data: () => DocumentData; }) => doc.data());
    console.log(notifications);

    setReplies(notifications.length);
  
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

  const data = {
    labels: ['Total Contacts', 'Number Of Replies', 'Leads', 'Closed Leads', 'Abandoned'],
    datasets: [
      {
        data: [totalContacts, numReplies, unclosed, closed, abandoned],
        backgroundColor: ['#4338CA', '#818CF8', '#2563EB', '#93C5FD', '#b375bd'],
        hoverBackgroundColor: ['#312E81', '#4F46E5', '#1E40AF', '#3B82F6', '#b375bd']
      }
    ]
  };

  const options = {
    cutout: '85%' // Adjust this value to decrease or increase the doughnut thickness
  };

  const prevImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("prev");
  };

  const nextImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("next");
  };

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
 

      // Assuming refreshAccessToken is defined elsewhere
      console.log(companyData);


    } catch (error) {
      console.error('Error fetching company data:', error);
    }

  }

  async function fetchEmployees() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
    
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;

      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
      });

      // Sort employees by number of conversations (descending order)
      employeeListData.sort((a, b) => (b.conversations || 0) - (a.conversations || 0));

      // Take top 4 employees
      const topEmployees = employeeListData.slice(0, 4);
      
      setEmployees(topEmployees);
    
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 2xl:col-span-9">
        <div className="grid grid-cols-12 gap-6">
          {/* BEGIN: Employee Leaderboard */}
          <div className="col-span-12 mt-8">
            <div className="intro-y flex items-center h-10">
              <h2 className="text-xl sm:text-2xl font-semibold truncate mr-5">Employee Leaderboard</h2>
            </div>
            <div className="intro-y mt-2">
              {loading ? (
                <div className="text-center">
                  <LoadingIcon icon="spinning-circles" className="w-8 h-8 mx-auto" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {employees.map((employee) => (
                    <div key={employee.id} className="intro-y">
                      <div className="box p-3 zoom-in bg-white dark:bg-gray-800">
                        <div className="flex items-center">
                          <User className="w-8 h-8 text-blue-500 dark:text-blue-400 mr-2" />
                          <div>
                            <div className="font-medium text-lg text-gray-800 dark:text-gray-200">{employee.name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {employee.conversations || 0} conversations
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* END: Employee Leaderboard */}

          {/* BEGIN: General Report */}
          <div className="col-span-12">
            <div className="flex items-center h-10 intro-y">
              <h2 className="mr-5 text-2xl font-semibold truncate">
                General Report
              </h2>
            </div>
            <div className="flex flex-col md:flex-row gap-6 mt-2">
              <div className="w-full md:w-1/2 intro-y">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                  <div className="relative aspect-w-16 aspect-h-9">
                    <Doughnut 
                      data={data} 
                      options={{
                        ...options,
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 intro-y">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                  <div className="relative aspect-w-16 aspect-h-9">
                    <Bar 
                      data={data}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              color: 'gray'
                            }
                          },
                          x: {
                            ticks: {
                              color: 'gray'
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            labels: {
                              color: 'gray'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              <div className="intro-y">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <Lucide
                      icon="Contact"
                      className="w-12 h-12 text-blue-800 dark:text-blue-400"
                    />
                    <div className="text-right">
                      <div className="text-5xl font-bold text-gray-800 dark:text-gray-200">
                        {!loading ? totalContacts : (
                          <LoadingIcon icon="spinning-circles" className="w-10 h-10 mx-auto" />
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Total Contacts
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="intro-y">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <Lucide
                      icon="MessageCircleReply"
                      className="w-12 h-12 text-blue-600 dark:text-blue-300"
                    />
                    <div className="text-right">
                      <div className="text-5xl font-bold text-gray-800 dark:text-gray-200">
                        {!loading ? numReplies : (
                          <LoadingIcon icon="spinning-circles" className="w-10 h-10 mx-auto" />
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Number Replies
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="intro-y">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <Lucide
                      icon="Mail"
                      className="w-12 h-12 text-blue-400 dark:text-blue-200"
                    />
                    <div className="text-right">
                      <div className="text-5xl font-bold text-gray-800 dark:text-gray-200">
                        {!loading ? unclosed : (
                          <LoadingIcon icon="spinning-circles" className="w-10 h-10 mx-auto" />
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Total Leads
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="intro-y">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <Lucide
                      icon="Check"
                      className="w-12 h-12 text-blue-200 dark:text-blue-100"
                    />
                    <div className="text-right">
                      <div className="text-5xl font-bold text-gray-800 dark:text-gray-200">
                        {!loading ? closed : (
                          <LoadingIcon icon="spinning-circles" className="w-10 h-10 mx-auto" />
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Closed Leads
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* END: General Report */}
        </div>
      </div>
    </div>
  );
}

export default Main;
