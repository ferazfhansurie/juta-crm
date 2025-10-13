import Lucide from "@/components/Base/Lucide";
import { Menu, Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import googleCalendarPlugin from "@fullcalendar/google-calendar";
import {
  ChangeEvent,
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  useEffect,
  useState,
  useRef,
  Component,
  ErrorInfo,
} from "react";
import axios from "axios";
import { format, parse, addHours, subHours } from "date-fns";
import { useContacts } from "@/contact";
import Select from "react-select";
import { error } from "console";
import { title } from "process";
import CreatableSelect from "react-select/creatable";
import React from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Switch } from "@headlessui/react";
import Modal from "@/components/Base/Modal";

// Configuration
const baseUrl = "https://bisnesgpt.serveo.net"; // Your PostgreSQL server URL

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  address: string;
  appointmentStatus: string;
  appointmentType?: string;
  staff: string[];
  tags: Tag[];
  color: string;
  dateAdded: string;
  contacts: {
    contact_id: string;
    id: string;
    name: string;
    phone: string;
    email: string;
  }[];
  meetLink?: string;
  notificationSent?: boolean;
  minyak?: number;
  toll?: number;
  details?: string;
  // Additional metadata fields that might come from the backend
  [key: string]: any;
}
interface CalendarConfig {
  calendarId: string; // Keep original calendarId for backwards compatibility
  additionalCalendarIds: string[]; // Add new field for additional calendars
  startHour: number;
  endHour: number;
  slotDuration: number;
  daysAhead: number;
}
interface Employee {
  id: string;
  name: string;
  fullName?: string;
  phoneNumber?: string;
  phone?: string;
  color: string;
  backgroundStyle: string;
}

interface Contact {
  additionalEmails: string[];
  address1: string | null;
  assignedTo: string | null;
  businessId: string | null;
  city: string | null;
  companyName: string | null;
  name: string;
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
  contact_id: string;
  lastName: string;
  locationId: string;
  phone: string | null;
  postalCode: string | null;
  source: string | null;
  state: string | null;
  tags: string[];
  website: string | null;
}

type BackgroundStyle = {
  backgroundColor?: string;
  background?: string;
};

interface Tag {
  id: string;
  name: string;
}

interface ReminderSettings {
  reminders: Array<{
    enabled: boolean;
    time: number;
    timeUnit: "minutes" | "hours" | "days";
    type: "before" | "after";
    message: string;
    recipientType?: "contacts" | "employees" | "both"; // Who should receive the reminder
    selectedEmployees?: string[]; // Array of employee IDs when recipientType is 'employees' or 'both'
  }>;
}

