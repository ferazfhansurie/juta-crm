import { useEffect, useState } from "react";
import { getDocs, doc, getDoc, collection, getFirestore, deleteDoc, addDoc, updateDoc, setDoc } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { useContacts } from "../../contact";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Tippy from "@/components/Base/Tippy";
import TippyContent from "@/components/Base/TippyContent";
import Dialog from "@/components/Base/Headless/Dialog";

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

interface ToolbarProps {
  employees: { name: string, email: string }[];
  onEmployeeChange: (email: string) => void;
  onOpenModal: () => void;
  onOpenAddOpportunityModal: () => void; // Add this line
  userRole: number | null;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function Toolbar({ onOpenModal, onOpenAddOpportunityModal, employees, onEmployeeChange, userRole, onSearchChange }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between w-full p-4 shadow-sm rounded-lg mb-4">
      <div className="flex items-center space-x-4">
        {userRole == 1 && (
          <select className="px-3 py-2 border rounded-lg w-48" onChange={(e) => onEmployeeChange(e.target.value)}>
            {employees.map((employee, index) => (
              <option key={index} value={employee.email}>{employee.name}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Search Opportunities"
          className="px-3 py-2 border rounded-lg w-64"
          onChange={onSearchChange}
        />
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="outline-secondary" className="px-4 py-2">
          Sort By
        </Button>
        <Button variant="outline-secondary" className="px-3 py-2">
          <Lucide icon="Filter" className="w-5 h-5" />
        </Button>
        <Button variant="outline-secondary" className="px-3 py-2">
          <Lucide icon="MoreHorizontal" className="w-5 h-5" />
        </Button>
        {userRole == 1 && (
          <>
            <Button variant="primary" className="px-4 py-2 text-white" onClick={onOpenModal}>
              Edit Pipeline
            </Button>
            <Button variant="primary" className="px-4 py-2 text-white" onClick={onOpenAddOpportunityModal}>
              Add Opportunity
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface Item {
  id: string;
  name: string;
  source: string;
  value: string;
  additionalEmails: string[];
  address1: string | null;
  assignedTo: string;
  businessId: string | null;
  chat: any;
  chat_id: string;
  chat_pic: string;
  chat_pic_full: string;
  city: string | null;
  companyName: string | null;
  country: string;
  customFields: any[];
  dateAdded: string;
  dateOfBirth: string | null;
  dateUpdated: string;
  dnd: boolean;
  dndSettings: any;
  email: string | null;
  firstName: string | null;
  firstNameRaw: string | null;
  followers: any[];
  lastName: string | null;
  lastNameRaw: string | null;
  last_message: any;
  locationId: string;
  phone: string;
  pinned: boolean;
  postalCode: string | null;
  sourceField: string | null;
  state: string | null;
  tags: string[];
  type: string;
  unreadCount: number;
  website: string | null;
  notes?: string; // Add this line
  
}

interface Column {
  id: string;
  name: string;
  sort: number;
  items: Item[];
}

interface Columns {
  [key: string]: Column;
}

function LoadingPage() {
  const [columns, setColumns] = useState<Columns>({});
  const [employees, setEmployees] = useState<{ name: string, email: string }[]>([]);
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { contacts } = useContacts();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const [userRole, setUserRole] = useState<number | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedItemPipelineId, setSelectedItemPipelineId] = useState<string | null>(null);
  const [isAddOpportunityModalOpen, setIsAddOpportunityModalOpen] = useState(false);
  const handleOpenAddOpportunityModal = () => {
    setIsAddOpportunityModalOpen(true);
  };

  const handleSaveSelectedContacts = async (selectedContacts: any[]) => {
    const user = auth.currentUser;
    if (!user) return;

    // Add selected contacts to the default pipeline or a selected pipeline
    const defaultPipelineId = Object.keys(columns).find(key => columns[key].sort === 1);
    if (!defaultPipelineId) return;

    const defaultPipelineRef = collection(firestore, `user/${user.email}/pipeline/${defaultPipelineId}/leads`);
    for (const contact of selectedContacts) {
      const leadData = {
        name: contact.contactName || '',
        source: contact.phone || '',
        value: '',
        additionalEmails: contact.additionalEmails || [],
        address1: contact.address1 || null,
        assignedTo: contact.assignedTo || '',
        businessId: contact.businessId || null,
        chat: contact.chat || {},
        chat_id: contact.chat_id || '',
        chat_pic: contact.chat_pic || '',
        chat_pic_full: contact.chat_pic_full || '',
        city: contact.city || null,
        companyName: contact.companyName || null,
        country: contact.country || '',
        customFields: contact.customFields || [],
        dateAdded: contact.dateAdded || '',
        dateOfBirth: contact.dateOfBirth || null,
        dateUpdated: contact.dateUpdated || '',
        dnd: contact.dnd || false,
        dndSettings: contact.dndSettings || {},
        email: contact.email || null,
        firstName: contact.firstName || null,
        firstNameRaw: contact.firstNameRaw || null,
        followers: contact.followers || [],
        lastName: contact.lastName || null,
        lastNameRaw: contact.lastNameRaw || null,
        last_message: contact.last_message || {},
        locationId: contact.locationId || '',
        phone: contact.phone || '',
        pinned: contact.pinned || false,
        postalCode: contact.postalCode || null,
        sourceField: contact.sourceField || null,
        state: contact.state || null,
        tags: contact.tags || [],
        type: contact.type || '',
        unreadCount: contact.unreadCount || 0,
        website: contact.website || null,
        notes: contact.notes || null
      };
      await addDoc(defaultPipelineRef, leadData);
    }

    // Update local state
    setColumns(prevColumns => {
      const updatedColumns = { ...prevColumns };
      updatedColumns[defaultPipelineId].items.push(...selectedContacts.map(contact => ({
        id: contact.id,
        name: contact.contactName || '',
        source: contact.phone || '',
        value: '',
        additionalEmails: contact.additionalEmails || [],
        address1: contact.address1 || null,
        assignedTo: contact.assignedTo || '',
        businessId: contact.businessId || null,
        chat: contact.chat || {},
        chat_id: contact.chat_id || '',
        chat_pic: contact.chat_pic || '',
        chat_pic_full: contact.chat_pic_full || '',
        city: contact.city || null,
        companyName: contact.companyName || null,
        country: contact.country || '',
        customFields: contact.customFields || [],
        dateAdded: contact.dateAdded || '',
        dateOfBirth: contact.dateOfBirth || null,
        dateUpdated: contact.dateUpdated || '',
        dnd: contact.dnd || false,
        dndSettings: contact.dndSettings || {},
        email: contact.email || null,
        firstName: contact.firstName || null,
        firstNameRaw: contact.firstNameRaw || null,
        followers: contact.followers || [],
        lastName: contact.lastName || null,
        lastNameRaw: contact.lastNameRaw || null,
        last_message: contact.last_message || {},
        locationId: contact.locationId || '',
        phone: contact.phone || '',
        pinned: contact.pinned || false,
        postalCode: contact.postalCode || null,
        sourceField: contact.sourceField || null,
        state: contact.state || null,
        tags: contact.tags || [],
        type: contact.type || '',
        unreadCount: contact.unreadCount || 0,
        website: contact.website || null,
        notes: contact.notes || null
      })));
      return updatedColumns;
    });
  };
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  const handleItemClick = (pipelineId: string, item: Item) => {
    setSelectedItemPipelineId(pipelineId);
    setSelectedItem(item);
    setIsModalOpen2(true);
  };
  const handleSaveItem = async (pipelineId: string, updatedItem: Item) => {
    const user = auth.currentUser;
    if (!user) return;

    const itemDocRef = doc(firestore, `user/${user.email}/pipeline/${pipelineId}/leads/${updatedItem.id}`);
    console.log(itemDocRef);
   
    // Convert updatedItem to a plain object and ensure notes is included
    const updatedItemData = {
      ...updatedItem,
      notes: updatedItem.notes || ''
    };
    console.log(updatedItemData);
    try {
      // Set the document, which will create or update the item
      await setDoc(itemDocRef, updatedItemData);
  
      // Update local state
      setColumns(prevColumns => {
        const updatedColumns = { ...prevColumns };
        const column = updatedColumns[pipelineId];
        if (column) {
          const items = column.items;
          const itemIndex = items.findIndex(item => item.id === updatedItem.id);
          if (itemIndex !== -1) {
            items[itemIndex] = updatedItem;
          }
        }
        return updatedColumns;
      });
    } catch (error) {
      console.error('Error updating item in Firestore:', error);
    }
  };
  const filterItemsWithIndexes = (items: Item[], query: string) => {
    if (!query) return items.map((item, index) => ({ item, originalIndex: index }));
    const formattedQuery = query.replace(/[-\s]/g, '').toLowerCase(); // Remove hyphens and spaces from query and convert to lowercase
    return items
      .map((item, index) => ({ item, originalIndex: index }))
      .filter(({ item }) => {
        const formattedName = (item.name || '').replace(/[-\s]/g, '').toLowerCase();
        const formattedSource = (item.source || '').replace(/[-\s]/g, '').toLowerCase();
        return (
          formattedName.includes(formattedQuery) ||
          formattedSource.includes(formattedQuery)
        );
      });
  };
  const fetchUserData = async (contacts: any[]) => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      console.log('No user is logged in!');
      return;
    }

    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Fetch employee data
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
      const employeeListData: { name: string, email: string }[] = [];
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        employeeListData.push({ name: data.name, email: doc.id });
      });

      setEmployees(employeeListData);

      // Fetch pipeline data
      const pipelineRef = collection(firestore, `user/${user.email}/pipeline`);
      const pipelineSnapshot = await getDocs(pipelineRef);

      const fetchedColumns: Columns = {};
      for (const pipelineDoc of pipelineSnapshot.docs) {
        const pipelineData = pipelineDoc.data();
        const leadsRef = collection(firestore, `user/${user.email}/pipeline/${pipelineDoc.id}/leads`);
        const leadsSnapshot = await getDocs(leadsRef);
        const leadsData: Item[] = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          source: doc.data().source || '',
          value: doc.data().value || '',
          additionalEmails: doc.data().additionalEmails || [],
          address1: doc.data().address1 || null,
          assignedTo: doc.data().assignedTo || '',
          businessId: doc.data().businessId || null,
          chat: doc.data().chat || {},
          chat_id: doc.data().chat_id || '',
          chat_pic: doc.data().chat_pic || '',
          chat_pic_full: doc.data().chat_pic_full || '',
          city: doc.data().city || null,
          companyName: doc.data().companyName || null,
          country: doc.data().country || '',
          customFields: doc.data().customFields || [],
          dateAdded: doc.data().dateAdded || '',
          dateOfBirth: doc.data().dateOfBirth || null,
          dateUpdated: doc.data().dateUpdated || '',
          dnd: doc.data().dnd || false,
          dndSettings: doc.data().dndSettings || {},
          email: doc.data().email || null,
          firstName: doc.data().firstName || null,
          firstNameRaw: doc.data().firstNameRaw || null,
          followers: doc.data().followers || [],
          lastName: doc.data().lastName || null,
          lastNameRaw: doc.data().lastNameRaw || null,
          last_message: doc.data().last_message || {},
          locationId: doc.data().locationId || '',
          phone: doc.data().phone || '',
          pinned: doc.data().pinned || false,
          postalCode: doc.data().postalCode || null,
          sourceField: doc.data().sourceField || null,
          state: doc.data().state || null,
          tags: doc.data().tags || [],
          type: doc.data().type || '',
          unreadCount: doc.data().unreadCount || 0,
          website: doc.data().website || null,
          notes:doc.data().notes || null
        }));

        fetchedColumns[pipelineDoc.id] = {
          id: pipelineDoc.id,
          name: pipelineData.name,
          sort: pipelineData.sort,
          items: leadsData
        };
      }

      // Sort columns by sort number
      const sortedColumns = Object.keys(fetchedColumns)
        .sort((a, b) => fetchedColumns[a].sort - fetchedColumns[b].sort)
        .reduce((acc, key) => {
          acc[key] = fetchedColumns[key];
          return acc;
        }, {} as Columns);

      setColumns(sortedColumns);
      setUserRole(userData.role); // Set the user's role in state
      console.log(userData.role);
      console.log(contacts);
      // Import contacts and filter out groups
      const filteredContacts = Array.isArray(contacts) ? contacts.filter(contact => contact.chat_id && !contact.chat_id.includes('@g.us')) : [];
      console.log(filteredContacts);
      // Check which contacts are already in the pipelines
      const pipelineContacts = new Set();
      for (const column of Object.values(fetchedColumns)) {
        for (const item of column.items) {
          pipelineContacts.add(item.name);  // assuming `name` is unique and matches contactName
        }
      }

      const newContacts = filteredContacts.filter(contact => !pipelineContacts.has(contact.contactName));
      const uniqueContacts = Array.from(new Set(newContacts.map(contact => contact.contactName)))
        .map(contactName => newContacts.find(contact => contact.contactName === contactName));
      
      // Add unique contacts to the pipeline with sort 1
  
  

      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const fetchUserData2 = async (email: string, contacts: any[]) => {
    setLoading(true);
    if (!email) {
      console.log('No email provided!');
      return;
    }

    try {
      const docUserRef = doc(firestore, 'user', email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      // Fetch employee data
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
      const employeeListData: { name: string, email: string }[] = [];
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        employeeListData.push({ name: data.name, email: doc.id });
      });

      setEmployees(employeeListData);

      // Fetch pipeline data
      const pipelineRef = collection(firestore, `user/${email}/pipeline`);
      const pipelineSnapshot = await getDocs(pipelineRef);

      const fetchedColumns: Columns = {};
      for (const pipelineDoc of pipelineSnapshot.docs) {
        const pipelineData = pipelineDoc.data();
        const leadsRef = collection(firestore, `user/${email}/pipeline/${pipelineDoc.id}/leads`);
        const leadsSnapshot = await getDocs(leadsRef);
        const leadsData: Item[] = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          source: doc.data().source || '',
          value: doc.data().value || '',
          additionalEmails: doc.data().additionalEmails || [],
          address1: doc.data().address1 || null,
          assignedTo: doc.data().assignedTo || '',
          businessId: doc.data().businessId || null,
          chat: doc.data().chat || {},
          chat_id: doc.data().chat_id || '',
          chat_pic: doc.data().chat_pic || '',
          chat_pic_full: doc.data().chat_pic_full || '',
          city: doc.data().city || null,
          companyName: doc.data().companyName || null,
          country: doc.data().country || '',
          customFields: doc.data().customFields || [],
          dateAdded: doc.data().dateAdded || '',
          dateOfBirth: doc.data().dateOfBirth || null,
          dateUpdated: doc.data().dateUpdated || '',
          dnd: doc.data().dnd || false,
          dndSettings: doc.data().dndSettings || {},
          email: doc.data().email || null,
          firstName: doc.data().firstName || null,
          firstNameRaw: doc.data().firstNameRaw || null,
          followers: doc.data().followers || [],
          lastName: doc.data().lastName || null,
          lastNameRaw: doc.data().lastNameRaw || null,
          last_message: doc.data().last_message || {},
          locationId: doc.data().locationId || '',
          phone: doc.data().phone || '',
          pinned: doc.data().pinned || false,
          postalCode: doc.data().postalCode || null,
          sourceField: doc.data().sourceField || null,
          state: doc.data().state || null,
          tags: doc.data().tags || [],
          type: doc.data().type || '',
          unreadCount: doc.data().unreadCount || 0,
          website: doc.data().website || null,
          notes:doc.data().notes || null
        }));

        fetchedColumns[pipelineDoc.id] = {
          id: pipelineDoc.id,
          name: pipelineData.name,
          sort: pipelineData.sort,
          items: leadsData
        };
      }

