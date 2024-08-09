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
import { useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { BarChart } from "lucide-react";
import { useContacts } from "@/contact";
import { User } from 'lucide-react';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
    uid: string;
    assignedContacts?: number;
    // Add other properties as needed
  }
  
  const importantNotesRef = useRef<TinySliderElement>();
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
        const employeeData = doc.data() as Employee;
        employeeListData.push({
          ...employeeData,
          id: doc.id,
          assignedContacts: employeeData.assignedContacts || 0
        });
      });

      // Sort employees by number of assigned contacts (descending order)
      employeeListData.sort((a, b) => (b.assignedContacts || 0) - (a.assignedContacts || 0));

      // Take top 10 employees for the leaderboard
      const topEmployees = employeeListData.slice(0, 10);
      
      setEmployees(topEmployees);

      // Console.table the employees and their assignedContacts
      console.table(topEmployees.map(({ id, name, assignedContacts }) => ({ id, name, assignedContacts })));
    
    } catch (error) {
      console.error('Error fetching employees and chats:', error);
    }
  }

  // Prepare data for the bar chart
  const barChartData = {
    labels: employees.map(employee => employee.name),
    datasets: [
      {
        label: 'Assigned Contacts',
        data: employees.map(employee => Math.round(employee.assignedContacts || 0)),
        backgroundColor: employees.map(() => `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.6)`),
        barPercentage: 0.25, // Make bars slimmer
        categoryPercentage: 0.8,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Assigned Contacts',
          color: 'rgb(75, 85, 99)', // text-gray-600
        },
        ticks: {
          color: 'rgb(107, 114, 128)', // text-gray-500
          stepSize: 1,
          callback: function(value: number | string) {
            if (Number.isInteger(Number(value))) {
              return value;
            }
          }
        },
      },
      x: {
        title: {
          display: true,
          text: 'Employees',
          color: 'rgb(75, 85, 99)', // text-gray-600
        },
        ticks: {
          color: 'rgb(107, 114, 128)', // text-gray-500
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Employee Performance',
        color: 'rgb(31, 41, 55)', // text-gray-800
      },
    },
  } as const;

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden overflow-y-auto">
      <div className="flex-grow p-4">
        <div className="space-y-6">
          {/* BEGIN: Stats */}
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Key Performance Indicators</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { icon: "Contact", label: "Total Contacts", value: totalContacts },
              { icon: "MessageCircleReply", label: "Number Replies", value: numReplies },
              { icon: "Mail", label: "Total Leads", value: unclosed },
              { icon: "Check", label: "Closed Leads", value: closed },
            ].map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <Lucide
                    icon={stat.icon as "Contact" | "MessageCircleReply" | "Mail" | "Check"}
                    className="w-12 h-12 text-blue-500 dark:text-blue-400"
                  />
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                      {!loading ? stat.value : (
                        <LoadingIcon icon="spinning-circles" className="w-8 h-8 ml-auto" />
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* END: Stats */}
           {/* BEGIN: Employee Leaderboard */}
           <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Employee Leaderboard</h2>
            {loading ? (
              <div className="text-center">
                <LoadingIcon icon="spinning-circles" className="w-8 h-8 mx-auto" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {employees.map((employee) => (
                  <div key={employee.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <User className="w-8 h-8 text-blue-500 dark:text-blue-400 mr-2" />
                      <div>
                        <div className="font-medium text-lg text-gray-800 dark:text-gray-200">{employee.name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {employee.assignedContacts} assigned contacts
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* END: Employee Leaderboard */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div style={{ height: '50vh', minHeight: '300px' }}>
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            </div>
          </div>
          {/* END: Employee Bar Chart */}
        </div>
      </div>
    </div>
  );
}

export default Main;
