import Lucide from "@/components/Base/Lucide";
import { Menu, Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useEffect, useState } from "react";
import axios from "axios";
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import { format } from 'date-fns';

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
}

interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  extension: string;
  permissions: any;
  roles: any;
}

function Main() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [view, setView] = useState<string>('dayGridMonth');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  let role = 1;
  let userName = '';

  useEffect(() => {
    const fetchCompanyData = async () => {
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
        role = userData.role;
        userName = userData.name;

        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          console.log('No such document for company!');
          return;
        }
        const companyData = docSnapshot.data();
        setAccessToken(companyData.ghl_accessToken);
        setLocationId(companyData.ghl_location);

        const startTime = new Date(0).getTime(); // January 1, 1970 in milliseconds
        const endTime = new Date(Date.now() + 50 * 365 * 24 * 60 * 60 * 1000).getTime(); // 50 years from now in milliseconds
        const usersData = await fetchUsers(companyData.ghl_accessToken, companyData.ghl_location);
        if (usersData.length > 0) {
          setSelectedUserId(usersData[0].id);
          await fetchAppointments(companyData.ghl_accessToken, companyData.ghl_location, usersData[0].id, startTime, endTime);
        }
      } catch (error) {
        console.error('Error fetching company data:', error);
      }
    };

    fetchCompanyData();
  }, []);

  const fetchAppointments = async (accessToken: string, locationId: string, userId: string, startTime: number, endTime: number) => {
    setLoading(true);
    try {
      let allAppointments: Appointment[] = [];
      let fetchMore = true;
      let nextPageUrl = `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&startTime=${startTime}&endTime=${endTime}&userId=${userId}`;

      const fetchData = async (url: string, retries: number = 0): Promise<any> => {
        const options = {
          method: 'GET',
          url: url,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-04-15',
          },
        };

        try {
          const response = await axios.request(options);
          return response;
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      while (fetchMore) {
        const response = await fetchData(nextPageUrl);
        if (!response) break;
        const events = response.data.events;

        if (events.length > 0) {
          allAppointments = [...allAppointments, ...events];
        }

        if (response.data.meta && response.data.meta.nextPageUrl) {
          nextPageUrl = response.data.meta.nextPageUrl;
        } else {
          fetchMore = false;
        }
      }

      const formattedAppointments = allAppointments.map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        address: event.address,
        appointmentStatus: event.appointmentStatus,
        staff: event.staff,  // Assuming 'staff' is available in the event object
        package: event.package,  // Assuming 'package' is available in the event object
        dateAdded: event.dateAdded,  // Assuming 'dateAdded' is available in the event object
      })).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());  // Sort by newest on top

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (accessToken: string, locationId: string) => {
    try {
      const response = await axios.post('https://buds-359313.et.r.appspot.com/api/fetch-users', {
        accessToken,
        locationId
      });
      setUsers(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  };

  const handleUserChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = event.target.value;
    setSelectedUserId(userId);
    const startTime = new Date(0).getTime(); // January 1, 1970 in milliseconds
    const endTime = new Date(Date.now() + 50 * 365 * 24 * 60 * 60 * 1000).getTime(); // 50 years from now in milliseconds
    fetchAppointments(accessToken, locationId, userId, startTime, endTime);
  };

  const handleEventClick = (info: any) => {
    setCurrentEvent(info.event);
    setEditModalOpen(true);
  };

  const handleSaveAppointment = async () => {
    const { id, title, startStr, endStr, extendedProps } = currentEvent;
    const updatedAppointment = {
      id,
      title,
      startTime: startStr,
      endTime: endStr,
      address: extendedProps.address,
      appointmentStatus: extendedProps.appointmentStatus,
      staff: extendedProps.staff,
      package: extendedProps.package,
      dateAdded: extendedProps.dateAdded
    };

    try {
      await axios.put(
        `https://services.leadconnectorhq.com/calendars/events/appointments/${id}`,
        updatedAppointment,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-04-15'
          }
        }
      );

      setAppointments(appointments.map(appointment => 
        appointment.id === id ? updatedAppointment : appointment
      ));
      setEditModalOpen(false);
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    const startStr = format(new Date(selectInfo.startStr), "yyyy-MM-dd'T'HH:mm");
    const endStr = format(new Date(selectInfo.endStr), "yyyy-MM-dd'T'HH:mm");
  
    setCurrentEvent({
      title: '',
      startStr: startStr,
      endStr: endStr,
      extendedProps: {
        address: '',
        appointmentStatus: '',
        staff: '',
        package: '',
        dateAdded: new Date().toISOString()
      }
    });
    setAddModalOpen(true);
  };

  const createAppointment = async (newEvent: any) => {
    try {
      const response = await axios.post(
        'https://services.leadconnectorhq.com/calendars/events/appointments',
        {
          calendarId: 'CVokAlI8fgw4WYWoCtQz', // replace with actual calendarId
          locationId,
          contactId: selectedUserId,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          title: newEvent.title,
          appointmentStatus: newEvent.appointmentStatus,
          assignedUserId: selectedUserId,
          address: newEvent.address,
          ignoreDateRange: false,
          toNotify: false
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-04-15'
          }
        }
      );

      setAppointments([...appointments, response.data]);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  const handleEventDrop = async (eventDropInfo: any) => {
    const { event } = eventDropInfo;
    const updatedAppointment = {
      id: event.id,
      title: event.title,
      startTime: event.startStr,
      endTime: event.endStr,
      address: event.extendedProps.address,
      appointmentStatus: event.extendedProps.appointmentStatus,
      staff: event.extendedProps.staff,
      package: event.extendedProps.package,
      dateAdded: event.extendedProps.dateAdded
    };

    try {
      await axios.put(
        `https://services.leadconnectorhq.com/calendars/events/appointments/${event.id}`,
        updatedAppointment,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-04-15'
          }
        }
      );

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
      startStr: appointment.startTime,
      endStr: appointment.endTime,
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: appointment.package,
        dateAdded: appointment.dateAdded
      }
    });
    setEditModalOpen(true);
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
        return 'bg-gray-500';
      case 'invalid':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
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
        return 'gray';
      case 'invalid':
        return 'purple';
      default:
        return 'gray';
    }
  };
  const renderEventContent = (eventInfo: any) => {
    const statusColor = getStatusColor2(eventInfo.event.extendedProps.appointmentStatus);
    return (
      <div className="flex-grow text-center text-normal font-medium" style={{ backgroundColor: statusColor, color: 'white', padding: '5px', borderRadius: '5px' }}>
        {/* <b>{eventInfo.timeText}</b> */}
        <i>{eventInfo.event.title}</i>
      </div>
    );
  };
  const selectedUser = users.find(user => user.id === selectedUserId);

  return (
    <>
      <div className="flex flex-col items-center mt-8 intro-y sm:flex-row">
        {users.length > 0 && (
          <div className="flex w-full mt-4 sm:w-auto sm:mt-0">
            <select value={selectedUserId} onChange={handleUserChange} className="text-white bg-primary hover:bg-white hover:text-primary hover focus:ring-2 focus:ring-blue-300 font-medium rounded-lg text-sm text-start inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mr-4">
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
              setCurrentEvent({
                title: '',
                startStr: '',
                endStr: '',
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
          <div className="p-5 box intro-y">
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
                      <div className={`w-2 h-16 mr-3 rounded-sm ${getStatusColor(appointment.appointmentStatus)}`}></div>
                      <div className="pr-10 item-center">
                        <div className="truncate event__title text-lg font-medium">{appointment.title}</div>
                        {/* <div className="text-slate-500 text-xs mt-0.5">Status: {appointment.appointmentStatus}</div> */}
                        <div className="text-slate-500 text-xs mt-0.5">
                          {new Date(appointment.startTime).toLocaleString()} - {new Date(appointment.endTime).toLocaleString()}
                        </div>
                        {/* <div className="text-slate-500 text-xs mt-0.5">Staff: {selectedUser?.name}</div> */}
                        <div className="text-slate-500 text-xs mt-0.5">Package: {appointment.package}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
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
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="datetime-local"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={format(new Date(currentEvent?.startStr), "yyyy-MM-dd'T'HH:mm") || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, startStr: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="datetime-local"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={format(new Date(currentEvent?.endStr), "yyyy-MM-dd'T'HH:mm") || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, endStr: new Date(e.target.value).toISOString() })}
                  />
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
                    <option value="new">New</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="showed">Showed</option>
                    <option value="noshow">No Show</option>
                    <option value="invalid">Invalid</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-6">
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
                    value={currentEvent?.title}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="datetime-local"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.startStr}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, startStr: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="datetime-local"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.endStr}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, endStr: new Date(e.target.value).toISOString() })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.extendedProps?.address}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, address: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Appointment Status</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={currentEvent?.extendedProps?.appointmentStatus}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, appointmentStatus: e.target.value } })}
                  >
                    <option value="new">New</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="showed">Showed</option>
                    <option value="noshow">No Show</option>
                    <option value="invalid">Invalid</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  onClick={() => setAddModalOpen(false)}
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

    </>
  );
}

export default Main;