      // Sort columns by sort number before setting state
      const sortedColumnsArray = Object.keys(fetchedColumns)
        .map(key => fetchedColumns[key])
        .sort((a, b) => a.sort - b.sort);

      const sortedColumns = sortedColumnsArray.reduce((acc, column) => {
        acc[column.id] = column;
        return acc;
      }, {} as Columns);
console.log(sortedColumns);
      setColumns(sortedColumns);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  const handleEmployeeChange = (email: string) => {
    setSelectedEmployeeEmail(email);
    fetchUserData2(email, contacts);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setSelectedEmployeeEmail(user.email);
      fetchUserData(contacts);
    }
  }, [contacts]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
  
    const { source, destination } = result;
  
    if (source.droppableId !== destination.droppableId) {
      const sourceColumn = columns[source.droppableId];
      const destColumn = columns[destination.droppableId];
      const sourceItems = [...sourceColumn.items];
      const destItems = [...destColumn.items];
      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);
  
      // Ensure all fields are defined
      const leadData = {
        name: removed.name || '',
        source: removed.source || '',
        value: removed.value || '',
        additionalEmails: removed.additionalEmails || [],
        address1: removed.address1 || null,
        assignedTo: removed.assignedTo || '',
        businessId: removed.businessId || null,
        chat: removed.chat || {},
        chat_id: removed.chat_id || '',
        chat_pic: removed.chat_pic || '',
        chat_pic_full: removed.chat_pic_full || '',
        city: removed.city || null,
        companyName: removed.companyName || null,
        country: removed.country || '',
        customFields: removed.customFields || [],
        dateAdded: removed.dateAdded || '',
        dateOfBirth: removed.dateOfBirth || null,
        dateUpdated: removed.dateUpdated || '',
        dnd: removed.dnd || false,
        dndSettings: removed.dndSettings || {},
        email: removed.email || null,
        firstName: removed.firstName || null,
        firstNameRaw: removed.firstNameRaw || null,
        followers: removed.followers || [],
        lastName: removed.lastName || null,
        lastNameRaw: removed.lastNameRaw || null,
        last_message: removed.last_message || {},
        locationId: removed.locationId || '',
        phone: removed.phone || '',
        pinned: removed.pinned || false,
        postalCode: removed.postalCode || null,
        sourceField: removed.sourceField || null,
        state: removed.state || null,
        tags: removed.tags || [],
        type: removed.type || '',
        unreadCount: removed.unreadCount || 0,
        website: removed.website || null,
        notes: removed.notes || null
      };
  
      // Update local state first
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          items: sourceItems
        },
        [destination.droppableId]: {
          ...destColumn,
          items: destItems
        }
      });
  
      // Update Firestore
      const user = auth.currentUser;
      if (!user) return;
  
      const sourceDocRef = doc(firestore, `user/${user.email}/pipeline/${source.droppableId}/leads/${removed.id}`);
      const destCollectionRef = collection(firestore, `user/${user.email}/pipeline/${destination.droppableId}/leads`);
  
      try {
        await deleteDoc(sourceDocRef);
        await addDoc(destCollectionRef, leadData);
      } catch (error) {
        console.error('Error updating Firestore:', error);
      }
    } else {
      const column = columns[source.droppableId];
      const copiedItems = [...column.items];
      const [removed] = copiedItems.splice(source.index, 1);
      copiedItems.splice(destination.index, 0, removed);
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...column,
          items: copiedItems
        }
      });
    }
  };

  const columnColors = [
    "border-blue-500",
    "border-yellow-500",
    "border-red-500",
    "border-green-500",
    "border-purple-500",
    "border-pink-500"
  ];

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleSaveModal = async (data: Column[] | Column) => {
    const user = auth.currentUser;
    if (!user) return;

    if (Array.isArray(data)) {
      // Handle the reordering of pipelines
      setColumns((prevColumns) => {
        const updatedColumns = { ...prevColumns };
        data.forEach((pipeline, index) => {
          updatedColumns[pipeline.id] = { ...pipeline, sort: index + 1 };
        });
        return updatedColumns;
      });

      // Update Firestore
      for (const pipeline of data) {
        const pipelineDocRef = doc(firestore, `user/${user.email}/pipeline/${pipeline.id}`);
        await updateDoc(pipelineDocRef, { sort: pipeline.sort });
      }
    } else {
      // Handle adding or updating a single pipeline
      setColumns((prevColumns) => ({
        ...prevColumns,
        [data.id]: data,
      }));

      // Update Firestore
      const pipelineDocRef = doc(firestore, `user/${user.email}/pipeline/${data.id}`);
      await updateDoc(pipelineDocRef, { name: data.name, sort: data.sort });
    }
    setIsModalOpen(false);
  };
  const handleDeleteItem = async (pipelineId: string, itemId: string) => {
    const user = auth.currentUser;
    if (!user) return;
  
    const itemDocRef = doc(firestore, `user/${user.email}/pipeline/${pipelineId}/leads/${itemId}`);
    
    try {
      await deleteDoc(itemDocRef);
      
      setColumns(prevColumns => {
        const updatedColumns = { ...prevColumns };
        const column = updatedColumns[pipelineId];
        if (column) {
          const items = column.items.filter(item => item.id !== itemId);
          column.items = items;
        }
        return updatedColumns;
      });
    } catch (error) {
      console.error('Error deleting item from Firestore:', error);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 overflow-hidden">
      <Toolbar onOpenModal={handleOpenModal} onOpenAddOpportunityModal={handleOpenAddOpportunityModal} employees={employees} onEmployeeChange={handleEmployeeChange} userRole={userRole} onSearchChange={handleSearchChange} />
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50">
          <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
            <div role="status">
            <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
          <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
          <div className="mt-2 text-xs text-center">Fetching Data...</div>
        </div>
            </div>
          </div>
        </div>
      )}
