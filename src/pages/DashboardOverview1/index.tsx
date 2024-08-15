import _ from "lodash";
import clsx from "clsx";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState, useMemo } from "react";
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
import { DocumentData, DocumentReference, getDoc, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getFirestore, collection, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { onMessage } from "firebase/messaging";
import { useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { BarChart } from "lucide-react";
import { useContacts } from "@/contact";
import { User } from 'lucide-react';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement);

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

export const updateMonthlyAssignments = async (employeeName: string, incrementValue: number) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.error('No such document for user!');
      return;
    }
    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;

    // Check if the employee exists
    const employeeRef = doc(firestore, 'companies', companyId, 'employee', employeeName);
    const employeeDoc = await getDoc(employeeRef);

    if (!employeeDoc.exists()) {
      console.error(`Employee ${employeeName} does not exist`);
      return;
    }

    const currentDate = new Date();
    const currentMonthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

    // Update existing employee document
    await updateDoc(employeeRef, {
      assignedContacts: increment(incrementValue)
    });

    // Update or create the monthly assignment document
    const monthlyAssignmentRef = doc(employeeRef, 'monthlyAssignments', currentMonthKey);
    await setDoc(monthlyAssignmentRef, {
      assignments: increment(incrementValue),
      lastUpdated: serverTimestamp()
    }, { merge: true });

    console.log(`Updated monthly assignments for employee ${employeeName}`);
  } catch (error) {
    console.error('Error updating monthly assignments:', error);
  }
};

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
    email: string;
    assignedContacts: number;
    company: string;
    companyId: string;
    phoneNumber: string;
    monthlyAssignments?: { [key: string]: number };
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
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchCompanyData();
    fetchEmployees();
    fetchLeadsData();
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
      console.log('No such document for user!');
      return;
    }
    const dataUser = docUserSnapshot.data();
    if (!dataUser) {
      console.log('User document exists but has no data!');
      return;
    }

    companyId = dataUser.companyId;
    role = dataUser.role;
    
    // Check if notifications exist before setting them
    const userNotifications = dataUser.notifications || [];
    setNotifications(userNotifications);
    setReplies(userNotifications.length);

    if (!companyId) {
      console.log('No company ID found for user!');
      return;
    }

    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document for company!');
      return;
    }
    const data = docSnapshot.data();
    if (!data) {
      console.log('Company document exists but has no data!');
      return;
    }

    // Fetch notifications from the notifications subcollection
    const notificationsRef = collection(firestore, 'user', userEmail, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsRef);
    const notifications = notificationsSnapshot.docs.map((doc) => doc.data());
    console.log(notifications);

    setReplies(notifications.length);

  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
}

  useEffect(() => {
    fetchCompanyData();
  }, []);

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

      // Find current user
      const currentUserData = employeeListData.find(emp => emp.email === user?.email);
      if (currentUserData) {
        setCurrentUser(currentUserData);
        setSelectedEmployee(currentUserData);
      }

      // Sort employees by number of assigned contacts (descending order)
      employeeListData.sort((a, b) => (b.assignedContacts || 0) - (a.assignedContacts || 0));

      // Take top 10 employees for the leaderboard
      const topEmployees = employeeListData.slice(0, 10);
      
      setEmployees(topEmployees);
    
    } catch (error) {
      console.error('Error fetching employees and chats:', error);
    }
  }

  async function fetchEmployeeData(employeeId: string): Promise<Employee | null> {
    try {
      const employeeRef = doc(firestore, `companies/${companyId}/employee/${employeeId}`);
      const employeeSnapshot = await getDoc(employeeRef);
  
      if (employeeSnapshot.exists()) {
        const employeeData = employeeSnapshot.data() as Employee;
        
        // Fetch monthly assignments
        const monthlyAssignmentsRef = collection(employeeRef, 'monthlyAssignments');
        const monthlyAssignmentsSnapshot = await getDocs(monthlyAssignmentsRef);
        
        const monthlyAssignments: { [key: string]: number } = {};
        monthlyAssignmentsSnapshot.forEach((doc) => {
          monthlyAssignments[doc.id] = doc.data().assignments;
        });

        return {
          ...employeeData,
          id: employeeSnapshot.id,
          monthlyAssignments: monthlyAssignments
        };
      } else {
        console.log('No such employee!');
        return null;
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
      return null;
    }
  }

  // Add this useEffect to log the selected employee
  useEffect(() => {
    if (selectedEmployee) {
      console.log("Selected Employee:", selectedEmployee);
      console.log("Monthly Assignments:", selectedEmployee.monthlyAssignments);
    }
  }, [selectedEmployee]);

  // Modify the existing useEffect for selectedEmployee
  useEffect(() => {
    if (selectedEmployee) {
      const employeeRef = doc(firestore, `companies/${companyId}/employee/${selectedEmployee.id}`);
      const monthlyAssignmentsRef = collection(employeeRef, 'monthlyAssignments');
      
      const unsubscribe = onSnapshot(monthlyAssignmentsRef, (snapshot) => {
        const updatedMonthlyAssignments: { [key: string]: number } = {};
        snapshot.forEach((doc) => {
          updatedMonthlyAssignments[doc.id] = doc.data().assignments;
        });
        
        setSelectedEmployee(prevState => ({
          ...prevState!,
          monthlyAssignments: updatedMonthlyAssignments
        }));
      });

      return () => unsubscribe();
    }
  }, [selectedEmployee?.id, companyId]);
  
  // Usage in your component
  useEffect(() => {
    async function loadEmployeeData() {
      if (currentUser) {
        const employeeData = await fetchEmployeeData(currentUser.uid);
        if (employeeData) {
          setSelectedEmployee(employeeData);
        }
      }
    }
  
    if (currentUser) {
      loadEmployeeData();
    }
  }, [currentUser]);

  const getLast12MonthsData = (monthlyAssignments: { [key: string]: number } = {}) => {
    const last12Months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      last12Months.unshift({
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        assignments: monthlyAssignments[monthKey] || 0
      });
    }
    return last12Months;
  };

  // Update the chartData useMemo with logging
  const chartData = useMemo(() => {
    if (!selectedEmployee) return null;
    const last12MonthsData = getLast12MonthsData(selectedEmployee.monthlyAssignments);
    console.log("Chart data calculated:", last12MonthsData);
    return {
      labels: last12MonthsData.map(d => `${d.month} ${d.year}`),
      datasets: [{
        label: 'Assigned Contacts',
        data: last12MonthsData.map(d => d.assignments),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false
      }]
    };
  }, [selectedEmployee, selectedEmployee?.monthlyAssignments]);

  const lineChartOptions = useMemo(() => {
    // Generate a random color when the selected employee changes
    const randomColor = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;

    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Assigned Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Month',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: `Monthly Contact Assignments for ${selectedEmployee?.name || 'Employee'}`,
          color: 'rgb(31, 41, 55)',
        },
      },
      elements: {
        line: {
          borderColor: randomColor,
          backgroundColor: randomColor,
        },
        point: {
          backgroundColor: randomColor,
          borderColor: randomColor,
        },
      },
    } as const;
  }, [selectedEmployee]);

  async function fetchLeadsData() {
    try {
      const leadsRef = collection(firestore, `companies/${companyId}/leads`);
      const leadsSnapshot = await getDocs(leadsRef);
      
      let totalLeads = 0;
      let closedLeads = 0;

      leadsSnapshot.forEach((doc) => {
        totalLeads++;
        if (doc.data().status === 'closed') {
          closedLeads++;
        }
      });

      setUnclosed(totalLeads);
      setClosed(closedLeads);
    } catch (error) {
      console.error('Error fetching leads data:', error);
    }
  }

  return (
    <div className="flex flex-col w-full h-full overflow-x-hidden overflow-y-auto">
      <div className="flex-grow p-4 space-y-6">
        {/* BEGIN: Stats */}
        <div>
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
        </div>
        {/* END: Stats */}
        {/* BEGIN: Employee Leaderboard and Chart */}
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Employee Contact Assignments</h2>
          {loading ? (
            <div className="text-center">
              <LoadingIcon icon="spinning-circles" className="w-8 h-8 mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1 space-y-2">
                {currentUser && (
                  <div 
                    key={currentUser.id} 
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer ${
                      selectedEmployee?.id === currentUser.id ? 'border-2 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedEmployee(currentUser)}
                  >
                    <div className="flex items-center">
                      <User className="w-8 h-8 text-blue-500 dark:text-blue-400 mr-2" />
                      <div>
                        <div className="font-medium text-lg text-gray-800 dark:text-gray-200">{currentUser.name} (You)</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {currentUser.assignedContacts} currently assigned contacts
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {employees.filter(emp => emp.id !== currentUser?.id).map((employee) => (
                <div 
                  key={employee.id} 
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer ${
                    selectedEmployee?.id === employee.id ? 'border-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedEmployee(employee)}
                >
                  <div className="flex items-center">
                    <User className="w-8 h-8 text-blue-500 dark:text-blue-400 mr-2" />
                    <div>
                      <div className="font-medium text-lg text-gray-800 dark:text-gray-200">{employee.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {employee.assignedContacts} currently assigned contacts
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
              <div className="lg:col-span-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div style={{ height: '400px' }}>
                    {chartData ? (
                      <Line data={chartData} options={lineChartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p>Select an employee to view their data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* END: Employee Leaderboard and Chart */}
      </div>
    </div>
  );
}

export default Main;
