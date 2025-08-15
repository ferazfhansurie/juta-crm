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
const baseUrl = "https://juta-dev.ngrok.dev"; // Your PostgreSQL server URL

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
      // Create a slug from the title (similar to how PublicAttendanceForm works)
      const slug = bookingLinkForm.title
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

        // Add timestamp to ensure unique slug
        const timestamp = Date.now();
        const staffSlug = `${slug}-${staffName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")}-${timestamp}`;

        const bookingSlotData = {
          title: `${bookingLinkForm.title} with ${staffName}`,
          slug: staffSlug,
          description: bookingLinkForm.description,
          location: bookingLinkForm.location,
          duration: bookingLinkForm.duration,
          staffName: staffName,
          staff_phone: staffPhone, // Add staff phone number
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
              Authorization: `Bearer ${userEmail}`, // Adjust based on your auth system
            },
          }
        );

        if (response.data.success) {
          const baseUrlWindow = window.location.origin;
          const staffNameSlug = staffName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
          const link = `${baseUrlWindow}/booking/${staffSlug}/${staffNameSlug}/${
            bookingLinkForm.phone || "PHONE"
          }`;
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
            (c: any) => c?.name || `${c?.firstName || ""} ${c?.lastName || ""}`.trim()
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

    // Modern status-based colors with enhanced gradients and modern palette
    const statusColors: Record<string, { bg: string; text: string; gradient: string; accent: string }> = {
      new: { 
        bg: "#F8FAFC", 
        text: "#475569", 
        gradient: "linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)",
        accent: "#64748B"
      },
      confirmed: { 
        bg: "#ECFDF5", 
        text: "#065F46", 
        gradient: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
        accent: "#10B981"
      },
      cancelled: { 
        bg: "#FEF2F2", 
        text: "#991B1B", 
        gradient: "linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)",
        accent: "#EF4444"
      },
      showed: { 
        bg: "#F3E8FF", 
        text: "#581C87", 
        gradient: "linear-gradient(135deg, #F3E8FF 0%, #DDD6FE 100%)",
        accent: "#8B5CF6"
      },
      noshow: { 
        bg: "#FFF7ED", 
        text: "#C2410C", 
        gradient: "linear-gradient(135deg, #FFF7ED 0%, #FED7AA 100%)",
        accent: "#F97316"
      },
      rescheduled: { 
        bg: "#F0F9FF", 
        text: "#075985", 
        gradient: "linear-gradient(135deg, #F0F9FF 0%, #BAE6FD 100%)",
        accent: "#0EA5E9"
      },
      lost: { 
        bg: "#FAFAFA", 
        text: "#525252", 
        gradient: "linear-gradient(135deg, #FAFAFA 0%, #E5E5E5 100%)",
        accent: "#737373"
      },
      closed: { 
        bg: "#EFF6FF", 
        text: "#1E40AF", 
        gradient: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
        accent: "#3B82F6"
      },
    };

    const statusColor = statusColors[status.toLowerCase()] || {
      bg: "#F9FAFB",
      text: "#374151",
      gradient: "linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)",
      accent: "#6B7280"
    };

    return (
      <div
        className={`event-content ${status.toLowerCase()}`}
        style={{
          background: statusColor.gradient,
          padding: isMobile ? "8px 10px" : "10px 12px",
          borderRadius: "12px",
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          fontSize: isMobile ? "11px" : "12px",
          border: `1px solid ${statusColor.accent}25`,
          boxShadow: `0 4px 12px ${statusColor.accent}15, 0 2px 4px ${statusColor.accent}10`,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "pointer",
          position: "relative",
          backdropFilter: "blur(8px)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `0 8px 25px ${statusColor.accent}20, 0 4px 12px ${statusColor.accent}15`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = `0 4px 12px ${statusColor.accent}15, 0 2px 4px ${statusColor.accent}10`;
        }}
      >
        {/* Status indicator bar */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "3px",
            background: `linear-gradient(90deg, ${statusColor.accent} 0%, ${statusColor.accent}80 100%)`,
            borderRadius: "12px 12px 0 0",
          }}
        />

        {/* Header with title and status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginTop: "2px",
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
              gap: "6px",
              fontSize: isMobile ? "12px" : "13px",
              flex: 1,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: statusColor.accent,
                display: "inline-block",
                boxShadow: `0 0 8px ${statusColor.accent}40`,
              }}
            />
            {event.title}
          </div>
          {extendedProps.meetLink && (
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
              }}
            >
              <span style={{ color: "white", fontSize: "10px", fontWeight: "bold" }}>📹</span>
            </div>
          )}
        </div>

        {/* Time section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: statusColor.text,
            fontWeight: 600,
            fontSize: isMobile ? "10px" : "11px",
          }}
        >
          <span style={{ opacity: 0.7 }}>🕐</span>
          <span>{startTime} - {endTime}</span>
        </div>

        {/* Contacts section */}
        {contacts.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: statusColor.text,
              fontWeight: 500,
              fontSize: "10px",
              opacity: 0.8,
            }}
          >
            <span>👤</span>
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {contacts.map((c: any) => c.name).join(", ")}
            </span>
          </div>
        )}

        {/* Details section (desktop only) */}
        {!isMobile && extendedProps.details && (
          <div
            style={{
              fontSize: "10px",
              color: statusColor.text,
              opacity: 0.7,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontStyle: "italic",
              borderTop: `1px solid ${statusColor.accent}20`,
              paddingTop: "4px",
              marginTop: "2px",
            }}
          >
            {extendedProps.details}
          </div>
        )}

        {/* Status badge */}
        {/* {status && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              backgroundColor: statusColor.accent,
              color: "white",
              fontSize: "8px",
              fontWeight: "bold",
              padding: "2px 6px",
              borderRadius: "6px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              boxShadow: `0 2px 4px ${statusColor.accent}30`,
              zIndex: 1,
            }}
          >
            {status}
          </div>
        )} */}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10 dark:bg-gray-800">
          <h2 className="text-lg font-medium mb-4 dark:text-white">
            Calendar Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Primary Google Calendar ID
              </label>
              <input
                type="text"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"
                value={config.calendarId || ""}
                onChange={(e) =>
                  setConfig({ ...config, calendarId: e.target.value })
                }
                placeholder="example@group.calendar.google.com"
              />
            </div>

            {/* Additional Calendar IDs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Additional Calendar IDs
              </label>
              {(config.additionalCalendarIds || []).map((calendarId, index) => (
                <div key={index} className="flex items-center mt-2 gap-2">
                  <input
                    type="text"
                    className="flex-1 block w-full mt-1 border-gray-300 rounded-md shadow-sm"
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
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Lucide icon="X" className="w-5 h-5" />
                  </button>
                </div>
              ))}

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
                className="mt-2 px-3 py-1 text-sm text-primary border border-primary rounded hover:bg-primary hover:text-white"
              >
                <Lucide icon="Plus" className="w-4 h-4 inline-block mr-1" />
                Add Calendar
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Hour (24h)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.startHour}
                onChange={(e) =>
                  setConfig({ ...config, startHour: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                End Hour (24h)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.endHour}
                onChange={(e) =>
                  setConfig({ ...config, endHour: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Slot Duration (minutes)
              </label>
              <input
                type="number"
                min="15"
                step="15"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.slotDuration}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    slotDuration: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Days Ahead
              </label>
              <input
                type="number"
                min="1"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.daysAhead}
                onChange={(e) =>
                  setConfig({ ...config, daysAhead: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                onClick={() => setIsCalendarConfigOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
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
                Save Settings
              </button>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl mt-10 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold dark:text-white">
              Reminder Settings
            </h2>
            <button
              onClick={() => setIsReminderSettingsOpen(false)}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              💡 Pro Tip
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Set up reminders for both employees and clients to ensure everyone
              is prepared for appointments. You can create separate reminders
              for each group or use the "Both Parties" option for convenience.
            </p>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {reminderSettings?.reminders?.map(
              (reminder: any, index: number) => (
                <div
                  key={index}
                  className="p-5 border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-750 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center justify-center w-8 h-8 text-sm font-semibold text-white bg-primary rounded-full">
                        {index + 1}
                      </span>
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        Reminder {index + 1}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <label className="mr-2 text-sm text-gray-600 dark:text-gray-400">
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
                            setReminderSettings({ reminders: newReminders });
                          }}
                          className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 focus:ring-primary"
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
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {reminder.enabled && (
                    <div className="space-y-4">
                      {/* Recipient Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Send Reminder To
                        </label>
                        <div className="flex space-x-4">
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              className="form-radio text-primary"
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
                                newReminders[index].recipientType = "contacts";
                                setReminderSettings({
                                  reminders: newReminders,
                                });
                              }}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Appointment Contacts
                            </span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              className="form-radio text-primary"
                              name={`recipient-type-${index}`}
                              value="employees"
                              checked={reminder.recipientType === "employees"}
                              onChange={() => {
                                const newReminders = [
                                  ...(reminderSettings?.reminders || []),
                                ];
                                newReminders[index].recipientType = "employees";
                                if (!newReminders[index].selectedEmployees) {
                                  newReminders[index].selectedEmployees = [];
                                }
                                setReminderSettings({
                                  reminders: newReminders,
                                });
                              }}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Specific Employees
                            </span>
                          </label>
                          <label className="inline-flex items-center">
                            <input
                              type="radio"
                              className="form-radio text-primary"
                              name={`recipient-type-${index}`}
                              value="both"
                              checked={reminder.recipientType === "both"}
                              onChange={() => {
                                const newReminders = [
                                  ...(reminderSettings?.reminders || []),
                                ];
                                newReminders[index].recipientType = "both";
                                if (!newReminders[index].selectedEmployees) {
                                  newReminders[index].selectedEmployees = [];
                                }
                                setReminderSettings({
                                  reminders: newReminders,
                                });
                              }}
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Both Parties
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Employee Selection (only shown when recipientType is 'employees' or 'both') */}
                      {(reminder.recipientType === "employees" ||
                        reminder.recipientType === "both") && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Select Employees
                          </label>
                          <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-white dark:bg-gray-700">
                            {employees.map((employee) => (
                              <div
                                key={employee.id}
                                className="flex items-center space-x-2 mb-2"
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
                                      ...(reminderSettings?.reminders || []),
                                    ];
                                    if (
                                      !newReminders[index].selectedEmployees
                                    ) {
                                      newReminders[index].selectedEmployees =
                                        [];
                                    }

                                    if (e.target.checked) {
                                      newReminders[index].selectedEmployees = [
                                        ...(newReminders[index]
                                          .selectedEmployees || []),
                                        employee.id,
                                      ];
                                    } else {
                                      newReminders[index].selectedEmployees =
                                        newReminders[
                                          index
                                        ].selectedEmployees?.filter(
                                          (id) => id !== employee.id
                                        );
                                    }

                                    setReminderSettings({
                                      reminders: newReminders,
                                    });
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-gray-900 dark:text-white">
                                  {employee.name}
                                </span>
                              </div>
                            ))}
                          </div>
                          {(!reminder.selectedEmployees ||
                            reminder.selectedEmployees.length === 0) && (
                            <p className="mt-1 text-xs text-red-500">
                              Please select at least one employee
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Time
                          </label>
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
                              setReminderSettings({ reminders: newReminders });
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Unit
                          </label>
                          <select
                            value={reminder.timeUnit}
                            onChange={(e) => {
                              const newReminders = [
                                ...(reminderSettings?.reminders || []),
                              ];
                              newReminders[index].timeUnit = e.target.value as
                                | "minutes"
                                | "hours"
                                | "days";
                              setReminderSettings({ reminders: newReminders });
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            When to Send
                          </label>
                          <select
                            value={reminder.type}
                            onChange={(e) => {
                              const newReminders = [
                                ...(reminderSettings?.reminders || []),
                              ];
                              newReminders[index].type = e.target.value as
                                | "before"
                                | "after";
                              setReminderSettings({ reminders: newReminders });
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="before">Before Appointment</option>
                            <option value="after">After Appointment</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Message Template
                        </label>
                        <div className="relative">
                          <textarea
                            value={reminder.message}
                            onChange={(e) => {
                              const newReminders = [
                                ...(reminderSettings?.reminders || []),
                              ];
                              newReminders[index].message = e.target.value;
                              setReminderSettings({ reminders: newReminders });
                            }}
                            rows={3}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Enter your message here. Use {time}, {unit}, and {when} as placeholders."
                          />
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Available placeholders: {"{time}"}, {"{unit}"},{" "}
                            {"{when}"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          <div className="mt-6 space-y-4">
            <button
              className="w-full px-4 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Add New Reminder</span>
            </button>

            <div className="flex justify-end space-x-3">
              <button
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors duration-200"
                onClick={() => setIsReminderSettingsOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200"
                onClick={() => updateReminderSettings(reminderSettings)}
              >
                Save Settings
              </button>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl mt-10 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold dark:text-white">
              Generate Booking Link
            </h2>
            <button
              onClick={() => {
                setIsBookingLinkModalOpen(false);
                resetBookingLinkForm();
              }}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bookingLinkForm.title}
                  onChange={(e) =>
                    setBookingLinkForm({
                      ...bookingLinkForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., Consultation Appointment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={bookingLinkForm.duration}
                  onChange={(e) =>
                    setBookingLinkForm({
                      ...bookingLinkForm,
                      duration: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="60"
                  min="15"
                  max="480"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={bookingLinkForm.location}
                onChange={(e) =>
                  setBookingLinkForm({
                    ...bookingLinkForm,
                    location: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., Office Location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={bookingLinkForm.description}
                onChange={(e) =>
                  setBookingLinkForm({
                    ...bookingLinkForm,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
                placeholder="Brief description of the appointment..."
              />
            </div>

            {employees.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Staff Members
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {employees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={bookingLinkForm.selectedStaff.includes(
                          employee.name
                        )}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          const updatedStaff = isChecked
                            ? [...bookingLinkForm.selectedStaff, employee.name]
                            : bookingLinkForm.selectedStaff.filter(
                                (name) => name !== employee.name
                              );
                          setBookingLinkForm({
                            ...bookingLinkForm,
                            selectedStaff: updatedStaff,
                          });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {employee.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={bookingLinkForm.phone}
                onChange={(e) =>
                  setBookingLinkForm({
                    ...bookingLinkForm,
                    phone: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="+60123456789 (leave blank to show PHONE placeholder)"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Users will select their preferred date and time on the booking
                page
              </p>
            </div>

            {generatedBookingLink && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Generated Booking Links (One per Staff Member)
                </label>
                <div className="space-y-2">
                  <textarea
                    value={generatedBookingLink}
                    readOnly
                    rows={bookingLinkForm.selectedStaff.length + 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-white text-sm"
                  />
                  <button
                    onClick={copyBookingLink}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Copy All Links
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Each staff member gets their own unique booking link. Share
                  the appropriate link with clients.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setIsBookingLinkModalOpen(false);
                  resetBookingLinkForm();
                }}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={generateBookingLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Generate Link
              </button>
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

  // Update the save function to use the new response format
  const handleSaveCalendarConfig = async () => {
    debugLog("Saving calendar config", config);

    const newConfig = {
      ...config,
      calendarId: config.calendarId?.trim() || "",
    };

    // Skip validation for empty calendar ID
    if (newConfig.calendarId) {
      try {
        const result = await testGoogleCalendarConnection(newConfig.calendarId);
        if (!result.success) {
          toast.error(result.error || "Failed to connect to calendar");
          return;
        }
      } catch (error) {
        debugLog("Connection test error", error);
        toast.error("Error testing calendar connection");
        return;
      }
    }

    try {
      await updateCalendarConfig(newConfig);
      setConfig(newConfig);

      // Safely refresh the calendar
      if (calendarRef.current) {
        const calendarApi = (calendarRef.current as any).getApi();
        try {
          calendarApi.removeAllEventSources();
          await calendarApi.refetchEvents();
          debugLog("Calendar refreshed successfully");
          toast.success("Calendar settings updated successfully");
        } catch (error) {
          debugLog("Calendar refresh error", error);
        }
      }

      setIsCalendarConfigOpen(false);
    } catch (error) {
      debugLog("Save config error", error);
      toast.error("Error saving calendar configuration");
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
      right: isMobile ? "timeGridDay,timeGridWeek" : "dayGridMonth,timeGridWeek,timeGridDay",
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
    aspectRatio: isMobile ? 0.85 : 1.5,
    googleCalendarApiKey: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY,
    // Enhanced styling options
    height: 'auto',
    eventDisplay: 'block',
    displayEventTime: true,
    displayEventEnd: false,
    eventTimeFormat: {
      hour: "numeric" as const,
      minute: "2-digit" as const,
      hour12: true
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
      const status = info.event.extendedProps?.appointmentStatus?.toLowerCase() || 'new';

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
        info.el.style.background = "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)";
        info.el.style.borderLeft = "4px solid #0ea5e9";
        info.el.style.color = "#0c4a6e";
        
        // Add calendar icon for Google events
        const existingTitle = info.el.querySelector('.fc-event-title');
        if (existingTitle && !existingTitle.querySelector('.google-cal-icon')) {
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
          const colorStops = staffColors.map((color, index) => {
            const percentage = (index / (staffColors.length - 1)) * 100;
            return `${color}40 ${percentage}%`;
          }).join(', ');
          info.el.style.background = `linear-gradient(135deg, ${colorStops})`;
          info.el.style.borderLeft = `4px solid ${staffColors[0]}`;
        }
      }

      // Enhanced hover effects
      const originalTransform = info.el.style.transform;
      const originalBoxShadow = info.el.style.boxShadow;

      info.el.addEventListener('mouseenter', () => {
        info.el.style.transform = "translateY(-2px) scale(1.02)";
        info.el.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)";
        info.el.style.zIndex = "10";
      });

      info.el.addEventListener('mouseleave', () => {
        info.el.style.transform = originalTransform;
        info.el.style.boxShadow = originalBoxShadow;
        info.el.style.zIndex = "auto";
      });

      // Add tooltip with event details
      const contacts = info.event.extendedProps?.contacts || [];
      const contactNames = contacts.map((c: any) => c.name).join(", ");
      const tooltipText = [
        info.event.title,
        info.event.extendedProps?.details && `Details: ${info.event.extendedProps.details}`,
        contactNames && `Contacts: ${contactNames}`,
        eventSource === "google-calendar" ? "📅 Google Calendar" : "💾 Database Event"
      ].filter(Boolean).join("\n");
      
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

  // Add new component for grid view
  const GridView = () => {
    const hours = [
      "9:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "2:00 PM",
      "3:00 PM",
      "4:00 PM",
    ];
    const [selectedCell, setSelectedCell] = useState<{
      row: number;
      col: number;
    } | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Debug logs

    // Convert UTC to local time for comparison
    const selectedDateAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      const localAptDate = new Date(aptDate.getTime());
      const aptDateStr = format(localAptDate, "yyyy-MM-dd");
      const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

      console.log("Comparing dates:", {
        appointment: apt.title,
        appointmentDate: aptDateStr,
        selectedDate: selectedDateStr,
        isMatch: aptDateStr === selectedDateStr,
      });

      return aptDateStr === selectedDateStr;
    });

    const formatAppointmentTime = (isoString: string) => {
      const date = new Date(isoString);
      return format(date, "h:mm a");
    };

    // Helper function to find employee by email
    const findEmployeeByEmail = (email: string) => {
      const employee = employees.find((emp) => emp.id === email);

      return employee;
    };

    const [employeeExpenses, setEmployeeExpenses] = useState<
      Record<string, { minyak: number; toll: number }>
    >({});

    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!selectedCell) return;

        const { row, col } = selectedCell;
        const maxRow = hours.length - 1;
        const maxCol = employees.length - 1;

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            if (row > 0) {
              setSelectedCell({ row: row - 1, col });
              scrollToCell(row - 1, col);
            }
            break;
          case "ArrowDown":
            e.preventDefault();
            if (row < maxRow) {
              setSelectedCell({ row: row + 1, col });
              scrollToCell(row + 1, col);
            }
            break;
          case "ArrowLeft":
            e.preventDefault();
            if (col > 0) {
              setSelectedCell({ row, col: col - 1 });
              scrollToCell(row, col - 1);
            }
            break;
          case "ArrowRight":
            e.preventDefault();
            if (col < maxCol) {
              setSelectedCell({ row, col: col + 1 });
              scrollToCell(row, col + 1);
            }
            break;
          case "Enter":
          case " ":
            e.preventDefault();
            const employee = employees[col];
            const hour = hours[row];
            if (employee && hour) {
              // Assuming handleEmptySlotClick is a function that needs to be defined
              const handleEmptySlotClick = () => {};
              handleEmptySlotClick();
            }
            break;
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedCell, hours, employees]);

    // Helper function to scroll to a specific cell
    const scrollToCell = (row: number, col: number) => {
      const cell = document.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      if (cell && gridRef.current) {
        cell.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    };

    // Fetch expenses useEffect
    useEffect(() => {
      const fetchExpenses = async () => {
        try {
          const userEmail = localStorage.getItem("userEmail");
          if (!userEmail) return;

          const response = await axios.get(
            `${baseUrl}/api/expenses?email=${encodeURIComponent(
              userEmail
            )}&date=${format(selectedDate, "yyyy-MM-dd")}`
          );
          const expensesData = response.data || {};

          setEmployeeExpenses(expensesData);
        } catch (error) {
          console.error("Error fetching expenses:", error);
        }
      };

      fetchExpenses();
    }, [selectedDate, employees]);

    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Date selector */}
        <div className="mb-4 flex items-center gap-2">
          <button
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 1);

              setSelectedDate(newDate);
            }}
          >
            <Lucide icon="ChevronLeft" className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => {
              const newDate = new Date(e.target.value);

              setSelectedDate(newDate);
            }}
            className="px-3 py-2 text-sm font-medium border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />

          <button
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 1);

              setSelectedDate(newDate);
            }}
          >
            <Lucide icon="ChevronRight" className="w-4 h-4" />
          </button>

          <button
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
            onClick={() => {
              const newDate = new Date();

              setSelectedDate(newDate);
            }}
          >
            Today
          </button>
        </div>

        {/* Grid container with scroll */}
        <div
          ref={gridRef}
          className="overflow-auto flex-1 border border-gray-300 dark:border-gray-600 rounded-lg"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgb(156 163 175) transparent",
          }}
        >
          <table className="min-w-full border-collapse h-full">
            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="sticky left-0 z-20 border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800 dark:text-white">TIME</span>
                    <span className="text-sm text-gray-600 dark:text-white">
                      {format(selectedDate, "dd/MM/yyyy")}
                    </span>
                  </div>
                </th>
                {employees.map((employee) => (
                  <th
                    key={employee.id}
                    className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700"
                  >
                    <div className="font-medium text-sm text-gray-800 dark:text-white">
                      {employee.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour, rowIndex) => (
                <tr key={hour}>
                  <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 font-medium text-gray-800 dark:text-white">
                    {hour}
                  </td>
                  {employees.map((employee, colIndex) => {
                    const appointments = selectedDateAppointments.filter(
                      (apt) => {
                        const aptTime = formatAppointmentTime(apt.startTime);
                        const isAssignedToStaff =
                          apt.staff.length === 0 ||
                          apt.staff.includes(employee.id);
                        return aptTime === hour && isAssignedToStaff;
                      }
                    );

                    const handleEmptySlotClick = () => {
                      const timeDate = parse(hour, "h:mm a", new Date());
                      const formattedHour = format(timeDate, "HH:mm");
                      const endTimeDate = addHours(timeDate, 1);
                      const formattedEndHour = format(endTimeDate, "HH:mm");

                      setCurrentEvent({
                        title: "",
                        dateStr: format(selectedDate, "yyyy-MM-dd"),
                        startTimeStr: formattedHour,
                        endTimeStr: formattedEndHour,
                        extendedProps: {
                          address: "",
                          appointmentStatus: "new",
                          staff: [employee.id],
                          dateAdded: new Date().toISOString(),
                          tags: [],
                          details: "",
                          meetLink: "",
                        },
                      });

                      setSelectedEmployeeIds([employee.id]);
                      setAddModalOpen(true);
                    };

                    return (
                      <td
                        key={`${employee.id}-${hour}`}
                        data-row={rowIndex}
                        data-col={colIndex}
                        className={`border border-gray-300 dark:border-gray-600 p-2 min-w-[200px] relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedCell?.row === rowIndex &&
                          selectedCell?.col === colIndex
                            ? "ring-2 ring-primary ring-inset"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedCell({ row: rowIndex, col: colIndex });
                          if (appointments.length === 0) {
                            handleEmptySlotClick();
                          }
                        }}
                        tabIndex={0}
                      >
                        {appointments.map((apt) => (
                          <div
                            key={apt.id}
                            className="text-xs p-2 mb-1 rounded cursor-pointer hover:opacity-90 text-white"
                            style={{
                              backgroundColor: "#51484f",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppointmentClick(apt);
                            }}
                          >
                            <div className="font-medium flex justify-between items-center">
                              <span>{apt.title || "Untitled"}</span>
                              {apt.appointmentStatus && (
                                <span className="text-xs px-1 rounded bg-white/20 text-white">
                                  {apt.appointmentStatus}
                                </span>
                              )}
                            </div>

                            {apt.address && (
                              <div className="text-xs mt-1 opacity-75 text-white">
                                📍 {apt.address}
                              </div>
                            )}

                            <div className="text-xs mt-1 opacity-75 text-white">
                              {formatAppointmentTime(apt.startTime)} -{" "}
                              {formatAppointmentTime(apt.endTime)}
                            </div>
                          </div>
                        ))}
                        {appointments.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100">
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              Click to add appointment
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 font-medium text-gray-800 dark:text-white">
                  MINYAK & TOL
                </td>
                {employees.map((employee) => {
                  const expenses = employeeExpenses[employee.id] || {
                    minyak: 0,
                    toll: 0,
                  };

                  const handleExpenseChange = async (
                    type: "minyak" | "toll",
                    value: number
                  ) => {
                    try {
                      const userEmail = localStorage.getItem("userEmail");
                      if (!userEmail) return;

                      const newExpenses = {
                        ...expenses,
                        [type]: value,
                      };

                      setEmployeeExpenses((prev) => ({
                        ...prev,
                        [employee.id]: newExpenses,
                      }));

                      await axios.put(`${baseUrl}/api/expenses`, {
                        email: userEmail,
                        date: format(selectedDate, "yyyy-MM-dd"),
                        employeeId: employee.id,
                        expenses: newExpenses,
                      });
                    } catch (error) {
                      console.error("Error updating expense:", error);
                    }
                  };
                  return (
                    <td
                      key={`${employee.id}-expenses`}
                      className="border border-gray-300 dark:border-gray-600 p-2"
                    >
                      <div className="text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span>Minyak:</span>
                          <div className="flex items-center">
                            <span className="mr-1">RM</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="w-20 px-2 py-1 text-right border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={
                                expenses.minyak === 0
                                  ? "0"
                                  : expenses.minyak || ""
                              }
                              onChange={(e) => {
                                const value =
                                  e.target.value === ""
                                    ? 0
                                    : parseFloat(e.target.value);
                                handleExpenseChange("minyak", value);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span>Toll:</span>
                          <div className="flex items-center">
                            <span className="mr-1">RM</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="w-20 px-2 py-1 text-right border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={
                                expenses.toll === 0 ? "0" : expenses.toll || ""
                              }
                              onChange={(e) => {
                                const value =
                                  e.target.value === ""
                                    ? 0
                                    : parseFloat(e.target.value);
                                handleExpenseChange("toll", value);
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between font-medium border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
                          <span>Total:</span>
                          <span>
                            RM{" "}
                            {(
                              (expenses.minyak || 0) + (expenses.toll || 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Scroll indicators */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Use arrow keys to navigate or scroll to view more
        </div>
      </div>
    );
  };

  // Modify the return statement to include the view toggle button and conditional rendering
  return (
    <>
      {/* Modern toolbar */}
      <div className="mt-6 intro-y">
        <div className="w-full bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 px-3 sm:px-5 py-3 sm:py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: primary actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View toggle (calendar vs slots grid) */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => setViewType("calendar")}
                  className={`px-3 py-2 text-sm font-medium flex items-center gap-2 ${
                    viewType === "calendar"
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <Lucide icon="Calendar" className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
                <button
                  onClick={() => setViewType("grid")}
                  className={`px-3 py-2 text-sm font-medium flex items-center gap-2 ${
                    viewType === "grid"
                      ? "bg-primary text-white"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <Lucide icon="TableProperties" className="w-4 h-4" />
                  <span className="hidden sm:inline">Slots</span>
                </button>
              </div>

              {companyId === "0153" && (
                <button
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90"
                  onClick={() => navigate("/appointment-requests")}
                >
                  <Lucide icon="ClipboardList" className="w-4 h-4" />
                  <span className="hidden sm:inline">Requests</span>
                </button>
              )}

              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                onClick={() => setIsBookingLinkModalOpen(true)}
              >
                <Lucide icon="Link" className="w-4 h-4" />
                <span className="hidden sm:inline">Booking Link</span>
              </button>

              {/* Add appointment */}
              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
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
                <Lucide icon="FilePenLine" className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>

            {/* Right: filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick search */}
              <div className="relative">
                <Lucide icon="Search" className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search appointments..."
                  className="pl-7 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Employee select */}
              {employees.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedEmployeeId}
                    onChange={handleEmployeeChange}
                    className="px-2 py-2 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 appearance-none"
                  >
                    <option value="">All Staff</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status */}
              <select
                value={filterStatus}
                onChange={handleStatusFilterChange}
                className="px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="">All</option>
                <option value="new">New</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="showed">Showed</option>
                <option value="noshow">No Show</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="lost">Lost</option>
                <option value="closed">Closed</option>
              </select>

              {/* Date */}
              <div className="relative">
                <input
                  type="date"
                  value={filterDate}
                  onChange={handleDateFilterChange}
                  className="px-2 py-2 pr-8 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate("")}
                    className="absolute right-1.5 top-1.5 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Clear date filter"
                  >
                    <Lucide icon="X" className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Settings */}
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setIsCalendarConfigOpen(true)}
                title="Calendar settings"
              >
                <Lucide icon="Settings" className="w-4 h-4" />
              </button>
              <button
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => setIsReminderSettingsOpen(true)}
                title="Reminder settings"
              >
                <Lucide icon="Bell" className="w-4 h-4" />
              </button>
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
            <div 
              className="h-full rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-xl overflow-hidden appointments-container"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.8) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}
            >
              <div className="p-6">
                {/* Enhanced header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Appointments
                    </h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'}
                    </p>
                    </div>
                  
                  {/* Modern status legend */}
                  <div className="flex flex-wrap gap-1">
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      <div className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full mr-1"></div>
                      New
                    </div>
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300">
                      <div className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full mr-1"></div>
                      Confirmed
                    </div>
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300">
                      <div className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full mr-1"></div>
                      Cancelled
                    </div>
                  </div>
                </div>

                {/* Enhanced appointments list */}
                <div className="space-y-3 max-h-[calc(100vh-20rem)] sm:max-h-[calc(100vh-16rem)] overflow-y-auto pr-2 scrollbar-custom pb-4">
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((appointment, index) => {
                      const statusColors: Record<string, { bg: string; border: string; accent: string; text: string; darkBg: string; darkBorder: string; darkText: string }> = {
                        new: { 
                          bg: 'from-gray-50 to-gray-100', 
                          border: 'border-gray-200', 
                          accent: 'bg-gray-500', 
                          text: 'text-gray-700',
                          darkBg: 'dark:from-gray-700 dark:to-gray-800',
                          darkBorder: 'dark:border-gray-600',
                          darkText: 'dark:text-gray-200'
                        },
                        showed: { 
                          bg: 'from-blue-50 to-indigo-100', 
                          border: 'border-blue-200', 
                          accent: 'bg-blue-500', 
                          text: 'text-blue-700',
                          darkBg: 'dark:from-blue-900 dark:to-indigo-900',
                          darkBorder: 'dark:border-blue-600',
                          darkText: 'dark:text-blue-200'
                        },
                        cancelled: { 
                          bg: 'from-red-50 to-rose-100', 
                          border: 'border-red-200', 
                          accent: 'bg-red-500', 
                          text: 'text-red-700',
                          darkBg: 'dark:from-red-900 dark:to-rose-900',
                          darkBorder: 'dark:border-red-600',
                          darkText: 'dark:text-red-200'
                        },
                        confirmed: { 
                          bg: 'from-emerald-50 to-green-100', 
                          border: 'border-emerald-200', 
                          accent: 'bg-emerald-500', 
                          text: 'text-emerald-700',
                          darkBg: 'dark:from-emerald-900 dark:to-green-900',
                          darkBorder: 'dark:border-emerald-600',
                          darkText: 'dark:text-emerald-200'
                        },
                        noshow: { 
                          bg: 'from-orange-50 to-amber-100', 
                          border: 'border-orange-200', 
                          accent: 'bg-orange-500', 
                          text: 'text-orange-700',
                          darkBg: 'dark:from-orange-900 dark:to-amber-900',
                          darkBorder: 'dark:border-orange-600',
                          darkText: 'dark:text-orange-200'
                        },
                        rescheduled: { 
                          bg: 'from-cyan-50 to-sky-100', 
                          border: 'border-cyan-200', 
                          accent: 'bg-cyan-500', 
                          text: 'text-cyan-700',
                          darkBg: 'dark:from-cyan-900 dark:to-sky-900',
                          darkBorder: 'dark:border-cyan-600',
                          darkText: 'dark:text-cyan-200'
                        },
                        lost: { 
                          bg: 'from-gray-50 to-slate-100', 
                          border: 'border-gray-300', 
                          accent: 'bg-gray-600', 
                          text: 'text-gray-600',
                          darkBg: 'dark:from-gray-800 dark:to-slate-800',
                          darkBorder: 'dark:border-gray-500',
                          darkText: 'dark:text-gray-300'
                        },
                        closed: { 
                          bg: 'from-purple-50 to-violet-100', 
                          border: 'border-purple-200', 
                          accent: 'bg-purple-500', 
                          text: 'text-purple-700',
                          darkBg: 'dark:from-purple-900 dark:to-violet-900',
                          darkBorder: 'dark:border-purple-600',
                          darkText: 'dark:text-purple-200'
                        },
                      };
                      
                      const statusStyle = statusColors[appointment.appointmentStatus?.toLowerCase() || 'new'] || statusColors.new;
                      
                      return (
                        <div
                          key={index}
                          onClick={() => handleAppointmentClick(appointment)}
                          className={`group relative rounded-xl border ${statusStyle.border} ${statusStyle.darkBorder} bg-gradient-to-br ${statusStyle.bg} ${statusStyle.darkBg} transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 overflow-hidden`}
                        >
                          {/* Status accent bar */}
                          <div className={`absolute top-0 left-0 right-0 h-1 ${statusStyle.accent} opacity-80`}></div>
                          
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Status indicator */}
                              <div className={`w-3 h-3 rounded-full ${statusStyle.accent} mt-1.5 shadow-sm flex-shrink-0`}></div>
                              
                              <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                  <h3 className={`text-lg font-semibold ${statusStyle.text} ${statusStyle.darkText} truncate pr-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors`}>
                                    {appointment.title}
                                  </h3>
                                  <div className="text-right text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    <div className="font-medium">
                                      {new Date(appointment.startTime).toLocaleString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                      {new Date(appointment.startTime).toLocaleString("en-US", {
                                        hour: "numeric",
                                        minute: "numeric",
                                        hour12: true,
                                      })}{" "}
                                      -{" "}
                                      {new Date(appointment.endTime).toLocaleString("en-US", {
                                        hour: "numeric",
                                        minute: "numeric",
                                        hour12: true,
                                      })}
                                    </div>
                                  </div>
                                </div>

                                {/* Contacts */}
                                {appointment.contacts && appointment.contacts.length > 0 && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="text-gray-400 dark:text-gray-500">👤</div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium truncate">
                                      {appointment.contacts.map((c) => c.name).join(", ")}
                                    </span>
                                  </div>
                                )}

                                {/* Tags */}
                                {appointment.tags && appointment.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {appointment.tags.slice(0, 2).map((tag) => (
                                      <span
                                        key={tag.id}
                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/60 dark:bg-gray-700/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-600"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                    {appointment.tags.length > 2 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                                        +{appointment.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Details preview */}
                                {appointment.details && (
                                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 italic">
                                    {appointment.details}
                                  </div>
                                )}

                                {/* Action icons */}
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-600/50">
                                  <div className="flex items-center gap-2">
                                    {appointment.meetLink && (
                                      <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                                        <span className="text-xs">📹</span>
                                      </div>
                                    )}
                                    {appointment.address && (
                                      <div className="w-6 h-6 rounded-md bg-green-100 dark:bg-green-800 flex items-center justify-center">
                                        <span className="text-xs">📍</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle.bg} ${statusStyle.darkBg} ${statusStyle.text} ${statusStyle.darkText} capitalize`}>
                                    {appointment.appointmentStatus || 'new'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-lg mb-2">📅</div>
                      <div className="text-gray-500 font-medium">No appointments yet</div>
                      <div className="text-gray-400 text-sm">Your upcoming appointments will appear here</div>
                    </div>
                  )}
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

        {/* Calendar/Grid View */}
        <div
          className={`${
            isMobile ? (mobileTab === "calendar" ? "block" : "hidden") : ""
          } md:col-span-8 xl:col-span-8 2xl:col-span-9`}
        >
          <div className="p-0 sm:p-5 box intro-y">
            {viewType === "calendar" ? (
              <CalendarErrorBoundary>
                <div
                  className="calendar-container"
                  style={{ height: isMobile ? "calc(100vh - 290px)" : "calc(100vh - 220px)", overflowY: "auto" }}
                >
                  <FullCalendar {...calendarOptions} ref={calendarRef} />
                </div>
              </CalendarErrorBoundary>
            ) : (
              <GridView />
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
          className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:opacity-90"
          aria-label="Add appointment"
        >
          <Lucide icon="Plus" className="w-6 h-6" />
        </button>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10 dark:bg-gray-800">
              <div className="flex items-center p-4 border-b dark:border-gray-700">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                  <Lucide icon="User" className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl dark:text-white">
                    Edit Appointment
                  </span>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.title || ""}
                    onChange={(e) =>
                      setCurrentEvent({
                        ...currentEvent,
                        title: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  />
                </div>

                {/* Date and Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </label>
                  <input
                    type="date"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.dateStr || ""}
                    onChange={handleDateChange}
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">
                        Start Time
                      </label>
                      <input
                        type="time"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">
                        End Time
                      </label>
                      <input
                        type="time"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={currentEvent?.endTimeStr || ""}
                        min={currentEvent?.startTimeStr || "00:00"}
                        onChange={(e) => {
                          const endTime = e.target.value;
                          if (
                            endTime <= (currentEvent?.startTimeStr || "00:00")
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
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Appointment Status
                  </label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.extendedProps?.appointmentStatus || ""}
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
                    <option value="" disabled>
                      Set a status
                    </option>
                    <option value="new">New</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="showed">Showed</option>
                    <option value="noshow">No Show</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="lost">Lost</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Appointment Type
                  </label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={
                      currentEvent?.extendedProps?.appointmentType || "general"
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
                    <option value="general">General</option>
                    <option value="consultation">Consultation</option>
                    <option value="service">Service</option>
                    <option value="installation">Installation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="repair">Repair</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Google Meet Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  </div>
                  {currentEvent?.extendedProps?.meetLink && (
                    <div className="flex justify-between items-center mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <a
                        href={currentEvent.extendedProps.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                      >
                        Open Meet Link
                      </a>
                      <button
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
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
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Meeting link will be sent to contacts when you save
                      </div>
                    )}
                  {currentEvent?.extendedProps?.notificationSent && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Meeting link has been sent to contacts
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tags
                  </label>
                  <Select
                    isMulti
                    options={appointmentTags.map((tag: any) => ({
                      value: tag.id,
                      label: tag.name,
                    }))}
                    value={
                      currentEvent?.extendedProps?.tags?.map((tag: any) => ({
                        value: tag.id,
                        label: tag.name,
                      })) || []
                    }
                    onChange={handleTagChange}
                    className="capitalize"
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isFocused
                          ? "#ffffff"
                          : "#f9fafb", // Light mode background
                        borderColor: state.isFocused ? "#2563eb" : "#d1d5db", // Light mode border
                        boxShadow: state.isFocused
                          ? "0 0 0 1px #2563eb"
                          : "none", // Light mode shadow
                        "&:hover": {
                          borderColor: "#2563eb", // Light mode hover border
                        },
                        "&.dark": {
                          backgroundColor: state.isFocused
                            ? "#374151"
                            : "#1f2937", // Dark mode background
                          borderColor: state.isFocused ? "#3b82f6" : "#4b5563", // Dark mode border
                          boxShadow: state.isFocused
                            ? "0 0 0 1px #3b82f6"
                            : "none", // Dark mode shadow
                          "&:hover": {
                            borderColor: "#3b82f6", // Dark mode hover border
                          },
                        },
                      }),
                      menu: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.selectProps.menuIsOpen
                          ? "#ffffff"
                          : "#f9fafb", // Light mode menu background
                        "&.dark": {
                          backgroundColor: state.selectProps.menuIsOpen
                            ? "#374151"
                            : "#1f2937", // Dark mode menu background
                        },
                      }),
                      multiValue: (provided, state) => ({
                        ...provided,
                        backgroundColor: "#e5e7eb", // Light mode multi-value background
                        "&.dark": {
                          backgroundColor: "#4b5563", // Dark mode multi-value background
                        },
                      }),
                      multiValueLabel: (provided, state) => ({
                        ...provided,
                        color: "#1f2937", // Light mode multi-value label color
                        "&.dark": {
                          color: "#d1d5db", // Dark mode multi-value label color
                        },
                      }),
                      multiValueRemove: (provided, state) => ({
                        ...provided,
                        color: "#1f2937", // Light mode multi-value remove color
                        "&:hover": {
                          backgroundColor: "#d1d5db", // Light mode multi-value remove hover background
                          color: "#111827", // Light mode multi-value remove hover color
                        },
                        "&.dark": {
                          color: "#d1d5db", // Dark mode multi-value remove color
                          "&:hover": {
                            backgroundColor: "#6b7280", // Dark mode multi-value remove hover background
                            color: "#f9fafb", // Dark mode multi-value remove hover color
                          },
                        },
                      }),
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Staff
                  </label>
                  <div className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 dark:bg-gray-700 dark:border-gray-600">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`employee-${employee.id}`}
                          checked={currentEvent?.extendedProps?.staff.includes(
                            employee.id
                          )}
                          onChange={() => handleStaffChange(employee.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                        />
                        <label
                          htmlFor={`employee-${employee.id}`}
                          className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          {employee.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contacts
                  </label>
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
                      control: (base) => ({
                        ...base,
                        minHeight: "42px",
                        borderColor: "rgb(209 213 219)",
                        backgroundColor: "white",
                        "&:hover": {
                          borderColor: "rgb(107 114 128)",
                        },
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? "#1e40af"
                          : state.isFocused
                          ? "#e5e7eb"
                          : "white",
                        color: state.isSelected ? "white" : "black",
                        "&:active": {
                          backgroundColor: "#1e40af",
                        },
                      }),
                    }}
                    placeholder="Select contact..."
                    isClearable
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Additional Details
                  </label>
                  <textarea
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                </div>
                {/* <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-medium mb-4 dark:text-white">Reminder Settings</h3>
                  
                  {selectedContact ? (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enable-reminders"
                          checked={currentEvent?.reminders?.enabled ?? true}
                          onChange={(e) => {
                            const defaultOptions = [
                              { type: '24h', enabled: true, message: "Your appointment is tomorrow" },
                              { type: '3h', enabled: true, message: "Your appointment is in 3 hours" },
                              { type: '1h', enabled: true, message: "Your appointment is in 1 hour" },
                              { type: 'after', enabled: true, message: "Thank you for your visit today" }
                            ];

                            setCurrentEvent((prev: any) => ({
                              ...prev,
                              reminders: {
                                enabled: e.target.checked,
                                options: prev?.reminders?.options || defaultOptions
                              }
                            }));
                          }}
                          className="mr-2"
                        />
                        <label htmlFor="enable-reminders" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Enable appointment reminders
                        </label>
                      </div>

                      {currentEvent?.reminders?.enabled && (
                        <div className="space-y-4 pl-6">
                          {[
                            { type: '24h', label: '24 Hour Reminder', defaultMessage: "Your appointment is tomorrow" },
                            { type: '3h', label: '3 Hour Reminder', defaultMessage: "Your appointment is in 3 hours" },
                            { type: '1h', label: '1 Hour Reminder', defaultMessage: "Your appointment is in 1 hour" },
                            { type: 'after', label: 'Post-Appointment Message (1 hour after)', defaultMessage: "Thank you for your visit today" }
                          ].map(({ type, label, defaultMessage }) => (
                            <div key={type} className="space-y-2">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`${type}-reminder`}
                                  checked={currentEvent?.reminders?.options?.find((o: any) => o.type === type)?.enabled ?? true}
                                  onChange={(e) => {
                                    setCurrentEvent((prev: any) => {
                                      const options = [...(prev?.reminders?.options || [])];
                                      const index = options.findIndex(o => o.type === type);
                                      
                                      if (index >= 0) {
                                        options[index] = { ...options[index], enabled: e.target.checked };
                                      } else {
                                        options.push({ type, enabled: e.target.checked, message: defaultMessage });
                                      }

                                      return {
                                        ...prev,
                                        reminders: {
                                          ...prev?.reminders,
                                          options
                                        }
                                      };
                                    });
                                  }}
                                  className="mr-2"
                                />
                                <label htmlFor={`${type}-reminder`} className="text-sm text-gray-700 dark:text-gray-300">
                                  {label}
                                </label>
                              </div>
                              {currentEvent?.reminders?.options?.find((o: any) => o.type === type)?.enabled && (
                                <textarea
                                  value={currentEvent?.reminders?.options?.find((o: any) => o.type === type)?.message || defaultMessage}
                                  onChange={(e) => {
                                    setCurrentEvent((prev: any) => {
                                      const options = [...(prev?.reminders?.options || [])];
                                      const index = options.findIndex(o => o.type === type);
                                      
                                      if (index >= 0) {
                                        options[index] = { ...options[index], message: e.target.value };
                                      } else {
                                        options.push({ type, enabled: true, message: e.target.value });
                                      }

                                      return {
                                        ...prev,
                                        reminders: {
                                          ...prev?.reminders,
                                          options
                                        }
                                      };
                                    });
                                  }}
                                  className="w-full mt-1 text-sm rounded-md border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  rows={2}
                                  placeholder={`Enter ${label.toLowerCase()} message...`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Select contacts to enable reminder settings
                    </div>
                  )}
                </div> */}
              </div>
              <div className="flex justify-end mt-6 space-x-2">
                {currentEvent?.id && (
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                    onClick={() => {
                      handleDeleteAppointment(currentEvent.id);
                      setEditModalOpen(false);
                    }}
                  >
                    Delete
                  </button>
                )}
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                {initialAppointmentStatus !== "showed" &&
                  initialAppointmentStatus !== "noshow" && (
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
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

      {/* Add Modal */}
      {addModalOpen && (
        <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10 dark:bg-gray-800">
              <div className="flex items-center p-4 border-b dark:border-gray-700">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                  <Lucide icon="User" className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl dark:text-white">
                    Add New Appointment
                  </span>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.title || ""}
                    onChange={(e) =>
                      setCurrentEvent({
                        ...currentEvent,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </label>
                  <input
                    type="date"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.dateStr || ""}
                    onChange={handleDateChange}
                  />
                </div>
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">
                        Start Time
                      </label>
                      <input
                        type="time"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400">
                        End Time
                      </label>
                      <input
                        type="time"
                        className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={currentEvent?.endTimeStr || ""}
                        min={currentEvent?.startTimeStr || "00:00"}
                        onChange={(e) => {
                          const endTime = e.target.value;
                          if (
                            endTime <= (currentEvent?.startTimeStr || "00:00")
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
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Staff
                  </label>
                  <div className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 dark:bg-gray-700 dark:border-gray-600">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`employee-${employee.id}`}
                          checked={selectedEmployeeIds.includes(employee.id)}
                          onChange={() =>
                            handleStaffChangeAddModal(employee.id)
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                        />
                        <label
                          htmlFor={`employee-${employee.id}`}
                          className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          {employee.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Appointment Status
                  </label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.extendedProps?.appointmentStatus || ""}
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
                    <option value="" disabled>
                      Set a status
                    </option>
                    <option value="new">New</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="showed">Showed</option>
                    <option value="noshow">No Show</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="lost">Lost</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Appointment Type
                  </label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={
                      currentEvent?.extendedProps?.appointmentType || "general"
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
                    <option value="general">General</option>
                    <option value="consultation">Consultation</option>
                    <option value="service">Service</option>
                    <option value="installation">Installation</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="repair">Repair</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tags
                  </label>
                  <Select
                    isMulti
                    options={appointmentTags.map((tag: any) => ({
                      value: tag.id,
                      label: tag.name,
                    }))}
                    value={
                      currentEvent?.extendedProps?.tags?.map((tag: any) => ({
                        value: tag.id,
                        label: tag.name,
                      })) || []
                    }
                    onChange={handleTagChange}
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contacts
                  </label>
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
                    className="capitalize dark:bg-gray-700 dark:text-white"
                    placeholder="Select contact..."
                    isClearable
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                  Additional Details
                </label>
                <textarea
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              </div>
              <div className="flex justify-end mt-6 space-x-2">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                  onClick={() => {
                    setAddModalOpen(false);
                    setSelectedContact(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  onClick={handleAddAppointment}
                >
                  Save
                </button>
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