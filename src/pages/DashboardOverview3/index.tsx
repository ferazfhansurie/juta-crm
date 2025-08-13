import { useEffect, useState, useMemo } from "react";
import Chart from "@/components/Base/Chart";
import { ChartData, ChartOptions } from "chart.js/auto";
import BarChart from "@/components/ReportBarChart1";
import clsx from "clsx";
import Button from "@/components/Base/Button";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateCertificate } from "@/utils/pdfCert";


// Replace with your published CSV URLs
// CSV URL for MTDC Participants Submissions
const RSVP_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9Wlb5GVpeT1FUavQdufnLukU1oyRWh1AaKKSJlGoFAAgjqxIh4JeHcNkK58JHT4BBP_qrkQacDtYc/pub?output=csv";
const FEEDBACK_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRF9tqpNSgFqdvgPBYvspa84gX1_0y06oUokzZ9p-_LSv4qrxtJqUCN66_dFFsMcQ/pub?output=csv";
const AI_HORIZON_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs940ohQfGSntt_R3wkLw8sVDt7gRnvwB4W9WwmmWjrV49MstVq0Rz097egHvvDcBj9YXu97EO64Ep/pub?output=csv";

// Neon database base URL
const baseUrl = "http://localhost:8443";

// Custom PieChart component that accepts data, labels, and colors
interface CustomPieChartProps {
  data: number[];
  labels: string[];
  colors: string[];
  width?: number;
  height?: number;
  className?: string;
}

const CustomPieChart: React.FC<CustomPieChartProps> = ({ 
  data, 
  labels, 
  colors, 
  width = 400, 
  height = 400, 
  className = "" 
}) => {
  const chartData: ChartData = useMemo(() => {
    // Ensure we have valid data
    const validData = data.filter((value, index) => value > 0 && labels[index]);
    const validLabels = labels.filter((label, index) => data[index] > 0);
    
    // Ensure colors array matches data length
    const validColors = validData.map((_, index) => colors[index % colors.length]);
    
    return {
      labels: validLabels,
      datasets: [
        {
          data: validData,
          backgroundColor: validColors,
          hoverBackgroundColor: validColors,
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  }, [data, labels, colors]);

  const options: ChartOptions = useMemo(() => {
    return {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            padding: 20,
            usePointStyle: true,
          },
        },
        tooltip: {
          enabled: true,
        },
      },
    };
  }, []);

  // Don't render if no valid data
  if (!data || data.length === 0 || data.every(val => val === 0)) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="text-gray-500 text-center">
          <div className="text-lg font-semibold">No Data Available</div>
          <div className="text-sm">Select a program to view statistics</div>
        </div>
      </div>
    );
  }

  return (
    <Chart
      type="pie"
      width={width}
      height={height}
      data={chartData}
      options={options}
      className={className}
      getRef={() => {}}
    />
  );
};

function useSheetData(url: string) {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    // Add cache-busting parameter to force fresh fetch
    const cacheBustUrl = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
    
    fetch(cacheBustUrl)
      .then((res) => res.text())
      .then((text) => {
        // Parse as comma-separated (the default)
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
  
            setData(results.data);
          },
        });
      });
  }, [url]);
  return data;
}


function normalizeEmail(email: string) {
  return (email || "").trim().toLowerCase();
}

function normalizeProgramName(name: string) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ") // remove punctuation
    .replace(/\s+/g, " ")         // collapse spaces
    .trim();
}

// Remove date prefixes from program names (e.g., "14 May - Generative AI..." -> "Generative AI...")
function cleanProgramName(name: string) {
  if (!name) return 'Unspecified';
  
  // Remove patterns like "14 May - ", "5 May - ", "26 May - " etc.
  // Handle all variations: "5 May - ", "5 May-", "5 May ", etc.
  let cleaned = name
    .replace(/^\d{1,2}\s+[A-Za-z]+(\s*[-–]\s*|\s*$)/, '')  // "5 May - ", "5 May-", "5 May ", etc.
    .trim();
  
  // Remove date in parentheses (e.g., "(01/01/2023 10:00:00)")
  cleaned = cleaned.replace(/\s*\(\d{1,2}\/\d{1,2}\/\d{4}.*\)/, '').trim();
  
  // Remove "(Unspecified)" or similar non-date suffixes in parentheses
  cleaned = cleaned.replace(/\s*\(Unspecified\)/i, '').trim();
  
  // Remove specific date strings like ", 26 May" or ", 5 May"
  cleaned = cleaned.replace(/,\s*\d{1,2}\s+\w+/, '').trim();
  
  // Remove specific long suffixes that might contain dates or other info
  cleaned = cleaned.replace(/,\s*\d{1,2}\s+\w+\s*-\s*AI-Powered Visibility: Leveraging Google Business Profile \(GBP\) to Grow Your Business/, '').trim();
  cleaned = cleaned.replace(/,\s*\d{1,2}\s+\w+\s*-\s*Generative AI in Social Media Marketing/, '').trim();
  
  // Handle complex AI Horizon combinations - keep the most descriptive part
  // For combinations like "A - B - C", keep the longest meaningful part
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ').map(part => part.trim()).filter(part => part.length > 0);
    if (parts.length > 1) {
      // Find the part with the most descriptive content (longest meaningful part)
      const meaningfulParts = parts.filter(part => 
        part.length > 10 && // Must be reasonably long
        !part.match(/^\d{1,2}\s+[A-Za-z]+$/) && // Not just a date
        !part.match(/^[A-Za-z\s]+$/) // Not just generic words
      );
      
      if (meaningfulParts.length > 0) {
        // Return the longest meaningful part
        return meaningfulParts.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        );
      } else {
        // If no meaningful parts, return the longest part
        return parts.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        );
      }
    }
  }
  
  // If the result is empty or just whitespace, return 'Unspecified'
  return cleaned || 'Unspecified';
}

function getProgramFront(name: string, wordCount = 3) {
  const cleaned = cleanProgramName(name);
  const normalized = normalizeProgramName(cleaned);
  return normalized.split(" ").slice(0, wordCount).join(" ");
}

const feedbackMetrics = [
  { key: "How would you rate overall session?", label: "Overall satisfaction" },
  { key: "How effective was the trainer delivering the content?", label: "Trainer effectiveness" },
  { key: "How relevant was the content to your interests or role?", label: "Content relevance" },
  { key: "Does the training meet your expectations?", label: "Fulfilment of expectations" },
  { key: "How would you rate the event venue?", label: "Event venue/facility" },
  { key: "How satisfied were you with the opportunities for interaction (e.g., Q&A sessions, networking)? ", label: "Networking opportunities" },
  // Add more as needed
];

function average(arr: any[]) {
  if (!arr.length) return 0;
  return arr.reduce((a: any, b: any) => a + b, 0) / arr.length;
}

// Helper to extract date from Daftar Kursus (AI Horizon)
function extractDateFromDaftarKursus(daftar = "") {
  // Try to extract a date at the start, e.g. "14 May – Generative AI..."
  const match = daftar.match(/^([0-9]{1,2} [A-Za-z]+)[–-]/);
  if (match) {
    const dateStr = match[1];
    // Convert to DD/MM/YYYY format for consistency
    const dateMatch = dateStr.match(/(\d{1,2}) ([A-Za-z]+)/);
    if (dateMatch) {
      const day = dateMatch[1];
      const monthName = dateMatch[2];
      const monthMap: { [key: string]: string } = {
        'January': '01', 'Jan': '01',
        'February': '02', 'Feb': '02',
        'March': '03', 'Mar': '03',
        'April': '04', 'Apr': '04',
        'May': '05',
        'June': '06', 'Jun': '06',
        'July': '07', 'Jul': '07',
        'August': '08', 'Aug': '08',
        'September': '09', 'Sep': '09',
        'October': '10', 'Oct': '10',
        'November': '11', 'Nov': '11',
        'December': '12', 'Dec': '12'
      };
      const month = monthMap[monthName];
      if (month) {
        // Use 2025 for all AI Horizon programs
        const year = 2025;
        return `${day}/${month}/${year} 09:00:00`;
      }
    }
  }
  return "";
}

