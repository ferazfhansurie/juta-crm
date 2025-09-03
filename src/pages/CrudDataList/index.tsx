import _ from "lodash";
import clsx from "clsx";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { Dialog, Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  increment,
  deleteField,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { rateLimiter } from "../../utils/rate";
import { useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LZString from "lz-string";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, compareAsc, parseISO } from "date-fns";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import ReactPaginate from "react-paginate";
import { Tab } from "@headlessui/react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import type { DropResult } from "@hello-pangea/dnd";

const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL:
    "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function Main() {
  interface Contact {
    company: string;
    name: any;
    contact_id: any;
    threadid?: string | null;
    assistantId?: string | null;
    additionalEmails?: string[] | null;
    address1?: string | null;
    assignedTo?: string | null;
    businessId?: string | null;
    city?: string | null;
    companyName?: string | null;
    contactName?: string | null;
    firstName?: string | null;
    country?: string | null;
    dateAdded?: string | null;
    dateOfBirth?: string | null;
    dateUpdated?: string | null;
    dnd?: boolean | null;
    dndSettings?: any | null;
    email?: string | null;
    followers?: string[] | null;
    id?: string | null;
    lastName?: string | null;
    locationId?: string | null;
    phone?: string | null;
    postalCode?: string | null;
    source?: string | null;
    state?: string | null;
    tags?: string[] | null;
    type?: string | null;
    website?: string | null;
    chat_pic_full?: string | null;
    profileUrl?: string | null;
    chat_id?: string | null;
    points?: number | null;
    phoneIndex?: number | null;
    branch?: string | null;
    expiryDate?: string | null;
    vehicleNumber?: string | null;
    ic?: string | null;
    createdAt?: string | null;
    nationality?: string | null;
    highestEducation?: string | null;
    programOfStudy?: string | null;
    intakePreference?: string | null;
    englishProficiency?: string | null;
    passport?: string | null;
    importedTags?: string[] | null;
    customFields?: { [key: string]: string };
    notes?: string | null;
    leadNumber?: string | null;
    company_id?: string | null;
    profile?: any | null;
    reaction?: string | null;
    reaction_timestamp?: string | null;
    last_updated?: string | null;
    edited?: boolean | null;
    edited_at?: string | null;
    whapi_token?: string | null;
    additional_emails?: string[] | null;
    assigned_to?: string | null;
    business_id?: string | null;
    chat_data?: any | null;
    is_group?: boolean | null;
    unread_count?: number | null;
    last_message?: any | null;
    multi_assign?: boolean | null;
    not_spam?: boolean | null;
    profile_pic_url?: string | null;
    pinned?: boolean | null;
    customer_message?: any | null;
    storage_requirements?: string | null;
    form_submission?: string | null;
    phone_indexes?: string[] | null;
    personal_id?: string | null;
    last_name?: string | null;
    updated_at?: string | null;
    location_id?: string | null;
    vehicle_number?: string | null;
  }

  interface Employee {
    id: string;
    name: string;
    role: string;
    phoneNumber: string;
    phoneIndex: number;
    employeeId: string;
    assignedContacts: number;
    quotaLeads: number;
  }
  interface Tag {
    id: string;
    name: string;
  }
  interface TagsState {
    [key: string]: string[];
  }

  interface ScheduledMessage {
    scheduleId?: string;
    contactIds?: string[];
    multiple?: boolean;
    id?: string;
    chatIds: string[];
    message: string;
    contactId: string;
    messageContent: string;
    messages?: Array<{
      [x: string]: string | boolean; // Changed to allow boolean values for isMain
      text: string;
    }>;
    messageDelays?: number[];
    mediaUrl?: string;
    documentUrl?: string;
    mimeType?: string;
    fileName?: string;
    scheduledTime: string;

    batchQuantity: number;
    repeatInterval: number;
    repeatUnit: "minutes" | "hours" | "days";
    additionalInfo: {
      contactName?: string;
      phone?: string;
      email?: string;
      // ... any other contact fields you want to include
    };
    status: "scheduled" | "sent" | "failed";
    createdAt: Timestamp;
    sentAt?: Timestamp;
    error?: string;
    count?: number;
    v2?: boolean;
    whapiToken?: string;
    minDelay: number;
    maxDelay: number;
    activateSleep: boolean;
    sleepAfterMessages: number | null;
    sleepDuration: number | null;
    activeHours: {
      start: string;
      end: string;
    };
    infiniteLoop: boolean;
    numberOfBatches: number;
    processedMessages?: {
      chatId: string;
      message: string;
      contactData?: {
        contactName: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        vehicleNumber: string;
        branch: string;
        expiryDate: string;
        ic: string;
        customFields?: { [key: string]: string };
      };
    }[];
    templateData?: {
      hasPlaceholders: boolean;
      placeholdersUsed: string[];
    };
    isConsolidated?: boolean; // Added to indicate the new message structure
  }
  interface Message {
    text: string;
    delayAfter: number;
  }

  type ColumnConfig = {
    id: string;
    label: string;
    sortKey?: string;
  };

  interface Phone {
    phoneIndex: number;
    status: string;
    qrCode: string | null;
    phoneInfo: string;
  }

  interface QRCodeData {
    phoneIndex: number;
    status: string;
    qrCode: string | null;
  }

  interface BotStatusResponse {
    qrCode: string | null;
    status: string;
    phoneInfo: boolean;
    phones: Phone[];
    companyId: string;
    v2: boolean;
    trialEndDate: string | null;
    apiUrl: string | null;
    phoneCount: number;
  }

  const DatePickerComponent = DatePicker as any;

  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
  const [editContactModal, setEditContactModal] = useState(false);
  const [viewContactModal, setViewContactModal] = useState(false);
  const deleteButtonRef = useRef(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isFetching, setFetching] = useState<boolean>(false);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [addContactModal, setAddContactModal] = useState(false);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [showDeleteTagModal, setShowDeleteTagModal] = useState(false);
  const [selectedImportTags, setSelectedImportTags] = useState<string[]>([]);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [tags, setTags] = useState<TagsState>({});
  const [blastMessageModal, setBlastMessageModal] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [progress, setProgress] = useState<number>(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const contactsPerPage = 200;
  const contactListRef = useRef<HTMLDivElement>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [totalContacts, setTotalContacts] = useState(contacts.length);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null
  );
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [dateFilterField, setDateFilterField] = useState<string>("createdAt"); // Changed default to createdAt
  const [dateFilterStart, setDateFilterStart] = useState<string>("");
  const [dateFilterEnd, setDateFilterEnd] = useState<string>("");
  const [activeDateFilter, setActiveDateFilter] = useState<{
    field: string;
    start: string;
    end: string;
  } | null>(null);
  const [exportModalContent, setExportModalContent] =
    useState<React.ReactNode | null>(null);
  const [exportSelectedTags, setExportSelectedTags] = useState<string[]>([]);
  const [focusedMessageIndex, setFocusedMessageIndex] = useState<number>(0);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [selectedScheduledMessages, setSelectedScheduledMessages] = useState<
    string[]
  >([]);

  const [newContact, setNewContact] = useState({
    contactName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    companyName: "",
    locationId: "",
    branch: "",
    expiryDate: "",
    vehicleNumber: "",
    ic: "",
    notes: "", // Add this line
  });
  const [total, setTotal] = useState(0);
  const [fetched, setFetched] = useState(0);
  const [allContactsLoaded, setAllContactsLoaded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [blastStartTime, setBlastStartTime] = useState<Date | null>(null);
  const [blastStartDate, setBlastStartDate] = useState<Date>(new Date());
  const [batchQuantity, setBatchQuantity] = useState<number>(10);
  const [repeatInterval, setRepeatInterval] = useState<number>(0);
  const [repeatUnit, setRepeatUnit] = useState<"minutes" | "hours" | "days">(
    "days"
  );
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [showSyncConfirmationModal, setShowSyncConfirmationModal] =
    useState(false);
  const [showSyncNamesConfirmationModal, setShowSyncNamesConfirmationModal] =
    useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<
    ScheduledMessage[]
  >([]);
  const [editScheduledMessageModal, setEditScheduledMessageModal] =
    useState(false);
  const [currentScheduledMessage, setCurrentScheduledMessage] =
    useState<ScheduledMessage | null>(null);
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editDocumentFile, setEditDocumentFile] = useState<File | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stopbot, setStopbot] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 50;
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [showMassDeleteModal, setShowMassDeleteModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  const [showManageTagsModal, setShowManageTagsModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSyncOptionsModal, setShowSyncOptionsModal] = useState(false);

  // Accordion menu states
  const [showAssignUserMenu, setShowAssignUserMenu] = useState(false);
  const [showAddTagMenu, setShowAddTagMenu] = useState(false);
  const [showRemoveTagMenu, setShowRemoveTagMenu] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTagSelection, setShowTagSelection] = useState(false);
  const [showManageTagsMenu, setShowManageTagsMenu] = useState(false);

  const [isMassDeleting, setIsMassDeleting] = useState(false);
  const [userFilter, setUserFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"tags" | "users">("tags");
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [selectedUserFilters, setSelectedUserFilters] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState("tags");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<any>(null);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [phoneIndex, setPhoneIndex] = useState<number | null>(null);
  const [phoneOptions, setPhoneOptions] = useState<number[]>([]);
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [selectedPhoneIndex, setSelectedPhoneIndex] = useState<number | null>(
    null
  );
  const [showRecipients, setShowRecipients] = useState<string | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [minDelay, setMinDelay] = useState(1);
  const [maxDelay, setMaxDelay] = useState(2);
  const [activateSleep, setActivateSleep] = useState(false);
  const [sleepAfterMessages, setSleepAfterMessages] = useState(20);
  const [sleepDuration, setSleepDuration] = useState(5);
  const [activeTimeStart, setActiveTimeStart] = useState("09:00");
  const [activeTimeEnd, setActiveTimeEnd] = useState("17:00");
  const [messages, setMessages] = useState<Message[]>([
    { text: "", delayAfter: 0 },
  ]);
  const employeeListRef = useRef<Employee[]>([]);
  const [messageStatusFilter, setMessageStatusFilter] = useState("");
  const [messageDateFilter, setMessageDateFilter] = useState("");
  const [messageTypeFilter, setMessageTypeFilter] = useState("");
  const [messageRecipientFilter, setMessageRecipientFilter] = useState("");
  const [infiniteLoop, setInfiniteLoop] = useState(false);
  const [showScheduledMessages, setShowScheduledMessages] =
    useState<boolean>(false);
  const [scheduledMessagesModal, setScheduledMessagesModal] = useState(false);
  const [selectedMessageForView, setSelectedMessageForView] =
    useState<any>(null);
  const [viewMessageDetailsModal, setViewMessageDetailsModal] = useState(false);
  const defaultVisibleColumns = {
    checkbox: true,
    contact: true,
    phone: true,
    tags: true,
    ic: true,
    expiryDate: true,
    vehicleNumber: true,
    branch: true,
    notes: true,
    createdAt: true,
    actions: true,
  };

  const defaultColumnOrder = [
    "checkbox",
    "contact",
    "phone",
    "tags",
    "ic",
    "expiryDate",
    "vehicleNumber",
    "branch",
    "notes",
    "createdAt",
    "actions",
  ];

  const [visibleColumns, setVisibleColumns] = useState<{
    [key: string]: boolean;
  }>(() => {
    const saved = localStorage.getItem("contactsVisibleColumns");
    if (saved) {
      const parsedColumns = JSON.parse(saved);
      // Ensure essential columns are always visible
      return {
        ...parsedColumns,
        checkbox: true,
        contact: true,
        phone: true,
        vehicleNumber: true, // Ensure vehicle number column is always visible
        branch: true, // Ensure branch column is always visible
        actions: true,
      };
    }
    return {
      ...defaultVisibleColumns,
      ...(contacts[0]?.customFields
        ? Object.keys(contacts[0].customFields).reduce(
            (acc, field) => ({
              ...acc,
              [`customField_${field}`]: true,
            }),
            {}
          )
        : {}),
    };
  });

  const baseUrl = "https://juta-dev.ngrok.dev";

  // Add this useEffect to save visible columns when they change
  useEffect(() => {
    localStorage.setItem(
      "contactsVisibleColumns",
      JSON.stringify(visibleColumns)
    );
  }, [visibleColumns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("contactsColumnOrder");
    if (saved) {
      const parsedOrder = JSON.parse(saved);
      // Ensure all default columns are included
      const missingColumns = defaultColumnOrder.filter(
        (col) => !parsedOrder.includes(col)
      );
      return [...parsedOrder, ...missingColumns];
    }
    return [
      ...defaultColumnOrder,
      ...Object.keys(contacts[0]?.customFields || {}).map(
        (field) => `customField_${field}`
      ),
    ];
  });

  // Add a useEffect to ensure columns stay visible after data updates
  useEffect(() => {
    setVisibleColumns((prev) => ({
      ...defaultVisibleColumns,
      ...prev,
      vehicleNumber: true, // Ensure vehicle number column is always visible
      branch: true, // Ensure branch column is always visible
    }));
  }, []);

  // Add this handler function
  const handleColumnReorder = (result: DropResult) => {
    if (!result.destination) return;

    const newColumnOrder = Array.from(columnOrder);
    const [reorderedItem] = newColumnOrder.splice(result.source.index, 1);
    newColumnOrder.splice(result.destination.index, 0, reorderedItem);

    setColumnOrder(newColumnOrder);
    localStorage.setItem("contactsColumnOrder", JSON.stringify(newColumnOrder));
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, "user", user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          setCompanyId(userData.companyId);

          fetchPhoneIndex(userData.companyId);
        }
      }
    };

    fetchUserData();
  }, []);

  // Additional useEffect to fetch phone names as early as possible
  useEffect(() => {
    const fetchPhoneNamesEarly = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (userEmail && Object.keys(phoneNames).length === 0) {
        try {
          const response = await fetch(
            `${baseUrl}/api/user-page-context?email=${encodeURIComponent(
              userEmail
            )}`
          );

          if (response.ok) {
            const data = await response.json();

            if (data.phoneNames && typeof data.phoneNames === "object") {
              console.log(
                "Setting phone names early from user-page-context:",
                data.phoneNames
              );
              setPhoneNames(data.phoneNames);
              setPhoneOptions(Object.keys(data.phoneNames).map(Number));
            }
          }
        } catch (error) {
          console.error("Error fetching phone names early:", error);
        }
      }
    };

    fetchPhoneNamesEarly();
  }, [phoneNames]);

  const fetchPhoneIndex = async (companyId: string) => {
    try {
      // Get current user email for API call
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return;
      }

      // Use the same API endpoint as Chat component to get phone names
      const response = await fetch(
        `${baseUrl}/api/user-page-context?email=${encodeURIComponent(
          userEmail
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user context");
      }

      const data = await response.json();

      // Set phone names from the API response
      if (data.phoneNames && typeof data.phoneNames === "object") {
        console.log(
          "Setting phone names from user-page-context:",
          data.phoneNames
        );
        setPhoneNames(data.phoneNames);
        setPhoneOptions(Object.keys(data.phoneNames).map(Number));
      } else {
        // Fallback: create default phone names based on phone count
        const phoneCount = data.companyData?.phoneCount || 0;
        console.log(
          "Creating default phone names for phone count:",
          phoneCount
        );
        const defaultPhoneNames: { [key: number]: string } = {};
        for (let i = 0; i < phoneCount; i++) {
          defaultPhoneNames[i] = `Phone ${i + 1}`;
        }
        setPhoneNames(defaultPhoneNames);
        setPhoneOptions(Object.keys(defaultPhoneNames).map(Number));
      }
    } catch (error) {
      console.error(
        "Error fetching phone names from user-page-context:",
        error
      );

      // Fallback: try to get phone count from bot status API
      try {
        const botStatusResponse = await axios.get(
          `${baseUrl}/api/bot-status/${companyId}`
        );

        if (botStatusResponse.status === 200) {
          const botData = botStatusResponse.data;
          const phoneCount = botData.phoneCount || 0;

          // Create default phone names based on phone count
          const defaultPhoneNames: { [key: number]: string } = {};
          for (let i = 0; i < phoneCount; i++) {
            defaultPhoneNames[i] = `Phone ${i + 1}`;
          }
          setPhoneNames(defaultPhoneNames);
          setPhoneOptions(Object.keys(defaultPhoneNames).map(Number));
        } else {
          // Final fallback: set empty phone names
          setPhoneOptions([]);
          setPhoneNames({});
        }
      } catch (fallbackError) {
        console.error(
          "Error fetching phone names from bot status API:",
          fallbackError
        );
        setPhoneOptions([]);
        setPhoneNames({});
      }
    }
  };

  // Add this sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // If clicking a new field, set it with ascending direction
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const toggleScheduledMessageSelection = (messageId: string) => {
    setSelectedScheduledMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };
  useEffect(() => {
    if (showAssignUserModal) {
      console.log("Modal opened - employeeList:", employeeList);
      console.log("Modal opened - employeeList length:", employeeList.length);
    }
  }, [showAssignUserModal, employeeList]);
  useEffect(() => {
    if (showAssignUserModal) {
      console.log("Modal opened - employeeList:", employeeList);
      console.log("Modal opened - employeeList length:", employeeList.length);
    }
  }, [showAssignUserModal, employeeList]);
  // Add this near your other useEffect hooks

  useEffect(() => {
    // Ensure employee names are properly stored when fetched
    const normalizedEmployeeNames = employeeList.map((employee) =>
      employee.name.toLowerCase()
    );
    setEmployeeNames(normalizedEmployeeNames);
  }, [employeeList]);

  useEffect(() => {
    if (employeeList.length > 0) {
      employeeListRef.current = [...employeeList];
      console.log(
        "Updated employeeListRef with:",
        employeeListRef.current.length,
        "employees"
      );
    }
  }, [employeeList]);
  const handleDeleteSelected = async () => {
    if (selectedScheduledMessages.length === 0) {
      toast.error("Please select messages to delete");
      return;
    }

    try {
      // Delete all selected messages
      await Promise.all(
        selectedScheduledMessages.map((messageId) =>
          handleDeleteScheduledMessage(messageId)
        )
      );

      setSelectedScheduledMessages([]); // Clear selection after deletion
      toast.success(
        `Successfully deleted ${selectedScheduledMessages.length} messages`
      );
    } catch (error) {
      console.error("Error deleting selected messages:", error);
      toast.error("Failed to delete some messages");
    }
  };
  const handleSendSelectedNow = async () => {
    if (selectedScheduledMessages.length === 0) {
      toast.error("Please select messages to send");
      return;
    }

    try {
      const selectedMessages = scheduledMessages.filter((msg) =>
        selectedScheduledMessages.includes(msg.id!)
      );

      for (const message of selectedMessages) {
        await handleSendNow(message);
      }

      setSelectedScheduledMessages([]); // Clear selection after sending
      toast.success(`Successfully sent ${selectedMessages.length} messages`);
    } catch (error) {
      console.error("Error sending selected messages:", error);
      toast.error("Failed to send some messages");
    }
  };
  const getDisplayedContacts = () => {
    if (!sortField) return currentContacts;

    return [...currentContacts].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];

      // Handle special cases
      if (sortField === "tags") {
        // Sort by first tag, or empty string if no tags
        aValue = a.tags?.[0] || "";
        bValue = b.tags?.[0] || "";
      } else if (
        sortField === "createdAt" ||
        sortField === "dateAdded" ||
        sortField === "dateUpdated" ||
        sortField === "expiryDate"
      ) {
        // Sort chronologically for date fields
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      } else if (sortField.startsWith("customField_")) {
        const fieldName = sortField.replace("customField_", "");
        aValue = a.customFields?.[fieldName] || "";
        bValue = b.customFields?.[fieldName] || "";
      }

      // Convert to strings for comparison (except for points and dates which are handled above)
      if (
        sortField !== "createdAt" &&
        sortField !== "dateAdded" &&
        sortField !== "dateUpdated" &&
        sortField !== "expiryDate"
      ) {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0; // Fallback return for points and date sorting
    });
  };

  const resetSort = () => {
    setSortField(null);
    setSortDirection("asc");
  };

  const filterContactsByUserRole = (
    contacts: Contact[],
    userRole: string,
    userName: string
  ) => {
    switch (userRole) {
      case "1":
        return contacts; // Admin sees all contacts
      case "admin": // Admin
        return contacts; // Admin sees all contacts
      case "user": // Admin
        return contacts.filter((contact) =>
          contact.tags?.some(
            (tag) => tag.toLowerCase() === userName.toLowerCase()
          )
        );
      case "2":
        // Sales sees only contacts assigned to them
        return contacts.filter((contact) =>
          contact.tags?.some(
            (tag) => tag.toLowerCase() === userName.toLowerCase()
          )
        );
      case "3":
        // Observer sees only contacts assigned to them
        return contacts.filter((contact) =>
          contact.tags?.some(
            (tag) => tag.toLowerCase() === userName.toLowerCase()
          )
        );
      case "4":
        // Manager sees only contacts assigned to them
        return contacts.filter((contact) =>
          contact.tags?.some(
            (tag) => tag.toLowerCase() === userName.toLowerCase()
          )
        );
      case "5":
        return contacts;
      default:
        return [];
    }
  };
  const handleRemoveTagsFromContact = async (
    contact: Contact,
    tagsToRemove: string[]
  ) => {
    if (userRole === "3") {
      toast.error("You don't have permission to remove tags.");
      return;
    }

    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }

      // Fetch user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData?.company_id;
      if (!companyId) {
        toast.error("Company ID not found!");
        return;
      }

      // Remove tags from contact via SQL backend
      const response = await axios.post(`${baseUrl}/api/contacts/remove-tags`, {
        companyId,
        contact_id: contact.contact_id,
        tagsToRemove,
      });

      if (response.data.success) {
        // Update local state
        setContacts((prevContacts) =>
          prevContacts.map((c) =>
            c.contact_id === contact.contact_id
              ? { ...c, tags: response.data.updatedTags }
              : c
          )
        );
        toast.success("Tags removed successfully!");
        await fetchContacts();
      } else {
        toast.error(response.data.message || "Failed to remove tags.");
      }
    } catch (error) {
      console.error("Error removing tags:", error);
      toast.error("Failed to remove tags.");
    }
  };

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }

      // Get user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;
      const userRole = userData.role;
      const userName = userData.name;

      // Fetch contacts from SQL database
      const contactsResponse = await fetch(
        `${baseUrl}/api/companies/${companyId}/contacts?email=${userEmail}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!contactsResponse.ok) {
        toast.error("Failed to fetch contacts");
        return;
      }

      const data = await contactsResponse.json();

      // Debug: Log multiple contacts to see what fields are available
      if (data.contacts && data.contacts.length > 0) {
        console.log("Total contacts fetched:", data.contacts.length);

        // Search for specific contact with phone 60103089696
        const targetContact = data.contacts.find(
          (contact: any) =>
            contact.phone === "+60103089696" ||
            contact.phone === "60103089696" ||
            contact.phone === "+60 10-308 9696" ||
            contact.phone?.includes("60103089696")
        );

        if (targetContact) {
          console.log("=== FOUND TARGET CONTACT ===");
          console.log("Target contact:", targetContact);
          console.log("Target contact fields:", Object.keys(targetContact));
          console.log(
            "Target contact custom fields:",
            targetContact.customFields
          );
          console.log("Target contact branch:", targetContact.branch);
          console.log(
            "Target contact vehicleNumber:",
            targetContact.vehicleNumber
          );
          console.log("Target contact ic:", targetContact.ic);
          console.log("Target contact expiryDate:", targetContact.expiryDate);
          console.log("Target contact leadNumber:", targetContact.leadNumber);
          console.log("Target contact phoneIndex:", targetContact.phoneIndex);
          console.log("=== END TARGET CONTACT ===");
        } else {
          console.log(
            "Contact with phone 60103089696 not found in current batch"
          );
          // Log all phone numbers to see what we have
          console.log(
            "Available phone numbers:",
            data.contacts.map((c: any) => c.phone).slice(0, 10)
          );
        }
      }

      const fetchedContacts = data.contacts.map((contact: any) => {
        // Filter out empty tags
        if (contact.tags) {
          contact.tags = contact.tags.filter(
            (tag: any) =>
              typeof tag === "string" &&
              tag.trim() !== "" &&
              tag !== null &&
              tag !== undefined
          );
        }

        // Map SQL fields to match your Contact interface
        return {
          ...contact,
          id: contact.id,
          chat_id: contact.chat_id,
          contactName: contact.name,
          phone: contact.phone,
          email: contact.email,
          profile: contact.profile,
          tags: contact.tags,
          createdAt: contact.createdAt,
          lastUpdated: contact.lastUpdated,
          last_message: contact.last_message,
          isIndividual: contact.isIndividual,
          // Try to extract data from profile JSON if it exists
          ...(contact.profile && typeof contact.profile === "string"
            ? (() => {
                try {
                  const profileData = JSON.parse(contact.profile);
                  return {
                    branch: contact.branch || profileData.branch,
                    vehicleNumber:
                      contact.vehicleNumber ||
                      contact.vehicle_number ||
                      profileData.vehicleNumber,
                    ic: contact.ic || profileData.ic,
                    expiryDate:
                      contact.expiryDate ||
                      contact.expiry_date ||
                      profileData.expiryDate,
                  };
                } catch (e) {
                  return {};
                }
              })()
            : {}),
          // Map fields with multiple possible names and custom fields
          branch:
            contact.branch ||
            contact.customFields?.branch ||
            contact.customFields?.["BRANCH"],
          vehicleNumber:
            contact.vehicleNumber ||
            contact.vehicle_number ||
            contact.customFields?.["VEH. NO."] ||
            contact.customFields?.vehicleNumber ||
            contact.customFields?.["VEHICLE NUMBER"],
          ic:
            contact.ic ||
            contact.customFields?.ic ||
            contact.customFields?.["IC"],
          expiryDate:
            contact.expiryDate ||
            contact.expiry_date ||
            contact.customFields?.expiryDate ||
            contact.customFields?.["EXPIRY DATE"],

          phoneIndex: contact.phoneIndex || contact.phone_index,
          leadNumber:
            contact.leadNumber ||
            contact.lead_number ||
            contact.customFields?.["LEAD NUMBER"],
          notes: contact.notes,
          customFields: contact.customFields || {},
        } as Contact;
      });
      console.log(fetchedContacts);

      // Function to check if a chat_id is for an individual contact
      const isIndividual = (chat_id: string | undefined) => {
        return chat_id?.endsWith("@c.us") || false;
      };

      // Separate contacts into categories
      const individuals = fetchedContacts.filter((contact: { chat_id: any }) =>
        isIndividual(contact.chat_id || "")
      );
      const groups = fetchedContacts.filter(
        (contact: { chat_id: any }) => !isIndividual(contact.chat_id || "")
      );

      // Combine all contacts in the desired order
      const allSortedContacts = [...individuals, ...groups];

      // Helper function to get timestamp value
      const getTimestamp = (createdAt: any): number => {
        if (!createdAt) return 0;
        if (typeof createdAt === "string") {
          return new Date(createdAt).getTime();
        }
        if (createdAt.seconds) {
          return (
            createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1000000
          );
        }
        return 0;
      };

      // Sort contacts based on createdAt
      allSortedContacts.sort((a, b) => {
        const dateA = getTimestamp(a.createdAt);
        const dateB = getTimestamp(b.createdAt);
        return dateB - dateA; // For descending order
      });

      const filteredContacts = filterContactsByUserRole(
        allSortedContacts,
        userRole,
        userName
      );

      setContacts(filteredContacts);
      setFilteredContacts(filteredContacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to fetch contacts");
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        contactListRef.current &&
        contactListRef.current.scrollTop +
          contactListRef.current.clientHeight >=
          contactListRef.current.scrollHeight
      ) {
      }
    };

    if (contactListRef.current) {
      contactListRef.current.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (contactListRef.current) {
        contactListRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [filteredContacts]);
  useEffect(() => {}, [selectedTags]);

  const handleExportContacts = () => {
    if (userRole === "2" || userRole === "3") {
      toast.error("You don't have permission to export contacts.");
      return;
    }

    const exportOptions = [
      { id: "selected", label: "Export Selected Contacts" },
      { id: "tagged", label: "Export Contacts by Tag" },
    ];

    // Open export modal; rendering centralized in MODALS SECTION
    if (userRole === "1") {
      setExportModalOpen(true);
      setExportModalContent("options");
    }
  };

  const handleExportOption = (option: string) => {
    setExportModalOpen(false);

    if (option === "selected") {
      if (selectedContacts.length === 0) {
        toast.error("No contacts selected. Please select contacts to export.");
        return;
      }
      exportContactsToCSV(selectedContacts);
    } else if (option === "tagged") {
      showTagSelectionModal();
    }
  };

  const showTagSelectionModal = () => {
    setExportSelectedTags(selectedTags);
    setExportModalContent("tag-select");
    setExportModalOpen(true);
  };

  const exportContactsByTags = (currentSelectedTags: string[]) => {
    if (currentSelectedTags.length === 0) {
      toast.error("No tags selected. Please select at least one tag.");
      return;
    }

    const contactsToExport = contacts.filter(
      (contact) =>
        contact.tags &&
        contact.tags.some((tag) => currentSelectedTags.includes(tag))
    );

    if (contactsToExport.length === 0) {
      toast.error("No contacts found with the selected tags.");
      return;
    }

    exportContactsToCSV(contactsToExport);
    setExportModalOpen(false);
    setSelectedTags(currentSelectedTags);
  };

  const exportContactsToCSV = (contactsToExport: Contact[]) => {
    const csvData = contactsToExport.map((contact) => ({
      contactName: contact.contactName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address: contact.address1 || "",
      company: contact.companyName || "",
      tags: (contact.tags || []).join(", "),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const fileName = `contacts_export_${new Date().toISOString()}.csv`;
    saveAs(blob, fileName);

    toast.success(`${contactsToExport.length} contacts exported successfully!`);
  };

  const handleTagSelection = (
    e: React.ChangeEvent<HTMLInputElement>,
    tagName: string
  ) => {
    try {
      const isChecked = e.target.checked;
      setSelectedTags((prevTags) => {
        if (isChecked) {
          return [...prevTags, tagName];
        } else {
          return prevTags.filter((tag) => tag !== tagName);
        }
      });
    } catch (error) {
      console.error("Error handling tag selection:", error);
      toast.error("An error occurred while selecting tags. Please try again.");
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSizeInMB = 20;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

      if (file.type.startsWith("video/") && file.size > maxSizeInBytes) {
        toast.error(
          "The video file is too big. Please select a file smaller than 20MB."
        );
        return;
      }

      try {
        setSelectedMedia(file);
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error("Upload unsuccessful. Please try again.");
      }
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDocument(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    try {
      const { companyId: cId, baseUrl: apiUrl } = await getCompanyData();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${apiUrl}/api/upload-media`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("File upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  let role = 1;
  let userName = "";

  useEffect(() => {
    setTotalContacts(contacts.length);
  }, [contacts]);

  const handleTagFilterChange = (tagName: string) => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagName)
        ? prev.filter((tag) => tag !== tagName)
        : [...prev, tagName]
    );
  };

  const handleExcludeTag = (tag: string) => {
    setExcludedTags((prev) => [...prev, tag]);
  };

  const handleRemoveExcludedTag = (tag: string) => {
    setExcludedTags((prev) => prev.filter((t) => t !== tag));
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // If the number starts with '0', replace it with '60'
    // Otherwise, ensure it starts with '60'
    const formattedNumber = digits.startsWith("0")
      ? `60${digits.slice(1)}`
      : digits.startsWith("60")
      ? digits
      : `60${digits}`;

    // Add the '+' at the beginning
    return `+${formattedNumber}`;
  };

  const handleSaveNewContact = async () => {
    if (userRole === "3") {
      toast.error("You don't have permission to add contacts.");
      return;
    }
    console.log(newContact);
    try {
      if (!newContact.phone) {
        toast.error("Phone number is required.");
        return;
      }

      // Format the phone number
      const formattedPhone = formatPhoneNumber(newContact.phone);

      // Get user/company info from localStorage or your app state
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }

      // Fetch user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData?.company_id;
      if (!companyId) {
        toast.error("Company ID not found!");
        return;
      }

      // Prepare the contact data
      // Generate contact_id as companyId + phone
      const contact_id = companyId + "-" + formattedPhone.split("+")[1];

      // Prepare the contact data
      const chat_id = formattedPhone.split("+")[1] + "@c.us";
      const contactData: { [key: string]: any } = {
        contact_id, // <-- include the generated contact_id
        companyId,
        contactName: newContact.contactName,
        name: newContact.contactName,
        last_name: newContact.lastName,
        email: newContact.email,
        phone: formattedPhone,
        address1: newContact.address1,
        companyName: newContact.companyName,
        locationId: newContact.locationId,
        dateAdded: new Date().toISOString(),
        unreadCount: 0,

        branch: newContact.branch,
        expiryDate: newContact.expiryDate,
        vehicleNumber: newContact.vehicleNumber,
        ic: newContact.ic,
        chat_id: chat_id,
        notes: newContact.notes,
      };
      // Send POST request to your SQL backend
      const response = await axios.post(`${baseUrl}/api/contacts`, contactData);

      if (response.data.success) {
        toast.success("Contact added successfully!");
        setAddContactModal(false);
        setContacts((prevContacts) => [
          ...prevContacts,
          contactData as Contact,
        ]);
        setNewContact({
          contactName: "",
          lastName: "",
          email: "",
          phone: "",
          address1: "",
          companyName: "",
          locationId: "",

          branch: "",
          expiryDate: "",
          vehicleNumber: "",
          ic: "",
          notes: "",
        });

        await fetchContacts();
      } else {
        toast.error(response.data.message || "Failed to add contact");
      }
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast.error(
        "An error occurred while adding the contact: " +
          (error.response?.data?.message || error.message)
      );
    }
  };
  const handleSaveNewTag = async () => {
    console.log("adding tag");
    try {
      // Get user email from localStorage or context
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("User not authenticated");
        return;
      }

      // Fetch user/company info from your backend
      const userResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!userResponse.ok) {
        toast.error("Failed to fetch user/company info");
        return;
      }
      const userJson = await userResponse.json();
      console.log(userJson);
      const companyData = userJson.companyData;
      const companyId = userJson.userData.companyId;
      if (!companyId) {
        toast.error("Company ID not found");
        return;
      }

      // Add tag via your SQL backend
      const response = await fetch(
        `${baseUrl}/api/companies/${companyId}/tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: newTag }),
        }
      );

      if (!response.ok) {
        toast.error("Failed to add tag");
        return;
      }

      const data = await response.json();
      // Assume the backend returns the new tag as { id, name }
      setTagList([...tagList, { id: data.id, name: data.name }]);

      setShowAddTagModal(false);
      setNewTag("");
      toast.success("Tag added successfully!");
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("An error occurred while adding the tag.");
    }
  };

  const handleConfirmDeleteTag = async () => {
    if (!tagToDelete) return;

    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        return;
      }

      const docUserRef = doc(firestore, "user", user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("No such document for user!");
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Delete the tag from the tags collection
      const tagRef = doc(
        firestore,
        `companies/${companyId}/tags`,
        tagToDelete.id
      );
      await deleteDoc(tagRef);

      // Remove the tag from all contacts
      const contactsRef = collection(
        firestore,
        `companies/${companyId}/contacts`
      );
      const contactsSnapshot = await getDocs(contactsRef);
      const batch = writeBatch(firestore);

      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        if (contactData.tags && contactData.tags.includes(tagToDelete.name)) {
          const updatedTags = contactData.tags.filter(
            (tag: string) => tag !== tagToDelete.name
          );
          batch.update(doc.ref, { tags: updatedTags });
        }
      });

      await batch.commit();

      // Update local state
      setTagList(tagList.filter((tag) => tag.id !== tagToDelete.id));
      setContacts(
        contacts.map((contact) => ({
          ...contact,
          tags: contact.tags
            ? contact.tags.filter((tag) => tag !== tagToDelete.name)
            : [],
        }))
      );

      setShowDeleteTagModal(false);
      setTagToDelete(null);
      toast.success("Tag deleted successfully!");
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error("Failed to delete tag.");
    }
  };

  const handleBulkDeleteTags = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        return;
      }

      const docUserRef = doc(firestore, "user", user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("No such document for user!");
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const batch = writeBatch(firestore);

      // Delete all tags from the tags collection
      for (const tag of tagList) {
        const tagRef = doc(firestore, `companies/${companyId}/tags`, tag.id);
        batch.delete(tagRef);
      }

      // Remove all tags from all contacts
      const contactsRef = collection(
        firestore,
        `companies/${companyId}/contacts`
      );
      const contactsSnapshot = await getDocs(contactsRef);

      contactsSnapshot.forEach((doc) => {
        const contactData = doc.data();
        if (contactData.tags && contactData.tags.length > 0) {
          batch.update(doc.ref, { tags: [] });
        }
      });

      await batch.commit();

      // Update local state
      setTagList([]);
      setContacts(
        contacts.map((contact) => ({
          ...contact,
          tags: [],
        }))
      );

      setShowDeleteTagModal(false);
      toast.success(`All ${tagList.length} tags deleted successfully!`);
    } catch (error) {
      console.error("Error deleting all tags:", error);
      toast.error("Failed to delete all tags.");
    }
  };

  const handleEyeClick = () => {
    setIsTabOpen(!isTabOpen);
  };

  const toggleContactSelection = (contact: Contact) => {
    const isSelected = selectedContacts.some((c) => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const isContactSelected = (contact: Contact) => {
    return selectedContacts.some((c) => c.id === contact.id);
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedContacts([...contacts]);
    } else {
      setSelectedContacts([]);
    }
  };
  const fetchTags = async (employeeList: string[]) => {
    setLoading(true);
    console.log("fetching tags");
    try {
      // Get user email from localStorage or context
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setLoading(false);
        return;
      }

      // Fetch user/company info from your backend
      const userResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!userResponse.ok) {
        setLoading(false);
        return;
      }
      const userJson = await userResponse.json();
      console.log(userJson);
      const companyData = userJson.userData;
      const companyId = companyData.companyId;
      if (!companyId) {
        setLoading(false);
        return;
      }

      // Fetch tags from your SQL backend
      const tagsResponse = await fetch(
        `${baseUrl}/api/companies/${companyId}/tags`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!tagsResponse.ok) {
        setLoading(false);
        return;
      }
      console.log(tagsResponse);
      const tags: Tag[] = await tagsResponse.json();

      // Filter out tags that match employee names (case-insensitive)
      const normalizedEmployeeNames = employeeList.map((name) =>
        name.toLowerCase()
      );
      const filteredTags = tags.filter(
        (tag: Tag) => !normalizedEmployeeNames.includes(tag.name.toLowerCase())
      );

      setTagList(filteredTags);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setLoading(false);
    }
  };
  useEffect(() => {
    // Ensure employee names are properly stored when fetched
    const normalizedEmployeeNames = employeeList.map((employee) =>
      employee.name.toLowerCase()
    );
    setEmployeeNames(normalizedEmployeeNames);
  }, [employeeList]);
  const getCompanyData = async () => {
    const userDataStr = localStorage.getItem("userData");
    if (!userDataStr) {
      throw new Error("User not authenticated");
    }
    let parsedUserData: any;
    try {
      parsedUserData = JSON.parse(userDataStr);
    } catch {
      throw new Error("Invalid userData in localStorage");
    }
    const email = parsedUserData.email;
    if (!email) {
      throw new Error("User email not found");
    }

    const response = await fetch(`${baseUrl}/api/user-context?email=${email}`);
    if (!response.ok) throw new Error("Failed to fetch user context");
    const data = await response.json();

    setCompanyId(data.companyId);
    setCurrentUserRole(data.role);
    setEmployeeList(
      (data.employees || []).map((employee: any) => ({
        id: employee.id,
        name: employee.name,
        email: employee.email || employee.id,
        role: employee.role,
        employeeId: employee.employeeId,
        phoneNumber: employee.phoneNumber,
      }))
    );
    setPhoneNames(data.phoneNames);
    setPhoneOptions(Object.keys(data.phoneNames).map(Number));

    return {
      companyId: data.companyId,
      baseUrl: data.apiUrl || baseUrl,
      userData: parsedUserData,
      email,
      stopbot: data.stopBot || false,
      stopbots: data.stopBots || {},
    };
  };
  async function fetchCompanyData() {
    try {
      const { companyId, userData, email, stopbot, stopbots } =
        await getCompanyData();

      setShowAddUserButton(userData.role === "1");
      setUserRole(userData.role);
      setCompanyId(companyId);

      // Set stopbot state if available
      setStopbot(stopbot || false);

      // Fetch phone names data
      await fetchPhoneIndex(companyId);

      // Set employee data
      const employeeListData = (userData.employees || []).map(
        (employee: any) => ({
          id: employee.id,
          name: employee.name,
          email: employee.email || employee.id,
          role: employee.role,
          employeeId: employee.employeeId,
          phoneNumber: employee.phoneNumber,
        })
      );
      setEmployeeList(employeeListData);
      const employeeNames = employeeListData.map((employee: Employee) =>
        employee.name.trim().toLowerCase()
      );
      setEmployeeNames(employeeNames);

      await fetchTags(employeeListData.map((e: Employee) => e.name));

      setLoading(false);
    } catch (error) {
      console.error("Error fetching company data:", error);
      toast.error("Failed to fetch company data");
    }
  }

  const toggleBot = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, "user", user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const companyRef = doc(firestore, "companies", companyId);
      await updateDoc(companyRef, {
        stopbot: !stopbot,
      });
      setStopbot(!stopbot);
      toast.success(
        `Bot ${stopbot ? "activated" : "deactivated"} successfully!`
      );
    } catch (error) {
      console.error("Error toggling bot:", error);
      toast.error("Failed to toggle bot status.");
    }
  };
  const verifyContactIdExists = async (
    contactId: string,
    accessToken: string
  ) => {
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, "user", user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return false;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(
        firestore,
        `companies/${companyId}/contacts`,
        contactId
      );
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        return false;
      }

      // If the contact exists, return true
      return true;
    } catch (error) {
      console.error("Error verifying contact ID:", error);
      return false;
    }
  };

  const handleAddTagToSelectedContacts = async (
    tagName: string,
    contact: Contact
  ) => {
    console.log("🏷️ [TAG ASSIGNMENT] Starting tag assignment:");
    console.log("🏷️ [TAG ASSIGNMENT] Tag name:", tagName);
    console.log("🏷️ [TAG ASSIGNMENT] Contact:", contact);
    console.log(
      "🏷️ [TAG ASSIGNMENT] Contact ID:",
      contact?.contact_id || contact?.id
    );
    console.log(
      "🏷️ [TAG ASSIGNMENT] Contact Name:",
      contact?.contactName || contact?.firstName
    );

    if (userRole === "3") {
      toast.error("You don't have permission to assign users to contacts.");
      return;
    }

    if (!contact || (!contact.contact_id && !contact.id)) {
      toast.error("No contact selected or contact ID missing");
      console.error("🏷️ [TAG ASSIGNMENT] Missing contact or contact ID");
      return;
    }

    try {
      // Get company and user data from your backend
      const userEmail = localStorage.getItem("userEmail");

      // Get user data from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId || (!contact.contact_id && !contact.id)) {
        toast.error("Missing company or contact ID");
        return;
      }

      const contactId = contact.contact_id || contact.id;

      // Check if this is the 'Stop Blast' tag
      if (tagName.toLowerCase() === "stop blast") {
        const contactChatId =
          contact.phone?.replace(/\D/g, "") + "@s.whatsapp.net";

        try {
          // Handle stop blast via API
          const response = await fetch(
            `${baseUrl}/api/contacts/${companyId}/${contactId}/stop-blast`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contactChatId: contactChatId,
                userEmail: userEmail,
                reason: "Stop Blast tag added",
              }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.deletedCount > 0) {
              toast.success(
                `Cancelled ${result.deletedCount} scheduled messages for this contact`
              );
            } else {
              toast.info("No scheduled messages found for this contact");
            }
          }
        } catch (error) {
          console.error("Error handling stop blast:", error);
          toast.error("Failed to cancel scheduled messages");
        }
      }

      // Check if the tag is an employee name using stable reference
      const stableEmployeeList = employeeListRef.current;
      const employee = stableEmployeeList.find((emp) => emp.name === tagName);
      console.log("🔍 Employee search for tag:", tagName, "found:", employee);
      console.log(
        "🔍 Available employees (stable):",
        stableEmployeeList.map((emp) => emp.name)
      );
      console.log("🔍 Stable employee list length:", stableEmployeeList.length);
      console.log("🔍 State employee list length:", employeeList.length);

      if (stableEmployeeList.length === 0) {
        console.warn("🔍 Stable employee list is empty, may need to fetch employees");
        toast.warning(
          "Employee list not loaded yet. Please try again in a moment."
        );
        return;
      }

      if (employee) {
        // Assign employee to contact (requires backend endpoint for assignment logic)
        const response = await fetch(
          `${baseUrl}/api/contacts/${companyId}/${contactId}/assign-employee`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: employee.id,
              employeeName: employee.name,
            }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to assign employee:", errorText);
          toast.error(`Failed to assign ${tagName} to contact: ${errorText}`);
          return;
        }

        const assignmentResult = await response.json();
        console.log("✅ Employee assignment successful:", assignmentResult);

        // Update contact immediately with the new assignment
        // Remove any existing employee tags first, then add the new one
        const currentTags = contact.tags || [];
        const nonEmployeeTags = currentTags.filter(
          (tag) => !stableEmployeeList.some((emp) => emp.name === tag)
        );
        const updatedTags = [...nonEmployeeTags, tagName];
        console.log("🏷️ [EMPLOYEE ASSIGNMENT] Updated tags:", updatedTags);
        console.log("🏷️ [EMPLOYEE ASSIGNMENT] Previous tags:", currentTags);

        const updateContactsList = (prevContacts: Contact[]) =>
          prevContacts.map((c) =>
            c.id === contact.id || c.contact_id === contact.contact_id
              ? { ...c, tags: updatedTags, assignedTo: tagName }
              : c
          );

        setContacts(updateContactsList);
        setFilteredContacts((prevFilteredContacts) =>
          updateContactsList(prevFilteredContacts)
        );

        // Update selectedContact if it's the same contact
        if (
          selectedContact &&
          (selectedContact.id === contact.id ||
            selectedContact.contact_id === contact.contact_id)
        ) {
          setSelectedContact((prevContact: Contact) => ({
            ...prevContact,
            tags: updatedTags,
            assignedTo: tagName,
          }));
        }

        // Update localStorage immediately
        const updatedContacts = updateContactsList(contacts);
        localStorage.setItem(
          "contacts",
          LZString.compress(JSON.stringify(updatedContacts))
        );

        toast.success(`Contact assigned to ${tagName}`);
        return;
      }

      console.log(
        "Adding tag",
        tagName,
        "to contact",
        contactId,
        "in company",
        companyId
      );

      // Handle non-employee tags (add tag to contact)
      const hasTag = contact.tags?.includes(tagName) || false;
      if (!hasTag) {
        console.log(
          "Adding tag",
          tagName,
          "to contact",
          contactId,
          "in company",
          companyId
        );
        const response = await fetch(
          `${baseUrl}/api/contacts/${companyId}/${contactId}/tags`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: [tagName] }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to add tag to contact:", errorText);
          toast.error("Failed to add tag to contact");
          return;
        }
        const data = await response.json();

        // Calculate the updated tags by adding the new tag to existing tags
        const currentTags = contact.tags || [];
        const newTags = currentTags.includes(tagName)
          ? currentTags
          : [...currentTags, tagName];

        // Update both contacts and filteredContacts states immediately
        const updateContactsList = (prevContacts: Contact[]) =>
          prevContacts.map((c) =>
            c.id === contact.id || c.contact_id === contact.contact_id
              ? { ...c, tags: newTags }
              : c
          );

        setContacts(updateContactsList);
        setFilteredContacts((prevFilteredContacts) =>
          updateContactsList(prevFilteredContacts)
        );

        // Update selectedContact if it's the same contact
        if (
          selectedContact &&
          (selectedContact.id === contact.id ||
            selectedContact.contact_id === contact.contact_id)
        ) {
          setSelectedContact((prevContact: Contact) => ({
            ...prevContact,
            tags: newTags,
          }));
        }

        console.log(
          "�� [TAG] Added tag to contact:",
          contact.contactName,
          "tag:",
          tagName,
          "new tags:",
          newTags
        );
        toast.success(`Tag "${tagName}" added to contact`);
      } else {
        toast.info(`Tag "${tagName}" already exists for this contact`);
      }
    } catch (error) {
      console.error("Error adding tag to contact:", error);
      toast.error("Failed to add tag to contact");
    }
  };
  const handleRemoveTagsFromSelectedContacts = async (tagName: string) => {
    if (selectedContacts.length === 0) {
      toast.info("Please select contacts first");
      return;
    }

    try {
      const userEmail = localStorage.getItem("userEmail");
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        { credentials: "include" }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      // Remove tag from all selected contacts
      for (const contact of selectedContacts) {
        const contactId = contact.contact_id || contact.id;
        if (!contactId) continue;

        const response = await fetch(
          `${baseUrl}/api/contacts/${companyId}/${contactId}/tags`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: [tagName] }),
          }
        );

        if (response.ok) {
          // Update local state
          const updatedTags = (contact.tags || []).filter(
            (tag) => tag !== tagName
          );

          setContacts((prev) =>
            prev.map((c) =>
              c.id === contact.id || c.contact_id === contact.contact_id
                ? { ...c, tags: updatedTags }
                : c
            )
          );

          setFilteredContacts((prev) =>
            prev.map((c) =>
              c.id === contact.id || c.contact_id === contact.contact_id
                ? { ...c, tags: updatedTags }
                : c
            )
          );
        }
      }

      toast.success(
        `Removed tag "${tagName}" from ${selectedContacts.length} contact(s)`
      );
      setSelectedContacts([]); // Clear selection
    } catch (error) {
      console.error("Error removing tags:", error);
      toast.error("Failed to remove tags from contacts");
    }
  };
  const sendAssignmentNotification = async (
    assignedEmployeeName: string,
    contact: Contact
  ) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        return;
      }

      const docUserRef = doc(firestore, "user", user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("No user document found");
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      if (!companyId || typeof companyId !== "string") {
        console.error("Invalid companyId:", companyId);
        throw new Error("Invalid companyId");
      }

      // Check if notification has already been sent
      const notificationRef = doc(
        firestore,
        "companies",
        companyId,
        "assignmentNotifications",
        `${contact.id}_${assignedEmployeeName}`
      );
      const notificationSnapshot = await getDoc(notificationRef);

      if (notificationSnapshot.exists()) {
        return;
      }

      // Find the employee in the employee list
      const assignedEmployee = employeeList.find(
        (emp) => emp.name.toLowerCase() === assignedEmployeeName.toLowerCase()
      );
      if (!assignedEmployee) {
        console.error(`Employee not found: ${assignedEmployeeName}`);
        toast.error(
          `Failed to send assignment notification: Employee ${assignedEmployeeName} not found`
        );
        return;
      }

      if (!assignedEmployee.phoneNumber) {
        console.error(
          `Phone number missing for employee: ${assignedEmployeeName}`
        );
        toast.error(
          `Failed to send assignment notification: Phone number missing for ${assignedEmployeeName}`
        );
        return;
      }

      // Format the phone number for WhatsApp chat_id
      const employeePhone = `${assignedEmployee.phoneNumber.replace(
        /[^\d]/g,
        ""
      )}@c.us`;

      if (!employeePhone || !/^\d+@c\.us$/.test(employeePhone)) {
        console.error("Invalid employeePhone:", employeePhone);
        throw new Error("Invalid employeePhone");
      }

      const docRef = doc(firestore, "companies", companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error("No company document found");
        return;
      }
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || "https://juta-dev.ngrok.dev";
      let message = `Hello ${
        assignedEmployee.name
      }, a new contact has been assigned to you:\n\nName: ${
        contact.contactName || contact.firstName || "N/A"
      }\nPhone: ${
        contact.phone
      }\n\nPlease follow up with them as soon as possible.`;
      if (companyId == "042") {
        message = `Hi ${
          assignedEmployee.employeeId || assignedEmployee.phoneNumber
        } ${
          assignedEmployee.name
        }.\n\nAnda telah diberi satu prospek baharu\n\nSila masuk ke https://web.jutasoftware.co/login untuk melihat perbualan di antara Zahin Travel dan prospek.\n\nTerima kasih.\n\nIkhlas,\nZahin Travel Sdn. Bhd. (1276808-W)\nNo. Lesen Pelancongan: KPK/LN 9159\nNo. MATTA: MA6018\n\n#zahintravel - Nikmati setiap detik..\n#diyakini\n#responsif\n#budibahasa`;
      }
      let phoneIndex;
      if (userData?.phone !== undefined) {
        if (userData.phone === 0) {
          // Handle case for phone index 0
          phoneIndex = 0;
        } else if (userData.phone === -1) {
          // Handle case for phone index -1
          phoneIndex = 0;
        } else {
          // Handle other cases

          phoneIndex = userData.phone;
        }
      } else {
        console.error("User phone is not defined");
        phoneIndex = 0; // Default value if phone is not defined
      }
      let url;
      let requestBody;
      if (companyData.v2 === true) {
        url = `${baseUrl}/api/v2/messages/text/${companyId}/${employeePhone}`;
        requestBody = { message, phoneIndex };
      } else {
        url = `${baseUrl}/api/messages/text/${employeePhone}/${companyData.whapiToken}`;
        requestBody = { message, phoneIndex };
      }

      // Send WhatsApp message to the employee
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", response.status, errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const responseData = await response.json();

      // Mark notification as sent
      await setDoc(notificationRef, {
        sentAt: serverTimestamp(),
        employeeName: assignedEmployeeName,
        contactId: contact.id,
      });

      toast.success("Assignment notification sent successfully!");
    } catch (error) {
      console.error("Error sending assignment notification:", error);

      // Instead of throwing the error, we'll handle it here
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else {
        toast.error(
          "Failed to send assignment notification. Please try again."
        );
      }

      // Log additional information that might be helpful
    }
  };

  const handleSyncConfirmation = () => {
    if (!isSyncing) {
      setShowSyncConfirmationModal(true);
    }
  };

  const handleSyncNamesConfirmation = () => {
    if (!isSyncing) {
      setShowSyncNamesConfirmationModal(true);
    }
  };

  const handleConfirmSync = async () => {
    setShowSyncConfirmationModal(false);
    await handleSyncContact();
  };

  const handleConfirmSyncNames = async () => {
    setShowSyncNamesConfirmationModal(false);
    await handleSyncContactNames();
  };

  const handleSyncContactNames = async () => {
    try {
      setFetching(true);

      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setFetching(false);
        toast.error("No user email found");
        return;
      }

      // Get user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        setFetching(false);
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;
      setCompanyId(companyId);

      // Get company data
      const companyResponse = await fetch(
        `${baseUrl}/api/companies/${companyId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!companyResponse.ok) {
        setFetching(false);
        toast.error("Failed to fetch company data");
        return;
      }

      const companyData = await companyResponse.json();

      // Call the sync contact names endpoint
      const syncResponse = await fetch(
        `${baseUrl}/api/sync-contact-names/${companyId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(
          errorData.error || "Failed to start contact names synchronization"
        );
      }

      const responseData = await syncResponse.json();
      if (responseData.success) {
        toast.success("Contact names synchronization started successfully");
      } else {
        throw new Error(
          responseData.error || "Failed to start contact names synchronization"
        );
      }
    } catch (error) {
      console.error("Error syncing contact names:", error);
      toast.error(
        "An error occurred while syncing contact names: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setFetching(false);
    }
  };

  const handleSyncContact = async () => {
    try {
      console.log("test");
      setFetching(true);

      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        setFetching(false);
        toast.error("No user email found");
        return;
      }

      // Get user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        setFetching(false);
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id;
      setCompanyId(companyId);

      // Get company data
      const companyResponse = await fetch(
        `${baseUrl}/api/companies/${companyId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!companyResponse.ok) {
        setFetching(false);
        toast.error("Failed to fetch company data");
        return;
      }

      const companyData = await companyResponse.json();

      // Call the sync contacts endpoint
      const syncResponse = await fetch(
        `${baseUrl}/api/sync-contacts/${companyId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(
          errorData.error || "Failed to start contact synchronization"
        );
      }

      const responseData = await syncResponse.json();
      if (responseData.success) {
        toast.success("Contact synchronization started successfully");
      } else {
        throw new Error(
          responseData.error || "Failed to start contact synchronization"
        );
      }
    } catch (error) {
      console.error("Error syncing contacts:", error);
      toast.error(
        "An error occurred while syncing contacts: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setFetching(false);
    }
  };

  const handleRemoveTag = async (contactId: string, tagName: string) => {
    console.log("🗑️ [TAG REMOVAL] Starting tag removal:");
    console.log("🗑️ [TAG REMOVAL] Tag name:", tagName);
    console.log("🗑️ [TAG REMOVAL] Contact ID:", contactId);

    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }

    try {
      // Get company and user data from your backend
      const userEmail = localStorage.getItem("userEmail");

      // Get user data from SQL
      const userResponse = await fetch(
        `${baseUrl}/api/user-data?email=${encodeURIComponent(userEmail || "")}`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const companyId = userData.company_id;

      if (!companyId || !contactId) {
        toast.error("Missing company or contact ID");
        return;
      }

      console.log(
        "🗑️ [TAG REMOVAL] Removing tag",
        tagName,
        "from contact",
        contactId,
        "in company",
        companyId
      );

      // Remove tag from contact via API
      const response = await fetch(
        `${baseUrl}/api/contacts/${companyId}/${contactId}/tags`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: [tagName] }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to remove tag from contact:", errorText);
        toast.error("Failed to remove tag from contact");
        return;
      }

      const data = await response.json();

      // Calculate the updated tags by removing the specified tag from existing tags
      const currentContact = contacts.find(
        (c) => c.id === contactId || c.contact_id === contactId
      );
      const currentTags = currentContact?.tags || [];
      const updatedTags = currentTags.filter((tag) => tag !== tagName);

      // Update both contacts and filteredContacts states immediately
      const updateContactsList = (prevContacts: Contact[]) =>
        prevContacts.map((contact) =>
          contact.id === contactId || contact.contact_id === contactId
            ? { ...contact, tags: updatedTags }
            : contact
        );

      setContacts(updateContactsList);
      setFilteredContacts((prevFilteredContacts) =>
        updateContactsList(prevFilteredContacts)
      );

      // Update selectedContact if it's the same contact
      if (
        selectedContact &&
        (selectedContact.id === contactId ||
          selectedContact.contact_id === contactId)
      ) {
        setSelectedContact((prevContact: Contact) => ({
          ...prevContact,
          tags: updatedTags,
        }));
      }

      // Update currentContact if it's the same contact
      if (
        currentContact &&
        (currentContact.id === contactId ||
          currentContact.contact_id === contactId)
      ) {
        setCurrentContact((prevContact) =>
          prevContact ? { ...prevContact, tags: updatedTags } : prevContact
        );
      }

      console.log(
        "🗑️ [TAG REMOVAL] Tag removed from contact:",
        contactId,
        "tag:",
        tagName,
        "remaining tags:",
        updatedTags
      );
      toast.success(`Tag "${tagName}" removed successfully!`);
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag.");
    }
  };

  async function updateContactTags(
    contactId: string,
    accessToken: string,
    tags: string[],
    tagName: string
  ) {
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, "user", user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, "companies", companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        return;
      }
      const companyData = docSnapshot.data();

      await updateDoc(
        doc(firestore, "companies", companyId, "contacts", contactId),
        {
          tags: arrayRemove(tagName),
        }
      );

      // Update state
      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact.id === contactId
            ? {
                ...contact,
                tags: contact.tags!.filter((tag) => tag !== tagName),
              }
            : contact
        )
      );

      const updatedContacts = contacts.map((contact: Contact) =>
        contact.id === contactId
          ? {
              ...contact,
              tags: contact.tags!.filter((tag: string) => tag !== tagName),
            }
          : contact
      );

      const updatedSelectedContact = updatedContacts.find(
        (contact) => contact.id === contactId
      );
      if (updatedSelectedContact) {
        setSelectedContacts((prevSelectedContacts) =>
          prevSelectedContacts.map((contact) =>
            contact.id === contactId
              ? {
                  ...contact,
                  tags: contact.tags!.filter((tag) => tag !== tagName),
                }
              : contact
          )
        );
      }

      localStorage.setItem(
        "contacts",
        LZString.compress(JSON.stringify(updatedContacts))
      );
      sessionStorage.setItem("contactsFetched", "true");

      toast.success("Tag removed successfully!");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error updating contact tags:",
          error.response?.data || error.message
        );
      } else {
        console.error("Unexpected error updating contact tags:", error);
      }
      return false;
    }
  }

  const navigate = useNavigate(); // Initialize useNavigate
  const handleClick = (phone: any) => {
    const tempphone = phone.split("+")[1];
    const chatId = tempphone + "@c.us";
    navigate(`/chat/?chatId=${chatId}`);
  };
  async function searchContacts(accessToken: string, locationId: string) {
    setLoading(true);
    setFetching(true);
    setProgress(0);
    try {
      let allContacts: any[] = [];
      let fetchMore = true;
      let nextPageUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`;

      const maxRetries = 5;
      const baseDelay = 5000;

      const fetchData = async (
        url: string,
        retries: number = 0
      ): Promise<any> => {
        const options = {
          method: "GET",
          url: url,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: "2021-07-28",
          },
        };
        try {
          const response = await axios.request(options);

          return response;
        } catch (error: any) {
          if (
            error.response &&
            error.response.status === 429 &&
            retries < maxRetries
          ) {
            const delay = baseDelay * Math.pow(2, retries);
            console.warn(`Rate limit hit, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchData(url, retries + 1);
          } else {
            throw error;
          }
        }
      };

      let fetchedContacts = 0;
      let totalContacts = 0;
      while (fetchMore) {
        const response = await fetchData(nextPageUrl);
        const contacts = response.data.contacts;
        totalContacts = response.data.meta.total;

        if (contacts.length > 0) {
          allContacts = [...allContacts, ...contacts];
          if (role === 2) {
            const filteredContacts = allContacts.filter((contact) =>
              contact.tags.some(
                (tag: string) =>
                  typeof tag === "string" &&
                  tag.toLowerCase().includes(userName.toLowerCase())
              )
            );
            setContacts([...filteredContacts]);
          } else {
            setContacts([...allContacts]);
          }

          fetchedContacts = allContacts.length;
          setTotal(totalContacts);
          setFetched(fetchedContacts);
          setProgress((fetchedContacts / totalContacts) * 100);
          setLoading(false);
        }

        if (response.data.meta.nextPageUrl) {
          nextPageUrl = response.data.meta.nextPageUrl;
        } else {
          fetchMore = false;
        }
      }
    } catch (error) {
      console.error("Error searching contacts:", error);
    } finally {
      setFetching(false);
    }
  }
  const handleEditContact = (contact: Contact) => {
    setCurrentContact(contact);
    setEditContactModal(true);
  };

  const handleViewContact = (contact: Contact) => {
    setCurrentContact(contact);
    setViewContactModal(true);
  };

  const handleDeleteContact = async () => {
    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }
    if (currentContact) {
      try {
        // Get user/company info from localStorage or your app state
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) {
          toast.error("No user email found");
          return;
        }

        // Fetch user config to get companyId
        const userResponse = await fetch(
          `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        if (!userResponse.ok) {
          toast.error("Failed to fetch user config");
          return;
        }

        const userData = await userResponse.json();
        const companyId = userData?.company_id;
        if (!companyId) {
          toast.error("Company ID not found!");
          return;
        }

        // Get the contact_id
        const contact_id = currentContact.contact_id;

        toast.info("Preparing to delete contact...");

        // Step 1: Remove assignments first using the dedicated endpoint
        try {
          const assignmentsResponse = await fetch(
            `${baseUrl}/api/assignments/contact/${contact_id}?companyId=${companyId}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            }
          );

          if (assignmentsResponse.ok) {
            console.log("Assignments removed successfully");
          } else if (assignmentsResponse.status === 404) {
            console.log("No assignments found for this contact");
          } else {
            console.warn(
              "Failed to remove assignments:",
              assignmentsResponse.status
            );
          }
        } catch (error) {
          console.warn("Error removing assignments:", error);
        }

        // Step 2: Delete the contact
        toast.info("Deleting contact...");

        const response = await fetch(
          `${baseUrl}/api/contacts/${contact_id}?companyId=${companyId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (response.ok) {
          toast.success("Contact deleted successfully!");

          // Update local state
          setContacts((prevContacts) =>
            prevContacts.filter((contact) => contact.contact_id !== contact_id)
          );
          setScheduledMessages((prev) =>
            prev.filter((msg) => !msg.chatIds.includes(contact_id))
          );
          setDeleteConfirmationModal(false);
          setCurrentContact(null);

          await fetchContacts();
          await fetchScheduledMessages();
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Delete failed:", errorData);

          // Check if this is a constraint error that can be resolved with force delete
          const canForceDelete =
            errorData.message &&
            (errorData.message.includes("active assignments") ||
              errorData.message.includes("associated messages") ||
              errorData.message.includes(
                "Use /api/contacts/{contactId}/force"
              ));

          if (canForceDelete) {
            // Offer to force delete with cascade
            if (
              window.confirm(
                "This contact has database dependencies. Would you like to force delete it and remove all related data? This is irreversible."
              )
            ) {
              try {
                const forceDeleteResponse = await fetch(
                  `${baseUrl}/api/contacts/${contact_id}/force?companyId=${companyId}`,
                  {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                  }
                );

                if (forceDeleteResponse.ok) {
                  toast.success("Contact force deleted successfully!");

                  // Update local state
                  setContacts((prevContacts) =>
                    prevContacts.filter(
                      (contact) => contact.contact_id !== contact_id
                    )
                  );
                  setScheduledMessages((prev) =>
                    prev.filter((msg) => !msg.chatIds.includes(contact_id))
                  );
                  setDeleteConfirmationModal(false);
                  setCurrentContact(null);

                  await fetchContacts();
                  await fetchScheduledMessages();
                  return;
                } else {
                  const forceErrorData = await forceDeleteResponse.json();
                  toast.error(
                    `Force delete failed: ${
                      forceErrorData.message || "Unknown error"
                    }`
                  );
                }
              } catch (forceError) {
                console.error("Force delete error:", forceError);
                toast.error("Force delete failed");
              }
            }
          } else if (response.status === 409) {
            // Handle conflict status - contact has dependencies
            toast.error(
              "Cannot delete contact: Contact has associated data. Please remove dependencies first."
            );
          } else {
            toast.error("Failed to delete contact");
          }
        }
      } catch (error) {
        console.error("Error deleting contact:", error);
        toast.error("An error occurred while deleting the contact.");
      }
    }
  };
  const handleMassDelete = async () => {
    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }
    if (selectedContacts.length === 0) {
      toast.error("No contacts selected for deletion.");
      return;
    }

    // Set loading state and show initial notification
    setIsMassDeleting(true);
    toast.info(
      `Starting to delete ${selectedContacts.length} contacts. This may take some time...`
    );

    // Optimistic UI update - remove contacts immediately for better UX
    setContacts((prevContacts) =>
      prevContacts.filter(
        (contact) =>
          !selectedContacts.some((selected) => selected.id === contact.id)
      )
    );

    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user");
        setIsMassDeleting(false);
        return;
      }

      const docUserRef = doc(firestore, "user", user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("No such document for user!");
        setIsMassDeleting(false);
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, "companies", companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error("No such document for company!");
        setIsMassDeleting(false);
        return;
      }

      // Get all active templates once
      const templatesRef = collection(
        firestore,
        `companies/${companyId}/followUpTemplates`
      );
      const templatesSnapshot = await getDocs(templatesRef);
      const activeTemplates = templatesSnapshot.docs
        .filter((doc) => doc.data().status === "active")
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      // Create batch for contact deletion
      const batch = writeBatch(firestore);

      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || "https://juta-dev.ngrok.dev";

      // Process each contact
      let contactsProcessed = 0;
      const totalToProcess = selectedContacts.length;

      for (const contact of selectedContacts) {
        // Show progress to user
        contactsProcessed++;
        if (
          contactsProcessed % 50 === 0 ||
          contactsProcessed === totalToProcess
        ) {
          toast.info(
            `Processing ${contactsProcessed} of ${totalToProcess} contacts...`,
            { autoClose: 2000, updateId: "mass-delete-progress" }
          );
        }
        // Remove follow-up templates
        for (const template of activeTemplates) {
          try {
            const phoneNumber = contact.phone?.replace(/\D/g, "");
            const followUpResponse = await fetch(
              `${baseUrl}/api/tag/followup`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  requestType: "removeTemplate",
                  phone: phoneNumber,
                  first_name:
                    contact.contactName || contact.firstName || phoneNumber,
                  phoneIndex: userData.phone || 0,
                  templateId: template.id,
                  idSubstring: companyId,
                }),
              }
            );

            if (!followUpResponse.ok) {
              const errorText = await followUpResponse.text();
              console.error("Failed to remove template messages:", errorText);
            } else {
            }
          } catch (error) {
            console.error("Error removing template messages:", error);
          }
        }

        // Format contact's phone number for scheduled messages
        const contactChatId =
          contact.phone?.replace(/\D/g, "") + "@s.whatsapp.net";

        // Get and handle scheduled messages
        const scheduledMessagesRef = collection(
          firestore,
          `companies/${companyId}/scheduledMessages`
        );
        const scheduledSnapshot = await getDocs(scheduledMessagesRef);

        const messagePromises = scheduledSnapshot.docs.map(async (doc) => {
          const messageData = doc.data();
          if (messageData.chatIds?.includes(contactChatId)) {
            if (messageData.chatIds.length === 1) {
              try {
                await axios.delete(
                  `${baseUrl}/api/schedule-message/${companyId}/${doc.id}`
                );
              } catch (error) {
                console.error(
                  `Error deleting scheduled message ${doc.id}:`,
                  error
                );
              }
            } else {
              try {
                await axios.put(
                  `${baseUrl}/api/schedule-message/${companyId}/${doc.id}`,
                  {
                    ...messageData,
                    chatIds: messageData.chatIds.filter(
                      (id: string) => id !== contactChatId
                    ),
                    messages:
                      messageData.messages?.filter(
                        (msg: any) => msg.chatId !== contactChatId
                      ) || [],
                  }
                );
              } catch (error) {
                console.error(
                  `Error updating scheduled message ${doc.id}:`,
                  error
                );
              }
            }
          }
        });

        await Promise.all(messagePromises);

        // Step 1: Remove assignments from SQL backend
        try {
          const assignmentsResponse = await fetch(
            `${baseUrl}/api/assignments/contact/${contact.contact_id}?companyId=${companyId}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            }
          );

          if (assignmentsResponse.ok) {
            console.log(
              `Assignments removed for contact ${contact.contact_id}`
            );
          } else if (assignmentsResponse.status === 404) {
            console.log(
              `No assignments found for contact ${contact.contact_id}`
            );
          } else {
            console.warn(
              `Failed to remove assignments for contact ${contact.contact_id}:`,
              assignmentsResponse.status
            );
          }
        } catch (error) {
          console.warn(
            `Error removing assignments for contact ${contact.contact_id}:`,
            error
          );
        }

        // Step 2: Delete contact from SQL backend
        try {
          const response = await fetch(
            `${baseUrl}/api/contacts/${contact.contact_id}?companyId=${companyId}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn(
              `Failed to delete contact ${contact.contact_id} from SQL backend:`,
              errorData
            );

            // Try force delete if regular delete fails
            if (response.status === 409) {
              try {
                const forceDeleteResponse = await fetch(
                  `${baseUrl}/api/contacts/${contact.contact_id}/force?companyId=${companyId}`,
                  {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                  }
                );

                if (forceDeleteResponse.ok) {
                  console.log(
                    `Contact ${contact.contact_id} force deleted from SQL backend`
                  );
                } else {
                  console.warn(
                    `Force delete failed for contact ${contact.contact_id}`
                  );
                }
              } catch (forceError) {
                console.warn(
                  `Force delete error for contact ${contact.contact_id}:`,
                  forceError
                );
              }
            }
          } else {
            console.log(
              `Contact ${contact.contact_id} deleted from SQL backend`
            );
          }
        } catch (error) {
          console.warn(
            `Error deleting contact ${contact.contact_id} from SQL backend:`,
            error
          );
        }

        // Add contact deletion to Firestore batch
        const contactRef = doc(
          firestore,
          `companies/${companyId}/contacts`,
          contact.id!
        );
        batch.delete(contactRef);
      }

      // Execute the batch delete for contacts
      await batch.commit();

      // Update local state
      setContacts((prevContacts) =>
        prevContacts.filter(
          (contact) =>
            !selectedContacts.some((selected) => selected.id === contact.id)
        )
      );
      setSelectedContacts([]);
      setShowMassDeleteModal(false);

      // Refresh lists
      await fetchScheduledMessages();

      toast.success(
        `${selectedContacts.length} contacts deleted successfully from both Firestore and SQL backend!`
      );
      await fetchContacts();
    } catch (error) {
      console.error("Error deleting contacts:", error);
      toast.error(
        "An error occurred while deleting the contacts and associated messages."
      );
      // Refresh to get accurate data
      fetchContacts();
    } finally {
      // Always reset loading state
      setIsMassDeleting(false);
    }
  };
  const handleSaveContact = async () => {
    if (currentContact) {
      try {
        // Get user/company info from localStorage or your app state
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) {
          toast.error("No user email found");
          return;
        }

        // Fetch user config to get companyId
        const userResponse = await fetch(
          `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        if (!userResponse.ok) {
          toast.error("Failed to fetch user config");
          return;
        }

        const userData = await userResponse.json();
        const companyId = userData?.company_id;
        if (!companyId) {
          toast.error("Company ID not found!");
          return;
        }

        // Generate contact_id as companyId + phone
        const formattedPhone = formatPhoneNumber(currentContact.phone || "");
        const contact_id = currentContact.contact_id;

        // Create an object with all fields, including custom fields
        const updateData: { [key: string]: any } = {
          contact_id,
          companyId,
        };

        const fieldsToUpdate = [
          "name",
          "email",
          "last_name",
          "phone",
          "address1",
          "city",
          "state",
          "postalCode",
          "website",
          "dnd",
          "dndSettings",
          "tags",
          "source",
          "country",
          "companyName",
          "branch",
          "expiryDate",
          "vehicleNumber",

          "IC",
          "assistantId",
          "threadid",
          "notes", // Add this line
        ];

        fieldsToUpdate.forEach((field) => {
          if (
            currentContact[field as keyof Contact] !== undefined &&
            currentContact[field as keyof Contact] !== null
          ) {
            updateData[field] = currentContact[field as keyof Contact];
          }
        });

        // Ensure customFields are included in the update if they exist
        if (
          currentContact.customFields &&
          Object.keys(currentContact.customFields).length > 0
        ) {
          updateData.customFields = currentContact.customFields;
        }
        console.log(updateData);
        // Send PUT request to your SQL backend
        // (Assume your backend expects /api/contacts/:contact_id for update)
        const response = await axios.put(
          `${baseUrl}/api/contacts/${contact_id}`,
          updateData
        );

        if (response.data.success) {
          // Update local state immediately after saving
          setContacts((prevContacts) =>
            prevContacts.map((contact) =>
              contact.contact_id === contact_id
                ? { ...contact, ...updateData }
                : contact
            )
          );

          setEditContactModal(false);
          setCurrentContact(null);
          await fetchContacts();
          toast.success("Contact updated successfully!");
        } else {
          toast.error(response.data.message || "Failed to update contact.");
        }
      } catch (error) {
        console.error("Error saving contact:", error);
        toast.error("Failed to update contact.");
      }
    }
  };
  // Function to add a new custom field to all contacts
  const addCustomFieldToAllContacts = async (fieldName: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, "user", user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const contactsCollectionRef = collection(
        firestore,
        `companies/${companyId}/contacts`
      );
      const contactsSnapshot = await getDocs(contactsCollectionRef);

      const batch = writeBatch(firestore);

      contactsSnapshot.forEach((doc) => {
        const contactRef = doc.ref;
        batch.update(contactRef, {
          [`customFields.${fieldName}`]: "",
        });
      });

      await batch.commit();

      // Update local state
      setContacts((prevContacts) =>
        prevContacts.map((contact) => ({
          ...contact,
          customFields: {
            ...contact.customFields,
            [fieldName]: "",
          },
        }))
      );

      toast.success(`New custom field "${fieldName}" added to all contacts.`);
    } catch (error) {
      console.error("Error adding custom field to all contacts:", error);
      toast.error("Failed to add custom field to all contacts.");
    }
  };
  // Add this function to combine similar scheduled messages
  // Add this function to combine similar scheduled messages
  const combineScheduledMessages = (
    messages: ScheduledMessage[]
  ): ScheduledMessage[] => {
    const combinedMessages: { [key: string]: ScheduledMessage } = {};

    messages.forEach((message) => {
      // Since scheduledTime is now always a string
      const scheduledTime = new Date(message.scheduledTime).getTime();

      const key = `${message.messageContent}-${scheduledTime}`;
      if (combinedMessages[key]) {
        combinedMessages[key].count = (combinedMessages[key].count || 1) + 1;
      } else {
        combinedMessages[key] = { ...message, count: 1 };
      }
    });

    console.log("combinedMessages", combinedMessages);

    // Convert the object to an array and sort it
    return Object.values(combinedMessages).sort((a, b) => {
      const timeA = new Date(a.scheduledTime).getTime();
      const timeB = new Date(b.scheduledTime).getTime();
      return timeA - timeB;
    });
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  // Add a user filter change handler
  const handleUserFilterChange = (userName: string) => {
    setSelectedUserFilters((prev) =>
      prev.includes(userName)
        ? prev.filter((user) => user !== userName)
        : [...prev, userName]
    );
  };

  const clearAllFilters = () => {
    setSelectedTagFilters([]);
    setSelectedUserFilters([]);
    setExcludedTags([]);
    setActiveDateFilter(null);
  };

  const applyDateFilter = () => {
    if (dateFilterStart || dateFilterEnd) {
      // Validate dates
      let isValid = true;
      let errorMessage = "";

      if (dateFilterStart && dateFilterEnd) {
        const startDate = new Date(dateFilterStart);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(dateFilterEnd);
        endDate.setHours(23, 59, 59, 999);

        if (startDate > endDate) {
          isValid = false;
          errorMessage = "Start date cannot be after end date";
        }
      }

      if (isValid) {
        const filterData = {
          field: "createdAt", // Always use createdAt field
          start: dateFilterStart,
          end: dateFilterEnd,
        };

        // Log the filter being applied for debugging
        console.log("Applying date filter:", filterData);

        // Set the filter and also sort by date
        setActiveDateFilter(filterData);
        setSortField("createdAt");
        setSortDirection("desc"); // Most recent first
        setShowDateFilterModal(false);

        // Format message for user feedback
        let message = `Filtering and sorting contacts by creation date`;
        if (dateFilterStart) {
          message += ` from ${new Date(dateFilterStart).toLocaleDateString()}`;
        }
        if (dateFilterEnd) {
          message += ` to ${new Date(dateFilterEnd).toLocaleDateString()}`;
        }

        toast.success(message);
      } else {
        toast.error(errorMessage);
      }
    } else {
      toast.error("Please select at least one date for filtering");
    }
  };

  const clearDateFilter = () => {
    setActiveDateFilter(null);
    setDateFilterStart("");
    setDateFilterEnd("");
    // Also clear the sorting if it was set by the date filter
    if (sortField === "createdAt") {
      setSortField(null);
      setSortDirection("asc");
    }
  };

  const filteredContactsSearch = useMemo(() => {
    // Log the active date filter for debugging
    if (activeDateFilter) {
      console.log("Active date filter:", activeDateFilter);
    }

    return contacts.filter((contact) => {
      const name = (contact.contactName || "").toLowerCase();
      const phone = (contact.phone || "").toLowerCase();
      const tags = (contact.tags || []).map((tag) => tag.toLowerCase());
      const searchTerm = searchQuery.toLowerCase();

      // Check basic fields
      const basicFieldMatch =
        name.includes(searchTerm) ||
        phone.includes(searchTerm) ||
        tags.some((tag) => tag.includes(searchTerm));

      // Check custom fields
      const customFieldMatch = contact.customFields
        ? Object.entries(contact.customFields).some(([key, value]) =>
            String(value || "")
              .toLowerCase()
              .includes(searchTerm)
          )
        : false;

      const matchesSearch = basicFieldMatch || customFieldMatch;

      const matchesTagFilters =
        selectedTagFilters.length === 0 ||
        selectedTagFilters.every((filter) =>
          tags.includes(filter.toLowerCase())
        );
      const matchesUserFilters =
        selectedUserFilters.length === 0 ||
        selectedUserFilters.some((filter) =>
          tags.includes(filter.toLowerCase())
        );
      const notExcluded = !excludedTags.some((tag) =>
        tags.includes(tag.toLowerCase())
      );

      // Date filter logic
      let matchesDateFilter = true;

      if (activeDateFilter) {
        const { field, start, end } = activeDateFilter;
        const contactDate = contact[field as keyof Contact];

        if (!contactDate) {
          // If the contact doesn't have the date field we're filtering by
          matchesDateFilter = false;
        } else {
          try {
            // Handle both Timestamp objects and string dates
            let date: Date;

            if (typeof contactDate === "string") {
              // Handle string dates
              date = new Date(contactDate);
            } else if (
              contactDate &&
              typeof contactDate === "object" &&
              "seconds" in contactDate
            ) {
              // Handle Firestore Timestamp objects
              const timestamp = contactDate as {
                seconds: number;
                nanoseconds: number;
              };
              date = new Date(timestamp.seconds * 1000);
            } else {
              // Unknown format
              console.log(
                `Invalid date format for contact ${
                  contact.id
                }: ${JSON.stringify(contactDate)}`
              );
              matchesDateFilter = false;
              return (
                matchesSearch &&
                matchesTagFilters &&
                matchesUserFilters &&
                notExcluded &&
                matchesDateFilter
              );
            }

            // Check if the date is valid
            if (isNaN(date.getTime())) {
              console.log(
                `Invalid date for contact ${contact.id}: ${JSON.stringify(
                  contactDate
                )}`
              );
              matchesDateFilter = false;
            } else {
              // Format dates for comparison - strip time components for consistent comparison
              const contactDateStr = date.toISOString().split("T")[0];

              if (start && end) {
                // Both start and end dates provided
                const startDateStr = new Date(start)
                  .toISOString()
                  .split("T")[0];
                const endDateStr = new Date(end).toISOString().split("T")[0];

                // Compare dates as strings in YYYY-MM-DD format for accurate date-only comparison
                matchesDateFilter =
                  contactDateStr >= startDateStr &&
                  contactDateStr <= endDateStr;
              } else if (start) {
                // Only start date
                const startDateStr = new Date(start)
                  .toISOString()
                  .split("T")[0];
                matchesDateFilter = contactDateStr >= startDateStr;
              } else if (end) {
                // Only end date
                const endDateStr = new Date(end).toISOString().split("T")[0];
                matchesDateFilter = contactDateStr <= endDateStr;
              }
            }
          } catch (error) {
            console.error(
              `Error parsing date for contact ${contact.id}:`,
              contactDate,
              error
            );
            matchesDateFilter = false;
          }
        }
      }

      return (
        matchesSearch &&
        matchesTagFilters &&
        matchesUserFilters &&
        notExcluded &&
        matchesDateFilter
      );
    });
  }, [
    contacts,
    searchQuery,

    selectedTagFilters,
    selectedUserFilters,
    excludedTags,
    activeDateFilter,
  ]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const endOffset = itemOffset + itemsPerPage;
  const currentContacts = filteredContactsSearch.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(filteredContactsSearch.length / itemsPerPage);

  const handlePageClick = (event: { selected: number }) => {
    const newOffset =
      (event.selected * itemsPerPage) % filteredContactsSearch.length;
    setItemOffset(newOffset);
  };

  // ... existing code ...
  const sendBlastMessage = async () => {
    // Validation checks
    if (selectedContacts.length === 0) {
      toast.error("No contacts selected!");
      return;
    }

    if (!blastStartTime || !blastStartDate) {
      toast.error("Please select both a date and time for the blast message.");
      return;
    }

    if (!blastMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // Set phoneIndex to 0 if it's null or undefined
    if (phoneIndex === undefined || phoneIndex === null) {
      setPhoneIndex(0);
    }
    const effectivePhoneIndex = phoneIndex ?? 0;

    // Check if the selected phone exists in phoneNames
    if (!phoneNames[effectivePhoneIndex]) {
      toast.error(
        "Selected phone is not available. Please select a valid phone."
      );
      return;
    }

    // Check if the selected phone is connected (only if qrCodes data is available)
    if (qrCodes[effectivePhoneIndex]) {
      const status = qrCodes[effectivePhoneIndex].status?.toLowerCase();
      if (!["ready", "authenticated"].includes(status)) {
        toast.error(
          "Selected phone is not connected. Please select a connected phone."
        );
        return;
      }
    }

    setIsScheduling(true);

    try {
      let mediaUrl = "";
      let documentUrl = "";
      let fileName = "";
      let mimeType = "";

      if (selectedMedia) {
        mediaUrl = await uploadFile(selectedMedia);
        mimeType = selectedMedia.type;
      }

      if (selectedDocument) {
        documentUrl = await uploadFile(selectedDocument);
        fileName = selectedDocument.name;
        mimeType = selectedDocument.type;
      }

      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }

      // Get user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        toast.error("Failed to fetch user config");
        return;
      }

      const userData = await userResponse.json();
      // Get companyId and phoneIndex from your local state/props
      // (Assume you have userData or similar in your component)
      const companyId = userData?.company_id;
      console.log(userData);
      if (!companyId) {
        toast.error("Company ID not found!");
        return;
      }

      // Prepare chatIds
      const chatIds = selectedContacts
        .map((contact) => {
          const phoneNumber = contact.contact_id?.split("-")[1];
          return phoneNumber ? `${phoneNumber}@c.us` : null;
        })
        .filter((chatId) => chatId !== null);

      const contactIds = selectedContacts
        .map((contact) => contact.contact_id)
        .filter((contactId) => contactId !== null);

      // Add 'multiple' parameter based on number of contactIds
      const multiple = contactIds.length > 1;

      // Prepare processedMessages (replace placeholders)
      const processedMessages = selectedContacts.map((contact) => {
        let processedMessage = blastMessage;
        processedMessage = processedMessage
          .replace(/@{contactName}/g, contact.contactName || "")
          .replace(/@{firstName}/g, contact.firstName || "")
          .replace(/@{lastName}/g, contact.lastName || "")
          .replace(/@{email}/g, contact.email || "")
          .replace(/@{phone}/g, contact.phone || "")
          .replace(/@{vehicleNumber}/g, contact.vehicleNumber || "")
          .replace(/@{branch}/g, contact.branch || "")
          .replace(/@{expiryDate}/g, contact.expiryDate || "")
          .replace(/@{company}/g, contact.company || "")
          .replace(/@{ic}/g, contact.ic || "");
        // Add more placeholders as needed
        return {
          chatId: contact.phone?.replace(/\D/g, "") + "@c.us",
          message: processedMessage,
          contactData: contact,
        };
      });

      // Prepare scheduledMessageData
      let scheduledTime: Date;
      if (blastStartTime && blastStartDate) {
        const timeHours = blastStartTime.getHours();
        const timeMinutes = blastStartTime.getMinutes();
        const timeSeconds = blastStartTime.getSeconds();
        const timeMilliseconds = blastStartTime.getMilliseconds();

        scheduledTime = new Date(blastStartDate);
        scheduledTime.setHours(
          timeHours,
          timeMinutes,
          timeSeconds,
          timeMilliseconds
        );
      } else if (blastStartTime) {
        scheduledTime = new Date();
        scheduledTime.setHours(
          blastStartTime.getHours(),
          blastStartTime.getMinutes(),
          blastStartTime.getSeconds(),
          blastStartTime.getMilliseconds()
        );
      } else {
        scheduledTime = new Date();
      }

      const scheduledMessageData = {
        chatIds,
        message: blastMessage,
        messages: processedMessages,
        batchQuantity,
        companyId,
        contact_id: contactIds,
        createdAt: new Date().toISOString(),
        documentUrl: documentUrl || "",
        fileName: fileName || null,
        mediaUrl: mediaUrl || "",
        mimeType: mimeType || null,
        repeatInterval,
        repeatUnit,
        scheduledTime: scheduledTime.toISOString(),
        status: "scheduled",
        v2: true,
        whapiToken: null,
        phoneIndex: effectivePhoneIndex,
        minDelay,
        maxDelay,
        activateSleep,
        sleepAfterMessages: activateSleep ? sleepAfterMessages : null,
        sleepDuration: activateSleep ? sleepDuration : null,
        multiple: multiple,
      };

      // Make API call to juta-dev.ngrok.dev
      const response = await axios.post(
        `${baseUrl}/api/schedule-message/${companyId}`,
        scheduledMessageData
      );

      if (response.data.success) {
        toast.success(
          `Blast messages scheduled successfully for ${selectedContacts.length} contacts.`
        );
        toast.info(
          `Messages will be sent at: ${scheduledTime.toLocaleString()} (local time)`
        );
        await fetchScheduledMessages();
        setBlastMessageModal(false);
        resetForm();
      } else {
        toast.error(response.data.message || "Failed to schedule messages");
      }
    } catch (error) {
      console.error("Error scheduling blast messages:", error);
      toast.error(
        "An error occurred while scheduling the blast message. Please try again."
      );
    } finally {
      setIsScheduling(false);
    }
  };

  // Helper function to reset the form
  const resetForm = () => {
    setMessages([{ text: "", delayAfter: 0 }]);
    setBlastMessage("");
    setPhoneIndex(null);
    setInfiniteLoop(false);
    setBatchQuantity(10);
    setRepeatInterval(0);
    setRepeatUnit("days");
    setSelectedMedia(null);
    setSelectedDocument(null);
    setBlastStartTime(null);
    setBlastStartDate(new Date());
    setActiveTimeStart("09:00");
    setActiveTimeEnd("17:00");
    setMinDelay(1);
    setMaxDelay(3);
    setActivateSleep(false);
    setSleepAfterMessages(10);
    setSleepDuration(30);
    setShowPlaceholders(false);
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCsvFile(file);
    }
  };

  const [importTags, setImportTags] = useState<string[]>([]);

  const getAllCustomFields = (contacts: Contact[]): string[] => {
    const customFieldsSet = new Set<string>();
    contacts.forEach((contact) => {
      if (contact?.customFields) {
        Object.keys(contact.customFields).forEach((field) => {
          if (field) customFieldsSet.add(field);
        });
      }
    });
    return Array.from(customFieldsSet);
  };

  const ensureAllCustomFields = (
    contactData: any,
    allCustomFields: string[]
  ): any => {
    const customFields: { [key: string]: string } = {
      ...(contactData.customFields || {}),
    };

    // Add any missing custom fields with empty string values
    allCustomFields.forEach((field) => {
      if (!(field in customFields)) {
        customFields[field] = "";
      }
    });

    return {
      ...contactData,
      customFields,
    };
  };

  async function sendTextMessage(
    id: string,
    blastMessage: string,
    contact: Contact
  ): Promise<void> {
    if (!blastMessage.trim()) {
      console.error("Blast message is empty");
      return;
    }

    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, "user", user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document not found!");
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, "companies", companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error("Company document not found!");
        return;
      }

      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || "https://juta-dev.ngrok.dev";
      const accessToken = companyData.ghl_accessToken;
      const whapiToken = companyData.whapiToken;
      const phoneNumber = id.split("+")[1];
      const chat_id = phoneNumber + "@s.whatsapp.net";

      // Process message with contact data to replace placeholders
      let processedMessage = blastMessage
        .replace(/@{contactName}/g, contact.contactName || "")
        .replace(/@{firstName}/g, contact.contactName?.split(" ")[0] || "")
        .replace(/@{lastName}/g, contact.lastName || "")
        .replace(/@{email}/g, contact.email || "")
        .replace(/@{phone}/g, contact.phone || "")
        .replace(/@{vehicleNumber}/g, contact.vehicleNumber || "")
        .replace(/@{branch}/g, contact.branch || "")
        .replace(/@{expiryDate}/g, contact.expiryDate || "")
        .replace(/@{ic}/g, contact.ic || "");

      // Process custom fields placeholders
      if (contact.customFields) {
        Object.entries(contact.customFields).forEach(([fieldName, value]) => {
          const placeholder = new RegExp(`@{${fieldName}}`, "g");
          processedMessage = processedMessage.replace(placeholder, value || "");
        });
      }

      if (companyData.v2) {
        // Handle v2 users
        const messagesRef = collection(
          firestore,
          `companies/${companyId}/contacts/${contact.phone}/messages`
        );
        await addDoc(messagesRef, {
          message: processedMessage,
          timestamp: new Date(),
          from_me: true,
          chat_id: chat_id,
          type: "chat",
          // Add any other necessary fields
        });
      } else {
        // Handle non-v2 users
        const response = await axios.post(
          `${baseUrl}/api/messages/text/${chat_id}/${whapiToken}`,
          {
            contactId: id,
            message: processedMessage,
            additionalInfo: { ...contact },
            method: "POST",
            body: JSON.stringify({
              message: processedMessage,
            }),
            headers: { "Content-Type": "application/json" },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data && response.data.message) {
          // Store the message in Firebase for non-v2 users
          const messagesCollectionRef = collection(
            firestore,
            "companies",
            companyId,
            "messages"
          );
          await setDoc(doc(messagesCollectionRef, response.data.message.id), {
            message: response.data.message,
            from: userData.name,
            timestamp: new Date(),
            whapiToken: whapiToken,
            chat_id: chat_id,
            type: "chat",
            from_me: true,
            text: { body: processedMessage },
          });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  useEffect(() => {
    fetchScheduledMessages();
  }, []);
  const deleteCustomFieldFromAllContacts = async (fieldName: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, "user", user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const contactsCollectionRef = collection(
        firestore,
        `companies/${companyId}/contacts`
      );
      const contactsSnapshot = await getDocs(contactsCollectionRef);

      const batch = writeBatch(firestore);

      contactsSnapshot.forEach((doc) => {
        const contactRef = doc.ref;
        batch.update(contactRef, {
          [`customFields.${fieldName}`]: deleteField(),
        });
      });

      await batch.commit();

      // Update local state
      setContacts((prevContacts) =>
        prevContacts.map((contact) => {
          const { [fieldName]: _, ...restCustomFields } =
            contact.customFields || {};
          return {
            ...contact,
            customFields: restCustomFields,
          };
        })
      );

      toast.success(`Custom field "${fieldName}" removed from all contacts.`);
    } catch (error) {
      console.error("Error removing custom field from all contacts:", error);
      toast.error("Failed to remove custom field from all contacts.");
    }
  };
  const fetchScheduledMessages = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Get user/company data from your backend
      const userResponse = await fetch(
        `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
          userEmail
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        console.error("Failed to fetch user/company data");
        return;
      }

      const userData = await userResponse.json();
      const companyId = userData.userData.companyId;

      if (!companyId) {
        console.error("No company ID found");
        return;
      }

      // Fetch scheduled messages from your localhost API
      const scheduledMessagesResponse = await fetch(
        `${baseUrl}/api/scheduled-messages?companyId=${encodeURIComponent(
          companyId
        )}&status=scheduled`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!scheduledMessagesResponse.ok) {
        console.error("Failed to fetch scheduled messages");
        return;
      }

      const scheduledMessagesData = await scheduledMessagesResponse.json();
      console.log("Scheduled messages fetched:", scheduledMessagesData);
      const messages: ScheduledMessage[] =
        scheduledMessagesData.messages || scheduledMessagesData || [];

      // Sort messages by scheduledTime - handle string dates properly
      messages.sort((a, b) => {
        const timeA = new Date(a.scheduledTime).getTime();
        const timeB = new Date(b.scheduledTime).getTime();
        return timeA - timeB;
      });
      setScheduledMessages(messages);
      console.log("Scheduled messages fetched:", messages);
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
    }
  };

  // Helper to get current user email from localStorage or auth
  const getCurrentUserEmail = () => {
    const userDataStr = localStorage.getItem("userData");
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        return userData.email || null;
      } catch {
        return null;
      }
    } else {
      return localStorage.getItem("userEmail");
    }
  };

  const handleSendNow = async (message: any) => {
    try {
      console.log("Sending message now:", message);
      // Get user and company data
      const email = getCurrentUserEmail();
      if (!email) throw new Error("User not authenticated");

      if (!companyId) throw new Error("Company ID not available");

      // Use the baseUrl from state or default
      const apiUrl = baseUrl;

      // Helper to determine API endpoint based on mediaUrl
      const getApiEndpoint = (mediaUrl: string | undefined, chatId: string) => {
        if (!mediaUrl)
          return `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`;
        const ext = mediaUrl.split(".").pop()?.toLowerCase();
        if (!ext)
          return `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`;
        if (["mp4", "mov", "avi", "webm"].includes(ext)) {
          return `${apiUrl}/api/v2/messages/video/${companyId}/${chatId}`;
        }
        if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) {
          return `${apiUrl}/api/v2/messages/image/${companyId}/${chatId}`;
        }
        if (
          ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)
        ) {
          return `${apiUrl}/api/v2/messages/document/${companyId}/${chatId}`;
        }
        return `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`;
      };

      // Try to get userData from employeeList or localStorage for phoneIndex/userName fallback
      let userData: any = null;
      const userDataStr = localStorage.getItem("userData");
      if (userDataStr) {
        try {
          userData = JSON.parse(userDataStr);
        } catch {}
      }

      // Derive chatIds from contactIds/contactId
      let chatIds: string[] = [];
      if (message.multiple && Array.isArray(message.contactIds)) {
        chatIds = message.contactIds
          .map((cid: string) => {
            const phone = cid.split("-")[1];
            return phone ? `${phone}@c.us` : null;
          })
          .filter(Boolean);
      } else if (!message.multiple && message.contactId) {
        const phone = message.contactId.split("-")[1];
        if (phone) chatIds = [`${phone}@c.us`];
      }

      const isConsolidated = message.isConsolidated === true;

      let contactList: Contact[] = [];
      if (isConsolidated && Array.isArray(message.contactIds)) {
        contactList = message.contactIds
          .map((cid: string) => {
            const phone = cid.split("-")[1];
            return contacts.find((c) => c.phone?.replace(/\D/g, "") === phone);
          })
          .filter(Boolean) as Contact[];
      } else if (!isConsolidated && message.contactId) {
        const phone = message.contactId.split("-")[1];
        const found = contacts.find(
          (c) => c.phone?.replace(/\D/g, "") === phone
        );
        if (found) contactList = [found];
      }

      // For each chatId, process placeholders before sending
      const sendPromises = chatIds.map(async (chatId: string, idx: number) => {
        let mainMessage =
          (isConsolidated &&
            Array.isArray(message.messages) &&
            message.messages.find((msg: any) => msg.isMain === true)) ||
          (Array.isArray(message.messages) && message.messages[0]) ||
          message;

        // Find the corresponding contact for this chatId
        let contact: Contact | undefined;
        if (contactList.length === chatIds.length) {
          contact = contactList[idx];
        } else {
          // fallback: match by phone number
          const phoneNumber = chatId.split("@")[0];
          contact = contacts.find(
            (c) => c.phone?.replace(/\D/g, "") === phoneNumber
          );
        }

        // Process message with contact data and custom fields
        let processedMessage =
          mainMessage.messageContent || mainMessage.text || "";

        if (contact) {
          processedMessage = processedMessage
            .replace(/@{contactName}/g, contact.contactName || "")
            .replace(/@{firstName}/g, contact.contactName?.split(" ")[0] || "")
            .replace(/@{lastName}/g, contact.lastName || "")
            .replace(/@{email}/g, contact.email || "")
            .replace(/@{phone}/g, contact.phone || "")
            .replace(/@{vehicleNumber}/g, contact.vehicleNumber || "")
            .replace(/@{branch}/g, contact.branch || "")
            .replace(/@{expiryDate}/g, contact.expiryDate || "")
            .replace(/@{ic}/g, contact.ic || "");

          if (contact.customFields) {
            Object.entries(contact.customFields).forEach(
              ([fieldName, value]) => {
                const placeholder = new RegExp(`@{${fieldName}}`, "g");
                processedMessage = processedMessage.replace(
                  placeholder,
                  value || ""
                );
              }
            );
          }
        }

        // If mediaUrl exists, send as media
        if (mainMessage.mediaUrl) {
          const endpoint = getApiEndpoint(mainMessage.mediaUrl, chatId);
          const body: any = {
            phoneIndex: message.phoneIndex || userData?.phone || 0,
            userName: userData?.name || email || "",
          };
          if (endpoint.includes("/video/")) {
            body.videoUrl = mainMessage.mediaUrl;
            body.caption = processedMessage;
          } else if (endpoint.includes("/image/")) {
            body.imageUrl = mainMessage.mediaUrl;
            body.caption = processedMessage;
          } else if (endpoint.includes("/document/")) {
            body.documentUrl = mainMessage.mediaUrl;
            body.filename = mainMessage.fileName || "";
            body.caption = processedMessage;
          }
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            throw new Error(`Failed to send media message to ${chatId}`);
          }
        } else {
          // No media, send as text
          const response = await fetch(
            `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: processedMessage,
                phoneIndex: message.phoneIndex || userData?.phone || 0,
                userName: userData?.name || email || "",
              }),
            }
          );
          if (!response.ok) {
            throw new Error(`Failed to send message to ${chatId}`);
          }
        }
      });
      // Delete the scheduled message
      if (message.scheduleId) {
        // Call NeonDB API to delete scheduled message using the correct endpoint
        const deleteResponse = await fetch(
          `${apiUrl}/api/schedule-message/${companyId}/${message.scheduleId}`,
          {
            method: "DELETE",
          }
        );
        if (!deleteResponse.ok) {
          console.warn("Failed to delete scheduled message from database");
        }
      }
      await Promise.all(sendPromises);
      toast.success("Messages sent successfully!");
      await fetchScheduledMessages();
      return;
    } catch (error) {
      console.error("Error sending messages:", error);
      toast.error("Failed to send messages. Please try again.");
    }
  };

  const handleEditScheduledMessage = (message: ScheduledMessage) => {
    console.log("Editing scheduled message:", message);
    setCurrentScheduledMessage(message);
    setBlastMessage(message.messageContent || "");
    setEditScheduledMessageModal(true);
  };

  const insertPlaceholder = (field: string) => {
    const placeholder = `@{${field}}`;
    // Get the current cursor position from the textarea
    const textarea = document.querySelector(
      'textarea[placeholder="Enter your message here..."]'
    ) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = blastMessage;

      // Insert placeholder at cursor position
      const newValue =
        currentValue.substring(0, start) +
        placeholder +
        currentValue.substring(end);
      setBlastMessage(newValue);

      // Set cursor position after the inserted placeholder
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + placeholder.length;
        textarea.focus();
      }, 0);
    } else {
      // Fallback: append to end
      setBlastMessage((prevMessage) => prevMessage + placeholder);
    }
  };

  const handleDeleteScheduledMessage = async (messageId: string) => {
    try {
      // Get user and company info from localStorage or your app state
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }
      // Fetch user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );
      if (!userResponse.ok) {
        toast.error("Failed to fetch user config");
        return;
      }
      const userData = await userResponse.json();
      const companyId = userData?.company_id;
      if (!companyId) {
        toast.error("Company ID not found!");
        return;
      }

      // Call the backend API to delete the scheduled message
      const response = await axios.delete(
        `${baseUrl}/api/schedule-message/${companyId}/${messageId}`
      );
      if (response.status === 200 && response.data.success) {
        setScheduledMessages((prev) =>
          prev.filter((msg) => msg.id !== messageId)
        );
        toast.success("Scheduled message deleted successfully!");
        await fetchScheduledMessages();
      } else {
        throw new Error(
          response.data.message || "Failed to delete scheduled message."
        );
      }
    } catch (error) {
      console.error("Error deleting scheduled message:", error);
      toast.error("Failed to delete scheduled message.");
    }
  };

  const handleEditMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSizeInMB = 20;
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

      if (file.type.startsWith("video/") && file.size > maxSizeInBytes) {
        toast.error(
          "The video file is too big. Please select a file smaller than 20MB."
        );
        return;
      }

      setEditMediaFile(file);
    }
  };

  const handleEditDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditDocumentFile(e.target.files[0]);
    }
  };

  interface BaseMessageContent {
    text: string;
    type: string;
    url: string;
    mimeType: string;
    fileName: string;
    caption: string;
  }

  interface MessageContent extends BaseMessageContent {
    isMain?: boolean;
    [key: string]: string | boolean | undefined;
  }

  const handleSaveScheduledMessage = async () => {
    try {
      console.log("Saving scheduled message:", currentScheduledMessage);
      if (!blastMessage.trim()) {
        toast.error("Message text cannot be empty");
        return;
      }
      if (!currentScheduledMessage) {
        toast.error("No message selected for editing");
        return;
      }
      // Determine recipients based on 'multiple'
      let recipientIds: string[] = [];
      if (currentScheduledMessage.multiple) {
        // If multiple, use contactIds (array)
        if (
          !currentScheduledMessage.contactIds ||
          currentScheduledMessage.contactIds.length === 0
        ) {
          toast.error("No recipients for this message");
          return;
        }
        recipientIds = currentScheduledMessage.contactIds;
      } else {
        // If not multiple, use contactId (single)
        if (!currentScheduledMessage.contactId) {
          toast.error("No recipient for this message");
          return;
        }
        recipientIds = [currentScheduledMessage.contactId];
      }

      // Upload new media or document if provided
      let newMediaUrl = currentScheduledMessage.mediaUrl || "";
      let newDocumentUrl = currentScheduledMessage.documentUrl || "";
      let newFileName = currentScheduledMessage.fileName || "";
      let newMimeType = currentScheduledMessage.mimeType || "";

      if (editMediaFile) {
        newMediaUrl = await uploadFile(editMediaFile);
        newMimeType = editMediaFile.type;
      }
      if (editDocumentFile) {
        newDocumentUrl = await uploadFile(editDocumentFile);
        newFileName = editDocumentFile.name;
        newMimeType = editDocumentFile.type;
      }

      // Get user/company info from localStorage or your app state
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        return;
      }
      // Fetch user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );
      if (!userResponse.ok) {
        toast.error("Failed to fetch user config");
        return;
      }
      const userData = await userResponse.json();
      const companyId = userData?.company_id;
      if (!companyId) {
        toast.error("Company ID not found!");
        return;
      }

      // Prepare processedMessages (replace placeholders)
      const processedMessages = (recipientIds || [])
        .map((chatId) => {
          let phoneNumber = "";
          if (typeof chatId === "string") {
            const parts = chatId.split("-");
            phoneNumber = parts.length > 1 ? parts.slice(1).join("-") : chatId;
          }
          phoneNumber = phoneNumber.split("@")[0];
          let contact =
            contacts.find((c) => c.chat_id === chatId) ||
            contacts.find((c) => c.phone?.replace(/\D/g, "") === phoneNumber);
          if (!contact) return null;
          let processedMessage = blastMessage
            .replace(/@{contactName}/g, contact.contactName || "")
            .replace(/@{firstName}/g, contact.firstName || "")
            .replace(/@{lastName}/g, contact.lastName || "")
            .replace(/@{email}/g, contact.email || "")
            .replace(/@{phone}/g, contact.phone || "")
            .replace(/@{vehicleNumber}/g, contact.vehicleNumber || "")
            .replace(/@{branch}/g, contact.branch || "")
            .replace(/@{expiryDate}/g, contact.expiryDate || "")
            .replace(/@{ic}/g, contact.ic || "");
          // Custom fields
          if (contact.customFields) {
            Object.entries(contact.customFields).forEach(
              ([fieldName, value]) => {
                const placeholder = new RegExp(`@{${fieldName}}`, "g");
                processedMessage = processedMessage.replace(
                  placeholder,
                  value || ""
                );
              }
            );
          }
          return {
            chatId,
            message: processedMessage,
            contactData: contact,
          };
        })
        .filter(Boolean);

      // Prepare consolidated messages array (media, document, text)
      // Ensure all fields are defined and match the ScheduledMessage.messages type
      const consolidatedMessages: {
        [x: string]: string | boolean;
        text: string;
      }[] = [];
      if (newMediaUrl) {
        consolidatedMessages.push({
          type: "media",
          text: "",
          url: newMediaUrl,
          mimeType: newMimeType || "",
          caption: "",
          fileName: "",
          isMain: false,
        });
      }
      if (newDocumentUrl) {
        consolidatedMessages.push({
          type: "document",
          text: "",
          url: newDocumentUrl,
          fileName: newFileName || "",
          mimeType: newMimeType || "",
          caption: "",
          isMain: false,
        });
      }
      consolidatedMessages.push({
        type: "text",
        text: blastMessage,
        url: "",
        mimeType: "",
        fileName: "",
        caption: "",
        isMain: true,
      });

      // Prepare scheduledTime as ISO string
      let scheduledTime = currentScheduledMessage.scheduledTime;
      if (
        scheduledTime &&
        typeof scheduledTime === "object" &&
        scheduledTime !== null &&
        (scheduledTime as any) instanceof Date
      ) {
        scheduledTime = (scheduledTime as Date).toISOString();
      } else if (
        scheduledTime &&
        typeof scheduledTime === "object" &&
        scheduledTime !== null &&
        "seconds" in scheduledTime
      ) {
        scheduledTime = new Date(
          (scheduledTime as any).seconds * 1000
        ).toISOString();
      }

      // Prepare updated message data for SQL backend
      const updatedMessageData: ScheduledMessage = {
        ...currentScheduledMessage,
        message: blastMessage,
        messages: consolidatedMessages,
        processedMessages: processedMessages.filter(
          Boolean
        ) as ScheduledMessage["processedMessages"],
        documentUrl: newDocumentUrl,
        fileName: newFileName,
        mediaUrl: newMediaUrl,
        mimeType: newMimeType,
        scheduledTime,
        status: "scheduled",
        isConsolidated: true,
      };

      // Use scheduleId if present, otherwise fallback to id
      const sId =
        currentScheduledMessage.scheduleId || currentScheduledMessage.id;

      // Send PUT request to update the scheduled message
      const response = await axios.put(
        `${baseUrl}/api/schedule-message/${companyId}/${sId}`,
        updatedMessageData
      );

      if (response.status === 200 && response.data.success) {
        setScheduledMessages((prev) =>
          prev.map((msg) =>
            msg.id === currentScheduledMessage.id ? updatedMessageData : msg
          )
        );
        setEditScheduledMessageModal(false);
        setEditMediaFile(null);
        setEditDocumentFile(null);
        toast.success("Scheduled message updated successfully!");
        await fetchScheduledMessages();
      } else {
        throw new Error(
          response.data.message || "Failed to update scheduled message"
        );
      }
    } catch (error) {
      console.error("Error updating scheduled message:", error);
      toast.error("Failed to update scheduled message.");
    }
  };

  // Add this function to process messages when they're displayed
  const processScheduledMessage = (message: ScheduledMessage) => {
    if (!message.templateData?.hasPlaceholders) {
      return message.message;
    }

    // If the message has processed messages, use those
    if (message.processedMessages && message.processedMessages.length > 0) {
      // Return a summary or the first processed message
      return `Template: ${message.message}\nExample: ${message.processedMessages[0].message}`;
    }

    return message.message;
  };

  // Update the display of scheduled messages to use the processed version
  const renderScheduledMessage = (message: ScheduledMessage) => {
    return (
      <p className="text-gray-800 dark:text-gray-200 mb-2 font-medium text-md line-clamp-2">
        {processScheduledMessage(message)}
        {message.templateData?.hasPlaceholders && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            (Uses placeholders)
          </span>
        )}
      </p>
    );
  };

  // Add this function to format the date
  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContactsSearch.length) {
      setSelectedContacts([]);
    } else {
      // Create a reversed copy of the filtered contacts array
      const reversedContacts = [...filteredContactsSearch].reverse();

      setSelectedContacts(reversedContacts);
    }
  };

  const handleDeselectPage = () => {
    // Deselect all contacts from current page
    const currentContactIds = new Set(
      currentContacts.map((contact) => contact.id)
    );
    setSelectedContacts((prevSelected) =>
      prevSelected.filter((contact) => !currentContactIds.has(contact.id))
    );
  };

  const handleSelectCurrentPage = () => {
    const areAllCurrentSelected = currentContacts.every((contact) =>
      selectedContacts.some((sc) => sc.id === contact.id)
    );

    if (areAllCurrentSelected) {
      // If all current page contacts are selected, deselect them
      setSelectedContacts((prevSelected) =>
        prevSelected.filter(
          (contact) => !currentContacts.some((cc) => cc.id === contact.id)
        )
      );
    } else {
      // If not all current page contacts are selected, select them all
      const currentPageContacts = currentContacts.filter(
        (contact) => !selectedContacts.some((sc) => sc.id === contact.id)
      );
      setSelectedContacts((prevSelected) => [
        ...prevSelected,
        ...currentPageContacts,
      ]);
    }
  };

  useEffect(() => {
    if (contacts.length > 0) {
      const firstContact = contacts[0];

      // Only add new custom fields to visible columns
      if (firstContact.customFields) {
        setVisibleColumns((prev) => {
          const newColumns = { ...prev };
          Object.keys(firstContact.customFields || {}).forEach((field) => {
            if (!(field in prev)) {
              newColumns[field] = true;
            }
          });
          // Save to localStorage after updating
          localStorage.setItem(
            "contactsVisibleColumns",
            JSON.stringify(newColumns)
          );
          return newColumns;
        });
      }

      // Update column order if new fields are found
      setColumnOrder((prev) => {
        const customFields = firstContact.customFields
          ? Object.keys(firstContact.customFields).map(
              (field) => `customField_${field}`
            )
          : [];

        const existingCustomFields = prev.filter((col) =>
          col.startsWith("customField_")
        );
        const newCustomFields = customFields.filter(
          (field) => !prev.includes(field)
        );

        if (newCustomFields.length === 0) return prev;

        // Remove existing custom fields and add all custom fields before 'actions'
        const baseColumns = prev.filter(
          (col) => !col.startsWith("customField_") && col !== "actions"
        );
        const newOrder = [...baseColumns, ...customFields, "actions"];
        localStorage.setItem("contactsColumnOrder", JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, [contacts]);

  const renderTags = (tags: string[] | undefined, contact: Contact) => {
    if (!tags || tags.length === 0) return null;

    // Filter out empty tags
    const filteredTags = tags.filter((tag) => tag && tag.trim() !== "");

    if (filteredTags.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {filteredTags.map((tag, index) => (
          <span
            key={index}
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              // Make case-insensitive comparison
              employeeNames.some(
                (name) => name.toLowerCase() === tag.toLowerCase()
              )
                ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
                : "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
            }`}
          >
            {tag}
            <button
              className="absolute top-0 right-0 hidden group-hover:block bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(contact.contact_id!, tag);
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    );
  };

  // Update handleDownloadSampleCsv to use visible columns
  const handleDownloadSampleCsv = () => {
    // Define all possible contact fields
    const allFields = [
      "contactName",
      "lastName",
      "phone",
      "email",
      "companyName",
      "address1",
      "city",
      "state",
      "postalCode",
      "country",
      "branch",
      "expiryDate",
      "vehicleNumber",

      "IC",
      "notes",
      ...Object.keys(contacts[0]?.customFields || {}), // Include any custom fields
    ];

    // Create sample data with all fields
    const sampleData = [
      allFields.join(","),
      allFields
        .map((field) => {
          switch (field) {
            case "phone":
              return "60123456789";

            case "email":
              return "john@example.com";
            case "IC":
              return "123456-78-9012";
            case "expiryDate":
              return "2024-12-31";
            default:
              return `Sample ${field}`;
          }
        })
        .join(","),
    ].join("\n");

    const blob = new Blob([sampleData], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "sample_contacts.csv");
  };

  const cleanPhoneNumber = (phone: string): string | null => {
    if (!phone || phone === "#ERROR!") return null;

    // Remove all non-numeric characters except '+'
    let cleaned = phone.replace(/[^0-9+]/g, "");

    // If already starts with +
    if (cleaned.startsWith("+")) {
      // Check if there's a country code after the +
      if (cleaned.charAt(1) === "0") {
        // If it starts with +0, add 6 after the + and before the 0
        cleaned = `+6${cleaned.substring(1)}`;
      } else if (!/^\+[1-9]/.test(cleaned)) {
        // If there's no digit after +, add 6
        cleaned = `+6${cleaned.substring(1)}`;
      }
      return cleaned.length >= 10 ? cleaned : null;
    }

    // Check if the number starts with a valid country code (like 60, 65, 62, etc.)
    if (
      /^(60|65|62|61|63|66|84|95|855|856|91|92|93|94|977|880|881|882|883|886|888|960|961|962|963|964|965|966|967|968|970|971|972|973|974|975|976|992|993|994|995|996|998)/.test(
        cleaned
      )
    ) {
      return cleaned.length >= 10 ? `+${cleaned}` : null;
    }

    // For numbers without + prefix
    if (cleaned.startsWith("0")) {
      // If it starts with 0, add +6 before the number
      return cleaned.length >= 9 ? `+6${cleaned}` : null;
    }

    // Add +6 prefix for Malaysian numbers if missing + prefix
    return cleaned.length >= 9 ? `+6${cleaned}` : null;
  };

  const parseCSV = async (): Promise<Array<any>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) {
            throw new Error("Failed to read CSV file content");
          }

          // Use Papa Parse for better CSV handling
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                console.error("CSV parsing errors:", results.errors);
                throw new Error("Error parsing CSV file");
              }

              if (results.data.length === 0) {
                throw new Error("No valid data rows found in CSV file");
              }

              // Log for debugging
              console.log("Parsed CSV data:", {
                headers: results.meta.fields,
                rowCount: results.data.length,
                firstRow: results.data[0],
              });

              resolve(results.data);
            },
            error: (error: any) => {
              console.error("Papa Parse error:", error);
              reject(new Error("Failed to parse CSV file"));
            },
          });
        } catch (error) {
          console.error("CSV parsing error details:", error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(new Error("Failed to read CSV file"));
      };

      if (selectedCsvFile) {
        reader.readAsText(selectedCsvFile);
      } else {
        reject(new Error("No file selected"));
      }
    });
  };

  const handleCsvImport = async () => {
    if (!selectedCsvFile) {
      toast.error("Please select a CSV file to import.");
      return;
    }

    try {
      setLoading(true);

      // Get user and company data
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) throw new Error("User not authenticated");

      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!userResponse.ok) throw new Error("Failed to fetch user config");
      const userData = await userResponse.json();
      const companyId = userData?.company_id;
      if (!companyId) throw new Error("Company ID not found!");

      // Parse CSV data
      const csvContacts = await parseCSV();

      // Define standard field mappings (case-insensitive)
      const standardFields = {
        phone: [
          "phone",
          "mobile",
          "tel",
          "telephone",
          "contact number",
          "phone number",
        ],
        contactName: [
          "contactname",
          "contact name",
          "name",
          "full name",
          "customer name",
        ],
        email: ["email", "e-mail", "mail"],
        lastName: ["lastname", "last name", "surname", "family name"],
        companyName: ["companyname", "company name", "company", "organization"],
        address1: ["address1", "address", "street address", "location"],
        city: ["city", "town"],
        state: ["state", "province", "region"],
        postalCode: [
          "postalcode",
          "postal code",
          "zip",
          "zip code",
          "postcode",
        ],
        country: ["country", "nation"],
        branch: ["branch", "department", "location"],
        expiryDate: [
          "expirydate",
          "expiry date",
          "expiration",
          "expire date",
          "expiry",
          "expiryDate",
        ],
        vehicleNumber: [
          "vehiclenumber",
          "vehicle number",
          "vehicle no",
          "car number",
          "vehiclenumber",
          "vehicle_number",
        ],
        ic: ["ic", "identification", "id number", "IC"],
        notes: ["notes", "note", "comments", "remarks"],
        leadNumber: ["lead_number", "leadnumber", "lead number"],
        phoneIndex: ["phone_index", "phoneindex", "phone index"],
      };

      // Validate and prepare contacts for import
      const validContacts = csvContacts.map((contact) => {
        const baseContact: any = {
          customFields: {},
          tags: [...selectedImportTags],
          ic: null,
          expiryDate: null,
          vehicleNumber: null,
          branch: null,
          contactName: null,
          email: null,
          phone: null,
          address1: null,
        };

        Object.entries(contact).forEach(([header, value]) => {
          const headerLower = header.toLowerCase().trim();

          // Check if the header is a tag column (tag 1 through tag 10)
          const tagMatch = headerLower.match(/^tag\s*(\d+)$/);
          if (tagMatch && Number(tagMatch[1]) <= 10) {
            if (value && typeof value === "string" && value.trim()) {
              baseContact.tags.push(value.trim());
            }
            return;
          }

          // Try to match with standard fields
          let matched = false;
          for (const [fieldName, aliases] of Object.entries(standardFields)) {
            const fieldNameLower = fieldName.toLowerCase();
            if (
              aliases.map((a) => a.toLowerCase()).includes(headerLower) ||
              headerLower === fieldNameLower
            ) {
              if (fieldName === "phone") {
                const cleanedPhone = cleanPhoneNumber(value as string);
                if (cleanedPhone) {
                  baseContact[fieldName] = cleanedPhone;
                }
              } else if (fieldName === "notes") {
                baseContact["notes"] = value || "";
              } else if (
                fieldName === "expiryDate" ||
                fieldName === "ic" ||
                fieldName === "phoneIndex" ||
                fieldName === "leadNumber"
              ) {
                baseContact[fieldName] = value || null;
              } else {
                baseContact[fieldName] = value || "";
              }
              matched = true;
              break;
            }
          }

          // If no match found and value exists, add as custom field
          if (!matched && value && !header.match(/^\d+$/)) {
            baseContact.customFields[header] = value;
          }
        });

        baseContact.tags = [...new Set(baseContact.tags)];
        return baseContact;
      });

      // Filter out contacts without valid phone numbers
      const contactsWithValidPhones = validContacts.filter(
        (contact) => contact.phone
      );

      if (contactsWithValidPhones.length === 0) {
        throw new Error(
          "No valid contacts found in CSV. Please ensure phone numbers are present."
        );
      }

      if (contactsWithValidPhones.length < validContacts.length) {
        toast.warning(
          `Skipped ${
            validContacts.length - contactsWithValidPhones.length
          } contacts due to invalid phone numbers.`
        );
      }

      // Prepare contacts for SQL backend
      const contactsToImport = contactsWithValidPhones.map((contact) => {
        const formattedPhone = formatPhoneNumber(contact.phone);
        const contact_id = companyId + "-" + formattedPhone.split("+")[1];
        const chat_id = formattedPhone.split("+")[1] + "@c.us";
        return {
          contact_id,
          companyId,
          contactName: contact.contactName,
          name: contact.contactName,
          last_name: contact.lastName,
          email: contact.email,
          phone: formattedPhone,
          address1: contact.address1,
          companyName: contact.companyName,
          locationId: contact.locationId,
          dateAdded: new Date().toISOString(),
          unreadCount: 0,

          branch: contact.branch,
          expiryDate: contact.expiryDate,
          vehicleNumber: contact.vehicleNumber,
          ic: contact.ic,
          chat_id: chat_id,
          notes: contact.notes,
          customFields: contact.customFields,
          tags: contact.tags,
          phoneIndex: contact.phoneIndex,
          leadNumber: contact.leadNumber,
        };
      });

      // Send contacts in bulk to your SQL backend
      const response = await axios.post(`${baseUrl}/api/contacts/bulk`, {
        contacts: contactsToImport,
      });

      if (response.data.success) {
        toast.success(
          `Successfully imported ${contactsToImport.length} contacts!`
        );
        setShowCsvImportModal(false);
        setSelectedCsvFile(null);
        setSelectedImportTags([]);
        setImportTags([]);
        await fetchContacts();
      } else {
        toast.error(response.data.message || "Failed to import contacts");
      }
    } catch (error) {
      console.error("CSV Import Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import contacts"
      );
    } finally {
      setLoading(false);
    }
  };

  // Add these to your existing state declarations
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<number | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  // ... existing code ...
  const handleConfirmSyncFirebase = async () => {
    setShowSyncConfirmationModal(false);
    setIsSyncingFirebase(true);
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        toast.error("No user email found");
        setIsSyncingFirebase(false);
        return;
      }
      // Get user config to get companyId
      const userResponse = await fetch(
        `${baseUrl}/api/user/config?email=${encodeURIComponent(userEmail)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );
      if (!userResponse.ok) {
        toast.error("Failed to fetch user config");
        setIsSyncingFirebase(false);
        return;
      }
      const userData = await userResponse.json();
      const companyId = userData.company_id;
      setCompanyId(companyId);
      // Call the sync-firebase-to-neon endpoint
      const syncResponse = await fetch(
        `${baseUrl}/api/sync-firebase-to-neon/${companyId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );
      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(
          errorData.error || "Failed to start Firebase-to-Neon synchronization"
        );
      }
      const responseData = await syncResponse.json();
      if (responseData.success) {
        toast.success("Firebase-to-Neon synchronization started successfully");
      } else {
        throw new Error(
          responseData.error ||
            "Failed to start Firebase-to-Neon synchronization"
        );
      }
    } catch (error) {
      console.error("Error syncing from Firebase to Neon:", error);
      toast.error(
        "An error occurred while syncing from Firebase to Neon: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  // Add this helper function to get status color and text
  const getStatusInfo = (status: string) => {
    const statusLower = status?.toLowerCase() || "";

    // Check if the phone is connected (consistent with Chat component)
    const isConnected =
      statusLower === "ready" || statusLower === "authenticated";

    if (isConnected) {
      return {
        color:
          "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200",
        text: "Connected",
        icon: "CheckCircle" as const,
      };
    }

    // For other statuses, provide more detailed information
    switch (statusLower) {
      case "qr":
        return {
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200",
          text: "Needs QR Scan",
          icon: "QrCode" as const,
        };
      case "connecting":
        return {
          color:
            "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
          text: "Connecting",
          icon: "Loader" as const,
        };
      case "disconnected":
        return {
          color: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200",
          text: "Disconnected",
          icon: "XCircle" as const,
        };
      default:
        return {
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
          text: "Not Connected", // Changed from 'Unknown' to 'Not Connected' to match Chat component
          icon: "HelpCircle" as const,
        };
    }
  };

  // Add this helper function to get phone name
  const getPhoneName = (phoneIndex: number) => {
    // First check if we have a name in the phoneNames object
    if (phoneNames[phoneIndex]) {
      return phoneNames[phoneIndex];
    }

    // If not found in phoneNames but we have a special company ID, use predefined names
    if (companyId === "0123") {
      if (phoneIndex === 0) return "Revotrend";
      if (phoneIndex === 1) return "Storeguru";
      if (phoneIndex === 2) return "ShipGuru";
      return `Phone ${phoneIndex + 1}`;
    }

    // Default fallback - consistent with Chat component
    return `Phone ${phoneIndex + 1}`;
  };

  // Add this effect to fetch phone statuses periodically
  useEffect(() => {
    const fetchPhoneStatuses = async () => {
      try {
        console.log("fetching status");
        setIsLoadingStatus(true);

        const botStatusResponse = await axios.get(
          `${baseUrl}/api/bot-status/${companyId}`
        );

        if (botStatusResponse.status === 200) {
          const data: BotStatusResponse = botStatusResponse.data;
          let qrCodesData: QRCodeData[] = [];

          // Check if phones array exists before mapping
          if (data.phones && Array.isArray(data.phones)) {
            // Multiple phones: transform array to QRCodeData[]
            qrCodesData = data.phones.map((phone: any) => ({
              phoneIndex: phone.phoneIndex,
              status: phone.status,
              qrCode: phone.qrCode,
            }));
            setQrCodes(qrCodesData);
          } else if (
            (data.phoneCount === 1 || data.phoneCount === 0) &&
            data.phoneInfo
          ) {
            // Single phone: create QRCodeData from flat structure
            qrCodesData = [
              {
                phoneIndex: 0,
                status: data.status,
                qrCode: data.qrCode,
              },
            ];
            setQrCodes(qrCodesData);
          } else {
            setQrCodes([]);
          }

          // If no phone is selected and we have connected phones, select the first connected one
          if (selectedPhone === null && qrCodesData.length > 0) {
            const connectedPhoneIndex = qrCodesData.findIndex(
              (phone: { status: string }) =>
                phone.status === "ready" || phone.status === "authenticated"
            );
            if (connectedPhoneIndex !== -1) {
              setSelectedPhone(connectedPhoneIndex);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching phone statuses:", error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    if (companyId) {
      fetchPhoneStatuses();
      // Refresh status every 30 seconds
      const intervalId = setInterval(fetchPhoneStatuses, 30000);
      return () => clearInterval(intervalId);
    }
  }, [companyId, selectedPhone]);

  // Helper functions for the modern layout
  const removeTagFilter = (tag: string) => {
    setSelectedTagFilters((prev) => prev.filter((t) => t !== tag));
  };

  const clearAllSelections = () => {
    setSelectedContacts([]);
  };

  const handleContactCheckboxChange = (contact: Contact) => {
    const isSelected = selectedContacts.some(
      (selectedContact) =>
        selectedContact.id === contact.id ||
        selectedContact.phone === contact.phone
    );

    if (isSelected) {
      setSelectedContacts((prev) =>
        prev.filter((c) => c.id !== contact.id && c.phone !== contact.phone)
      );
    } else {
      setSelectedContacts((prev) => [...prev, contact]);
    }
  };

  const filterRecipients = (chatIds: string[] | undefined, search: string) => {
    if (!chatIds || !Array.isArray(chatIds)) {
      return [];
    }
    return chatIds.filter((chatId) => {
      // Extract phone number from different chatId formats
      let phoneNumber = "";

      if (chatId.includes("@")) {
        // Format: "60123456789@c.us" or "60123456789@s.whatsapp.net"
        phoneNumber = chatId.split("@")[0];
      } else if (chatId.includes("-")) {
        // Format: "companyId-60123456789"
        phoneNumber = chatId.split("-")[1];
      } else {
        // Just the phone number
        phoneNumber = chatId;
      }

      // Clean the phone number and add + if not present
      if (phoneNumber && !phoneNumber.startsWith("+")) {
        phoneNumber = "+" + phoneNumber;
      }

      // Find the contact by matching phone numbers
      const contact = contacts.find((c) => {
        if (!c.phone) return false;
        const cleanContactPhone = c.phone.replace(/\D/g, "");
        const cleanSearchPhone = phoneNumber.replace(/\D/g, "");
        return cleanContactPhone === cleanSearchPhone;
      });

      const contactName = contact?.contactName || phoneNumber;

      return (
        contactName.toLowerCase().includes(search.toLowerCase()) ||
        phoneNumber.includes(search) ||
        (contact?.phone && contact.phone.includes(search))
      );
    });
  };
  // Add this function to filter scheduled messages
  const getFilteredScheduledMessages = () => {
    if (!searchQuery) return scheduledMessages;

    return scheduledMessages.filter((message) => {
      // Check if message content matches search
      if (message.message?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return true;
      }

      // Check if messageContent matches search
      if (
        message.messageContent
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return true;
      }

      // Check if any recipient matches search (search through contact names)
      if (message.chatIds && Array.isArray(message.chatIds)) {
        const matchingRecipients = filterRecipients(
          message.chatIds,
          searchQuery
        );
        return matchingRecipients.length > 0;
      }

      // Also check contactIds format if chatIds is not available
      if (message.contactIds && Array.isArray(message.contactIds)) {
        const matchingRecipients = filterRecipients(
          message.contactIds,
          searchQuery
        );
        return matchingRecipients.length > 0;
      }

      // Check single contactId
      if (message.contactId) {
        const matchingRecipients = filterRecipients(
          [message.contactId],
          searchQuery
        );
        return matchingRecipients.length > 0;
      }

      return false;
    });
  };

  // Helper function to apply advanced filters to scheduled messages
  const applyAdvancedFilters = (messages: ScheduledMessage[]) => {
    let filteredMessages = messages;

    // First apply search filter if there's a search query
    if (searchQuery) {
      filteredMessages = filteredMessages.filter((message) => {
        // Check if message content matches search
        if (
          message.message?.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return true;
        }

        // Check if messageContent matches search
        if (
          message.messageContent
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
        ) {
          return true;
        }

        // Check if any recipient matches search (search through contact names)
        if (message.chatIds && Array.isArray(message.chatIds)) {
          const matchingRecipients = filterRecipients(
            message.chatIds,
            searchQuery
          );
          if (matchingRecipients.length > 0) return true;
        }

        // Also check contactIds format if chatIds is not available
        if (message.contactIds && Array.isArray(message.contactIds)) {
          const matchingRecipients = filterRecipients(
            message.contactIds,
            searchQuery
          );
          if (matchingRecipients.length > 0) return true;
        }

        // Check single contactId
        if (message.contactId) {
          const matchingRecipients = filterRecipients(
            [message.contactId],
            searchQuery
          );
          if (matchingRecipients.length > 0) return true;
        }

        return false;
      });
    }

    return filteredMessages.filter((message) => {
      // Status filter
      if (messageStatusFilter && message.status !== messageStatusFilter) {
        return false;
      }

      // Date filter
      if (messageDateFilter && message.scheduledTime) {
        const messageDate = new Date(message.scheduledTime);
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        switch (messageDateFilter) {
          case "today":
            if (messageDate < today || messageDate >= tomorrow) return false;
            break;
          case "tomorrow":
            if (
              messageDate < tomorrow ||
              messageDate >= new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
            )
              return false;
            break;
          case "this-week":
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            if (messageDate < weekStart || messageDate >= weekEnd) return false;
            break;
          case "next-week":
            const nextWeekStart = new Date(today);
            nextWeekStart.setDate(
              nextWeekStart.getDate() - nextWeekStart.getDay() + 7
            );
            const nextWeekEnd = new Date(nextWeekStart);
            nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
            if (messageDate < nextWeekStart || messageDate >= nextWeekEnd)
              return false;
            break;
          case "this-month":
            if (
              messageDate.getMonth() !== now.getMonth() ||
              messageDate.getFullYear() !== now.getFullYear()
            )
              return false;
            break;
          case "next-month":
            const nextMonth = new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              1
            );
            if (
              messageDate < nextMonth ||
              messageDate.getMonth() !== nextMonth.getMonth()
            )
              return false;
            break;
        }
      }

      // Message type filter
      if (messageTypeFilter) {
        switch (messageTypeFilter) {
          case "text":
            if (
              message.mediaUrl ||
              message.documentUrl ||
              (message.messages && message.messages.length > 1)
            )
              return false;
            break;
          case "media":
            if (!message.mediaUrl) return false;
            break;
          case "document":
            if (!message.documentUrl) return false;
            break;
          case "multiple":
            if (!message.messages || message.messages.length <= 1) return false;
            break;
        }
      }

      // Recipient filter
      if (messageRecipientFilter) {
        const hasMultipleRecipients =
          Array.isArray(message.contactIds) && message.contactIds.length > 1;
        if (messageRecipientFilter === "single" && hasMultipleRecipients)
          return false;
        if (messageRecipientFilter === "multiple" && !hasMultipleRecipients)
          return false;
      }

      return true;
    });
  };
  return (
    <>
      {/* Modern Glassmorphism Layout */}
      <div className="h-screen bg-gradient-to-br from-slate-50/80 via-blue-50/40 to-indigo-50/60 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-slate-700/70 overflow-auto relative">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100/[0.02] dark:bg-grid-slate-700/[0.05] pointer-events-none" />

        {/* Top Navigation Bar with Enhanced Glassmorphism */}
        <div className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border-b border-white/30 dark:border-slate-700/40 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/30">
          <div className="max-w-[96rem] mx-auto px-3 py-6">
            <div className="flex items-center justify-between">
              {/* Page Title & Stats */}
              <div className="flex items-center space-x-8">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                      <Lucide
                        icon="Users"
                        className="w-6 h-6 text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                      Contacts
                    </h1>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium ml-14">
                    {filteredContactsSearch.length} of {contacts.length}{" "}
                    contacts
                  </p>
                </div>

                {/* Enhanced Quick Stats Cards */}
                <div className="hidden lg:flex items-center space-x-4">
                  <div className="group relative bg-gradient-to-r from-emerald-500/15 to-green-500/10 dark:from-emerald-400/15 dark:to-green-400/10 backdrop-blur-xl border border-emerald-200/40 dark:border-emerald-700/40 px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform-gpu">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/30 to-green-50/20 dark:from-emerald-900/20 dark:to-green-900/15 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/30 to-green-500/30 dark:from-emerald-400/30 dark:to-green-400/30">
                        <Lucide
                          icon="CheckSquare"
                          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {selectedContacts.length} Selected
                      </span>
                    </div>
                  </div>
                  <div className="group relative bg-gradient-to-r from-blue-500/15 to-indigo-500/10 dark:from-blue-400/15 dark:to-indigo-400/10 backdrop-blur-xl border border-blue-200/40 dark:border-blue-700/40 px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform-gpu">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-indigo-50/20 dark:from-blue-900/20 dark:to-indigo-900/15 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/30 to-indigo-500/30 dark:from-blue-400/30 dark:to-indigo-400/30">
                        <Lucide
                          icon="Calendar"
                          className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {scheduledMessages.length} Scheduled
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Primary Actions */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="hidden sm:flex items-center space-x-2 group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-800/60 dark:to-slate-700/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-orange-300/60 dark:hover:border-orange-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-orange-500/20 rounded-xl px-4 py-2.5 hover:scale-105 transform-gpu"
                  onClick={() => {
                    if (userRole !== "3") {
                      setShowCsvImportModal(true);
                    } else {
                      toast.error(
                        "You don't have permission to import CSV files."
                      );
                    }
                  }}
                  disabled={userRole === "3"}
                >
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 dark:from-orange-400/20 dark:to-amber-400/20 backdrop-blur-sm border border-orange-200/40 dark:border-orange-700/40 group-hover:scale-110 transition-transform duration-300">
                    <Lucide
                      icon="Upload"
                      className="w-4 h-4 text-orange-600 dark:text-orange-400"
                    />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Import
                  </span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  className="flex items-center space-x-2 group bg-gradient-to-r from-blue-500/90 to-indigo-500/90 hover:from-blue-600/90 hover:to-indigo-600/90 backdrop-blur-sm border-blue-400/30 shadow-xl shadow-blue-500/30 transition-all duration-300 rounded-xl px-4 py-2.5 hover:scale-105 transform-gpu hover:shadow-2xl hover:shadow-blue-500/40"
                  onClick={() => {
                    if (userRole !== "3") {
                      setAddContactModal(true);
                    } else {
                      toast.error("You don't have permission to add contacts.");
                    }
                  }}
                  disabled={userRole === "3"}
                >
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <Lucide icon="Plus" className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-white">Add Contact</span>
                </Button>

                <Button
                  variant="outline-primary"
                  size="sm"
                  className="flex items-center space-x-2 group bg-gradient-to-r from-blue-500/15 to-indigo-500/10 dark:from-blue-400/15 dark:to-indigo-400/10 backdrop-blur-xl border border-blue-300/50 dark:border-blue-600/50 hover:border-blue-400/70 dark:hover:border-blue-500/70 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 rounded-xl px-4 py-2.5 hover:scale-105 transform-gpu"
                  onClick={() => {
                    if (userRole !== "3") {
                      setBlastMessageModal(true);
                    } else {
                      toast.error(
                        "You don't have permission to send blast messages."
                      );
                    }
                  }}
                  disabled={userRole === "3"}
                >
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 group-hover:scale-110 transition-transform duration-300">
                    <Lucide
                      icon="Send"
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    Blast Message
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area with Enhanced Glassmorphism */}
        <div className="max-w-[96rem] mx-auto px-3 py-8">
          {/* Search & Filter Bar with Modern Glass Effect */}
          <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 p-8 mb-8 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-indigo-900/10 rounded-3xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Enhanced Search Input */}
              <div className="flex-1 max-w-md">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 group-focus-within:scale-110 transition-transform duration-300">
                    <Lucide
                      icon="Search"
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <FormInput
                    type="text"
                    placeholder="Search contacts..."
                    className="pl-16 pr-4 py-4 w-full bg-white/70 dark:bg-slate-700/70 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 rounded-2xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/60 transition-all duration-300 shadow-lg hover:shadow-xl text-slate-800 dark:text-slate-200 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>

              {/* Enhanced Filter Controls */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Modern Bulk Selection */}
                <div className="flex items-center space-x-2 bg-gradient-to-r from-slate-100/70 to-slate-200/50 dark:from-slate-700/70 dark:to-slate-600/50 backdrop-blur-xl rounded-2xl p-2 border border-slate-200/50 dark:border-slate-600/50 shadow-lg">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="text-xs group bg-white/70 dark:bg-slate-600/70 backdrop-blur-sm border border-white/50 dark:border-slate-500/50 hover:bg-white/90 dark:hover:bg-slate-500/90 transition-all duration-300 rounded-xl px-3 py-2 hover:scale-105 transform-gpu hover:shadow-lg"
                    onClick={handleSelectAll}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-md bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 group-hover:scale-110 transition-transform duration-300">
                        <Lucide
                          icon="CheckSquare"
                          className="w-3 h-3 text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        All
                      </span>
                    </div>
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="text-xs group bg-white/70 dark:bg-slate-600/70 backdrop-blur-sm border border-white/50 dark:border-slate-500/50 hover:bg-white/90 dark:hover:bg-slate-500/90 transition-all duration-300 rounded-xl px-3 py-2 hover:scale-105 transform-gpu hover:shadow-lg"
                    onClick={handleSelectCurrentPage}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-md bg-gradient-to-br from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 group-hover:scale-110 transition-transform duration-300">
                        <Lucide
                          icon="Square"
                          className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Page
                      </span>
                    </div>
                  </Button>
                </div>

                {/* Modern Quick Filters */}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="flex items-center space-x-2 group bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 hover:border-blue-300/60 dark:hover:border-blue-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 rounded-2xl px-4 py-3 hover:scale-105 transform-gpu"
                  onClick={() => setShowFiltersModal(true)}
                >
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 group-hover:scale-110 transition-transform duration-300">
                    <Lucide
                      icon="Tag"
                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Tags
                  </span>
                </Button>

                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="flex items-center space-x-2 group bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 hover:border-emerald-300/60 dark:hover:border-emerald-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20 rounded-2xl px-4 py-3 hover:scale-105 transform-gpu"
                  onClick={() => setShowDateFilterModal(true)}
                >
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-700/40 group-hover:scale-110 transition-transform duration-300">
                    <Lucide
                      icon="Calendar"
                      className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Date
                  </span>
                </Button>

                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="flex items-center space-x-2 group bg-gradient-to-r from-white/70 to-white/50 dark:from-slate-700/70 dark:to-slate-600/50 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 hover:border-violet-300/60 dark:hover:border-violet-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 dark:hover:shadow-violet-500/20 rounded-2xl px-4 py-3 hover:scale-105 transform-gpu"
                  onClick={() => setShowColumnsModal(true)}
                >
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 dark:from-violet-400/20 dark:to-purple-400/20 backdrop-blur-sm border border-violet-200/40 dark:border-violet-700/40 group-hover:scale-110 transition-transform duration-300">
                    <Lucide
                      icon="Grid2x2"
                      className="w-4 h-4 text-violet-600 dark:text-violet-400"
                    />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Columns
                  </span>
                </Button>
              </div>
            </div>

            {/* Enhanced Active Filters */}
            {(selectedTagFilters.length > 0 || selectedContacts.length > 0) && (
              <div className="relative flex flex-wrap items-center gap-4 mt-8 pt-6 border-t border-white/30 dark:border-slate-600/40">
                {/* Tag Filters */}
                {selectedTagFilters.map((tag, index) => (
                  <div
                    key={index}
                    className="group flex items-center bg-gradient-to-r from-blue-500/15 to-indigo-500/10 dark:from-blue-400/15 dark:to-indigo-400/10 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 text-blue-700 dark:text-blue-300 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:bg-blue-500/25 dark:hover:bg-blue-400/25 hover:scale-105 transform-gpu hover:shadow-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/30 dark:from-blue-400/30 dark:to-indigo-400/30">
                        <Lucide
                          icon="Tag"
                          className="w-3 h-3 text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <span>Tag: {tag}</span>
                    </div>
                    <button
                      className="ml-3 p-1 rounded-full hover:bg-red-500/20 dark:hover:bg-red-400/20 transition-all duration-200 group-hover:scale-110"
                      onClick={() => removeTagFilter(tag)}
                    >
                      <Lucide
                        icon="X"
                        className="w-3.5 h-3.5 text-red-500 hover:text-red-600"
                      />
                    </button>
                  </div>
                ))}

                {/* Selected Contacts Filter */}
                {selectedContacts.length > 0 && (
                  <div className="group flex items-center bg-gradient-to-r from-emerald-500/15 to-green-500/10 dark:from-emerald-400/15 dark:to-green-400/10 backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:bg-emerald-500/25 dark:hover:bg-emerald-400/25 hover:scale-105 transform-gpu hover:shadow-lg">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded-full bg-gradient-to-br from-emerald-500/30 to-green-500/30 dark:from-emerald-400/30 dark:to-green-400/30">
                        <Lucide
                          icon="Users"
                          className="w-3 h-3 text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                      <span>{selectedContacts.length} Selected</span>
                    </div>
                    <button
                      className="ml-3 p-1 rounded-full hover:bg-red-500/20 dark:hover:bg-red-400/20 transition-all duration-200 group-hover:scale-110"
                      onClick={clearAllSelections}
                    >
                      <Lucide
                        icon="X"
                        className="w-3.5 h-3.5 text-red-500 hover:text-red-600"
                      />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Two-Column Layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content with Enhanced Glass Effect */}
            <div className="lg:flex-1 min-w-0">
              <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 overflow-hidden transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/20 via-transparent to-blue-50/20 dark:from-slate-900/10 dark:via-transparent dark:to-blue-900/10 pointer-events-none" />

                {/* Enhanced Table Header */}
                <div className="relative px-8 py-6 border-b border-white/30 dark:border-slate-700/40 bg-gradient-to-r from-slate-50/70 to-slate-100/50 dark:from-slate-800/70 dark:to-slate-700/50 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-slate-500/20 to-gray-500/20 dark:from-slate-400/20 dark:to-gray-400/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40">
                        <Lucide
                          icon="Database"
                          className="w-5 h-5 text-slate-600 dark:text-slate-400"
                        />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                          Contacts
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Manage your contact database
                        </p>
                      </div>
                    </div>

                    {/* Enhanced Table Actions */}
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="flex items-center space-x-2 group bg-gradient-to-r from-red-500/15 to-pink-500/10 dark:from-red-400/15 dark:to-pink-400/10 backdrop-blur-xl border border-red-300/50 dark:border-red-600/50 hover:border-red-400/70 dark:hover:border-red-500/70 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/20 dark:hover:shadow-red-500/30 rounded-xl px-4 py-2.5 hover:scale-105 transform-gpu"
                        onClick={() => setShowMassDeleteModal(true)}
                        disabled={selectedContacts.length === 0}
                      >
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 backdrop-blur-sm border border-red-200/40 dark:border-red-700/40 group-hover:scale-110 transition-transform duration-300">
                          <Lucide
                            icon="Trash2"
                            className="w-4 h-4 text-red-600 dark:text-red-400"
                          />
                        </div>
                        <span className="font-semibold text-red-700 dark:text-red-300">
                          Delete
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Enhanced Contacts Table */}
                <div className="overflow-x-auto">
                  {isFetching ? (
                    <div className="flex justify-center items-center h-96">
                      <div className="text-center">
                        <LoadingIcon
                          icon="spinning-circles"
                          className="w-8 h-8 mx-auto text-blue-500"
                        />
                        <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                          Fetching Data...
                        </div>
                      </div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="relative bg-gradient-to-r from-white/80 via-slate-50/60 to-white/40 dark:from-slate-700/80 dark:via-slate-800/60 dark:to-slate-700/40 backdrop-blur-2xl border-b-2 border-white/30 dark:border-slate-600/40 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30">
                        <tr>
                          <th className="relative px-6 py-6 text-left group">
                            <div className="flex items-center justify-center">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  className="rounded-xl border-2 border-slate-300/80 dark:border-slate-600/80 h-6 w-6 text-blue-600 focus:ring-3 focus:ring-blue-500/40 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm hover:border-blue-400/90 dark:hover:border-blue-500/90 hover:scale-110 transform-gpu shadow-lg"
                                  checked={selectAll}
                                  onChange={handleSelectAll}
                                />
                                {selectAll && (
                                  <div className="absolute inset-0 rounded-xl bg-blue-500/20 dark:bg-blue-400/20 pointer-events-none animate-pulse" />
                                )}
                              </div>
                            </div>
                          </th>
                          <th
                            className="relative px-6 py-6 text-left group cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-blue-100/40 dark:hover:from-blue-900/30 dark:hover:to-blue-800/20 transition-all duration-300"
                            onClick={() => handleSort("contactName")}
                          >
                            <div className="flex items-center space-x-3">
                              <div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                                  Contact
                                </span>
                              </div>
                              {sortField === "contactName" && (
                                <div className="p-1.5 rounded-lg bg-blue-500/20 dark:bg-blue-400/20 backdrop-blur-sm border border-blue-300/40 dark:border-blue-600/40">
                                  <Lucide
                                    icon={
                                      sortDirection === "asc"
                                        ? "ChevronUp"
                                        : "ChevronDown"
                                    }
                                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                  />
                                </div>
                              )}
                            </div>
                          </th>
                          <th
                            className="relative px-6 py-6 text-left group cursor-pointer hover:bg-gradient-to-r hover:from-emerald-50/60 hover:to-emerald-100/40 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/20 transition-all duration-300"
                            onClick={() => handleSort("phone")}
                          >
                            <div className="flex items-center space-x-3">
                              <div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                                  Phone Number
                                </span>
                              </div>
                              {sortField === "phone" && (
                                <div className="p-1.5 rounded-lg bg-emerald-500/20 dark:bg-emerald-400/20 backdrop-blur-sm border border-emerald-300/40 dark:border-emerald-600/40">
                                  <Lucide
                                    icon={
                                      sortDirection === "asc"
                                        ? "ChevronUp"
                                        : "ChevronDown"
                                    }
                                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                                  />
                                </div>
                              )}
                            </div>
                          </th>
                          <th className="relative px-6 py-6 text-left group">
                            <div className="flex items-center space-x-3">
                              <div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                  Tags
                                </span>
                              </div>
                            </div>
                          </th>
                          {visibleColumns.ic && (
                            <th
                              className="relative px-6 py-6 text-left group cursor-pointer hover:bg-gradient-to-r hover:from-orange-50/60 hover:to-orange-100/40 dark:hover:from-orange-900/30 dark:hover:to-orange-800/20 transition-all duration-300"
                              onClick={() => handleSort("ic")}
                            >
                              <div className="flex items-center space-x-3">
                                <div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300">
                                    IC Number
                                  </span>
                                </div>
                                {sortField === "ic" && (
                                  <div className="p-1.5 bg-orange-500/20 dark:bg-orange-400/20 backdrop-blur-sm border border-orange-300/40 dark:border-orange-600/40">
                                    <Lucide
                                      icon={
                                        sortDirection === "asc"
                                          ? "ChevronUp"
                                          : "ChevronDown"
                                      }
                                      className="w-4 h-4 text-orange-600 dark:text-orange-400"
                                    />
                                  </div>
                                )}
                              </div>
                            </th>
                          )}
                          {visibleColumns.vehicleNumber && (
                            <th
                              className="relative px-6 py-6 text-left group cursor-pointer hover:bg-gradient-to-r hover:from-cyan-50/60 hover:to-cyan-100/40 dark:hover:from-cyan-900/30 dark:hover:to-cyan-800/20 transition-all duration-300"
                              onClick={() => handleSort("vehicleNumber")}
                            >
                              <div className="flex items-center space-x-3">
                                <div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                                    Vehicle Number
                                  </span>
                                </div>
                                {sortField === "vehicleNumber" && (
                                  <div className="p-1.5 bg-cyan-500/20 dark:bg-cyan-400/20 backdrop-blur-sm border border-cyan-300/40 dark:border-cyan-600/40">
                                    <Lucide
                                      icon={
                                        sortDirection === "asc"
                                          ? "ChevronUp"
                                          : "ChevronDown"
                                      }
                                      className="w-4 h-4 text-cyan-600 dark:text-cyan-400"
                                    />
                                  </div>
                                )}
                              </div>
                            </th>
                          )}
                          {visibleColumns.branch && (
                            <th
                              className="relative px-6 py-6 text-left group cursor-pointer hover:bg-gradient-to-r hover:from-pink-50/60 hover:to-pink-100/40 dark:hover:from-pink-900/30 dark:hover:to-pink-800/20 transition-all duration-300"
                              onClick={() => handleSort("branch")}
                            >
                              <div className="flex items-center space-x-3">
                                <div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300">
                                    Branch
                                  </span>
                                </div>
                                {sortField === "branch" && (
                                  <div className="p-1.5 bg-pink-500/20 dark:bg-pink-400/20 backdrop-blur-sm border border-pink-300/40 dark:border-pink-600/40">
                                    <Lucide
                                      icon={
                                        sortDirection === "asc"
                                          ? "ChevronUp"
                                          : "ChevronDown"
                                      }
                                      className="w-4 h-4 text-pink-600 dark:text-pink-400"
                                    />
                                  </div>
                                )}
                              </div>
                            </th>
                          )}
                          {visibleColumns.expiryDate && (
                            <th
                              className="relative px-6 py-6 text-left group cursor-pointer hover:bg-gradient-to-r hover:from-purple-50/60 hover:to-purple-100/40 dark:hover:from-purple-900/30 dark:hover:to-purple-800/20 transition-all duration-300"
                              onClick={() => handleSort("expiryDate")}
                            >
                              <div className="flex items-center space-x-3">
                                <div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                                    Expiry Date
                                  </span>
                                </div>
                                {sortField === "expiryDate" && (
                                  <div className="p-1.5 bg-purple-500/20 dark:bg-purple-400/20 backdrop-blur-sm border border-purple-300/40 dark:border-purple-600/40">
                                    <Lucide
                                      icon={
                                        sortDirection === "asc"
                                          ? "ChevronUp"
                                          : "ChevronDown"
                                      }
                                      className="w-4 h-4 text-purple-600 dark:text-purple-400"
                                    />
                                  </div>
                                )}
                              </div>
                            </th>
                          )}
                          {visibleColumns.notes && (
                            <th className="relative px-6 py-6 text-left group">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                    Notes
                                  </span>
                                </div>
                              </div>
                            </th>
                          )}
                          <th
                            className="relative px-6 py-6 text-left group cursor-pointer hover:bg-gradient-to-r hover:from-indigo-50/60 hover:to-indigo-100/40 dark:hover:from-indigo-900/30 dark:hover:to-indigo-800/20 transition-all duration-300"
                            onClick={() => handleSort("createdAt")}
                          >
                            <div className="flex items-center space-x-3">
                              <div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                                  Date Added
                                </span>
                              </div>
                              {sortField === "createdAt" && (
                                <div className="p-1.5 bg-indigo-500/20 dark:bg-indigo-400/20 backdrop-blur-sm border border-indigo-300/40 dark:border-indigo-600/40">
                                  <Lucide
                                    icon={
                                      sortDirection === "asc"
                                        ? "ChevronUp"
                                        : "ChevronDown"
                                    }
                                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                                  />
                                </div>
                              )}
                            </div>
                          </th>
                          <th className="relative px-6 py-6 text-right group">
                            <div className="flex items-center justify-end space-x-3">
                              <div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                  Actions
                                </span>
                              </div>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl divide-y divide-white/20 dark:divide-slate-700/40">
                        {/* Map through actual contact data */}
                        {currentContacts.map((contact, index) => {
                          const isSelected = selectedContacts.some(
                            (selectedContact) =>
                              selectedContact.id === contact.id
                          );

                          return (
                            <tr
                              key={contact.id || index}
                              className="group relative hover:bg-gradient-to-r hover:from-white/60 hover:to-slate-50/40 dark:hover:from-slate-700/60 dark:hover:to-slate-800/40 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/20 dark:hover:shadow-slate-900/30 backdrop-blur-sm border-b border-white/10 dark:border-slate-700/20 last:border-b-0"
                            >
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    className="rounded-lg border-2 border-slate-300/60 dark:border-slate-600/60 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400/80 dark:hover:border-blue-500/80"
                                    checked={isSelected}
                                    onChange={() =>
                                      handleContactCheckboxChange(contact)
                                    }
                                  />
                                  {isSelected && (
                                    <div className="absolute inset-0 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 pointer-events-none animate-pulse" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex items-center group/contact">
                                  <div className="flex-shrink-0 h-12 w-12 relative">
                                    {contact.profileUrl ? (
                                      <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/20 dark:shadow-blue-500/30 border border-white/30 dark:border-slate-600/30 group-hover/contact:scale-110 transition-transform duration-300">
                                        <img
                                          src={contact.profileUrl}
                                          alt={
                                            contact.contactName ||
                                            contact.firstName ||
                                            "Contact"
                                          }
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            // Fallback to initials if image fails to load
                                            const target =
                                              e.currentTarget as HTMLImageElement;
                                            const fallback =
                                              target.nextElementSibling as HTMLDivElement;
                                            if (fallback) {
                                              target.style.display = "none";
                                              fallback.style.display = "flex";
                                            }
                                          }}
                                        />
                                        <div className="hidden h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/80 via-violet-500/80 to-purple-600/80 backdrop-blur-sm items-center justify-center text-white font-bold text-sm">
                                          {contact.contactName
                                            ? contact.contactName
                                                .charAt(0)
                                                .toUpperCase()
                                            : contact.firstName
                                                ?.charAt(0)
                                                ?.toUpperCase() || "U"}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/80 via-violet-500/80 to-purple-600/80 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm shadow-xl shadow-blue-500/20 dark:shadow-blue-500/30 border border-white/30 dark:border-slate-600/30 group-hover/contact:scale-110 transition-transform duration-300">
                                        {contact.contactName
                                          ? contact.contactName
                                              .charAt(0)
                                              .toUpperCase()
                                          : contact.firstName
                                              ?.charAt(0)
                                              ?.toUpperCase() || "U"}
                                      </div>
                                    )}
                                    <div className="absolute -inset-1 bg-gradient-to-br from-blue-400/30 to-violet-600/30 rounded-2xl blur opacity-0 group-hover/contact:opacity-100 transition-opacity duration-300" />
                                  </div>
                                  <div className="ml-5">
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover/contact:text-blue-600 dark:group-hover/contact:text-blue-400 transition-colors duration-200">
                                      {contact.contactName ||
                                        `${contact.firstName || ""} ${
                                          contact.lastName || ""
                                        }`.trim() ||
                                        "Unknown"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="space-y-2">
                                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                    {contact.phone || "No phone"}
                                  </div>
                                  {contact.phone && (
                                    <button
                                      onClick={() => handleClick(contact.phone)}
                                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-50/80 to-blue-100/60 dark:from-blue-900/40 dark:to-blue-800/40 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 rounded-xl hover:from-blue-100/90 hover:to-blue-200/80 dark:hover:from-blue-800/60 dark:hover:to-blue-700/60 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 hover:scale-105 transform-gpu"
                                    >
                                      <Lucide
                                        icon="MessageCircle"
                                        className="w-3 h-3"
                                      />
                                      <span>Open Chat</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="flex flex-wrap gap-2.5">
                                  {contact.tags && contact.tags.length > 0 ? (
                                    contact.tags
                                      .slice(0, 2)
                                      .map((tag, tagIndex) => (
                                        <span
                                          key={tagIndex}
                                          className={`group/tag relative inline-flex items-center px-4 py-2 rounded-2xl text-xs font-bold backdrop-blur-xl transition-all duration-300 hover:scale-110 transform-gpu shadow-lg border-2 ${
                                            employeeNames.some(
                                              (name) =>
                                                name.toLowerCase() ===
                                                tag.toLowerCase()
                                            )
                                              ? "bg-gradient-to-r from-emerald-400/20 via-emerald-500/15 to-emerald-600/20 dark:from-emerald-400/25 dark:via-emerald-500/20 dark:to-emerald-600/25 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-600/60 shadow-emerald-500/20 dark:shadow-emerald-500/30 hover:shadow-emerald-500/30 dark:hover:shadow-emerald-500/40"
                                              : "bg-gradient-to-r from-blue-400/20 via-blue-500/15 to-blue-600/20 dark:from-blue-400/25 dark:via-blue-500/20 dark:to-blue-600/25 text-blue-700 dark:text-blue-300 border-blue-300/60 dark:border-blue-600/60 shadow-blue-500/20 dark:shadow-blue-500/30 hover:shadow-blue-500/30 dark:hover:shadow-blue-500/40"
                                          }`}
                                        >
                                          <span className="relative z-10">
                                            {tag}
                                          </span>
                                          {userRole !== "3" && (
                                            <button
                                              className="ml-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover/tag:opacity-100 transition-all duration-200 p-1 rounded-full hover:bg-red-500/20 dark:hover:bg-red-400/20 z-20 relative transform hover:scale-125"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveTag(
                                                  contact.contact_id!,
                                                  tag
                                                );
                                              }}
                                            >
                                              <Lucide
                                                icon="X"
                                                className="w-3 h-3"
                                              />
                                            </button>
                                          )}
                                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 dark:from-white/5 dark:to-white/2 opacity-0 group-hover/tag:opacity-100 transition-opacity duration-300" />
                                        </span>
                                      ))
                                  ) : (
                                    <span className="inline-flex items-center px-4 py-2 rounded-2xl text-xs font-semibold bg-gradient-to-r from-slate-100/60 to-slate-200/40 dark:from-slate-700/60 dark:to-slate-800/40 text-slate-500 dark:text-slate-400 backdrop-blur-xl border border-slate-300/40 dark:border-slate-600/40 shadow-sm">
                                      <Lucide
                                        icon="Tag"
                                        className="w-3 h-3 mr-1.5 opacity-60"
                                      />
                                      No tags
                                    </span>
                                  )}
                                  {contact.tags && contact.tags.length > 2 && (
                                    <span className="inline-flex items-center px-4 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-slate-400/20 via-slate-500/15 to-slate-600/20 dark:from-slate-400/25 dark:via-slate-500/20 dark:to-slate-600/25 text-slate-600 dark:text-slate-400 backdrop-blur-xl border-2 border-slate-300/60 dark:border-slate-600/60 shadow-lg shadow-slate-500/20 dark:shadow-slate-500/30 hover:scale-110 transition-transform duration-300 cursor-pointer">
                                      +{contact.tags.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </td>
                              {visibleColumns.ic && (
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="inline-flex items-center px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30">
                                    {contact.ic || "-"}
                                  </div>
                                </td>
                              )}
                              {visibleColumns.vehicleNumber && (
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="inline-flex items-center px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30">
                                    {contact.vehicleNumber || "-"}
                                  </div>
                                </td>
                              )}
                              {visibleColumns.branch && (
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="inline-flex items-center px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30">
                                    {contact.branch || "-"}
                                  </div>
                                </td>
                              )}
                              {visibleColumns.expiryDate && (
                                <td className="px-6 py-5 whitespace-nowrap">
                                  <div className="inline-flex items-center px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30">
                                    {contact.expiryDate
                                      ? new Date(
                                          contact.expiryDate
                                        ).toLocaleDateString()
                                      : "-"}
                                  </div>
                                </td>
                              )}
                              {visibleColumns.notes && (
                                <td className="px-6 py-5 max-w-xs">
                                  <div className="group relative">
                                    <div
                                      className="truncate font-semibold text-sm text-slate-700 dark:text-slate-200 bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl px-4 py-2.5 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30 cursor-pointer hover:shadow-xl transition-all duration-300"
                                      title={contact.notes || ""}
                                    >
                                      {contact.notes || "-"}
                                    </div>
                                  </div>
                                </td>
                              )}
                              <td className="px-6 py-5 whitespace-nowrap">
                                <div className="inline-flex items-center px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-500 dark:text-slate-400 bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30">
                                  {contact.createdAt
                                    ? new Date(
                                        contact.createdAt
                                      ).toLocaleDateString()
                                    : contact.dateAdded
                                    ? new Date(
                                        contact.dateAdded
                                      ).toLocaleDateString()
                                    : "Unknown"}
                                </div>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="group/btn relative bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-xl border-2 border-white/60 dark:border-slate-600/60 hover:border-blue-300/80 dark:hover:border-blue-500/80 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 rounded-2xl p-3 hover:scale-110 transform-gpu overflow-hidden"
                                    onClick={() => {
                                      setCurrentContact(contact);
                                      setViewContactModal(true);
                                    }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-violet-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                    <Lucide
                                      icon="Eye"
                                      className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400 transition-colors duration-300 relative z-10"
                                    />
                                  </Button>
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="group/btn relative bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-xl border-2 border-white/60 dark:border-slate-600/60 hover:border-emerald-300/80 dark:hover:border-emerald-500/80 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/20 dark:hover:shadow-emerald-500/30 rounded-2xl p-3 hover:scale-110 transform-gpu overflow-hidden"
                                    onClick={() => {
                                      setCurrentContact(contact);
                                      setEditContactModal(true);
                                    }}
                                    disabled={userRole === "3"}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-green-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                    <Lucide
                                      icon="Pencil"
                                      className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400 transition-colors duration-300 relative z-10"
                                    />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="group/btn relative bg-gradient-to-r from-red-50/80 to-red-100/60 dark:from-red-900/40 dark:to-red-800/40 backdrop-blur-xl border-2 border-red-200/60 dark:border-red-600/60 hover:border-red-400/80 dark:hover:border-red-500/80 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-red-500/20 dark:hover:shadow-red-500/30 rounded-2xl p-3 hover:scale-110 transform-gpu overflow-hidden"
                                    onClick={() => {
                                      setCurrentContact(contact);
                                      setDeleteConfirmationModal(true);
                                    }}
                                    disabled={userRole === "3"}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 to-pink-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                    <Lucide
                                      icon="Trash2"
                                      className="w-4 h-4 text-red-500 dark:text-red-400 group-hover/btn:text-red-600 dark:group-hover/btn:text-red-300 transition-colors duration-300 relative z-10"
                                    />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Enhanced Table Footer with Pagination */}
                <div className="relative px-8 py-6 border-t-2 border-white/30 dark:border-slate-700/40 bg-gradient-to-r from-white/90 via-slate-50/80 to-white/60 dark:from-slate-800/90 dark:via-slate-700/80 dark:to-slate-800/60 backdrop-blur-2xl shadow-xl shadow-slate-200/20 dark:shadow-slate-900/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-blue-50/20 dark:from-slate-900/20 dark:via-transparent dark:to-blue-900/10 pointer-events-none" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/15 to-violet-500/10 dark:from-blue-400/20 dark:to-violet-400/15 backdrop-blur-xl border border-blue-200/50 dark:border-blue-700/50 shadow-lg">
                        <Lucide
                          icon="Database"
                          className="w-5 h-5 text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div className="bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 rounded-2xl px-6 py-3 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/30">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          Showing{" "}
                          <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                            {itemOffset + 1}
                          </span>{" "}
                          to{" "}
                          <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                            {Math.min(
                              itemOffset + itemsPerPage,
                              filteredContactsSearch.length
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            {filteredContactsSearch.length}
                          </span>{" "}
                          results
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <ReactPaginate
                        breakLabel={
                          <div className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400 bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/50 dark:border-slate-600/50 rounded-xl shadow-lg">
                            ...
                          </div>
                        }
                        nextLabel={
                          <div className="group flex items-center space-x-2 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-xl border-2 border-white/60 dark:border-slate-600/60 hover:border-blue-300/80 dark:hover:border-blue-500/80 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 dark:hover:shadow-blue-500/30 hover:scale-110 transform-gpu overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="relative z-10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                              Next
                            </span>
                            <Lucide
                              icon="ChevronRight"
                              className="w-4 h-4 relative z-10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
                            />
                          </div>
                        }
                        onPageChange={handlePageClick}
                        pageRangeDisplayed={5}
                        pageCount={pageCount}
                        previousLabel={
                          <div className="group flex items-center space-x-2 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-xl border-2 border-white/60 dark:border-slate-600/60 hover:border-emerald-300/80 dark:hover:border-emerald-500/80 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20 dark:hover:shadow-emerald-500/30 hover:scale-110 transform-gpu overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <Lucide
                              icon="ChevronLeft"
                              className="w-4 h-4 relative z-10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300"
                            />
                            <span className="relative z-10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                              Previous
                            </span>
                          </div>
                        }
                        renderOnZeroPageCount={null}
                        className="flex items-center space-x-2"
                        pageClassName=""
                        pageLinkClassName="relative group inline-flex items-center justify-center min-w-[44px] h-11 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-xl border-2 border-white/60 dark:border-slate-600/60 hover:border-violet-300/80 dark:hover:border-violet-500/80 rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/20 dark:hover:shadow-violet-500/30 hover:scale-110 transform-gpu overflow-hidden hover:text-violet-600 dark:hover:text-violet-400"
                        activeClassName=""
                        activeLinkClassName="!bg-gradient-to-r !from-blue-500/90 !via-violet-500/90 !to-purple-600/90 !text-white !shadow-2xl !shadow-blue-500/40 dark:!shadow-blue-500/50 !border-blue-400/60 dark:!border-blue-500/60 !scale-110 font-extrabold"
                        previousClassName="inline-flex"
                        nextClassName="inline-flex"
                        previousLinkClassName=""
                        nextLinkClassName=""
                        disabledClassName="opacity-40 cursor-not-allowed hover:scale-100 hover:shadow-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Scheduled Messages, Quick Actions & Statistics (30% width) */}
            <div className="lg:w-80 lg:flex-shrink-0 space-y-8">
              {/* Scheduled Messages Panel */}
              <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 overflow-hidden transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60 hover:scale-[1.02]">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-violet-50/20 dark:from-blue-900/10 dark:via-transparent dark:to-violet-900/10 pointer-events-none" />

                <div className="relative px-6 py-6 border-b border-white/20 dark:border-slate-700/30 bg-gradient-to-r from-slate-50/40 to-white/20 dark:from-slate-800/40 dark:to-slate-700/20 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                        <Lucide
                          icon="Calendar"
                          className="w-5 h-5 text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                          Scheduled Messages
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Manage your automation
                        </p>
                      </div>
                      {/* Active Filters Indicator */}
                      {(messageStatusFilter ||
                        messageDateFilter ||
                        messageTypeFilter ||
                        messageRecipientFilter) && (
                        <div className="relative">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 text-blue-700 dark:text-blue-300 border border-blue-200/40 dark:border-blue-700/40 backdrop-blur-sm">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 animate-pulse" />
                            Filtered
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-white/40 dark:border-slate-600/40 hover:bg-white/80 dark:hover:bg-slate-600/80 transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl"
                        onClick={() => setScheduledMessagesModal(true)}
                      >
                        <Lucide icon="ExternalLink" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="relative p-6 space-y-4">
                  {/* Simplified View - Show max 3 most recent */}
                  {scheduledMessages && scheduledMessages.length > 0 ? (
                    <>
                      {applyAdvancedFilters(
                        combineScheduledMessages(getFilteredScheduledMessages())
                      )
                        .sort(
                          (a, b) =>
                            new Date(b.scheduledTime).getTime() -
                            new Date(a.scheduledTime).getTime()
                        )
                        .slice(0, 3)
                        .map((message, index) => (
                          <div
                            key={message.id || index}
                            className="group relative p-5 rounded-2xl bg-gradient-to-br from-white/80 to-white/40 dark:from-slate-700/80 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-blue-300/60 dark:hover:border-blue-500/60 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:scale-[1.02] transform-gpu"
                          >
                            {/* Subtle inner glow */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50/30 via-transparent to-violet-50/30 dark:from-blue-900/10 dark:via-transparent dark:to-violet-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <div className="relative flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start space-x-3 mb-3">
                                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 group-hover:scale-110 transition-transform duration-300">
                                    <Lucide
                                      icon="MessageSquare"
                                      className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed line-clamp-2 overflow-hidden">
                                      {message.messageContent ||
                                        message.message ||
                                        "Untitled Campaign"}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                                      <span className="text-slate-400 dark:text-slate-500">
                                        To{" "}
                                      </span>
                                      <span className="text-slate-800 dark:text-slate-200 font-bold bg-gradient-to-r from-blue-600/10 to-violet-600/10 dark:from-blue-400/20 dark:to-violet-400/20 px-2 py-0.5 rounded-md">
                                        {Array.isArray(message.contactIds) &&
                                        message.contactIds.length > 0
                                          ? message.contactIds.length > 1
                                            ? `${message.contactIds.length} contacts`
                                            : (() => {
                                                const phoneNumber =
                                                  message.contactIds[0]
                                                    ?.split("-")[1]
                                                    ?.replace(/\D/g, "") || "";
                                                const contact = contacts.find(
                                                  (c) =>
                                                    c.phone?.replace(
                                                      /\D/g,
                                                      ""
                                                    ) === phoneNumber
                                                );
                                                return (
                                                  contact?.contactName ||
                                                  phoneNumber ||
                                                  "Unknown"
                                                );
                                              })()
                                          : message.contactId
                                          ? (() => {
                                              const phoneNumber =
                                                message.contactId
                                                  ?.split("-")[1]
                                                  ?.replace(/\D/g, "") || "";
                                              const contact = contacts.find(
                                                (c) =>
                                                  c.phone?.replace(
                                                    /\D/g,
                                                    ""
                                                  ) === phoneNumber
                                              );
                                              return (
                                                contact?.contactName ||
                                                phoneNumber ||
                                                "Unknown"
                                              );
                                            })()
                                          : "0 contacts"}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span
                                    className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border transition-all duration-200 ${
                                      message.status === "sent"
                                        ? "bg-gradient-to-r from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/40 dark:border-emerald-700/40"
                                        : message.status === "failed"
                                        ? "bg-gradient-to-r from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 text-red-700 dark:text-red-300 border-red-200/40 dark:border-red-700/40"
                                        : "bg-gradient-to-r from-orange-500/20 to-amber-500/20 dark:from-orange-400/20 dark:to-amber-400/20 text-orange-700 dark:text-orange-300 border-orange-200/40 dark:border-orange-700/40"
                                    }`}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                        message.status === "sent"
                                          ? "bg-emerald-500"
                                          : message.status === "failed"
                                          ? "bg-red-500"
                                          : "bg-orange-500 animate-pulse"
                                      }`}
                                    />
                                    {message.status === "sent"
                                      ? "Sent"
                                      : message.status === "failed"
                                      ? "Failed"
                                      : "Scheduled"}
                                  </span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-auto">
                                    {message.scheduledTime
                                      ? new Date(
                                          message.scheduledTime
                                        ).toLocaleString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "No date"}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="ml-4 bg-white/60 dark:bg-slate-600/60 backdrop-blur-sm border-white/40 dark:border-slate-500/40 hover:bg-white/80 dark:hover:bg-slate-500/80 transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl opacity-0 group-hover:opacity-100 hover:scale-110 transform-gpu"
                                onClick={() => {
                                  setSelectedMessageForView(message);
                                  setViewMessageDetailsModal(true);
                                }}
                              >
                                <Lucide icon="Eye" className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      {(() => {
                        const filteredCount = applyAdvancedFilters(
                          combineScheduledMessages(
                            getFilteredScheduledMessages()
                          )
                        ).length;
                        return (
                          filteredCount > 3 && (
                            <div className="text-center py-4">
                              <button
                                onClick={() => setScheduledMessagesModal(true)}
                                className="group inline-flex items-center px-4 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-gradient-to-r from-blue-50/50 to-violet-50/50 dark:from-blue-900/20 dark:to-violet-900/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 transform-gpu"
                              >
                                <span>View all {filteredCount} messages</span>
                                <Lucide
                                  icon="ArrowRight"
                                  className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200"
                                />
                              </button>
                            </div>
                          )
                        );
                      })()}
                    </>
                  ) : (
                    /* Enhanced Empty State */
                    <div className="text-center py-12">
                      <div className="relative mx-auto w-20 h-20 mb-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 rounded-3xl backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40" />
                        <div className="absolute inset-2 bg-gradient-to-br from-white/60 to-white/30 dark:from-slate-700/60 dark:to-slate-800/30 rounded-2xl backdrop-blur-sm flex items-center justify-center">
                          <Lucide
                            icon="Calendar"
                            className="w-8 h-8 text-blue-500/70 dark:text-blue-400/70"
                          />
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        No Scheduled Messages
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-48 mx-auto leading-relaxed">
                        Schedule your first message to automate your
                        communication
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 overflow-hidden transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60 hover:scale-[1.02]">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/20 via-transparent to-blue-50/20 dark:from-emerald-900/10 dark:via-transparent dark:to-blue-900/10 pointer-events-none" />

                <div className="relative px-6 py-6 border-b border-white/20 dark:border-slate-700/30 bg-gradient-to-r from-slate-50/40 to-white/20 dark:from-slate-800/40 dark:to-slate-700/20 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 dark:from-emerald-400/20 dark:to-blue-400/20 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-700/40">
                      <Lucide
                        icon="Zap"
                        className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        Quick Actions
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Bulk operations & tools
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative p-6 space-y-4">
                  {/* Assign User to Selected Contacts */}
                  <div className="w-full">
                    <Button
                      variant="outline-secondary"
                      className="w-full justify-between group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-blue-300/60 dark:hover:border-blue-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 rounded-2xl p-4 hover:scale-[1.02] transform-gpu"
                      disabled={
                        selectedContacts.length === 0 || userRole === "3"
                      }
                      onClick={() => setShowAssignUserMenu(!showAssignUserMenu)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 group-hover:scale-110 transition-transform duration-300">
                          <Lucide
                            icon="User"
                            className="w-4 h-4 text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Assign User
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedContacts.length} selected
                          </div>
                        </div>
                      </div>
                      <Lucide
                        icon={showAssignUserMenu ? "ChevronUp" : "ChevronDown"}
                        className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
                      />
                    </Button>

                    {showAssignUserMenu && (
                      <div className="mt-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-slate-800/50 rounded-2xl p-4 space-y-3 overflow-y-auto max-h-96 transition-all duration-300 animate-in slide-in-from-top-2">
                        <div className="mb-3">
                          <div className="relative">
                            <Lucide
                              icon="Search"
                              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400"
                            />
                            <input
                              type="text"
                              placeholder="Search employees..."
                              value={employeeSearch}
                              onChange={(e) =>
                                setEmployeeSearch(e.target.value)
                              }
                              className="w-full pl-10 pr-4 py-3 text-sm border border-white/40 dark:border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-800 dark:text-slate-200 transition-all duration-200"
                            />
                          </div>
                        </div>
                        {(() => {
                          // Use the ref instead of the state
                          const stableEmployeeList = employeeListRef.current;
                          console.log('Using stable employee list:', stableEmployeeList.length, 'employees');
                          
                          if (stableEmployeeList.length === 0) {
                            return (
                              <div className="p-6 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100/80 to-slate-200/60 dark:from-slate-700/80 dark:to-slate-800/60 rounded-2xl backdrop-blur-sm border border-slate-200/40 dark:border-slate-600/40 flex items-center justify-center">
                                  <Lucide
                                    icon="Users"
                                    className="w-8 h-8 text-slate-400"
                                  />
                                </div>
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                  No employees found
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                  Stable list length: {stableEmployeeList.length}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                  Current state length: {employeeList.length}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                  Search query: "{employeeSearch}"
                                </p>
                              </div>
                            );
                          }
                          
                          const filteredEmployees = stableEmployeeList.filter((employee) => {
                            if (userRole === "4" || userRole === "2") {
                              return (
                                employee.role === "2" &&
                                employee.name
                                  .toLowerCase()
                                  .includes(employeeSearch.toLowerCase())
                              );
                            }
                            return employee.name
                              .toLowerCase()
                              .includes(employeeSearch.toLowerCase());
                          });
                          
                          return filteredEmployees.map((employee) => (
                            <button
                              key={employee.id}
                              className="group flex w-full items-center px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-violet-50/40 dark:hover:from-blue-900/20 dark:hover:to-violet-900/20 rounded-xl backdrop-blur-sm border border-transparent hover:border-blue-200/40 dark:hover:border-blue-700/40 hover:shadow-lg"
                              onClick={() => {
                                if (userRole !== "3") {
                                  selectedContacts.forEach((contact) => {
                                    handleAddTagToSelectedContacts(
                                      employee.name,
                                      contact
                                    );
                                  });
                                  setShowAssignUserMenu(false);
                                  toast.success(`Assigned ${employee.name} to ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`);
                                } else {
                                  toast.error("You don't have permission to assign users to contacts.");
                                }
                              }}
                            >
                              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                                <Lucide
                                  icon="User"
                                  className="h-4 w-4 text-blue-600 dark:text-blue-400"
                                />
                              </div>
                              <span className="truncate">{employee.name}</span>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Add Tags to Selected Contacts */}
                  <div className="w-full">
                    <Button
                      variant="outline-secondary"
                      className="w-full justify-between group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-emerald-300/60 dark:hover:border-emerald-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20 rounded-2xl p-4 hover:scale-[1.02] transform-gpu"
                      disabled={
                        selectedContacts.length === 0 || userRole === "3"
                      }
                      onClick={() => setShowAddTagMenu(!showAddTagMenu)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-700/40 group-hover:scale-110 transition-transform duration-300">
                          <Lucide
                            icon="Tag"
                            className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Add Tags
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedContacts.length} selected
                          </div>
                        </div>
                      </div>
                      <Lucide
                        icon={showAddTagMenu ? "ChevronUp" : "ChevronDown"}
                        className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300"
                      />
                    </Button>

                    {showAddTagMenu && (
                      <div className="mt-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-slate-800/50 rounded-2xl p-4 space-y-3 overflow-y-auto max-h-96 transition-all duration-300 animate-in slide-in-from-top-2">
                        <button
                          className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-emerald-50/60 hover:to-green-50/40 dark:hover:from-emerald-900/20 dark:hover:to-green-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-emerald-200/40 dark:hover:border-emerald-700/40 hover:shadow-lg group"
                          onClick={() => {
                            setShowAddTagModal(true);
                            setShowAddTagMenu(false);
                          }}
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                            <Lucide
                              icon="Plus"
                              className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Create New Tag
                          </span>
                        </button>
                        {tagList.map((tag) => (
                          <button
                            key={tag.id}
                            className="flex items-center justify-between w-full hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-violet-50/40 dark:hover:from-blue-900/20 dark:hover:to-violet-900/20 p-3 rounded-xl text-left text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-blue-200/40 dark:hover:border-blue-700/40 hover:shadow-lg group"
                            onClick={() => {
                              selectedContacts.forEach((contact) => {
                                handleAddTagToSelectedContacts(
                                  tag.name,
                                  contact
                                );
                              });
                              setShowAddTagMenu(false);
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 group-hover:scale-110 transition-transform duration-300">
                                <Lucide
                                  icon="Tag"
                                  className="w-3 h-3 text-blue-600 dark:text-blue-400"
                                />
                              </div>
                              <span className="text-slate-700 dark:text-slate-300">
                                {tag.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Remove Tags from Selected Contacts */}
                  <div className="w-full">
                    <Button
                      variant="outline-secondary"
                      className="w-full justify-between group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-red-300/60 dark:hover:border-red-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/10 dark:hover:shadow-red-500/20 rounded-2xl p-4 hover:scale-[1.02] transform-gpu"
                      disabled={
                        selectedContacts.length === 0 || userRole === "3"
                      }
                      onClick={() => setShowRemoveTagMenu(!showRemoveTagMenu)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 backdrop-blur-sm border border-red-200/40 dark:border-red-700/40 group-hover:scale-110 transition-transform duration-300">
                          <Lucide
                            icon="Tags"
                            className="w-4 h-4 text-red-600 dark:text-red-400"
                          />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Remove Tags
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedContacts.length} selected
                          </div>
                        </div>
                      </div>
                      <Lucide
                        icon={showRemoveTagMenu ? "ChevronUp" : "ChevronDown"}
                        className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300"
                      />
                    </Button>

                    {showRemoveTagMenu && (
                      <div className="mt-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-slate-800/50 rounded-2xl p-4 space-y-3 overflow-y-auto max-h-96 transition-all duration-300 animate-in slide-in-from-top-2">
                        <button
                          className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-red-50/60 hover:to-pink-50/40 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-red-200/40 dark:hover:border-red-700/40 hover:shadow-lg group text-red-600 dark:text-red-400"
                          onClick={() => {
                            selectedContacts.forEach((contact) => {
                              handleRemoveTagsFromContact(
                                contact,
                                contact.tags || []
                              );
                            });
                            setShowRemoveTagMenu(false);
                          }}
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 backdrop-blur-sm border border-red-200/40 dark:border-red-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                            <Lucide
                              icon="XCircle"
                              className="w-4 h-4 text-red-600 dark:text-red-400"
                            />
                          </div>
                          <span className="text-sm">Remove All Tags</span>
                        </button>
                        {tagList.map((tag) => (
                          <button
                            key={tag.id}
                            className="flex items-center justify-between w-full hover:bg-gradient-to-r hover:from-slate-50/60 hover:to-gray-50/40 dark:hover:from-slate-900/20 dark:hover:to-gray-900/20 p-3 rounded-xl text-left text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-slate-200/40 dark:hover:border-slate-700/40 hover:shadow-lg group"
                            onClick={() => {
                              selectedContacts.forEach((contact) => {
                                handleRemoveTagsFromContact(contact, [
                                  tag.name,
                                ]);
                              });
                              setShowRemoveTagMenu(false);
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-500/20 to-gray-500/20 dark:from-slate-400/20 dark:to-gray-400/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40 group-hover:scale-110 transition-transform duration-300">
                                <Lucide
                                  icon="Tag"
                                  className="w-3 h-3 text-slate-600 dark:text-slate-400"
                                />
                              </div>
                              <span className="text-slate-700 dark:text-slate-300">
                                {tag.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Database Operations */}
                  <div className="w-full">
                    <Button
                      variant="outline-secondary"
                      className="w-full justify-between group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-violet-300/60 dark:hover:border-violet-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 dark:hover:shadow-violet-500/20 rounded-2xl p-4 hover:scale-[1.02] transform-gpu"
                      disabled={isSyncing || userRole === "3"}
                      onClick={() => setShowSyncMenu(!showSyncMenu)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 dark:from-violet-400/20 dark:to-purple-400/20 backdrop-blur-sm border border-violet-200/40 dark:border-violet-700/40 group-hover:scale-110 transition-transform duration-300">
                          <Lucide
                            icon={isSyncing ? "Loader2" : "RefreshCw"}
                            className={`w-4 h-4 text-violet-600 dark:text-violet-400 ${
                              isSyncing ? "animate-spin" : ""
                            }`}
                          />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {isSyncing ? "Syncing..." : "Sync Database"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {isSyncing ? "In progress..." : "Update data"}
                          </div>
                        </div>
                      </div>
                      <Lucide
                        icon={showSyncMenu ? "ChevronUp" : "ChevronDown"}
                        className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300"
                      />
                    </Button>

                    {showSyncMenu && (
                      <div className="mt-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-slate-800/50 rounded-2xl p-4 space-y-3 transition-all duration-300 animate-in slide-in-from-top-2">
                        <button
                          className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-violet-50/60 hover:to-purple-50/40 dark:hover:from-violet-900/20 dark:hover:to-purple-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-violet-200/40 dark:hover:border-violet-700/40 hover:shadow-lg group"
                          onClick={() => {
                            setShowSyncConfirmationModal(true);
                            setShowSyncMenu(false);
                          }}
                          disabled={isSyncing}
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 dark:from-violet-400/20 dark:to-purple-400/20 backdrop-blur-sm border border-violet-200/40 dark:border-violet-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                            <Lucide
                              icon="MessageSquare"
                              className="w-4 h-4 text-violet-600 dark:text-violet-400"
                            />
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {isSyncing ? "Syncing..." : "Sync Chats"}
                          </span>
                        </button>

                        <button
                          className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/40 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-blue-200/40 dark:hover:border-blue-700/40 hover:shadow-lg group"
                          onClick={() => {
                            setShowSyncNamesConfirmationModal(true);
                            setShowSyncMenu(false);
                          }}
                          disabled={isSyncing}
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                            <Lucide
                              icon="FolderSync"
                              className="w-4 h-4 text-blue-600 dark:text-blue-400"
                            />
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {isSyncing ? "Syncing..." : "Sync Contact Names"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* File Operations */}
                  {userRole !== "2" && userRole !== "3" && userRole !== "5" && (
                    <div className="w-full">
                      <Button
                        variant="outline-secondary"
                        className="w-full justify-between group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-indigo-300/60 dark:hover:border-indigo-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 rounded-2xl p-4 hover:scale-[1.02] transform-gpu"
                        onClick={() => setShowExportMenu(!showExportMenu)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 dark:from-indigo-400/20 dark:to-blue-400/20 backdrop-blur-sm border border-indigo-200/40 dark:border-indigo-700/40 group-hover:scale-110 transition-transform duration-300">
                            <Lucide
                              icon="Download"
                              className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                            />
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              Export Contacts
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Download data
                            </div>
                          </div>
                        </div>
                        <Lucide
                          icon={showExportMenu ? "ChevronUp" : "ChevronDown"}
                          className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300"
                        />
                      </Button>

                      {showExportMenu && (
                        <div className="mt-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-slate-800/50 rounded-2xl p-4 space-y-3 transition-all duration-300 animate-in slide-in-from-top-2">
                          <button
                            className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/40 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-blue-200/40 dark:hover:border-blue-700/40 hover:shadow-lg group"
                            onClick={() => {
                              if (selectedContacts.length > 0) {
                                exportContactsToCSV(selectedContacts);
                              }
                              setShowExportMenu(false);
                            }}
                            disabled={selectedContacts.length === 0}
                          >
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                              <Lucide
                                icon="Users"
                                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                              />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              Export Selected Contacts
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {selectedContacts.length} selected
                              </div>
                            </span>
                          </button>

                          <button
                            className="flex items-center justify-between p-3 font-semibold hover:bg-gradient-to-r hover:from-emerald-50/60 hover:to-green-50/40 dark:hover:from-emerald-900/20 dark:hover:to-green-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-emerald-200/40 dark:hover:border-emerald-700/40 hover:shadow-lg group"
                            onClick={() => {
                              setShowTagSelection(!showTagSelection);
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-700/40 group-hover:scale-110 transition-transform duration-300">
                                <Lucide
                                  icon="Tag"
                                  className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                                />
                              </div>
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                Export by Tags
                              </span>
                            </div>
                            <Lucide
                              icon={
                                showTagSelection ? "ChevronUp" : "ChevronDown"
                              }
                              className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300"
                            />
                          </button>

                          {showTagSelection && (
                            <div className="ml-6 p-4 bg-gradient-to-br from-slate-50/80 to-gray-50/60 dark:from-slate-700/80 dark:to-gray-800/60 backdrop-blur-sm border border-slate-200/40 dark:border-slate-600/40 rounded-xl space-y-3 max-h-48 overflow-y-auto transition-all duration-300 animate-in slide-in-from-top-1">
                              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                Select tags to export:
                              </div>
                              {tagList.length === 0 ? (
                                <div className="text-center py-4">
                                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-slate-100/80 to-slate-200/60 dark:from-slate-700/80 dark:to-slate-800/60 rounded-xl backdrop-blur-sm border border-slate-200/40 dark:border-slate-600/40 flex items-center justify-center">
                                    <Lucide
                                      icon="Tag"
                                      className="w-6 h-6 text-slate-400"
                                    />
                                  </div>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    No tags available
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {tagList.map((tag) => (
                                    <label
                                      key={tag.id}
                                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-600/60 backdrop-blur-sm transition-all duration-200 cursor-pointer group"
                                    >
                                      <input
                                        type="checkbox"
                                        value={tag.name}
                                        checked={exportSelectedTags.includes(
                                          tag.name
                                        )}
                                        onChange={(e) => {
                                          const isChecked = e.target.checked;
                                          setExportSelectedTags((prev) =>
                                            isChecked
                                              ? [...prev, tag.name]
                                              : prev.filter(
                                                  (t) => t !== tag.name
                                                )
                                          );
                                        }}
                                        className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500/30 transition-colors"
                                      />
                                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                        {tag.name}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              {exportSelectedTags.length > 0 && (
                                <div className="pt-3 border-t border-slate-200/50 dark:border-slate-600/50">
                                  <button
                                    onClick={() => {
                                      exportContactsByTags(exportSelectedTags);
                                      setShowTagSelection(false);
                                      setShowExportMenu(false);
                                      setExportSelectedTags([]);
                                    }}
                                    className="w-full px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500/90 to-blue-500/90 hover:from-indigo-600/90 hover:to-blue-600/90 backdrop-blur-sm border border-indigo-400/30 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] transform-gpu"
                                  >
                                    Export {exportSelectedTags.length} Tag
                                    {exportSelectedTags.length !== 1 ? "s" : ""}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-violet-50/60 hover:to-purple-50/40 dark:hover:from-violet-900/20 dark:hover:to-purple-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-violet-200/40 dark:hover:border-violet-700/40 hover:shadow-lg group"
                            onClick={() => {
                              exportContactsToCSV(filteredContactsSearch);
                              setShowExportMenu(false);
                            }}
                          >
                            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 dark:from-violet-400/20 dark:to-purple-400/20 backdrop-blur-sm border border-violet-200/40 dark:border-violet-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                              <Lucide
                                icon="Filter"
                                className="w-4 h-4 text-violet-600 dark:text-violet-400"
                              />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              Export Filtered Contacts
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {filteredContactsSearch.length} contacts
                              </div>
                            </span>
                          </button>

                          <button
                            className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-slate-50/60 hover:to-gray-50/40 dark:hover:from-slate-900/20 dark:hover:to-gray-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-slate-200/40 dark:hover:border-slate-700/40 hover:shadow-lg group"
                            onClick={() => {
                              exportContactsToCSV(contacts);
                              setShowExportMenu(false);
                            }}
                          >
                            <div className="p-2 rounded-lg bg-gradient-to-br from-slate-500/20 to-gray-500/20 dark:from-slate-400/20 dark:to-gray-400/20 backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                              <Lucide
                                icon="Database"
                                className="w-4 h-4 text-slate-600 dark:text-slate-400"
                              />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              Export All Contacts
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {contacts.length} contacts
                              </div>
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manage Tags */}
                  <div className="w-full">
                    <Button
                      variant="outline-secondary"
                      className="w-full justify-between group bg-gradient-to-r from-white/60 to-white/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 hover:border-orange-300/60 dark:hover:border-orange-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 dark:hover:shadow-orange-500/20 rounded-2xl p-4 hover:scale-[1.02] transform-gpu"
                      onClick={() => setShowManageTagsMenu(!showManageTagsMenu)}
                      disabled={userRole === "3"}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 dark:from-orange-400/20 dark:to-amber-400/20 backdrop-blur-sm border border-orange-200/40 dark:border-orange-700/40 group-hover:scale-110 transition-transform duration-300">
                          <Lucide
                            icon="Settings"
                            className="w-4 h-4 text-orange-600 dark:text-orange-400"
                          />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            Manage Tags
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Create & organize
                          </div>
                        </div>
                      </div>
                      <Lucide
                        icon={showManageTagsMenu ? "ChevronUp" : "ChevronDown"}
                        className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300"
                      />
                    </Button>

                    {showManageTagsMenu && (
                      <div className="mt-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-slate-800/50 rounded-2xl p-4 space-y-3 transition-all duration-300 animate-in slide-in-from-top-2">
                        <button
                          className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-orange-50/60 hover:to-amber-50/40 dark:hover:from-orange-900/20 dark:hover:to-amber-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-orange-200/40 dark:hover:border-orange-700/40 hover:shadow-lg group"
                          onClick={() => {
                            setShowAddTagModal(true);
                            setShowManageTagsMenu(false);
                          }}
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 dark:from-orange-400/20 dark:to-amber-400/20 backdrop-blur-sm border border-orange-200/40 dark:border-orange-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                            <Lucide
                              icon="Plus"
                              className="w-4 h-4 text-orange-600 dark:text-orange-400"
                            />
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Add New Tag
                          </span>
                        </button>

                        <button
                          className="flex items-center p-3 font-semibold hover:bg-gradient-to-r hover:from-red-50/60 hover:to-pink-50/40 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 w-full rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-red-200/40 dark:hover:border-red-700/40 hover:shadow-lg group"
                          onClick={() => {
                            setShowDeleteTagModal(true);
                            setShowManageTagsMenu(false);
                          }}
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 backdrop-blur-sm border border-red-200/40 dark:border-red-700/40 mr-3 group-hover:scale-110 transition-transform duration-300">
                            <Lucide
                              icon="Trash2"
                              className="w-4 h-4 text-red-600 dark:text-red-400"
                            />
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            Delete Tags
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 overflow-hidden transition-all duration-500 hover:shadow-3xl hover:shadow-slate-200/30 dark:hover:shadow-slate-900/60 hover:scale-[1.02]">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 via-transparent to-amber-50/20 dark:from-orange-900/10 dark:via-transparent dark:to-amber-900/10 pointer-events-none" />

                <div className="relative px-6 py-6 border-b border-white/20 dark:border-slate-700/30 bg-gradient-to-r from-slate-50/40 to-white/20 dark:from-slate-800/40 dark:to-slate-700/20 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 dark:from-orange-400/20 dark:to-amber-400/20 backdrop-blur-sm border border-orange-200/40 dark:border-orange-700/40">
                      <Lucide
                        icon="BarChart3"
                        className="w-5 h-5 text-orange-600 dark:text-orange-400"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        Statistics
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Overview & insights
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative p-6 space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/60 to-white/30 dark:from-slate-700/60 dark:to-slate-800/30 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 hover:shadow-lg transition-all duration-300 group/stat">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40 group-hover/stat:scale-110 transition-transform duration-300">
                        <Lucide
                          icon="Users"
                          className="w-4 h-4 text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Contacts
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      {contacts.length.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/60 to-white/30 dark:from-slate-700/60 dark:to-slate-800/30 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 hover:shadow-lg transition-all duration-300 group/stat">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-700/40 group-hover/stat:scale-110 transition-transform duration-300">
                        <Lucide
                          icon="Filter"
                          className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Filtered Results
                      </span>
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
                      {filteredContactsSearch.length.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/60 to-white/30 dark:from-slate-700/60 dark:to-slate-800/30 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 hover:shadow-lg transition-all duration-300 group/stat">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 dark:from-violet-400/20 dark:to-purple-400/20 backdrop-blur-sm border border-violet-200/40 dark:border-violet-700/40 group-hover/stat:scale-110 transition-transform duration-300">
                        <Lucide
                          icon="CheckSquare"
                          className="w-4 h-4 text-violet-600 dark:text-violet-400"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Selected
                      </span>
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                      {selectedContacts.length.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/60 to-white/30 dark:from-slate-700/60 dark:to-slate-800/30 backdrop-blur-sm border border-white/40 dark:border-slate-600/40 hover:shadow-lg transition-all duration-300 group/stat">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 dark:from-orange-400/20 dark:to-amber-400/20 backdrop-blur-sm border border-orange-200/40 dark:border-orange-700/40 group-hover/stat:scale-110 transition-transform duration-300">
                        <Lucide
                          icon="Calendar"
                          className="w-4 h-4 text-orange-600 dark:text-orange-400"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Scheduled Messages
                      </span>
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
                      {scheduledMessages.length.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Contact Modal */}
        <Dialog
          open={addContactModal}
          onClose={() => setAddContactModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-2xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.005] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-violet-500/5 to-purple-500/10 dark:from-blue-600/10 dark:via-violet-700/5 dark:to-purple-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="relative p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <Lucide
                        icon="UserPlus"
                        className="w-7 h-7 text-blue-400"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-violet-400/20 rounded-2xl blur-sm" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-violet-100 bg-clip-text text-transparent">
                        Add New Contact
                      </h3>
                      <p className="text-white/60 mt-1">
                        Create a new contact record
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAddContactModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 space-y-8">
                  {/* Personal Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                      <div className="p-2 rounded-xl bg-emerald-500/10 backdrop-blur-sm border border-emerald-400/20">
                        <Lucide
                          icon="User"
                          className="w-5 h-5 text-emerald-400"
                        />
                      </div>
                      <h4 className="text-lg font-semibold bg-gradient-to-r from-emerald-300 to-emerald-100 bg-clip-text text-transparent">
                        Personal Information
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          Contact Name *
                        </label>
                        <FormInput
                          type="text"
                          value={newContact.contactName}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              contactName: e.target.value,
                            })
                          }
                          placeholder="Enter contact name"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          Last Name
                        </label>
                        <FormInput
                          type="text"
                          value={newContact.lastName}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              lastName: e.target.value,
                            })
                          }
                          placeholder="Enter last name"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          Phone Number *
                        </label>
                        <FormInput
                          type="tel"
                          value={newContact.phone}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              phone: e.target.value,
                            })
                          }
                          placeholder="e.g., +60123456789"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          Email
                        </label>
                        <FormInput
                          type="email"
                          value={newContact.email}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              email: e.target.value,
                            })
                          }
                          placeholder="Enter email address"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                      <div className="p-2 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20">
                        <Lucide
                          icon="Building2"
                          className="w-5 h-5 text-blue-400"
                        />
                      </div>
                      <h4 className="text-lg font-semibold bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">
                        Company Information
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          Company Name
                        </label>
                        <FormInput
                          type="text"
                          value={newContact.companyName}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              companyName: e.target.value,
                            })
                          }
                          placeholder="Enter company name"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          Branch
                        </label>
                        <FormInput
                          type="text"
                          value={newContact.branch}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              branch: e.target.value,
                            })
                          }
                          placeholder="Enter branch"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-white/80">
                          Address
                        </label>
                        <FormInput
                          type="text"
                          value={newContact.address1}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              address1: e.target.value,
                            })
                          }
                          placeholder="Enter address"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Details Section */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                      <div className="p-2 rounded-xl bg-purple-500/10 backdrop-blur-sm border border-purple-400/20">
                        <Lucide
                          icon="FileText"
                          className="w-5 h-5 text-purple-400"
                        />
                      </div>
                      <h4 className="text-lg font-semibold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
                        Additional Details
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          Vehicle Number
                        </label>
                        <FormInput
                          type="text"
                          value={newContact.vehicleNumber}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              vehicleNumber: e.target.value,
                            })
                          }
                          placeholder="Enter vehicle number"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          IC Number
                        </label>
                        <FormInput
                          type="text"
                          value={newContact.ic}
                          onChange={(e) =>
                            setNewContact({ ...newContact, ic: e.target.value })
                          }
                          placeholder="Enter IC number"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/80">
                          Expiry Date
                        </label>
                        <FormInput
                          type="date"
                          value={newContact.expiryDate}
                          onChange={(e) =>
                            setNewContact({
                              ...newContact,
                              expiryDate: e.target.value,
                            })
                          }
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
                      <div className="p-2 rounded-xl bg-orange-500/10 backdrop-blur-sm border border-orange-400/20">
                        <Lucide
                          icon="MessageSquare"
                          className="w-5 h-5 text-orange-400"
                        />
                      </div>
                      <h4 className="text-lg font-semibold bg-gradient-to-r from-orange-300 to-orange-100 bg-clip-text text-transparent">
                        Notes
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-white/80">
                        Additional Notes
                      </label>
                      <textarea
                        value={newContact.notes}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Enter any additional notes"
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 backdrop-blur-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    onClick={() => setAddContactModal(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNewContact}
                    disabled={
                      !newContact.contactName || !newContact.phone || isLoading
                    }
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 hover:from-blue-600 hover:via-violet-600 hover:to-purple-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? "Adding..." : "Add Contact"}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* View Contact Modal */}
        <Dialog
          open={viewContactModal}
          onClose={() => setViewContactModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-3xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden overflow-y-auto transform hover:scale-[1.005] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-blue-500/5 to-purple-500/10 dark:from-emerald-600/10 dark:via-blue-700/5 dark:to-purple-600/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide icon="Eye" className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-blue-100 dark:from-white dark:via-emerald-100 dark:to-blue-100 bg-clip-text text-transparent">
                        Contact Details
                      </h3>
                      <p className="text-sm text-white/70 dark:text-slate-400 mt-1">
                        View contact information
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewContactModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                {currentContact && (
                  <div className="mt-8 space-y-8">
                    {/* Contact Header */}
                    <div className="text-center pb-8 border-b border-white/10 dark:border-slate-700/20">
                      <div className="relative mx-auto mb-6 w-32 h-32">
                        <div className="w-full h-full rounded-3xl bg-gradient-to-br from-emerald-500/80 via-blue-500/80 to-purple-600/80 backdrop-blur-sm flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-emerald-500/20 dark:shadow-emerald-500/30 border border-white/20">
                          {currentContact.profileUrl ? (
                            <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl shadow-blue-500/20 dark:shadow-blue-500/30 border border-white/30 dark:border-slate-600/30 group-hover/contact:scale-110 transition-transform duration-300">
                              <img
                                src={currentContact.profileUrl}
                                alt={
                                  currentContact.contactName ||
                                  currentContact.firstName ||
                                  "Contact"
                                }
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target =
                                    e.currentTarget as HTMLImageElement;
                                  const fallback =
                                    target.nextElementSibling as HTMLDivElement;
                                  if (fallback) {
                                    target.style.display = "none";
                                    fallback.style.display = "flex";
                                  }
                                }}
                              />
                              <div className="hidden w-full h-full rounded-2xl bg-gradient-to-br from-blue-500/80 via-violet-500/80 to-purple-600/80 backdrop-blur-sm items-center justify-center text-white font-bold text-4xl">
                                {currentContact.contactName
                                  ? currentContact.contactName
                                      .charAt(0)
                                      .toUpperCase()
                                  : currentContact.firstName
                                      ?.charAt(0)
                                      ?.toUpperCase() || "U"}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-500/80 via-violet-500/80 to-purple-600/80 backdrop-blur-sm flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-blue-500/20 dark:shadow-blue-500/30 border border-white/30 dark:border-slate-600/30 group-hover/contact:scale-110 transition-transform duration-300">
                              {currentContact.contactName
                                ? currentContact.contactName
                                    .charAt(0)
                                    .toUpperCase()
                                : currentContact.firstName
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"}
                            </div>
                          )}
                        </div>
                        <div className="absolute -inset-3 bg-gradient-to-br from-emerald-400/20 to-purple-600/20 rounded-3xl blur-lg opacity-50" />
                      </div>
                      <h4 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-blue-100 dark:from-white dark:via-emerald-100 dark:to-blue-100 bg-clip-text text-transparent mb-3">
                        {currentContact.contactName || "Unknown Contact"}
                      </h4>
                      <p className="text-white/80 dark:text-slate-300 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl px-6 py-3 inline-block font-medium">
                        {currentContact.email || "No email"}
                      </p>
                    </div>

                    {/* Contact Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all duration-300 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <label className="text-sm font-bold text-white/70 dark:text-slate-400 uppercase tracking-wider">
                              Phone
                            </label>
                          </div>
                          <p className="text-xl font-semibold text-white dark:text-slate-100">
                            {currentContact.phone || "No phone"}
                          </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all duration-300 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <label className="text-sm font-bold text-white/70 dark:text-slate-400 uppercase tracking-wider">
                              Company
                            </label>
                          </div>
                          <p className="text-xl font-semibold text-white dark:text-slate-100">
                            {currentContact.companyName || "No company"}
                          </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all duration-300 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <label className="text-sm font-bold text-white/70 dark:text-slate-400 uppercase tracking-wider">
                              Address
                            </label>
                          </div>
                          <p className="text-xl font-semibold text-white dark:text-slate-100">
                            {currentContact.address1 || "No address"}
                          </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all duration-300 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <label className="text-sm font-bold text-white/70 dark:text-slate-400 uppercase tracking-wider">
                              Branch
                            </label>
                          </div>
                          <p className="text-xl font-semibold text-white dark:text-slate-100">
                            {currentContact.branch || "No branch"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all duration-300 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <label className="text-sm font-bold text-white/70 dark:text-slate-400 uppercase tracking-wider">
                              Vehicle Number
                            </label>
                          </div>
                          <p className="text-xl font-semibold text-white dark:text-slate-100">
                            {currentContact.vehicleNumber ||
                              "No vehicle number"}
                          </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all duration-300 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <label className="text-sm font-bold text-white/70 dark:text-slate-400 uppercase tracking-wider">
                              IC Number
                            </label>
                          </div>
                          <p className="text-xl font-semibold text-white dark:text-slate-100">
                            {currentContact.ic || "No IC number"}
                          </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all duration-300 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <label className="text-sm font-bold text-white/70 dark:text-slate-400 uppercase tracking-wider">
                              Expiry Date
                            </label>
                          </div>
                          <p className="text-xl font-semibold text-white dark:text-slate-100">
                            {currentContact.expiryDate
                              ? new Date(
                                  currentContact.expiryDate
                                ).toLocaleDateString()
                              : "No expiry date"}
                          </p>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 hover:bg-white/10 dark:hover:bg-slate-700/20 transition-all duration-300 shadow-inner">
                          <div className="flex items-center space-x-3 mb-3">
                            <label className="text-sm font-bold text-white/70 dark:text-slate-400 uppercase tracking-wider">
                              Date Added
                            </label>
                          </div>
                          <p className="text-xl font-semibold text-white dark:text-slate-100">
                            {currentContact.createdAt
                              ? new Date(
                                  currentContact.createdAt
                                ).toLocaleDateString()
                              : currentContact.dateAdded
                              ? new Date(
                                  currentContact.dateAdded
                                ).toLocaleDateString()
                              : "Unknown"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    {currentContact.notes && (
                      <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 shadow-inner">
                        <div className="flex items-center space-x-3 mb-4">
                          <Lucide
                            icon="FileText"
                            className="w-5 h-5 text-indigo-400"
                          />
                          <label className="text-lg font-bold text-white/90 dark:text-slate-200">
                            Notes
                          </label>
                        </div>
                        <p className="text-white/90 dark:text-slate-100 leading-relaxed text-base">
                          {currentContact.notes}
                        </p>
                      </div>
                    )}

                    {/* Tags Section */}
                    {currentContact.tags && currentContact.tags.length > 0 && (
                      <div className="p-6 rounded-2xl bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 shadow-inner">
                        <div className="flex items-center space-x-3 mb-4">
                          <Lucide
                            icon="Tags"
                            className="w-5 h-5 text-rose-400"
                          />
                          <label className="text-lg font-bold text-white/90 dark:text-slate-200">
                            Tags
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {currentContact.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-4 py-2 rounded-2xl text-sm font-semibold bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-400/30 text-rose-200 backdrop-blur-sm"
                            >
                              <Lucide icon="Tag" className="w-3 h-3 mr-2" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    onClick={() => setViewContactModal(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setViewContactModal(false);
                      setEditContactModal(true);
                    }}
                    disabled={userRole === "3"}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="UserCog" className="w-4 h-4" />
                      <span>Edit Contact</span>
                    </div>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog
          open={deleteConfirmationModal}
          onClose={() => setDeleteConfirmationModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-md relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 overflow-hidden">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/20 via-transparent to-pink-50/20 dark:from-red-900/10 dark:via-transparent dark:to-pink-900/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="text-center">
                  <div className="relative mx-auto mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-3xl bg-gradient-to-br from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 backdrop-blur-xl border border-red-200/50 dark:border-red-700/50 shadow-2xl shadow-red-500/20 dark:shadow-red-500/30">
                      <Lucide
                        icon="AlertTriangle"
                        className="h-8 w-8 text-red-600 dark:text-red-400"
                      />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-red-400/20 to-pink-600/20 rounded-3xl blur opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                    Delete Contact
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl px-4 py-3">
                    Are you sure you want to delete this contact? This action
                    cannot be undone.
                  </p>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline-secondary"
                    onClick={() => setDeleteConfirmationModal(false)}
                    className="px-6 py-3 bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-xl border-2 border-white/60 dark:border-slate-600/60 hover:border-slate-300/80 dark:hover:border-slate-500/80 rounded-2xl font-bold transition-all duration-300 hover:shadow-xl hover:scale-105 transform-gpu"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={handleDeleteContact}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-red-500/90 via-pink-500/90 to-red-600/90 text-white border-2 border-red-400/60 dark:border-red-500/60 rounded-2xl font-bold transition-all duration-300 hover:shadow-xl hover:shadow-red-500/30 dark:hover:shadow-red-500/40 hover:scale-105 transform-gpu disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Mass Delete Modal */}
        <Dialog
          open={showMassDeleteModal}
          onClose={() => setShowMassDeleteModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-md relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-3xl border border-white/30 dark:border-slate-700/30 shadow-2xl shadow-slate-200/20 dark:shadow-slate-900/40 overflow-hidden">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 via-transparent to-red-50/20 dark:from-orange-900/10 dark:via-transparent dark:to-red-900/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="text-center">
                  <div className="relative mx-auto mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-3xl bg-gradient-to-br from-orange-500/20 to-red-500/20 dark:from-orange-400/20 dark:to-red-400/20 backdrop-blur-xl border border-orange-200/50 dark:border-orange-700/50 shadow-2xl shadow-orange-500/20 dark:shadow-orange-500/30">
                      <Lucide
                        icon="AlertTriangle"
                        className="h-8 w-8 text-orange-600 dark:text-orange-400"
                      />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-orange-400/20 to-red-600/20 rounded-3xl blur opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                    Delete Selected Contacts
                  </h3>
                  <div className="bg-gradient-to-r from-white/60 to-slate-50/40 dark:from-slate-700/60 dark:to-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-600/40 rounded-2xl px-4 py-4 mb-8">
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Are you sure you want to delete{" "}
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {selectedContacts.length}
                      </span>{" "}
                      selected contacts? This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowMassDeleteModal(false)}
                    className="px-6 py-3 bg-gradient-to-r from-white/80 to-slate-50/60 dark:from-slate-700/80 dark:to-slate-800/60 backdrop-blur-xl border-2 border-white/60 dark:border-slate-600/60 hover:border-slate-300/80 dark:hover:border-slate-500/80 rounded-2xl font-bold transition-all duration-300 hover:shadow-xl hover:scale-105 transform-gpu"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={handleMassDelete}
                    disabled={isMassDeleting}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500/90 via-red-500/90 to-pink-600/90 text-white border-2 border-orange-400/60 dark:border-orange-500/60 rounded-2xl font-bold transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 dark:hover:shadow-orange-500/40 hover:scale-105 transform-gpu disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMassDeleting ? "Deleting..." : "Delete All"}
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Add Tag Modal */}
        <Dialog
          open={showAddTagModal}
          onClose={() => setShowAddTagModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-md relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-500/5 to-pink-500/10 dark:from-blue-600/10 dark:via-purple-700/5 dark:to-pink-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide icon="Tag" className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-white via-blue-100 to-violet-100 dark:from-white dark:via-blue-100 dark:to-violet-100 bg-clip-text text-transparent">
                      Add New Tag
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddTagModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 space-y-2">
                  <label className="block text-sm font-semibold text-white/90 dark:text-slate-200 mb-3">
                    Tag Name
                  </label>
                  <div className="relative">
                    <FormInput
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Enter a descriptive tag name..."
                      className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl px-4 py-4 text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 shadow-inner"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-violet-500/5 pointer-events-none" />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowAddTagModal(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveNewTag}
                    disabled={!newTag.trim() || isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-violet-500 hover:from-blue-600 hover:via-purple-600 hover:to-violet-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Adding...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Lucide icon="Plus" className="w-4 h-4" />
                        <span>Add Tag</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Filters Modal */}
        <Dialog
          open={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-lg relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.01] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-600/10 dark:via-teal-700/5 dark:to-cyan-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide
                        icon="Filter"
                        className="w-5 h-5 text-emerald-400"
                      />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-white via-emerald-100 to-teal-100 dark:from-white dark:via-emerald-100 dark:to-teal-100 bg-clip-text text-transparent">
                      Filter Contacts
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowFiltersModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 space-y-8">
                  {/* Tag Filters */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Lucide
                        icon="Tags"
                        className="w-5 h-5 text-emerald-400"
                      />
                      <h4 className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Filter by Tags
                      </h4>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-600/20 shadow-inner">
                      {tagList.map((tag) => (
                        <label
                          key={tag.id}
                          className="group flex items-center p-3 rounded-xl hover:bg-white/10 dark:hover:bg-slate-600/20 transition-all duration-200 cursor-pointer border border-transparent hover:border-white/10"
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedTagFilters.includes(tag.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTagFilters((prev) => [
                                    ...prev,
                                    tag.name,
                                  ]);
                                } else {
                                  setSelectedTagFilters((prev) =>
                                    prev.filter((t) => t !== tag.name)
                                  );
                                }
                              }}
                              className="w-5 h-5 rounded-lg border-2 border-white/30 text-emerald-500 focus:ring-emerald-500/20 focus:ring-2 bg-white/5 backdrop-blur-sm transition-all duration-200"
                            />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                          </div>
                          <span className="ml-4 text-sm font-medium text-white/80 dark:text-slate-300 group-hover:text-white transition-colors duration-200">
                            {tag.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* User Filters */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Lucide icon="Users" className="w-5 h-5 text-teal-400" />
                      <h4 className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Filter by Assigned User
                      </h4>
                    </div>
                    <div className="space-y-3 max-h-60 overflow-y-auto bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-600/20 shadow-inner">
                      {(() => {
                        // Use the ref instead of the state
                        const stableEmployeeList = employeeListRef.current;
                        console.log('Filter modal - Using stable employee list:', stableEmployeeList.length, 'employees');
                        
                        if (stableEmployeeList.length === 0) {
                          return (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                              <Lucide icon="Users" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>No employees found</p>
                              <p className="text-xs">Stable list length: {stableEmployeeList.length}</p>
                              <p className="text-xs">Current state length: {employeeList.length}</p>
                            </div>
                          );
                        }
                        
                        return stableEmployeeList.map((employee) => (
                          <label
                            key={employee.id}
                            className="group flex items-center p-3 rounded-xl hover:bg-white/10 dark:hover:bg-slate-600/20 transition-all duration-200 cursor-pointer border border-transparent hover:border-white/10"
                          >
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={selectedUserFilters.includes(
                                  employee.name
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUserFilters((prev) => [
                                      ...prev,
                                      employee.name,
                                    ]);
                                  } else {
                                    setSelectedUserFilters((prev) =>
                                      prev.filter((u) => u !== employee.name)
                                    );
                                  }
                                }}
                                className="w-5 h-5 rounded-lg border-2 border-white/30 text-teal-500 focus:ring-teal-500/20 focus:ring-2 bg-white/5 backdrop-blur-sm transition-all duration-200"
                              />
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-teal-400/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                            </div>
                            <span className="ml-4 text-sm font-medium text-white/80 dark:text-slate-300 group-hover:text-white transition-colors duration-200">
                              {employee.name}
                            </span>
                          </label>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      setSelectedTagFilters([]);
                      setSelectedUserFilters([]);
                    }}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="RotateCcw" className="w-4 h-4" />
                      <span>Clear All</span>
                    </div>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setShowFiltersModal(false)}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-105"
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="Check" className="w-4 h-4" />
                      <span>Apply Filters</span>
                    </div>
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Date Filter Modal */}
        <Dialog
          open={showDateFilterModal}
          onClose={() => setShowDateFilterModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-md relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-pink-500/5 to-rose-500/10 dark:from-purple-600/10 dark:via-pink-700/5 dark:to-rose-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide
                        icon="Calendar"
                        className="w-5 h-5 text-purple-400"
                      />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-white via-purple-100 to-pink-100 dark:from-white dark:via-purple-100 dark:to-pink-100 bg-clip-text text-transparent">
                      Filter by Date
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowDateFilterModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Lucide
                        icon="Calendar"
                        className="w-4 h-4 text-purple-400"
                      />
                      <label className="block text-sm font-semibold text-white/90 dark:text-slate-200">
                        Start Date
                      </label>
                    </div>
                    <div className="relative group">
                      <FormInput
                        type="date"
                        value={dateFilterStart}
                        onChange={(e) => setDateFilterStart(e.target.value)}
                        className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl px-4 py-4 text-white dark:text-slate-200 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 shadow-inner"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Lucide
                        icon="Calendar"
                        className="w-4 h-4 text-pink-400"
                      />
                      <label className="block text-sm font-semibold text-white/90 dark:text-slate-200">
                        End Date
                      </label>
                    </div>
                    <div className="relative group">
                      <FormInput
                        type="date"
                        value={dateFilterEnd}
                        onChange={(e) => setDateFilterEnd(e.target.value)}
                        className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl px-4 py-4 text-white dark:text-slate-200 focus:border-pink-400/50 focus:ring-2 focus:ring-pink-400/20 transition-all duration-200 shadow-inner"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <Button
                    variant="outline-secondary"
                    onClick={clearDateFilter}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="RotateCcw" className="w-4 h-4" />
                      <span>Clear Filter</span>
                    </div>
                  </Button>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowDateFilterModal(false)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={applyDateFilter}
                      className="px-8 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transform hover:scale-105"
                    >
                      <div className="flex items-center space-x-2">
                        <Lucide icon="Check" className="w-4 h-4" />
                        <span>Apply Filter</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Columns Modal */}
        <Dialog
          open={showColumnsModal}
          onClose={() => setShowColumnsModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-sm relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-teal-500/5 to-blue-500/10 dark:from-cyan-600/10 dark:via-teal-700/5 dark:to-blue-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8">
                <div className="flex items-center space-x-3 pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <Lucide icon="Grid2x2" className="w-5 h-5 text-cyan-400" />
                  </div>
                  <Dialog.Title className="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-teal-100 dark:from-white dark:via-cyan-100 dark:to-teal-100 bg-clip-text text-transparent">
                    Manage Columns
                  </Dialog.Title>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto mt-8">
                  {Object.entries(visibleColumns).map(([column, isVisible]) => {
                    // Check if this is a custom field
                    const isCustomField = column.startsWith("customField_");
                    const displayName = isCustomField
                      ? column.replace("customField_", "")
                      : column;

                    // Don't allow deletion of essential columns
                    const isEssentialColumn = [
                      "checkbox",
                      "contact",
                      "phone",
                      "actions",
                    ].includes(column);

                    return (
                      <div
                        key={column}
                        className="group flex items-center px-4 py-4 hover:bg-white/10 dark:hover:bg-slate-600/20 rounded-2xl transition-all duration-200 border border-white/10 dark:border-slate-600/20 bg-white/5 dark:bg-slate-700/10 backdrop-blur-sm"
                      >
                        <label className="flex items-center text-left w-full cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => {
                                setVisibleColumns((prev) => ({
                                  ...prev,
                                  [column]: !isVisible,
                                }));
                              }}
                              className="w-5 h-5 rounded-lg border-2 border-white/30 text-cyan-500 focus:ring-cyan-500/20 focus:ring-2 bg-white/5 backdrop-blur-sm transition-all duration-200"
                            />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-400/20 to-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                          </div>
                          <span className="ml-4 text-sm font-medium capitalize text-white/80 dark:text-slate-300 group-hover:text-white transition-colors duration-200">
                            {isCustomField
                              ? `${displayName} (Custom)`
                              : displayName}
                          </span>
                        </label>
                        <div className="flex items-center ml-auto">
                          {!isEssentialColumn && (
                            <button
                              onClick={() => {
                                setVisibleColumns((prev) => {
                                  const newColumns = { ...prev };
                                  delete newColumns[column];
                                  return newColumns;
                                });
                              }}
                              className="ml-3 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:outline-none transition-all duration-200 rounded-xl backdrop-blur-sm border border-red-400/20 hover:border-red-400/40"
                              title="Delete column"
                            >
                              <Lucide icon="Trash2" className="w-4 h-4" />
                            </button>
                          )}
                          {isEssentialColumn && (
                            <span className="text-xs text-cyan-400 font-medium bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-400/20">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-10 flex justify-end space-x-3 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    onClick={() => setShowColumnsModal(false)}
                    className="px-6 py-3 text-sm font-medium text-white/90 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 rounded-2xl hover:text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Show confirmation dialog before resetting
                      if (
                        window.confirm(
                          "This will restore all default columns. Are you sure?"
                        )
                      ) {
                        // Reset to default columns
                        setVisibleColumns({
                          checkbox: true,
                          contact: true,
                          phone: true,
                          tags: true,
                          ic: true,
                          expiryDate: true,
                          vehicleNumber: true,
                          branch: true,
                          notes: true,
                          // Add any other default columns you want to include
                        });
                      }
                    }}
                    className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-500 hover:from-cyan-600 hover:via-teal-600 hover:to-blue-600 rounded-2xl border-0 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20 transform hover:scale-105"
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="RotateCcw" className="w-4 h-4" />
                      <span>Reset to Default</span>
                    </div>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Delete Tag Modal - Tag List for Deletion */}
        {showDeleteTagModal && (
          <Dialog
            open={showDeleteTagModal}
            onClose={() => setShowDeleteTagModal(false)}
          >
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
              <Dialog.Panel className="w-full max-w-2xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.005] transition-all duration-300 max-h-[90vh]">
                {/* Enhanced Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 via-pink-500/5 to-rose-500/10 dark:from-red-600/10 dark:via-pink-700/5 dark:to-rose-600/10 pointer-events-none" />

                {/* Top Shine Effect */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                <div className="relative p-8">
                  <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                        <Lucide
                          icon="Trash2"
                          className="w-5 h-5 text-red-400"
                        />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-red-100 to-pink-100 dark:from-white dark:via-red-100 dark:to-pink-100 bg-clip-text text-transparent">
                          Delete Tags
                        </h3>
                        <p className="text-white/70 text-sm mt-1">
                          Select tags to delete from your system
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDeleteTagModal(false)}
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-white/80 hover:text-white transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg hover:shadow-xl"
                    >
                      <Lucide icon="X" className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-8">
                    {tagList.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="relative mx-auto mb-6 w-20 h-20">
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/20 to-gray-500/20 rounded-3xl backdrop-blur-sm border border-white/10" />
                          <div className="absolute inset-2 bg-gradient-to-br from-slate-400/10 to-gray-400/10 rounded-2xl" />
                          <Lucide
                            icon="Tag"
                            className="w-10 h-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                        <h4 className="text-lg font-semibold text-white/90 mb-2">
                          No Tags Found
                        </h4>
                        <p className="text-white/60 text-sm">
                          There are no tags available to delete.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6">
                          <p className="text-white/80 text-sm leading-relaxed bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                            <span className="text-red-300 font-medium">
                              ⚠️ Warning:
                            </span>{" "}
                            Deleting tags will remove them from all contacts.
                            This action cannot be undone.
                          </p>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                          {tagList.map((tag) => (
                            <div
                              key={tag.id}
                              className="group relative p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 hover:border-red-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/40">
                                    <Lucide
                                      icon="Tag"
                                      className="w-4 h-4 text-blue-400"
                                    />
                                  </div>
                                  <div>
                                    <h4 className="text-white/90 font-semibold">
                                      {tag.name}
                                    </h4>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Are you sure you want to delete the tag "${tag.name}"? This will remove it from all contacts and cannot be undone.`
                                      )
                                    ) {
                                      setTagToDelete(tag);
                                      handleConfirmDeleteTag();
                                    }
                                  }}
                                  className="px-4 py-2 bg-gradient-to-r from-red-500/80 to-pink-600/80 hover:from-red-600/90 hover:to-pink-700/90 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transform hover:scale-105 flex items-center space-x-2 group-hover:scale-110"
                                >
                                  <Lucide icon="Trash2" className="w-4 h-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {tagList.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-white/10 dark:border-slate-700/20">
                            <div className="flex items-center justify-between">
                              <div className="text-white/70 text-sm">
                                <span className="font-medium">
                                  {tagList.length}
                                </span>{" "}
                                tag{tagList.length !== 1 ? "s" : ""} available
                              </div>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete ALL ${tagList.length} tags? This will remove them from all contacts and cannot be undone.`
                                    )
                                  ) {
                                    // Handle bulk delete - you'll need to implement this function
                                    handleBulkDeleteTags();
                                  }
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-red-600/90 to-rose-700/90 hover:from-red-700 hover:to-rose-800 text-white rounded-2xl transition-all duration-200 font-bold shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transform hover:scale-105 flex items-center space-x-2"
                              >
                                <Lucide icon="Trash" className="w-4 h-4" />
                                <span>Delete All Tags</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex justify-end mt-8 pt-6 border-t border-white/10 dark:border-slate-700/20">
                    <button
                      onClick={() => setShowDeleteTagModal(false)}
                      className="px-8 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      <div className="flex items-center space-x-2">
                        <Lucide icon="X" className="w-4 h-4" />
                        <span>Close</span>
                      </div>
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}

        {/* CSV Import Modal */}
        <Dialog
          open={showCsvImportModal}
          onClose={() => setShowCsvImportModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-md relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 via-blue-500/5 to-cyan-500/10 dark:from-indigo-600/10 dark:via-blue-700/5 dark:to-cyan-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8">
                <div className="flex items-center space-x-3 pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <Lucide icon="Upload" className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-white via-indigo-100 to-blue-100 dark:from-white dark:via-indigo-100 dark:to-blue-100 bg-clip-text text-transparent">
                    Import CSV
                  </h3>
                </div>

                <div className="mt-8 space-y-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-white/90 dark:text-slate-200">
                      Select CSV File
                    </label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvFileSelect}
                        className="block w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl px-4 py-4 text-white dark:text-slate-200 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200 shadow-inner file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                    <button
                      onClick={handleDownloadSampleCsv}
                      className="text-sm text-indigo-300 hover:text-indigo-200 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors font-medium underline underline-offset-2"
                    >
                      ↓ Download Sample CSV
                    </button>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-white/90 dark:text-slate-200">
                      Select Tags
                    </label>
                    <div className="max-h-40 overflow-y-auto bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-2">
                      {tagList.map((tag) => (
                        <label
                          key={tag.id}
                          className="group flex items-center p-3 rounded-xl hover:bg-white/10 dark:hover:bg-slate-600/20 transition-all duration-200 cursor-pointer border border-transparent hover:border-white/10"
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              value={tag.name}
                              checked={selectedImportTags.includes(tag.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedImportTags([
                                    ...selectedImportTags,
                                    tag.name,
                                  ]);
                                } else {
                                  setSelectedImportTags(
                                    selectedImportTags.filter(
                                      (t) => t !== tag.name
                                    )
                                  );
                                }
                              }}
                              className="w-5 h-5 rounded-lg border-2 border-white/30 text-indigo-500 focus:ring-indigo-500/20 focus:ring-2 bg-white/5 backdrop-blur-sm transition-all duration-200"
                            />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                          </div>
                          <span className="ml-4 text-sm font-medium text-white/80 dark:text-slate-300 group-hover:text-white transition-colors duration-200">
                            {tag.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-white/90 dark:text-slate-200">
                      Add New Tags (comma-separated)
                    </label>
                    <div className="relative group">
                      <input
                        type="text"
                        value={importTags.join(", ")}
                        onChange={(e) =>
                          setImportTags(
                            e.target.value.split(",").map((tag) => tag.trim())
                          )
                        }
                        className="block w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl px-4 py-4 text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200 shadow-inner"
                        placeholder="Enter new tags separated by commas..."
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                    onClick={() => setShowCsvImportModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={handleCsvImport}
                    disabled={!selectedCsvFile || isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Importing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Lucide icon="Upload" className="w-4 h-4" />
                        <span>Import</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Sync Confirmation Modal */}
        <Dialog
          open={showSyncConfirmationModal}
          onClose={() => setShowSyncConfirmationModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-md relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-orange-500/5 to-yellow-500/10 dark:from-amber-600/10 dark:via-orange-700/5 dark:to-yellow-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8">
                <div className="text-center">
                  <div className="relative mx-auto mb-6 w-20 h-20">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl backdrop-blur-sm border border-white/10" />
                    <div className="absolute inset-2 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-2xl" />
                    <Lucide
                      icon="AlertTriangle"
                      className="w-10 h-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400"
                    />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-amber-100 to-orange-100 dark:from-white dark:via-amber-100 dark:to-orange-100 bg-clip-text text-transparent mb-4">
                    Sync Database?
                  </h3>
                  <div className="text-white/80 dark:text-slate-300 text-sm leading-relaxed space-y-2">
                    <p>
                      This action will sync the database and may take some time.
                    </p>
                    <p className="text-amber-300 font-medium">
                      It may affect your current data.
                    </p>
                    <p className="text-xs text-white/60 mt-3 bg-white/5 rounded-xl p-3 border border-white/10">
                      You can choose to sync from Neon (default) or from
                      Firebase to Neon.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                    onClick={() => setShowSyncConfirmationModal(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="X" className="w-4 h-4" />
                      <span>Cancel</span>
                    </div>
                  </button>
                  <button
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 hover:from-indigo-600 hover:via-blue-600 hover:to-cyan-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={handleConfirmSync}
                    disabled={isSyncing || isSyncingFirebase}
                  >
                    {isSyncing ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Syncing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Lucide icon="Database" className="w-4 h-4" />
                        <span>Sync (Neon)</span>
                      </div>
                    )}
                  </button>
                  <button
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={handleConfirmSyncFirebase}
                    disabled={isSyncing || isSyncingFirebase}
                  >
                    {isSyncingFirebase ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Syncing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Lucide icon="Cloud" className="w-4 h-4" />
                        <span>Sync Firebase</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Sync Names Confirmation Modal */}
        <Dialog
          open={showSyncNamesConfirmationModal}
          onClose={() => setShowSyncNamesConfirmationModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-md relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 via-purple-500/5 to-indigo-500/10 dark:from-violet-600/10 dark:via-purple-700/5 dark:to-indigo-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8">
                <div className="text-center">
                  <div className="relative mx-auto mb-6 w-20 h-20">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-3xl backdrop-blur-sm border border-white/10" />
                    <div className="absolute inset-2 bg-gradient-to-br from-violet-400/10 to-purple-400/10 rounded-2xl" />
                    <Lucide
                      icon="Users"
                      className="w-10 h-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-violet-400"
                    />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-violet-100 to-purple-100 dark:from-white dark:via-violet-100 dark:to-purple-100 bg-clip-text text-transparent mb-4">
                    Sync Contact Names?
                  </h3>
                  <div className="text-white/80 dark:text-slate-300 text-sm leading-relaxed space-y-2">
                    <p>
                      This action will sync all contact names and may take some
                      time.
                    </p>
                    <p className="text-violet-300 font-medium">
                      It may affect your current contact data.
                    </p>
                  </div>
                </div>
                <div className="flex justify-center space-x-4 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                    onClick={() => setShowSyncNamesConfirmationModal(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="X" className="w-4 h-4" />
                      <span>Cancel</span>
                    </div>
                  </button>
                  <button
                    className="px-8 py-3 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 hover:from-violet-600 hover:via-purple-600 hover:to-indigo-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transform hover:scale-105"
                    onClick={handleConfirmSyncNames}
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="RefreshCw" className="w-4 h-4" />
                      <span>Confirm Sync</span>
                    </div>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Blast Message Modal */}
        <Dialog
          open={blastMessageModal}
          onClose={() => setBlastMessageModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-4xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden overflow-y-auto transform hover:scale-[1.005] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-violet-500/5 to-purple-500/10 dark:from-blue-600/10 dark:via-violet-700/5 dark:to-purple-600/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide icon="Send" className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-violet-100 dark:from-white dark:via-blue-100 dark:to-violet-100 bg-clip-text text-transparent">
                      Blast Message
                    </h3>
                  </div>
                  <button
                    onClick={() => setBlastMessageModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 space-y-8">
                  {/* Recipients Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide icon="Users" className="w-5 h-5 text-blue-400" />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Recipients ({selectedContacts.length} selected)
                      </label>
                    </div>
                    <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-2xl p-6 max-h-48 overflow-y-auto border border-white/20 dark:border-slate-600/20 shadow-inner">
                      {selectedContacts.length > 0 ? (
                        <div className="space-y-3">
                          {selectedContacts
                            .slice(0, 10)
                            .map((contact, index) => (
                              <div
                                key={index}
                                className="flex items-center p-3 bg-white/10 dark:bg-slate-600/20 rounded-xl backdrop-blur-sm border border-white/10"
                              >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-medium mr-3 shadow-lg">
                                  {contact.contactName
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"}
                                </div>
                                <span className="text-white/90 dark:text-slate-200 font-medium">
                                  {contact.contactName || contact.phone}
                                </span>
                              </div>
                            ))}
                          {selectedContacts.length > 10 && (
                            <div className="text-sm text-white/70 dark:text-slate-400 bg-white/5 dark:bg-slate-600/10 rounded-xl p-3 text-center backdrop-blur-sm border border-white/10">
                              ... and {selectedContacts.length - 10} more
                              contacts
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-white/60 dark:text-slate-400 py-8">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-slate-500/20 dark:from-slate-700/50 dark:to-slate-600/50 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/10">
                            <Lucide
                              icon="Users"
                              className="w-8 h-8 opacity-50"
                            />
                          </div>
                          <p className="font-medium text-white/80">
                            No contacts selected
                          </p>
                          <p className="text-xs mt-1 text-white/60">
                            Please select contacts first to send messages
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="Smartphone"
                        className="w-5 h-5 text-violet-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Select Phone
                      </label>
                    </div>
                    <div className="relative group">
                      <select
                        id="phone"
                        name="phone"
                        value={phoneIndex === null ? "" : phoneIndex}
                        onChange={(e) =>
                          setPhoneIndex(
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                          )
                        }
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200 shadow-inner"
                      >
                        <option value="" className="bg-slate-800 text-white">
                          Select a phone
                        </option>
                        {Object.keys(phoneNames).length > 0 ? (
                          Object.keys(phoneNames).map((index) => {
                            const phoneIndexOption = parseInt(index);
                            const qrCode = qrCodes[phoneIndexOption];
                            const statusInfo = qrCode
                              ? getStatusInfo(qrCode.status)
                              : isLoadingStatus
                              ? {
                                  text: "Checking...",
                                  color:
                                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200",
                                  icon: "RefreshCw",
                                }
                              : {
                                  text: "Not Connected",
                                  color:
                                    "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200",
                                  icon: "XCircle",
                                };
                            return (
                              <option
                                key={phoneIndexOption}
                                value={phoneIndexOption}
                                className="bg-slate-800 text-white"
                              >
                                {`${getPhoneName(phoneIndexOption)} - ${
                                  qrCode ? "✅" : isLoadingStatus ? "⏳" : "❌"
                                } ${statusInfo.text}`}
                              </option>
                            );
                          })
                        ) : (
                          <option
                            value=""
                            disabled
                            className="bg-slate-800 text-white"
                          >
                            No phones available - Please check your
                            configuration
                          </option>
                        )}
                      </select>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      {isLoadingStatus && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                          <LoadingIcon icon="three-dots" className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    {phoneIndex !== null && phoneNames[phoneIndex] && (
                      <div
                        className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm border border-white/10 ${
                          qrCodes[phoneIndex]
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        <Lucide
                          icon={
                            qrCodes[phoneIndex]
                              ? getStatusInfo(qrCodes[phoneIndex].status).icon
                              : "XCircle"
                          }
                          className="w-4 h-4 mr-2"
                        />
                        {qrCodes[phoneIndex]
                          ? getStatusInfo(qrCodes[phoneIndex].status).text
                          : isLoadingStatus
                          ? "Checking..."
                          : "Not Connected"}
                      </div>
                    )}

                    {/* Help message when phones are not connected */}
                    {Object.keys(phoneNames).length > 0 &&
                      !Object.values(qrCodes).some(
                        (qr) =>
                          qr &&
                          ["ready", "authenticated"].includes(
                            qr.status?.toLowerCase()
                          )
                      ) && (
                        <div className="text-xs text-amber-300 bg-amber-500/10 backdrop-blur-sm p-4 rounded-2xl border border-amber-400/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Lucide icon="AlertTriangle" className="w-4 h-4" />
                            <span className="font-medium">
                              Connection Required
                            </span>
                          </div>
                          <p>
                            No phones are currently connected. Please ensure
                            your WhatsApp bot is running and connected before
                            sending messages.
                          </p>
                        </div>
                      )}
                  </div>

                  {/* Message Content */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="MessageSquare"
                        className="w-5 h-5 text-blue-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Message Content
                      </label>
                    </div>
                    <div className="relative group">
                      <textarea
                        value={blastMessage}
                        onChange={(e) => setBlastMessage(e.target.value)}
                        placeholder="Enter your message here..."
                        rows={6}
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 resize-none shadow-inner"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 dark:text-slate-400 bg-white/5 dark:bg-slate-700/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                        Character count: {blastMessage.length}
                      </span>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setShowPlaceholders(!showPlaceholders)}
                        className="bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                      >
                        <Lucide icon="Code" className="w-4 h-4 mr-2" />
                        Placeholders
                      </Button>
                    </div>

                    {showPlaceholders && (
                      <div className="p-6 bg-blue-500/10 backdrop-blur-xl rounded-2xl border border-blue-400/20">
                        <p className="text-sm font-medium text-blue-300 mb-4 flex items-center gap-2">
                          <Lucide icon="Code" className="w-4 h-4" />
                          Available Placeholders:
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {[
                            "contactName",
                            "firstName",
                            "lastName",
                            "phone",
                            "email",
                            "company",
                            "branch",
                            "vehicleNumber",
                            "ic",
                            "expiryDate",
                          ].map((placeholder) => (
                            <button
                              key={placeholder}
                              onClick={() => insertPlaceholder(placeholder)}
                              className="text-left p-3 rounded-xl bg-white/10 dark:bg-blue-800/30 text-blue-200 dark:text-blue-200 hover:bg-white/20 dark:hover:bg-blue-700/50 transition-all duration-200 border border-blue-400/20 backdrop-blur-sm font-mono"
                            >
                              @{"{"}${placeholder}
                              {"}"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Media Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Image"
                          className="w-5 h-5 text-emerald-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Media File (Optional)
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleMediaUpload}
                          className="w-full text-sm text-white/80 dark:text-slate-400 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-4 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-blue-500 file:to-violet-600 file:text-white hover:file:from-blue-600 hover:file:to-violet-700 file:transition-all file:duration-200 shadow-inner"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                        {selectedMedia && (
                          <div className="mt-3 flex items-center justify-between bg-emerald-500/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-emerald-400/20">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <Lucide
                                icon="Image"
                                className="w-4 h-4 text-emerald-400 flex-shrink-0"
                              />
                              <span className="text-xs text-emerald-300 truncate font-medium">
                                {selectedMedia.name.length > 30
                                  ? `${selectedMedia.name.substring(0, 30)}...`
                                  : selectedMedia.name}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedMedia(null)}
                              className="ml-2 w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all duration-200 flex items-center justify-center flex-shrink-0"
                            >
                              <Lucide icon="X" className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="FileText"
                          className="w-5 h-5 text-orange-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Document File (Optional)
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleDocumentUpload}
                          className="w-full text-sm text-white/80 dark:text-slate-400 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-4 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-emerald-500 file:to-teal-600 file:text-white hover:file:from-emerald-600 hover:file:to-teal-700 file:transition-all file:duration-200 shadow-inner"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                        {selectedDocument && (
                          <div className="mt-3 flex items-center justify-between bg-orange-500/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-orange-400/20">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <Lucide
                                icon="FileText"
                                className="w-4 h-4 text-orange-400 flex-shrink-0"
                              />
                              <span className="text-xs text-orange-300 truncate font-medium">
                                {selectedDocument.name.length > 30
                                  ? `${selectedDocument.name.substring(
                                      0,
                                      30
                                    )}...`
                                  : selectedDocument.name}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedDocument(null)}
                              className="ml-2 w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all duration-200 flex items-center justify-center flex-shrink-0"
                            >
                              <Lucide icon="X" className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scheduling Options */}
                  <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                        <Lucide
                          icon="Calendar"
                          className="w-5 h-5 text-violet-400"
                        />
                      </div>
                      <h4 className="text-xl font-bold text-white/90 dark:text-slate-200">
                        Scheduling Options
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-white/80 dark:text-slate-400">
                          Schedule Date
                        </label>
                        <DatePickerComponent
                          selected={blastStartDate}
                          onChange={(date: Date) => setBlastStartDate(date)}
                          dateFormat="MMMM d, yyyy"
                          className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-sm text-white dark:text-slate-200 shadow-inner focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-white/80 dark:text-slate-400">
                          Schedule Time
                        </label>
                        <DatePickerComponent
                          selected={blastStartTime}
                          onChange={(time: Date) => setBlastStartTime(time)}
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeCaption="Time"
                          dateFormat="h:mm aa"
                          className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-sm text-white dark:text-slate-200 shadow-inner focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-white/80 dark:text-slate-400">
                          Batch Size
                        </label>
                        <FormInput
                          type="number"
                          value={batchQuantity}
                          onChange={(e) =>
                            setBatchQuantity(Number(e.target.value))
                          }
                          min="1"
                          max="100"
                          className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl shadow-inner focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200 text-white"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-white/80 dark:text-slate-400">
                          Delay (Minutes)
                        </label>
                        <FormInput
                          type="number"
                          value={repeatInterval}
                          onChange={(e) =>
                            setRepeatInterval(Number(e.target.value))
                          }
                          min="0"
                          className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl shadow-inner focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200 text-white"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-white/80 dark:text-slate-400">
                          Delay Unit
                        </label>
                        <FormSelect
                          value={repeatUnit}
                          onChange={(e) =>
                            setRepeatUnit(
                              e.target.value as "minutes" | "hours" | "days"
                            )
                          }
                          className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl shadow-inner focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200 text-white"
                        >
                          <option
                            value="minutes"
                            className="bg-slate-800 text-white"
                          >
                            Minutes
                          </option>
                          <option
                            value="hours"
                            className="bg-slate-800 text-white"
                          >
                            Hours
                          </option>
                          <option
                            value="days"
                            className="bg-slate-800 text-white"
                          >
                            Days
                          </option>
                        </FormSelect>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar (shown during sending) */}
                  {isScheduling && (
                    <div className="bg-blue-500/10 backdrop-blur-xl rounded-3xl p-6 border border-blue-400/20 shadow-inner">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-blue-300 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                            <Lucide
                              icon="Clock"
                              className="w-4 h-4 text-white"
                            />
                          </div>
                          Scheduling messages...
                        </span>
                        <span className="text-sm text-blue-300 font-semibold bg-blue-500/20 px-4 py-2 rounded-full backdrop-blur-sm border border-blue-400/20">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-900/30 rounded-full h-4 backdrop-blur-sm border border-blue-400/20">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-violet-600 h-4 rounded-full transition-all duration-500 shadow-lg"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <div className="text-sm text-white/70 dark:text-slate-400 bg-white/5 dark:bg-slate-700/20 backdrop-blur-sm px-4 py-3 rounded-full border border-white/10">
                    <div className="flex items-center space-x-2">
                      <Lucide icon="Users" className="w-4 h-4" />
                      <span>{selectedContacts.length} recipients selected</span>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline-secondary"
                      onClick={() => setBlastMessageModal(false)}
                      disabled={isScheduling}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={sendBlastMessage}
                      disabled={
                        selectedContacts.length === 0 ||
                        !blastMessage.trim() ||
                        phoneIndex === null ||
                        phoneIndex === undefined ||
                        !phoneNames[phoneIndex] ||
                        isScheduling
                      }
                      className="px-8 py-3 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 hover:from-blue-600 hover:via-violet-600 hover:to-purple-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isScheduling ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Scheduling...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Lucide icon="Send" className="w-4 h-4" />
                          <span>Schedule Message</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Edit Scheduled Message Modal */}
        <Dialog
          open={editScheduledMessageModal}
          onClose={() => setEditScheduledMessageModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-lg relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden overflow-y-auto transform hover:scale-[1.005] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 via-purple-500/5 to-blue-500/10 dark:from-indigo-600/10 dark:via-purple-700/5 dark:to-blue-600/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide
                        icon="PenTool"
                        className="w-6 h-6 text-indigo-400"
                      />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-indigo-100 to-purple-100 dark:from-white dark:via-indigo-100 dark:to-purple-100 bg-clip-text text-transparent">
                      Edit Scheduled Message
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditScheduledMessageModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 space-y-6">
                  {/* Message Content */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="MessageSquare"
                        className="w-5 h-5 text-indigo-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Message Content
                      </label>
                    </div>
                    <textarea
                      value={blastMessage}
                      onChange={(e) => setBlastMessage(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200 resize-none shadow-inner"
                    />
                  </div>

                  {/* Placeholders */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowPlaceholders(!showPlaceholders)}
                      className="flex items-center space-x-2 text-indigo-300 hover:text-indigo-200 transition-colors duration-200"
                    >
                      <Lucide icon="Code" className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {showPlaceholders
                          ? "Hide Placeholders"
                          : "Show Placeholders"}
                      </span>
                    </button>
                    {showPlaceholders && (
                      <div className="p-6 bg-indigo-500/10 backdrop-blur-xl rounded-2xl border border-indigo-400/20 space-y-4">
                        <p className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                          <Lucide icon="Info" className="w-4 h-4" />
                          Click to insert:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[
                            "contactName",
                            "firstName",
                            "lastName",
                            "email",
                            "phone",
                            "vehicleNumber",
                            "branch",
                            "expiryDate",
                            "ic",
                            "name",
                          ].map((field) => (
                            <button
                              key={field}
                              type="button"
                              onClick={() => insertPlaceholder(field)}
                              className="text-left p-3 rounded-xl bg-white/10 dark:bg-indigo-800/30 text-indigo-200 dark:text-indigo-200 hover:bg-white/20 dark:hover:bg-indigo-700/50 transition-all duration-200 border border-indigo-400/20 backdrop-blur-sm font-mono"
                            >
                              @{"{"}${field}
                              {"}"}
                            </button>
                          ))}
                        </div>

                        {/* Custom Fields Placeholders */}
                        {(() => {
                          const allCustomFields = new Set<string>();

                          if (selectedContacts && selectedContacts.length > 0) {
                            selectedContacts.forEach((contact) => {
                              if (contact.customFields) {
                                Object.keys(contact.customFields).forEach(
                                  (key) => allCustomFields.add(key)
                                );
                              }
                            });
                          }

                          if (
                            allCustomFields.size === 0 &&
                            contacts &&
                            contacts.length > 0
                          ) {
                            contacts.forEach((contact) => {
                              if (contact.customFields) {
                                Object.keys(contact.customFields).forEach(
                                  (key) => allCustomFields.add(key)
                                );
                              }
                            });
                          }

                          if (allCustomFields.size > 0) {
                            return (
                              <div className="space-y-3 pt-3 border-t border-indigo-400/20">
                                <p className="text-sm font-medium text-emerald-300 flex items-center gap-2">
                                  <Lucide icon="Settings" className="w-4 h-4" />
                                  Custom Fields:
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Array.from(allCustomFields).map((field) => (
                                    <button
                                      key={field}
                                      type="button"
                                      onClick={() => {
                                        const placeholder = `@{${field}}`;
                                        const newMessages = [...messages];
                                        if (newMessages.length > 0) {
                                          const currentText =
                                            newMessages[focusedMessageIndex]
                                              .text;
                                          const newText =
                                            currentText.slice(
                                              0,
                                              cursorPosition
                                            ) +
                                            placeholder +
                                            currentText.slice(cursorPosition);

                                          newMessages[focusedMessageIndex] = {
                                            ...newMessages[focusedMessageIndex],
                                            text: newText,
                                          };
                                          setMessages(newMessages);

                                          setCursorPosition(
                                            cursorPosition + placeholder.length
                                          );
                                        }
                                      }}
                                      className="text-left p-3 rounded-xl bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 transition-all duration-200 border border-emerald-400/20 backdrop-blur-sm font-mono"
                                    >
                                      @{"{"}${field}
                                      {"}"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Scheduled Time */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="Clock"
                        className="w-5 h-5 text-purple-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Scheduled Time
                      </label>
                    </div>
                    <DatePickerComponent
                      selected={
                        currentScheduledMessage?.scheduledTime
                          ? new Date(currentScheduledMessage.scheduledTime)
                          : new Date()
                      }
                      onChange={(date: Date | null) => {
                        setCurrentScheduledMessage((prev) => ({
                          ...prev!,
                          scheduledTime: date ? date.toISOString() : "",
                        }));
                      }}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-sm text-white dark:text-slate-200 shadow-inner focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                    />
                  </div>

                  {/* Media Upload */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="Image"
                        className="w-5 h-5 text-emerald-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Attach Media (Image/Video)
                      </label>
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const maxSize = file.type.startsWith("video/")
                            ? 20971520
                            : 5242880;
                          if (file.size > maxSize) {
                            toast.error(
                              "The video file is too big. Please select a file smaller than 20MB."
                            );
                            return;
                          }
                          try {
                            handleEditMediaUpload(e);
                          } catch (error) {
                            toast.error(
                              "Upload unsuccessful. Please try again."
                            );
                          }
                        }
                      }}
                      className="w-full text-sm text-white/80 dark:text-slate-400 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-4 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-emerald-500 file:to-teal-600 file:text-white hover:file:from-emerald-600 hover:file:to-teal-700 file:transition-all file:duration-200 shadow-inner"
                    />
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="FileText"
                        className="w-5 h-5 text-orange-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Attach Document
                      </label>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={(e) => handleEditDocumentUpload(e)}
                      className="w-full text-sm text-white/80 dark:text-slate-400 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-4 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-orange-500 file:to-amber-600 file:text-white hover:file:from-orange-600 hover:file:to-amber-700 file:transition-all file:duration-200 shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    onClick={() => setEditScheduledMessageModal(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveScheduledMessage}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:scale-105"
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide icon="Save" className="w-4 h-4" />
                      <span>Save</span>
                    </div>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Edit Contact Modal */}
        <Dialog
          open={editContactModal}
          onClose={() => setEditContactModal(false)}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-4xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden overflow-y-auto transform hover:scale-[1.005] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-blue-500/5 to-purple-500/10 dark:from-emerald-600/10 dark:via-blue-700/5 dark:to-purple-600/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide
                        icon="UserCog"
                        className="w-6 h-6 text-emerald-400"
                      />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-emerald-100 to-blue-100 dark:from-white dark:via-emerald-100 dark:to-blue-100 bg-clip-text text-transparent">
                      Edit Contact
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditContactModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                {currentContact && (
                  <div className="mt-8 space-y-8">
                    {/* Basic Contact Information */}
                    <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <Lucide
                          icon="User"
                          className="w-6 h-6 text-emerald-400"
                        />
                        <h4 className="text-xl font-semibold text-white/90 dark:text-slate-200">
                          Basic Information
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Contact Name</span>
                          </label>
                          <FormInput
                            type="text"
                            value={
                              currentContact.contactName ||
                              currentContact.name ||
                              ""
                            }
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                contactName: e.target.value,
                                name: e.target.value,
                              })
                            }
                            placeholder="Enter contact name"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Last Name</span>
                          </label>
                          <FormInput
                            type="text"
                            value={currentContact.lastName || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                lastName: e.target.value,
                              })
                            }
                            placeholder="Enter last name"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Phone Number</span>
                          </label>
                          <FormInput
                            type="tel"
                            value={currentContact.phone || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                phone: e.target.value,
                              })
                            }
                            placeholder="e.g., +60123456789"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Email</span>
                          </label>
                          <FormInput
                            type="email"
                            value={currentContact.email || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                email: e.target.value,
                              })
                            }
                            placeholder="Enter email address"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Company Name</span>
                          </label>
                          <FormInput
                            type="text"
                            value={currentContact.companyName || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                companyName: e.target.value,
                              })
                            }
                            placeholder="Enter company name"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Address</span>
                          </label>
                          <FormInput
                            type="text"
                            value={currentContact.address1 || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                address1: e.target.value,
                              })
                            }
                            placeholder="Enter address"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-pink-400/50 focus:ring-2 focus:ring-pink-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Branch</span>
                          </label>
                          <FormInput
                            type="text"
                            value={currentContact.branch || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                branch: e.target.value,
                              })
                            }
                            placeholder="Enter branch"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Vehicle Number</span>
                          </label>
                          <FormInput
                            type="text"
                            value={currentContact.vehicleNumber || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                vehicleNumber: e.target.value,
                              })
                            }
                            placeholder="Enter vehicle number"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>IC Number</span>
                          </label>
                          <FormInput
                            type="text"
                            value={currentContact.ic || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                ic: e.target.value,
                              })
                            }
                            placeholder="Enter IC number"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <span>Expiry Date</span>
                          </label>
                          <FormInput
                            type="date"
                            value={currentContact.expiryDate || ""}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                expiryDate: e.target.value,
                              })
                            }
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-rose-400/50 focus:ring-2 focus:ring-rose-400/20 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Company-specific fields */}
                    {companyId === "095" && (
                      <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-6">
                        <div className="flex items-center space-x-3 mb-6">
                          <Lucide
                            icon="GraduationCap"
                            className="w-6 h-6 text-violet-400"
                          />
                          <h4 className="text-xl font-semibold text-white/90 dark:text-slate-200">
                            Education Information
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <span>Country</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.country || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  country: e.target.value,
                                })
                              }
                              placeholder="Enter country"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-green-400/50 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <span>Nationality</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.nationality || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  nationality: e.target.value,
                                })
                              }
                              placeholder="Enter nationality"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-red-400/50 focus:ring-2 focus:ring-red-400/20 transition-all duration-200"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <span>Highest Educational Qualification</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.highestEducation || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  highestEducation: e.target.value,
                                })
                              }
                              placeholder="Enter highest education"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <span>Program Of Study</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.programOfStudy || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  programOfStudy: e.target.value,
                                })
                              }
                              placeholder="Enter program of study"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <span>Intake Preference</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.intakePreference || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  intakePreference: e.target.value,
                                })
                              }
                              placeholder="Enter intake preference"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <span>English Proficiency</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.englishProficiency || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  englishProficiency: e.target.value,
                                })
                              }
                              placeholder="Enter English proficiency"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <span>Validity of Passport</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.passport || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  passport: e.target.value,
                                })
                              }
                              placeholder="Enter passport validity"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Points System */}
                    {(companyId === "079" || companyId === "001") && (
                      <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-6">
                        <div className="flex items-center space-x-3 mb-6">
                          <Lucide
                            icon="Star"
                            className="w-6 h-6 text-yellow-400"
                          />
                          <h4 className="text-xl font-semibold text-white/90 dark:text-slate-200">
                            Points System
                          </h4>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                            <Lucide
                              icon="Award"
                              className="w-4 h-4 text-yellow-400"
                            />
                            <span>Points</span>
                          </label>
                          <FormInput
                            type="number"
                            value={currentContact.points || 0}
                            onChange={(e) =>
                              setCurrentContact({
                                ...currentContact,
                                points: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="Enter points"
                            className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-200"
                          />
                        </div>
                      </div>
                    )}

                    {/* AI Assistant Integration */}
                    {companyId === "001" && (
                      <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-6">
                        <div className="flex items-center space-x-3 mb-6">
                          <Lucide
                            icon="Bot"
                            className="w-6 h-6 text-emerald-400"
                          />
                          <h4 className="text-xl font-semibold text-white/90 dark:text-slate-200">
                            AI Assistant Integration
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <Lucide
                                icon="UserCheck"
                                className="w-4 h-4 text-emerald-400"
                              />
                              <span>Assistant ID</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.assistantId || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  assistantId: e.target.value,
                                })
                              }
                              placeholder="Enter assistant ID"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200"
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                              <Lucide
                                icon="MessageSquare"
                                className="w-4 h-4 text-blue-400"
                              />
                              <span>Thread ID</span>
                            </label>
                            <FormInput
                              type="text"
                              value={currentContact.threadid || ""}
                              onChange={(e) =>
                                setCurrentContact({
                                  ...currentContact,
                                  threadid: e.target.value,
                                })
                              }
                              placeholder="Enter thread ID"
                              className="w-full bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Fields */}
                    {currentContact.customFields &&
                      Object.entries(currentContact.customFields).length >
                        0 && (
                        <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-6">
                          <div className="flex items-center space-x-3 mb-6">
                            <Lucide
                              icon="Settings"
                              className="w-6 h-6 text-purple-400"
                            />
                            <h4 className="text-xl font-semibold text-white/90 dark:text-slate-200">
                              Custom Fields
                            </h4>
                          </div>

                          <div className="space-y-6">
                            {Object.entries(currentContact.customFields).map(
                              ([key, value]) => (
                                <div key={key} className="space-y-3">
                                  <label className="flex items-center space-x-2 text-sm font-medium text-white/80 dark:text-slate-300">
                                    <Lucide
                                      icon="Tag"
                                      className="w-4 h-4 text-purple-400"
                                    />
                                    <span>{key}</span>
                                  </label>
                                  <div className="flex gap-3">
                                    <FormInput
                                      type="text"
                                      value={value}
                                      onChange={(e) =>
                                        setCurrentContact({
                                          ...currentContact,
                                          customFields: {
                                            ...currentContact.customFields,
                                            [key]: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder={`Enter ${key}`}
                                      className="flex-1 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200"
                                    />
                                    <button
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `Are you sure you want to delete the custom field "${key}" from all contacts?`
                                          )
                                        ) {
                                          deleteCustomFieldFromAllContacts(key);
                                          const newCustomFields = {
                                            ...currentContact.customFields,
                                          };
                                          delete newCustomFields[key];
                                          setCurrentContact({
                                            ...currentContact,
                                            customFields: newCustomFields,
                                          });
                                        }
                                      }}
                                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 hover:text-red-200 rounded-xl transition-all duration-200 backdrop-blur-sm"
                                    >
                                      <Lucide
                                        icon="Trash2"
                                        className="w-4 h-4"
                                      />
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Add New Field */}
                    <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner">
                      <button
                        onClick={() => {
                          const fieldName = prompt(
                            "Enter the name of the new field:"
                          );
                          if (fieldName) {
                            addCustomFieldToAllContacts(fieldName);
                            setCurrentContact({
                              ...currentContact,
                              customFields: {
                                ...currentContact.customFields,
                                [fieldName]: "",
                              },
                            });
                          }
                        }}
                        className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 hover:from-emerald-500/30 hover:to-blue-500/30 border border-emerald-400/30 hover:border-emerald-400/50 text-emerald-300 hover:text-emerald-200 rounded-2xl transition-all duration-200 backdrop-blur-sm"
                      >
                        <Lucide icon="Plus" className="w-5 h-5" />
                        <span className="font-medium">Add New Field</span>
                      </button>
                    </div>

                    {/* Notes */}
                    <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <Lucide
                          icon="FileText"
                          className="w-6 h-6 text-amber-400"
                        />
                        <h4 className="text-xl font-semibold text-white/90 dark:text-slate-200">
                          Notes
                        </h4>
                      </div>

                      <textarea
                        value={currentContact.notes || ""}
                        onChange={(e) =>
                          setCurrentContact({
                            ...currentContact,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Enter any additional notes"
                        rows={4}
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200 resize-none shadow-inner"
                      />
                    </div>

                    {/* Tags */}
                    <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 dark:border-slate-600/20 shadow-inner space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <Lucide icon="Tags" className="w-6 h-6 text-pink-400" />
                        <h4 className="text-xl font-semibold text-white/90 dark:text-slate-200">
                          Tags
                        </h4>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {currentContact.tags?.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-4 py-2 rounded-2xl text-sm bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 text-pink-200 backdrop-blur-sm"
                          >
                            {tag}
                            <button
                              onClick={() =>
                                handleRemoveTag(currentContact.contact_id!, tag)
                              }
                              className="ml-2 text-pink-300 hover:text-pink-100 transition-colors duration-200"
                            >
                              <Lucide icon="X" className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <button
                    onClick={() => setEditContactModal(false)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContact}
                    disabled={isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide
                        icon={isLoading ? "Loader2" : "Save"}
                        className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                      />
                      <span>{isLoading ? "Saving..." : "Save Changes"}</span>
                    </div>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Scheduled Messages Modal */}
        <Dialog
          open={scheduledMessagesModal}
          onClose={() => setScheduledMessagesModal(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-[90vw] md:w-[85vw] lg:w-[80vw] max-w-[1600px] relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border border-white/20 dark:border-slate-700/20 transform hover:scale-[1.001] transition-all duration-300 flex flex-col max-h-[90vh]">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-500/5 to-indigo-500/10 dark:from-blue-600/10 dark:via-purple-700/5 dark:to-indigo-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative flex-1 flex flex-col overflow-hidden">
                {/* Sticky Header Section */}
                <div className="sticky top-0 z-10 bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-t-3xl border-b border-white/10 dark:border-slate-700/20">
                  {/* Main Header */}
                  <div className="flex items-center justify-between p-8 pb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <Lucide
                          icon="Calendar"
                          className="w-7 h-7 text-blue-400"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-2xl blur-sm" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                          Scheduled Messages
                        </h3>
                        <p className="text-white/60 mt-1">
                          Manage your scheduled message campaigns
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Active Filters Indicator */}
                      {(messageStatusFilter ||
                        messageDateFilter ||
                        messageTypeFilter ||
                        messageRecipientFilter) && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/20 backdrop-blur-sm">
                          Filtered
                        </span>
                      )}
                      <button
                        onClick={() => setScheduledMessagesModal(false)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                      >
                        <Lucide icon="X" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex flex-wrap items-center gap-4 px-8 py-6">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/60 uppercase tracking-wide">
                        Status
                      </label>
                      <select
                        value={messageStatusFilter}
                        onChange={(e) => setMessageStatusFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm min-w-[140px] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2523ffffff%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%2C9%2012%2C15%2018%2C9%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:16px_16px] bg-[right_12px_center] pr-10"
                        style={{
                          color: "white",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <option
                          value=""
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          All Status
                        </option>
                        <option
                          value="scheduled"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Scheduled
                        </option>
                        <option
                          value="sent"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Sent
                        </option>
                        <option
                          value="failed"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Failed
                        </option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/60 uppercase tracking-wide">
                        Date
                      </label>
                      <select
                        value={messageDateFilter}
                        onChange={(e) => setMessageDateFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm min-w-[140px] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2523ffffff%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%2C9%2012%2C15%2018%2C9%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:16px_16px] bg-[right_12px_center] pr-10"
                        style={{
                          color: "white",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <option
                          value=""
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          All Dates
                        </option>
                        <option
                          value="today"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Today
                        </option>
                        <option
                          value="tomorrow"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Tomorrow
                        </option>
                        <option
                          value="this-week"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          This Week
                        </option>
                        <option
                          value="next-week"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Next Week
                        </option>
                        <option
                          value="this-month"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          This Month
                        </option>
                        <option
                          value="next-month"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Next Month
                        </option>
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/60 uppercase tracking-wide">
                        Type
                      </label>
                      <select
                        value={messageTypeFilter}
                        onChange={(e) => setMessageTypeFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm min-w-[140px] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2523ffffff%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%2C9%2012%2C15%2018%2C9%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:16px_16px] bg-[right_12px_center] pr-10"
                        style={{
                          color: "white",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <option
                          value=""
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          All Types
                        </option>
                        <option
                          value="text"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Text Only
                        </option>
                        <option
                          value="media"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          With Media
                        </option>
                        <option
                          value="document"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          With Document
                        </option>
                        <option
                          value="multiple"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Multiple Messages
                        </option>
                      </select>
                    </div>

                    {/* Recipient Filter */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/60 uppercase tracking-wide">
                        Recipients
                      </label>
                      <select
                        value={messageRecipientFilter}
                        onChange={(e) =>
                          setMessageRecipientFilter(e.target.value)
                        }
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm min-w-[140px] appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2523ffffff%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%2C9%2012%2C15%2018%2C9%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:16px_16px] bg-[right_12px_center] pr-10"
                        style={{
                          color: "white",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <option
                          value=""
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          All Recipients
                        </option>
                        <option
                          value="single"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Single Contact
                        </option>
                        <option
                          value="multiple"
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Multiple Contacts
                        </option>
                      </select>
                    </div>

                    {/* Clear Filters Button */}
                    {(messageStatusFilter ||
                      messageDateFilter ||
                      messageTypeFilter ||
                      messageRecipientFilter) && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-transparent">
                          Clear
                        </label>
                        <button
                          onClick={() => {
                            setMessageStatusFilter("");
                            setMessageDateFilter("");
                            setMessageTypeFilter("");
                            setMessageRecipientFilter("");
                          }}
                          className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-2xl text-sm transition-all duration-200 backdrop-blur-sm flex items-center space-x-2"
                        >
                          <Lucide icon="X" className="w-4 h-4" />
                          <span>Clear Filters</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Action Buttons for Selected Messages */}
                  {selectedScheduledMessages.length > 0 &&
                    scheduledMessagesModal && (
                      <div className="px-8 pb-4 border-b border-white/10 dark:border-slate-700/20">
                        <div className="bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 dark:border-slate-600/20 shadow-inner">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
                              <span className="text-sm text-white/80 font-medium">
                                {selectedScheduledMessages.length} message
                                {selectedScheduledMessages.length > 1
                                  ? "s"
                                  : ""}{" "}
                                selected
                              </span>
                            </div>
                            <div className="flex space-x-3">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendSelectedNow();
                                }}
                                className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/30 hover:border-emerald-400/50 text-emerald-300 hover:text-emerald-200 rounded-2xl transition-all duration-200 backdrop-blur-sm text-sm font-medium shadow-lg shadow-emerald-500/10"
                              >
                                <Lucide icon="Send" className="w-4 h-4" />
                                <span>Send Selected</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete ${
                                        selectedScheduledMessages.length
                                      } selected message${
                                        selectedScheduledMessages.length > 1
                                          ? "s"
                                          : ""
                                      }?`
                                    )
                                  ) {
                                    handleDeleteSelected();
                                  }
                                }}
                                className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-2xl transition-all duration-200 backdrop-blur-sm text-sm font-medium shadow-lg shadow-red-500/10"
                              >
                                <Lucide icon="Trash2" className="w-4 h-4" />
                                <span>Delete Selected</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedScheduledMessages([])}
                                className="flex items-center space-x-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white rounded-2xl transition-all duration-200 backdrop-blur-sm text-sm font-medium"
                              >
                                <Lucide icon="X" className="w-4 h-4" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto px-8 pb-8">
                  <div className="mt-6 pb-24">
                    {getFilteredScheduledMessages().length > 0 ? (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {applyAdvancedFilters(
                          combineScheduledMessages(
                            getFilteredScheduledMessages()
                          )
                        ).map((message) => (
                          <div
                            key={message.id}
                            className="relative bg-white/5 dark:bg-slate-700/10 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-3xl shadow-inner overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.01] flex flex-col transform-gpu"
                          >
                            {/* Enhanced Card Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-purple-500/5 dark:from-slate-600/5 dark:via-transparent dark:to-purple-600/5 pointer-events-none" />

                            <div className="relative p-6 flex-grow">
                              <div className="flex justify-between items-start mb-6">
                                <span
                                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm border transition-all duration-200 ${
                                    message.status === "sent"
                                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                                      : message.status === "failed"
                                      ? "bg-red-500/20 text-red-300 border-red-400/30"
                                      : "bg-orange-500/20 text-orange-300 border-orange-400/30"
                                  }`}
                                >
                                  {message.status === "sent"
                                    ? "✓ Sent"
                                    : message.status === "failed"
                                    ? "✗ Failed"
                                    : "⏰ Scheduled"}
                                </span>

                                <input
                                  type="checkbox"
                                  checked={selectedScheduledMessages.includes(
                                    message.id!
                                  )}
                                  onChange={() =>
                                    toggleScheduledMessageSelection(message.id!)
                                  }
                                  className="w-5 h-5 text-blue-500 bg-white/10 border-white/20 rounded focus:ring-blue-500/50 focus:ring-2 backdrop-blur-sm"
                                />
                              </div>

                              <div className="space-y-6">
                                {/* Message Content */}
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2">
                                    <Lucide
                                      icon="MessageSquare"
                                      className="w-4 h-4 text-blue-400"
                                    />
                                    <h4 className="text-sm font-semibold text-white/90">
                                      Message Content
                                    </h4>
                                  </div>
                                  <div className="bg-white/5 dark:bg-slate-700/10 border border-white/10 dark:border-slate-600/20 rounded-2xl p-4 backdrop-blur-sm shadow-inner">
                                    <p className="text-sm text-white/80 dark:text-slate-200 leading-relaxed line-clamp-3">
                                      {message.messageContent ||
                                        message.message ||
                                        "No message content"}
                                    </p>
                                  </div>
                                </div>

                                {/* Schedule Information */}
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Lucide
                                        icon="Clock"
                                        className="w-4 h-4 text-purple-400"
                                      />
                                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                                        Scheduled Time
                                      </span>
                                    </div>
                                    <p className="text-sm text-white/90 pl-6">
                                      {message.scheduledTime
                                        ? new Date(
                                            message.scheduledTime
                                          ).toLocaleString()
                                        : "Not set"}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Lucide
                                        icon={
                                          Array.isArray(message.contactIds) &&
                                          message.contactIds.length > 1
                                            ? "Users"
                                            : "User"
                                        }
                                        className="w-4 h-4 text-emerald-400"
                                      />
                                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                                        Recipients
                                      </span>
                                    </div>
                                    <p className="text-sm text-white/90 pl-6">
                                      {Array.isArray(message.contactIds) &&
                                      message.contactIds.length > 0
                                        ? message.contactIds.length > 1
                                          ? `${message.contactIds.length} contacts`
                                          : (() => {
                                              const phoneNumber =
                                                message.contactIds[0]
                                                  ?.split("-")[1]
                                                  ?.replace(/\D/g, "") || "";
                                              const contact = contacts.find(
                                                (c) =>
                                                  c.phone?.replace(
                                                    /\D/g,
                                                    ""
                                                  ) === phoneNumber
                                              );
                                              return (
                                                contact?.contactName ||
                                                phoneNumber ||
                                                "Unknown"
                                              );
                                            })()
                                        : message.contactId
                                        ? (() => {
                                            const phoneNumber =
                                              message.contactId
                                                ?.split("-")[1]
                                                ?.replace(/\D/g, "") || "";
                                            const contact = contacts.find(
                                              (c) =>
                                                c.phone?.replace(/\D/g, "") ===
                                                phoneNumber
                                            );
                                            return (
                                              contact?.contactName ||
                                              phoneNumber ||
                                              "Unknown"
                                            );
                                          })()
                                        : "No recipients"}
                                    </p>
                                  </div>

                                  {/* Message Settings Summary */}
                                  {(message.batchQuantity ||
                                    message.minDelay !== undefined ||
                                    message.repeatInterval > 0) && (
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <Lucide
                                          icon="Settings"
                                          className="w-4 h-4 text-blue-400"
                                        />
                                        <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                                          Settings
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-2 pl-6">
                                        {message.batchQuantity && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-300 border border-blue-400/20 backdrop-blur-sm">
                                            Batch: {message.batchQuantity}
                                          </span>
                                        )}
                                        {message.minDelay !== undefined && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-purple-500/20 text-purple-300 border border-purple-400/20 backdrop-blur-sm">
                                            Delay: {message.minDelay}-
                                            {message.maxDelay}s
                                          </span>
                                        )}
                                        {message.repeatInterval > 0 && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 backdrop-blur-sm">
                                            Repeat: {message.repeatInterval}{" "}
                                            {message.repeatUnit}
                                          </span>
                                        )}
                                        {message.infiniteLoop && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-orange-500/20 text-orange-300 border border-orange-400/20 backdrop-blur-sm">
                                            <Lucide
                                              icon="RefreshCw"
                                              className="w-3 h-3 mr-1"
                                            />
                                            Loop
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Attachments */}
                                {(message.mediaUrl || message.documentUrl) && (
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Lucide
                                        icon="Paperclip"
                                        className="w-4 h-4 text-amber-400"
                                      />
                                      <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                                        Attachments
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pl-6">
                                      {message.mediaUrl && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 backdrop-blur-sm">
                                          <Lucide
                                            icon="Image"
                                            className="w-3 h-3 mr-1"
                                          />
                                          Media
                                        </span>
                                      )}
                                      {message.documentUrl && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-300 border border-blue-400/20 backdrop-blur-sm">
                                          <Lucide
                                            icon="File"
                                            className="w-3 h-3 mr-1"
                                          />
                                          {message.fileName || "Document"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="relative bg-white/5 dark:bg-slate-700/10 border-t border-white/10 dark:border-slate-600/20 px-6 py-4 backdrop-blur-sm">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <button
                                  onClick={() => {
                                    setSelectedMessageForView(message);
                                    setViewMessageDetailsModal(true);
                                  }}
                                  className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white rounded-2xl transition-all duration-200 backdrop-blur-sm text-sm"
                                >
                                  <Lucide icon="Eye" className="w-4 h-4" />
                                  <span>View Details</span>
                                </button>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleSendNow(message)}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/30 hover:border-emerald-400/50 text-emerald-300 hover:text-emerald-200 rounded-2xl transition-all duration-200 backdrop-blur-sm text-sm shadow-lg shadow-emerald-500/10"
                                  >
                                    <Lucide icon="Send" className="w-4 h-4" />
                                    <span>Send Now</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleEditScheduledMessage(message);
                                      setScheduledMessagesModal(false);
                                    }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 border border-blue-400/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200 rounded-2xl transition-all duration-200 backdrop-blur-sm text-sm shadow-lg shadow-blue-500/10"
                                  >
                                    <Lucide
                                      icon="PenTool"
                                      className="w-4 h-4"
                                    />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          "Are you sure you want to delete this scheduled message?"
                                        )
                                      ) {
                                        handleDeleteScheduledMessage(
                                          message.id!
                                        );
                                      }
                                    }}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-2xl transition-all duration-200 backdrop-blur-sm text-sm shadow-lg shadow-red-500/10"
                                  >
                                    <Lucide icon="Trash2" className="w-4 h-4" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="relative mx-auto mb-6 w-24 h-24">
                          <Lucide
                            icon="Calendar"
                            className="w-24 h-24 text-white/20"
                          />
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-3xl blur-xl" />
                        </div>
                        <h3 className="text-xl font-semibold text-white/90 mb-2">
                          No scheduled messages found
                        </h3>
                        <p className="text-white/60">
                          Try adjusting your filters or create a new scheduled
                          message
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Message Details Modal */}
        <Dialog
          open={viewMessageDetailsModal}
          onClose={() => setViewMessageDetailsModal(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-2xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-slate-700/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.005] transition-all duration-300 overflow-y-auto">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-500/5 to-indigo-500/10 dark:from-blue-600/10 dark:via-purple-700/5 dark:to-indigo-600/10 pointer-events-none" />

              {/* Top Shine Effect */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              <div className="relative p-8 text-white/90 dark:text-slate-200">
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <Dialog.Title className="text-2xl font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                    Message Details
                  </Dialog.Title>
                  <button
                    onClick={() => setViewMessageDetailsModal(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-white/80 hover:text-white transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg hover:shadow-xl"
                  >
                    <Lucide icon="X" className="w-5 h-5" />
                  </button>
                </div>{" "}
                {selectedMessageForView && (
                  <div className="space-y-6">
                    {/* Message Status */}
                    <div className="flex items-center justify-between p-6 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                      <span className="text-lg font-medium text-white/90">
                        Status:
                      </span>
                      <span
                        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm border shadow-lg ${
                          selectedMessageForView.status === "sent"
                            ? "bg-green-500/20 dark:bg-green-600/20 text-green-300 dark:text-green-200 border-green-400/30"
                            : selectedMessageForView.status === "failed"
                            ? "bg-red-500/20 dark:bg-red-600/20 text-red-300 dark:text-red-200 border-red-400/30"
                            : "bg-orange-500/20 dark:bg-orange-600/20 text-orange-300 dark:text-orange-200 border-orange-400/30"
                        }`}
                      >
                        {selectedMessageForView.status === "sent"
                          ? "Sent"
                          : selectedMessageForView.status === "failed"
                          ? "Failed"
                          : "Scheduled"}
                      </span>
                    </div>

                    {/* Main Message Content */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-white/90">
                        Message Content:
                      </h3>
                      <div className="p-6 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                        <p className="whitespace-pre-wrap text-white/80 dark:text-slate-300">
                          {selectedMessageForView.messageContent ||
                            selectedMessageForView.message ||
                            "No content"}
                        </p>
                      </div>
                    </div>

                    {/* Additional Messages */}
                    {selectedMessageForView.messages &&
                      selectedMessageForView.messages.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4 text-white/90">
                            Additional Messages:
                          </h3>
                          <div className="space-y-4">
                            {selectedMessageForView.messages.map(
                              (msg: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-6 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <span className="text-sm font-medium text-white/80">
                                      Message {index + 1}:
                                    </span>
                                    {selectedMessageForView.messageDelays &&
                                      selectedMessageForView.messageDelays[
                                        index
                                      ] > 0 && (
                                        <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-lg">
                                          Delay:{" "}
                                          {
                                            selectedMessageForView
                                              .messageDelays[index]
                                          }{" "}
                                          seconds
                                        </span>
                                      )}
                                  </div>
                                  <p className="whitespace-pre-wrap text-white/80 dark:text-slate-300">
                                    {msg.text || msg.message || "No content"}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Schedule Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-white/90">
                        Schedule Information:
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                          <span className="font-medium text-white/90">
                            Scheduled Time:
                          </span>
                          <p className="text-white/70 mt-1">
                            {selectedMessageForView.scheduledTime
                              ? new Date(
                                  selectedMessageForView.scheduledTime
                                ).toLocaleString()
                              : "Not set"}
                          </p>
                        </div>
                        {selectedMessageForView.batchQuantity && (
                          <div className="p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                            <span className="font-medium text-white/90">
                              Batch Size:
                            </span>
                            <p className="text-white/70 mt-1">
                              {selectedMessageForView.batchQuantity}
                            </p>
                          </div>
                        )}
                        {selectedMessageForView.minDelay !== undefined && (
                          <div className="p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                            <span className="font-medium text-white/90">
                              Delay Range:
                            </span>
                            <p className="text-white/70 mt-1">
                              {selectedMessageForView.minDelay} -{" "}
                              {selectedMessageForView.maxDelay} seconds
                            </p>
                          </div>
                        )}
                        {selectedMessageForView.repeatInterval > 0 && (
                          <div className="p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                            <span className="font-medium text-white/90">
                              Repeat:
                            </span>
                            <p className="text-white/70 mt-1">
                              Every {selectedMessageForView.repeatInterval}{" "}
                              {selectedMessageForView.repeatUnit}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recipients */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-white/90">
                        Recipients:
                      </h3>
                      <div className="p-6 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                        {Array.isArray(selectedMessageForView.contactIds) &&
                        selectedMessageForView.contactIds.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedMessageForView.contactIds.map(
                              (id: string, index: number) => {
                                const phoneNumber =
                                  id?.split("-")[1]?.replace(/\D/g, "") || "";
                                const contact = contacts.find(
                                  (c) =>
                                    c.phone?.replace(/\D/g, "") === phoneNumber
                                );
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-sm"
                                  >
                                    {contact?.contactName ||
                                      phoneNumber ||
                                      "Unknown"}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        ) : selectedMessageForView.contactId ? (
                          (() => {
                            const phoneNumber =
                              selectedMessageForView.contactId
                                ?.split("-")[1]
                                ?.replace(/\D/g, "") || "";
                            const contact = contacts.find(
                              (c) => c.phone?.replace(/\D/g, "") === phoneNumber
                            );
                            return (
                              <span className="inline-flex items-center px-3 py-2 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-sm">
                                {contact?.contactName ||
                                  phoneNumber ||
                                  "Unknown"}
                              </span>
                            );
                          })()
                        ) : (
                          <p className="text-white/60">
                            No recipients specified
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Media and Documents */}
                    {(selectedMessageForView.mediaUrl ||
                      selectedMessageForView.documentUrl) && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-white/90">
                          Attachments:
                        </h3>
                        <div className="space-y-3">
                          {selectedMessageForView.mediaUrl && (
                            <div className="flex items-center p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                              <Lucide
                                icon="Image"
                                className="w-5 h-5 mr-3 text-green-400"
                              />
                              <span className="text-white/80">
                                Media file attached
                              </span>
                            </div>
                          )}
                          {selectedMessageForView.documentUrl && (
                            <div className="flex items-center p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                              <Lucide
                                icon="File"
                                className="w-5 h-5 mr-3 text-blue-400"
                              />
                              <span className="text-white/80">
                                {selectedMessageForView.fileName ||
                                  "Document attached"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Advanced Settings */}
                    {(selectedMessageForView.activateSleep ||
                      selectedMessageForView.activeHours ||
                      selectedMessageForView.infiniteLoop) && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-white/90">
                          Advanced Settings:
                        </h3>
                        <div className="space-y-4">
                          {selectedMessageForView.activateSleep && (
                            <div className="p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                              <div className="flex items-center mb-2">
                                <Lucide
                                  icon="Moon"
                                  className="w-5 h-5 mr-3 text-purple-400"
                                />
                                <span className="font-medium text-white/90">
                                  Sleep Mode:
                                </span>
                              </div>
                              <p className="text-sm text-white/70 ml-8">
                                Sleep after{" "}
                                {selectedMessageForView.sleepAfterMessages}{" "}
                                messages for{" "}
                                {selectedMessageForView.sleepDuration} minutes
                              </p>
                            </div>
                          )}
                          {selectedMessageForView.activeHours && (
                            <div className="p-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-600/20 shadow-inner">
                              <div className="flex items-center mb-2">
                                <Lucide
                                  icon="Clock"
                                  className="w-5 h-5 mr-3 text-blue-400"
                                />
                                <span className="font-medium text-white/90">
                                  Active Hours:
                                </span>
                              </div>
                              <p className="text-sm text-white/70 ml-8">
                                {selectedMessageForView.activeHours.start} -{" "}
                                {selectedMessageForView.activeHours.end}
                              </p>
                            </div>
                          )}
                          {selectedMessageForView.infiniteLoop && (
                            <div className="p-4 bg-orange-500/10 dark:bg-orange-600/10 backdrop-blur-xl rounded-2xl border border-orange-400/30 shadow-inner">
                              <div className="flex items-center text-orange-300 mb-2">
                                <Lucide
                                  icon="RefreshCw"
                                  className="w-5 h-5 mr-3"
                                />
                                <span className="font-medium">
                                  Infinite Loop Enabled
                                </span>
                              </div>
                              <p className="text-sm text-orange-200 ml-8">
                                Messages will loop indefinitely
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-white/10 dark:border-slate-700/20">
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this scheduled message?"
                            )
                          ) {
                            handleDeleteScheduledMessage(
                              selectedMessageForView.id!
                            );
                            setViewMessageDetailsModal(false);
                          }
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transform hover:scale-105 flex items-center"
                      >
                        <Lucide icon="Trash2" className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          handleEditScheduledMessage(selectedMessageForView);
                          setViewMessageDetailsModal(false);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:scale-105 flex items-center"
                      >
                        <Lucide icon="PenTool" className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          handleSendNow(selectedMessageForView);
                          setViewMessageDetailsModal(false);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:scale-105 flex items-center"
                      >
                        <Lucide icon="Send" className="w-4 h-4 mr-2" />
                        Send Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </>
  );
}

export default Main;