function Main() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [view, setView] = useState<string>("dayGridMonth");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { contacts: initialContacts } = useContacts();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [initialAppointmentStatus, setInitialAppointmentStatus] = useState<
    string | null
  >(null);
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef(null);
  const [appointmentTags, setAppointmentTags] = useState<Tag[]>([]);
  const [companyId, setCompanyId] = useState<string>("");
  const [viewType, setViewType] = useState("calendar"); // 'calendar' or 'grid'
  // Mobile tab for switching between list and calendar views
  const [mobileTab, setMobileTab] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [employeeExpenses, setEmployeeExpenses] = useState<
    Record<string, { minyak: number; toll: number }>
  >({});
  const navigate = useNavigate();
  const [isCalendarConfigOpen, setIsCalendarConfigOpen] = useState(false);
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  const [isBookingLinkModalOpen, setIsBookingLinkModalOpen] = useState(false);
  const [bookingLinkForm, setBookingLinkForm] = useState({
    title: "",
    description: "",
    location: "",
    phone: "",
    selectedStaff: [] as string[],
    duration: 60,
  });
  const [generatedBookingLink, setGeneratedBookingLink] = useState("");
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    reminders: [],
  });
  // State to store database appointments for duplicate detection
  const [databaseAppointments, setDatabaseAppointments] = useState<
    Appointment[]
  >([]);

  class ErrorBoundary extends Component<{
    children: ReactNode;
    onError: (error: Error) => void;
  }> {
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      this.props.onError(error);
    }

    render() {
      return this.props.children;
    }
  }
  const [config, setConfig] = useState<CalendarConfig>({
    calendarId: "",
    additionalCalendarIds: [],
    startHour: 11,
    endHour: 21,
    slotDuration: 30,
    daysAhead: 3,
  });

  useEffect(() => {
    const fetchCompanyId = async () => {
      const userEmail = localStorage.getItem("userEmail");
      if (userEmail) {
        try {
          const response = await axios.get(
            `${baseUrl}/api/user-context?email=${encodeURIComponent(userEmail)}`
          );
          const userData = response.data;
          setCompanyId(userData.companyId);
        } catch (error) {
          console.error("Error fetching company ID:", error);
        }
      }
    };

    fetchCompanyId();
    fetchTags();
    fetchReminderSettings();
  }, []);

  // Refresh calendar when database appointments change to apply duplicate filtering
  useEffect(() => {
    console.log(
      "🔄 Database appointments changed, count:",
      databaseAppointments.length
    );

    if (calendarRef.current && databaseAppointments.length > 0) {
      const calendarApi = (calendarRef.current as any).getApi();
      try {
        console.log("🔄 Refreshing calendar to apply duplicate filtering...");
        // Small delay to ensure state is updated
        setTimeout(() => {
          calendarApi.refetchEvents();
          console.log(
            "✅ Calendar refreshed after database appointments update"
          );
        }, 200); // Increased delay slightly
      } catch (error) {
        console.error(
          "❌ Error refreshing calendar after database appointments update:",
          error
        );
      }
    } else if (calendarRef.current && databaseAppointments.length === 0) {
      console.log("⚠️ No database appointments loaded yet");
    }
  }, [databaseAppointments]);

  const fetchReminderSettings = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      const response = await axios.get(
        `${baseUrl}/api/reminder-settings?email=${encodeURIComponent(
          userEmail
        )}`
      );
      if (
        response.data &&
        response.data.reminders &&
        response.data.reminders.length > 0
      ) {
        const apiResponse = response.data;
        const settings: ReminderSettings = {
          reminders: apiResponse.reminders || [],
        };
        setReminderSettings(settings);
      } else {
        // Set default reminder settings if none exist
        const defaultSettings: ReminderSettings = {
          reminders: [
            {
              enabled: true,
              time: 1,
              timeUnit: "days",
              type: "before",
              message:
                "Reminder: You have an appointment tomorrow at {time} {unit} {when}. Please be prepared!",
              recipientType: "both",
              selectedEmployees: [],
            },
            {
              enabled: true,
              time: 2,
              timeUnit: "hours",
              type: "before",
              message:
                "Final reminder: Your appointment starts in {time} {unit} {when}. Please be on time!",
              recipientType: "both",
              selectedEmployees: [],
            },
          ],
        };
        setReminderSettings(defaultSettings);

        // Save default settings to backend
        try {
          await updateReminderSettings(defaultSettings);
        } catch (saveError) {
          console.error("Failed to save default reminder settings:", saveError);
        }
      }
    } catch (error) {
      console.error("Error fetching reminder settings:", error);
      // Set default reminder settings on error
      const defaultSettings: ReminderSettings = {
        reminders: [
          {
            enabled: true,
            time: 1,
            timeUnit: "days",
            type: "before",
            message:
              "Reminder: You have an appointment tomorrow at {time} {unit} {when}. Please be prepared!",
            recipientType: "both",
            selectedEmployees: [],
          },
          {
            enabled: true,
            time: 2,
            timeUnit: "hours",
            type: "before",
            message:
              "Final reminder: Your appointment starts in {time} {unit} {when}. Please be on time!",
            recipientType: "both",
            selectedEmployees: [],
          },
        ],
      };
      setReminderSettings(defaultSettings);
    }
  };

  const updateReminderSettings = async (settings: ReminderSettings) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      await axios.put(`${baseUrl}/api/reminder-settings`, {
        email: userEmail,
        reminders: settings.reminders,
      });

      setReminderSettings(settings);
      setIsReminderSettingsOpen(false);
    } catch (error) {
      console.error("Error updating reminder settings:", error);
      throw error;
    }
  };

  // Add fetchReminderSettings to the useEffect
  useEffect(() => {
    fetchReminderSettings();
  }, []);

  const fetchTags = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      const response = await axios.get(
        `${baseUrl}/api/appointment-tags?email=${encodeURIComponent(userEmail)}`
      );
      if (response.data && response.data.tags) {
        setAppointmentTags(response.data.tags);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const generateBookingLink = async () => {
    if (!bookingLinkForm.title || bookingLinkForm.selectedStaff.length === 0) {
      alert("Please fill in the title and select at least one staff member");
      return;
    }

    try {
      // Create a simple slug from the title
      const baseSlug = bookingLinkForm.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      // Create individual booking slots for each staff member
      const createdSlots = [];
      for (const staffName of bookingLinkForm.selectedStaff) {
        // Find staff phone number from employees data
        const staffEmployee = employees.find(
          (emp) => emp.name === staffName || emp.fullName === staffName
        );
        const staffPhone =
          staffEmployee?.phoneNumber || staffEmployee?.phone || "";

        // Create a simple, short slug: title-staffname
        const staffSlug = `${baseSlug}-${staffName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")}`;

        const bookingSlotData = {
          title: `${bookingLinkForm.title} with ${staffName}`,
          slug: staffSlug,
          description: bookingLinkForm.description,
          location: bookingLinkForm.location,
          duration: bookingLinkForm.duration,
          staffName: staffName,
          staff_phone: staffPhone,
          is_active: true,
          created_by: localStorage.getItem("userEmail"),
          company_id: companyId,
        };

        // Save booking slot to backend
        const userEmail = localStorage.getItem("userEmail");
        const response = await axios.post(
          `${baseUrl}/api/booking-slots`,
          bookingSlotData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userEmail}`,
            },
          }
        );

        if (response.data.success) {
          const baseUrlWindow = window.location.origin;
          // Match the new router structure: /booking/:slug/:phone
          const phoneParam = bookingLinkForm.phone || "PHONE";
          const link = `${baseUrlWindow}/booking/${staffSlug}/${phoneParam}`;
          createdSlots.push({
            staffName,
            link,
          });
        } else {
          throw new Error(
            response.data.error ||
              `Failed to create booking slot for ${staffName}`
          );
        }
      }

      // Display all generated links
      const linksText = createdSlots
        .map((slot) => `${slot.staffName}: ${slot.link}`)
        .join("\n\n");
      setGeneratedBookingLink(linksText);
      toast.success(
        `${createdSlots.length} booking links created successfully!`
      );
    } catch (error) {
      console.error("Error creating booking slots:", error);
      toast.error("Failed to create booking slots. Please try again.");
    }
  };

  const copyBookingLink = () => {
    navigator.clipboard.writeText(generatedBookingLink);
    toast.success("Booking link copied to clipboard!");
  };

  const resetBookingLinkForm = () => {
    setBookingLinkForm({
      title: "",
      description: "",
      location: "",
      phone: "",
      selectedStaff: [],
      duration: 60,
    });
    setGeneratedBookingLink("");
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keep FullCalendar view responsive to screen size
  useEffect(() => {
    const desiredView = isMobile ? "timeGridDay" : "dayGridMonth";
    setView(desiredView);
    if (calendarRef.current) {
      try {
        const api = (calendarRef.current as any).getApi();
        api?.changeView(desiredView);
      } catch (_) {
        // no-op
      }
    }
  }, [isMobile]);

  const generateTimeSlots = (isWeekend: boolean): string[] => {
    const start = isWeekend ? 8 : 8; // Start time (8 AM)
    const end = isWeekend ? 20 : 20; // End time (8 PM)
    const slots: string[] = [];

    for (let hour = start; hour < end; hour++) {
      // Add the full hour slot
      slots.push(
        `${hour.toString().padStart(2, "0")}:00 - ${hour
          .toString()
          .padStart(2, "0")}:30`
      );
      // Add the half hour slot
      slots.push(
        `${hour.toString().padStart(2, "0")}:30 - ${(hour + 1)
          .toString()
          .padStart(2, "0")}:00`
      );
    }

    return slots;
  };

  // ... rest of the code ...
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

    const r = Math.round((r1 + r2) / 2)
      .toString(16)
      .padStart(2, "0");
    const g = Math.round((g1 + g2) / 2)
      .toString(16)
      .padStart(2, "0");
    const b = Math.round((b1 + b2) / 2)
      .toString(16)
      .padStart(2, "0");

    return `#${r}${g}${b}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)
    setCurrentEvent({
      ...currentEvent,
      dateStr,
      isWeekend,
      timeSlots: generateTimeSlots(isWeekend),
    });
  };

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [startTimeStr, endTimeStr] = e.target.value.split(" - ");
    setCurrentEvent({ ...currentEvent, startTimeStr, endTimeStr });
  };

  let role = 1;
  let userName = "";

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      // Get the current user's email (from Firebase Auth or however you store it)
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return;
      }
      // First, fetch user config to get companyId
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
        throw new Error("Failed to fetch company data");
      }

      const userData = await userResponse.json();
      const companyId = userData.company_id || userData.companyId;
      if (!companyId) {
        console.error("No companyId found in user config");
        return;
      }

      // Now fetch employees from the new endpoint
      const employeesResponse = await fetch(
        `${baseUrl}/api/employees-data/${encodeURIComponent(companyId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!employeesResponse.ok) {
        throw new Error("Failed to fetch employees data");
      }

      const employeeListData = await employeesResponse.json();
      console.log(employeeListData);
      // Optionally, add color/backgroundStyle as before
      const colors = [
        "#FF5733",
        "#006400",
        "#3357FF",
        "#FF33A1",
        "#33FFF5",
        "#FF8C33",
        "#8C33FF",
        "#33FF8C",
      ];
      const backgroundStyles = [
        "linear-gradient(to right, #1F3A8A 0%, #1F3A8A 50%, #2196F3 50%, #2196F3 100%)",
        "linear-gradient(to right, #8A2BE2 0%, #8A2BE2 50%, #9C27B0 50%, #9C27B0 100%)",
        "linear-gradient(to right, #00BCD4 0%, #00BCD4 50%, #795548 50%, #795548 100%)",
        "linear-gradient(to right, #607D8B 0%, #607D8B 50%, #E91E63 50%, #E91E63 100%)",
      ];
      let colorIndex = 0;

      const employeesWithColors = employeeListData.map((emp: any) => ({
        ...emp,
        color: colors[colorIndex % colors.length],
        backgroundStyle: backgroundStyles[colorIndex % backgroundStyles.length],
        id: emp.id || emp._id, // adjust if your API uses _id
      }));

      setEmployees(employeesWithColors);
      // If you need to fetch appointments, update that logic as well
      fetchAppointments(userEmail);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Function to check if two appointments are duplicates based on contact info and timing
  const areAppointmentsDuplicate = (
    dbAppointment: any,
    googleEvent: any
  ): boolean => {
    console.log("Checking duplicate for:", {
      dbTitle: dbAppointment.title,
      googleTitle: googleEvent.title || googleEvent.summary,
      dbStart: dbAppointment.startTime,
      googleStart: googleEvent.start,
      googleDescription: googleEvent.description,
    });

    // Extract contact information from database appointment
    const dbContacts = dbAppointment.contacts || [];
    const dbContactNames = dbContacts.map((contact: any) =>
      (contact.name || "").toLowerCase().trim()
    );
    const dbContactPhones = dbContacts.map(
      (contact: any) => (contact.phone || contact.id || "").replace(/\D/g, "") // Remove non-digit characters
    );

    // Also extract phone and name from database appointment title (format: "Name +60123456789")
    // The backend creates titles as: contact.name + " " + phoneNumber
    const dbTitlePhones =
      (dbAppointment.title || "").match(/(\+?[0-9]{8,15})/g) || [];
    const dbTitleWords = (dbAppointment.title || "").split(" ");

    // Extract name from title (everything except the last part if it's a phone number)
    let dbTitleNames: string[] = [];
    if (dbTitleWords.length > 1) {
      const potentialPhone = dbTitleWords[dbTitleWords.length - 1];
      if (/(\+?[0-9]{8,15})/.test(potentialPhone)) {
        // Last word is a phone number, so name is everything before it
        const nameFromTitle = dbTitleWords
          .slice(0, -1)
          .join(" ")
          .toLowerCase()
          .trim();
        if (nameFromTitle) {
          dbTitleNames.push(nameFromTitle);
        }
      }
    }

    const allDbPhones = [
      ...dbContactPhones,
      ...dbTitlePhones.map((phone: string) => phone.replace(/\D/g, "")),
    ].filter((phone) => phone.length >= 8);

    const allDbNames = [...dbContactNames, ...dbTitleNames].filter(
      (name) => name.length > 1
    );

    // Extract contact information from Google Calendar event
    const googleTitle = (
      googleEvent.title ||
      googleEvent.summary ||
      ""
    ).toLowerCase();
    const googleDescription = (googleEvent.description || "").toLowerCase();

    // Enhanced phone number extraction - more patterns
    const phonePatterns = [
      /\+?6[0-9]{9,10}/g, // Malaysian numbers
      /\+?[0-9]{8,15}/g, // General international numbers
      /(\([+]?[0-9]{1,4}\))?[\s.-]?[0-9]{3,4}[\s.-]?[0-9]{3,4}[\s.-]?[0-9]{3,4}/g, // Various formats
    ];

    let googlePhones: string[] = [];
    phonePatterns.forEach((pattern) => {
      const titleMatches = googleTitle.match(pattern) || [];
      const descMatches = googleDescription.match(pattern) || [];
      googlePhones.push(...titleMatches, ...descMatches);
    });

    googlePhones = googlePhones
      .map((phone) => phone.replace(/\D/g, ""))
      .filter((phone) => phone.length >= 8);

    // Enhanced name extraction from Google Calendar event
    const namePatterns = [
      /contact:\s*([^,\n(]+)\s*\(/i, // "Contact: Name (phone)"
      /contact:\s*([^,\n]+)/i, // "Contact: Name"
      /-\s*([^,\n]+)$/i, // "Title - Name" at end
      /([a-zA-Z\s]{2,})\s*\+/i, // Name before phone number starting with +
      /([a-zA-Z\s]{2,})\s*[0-9]/i, // Name before phone number
    ];

    let googleNames: string[] = [];

    // First check the title after " - " (from backend format: "summary - contact.name")
    const titleSplit = (googleEvent.title || googleEvent.summary || "").split(
      " - "
    );
    if (titleSplit.length > 1) {
      googleNames.push(titleSplit[titleSplit.length - 1].trim().toLowerCase());
    }

    // Then check description patterns
    for (const pattern of namePatterns) {
      const titleMatch = googleTitle.match(pattern);
      const descMatch = googleDescription.match(pattern);

      if (titleMatch && titleMatch[1]) {
        googleNames.push(titleMatch[1].trim().toLowerCase());
      }
      if (descMatch && descMatch[1]) {
        googleNames.push(descMatch[1].trim().toLowerCase());
      }
    }

    // Remove duplicates and filter out short names
    googleNames = [...new Set(googleNames)].filter((name) => name.length > 2);

    // Check time overlap with increased tolerance for timezone issues
    const dbStart = new Date(dbAppointment.startTime);
    const dbEnd = new Date(dbAppointment.endTime);

    // Handle different date formats from Google Calendar
    let googleStart, googleEnd;
    if (typeof googleEvent.start === "string") {
      googleStart = new Date(googleEvent.start);
    } else if (googleEvent.start?.dateTime) {
      googleStart = new Date(googleEvent.start.dateTime);
    } else if (googleEvent.start?.date) {
      googleStart = new Date(googleEvent.start.date);
    } else {
      googleStart = new Date(googleEvent.start);
    }

    if (typeof googleEvent.end === "string") {
      googleEnd = new Date(googleEvent.end);
    } else if (googleEvent.end?.dateTime) {
      googleEnd = new Date(googleEvent.end.dateTime);
    } else if (googleEvent.end?.date) {
      googleEnd = new Date(googleEvent.end.date);
    } else {
      googleEnd = new Date(googleEvent.end);
    }

    const TOLERANCE_MINUTES = 60; // Increased tolerance for timezone differences
    const toleranceMs = TOLERANCE_MINUTES * 60 * 1000;

    const timeOverlap =
      Math.abs(dbStart.getTime() - googleStart.getTime()) <= toleranceMs &&
      Math.abs(dbEnd.getTime() - googleEnd.getTime()) <= toleranceMs;

    // Check for matching contact information
    let hasMatchingContact = false;

    // Check phone number matches (more lenient comparison)
    if (allDbPhones.length > 0 && googlePhones.length > 0) {
      hasMatchingContact = allDbPhones.some((dbPhone: string) =>
        googlePhones.some((googlePhone) => {
          // Compare last 8-10 digits (ignoring country codes)
          const dbLast = dbPhone.slice(-10);
          const googleLast = googlePhone.slice(-10);
          const dbShort = dbPhone.slice(-8);
          const googleShort = googlePhone.slice(-8);

          return (
            (dbLast === googleLast && dbLast.length >= 8) ||
            (dbShort === googleShort && dbShort.length >= 8) ||
            (dbPhone.includes(googlePhone) && googlePhone.length >= 8) ||
            (googlePhone.includes(dbPhone) && dbPhone.length >= 8)
          );
        })
      );
    }

    // Check name matches if no phone match found
    if (
      !hasMatchingContact &&
      allDbNames.length > 0 &&
      googleNames.length > 0
    ) {
      hasMatchingContact = allDbNames.some((dbName: string) =>
        googleNames.some((googleName: string) => {
          // More flexible name matching
          const cleanDbName = dbName.replace(/[^a-z\s]/g, "").trim();
          const cleanGoogleName = googleName.replace(/[^a-z\s]/g, "").trim();

          return (
            cleanDbName.includes(cleanGoogleName) ||
            cleanGoogleName.includes(cleanDbName) ||
            cleanDbName === cleanGoogleName
          );
        })
      );
    }

    const isDuplicate = timeOverlap && hasMatchingContact;

    if (isDuplicate) {
      console.log("🟡 DUPLICATE DETECTED:", {
        dbTitle: dbAppointment.title,
        googleTitle: googleEvent.title || googleEvent.summary,
        timeOverlap,
        hasMatchingContact,
        dbPhones: allDbPhones,
        googlePhones,
        dbNames: allDbNames,
        googleNames,
      });
    }

    return isDuplicate;
  };

  // Function to filter out duplicate Google Calendar events
  const filterDuplicateGoogleEvents = (
    googleEvents: any[],
    dbAppointments: any[]
  ): any[] => {
    return googleEvents.filter((googleEvent) => {
      // Check if this Google event is a duplicate of any database appointment
      const isDuplicate = dbAppointments.some((dbAppointment) =>
        areAppointmentsDuplicate(dbAppointment, googleEvent)
      );

      if (isDuplicate) {
        console.log(
          "Filtered out duplicate Google Calendar event:",
          googleEvent.title
        );
      }

      return !isDuplicate;
    });
  };

  const fetchAppointments = async (userEmail: string) => {
    setLoading(true);
    try {
      // Always fetch all appointments and handle filtering on client side
      let url = `${baseUrl}/api/appointments?email=${encodeURIComponent(
        userEmail
      )}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }

      const data = await response.json();
      console.log("Fetched appointments:", data);

      // Process appointments to ensure all fields have proper defaults
      const processedAppointments = (data.appointments || data || []).map(
        (appointment: any) => ({
          ...appointment,
          // Ensure required fields have defaults
          contacts: appointment.contacts || [],
          tags: appointment.tags || [],
          staff: appointment.staff || [],
          color: appointment.color || "#51484f",
          address: appointment.address || "",
          details: appointment.details || "",
          meetLink: appointment.meetLink || "",
          appointmentStatus: appointment.appointmentStatus || "scheduled",
          appointmentType: appointment.appointmentType || "general",
          // Handle potential null/undefined values
          title: appointment.title || "Untitled Appointment",
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          dateAdded: appointment.dateAdded || appointment.created_at,
          // Mark as database appointment for duplicate detection
          source: "database",
        })
      );

      // Sort appointments by date
      setAppointments(
        processedAppointments.sort(
          (a: any, b: any) =>
            new Date(b.dateAdded || b.created_at).getTime() -
            new Date(a.dateAdded || a.created_at).getTime()
        )
      );

      // Store database appointments for duplicate detection
      console.log(
        "📊 Setting database appointments for duplicate detection, count:",
        processedAppointments.length
      );
      setDatabaseAppointments(processedAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setAppointments([]); // Set empty array on error
      setDatabaseAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const employeeId = event.target.value;
    setSelectedEmployeeId(employeeId);
  };

  const fetchContacts = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // First get user context to get company ID
      const userResponse = await fetch(
        `${baseUrl}/api/user-context?email=${encodeURIComponent(userEmail)}`
      );
      const userData = await userResponse.json();

      if (!userData.companyId) {
        console.error("No company ID found for user");
        return;
      }

      // Now fetch contacts using the correct endpoint
      const response = await axios.get(
        `${baseUrl}/api/companies/${userData.companyId}/contacts`,
        {
          params: { email: userEmail },
        }
      );
      console.log("Fetched contacts response:", response.data);
      const contactsData = response.data.contacts || [];
      console.log("Fetched contacts:", contactsData);

      // Sort alphabetically
      const sortedContacts = contactsData.sort((a: Contact, b: Contact) =>
        (a.name || "").localeCompare(b.name || "")
      );

      setContacts(sortedContacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  // Add this useEffect to fetch contacts when component mounts
  useEffect(() => {
    fetchContacts();
  }, []);

  const handleContactChange = (selectedOption: any) => {
    if (selectedOption) {
      const selectedContactData = contacts.find(
        (contact) => contact.id === selectedOption.value
      );
      setSelectedContact(selectedContactData || null);
    } else {
      setSelectedContact(null);
    }
  };

  const handleEventClick = async (info: any) => {
    // Check if this is a Google Calendar event
    const isGoogleCalendarEvent = info.event.source?.googleCalendarId;
    const eventSource = info.event.extendedProps?.source;

    if (isGoogleCalendarEvent || eventSource === "google-calendar") {
      // For Google Calendar events, show a read-only modal or redirect to Google Calendar
      toast.info(
        "This is a Google Calendar event. It cannot be edited here. Please edit it in Google Calendar."
      );

      // Optionally, you could open Google Calendar in a new tab
      // const calendarUrl = `https://calendar.google.com/calendar/u/0/r/week`;
      // window.open(calendarUrl, '_blank');
      return;
    }

    // Handle database appointments (original logic)
    const appointment = appointments.find((app) => app.id === info.event.id);

    if (!appointment) {
      console.error("Appointment not found!");
      return;
    }

    const startStr = format(new Date(appointment.startTime), "HH:mm");
    const endStr = format(new Date(appointment.endTime), "HH:mm");
    const dateStr = format(new Date(appointment.startTime), "yyyy-MM-dd");
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const eventContacts = appointment.contacts || [];
    const eventDetails = appointment.details || "";
    const eventMeetLink = appointment.meetLink || "";

    // Set selected contact based on the appointment's first contact
    if (eventContacts.length > 0) {
      // Take only the first contact from the appointment
      const eventContact = eventContacts[0];

      // Try to find the contact in the contacts array
      const fullContact = contacts.find(
        (contact) =>
          contact.id === eventContact.id ||
          contact.id === eventContact.contact_id ||
          contact.name === eventContact.name ||
          contact.phone === eventContact.phone
      );

      console.log("Full contact found:", fullContact);

      // If found, set the full contact, otherwise create a minimal contact object
      setSelectedContact(
        fullContact || {
          id: eventContact.id,
          contact_id: eventContact.contact_id,
          name: eventContact.name || "Unknown Contact",
          firstName: eventContact.name?.split(" ")[0] || "",
          lastName: eventContact.name?.split(" ").slice(1).join(" ") || "",
          phone: eventContact.phone || "",
          email: eventContact.email || "",
          // Add other required Contact interface fields with defaults
          additionalEmails: [],
          address1: null,
          assignedTo: null,
          businessId: null,
          city: null,
          companyName: null,
          country: "",
          customFields: [],
          dateAdded: new Date().toISOString(),
          dateOfBirth: null,
          dateUpdated: new Date().toISOString(),
          dnd: false,
          dndSettings: {},
          followers: [],
          locationId: "",
          postalCode: null,
          source: null,
          state: null,
          tags: [],
          website: null,
        }
      );
    } else {
      setSelectedContact(null);
    }

    setCurrentEvent({
      id: appointment.id,
      title: appointment.title || "",
      dateStr: dateStr,
      startTimeStr: startStr,
      endTimeStr: endStr,
      extendedProps: {
        address: appointment.address || "",
        appointmentStatus: appointment.appointmentStatus || "scheduled",
        appointmentType: appointment.appointmentType || "general",
        staff: appointment.staff || [],
        dateAdded: appointment.dateAdded || appointment.created_at,
        contacts: eventContacts,
        tags: appointment.tags || [],
        details: appointment.details || "",
        meetLink: appointment.meetLink || "",
        notificationSent: appointment.notificationSent || false,
        minyak: appointment.minyak || 0,
        toll: appointment.toll || 0,
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend),
      details: eventDetails,
      meetLink: eventMeetLink,
    });

    setInitialAppointmentStatus(appointment.appointmentStatus || "scheduled");
    setEditModalOpen(true);
  };

  const handleTagChange = (newValue: any, actionMeta: any) => {
    const selectedTags = newValue
      ? newValue.map((item: any) => ({ id: item.value, name: item.label }))
      : [];
    setCurrentEvent({
      ...currentEvent,
      extendedProps: {
        ...currentEvent.extendedProps,
        tags: selectedTags,
      },
    });
  };
  const sendWhatsAppNotification = async (
    contacts: any[],
    appointmentDetails: any,
    companyId: string,
    reminderConfig?: any
  ) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("User email not found");
        return false;
      }

      // Get company data from API
      const companyResponse = await axios.get(
        `${baseUrl}/api/company-data-user?email=${encodeURIComponent(
          userEmail
        )}`
      );
      const companyData = companyResponse.data;

      // Format the message based on recipient type
      let message = "";
      if (reminderConfig) {
        // Use the reminder template if provided
        const startTime = new Date(appointmentDetails.startTime);
        let baseMessage = formatReminderMessage(
          reminderConfig.message,
          appointmentDetails,
          startTime
        );

        // Customize message for different recipient types
        if (reminderConfig.recipientType === "employees") {
          message = `👨‍💼 EMPLOYEE REMINDER:\n\n${baseMessage}\n\n📍 Location: ${
            appointmentDetails.address || "TBD"
          }\n👥 Staff: ${
            appointmentDetails.staff?.length || 0
          } assigned\n\nPlease ensure you're prepared for this appointment.`;
        } else if (reminderConfig.recipientType === "contacts") {
          message = `📱 CLIENT REMINDER:\n\n${baseMessage}\n\n📍 Location: ${
            appointmentDetails.address || "TBD"
          }\n⏰ Duration: ${Math.round(
            (new Date(appointmentDetails.endTime).getTime() -
              new Date(appointmentDetails.startTime).getTime()) /
              (1000 * 60)
          )} minutes\n\nWe look forward to serving you!`;
        } else {
          message = baseMessage;
        }
      } else {
        // Use the default message format
        message = `
🗓️ New Appointment Details:
📌 ${appointmentDetails.title}
📅 Date: ${format(new Date(appointmentDetails.startTime), "MMMM dd, yyyy")}
⏰ Time: ${format(new Date(appointmentDetails.startTime), "h:mm a")} - ${format(
          new Date(appointmentDetails.endTime),
          "h:mm a"
        )}
${
  appointmentDetails.meetLink
    ? `\n🎥 Join Meeting: ${appointmentDetails.meetLink}`
    : ""
}
`;
      }

      // Determine recipients based on reminderConfig
      let recipients: { id: string; phone?: string }[] = [];

      if (
        reminderConfig &&
        reminderConfig.recipientType === "employees" &&
        reminderConfig.selectedEmployees?.length > 0
      ) {
        // Get employee phone numbers from API
        const employeesResponse = await axios.get(
          `${baseUrl}/api/employees?email=${encodeURIComponent(
            userEmail
          )}&employeeIds=${reminderConfig.selectedEmployees.join(",")}`
        );
        recipients = employeesResponse.data
          .filter((emp: any) => emp.phoneNumber)
          .map((emp: any) => ({ id: emp.id, phone: emp.phoneNumber }));
      } else if (
        reminderConfig &&
        reminderConfig.recipientType === "contacts"
      ) {
        // Use appointment contacts
        recipients = contacts;
      } else {
        // Default fallback
        recipients = contacts;
      }

      if (recipients.length === 0) {
        console.warn("No valid recipients found for WhatsApp notification");
        return false;
      }

      // Send WhatsApp message to each recipient
      const sendPromises = recipients.map(async (recipient) => {
        const contactId = recipient.id;
        const phoneNumber = recipient.phone || "";

        if (!contactId && !phoneNumber) {
          console.error("Recipient missing ID and phone:", recipient);
          return;
        }

        try {
          // Send notification via API
          const notificationData = {
            contactId,
            phoneNumber,
            message,
            companyId,
            userEmail,
          };

          const response = await axios.post(
            `${baseUrl}/api/send-whatsapp-notification`,
            notificationData
          );
          return response.data;
        } catch (error) {
          console.error(
            `Failed to send WhatsApp notification to recipient ${
              contactId || phoneNumber
            }:`,
            error
          );
          throw error;
        }
      });

      await Promise.all(sendPromises);
      return true;
    } catch (error) {
      console.error("Error sending WhatsApp notifications:", error);
      return false;
    }
  };

  const handleSaveAppointment = async () => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("User email not found");
        return;
      }

      const { id, title, dateStr, startTimeStr, endTimeStr, extendedProps } =
        currentEvent;
      const startTime = new Date(`${dateStr}T${startTimeStr}`).toISOString();
      const endTime = new Date(`${dateStr}T${endTimeStr}`).toISOString();

      // Combine title with type and units if they exist
      const combinedTitle = extendedProps?.units
        ? `${title || ""} | ${extendedProps.type || ""} | ${
            extendedProps.units
          } Units`
        : title || "";

      const firstEmployeeId = extendedProps?.staff?.[0];
      const secondEmployeeId = extendedProps?.staff?.[1];
      const firstEmployee = employees.find((emp) => emp.id === firstEmployeeId);
      const secondEmployee = employees.find(
        (emp) => emp.id === secondEmployeeId
      );

      let color;
      if (firstEmployee && secondEmployee) {
        color = `linear-gradient(to right, ${firstEmployee.color} 50%, ${secondEmployee.color} 50%)`;
      } else if (firstEmployee) {
        color = firstEmployee.color;
      } else {
        color = "#51484f"; // Default color
      }

      // Prepare the appointment data for the new backend structure
      const appointmentData = {
        userEmail, // Required for authentication
        title: combinedTitle,
        startTime,
        endTime,
        appointmentStatus: (
          extendedProps?.appointmentStatus || "scheduled"
        ).toLowerCase(),
        appointmentType: extendedProps?.appointmentType || "general",
        details: extendedProps?.details || "",
        address: extendedProps?.address || "",
        staff: extendedProps?.staff || [],
        contact_id: selectedContact?.contact_id || null,
        // Additional fields that will go to metadata
        color: color,
        tags: extendedProps?.tags || [],
        minyak: Number(extendedProps?.minyak) || 0,
        toll: Number(extendedProps?.toll) || 0,
        meetLink: extendedProps?.meetLink || "",
        notificationSent: extendedProps?.notificationSent || false,
        units: extendedProps?.units,
        type: extendedProps?.type,
      };
      console.log("Appointment data to save:", appointmentData);
      console.log("Selected contact:", selectedContact);

      let response;

      if (id && id !== "temp") {
        // Update existing appointment
        console.log("Updating appointment:", appointmentData);
        response = await axios.put(
          `${baseUrl}/api/appointments/${id}`,
          appointmentData
        );
      } else {
        // Create new appointment
        console.log("Creating appointment:", appointmentData);
        response = await axios.post(
          `${baseUrl}/api/appointments`,
          appointmentData
        );
      }

      const savedAppointment = response.data;
      console.log("Saved appointment response:", savedAppointment);

      // Create expenses if they exist
      if (extendedProps?.minyak || extendedProps?.toll) {
        const expenseData = {
          email: userEmail,
          appointment_id: savedAppointment.id,
          amount:
            (Number(extendedProps?.minyak) || 0) +
            (Number(extendedProps?.toll) || 0),
          description: `Appointment expenses - Fuel: ${
            extendedProps?.minyak || 0
          }, Toll: ${extendedProps?.toll || 0}`,
          category: "appointment",
          date: format(new Date(startTime), "yyyy-MM-dd"),
        };

        await axios.post(`${baseUrl}/api/expenses`, expenseData);
      }

      // Send WhatsApp notification only if meetLink exists and contact is selected
      if (
        appointmentData.meetLink &&
        !appointmentData.notificationSent &&
        selectedContact
      ) {
        try {
          const notificationResponse = await axios.post(
            `${baseUrl}/api/send-whatsapp-notification`,
            {
              email: userEmail,
              contacts: [selectedContact],
              message: `Your appointment "${combinedTitle}" is scheduled for ${format(
                new Date(startTime),
                "PPp"
              )}. Meeting link: ${appointmentData.meetLink}`,
              appointmentDetails: savedAppointment,
            }
          );

          if (notificationResponse.data.success) {
            // Update the appointment to mark notification as sent
            await axios.put(
              `${baseUrl}/api/appointments/${savedAppointment.id}`,
              {
                ...appointmentData,
                notificationSent: true,
              }
            );
          }
        } catch (notificationError) {
          console.error(
            "Error sending WhatsApp notification:",
            notificationError
          );
          // Continue execution even if notification fails
        }
      }

      // Process reminders for this appointment
      await processAppointmentReminders(savedAppointment);

      // Update the appointments state
      setAppointments((prevAppointments) => {
        if (id && id !== "temp") {
          // Update existing appointment
          return prevAppointments.map((appointment) =>
            appointment.id === id ? savedAppointment : appointment
          );
        } else {
          // Add new appointment
          return [...prevAppointments, savedAppointment];
        }
      });

      // Close the modal
      setEditModalOpen(false);
      toast.success("Appointment saved successfully!");
    } catch (error) {
      console.error("Error saving appointment:", error);
      toast.error("Failed to save appointment");
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    const dateStr = format(new Date(selectInfo.startStr), "yyyy-MM-dd");
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)

    setCurrentEvent({
      title: "",
      dateStr: dateStr,
      startTimeStr: "",
      endTimeStr: "",
      extendedProps: {
        address: "",
        appointmentStatus: "",
        staff: "",
        dateAdded: new Date().toISOString(),
        tags: [],
        details: "",
        meetLink: "",
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend),
    });

    setAddModalOpen(true);
  };
  const scheduleMessages = async (
    phoneNumber: string,
    appointmentTime: Date
  ) => {
    const currentTime = new Date();
    if (appointmentTime < currentTime) {
      console.log("Appointment is in the past, skipping message scheduling");
      return;
    }
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Format phone number for WhatsApp
      const formattedPhone = phoneNumber.replace(/\D/g, "") + "@c.us";

      // Format appointment time
      const formattedTime = appointmentTime.toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      // Prepare messages
      const messages = [
        {
          text: `Peringatan: Temujanji anda dengan BAROKAH AIRCOND akan bermula dalam masa 1 jam pada ${formattedTime}. \nKami akan memberikan perkhidmatan yang terbaik untuk anda! 😊`,
          time: new Date(appointmentTime.getTime() - 60 * 60 * 1000), // 1 hour before
        },
        {
          text: `TERIMA KASIH di atas kepecayaan cik menggunakan perkidmatan BAROKAH AIRCOND\n

Bagi tujuan menambahbaik 😊 perkidmatan, kami ingin bertanya adakah cik perpuas hati dengan perkhidmatan dari Barokah Aircond?`,
          time: new Date(appointmentTime.getTime() + 3 * 60 * 60 * 1000), // 3 hours after
        },
      ];

      // Schedule both messages via API
      const scheduleData = {
        userEmail,
        phoneNumber: formattedPhone,
        messages,
        appointmentTime: appointmentTime.toISOString(),
      };

      await axios.post(
        `${baseUrl}/api/schedule-appointment-messages`,
        scheduleData
      );
      toast.success("Reminder and feedback messages scheduled successfully");
    } catch (error) {
      console.error("Error scheduling messages:", error);
      toast.error("Failed to schedule messages");
      throw error; // Re-throw to handle in calling function
    }
  };

  const handleAddAppointment = async () => {
    try {
      const firstEmployeeId = selectedEmployeeIds[0];
      const secondEmployeeId = selectedEmployeeIds[1];
      const firstEmployee = employees.find((emp) => emp.id === firstEmployeeId);
      const secondEmployee = employees.find(
        (emp) => emp.id === secondEmployeeId
      );

      let color;
      if (firstEmployee && secondEmployee) {
        color = `linear-gradient(to right, ${firstEmployee.color} 50%, ${secondEmployee.color} 50%)`;
      } else if (firstEmployee) {
        color = firstEmployee.color;
      } else {
        color = "#51484f"; // Default color
      }

      // Combine title and address
      const combinedTitle = currentEvent?.extendedProps?.units
        ? `${currentEvent.title || ""} | ${
            currentEvent.extendedProps.type || ""
          } | ${currentEvent.extendedProps.units} Units`
        : currentEvent?.title || "";

      const newEvent = {
        title: combinedTitle,
        startTime: new Date(
          `${currentEvent.dateStr}T${currentEvent.startTimeStr}`
        ).toISOString(),
        endTime: new Date(
          `${currentEvent.dateStr}T${currentEvent.endTimeStr}`
        ).toISOString(),
        address: currentEvent?.extendedProps?.address || "",
        appointmentStatus:
          currentEvent?.extendedProps?.appointmentStatus || "scheduled",
        appointmentType:
          currentEvent?.extendedProps?.appointmentType || "general",
        staff: selectedEmployeeIds || [],
        tags: currentEvent?.extendedProps?.tags || [],
        color: color,
        contact_id: selectedContact?.contact_id || null,
        details: currentEvent?.extendedProps?.details || "",
        meetLink: currentEvent?.extendedProps?.meetLink || "",
        // Additional fields that will go to metadata
        minyak: currentEvent?.extendedProps?.minyak || 0,
        toll: currentEvent?.extendedProps?.toll || 0,
        units: currentEvent?.extendedProps?.units,
        type: currentEvent?.extendedProps?.type,
      };

      const phoneRegex = /(?:\/|\\)?(\d{10,11})/;
      const match = combinedTitle.match(phoneRegex);
      let phoneNumber = match ? match[1] : "";
      if (phoneNumber && !phoneNumber.startsWith("6")) {
        phoneNumber = "6" + phoneNumber;
      }

      console.log("Creating new appointment:", newEvent);

      // Use the new local API
      const newAppointment = await createAppointment(newEvent);

      if (newAppointment) {
        if (phoneNumber) {
          try {
            await scheduleMessages(
              phoneNumber,
              new Date(newAppointment.startTime)
            );
          } catch (error) {
            console.error("Error scheduling reminder:", error);
            toast.error("Appointment created but failed to schedule reminder");
          }
        }

        // Process reminders for this appointment
        await processAppointmentReminders(newAppointment);

        // Update the calendar immediately
        if (calendarRef.current) {
          const calendarApi = (calendarRef.current as any).getApi();
          calendarApi.addEvent({
            id: newAppointment.id,
            title: newAppointment.title,
            start: new Date(newAppointment.startTime),
            end: new Date(newAppointment.endTime),
            backgroundColor: newAppointment.color || "#51484f",
            borderColor: "transparent",
            extendedProps: {
              appointmentStatus: newAppointment.appointmentStatus,
              appointmentType: newAppointment.appointmentType,
              staff: newAppointment.staff,
              tags: newAppointment.tags || [],
              details: newAppointment.details || "",
              meetLink: newAppointment.meetLink || "",
              contacts: newAppointment.contacts || [],
            },
          });
        }
        setAddModalOpen(false);
        setSelectedContact(null); // Clear selected contact
        toast.success("Appointment created successfully!");
      }
    } catch (error) {
      console.error("Error adding appointment:", error);
      toast.error("Failed to add appointment");
    }
  };

  const createAppointment = async (newEvent: any) => {
    try {
      // Get user email from localStorage (or however you store it)
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No authenticated user or email found");
        return null;
      }

      // Prepare the appointment data - send all fields, let backend handle schema mapping
      const appointmentData = {
        ...newEvent,
        userEmail, // Required for authentication
        // Ensure contact_id is properly formatted for single contact
        contact_id: newEvent.contact_id || null,
        // Map common fields that might be named differently
        startTime: newEvent.startTime || newEvent.start,
        endTime: newEvent.endTime || newEvent.end,
        appointmentStatus: newEvent.appointmentStatus || "scheduled",
        appointmentType:
          newEvent.appointmentType || newEvent.status || "general",
        details: newEvent.details || newEvent.description || "",
        staff: newEvent.staff || [],
        metadata: {
          // Any extra fields that don't map to schema go here
          address: newEvent.address || "",
          color: newEvent.color || "#51484f",
          tags: newEvent.tags || [],
          meetLink: newEvent.meetLink || "",
          notificationSent: newEvent.notificationSent || false,
          minyak: newEvent.minyak || 0,
          toll: newEvent.toll || 0,
          ...newEvent.extendedProps, // Include any extended properties
        },
      };

      console.log("Sending appointment data:", appointmentData);

      // Call your local API to create the appointment
      const response = await fetch(`${baseUrl}/api/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to create appointment:", errorData);
        throw new Error(errorData.error || "Failed to create appointment");
      }

      const newAppointment = await response.json();
      console.log("Received appointment response:", newAppointment);

      // Ensure the appointment has all required fields with proper defaults
      const processedAppointment = {
        ...newAppointment,
        contacts: newAppointment.contacts || [],
        tags: newAppointment.tags || [],
        staff: newAppointment.staff || [],
        color: newAppointment.color || "#51484f",
        address: newAppointment.address || "",
        details: newAppointment.details || "",
        meetLink: newAppointment.meetLink || "",
        appointmentStatus: newAppointment.appointmentStatus || "scheduled",
        appointmentType: newAppointment.appointmentType || "general",
      };

      setAppointments((prevAppointments) => [
        ...prevAppointments,
        processedAppointment,
      ]);
      return processedAppointment;
    } catch (error) {
      console.error("Error creating appointment:", error);
      return null;
    }
  };

  const handleEventDrop = async (eventDropInfo: any) => {
    const { event } = eventDropInfo;

    // Fetch the full appointment data to get the contacts array
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) {
        console.error("No user email found");
        return;
      }

      // Get appointment data from API
      const response = await axios.get(
        `${baseUrl}/api/appointments/${event.id}?email=${encodeURIComponent(
          userEmail
        )}`
      );
      const appointmentData = response.data;

      if (!appointmentData) {
        console.error("No appointment found!");
        return;
      }

      const updatedAppointment: Appointment = {
        ...appointmentData,
        startTime: event.start.toISOString(),
        endTime: event.end.toISOString(),
      };

      // Update appointment via API
      await axios.put(`${baseUrl}/api/appointments/${event.id}`, {
        email: userEmail,
        appointment: updatedAppointment,
      });

      // Process reminders for this updated appointment
      await processAppointmentReminders(updatedAppointment);

      setAppointments(
        appointments.map((appointment) =>
          appointment.id === event.id ? updatedAppointment : appointment
        )
      );

      toast.success("Appointment time updated successfully");
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast.error("Failed to update appointment time");
      // Revert the drag if there was an error
      eventDropInfo.revert();
    }
  };

  const handleStatusFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    console.log("Status Filter Changed:", {
      newStatus: event.target.value,
      currentAppointments: appointments.map((a) => ({
        id: a.id,
        status: a.appointmentStatus,
      })),
    });
    setFilterStatus(event.target.value);
  };

  const handleDateFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFilterDate(event.target.value);
  };

  const filteredAppointments = appointments.filter((appointment) => {
    // Case-insensitive status matching - handle null/undefined values
    const statusMatch =
      !filterStatus ||
      (appointment.appointmentStatus &&
        appointment.appointmentStatus.toLowerCase() ===
          filterStatus.toLowerCase());

    // Date matching - handle invalid dates gracefully
    let dateMatch = true;
    if (filterDate) {
      try {
        const appointmentDate = format(
          new Date(appointment.startTime),
          "yyyy-MM-dd"
        );
        dateMatch = appointmentDate === filterDate;
      } catch (error) {
        console.warn(
          "Invalid date in appointment:",
          appointment.id,
          appointment.startTime
        );
        dateMatch = false;
      }
    }

    // Employee matching - handle different staff data structures
    let employeeMatch = true;
    if (selectedEmployeeId) {
      if (Array.isArray(appointment.staff)) {
        // If staff is an array of IDs
        employeeMatch = appointment.staff.includes(selectedEmployeeId);
      } else if (typeof appointment.staff === "string") {
        // If staff is a single ID string
        employeeMatch = appointment.staff === selectedEmployeeId;
      } else {
        // If no staff data, don't match
        employeeMatch = false;
      }
    }

    // Text search across title, details, tags, contact names
    const q = (searchQuery || "").trim().toLowerCase();
    const searchMatch = !q
      ? true
      : [
          appointment.title,
          appointment.details,
          ...(appointment.tags || []).map((t: any) => t?.name),
          ...(appointment.contacts || []).map(
            (c: any) =>
              c?.name || `${c?.firstName || ""} ${c?.lastName || ""}`.trim()
          ),
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));

    console.log("Filtering Appointment:", {
      id: appointment.id,
      title: appointment.title,
      appointmentStatus: appointment.appointmentStatus,
      filterStatus,
      statusMatch,
      startTime: appointment.startTime,
      filterDate,
      dateMatch,
      staff: appointment.staff,
      selectedEmployeeId,
      employeeMatch,
      searchQuery: q,
      searchMatch,
      finalResult: statusMatch && dateMatch && employeeMatch && searchMatch,
    });

    return statusMatch && dateMatch && employeeMatch && searchMatch;
  });

  // Debug log to see filter results
  console.log("Filter Summary:", {
    totalAppointments: appointments.length,
    filteredAppointments: filteredAppointments.length,
    filterStatus,
    filterDate,
    selectedEmployeeId,
    appointmentStatuses: appointments.map((a) => a.appointmentStatus),
    staffData: appointments.map((a) => ({ id: a.id, staff: a.staff })),
  });

  const handleAppointmentClick = async (appointment: Appointment) => {
    // Set selected contact to the appointment's contact (single contact)
    setSelectedContact(
      appointment.contacts && appointment.contacts.length > 0
        ? {
            id: appointment.contacts[0].id,
            contact_id: appointment.contacts[0].contact_id,
            name: appointment.contacts[0].name || "Unknown Contact",
            firstName: appointment.contacts[0].name?.split(" ")[0] || "",
            lastName:
              appointment.contacts[0].name?.split(" ").slice(1).join(" ") || "",
            phone: appointment.contacts[0].phone || "",
            email: appointment.contacts[0].email || "",
            additionalEmails: [],
            address1: null,
            assignedTo: null,
            businessId: null,
            city: null,
            companyName: null,
            country: "",
            customFields: [],
            dateAdded: new Date().toISOString(),
            dateOfBirth: null,
            dateUpdated: new Date().toISOString(),
            dnd: false,
            dndSettings: {},
            followers: [],
            locationId: "",
            postalCode: null,
            source: null,
            state: null,
            tags: [],
            website: null,
          }
        : null
    );

    setCurrentEvent({
      id: appointment.id,
      title: appointment.title,
      dateStr: format(new Date(appointment.startTime), "yyyy-MM-dd"),
      startTimeStr: format(new Date(appointment.startTime), "HH:mm"),
      endTimeStr: format(new Date(appointment.endTime), "HH:mm"),
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        dateAdded: appointment.dateAdded,
        contacts: appointment.contacts, // Include contacts in currentEvent
        tags: appointment.tags || [],
        details: appointment.details || "",
        meetLink: appointment.meetLink || "",
      },
    });
    console.log("Current event set:", {
      id: appointment.id,
      title: appointment.title,
      dateStr: format(new Date(appointment.startTime), "yyyy-MM-dd"),
      startTimeStr: format(new Date(appointment.startTime), "HH:mm"),
      endTimeStr: format(new Date(appointment.endTime), "HH:mm"),
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        dateAdded: appointment.dateAdded,
        contacts: appointment.contacts,
        tags: appointment.tags || [],
        details: appointment.details || "",
        meetLink: appointment.meetLink || "",
      },
    });
    setInitialAppointmentStatus(appointment.appointmentStatus);
    setEditModalOpen(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) return;

    try {
      await axios.delete(`${baseUrl}/api/appointments/${appointmentId}`, {
        data: { email: userEmail },
      });

      setAppointments((prevAppointments) =>
        prevAppointments.filter(
          (appointment) => appointment.id !== appointmentId
        )
      );
    } catch (error) {
      console.error("Error deleting appointment:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-gray-500";
      case "confirmed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "showed":
        return "bg-green-500";
      case "noshow":
        return "bg-red-500";
      case "rescheduled":
        return "bg-gray-500";
      case "lost":
        return "bg-red-500";
      case "closed":
        return "bg-blue-700";
      default:
        return "bg-gray-500";
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const { event } = eventInfo;
    const { extendedProps } = event;
    const startTime = format(new Date(event.start), "HH:mm");
    const endTime = event.end ? format(new Date(event.end), "HH:mm") : "";
    const status = extendedProps.appointmentStatus || "";
    const contacts = extendedProps.contacts || [];
    const isMobile = window.innerWidth < 768;

    // Enhanced glassmorphism status-based colors
    const statusColors: Record<
      string,
      {
        bg: string;
        text: string;
        gradient: string;
        accent: string;
        glassEffect: string;
      }
    > = {
      new: {
        bg: "rgba(248,250,252,0.8)",
        text: "#475569",
        gradient:
          "linear-gradient(135deg, rgba(248,250,252,0.9) 0%, rgba(226,232,240,0.8) 100%)",
        accent: "#64748B",
        glassEffect: "rgba(100,116,139,0.1)",
      },
      confirmed: {
        bg: "rgba(236,253,245,0.8)",
        text: "#065F46",
        gradient:
          "linear-gradient(135deg, rgba(236,253,245,0.9) 0%, rgba(209,250,229,0.8) 100%)",
        accent: "#10B981",
        glassEffect: "rgba(16,185,129,0.1)",
      },
      cancelled: {
        bg: "rgba(254,242,242,0.8)",
        text: "#991B1B",
        gradient:
          "linear-gradient(135deg, rgba(254,242,242,0.9) 0%, rgba(254,202,202,0.8) 100%)",
        accent: "#EF4444",
        glassEffect: "rgba(239,68,68,0.1)",
      },
      showed: {
        bg: "rgba(243,232,255,0.8)",
        text: "#581C87",
        gradient:
          "linear-gradient(135deg, rgba(243,232,255,0.9) 0%, rgba(221,214,254,0.8) 100%)",
        accent: "#8B5CF6",
        glassEffect: "rgba(139,92,246,0.1)",
      },
      noshow: {
        bg: "rgba(255,247,237,0.8)",
        text: "#C2410C",
        gradient:
          "linear-gradient(135deg, rgba(255,247,237,0.9) 0%, rgba(254,215,170,0.8) 100%)",
        accent: "#F97316",
        glassEffect: "rgba(249,115,22,0.1)",
      },
      rescheduled: {
        bg: "rgba(240,249,255,0.8)",
        text: "#075985",
        gradient:
          "linear-gradient(135deg, rgba(240,249,255,0.9) 0%, rgba(186,230,253,0.8) 100%)",
        accent: "#0EA5E9",
        glassEffect: "rgba(14,165,233,0.1)",
      },
      lost: {
        bg: "rgba(250,250,250,0.8)",
        text: "#525252",
        gradient:
          "linear-gradient(135deg, rgba(250,250,250,0.9) 0%, rgba(229,229,229,0.8) 100%)",
        accent: "#737373",
        glassEffect: "rgba(115,115,115,0.1)",
      },
      closed: {
        bg: "rgba(239,246,255,0.8)",
        text: "#1E40AF",
        gradient:
          "linear-gradient(135deg, rgba(239,246,255,0.9) 0%, rgba(219,234,254,0.8) 100%)",
        accent: "#3B82F6",
        glassEffect: "rgba(59,130,246,0.1)",
      },
    };

    const statusColor = statusColors[status.toLowerCase()] || {
      bg: "rgba(249,250,251,0.8)",
      text: "#374151",
      gradient:
        "linear-gradient(135deg, rgba(249,250,251,0.9) 0%, rgba(229,231,235,0.8) 100%)",
      accent: "#6B7280",
      glassEffect: "rgba(107,114,128,0.1)",
    };

    return (
      <div
        className={`event-content-glassmorphism ${status.toLowerCase()}`}
        style={{
          background: statusColor.gradient,
          padding: isMobile ? "8px 10px" : "10px 12px",
          borderRadius: "16px",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          fontSize: isMobile ? "11px" : "12px",
          border: `1px solid ${statusColor.accent}30`,
          boxShadow: `0 8px 32px ${statusColor.glassEffect}, 0 4px 12px ${statusColor.accent}15`,
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "pointer",
          position: "relative",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
          e.currentTarget.style.boxShadow = `0 12px 40px ${statusColor.glassEffect}, 0 8px 25px ${statusColor.accent}25`;
          e.currentTarget.style.background = `linear-gradient(135deg, ${statusColor.bg} 0%, ${statusColor.glassEffect} 100%)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0) scale(1)";
          e.currentTarget.style.boxShadow = `0 8px 32px ${statusColor.glassEffect}, 0 4px 12px ${statusColor.accent}15`;
          e.currentTarget.style.background = statusColor.gradient;
        }}
      >
        {/* Glassmorphism overlay effect */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0",
            background: `linear-gradient(135deg, ${statusColor.glassEffect} 0%, transparent 50%, ${statusColor.glassEffect} 100%)`,
            borderRadius: "16px",
            pointerEvents: "none",
            opacity: 0.3,
          }}
        />

        {/* Enhanced status indicator bar with gradient */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "4px",
            background: `linear-gradient(90deg, ${statusColor.accent} 0%, ${statusColor.accent}90 50%, ${statusColor.accent} 100%)`,
            borderRadius: "16px 16px 0 0",
            boxShadow: `0 2px 8px ${statusColor.accent}40`,
          }}
        />

        {/* Content container with z-index */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {/* Header with title and status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: statusColor.text,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: isMobile ? "12px" : "13px",
                flex: 1,
                textShadow: "0 1px 2px rgba(255,255,255,0.8)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${statusColor.accent} 0%, ${statusColor.accent}80 100%)`,
                  display: "inline-block",
                  boxShadow: `0 0 12px ${statusColor.accent}60, inset 0 1px 2px rgba(255,255,255,0.3)`,
                  border: `1px solid ${statusColor.accent}40`,
                }}
              />
              {event.title}
            </div>
            {extendedProps.meetLink && (
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "8px",
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(29,78,216,0.8) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                >
                  📹
                </span>
              </div>
            )}
          </div>

          {/* Time section with enhanced styling */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: statusColor.text,
              fontWeight: 600,
              fontSize: isMobile ? "10px" : "11px",
              background: `linear-gradient(135deg, ${statusColor.glassEffect} 0%, transparent 100%)`,
              padding: "4px 8px",
              borderRadius: "8px",
              border: `1px solid ${statusColor.accent}20`,
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              style={{
                opacity: 0.8,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
              }}
            >
              🕐
            </span>
            <span style={{ textShadow: "0 1px 2px rgba(255,255,255,0.6)" }}>
              {startTime} - {endTime}
            </span>
          </div>

          {/* Contacts section with glassmorphism */}
          {contacts.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: statusColor.text,
                fontWeight: 500,
                fontSize: "10px",
                opacity: 0.9,
                background: `linear-gradient(135deg, ${statusColor.glassEffect} 0%, transparent 100%)`,
                padding: "3px 6px",
                borderRadius: "6px",
                border: `1px solid ${statusColor.accent}15`,
                backdropFilter: "blur(6px)",
              }}
            >
              <span
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
              >
                👤
              </span>
              <span
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  textShadow: "0 1px 2px rgba(255,255,255,0.6)",
                }}
              >
                {contacts.map((c: any) => c.name).join(", ")}
              </span>
            </div>
          )}

          {/* Details section (desktop only) with enhanced glassmorphism */}
          {!isMobile && extendedProps.details && (
            <div
              style={{
                fontSize: "10px",
                color: statusColor.text,
                opacity: 0.8,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontStyle: "italic",
                borderTop: `1px solid ${statusColor.accent}25`,
                paddingTop: "6px",
                marginTop: "4px",
                background: `linear-gradient(135deg, ${statusColor.glassEffect} 0%, transparent 100%)`,
                padding: "6px 8px",
                borderRadius: "6px",
                backdropFilter: "blur(6px)",
                textShadow: "0 1px 2px rgba(255,255,255,0.6)",
              }}
            >
              {extendedProps.details}
            </div>
          )}
        </div>

        {/* Subtle shine effect on hover */}
        <div
          className="shine-effect"
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background:
              "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
            transform: "rotate(45deg)",
            pointerEvents: "none",
            opacity: 0,
            transition: "all 0.6s ease",
          }}
        />
      </div>
    );
  };

  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedEmployeeId
  );

  const handleStaffChange = (employeeId: string) => {
    setCurrentEvent((prevEvent: { extendedProps: { staff: string[] } }) => {
      const isSelected = prevEvent.extendedProps.staff.includes(employeeId);
      const newStaff = isSelected
        ? prevEvent.extendedProps.staff.filter(
            (id: string) => id !== employeeId
          )
        : [...prevEvent.extendedProps.staff, employeeId];

      return {
        ...prevEvent,
        extendedProps: {
          ...prevEvent.extendedProps,
          staff: newStaff,
        },
      };
    });
  };

  const handleStaffChangeAddModal = (employeeId: string) => {
    setSelectedEmployeeIds((prevSelected) => {
      const isSelected = prevSelected.includes(employeeId);
      return isSelected
        ? prevSelected.filter((id) => id !== employeeId)
        : [...prevSelected, employeeId];
    });
  };

  useEffect(() => {
    const fetchCalendarConfig = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) return;

        const response = await axios.get(
          `${baseUrl}/api/calendar-config?email=${encodeURIComponent(
            userEmail
          )}`
        );

        if (response.data) {
          const calendarConfig = response.data as CalendarConfig;
          setConfig(calendarConfig);
        } else {
          const defaultConfig: CalendarConfig = {
            calendarId: "",
            additionalCalendarIds: [],
            startHour: 11,
            endHour: 21,
            slotDuration: 30,
            daysAhead: 3,
          };

          await axios.post(`${baseUrl}/api/calendar-config`, {
            email: userEmail,
            config: defaultConfig,
          });

          setConfig(defaultConfig);
        }
      } catch (error) {
        console.error("Error fetching calendar config:", error);
      }
    };

    fetchCalendarConfig();
  }, []);

  const updateCalendarConfig = async (newConfig: CalendarConfig) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;
      console.log("Updating calendar config:", newConfig);

      await axios.put(`${baseUrl}/api/calendar-config`, {
        email: userEmail,
        config: newConfig,
      });
    } catch (error) {
      console.error("Error updating calendar config:", error);
      throw error;
    }
  };

  // Helper function to format reminder message
  const formatReminderMessage = (
    template: string,
    appointment: any,
    startTime: Date
  ) => {
    return (
      `${template}\n\n` +
      `📅 Date: ${format(startTime, "MMMM dd, yyyy")}\n` +
      `⏰ Time: ${format(startTime, "h:mm a")}\n` +
      `${
        appointment.meetLink ? `\n🎥 Join Meeting: ${appointment.meetLink}` : ""
      }`
    );
  };

  // Add this function to process reminders for appointments
  const processAppointmentReminders = async (appointment: Appointment) => {
    try {
      const userEmail = localStorage.getItem("userEmail");
      if (!userEmail) return;

      // Get reminder settings from API
      const settingsResponse = await axios.get(
        `${baseUrl}/api/reminder-settings?email=${encodeURIComponent(
          userEmail
        )}`
      );

      if (!settingsResponse.data) {
        console.log("No reminder settings found");
        return;
      }

      // The API now returns { company_id, reminders: [...] }
      const apiResponse = settingsResponse.data;
      const settings: ReminderSettings = {
        reminders: apiResponse.reminders || [],
      };

      // Process each enabled reminder
      for (const reminder of settings.reminders) {
        if (!reminder.enabled) continue;

        // Calculate the reminder time
        const appointmentTime = new Date(appointment.startTime);
        let reminderTime: Date;

        if (reminder.type === "before") {
          // Calculate time before appointment
          reminderTime = new Date(appointmentTime);
          if (reminder.timeUnit === "minutes") {
            reminderTime.setMinutes(reminderTime.getMinutes() - reminder.time);
          } else if (reminder.timeUnit === "hours") {
            reminderTime.setHours(reminderTime.getHours() - reminder.time);
          } else if (reminder.timeUnit === "days") {
            reminderTime.setDate(reminderTime.getDate() - reminder.time);
          }
        } else {
          // Calculate time after appointment
          reminderTime = new Date(appointmentTime);
          if (reminder.timeUnit === "minutes") {
            reminderTime.setMinutes(reminderTime.getMinutes() + reminder.time);
          } else if (reminder.timeUnit === "hours") {
            reminderTime.setHours(reminderTime.getHours() + reminder.time);
          } else if (reminder.timeUnit === "days") {
            reminderTime.setDate(reminderTime.getDate() + reminder.time);
          }
        }

        // Skip if reminder time is in the past
        if (reminderTime < new Date()) {
          console.log("Reminder time is in the past, skipping");
          continue;
        }

        // Schedule the reminder via API
        const scheduledMessageData = {
          userEmail,
          appointment: appointment,
          reminderConfig: reminder,
          scheduledTime: reminderTime,
          processed: false,
        };

        await axios.post(
          `${baseUrl}/api/schedule-reminder`,
          scheduledMessageData
        );

        // If the reminder is due soon (within the next hour), send it immediately
        const oneHourFromNow = new Date();
        oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

        if (reminderTime <= oneHourFromNow) {
          // Send the reminder immediately
          const companyResponse = await axios.get(
            `${baseUrl}/api/user-context?email=${encodeURIComponent(userEmail)}`
          );
          const companyId = companyResponse.data.companyId;

          // Handle different recipient types
          if (reminder.recipientType === "both") {
            // Send to both contacts and employees
            await sendWhatsAppNotification(
              appointment.contacts,
              appointment,
              companyId,
              { ...reminder, recipientType: "contacts" }
            );

            await sendWhatsAppNotification([], appointment, companyId, {
              ...reminder,
              recipientType: "employees",
            });
          } else {
            // Send to single recipient type
            await sendWhatsAppNotification(
              appointment.contacts,
              appointment,
              companyId,
              reminder
            );
          }

          // Mark as processed
          await axios.put(`${baseUrl}/api/mark-reminder-processed`, {
            userEmail,
            appointmentId: appointment.id,
            reminderTime: reminderTime.toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Error processing appointment reminders:", error);
    }
  };

  const renderCalendarConfigModal = () => (
    <Dialog
      open={isCalendarConfigOpen}
      onClose={() => setIsCalendarConfigOpen(false)}
    >
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
        <Dialog.Panel className="w-full max-w-2xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.005] transition-all duration-300">
          {/* Enhanced Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-violet-500/5 to-purple-500/10 dark:from-blue-600/10 dark:via-violet-700/5 dark:to-purple-600/10 pointer-events-none" />

          <div className="relative p-8">
            <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 dark:from-blue-600/20 dark:to-violet-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 flex items-center justify-center shadow-lg">
                  <Lucide
                    icon="Calendar"
                    className="w-7 h-7 text-blue-400 dark:text-blue-300"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white/90 dark:text-slate-200">
                    Calendar Settings
                  </h3>
                  <p className="text-sm text-white/60 dark:text-slate-400 mt-1">
                    Configure your calendar integration settings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCalendarConfigOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
              >
                <Lucide icon="X" className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-8 space-y-8">
              {/* Primary Calendar ID Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Lucide
                    icon="CheckCircle"
                    className="w-5 h-5 text-emerald-400"
                  />
                  <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                    Primary Google Calendar ID
                  </label>
                </div>

                <div className="relative group">
                  <input
                    type="text"
                    className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 shadow-inner"
                    value={config.calendarId || ""}
                    onChange={(e) =>
                      setConfig({ ...config, calendarId: e.target.value })
                    }
                    placeholder="example@group.calendar.google.com"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
              </div>

              {/* Additional Calendar IDs Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Lucide icon="Calendar" className="w-5 h-5 text-purple-400" />
                  <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                    Additional Calendar IDs
                  </label>
                </div>

                <div className="space-y-3">
                  {(config.additionalCalendarIds || []).map(
                    (calendarId, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 group"
                      >
                        <div className="relative flex-1">
                          <input
                            type="text"
                            className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 shadow-inner"
                            value={calendarId}
                            onChange={(e) => {
                              const newCalendarIds = [
                                ...(config.additionalCalendarIds || []),
                              ];
                              newCalendarIds[index] = e.target.value;
                              setConfig({
                                ...config,
                                additionalCalendarIds: newCalendarIds,
                              });
                            }}
                            placeholder="example@group.calendar.google.com"
                          />
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                        </div>
                        <button
                          onClick={() => {
                            const newCalendarIds = (
                              config.additionalCalendarIds || []
                            ).filter((_, i) => i !== index);
                            setConfig({
                              ...config,
                              additionalCalendarIds: newCalendarIds,
                            });
                          }}
                          className="w-10 h-10 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-red-400/30 flex items-center justify-center"
                        >
                          <Lucide icon="X" className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  )}

                  <button
                    onClick={() => {
                      setConfig({
                        ...config,
                        additionalCalendarIds: [
                          ...(config.additionalCalendarIds || []),
                          "",
                        ],
                      });
                    }}
                    className="w-full px-4 py-4 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white/70 hover:text-white font-medium transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Lucide icon="Plus" className="w-4 h-4" />
                    Add Calendar
                  </button>
                </div>
              </div>

              {/* Time Configuration Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Lucide icon="Clock" className="w-5 h-5 text-orange-400" />
                  <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                    Time Configuration
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 group">
                    <label className="block text-sm font-medium text-white/70 dark:text-slate-400">
                      Start Hour (24h)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                        value={config.startHour}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            startHour: parseInt(e.target.value),
                          })
                        }
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <label className="block text-sm font-medium text-white/70 dark:text-slate-400">
                      End Hour (24h)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                        value={config.endHour}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            endHour: parseInt(e.target.value),
                          })
                        }
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <label className="block text-sm font-medium text-white/70 dark:text-slate-400">
                      Slot Duration (min)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="15"
                        step="15"
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                        value={config.slotDuration}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            slotDuration: parseInt(e.target.value),
                          })
                        }
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <label className="block text-sm font-medium text-white/70 dark:text-slate-400">
                      Days Ahead
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                        value={config.daysAhead}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            daysAhead: parseInt(e.target.value),
                          })
                        }
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
              <div className="flex space-x-3">
                <button
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                  onClick={() => setIsCalendarConfigOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-3 bg-gradient-to-r from-blue-500/80 to-violet-600/80 hover:from-blue-600/90 hover:to-violet-700/90 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 backdrop-blur-xl border border-white/20"
                  onClick={async () => {
                    if (!config.calendarId) {
                      alert("Please enter a Calendar ID");
                      return;
                    }

                    const isValid = await testGoogleCalendarConnection(
                      config.calendarId
                    );
                    if (!isValid) {
                      alert(
                        "Unable to connect to the calendar. Please check the Calendar ID and try again."
                      );
                      return;
                    }

                    updateCalendarConfig(config);
                    setIsCalendarConfigOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <Lucide icon="Save" className="w-4 h-4" />
                    <span>Save Settings</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );

  const renderReminderModal = () => (
    <Dialog
      open={isReminderSettingsOpen}
      onClose={() => setIsReminderSettingsOpen(false)}
    >
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
        <Dialog.Panel className="w-full max-w-4xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.005] transition-all duration-300">
          {/* Enhanced Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-violet-500/5 to-purple-500/10 dark:from-blue-600/10 dark:via-violet-700/5 dark:to-purple-600/10 pointer-events-none" />

          <div className="relative p-8">
            <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-600/20 dark:from-yellow-600/20 dark:to-orange-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 flex items-center justify-center shadow-lg">
                  <Lucide
                    icon="Bell"
                    className="w-7 h-7 text-yellow-400 dark:text-yellow-300"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white/90 dark:text-slate-200">
                    Reminder Settings
                  </h3>
                  <p className="text-sm text-white/60 dark:text-slate-400 mt-1">
                    Configure automated reminders for appointments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReminderSettingsOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
              >
                <Lucide icon="X" className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-8 space-y-8">
              {/* Pro Tip Section */}
              <div className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-400/20 rounded-2xl">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-600/30 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center">
                    <Lucide
                      icon="Lightbulb"
                      className="w-4 h-4 text-blue-300"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-200">
                    💡 Pro Tip
                  </h3>
                </div>
                <p className="text-sm text-blue-100/80 leading-relaxed">
                  Set up reminders for both employees and clients to ensure
                  everyone is prepared for appointments. You can create separate
                  reminders for each group or use the "Both Parties" option for
                  convenience.
                </p>
              </div>

              {/* Reminder Cards */}
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {reminderSettings?.reminders?.map(
                  (reminder: any, index: number) => (
                    <div
                      key={index}
                      className="relative bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-6 shadow-lg"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-sm border border-indigo-400/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-indigo-300">
                              {index + 1}
                            </span>
                          </div>
                          <h3 className="text-xl font-semibold text-white/90 dark:text-slate-200">
                            Reminder {index + 1}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-white/70 dark:text-slate-400">
                              Enable
                            </label>
                            <input
                              type="checkbox"
                              checked={reminder.enabled}
                              onChange={(e) => {
                                const newReminders = [
                                  ...(reminderSettings?.reminders || []),
                                ];
                                newReminders[index].enabled = e.target.checked;
                                setReminderSettings({
                                  reminders: newReminders,
                                });
                              }}
                              className="w-5 h-5 text-indigo-600 bg-white/10 border-white/30 rounded focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 dark:ring-offset-gray-800 focus:ring-2"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newReminders =
                                reminderSettings.reminders.filter(
                                  (_, i) => i !== index
                                );
                              setReminderSettings({ reminders: newReminders });
                            }}
                            className="w-8 h-8 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-red-400/30 flex items-center justify-center"
                          >
                            <Lucide icon="X" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {reminder.enabled && (
                        <div className="space-y-6">
                          {/* Recipient Type Selection */}
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Lucide
                                icon="Users"
                                className="w-5 h-5 text-emerald-400"
                              />
                              <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                                Send Reminder To
                              </label>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              <label className="inline-flex items-center space-x-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 cursor-pointer transition-all duration-200">
                                <input
                                  type="radio"
                                  className="w-4 h-4 text-emerald-600 bg-white/10 border-white/30 focus:ring-emerald-500/20"
                                  name={`recipient-type-${index}`}
                                  value="contacts"
                                  checked={
                                    !reminder.recipientType ||
                                    reminder.recipientType === "contacts"
                                  }
                                  onChange={() => {
                                    const newReminders = [
                                      ...(reminderSettings?.reminders || []),
                                    ];
                                    newReminders[index].recipientType =
                                      "contacts";
                                    setReminderSettings({
                                      reminders: newReminders,
                                    });
                                  }}
                                />
                                <span className="text-sm font-medium text-white/80 dark:text-slate-300">
                                  Appointment Contacts
                                </span>
                              </label>
                              <label className="inline-flex items-center space-x-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 cursor-pointer transition-all duration-200">
                                <input
                                  type="radio"
                                  className="w-4 h-4 text-emerald-600 bg-white/10 border-white/30 focus:ring-emerald-500/20"
                                  name={`recipient-type-${index}`}
                                  value="employees"
                                  checked={
                                    reminder.recipientType === "employees"
                                  }
                                  onChange={() => {
                                    const newReminders = [
                                      ...(reminderSettings?.reminders || []),
                                    ];
                                    newReminders[index].recipientType =
                                      "employees";
                                    if (
                                      !newReminders[index].selectedEmployees
                                    ) {
                                      newReminders[index].selectedEmployees =
                                        [];
                                    }
                                    setReminderSettings({
                                      reminders: newReminders,
                                    });
                                  }}
                                />
                                <span className="text-sm font-medium text-white/80 dark:text-slate-300">
                                  Specific Employees
                                </span>
                              </label>
                              <label className="inline-flex items-center space-x-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 cursor-pointer transition-all duration-200">
                                <input
                                  type="radio"
                                  className="w-4 h-4 text-emerald-600 bg-white/10 border-white/30 focus:ring-emerald-500/20"
                                  name={`recipient-type-${index}`}
                                  value="both"
                                  checked={reminder.recipientType === "both"}
                                  onChange={() => {
                                    const newReminders = [
                                      ...(reminderSettings?.reminders || []),
                                    ];
                                    newReminders[index].recipientType = "both";
                                    if (
                                      !newReminders[index].selectedEmployees
                                    ) {
                                      newReminders[index].selectedEmployees =
                                        [];
                                    }
                                    setReminderSettings({
                                      reminders: newReminders,
                                    });
                                  }}
                                />
                                <span className="text-sm font-medium text-white/80 dark:text-slate-300">
                                  Both Parties
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Employee Selection */}
                          {(reminder.recipientType === "employees" ||
                            reminder.recipientType === "both") && (
                            <div className="space-y-4">
                              <div className="flex items-center space-x-3">
                                <Lucide
                                  icon="UserCheck"
                                  className="w-5 h-5 text-purple-400"
                                />
                                <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                                  Select Employees
                                </label>
                              </div>
                              <div className="bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-4 max-h-40 overflow-y-auto">
                                <div className="space-y-3">
                                  {employees.map((employee) => (
                                    <div
                                      key={employee.id}
                                      className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition-all duration-200"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={
                                          reminder.selectedEmployees?.includes(
                                            employee.id
                                          ) || false
                                        }
                                        onChange={(e) => {
                                          const newReminders = [
                                            ...(reminderSettings?.reminders ||
                                              []),
                                          ];
                                          if (
                                            !newReminders[index]
                                              .selectedEmployees
                                          ) {
                                            newReminders[
                                              index
                                            ].selectedEmployees = [];
                                          }

                                          if (e.target.checked) {
                                            newReminders[
                                              index
                                            ].selectedEmployees = [
                                              ...(newReminders[index]
                                                .selectedEmployees || []),
                                              employee.id,
                                            ];
                                          } else {
                                            newReminders[
                                              index
                                            ].selectedEmployees = newReminders[
                                              index
                                            ].selectedEmployees?.filter(
                                              (id) => id !== employee.id
                                            );
                                          }

                                          setReminderSettings({
                                            reminders: newReminders,
                                          });
                                        }}
                                        className="w-4 h-4 text-purple-600 bg-white/10 border-white/30 rounded focus:ring-purple-500/20"
                                      />
                                      <span className="text-white/90 dark:text-white font-medium">
                                        {employee.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {(!reminder.selectedEmployees ||
                                reminder.selectedEmployees.length === 0) && (
                                <p className="text-xs text-red-400 flex items-center space-x-2">
                                  <Lucide
                                    icon="AlertCircle"
                                    className="w-3 h-3"
                                  />
                                  <span>
                                    Please select at least one employee
                                  </span>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Time Configuration */}
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Lucide
                                icon="Clock"
                                className="w-5 h-5 text-orange-400"
                              />
                              <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                                Timing Configuration
                              </label>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-3 group">
                                <label className="block text-sm font-medium text-white/70 dark:text-slate-400">
                                  Time
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="1"
                                    value={reminder.time}
                                    onChange={(e) => {
                                      const newReminders = [
                                        ...(reminderSettings?.reminders || []),
                                      ];
                                      newReminders[index].time = parseInt(
                                        e.target.value
                                      );
                                      setReminderSettings({
                                        reminders: newReminders,
                                      });
                                    }}
                                    className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                                  />
                                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-3 group">
                                <label className="block text-sm font-medium text-white/70 dark:text-slate-400">
                                  Unit
                                </label>
                                <div className="relative">
                                  <select
                                    value={reminder.timeUnit}
                                    onChange={(e) => {
                                      const newReminders = [
                                        ...(reminderSettings?.reminders || []),
                                      ];
                                      newReminders[index].timeUnit = e.target
                                        .value as "minutes" | "hours" | "days";
                                      setReminderSettings({
                                        reminders: newReminders,
                                      });
                                    }}
                                    className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner appearance-none cursor-pointer"
                                  >
                                    <option value="minutes">Minutes</option>
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                  </select>
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <Lucide
                                      icon="ChevronDown"
                                      className="w-4 h-4 text-white/50"
                                    />
                                  </div>
                                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                                </div>
                              </div>
                              <div className="space-y-3 group">
                                <label className="block text-sm font-medium text-white/70 dark:text-slate-400">
                                  When to Send
                                </label>
                                <div className="relative">
                                  <select
                                    value={reminder.type}
                                    onChange={(e) => {
                                      const newReminders = [
                                        ...(reminderSettings?.reminders || []),
                                      ];
                                      newReminders[index].type = e.target
                                        .value as "before" | "after";
                                      setReminderSettings({
                                        reminders: newReminders,
                                      });
                                    }}
                                    className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner appearance-none cursor-pointer"
                                  >
                                    <option value="before">
                                      Before Appointment
                                    </option>
                                    <option value="after">
                                      After Appointment
                                    </option>
                                  </select>
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <Lucide
                                      icon="ChevronDown"
                                      className="w-4 h-4 text-white/50"
                                    />
                                  </div>
                                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Message Template */}
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Lucide
                                icon="MessageSquare"
                                className="w-5 h-5 text-teal-400"
                              />
                              <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                                Message Template
                              </label>
                            </div>
                            <div className="relative group">
                              <textarea
                                value={reminder.message}
                                onChange={(e) => {
                                  const newReminders = [
                                    ...(reminderSettings?.reminders || []),
                                  ];
                                  newReminders[index].message = e.target.value;
                                  setReminderSettings({
                                    reminders: newReminders,
                                  });
                                }}
                                rows={4}
                                className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200 resize-none shadow-inner"
                                placeholder="Enter your message here. Use {time}, {unit}, and {when} as placeholders."
                              />
                              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-white/60 dark:text-slate-400">
                              <Lucide icon="Info" className="w-3 h-3" />
                              <span>
                                Available placeholders: {"{time}"}, {"{unit}"},{" "}
                                {"{when}"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Footer Actions */}
              <div className="mt-8 space-y-6">
                {/* Add New Reminder Button */}
                <button
                  className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500/80 to-teal-600/80 hover:from-emerald-600/90 hover:to-teal-700/90 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 backdrop-blur-xl border border-white/20 flex items-center justify-center space-x-3"
                  onClick={() => {
                    const newReminders = [
                      ...(reminderSettings?.reminders || []),
                      {
                        enabled: true,
                        time: 1,
                        timeUnit: "days" as const,
                        type: "before" as const,
                        message:
                          "Reminder: You have an appointment tomorrow at {time} {unit} {when}. Please be prepared!",
                        recipientType: "both" as const,
                      },
                    ];
                    setReminderSettings({ reminders: newReminders });
                  }}
                >
                  <Lucide icon="Plus" className="w-5 h-5" />
                  <span>Add New Reminder</span>
                </button>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <div className="flex space-x-3">
                    <button
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                      onClick={() => setIsReminderSettingsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-blue-500/80 to-violet-600/80 hover:from-blue-600/90 hover:to-violet-700/90 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 backdrop-blur-xl border border-white/20"
                      onClick={() => updateReminderSettings(reminderSettings)}
                    >
                      <div className="flex items-center space-x-2">
                        <Lucide icon="Save" className="w-4 h-4" />
                        <span>Save Settings</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );

  const renderBookingLinkModal = () => (
    <Dialog
      open={isBookingLinkModalOpen}
      onClose={() => {
        setIsBookingLinkModalOpen(false);
        resetBookingLinkForm();
      }}
    >
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
        <Dialog.Panel className="w-full max-w-3xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden transform hover:scale-[1.005] transition-all duration-300">
          {/* Enhanced Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-violet-500/5 to-purple-500/10 dark:from-blue-600/10 dark:via-violet-700/5 dark:to-purple-600/10 pointer-events-none" />

          <div className="relative p-8">
            <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 dark:from-green-600/20 dark:to-emerald-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 flex items-center justify-center shadow-lg">
                  <Lucide
                    icon="Link"
                    className="w-7 h-7 text-green-400 dark:text-green-300"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white/90 dark:text-slate-200">
                    Generate Booking Link
                  </h3>
                  <p className="text-sm text-white/60 dark:text-slate-400 mt-1">
                    Create personalized booking links for your clients
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBookingLinkModalOpen(false);
                  resetBookingLinkForm();
                }}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
              >
                <Lucide icon="X" className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-8 space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Lucide icon="Type" className="w-5 h-5 text-blue-400" />
                  <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                    Title <span className="text-red-400">*</span>
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    value={bookingLinkForm.title}
                    onChange={(e) =>
                      setBookingLinkForm({
                        ...bookingLinkForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 shadow-inner"
                    placeholder="e.g., Consultation Appointment"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Lucide icon="Clock" className="w-5 h-5 text-orange-400" />
                  <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                    Duration (minutes)
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="number"
                    value={bookingLinkForm.duration}
                    onChange={(e) =>
                      setBookingLinkForm({
                        ...bookingLinkForm,
                        duration: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                    placeholder="60"
                    min="15"
                    max="480"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Lucide icon="MapPin" className="w-5 h-5 text-emerald-400" />
                  <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                    Location
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    value={bookingLinkForm.location}
                    onChange={(e) =>
                      setBookingLinkForm({
                        ...bookingLinkForm,
                        location: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 shadow-inner"
                    placeholder="e.g., Office Location"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Lucide icon="FileText" className="w-5 h-5 text-teal-400" />
                  <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                    Description
                  </label>
                </div>
                <div className="relative group">
                  <textarea
                    value={bookingLinkForm.description}
                    onChange={(e) =>
                      setBookingLinkForm({
                        ...bookingLinkForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200 resize-none shadow-inner"
                    rows={3}
                    placeholder="Brief description of the appointment..."
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
              </div>

              {/* Staff Selection */}
              {employees.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Lucide icon="Users" className="w-5 h-5 text-indigo-400" />
                    <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                      Available Staff Members
                    </label>
                  </div>
                  <div className="bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-4 max-h-40 overflow-y-auto">
                    <div className="space-y-3">
                      {employees.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition-all duration-200"
                        >
                          <input
                            type="checkbox"
                            checked={bookingLinkForm.selectedStaff.includes(
                              employee.name
                            )}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              const updatedStaff = isChecked
                                ? [
                                    ...bookingLinkForm.selectedStaff,
                                    employee.name,
                                  ]
                                : bookingLinkForm.selectedStaff.filter(
                                    (name) => name !== employee.name
                                  );
                              setBookingLinkForm({
                                ...bookingLinkForm,
                                selectedStaff: updatedStaff,
                              });
                            }}
                            className="w-4 h-4 text-indigo-600 bg-white/10 border-white/30 rounded focus:ring-indigo-500/20"
                          />
                          <span className="text-white/90 dark:text-white font-medium">
                            {employee.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Phone */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Lucide icon="Phone" className="w-5 h-5 text-purple-400" />
                  <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                    Phone (Optional)
                  </label>
                </div>
                <div className="relative group">
                  <input
                    type="tel"
                    value={bookingLinkForm.phone}
                    onChange={(e) =>
                      setBookingLinkForm({
                        ...bookingLinkForm,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 shadow-inner"
                    placeholder="+60123456789 (leave blank to show PHONE placeholder)"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-white/60 dark:text-slate-400">
                    <Lucide icon="Info" className="w-3 h-3" />
                    <span>
                      Users will select their preferred date and time on the
                      booking page
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-blue-300 dark:text-blue-400">
                    <Lucide icon="Lightbulb" className="w-3 h-3" />
                    <span>
                      Example: "consultation-john" will create
                      /booking/consultation-john/+60123456789
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated Booking Links */}
              {generatedBookingLink && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="ExternalLink"
                        className="w-5 h-5 text-cyan-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Generated Booking Links (One per Staff Member)
                      </label>
                    </div>
                    <div className="space-y-4">
                      <div className="relative group">
                        <textarea
                          value={generatedBookingLink}
                          readOnly
                          rows={bookingLinkForm.selectedStaff.length + 1}
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 text-sm shadow-inner resize-none"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                      <button
                        onClick={copyBookingLink}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500/80 to-teal-600/80 hover:from-emerald-600/90 hover:to-teal-700/90 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 backdrop-blur-xl border border-white/20 flex items-center space-x-2"
                      >
                        <Lucide icon="Copy" className="w-4 h-4" />
                        <span>Copy All Links</span>
                      </button>
                    </div>
                  </div>

                  {/* Usage Instructions */}
                  <div className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-400/20 rounded-2xl">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-600/30 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center">
                        <Lucide
                          icon="BookOpen"
                          className="w-4 h-4 text-blue-300"
                        />
                      </div>
                      <h4 className="text-lg font-semibold text-blue-200">
                        📋 How to Use These Links:
                      </h4>
                    </div>
                    <div className="space-y-2 text-sm text-blue-100/80">
                      <div className="flex items-start space-x-2">
                        <Lucide
                          icon="CheckCircle"
                          className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0"
                        />
                        <span>
                          Each staff member gets their own unique booking link
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Lucide
                          icon="CheckCircle"
                          className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0"
                        />
                        <span>
                          AI can send different links to different leads
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Lucide
                          icon="CheckCircle"
                          className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0"
                        />
                        <span>
                          When booked, the staff name is automatically set in
                          Google Calendar
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Lucide
                          icon="CheckCircle"
                          className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0"
                        />
                        <span>
                          All appointments use the same shared calendar
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-white/60 dark:text-slate-400">
                    <Lucide icon="Info" className="w-3 h-3" />
                    <span>
                      Each staff member gets their own unique booking link.
                      Share the appropriate link with clients.
                    </span>
                  </div>
                </div>
              )}
              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10 dark:border-slate-600/20">
                <button
                  onClick={() => {
                    setIsBookingLinkModalOpen(false);
                    resetBookingLinkForm();
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white font-medium rounded-2xl transition-all duration-200 hover:shadow-lg group"
                >
                  <div className="flex items-center space-x-2">
                    <Lucide
                      icon="X"
                      className="w-4 h-4 group-hover:scale-110 transition-transform"
                    />
                    <span>Cancel</span>
                  </div>
                </button>

                <div className="flex items-center space-x-3">
                  {generatedBookingLink && (
                    <button
                      onClick={() => setGeneratedBookingLink("")}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500/80 to-orange-600/80 hover:from-amber-600/90 hover:to-orange-700/90 backdrop-blur-sm border border-white/20 text-white font-medium rounded-2xl transition-all duration-200 hover:shadow-lg hover:scale-105 group"
                    >
                      <div className="flex items-center space-x-2">
                        <Lucide
                          icon="RotateCcw"
                          className="w-4 h-4 group-hover:rotate-12 transition-transform"
                        />
                        <span>Reset</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={generateBookingLink}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-500/90 to-teal-600/90 hover:from-emerald-600 hover:to-teal-700 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-2xl transition-all duration-200 hover:shadow-xl hover:scale-105 group"
                  >
                    <div className="flex items-center space-x-2">
                      <Lucide
                        icon="Link"
                        className="w-4 h-4 group-hover:scale-110 transition-transform"
                      />
                      <span>Generate Link</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );

  // Add this logging function to help debug
  const debugLog = (message: string, data?: any) => {};

  // Update the validation function to be more permissive and add logging
  const validateCalendarId = (calendarId: string | null | undefined) => {
    debugLog("Validating calendar ID", calendarId);

    // Allow empty, null, or undefined calendar IDs
    if (!calendarId || calendarId.trim() === "") {
      debugLog("Empty calendar ID - valid");
      return true;
    }

    // More permissive regex that includes holiday calendar format and group calendars
    const regex =
      /^[\w.-]+[#]?[\w.-]*@(calendar\.google\.com|group\.calendar\.google\.com|gmail\.com)$/;
    const isValid = regex.test(calendarId.trim());
    debugLog("Calendar ID validation result", isValid);
    return isValid;
  };

  // Update the Google Calendar connection test
  const testGoogleCalendarConnection = async (calendarId: string) => {
    console.log("Testing connection for calendar:", calendarId);
    try {
      if (!validateCalendarId(calendarId)) {
        console.log("Invalid calendar ID format");
        return {
          success: false,
          error: "Invalid calendar ID format",
        };
      }

      const encodedCalendarId = encodeURIComponent(calendarId.trim());
      const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?key=${apiKey}&maxResults=1`;
      console.log("Making request to:", url);

      const response = await fetch(url);
      console.log("Response status:", response.status);

      const errorData = await response.json();
      console.log("Full error response:", errorData);

      if (!response.ok) {
        if (errorData.error?.status === "PERMISSION_DENIED") {
          return {
            success: false,
            error:
              "Calendar access denied. Please make sure the calendar is public or shared properly.",
          };
        } else if (errorData.error?.status === "NOT_FOUND") {
          return {
            success: false,
            error: "Calendar not found. Please check the calendar ID.",
          };
        }

        return {
          success: false,
          error: `API Error: ${errorData.error?.message || "Unknown error"}`,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("Connection test error:", error);
      return {
        success: false,
        error: "Network error while testing calendar connection",
      };
    }
  };

  // Update the calendar options to handle errors gracefully
  const calendarOptions = {
    plugins: [
      dayGridPlugin,
      timeGridPlugin,
      interactionPlugin,
      googleCalendarPlugin,
    ],
    initialView: view,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: isMobile
        ? "timeGridDay,timeGridWeek"
        : "dayGridMonth,timeGridWeek,timeGridDay",
    },
    editable: true, // Enable event editing
    eventClick: handleEventClick, // Add this to handle event clicks
    eventDrop: handleEventDrop,
    select: handleDateSelect,
    selectable: true,
    stickyHeaderDates: true,
    navLinks: true,
    nowIndicator: true,
    slotMinTime: "07:00:00",
    slotMaxTime: "20:00:00",
    slotDuration: isMobile ? "00:30:00" : "01:00:00",
    expandRows: true,
    dayMaxEventRows: isMobile ? 2 : 3,
    aspectRatio: undefined, // Remove aspect ratio to allow full height
    googleCalendarApiKey: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY,
    // Enhanced styling options
    height: "100%",
    contentHeight: "100%",
    eventDisplay: "block",
    displayEventTime: true,
    displayEventEnd: false,
    eventTimeFormat: {
      hour: "numeric" as const,
      minute: "2-digit" as const,
      hour12: true,
    },
    eventSources: [
      {
        events: filteredAppointments.map((appointment) => ({
          id: appointment.id,
          title: appointment.title,
          start: new Date(appointment.startTime),
          end: new Date(appointment.endTime),
          backgroundColor: appointment.color || "#51484f",
          borderColor: "transparent",
          extendedProps: {
            address: appointment.address,
            appointmentStatus: appointment.appointmentStatus,
            staff: appointment.staff,
            dateAdded: appointment.dateAdded,
            contacts: appointment.contacts,
            tags: appointment.tags || [],
            details: appointment.details || "",
            meetLink: appointment.meetLink || "",
            source: "database", // Mark as database source
          },
        })),
      },
      // Google Calendar sources with duplicate filtering
      ...(config.calendarId &&
      config.calendarId.trim() !== "" &&
      validateCalendarId(config.calendarId)
        ? [
            {
              googleCalendarId: config.calendarId,
              className: "gcal-event",
              color: "#a8d7e0",
              editable: false,
              // Add event processor to filter duplicates
              eventDataTransform: (eventData: any) => {
                console.log("🟢 Processing Google Calendar event:", {
                  title: eventData.title,
                  summary: eventData.summary,
                  description: eventData.description,
                  start: eventData.start,
                  end: eventData.end,
                  fullEventData: eventData,
                });

                // Convert Google Calendar event to our format for duplicate checking
                // Google Calendar events might use 'summary' instead of 'title'
                const googleEvent = {
                  title: eventData.title || eventData.summary || "",
                  summary: eventData.summary || eventData.title || "",
                  description: eventData.description || "",
                  start: eventData.start,
                  end: eventData.end,
                };

                // Only check for duplicates if we have database appointments loaded
                if (databaseAppointments.length === 0) {
                  console.log(
                    "🟠 No database appointments loaded yet, showing Google Calendar event"
                  );
                  return {
                    ...eventData,
                    extendedProps: {
                      ...eventData.extendedProps,
                      source: "google-calendar",
                    },
                  };
                }

                // Check if this Google event is a duplicate of any database appointment
                const isDuplicate = databaseAppointments.some((dbAppointment) =>
                  areAppointmentsDuplicate(dbAppointment, googleEvent)
                );

                if (isDuplicate) {
                  console.log(
                    "🔴 Filtered out duplicate Google Calendar event:",
                    eventData.title || eventData.summary
                  );
                  // Instead of returning null/false, make the event invisible
                  return {
                    ...eventData,
                    display: "none",
                    rendering: "background",
                    className: "hidden-duplicate-event",
                    extendedProps: {
                      ...eventData.extendedProps,
                      source: "google-calendar-duplicate-hidden",
                    },
                  };
                }

                console.log(
                  "🟢 Showing Google Calendar event (no duplicate found):",
                  eventData.title || eventData.summary
                );

                // Mark as Google Calendar source and return the event
                return {
                  ...eventData,
                  extendedProps: {
                    ...eventData.extendedProps,
                    source: "google-calendar",
                  },
                };
              },
            },
          ]
        : []),
      ...(config.additionalCalendarIds || [])
        .filter((id) => id && id.trim() !== "" && validateCalendarId(id))
        .map((calendarId) => ({
          googleCalendarId: calendarId,
          className: "gcal-event",
          color: "#a8d7e0", // You might want to assign different colors for different calendars
          editable: false,
          // Add event processor to filter duplicates for additional calendars too
          eventDataTransform: (eventData: any) => {
            console.log("🟢 Processing additional Google Calendar event:", {
              title: eventData.title,
              summary: eventData.summary,
              description: eventData.description,
              start: eventData.start,
              end: eventData.end,
            });

            // Convert Google Calendar event to our format for duplicate checking
            const googleEvent = {
              title: eventData.title || eventData.summary || "",
              summary: eventData.summary || eventData.title || "",
              description: eventData.description || "",
              start: eventData.start,
              end: eventData.end,
            };

            // Only check for duplicates if we have database appointments loaded
            if (databaseAppointments.length === 0) {
              console.log(
                "🟠 No database appointments loaded yet, showing additional Google Calendar event"
              );
              return {
                ...eventData,
                extendedProps: {
                  ...eventData.extendedProps,
                  source: "google-calendar",
                },
              };
            }

            // Check if this Google event is a duplicate of any database appointment
            const isDuplicate = databaseAppointments.some((dbAppointment) =>
              areAppointmentsDuplicate(dbAppointment, googleEvent)
            );

            if (isDuplicate) {
              console.log(
                "🔴 Filtered out duplicate Google Calendar event from additional calendar:",
                eventData.title || eventData.summary
              );
              // Instead of returning null/false, make the event invisible
              return {
                ...eventData,
                display: "none",
                rendering: "background",
                className: "hidden-duplicate-event",
                extendedProps: {
                  ...eventData.extendedProps,
                  source: "google-calendar-duplicate-hidden",
                },
              };
            }

            console.log(
              "🟢 Showing additional Google Calendar event (no duplicate found):",
              eventData.title || eventData.summary
            );

            // Mark as Google Calendar source and return the event
            return {
              ...eventData,
              extendedProps: {
                ...eventData.extendedProps,
                source: "google-calendar",
              },
            };
          },
        })),
    ],
    // Use custom event content renderer
    eventContent: renderEventContent,
    eventDidMount: (info: any) => {
      // Check if this is a Google Calendar event
      const isGoogleCalendarEvent = info.event.source?.googleCalendarId;
      const eventSource = info.event.extendedProps?.source;
      const status =
        info.event.extendedProps?.appointmentStatus?.toLowerCase() || "new";

      // Modern color schemes for different event types
      const statusGradients: Record<string, string> = {
        new: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        confirmed: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
        cancelled: "linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)",
        showed: "linear-gradient(135deg, #f3e8ff 0%, #ddd6fe 100%)",
        noshow: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)",
        rescheduled: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)",
        lost: "linear-gradient(135deg, #fafafa 0%, #e5e5e5 100%)",
        closed: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
      };

      // Apply modern styling
      info.el.style.border = "none";
      info.el.style.borderRadius = "12px";
      info.el.style.overflow = "hidden";
      info.el.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
      info.el.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      info.el.style.cursor = "pointer";
      info.el.style.backdropFilter = "blur(8px)";

      if (isGoogleCalendarEvent || eventSource === "google-calendar") {
        // Modern Google Calendar event styling
        info.el.style.background =
          "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)";
        info.el.style.borderLeft = "4px solid #0ea5e9";
        info.el.style.color = "#0c4a6e";

        // Add calendar icon for Google events
        const existingTitle = info.el.querySelector(".fc-event-title");
        if (existingTitle && !existingTitle.querySelector(".google-cal-icon")) {
          const icon = document.createElement("span");
          icon.className = "google-cal-icon";
          icon.textContent = "📅";
          icon.style.fontSize = "12px";
          icon.style.marginRight = "6px";
          icon.style.opacity = "0.8";
          existingTitle.prepend(icon);
        }
      } else {
        // Modern database event styling based on status
        const gradient = statusGradients[status] || statusGradients.new;
        info.el.style.background = gradient;

        // Handle staff colors for multi-staff events
        const staffIds = info.event.extendedProps?.staff || [];
        const staffColors = employees
          .filter((employee) => staffIds.includes(employee.id))
          .map((employee) => employee.color);

        if (staffColors.length === 1) {
          // Single staff member - use their color with enhanced gradient
          const staffColor = staffColors[0];
          info.el.style.background = `linear-gradient(135deg, ${staffColor}15 0%, ${staffColor}30 100%)`;
          info.el.style.borderLeft = `4px solid ${staffColor}`;
        } else if (staffColors.length >= 2) {
          // Multiple staff - create a multi-color gradient
          const colorStops = staffColors
            .map((color, index) => {
              const percentage = (index / (staffColors.length - 1)) * 100;
              return `${color}40 ${percentage}%`;
            })
            .join(", ");
          info.el.style.background = `linear-gradient(135deg, ${colorStops})`;
          info.el.style.borderLeft = `4px solid ${staffColors[0]}`;
        }
      }

      // Enhanced hover effects
      const originalTransform = info.el.style.transform;
      const originalBoxShadow = info.el.style.boxShadow;

      info.el.addEventListener("mouseenter", () => {
        info.el.style.transform = "translateY(-2px) scale(1.02)";
        info.el.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)";
        info.el.style.zIndex = "10";
      });

      info.el.addEventListener("mouseleave", () => {
        info.el.style.transform = originalTransform;
        info.el.style.boxShadow = originalBoxShadow;
        info.el.style.zIndex = "auto";
      });

      // Add tooltip with event details
      const contacts = info.event.extendedProps?.contacts || [];
      const contactNames = contacts.map((c: any) => c.name).join(", ");
      const tooltipText = [
        info.event.title,
        info.event.extendedProps?.details &&
          `Details: ${info.event.extendedProps.details}`,
        contactNames && `Contacts: ${contactNames}`,
        eventSource === "google-calendar"
          ? "📅 Google Calendar"
          : "💾 Database Event",
      ]
        .filter(Boolean)
        .join("\n");

      info.el.title = tooltipText;
    },
  };

  // 3. Add error boundary around the calendar component
  const CalendarErrorBoundary = ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    const [hasError, setHasError] = React.useState(false);

    if (hasError) {
      return (
        <div className="p-4 text-center">
          <p>
            Something went wrong loading the calendar. Please try refreshing the
            page.
          </p>
        </div>
      );
    }

    return (
      <ErrorBoundary onError={() => setHasError(true)}>
        {children}
      </ErrorBoundary>
    );
  };

  // Use the error boundary in your JSX
  <div className="p-5 box intro-y">
    <CalendarErrorBoundary>
      <FullCalendar
        {...calendarOptions}
        ref={calendarRef}
        slotLabelFormat={{
          hour: "numeric" as const,
          minute: "2-digit" as const,
          meridiem: "short" as const,
        }}
      />
    </CalendarErrorBoundary>
  </div>;

  // Modify the return statement to include the view toggle button and conditional rendering
  return (
    <>
      {/* Modern Glassmorphism Toolbar */}
      <div className="mt-6 intro-y">
        <div className="w-full relative">
          {/* Glassmorphism container */}
          <div className="relative bg-gradient-to-r from-white/70 via-white/60 to-white/70 dark:from-slate-800/50 dark:via-slate-700/40 dark:to-slate-800/50 backdrop-blur-2xl rounded-2xl border border-white/30 dark:border-slate-600/20 shadow-2xl overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/3 to-indigo-500/5 dark:from-blue-600/10 dark:via-purple-700/5 dark:to-indigo-600/10 pointer-events-none" />

            <div className="relative px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left: primary actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* View toggle (calendar grid) */}
                  <div className="inline-flex rounded-2xl bg-white/20 dark:bg-slate-700/30 backdrop-blur-sm border border-white/30 dark:border-slate-600/20 overflow-hidden shadow-lg">
                    <button
                      onClick={() => setViewType("calendar")}
                      className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 transition-all duration-200 ${
                        viewType === "calendar"
                          ? "bg-gradient-to-r from-blue-500/80 to-indigo-600/80 text-white shadow-lg backdrop-blur-sm"
                          : "text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-slate-600/30"
                      }`}
                    >
                      <Lucide icon="Calendar" className="w-4 h-4" />
                      <span className="hidden sm:inline">Calendar</span>
                    </button>
                  </div>

                  {companyId === "0153" && (
                    <button
                      className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-violet-500/80 to-purple-600/80 hover:from-violet-600/90 hover:to-purple-700/90 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 group"
                      onClick={() => navigate("/appointment-requests")}
                    >
                      <Lucide
                        icon="ClipboardList"
                        className="w-4 h-4 group-hover:scale-110 transition-transform"
                      />
                      <span className="hidden sm:inline">Requests</span>
                    </button>
                  )}

                  <button
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500/80 to-teal-600/80 hover:from-emerald-600/90 hover:to-teal-700/90 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 group"
                    onClick={() => setIsBookingLinkModalOpen(true)}
                  >
                    <Lucide
                      icon="Link"
                      className="w-4 h-4 group-hover:scale-110 transition-transform"
                    />
                    <span className="hidden sm:inline">Booking Link</span>
                  </button>

                  {/* Add appointment */}
                  <button
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500/80 to-cyan-600/80 hover:from-blue-600/90 hover:to-cyan-700/90 rounded-2xl backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 group"
                    onClick={() => {
                      setSelectedContact(null);
                      setCurrentEvent({
                        title: "",
                        dateStr: "",
                        startTimeStr: "",
                        endTimeStr: "",
                        extendedProps: {
                          address: "",
                          appointmentStatus: "",
                          staff: "",
                          dateAdded: new Date().toISOString(),
                          tags: [],
                          details: "",
                          meetLink: "",
                        },
                      });
                      setAddModalOpen(true);
                    }}
                  >
                    <Lucide
                      icon="FilePenLine"
                      className="w-4 h-4 group-hover:scale-110 transition-transform"
                    />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>

                {/* Right: filters */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Quick search */}
                  <div className="relative group">
                    <Lucide
                      icon="Search"
                      className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-400 transition-colors"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search appointments..."
                      className="pl-10 pr-4 py-3 text-sm rounded-2xl bg-white/20 dark:bg-slate-700/30 backdrop-blur-sm border border-white/30 dark:border-slate-600/20 text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 shadow-inner transition-all duration-200 min-w-[200px]"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                  </div>

                  {/* Employee select */}
                  {employees.length > 0 && (
                    <div className="relative group">
                      <select
                        value={selectedEmployeeId}
                        onChange={handleEmployeeChange}
                        className="pl-4 pr-10 py-3 text-sm rounded-2xl bg-white/40 dark:bg-slate-800/60 backdrop-blur-sm border border-white/30 dark:border-slate-600/20 text-gray-700 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400/50 shadow-inner transition-all duration-200 min-w-[120px]"
                        style={{
                          colorScheme: "dark",
                        }}
                      >
                        <option
                          value=""
                          className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                        >
                          All Staff
                        </option>
                        {employees.map((employee) => (
                          <option
                            key={employee.id}
                            value={employee.id}
                            className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                          >
                            {employee.name}
                          </option>
                        ))}
                      </select>
                      <Lucide
                        icon="ChevronDown"
                        className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 pointer-events-none"
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  )}

                  {/* Status */}
                  <div className="relative group">
                    <select
                      value={filterStatus}
                      onChange={handleStatusFilterChange}
                      className="pl-4 pr-10 py-3 text-sm rounded-2xl bg-white/40 dark:bg-slate-800/60 backdrop-blur-sm border border-white/30 dark:border-slate-600/20 text-gray-700 dark:text-gray-200 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400/50 shadow-inner transition-all duration-200 min-w-[100px]"
                      style={{
                        colorScheme: "dark",
                      }}
                    >
                      <option
                        value=""
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        All
                      </option>
                      <option
                        value="new"
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        New
                      </option>
                      <option
                        value="confirmed"
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        Confirmed
                      </option>
                      <option
                        value="cancelled"
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        Cancelled
                      </option>
                      <option
                        value="showed"
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        Showed
                      </option>
                      <option
                        value="noshow"
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        No Show
                      </option>
                      <option
                        value="rescheduled"
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        Rescheduled
                      </option>
                      <option
                        value="lost"
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        Lost
                      </option>
                      <option
                        value="closed"
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200"
                      >
                        Closed
                      </option>
                    </select>
                    <Lucide
                      icon="ChevronDown"
                      className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-400 pointer-events-none"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                  </div>

                  {/* Date */}
                  <div className="relative group">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={handleDateFilterChange}
                      className="pl-4 pr-12 py-3 text-sm rounded-2xl bg-white/20 dark:bg-slate-700/30 backdrop-blur-sm border border-white/30 dark:border-slate-600/20 text-gray-700 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400/50 shadow-inner transition-all duration-200"
                    />
                    {filterDate && (
                      <button
                        onClick={() => setFilterDate("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-white/20 dark:hover:bg-slate-600/30 transition-colors group"
                        aria-label="Clear date filter"
                      >
                        <Lucide
                          icon="X"
                          className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        />
                      </button>
                    )}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                  </div>

                  {/* Settings buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white/20 dark:bg-slate-700/30 backdrop-blur-sm border border-white/30 dark:border-slate-600/20 hover:bg-white/30 dark:hover:bg-slate-600/40 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 group"
                      onClick={() => setIsCalendarConfigOpen(true)}
                      title="Calendar settings"
                    >
                      <Lucide
                        icon="Settings"
                        className="w-4 h-4 group-hover:rotate-45 transition-transform duration-200"
                      />
                    </button>
                    <button
                      className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white/20 dark:bg-slate-700/30 backdrop-blur-sm border border-white/30 dark:border-slate-600/20 hover:bg-white/30 dark:hover:bg-slate-600/40 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 group"
                      onClick={() => setIsReminderSettingsOpen(true)}
                      title="Reminder settings"
                    >
                      <Lucide
                        icon="Bell"
                        className="w-4 h-4 group-hover:animate-pulse transition-all duration-200"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
        {/* Appointments list */}
        <div
          className={`${
            isMobile ? (mobileTab === "list" ? "block" : "hidden") : ""
          } md:col-span-4 xl:col-span-4 2xl:col-span-3`}
        >
          <div className="relative h-full">
            {/* Modern glassmorphism container */}
            <div className="h-full relative">
              {/* Glassmorphism container */}
              <div
                className="relative bg-gradient-to-r from-white/70 via-white/60 to-white/70 dark:from-slate-800/50 dark:via-slate-700/40 dark:to-slate-800/50 backdrop-blur-2xl rounded-2xl border border-white/30 dark:border-slate-600/20 shadow-2xl overflow-hidden h-full"
                style={{
                  height: isMobile
                    ? "calc(100vh - 240px)"
                    : "calc(100vh - 180px)",
                  minHeight: "600px",
                }}
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/3 to-indigo-500/5 dark:from-blue-600/10 dark:via-purple-700/5 dark:to-indigo-600/10 pointer-events-none" />

                <div className="relative px-6 py-6 h-full flex flex-col">
                  {/* Enhanced header with glassmorphism styling */}
                  <div className="flex justify-between items-center mb-6 p-4 bg-white/20 dark:bg-slate-700/30 backdrop-blur-sm rounded-2xl border border-white/30 dark:border-slate-600/20 shadow-lg">
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 dark:from-white dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
                        Appointments
                      </h2>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
                        {filteredAppointments.length}{" "}
                        {filteredAppointments.length === 1
                          ? "appointment"
                          : "appointments"}
                      </p>
                    </div>

                    {/* Modern status legend */}
                    <div className="flex flex-wrap gap-2">
                      <div className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-slate-500/20 to-gray-500/20 dark:from-slate-400/20 dark:to-gray-400/20 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/40 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full mr-2"></div>
                        New
                      </div>
                      <div className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/40 dark:border-emerald-700/40 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full mr-2"></div>
                        Confirmed
                      </div>
                      <div className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 text-red-700 dark:text-red-300 border border-red-200/40 dark:border-red-700/40 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full mr-2"></div>
                        Cancelled
                      </div>
                    </div>
                  </div>

                  {/* Enhanced appointments list */}
                  <div className="flex-1 space-y-4 max-h-[calc(100vh-18rem)] sm:max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 scrollbar-custom pb-4">
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((appointment, index) => {
                        const statusColors: Record<
                          string,
                          {
                            bg: string;
                            border: string;
                            accent: string;
                            text: string;
                            darkBg: string;
                            darkBorder: string;
                            darkText: string;
                            glassEffect: string;
                          }
                        > = {
                          new: {
                            bg: "from-slate-50 to-gray-50",
                            border: "border-slate-200",
                            accent: "bg-slate-500",
                            text: "text-slate-700",
                            darkBg: "dark:from-slate-700 dark:to-slate-800",
                            darkBorder: "dark:border-slate-600",
                            darkText: "dark:text-slate-200",
                            glassEffect: "rgba(100,116,139,0.1)",
                          },
                          showed: {
                            bg: "from-blue-50 to-indigo-50",
                            border: "border-blue-200",
                            accent: "bg-blue-500",
                            text: "text-blue-700",
                            darkBg: "dark:from-blue-900 dark:to-indigo-900",
                            darkBorder: "dark:border-blue-600",
                            darkText: "dark:text-blue-200",
                            glassEffect: "rgba(59,130,246,0.1)",
                          },
                          cancelled: {
                            bg: "from-red-50 to-rose-50",
                            border: "border-red-200",
                            accent: "bg-red-500",
                            text: "text-red-700",
                            darkBg: "dark:from-red-900 dark:to-rose-900",
                            darkBorder: "dark:border-red-600",
                            darkText: "dark:text-red-200",
                            glassEffect: "rgba(239,68,68,0.1)",
                          },
                          confirmed: {
                            bg: "from-emerald-50 to-green-50",
                            border: "border-emerald-200",
                            accent: "bg-emerald-500",
                            text: "text-emerald-700",
                            darkBg: "dark:from-emerald-900 dark:to-green-900",
                            darkBorder: "dark:border-emerald-600",
                            darkText: "dark:text-emerald-200",
                            glassEffect: "rgba(16,185,129,0.1)",
                          },
                          noshow: {
                            bg: "from-orange-50 to-amber-50",
                            border: "border-orange-200",
                            accent: "bg-orange-500",
                            text: "text-orange-700",
                            darkBg: "dark:from-orange-900 dark:to-amber-900",
                            darkBorder: "dark:border-orange-600",
                            darkText: "dark:text-orange-200",
                            glassEffect: "rgba(249,115,22,0.1)",
                          },
                          rescheduled: {
                            bg: "from-cyan-50 to-sky-50",
                            border: "border-cyan-200",
                            accent: "bg-cyan-500",
                            text: "text-cyan-700",
                            darkBg: "dark:from-cyan-900 dark:to-sky-900",
                            darkBorder: "dark:border-cyan-600",
                            darkText: "dark:text-cyan-200",
                            glassEffect: "rgba(14,165,233,0.1)",
                          },
                          lost: {
                            bg: "from-gray-50 to-slate-50",
                            border: "border-gray-300",
                            accent: "bg-gray-600",
                            text: "text-gray-600",
                            darkBg: "dark:from-gray-800 dark:to-slate-800",
                            darkBorder: "dark:border-gray-500",
                            darkText: "dark:text-gray-300",
                            glassEffect: "rgba(115,115,115,0.1)",
                          },
                          closed: {
                            bg: "from-purple-50 to-violet-50",
                            border: "border-purple-200",
                            accent: "bg-purple-500",
                            text: "text-purple-700",
                            darkBg: "dark:from-purple-900 dark:to-violet-900",
                            darkBorder: "dark:border-purple-600",
                            darkText: "dark:text-purple-200",
                            glassEffect: "rgba(139,92,246,0.1)",
                          },
                        };

                        const statusStyle =
                          statusColors[
                            appointment.appointmentStatus?.toLowerCase() ||
                              "new"
                          ] || statusColors.new;

                        return (
                          <div
                            key={index}
                            onClick={() => handleAppointmentClick(appointment)}
                            className={`group relative bg-gradient-to-br ${statusStyle.bg} ${statusStyle.darkBg} backdrop-blur-sm border ${statusStyle.border} ${statusStyle.darkBorder} rounded-2xl p-5 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-${statusStyle.glassEffect}/20 hover:-translate-y-1 hover:scale-[1.02] transform-gpu`}
                          >
                            {/* Status indicator dot */}
                            <div
                              className={`absolute top-4 right-4 w-3 h-3 rounded-full ${statusStyle.accent} shadow-lg`}
                              style={{
                                boxShadow: `0 0 12px ${statusStyle.glassEffect}`,
                              }}
                            />

                            <div className="space-y-4">
                              {/* Header with title and time */}
                              <div className="flex items-start justify-between pr-6">
                                <div className="flex-1 min-w-0">
                                  <h3
                                    className={`text-lg font-semibold ${statusStyle.text} ${statusStyle.darkText} line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200`}
                                  >
                                    {appointment.title}
                                  </h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {new Date(
                                      appointment.startTime
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })}{" "}
                                    •{" "}
                                    {new Date(
                                      appointment.startTime
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}{" "}
                                    -{" "}
                                    {new Date(
                                      appointment.endTime
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* Contact info */}
                              {appointment.contacts &&
                                appointment.contacts.length > 0 && (
                                  <div className="flex items-center space-x-3 bg-white/40 dark:bg-slate-700/40 rounded-xl px-3 py-2.5 backdrop-blur-sm border border-white/30 dark:border-slate-600/30">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 flex items-center justify-center border border-blue-200/40 dark:border-blue-700/40">
                                      <Lucide
                                        icon="User"
                                        className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                                        {appointment.contacts
                                          .map((c) => c.name)
                                          .join(", ")}
                                      </p>
                                    </div>
                                  </div>
                                )}

                              {/* Tags */}
                              {appointment.tags &&
                                appointment.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {appointment.tags.slice(0, 2).map((tag) => (
                                      <span
                                        key={tag.id}
                                        className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500/20 to-purple-500/20 dark:from-indigo-400/20 dark:to-purple-400/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 dark:border-indigo-700/40 backdrop-blur-sm"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                    {appointment.tags.length > 2 && (
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100/80 dark:bg-slate-600/60 text-slate-600 dark:text-slate-300">
                                        +{appointment.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}

                              {/* Details preview */}
                              {appointment.details && (
                                <div className="bg-white/30 dark:bg-slate-700/30 rounded-xl px-3 py-2.5 backdrop-blur-sm border border-white/20 dark:border-slate-600/20">
                                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                                    {appointment.details}
                                  </p>
                                </div>
                              )}

                              {/* Footer with status and quick actions */}
                              <div className="flex items-center justify-between pt-3 border-t border-white/30 dark:border-slate-600/30">
                                <span
                                  className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border transition-all duration-200 ${
                                    appointment.appointmentStatus?.toLowerCase() ===
                                    "confirmed"
                                      ? "bg-gradient-to-r from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/40 dark:border-emerald-700/40"
                                      : appointment.appointmentStatus?.toLowerCase() ===
                                        "cancelled"
                                      ? "bg-gradient-to-r from-red-500/20 to-pink-500/20 dark:from-red-400/20 dark:to-pink-400/20 text-red-700 dark:text-red-300 border-red-200/40 dark:border-red-700/40"
                                      : appointment.appointmentStatus?.toLowerCase() ===
                                        "showed"
                                      ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 text-blue-700 dark:text-blue-300 border-blue-200/40 dark:border-blue-700/40"
                                      : "bg-gradient-to-r from-slate-500/20 to-gray-500/20 dark:from-slate-400/20 dark:to-gray-400/20 text-slate-700 dark:text-slate-300 border-slate-200/40 dark:border-slate-700/40"
                                  }`}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                      appointment.appointmentStatus?.toLowerCase() ===
                                      "confirmed"
                                        ? "bg-emerald-500"
                                        : appointment.appointmentStatus?.toLowerCase() ===
                                          "cancelled"
                                        ? "bg-red-500"
                                        : appointment.appointmentStatus?.toLowerCase() ===
                                          "showed"
                                        ? "bg-blue-500"
                                        : "bg-slate-500"
                                    }`}
                                  />
                                  {appointment.appointmentStatus || "New"}
                                </span>

                                <div className="flex items-center space-x-2">
                                  {appointment.meetLink && (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-400/20 dark:to-indigo-400/20 flex items-center justify-center border border-blue-200/40 dark:border-blue-700/40">
                                      <Lucide
                                        icon="Video"
                                        className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                      />
                                    </div>
                                  )}
                                  {appointment.address && (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 dark:from-emerald-400/20 dark:to-green-400/20 flex items-center justify-center border border-emerald-200/40 dark:border-emerald-700/40">
                                      <Lucide
                                        icon="MapPin"
                                        className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div
                        className="text-center py-16 bg-white/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-sm border border-white/30 dark:border-slate-600/30"
                        style={{
                          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                        }}
                      >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 dark:from-blue-400/20 dark:to-violet-400/20 flex items-center justify-center border border-blue-200/40 dark:border-blue-700/40">
                          <Lucide
                            icon="Calendar"
                            className="w-8 h-8 text-blue-500/70 dark:text-blue-400/70"
                          />
                        </div>
                        <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          No appointments yet
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-48 mx-auto leading-relaxed">
                          Your upcoming appointments will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CSS styles */}
            <style>
              {`
              .dark .appointments-container {
                background: linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%) !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
              }
              
              /* Modern Calendar Glassmorphism Styles */
              .calendar-glassmorphism-container {
                position: relative;
                transition: all 0.3s ease;
              }
              
              .dark .calendar-glassmorphism-container {
                background: linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.9) 100%) !important;
                border: 1px solid rgba(255,255,255,0.15) !important;
                box-shadow: 0 20px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) !important;
              }
              
              .dark .calendar-content {
                background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%) !important;
              }
              
              /* FullCalendar Glassmorphism Customization */
              .fc {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
                height: 100% !important;
              }
              
              .fc-view-harness-active > .fc-view {
                height: 100% !important;
              }
              
              .fc .fc-view-harness {
                height: 100% !important;
              }
              
              /* Header styling */
              .fc-header-toolbar {
                background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(248,250,252,0.6) 100%) !important;
                backdrop-filter: blur(20px) !important;
                border-radius: 1rem !important;
                padding: 1rem !important;
                margin-bottom: 1.5rem !important;
                border: 1px solid rgba(255,255,255,0.3) !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important;
              }
              
              .dark .fc-header-toolbar {
                background: linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.6) 100%) !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
              }
              
              /* Title styling */
              .fc-toolbar-title {
                color: #1e293b !important;
                font-weight: 700 !important;
                font-size: 1.5rem !important;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
              }
              
              .dark .fc-toolbar-title {
                color: #f8fafc !important;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
              }
              
              /* Button styling */
              .fc-button {
                background: linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(139,92,246,0.8) 100%) !important;
                border: none !important;
                border-radius: 0.75rem !important;
                padding: 0.5rem 1rem !important;
                font-weight: 600 !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                box-shadow: 0 4px 12px rgba(99,102,241,0.3) !important;
                transition: all 0.3s ease !important;
                backdrop-filter: blur(10px) !important;
              }
              
              .fc-button:hover {
                background: linear-gradient(135deg, rgba(79,70,229,0.9) 0%, rgba(124,58,237,0.8) 100%) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 6px 20px rgba(99,102,241,0.4) !important;
              }
              
              .fc-button-active,
              .fc-button:focus {
                background: linear-gradient(135deg, rgba(67,56,202,0.9) 0%, rgba(109,40,217,0.8) 100%) !important;
                box-shadow: 0 4px 12px rgba(67,56,202,0.4) !important;
              }
              
              /* Today button special styling */
              .fc-today-button {
                background: linear-gradient(135deg, rgba(16,185,129,0.9) 0%, rgba(5,150,105,0.8) 100%) !important;
                box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important;
              }
              
              .fc-today-button:hover {
                background: linear-gradient(135deg, rgba(5,150,105,0.9) 0%, rgba(4,120,87,0.8) 100%) !important;
                box-shadow: 0 6px 20px rgba(16,185,129,0.4) !important;
              }
              
              /* Calendar grid styling */
              .fc-view-harness {
                background: rgba(255,255,255,0.4) !important;
                backdrop-filter: blur(15px) !important;
                border-radius: 1rem !important;
                border: 1px solid rgba(255,255,255,0.2) !important;
                overflow: hidden !important;
              }
              
              .dark .fc-view-harness {
                background: rgba(30,41,59,0.4) !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
              }
              
              /* Day grid styling */
              .fc-daygrid-day {
                background: rgba(255,255,255,0.2) !important;
                border: 1px solid rgba(0,0,0,0.05) !important;
                transition: all 0.2s ease !important;
              }
              
              .fc-daygrid-day:hover {
                background: rgba(99,102,241,0.1) !important;
                transform: scale(1.002) !important;
              }
              
              .dark .fc-daygrid-day {
                background: rgba(15,23,42,0.3) !important;
                border: 1px solid rgba(255,255,255,0.05) !important;
              }
              
              .dark .fc-daygrid-day:hover {
                background: rgba(99,102,241,0.2) !important;
              }
              
              /* Today highlight */
              .fc-day-today {
                background: linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(99,102,241,0.15) 100%) !important;
                border: 2px solid rgba(59,130,246,0.4) !important;
              }
              
              .dark .fc-day-today {
                background: linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(99,102,241,0.2) 100%) !important;
                border: 2px solid rgba(59,130,246,0.5) !important;
              }
              
              /* Day numbers */
              .fc-daygrid-day-number {
                color: #334155 !important;
                font-weight: 600 !important;
                padding: 0.5rem !important;
                text-shadow: 0 1px 2px rgba(255,255,255,0.8) !important;
              }
              
              .dark .fc-daygrid-day-number {
                color: #cbd5e1 !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
              }
              
              .fc-day-today .fc-daygrid-day-number {
                color: #1e40af !important;
                font-weight: 700 !important;
              }
              
              .dark .fc-day-today .fc-daygrid-day-number {
                color: #93c5fd !important;
              }
              
              /* Events styling */
              .fc-event {
                background: linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(139,92,246,0.8) 100%) !important;
                border: none !important;
                border-radius: 0.5rem !important;
                backdrop-filter: blur(10px) !important;
                box-shadow: 0 4px 12px rgba(99,102,241,0.3) !important;
                margin: 2px !important;
                transition: all 0.3s ease !important;
                border-left: 4px solid rgba(67,56,202,0.8) !important;
              }
              
              .fc-event:hover {
                transform: translateY(-1px) scale(1.02) !important;
                box-shadow: 0 8px 25px rgba(99,102,241,0.4) !important;
                z-index: 10 !important;
              }
              
              .fc-event-title {
                font-weight: 600 !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                padding: 0.25rem !important;
              }
              
              /* Time grid styling */
              .fc-timegrid-slot {
                border-color: rgba(0,0,0,0.05) !important;
              }
              
              .dark .fc-timegrid-slot {
                border-color: rgba(255,255,255,0.05) !important;
              }
              
              .fc-timegrid-axis {
                background: rgba(255,255,255,0.6) !important;
                backdrop-filter: blur(10px) !important;
              }
              
              .dark .fc-timegrid-axis {
                background: rgba(30,41,59,0.6) !important;
              }
              
              /* Week/Day view columns */
              .fc-timegrid-col {
                background: rgba(255,255,255,0.2) !important;
                border-color: rgba(0,0,0,0.05) !important;
              }
              
              .dark .fc-timegrid-col {
                background: rgba(15,23,42,0.2) !important;
                border-color: rgba(255,255,255,0.05) !important;
              }
              
              /* Scrollbars */
              .fc-scroller::-webkit-scrollbar {
                width: 8px;
                height: 8px;
              }
              
              .fc-scroller::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.05);
                border-radius: 4px;
              }
              
              .fc-scroller::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, rgba(99,102,241,0.6) 0%, rgba(139,92,246,0.5) 100%);
                border-radius: 4px;
                backdrop-filter: blur(5px);
              }
              
              .fc-scroller::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, rgba(79,70,229,0.7) 0%, rgba(124,58,237,0.6) 100%);
              }
              
              .dark .fc-scroller::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.05);
              }
              
              .dark .fc-scroller::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, rgba(99,102,241,0.7) 0%, rgba(139,92,246,0.6) 100%);
              }
              
              /* Custom animations */
              @keyframes glassmorphism-glow {
                0% { box-shadow: 0 20px 64px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1); }
                50% { box-shadow: 0 25px 80px rgba(99,102,241,0.15), 0 0 0 1px rgba(255,255,255,0.2); }
                100% { box-shadow: 0 20px 64px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1); }
              }
              
              @keyframes shine-effect {
                0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); opacity: 0; }
                50% { opacity: 0.3; }
                100% { transform: translateX(100%) translateY(100%) rotate(45deg); opacity: 0; }
              }
              
              .calendar-glassmorphism-container:hover {
                animation: glassmorphism-glow 3s ease-in-out infinite;
              }
              
              .event-content-glassmorphism:hover .shine-effect {
                animation: shine-effect 1.2s ease-out;
                opacity: 0.2 !important;
              }
              
              /* Enhanced event hover states */
              .event-content-glassmorphism {
                will-change: transform, box-shadow, background;
              }
              
              /* Appointment Cards Glassmorphism */
              .appointment-card-glassmorphism {
                will-change: transform, box-shadow, background;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              }
              
              .appointment-card-glassmorphism:hover {
                transform: translateY(-8px) scale(1.03);
                box-shadow: 0 20px 64px rgba(0,0,0,0.15), 0 8px 32px rgba(99,102,241,0.2);
              }
              
              .appointment-card-glassmorphism:hover .appointment-shine-effect {
                opacity: 1;
                animation: appointment-shine 1.5s ease-out;
              }
              
              @keyframes appointment-shine {
                0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
              }
              
              /* Enhanced appointment container height */
              .appointments-container {
                height: calc(100vh - 180px);
                min-height: 600px;
              }
              
              .scrollbar-custom::-webkit-scrollbar {
                width: 6px;
              }
              
              .scrollbar-custom::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.05);
                border-radius: 3px;
              }
              
              .dark .scrollbar-custom::-webkit-scrollbar-track {
                background: rgba(255,255,255,0.05);
              }
              
              .scrollbar-custom::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 3px;
              }
              
              .scrollbar-custom::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #5a67d8 0%, #667eea 100%);
              }
              
              .dark .scrollbar-custom::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
              }
              
              .dark .scrollbar-custom::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
              }
            `}
            </style>
          </div>
        </div>

        {/* Calendar View */}
        <div
          className={`${
            isMobile ? (mobileTab === "calendar" ? "block" : "hidden") : ""
          } md:col-span-8 xl:col-span-8 2xl:col-span-9`}
        >
          <div className="relative h-full">
            {viewType === "calendar" ? (
              <CalendarErrorBoundary>
                {/* Modern glassmorphism calendar container */}
                <div
                  className="calendar-glassmorphism-container rounded-3xl border border-white/20 dark:border-gray-700/30 shadow-2xl overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
                    backdropFilter: "blur(30px)",
                    boxShadow:
                      "0 20px 64px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1)",
                    height: isMobile
                      ? "calc(100vh - 240px)"
                      : "calc(100vh - 180px)",
                    minHeight: "600px",
                  }}
                >
                  {/* Glassmorphism inner content */}
                  <div className="relative h-full">
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-indigo-50/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-indigo-900/10 pointer-events-none"></div>

                    {/* Calendar content */}
                    <div
                      className="calendar-content relative z-10 h-full p-4"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "1.25rem",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <FullCalendar {...calendarOptions} ref={calendarRef} />
                      </div>
                    </div>
                  </div>
                </div>
              </CalendarErrorBoundary>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-4">📅</div>
                  <div className="text-lg font-medium">
                    Nothing to show here yet
                  </div>
                  <div className="text-sm opacity-70">
                    Switch to calendar view to see your appointments
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile floating action button */}
      <div className="sm:hidden">
        <button
          onClick={() => {
            setSelectedContact(null);
            setCurrentEvent({
              title: "",
              dateStr: "",
              startTimeStr: "",
              endTimeStr: "",
              extendedProps: {
                address: "",
                appointmentStatus: "",
                staff: "",
                dateAdded: new Date().toISOString(),
                tags: [],
                details: "",
                meetLink: "",
              },
            });
            setAddModalOpen(true);
          }}
          className="fixed bottom-20 right-5 z-40 w-16 h-16 rounded-3xl bg-gradient-to-r from-blue-500/80 to-cyan-600/80 hover:from-blue-600/90 hover:to-cyan-700/90 backdrop-blur-2xl border border-white/20 shadow-2xl hover:shadow-blue-500/25 text-white flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all duration-300 group"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(34,211,238,0.8) 100%)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 40px rgba(59,130,246,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
          }}
          aria-label="Add appointment"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-3xl pointer-events-none" />
          
          {/* Plus icon */}
          <Lucide 
            icon="Plus" 
            className="w-7 h-7 relative z-10 group-hover:rotate-90 transition-transform duration-300" 
          />
          
          {/* Ripple effect on hover */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-500 pointer-events-none" />
        </button>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-4xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden overflow-y-auto transform hover:scale-[1.005] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-violet-500/5 to-purple-500/10 dark:from-blue-600/10 dark:via-violet-700/5 dark:to-purple-600/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                      <Lucide
                        icon="Calendar"
                        className="w-6 h-6 text-blue-400"
                      />
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-violet-100 dark:from-white dark:via-blue-100 dark:to-violet-100 bg-clip-text text-transparent">
                      Edit Appointment
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditModalOpen(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-8 space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Title Input */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide icon="Type" className="w-5 h-5 text-blue-400" />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Title
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="text"
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 shadow-inner"
                          value={currentEvent?.title || ""}
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              title: e.target.value,
                            })
                          }
                          placeholder="Enter appointment title"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>

                    {/* Address Input */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="MapPin"
                          className="w-5 h-5 text-emerald-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Address
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="text"
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 shadow-inner"
                          value={currentEvent?.extendedProps?.address || ""}
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              extendedProps: {
                                ...currentEvent.extendedProps,
                                address: e.target.value,
                              },
                            })
                          }
                          placeholder="Enter appointment address"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>

                    {/* Date Input */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Calendar"
                          className="w-5 h-5 text-violet-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Date
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="date"
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200 shadow-inner"
                          value={currentEvent?.dateStr || ""}
                          onChange={handleDateChange}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Clock"
                          className="w-5 h-5 text-orange-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Time
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative group">
                          <label className="block text-xs text-white/70 dark:text-slate-400 mb-1 font-medium">
                            Start Time
                          </label>
                          <input
                            type="time"
                            className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                            value={currentEvent?.startTimeStr || ""}
                            onChange={(e) => {
                              const startTime = e.target.value;
                              setCurrentEvent((prev: { endTimeStr: any }) => ({
                                ...prev,
                                startTimeStr: startTime,
                                // Automatically set end time to 1 hour after start time if not set
                                endTimeStr:
                                  prev?.endTimeStr ||
                                  format(
                                    addHours(
                                      parse(startTime, "HH:mm", new Date()),
                                      1
                                    ),
                                    "HH:mm"
                                  ),
                              }));
                            }}
                          />
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                        </div>

                        <div className="relative group">
                          <label className="block text-xs text-white/70 dark:text-slate-400 mb-1 font-medium">
                            End Time
                          </label>
                          <input
                            type="time"
                            className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                            value={currentEvent?.endTimeStr || ""}
                            min={currentEvent?.startTimeStr || "00:00"}
                            onChange={(e) => {
                              const endTime = e.target.value;
                              if (
                                endTime <=
                                (currentEvent?.startTimeStr || "00:00")
                              ) {
                                // If end time is before or equal to start time, set it to 1 hour after start time
                                const newEndTime = format(
                                  addHours(
                                    parse(
                                      currentEvent?.startTimeStr || "00:00",
                                      "HH:mm",
                                      new Date()
                                    ),
                                    1
                                  ),
                                  "HH:mm"
                                );
                                setCurrentEvent((prev: any) => ({
                                  ...prev,
                                  endTimeStr: newEndTime,
                                }));
                              } else {
                                setCurrentEvent((prev: any) => ({
                                  ...prev,
                                  endTimeStr: endTime,
                                }));
                              }
                            }}
                          />
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Appointment Status */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="CheckCircle"
                          className="w-5 h-5 text-green-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Status
                        </label>
                      </div>
                      <div className="relative group">
                        <select
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-green-400/50 focus:ring-2 focus:ring-green-400/20 transition-all duration-200 shadow-inner"
                          value={
                            currentEvent?.extendedProps?.appointmentStatus || ""
                          }
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              extendedProps: {
                                ...currentEvent.extendedProps,
                                appointmentStatus: e.target.value,
                              },
                            })
                          }
                        >
                          <option
                            value=""
                            disabled
                            className="bg-slate-800 text-white"
                          >
                            Set a status
                          </option>
                          <option
                            value="new"
                            className="bg-slate-800 text-white"
                          >
                            New
                          </option>
                          <option
                            value="confirmed"
                            className="bg-slate-800 text-white"
                          >
                            Confirmed
                          </option>
                          <option
                            value="cancelled"
                            className="bg-slate-800 text-white"
                          >
                            Cancelled
                          </option>
                          <option
                            value="showed"
                            className="bg-slate-800 text-white"
                          >
                            Showed
                          </option>
                          <option
                            value="noshow"
                            className="bg-slate-800 text-white"
                          >
                            No Show
                          </option>
                          <option
                            value="rescheduled"
                            className="bg-slate-800 text-white"
                          >
                            Rescheduled
                          </option>
                          <option
                            value="lost"
                            className="bg-slate-800 text-white"
                          >
                            Lost
                          </option>
                          <option
                            value="closed"
                            className="bg-slate-800 text-white"
                          >
                            Closed
                          </option>
                        </select>
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>

                    {/* Appointment Type */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Tag"
                          className="w-5 h-5 text-purple-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Type
                        </label>
                      </div>
                      <div className="relative group">
                        <select
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 shadow-inner"
                          value={
                            currentEvent?.extendedProps?.appointmentType ||
                            "general"
                          }
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              extendedProps: {
                                ...currentEvent.extendedProps,
                                appointmentType: e.target.value,
                              },
                            })
                          }
                        >
                          <option
                            value="general"
                            className="bg-slate-800 text-white"
                          >
                            General
                          </option>
                          <option
                            value="consultation"
                            className="bg-slate-800 text-white"
                          >
                            Consultation
                          </option>
                          <option
                            value="service"
                            className="bg-slate-800 text-white"
                          >
                            Service
                          </option>
                          <option
                            value="installation"
                            className="bg-slate-800 text-white"
                          >
                            Installation
                          </option>
                          <option
                            value="maintenance"
                            className="bg-slate-800 text-white"
                          >
                            Maintenance
                          </option>
                          <option
                            value="repair"
                            className="bg-slate-800 text-white"
                          >
                            Repair
                          </option>
                          <option
                            value="follow-up"
                            className="bg-slate-800 text-white"
                          >
                            Follow-up
                          </option>
                          <option
                            value="emergency"
                            className="bg-slate-800 text-white"
                          >
                            Emergency
                          </option>
                        </select>
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Google Meet Link */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="Video"
                        className="w-5 h-5 text-indigo-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Google Meet Link
                      </label>
                    </div>
                    <div className="relative group">
                      <input
                        type="text"
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200 shadow-inner"
                        value={currentEvent?.extendedProps?.meetLink || ""}
                        onChange={(e) =>
                          setCurrentEvent({
                            ...currentEvent,
                            extendedProps: {
                              ...currentEvent.extendedProps,
                              meetLink: e.target.value,
                            },
                          })
                        }
                        placeholder="https://meet.google.com/..."
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                    {currentEvent?.extendedProps?.meetLink && (
                      <div className="flex justify-between items-center p-4 bg-indigo-500/10 backdrop-blur-xl rounded-2xl border border-indigo-400/20">
                        <a
                          href={currentEvent.extendedProps.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-300 text-sm hover:underline font-medium flex items-center space-x-2"
                        >
                          <Lucide icon="ExternalLink" className="w-4 h-4" />
                          <span>Open Meet Link</span>
                        </a>
                        <button
                          className="text-sm text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-200 border border-white/10"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              currentEvent.extendedProps.meetLink
                            );
                          }}
                        >
                          Copy Link
                        </button>
                      </div>
                    )}
                    {!currentEvent?.extendedProps?.notificationSent &&
                      currentEvent?.extendedProps?.meetLink && (
                        <div className="text-sm text-white/70 dark:text-slate-400 bg-white/5 dark:bg-slate-700/20 backdrop-blur-sm px-4 py-3 rounded-2xl border border-white/10">
                          Meeting link will be sent to contacts when you save
                        </div>
                      )}
                    {currentEvent?.extendedProps?.notificationSent && (
                      <div className="text-sm text-green-400 bg-green-500/10 backdrop-blur-sm px-4 py-3 rounded-2xl border border-green-400/20">
                        Meeting link has been sent to contacts
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Staff */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Users"
                          className="w-5 h-5 text-indigo-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Staff
                        </label>
                      </div>
                      <div className="relative">
                        <div className="bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-4 space-y-3 shadow-inner">
                          {employees.map((employee) => (
                            <div
                              key={employee.id}
                              className="flex items-center space-x-3 group"
                            >
                              <input
                                type="checkbox"
                                id={`employee-${employee.id}`}
                                checked={currentEvent?.extendedProps?.staff.includes(
                                  employee.id
                                )}
                                onChange={() => handleStaffChange(employee.id)}
                                className="w-4 h-4 text-indigo-600 bg-white/10 border-white/30 rounded focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 dark:ring-offset-gray-800 focus:ring-2 dark:bg-slate-700/30 dark:border-slate-600/30"
                              />
                              <label
                                htmlFor={`employee-${employee.id}`}
                                className="text-sm font-medium text-white/80 dark:text-slate-300 cursor-pointer group-hover:text-white transition-colors duration-200"
                              >
                                {employee.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Lucide icon="Hash" className="w-5 h-5 text-cyan-400" />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Tags
                        </label>
                      </div>
                      <Select
                        isMulti
                        options={appointmentTags.map((tag: any) => ({
                          value: tag.id,
                          label: tag.name,
                        }))}
                        value={
                          currentEvent?.extendedProps?.tags?.map(
                            (tag: any) => ({
                              value: tag.id,
                              label: tag.name,
                            })
                          ) || []
                        }
                        onChange={handleTagChange}
                        className="capitalize"
                        styles={{
                          control: (provided, state) => ({
                            ...provided,
                            backgroundColor: "rgba(30, 41, 59, 0.8)",
                            backdropFilter: "blur(16px)",
                            borderColor: state.isFocused
                              ? "rgba(34, 211, 238, 0.6)"
                              : "rgba(255, 255, 255, 0.3)",
                            borderRadius: "16px",
                            borderWidth: "1px",
                            boxShadow: state.isFocused
                              ? "0 0 0 2px rgba(34, 211, 238, 0.3)"
                              : "none",
                            minHeight: "56px",
                            padding: "4px 8px",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              borderColor: "rgba(34, 211, 238, 0.6)",
                              backgroundColor: "rgba(30, 41, 59, 0.9)",
                            },
                          }),
                          placeholder: (provided) => ({
                            ...provided,
                            color: "rgba(248, 250, 252, 0.6)",
                          }),
                          input: (provided) => ({
                            ...provided,
                            color: "rgb(248, 250, 252)",
                          }),
                          menu: (provided) => ({
                            ...provided,
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                            backdropFilter: "blur(20px)",
                            borderRadius: "16px",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                            zIndex: 9999,
                          }),
                          option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isSelected
                              ? "rgba(34, 211, 238, 0.9)"
                              : state.isFocused
                              ? "rgba(34, 211, 238, 0.2)"
                              : "transparent",
                            color: state.isSelected
                              ? "white"
                              : "rgb(248, 250, 252)",
                            padding: "12px 16px",
                            fontWeight: state.isSelected ? "600" : "500",
                            "&:active": {
                              backgroundColor: "rgba(34, 211, 238, 0.7)",
                            },
                          }),
                          multiValue: (provided) => ({
                            ...provided,
                            backgroundColor: "rgba(34, 211, 238, 0.3)",
                            borderRadius: "8px",
                            border: "1px solid rgba(34, 211, 238, 0.4)",
                          }),
                          multiValueLabel: (provided) => ({
                            ...provided,
                            color: "rgb(248, 250, 252)",
                            fontWeight: "600",
                          }),
                          multiValueRemove: (provided) => ({
                            ...provided,
                            color: "rgb(248, 250, 252)",
                            "&:hover": {
                              backgroundColor: "rgba(239, 68, 68, 0.3)",
                              color: "#fef2f2",
                            },
                          }),
                          indicatorSeparator: () => ({
                            display: "none",
                          }),
                          dropdownIndicator: (provided) => ({
                            ...provided,
                            color: "rgba(248, 250, 252, 0.6)",
                            "&:hover": {
                              color: "rgb(248, 250, 252)",
                            },
                          }),
                          clearIndicator: (provided) => ({
                            ...provided,
                            color: "rgba(248, 250, 252, 0.6)",
                            "&:hover": {
                              color: "rgb(248, 250, 252)",
                            },
                          }),
                        }}
                      />
                    </div>
                  </div>

                  {/* Contacts */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="Contact"
                        className="w-5 h-5 text-rose-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Contacts
                      </label>
                    </div>
                    <Select
                      options={contacts
                        // Remove duplicates and sort alphabetically, filter out invalid contacts
                        .filter(
                          (contact, index, self) =>
                            contact?.id &&
                            index ===
                              self.findIndex((c) => c.id === contact.id) &&
                            (contact?.name ||
                              contact?.firstName ||
                              contact?.lastName)
                        )
                        .sort((a, b) => {
                          const nameA =
                            a.name ||
                            `${a.firstName || ""} ${a.lastName || ""}`.trim() ||
                            "Unnamed Contact";
                          const nameB =
                            b.name ||
                            `${b.firstName || ""} ${b.lastName || ""}`.trim() ||
                            "Unnamed Contact";
                          return nameA.localeCompare(nameB);
                        })
                        .map((contact) => ({
                          value: contact.id,
                          label:
                            contact.name ||
                            `${contact.firstName || ""} ${
                              contact.lastName || ""
                            }`.trim() ||
                            "Unnamed Contact",
                        }))}
                      value={
                        selectedContact
                          ? {
                              value: selectedContact.id,
                              label:
                                selectedContact.name ||
                                `${selectedContact.firstName || ""} ${
                                  selectedContact.lastName || ""
                                }`.trim() ||
                                "Unnamed Contact",
                            }
                          : null
                      }
                      onChange={handleContactChange}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (provided, state) => ({
                          ...provided,
                          backgroundColor: "rgba(30, 41, 59, 0.8)",
                          backdropFilter: "blur(16px)",
                          borderColor: state.isFocused
                            ? "rgba(244, 63, 94, 0.6)"
                            : "rgba(255, 255, 255, 0.3)",
                          borderRadius: "16px",
                          borderWidth: "1px",
                          boxShadow: state.isFocused
                            ? "0 0 0 2px rgba(244, 63, 94, 0.3)"
                            : "none",
                          minHeight: "56px",
                          padding: "4px 8px",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            borderColor: "rgba(244, 63, 94, 0.6)",
                            backgroundColor: "rgba(30, 41, 59, 0.9)",
                          },
                        }),
                        singleValue: (provided) => ({
                          ...provided,
                          color: "rgb(248, 250, 252)",
                          fontWeight: "500",
                        }),
                        placeholder: (provided) => ({
                          ...provided,
                          color: "rgba(248, 250, 252, 0.6)",
                        }),
                        input: (provided) => ({
                          ...provided,
                          color: "rgb(248, 250, 252)",
                        }),
                        menu: (provided) => ({
                          ...provided,
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          backdropFilter: "blur(20px)",
                          borderRadius: "16px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                          zIndex: 9999,
                        }),
                        option: (provided, state) => ({
                          ...provided,
                          backgroundColor: state.isSelected
                            ? "rgba(244, 63, 94, 0.9)"
                            : state.isFocused
                            ? "rgba(244, 63, 94, 0.2)"
                            : "transparent",
                          color: state.isSelected
                            ? "white"
                            : "rgb(248, 250, 252)",
                          padding: "12px 16px",
                          fontWeight: state.isSelected ? "600" : "500",
                          "&:active": {
                            backgroundColor: "rgba(244, 63, 94, 0.7)",
                          },
                        }),
                        indicatorSeparator: () => ({
                          display: "none",
                        }),
                        dropdownIndicator: (provided) => ({
                          ...provided,
                          color: "rgba(248, 250, 252, 0.6)",
                          "&:hover": {
                            color: "rgb(248, 250, 252)",
                          },
                        }),
                        clearIndicator: (provided) => ({
                          ...provided,
                          color: "rgba(248, 250, 252, 0.6)",
                          "&:hover": {
                            color: "rgb(248, 250, 252)",
                          },
                        }),
                      }}
                      placeholder="Select contact..."
                      isClearable
                    />
                  </div>

                  {/* Additional Details */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="FileText"
                        className="w-5 h-5 text-teal-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Additional Details
                      </label>
                    </div>
                    <div className="relative group">
                      <textarea
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200 resize-none shadow-inner"
                        value={currentEvent?.extendedProps?.details || ""}
                        onChange={(e) =>
                          setCurrentEvent({
                            ...currentEvent,
                            extendedProps: {
                              ...currentEvent.extendedProps,
                              details: e.target.value,
                            },
                          })
                        }
                        rows={4}
                        placeholder="Add any additional details about the appointment..."
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <div className="flex space-x-3">
                    {currentEvent?.id && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => {
                          handleDeleteAppointment(currentEvent.id);
                          setEditModalOpen(false);
                        }}
                        className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 backdrop-blur-sm border border-red-400/20 text-red-400 hover:text-red-300 rounded-2xl transition-all duration-200 font-medium"
                      >
                        <Lucide icon="Trash2" className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                    <Button
                      variant="outline-secondary"
                      onClick={() => setEditModalOpen(false)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                    >
                      Cancel
                    </Button>
                    {initialAppointmentStatus !== "showed" &&
                      initialAppointmentStatus !== "noshow" && (
                        <Button
                          variant="primary"
                          onClick={handleSaveAppointment}
                          className="px-8 py-3 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500 hover:from-blue-600 hover:via-violet-600 hover:to-purple-600 border-0 text-white rounded-2xl transition-all duration-200 font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105"
                        >
                          <div className="flex items-center space-x-2">
                            <Lucide icon="Save" className="w-4 h-4" />
                            <span>Save Changes</span>
                          </div>
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Add Modal */}
      {addModalOpen && (
        <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-xl">
            <Dialog.Panel className="w-full max-w-4xl relative bg-white/10 dark:bg-slate-800/10 backdrop-blur-3xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden overflow-y-auto transform hover:scale-[1.005] transition-all duration-300">
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-violet-500/5 to-purple-500/10 dark:from-blue-600/10 dark:via-violet-700/5 dark:to-purple-600/10 pointer-events-none" />

              <div className="relative p-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/10 dark:border-slate-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 dark:from-blue-600/20 dark:to-violet-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 flex items-center justify-center shadow-lg">
                      <Lucide
                        icon="Plus"
                        className="w-7 h-7 text-blue-400 dark:text-blue-300"
                      />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white/90 dark:text-slate-200">
                        Add New Appointment
                      </h3>
                      <p className="text-sm text-white/60 dark:text-slate-400 mt-1">
                        Create a new appointment with modern scheduling
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAddModalOpen(false)}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 text-slate-400 hover:text-white dark:hover:text-slate-200 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/10"
                  >
                    <Lucide icon="X" className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-8 space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Title Input */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide icon="Type" className="w-5 h-5 text-blue-400" />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Title
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="text"
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 shadow-inner"
                          value={currentEvent?.title || ""}
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              title: e.target.value,
                            })
                          }
                          placeholder="Enter appointment title"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>

                    {/* Address Input */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="MapPin"
                          className="w-5 h-5 text-emerald-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Address
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="text"
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 shadow-inner"
                          value={currentEvent?.extendedProps?.address || ""}
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              extendedProps: {
                                ...currentEvent.extendedProps,
                                address: e.target.value,
                              },
                            })
                          }
                          placeholder="Enter appointment address"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>

                    {/* Date Input */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Calendar"
                          className="w-5 h-5 text-violet-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Date
                        </label>
                      </div>
                      <div className="relative group">
                        <input
                          type="date"
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/20 transition-all duration-200 shadow-inner"
                          value={currentEvent?.dateStr || ""}
                          onChange={handleDateChange}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Clock"
                          className="w-5 h-5 text-orange-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Time
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative group">
                          <label className="block text-xs text-white/70 dark:text-slate-400 mb-1 font-medium">
                            Start Time
                          </label>
                          <input
                            type="time"
                            className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                            value={currentEvent?.startTimeStr || ""}
                            onChange={(e) => {
                              const startTime = e.target.value;
                              setCurrentEvent((prev: { endTimeStr: any }) => ({
                                ...prev,
                                startTimeStr: startTime,
                                // Automatically set end time to 1 hour after start time if not set
                                endTimeStr:
                                  prev?.endTimeStr ||
                                  format(
                                    addHours(
                                      parse(startTime, "HH:mm", new Date()),
                                      1
                                    ),
                                    "HH:mm"
                                  ),
                              }));
                            }}
                          />
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                        </div>

                        <div className="relative group">
                          <label className="block text-xs text-white/70 dark:text-slate-400 mb-1 font-medium">
                            End Time
                          </label>
                          <input
                            type="time"
                            className="w-full px-4 py-3 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/20 transition-all duration-200 shadow-inner"
                            value={currentEvent?.endTimeStr || ""}
                            min={currentEvent?.startTimeStr || "00:00"}
                            onChange={(e) => {
                              const endTime = e.target.value;
                              if (
                                endTime <=
                                (currentEvent?.startTimeStr || "00:00")
                              ) {
                                // If end time is before or equal to start time, set it to 1 hour after start time
                                const newEndTime = format(
                                  addHours(
                                    parse(
                                      currentEvent?.startTimeStr || "00:00",
                                      "HH:mm",
                                      new Date()
                                    ),
                                    1
                                  ),
                                  "HH:mm"
                                );
                                setCurrentEvent((prev: any) => ({
                                  ...prev,
                                  endTimeStr: newEndTime,
                                }));
                              } else {
                                setCurrentEvent((prev: any) => ({
                                  ...prev,
                                  endTimeStr: endTime,
                                }));
                              }
                            }}
                          />
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Appointment Status */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Activity"
                          className="w-5 h-5 text-yellow-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Status
                        </label>
                      </div>
                      <div className="relative group">
                        <select
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-200 shadow-inner appearance-none cursor-pointer"
                          style={{
                            colorScheme: "dark",
                          }}
                          value={
                            currentEvent?.extendedProps?.appointmentStatus || ""
                          }
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              extendedProps: {
                                ...currentEvent.extendedProps,
                                appointmentStatus: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="" disabled style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgba(248, 250, 252, 0.6)" }}>
                            Set a status
                          </option>
                          <option value="new" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>New</option>
                          <option value="confirmed" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Confirmed</option>
                          <option value="cancelled" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Cancelled</option>
                          <option value="showed" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Showed</option>
                          <option value="noshow" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>No Show</option>
                          <option value="rescheduled" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Rescheduled</option>
                          <option value="lost" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Lost</option>
                          <option value="closed" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Closed</option>
                        </select>
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>

                    {/* Appointment Type */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Briefcase"
                          className="w-5 h-5 text-purple-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Type
                        </label>
                      </div>
                      <div className="relative group">
                        <select
                          className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all duration-200 shadow-inner appearance-none cursor-pointer"
                          style={{
                            colorScheme: "dark",
                          }}
                          value={
                            currentEvent?.extendedProps?.appointmentType ||
                            "general"
                          }
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              extendedProps: {
                                ...currentEvent.extendedProps,
                                appointmentType: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="general" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>General</option>
                          <option value="consultation" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Consultation</option>
                          <option value="service" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Service</option>
                          <option value="installation" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Installation</option>
                          <option value="maintenance" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Maintenance</option>
                          <option value="repair" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Repair</option>
                          <option value="follow-up" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Follow-up</option>
                          <option value="emergency" style={{ backgroundColor: "rgba(15, 23, 42, 0.95)", color: "rgb(248, 250, 252)" }}>Emergency</option>
                        </select>
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Staff Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Lucide
                          icon="Users"
                          className="w-5 h-5 text-indigo-400"
                        />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Staff
                        </label>
                      </div>
                      <div className="relative">
                        <div className="bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl p-4 space-y-3 shadow-inner">
                          {employees.map((employee) => (
                            <div
                              key={employee.id}
                              className="flex items-center space-x-3 group"
                            >
                              <input
                                type="checkbox"
                                id={`employee-${employee.id}`}
                                checked={selectedEmployeeIds.includes(
                                  employee.id
                                )}
                                onChange={() =>
                                  handleStaffChangeAddModal(employee.id)
                                }
                                className="w-4 h-4 text-indigo-600 bg-white/10 border-white/30 rounded focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 dark:ring-offset-gray-800 focus:ring-2 dark:bg-slate-700/30 dark:border-slate-600/30"
                              />
                              <label
                                htmlFor={`employee-${employee.id}`}
                                className="text-sm font-medium text-white/80 dark:text-slate-300 cursor-pointer group-hover:text-white transition-colors duration-200"
                              >
                                {employee.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Lucide icon="Tag" className="w-5 h-5 text-cyan-400" />
                        <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                          Tags
                        </label>
                      </div>
                      <Select
                        isMulti
                        options={appointmentTags.map((tag: any) => ({
                          value: tag.id,
                          label: tag.name,
                        }))}
                        value={
                          currentEvent?.extendedProps?.tags?.map(
                            (tag: any) => ({
                              value: tag.id,
                              label: tag.name,
                            })
                          ) || []
                        }
                        onChange={handleTagChange}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          control: (provided, state) => ({
                            ...provided,
                            backgroundColor: "rgba(30, 41, 59, 0.8)",
                            backdropFilter: "blur(16px)",
                            borderColor: state.isFocused
                              ? "rgba(34, 211, 238, 0.6)"
                              : "rgba(255, 255, 255, 0.3)",
                            borderRadius: "16px",
                            borderWidth: "1px",
                            boxShadow: state.isFocused
                              ? "0 0 0 2px rgba(34, 211, 238, 0.3)"
                              : "none",
                            minHeight: "56px",
                            padding: "4px 8px",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              borderColor: "rgba(34, 211, 238, 0.6)",
                              backgroundColor: "rgba(30, 41, 59, 0.9)",
                            },
                          }),
                          placeholder: (provided) => ({
                            ...provided,
                            color: "rgba(248, 250, 252, 0.6)",
                          }),
                          input: (provided) => ({
                            ...provided,
                            color: "rgb(248, 250, 252)",
                          }),
                          menu: (provided) => ({
                            ...provided,
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                            backdropFilter: "blur(20px)",
                            borderRadius: "16px",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                            zIndex: 9999,
                          }),
                          option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isSelected
                              ? "rgba(34, 211, 238, 0.9)"
                              : state.isFocused
                              ? "rgba(34, 211, 238, 0.2)"
                              : "transparent",
                            color: state.isSelected
                              ? "white"
                              : "rgb(248, 250, 252)",
                            padding: "12px 16px",
                            fontWeight: state.isSelected ? "600" : "500",
                            "&:active": {
                              backgroundColor: "rgba(34, 211, 238, 0.7)",
                            },
                          }),
                          multiValue: (provided) => ({
                            ...provided,
                            backgroundColor: "rgba(34, 211, 238, 0.3)",
                            borderRadius: "8px",
                            border: "1px solid rgba(34, 211, 238, 0.4)",
                          }),
                          multiValueLabel: (provided) => ({
                            ...provided,
                            color: "rgb(248, 250, 252)",
                            fontWeight: "600",
                          }),
                          multiValueRemove: (provided) => ({
                            ...provided,
                            color: "rgb(248, 250, 252)",
                            "&:hover": {
                              backgroundColor: "rgba(239, 68, 68, 0.3)",
                              color: "#fef2f2",
                            },
                          }),
                          indicatorSeparator: () => ({
                            display: "none",
                          }),
                          dropdownIndicator: (provided) => ({
                            ...provided,
                            color: "rgba(248, 250, 252, 0.6)",
                            "&:hover": {
                              color: "rgb(248, 250, 252)",
                            },
                          }),
                          clearIndicator: (provided) => ({
                            ...provided,
                            color: "rgba(248, 250, 252, 0.6)",
                            "&:hover": {
                              color: "rgb(248, 250, 252)",
                            },
                          }),
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide icon="Users" className="w-5 h-5 text-rose-400" />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Contact
                      </label>
                    </div>
                    <Select
                      options={contacts.map((contact) => ({
                        value: contact.id,
                        label: contact.name,
                      }))}
                      value={
                        selectedContact
                          ? {
                              value: selectedContact.id,
                              label: selectedContact.name,
                            }
                          : null
                      }
                      onChange={handleContactChange}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (provided, state) => ({
                          ...provided,
                          backgroundColor: "rgba(30, 41, 59, 0.8)",
                          backdropFilter: "blur(16px)",
                          borderColor: state.isFocused
                            ? "rgba(244, 63, 94, 0.6)"
                            : "rgba(255, 255, 255, 0.3)",
                          borderRadius: "16px",
                          borderWidth: "1px",
                          boxShadow: state.isFocused
                            ? "0 0 0 2px rgba(244, 63, 94, 0.3)"
                            : "none",
                          minHeight: "56px",
                          padding: "4px 8px",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            borderColor: "rgba(244, 63, 94, 0.6)",
                            backgroundColor: "rgba(30, 41, 59, 0.9)",
                          },
                        }),
                        singleValue: (provided) => ({
                          ...provided,
                          color: "rgb(248, 250, 252)",
                          fontWeight: "500",
                        }),
                        placeholder: (provided) => ({
                          ...provided,
                          color: "rgba(248, 250, 252, 0.6)",
                        }),
                        input: (provided) => ({
                          ...provided,
                          color: "rgb(248, 250, 252)",
                        }),
                        menu: (provided) => ({
                          ...provided,
                          backgroundColor: "rgba(15, 23, 42, 0.95)",
                          backdropFilter: "blur(20px)",
                          borderRadius: "16px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                          zIndex: 9999,
                        }),
                        option: (provided, state) => ({
                          ...provided,
                          backgroundColor: state.isSelected
                            ? "rgba(244, 63, 94, 0.9)"
                            : state.isFocused
                            ? "rgba(244, 63, 94, 0.2)"
                            : "transparent",
                          color: state.isSelected
                            ? "white"
                            : "rgb(248, 250, 252)",
                          padding: "12px 16px",
                          fontWeight: state.isSelected ? "600" : "500",
                          "&:active": {
                            backgroundColor: "rgba(244, 63, 94, 0.7)",
                          },
                        }),
                        indicatorSeparator: () => ({
                          display: "none",
                        }),
                        dropdownIndicator: (provided) => ({
                          ...provided,
                          color: "rgba(248, 250, 252, 0.6)",
                          "&:hover": {
                            color: "rgb(248, 250, 252)",
                          },
                        }),
                        clearIndicator: (provided) => ({
                          ...provided,
                          color: "rgba(248, 250, 252, 0.6)",
                          "&:hover": {
                            color: "rgb(248, 250, 252)",
                          },
                        }),
                      }}
                      placeholder="Select contact..."
                      isClearable
                    />
                  </div>

                  {/* Additional Details */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Lucide
                        icon="FileText"
                        className="w-5 h-5 text-teal-400"
                      />
                      <label className="text-lg font-semibold text-white/90 dark:text-slate-200">
                        Additional Details
                      </label>
                    </div>
                    <div className="relative group">
                      <textarea
                        className="w-full px-4 py-4 bg-white/5 dark:bg-slate-700/20 backdrop-blur-xl border border-white/20 dark:border-slate-600/20 rounded-2xl text-white dark:text-slate-200 placeholder-white/50 dark:placeholder-slate-400 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20 transition-all duration-200 resize-none shadow-inner"
                        value={currentEvent?.extendedProps?.details || ""}
                        onChange={(e) => {
                          const newDetails = e.target.value;
                          setCurrentEvent({
                            ...currentEvent,
                            extendedProps: {
                              ...currentEvent.extendedProps,
                              details: newDetails,
                            },
                          });
                        }}
                        rows={4}
                        placeholder="Add any additional details about the appointment..."
                      />
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-10 pt-6 border-t border-white/10 dark:border-slate-700/20">
                  <div className="flex space-x-3">
                    <button
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:bg-slate-700/20 dark:hover:bg-slate-600/30 backdrop-blur-sm border border-white/20 dark:border-slate-600/20 text-white/90 hover:text-white rounded-2xl transition-all duration-200 font-medium"
                      onClick={() => {
                        setAddModalOpen(false);
                        setSelectedContact(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-blue-500/80 to-violet-600/80 hover:from-blue-600/90 hover:to-violet-700/90 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 backdrop-blur-xl border border-white/20"
                      onClick={handleAddAppointment}
                    >
                      <div className="flex items-center space-x-2">
                        <Lucide icon="Save" className="w-4 h-4" />
                        <span>Save Appointment</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
      {renderCalendarConfigModal()}
      {renderReminderModal()}
      {renderBookingLinkModal()}
    </>
  );
}

export default Main;