// Helper to download CSV from array of objects
function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper to download Excel from array of objects
function downloadExcel(data: any[], filename: string) {
  if (!data || !data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename);
}

// Helper to download PDF from array of objects
function downloadPDF(data: any[], filename: string) {
  if (!data || !data.length) return;
  const doc = new jsPDF();
  const columns = Object.keys(data[0] || {});
  const rows = data.map(row => columns.map(col => row[col] ?? ""));
  autoTable(doc, {
    head: [columns],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  doc.save(filename);
}

// Helper function to get company data from NeonDB
const getCompanyApiUrl = async () => {
  const userEmail = localStorage.getItem("userEmail");
  if (!userEmail) {
    throw new Error("No user email found");
  }

  const response = await fetch(
    `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
      userEmail
    )}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch company data");
  }

  const data = await response.json();

  return {
    apiUrl:
      data.companyData.api_url || baseUrl,
    companyId: data.userData.companyId,
  };
};

// Helper to upload a file to NeonDB storage and get a public URL
const uploadFile = async (file: File | Blob, fileName: string): Promise<string> => {
  const { apiUrl, companyId } = await getCompanyApiUrl();
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', fileName);
  formData.append('companyId', companyId);
  
  const response = await fetch(`${apiUrl}/api/upload-file`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload file');
  }
  
  const result = await response.json();
  return result.url;
};

// Helper to send a WhatsApp document message
const sendDocumentMessage = async (chatId: string, documentUrl: string, fileName: string, caption: string) => {
  const { apiUrl, companyId } = await getCompanyApiUrl();
  const userName = localStorage.getItem("userName") || localStorage.getItem("userEmail") || '';
  // Use phoneIndex 0 for now (or extend if needed)
  const phoneIndex = 0;
  const response = await fetch(`${apiUrl}/api/v2/messages/document/${companyId}/${chatId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentUrl: documentUrl,
      filename: fileName,
      phoneIndex: phoneIndex,
      userName: userName,
    }),
  });
  if (!response.ok) throw new Error(`API failed with status ${response.status}`);
  return await response.json();
};