<DragDropContext onDragEnd={onDragEnd}>
  <div className="flex w-full space-x-4 h-[calc(100vh-160px)] overflow-x-auto">
    {Object.entries(columns).map(([columnId, column], index) => {
      const borderColor = columnColors[index % columnColors.length];
      const filteredItemsWithIndexes = filterItemsWithIndexes(column.items, searchQuery); // Use updated filter function
      console.log(filteredItemsWithIndexes);
      return (
        <Droppable droppableId={columnId} key={columnId}>
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`flex-shrink-0 flex flex-col items-center rounded-lg w-1/5 border-t-4 ${borderColor} overflow-hidden`}
            >
              <div className="w-full mb-4 p-4 bg-white shadow rounded-lg border">
                <h2 className="text-base font-bold text-primary">{column.name}</h2>
              </div>
              <div
                className={`p-4 rounded-lg w-full h-full overflow-y-auto ${snapshot.isDraggingOver ? 'bg-slate-300' : 'bg-slate-100'}`}
              >
                {filteredItemsWithIndexes.map(({ item, originalIndex }) => (
                  <Draggable key={item.id} draggableId={item.id} index={originalIndex}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`user-select-none p-4 mb-4 rounded-lg shadow-md border bg-white text-gray-800 ${snapshot.isDragging ? 'bg-slate-400' : 'bg-white'}`}
                        onClick={() => handleItemClick(column.id, item)}
                      >
                        <div className="flex items-center mb-2">
                          {item.chat_pic_full ? (
                            <img
                              src={item.chat_pic_full}
                              className="w-8 h-8 rounded-full mr-3 object-cover"
                              alt="Profile"
                            />
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-300 rounded-full mr-3 text-white">
                              {item.firstName ? item.firstName.charAt(0).toUpperCase() : "?"}
                            </div>
                          )}
                          <p className="font-medium text-primary">{item.firstName || ""}</p>
                        </div>
                        <p className="font-semibold">{item.source}</p>
                        <p className="text-sm font-medium">{item.value}</p>
                        <p className="text-sm text-gray-700">{item.notes}</p>
                        <div className="flex flex-wrap mt-2">
                          {item.tags && item.tags.length > 0 && (
                            <Tippy content={item.tags.join(', ')}>
                              <span className="bg-blue-200 text-blue-800 text-xs font-semibold mr-2 mb-2 px-2.5 py-0.5 rounded-full cursor-pointer">
                                <Lucide icon="Tag" className="w-4 h-4 inline-block" />
                                <span className="ml-1">{item.tags.length}</span>
                              </span>
                            </Tippy>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      );
    })}
  </div>
</DragDropContext>
{isAddOpportunityModalOpen && (
        <AddOpportunityModal contacts={contacts} onClose={() => setIsAddOpportunityModalOpen(false)} onSave={handleSaveSelectedContacts} />
      )}
{isModalOpen2 && selectedItem && selectedItemPipelineId && (
  <div className="fixed top-0 left-0 z-50 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white p-8 rounded-lg shadow-md">
      <EditItemModal
        pipelineId={selectedItemPipelineId}
        item={selectedItem}
        onClose={() => setIsModalOpen2(false)}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />
    </div>
  </div>
)}

      {isModalOpen && (
        <div className="fixed top-0 left-0 z-50 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-md">
          <ModalContent pipelines={Object.values(columns)} onClose={() => setIsModalOpen(false)} onSave={handleSaveModal} selectedEmployeeEmail={selectedEmployeeEmail} />
          </div>
        </div>
      )}
    </div>
  );
}


interface ModalContentProps {
  pipelines: Column[];
  onClose: () => void;
  onSave: (columns: Column[] | Column) => void;
  selectedEmployeeEmail: string | null; // Added prop for selected employee email
}

function ModalContent({ pipelines, onClose, onSave, selectedEmployeeEmail }: ModalContentProps) {
  const [pipelineList, setPipelineList] = useState<Column[]>(pipelines);

  const handlePipelineNameChange = (id: string, name: string) => {
    setPipelineList(pipelineList.map(pipeline =>
      pipeline.id === id ? { ...pipeline, name } : pipeline
    ));
  };

  const handleSavePipelines = async () => {
    const email = selectedEmployeeEmail;
    if (!email) return;
  
    // Update state
    onSave(pipelineList);
  
    // Update Firestore
    for (const pipeline of pipelineList) {
      const pipelineDocRef = doc(firestore, `user/${email}/pipeline/${pipeline.id}`);
      await setDoc(pipelineDocRef, { name: pipeline.name, sort: pipeline.sort });
    }
  
    onClose();
  };

  const handleAddPipeline = () => {
    const newPipelineId = `newPipeline${pipelineList.length + 1}`;
    const newPipeline: Column = {
      id: newPipelineId,
      name: '',
      sort: pipelineList.length + 1,
      items: []
    };
    setPipelineList([...pipelineList, newPipeline]);
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    const updatedPipelines = pipelineList.filter(pipeline => pipeline.id !== pipelineId);
    updatedPipelines.forEach((pipeline, index) => {
      pipeline.sort = index + 1;
    });
    setPipelineList(updatedPipelines);
  
    const email = selectedEmployeeEmail;
    if (!email) return;
  
    const pipelineDocRef = doc(firestore, `user/${email}/pipeline/${pipelineId}`);
    await deleteDoc(pipelineDocRef);
  };

  const movePipeline = async (pipelineId: string, direction: 'up' | 'down') => {
    const index = pipelineList.findIndex(pipeline => pipeline.id === pipelineId);
    if (index === -1) return;
  
    const newPipelines = [...pipelineList];
    const [pipeline] = newPipelines.splice(index, 1);
  
    if (direction === 'up' && index > 0) {
      newPipelines.splice(index - 1, 0, pipeline);
    } else if (direction === 'down' && index < newPipelines.length - 1) {
      newPipelines.splice(index + 1, 0, pipeline);
    }
  
    newPipelines.forEach((pipeline, i) => (pipeline.sort = i + 1));
    setPipelineList(newPipelines);
  
    const email = selectedEmployeeEmail;
    if (!email) return;
  
    for (const updatedPipeline of newPipelines) {
      const pipelineDocRef = doc(firestore, `user/${email}/pipeline/${updatedPipeline.id}`);
      await updateDoc(pipelineDocRef, { sort: updatedPipeline.sort });
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 w-96">
      <h2 className="text-xl font-bold mb-4">Edit Pipelines</h2>
      <ul className="space-y-2">
        {pipelineList.sort((a, b) => a.sort - b.sort).map((pipeline) => (
          <li key={pipeline.id} className="flex justify-between items-center py-2 bg-gray-100 rounded-lg px-4">
            <div className="flex items-center space-x-2">
              <button
                className="text-blue-500 hover:text-blue-700"
                onClick={() => movePipeline(pipeline.id, 'up')}
              >
                <Lucide icon="ArrowUp" className="w-5 h-5" />
              </button>
              <button
                className="text-blue-500 hover:text-blue-700"
                onClick={() => movePipeline(pipeline.id, 'down')}
              >
                <Lucide icon="ArrowDown" className="w-5 h-5" />
              </button>
              <input
                type="text"
                className="w-full border-none bg-transparent focus:ring-0"
                value={pipeline.name}
                onChange={(e) => handlePipelineNameChange(pipeline.id, e.target.value)}
              />
            </div>
            <button className="text-red-500 hover:text-red-700" onClick={() => handleDeletePipeline(pipeline.id)}>
              <Lucide icon="Trash" className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="outline-secondary" className="px-4 py-2 mt-4" onClick={handleAddPipeline}>
        Add Pipeline
      </Button>
      <div className="flex justify-between mt-4">
        <Button variant="outline-secondary" className="px-4 py-2" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" className="px-4 py-2 text-white" onClick={handleSavePipelines}>
          Save
        </Button>
      </div>
    </div>
  );
}
interface EditItemModalProps {
  pipelineId: string;
  item: Item;
  onClose: () => void;
  onSave: (pipelineId: string, updatedItem: Item) => void;
  onDelete: (pipelineId: string, itemId: string) => void;
}

function EditItemModal({ pipelineId, item, onClose, onSave, onDelete }: EditItemModalProps) {
  const [updatedItem, setUpdatedItem] = useState({ ...item, notes: item.notes || '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpdatedItem({ ...updatedItem, [name]: value });
  };

  const handleSave = () => {
    onSave(pipelineId, updatedItem);
    onClose();
  };

  const handleDelete = () => {
    onDelete(pipelineId, item.id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10">
          <div className="flex items-center p-4 border-b">
            <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
              {updatedItem.chat_pic_full ? (
                <img
                  src={updatedItem.chat_pic_full}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                updatedItem.firstName ? updatedItem.firstName.charAt(0).toUpperCase() : "?"
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-800">{updatedItem?.firstName} {updatedItem?.lastName}</div>
              <div className="text-sm text-gray-600">{updatedItem?.phone}</div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="firstName"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={updatedItem.firstName || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                name="phone"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={updatedItem.phone || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                name="companyName"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={updatedItem.companyName || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <input
                type="text"
                name="notes"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                value={updatedItem.notes}
                onChange={handleChange}
                placeholder="Notes"
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 mr-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

interface AddOpportunityModalProps {
  contacts: any[];
  onClose: () => void;
  onSave: (selectedContacts: any[]) => void;
}
function AddOpportunityModal({ contacts, onClose, onSave }: AddOpportunityModalProps) {
  const [selectedContacts, setSelectedContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredContacts, setFilteredContacts] = useState<any[]>(contacts);

  useEffect(() => {
    console.log('Initial Contacts:', contacts);
    setFilteredContacts(
      contacts.filter(contact =>
        contact.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    console.log('Filtered Contacts after useEffect:', filteredContacts);
  }, [searchTerm, contacts]);

  const handleContactSelect = (contact: any) => {
    setSelectedContacts(prev => {
      if (prev.includes(contact)) {
        return prev.filter(c => c !== contact);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleSave = () => {
    onSave(selectedContacts);
    onClose();
  };

  console.log('Search Term:', searchTerm);
  console.log('Filtered Contacts:', filteredContacts);

  return (
    <Dialog open onClose={onClose}>
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Select Contacts</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <Lucide icon="X" className="w-6 h-6" />
          </button>
        </div>
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 mb-4 border rounded-md"
        />
        <div className="mt-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact, index) => (
              <div
                key={contact.id || `${contact.phone}-${index}`}
                className="flex items-center p-2 border-b border-gray-200 hover:bg-gray-100"
              >
                <input
                  type="checkbox"
                  className="mr-3"
                  checked={selectedContacts.includes(contact)}
                  onChange={() => handleContactSelect(contact)}
                />
                <div className="flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-300 rounded-full mr-3 text-white">
                    {contact.chat_pic_full ? (
                      <img
                        src={contact.chat_pic_full}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      contact.contactName ? contact.contactName.charAt(0).toUpperCase() : "?"
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="font-semibold capitalize">{contact.contactName || contact.firstName || contact.phone}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No contacts found</p>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700">
            Save
          </button>
        </div>
      </Dialog.Panel>
    </div>
  </Dialog>
  );
}

export default LoadingPage;


