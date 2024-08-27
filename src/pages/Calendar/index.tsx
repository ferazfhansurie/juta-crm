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
  staff: string[];
  color: string;
  packageId: string;
  dateAdded: string;
  contacts: { id: string, name: string, session: number }[];
}

interface Employee {
  id: string;
  name: string;
  color: string;
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

type BackgroundStyle = {
  backgroundColor?: string;
  background?: string;
};

interface Package {
  id: string;
  name: string;
  sessions: number;
}

function Main() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
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
  const [initialAppointmentStatus, setInitialAppointmentStatus] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [newPackageName, setNewPackageName] = useState("");
  const [newPackageSessions, setNewPackageSessions] = useState(0);
  const [isAddingPackage, setIsAddingPackage] = useState(false);

  const generateTimeSlots = (isWeekend: boolean): string[] => {
    const start = 8;
    const end = isWeekend ? 13 : 20;
    const slots: string[] = [];
  
    for (let hour = start; hour < end; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`);
    }
  
    return slots;
  };

  // Utility function to blend two colors
  const blendColors = (color1: string, color2: string): string => {
    const hex = (color: string) => {
      return color.replace("#", "");
    };

    const r1 = parseInt(hex(color1).substring(0, 2), 16);
    const g1 = parseInt(hex(color1).substring(2, 4), 16);
    const b1 = parseInt(hex(color1).substring(4, 6), 16);

    const r2 = parseInt(hex(color2).substring(0, 2), 16);
    const g2 = parseInt(hex(color2).substring(2, 4), 16);
    const b2 = parseInt(hex(color2).substring(4, 6), 16);

    const r = Math.round((r1 + r2) / 2).toString(16).padStart(2, "0");
    const g = Math.round((g1 + g2) / 2).toString(16).padStart(2, "0");
    const b = Math.round((b1 + b2) / 2).toString(16).padStart(2, "0");

    return `#${r}${g}${b}`;
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
      const colors = ["#1F3A8A", "#2196F3", "#FFC107", "#9C27B0", "#00BCD4", "#795548", "#607D8B", "#E91E63"];
      let colorIndex = 0;
  
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data(), color: colors[colorIndex % colors.length] } as Employee);
        colorIndex++;
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
  
