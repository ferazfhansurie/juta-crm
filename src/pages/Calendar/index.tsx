import Lucide from "@/components/Base/Lucide";
import { Menu, Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ChangeEvent, JSXElementConstructor, Key, ReactElement, ReactNode, useEffect, useState } from "react";
import axios from "axios";
import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import { format } from 'date-fns';
import { getDoc, getFirestore, doc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, QueryDocumentSnapshot, DocumentData, query, where } from 'firebase/firestore';
import { useContacts } from "@/contact";
import Select from 'react-select';
import { error } from "console";
import { title } from "process";

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

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  address: string;
  appointmentStatus: string;
  staff: string;
  package: string;
  dateAdded: string;
  contacts: { id: string, name: string, session: number }[]; // Include contacts in the interface
}


interface Employee {
  id: string;
  name: string;
}

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

interface ContactWithSession extends Contact {
  session: number;
}


function Main() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [view, setView] = useState<string>('dayGridMonth');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { contacts: initialContacts } = useContacts();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactSessions, setContactSessions] = useState<{ [key: string]: number }>({});

  const generateTimeSlots = (isWeekend: boolean): string[] => {
    const start = 8;
    const end = isWeekend ? 13 : 20;
    const slots: string[] = [];
  
    for (let hour = start; hour < end; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`);
    }
  
    return slots;
  };


  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)
    setCurrentEvent({ ...currentEvent, dateStr, isWeekend, timeSlots: generateTimeSlots(isWeekend) });
  };
  
  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [startTimeStr, endTimeStr] = e.target.value.split(' - ');
    setCurrentEvent({ ...currentEvent, startTimeStr, endTimeStr });
  };

  let role = 1;
  let userName = '';

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (auth.currentUser?.email) {
      fetchAppointments(auth.currentUser.email);
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if(!user) return;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      const accessToken = companyData.ghl_accessToken;

      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
      });

      setEmployees(employeeListData);
      fetchAppointments(user?.email!);
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  };

  const fetchAppointments = async (selectedUserId: string) => {
    setLoading(true);
    try {
      const userRef = doc(firestore, 'user', selectedUserId);
      const appointmentsCollectionRef = collection(userRef, 'appointments');
      const appointmentsQuery = selectedEmployeeId 
        ? query(appointmentsCollectionRef, where('staff', '==', selectedEmployeeId))
        : appointmentsCollectionRef;
      const querySnapshot = await getDocs(appointmentsQuery);
  
      const allAppointments: Appointment[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));
  
      const formattedAppointments = allAppointments.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  
      // Sort appointments by startTime in ascending order
      const sortedAppointments = allAppointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const employeeId = event.target.value;
    setSelectedEmployeeId(employeeId);
  };

  const fetchContactSession = async (contactId: string) => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;

      const sessionsCollectionRef = collection(firestore, `companies/${companyId}/session`);
      const q = query(sessionsCollectionRef, where('id', '==', contactId));
      const querySnapshot = await getDocs(q);

      let sessionNumber = 0;
      querySnapshot.forEach((doc) => {
        sessionNumber = doc.data().session;
      });

      setContactSessions((prevSessions) => ({
        ...prevSessions,
        [contactId]: sessionNumber,
      }));
    } catch (error) {
      console.error('Error fetching contact session:', error);
    }
  };

  const handleContactChange = (selectedOptions: any) => {
    const selectedContactsArray = selectedOptions.map((option: any) => contacts.find(contact => contact.id === option.value)!);
    setSelectedContacts(selectedContactsArray);

    selectedContactsArray.forEach((contact: { id: string; }) => fetchContactSession(contact.id));
  };

  const handleEventClick = (info: any) => {
    const startStr = format(new Date(info.event.start), 'HH:mm');
    const endStr = format(new Date(info.event.end), 'HH:mm');
    const dateStr = format(new Date(info.event.start), 'yyyy-MM-dd');
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const eventContacts = info.event.extendedProps.contacts || [];
  
    setSelectedContacts(eventContacts.map((contact: { id: string }) => {
      const foundContact = contacts.find(c => c.id === contact.id);
      return foundContact || null;
    }).filter((contact: any) => contact !== null));
  
    eventContacts.forEach((contact: { id: string }) => {
      fetchContactSession(contact.id);
    });
  
    setCurrentEvent({
      id: info.event.id,
      title: info.event.title,
      dateStr: dateStr,
      startTimeStr: startStr,
      endTimeStr: endStr,
      extendedProps: {
        address: info.event.extendedProps.address || '',
        appointmentStatus: info.event.extendedProps.appointmentStatus || '',
        staff: info.event.extendedProps.staff || '',
        package: info.event.extendedProps.package || '',
        dateAdded: info.event.extendedProps.dateAdded || '',
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend)
    });
    setEditModalOpen(true);
  };


  const handleSaveAppointment = async () => {
    const { id, title, dateStr, startTimeStr, endTimeStr, extendedProps } = currentEvent;
    const startTime = new Date(`${dateStr}T${startTimeStr}`).toISOString();
    const endTime = new Date(`${dateStr}T${endTimeStr}`).toISOString();

    const updatedAppointment: Appointment = {
      id,
      title,
      startTime,
      endTime,
      address: extendedProps.address,
      appointmentStatus: extendedProps.appointmentStatus,
      staff: extendedProps.staff,
      package: extendedProps.package,
      dateAdded: extendedProps.dateAdded,
      contacts: selectedContacts.map(contact => ({
        id: contact.id,
        name: contact.contactName,
        session: contactSessions[contact.id] || 0
      })),
    };

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }

      const userRef = doc(firestore, 'user', user.email);
      const appointmentsCollectionRef = collection(userRef, 'appointments');
      const appointmentRef = doc(appointmentsCollectionRef, id); // Ensure id is not empty

      await setDoc(appointmentRef, updatedAppointment);

      setAppointments(appointments.map(appointment =>
        appointment.id === id ? updatedAppointment : appointment
      ));
      
      setEditModalOpen(false);

      // Decrement session count if the status is confirmed
      if (updatedAppointment.appointmentStatus === 'confirmed') {
        updatedAppointment.contacts.forEach(contact => decrementSession(contact.id));
      }
      // Refresh the appointments list after saving the appointment
      fetchAppointments(user.email);
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };
  

  const handleDateSelect = (selectInfo: any) => {
    const dateStr = format(new Date(selectInfo.startStr), 'yyyy-MM-dd');
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)

    setCurrentEvent({
      title: '',
      dateStr: dateStr,
      startTimeStr: '',
      endTimeStr: '',
      extendedProps: {
        address: '',
        appointmentStatus: '',
        staff: '',
        package: '',
        dateAdded: new Date().toISOString()
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend)
    });

    setAddModalOpen(true);
  };

  const handleAddAppointment = async () => {
    const newEvent = {
      title: currentEvent.title,
      startTime: new Date(`${currentEvent.dateStr}T${currentEvent.startTimeStr}`).toISOString(),
      endTime: new Date(`${currentEvent.dateStr}T${currentEvent.endTimeStr}`).toISOString(),
      address: currentEvent.extendedProps.address,
      appointmentStatus: currentEvent.extendedProps.appointmentStatus,
      staff: selectedEmployeeId, // Use selectedEmployeeId instead of selectedStaff
      contacts: selectedContacts.map(contact => ({
        id: contact.id,
        name: contact.contactName,
        session: contactSessions[contact.id] || getPackageSessions(currentEvent.extendedProps.package) // Initialize session number
      })),
      package: currentEvent.extendedProps.package,
    };
    await createAppointment(newEvent);
    setAddModalOpen(false);
  };
  

  const createAppointment = async (newEvent: any) => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
      const userRef = doc(firestore, 'user', user.email); // Correct path to the user document
    
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        console.error('No data found for user!');
        return;
      }
      const companyId = dataUser.companyId;
      console.log(companyId);
  
      const appointmentsCollectionRef = collection(userRef, 'appointments');
      const newAppointmentRef = doc(appointmentsCollectionRef); // Generates a new document ID
    
      const newAppointment = {
        id: newAppointmentRef.id,
        title: newEvent.title,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        address: newEvent.address,
        appointmentStatus: newEvent.appointmentStatus,
        staff: newEvent.staff,
        package: newEvent.package,
        dateAdded: new Date().toISOString(),
        contacts: newEvent.contacts, // Include contacts array
      };
    
      await setDoc(newAppointmentRef, newAppointment);
  
      const companyRef = doc(firestore, 'companies', companyId); // Correct path to the company document
      const sessionsCollectionRef = collection(companyRef, 'session');
  
      for (const contact of newEvent.contacts) {
        const newSessionsRef = doc(sessionsCollectionRef, contact.id); // Use contact.id as document ID
        const newSessions = {
          id: contact.id,
          session: contact.session
        };
  
        await setDoc(newSessionsRef, newSessions);
      }
    
      setAppointments([...appointments, newAppointment]);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };
  

  const handleEventDrop = async (eventDropInfo: any) => {
    const { event } = eventDropInfo;
    const updatedAppointment: Appointment = {
      id: event.id,
      title: event.title,
      startTime: event.startStr,
      endTime: event.endStr,
      address: event.extendedProps.address,
      appointmentStatus: event.extendedProps.appointmentStatus,
      staff: event.extendedProps.staff,
      package: event.extendedProps.package,
      dateAdded: event.extendedProps.dateAdded,
      contacts: event.extendedProps.contacts.map((contact: any) => ({
        id: contact.id,
        name: contact.name, // Ensure contact name is included
        session: contact.session
      }))
    };
  
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
  
      const userRef = doc(firestore, 'user', user.email);
      const appointmentsCollectionRef = collection(userRef, 'appointments');
      const appointmentRef = doc(appointmentsCollectionRef, event.id); // Ensure id is not empty
  
      await setDoc(appointmentRef, updatedAppointment);
  
      setAppointments(appointments.map(appointment =>
        appointment.id === event.id ? updatedAppointment : appointment
      ));
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };
  

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(event.target.value);
  };

  const handleDateFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(event.target.value);
  };

  const filteredAppointments = appointments.filter(appointment => {
    return (
      (filterStatus ? appointment.appointmentStatus === filterStatus : true) &&
      (filterDate ? format(new Date(appointment.startTime), 'yyyy-MM-dd') === filterDate : true)
    );
  });

  const handleAppointmentClick = (appointment: Appointment) => {
    setCurrentEvent({
      id: appointment.id,
      title: appointment.title,
      dateStr: format(new Date(appointment.startTime), 'yyyy-MM-dd'),
      startTimeStr: format(new Date(appointment.startTime), 'HH:mm'),
      endTimeStr: format(new Date(appointment.endTime), 'HH:mm'),
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: appointment.package,
        dateAdded: appointment.dateAdded,
        contacts: appointment.contacts // Include contacts in currentEvent
      }
    });
    setEditModalOpen(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const user = auth.currentUser;
    if (!user) return;
  
    const appointmentDocRef = doc(firestore, `user/${user.email}/appointments/${appointmentId}`);
  
    try {
      await deleteDoc(appointmentDocRef);
  
      setAppointments(prevAppointments => prevAppointments.filter(appointment => appointment.id !== appointmentId));
    } catch (error) {
      console.error('Error deleting appointment from Firestore:', error);
    }
  };
  

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-500';
      case 'confirmed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'showed':
        return 'bg-blue-500';
      case 'noshow':
        return 'bg-black';
      case 'invalid':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPackageName = (status: string) => {
    switch (status) {
      case 'trial1':
        return 'Trial - Private';
      case 'trial2':
        return 'Trial - Duo';
      case 'privDrop':
        return 'Private - Drop In';
      case 'priv4':
        return 'Private - 4 Sessions';
      case 'priv10':
        return 'Private - 10 Sessions';
      case 'priv20':
        return 'Private - 20 Sessions';
      case 'DuoDrop':
        return 'Duo - Drop In';
      case 'duo4':
        return 'Duo - 4 Sessions';
      case 'duo10':
        return 'Duo - 10 Sessions';
      case 'duo20':
        return 'Duo - 20 Sessions';
      default:
        return null;
    }
  };

  const getStatusColor2 = (status: string) => {
    switch (status) {
      case 'new':
        return 'orange'; // Replacing yellow with orange
      case 'confirmed':
        return 'green';
      case 'cancelled':
        return 'red';
      case 'showed':
        return 'blue';
      case 'noshow':
        return 'black';
      case 'invalid':
        return 'purple';
      default:
        return 'orange';
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const statusColor = getStatusColor2(eventInfo.event.extendedProps.appointmentStatus);
    return (
      <div className="flex-grow text-center text-normal font-medium" style={{ backgroundColor: statusColor, color: 'white', padding: '5px', borderRadius: '5px' }}>
        <i>{eventInfo.event.title}</i>
      </div>
    );
  };

  const selectedEmployee = employees.find(employee => employee.id === selectedEmployeeId);

  const getPackageSessions = (packageType: string) => {
    switch (packageType) {
      case 'priv4':
        return 4;
      case 'priv10':
        return 10;
      case 'priv20':
        return 20;
      case 'duo4':
        return 4;
      case 'duo10':
        return 10;
      case 'duo20':
        return 20;
      default:
        return 1; // Default to 1 for any other package types
    }
  };
  
  const decrementSession = async (contactId: string) => {
    // Fetch the current session count from the database
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        console.error('No data found for user!');
        return;
      }
  
      const companyId = dataUser.companyId as string;
      const contactRef = doc(firestore, `companies/${companyId}/session`, contactId);
      const contactSnapshot = await getDoc(contactRef);
  
      if (!contactSnapshot.exists()) {
        console.error('No such document for contact!');
        return;
      }
  
      const contactData = contactSnapshot.data();
      const currentSessionCount = contactData.session;
      console.log(currentSessionCount);
      // Increment the session count
      const newSessionCount = currentSessionCount > 0 ? currentSessionCount - 1 : 0;
      console.log(newSessionCount);
      // Update the session count in the state
      setContactSessions({
        ...contactSessions,
        [contactId]: newSessionCount
      });
  
      // Update the session count in the database
      await updateDoc(contactRef, { session: newSessionCount });
    } catch (error) {
      console.error('Error decrementing session count:', error);
    }
  };

  const incrementSession = async (contactId: string) => {
    // Fetch the current session count from the database
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        console.error('No data found for user!');
        return;
      }
  
      const companyId = dataUser.companyId as string;
      const contactRef = doc(firestore, `companies/${companyId}/session`, contactId);
      const contactSnapshot = await getDoc(contactRef);
  
      if (!contactSnapshot.exists()) {
        console.error('No such document for contact!');
        return;
      }
  
      const contactData = contactSnapshot.data();
      const currentSessionCount = contactData.session;
      console.log(currentSessionCount);
      // Increment the session count
      const newSessionCount = currentSessionCount < getPackageSessions ? currentSessionCount + getPackageSessions : 0;
      console.log(newSessionCount);
      // Update the session count in the state
      setContactSessions({
        ...contactSessions,
        [contactId]: newSessionCount
      });
  
      // Update the session count in the database
      await updateDoc(contactRef, { session: newSessionCount });
    } catch (error) {
      console.error('Error incrementing session count:', error);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center mt-8 intro-y sm:flex-row">
        <div className="flex w-full mt-4 sm:w-auto sm:mt-0">
        {employees.length > 0 && (
          <select value={selectedEmployeeId} onChange={handleEmployeeChange} className="text-white bg-primary hover:bg-white hover:text-primary hover focus:ring-2 focus:ring-blue-300 font-medium rounded-lg text-sm text-start inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mr-4">
            <option value="">Select an employee</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        )}
        </div>
        <div className="flex flex-col items-center sm:flex-row w-full mt-4 sm:w-auto sm:mt-0">
          <select value={filterStatus} onChange={handleStatusFilterChange} className="text-primary border-primary bg-white hover focus:ring-2 focus:ring-blue-300 font-small rounded-lg text-sm mr-4">
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="showed">Showed</option>
            <option value="noshow">No Show</option>
            <option value="invalid">Invalid</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={handleDateFilterChange}
            className="text-primary border-primary bg-white hover focus:ring-2 focus:ring-blue-300 font-small rounded-lg text-sm mr-4"
          />
        </div>
        <div className="flex w-full mt-4 sm:w-auto sm:mt-0">
          <Button
            variant="primary"
            type="button"
            onClick={() => {
              setSelectedContacts([]);
              setCurrentEvent({
                title: '',
                dateStr: '',
                startTimeStr: '',
                endTimeStr: '',
                extendedProps: {
                  address: '',
                  appointmentStatus: '',
                  staff: '',
                  package: '',
                  dateAdded: new Date().toISOString()
                }
              });
              setAddModalOpen(true);
            }}
          >
            <Lucide icon="FilePenLine" className="w-4 h-4 mr-2" /> Add New Appointment
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-5 mt-5">
        <div className="md:col-span-4 xl:col-span-4 2xl:col-span-3">
          <div className="p-5 box intro-y" style={{ maxHeight: '700px', overflowY: 'auto' }}>
            <div className="flex justify-between items-center h-10 intro-y gap-4">
              <h2 className="text-3xl font-bold">
                Appointments
              </h2>
              <div className="">
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-white me-3"><span className="flex w-2.5 h-2.5 bg-yellow-500 rounded-full me-1.5 flex-shrink-0"></span>New</span>
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-white me-3"><span className="flex w-2.5 h-2.5 bg-blue-500 rounded-full me-1.5 flex-shrink-0"></span>Showed</span>
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-white me-3"><span className="flex w-2.5 h-2.5 bg-green-500 rounded-full me-1.5 flex-shrink-0"></span>Confirmed</span>
              </div>
            </div>
            <div className="mt-6 mb-5 border-t border-b border-slate-200/60 dark:border-darkmode-400">
             {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment, index) => (
                  <div key={index} className="relative" onClick={() => handleAppointmentClick(appointment)}>
                    <div className="flex items-center p-3 -mx-3 transition duration-300 ease-in-out rounded-md cursor-pointer event hover:bg-slate-100 dark:hover:bg-darkmode-400">
                      <div className={`w-2 h-20 mr-3 rounded-sm ${getStatusColor(appointment.appointmentStatus)}`}></div>
                      <div className="pr-10 item-center">
                        <div className="truncate event__title text-lg font-medium">{appointment.title}</div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          {new Date(appointment.startTime).toLocaleString('en-US', {
                            weekday: 'long', // Long name of the day of the week
                            month: 'long',   // Full name of the month
                            day: 'numeric',  // Day of the month
                            hour: 'numeric', // Hour
                            minute: 'numeric', // Minute
                            hour12: true     // 12-hour format
                          })} - {new Date(appointment.endTime).toLocaleString('en-US', {
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          })}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">Package: {getPackageName(appointment.package)}</div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          Contacts:{" "}
                          {appointment.contacts && appointment.contacts.length > 0 ? (
                            <span>
                              {appointment.contacts.map(contact => (
                                <div className="capitalize" key={contact.id}>
                                  {contact.name} | Session {contact.session}
                                </div>
                              ))}
                            </span>
                          ) : (
                            <span> No contacts</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))) : (
                <div className="p-3 text-center text-slate-500">
                  No events yet
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="md:col-span-8 xl:col-span-8 2xl:col-span-9">
          <div className="p-5 box">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={view}
              events={filteredAppointments.map(appointment => ({
                id: appointment.id,
                title: appointment.title,
                start: appointment.startTime,
                end: appointment.endTime,
                extendedProps: {
                  appointmentStatus: appointment.appointmentStatus
                }
              }))}
              selectable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              editable={true}
              eventDrop={handleEventDrop}
              eventContent={renderEventContent}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              datesSet={(dateInfo) => setView(dateInfo.view.type)}
            />
            <style jsx global>{`
              .fc .fc-toolbar {
                color: #164E63;
              }
              .fc .fc-toolbar button {
                text-transform: capitalize;
                background-color: #164E63; /* Tailwind blue-600 */
                color: white; /* Ensure button text is white */
                border: none;
                padding: 0.5rem 1rem;
                margin: 0 0.25rem;
                border-radius: 0.375rem; /* Tailwind rounded-md */
                cursor: pointer;
              }
              .fc .fc-toolbar button:hover {
                background-color: #164E63; /* Tailwind blue-800 */
              }
            `}</style>
          </div>
        </div>
      </div>
      {editModalOpen && (
        <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10">
              <div className="flex items-center p-4 border-b">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                  <span className="text-xl">{currentEvent?.title.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{currentEvent?.title}</div>
                  <div className="text-sm text-gray-600">{currentEvent?.extendedProps?.address}</div>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.title || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.dateStr || ''}
                    onChange={handleDateChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time Slot</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.startTimeStr && currentEvent?.endTimeStr ? `${currentEvent.startTimeStr} - ${currentEvent.endTimeStr}` : ''}
                    onChange={handleTimeSlotChange}
                  >
                    <option value="" disabled>Select a time slot</option>
                    {currentEvent?.timeSlots?.map((slot: string) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Appointment Status</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.extendedProps?.appointmentStatus || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, appointmentStatus: e.target.value } })}
                  >
                    <option value="" disabled>Set a status</option>
                    <option value="new">New</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="showed">Showed</option>
                    <option value="noshow">No Show</option>
                    <option value="invalid">Invalid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Staff</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.extendedProps?.staff || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, staff: e.target.value } })}
                  >
                    <option value="" disabled>Select an employee</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Package</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.extendedProps?.package || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, package: e.target.value } })}
                  >
                    <option value="" disabled>Choose a package</option>
                    <option value="trial1">Trial - Private</option>
                    <option value="trial2">Trial - Duo</option>
                    <option value="privDrop">Private - Drop In</option>
                    <option value="priv4">Private - 4 Sessions</option>
                    <option value="priv10">Private - 10 Sessions</option>
                    <option value="priv20">Private - 20 Sessions</option>
                    <option value="duoDrop">Duo - Drop In</option>
                    <option value="duo4">Duo - 4 Sessions</option>
                    <option value="duo10">Duo - 10 Sessions</option>
                    <option value="duo20">Duo - 20 Sessions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contacts</label>
                  <Select
                    isMulti
                    value={selectedContacts.map(contact => ({ value: contact.id, label: contact.contactName }))}
                    options={contacts.map(contact => ({ value: contact.id, label: contact.contactName }))}
                    onChange={handleContactChange}
                    className="capitalize"
                  />
                  {selectedContacts.map(contact => (
                    <div key={contact.id} className="capitalize text-sm text-gray-600">
                      {contact.contactName}: Session {contactSessions[contact.id] || 'N/A'}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-6">
              {currentEvent?.id && (
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  onClick={() => {
                    handleDeleteAppointment(currentEvent.id);
                    setEditModalOpen(false);
                  }}
                >
                  Delete
                </button>
              )}
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  onClick={handleSaveAppointment}
                >
                  Save
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

    {addModalOpen && (
      <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10">
            <div className="flex items-center p-4 border-b">
              <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                <Lucide icon="User" className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl">Add New Appointment</span>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={currentEvent?.title || ''}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={currentEvent?.dateStr || ''}
                  onChange={handleDateChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time Slot</label>
                <select
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={currentEvent?.startTimeStr && currentEvent?.endTimeStr ? `${currentEvent.startTimeStr} - ${currentEvent.endTimeStr}` : ''}
                  onChange={handleTimeSlotChange}
                >
                  <option value="" disabled>Select a time slot</option>
                  {currentEvent?.timeSlots?.map((slot: string) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={currentEvent?.extendedProps?.address || ''}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, address: e.target.value } })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Appointment Status</label>
                <select
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={currentEvent?.extendedProps?.appointmentStatus || ''}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, appointmentStatus: e.target.value } })}
                >
                  <option value="" disabled>Set a status</option>
                  <option value="new">New</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="showed">Showed</option>
                  <option value="noshow">No Show</option>
                  <option value="invalid">Invalid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Staff</label>
                <select
              className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="" disabled>Select an employee</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Package</label>
                <select
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={currentEvent?.extendedProps?.package || ''}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, package: e.target.value } })}
                >
                  <option value="" disabled>Choose a package</option>
                  <option value="trial1">Trial - Private</option>
                  <option value="trial2">Trial - Duo</option>
                  <option value="privDrop">Private - Drop In</option>
                  <option value="priv4">Private - 4 Sessions</option>
                  <option value="priv10">Private - 10 Sessions</option>
                  <option value="priv20">Private - 20 Sessions</option>
                  <option value="duoDrop">Duo - Drop In</option>
                  <option value="duo4">Duo - 4 Sessions</option>
                  <option value="duo10">Duo - 10 Sessions</option>
                  <option value="duo20">Duo - 20 Sessions</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contacts</label>
                <Select
                  isMulti
                  options={contacts.map(contact => ({ value: contact.id, label: contact.contactName }))}
                  onChange={handleContactChange}
                  className="capitalize"
                />
                {selectedContacts.map(contact => (
                  <div key={contact.id} className="capitalize text-sm text-gray-600">
                    {contact.contactName}: Session {contactSessions[contact.id] || 'N/A'}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                onClick={() => {
                  setAddModalOpen(false);
                  setSelectedContacts([]);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                onClick={handleAddAppointment}
              >
                Save
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    )}
    </>
  );
}

export default Main;