// Helper to send a WhatsApp text message
const sendTextMessage = async (chatId: string, text: string) => {
  const { apiUrl, companyId } = await getCompanyApiUrl();
  const userName = localStorage.getItem("userName") || localStorage.getItem("userEmail") || '';
  const phoneIndex = 0;
  const response = await fetch(`${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      phoneIndex: phoneIndex,
      userName: userName,
    }),
  });
  if (!response.ok) throw new Error(`API failed with status ${response.status}`);
  return await response.json();
};

function DashboardOverview3() {
  const rsvpData = useSheetData(RSVP_CSV_URL);
  const aiHorizonRSVP = useSheetData(AI_HORIZON_CSV_URL);
  const feedbackData = useSheetData(FEEDBACK_CSV_URL);
  const [selectedProgram, setSelectedProgram] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
  const [showAllProgramsInCategory, setShowAllProgramsInCategory] = useState(false);
  // Search/filter state for raw data tables
  const [participantSearch, setParticipantSearch] = useState("");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("");
  
  // Additional filters for participants table
  const [participantProgramFilter, setParticipantProgramFilter] = useState("");
  const [participantCategoryFilter, setParticipantCategoryFilter] = useState("");
  const [participantProfessionFilter, setParticipantProfessionFilter] = useState("");
  const [participantStatusFilter, setParticipantStatusFilter] = useState("");
  const [participantAttendanceFilter, setParticipantAttendanceFilter] = useState("");
  
  // Additional filters for feedback table
  const [feedbackDateFilter, setFeedbackDateFilter] = useState("");
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.program-dropdown')) {
        setProgramDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-select "All Programs in Category" when category is selected (for participant filters)
  useEffect(() => {
    if (participantCategoryFilter && !participantProgramFilter) {
      // Only auto-select if no program is currently selected
      setParticipantProgramFilter(`all_in_category_${participantCategoryFilter}`);
    } else if (!participantCategoryFilter && participantProgramFilter.startsWith('all_in_category_')) {
      // Clear the special program filter when category is cleared
      setParticipantProgramFilter("");
    }
  }, [participantCategoryFilter]);

  // Auto-select "All Programs in Category" when category is selected (for Program-Specific Dashboard)
  useEffect(() => {
    if (selectedCategory && !showAllProgramsInCategory && selectedProgram === 0) {
      // Auto-select "All Programs in Category" when a category is selected and no specific program is selected
      setShowAllProgramsInCategory(true);
      setSelectedProgram(-1); // Special value to indicate "All Programs in Category"
    } else if (!selectedCategory && showAllProgramsInCategory) {
      // Clear the "All Programs in Category" state when category is cleared
      setShowAllProgramsInCategory(false);
      setSelectedProgram(0);
    }
  }, [selectedCategory]);

  // Add state for modal/progress
  const [sendingModalOpen, setSendingModalOpen] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<any[]>([]);
  const [sendingInProgress, setSendingInProgress] = useState(false);

  // Add state for selected program for sending certificates
  const [selectedSendProgram, setSelectedSendProgram] = useState<string>("");

  // Add state for attendees to send (with selection)
  const [attendeesToSend, setAttendeesToSend] = useState<any[]>([]);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [excludedPhones, setExcludedPhones] = useState<string[]>([]);

  // Normalize MTDC RSVP
  const normalizedMtdc = rsvpData.map((row: any) => {
    const normalized = {
      Date: row["Date"]?.trim() || "",
      "Full Name": row["Full Name"]?.trim() || row["Full Namea"]?.trim() || "",
      Company: row["Company"]?.trim() || "",
      Phone: row["Phone"]?.trim() || "",
      Email: row["Email"]?.trim() || "",
      "Program Name": row["Program Name"]?.trim() || "",
      "Program Date & Time": row["Program Date & Time"]?.trim() || "",
      "RSVP status": row["RSVP status"]?.trim() || "",
      "Attendance status": row["Attendance status"]?.trim() || "",
      Profession: row["Profession"]?.trim() || "",
      Category: row["Category"]?.trim() || "",
      // ...other fields
    };
    
 
    
    return normalized;
  });

  // Normalize AI Horizon RSVP
  const normalizedAihorizon = aiHorizonRSVP.map((row: any) => ({
    Date: row["Submission time"]?.trim() || row["Date"]?.trim() || "",
    "Full Name": row["Nama"]?.trim() || row["Full Name"]?.trim() || "",
    Company: row["Nama Syarikat/Kementerian/Jabatan/Agensi"]?.trim() || row["Company"]?.trim() || "",
    Phone: row["Mobile Number"]?.trim() || row["Phone"]?.trim() || "",
    Email: row["Email"]?.trim() || "",
    "Program Name": row["Daftar Kursus"]?.trim() || row["Program Name"]?.trim() || "",
    "Program Date & Time": extractDateFromDaftarKursus(row["Daftar Kursus"]) || row["Program Date & Time"]?.trim() || "",
    "RSVP status": "Accepted", // Assume all AI Horizon as accepted
    "Attendance status": "Accepted", // Mark as attended
    Profession: row["Pekerjaan"]?.trim() || "",
    Category: row["Category"]?.trim() || "",
    // ...other fields
  }));

  // Helper to normalize phone numbers (remove non-digits, add country code if missing)
  function normalizePhone(phone: string) {
    let digits = (phone || "").replace(/\D/g, "");
    if (digits && !digits.startsWith("6")) digits = "6" + digits; // Default to Malaysia
    return digits;
  }

  // Merge both RSVP sources and deduplicate by normalized email and phone
  function mergeRSVPByEmailAndPhone(data: any[]) {
    // Don't merge - allow multiple programs per person
    // Just return the data as-is, but remove any completely empty rows
    return data.filter(row => {
      const email = normalizeEmail(row.Email);
      const phone = normalizePhone(row.Phone);
      const programName = row['Program Name']?.trim();
      
      // Keep rows that have at least email or phone, and a program name
      return (email || phone) && programName;
    });
  }

  // Merge and deduplicate RSVP data
  const mergedRSVP = mergeRSVPByEmailAndPhone([...normalizedMtdc, ...normalizedAihorizon]);

  // Create a map for RSVP by email
  const rsvpByEmail: { [key: string]: any } = Object.fromEntries(
    mergedRSVP.map((row: any) => [normalizeEmail(row.Email), row])
  );

  // Join feedback with RSVP
  const feedbackWithRSVP = feedbackData.map((feedback: any) => ({
    ...feedback,
    rsvp: rsvpByEmail[normalizeEmail(feedback.Email)]
  }));

  // Profession breakdown
  const professionCounts: { [key: string]: number } = {};
  mergedRSVP.forEach((r: any) => {
    const prof = (r.Profession || 'Unspecified').trim();
    professionCounts[prof] = (professionCounts[prof] || 0) + 1;
  });
  const professions = Object.entries(professionCounts).map(([label, value]) => ({ label, value: Number(value) }));

  // Program breakdown
  const programCounts: { [key: string]: number } = {};
  mergedRSVP.forEach((r: any) => {
    const prog = (r['Program Name'] || 'Unknown').trim();
    programCounts[prog] = (programCounts[prog] || 0) + 1;
  });
  const programTypes = Object.entries(programCounts).map(([label, value]) => ({ label, value: Number(value) }));

  // Category breakdown
  const categoryCounts: { [key: string]: number } = {};
  mergedRSVP.forEach((r: any) => {
    const cat = (r.Category || 'Unspecified').trim();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categories = Object.entries(categoryCounts).map(([label, value]) => ({ label, value: Number(value) }));

  // Totals
  const totalRegistered = mergedRSVP.length;
  const totalAttended = mergedRSVP.filter((r: any) => r['Attendance status'] === 'Accepted').length;

  // Feedback metrics
  const overallFeedback: { [key: string]: number } = {};
  feedbackMetrics.forEach(metric => {
    const values = feedbackWithRSVP
      .map((f: any) => Number(f[metric.key]))
      .filter((v: number) => !isNaN(v));
    overallFeedback[metric.key] = average(values);
  });

  // Helper function to parse date from DD/MM/YYYY HH:MM:SS format
  const parseDate = (dateTimeStr: string): Date => {
    if (!dateTimeStr) return new Date(0); // Default to epoch for sorting
    
   
    
    // Handle DD/MM/YYYY HH:MM:SS format
    const match = dateTimeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      const result = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
      return result;
    }
    
    // Handle DD/MM/YYYY format (without time)
    const dateOnlyMatch = dateTimeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateOnlyMatch) {
      const [, day, month, year] = dateOnlyMatch;
      const result = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
    
      return result;
    }
    
    // Handle other date formats or return epoch
    const parsedDate = new Date(dateTimeStr);
    const result = isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;
    
    
    return result;
  };

  // Get all unique programs with their dates
  const allPrograms: Array<{ name: string; dateTime: string; parsedDate: Date; cleanedName: string }> = [];

  mergedRSVP.forEach((r: any) => {
    let dateTime = r['Program Date & Time'] || '';
    
    // If no date from Program Date & Time, try to extract from program name (for AI Horizon)
    if (!dateTime) {
      dateTime = extractDateFromDaftarKursus(r['Program Name']);
    }
    
    // If still no date, try to infer from program name patterns
    if (!dateTime) {
      // Look for date patterns in the program name
      const dateMatch = r['Program Name'].match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i);
      if (dateMatch) {
        const day = dateMatch[1];
        const monthName = dateMatch[2];
        const monthMap: { [key: string]: string } = {
          'January': '01', 'Jan': '01',
          'February': '02', 'Feb': '02',
          'March': '03', 'Mar': '03',
          'April': '04', 'Apr': '04',
          'May': '05',
          'June': '06', 'Jun': '06',
          'July': '07', 'Jul': '07',
          'August': '08', 'Aug': '08',
          'September': '09', 'Sep': '09',
          'October': '10', 'Oct': '10',
          'November': '11', 'Nov': '11',
          'December': '12', 'Dec': '12'
        };
        const month = monthMap[monthName];
        if (month) {
          // Use 2025 for all programs to maintain consistency
          const year = 2025;
          dateTime = `${day}/${month}/${year} 09:00:00`;
        }
      }
    }
    
    // If still no date, assign a default date to avoid "Unspecified"
    if (!dateTime) {
      dateTime = '01/01/2025 09:00:00'; // Default date for programs without dates
    }
    
    const parsedDate = parseDate(dateTime);

    const program = {
      name: r['Program Name'],
      dateTime: dateTime,
      parsedDate: parsedDate,
      cleanedName: cleanProgramName(r['Program Name'])
    };
 
    // Only add if this program name + date combination doesn't already exist
    const exists = allPrograms.some(p => 
      p.cleanedName === program.cleanedName && 
      p.dateTime === program.dateTime
    );
    
    if (!exists) {
      allPrograms.push(program);
    }
  });

  // Sort programs by date (latest first)
  const sortedPrograms = allPrograms
    .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

  // Get programs available for selected category (for Program-Specific Dashboard) - MOVED UP
  const programsInSelectedCategoryForDashboard = selectedCategory 
    ? Array.from(new Set(
        mergedRSVP
          .filter((row: any) => row["Category"] === selectedCategory)
          .map((row: any) => cleanProgramName(row["Program Name"]))
          .filter(Boolean)
      ))
    : [];

  // Get categories available for selected program
  const selectedProgramAvailableCategories = Array.from(
    new Set(
      mergedRSVP
        .filter((r: any) => {
          if (showAllProgramsInCategory && selectedCategory) {
            // If "All Programs in Category" is selected, get categories from all programs in that category
            return programsInSelectedCategoryForDashboard.includes(cleanProgramName(r['Program Name']));
          } else {
            // Normal filtering by selected program
            return cleanProgramName(r['Program Name']) === sortedPrograms[selectedProgram]?.cleanedName;
          }
        })
        .map((r: any) => r.Category)
        .filter(Boolean)
    )
  );

  // Get programs available for selected category
  const selectedCategoryAvailablePrograms = selectedCategory 
    ? Array.from(
        new Set(
          mergedRSVP
            .filter((r: any) => r.Category === selectedCategory)
            .map((r: any) => cleanProgramName(r['Program Name']))
            .filter(Boolean)
        )
      )
    : [];

  // Filter programs based on selected category and deduplicate by cleaned name
  const filteredPrograms = selectedCategory
    ? sortedPrograms.filter(program => 
        selectedCategoryAvailablePrograms.includes(program.cleanedName)
      )
    : sortedPrograms;

  // Deduplicate programs by date AND time, and merge programs without dates
  // Maintain the sorted order (latest first) during deduplication
  const uniquePrograms = filteredPrograms.filter((program, index, self) => {
    // If this program has a valid date (not "Unspecified"), check for duplicates by date AND time
    if (program.dateTime && program.dateTime !== "Unspecified") {
      // Find all programs with the same date and time
      const sameDateTimePrograms = self.filter(p => 
        p.dateTime === program.dateTime && p.dateTime !== "Unspecified"
      );
      
      // If there are multiple programs with the same date/time, keep the one with the longest name (most descriptive)
      if (sameDateTimePrograms.length > 1) {
        const longestNameProgram = sameDateTimePrograms.reduce((longest, current) => 
          current.cleanedName.length > longest.cleanedName.length ? current : longest
        );
        return program === longestNameProgram;
      }
      
      return index === self.findIndex(p => 
        p.cleanedName === program.cleanedName && p.dateTime === program.dateTime
      );
    }
    
    // If this program doesn't have a date or has "Unspecified" date, check if there's a similar program with a valid date
    const hasSimilarWithValidDate = self.some(p => 
      p.cleanedName === program.cleanedName && p.dateTime && p.dateTime !== "Unspecified" && p !== program
    );
    
    // Remove programs without dates or with "Unspecified" dates if there's a similar one with a valid date
    return !hasSimilarWithValidDate;
  });

  // Ensure the final list is still sorted by date (latest first)
  const finalSortedPrograms = uniquePrograms.sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

  // For dropdown: show program name with date
  const dropdownNames = finalSortedPrograms.map(program => {
    if (program.dateTime) {
      return `${program.cleanedName} (${program.dateTime})`;
    }
    return program.cleanedName;
  });

  // When a program is selected:
  const selectedProgramData = finalSortedPrograms[selectedProgram];
  const selectedCleanedName = selectedProgramData?.cleanedName || "";
  const normalizedSelected = normalizeProgramName(selectedCleanedName);

  // Get all unique program names from feedback
  const programNames = Array.from(new Set(feedbackData.map((f: any) => f["Which session did you attend?"])));

  const programFeedback = programNames.map(program => {
    const feedbacks = feedbackData.filter((f: any) => f["Which session did you attend?"] === program);
    const metrics = {};
    feedbackMetrics.forEach(metric => {
      const values = feedbacks.map((f: any) => Number(f[metric.key])).filter((v: number) => !isNaN(v));
      (metrics as Record<string, number | undefined>)[metric.key] = average(values);
    });
    return {
      program,
      metrics
    };
  });

  // Find all feedback entries that match this program (fuzzy)
  const feedbackForSelected = feedbackData.filter(
    (f: any) => 
      normalizeProgramName(f["Which session did you attend?"]) === normalizedSelected
  );

  // Filter participants by selected program and category
  const selectedProgramFilteredParticipants = mergedRSVP.filter((r: any) => {
    let matchesProgram = true;
    
    if (showAllProgramsInCategory && selectedCategory) {
      // If "All Programs in Category" is selected, only filter by programs in that category
      matchesProgram = programsInSelectedCategoryForDashboard.includes(cleanProgramName(r['Program Name']));
      // Don't filter by category here - we want to see all categories for these programs
    } else {
      // Normal program filtering
      matchesProgram = cleanProgramName(r['Program Name']) === selectedCleanedName;
    }
    
    // Only apply category filter when NOT in "All Programs in Category" mode
    const matchesCategory = showAllProgramsInCategory ? true : (!selectedCategory || r.Category === selectedCategory);
    return matchesProgram && matchesCategory;
  });

  // Registered/attended counts
  const registeredCount = selectedProgramFilteredParticipants.length;
  
  // Get attendance from both CSV data and Neon attendance_records
  const [neonAttendanceData, setNeonAttendanceData] = useState<any[]>([]);
  const [neonEvents, setNeonEvents] = useState<any[]>([]);
  
  // Fetch attendance records and events from Neon
  useEffect(() => {
    const fetchNeonData = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) return;
        
        const response = await fetch(`${baseUrl}/api/user-company-data?email=${encodeURIComponent(userEmail)}`);
        if (!response.ok) {
          console.error('❌ Company Data Response Error:', response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        console.log('✅ Company Data Response:', data);
        const apiUrl = 'http://localhost:8443';
        const companyId = data.userData.companyId;
        console.log('🔑 Company ID:', companyId);
        
        // Fetch both attendance records and events from Neon
        const [attendanceResponse, eventsResponse] = await Promise.all([
          fetch(`${apiUrl}/api/attendance-records?company_id=${companyId}`),
          fetch(`${apiUrl}/api/events?company_id=${companyId}`)
        ]);
        
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          console.log('✅ Attendance Response:', attendanceData);
          setNeonAttendanceData(attendanceData.attendance_records || []);
        } else {
          console.error('❌ Attendance Response Error:', attendanceResponse.status, attendanceResponse.statusText);
        }
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          console.log('✅ Events Response:', eventsData);
          setNeonEvents(eventsData.events || []);
        } else {
          console.error('❌ Events Response Error:', eventsResponse.status, eventsResponse.statusText);
        }
      } catch (error) {
        console.error('Error fetching Neon data:', error);
      }
    };
    
    fetchNeonData();
  }, []);
  
  // Calculate total attended count from both sources
  const csvAttendedCount = selectedProgramFilteredParticipants.filter(
    (r: any) => r['Attendance status'] === 'Accepted'
  ).length;
  
  // Count Neon attendance records for the selected program
  const neonAttendedCount = neonAttendanceData.filter((record: any) => {
    // Find the event that matches this attendance record
    const event = neonEvents.find((e: any) => e.id === record.event_id);
    if (!event) return false;
    
    // Match the event name with the selected program name
    const eventName = event.name || '';
    const normalizedEventName = eventName.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const normalizedProgramName = selectedCleanedName.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    
    // Check if the event name contains key words from the program name
    const programWords = normalizedProgramName.split(' ').filter((word: string) => word.length > 2);
    const eventWords = normalizedEventName.split(' ').filter((word: string) => word.length > 2);
    
    // Count how many program words are found in the event name
    const matchingWords = programWords.filter((word: string) => 
      eventWords.some((eventWord: string) => eventWord.includes(word) || word.includes(eventWord))
    );
    
    // Consider it a match if at least 2 key words match (to avoid false positives)
    return matchingWords.length >= 2;
  }).length;
  
  const attendedCount = csvAttendedCount + neonAttendedCount;
  
  // Log attendance calculations
  console.log('📊 Attendance Calculation:', {
    selectedProgram: selectedCleanedName,
    csvAttendedCount,
    neonAttendedCount,
    totalAttendedCount: attendedCount,
    neonAttendanceDataLength: neonAttendanceData.length,
    neonEventsLength: neonEvents.length
  });

  // Program-specific category breakdown
  const selectedProgramParticipants = selectedProgramFilteredParticipants;
  
  const selectedProgramCategoryCounts: { [key: string]: number } = {};
  selectedProgramParticipants.forEach((r: any) => {
    const cat = (r.Category || 'Unspecified').trim();
    selectedProgramCategoryCounts[cat] = (selectedProgramCategoryCounts[cat] || 0) + 1;
  });
  const selectedProgramCategories = Object.entries(selectedProgramCategoryCounts)
    .map(([label, value]) => ({ label, value: Number(value) }))
    .sort((a, b) => b.value - a.value); // Sort by count descending

  // Program-specific profession breakdown
  const selectedProgramProfessionCounts: { [key: string]: number } = {};
  selectedProgramParticipants.forEach((r: any) => {
    const prof = (r.Profession || 'Unspecified').trim();
    selectedProgramProfessionCounts[prof] = (selectedProgramProfessionCounts[prof] || 0) + 1;
  });
  const selectedProgramProfessions = Object.entries(selectedProgramProfessionCounts)
    .map(([label, value]) => ({ label, value: Number(value) }))
    .sort((a, b) => b.value - a.value); // Sort by count descending

  // Define a color palette for charts
  const chartColors = [
    '#3b82f6', // blue-500
    '#f59e42', // orange-400
    '#10b981', // green-500
    '#f43f5e', // rose-500
    '#6366f1', // indigo-500
    '#fbbf24', // yellow-400
    '#a21caf', // purple-700
    '#14b8a6', // teal-500
    '#eab308', // yellow-500
    '#ef4444', // red-500
    '#6d28d9', // violet-700
    '#0ea5e9', // sky-500
    '#f472b6', // pink-400
    '#22d3ee', // cyan-400
    '#84cc16', // lime-500
  ];

  // Get programs available for selected category (for participant filters)
  const programsInSelectedCategory = participantCategoryFilter 
    ? Array.from(new Set(
        mergedRSVP
          .filter((row: any) => row["Category"] === participantCategoryFilter)
          .map((row: any) => cleanProgramName(row["Program Name"]))
          .filter(Boolean)
      ))
    : [];



  // Filtered data for participants
  const filteredParticipants = mergedRSVP.filter(row => {
    // Apply search filter
    if (participantSearch.trim() !== "") {
      const searchMatch = Object.values(row).some(val =>
        (val == null ? "" : String(val)).toLowerCase().includes(participantSearch.toLowerCase())
      );
      if (!searchMatch) return false;
    }
    
    // Apply program filter
    if (participantProgramFilter) {
      // Special handling for "All Programs in [Category]" option
      if (participantProgramFilter === `all_in_category_${participantCategoryFilter}`) {
        // If "All Programs in Category" is selected, only filter by category (already handled below)
      } else if (cleanProgramName(row["Program Name"]) !== participantProgramFilter) {
        return false;
      }
    }
    
    // Apply category filter
    if (participantCategoryFilter && row["Category"] !== participantCategoryFilter) {
      return false;
    }
    
    // Apply profession filter
    if (participantProfessionFilter && row["Profession"] !== participantProfessionFilter) {
      return false;
    }
    
    // Apply RSVP status filter
    if (participantStatusFilter && row["RSVP status"] !== participantStatusFilter) {
      return false;
    }
    
    // Apply attendance status filter
    if (participantAttendanceFilter && row["Attendance status"] !== participantAttendanceFilter) {
      return false;
    }
    
    return true;
  });
  
  // Filtered data for feedback
  const filteredFeedback = feedbackData.filter(row => {
    // Apply session filter
    if (selectedSessionFilter && row["Which session did you attend?"] !== selectedSessionFilter) {
      return false;
    }
    
    // Apply search filter
    if (feedbackSearch.trim() !== "") {
      const searchMatch = Object.values(row).some(val =>
        (val == null ? "" : String(val)).toLowerCase().includes(feedbackSearch.toLowerCase())
      );
      if (!searchMatch) return false;
    }
    
    // Apply date filter (if feedback has a date field)
    if (feedbackDateFilter && row["Timestamp"]) {
      const feedbackDate = new Date(row["Timestamp"]).toLocaleDateString();
      if (feedbackDate !== feedbackDateFilter) {
        return false;
      }
    }
    
    // Apply rating filter (check if any rating field matches the filter)
    if (feedbackRatingFilter) {
      const hasMatchingRating = feedbackMetrics.some(metric => {
        const rating = row[metric.key];
        return rating && String(rating) === feedbackRatingFilter;
      });
      if (!hasMatchingRating) {
        return false;
      }
    }
    
    return true;
  });

  // Columns for participants table (forced order)
  const participantColumns = [
    "Date",
    "Full Name",
    "Company",
    "Phone",
    "Email",
    "Program Name",
    "Program Date & Time",
    "RSVP status",
    "Attendance status",
    "Category",
    "Profession",
  ];
  const participantColumnsWithCert = [...participantColumns, "Certificate"];

  // For download: map filteredParticipants to this column order
  function getParticipantsForDownload() {
    return filteredParticipants.map(row => {
      const r = row as Record<string, any>;
      const out: Record<string, any> = {};
      participantColumns.forEach(col => {
        out[col] = r[col] ?? '';
      });
      return out;
    });
  }

  // Get all unique program names from participants
  const allProgramNames = Array.from(new Set(filteredParticipants.map((row: any) => row["Program Name"]).filter(Boolean)));

  // Get all unique program dates from filteredParticipants
  const allProgramDates = Array.from(
    new Set(filteredParticipants.map((row: any) => row["Program Date & Time"]).filter(Boolean))
  );
  // Map date to program name (first occurrence)
  const dateToProgramName: Record<string, string> = {};
  filteredParticipants.forEach((r: any) => {
    const date = r["Program Date & Time"];
    if (date && !(date in dateToProgramName)) {
      dateToProgramName[date] = r["Program Name"];
    }
  });

  // When a program is selected for sending, selectedSendProgram is now the date string
  // Filter attendees for selected program and accepted status (by date)
  const attendeesForSelectedSendProgram = useMemo(() => {
    return filteredParticipants.filter(
      (row: any) =>
     
        row["Program Date & Time"] === selectedSendProgram
    );
  }, [filteredParticipants, selectedSendProgram]);

  // Handler to open confirmation modal
  const handleOpenConfirmSend = () => {
    setAttendeesToSend(attendeesForSelectedSendProgram.map(a => ({ ...a, selected: true })));
    setConfirmSendOpen(true);
  };

  // Handler to toggle selection
  const handleToggleAttendee = (idx: number) => {
    setAttendeesToSend(prev => prev.map((a, i) => i === idx ? { ...a, selected: !a.selected } : a));
  };

  function handleExcludeCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        if (!data.length) return;
        const phoneCol = Object.keys(data[0]).find(
          k => k.toLowerCase().includes('phone')
        ) || Object.keys(data[0])[0];
        const phones = data.map(row => String(row[phoneCol] || '').replace(/\D/g, ''))
          .filter(p => p.length > 0);
        setExcludedPhones(phones);
      }
    });
  }

  // Handler to confirm and start sending
  const handleConfirmAndSend = async () => {
    setConfirmSendOpen(false);
    const attendees = attendeesToShow.filter(a => a.selected);
    setSendingModalOpen(true);
    setSendingInProgress(true);
    setSendingStatus(attendees.map((a: any) => ({ name: a["Full Name"], phone: a["Phone"], status: "pending" })));
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      let thankYouText = '';
      thankYouText = `Dear ${attendee["Full Name"]}\n\nThank You for Attending FUTUREX.AI 2025\n\nOn behalf of the organizing team, we would like to extend our heartfelt thanks for your participation in FUTUREX.AI 2025 held on 7 August 2025.\n\nYour presence and engagement in the Business Automation & AI Chatbot Experience session greatly contributed to the success of the event.\n\nWe hope the experience was insightful and inspiring as we continue to explore how artificial intelligence and robotics can shape the future.\n\nWe hope you can join our next event as well.\n\nPlease find your digital certificate of participation attached.\n\nWarm regards,\nCo9P AI Chatbot`;

      let status = "pending";
      try {
        const name = attendee["Full Name"];
        const phone = attendee["Phone"];
        if (!name || !phone) throw new Error("Missing name or phone");
        let phoneDigits = String(phone).replace(/\D/g, "");
        if (!phoneDigits.startsWith("6")) phoneDigits = "6" + phoneDigits;
        const chatId = phoneDigits + "@c.us";
        await sendTextMessage(chatId, thankYouText);
        const certBlob = await generateCertificate(name, attendee["Program Date & Time"], { returnBlob: true }) as Blob;
        const fileName = `${name.replace(/[^a-zA-Z0-9]/g, "_")}_FUTUREX.AI_2025_Certificate.pdf`;
        const certUrl = await uploadFile(certBlob, fileName);
        await sendDocumentMessage(chatId, certUrl, fileName, "Certificate of Participation");
        status = "success";
      } catch (err) {
        status = "failed";
      }
      setSendingStatus((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status } : s
        )
      );
    }
    setSendingInProgress(false);
  };



  // Memoized PieChart data/labels
  const professionPieData = useMemo(
    () => professions.map((p) => Number(p.value)),
    [professions]
  );
  const professionPieLabels = useMemo(
    () => professions.map((p) => p.label),
    [professions]
  );
  const programPieData = useMemo(
    () => programTypes.map((p) => Number(p.value)),
    [programTypes]
  );
  const programPieLabels = useMemo(
    () => programTypes.map((p) => p.label),
    [programTypes]
  );

  // In the confirmation modal, filter attendees to exclude those in excludedPhones
  const attendeesToShow = attendeesToSend.filter(
    a => !excludedPhones.includes(String(a["Phone"] || '').replace(/\D/g, ''))
  );

  return (
    <div className="p-6 space-y-10 h-screen overflow-auto">
      {/* Participant Overview */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Participant Overview</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Total Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{totalRegistered}</div>
              <div className="text-blue-700 dark:text-blue-300 font-medium">Total Registered</div>
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mt-4 mb-2">{totalAttended}</div>
              <div className="text-green-700 dark:text-green-300 font-medium">Total Attended</div>
              <div className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                {totalRegistered > 0 ? ((totalAttended / totalRegistered) * 100).toFixed(1) : '0'}% Attendance Rate
              </div>
            </div>
          </div>
          
          {/* Profession Chart */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
            <div className="font-semibold mb-4 text-center text-purple-800 dark:text-purple-300">By Profession/Category</div>
            <CustomPieChart
              data={professionPieData}
              labels={professionPieLabels}
              colors={chartColors}
            />
          </div>
          
          {/* Program Chart */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-700">
            <div className="font-semibold mb-4 text-center text-emerald-800 dark:text-emerald-300">By Program Type</div>
            <CustomPieChart
              data={programPieData}
              labels={programPieLabels}
              colors={chartColors}
            />
          </div>
        </div>
      </section>
{/* */}
      {/* Program-Specific Dashboard */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Program-Specific Dashboard</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Filter by Category:</label>
            <select
              className="border rounded px-3 py-2 min-w-[200px] text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                // Don't reset program selection here - let the useEffect handle auto-selection
              }}
            >
              <option value="">All Categories</option>
              {selectedProgramAvailableCategories.map((category) => (
                <option value={category} key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 relative program-dropdown">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Select Program:</label>
            <div className="relative">
              <button
                type="button"
                className="border rounded px-3 py-2 min-w-[400px] max-w-[600px] text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex justify-between items-center"
                onClick={() => setProgramDropdownOpen(!programDropdownOpen)}
              >
                <span className="truncate">
                  {showAllProgramsInCategory && selectedCategory 
                    ? `📊 All Programs in ${selectedCategory} (${programsInSelectedCategoryForDashboard.length} programs)`
                    : selectedProgram >= 0 && dropdownNames[selectedProgram] 
                    ? dropdownNames[selectedProgram] 
                    : "Select a program..."}
                </span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {programDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {/* "All Programs in Category" option */}
                  {selectedCategory && programsInSelectedCategoryForDashboard.length > 0 && (
                    <button
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-600 border-b border-gray-200 dark:border-gray-600 ${
                        showAllProgramsInCategory ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                      onClick={() => {
                        setShowAllProgramsInCategory(true);
                        setSelectedProgram(-1); // Special value to indicate "All Programs in Category"
                        setProgramDropdownOpen(false);
                      }}
                    >
                      <div className="whitespace-normal break-words leading-relaxed font-semibold text-blue-600 dark:text-blue-400">
                        📊 All Programs in {selectedCategory} ({programsInSelectedCategoryForDashboard.length} programs)
                      </div>
                    </button>
                  )}
                  
                  {/* Individual program options */}
                  {dropdownNames.map((name, idx) => (
                    <button
                      key={name}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-600 ${
                        selectedProgram === idx && !showAllProgramsInCategory ? 'bg-blue-100 dark:bg-blue-900' : ''
                      }`}
                      onClick={() => {
                        setSelectedProgram(idx);
                        setShowAllProgramsInCategory(false);
                        setProgramDropdownOpen(false);
                      }}
                    >
                      <div className="whitespace-normal break-words leading-relaxed">
                        {name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Show program breakdown when "All Programs in Category" is selected */}
        {showAllProgramsInCategory && selectedCategory && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
              📊 Program Breakdown in {selectedCategory}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {programsInSelectedCategoryForDashboard.map((programName) => {
                const programParticipants = selectedProgramFilteredParticipants.filter(
                  (row: any) => cleanProgramName(row["Program Name"]) === programName
                );
                
                // Calculate attended count from both CSV and Neon
                const csvAttended = programParticipants.filter(
                  (row: any) => row["Attendance status"] === "Accepted"
                ).length;
                
                // Count Neon attendance for this specific program
                const neonAttended = neonAttendanceData.filter((record: any) => {
                  // Match by event_slug which contains the program identifier
                  const eventSlug = record.event_slug || '';
                  
                  // Try to match the event_slug with the program name
                  const normalizedEventSlug = eventSlug.toLowerCase().replace(/[^a-z0-9]/g, ' ');
                  const normalizedProgramName = programName.toLowerCase().replace(/[^a-z0-9]/g, ' ');
                  
                  // Check if the event_slug contains key words from the program name
                  const programWords = normalizedProgramName.split(' ').filter((word: string) => word.length > 2);
                  const slugWords = normalizedEventSlug.split(' ').filter((word: string) => word.length > 2);
                  
                  // Count how many program words are found in the slug
                  const matchingWords = programWords.filter((word: string) => 
                    slugWords.some((slugWord: string) => slugWord.includes(word) || word.includes(slugWord))
                  );
                  
                  // Consider it a match if at least 2 key words match
                  return matchingWords.length >= 2;
                }).length;
                
                const attendedCount = csvAttended + neonAttended;
                
                return (
                  <div key={programName} className="bg-white dark:bg-slate-700 p-3 rounded border">
                    <div className="font-medium text-sm">{programName}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {programParticipants.length} registered, {attendedCount} attended
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Registration Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{registeredCount}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {showAllProgramsInCategory && selectedCategory ? 'Total Registered' : 'Registered'}
                </div>
              </div>
              <div className="text-blue-500 dark:text-blue-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Attendance Stats */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{attendedCount}</div>
                <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {showAllProgramsInCategory && selectedCategory ? 'Total Attended' : 'Attended'}
                </div>
              </div>
              <div className="text-green-500 dark:text-green-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-6 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {registeredCount > 0 ? ((attendedCount / registeredCount) * 100).toFixed(1) : '0'}%
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Attendance Rate</div>
              </div>
              <div className="text-purple-500 dark:text-purple-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* Feedback Form Dashboard */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Feedback Form Dashboard</h2>
        </div>
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Overall Scores (All Programs Combined)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {feedbackMetrics.map((metric) => (
              <div key={metric.key} className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-700 dark:to-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow">
                <div className="text-sm font-medium text-center text-gray-700 dark:text-gray-300 mb-2">{metric.label}</div>
                <div className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200">{overallFeedback[metric.key]?.toFixed(1)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">(Likert 1-5)</div>
              </div>
            ))}
            {/* Overall Percentage Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700 hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-center text-blue-700 dark:text-blue-300 mb-2">Overall Score</div>
              <div className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
                {(() => {
                  const totalScore = feedbackMetrics.reduce((sum, metric) => {
                    return sum + (overallFeedback[metric.key] || 0);
                  }, 0);
                  const maxPossibleScore = feedbackMetrics.length * 5;
                  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
                  return `${percentage.toFixed(1)}%`;
                })()}
              </div>
              <div className="text-xs text-blue-500 dark:text-blue-400 text-center">(Percentage)</div>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Program-Level Scores
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-blue-100 dark:bg-slate-900">
                  <th className="border px-2 py-1">Program</th>
                  {feedbackMetrics.map((metric) => (
                    <th className="border px-2 py-1" key={metric.key}>{metric.label}</th>
                  ))}
                  <th className="border px-2 py-1 bg-blue-200 dark:bg-blue-800 font-semibold">Score %</th>
                </tr>
              </thead>
              <tbody>
                {programFeedback.map((program, i) => {
                  // Calculate total score for this program
                  const totalScore = feedbackMetrics.reduce((sum, metric) => {
                    const value = typeof program.metrics === 'object' && program.metrics !== null && metric.key in program.metrics
                      ? (program.metrics as Record<string, number | undefined>)[metric.key]
                      : 0;
                    return sum + (value || 0);
                  }, 0);
                  
                  // Calculate percentage (max score is 5 * number of metrics)
                  const maxPossibleScore = feedbackMetrics.length * 5;
                  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
                  
                  return (
                    <tr key={program.program} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'}>
                      <td className="border px-2 py-1 font-semibold">{program.program}</td>
                      {feedbackMetrics.map((metric) => (
                        <td className="border px-2 py-1 text-center dark:text-slate-100" key={metric.key}>
                          {typeof program.metrics === 'object' && program.metrics !== null && metric.key in program.metrics
                            ? (program.metrics as Record<string, number | undefined>)[metric.key]?.toFixed(1)
                            : ''}
                        </td>
                      ))}
                      <td className="border px-2 py-1 text-center bg-blue-50 dark:bg-blue-900 font-semibold">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Category-Level Scores */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Category-Level Scores
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-green-100 dark:bg-green-900">
                  <th className="border px-2 py-1">Category</th>
                  {feedbackMetrics.map((metric) => (
                    <th className="border px-2 py-1" key={metric.key}>{metric.label}</th>
                  ))}
                  <th className="border px-2 py-1 bg-green-200 dark:bg-green-800 font-semibold">Score %</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Create a mapping of program names to categories
                  const programToCategoryMap: { [programName: string]: string } = {};
                  mergedRSVP.forEach((r: any) => {
                    const programName = r['Program Name'];
                    const category = r.Category?.trim() || 'Unspecified';
                    if (programName) {
                      programToCategoryMap[programName] = category;
                    }
                  });

                  // Group feedback by category based on program name
                  const feedbackByCategory: { [category: string]: any[] } = {};
                  
                  feedbackData.forEach((feedback: any) => {
                    const feedbackProgram = feedback["Which session did you attend?"];
                    let category = 'Unspecified';
                    
                    // Try to find matching program
                    if (feedbackProgram) {
                      // First try exact match
                      if (programToCategoryMap[feedbackProgram]) {
                        category = programToCategoryMap[feedbackProgram];
                      } else {
                        // Try fuzzy matching
                        const matchedProgram = Object.keys(programToCategoryMap).find(program => 
                          feedbackProgram.toLowerCase().includes(program.toLowerCase()) || 
                          program.toLowerCase().includes(feedbackProgram.toLowerCase())
                        );
                        if (matchedProgram) {
                          category = programToCategoryMap[matchedProgram];
                        }
                      }
                    }
                    
                    if (!feedbackByCategory[category]) {
                      feedbackByCategory[category] = [];
                    }
                    feedbackByCategory[category].push(feedback);
                  });

                  // Get all unique categories (including Unspecified)
                  const allCategories = Array.from(new Set([
                    ...categories.map(c => c.label),
                    ...Object.keys(feedbackByCategory)
                  ])).sort();

                  return allCategories.map((category, i) => {
                    const categoryFeedbacks = feedbackByCategory[category] || [];

                    // Calculate metrics for this category
                    const categoryMetrics: Record<string, number | undefined> = {};
                    feedbackMetrics.forEach(metric => {
                      const values = categoryFeedbacks
                        .map((f: any) => Number(f[metric.key]))
                        .filter((v: number) => !isNaN(v));
                      categoryMetrics[metric.key] = average(values);
                    });

                    // Calculate total score for this category
                    const totalScore = feedbackMetrics.reduce((sum, metric) => {
                      return sum + (categoryMetrics[metric.key] || 0);
                    }, 0);
                    
                    // Calculate percentage (max score is 5 * number of metrics)
                    const maxPossibleScore = feedbackMetrics.length * 5;
                    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
                    
                    return (
                      <tr key={category} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-green-50 dark:bg-green-900/20'}>
                        <td className="border px-2 py-1 font-semibold">{category}</td>
                        {feedbackMetrics.map((metric) => (
                          <td className="border px-2 py-1 text-center dark:text-slate-100" key={metric.key}>
                            {categoryMetrics[metric.key]?.toFixed(1) || ''}
                          </td>
                        ))}
                        <td className="border px-2 py-1 text-center bg-green-50 dark:bg-green-900/30 font-semibold">
                          {percentage.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {/* Raw Data: Registered Participants */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700 mt-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Registered Participants</h2>
        </div>
        
        {/* Enhanced Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Search:</label>
            <input
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="Search all fields..."
              value={participantSearch}
              onChange={e => setParticipantSearch(e.target.value)}
            />
          </div>
          
          {/* Program Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Program:</label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantProgramFilter}
              onChange={e => setParticipantProgramFilter(e.target.value)}
            >
              <option value="">All Programs</option>
              {participantCategoryFilter && programsInSelectedCategory.length > 0 && (
                <option value={`all_in_category_${participantCategoryFilter}`}>
                  All Programs in {participantCategoryFilter} ({programsInSelectedCategory.length} programs)
                </option>
              )}
              {dropdownNames.map((programName, idx) => (
                <option value={finalSortedPrograms[idx]?.cleanedName || ""} key={idx}>
                  {programName}
                </option>
              ))}
            </select>
          </div>
          
          {/* Category Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Category:</label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantCategoryFilter}
              onChange={e => setParticipantCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {Array.from(new Set(mergedRSVP.map((row: any) => row["Category"]).filter(Boolean))).map((category) => (
                <option value={category} key={category}>{category}</option>
              ))}
            </select>
          </div>
          
          {/* Profession Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Profession:</label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantProfessionFilter}
              onChange={e => setParticipantProfessionFilter(e.target.value)}
            >
              <option value="">All Professions</option>
              {Array.from(new Set(mergedRSVP.map((row: any) => row["Profession"]).filter(Boolean))).map((profession) => (
                <option value={profession} key={profession}>{profession}</option>
              ))}
            </select>
          </div>
          
          {/* RSVP Status Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">RSVP Status:</label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantStatusFilter}
              onChange={e => setParticipantStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Array.from(new Set(mergedRSVP.map((row: any) => row["RSVP status"]).filter(Boolean))).map((status) => (
                <option value={status} key={status}>{status}</option>
              ))}
            </select>
          </div>
          
          {/* Attendance Status Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Attendance:</label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantAttendanceFilter}
              onChange={e => setParticipantAttendanceFilter(e.target.value)}
            >
              <option value="">All Attendance</option>
              {Array.from(new Set(mergedRSVP.map((row: any) => row["Attendance status"]).filter(Boolean))).map((attendance) => (
                <option value={attendance} key={attendance}>{attendance}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Clear Filters Button */}
        <div className="mb-4">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            onClick={() => {
              setParticipantSearch("");
              setParticipantProgramFilter("");
              setParticipantCategoryFilter("");
              setParticipantProfessionFilter("");
              setParticipantStatusFilter("");
              setParticipantAttendanceFilter("");
            }}
          >
            Clear All Filters
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Showing {filteredParticipants.length} of {mergedRSVP.length} participants
            {participantProgramFilter.startsWith('all_in_category_') && participantCategoryFilter && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                (across {programsInSelectedCategory.length} programs in {participantCategoryFilter})
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => downloadCSV(getParticipantsForDownload(), "registered_participants.csv")}
            >
              Download as CSV
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded"
              onClick={() => downloadExcel(getParticipantsForDownload(), "registered_participants.xlsx")}
            >
              Download as Excel
            </button>
          </div>
        </div>
        
        {/* Show program breakdown when "All Programs in Category" is selected */}
        {participantProgramFilter.startsWith('all_in_category_') && participantCategoryFilter && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
              Program Breakdown in {participantCategoryFilter}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {programsInSelectedCategory.map((programName) => {
                const programParticipants = filteredParticipants.filter(
                  (row: any) => cleanProgramName(row["Program Name"]) === programName
                );
                
                // Calculate attended count from both CSV and Neon
                const csvAttended = programParticipants.filter(
                  (row: any) => row["Attendance status"] === "Accepted"
                ).length;
                
                // Count Neon attendance for this specific program
                const neonAttended = neonAttendanceData.filter((record: any) => {
                  // Find the event that matches this attendance record
                  const event = neonEvents.find((e: any) => e.id === record.event_id);
                  if (!event) return false;
                  
                  // Match the event name with the program name
                  const eventName = event.name || '';
                  const normalizedEventName = eventName.toLowerCase().replace(/[^a-z0-9]/g, ' ');
                  const normalizedProgramName = programName.toLowerCase().replace(/[^a-z0-9]/g, ' ');
                  
                  // Check if the event name contains key words from the program name
                  const programWords = normalizedProgramName.split(' ').filter((word: string) => word.length > 2);
                  const eventWords = normalizedEventName.split(' ').filter((word: string) => word.length > 2);
                  
                  // Count how many program words are found in the event name
                  const matchingWords = programWords.filter((word: string) => 
                    eventWords.some((eventWord: string) => eventWord.includes(word) || word.includes(eventWord))
                  );
                  
                  // Consider it a match if at least 2 key words match
                  return matchingWords.length >= 2;
                }).length;
                
                const attendedCount = csvAttended + neonAttended;
                
                return (
                  <div key={programName} className="bg-white dark:bg-slate-700 p-3 rounded border">
                    <div className="font-medium text-sm">{programName}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {programParticipants.length} registered, {attendedCount} attended
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full border text-xs">
            <thead>
              <tr>
                {participantColumnsWithCert.map((key) => (
                  <th key={key} className="border px-2 py-1">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'}>
                  {participantColumns.map((key, j) => (
                    <td key={j} className="border px-2 py-1">{(row as Record<string, any>)[key] == null ? '' : String((row as Record<string, any>)[key])}</td>
                  ))}
                  <td className="border px-2 py-1">
                    <button
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                      onClick={() => generateCertificate((row as Record<string, any>)["Full Name"] || "", (row as Record<string, any>)["Program Date & Time"])}
                      disabled={!((row as Record<string, any>)["Full Name"])}
                    >
                      Download Certificate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Program selection dropdown for sending certificates */}
        <div className="mb-4 mt-8 flex flex-col items-start">
          <label className="mb-2 font-semibold">Select Program Date to Send Certificates:</label>
          <select
            className="border rounded px-2 py-1 max-w-xs w-full"
            value={selectedSendProgram}
            onChange={e => setSelectedSendProgram(e.target.value)}
          >
            <option value="">-- Select Program Date --</option>
            {allProgramDates.map((date) => (
              <option value={date} key={date}>
                {dateToProgramName[date] ? `${dateToProgramName[date]} (${date})` : date}
              </option>
            ))}
          </select>
        </div>
        {/* Only show the button if a program is selected */}
        {selectedSendProgram && (
          <>
            <button
              className="mb-4 px-4 py-2 bg-green-600 text-white rounded"
              onClick={handleOpenConfirmSend}
              disabled={sendingInProgress}
            >
              Send Certificates to All Attendees in Selected Program
            </button>
            {/* Confirmation Modal for selecting attendees */}
            {confirmSendOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-lg animate-fadeIn">
                  <h3 className="text-lg font-bold mb-4 text-center">Confirm Recipients</h3>
                  {/* CSV import for exclusion */}
                  <div className="mb-2">
                    <label className="block text-sm font-semibold mb-1">Import CSV to Exclude Phones:</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleExcludeCSV}
                      className="block"
                    />
                  </div>
                  {/* Add this summary line */}
                  <div className="mb-2 text-sm font-semibold text-center">
                    {`Selected: ${attendeesToShow.filter(a => a.selected).length} / ${attendeesToShow.length} to send`}
                  </div>
                  <div className="max-h-64 overflow-y-auto border rounded mb-4">
                    <table className="min-w-full border text-xs">
                      <thead className="bg-gray-100 dark:bg-slate-700">
                        <tr>
                          <th className="border px-2 py-1">Send?</th>
                          <th className="border px-2 py-1">Name</th>
                          <th className="border px-2 py-1">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendeesToShow.map((a, i) => (
                          <tr key={i}>
                            <td className="border px-2 py-1 text-center">
                              <input type="checkbox" checked={a.selected} onChange={() => handleToggleAttendee(attendeesToSend.indexOf(a))} />
                            </td>
                            <td className="border px-2 py-1">{a["Full Name"]}</td>
                            <td className="border px-2 py-1">{a["Phone"]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      className="px-4 py-2 rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
                      onClick={() => setConfirmSendOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                      onClick={handleConfirmAndSend}
                      disabled={attendeesToShow.filter(a => a.selected).length === 0}
                    >
                      Confirm & Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {/* Modal/Progress UI */}
        {sendingModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
            onClick={e => {
              // Only close if not sending and click is on backdrop
              if (!sendingInProgress && e.target === e.currentTarget) setSendingModalOpen(false);
            }}
          >
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-lg animate-fadeIn">
              {/* Close (X) button */}
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
                onClick={() => {
                  if (!sendingInProgress) setSendingModalOpen(false);
                  else if (window.confirm('Sending is in progress. Are you sure you want to close?')) setSendingModalOpen(false);
                }}
                aria-label="Close"
              >
                ×
              </button>
              <h3 className="text-lg font-bold mb-4 text-center">Sending Certificates</h3>
              <div className="max-h-64 overflow-y-auto border rounded mb-4">
                <table className="min-w-full border text-xs">
                  <thead className="bg-gray-100 dark:bg-slate-700">
                    <tr>
                      <th className="border px-2 py-1">Name</th>
                      <th className="border px-2 py-1">Phone</th>
                      <th className="border px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sendingStatus.map((s, i) => (
                      <tr key={i}>
                        <td className="border px-2 py-1">{s.name}</td>
                        <td className="border px-2 py-1">{s.phone}</td>
                        <td className="border px-2 py-1">
                          {s.status === "pending" && <span className="text-yellow-500">Pending...</span>}
                          {s.status === "success" && <span className="text-green-600">Sent</span>}
                          {s.status === "failed" && <span className="text-red-600">Failed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className={`px-4 py-2 rounded ${sendingInProgress ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-400 text-white hover:bg-gray-500'}`}
                  onClick={() => {
                    if (!sendingInProgress) setSendingModalOpen(false);
                    else if (window.confirm('Sending is in progress. Are you sure you want to close?')) setSendingModalOpen(false);
                  }}
                  disabled={false}
                >
                  Close
                </button>
              </div>
              {sendingInProgress && (
                <div className="mt-2 text-center text-sm text-blue-500">Sending in progress...</div>
              )}
            </div>
          </div>
        )}
      </section>
      {/* Raw Data: Feedback Responses */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700 mt-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Feedback Responses</h2>
        </div>
        
        {/* Enhanced Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Search:</label>
            <input
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="Search all fields..."
              value={feedbackSearch}
              onChange={e => setFeedbackSearch(e.target.value)}
            />
          </div>
          
          {/* Session Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Session:</label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
            >
              <option value="">All Sessions</option>
              {programNames.map((session) => (
                <option value={session} key={session}>{session}</option>
              ))}
            </select>
          </div>
          
          {/* Date Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Date:</label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={feedbackDateFilter}
              onChange={(e) => setFeedbackDateFilter(e.target.value)}
            >
              <option value="">All Dates</option>
              {Array.from(new Set(feedbackData.map((row: any) => {
                if (row["Timestamp"]) {
                  return new Date(row["Timestamp"]).toLocaleDateString();
                }
                return null;
              }).filter((date): date is string => date !== null))).map((date) => (
                <option value={date} key={date}>{date}</option>
              ))}
            </select>
          </div>
          
          {/* Rating Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">Rating:</label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={feedbackRatingFilter}
              onChange={(e) => setFeedbackRatingFilter(e.target.value)}
            >
              <option value="">All Ratings</option>
              <option value="1">1 - Poor</option>
              <option value="2">2 - Fair</option>
              <option value="3">3 - Good</option>
              <option value="4">4 - Very Good</option>
              <option value="5">5 - Excellent</option>
            </select>
          </div>
        </div>
        
        {/* Clear Filters Button */}
        <div className="mb-4">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            onClick={() => {
              setFeedbackSearch("");
              setSelectedSessionFilter("");
              setFeedbackDateFilter("");
              setFeedbackRatingFilter("");
            }}
          >
            Clear All Filters
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Showing {filteredFeedback.length} of {feedbackData.length} feedback responses
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() => downloadCSV(filteredFeedback, "feedback_responses.csv")}
            >
              Download as CSV
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded"
              onClick={() => downloadExcel(filteredFeedback, "feedback_responses.xlsx")}
            >
              Download as Excel
            </button>
         
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full border text-xs">
            <thead>
              <tr>
                {Object.keys(filteredFeedback[0] || {}).map((key) => (
                  <th key={key} className="border px-2 py-1">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFeedback.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'}>
                  {Object.keys(filteredFeedback[0] || {}).map((key, j) => (
                    <td key={j} className="border px-2 py-1">{(row as Record<string, any>)[key] == null ? '' : String((row as Record<string, any>)[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </div>
  );
}

export default DashboardOverview3;