      let appointmentsQuery;
      if (selectedEmployeeId) {
        // Fetch appointments where the selected employee is the only staff member
        const singleStaffQuery = query(appointmentsCollectionRef, where('staff', '==', [selectedEmployeeId]));
        // Fetch appointments where the selected employee is among the staff members
        const multipleStaffQuery = query(appointmentsCollectionRef, where('staff', 'array-contains', selectedEmployeeId));
  
        const [singleStaffSnapshot, multipleStaffSnapshot] = await Promise.all([
          getDocs(singleStaffQuery),
          getDocs(multipleStaffQuery),
        ]);
  
        // Combine results from both queries, avoiding duplicates
        const singleStaffAppointments = singleStaffSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Appointment));
  
        const multipleStaffAppointments = multipleStaffSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          } as Appointment))
          .filter(appointment => !singleStaffAppointments.some(a => a.id === appointment.id));
  
        const allAppointments = [...singleStaffAppointments, ...multipleStaffAppointments];
        setAppointments(allAppointments.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()));
      } else {
        // If no employee is selected, fetch all appointments
        const querySnapshot = await getDocs(appointmentsCollectionRef);
        const allAppointments = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Appointment));
        setAppointments(allAppointments.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()));
      }

      // Fetch package details for each appointment
      const appointmentsWithPackages = await Promise.all(appointments.map(async (appointment: Appointment) => {
        if (appointment.packageId) {
          const packageRef = doc(firestore, `companies/${selectedUserId}/packages`, appointment.packageId);
          const packageSnapshot = await getDoc(packageRef);
          if (packageSnapshot.exists()) {
            const packageData = packageSnapshot.data();
            return {
              ...appointment,
              package: {
                id: packageSnapshot.id,
                name: packageData.name,
                sessions: packageData.sessions
              }
            };
          }
        }
        return appointment;
      }));

      setAppointments(appointmentsWithPackages.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()));
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

  const handleEventClick = async (info: any) => {
    const appointment = appointments.find(app => app.id === info.event.id);
  
    if (!appointment) {
      console.error('Appointment not found!');
      return;
    }
  
    const startStr = format(new Date(appointment.startTime), 'HH:mm');
    const endStr = format(new Date(appointment.endTime), 'HH:mm');
    const dateStr = format(new Date(appointment.startTime), 'yyyy-MM-dd');
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const eventContacts = appointment.contacts || [];
  
    console.log('Event info:', info);
    console.log('Event contacts:', eventContacts);
  
    // Fetch the contact sessions if not already fetched
    const fetchContactSessions = async () => {
      const newContactSessions: { [key: string]: number } = {};
      await Promise.all(eventContacts.map(async (contact: { id: string }) => {
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
        const companyId = dataUser.companyId as string;
        const contactRef = doc(firestore, `companies/${companyId}/session`, contact.id);
        const contactSnapshot = await getDoc(contactRef);
  
        if (contactSnapshot.exists()) {
          const contactData = contactSnapshot.data();
          newContactSessions[contact.id] = contactData.session;
          console.log(`Fetched session for contact ${contact.id}: ${contactData.session}`);
        }
      }));
  
      setContactSessions((prevSessions) => {
        const updatedSessions = { ...prevSessions, ...newContactSessions };
        console.log('Updated contact sessions:', updatedSessions);
        return updatedSessions;
      });
    };
  
    // Fetch contact sessions and wait for completion
    await fetchContactSessions();
  
    // Map event contacts to ContactWithSession objects
    const fullContacts: ContactWithSession[] = eventContacts.map((contact: { id: string }) => {
      const foundContact = contacts.find(c => c.id === contact.id);
      if (foundContact) {
        console.log(`Mapping contact ${contact.id} with session ${contactSessions[contact.id] || 0}`);
        return {
          ...foundContact,
          session: contactSessions[contact.id] || 0
        };
      }
      return null;
    }).filter((contact): contact is ContactWithSession => contact !== null);
  
    console.log('Full contacts after mapping:', fullContacts);
  
    setSelectedContacts(fullContacts);
    console.log('Selected contacts:', fullContacts);
  
    setCurrentEvent({
      id: appointment.id,
      title: appointment.title,
      dateStr: dateStr,
      startTimeStr: startStr,
      endTimeStr: endStr,
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: appointment.packageId,
        dateAdded: appointment.dateAdded,
        contacts: eventContacts // Include contacts in currentEvent
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend)
    });
    console.log('Current event set:', {
      id: appointment.id,
      title: appointment.title,
      dateStr: dateStr,
      startTimeStr: startStr,
      endTimeStr: endStr,
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: appointment.packageId,
        dateAdded: appointment.dateAdded,
        contacts: eventContacts
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend)
    });
    setInitialAppointmentStatus(appointment.appointmentStatus);
    setEditModalOpen(true);
  };

  const handleSaveAppointment = async () => {
    const { id, title, dateStr, startTimeStr, endTimeStr, extendedProps } = currentEvent;
    const startTime = new Date(`${dateStr}T${startTimeStr}`).toISOString();
    const endTime = new Date(`${dateStr}T${endTimeStr}`).toISOString();
  
    const firstEmployeeId = extendedProps.staff[0];
    const secondEmployeeId = extendedProps.staff[1];
    const firstEmployee = employees.find(emp => emp.id === firstEmployeeId);
    const secondEmployee = employees.find(emp => emp.id === secondEmployeeId);
  
    let color;
    if (firstEmployee && secondEmployee) {
      color = `linear-gradient(to right, ${firstEmployee.color} 50%, ${secondEmployee.color} 50%)`;
    } else if (firstEmployee) {
      color = firstEmployee.color;
    } else {
      color = '#51484f'; // Default color
    }
  
    const updatedAppointment: Appointment = {
      id,
      title,
      startTime,
      endTime,
      address: extendedProps.address,
      appointmentStatus: extendedProps.appointmentStatus,
      staff: extendedProps.staff,
      color: color,
      packageId: extendedProps.package.id,
      dateAdded: extendedProps.dateAdded,
      contacts: selectedContacts.map(contact => ({
        id: contact.id,
        name: contact.contactName,
        session: (extendedProps.appointmentStatus === 'showed' || extendedProps.appointmentStatus === 'noshow')
          ? (contactSessions[contact.id] || 0) - 1
          : (contactSessions[contact.id] || 0) // Retain the session count if the status is not "showed" or "noshow"
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
      const appointmentRef = doc(appointmentsCollectionRef, id);
  
      await setDoc(appointmentRef, updatedAppointment);
  
      setAppointments(appointments.map(appointment =>
        appointment.id === id ? updatedAppointment : appointment
      ));
  
      setEditModalOpen(false);
  
      // Decrement session count if the status is "showed" or "noshow"
      if (initialAppointmentStatus !== updatedAppointment.appointmentStatus &&
          (updatedAppointment.appointmentStatus === 'showed' || updatedAppointment.appointmentStatus === 'noshow')) {
        updatedAppointment.contacts.forEach(contact => decrementSession(contact.id));
      }
  
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
    const firstEmployeeId = selectedEmployeeIds[0];
    const firstEmployee = employees.find(emp => emp.id === firstEmployeeId);
  
    const newEvent = {
      title: currentEvent.title,
      startTime: new Date(`${currentEvent.dateStr}T${currentEvent.startTimeStr}`).toISOString(),
      endTime: new Date(`${currentEvent.dateStr}T${currentEvent.endTimeStr}`).toISOString(),
      address: currentEvent.extendedProps.address,
      appointmentStatus: currentEvent.extendedProps.appointmentStatus,
      staff: selectedEmployeeIds, // Use selectedEmployeeIds array
      color: firstEmployee ? firstEmployee.color : '#51484f', // Default color if no employee found
      contacts: selectedContacts.map(contact => ({
        id: contact.id,
        name: contact.contactName,
        session: contactSessions[contact.id] || getPackageSessions(currentEvent.extendedProps.package) // Initialize session number
      })),
      packageId: currentEvent.extendedProps.package.id,
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
      const userRef = doc(firestore, 'user', user.email);
  
      const appointmentsCollectionRef = collection(userRef, 'appointments');
      const newAppointmentRef = doc(appointmentsCollectionRef);
  
      const newAppointment = {
        id: newAppointmentRef.id,
        title: newEvent.title,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        address: newEvent.address,
        appointmentStatus: newEvent.appointmentStatus,
        staff: newEvent.staff,
        color: newEvent.color, // Include color property
        packageId: newEvent.packageId,
        dateAdded: new Date().toISOString(),
        contacts: newEvent.contacts,
      };
  
      await setDoc(newAppointmentRef, newAppointment);
  
      const companyRef = doc(firestore, 'companies', user.email);
      const sessionsCollectionRef = collection(companyRef, 'session');
  
      for (const contact of newEvent.contacts) {
        const newSessionsRef = doc(sessionsCollectionRef, contact.id);
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
  
    console.log('Event Drop Info:', eventDropInfo);
    console.log('Event:', event);
    console.log('Event Start:', event.start);
    console.log('Event End:', event.end);
    console.log('Event Extended Props:', event.extendedProps);
  
    // Fetch the full appointment data to get the contacts array
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
  
      const userRef = doc(firestore, 'user', user.email);
      const appointmentsCollectionRef = collection(userRef, 'appointments');
      const appointmentRef = doc(appointmentsCollectionRef, event.id);
      const appointmentDoc = await getDoc(appointmentRef);
  
      if (!appointmentDoc.exists()) {
        console.error('No such document!');
        return;
      }
  
      const appointmentData = appointmentDoc.data() as Appointment;
  
      const updatedAppointment: Appointment = {
        ...appointmentData,
        startTime: event.start.toISOString(),
        endTime: event.end.toISOString()
      };
  
      console.log('Updated Appointment:', updatedAppointment);
  
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
      (filterDate ? format(new Date(appointment.startTime), 'yyyy-MM-dd') === filterDate : true) &&
      (selectedEmployeeId ? appointment.staff.includes(selectedEmployeeId) || (appointment.staff.length === 1 && appointment.staff[0] === selectedEmployeeId) : true)
    );
  });

  const handleAppointmentClick = async (appointment: Appointment) => {
    // Fetch the contact sessions if not already fetched
    const fetchContactSessions = async () => {
      const newContactSessions: { [key: string]: number } = {};
      await Promise.all(appointment.contacts.map(async (contact) => {
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
        const companyId = dataUser.companyId as string;
        const contactRef = doc(firestore, `companies/${companyId}/session`, contact.id);
        const contactSnapshot = await getDoc(contactRef);
  
        if (contactSnapshot.exists()) {
          const contactData = contactSnapshot.data();
          newContactSessions[contact.id] = contactData.session;
          console.log(`Fetched session for contact ${contact.id}: ${contactData.session}`);
        }
      }));
  
      setContactSessions((prevSessions) => {
        const updatedSessions = { ...prevSessions, ...newContactSessions };
        console.log('Updated contact sessions:', updatedSessions);
        return updatedSessions;
      });
    };
  
    // Fetch contact sessions and wait for completion
    await fetchContactSessions();
  
    // Map appointment contacts to ContactWithSession objects
    const fullContacts: ContactWithSession[] = appointment.contacts.map(contact => {
      const foundContact = contacts.find(c => c.id === contact.id);
      if (foundContact) {
        console.log(`Mapping contact ${contact.id} with session ${contactSessions[contact.id] || 0}`);
        return {
          ...foundContact,
          session: contactSessions[contact.id] || 0
        };
      }
      return null;
    }).filter((contact): contact is ContactWithSession => contact !== null);
  
    console.log('Full contacts after mapping:', fullContacts);
  
    setSelectedContacts(fullContacts);
    console.log('Selected contacts:', fullContacts);
  
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
        package: appointment.packageId,
        dateAdded: appointment.dateAdded,
        contacts: appointment.contacts // Include contacts in currentEvent
      }
    });
    console.log('Current event set:', {
      id: appointment.id,
      title: appointment.title,
      dateStr: format(new Date(appointment.startTime), 'yyyy-MM-dd'),
      startTimeStr: format(new Date(appointment.startTime), 'HH:mm'),
      endTimeStr: format(new Date(appointment.endTime), 'HH:mm'),
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: appointment.packageId,
        dateAdded: appointment.dateAdded,
        contacts: appointment.contacts
      }
    });
    setInitialAppointmentStatus(appointment.appointmentStatus);
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
        return 'bg-gray-500';
      case 'confirmed':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'showed':
        return 'bg-green-500';
      case 'noshow':
        return 'bg-green-500';
      case 'rescheduled':
        return 'bg-gray-500';
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
        return 'gray'; // Replacing yellow with orange
      case 'confirmed':
        return 'gray';
      case 'cancelled':
        return 'red';
      case 'showed':
        return 'green';
      case 'noshow':
        return 'green';
      case 'rescheduled':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const staffIds = eventInfo.event.extendedProps.staff;
    const staffColors = employees
      .filter(employee => staffIds.includes(employee.id))
      .map(employee => employee.color);
  
    let backgroundStyle: BackgroundStyle = { backgroundColor: '#51484f' }; // Default color
  
    if (staffColors.length === 1) {
      backgroundStyle = { backgroundColor: staffColors[0] };
    } else if (staffColors.length === 2) {
      backgroundStyle = { background: `linear-gradient(to right, ${staffColors[0]} 50%, ${staffColors[1]} 50%)` };
    }
  
    return (
      <div className="flex-grow text-center text-normal font-medium" style={{ ...backgroundStyle, color: 'white', padding: '5px', borderRadius: '5px' }}>
        <i>{eventInfo.event.title}</i>
      </div>
    );
  };

  const selectedEmployee = employees.find(employee => employee.id === selectedEmployeeId);

  const handleStaffChange = (employeeId: string) => {
    setCurrentEvent((prevEvent: { extendedProps: { staff: string[]; }; }) => {
      const isSelected = prevEvent.extendedProps.staff.includes(employeeId);
      const newStaff = isSelected
        ? prevEvent.extendedProps.staff.filter((id: string) => id !== employeeId)
        : [...prevEvent.extendedProps.staff, employeeId];
  
      return {
        ...prevEvent,
        extendedProps: {
          ...prevEvent.extendedProps,
          staff: newStaff
        }
      };
    });
  };
  
  const handleStaffChangeAddModal = (employeeId: string) => {
    setSelectedEmployeeIds((prevSelected) => {
      const isSelected = prevSelected.includes(employeeId);
      return isSelected ? prevSelected.filter((id) => id !== employeeId) : [...prevSelected, employeeId];
    });
  };

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
        return null; // Default to 1 for any other package types
    }
  };
  
  const decrementSession = async (contactId: string) => {
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
      const companyId = dataUser.companyId as string;
      const contactRef = doc(firestore, `companies/${companyId}/session`, contactId);
      const contactSnapshot = await getDoc(contactRef);
  
      if (!contactSnapshot.exists()) {
        console.error('No such document for contact!');
        return;
      }
  
      const contactData = contactSnapshot.data();
      const currentSessionCount = contactData.session;
      const newSessionCount = currentSessionCount - 1;
  
      setContactSessions({
        ...contactSessions,
        [contactId]: newSessionCount
      });
  
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

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const packagesRef = collection(firestore, `companies/${companyId}/packages`);
      const packagesSnapshot = await getDocs(packagesRef);

      const packagesData: Package[] = [];
      packagesSnapshot.forEach((doc) => {
        packagesData.push({ id: doc.id, ...doc.data() } as Package);
      });

      setPackages(packagesData);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const addNewPackage = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const packagesRef = collection(firestore, `companies/${companyId}/packages`);

      const newPackage = {
        name: newPackageName,
        sessions: newPackageSessions,
      };

      const docRef = await addDoc(packagesRef, newPackage);
      setPackages([...packages, { id: docRef.id, ...newPackage }]);
      setNewPackageName("");
      setNewPackageSessions(0);
      setIsAddingPackage(false);
    } catch (error) {
      console.error('Error adding new package:', error);
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
            <option value="rescheduled">Resceduled</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={handleDateFilterChange}
            className="text-primary border-primary bg-white hover focus:ring-2 focus:ring-blue-300 font-small rounded-lg text-sm mr-4"
          />
        </div>
        <div>
          <button
            className="mr-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
            onClick={() => setIsAddingPackage(true)}
          >
            Add New Package
          </button>
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
                {employees.map((employee, index) => (
                  <span key={employee.id} className="flex items-center text-xs font-medium text-gray-500 dark:text-white me-3">
                    <span className="flex w-2.5 h-2.5 rounded-full me-1.5 flex-shrink-0" style={{ backgroundColor: employee.color }}></span>
                    {employee.name}
                  </span>
                ))}
              </div>
              <div className="">
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-white me-3"><span className="flex w-2.5 h-2.5 bg-gray-500 rounded-full me-1.5 flex-shrink-0"></span>New</span>
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-white me-3"><span className="flex w-2.5 h-2.5 bg-green-500 rounded-full me-1.5 flex-shrink-0"></span>Showed</span>
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-white me-3"><span className="flex w-2.5 h-2.5 bg-red-500 rounded-full me-1.5 flex-shrink-0"></span>Canceled</span>
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
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          })} - {new Date(appointment.endTime).toLocaleString('en-US', {
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          })}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          Package: {packages.find(p => p.id === appointment.packageId)?.name ?? 'No package set'}
                          {(packages.find(p => p.id === appointment.packageId)?.sessions ?? 0) > 0 && 
                            ` (${packages.find(p => p.id === appointment.packageId)?.sessions ?? 0} sessions)`}
                        </div> 
                        <div className="text-slate-500 text-xs mt-0.5">
                          Contacts:{" "}
                          {appointment.contacts && appointment.contacts.length > 0 ? (
                            <span>
                              {appointment.contacts.map(contact => (
                                <div className="capitalize" key={contact.id}>
                                  {contact.name}
                                  {contact.session > 0 && ` | Session ${contact.session}`}
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
                  appointmentStatus: appointment.appointmentStatus,
                  staff: appointment.staff // Ensure staff property is included
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
                color: #0C4A6E;
              }
              .fc .fc-toolbar button {
                text-transform: capitalize;
                background-color: #0C4A6E; /* Darker blue color */
                color: white; /* Ensure button text is white */
                border: none;
                padding: 0.5rem 1rem;
                margin: 0 0.25rem;
                border-radius: 0.375rem; /* Tailwind rounded-md */
                cursor: pointer;
              }
              .fc .fc-toolbar button:hover {
                background-color: #082F49; /* Even darker blue for hover state */
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
                    <option value="rescheduled">Rescheduled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Staff</label>
                  <div className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`employee-${employee.id}`}
                          checked={currentEvent?.extendedProps?.staff.includes(employee.id)}
                          onChange={() => handleStaffChange(employee.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`employee-${employee.id}`} className="ml-2 text-sm font-medium text-gray-700">
                          {employee.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Package</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.extendedProps?.package?.id || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, package: packages.find(p => p.id === e.target.value) } })}
                  >
                    <option value="" disabled>Choose a package</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.sessions} Sessions
                      </option>
                    ))}
                  </select>
                  <button
                    className="mt-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80"
                    onClick={() => setIsAddingPackage(true)}
                  >
                    Add New Package
                  </button>
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
                {(initialAppointmentStatus !== 'showed' && initialAppointmentStatus !== 'noshow') &&  (
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              onClick={handleSaveAppointment}
            >
              Save
            </button>
          )}
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
                  <option value="rescheduled">rescheduled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Staff</label>
                <div className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`employee-${employee.id}`}
                        checked={selectedEmployeeIds.includes(employee.id)}
                        onChange={() => handleStaffChangeAddModal(employee.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`employee-${employee.id}`} className="ml-2 text-sm font-medium text-gray-700">
                        {employee.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Package</label>
                <select
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={currentEvent?.extendedProps?.package?.id || ''}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, package: packages.find(p => p.id === e.target.value) } })}
                >
                  <option value="" disabled>Choose a package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.sessions} Sessions
                    </option>
                  ))}
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

    {/* Add Package Modal */}
    <Dialog open={isAddingPackage} onClose={() => setIsAddingPackage(false)}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10">
          <h2 className="text-lg font-medium mb-4">Add New Package</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Package Name</label>
              <input
                type="text"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={newPackageName}
                onChange={(e) => setNewPackageName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Number of Sessions</label>
              <input
                type="number"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={newPackageSessions}
                onChange={(e) => setNewPackageSessions(parseInt(e.target.value))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                onClick={() => setIsAddingPackage(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
                onClick={addNewPackage}
              >
                Add Package
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  </>
);
}

export default Main;
