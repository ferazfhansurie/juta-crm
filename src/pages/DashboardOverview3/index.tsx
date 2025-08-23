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
import axios from "axios";

// Replace with your published CSV URLs
// CSV URL for MTDC Participants Submissions
const RSVP_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9Wlb5GVpeT1FUavQdufnLukU1oyRWh1AaKKSJlGoFAAgjqxIh4JeHcNkK58JHT4BBP_qrkQacDtYc/pub?output=csv";
const FEEDBACK_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRF9tqpNSgFqdvgPBYvspa84gX1_0y06oUokzZ9p-_LSv4qrxtJqUCN66_dFFsMcQ/pub?output=csv";
const AI_HORIZON_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs940ohQfGSntt_R3wkLw8sVDt7gRnvwB4W9WwmmWjrV49MstVq0Rz097egHvvDcBj9YXu97EO64Ep/pub?output=csv";

// Neon database base URL
const baseUrl = "https://juta-dev.ngrok.dev";

// Helper function to get company ID
const getCompanyId = async () => {
  try {
    console.log("[getCompanyId] Getting company data...");
    const { companyId } = await getCompanyApiUrl();
    console.log("[getCompanyId] Company ID retrieved:", companyId);
    return companyId;
  } catch (error) {
    console.error("[getCompanyId] Error getting company ID:", error);
    throw error;
  }
};

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
  className = "",
}) => {
  const chartData: ChartData = useMemo(() => {
    // Ensure we have valid data
    const validData = data.filter((value, index) => value > 0 && labels[index]);
    const validLabels = labels.filter((label, index) => data[index] > 0);

    // Ensure colors array matches data length
    const validColors = validData.map(
      (_, index) => colors[index % colors.length]
    );

    return {
      labels: validLabels,
      datasets: [
        {
          data: validData,
          backgroundColor: validColors,
          hoverBackgroundColor: validColors,
          borderWidth: 2,
          borderColor: "#ffffff",
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
          position: "bottom" as const,
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
  if (!data || data.length === 0 || data.every((val) => val === 0)) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
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
    const cacheBustUrl =
      url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();

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
    .replace(/\s+/g, " ") // collapse spaces
    .trim();
}

// Remove date prefixes from program names (e.g., "14 May - Generative AI..." -> "Generative AI...")
function cleanProgramName(name: string) {
  if (!name) return "Unspecified";

  let cleaned = name
    .trim()
    // Remove date prefixes more comprehensively
    .replace(/^\d{1,2}\s+[A-Za-z]+(\s*[-–]\s*|\s*$)/, "")
    // Remove date in parentheses (e.g., "(01/01/2023 10:00:00)")
    .replace(/\s*\(\d{1,2}\/\d{1,2}\/\d{4}.*\)/, "")
    // Remove "(Unspecified)" or similar non-date suffixes in parentheses
    .replace(/\s*\(Unspecified\)/i, "")
    // Remove specific date strings like ", 26 May" or ", 5 May"
    .replace(/,\s*\d{1,2}\s+\w+/, "")
    // Remove specific long suffixes that might contain dates or other info
    .replace(
      /,\s*\d{1,2}\s+\w+\s*-\s*AI-Powered Visibility: Leveraging Google Business Profile \(GBP\) to Grow Your Business/,
      ""
    )
    .replace(
      /,\s*\d{1,2}\s+\w+\s*-\s*Generative AI in Social Media Marketing/,
      ""
    )
    // Normalize whitespace and remove extra spaces
    .replace(/\s+/g, " ")
    .trim();

  // Handle complex AI Horizon combinations - keep the most descriptive part
  // For combinations like "A - B - C", keep the longest meaningful part
  if (cleaned.includes(" - ")) {
    const parts = cleaned
      .split(" - ")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length > 1) {
      // Find the part with the most descriptive content (longest meaningful part)
      const meaningfulParts = parts.filter(
        (part) =>
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
  return cleaned || "Unspecified";
}

// Additional function to normalize program names more aggressively for deduplication
function normalizeProgramNameForDedup(name: string) {
  if (!name) return "";

  return (
    name
      .toLowerCase()
      .trim()
      // Remove common punctuation and special characters
      .replace(/[^\w\s]/g, " ")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      // Handle common variations like "Automation" vs "Automations"
      .replace(/\bautomations\b/g, "automation")
      .replace(/\bautomation\b/g, "automation")
      // Handle other common plural/singular variations
      .replace(/\btechnologies\b/g, "technology")
      .replace(/\bapplications\b/g, "application")
      .replace(/\bsolutions\b/g, "solution")
      .trim()
  );
}

// Function to check if two program names are similar enough to merge
function isSimilarProgram(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;

  // If they're exactly the same after normalization, they're identical
  if (name1 === name2) return true;

  // Split into words and compare
  const words1 = name1.split(/\s+/).filter((word) => word.length > 2);
  const words2 = name2.split(/\s+/).filter((word) => word.length > 2);

  if (words1.length === 0 || words2.length === 0) return false;

  // Count matching words
  let matchingWords = 0;
  words1.forEach((word1) => {
    if (
      words2.some(
        (word2) =>
          word1.includes(word2) || word2.includes(word1) || word1 === word2
      )
    ) {
      matchingWords++;
    }
  });

  // Calculate similarity percentage
  const similarity = matchingWords / Math.max(words1.length, words2.length);

  // Consider programs similar if they share 80%+ of their key words
  return similarity >= 0.8;
}

function getProgramFront(name: string, wordCount = 3) {
  const cleaned = cleanProgramName(name);
  const normalized = normalizeProgramName(cleaned);
  return normalized.split(" ").slice(0, wordCount).join(" ");
}

const feedbackMetrics = [
  { key: "How would you rate overall session?", label: "Overall satisfaction" },
  {
    key: "How effective was the trainer delivering the content?",
    label: "Trainer effectiveness",
  },
  {
    key: "How relevant was the content to your interests or role?",
    label: "Content relevance",
  },
  {
    key: "Does the training meet your expectations?",
    label: "Fulfilment of expectations",
  },
  { key: "How would you rate the event venue?", label: "Event venue/facility" },
  {
    key: "How satisfied were you with the opportunities for interaction (e.g., Q&A sessions, networking)? ",
    label: "Networking opportunities",
  },
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
        January: "01",
        Jan: "01",
        February: "02",
        Feb: "02",
        March: "03",
        Mar: "03",
        April: "04",
        Apr: "04",
        May: "05",
        June: "06",
        Jun: "06",
        July: "07",
        Jul: "07",
        August: "08",
        Aug: "08",
        September: "09",
        Sep: "09",
        October: "10",
        Oct: "10",
        November: "11",
        Nov: "11",
        December: "12",
        Dec: "12",
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
  const rows = data.map((row) => columns.map((col) => row[col] ?? ""));
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
  try {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      throw new Error("No user email found");
    }

    console.log("Getting company data for email:", userEmail);
    console.log("Base URL:", baseUrl);

    const response = await fetch(
      `${baseUrl}/api/user-company-data?email=${encodeURIComponent(userEmail)}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Company data response status:", response.status);
    console.log(
      "Company data response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Company data error response body:", errorText);

      let errorMessage = `Failed to fetch company data: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage += ` - ${errorJson.error}`;
        } else if (errorJson.message) {
          errorMessage += ` - ${errorJson.message}`;
        }
      } catch (e) {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("Company data response:", data);

    if (!data.userData?.companyId) {
      throw new Error("Company ID not found in response");
    }

    const result = {
      apiUrl: data.companyData?.api_url || baseUrl,
      companyId: data.userData.companyId,
    };

    console.log("Returning company data:", result);
    return result;
  } catch (error) {
    console.error("Error in getCompanyApiUrl:", error);
    throw error;
  }
};

// Helper to upload a file to NeonDB storage and get a public URL
// Using the same approach as the working Chat component
const uploadFile = async (
  file: File | Blob,
  fileName: string
): Promise<string> => {
  try {
    const { apiUrl, companyId } = await getCompanyApiUrl();

    // Validate file before upload
    if (!file || file.size === 0) {
      throw new Error("File is empty or invalid");
    }

    // For PDFs, ensure proper MIME type
    let uploadFile = file;
    if (
      fileName.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      uploadFile = new Blob([file], { type: "application/pdf" });
      console.log("Fixed PDF MIME type for upload:", {
        originalType: file.type,
        newType: uploadFile.type,
      });
    }

    console.log("Uploading file using Chat component method:", {
      apiUrl,
      companyId,
      fileName,
      fileSize: uploadFile.size,
      fileType: uploadFile.type,
    });

    // Use the same upload endpoint as the working Chat component
    const formData = new FormData();
    formData.append("file", uploadFile);

    console.log("FormData entries:");
    for (let [key, value] of formData.entries()) {
      if (value instanceof Blob) {
        console.log(`  ${key}:`, { type: value.type, size: value.size });
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    // Use /api/upload-media like the Chat component (not /api/upload-file)
    const response = await fetch(`${apiUrl}/api/upload-media`, {
      method: "POST",
      body: formData,
    });

    console.log("Upload response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload error response body:", errorText);
      throw new Error(
        `Upload failed with status ${response.status}: ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Upload success response:", result);

    if (!result.url) {
      throw new Error("Upload response missing URL");
    }

    return result.url;
  } catch (error) {
    console.error("Error in uploadFile:", error);
    throw error;
  }
};

// Helper to send a WhatsApp document message
const sendDocumentMessage = async (
  chatId: string,
  documentUrl: string,
  fileName: string,
  caption: string
) => {
  try {
    const { apiUrl, companyId } = await getCompanyApiUrl();
    const userName =
      localStorage.getItem("userName") ||
      localStorage.getItem("userEmail") ||
      "";
    const phoneIndex = 0;

    console.log("Sending document message:", {
      apiUrl,
      companyId,
      chatId,
      userName,
      phoneIndex,
      documentUrl,
      fileName,
      caption,
    });

    const requestBody = {
      documentUrl: documentUrl,
      filename: fileName,
      phoneIndex: phoneIndex,
      userName: userName,
    };

    console.log("Request body:", requestBody);

    const response = await fetch(
      `${apiUrl}/api/v2/messages/document/${companyId}/${chatId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response body:", errorText);

      let errorMessage = `API failed with status ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage += `: ${errorJson.error}`;
        } else if (errorJson.message) {
          errorMessage += `: ${errorJson.message}`;
        }
      } catch (e) {
        if (errorText) {
          errorMessage += `: ${errorText}`;
        }
      }

      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log("Success response:", responseData);
    return responseData;
  } catch (error) {
    console.error("Error in sendDocumentMessage:", error);
    throw error;
  }
};

// Helper to send a WhatsApp text message
const sendTextMessage = async (chatId: string, text: string) => {
  try {
    const { apiUrl, companyId } = await getCompanyApiUrl();
    const userName =
      localStorage.getItem("userName") ||
      localStorage.getItem("userEmail") ||
      "";
    const phoneIndex = 0;

    console.log("Sending text message:", {
      apiUrl,
      companyId,
      chatId,
      userName,
      phoneIndex,
      messageLength: text.length,
    });

    const requestBody = {
      message: text,
      phoneIndex: phoneIndex,
      userName: userName,
    };

    console.log("Request body:", requestBody);

    const response = await fetch(
      `${apiUrl}/api/v2/messages/text/${companyId}/${chatId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response body:", errorText);

      let errorMessage = `API failed with status ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage += `: ${errorJson.error}`;
        } else if (errorJson.message) {
          errorMessage += `: ${errorJson.message}`;
        }
      } catch (e) {
        if (errorText) {
          errorMessage += `: ${errorText}`;
        }
      }

      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log("Success response:", responseData);
    return responseData;
  } catch (error) {
    console.error("Error in sendTextMessage:", error);
    throw error;
  }
};

// Custom hooks for fetching data from database APIs
function useFeedbackResponses() {
  const [feedbackResponses, setFeedbackResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedbackResponses = async () => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors

        console.log("Fetching feedback responses...");
        const { companyId } = await getCompanyApiUrl();
        console.log("Company ID retrieved:", companyId);

        const apiUrl = `${baseUrl}/api/feedback-responses?company_id=${companyId}`;
        console.log("API URL:", apiUrl);

        const response = await axios.get(apiUrl);
        console.log("API response status:", response.status);
        console.log("API response data:", response.data);

        if (response.data.success) {
          setFeedbackResponses(response.data.feedbackResponses);
          console.log(
            "Successfully set feedback responses:",
            response.data.feedbackResponses
          );
        } else {
          const errorMsg = response.data.error || "API returned success: false";
          console.error("API returned error:", errorMsg);
          setError(`API Error: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error("Error fetching feedback responses:", err);

        // Provide more specific error information
        let errorMessage = "Error fetching feedback responses";
        if (err.response) {
          // Server responded with error status
          errorMessage = `Server Error: ${err.response.status} - ${err.response.statusText}`;
          if (err.response.data?.error) {
            errorMessage += `: ${err.response.data.error}`;
          }
        } else if (err.request) {
          // Request was made but no response received
          errorMessage = "Network Error: No response from server";
        } else {
          // Something else happened
          errorMessage = `Request Error: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackResponses();
  }, []);

  return { feedbackResponses, loading, error };
}

function useEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching events...");
        const { companyId } = await getCompanyApiUrl();
        console.log("Company ID retrieved:", companyId);

        const apiUrl = `${baseUrl}/api/events?company_id=${companyId}`;
        console.log("API URL:", apiUrl);

        const response = await axios.get(apiUrl);
        console.log("API response status:", response.status);
        console.log("API response data:", response.data);

        if (response.data.success) {
          setEvents(response.data.events);
          console.log("Successfully set events:", response.data.events);
        } else {
          const errorMsg = response.data.error || "API returned success: false";
          console.error("API returned error:", errorMsg);
          setError(`API Error: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error("Error fetching events:", err);

        let errorMessage = "Error fetching events";
        if (err.response) {
          errorMessage = `Server Error: ${err.response.status} - ${err.response.statusText}`;
          if (err.response.data?.error) {
            errorMessage += `: ${err.response.data.error}`;
          }
        } else if (err.request) {
          errorMessage = "Network Error: No response from server";
        } else {
          errorMessage = `Request Error: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return { events, loading, error };
}

function useEnrollees() {
  const [enrollees, setEnrollees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnrollees = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching enrollees...");
        const { companyId } = await getCompanyApiUrl();
        console.log("Company ID retrieved:", companyId);

        const apiUrl = `${baseUrl}/api/enrollees?company_id=${companyId}`;
        console.log("API URL:", apiUrl);

        const response = await axios.get(apiUrl);
        console.log("API response status:", response.status);
        console.log("API response data:", response.data);

        if (response.data.success) {
          setEnrollees(response.data.enrollees);
          console.log("Successfully set enrollees:", response.data.enrollees);
        } else {
          const errorMsg = response.data.error || "API returned success: false";
          console.error("API returned error:", errorMsg);
          setError(`API Error: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error("Error fetching enrollees:", err);

        let errorMessage = "Error fetching enrollees";
        if (err.response) {
          errorMessage = `Server Error: ${err.response.status} - ${err.response.statusText}`;
          if (err.response.data?.error) {
            errorMessage += `: ${err.response.data.error}`;
          }
        } else if (err.request) {
          errorMessage = "Network Error: No response from server";
        } else {
          errorMessage = `Request Error: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollees();
  }, []);

  return { enrollees, loading, error };
}

function useParticipants() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching participants...");
        const { companyId } = await getCompanyApiUrl();
        console.log("Company ID retrieved:", companyId);

        const apiUrl = `${baseUrl}/api/participants?company_id=${companyId}`;
        console.log("API URL:", apiUrl);

        const response = await axios.get(apiUrl);
        console.log("API response status:", response.status);
        console.log("API response data:", response.data);

        if (response.data.success) {
          setParticipants(response.data.participants);
          console.log(
            "Successfully set participants:",
            response.data.participants
          );
        } else {
          const errorMsg = response.data.error || "API returned success: false";
          console.error("API returned error:", errorMsg);
          setError(`API Error: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error("Error fetching participants:", err);

        let errorMessage = "Error fetching participants";
        if (err.response) {
          errorMessage = `Server Error: ${err.response.status} - ${err.response.statusText}`;
          if (err.response.data?.error) {
            errorMessage += `: ${err.response.data.error}`;
          }
        } else if (err.request) {
          errorMessage = "Network Error: No response from server";
        } else {
          errorMessage = `Request Error: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, []);

  return { participants, loading, error };
}

function DashboardOverview3() {
  // Fetch CSV data
  const rsvpData = useSheetData(RSVP_CSV_URL);
  const aiHorizonRSVP = useSheetData(AI_HORIZON_CSV_URL);
  const feedbackData = useSheetData(FEEDBACK_CSV_URL);

  // Fetch Neon database data
  const { events, loading: eventsLoading, error: eventsError } = useEvents();
  const {
    enrollees,
    loading: enrolleesLoading,
    error: enrolleesError,
  } = useEnrollees();
  const {
    participants,
    loading: participantsLoading,
    error: participantsError,
  } = useParticipants();
  const {
    feedbackResponses: neonFeedbackResponses,
    loading: feedbackResponsesLoading,
    error: feedbackResponsesError,
  } = useFeedbackResponses();
  const [selectedProgram, setSelectedProgram] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
  const [showAllProgramsInCategory, setShowAllProgramsInCategory] =
    useState(false);
  // Search/filter state for raw data tables
  const [participantSearch, setParticipantSearch] = useState("");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("");

  // Additional filters for participants table
  const [participantProgramFilter, setParticipantProgramFilter] = useState("");
  const [participantCategoryFilter, setParticipantCategoryFilter] =
    useState("");
  const [participantProfessionFilter, setParticipantProfessionFilter] =
    useState("");
  const [participantStatusFilter, setParticipantStatusFilter] = useState("");
  const [participantAttendanceFilter, setParticipantAttendanceFilter] =
    useState("");

  // Additional filters for feedback table
  const [feedbackDateFilter, setFeedbackDateFilter] = useState("");
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".program-dropdown")) {
        setProgramDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Auto-select "All Programs in Category" when category is selected (for participant filters)
  useEffect(() => {
    if (participantCategoryFilter && !participantProgramFilter) {
      // Only auto-select if no program is currently selected
      setParticipantProgramFilter(
        `all_in_category_${participantCategoryFilter}`
      );
    } else if (
      !participantCategoryFilter &&
      participantProgramFilter.startsWith("all_in_category_")
    ) {
      // Clear the special program filter when category is cleared
      setParticipantProgramFilter("");
    }
  }, [participantCategoryFilter]);

  // Auto-select "All Programs in Category" when category is selected (for Program-Specific Dashboard)
  useEffect(() => {
    if (
      selectedCategory &&
      !showAllProgramsInCategory &&
      selectedProgram === 0
    ) {
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

  // Add state for individual certificate sending
  const [sendingIndividualCert, setSendingIndividualCert] = useState<Record<string, boolean>>({});
  const [sendingBulkCert, setSendingBulkCert] = useState(false);
  const [selectedFeedbackProgram, setSelectedFeedbackProgram] = useState<string>("");
  const [feedbackCertModalOpen, setFeedbackCertModalOpen] = useState(false);
  const [feedbackAttendeesToSend, setFeedbackAttendeesToSend] = useState<any[]>([]);
  const [feedbackSendingModalOpen, setFeedbackSendingModalOpen] = useState(false);
  const [feedbackSendingInProgress, setFeedbackSendingInProgress] = useState(false);
  const [feedbackSendingStatus, setFeedbackSendingStatus] = useState<Array<{ name: string; phone: string; status: string }>>([]);
  const [failedNumbersInput, setFailedNumbersInput] = useState<string>("");

  // Add state for selected program for sending certificates
  const [selectedSendProgram, setSelectedSendProgram] = useState<string>("");

  // Add state for attendees to send (with selection)
  const [attendeesToSend, setAttendeesToSend] = useState<any[]>([]);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [excludedPhones, setExcludedPhones] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Add state for feedback dashboard filters
  const [feedbackDashboardProgramFilter, setFeedbackDashboardProgramFilter] =
    useState<string>("");
  const [feedbackDashboardCategoryFilter, setFeedbackDashboardCategoryFilter] =
    useState<string>("");

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
    Company:
      row["Nama Syarikat/Kementerian/Jabatan/Agensi"]?.trim() ||
      row["Company"]?.trim() ||
      "",
    Phone: row["Mobile Number"]?.trim() || row["Phone"]?.trim() || "",
    Email: row["Email"]?.trim() || "",
    "Program Name":
      row["Daftar Kursus"]?.trim() || row["Program Name"]?.trim() || "",
    "Program Date & Time":
      extractDateFromDaftarKursus(row["Daftar Kursus"]) ||
      row["Program Date & Time"]?.trim() ||
      "",
    "RSVP status": "Accepted", // Assume all AI Horizon as accepted
    "Attendance status": "Accepted", // Mark as attended
    Profession: row["Pekerjaan"]?.trim() || "",
    Category: row["Category"]?.trim() || "",
    // ...other fields
  }));

  // Helper to normalize profession responses
  function normalizeProfession(profession: string): string {
    if (!profession) return "Unspecified";

    const prof = profession.trim();

    // Handle numbered responses (1. SME / SMI / Private Company)
    if (prof.match(/^\d+\.\s+/)) {
      const number = prof.match(/^(\d+)\.\s+/)?.[1];
      if (!number) return "Unspecified";

      const professionMap: { [key: string]: string } = {
        "1": "SME / SMI / Private Company",
        "2": "Government Agency / Research Institute",
        "3": "Ministry / Government Staff / Civil Servant",
        "4": "University (Staff / Lecturers / Researchers)",
        "5": "University / College Student",
        "6": "Individual",
        "7": "Others",
      };
      return professionMap[number] || "Unspecified";
    }

    // Handle just numbers (1, 2, 3, etc.)
    if (prof.match(/^\d+$/)) {
      const professionMap: { [key: string]: string } = {
        "1": "SME / SMI / Private Company",
        "2": "Government Agency / Research Institute",
        "3": "Ministry / Government Staff / Civil Servant",
        "4": "University (Staff / Lecturers / Researchers)",
        "5": "University / College Student",
        "6": "Individual",
        "7": "Others",
      };
      return professionMap[prof as keyof typeof professionMap] || "Unspecified";
    }

    // Handle malformed responses like "(1)", "(choose one):", etc.
    if (
      prof.match(/^\([^)]*\)$/) ||
      prof.includes("choose") ||
      prof.includes("type") ||
      prof.includes("number")
    ) {
      return "Unspecified";
    }

    // Handle responses like "(3)Others" - extract the actual profession
    const match = prof.match(/^\((\d+)\)(.+)/);
    if (match && match[1]) {
      const number = match[1];
      const professionMap: { [key: string]: string } = {
        "1": "SME / SMI / Private Company",
        "2": "Government Agency / Research Institute",
        "3": "Ministry / Government Staff / Civil Servant",
        "4": "University (Staff / Lecturers / Researchers)",
        "5": "University / College Student",
        "6": "Individual",
        "7": "Others",
      };
      return professionMap[number] || "Unspecified";
    }

    // Handle responses like "1. SME / SMI / Private Company SME" - clean up duplicates
    if (prof.includes("SME / SMI / Private Company")) {
      return "SME / SMI / Private Company";
    }

    // Handle responses like "Manager (Private Company)" - map to SME category
    if (
      prof.includes("Private Company") ||
      (prof.includes("Manager") && prof.includes("Company"))
    ) {
      return "SME / SMI / Private Company";
    }

    // Handle responses like "Government Staff" - map to Ministry category
    if (prof.includes("Government Staff") || prof.includes("Government")) {
      return "Ministry / Government Staff / Civil Servant";
    }

    // Handle responses like "University student" - map to University Student category
    if (
      prof.toLowerCase().includes("university") &&
      prof.toLowerCase().includes("student")
    ) {
      return "University / College Student";
    }

    // Handle responses like "University (Staff / Lecturers / Researchers)" variations
    if (
      prof.toLowerCase().includes("university") &&
      (prof.toLowerCase().includes("staff") ||
        prof.toLowerCase().includes("lecturer") ||
        prof.toLowerCase().includes("researcher"))
    ) {
      return "University (Staff / Lecturers / Researchers)";
    }

    // If it's a valid profession name, return as is
    if (prof.length > 2 && !prof.match(/^[^a-zA-Z]*$/)) {
      return prof;
    }

    return "Unspecified";
  }

  // Helper to normalize phone numbers (remove non-digits, handle Malaysia country code)
  function normalizePhone(phone: string) {
    let digits = (phone || "").replace(/\D/g, "");

    // Handle different formats:
    // +60123456789 -> 60123456789
    // 0123456789 -> 60123456789
    // 123456789 -> 60123456789
    // 60123456789 -> 60123456789 (already correct)
    // 194304533 -> 60194304533 (add country code)

    if (digits) {
      if (digits.startsWith("60")) {
        return digits; // Already has country code
      } else if (digits.startsWith("0")) {
        return "6" + digits; // Remove leading 0, add country code
      } else if (digits.length >= 8) {
        // For numbers like "194304533" that don't start with 0 or 60
        return "60" + digits; // Add full Malaysia country code
      }
    }

    return digits;
  }

  // Process Neon participants data to match CSV format
  const processedNeonParticipants = useMemo(() => {
    if (!participants.length || !enrollees.length || !events.length) return [];

    return participants.map((participant) => {
      const enrollee = enrollees.find((e) => e.id === participant.enrollee_id);
      const event = events.find((e) => e.id === participant.event_id);

      return {
        Date: new Date(participant.created_at).toLocaleDateString(),
        "Full Name": enrollee?.name || "Unknown",
        Company: enrollee?.organisation || "",
        Phone: enrollee?.mobile_number || "",
        Email: enrollee?.email || "",
        "Program Name": event?.name || "Unknown Event",
        "Program Date & Time": `${event?.start_date} ${event?.start_time}`,
        "RSVP status":
          participant.payment_status_id === "paid" ? "Accepted" : "Pending",
        "Attendance status": participant.is_attended ? "Accepted" : "Pending",
        Profession: enrollee?.designation || "",
        Category: "Neon Event", // Default category for Neon-only participants
        // Additional fields for compatibility
        "Reference Number": participant.reference_number,
        Remarks: participant.remarks,
        "Event ID": participant.event_id,
        "Enrollee ID": participant.enrollee_id,
        Source: "Neon Database",
      };
    });
  }, [participants, enrollees, events]);

  // Merge both RSVP sources and deduplicate by normalized email and phone
  function mergeRSVPByEmailAndPhone(data: any[]) {
    // Don't merge - allow multiple programs per person
    // Just return the data as-is, but remove any completely empty rows
    return data.filter((row) => {
      const email = normalizeEmail(row.Email);
      const phone = normalizePhone(row.Phone);
      const programName = row["Program Name"]?.trim();

      // Keep rows that have at least email or phone, and a program name
      return (email || phone) && programName;
    });
  }

  // Merge CSV and Neon RSVP data
  const mergedRSVP = useMemo(() => {
    const csvData = mergeRSVPByEmailAndPhone([
      ...normalizedMtdc,
      ...normalizedAihorizon,
    ]);
    const neonData = processedNeonParticipants;

    // Create a set of existing emails and phones from CSV to avoid duplicates
    const existingEmails = new Set(
      csvData.map((row) => normalizeEmail(row.Email)).filter(Boolean)
    );
    const existingPhones = new Set(
      csvData.map((row) => normalizePhone(row.Phone)).filter(Boolean)
    );

    // Find Neon participants that aren't in the CSV data
    const neonOnlyParticipants = neonData.filter((row) => {
      const normalizedEmail = normalizeEmail(row.Email);
      const normalizedPhone = normalizePhone(row.Phone);

      // Check if this participant already exists in CSV data
      const alreadyExists =
        (normalizedEmail && existingEmails.has(normalizedEmail)) ||
        (normalizedPhone && existingPhones.has(normalizedPhone));

      return !alreadyExists && (normalizedEmail || normalizedPhone);
    });

    console.log("📊 CSV + Neon Data Merge Results:", {
      csvCount: csvData.length,
      neonCount: neonData.length,
      neonOnlyCount: neonOnlyParticipants.length,
      finalCount: csvData.length + neonOnlyParticipants.length,
      csvSources: {
        mtdc: normalizedMtdc.length,
        aiHorizon: normalizedAihorizon.length,
      },
      neonSources: {
        events: events.length,
        enrollees: enrollees.length,
        participants: participants.length,
      },
    });

    // Log sample of programs from each source
    console.log(
      "📋 Sample Programs from CSV:",
      csvData.slice(0, 5).map((r) => ({
        programName: r["Program Name"],
        dateTime: r["Program Date & Time"],
        source: "CSV",
      }))
    );

    console.log(
      "📋 Sample Programs from Neon:",
      neonData.slice(0, 5).map((r) => ({
        programName: r["Program Name"],
        dateTime: r["Program Date & Time"],
        source: "Neon",
      }))
    );

    // Combine CSV data with Neon-only participants
    return [...csvData, ...neonOnlyParticipants];
  }, [
    normalizedMtdc,
    normalizedAihorizon,
    processedNeonParticipants,
    events,
    enrollees,
    participants,
  ]);

  // Log sample of programs from each source for debugging
  console.log(
    "📋 Sample Programs from CSV:",
    mergedRSVP
      .slice(0, 10)
      .filter((r) => !r.Source || r.Source !== "Neon Database")
      .map((r) => ({
        programName: r["Program Name"],
        dateTime: r["Program Date & Time"],
        source: "CSV",
      }))
  );

  console.log(
    "📋 Sample Programs from Neon:",
    mergedRSVP
      .slice(0, 10)
      .filter((r) => r.Source === "Neon Database")
      .map((r) => ({
        programName: r["Program Name"],
        dateTime: r["Program Date & Time"],
        source: "Neon",
      }))
  );

  // Merge CSV feedback data with Neon database feedback responses
  const mergedFeedbackData = useMemo(() => {
    if (!neonFeedbackResponses || neonFeedbackResponses.length === 0) {
      return feedbackData;
    }

    // Convert Neon feedback responses to match CSV format
    const neonFeedbackFormatted = neonFeedbackResponses.map((response: any) => {
      // Create a base feedback object
      const feedbackObj: any = {
        id: response.id,
        form_id: response.form_id,
        phone_number: response.phone_number,
        submitted_at: response.submitted_at,
        created_at: response.created_at,
        form_title: response.form_title,
        // Map responses to CSV format
        Email: "", // Will be filled if available in responses
        "Which session did you attend?":
          response.form_title || "Unknown Session",
        // Initialize all rating fields from feedbackMetrics
        "How would you rate overall session?": "",
        "How effective was the trainer delivering the content?": "",
        "How relevant was the content to your interests or role?": "",
        "Does the training meet your expectations?": "",
        "How would you rate the event venue?": "",
        "How satisfied were you with the opportunities for interaction (e.g., Q&A sessions, networking)? ":
          "",
        "How well was the session organized?": "",
        "Would you recommend this session to others?": "",
        "What aspects of the session did you find most valuable?": "",
        "What suggestions do you have for improvement?": "",
        "Additional comments": "",
      };

      // Map individual field responses to CSV format using exact matches
      if (response.responses && Array.isArray(response.responses)) {
        // Debug log to see the actual structure
        console.log("Neon feedback response structure:", response.responses);

        let mappedFields = 0;
        let totalFields = response.responses.length;

        response.responses.forEach((field: any) => {
          const question = field.question;
          const answer = field.answer;

          // Exact match mapping based on the actual Neon database field names
          switch (question) {
            case "How would you rate overall session?":
              feedbackObj["How would you rate overall session?"] = answer;
              mappedFields++;
              break;
            case "How effective was the trainer delivering the content?":
              feedbackObj[
                "How effective was the trainer delivering the content?"
              ] = answer;
              mappedFields++;
              break;
            case "How relevant was the content to your interests or role?":
              feedbackObj[
                "How relevant was the content to your interests or role?"
              ] = answer;
              mappedFields++;
              break;
            case "Does the training meet your expectations?":
              feedbackObj["Does the training meet your expectations?"] = answer;
              mappedFields++;
              break;
            case "How would you rate the event venue?":
              feedbackObj["How would you rate the event venue?"] = answer;
              mappedFields++;
              break;
            case "How satisfied were you with the opportunities for interaction (e.g., Q&A sessions, networking)?":
              feedbackObj[
                "How satisfied were you with the opportunities for interaction (e.g., Q&A sessions, networking)? "
              ] = answer;
              mappedFields++;
              break;
            case "How well was the session organized?":
              feedbackObj["How well was the session organized?"] = answer;
              mappedFields++;
              break;
            case "Would you recommend this session to others?":
              feedbackObj["Would you recommend this session to others?"] =
                answer;
              mappedFields++;
              break;
            case "What aspects of the session did you find most valuable?":
              feedbackObj[
                "What aspects of the session did you find most valuable?"
              ] = answer;
              mappedFields++;
              break;
            case "What suggestions do you have for improvement?":
              feedbackObj["What suggestions do you have for improvement?"] =
                answer;
              mappedFields++;
              break;
            case "Additional comments":
              feedbackObj["Additional comments"] = answer;
              mappedFields++;
              break;
            default:
              // Log any unmapped fields for debugging
              console.log("Unmapped Neon field:", {
                question: field.question,
                answer: field.answer,
              });
              break;
          }
        });

        // Debug log for the mapped feedback object
        console.log("Mapped Neon feedback object:", feedbackObj);
        console.log(
          `Field mapping summary: ${mappedFields}/${totalFields} fields successfully mapped`
        );
      }

      return feedbackObj;
    });

    // Combine CSV and Neon data, with CSV data taking precedence for duplicates
    const combinedFeedback = [...feedbackData, ...neonFeedbackFormatted];

    // Remove duplicates based on form_id and phone_number (for Neon data) or Email (for CSV data)
    const uniqueFeedback = combinedFeedback.filter((feedback, index, self) => {
      if (feedback.form_id && feedback.phone_number) {
        // Neon data - check for duplicates by form_id and phone_number
        return (
          index ===
          self.findIndex(
            (f) =>
              f.form_id === feedback.form_id &&
              f.phone_number === feedback.phone_number
          )
        );
      } else if (feedback.Email) {
        // CSV data - check for duplicates by Email
        return index === self.findIndex((f) => f.Email === feedback.Email);
      }
      return true;
    });

    // Filter out feedback forms that have all 0.0 ratings
    const filteredFeedback = uniqueFeedback.filter((feedback) => {
      // Get all rating fields from feedbackMetrics
      const ratingFields = feedbackMetrics.map((metric) => metric.key);

      // Check if all rating fields are 0.0 or empty/null
      const allRatingsZero = ratingFields.every((field) => {
        const value = feedback[field];
        // Convert to number and check if it's 0 or empty/null
        const numericValue = parseFloat(value);
        return isNaN(numericValue) || numericValue === 0;
      });

      // Keep feedback if NOT all ratings are zero
      return !allRatingsZero;
    });

    return filteredFeedback;
  }, [feedbackData, neonFeedbackResponses]);

  // Helper function to get filtered feedback data based on current filters
  const getFilteredFeedbackData = () => {
    let filteredData = mergedFeedbackData;

    if (
      feedbackDashboardProgramFilter &&
      feedbackDashboardProgramFilter !== "all"
    ) {
      filteredData = filteredData.filter(
        (f: any) =>
          f["Which session did you attend?"] === feedbackDashboardProgramFilter
      );
    }

    if (
      feedbackDashboardCategoryFilter &&
      feedbackDashboardCategoryFilter !== "all"
    ) {
      // Get programs in this category
      const programsInCategory = mergedRSVP
        .filter(
          (r: any) => r.Category?.trim() === feedbackDashboardCategoryFilter
        )
        .map((r: any) => r["Program Name"]);

      filteredData = filteredData.filter((f: any) =>
        programsInCategory.includes(f["Which session did you attend?"])
      );
    }

    return filteredData;
  };

  // Profession breakdown
  const professionCounts: { [key: string]: number } = {};
  mergedRSVP.forEach((r: any) => {
    const prof = normalizeProfession(r.Profession || "Unspecified");
    professionCounts[prof] = (professionCounts[prof] || 0) + 1;
  });
  const professions = Object.entries(professionCounts).map(
    ([label, value]) => ({ label, value: Number(value) })
  );

  // Program breakdown
  const programCounts: { [key: string]: number } = {};
  mergedRSVP.forEach((r: any) => {
    const prog = (r["Program Name"] || "Unknown").trim();
    programCounts[prog] = (programCounts[prog] || 0) + 1;
  });
  const programTypes = Object.entries(programCounts).map(([label, value]) => ({
    label,
    value: Number(value),
  }));

  // Category breakdown
  const categoryCounts: { [key: string]: number } = {};
  mergedRSVP.forEach((r: any) => {
    const cat = (r.Category || "Unspecified").trim();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const categories = Object.entries(categoryCounts).map(([label, value]) => ({
    label,
    value: Number(value),
  }));

  // Totals
  const totalRegistered = mergedRSVP.length;
  // Note: totalAttended will be calculated later after Neon data is fetched

  // Feedback metrics
  const overallFeedback: { [key: string]: number } = {};
  feedbackMetrics.forEach((metric) => {
    const values = getFilteredFeedbackData()
      .map((f: any) => Number(f[metric.key]))
      .filter((v: number) => !isNaN(v));
    overallFeedback[metric.key] = average(values);
  });

  // Helper function to parse date from DD/MM/YYYY HH:MM:SS format
  const parseDate = (dateTimeStr: string): Date => {
    if (!dateTimeStr) return new Date(0); // Default to epoch for sorting

    // Handle Neon UTC timestamps (e.g., "2025-08-25T16:00:00.000Z 09:00:00")
    if (dateTimeStr.includes("T") && dateTimeStr.includes("Z")) {
      // Extract the UTC timestamp part
      const utcMatch = dateTimeStr.match(
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/
      );
      if (utcMatch) {
        const utcTimestamp = utcMatch[1];
        const utcDate = new Date(utcTimestamp);

        // Convert UTC to Malaysia time (UTC+8)
        const malaysiaTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);

        console.log("🌍 Timezone Conversion:", {
          original: dateTimeStr,
          utcTimestamp,
          utcDate: utcDate.toISOString(),
          malaysiaTime: malaysiaTime.toISOString(),
          malaysiaDate: malaysiaTime.toLocaleDateString("en-GB"),
          malaysiaTimeStr: malaysiaTime.toLocaleTimeString("en-GB"),
        });

        return malaysiaTime;
      }
    }

    // Handle DD/MM/YYYY HH:MM:SS format
    const match = dateTimeStr.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/
    );
    if (match) {
      const [, day, month, year, hour, minute, second] = match;
      const result = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      return result;
    }

    // Handle DD/MM/YYYY format (without time)
    const dateOnlyMatch = dateTimeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateOnlyMatch) {
      const [, day, month, year] = dateOnlyMatch;
      const result = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );

      return result;
    }

    // Handle other date formats or return epoch
    const parsedDate = new Date(dateTimeStr);
    const result = isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate;

    return result;
  };

  // Get all unique programs with their dates and combine events with same date
  const allPrograms: Array<{
    name: string;
    dateTime: string;
    parsedDate: Date;
    cleanedName: string;
    combinedNames: string[];
    source: string;
  }> = [];

  mergedRSVP.forEach((r: any) => {
    let dateTime = r["Program Date & Time"] || "";

    // If no date from Program Date & Time, try to extract from program name (for AI Horizon)
    if (!dateTime) {
      dateTime = extractDateFromDaftarKursus(r["Program Name"]);
    }

    // If still no date, try to infer from program name patterns
    if (!dateTime) {
      // Look for date patterns in the program name
      const dateMatch = r["Program Name"].match(
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)/i
      );
      if (dateMatch) {
        const day = dateMatch[1];
        const monthName = dateMatch[2];
        const monthMap: { [key: string]: string } = {
          January: "01",
          Jan: "01",
          February: "02",
          Feb: "02",
          March: "03",
          Mar: "03",
          April: "04",
          Apr: "04",
          May: "05",
          June: "06",
          Jun: "06",
          July: "07",
          Jul: "07",
          August: "08",
          Aug: "08",
          September: "09",
          Sep: "09",
          October: "10",
          Oct: "10",
          November: "11",
          Nov: "11",
          December: "12",
          Dec: "12",
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
      dateTime = "01/01/2025 09:00:00"; // Default date for programs without dates
    }

    const parsedDate = parseDate(dateTime);
    const cleanedName = cleanProgramName(r["Program Name"]);
    const source = r.Source || "CSV";

    // Check if we already have a program with the same date AND similar name
    const existingProgramIndex = allPrograms.findIndex((p) => {
      // First check if dates match (use calendar date comparison, not exact time)
      const existingDate = new Date(p.parsedDate);
      const newDate = new Date(parsedDate);

      // Compare calendar dates (ignore time differences)
      const existingCalendarDate = existingDate.toDateString();
      const newCalendarDate = newDate.toDateString();

      if (existingCalendarDate !== newCalendarDate) {
        return false;
      }

      // Then check if names are similar enough to be the same event
      const normalizedExisting = normalizeProgramName(p.cleanedName);
      const normalizedNew = normalizeProgramName(cleanedName);

      // Check if names are very similar (80%+ similarity)
      return isSimilarProgram(normalizedExisting, normalizedNew);
    });

    if (existingProgramIndex >= 0) {
      // Combine with existing program on the same date
      const existingProgram = allPrograms[existingProgramIndex];

      // Add the new program name if it's not already included
      if (!existingProgram.combinedNames.includes(cleanedName)) {
        existingProgram.combinedNames.push(cleanedName);
      }

      // Update the source to show it's from multiple sources
      if (existingProgram.source !== source) {
        existingProgram.source = "Multiple Sources";
      }

      // Update the name to show it's a combined event
      existingProgram.name = `${existingProgram.combinedNames
        .slice(0, 2)
        .join(" + ")}${
        existingProgram.combinedNames.length > 2 ? " + ..." : ""
      }`;
    } else {
      // Create new program entry
      const program = {
        name: r["Program Name"],
        dateTime: dateTime,
        parsedDate: parsedDate,
        cleanedName: cleanedName,
        combinedNames: [cleanedName],
        source: source,
      };
      allPrograms.push(program);
    }
  });

  // Sort programs by date (latest first)
  const sortedPrograms = allPrograms.sort(
    (a, b) => b.parsedDate.getTime() - a.parsedDate.getTime()
  );

  // Log all programs before deduplication
  console.log(
    "📋 All Programs Before Deduplication:",
    allPrograms.map((p) => ({
      name: p.name,
      cleanedName: p.cleanedName,
      dateTime: p.dateTime,
      source: p.source,
      combinedNames: p.combinedNames,
      combinedCount: p.combinedNames?.length || 1,
    }))
  );

  // Log combined events for debugging
  const combinedEvents = allPrograms.filter(
    (p) => p.combinedNames && p.combinedNames.length > 1
  );
  if (combinedEvents.length > 0) {
    console.log(
      "📅 Combined Events by Date:",
      combinedEvents.map((p) => ({
        date: p.dateTime,
        programs: p.combinedNames,
        displayName: p.name,
        source: p.source,
      }))
    );
  }

  // Get programs available for selected category (for Program-Specific Dashboard) - MOVED UP
  const programsInSelectedCategoryForDashboard = selectedCategory
    ? (() => {
        // Debug: Log raw and cleaned program names to identify duplicates
        const rawProgramNames = mergedRSVP
          .filter((row: any) => row["Category"] === selectedCategory)
          .map((row: any) => row["Program Name"]);

        const cleanedNames = rawProgramNames.map((name) =>
          cleanProgramName(name)
        );

        console.log(
          "Raw program names for dashboard category:",
          selectedCategory,
          rawProgramNames
        );
        console.log("Cleaned program names for dashboard:", cleanedNames);

        // More aggressive deduplication using normalized names
        const normalizedNames = cleanedNames.map((name) =>
          normalizeProgramNameForDedup(name)
        );
        console.log(
          "Normalized names for dashboard deduplication:",
          normalizedNames
        );

        // Debug: Show character-by-character analysis for similar names
        const similarNames = new Map();
        cleanedNames.forEach((name, index) => {
          const normalized = normalizedNames[index];
          if (!similarNames.has(normalized)) {
            similarNames.set(normalized, []);
          }
          similarNames.get(normalized).push({
            original: rawProgramNames[index],
            cleaned: name,
            normalized: normalized,
          });
        });

        // Log any names that have multiple variations
        similarNames.forEach((variations, normalized) => {
          if (variations.length > 1) {
            console.log(
              `🔍 Dashboard - Multiple variations found for normalized name "${normalized}":`
            );
            variations.forEach((variation: any, i: number) => {
              console.log(`  Variation ${i + 1}:`);
              console.log(`    Original: "${variation.original}"`);
              console.log(`    Cleaned: "${variation.cleaned}"`);
              console.log(`    Length: ${variation.cleaned.length}`);
              console.log(
                `    Char codes:`,
                Array.from(variation.cleaned).map((c: any) =>
                  (c as string).charCodeAt(0)
                )
              );
            });
          }
        });

        // Create a map to keep the most descriptive version of each program
        const programMap = new Map();
        cleanedNames.forEach((cleanedName, index) => {
          const normalizedName = normalizedNames[index];
          if (normalizedName && cleanedName) {
            // If we already have this normalized name, keep the longer/more descriptive version
            if (programMap.has(normalizedName)) {
              const existing = programMap.get(normalizedName);
              if (cleanedName.length > existing.length) {
                programMap.set(normalizedName, cleanedName);
              }
            } else {
              programMap.set(normalizedName, cleanedName);
            }
          }
        });

        // Additional merging: Look for programs that are very similar (fuzzy matching)
        const finalPrograms = new Map();
        const programArray = Array.from(programMap.entries());

        programArray.forEach(([normalizedName, cleanedName]) => {
          let merged = false;

          // Check if this program should be merged with an existing one
          for (const [
            existingNormalized,
            existingCleaned,
          ] of finalPrograms.entries()) {
            // If programs are very similar (80%+ similarity), merge them
            if (isSimilarProgram(normalizedName, existingNormalized)) {
              console.log(
                `🔄 Dashboard - Merging similar programs: "${cleanedName}" with "${existingCleaned}"`
              );
              merged = true;
              break;
            }
          }

          if (!merged) {
            finalPrograms.set(normalizedName, cleanedName);
          }
        });

        const uniquePrograms = Array.from(finalPrograms.values())
          .filter(Boolean)
          .map((name) => name.trim())
          .sort();

        console.log(
          "Final deduplicated dashboard programs after fuzzy merging:",
          uniquePrograms
        );

        return uniquePrograms;
      })()
    : [];

  // Get categories available for selected program
  const selectedProgramAvailableCategories = Array.from(
    new Set(
      mergedRSVP
        .filter((r: any) => {
          if (showAllProgramsInCategory && selectedCategory) {
            // If "All Programs in Category" is selected, get categories from all programs in that category
            return programsInSelectedCategoryForDashboard.includes(
              cleanProgramName(r["Program Name"])
            );
          } else {
            // Normal filtering by selected program
            return (
              cleanProgramName(r["Program Name"]) ===
              sortedPrograms[selectedProgram]?.cleanedName
            );
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
            .map((r: any) => cleanProgramName(r["Program Name"]))
            .filter(Boolean)
        )
      )
    : [];

  // Filter programs based on selected category and deduplicate by cleaned name
  const filteredPrograms = selectedCategory
    ? sortedPrograms.filter((program) =>
        selectedCategoryAvailablePrograms.includes(program.cleanedName)
      )
    : sortedPrograms;

  // Deduplicate programs by date AND time, and merge programs without dates
  // Maintain the sorted order (latest first) during deduplication
  const uniquePrograms = filteredPrograms.filter((program, index, self) => {
    // If this program has a valid date (not "Unspecified"), check for duplicates by date AND time
    if (program.dateTime && program.dateTime !== "Unspecified") {
      // Find all programs with the same date and time
      const sameDateTimePrograms = self.filter(
        (p) => p.dateTime === program.dateTime && p.dateTime !== "Unspecified"
      );

      // If there are multiple programs with the same date/time, check if they're the same event
      if (sameDateTimePrograms.length > 1) {
        // Check if any of these programs are actually the same event (similar names)
        const similarPrograms = sameDateTimePrograms.filter(
          (p) =>
            p !== program &&
            isSimilarProgram(
              normalizeProgramName(p.cleanedName),
              normalizeProgramName(program.cleanedName)
            )
        );

        if (similarPrograms.length > 0) {
          // These are the same event, keep the one with the most combined names or longest name
          const bestProgram = sameDateTimePrograms.reduce((best, current) => {
            // Prefer programs with more combined names
            if (current.combinedNames && best.combinedNames) {
              if (current.combinedNames.length !== best.combinedNames.length) {
                return current.combinedNames.length > best.combinedNames.length
                  ? current
                  : best;
              }
            }
            // If same number of combined names, prefer the longer name
            return current.cleanedName.length > best.cleanedName.length
              ? current
              : best;
          });
          return program === bestProgram;
        }

        // If no similar programs, keep the one with the longest name (most descriptive)
        const longestNameProgram = sameDateTimePrograms.reduce(
          (longest, current) =>
            current.cleanedName.length > longest.cleanedName.length
              ? current
              : longest
        );
        return program === longestNameProgram;
      }

      return (
        index ===
        self.findIndex(
          (p) =>
            p.cleanedName === program.cleanedName &&
            p.dateTime === program.dateTime
        )
      );
    }

    // If this program doesn't have a date or has "Unspecified" date, check if there's a similar program with a valid date
    const hasSimilarWithValidDate = self.some(
      (p) =>
        p.dateTime &&
        p.dateTime !== "Unspecified" &&
        p !== program &&
        isSimilarProgram(
          normalizeProgramName(p.cleanedName),
          normalizeProgramName(program.cleanedName)
        )
    );

    // Remove programs without dates or with "Unspecified" dates if there's a similar one with a valid date
    return !hasSimilarWithValidDate;
  });

  // Ensure the final list is still sorted by date (latest first)
  const finalSortedPrograms = uniquePrograms.sort(
    (a, b) => b.parsedDate.getTime() - a.parsedDate.getTime()
  );

  // Log final deduplicated programs
  console.log(
    "🎯 Final Deduplicated Programs:",
    finalSortedPrograms.map((p) => ({
      name: p.name,
      cleanedName: p.cleanedName,
      dateTime: p.dateTime,
      source: p.source,
      combinedNames: p.combinedNames,
      combinedCount: p.combinedNames?.length || 1,
    }))
  );

  // Log deduplication summary
  console.log("🔍 Event Deduplication Summary:", {
    totalPrograms: allPrograms.length,
    combinedEvents: combinedEvents.length,
    uniqueAfterDedup: uniquePrograms.length,
    finalSortedCount: finalSortedPrograms.length,
    deduplicationRatio:
      (
        ((allPrograms.length - finalSortedPrograms.length) /
          allPrograms.length) *
        100
      ).toFixed(1) + "%",
  });

  // For dropdown: show program name with date
  const dropdownNames = finalSortedPrograms.map((program) => {
    if (program.dateTime) {
      // Show combined names if multiple programs on same date
      if (program.combinedNames && program.combinedNames.length > 1) {
        const combinedDisplay = program.combinedNames[0];
        const remainingCount = program.combinedNames.length - 2;
        const suffix = remainingCount > 0 ? ` + ${remainingCount} more` : "";
        return `${combinedDisplay}${suffix} (${program.dateTime})`;
      }
      return `${program.cleanedName} (${program.dateTime})`;
    }
    return program.cleanedName;
  });

  // Log dropdown names for debugging
  console.log(
    "📝 Dropdown Names Generated:",
    dropdownNames.map((name, index) => ({
      index,
      name,
      originalProgram: finalSortedPrograms[index],
    }))
  );

  // When a program is selected:
  const selectedProgramData = finalSortedPrograms[selectedProgram];
  const selectedCleanedName = selectedProgramData?.cleanedName || "";
  const normalizedSelected = normalizeProgramName(selectedCleanedName);

  // Get all program names that should be included for the selected program
  // This handles both individual programs and combined events
  const selectedProgramNames = useMemo(() => {
    if (!selectedProgramData) return [];

    // If this is a combined event, return all the individual program names
    if (
      selectedProgramData.combinedNames &&
      selectedProgramData.combinedNames.length > 1
    ) {
      return selectedProgramData.combinedNames;
    }

    // If it's a single program, return just that name
    return [selectedCleanedName];
  }, [selectedProgramData, selectedCleanedName]);

  console.log("🎯 Selected Program Details:", {
    selectedProgram,
    selectedCleanedName,
    selectedProgramNames,
    isCombinedEvent:
      selectedProgramData?.combinedNames &&
      selectedProgramData.combinedNames.length > 1,
    combinedNames: selectedProgramData?.combinedNames,
    fullSelectedProgramData: selectedProgramData,
  });

  // Log what programs are available for selection
  console.log(
    "📋 Available Programs for Selection:",
    finalSortedPrograms.map((p, index) => ({
      index,
      isSelected: index === selectedProgram,
      name: p.name,
      cleanedName: p.cleanedName,
      dateTime: p.dateTime,
      source: p.source,
      combinedNames: p.combinedNames,
      combinedCount: p.combinedNames?.length || 1,
    }))
  );

  // Get all unique program names from feedback
  const programNames = Array.from(
    new Set(
      mergedFeedbackData.map((f: any) => f["Which session did you attend?"])
    )
  );

  const programFeedback = programNames
    .map((program) => {
      // Apply filters to program feedback
      let feedbacks = mergedFeedbackData.filter(
        (f: any) => f["Which session did you attend?"] === program
      );

      // Apply program filter if selected
      if (
        feedbackDashboardProgramFilter &&
        feedbackDashboardProgramFilter !== "all"
      ) {
        if (program !== feedbackDashboardProgramFilter) {
          return null; // Skip this program if it doesn't match the selected program
        }
      }

      // Apply category filter if selected
      if (
        feedbackDashboardCategoryFilter &&
        feedbackDashboardCategoryFilter !== "all"
      ) {
        const programsInCategory = mergedRSVP
          .filter(
            (r: any) => r.Category?.trim() === feedbackDashboardCategoryFilter
          )
          .map((r: any) => r["Program Name"]);

        if (!programsInCategory.includes(program)) {
          return null; // Skip this program if it's not in the selected category
        }
      }

      const metrics = {};
      feedbackMetrics.forEach((metric) => {
        const values = feedbacks
          .map((f: any) => Number(f[metric.key]))
          .filter((v: number) => !isNaN(v));
        (metrics as Record<string, number | undefined>)[metric.key] =
          average(values);
      });
      return {
        program,
        metrics,
      };
    })
    .filter(
      (
        item
      ): item is {
        program: string;
        metrics: Record<string, number | undefined>;
      } => item !== null
    ); // Remove null entries with proper typing

  // Find all feedback entries that match this program (fuzzy)
  // This handles both individual programs and combined events
  const feedbackForSelected = mergedFeedbackData.filter((f: any) => {
    const feedbackProgramName = f["Which session did you attend?"];
    if (!feedbackProgramName) return false;

    // Check if this feedback matches any of the selected program names
    return selectedProgramNames.some((selectedName) => {
      const normalizedFeedback = normalizeProgramName(feedbackProgramName);
      const normalizedSelected = normalizeProgramName(selectedName);
      return normalizedFeedback === normalizedSelected;
    });
  });

  // Get attendance from both CSV data and Neon attendance_records
  const [neonAttendanceData, setNeonAttendanceData] = useState<any[]>([]);
  const [neonEvents, setNeonEvents] = useState<any[]>([]);

  // Fetch attendance records and events from Neon
  useEffect(() => {
    const fetchNeonData = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) return;

        const response = await fetch(
          `${baseUrl}/api/user-company-data?email=${encodeURIComponent(
            userEmail
          )}`
        );
        if (!response.ok) {
          console.error(
            "❌ Company Data Response Error:",
            response.status,
            response.statusText
          );
          return;
        }

        const data = await response.json();
        console.log("✅ Company Data Response:", data);
        const apiUrl = "https://juta-dev.ngrok.dev";
        const companyId = data.userData.companyId;
        console.log("🔑 Company ID:", companyId);

        // Fetch both attendance records and events from Neon
        const [attendanceResponse, eventsResponse] = await Promise.all([
          fetch(`${apiUrl}/api/attendance-records?company_id=${companyId}`),
          fetch(`${apiUrl}/api/events?company_id=${companyId}`),
        ]);

        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          console.log("✅ Attendance Response:", attendanceData);
          setNeonAttendanceData(attendanceData.attendance_records || []);
        } else {
          console.error(
            "❌ Attendance Response Error:",
            attendanceResponse.status,
            attendanceResponse.statusText
          );
        }

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          console.log("✅ Events Response:", eventsData);
          setNeonEvents(eventsData.events || []);
        } else {
          console.error(
            "❌ Events Response Error:",
            eventsResponse.status,
            eventsResponse.statusText
          );
        }
      } catch (error) {
        console.error("Error fetching Neon data:", error);
      }
    };

    fetchNeonData();
  }, []);

  // Now merge in Neon enrollee data that's not in the CSV
  const mergedRSVPWithNeon = useMemo(() => {
    if (!neonAttendanceData || !neonEvents || neonAttendanceData.length === 0) {
      console.log("📊 No Neon data available for merging");
      return mergedRSVP;
    }

    console.log("📊 Starting Neon enrollee data merge...");
    console.log("📊 CSV participants count:", mergedRSVP.length);
    console.log("📊 Neon attendance records count:", neonAttendanceData.length);
    console.log("📊 Neon events count:", neonEvents.length);

    // Create a set of existing emails and phones from CSV to avoid duplicates
    const existingEmails = new Set(
      mergedRSVP.map((row) => normalizeEmail(row.Email)).filter(Boolean)
    );
    const existingPhones = new Set(
      mergedRSVP.map((row) => normalizePhone(row.Phone)).filter(Boolean)
    );

    // Find Neon enrollees that aren't in the CSV
    const neonOnlyEnrollees: any[] = [];
    const neonMergedCount = { added: 0, skipped: 0 };

    neonAttendanceData.forEach((record: any) => {
      const event = neonEvents.find((e: any) => e.id === record.event_id);
      if (!event) return;

      // Try to find participant info from the record
      const participantEmail = record.email || record.participant_email || "";
      const participantPhone = record.phone || record.participant_phone || "";
      const participantName =
        record.name || record.participant_name || "Unknown";

      const normalizedEmail = normalizeEmail(participantEmail);
      const normalizedPhone = normalizePhone(participantPhone);

      // Check if this participant already exists in CSV data
      const alreadyExists =
        (normalizedEmail && existingEmails.has(normalizedEmail)) ||
        (normalizedPhone && existingPhones.has(normalizedPhone));

      if (!alreadyExists && (normalizedEmail || normalizedPhone)) {
        // Create a new participant record from Neon data
        const neonParticipant = {
          "Full Name": participantName,
          Email: participantEmail,
          Phone: participantPhone,
          "Program Name": event.name || "Unknown Program",
          Category: "Neon Event", // Default category for Neon-only participants
          "RSVP status": "Accepted", // They attended, so they were accepted
          "Attendance status": "Accepted", // They attended
          Source: "Neon Database",
          "Event ID": record.event_id,
          "Event Slug": event.slug || "",
          "Attendance Date": record.created_at || record.attended_at || "",
        };

        neonOnlyEnrollees.push(neonParticipant);
        neonMergedCount.added++;

        // Add to existing sets to prevent duplicates
        if (normalizedEmail) existingEmails.add(normalizedEmail);
        if (normalizedPhone) existingPhones.add(normalizedPhone);
      } else {
        neonMergedCount.skipped++;
      }
    });

    console.log("📊 Neon merge results:", neonMergedCount);
    console.log("📊 Neon-only enrollees added:", neonOnlyEnrollees.length);

    // Combine CSV data with Neon-only enrollees
    const finalMergedData = [...mergedRSVP, ...neonOnlyEnrollees];
    console.log("📊 Final merged participant count:", finalMergedData.length);

    return finalMergedData;
  }, [mergedRSVP, neonAttendanceData, neonEvents]);

  // Filter participants by selected program and category
  const selectedProgramFilteredParticipants = mergedRSVPWithNeon.filter(
    (r: any) => {
      let matchesProgram = true;

      if (showAllProgramsInCategory && selectedCategory) {
        // If "All Programs in Category" is selected, only filter by programs in that category
        matchesProgram = programsInSelectedCategoryForDashboard.includes(
          cleanProgramName(r["Program Name"])
        );
        // Don't filter by category here - we want to see all categories for these programs
      } else {
        // Normal program filtering - check if the participant's program matches any of the selected program names
        const participantProgramName = cleanProgramName(r["Program Name"]);
        matchesProgram = selectedProgramNames.includes(participantProgramName);
      }

      // Only apply category filter when NOT in "All Programs in Category" mode
      const matchesCategory = showAllProgramsInCategory
        ? true
        : !selectedCategory || r.Category === selectedCategory;
      return matchesProgram && matchesCategory;
    }
  );

  // Log the results after all variables are defined
  console.log("🎯 Program Selection Results:", {
    selectedProgram,
    selectedCleanedName,
    selectedProgramNames,
    isCombinedEvent:
      selectedProgramData?.combinedNames &&
      selectedProgramData.combinedNames.length > 1,
    combinedNames: selectedProgramData?.combinedNames,
    totalParticipants: selectedProgramFilteredParticipants.length,
    totalFeedback: feedbackForSelected.length,
  });

  // Registered/attended counts
  const registeredCount = selectedProgramFilteredParticipants.length;

  // Calculate RSVP count (participants with "Accepted" RSVP status)
  const rsvpCount = selectedProgramFilteredParticipants.filter(
    (r: any) => r["RSVP status"] === "Accepted"
  ).length;

  // Calculate total attended count from both sources for Participant Overview
  const csvTotalAttended = mergedRSVPWithNeon.filter(
    (r: any) => r["Attendance status"] === "Accepted"
  ).length;

  // Create a map for RSVP by email using the merged data
  const rsvpByEmail: { [key: string]: any } = Object.fromEntries(
    mergedRSVPWithNeon.map((row: any) => [normalizeEmail(row.Email), row])
  );

  // Join feedback with RSVP using merged data
  const feedbackWithRSVP = mergedFeedbackData.map((feedback: any) => ({
    ...feedback,
    rsvp: rsvpByEmail[normalizeEmail(feedback.Email)],
  }));

  const neonTotalAttended = neonAttendanceData.length;
  const totalAttended = csvTotalAttended + neonTotalAttended;

  // Log the total attendance calculation
  // console.log('📊 Total Overview Attendance:', {
  //   csvTotalAttended,
  //   neonTotalAttended,
  //   totalAttended,
  //   totalRegistered: mergedRSVP.length
  // });

  // Calculate total attended count from both sources
  const csvAttendedCount = selectedProgramFilteredParticipants.filter(
    (r: any) => r["Attendance status"] === "Accepted"
  ).length;

  // Count Neon attendance records for the selected program
  let neonAttendedCount = 0;

  if (showAllProgramsInCategory && selectedCategory) {
    // For "All Programs in Category" view, count Neon attendance for all programs in that category
    neonAttendedCount = neonAttendanceData.filter((record: any) => {
      // Find the event that matches this attendance record
      const event = neonEvents.find((e: any) => e.id === record.event_id);
      if (!event) return false;

      // Check if this event matches any of the programs in the selected category
      return programsInSelectedCategoryForDashboard.some((programName) => {
        const normalizedEventName = (event.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ");
        const normalizedProgramName = programName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ");

        // Check if the event name contains key words from the program name
        const programWords = normalizedProgramName
          .split(" ")
          .filter((word: string) => word.length > 2);
        const eventWords = normalizedEventName
          .split(" ")
          .filter((word: string) => word.length > 2);

        // Count how many program words are found in the event name
        const matchingWords = programWords.filter((word: string) =>
          eventWords.some(
            (eventWord: string) =>
              eventWord.includes(word) || word.includes(eventWord)
          )
        );

        // Consider it a match if at least 2 key words match
        return matchingWords.length >= 2;
      });
    }).length;
  } else {
    // For single program view, check against all selected program names (handles combined events)
    neonAttendedCount = neonAttendanceData.filter((record: any) => {
      // Find the event that matches this attendance record
      const event = neonEvents.find((e: any) => e.id === record.event_id);
      if (!event) return false;

      // Check if this event matches any of the selected program names
      return selectedProgramNames.some((programName) => {
        const eventName = event.name || "";
        const normalizedEventName = eventName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ");
        const normalizedProgramName = programName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, " ");

        // Check if the event name contains key words from the program name
        const programWords = normalizedProgramName
          .split(" ")
          .filter((word: string) => word.length > 2);
        const eventWords = normalizedEventName
          .split(" ")
          .filter((word: string) => word.length > 2);

        // Count how many program words are found in the event name
        const matchingWords = programWords.filter((word: string) =>
          eventWords.some(
            (eventWord: string) =>
              eventWord.includes(word) || word.includes(eventWord)
          )
        );

        // Consider it a match if at least 2 key words match (to avoid false positives)
        return matchingWords.length >= 2;
      });
    }).length;
  }

  const attendedCount = csvAttendedCount + neonAttendedCount;

  // Debug: Check which Neon records match this program
  const matchingNeonRecords = neonAttendanceData.filter((record: any) => {
    const event = neonEvents.find((e: any) => e.id === record.event_id);
    if (!event) return false;

    const eventName = event.name || "";
    const normalizedEventName = eventName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ");
    const normalizedProgramName = selectedCleanedName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ");

    const programWords = normalizedProgramName
      .split(" ")
      .filter((word: string) => word.length > 2);
    const eventWords = normalizedEventName
      .split(" ")
      .filter((word: string) => word.length > 2);

    const matchingWords = programWords.filter((word: string) =>
      eventWords.some(
        (eventWord: string) =>
          eventWord.includes(word) || word.includes(eventWord)
      )
    );

    return matchingWords.length >= 2;
  });

  // Log attendance calculations
  // console.log('📊 Attendance Calculation:', {
  //   selectedProgram: selectedCleanedName,
  //   showAllProgramsInCategory,
  //   selectedCategory,
  //   csvAttendedCount,
  //   neonAttendedCount,
  //   totalAttendedCount: attendedCount,
  //   neonAttendanceDataLength: neonAttendanceData.length,
  //   neonEventsLength: neonEvents.length
  // });

  // Program-specific category breakdown
  const selectedProgramParticipants = selectedProgramFilteredParticipants;

  const selectedProgramCategoryCounts: { [key: string]: number } = {};
  selectedProgramParticipants.forEach((r: any) => {
    const cat = (r.Category || "Unspecified").trim();
    selectedProgramCategoryCounts[cat] =
      (selectedProgramCategoryCounts[cat] || 0) + 1;
  });
  const selectedProgramCategories = Object.entries(
    selectedProgramCategoryCounts
  )
    .map(([label, value]) => ({ label, value: Number(value) }))
    .sort((a, b) => b.value - a.value); // Sort by count descending

  // Program-specific profession breakdown
  const selectedProgramProfessionCounts: { [key: string]: number } = {};
  selectedProgramParticipants.forEach((r: any) => {
    const prof = normalizeProfession(r.Profession || "Unspecified");
    selectedProgramProfessionCounts[prof] =
      (selectedProgramProfessionCounts[prof] || 0) + 1;
  });
  const selectedProgramProfessions = Object.entries(
    selectedProgramProfessionCounts
  )
    .map(([label, value]) => ({ label, value: Number(value) }))
    .sort((a, b) => b.value - a.value); // Sort by count descending

  // Define a color palette for charts
  const chartColors = [
    "#3b82f6", // blue-500
    "#f59e42", // orange-400
    "#10b981", // green-500
    "#f43f5e", // rose-500
    "#6366f1", // indigo-500
    "#fbbf24", // yellow-400
    "#a21caf", // purple-700
    "#14b8a6", // teal-500
    "#eab308", // yellow-500
    "#ef4444", // red-500
    "#6d28d9", // violet-700
    "#0ea5e9", // sky-500
    "#f472b6", // pink-400
    "#22d3ee", // cyan-400
    "#84cc16", // lime-500
  ];

  // Get programs available for selected category (for participant filters)
  const programsInSelectedCategory = participantCategoryFilter
    ? (() => {
        // Debug: Log raw and cleaned program names to identify duplicates
        const rawProgramNames = mergedRSVP
          .filter((row: any) => row["Category"] === participantCategoryFilter)
          .map((row: any) => row["Program Name"]);

        const cleanedNames = rawProgramNames.map((name) =>
          cleanProgramName(name)
        );

        console.log(
          "Raw program names for category:",
          participantCategoryFilter,
          rawProgramNames
        );
        console.log("Cleaned program names:", cleanedNames);

        // More aggressive deduplication using normalized names
        const normalizedNames = cleanedNames.map((name) =>
          normalizeProgramNameForDedup(name)
        );
        console.log("Normalized names for deduplication:", normalizedNames);

        // Debug: Show character-by-character analysis for similar names
        const similarNames = new Map();
        cleanedNames.forEach((name, index) => {
          const normalized = normalizedNames[index];
          if (!similarNames.has(normalized)) {
            similarNames.set(normalized, []);
          }
          similarNames.get(normalized).push({
            original: rawProgramNames[index],
            cleaned: name,
            normalized: normalized,
          });
        });

        // Log any names that have multiple variations
        similarNames.forEach((variations, normalized) => {
          if (variations.length > 1) {
            console.log(
              `🔍 Multiple variations found for normalized name "${normalized}":`
            );
            variations.forEach((variation: any, i: number) => {
              console.log(`  Variation ${i + 1}:`);
              console.log(`    Original: "${variation.original}"`);
              console.log(`    Cleaned: "${variation.cleaned}"`);
              console.log(`    Length: ${variation.cleaned.length}`);
              console.log(
                `    Char codes:`,
                Array.from(variation.cleaned).map((c: any) =>
                  (c as string).charCodeAt(0)
                )
              );
            });
          }
        });

        // Create a map to keep the most descriptive version of each program
        const programMap = new Map();
        cleanedNames.forEach((cleanedName, index) => {
          const normalizedName = normalizedNames[index];
          if (normalizedName && cleanedName) {
            // If we already have this normalized name, keep the longer/more descriptive version
            if (programMap.has(normalizedName)) {
              const existing = programMap.get(normalizedName);
              if (cleanedName.length > existing.length) {
                programMap.set(normalizedName, cleanedName);
              }
            } else {
              programMap.set(normalizedName, cleanedName);
            }
          }
        });

        // Additional merging: Look for programs that are very similar (fuzzy matching)
        const finalPrograms = new Map();
        const programArray = Array.from(programMap.entries());

        programArray.forEach(([normalizedName, cleanedName]) => {
          let merged = false;

          // Check if this program should be merged with an existing one
          for (const [
            existingNormalized,
            existingCleaned,
          ] of finalPrograms.entries()) {
            // If programs are very similar (90%+ similarity), merge them
            if (isSimilarProgram(normalizedName, existingNormalized)) {
              console.log(
                `🔄 Merging similar programs: "${cleanedName}" with "${existingCleaned}"`
              );
              merged = true;
              break;
            }
          }

          if (!merged) {
            finalPrograms.set(normalizedName, cleanedName);
          }
        });

        const uniquePrograms = Array.from(finalPrograms.values())
          .filter(Boolean)
          .map((name) => name.trim())
          .sort();

        console.log(
          "Final deduplicated programs after fuzzy merging:",
          uniquePrograms
        );

        return uniquePrograms;
      })()
    : [];

  // Get the total Neon attendance count for this program (same logic as Program-Specific Dashboard)
  const getProgramNeonAttendanceCount = (programName: string) => {
    const cleanedName = cleanProgramName(programName);
    return neonAttendanceData.filter((record: any) => {
      const event = neonEvents.find((e: any) => e.id === record.event_id);
      if (!event) return false;

      // Use event slug mapping
      if (
        record.event_slug ===
          "ai-meets-robotics-empowering-the-next-generation-of-intelligent-machines" &&
        cleanedName.toLowerCase().includes("digitalpreneur")
      ) {
        return true;
      }

      // Fallback to name matching
      const eventName = event.name || "";
      const normalizedEventName = eventName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ");
      const normalizedProgramName = cleanedName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ");

      const programWords = normalizedProgramName
        .split(" ")
        .filter((word: string) => word.length > 2);
      const eventWords = normalizedEventName
        .split(" ")
        .filter((word: string) => word.length > 2);

      const matchingWords = programWords.filter((word: string) =>
        eventWords.some(
          (eventWord: string) =>
            eventWord.includes(word) || word.includes(eventWord)
        )
      );

      return matchingWords.length >= 2;
    }).length;
  };

  // Enhanced function to get Neon attendance count for combined events
  const getCombinedEventNeonAttendanceCount = (selectedProgramData: any) => {
    if (!selectedProgramData || !selectedProgramData.combinedNames) {
      // Fallback to single program logic
      return getProgramNeonAttendanceCount(
        selectedProgramData?.cleanedName || ""
      );
    }

    // For combined events, sum up attendance from all individual programs
    let totalAttendance = 0;
    selectedProgramData.combinedNames.forEach((programName: string) => {
      totalAttendance += getProgramNeonAttendanceCount(programName);
    });

    console.log("🎯 Combined Event Neon Attendance:", {
      combinedEvent: selectedProgramData.name,
      individualPrograms: selectedProgramData.combinedNames,
      totalAttendance,
    });

    return totalAttendance;
  };

  // Cache for program attendance counts
  const programAttendanceCache = new Map<string, number>();

  // Helper function to get combined attendance status (CSV + Neon)
  const getCombinedAttendanceStatus = (row: any) => {
    const csvAttendanceStatus = row["Attendance status"];
    const programName = row["Program Name"];

    // Always mark "Accepted" as "Attended"
    if (csvAttendanceStatus === "Accepted") {
      // Also update RSVP status to "Accepted" if they attended
      row["RSVP status"] = "Accepted";
      return "Attended";
    }

    // Get or calculate Neon attendance count for this program
    let neonAttendanceCount = programAttendanceCache.get(programName);
    if (neonAttendanceCount === undefined) {
      // Check if this is part of a combined event
      const combinedEvent = allPrograms.find(
        (p) =>
          p.combinedNames &&
          p.combinedNames.includes(cleanProgramName(programName))
      );

      if (
        combinedEvent &&
        combinedEvent.combinedNames &&
        combinedEvent.combinedNames.length > 1
      ) {
        // Use combined event attendance count
        neonAttendanceCount =
          getCombinedEventNeonAttendanceCount(combinedEvent);
      } else {
        // Use single program attendance count
        neonAttendanceCount = getProgramNeonAttendanceCount(programName);
      }

      programAttendanceCache.set(programName, neonAttendanceCount);
    }

    // Get all participants for this program
    const programParticipants = mergedRSVPWithNeon.filter(
      (p) => p["Program Name"] === programName
    );

    // Count of "Accepted" participants for this program
    const acceptedCount = programParticipants.filter(
      (p) => p["Attendance status"] === "Accepted"
    ).length;

    // Calculate how many more can be marked as "Attended" from Neon data
    const remainingNeonSlots = Math.max(0, neonAttendanceCount - acceptedCount);

    if (remainingNeonSlots > 0) {
      // Sort non-accepted participants by priority: Pending > Not Attended > Unknown
      const nonAcceptedParticipants = programParticipants
        .filter((p) => p["Attendance status"] !== "Accepted")
        .sort((a, b) => {
          const statusA = a["Attendance status"] || "";
          const statusB = b["Attendance status"] || "";

          const priority = { Pending: 0, "Not Attended": 1, "": 2 };
          return (
            (priority[statusA as keyof typeof priority] || 3) -
            (priority[statusB as keyof typeof priority] || 3)
          );
        });

      // Find this participant's position in the sorted list
      const participantPosition = nonAcceptedParticipants.findIndex(
        (p) =>
          p["Full Name"] === row["Full Name"] &&
          p["Email"] === row["Email"] &&
          p["Phone"] === row["Phone"]
      );

      // If this participant is within the remaining Neon slots, mark as "Attended"
      if (
        participantPosition >= 0 &&
        participantPosition < remainingNeonSlots
      ) {
        // Also update RSVP status to "Accepted" if they attended
        row["RSVP status"] = "Accepted";
        return "Attended";
      }
    }

    // Otherwise, return original status
    if (csvAttendanceStatus === "Not Attended") return "Not Attended";
    if (csvAttendanceStatus === "Pending") return "Pending";
    return csvAttendanceStatus || "Unknown";
  };

  // Update attended count to match the participants table logic
  const programSpecificAttendedCount =
    selectedProgramFilteredParticipants.filter((participant) => {
      const status = getCombinedAttendanceStatus(participant);
      return status === "Attended";
    }).length;

  // Filtered data for participants
  const filteredParticipants = mergedRSVPWithNeon.filter((row) => {
    // Apply search filter
    if (participantSearch.trim() !== "") {
      const searchMatch = Object.values(row).some((val) =>
        (val == null ? "" : String(val))
          .toLowerCase()
          .includes(participantSearch.toLowerCase())
      );
      if (!searchMatch) return false;
    }

    // Apply program filter
    if (participantProgramFilter) {
      // Special handling for "All Programs in [Category]" option
      if (
        participantProgramFilter ===
        `all_in_category_${participantCategoryFilter}`
      ) {
        // If "All Programs in Category" is selected, only filter by category (already handled below)
      } else if (
        cleanProgramName(row["Program Name"]) !== participantProgramFilter
      ) {
        return false;
      }
    }

    // Apply category filter
    if (
      participantCategoryFilter &&
      row["Category"] !== participantCategoryFilter
    ) {
      return false;
    }

    // Apply profession filter
    if (
      participantProfessionFilter &&
      row["Profession"] !== participantProfessionFilter
    ) {
      return false;
    }

    // Apply RSVP status filter
    if (
      participantStatusFilter &&
      row["RSVP status"] !== participantStatusFilter
    ) {
      return false;
    }

    // Apply attendance status filter using combined logic
    if (participantAttendanceFilter) {
      const combinedStatus = getCombinedAttendanceStatus(row);
      if (combinedStatus !== participantAttendanceFilter) {
        return false;
      }
    }

    return true;
  });

  // Filtered data for feedback
  const filteredFeedback = mergedFeedbackData.filter((row) => {
    // Apply session filter
    if (
      selectedSessionFilter &&
      row["Which session did you attend?"] !== selectedSessionFilter
    ) {
      return false;
    }

    // Apply search filter
    if (feedbackSearch.trim() !== "") {
      const searchMatch = Object.values(row).some((val) =>
        (val == null ? "" : String(val))
          .toLowerCase()
          .includes(feedbackSearch.toLowerCase())
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
      const hasMatchingRating = feedbackMetrics.some((metric) => {
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
  const participantColumnsWithCert = [
    ...participantColumns,
    "Certificate",
    "Send via WhatsApp",
  ];

  // For download: map filteredParticipants to this column order
  function getParticipantsForDownload() {
    return filteredParticipants.map((row) => {
      const r = row as Record<string, any>;
      const out: Record<string, any> = {};
      participantColumns.forEach((col) => {
        if (col === "Attendance status") {
          // Use combined attendance status for download
          out[col] = getCombinedAttendanceStatus(row);
        } else {
          out[col] = r[col] ?? "";
        }
      });
      return out;
    });
  }

  // Get all unique program names from participants
  const allProgramNames = Array.from(
    new Set(
      filteredParticipants
        .map((row: any) => row["Program Name"])
        .filter(Boolean)
    )
  );

  // Get all unique program dates from filteredParticipants
  const allProgramDates = Array.from(
    new Set(
      filteredParticipants
        .map((row: any) => row["Program Date & Time"])
        .filter(Boolean)
    )
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
      (row: any) => row["Program Date & Time"] === selectedSendProgram
    );
  }, [filteredParticipants, selectedSendProgram]);

  // Handler to open confirmation modal
  const handleOpenConfirmSend = () => {
    setAttendeesToSend(
      attendeesForSelectedSendProgram.map((a) => ({ ...a, selected: true }))
    );
    setSearchQuery(""); // Clear search when opening modal
    setConfirmSendOpen(true);
  };

  // Handler to toggle selection
  const handleToggleAttendee = (idx: number) => {
    setAttendeesToSend((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, selected: !a.selected } : a))
    );
  };

  // Helper function to get selection counts
  const getSelectionCounts = () => {
    const selectedCount = attendeesToShow.filter((a) => a.selected).length;
    const totalCount = attendeesToShow.length;
    const filteredSelectedCount = filteredAttendeesToShow.filter(
      (a) => a.selected
    ).length;
    const filteredTotalCount = filteredAttendeesToShow.length;
    return {
      selectedCount,
      totalCount,
      filteredSelectedCount,
      filteredTotalCount,
    };
  };

  // Keyboard shortcuts for the confirmation modal
  useEffect(() => {
    if (!confirmSendOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setAttendeesToSend(
          attendeesToSend.map((a) => ({ ...a, selected: true }))
        );
      }
      // Ctrl/Cmd + D: Deselect all
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        setAttendeesToSend(
          attendeesToSend.map((a) => ({ ...a, selected: false }))
        );
      }
      // Ctrl/Cmd + K: Focus search input
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder="Search attendees by name..."]'
        ) as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmSendOpen, attendeesToSend]);

  function handleExcludeCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        if (!data.length) return;
        const phoneCol =
          Object.keys(data[0]).find((k) => k.toLowerCase().includes("phone")) ||
          Object.keys(data[0])[0];
        const phones = data
          .map((row) => String(row[phoneCol] || "").replace(/\D/g, ""))
          .filter((p) => p.length > 0);
        setExcludedPhones(phones);
      },
    });
  }

  // Handler to confirm and start sending
  const handleConfirmAndSend = async () => {
    const requestId = Math.random().toString(36).substring(2, 10);
    console.log(
      `[Dashboard][${requestId}] ===== BULK CERTIFICATE GENERATION STARTED =====`
    );

    setConfirmSendOpen(false);
    const attendees = attendeesToShow.filter((a) => a.selected);

    if (attendees.length === 0) {
      console.log(`[Dashboard][${requestId}] No attendees selected`);
      return;
    }

    console.log(
      `[Dashboard][${requestId}] Processing ${attendees.length} selected attendees`
    );
    setSendingModalOpen(true);
    setSendingInProgress(true);
    setSendingStatus(
      attendees.map((a: any) => ({
        name: a["Full Name"],
        phone: a["Phone"],
        status: "pending",
      }))
    );

    // Get company ID for API calls
    let companyId;
    try {
      console.log(`[Dashboard][${requestId}] Getting company ID...`);
      companyId = await getCompanyId();
      console.log(`[Dashboard][${requestId}] Company ID: ${companyId}`);
    } catch (error) {
      console.error(
        `[Dashboard][${requestId}] Failed to get company ID:`,
        error
      );
      setSendingInProgress(false);
      return;
    }

    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      console.log(
        `[Dashboard][${requestId}] Processing attendee ${i + 1}/${
          attendees.length
        }: ${attendee["Full Name"]}`
      );

      let status = "pending";
      try {
        const name = attendee["Full Name"];
        const phone = attendee["Phone"];

        if (!name || !phone) {
          throw new Error("Missing name or phone");
        }

        // Call backend API for certificate generation and WhatsApp sending
        const requestPayload = {
          phoneNumber: phone,
          formId: "bulk-send-program", // Use a specific ID for bulk operations
          formTitle: "FUTUREX.AI 2025 Bulk Certificate Send",
          companyId: companyId,
        };

        console.log(
          `[Dashboard][${requestId}] Sending request for ${name}:`,
          JSON.stringify(requestPayload, null, 2)
        );

        const response = await axios.post(
          `${baseUrl}/api/certificates/generate-and-send`,
          requestPayload
        );

        if (response.data.success) {
          console.log(
            `[Dashboard][${requestId}] ✅ Certificate sent successfully for ${name}`
          );
          status = "success";
        } else {
          console.error(
            `[Dashboard][${requestId}] ❌ Certificate failed for ${name}:`,
            response.data.error
          );
          status = "failed";
        }
      } catch (err: any) {
        console.error(
          `[Dashboard][${requestId}] ❌ Error processing ${attendee["Full Name"]}:`,
          err
        );
        status = "failed";
      }

      // Update status for this attendee
      setSendingStatus((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status } : s))
      );
    }

    console.log(
      `[Dashboard][${requestId}] ===== BULK CERTIFICATE GENERATION COMPLETED =====`
    );
    setSendingInProgress(false);
  };

  // Handler to confirm and start sending feedback certificates
  const handleFeedbackConfirmAndSend = async () => {
    const requestId = Math.random().toString(36).substring(2, 10);
    console.log(`[Dashboard][${requestId}] ===== BULK FEEDBACK CERTIFICATE GENERATION STARTED =====`);
    
    const attendees = feedbackAttendeesToSend.filter(a => a.selected);
    
    if (attendees.length === 0) {
      console.log(`[Dashboard][${requestId}] No feedback attendees selected`);
      return;
    }
    
    console.log(`[Dashboard][${requestId}] Processing ${attendees.length} selected feedback attendees`);
    setFeedbackSendingModalOpen(true);
    setFeedbackSendingInProgress(true);
    setFeedbackSendingStatus(attendees.map((a: any) => ({ 
      name: a["full_name"] || a["Full Name"] || "Unknown", 
      phone: a["phone_number"] || a["Phone"] || a["contact_number"] || "No Phone", 
      status: "pending" 
    })));
    
    // Get company ID for API calls
    let companyId;
    try {
      console.log(`[Dashboard][${requestId}] Getting company ID...`);
      companyId = await getCompanyId();
      console.log(`[Dashboard][${requestId}] Company ID: ${companyId}`);
    } catch (error) {
      console.error(`[Dashboard][${requestId}] Failed to get company ID:`, error);
      setFeedbackSendingInProgress(false);
      return;
    }
    
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i];
      const participantName = attendee["full_name"] || attendee["Full Name"] || "Unknown";
      console.log(`[Dashboard][${requestId}] Processing feedback attendee ${i + 1}/${attendees.length}: ${participantName}`);
      
      let status = "pending";
      try {
        const name = participantName;
        const phone = attendee["phone_number"] || attendee["Phone"] || attendee["contact_number"];
        const programDate = attendee["Which session did you attend?"] || "Unknown Session";
        
        if (!name || !phone) {
          throw new Error("Missing name or phone");
        }
        
        const actualFormId = attendees[0]?.form_id || "feedback-certificate-send";

        const requestPayload = {
          phoneNumber: phone,
          formId: actualFormId, // ✅ Use the real form ID
          formTitle: `FUTUREX.AI 2025 Feedback Certificate - ${programDate}`,
          companyId: companyId
        };
        console.log(`[Dashboard][${requestId}] Sending request for ${name}:`, JSON.stringify(requestPayload, null, 2));
        
        const response = await axios.post(`${baseUrl}/api/certificates/generate-and-send`, requestPayload);
        
        if (response.data.success) {
          console.log(`[Dashboard][${requestId}] ✅ Certificate sent successfully for ${name}`);
          status = "success";
        } else {
          console.error(`[Dashboard][${requestId}] ❌ Certificate failed for ${name}:`, response.data.error);
          status = "failed";
        }
        
      } catch (err: any) {
        console.error(`[Dashboard][${requestId}] ❌ Error processing ${participantName}:`, err);
        status = "failed";
      }
      
      // Update status for this attendee
      setFeedbackSendingStatus((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status } : s
        )
      );
    }
    
    console.log(`[Dashboard][${requestId}] ===== BULK FEEDBACK CERTIFICATE GENERATION COMPLETED =====`);
    setFeedbackSendingInProgress(false);
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
    (a) => !excludedPhones.includes(String(a["Phone"] || "").replace(/\D/g, ""))
  );

  // Filter attendees by search query
  const filteredAttendeesToShow = useMemo(() => {
    if (!searchQuery.trim()) {
      return attendeesToShow;
    }

    const query = searchQuery.toLowerCase().trim();
    return attendeesToShow.filter((attendee) => {
      const fullName = (attendee["Full Name"] || "").toLowerCase();
      const company = (attendee["Company"] || "").toLowerCase();
      const email = (attendee["Email"] || "").toLowerCase();

      return (
        fullName.includes(query) ||
        company.includes(query) ||
        email.includes(query)
      );
    });
  }, [attendeesToShow, searchQuery]);

  // Helper function to count feedback responses for a specific program/category
  const countFeedbackResponses = (
    programName?: string,
    categoryName?: string
  ) => {
    let filteredData = mergedFeedbackData;

    if (programName && programName !== "all") {
      filteredData = filteredData.filter(
        (f: any) => f["Which session did you attend?"] === programName
      );
    }

    if (categoryName && categoryName !== "all") {
      // Get programs in this category
      const programsInCategory = mergedRSVP
        .filter((r: any) => r.Category?.trim() === categoryName)
        .map((r: any) => r["Program Name"]);

      filteredData = filteredData.filter((f: any) =>
        programsInCategory.includes(f["Which session did you attend?"])
      );
    }

    return filteredData.length;
  };

  // Helper function to format date consistently for display
  const formatDateForDisplay = (dateTimeStr: string): string => {
    if (!dateTimeStr) return "Unspecified";

    // Handle Neon UTC timestamps
    if (dateTimeStr.includes("T") && dateTimeStr.includes("Z")) {
      const utcMatch = dateTimeStr.match(
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/
      );
      if (utcMatch) {
        const utcDate = new Date(utcMatch[1]);
        // Convert to Malaysia time (UTC+8)
        const malaysiaTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);

        // Format as DD/MM/YYYY HH:MM:SS
        const day = malaysiaTime.getDate().toString().padStart(2, "0");
        const month = (malaysiaTime.getMonth() + 1).toString().padStart(2, "0");
        const year = malaysiaTime.getFullYear();
        const hours = malaysiaTime.getHours().toString().padStart(2, "0");
        const minutes = malaysiaTime.getMinutes().toString().padStart(2, "0");
        const seconds = malaysiaTime.getSeconds().toString().padStart(2, "0");

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      }
    }

    // Return original if not a UTC timestamp
    return dateTimeStr;
  };

  return (
    <div className="p-6 space-y-10 h-screen overflow-auto">
      {/* Loading State */}
      {(feedbackResponsesLoading ||
        eventsLoading ||
        enrolleesLoading ||
        participantsLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-xl">
            <div className="flex items-center space-x-4">
              <svg
                className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Loading Dashboard Data
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Fetching CSV and Neon database data...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {(eventsError ||
        enrolleesError ||
        participantsError ||
        feedbackResponsesError) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 shadow-xl max-w-md">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Data Loading Error
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {eventsError && <div>Events: {eventsError}</div>}
                {enrolleesError && <div>Enrollees: {enrolleesError}</div>}
                {participantsError && (
                  <div>Participants: {participantsError}</div>
                )}
                {feedbackResponsesError && (
                  <div>Feedback: {feedbackResponsesError}</div>
                )}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Overview */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Participant Overview
            </h2>
          </div>

          {/* Data Source Indicator */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>CSV Data</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Neon Database</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Total Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {totalRegistered}
              </div>
              <div className="text-blue-700 dark:text-blue-300 font-medium">
                Total Registered
              </div>
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mt-4 mb-2">
                {totalAttended}
              </div>
              <div className="text-green-700 dark:text-green-300 font-medium">
                Total Attended
              </div>
              <div className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                {totalRegistered > 0
                  ? ((totalAttended / totalRegistered) * 100).toFixed(1)
                  : "0"}
                % Attendance Rate
              </div>
            </div>
          </div>

          {/* Profession Chart */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
            <div className="font-semibold mb-4 text-center text-purple-800 dark:text-purple-300">
              By Profession/Category
            </div>
            <CustomPieChart
              data={professionPieData}
              labels={professionPieLabels}
              colors={chartColors}
            />
          </div>

          {/* Program Chart */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-700">
            <div className="font-semibold mb-4 text-center text-emerald-800 dark:text-emerald-300">
              By Program Type
            </div>
            <CustomPieChart
              data={programPieData}
              labels={programPieLabels}
              colors={chartColors}
            />
          </div>
        </div>

        {/* Detailed Profession Breakdown */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Detailed Profession Breakdown
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Profession Statistics Table */}
            <div className="bg-white dark:bg-slate-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
              <h4 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
                Profession Statistics
              </h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {professions
                  .filter((p) => p.label !== "Unspecified") // Filter out unspecified professions
                  .sort((a, b) => b.value - a.value) // Sort by count descending
                  .map((profession, index) => (
                    <div
                      key={profession.label}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-600 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor:
                              chartColors[index % chartColors.length],
                          }}
                        ></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {profession.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                          {profession.value}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {((profession.value / totalRegistered) * 100).toFixed(
                            1
                          )}
                          %
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Total for professions */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-800 dark:text-blue-300">
                    Total
                  </span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {totalRegistered}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      100%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Program Type Statistics Table */}
            <div className="bg-white dark:bg-slate-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
              <h4 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
                Program Type Statistics
              </h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {programTypes
                  .filter((p) => p.label !== "Unknown") // Filter out unknown program types
                  .sort((a, b) => b.value - a.value) // Sort by count descending
                  .map((programType, index) => (
                    <div
                      key={programType.label}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-600 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{
                            backgroundColor:
                              chartColors[(index + 5) % chartColors.length],
                          }}
                        ></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {programType.label}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                          {programType.value}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {(
                            (programType.value / totalRegistered) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Total for program types */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-800 dark:text-blue-300">
                    Total
                  </span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      {totalRegistered}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      100%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Program-Specific Dashboard */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Program-Specific Dashboard
            </h2>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Filter by Category:
            </label>
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
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 relative program-dropdown">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Select Program:
            </label>
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
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {programDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {/* "All Programs in Category" option */}
                  {selectedCategory &&
                    programsInSelectedCategoryForDashboard.length > 0 && (
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-600 border-b border-gray-200 dark:border-gray-600 ${
                          showAllProgramsInCategory
                            ? "bg-blue-100 dark:bg-blue-900"
                            : ""
                        }`}
                        onClick={() => {
                          setShowAllProgramsInCategory(true);
                          setSelectedProgram(-1); // Special value to indicate "All Programs in Category"
                          setProgramDropdownOpen(false);
                        }}
                      >
                        <div className="whitespace-normal break-words leading-relaxed font-semibold text-blue-600 dark:text-blue-400">
                          📊 All Programs in {selectedCategory} (
                          {programsInSelectedCategoryForDashboard.length}{" "}
                          programs)
                        </div>
                      </button>
                    )}

                  {/* Individual program options */}
                  {dropdownNames.map((name, idx) => (
                    <button
                      key={name}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-600 ${
                        selectedProgram === idx && !showAllProgramsInCategory
                          ? "bg-blue-100 dark:bg-blue-900"
                          : ""
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
                const programParticipants =
                  selectedProgramFilteredParticipants.filter(
                    (row: any) =>
                      cleanProgramName(row["Program Name"]) === programName
                  );

                // Calculate attended count from both CSV and Neon
                const csvAttended = programParticipants.filter(
                  (row: any) => row["Attendance status"] === "Accepted"
                ).length;

                // Count Neon attendance for this specific program using event names
                const neonAttended = neonAttendanceData.filter(
                  (record: any) => {
                    // Find the event that matches this attendance record
                    const event = neonEvents.find(
                      (e: any) => e.id === record.event_id
                    );
                    if (!event) return false;

                    // Match the event name with the program name
                    const eventName = event.name || "";
                    const normalizedEventName = eventName
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, " ");
                    const normalizedProgramName = programName
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, " ");

                    // Check if the event name contains key words from the program name
                    const programWords = normalizedProgramName
                      .split(" ")
                      .filter((word: string) => word.length > 2);
                    const eventWords = normalizedEventName
                      .split(" ")
                      .filter((word: string) => word.length > 2);

                    // Count how many program words are found in the event name
                    const matchingWords = programWords.filter((word: string) =>
                      eventWords.some(
                        (eventWord: string) =>
                          eventWord.includes(word) || word.includes(eventWord)
                      )
                    );

                    // Consider it a match if at least 2 key words match
                    return matchingWords.length >= 2;
                  }
                ).length;

                const attendedCount = csvAttended + neonAttended;

                // Log the breakdown for debugging
                console.log(`📊 Program Breakdown - ${programName}:`, {
                  csvAttended,
                  neonAttended,
                  totalAttended: attendedCount,
                  registered: programParticipants.length,
                });

                return (
                  <div
                    key={programName}
                    className="bg-white dark:bg-slate-700 p-3 rounded border"
                  >
                    <div className="font-medium text-sm">{programName}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {programParticipants.length} registered, {attendedCount}{" "}
                      attended
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Registration Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {registeredCount}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {showAllProgramsInCategory && selectedCategory
                    ? "Total Registered"
                    : "Registered"}
                </div>
              </div>
              <div className="text-blue-500 dark:text-blue-400">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
          {/* RSVP Stats */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-800/20 rounded-lg p-6 border border-amber-200 dark:border-amber-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {rsvpCount}
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  {showAllProgramsInCategory && selectedCategory
                    ? "Total RSVP"
                    : "RSVP"}
                </div>
              </div>
              <div className="text-amber-500 dark:text-amber-400">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-5 5v-5zM12 19h6v-2h-6v2zM4 19h6v-2H4v2zM4 15h6v-2H4v2zM4 11h6V9H4v2zM4 7h6V5H4v2zM4 3h6V1H4v2z"
                  />
                </svg>
              </div>
            </div>
          </div>
          {/* Attendance Stats */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {programSpecificAttendedCount}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {showAllProgramsInCategory && selectedCategory
                    ? "Total Attended"
                    : "Attended"}
                </div>
              </div>
              <div className="text-green-500 dark:text-green-400">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-6 border border-orange-200 dark:border-orange-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {registeredCount > 0
                    ? (
                        (programSpecificAttendedCount / registeredCount) *
                        100
                      ).toFixed(1)
                    : "0"}
                  %
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                  Attendance Rate
                </div>
              </div>
              <div className="text-orange-500 dark:text-orange-400">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Profession Breakdown Pie Chart */}
        {selectedProgramFilteredParticipants.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Profession Breakdown
            </h3>

            {/* Profession Pie Chart */}
            <div className="bg-white dark:bg-slate-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex justify-center">
                <CustomPieChart
                  data={selectedProgramProfessions.map((p) => p.value)}
                  labels={selectedProgramProfessions.map((p) =>
                    p.label === "Unspecified" ? "Not Specified" : p.label
                  )}
                  colors={chartColors}
                  width={400}
                  height={400}
                  className="mx-auto"
                />
              </div>

              {/* Legend with counts */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedProgramProfessions.map((profession, index) => (
                  <div
                    key={profession.label}
                    className="flex items-center space-x-2"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor:
                          chartColors[index % chartColors.length],
                      }}
                    ></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {profession.label === "Unspecified"
                        ? "Not Specified"
                        : profession.label}
                    </span>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      ({profession.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Breakdown Lists */}
        {selectedProgramFilteredParticipants.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Detailed Breakdown Lists
            </h3>

            <div className="grid grid-cols-1 gap-8">
              {/* Profession Statistics Table */}
              <div className="bg-white dark:bg-slate-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">
                  Profession Statistics
                </h4>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {selectedProgramProfessions
                    .filter((p) => p.label !== "Unspecified") // Filter out unspecified professions
                    .sort((a, b) => b.value - a.value) // Sort by count descending
                    .map((profession, index) => (
                      <div
                        key={profession.label}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-600 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor:
                                chartColors[index % chartColors.length],
                            }}
                          ></div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {profession.label}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {profession.value}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {(
                              (profession.value /
                                selectedProgramFilteredParticipants.length) *
                              100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Total for professions */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-800 dark:text-blue-300">
                      Total
                    </span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-800 dark:text-blue-300">
                        {selectedProgramFilteredParticipants.length}
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        100%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Feedback Form Dashboard */}
      <section className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-4">
            <svg
              className="w-6 h-6 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Feedback Form Dashboard
          </h2>
        </div>

        {/* Feedback Dashboard Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Program
            </label>
            <select
              value={feedbackDashboardProgramFilter}
              onChange={(e) =>
                setFeedbackDashboardProgramFilter(e.target.value)
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Programs</option>
              {Array.from(
                new Set(
                  mergedFeedbackData
                    .map((f: any) => f["Which session did you attend?"])
                    .filter(Boolean)
                )
              ).map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Category
            </label>
            <select
              value={feedbackDashboardCategoryFilter}
              onChange={(e) =>
                setFeedbackDashboardCategoryFilter(e.target.value)
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {Array.from(
                new Set(
                  mergedRSVP.map((r: any) => r.Category?.trim()).filter(Boolean)
                )
              ).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total Responses
            </label>
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md text-blue-700 dark:text-blue-300 font-semibold">
              {countFeedbackResponses(
                feedbackDashboardProgramFilter || undefined,
                feedbackDashboardCategoryFilter || undefined
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              &nbsp;
            </label>
            <button
              onClick={() => {
                setFeedbackDashboardProgramFilter("");
                setFeedbackDashboardCategoryFilter("");
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md border border-gray-300 dark:border-gray-600 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
            Overall Scores (All Programs Combined)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {feedbackMetrics.map((metric) => (
              <div
                key={metric.key}
                className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-700 dark:to-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
              >
                <div className="text-sm font-medium text-center text-gray-700 dark:text-gray-300 mb-2">
                  {metric.label}
                </div>
                <div className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200">
                  {overallFeedback[metric.key]?.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  (Likert 1-5)
                </div>
              </div>
            ))}
            {/* Overall Percentage Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700 hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-center text-blue-700 dark:text-blue-300 mb-2">
                Overall Score
              </div>
              <div className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
                {(() => {
                  const totalScore = feedbackMetrics.reduce((sum, metric) => {
                    return sum + (overallFeedback[metric.key] || 0);
                  }, 0);
                  const maxPossibleScore = feedbackMetrics.length * 5;
                  const percentage =
                    maxPossibleScore > 0
                      ? (totalScore / maxPossibleScore) * 100
                      : 0;
                  return `${percentage.toFixed(1)}%`;
                })()}
              </div>
              <div className="text-xs text-blue-500 dark:text-blue-400 text-center">
                (Percentage)
              </div>
            </div>

            {/* Total Responses Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700 hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-center text-green-700 dark:text-green-300 mb-2">
                Total Responses
              </div>
              <div className="text-2xl font-bold text-center text-green-600 dark:text-green-400">
                {countFeedbackResponses(
                  feedbackDashboardProgramFilter || undefined,
                  feedbackDashboardCategoryFilter || undefined
                )}
              </div>
              <div className="text-xs text-green-500 dark:text-green-400 text-center">
                (Count)
              </div>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Program-Level Scores
          </h3>
          {neonFeedbackResponses && neonFeedbackResponses.length > 0 && (
            <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              * Scores include feedback from both CSV and database sources
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-blue-100 dark:bg-slate-900">
                  <th className="border px-2 py-1">Program</th>
                  {feedbackMetrics.map((metric) => (
                    <th className="border px-2 py-1" key={metric.key}>
                      {metric.label}
                    </th>
                  ))}
                  <th className="border px-2 py-1 bg-blue-200 dark:bg-blue-800 font-semibold">
                    Score %
                  </th>
                  <th className="border px-2 py-1 bg-green-200 dark:bg-green-800 font-semibold">
                    Total Responses
                  </th>
                </tr>
              </thead>
              <tbody>
                {programFeedback.map((program, i) => {
                  // Calculate total score for this program
                  const totalScore = feedbackMetrics.reduce((sum, metric) => {
                    const value =
                      typeof program.metrics === "object" &&
                      program.metrics !== null &&
                      metric.key in program.metrics
                        ? (
                            program.metrics as Record<
                              string,
                              number | undefined
                            >
                          )[metric.key]
                        : 0;
                    return sum + (value || 0);
                  }, 0);

                  // Calculate percentage (max score is 5 * number of metrics)
                  const maxPossibleScore = feedbackMetrics.length * 5;
                  const percentage =
                    maxPossibleScore > 0
                      ? (totalScore / maxPossibleScore) * 100
                      : 0;

                  return (
                    <tr
                      key={program.program}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-slate-800"
                          : "bg-blue-50 dark:bg-slate-700"
                      }
                    >
                      <td className="border px-2 py-1 font-semibold">
                        {program.program}
                      </td>
                      {feedbackMetrics.map((metric) => (
                        <td
                          className="border px-2 py-1 text-center dark:text-slate-100"
                          key={metric.key}
                        >
                          {typeof program.metrics === "object" &&
                          program.metrics !== null &&
                          metric.key in program.metrics
                            ? (
                                program.metrics as Record<
                                  string,
                                  number | undefined
                                >
                              )[metric.key]?.toFixed(1)
                            : ""}
                        </td>
                      ))}
                      <td className="border px-2 py-1 text-center bg-blue-50 dark:bg-blue-900 font-semibold">
                        {percentage.toFixed(1)}%
                      </td>
                      <td className="border px-2 py-1 text-center bg-green-50 dark:bg-green-900 font-semibold">
                        {(() => {
                          let programFeedbacks = mergedFeedbackData.filter(
                            (f: any) =>
                              f["Which session did you attend?"] ===
                              program.program
                          );

                          // Apply category filter if selected
                          if (
                            feedbackDashboardCategoryFilter &&
                            feedbackDashboardCategoryFilter !== "all"
                          ) {
                            const programsInCategory = mergedRSVP
                              .filter(
                                (r: any) =>
                                  r.Category?.trim() ===
                                  feedbackDashboardCategoryFilter
                              )
                              .map((r: any) => r["Program Name"]);

                            if (!programsInCategory.includes(program.program)) {
                              return 0; // Return 0 if program is not in selected category
                            }
                          }

                          return programFeedbacks.length;
                        })()}
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
            <svg
              className="w-5 h-5 mr-2 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h7.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            Category-Level Scores
          </h3>
          {neonFeedbackResponses && neonFeedbackResponses.length > 0 && (
            <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              * Scores include feedback from both CSV and database sources
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-green-100 dark:bg-green-900">
                  <th className="border px-2 py-1">Category</th>
                  {feedbackMetrics.map((metric) => (
                    <th className="border px-2 py-1" key={metric.key}>
                      {metric.label}
                    </th>
                  ))}
                  <th className="border px-2 py-1 bg-green-200 dark:bg-green-800 font-semibold">
                    Score %
                  </th>
                  <th className="border px-2 py-1 bg-blue-200 dark:bg-blue-800 font-semibold">
                    Total Responses
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Create a mapping of program names to categories
                  const programToCategoryMap: {
                    [programName: string]: string;
                  } = {};
                  mergedRSVP.forEach((r: any) => {
                    const programName = r["Program Name"];
                    const category = r.Category?.trim() || "Unspecified";
                    if (programName) {
                      programToCategoryMap[programName] = category;
                    }
                  });

                  // Group feedback by category based on program name
                  const feedbackByCategory: { [category: string]: any[] } = {};

                  // Get filtered feedback data based on current filters
                  const filteredFeedbackData = getFilteredFeedbackData();

                  filteredFeedbackData.forEach((feedback: any) => {
                    const feedbackProgram =
                      feedback["Which session did you attend?"];
                    let category = "Unspecified";

                    // Try to find matching program
                    if (feedbackProgram) {
                      // First try exact match
                      if (programToCategoryMap[feedbackProgram]) {
                        category = programToCategoryMap[feedbackProgram];
                      } else {
                        // Try fuzzy matching
                        const matchedProgram = Object.keys(
                          programToCategoryMap
                        ).find(
                          (program) =>
                            feedbackProgram
                              .toLowerCase()
                              .includes(program.toLowerCase()) ||
                            program
                              .toLowerCase()
                              .includes(feedbackProgram.toLowerCase())
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
                  const allCategories = Array.from(
                    new Set([
                      ...categories.map((c) => c.label),
                      ...Object.keys(feedbackByCategory),
                    ])
                  ).sort();

                  return allCategories.map((category, i) => {
                    const categoryFeedbacks =
                      feedbackByCategory[category] || [];

                    // Calculate metrics for this category
                    const categoryMetrics: Record<string, number | undefined> =
                      {};
                    feedbackMetrics.forEach((metric) => {
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
                    const percentage =
                      maxPossibleScore > 0
                        ? (totalScore / maxPossibleScore) * 100
                        : 0;

                    return (
                      <tr
                        key={category}
                        className={
                          i % 2 === 0
                            ? "bg-white dark:bg-slate-800"
                            : "bg-green-50 dark:bg-green-900/20"
                        }
                      >
                        <td className="border px-2 py-1 font-semibold">
                          {category}
                        </td>
                        {feedbackMetrics.map((metric) => (
                          <td
                            className="border px-2 py-1 text-center dark:text-slate-100"
                            key={metric.key}
                          >
                            {categoryMetrics[metric.key]?.toFixed(1) || ""}
                          </td>
                        ))}
                        <td className="border px-2 py-1 text-center bg-green-50 dark:bg-green-900/30 font-semibold">
                          {percentage.toFixed(1)}%
                        </td>
                        <td className="border px-2 py-1 text-center bg-blue-50 dark:bg-blue-900/30 font-semibold">
                          {categoryFeedbacks.length}
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
            <svg
              className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Registered Participants
          </h2>
        </div>

        {/* Enhanced Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Search:
            </label>
            <input
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="Search all fields..."
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
            />
          </div>

          {/* Program Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Program:
            </label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantProgramFilter}
              onChange={(e) => setParticipantProgramFilter(e.target.value)}
            >
              <option value="">All Programs</option>
              {participantCategoryFilter &&
                programsInSelectedCategory.length > 0 && (
                  <option
                    value={`all_in_category_${participantCategoryFilter}`}
                  >
                    All Programs in {participantCategoryFilter} (
                    {programsInSelectedCategory.length} programs)
                  </option>
                )}
              {dropdownNames.map((programName, idx) => (
                <option
                  value={finalSortedPrograms[idx]?.cleanedName || ""}
                  key={idx}
                >
                  {programName}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Category:
            </label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantCategoryFilter}
              onChange={(e) => setParticipantCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {Array.from(
                new Set(
                  mergedRSVP.map((row: any) => row["Category"]).filter(Boolean)
                )
              ).map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Profession Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Profession:
            </label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantProfessionFilter}
              onChange={(e) => setParticipantProfessionFilter(e.target.value)}
            >
              <option value="">All Professions</option>
              {Array.from(
                new Set(
                  mergedRSVP
                    .map((row: any) => row["Profession"])
                    .filter(Boolean)
                )
              ).map((profession) => (
                <option value={profession} key={profession}>
                  {profession}
                </option>
              ))}
            </select>
          </div>

          {/* RSVP Status Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              RSVP Status:
            </label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantStatusFilter}
              onChange={(e) => setParticipantStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Array.from(
                new Set(
                  mergedRSVP
                    .map((row: any) => row["RSVP status"])
                    .filter(Boolean)
                )
              ).map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Status Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Attendance:
            </label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={participantAttendanceFilter}
              onChange={(e) => setParticipantAttendanceFilter(e.target.value)}
            >
              <option value="">All Attendance</option>
              {(() => {
                // Get all unique combined attendance statuses
                const allStatuses = new Set<string>();
                mergedRSVP.forEach((row) => {
                  const combinedStatus = getCombinedAttendanceStatus(row);
                  allStatuses.add(combinedStatus);
                });
                return Array.from(allStatuses)
                  .sort()
                  .map((status) => {
                    let displayLabel = status;
                    if (status === "Attended") {
                      displayLabel = "Attended";
                    } else if (status === "Not Attended") {
                      displayLabel = "Not Attended";
                    } else if (status === "Pending") {
                      displayLabel = "Pending";
                    }
                    return (
                      <option value={status} key={status}>
                        {displayLabel}
                      </option>
                    );
                  });
              })()}
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
            Showing {filteredParticipants.length} of {mergedRSVP.length}{" "}
            participants
            {participantProgramFilter.startsWith("all_in_category_") &&
              participantCategoryFilter && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">
                  (across {programsInSelectedCategory.length} programs in{" "}
                  {participantCategoryFilter})
                </span>
              )}
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() =>
                downloadCSV(
                  getParticipantsForDownload(),
                  "registered_participants.csv"
                )
              }
            >
              Download as CSV
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded"
              onClick={() =>
                downloadExcel(
                  getParticipantsForDownload(),
                  "registered_participants.xlsx"
                )
              }
            >
              Download as Excel
            </button>
          </div>
        </div>

        {/* Show program breakdown when "All Programs in Category" is selected */}
        {participantProgramFilter.startsWith("all_in_category_") &&
          participantCategoryFilter && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                Program Breakdown in {participantCategoryFilter}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {programsInSelectedCategory.map((programName) => {
                  const programParticipants = filteredParticipants.filter(
                    (row: any) =>
                      cleanProgramName(row["Program Name"]) === programName
                  );

                  // Calculate attended count from both CSV and Neon
                  const csvAttended = programParticipants.filter(
                    (row: any) => row["Attendance status"] === "Accepted"
                  ).length;

                  // Count Neon attendance for this specific program
                  const neonAttended = neonAttendanceData.filter(
                    (record: any) => {
                      // Find the event that matches this attendance record
                      const event = neonEvents.find(
                        (e: any) => e.id === record.event_id
                      );
                      if (!event) return false;

                      // Match the event name with the program name
                      const eventName = event.name || "";
                      const normalizedEventName = eventName
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, " ");
                      const normalizedProgramName = programName
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, " ");

                      // Check if the event name contains key words from the program name
                      const programWords = normalizedProgramName
                        .split(" ")
                        .filter((word: string) => word.length > 2);
                      const eventWords = normalizedEventName
                        .split(" ")
                        .filter((word: string) => word.length > 2);

                      // Count how many program words are found in the event name
                      const matchingWords = programWords.filter(
                        (word: string) =>
                          eventWords.some(
                            (eventWord: string) =>
                              eventWord.includes(word) ||
                              word.includes(eventWord)
                          )
                      );

                      // Consider it a match if at least 2 key words match
                      return matchingWords.length >= 2;
                    }
                  ).length;

                  const attendedCount = csvAttended + neonAttended;

                  return (
                    <div
                      key={programName}
                      className="bg-white dark:bg-slate-700 p-3 rounded border"
                    >
                      <div className="font-medium text-sm">{programName}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {programParticipants.length} registered, {attendedCount}{" "}
                        attended
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
                  <th key={key} className="border px-2 py-1">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((row, i) => {
                // Get combined attendance status using helper function
                const combinedAttendanceStatus =
                  getCombinedAttendanceStatus(row);
                const csvAttendanceStatus = (row as Record<string, any>)[
                  "Attendance status"
                ];

                // Check if this participant has Neon attendance
                const hasNeonAttendance = neonAttendanceData.some(
                  (record: any) => {
                    const event = neonEvents.find(
                      (e: any) => e.id === record.event_id
                    );
                    if (!event) return false;

                    const programName = (row as Record<string, any>)[
                      "Program Name"
                    ];
                    const cleanedProgramName = cleanProgramName(programName);
                    const eventName = event.name || "";
                    const normalizedEventName = eventName
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, " ");
                    const normalizedProgramName = cleanedProgramName
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, " ");

                    const programWords = normalizedProgramName
                      .split(" ")
                      .filter((word: string) => word.length > 2);
                    const eventWords = normalizedEventName
                      .split(" ")
                      .filter((word: string) => word.length > 2);

                    const matchingWords = programWords.filter((word: string) =>
                      eventWords.some(
                        (eventWord: string) =>
                          eventWord.includes(word) || word.includes(eventWord)
                      )
                    );

                    return matchingWords.length >= 2;
                  }
                );

                return (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "bg-white dark:bg-slate-800"
                        : "bg-blue-50 dark:bg-slate-700"
                    }
                  >
                    {participantColumns.map((key, j) => {
                      // Special handling for attendance status column
                      if (key === "Attendance status") {
                        return (
                          <td key={j} className="border px-2 py-1">
                            <div className="flex flex-col">
                              <span
                                className={
                                  combinedAttendanceStatus === "Attended"
                                    ? "text-green-600 font-medium"
                                    : combinedAttendanceStatus ===
                                      "Not Attended"
                                    ? "text-red-600 font-medium"
                                    : "text-yellow-600 font-medium"
                                }
                              >
                                {combinedAttendanceStatus}
                              </span>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={j} className="border px-2 py-1">
                          {(row as Record<string, any>)[key] == null
                            ? ""
                            : String((row as Record<string, any>)[key])}
                        </td>
                      );
                    })}
                    <td className="border px-2 py-1">
                      <button
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                        onClick={() =>
                          generateCertificate(
                            (row as Record<string, any>)["Full Name"] || "",
                            (row as Record<string, any>)["Program Date & Time"]
                          )
                        }
                        disabled={!(row as Record<string, any>)["Full Name"]}
                      >
                        Download Certificate
                      </button>
                      <button
                        className="px-2 py-1 bg-yellow-600 text-white rounded text-xs ml-1"
                        onClick={async () => {
                          const participantName =
                            (row as Record<string, any>)["Full Name"] || "";
                          if (!participantName) {
                            alert("Missing name");
                            return;
                          }

                          try {
                            console.log(
                              "Testing PDF generation for:",
                              participantName
                            );

                            // Generate certificate as blob
                            const certificateBlob = (await generateCertificate(
                              participantName,
                              (row as Record<string, any>)[
                                "Program Date & Time"
                              ],
                              { returnBlob: true }
                            )) as Blob;

                            if (!certificateBlob) {
                              throw new Error("Failed to generate certificate");
                            }

                            console.log("Test PDF generated:", {
                              size: certificateBlob.size,
                              type: certificateBlob.type,
                              isBlob: certificateBlob instanceof Blob,
                            });

                            // Test the blob by creating a local URL (same as working Chat component)
                            const localUrl =
                              URL.createObjectURL(certificateBlob);
                            console.log("Local PDF URL created:", localUrl);

                            // Test the PDF accessibility first
                            try {
                              const testResponse = await fetch(localUrl);
                              if (!testResponse.ok) {
                                throw new Error(
                                  `PDF test failed: ${testResponse.status}`
                                );
                              }
                              const testBlob = await testResponse.blob();
                              console.log(
                                "PDF accessibility test successful:",
                                {
                                  size: testBlob.size,
                                  type: testBlob.type,
                                }
                              );

                              // Open in new tab to test (this should work like the Chat component)
                              window.open(localUrl, "_blank");

                              // Clean up after a delay
                              setTimeout(
                                () => URL.revokeObjectURL(localUrl),
                                5000
                              );
                            } catch (testError) {
                              console.error(
                                "PDF accessibility test failed:",
                                testError
                              );
                              // Clean up the URL immediately if test fails
                              URL.revokeObjectURL(localUrl);
                              throw new Error(
                                `PDF accessibility test failed: ${
                                  testError instanceof Error
                                    ? testError.message
                                    : "Unknown error"
                                }`
                              );
                            }

                            alert(
                              `PDF test completed. Check console and new tab for details.`
                            );
                          } catch (error) {
                            console.error("Error testing PDF:", error);
                            alert(
                              `PDF test failed: ${
                                error instanceof Error
                                  ? error.message
                                  : "Unknown error"
                              }`
                            );
                          }
                        }}
                        disabled={!(row as Record<string, any>)["Full Name"]}
                        title="Test PDF generation"
                      >
                        Test PDF
                      </button>
                    </td>
                    <td className="border px-2 py-1">
                      <button
                        className={`px-2 py-1 text-white rounded text-xs ml-1 ${
                          sendingIndividualCert[
                            `${(row as Record<string, any>)["Full Name"]}_${
                              (row as Record<string, any>)["Phone"]
                            }`
                          ]
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                        onClick={async () => {
                          const participantName =
                            (row as Record<string, any>)["Full Name"] || "";
                          const phone =
                            (row as Record<string, any>)["Phone"] || "";
                          const participantKey = `${participantName}_${phone}`;

                          if (!participantName || !phone) {
                            alert("Missing name or phone number");
                            return;
                          }

                          // Validate phone number format
                          const normalizedPhone = phone.replace(/\D/g, "");
                          if (normalizedPhone.length < 10) {
                            alert(
                              "Invalid phone number format. Please ensure it's a valid phone number."
                            );
                            return;
                          }

                          // Format phone number for WhatsApp API (add @c.us suffix if not present)
                          const formattedPhone = normalizedPhone.includes(
                            "@c.us"
                          )
                            ? normalizedPhone
                            : `${normalizedPhone}@c.us`;

                          console.log("Sending certificate for:", {
                            participantName,
                            originalPhone: phone,
                            normalizedPhone,
                            formattedPhone,
                          });

                          // Prevent multiple clicks
                          if (sendingIndividualCert[participantKey]) return;

                          setSendingIndividualCert((prev) => ({
                            ...prev,
                            [participantKey]: true,
                          }));

                          try {
                            // Generate certificate as blob
                            const certificateBlob = (await generateCertificate(
                              participantName,
                              (row as Record<string, any>)[
                                "Program Date & Time"
                              ],
                              { returnBlob: true }
                            )) as Blob;

                            if (!certificateBlob) {
                              throw new Error("Failed to generate certificate");
                            }

                            console.log("Generated certificate blob:", {
                              size: certificateBlob.size,
                              type: certificateBlob.type,
                              isBlob: certificateBlob instanceof Blob,
                            });

                            // Ensure the blob is properly formatted as a PDF
                            let pdfBlob = certificateBlob;
                            if (certificateBlob.type !== "application/pdf") {
                              // Convert to proper PDF blob if type is wrong
                              pdfBlob = new Blob([certificateBlob], {
                                type: "application/pdf",
                              });
                              console.log("Converted blob to PDF type:", {
                                originalType: certificateBlob.type,
                                newType: pdfBlob.type,
                                size: pdfBlob.size,
                              });
                            }

                            // Upload certificate using the same method as Chat component
                            const fileName = `${participantName}_FUTUREX.AI_2025__Certificate.pdf`;
                            const documentUrl = await uploadFile(
                              pdfBlob,
                              fileName
                            );

                            console.log("Certificate uploaded successfully:", {
                              url: documentUrl,
                              fileName: fileName,
                              originalSize: pdfBlob.size,
                            });

                            // Send thank you message first
                            const thankYouText = `Dear ${participantName}

Thank You for Attending FUTUREX.AI 2025

On behalf of the organizing team, we would like to extend our heartfelt thanks for your participation in FUTUREX.AI 2025 held on 14 August 2025.

Your presence and engagement in the Digitalpreneur Create an Online Course with AI session greatly contributed to the success of the event.

We hope the experience was insightful and inspiring as we continue to explore how artificial intelligence and robotics can shape the future.

We hope you can join our next event as well.

Please find your digital certificate of participation attached.

Warm regards,
Co9P AI Chatbot`;

                            // Send thank you message
                            await sendTextMessage(formattedPhone, thankYouText);

                            // Send thank you message first
                            await sendTextMessage(formattedPhone, thankYouText);

                            // Send certificate as document using the server URL
                            await sendDocumentMessage(
                              formattedPhone,
                              documentUrl,
                              fileName,
                              "Your FUTUREX.AI 2025 Certificate of Participation"
                            );

                            alert(
                              `Certificate sent successfully to ${participantName}`
                            );
                          } catch (error) {
                            console.error("Error sending certificate:", error);
                            alert(
                              `Failed to send certificate: ${
                                error instanceof Error
                                  ? error.message
                                  : "Unknown error"
                              }`
                            );
                          } finally {
                            setSendingIndividualCert((prev) => ({
                              ...prev,
                              [participantKey]: false,
                            }));
                          }
                        }}
                        disabled={
                          !(row as Record<string, any>)["Full Name"] ||
                          !(row as Record<string, any>)["Phone"] ||
                          sendingIndividualCert[
                            `${(row as Record<string, any>)["Full Name"]}_${
                              (row as Record<string, any>)["Phone"]
                            }`
                          ]
                        }
                        title="Send certificate via WhatsApp"
                      >
                        {sendingIndividualCert[
                          `${(row as Record<string, any>)["Full Name"]}_${
                            (row as Record<string, any>)["Phone"]
                          }`
                        ]
                          ? "Sending..."
                          : "Send via WhatsApp"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Attendance Summary */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Attendance Summary
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(() => {
                  // Get base participants (before attendance filtering)
                  let baseParticipants = mergedRSVP;

                  // Apply all filters EXCEPT attendance
                  if (
                    participantProgramFilter &&
                    !participantProgramFilter.startsWith("all_in_category_")
                  ) {
                    baseParticipants = baseParticipants.filter(
                      (row) =>
                        cleanProgramName(row["Program Name"]) ===
                        participantProgramFilter
                    );
                  }

                  if (participantCategoryFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["Category"] === participantCategoryFilter
                    );
                  }

                  if (participantProfessionFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["Profession"] === participantProfessionFilter
                    );
                  }

                  if (participantStatusFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["RSVP status"] === participantStatusFilter
                    );
                  }

                  // Count attended
                  const attendedCount = baseParticipants.filter((row) => {
                    const status = getCombinedAttendanceStatus(row);
                    return status === "Attended";
                  }).length;

                  return attendedCount;
                })()}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Total Attended
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {(() => {
                  // Get base participants (before attendance filtering)
                  let baseParticipants = mergedRSVP;

                  // Apply all filters EXCEPT attendance
                  if (
                    participantProgramFilter &&
                    !participantProgramFilter.startsWith("all_in_category_")
                  ) {
                    baseParticipants = baseParticipants.filter(
                      (row) =>
                        cleanProgramName(row["Program Name"]) ===
                        participantProgramFilter
                    );
                  }

                  if (participantCategoryFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["Category"] === participantCategoryFilter
                    );
                  }

                  if (participantProfessionFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["Profession"] === participantProfessionFilter
                    );
                  }

                  if (participantStatusFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["RSVP status"] === participantStatusFilter
                    );
                  }

                  // Count not attended
                  const notAttendedCount = baseParticipants.filter((row) => {
                    const status = getCombinedAttendanceStatus(row);
                    return status === "Not Attended";
                  }).length;

                  return notAttendedCount;
                })()}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Not Attended
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {(() => {
                  // Get base participants (before attendance filtering)
                  let baseParticipants = mergedRSVP;

                  // Apply all filters EXCEPT attendance
                  if (
                    participantProgramFilter &&
                    !participantProgramFilter.startsWith("all_in_category_")
                  ) {
                    baseParticipants = baseParticipants.filter(
                      (row) =>
                        cleanProgramName(row["Program Name"]) ===
                        participantProgramFilter
                    );
                  }

                  if (participantCategoryFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["Category"] === participantCategoryFilter
                    );
                  }

                  if (participantProfessionFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["Profession"] === participantProfessionFilter
                    );
                  }

                  if (participantStatusFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["RSVP status"] === participantStatusFilter
                    );
                  }

                  // Count pending
                  const pendingCount = baseParticipants.filter((row) => {
                    const status = getCombinedAttendanceStatus(row);
                    return status === "Pending";
                  }).length;

                  return pendingCount;
                })()}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(() => {
                  // Get base participants (before attendance filtering)
                  let baseParticipants = mergedRSVP;

                  // Apply all filters EXCEPT attendance
                  if (
                    participantProgramFilter &&
                    !participantProgramFilter.startsWith("all_in_category_")
                  ) {
                    baseParticipants = baseParticipants.filter(
                      (row) =>
                        cleanProgramName(row["Program Name"]) ===
                        participantProgramFilter
                    );
                  }

                  if (participantCategoryFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["Category"] === participantCategoryFilter
                    );
                  }

                  if (participantProfessionFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["Profession"] === participantProfessionFilter
                    );
                  }

                  if (participantStatusFilter) {
                    baseParticipants = baseParticipants.filter(
                      (row) => row["RSVP status"] === participantStatusFilter
                    );
                  }

                  return baseParticipants.length;
                })()}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Total Participants
              </div>
            </div>
          </div>
        </div>

        {/* Program selection dropdown for sending certificates */}
        <div className="mb-4 mt-8 flex flex-col items-start">
          <label className="mb-2 font-semibold">
            Select Program Date to Send Certificates:
          </label>
          <select
            className="border rounded px-2 py-1 max-w-xs w-full"
            value={selectedSendProgram}
            onChange={(e) => setSelectedSendProgram(e.target.value)}
          >
            <option value="">-- Select Program Date --</option>
            {allProgramDates.map((date) => (
              <option value={date} key={date}>
                {dateToProgramName[date]
                  ? `${dateToProgramName[date]} (${date})`
                  : date}
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
            </button>{" "}
            f{/* Confirmation Modal for selecting attendees */}
            {confirmSendOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-lg animate-fadeIn">
                  <h3 className="text-lg font-bold mb-4 text-center">
                    Confirm Recipients
                  </h3>
                  {/* CSV import for exclusion */}
                  <div className="mb-2">
                    <label className="block text-sm font-semibold mb-1">
                      Import CSV to Exclude Phones:
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleExcludeCSV}
                      className="block"
                    />
                  </div>
                  {/* Add this summary line */}
                  <div className="mb-2 text-sm font-semibold text-center">
                    {(() => {
                      const {
                        selectedCount,
                        totalCount,
                        filteredSelectedCount,
                        filteredTotalCount,
                      } = getSelectionCounts();
                      if (searchQuery && filteredTotalCount !== totalCount) {
                        return `Selected: ${selectedCount} / ${totalCount} total (${filteredSelectedCount} / ${filteredTotalCount} visible)`;
                      }
                      return `Selected: ${selectedCount} / ${totalCount} to send`;
                    })()}
                  </div>

                  {/* Select/Deselect All Buttons */}
                  <div className="mb-3 flex justify-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => {
                        setAttendeesToSend(
                          attendeesToSend.map((a) => ({ ...a, selected: true }))
                        );
                      }}
                      disabled={(() => {
                        const { selectedCount, totalCount } =
                          getSelectionCounts();
                        return selectedCount === totalCount;
                      })()}
                      title="Select all attendees (Ctrl/Cmd + A)"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => {
                        // Select only the currently visible (filtered) attendees
                        const visibleAttendeeIds = filteredAttendeesToShow.map(
                          (a) => attendeesToSend.indexOf(a)
                        );
                        setAttendeesToSend(
                          attendeesToSend.map((a, i) => ({
                            ...a,
                            selected: visibleAttendeeIds.includes(i)
                              ? true
                              : a.selected,
                          }))
                        );
                      }}
                      disabled={(() => {
                        const { filteredSelectedCount, filteredTotalCount } =
                          getSelectionCounts();
                        return (
                          filteredTotalCount === 0 ||
                          filteredSelectedCount === filteredTotalCount
                        );
                      })()}
                      title="Select all visible attendees"
                    >
                      Select Visible
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => {
                        setAttendeesToSend(
                          attendeesToSend.map((a) => ({
                            ...a,
                            selected: false,
                          }))
                        );
                      }}
                      disabled={(() => {
                        const { selectedCount } = getSelectionCounts();
                        return selectedCount === 0;
                      })()}
                      title="Deselect all attendees (Ctrl/Cmd + D)"
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search attendees by name... (Ctrl/Cmd + K)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm pr-20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            title="Clear search"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                        <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded">
                          ⌘K
                        </kbd>
                      </div>
                    </div>
                    {searchQuery && (
                      <div className="text-xs text-gray-500 mt-1">
                        Showing {filteredAttendeesToShow.length} of{" "}
                        {attendeesToShow.length} attendees
                      </div>
                    )}
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
                        {filteredAttendeesToShow.map((a, i) => (
                          <tr
                            key={i}
                            className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <td className="border px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={a.selected}
                                onChange={() =>
                                  handleToggleAttendee(
                                    attendeesToSend.indexOf(a)
                                  )
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="border px-2 py-1 font-medium">
                              {a["Full Name"]}
                            </td>
                            <td className="border px-2 py-1">{a["Phone"]}</td>
                          </tr>
                        ))}
                        {filteredAttendeesToShow.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="border px-2 py-4 text-center text-gray-500"
                            >
                              {searchQuery
                                ? `No attendees found matching "${searchQuery}"`
                                : "No attendees to display"}
                            </td>
                          </tr>
                        )}
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
                      className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={handleConfirmAndSend}
                      disabled={(() => {
                        const { selectedCount } = getSelectionCounts();
                        return selectedCount === 0;
                      })()}
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
            onClick={(e) => {
              // Only close if not sending and click is on backdrop
              if (!sendingInProgress && e.target === e.currentTarget)
                setSendingModalOpen(false);
            }}
          >
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-lg animate-fadeIn">
              {/* Close (X) button */}
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
                onClick={() => {
                  if (!sendingInProgress) setSendingModalOpen(false);
                  else if (
                    window.confirm(
                      "Sending is in progress. Are you sure you want to close?"
                    )
                  )
                    setSendingModalOpen(false);
                }}
                aria-label="Close"
              >
                ×
              </button>
              <h3 className="text-lg font-bold mb-4 text-center">
                Sending Certificates
              </h3>
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
                          {s.status === "pending" && (
                            <span className="text-yellow-500">Pending...</span>
                          )}
                          {s.status === "success" && (
                            <span className="text-green-600">Sent</span>
                          )}
                          {s.status === "failed" && (
                            <span className="text-red-600">Failed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  className={`px-4 py-2 rounded ${
                    sendingInProgress
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gray-400 text-white hover:bg-gray-500"
                  }`}
                  onClick={() => {
                    if (!sendingInProgress) setSendingModalOpen(false);
                    else if (
                      window.confirm(
                        "Sending is in progress. Are you sure you want to close?"
                      )
                    )
                      setSendingModalOpen(false);
                  }}
                  disabled={false}
                >
                  Close
                </button>
              </div>
              {sendingInProgress && (
                <div className="mt-2 text-center text-sm text-blue-500">
                  Sending in progress...
                </div>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Feedback Responses
          </h2>

          {feedbackResponsesLoading && (
            <div className="ml-4 flex items-center text-sm text-blue-600 dark:text-blue-400">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600 dark:text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading from database...
            </div>
          )}
          {feedbackResponsesError && (
            <div className="ml-4 text-sm text-red-600 dark:text-red-400">
              <div className="flex items-center space-x-2">
                <span>Error: {feedbackResponsesError}</span>
                <button
                  onClick={() => {
                    // Trigger a retry by calling the hook again
                    window.location.reload();
                  }}
                  className="px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs"
                >
                  Retry
                </button>
              </div>
              <div className="mt-1 text-xs text-red-500 dark:text-red-400">
                Check browser console for detailed error information
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Search:
            </label>
            <input
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              type="text"
              placeholder="Search all fields..."
              value={feedbackSearch}
              onChange={(e) => setFeedbackSearch(e.target.value)}
            />
          </div>

          {/* Session Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Session:
            </label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
            >
              <option value="">All Sessions</option>
              {programNames.map((session) => (
                <option value={session} key={session}>
                  {session}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Date:
            </label>
            <select
              className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={feedbackDateFilter}
              onChange={(e) => setFeedbackDateFilter(e.target.value)}
            >
              <option value="">All Dates</option>
              {Array.from(
                new Set(
                  mergedFeedbackData
                    .map((row: any) => {
                      if (row["Timestamp"]) {
                        return new Date(row["Timestamp"]).toLocaleDateString();
                      }
                      return null;
                    })
                    .filter((date): date is string => date !== null)
                )
              ).map((date) => (
                <option value={date} key={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-gray-700 dark:text-gray-300">
              Rating:
            </label>
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
        
        {/* Certificate Controls and Download Buttons */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Showing {filteredFeedback.length} of {mergedFeedbackData.length} feedback responses
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={() =>
                downloadCSV(filteredFeedback, "feedback_responses.csv")
              }
            >
              Download as CSV
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded"
              onClick={() =>
                downloadExcel(filteredFeedback, "feedback_responses.xlsx")
              }
            >
              Download as Excel
            </button>
            {/* Certificate sending controls */}
            <div className="flex gap-2 items-center">
              <select
                className="px-3 py-2 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedFeedbackProgram}
                onChange={(e) => setSelectedFeedbackProgram(e.target.value)}
              >
                <option value="">Select Program for Certificates</option>
                {Array.from(new Set(filteredFeedback.map((row: any) => row["Which session did you attend?"]).filter(Boolean))).map((program) => (
                  <option value={program} key={program}>{program}</option>
                ))}
              </select>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                onClick={() => {
                  if (selectedFeedbackProgram) {
                    const attendeesForProgram = filteredFeedback.filter(
                      (row: any) => row["Which session did you attend?"] === selectedFeedbackProgram
                    );
                    setFeedbackAttendeesToSend(attendeesForProgram.map(a => ({ ...a, selected: true })));
                    setFeedbackCertModalOpen(true);
                  }
                }}
                disabled={!selectedFeedbackProgram}
              >
                Send Certificates to Program
              </button>
            </div>
          </div>
        </div>
        
        {/* Feedback Responses Table */}
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full border text-xs">
            <thead>
              <tr>
                {Object.keys(filteredFeedback[0] || {}).map((key) => (
                  <th key={key} className="border px-2 py-1">
                    {key}
                  </th>
                ))}
                <th className="border px-2 py-1">Certificate</th>
                <th className="border px-2 py-1">Send via WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedback.map((row, i) => (
                <tr
                  key={i}
                  className={
                    i % 2 === 0
                      ? "bg-white dark:bg-slate-800"
                      : "bg-blue-50 dark:bg-slate-700"
                  }
                >
                  {Object.keys(filteredFeedback[0] || {}).map((key, j) => (
                    <td key={j} className="border px-2 py-1">
                      {(row as Record<string, any>)[key] == null
                        ? ""
                        : String((row as Record<string, any>)[key])}
                    </td>
                  ))}
                  {/* Certificate column */}
                  <td className="border px-2 py-1">
                    <button
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      onClick={() => {
                        const participantName = (row as Record<string, any>)["full_name"] || (row as Record<string, any>)["Full Name"] || "Unknown";
                        const programDate = (row as Record<string, any>)["Which session did you attend?"] || "Unknown Session";
                        generateCertificate(participantName, programDate);
                      }}
                      title="Download Certificate"
                    >
                      Download Certificate
                    </button>
                  </td>
                  {/* Send via WhatsApp column */}
                  <td className="border px-2 py-1">
                    <button
                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                      onClick={async () => {
                        const participantName = (row as Record<string, any>)["full_name"] || (row as Record<string, any>)["Full Name"] || "Unknown";
                        const phone = (row as Record<string, any>)["phone_number"] || (row as Record<string, any>)["Phone"] || (row as Record<string, any>)["contact_number"];
                        const programDate = (row as Record<string, any>)["Which session did you attend?"] || "Unknown Session";
                        
                        if (!participantName || !phone) {
                          alert("Missing name or phone number for certificate sending");
                          return;
                        }
                        
                        // Normalize phone number
                        let normalizedPhone = String(phone).replace(/\D/g, "");
                        if (!normalizedPhone.startsWith("6")) {
                          normalizedPhone = "6" + normalizedPhone;
                        }
                        
                        // Format phone number for WhatsApp API
                        const formattedPhone = normalizedPhone.includes('@c.us') ? normalizedPhone : `${normalizedPhone}@c.us`;
                        
                        const participantKey = `${participantName}_${phone}`;
                        
                        // Prevent multiple clicks
                        if (sendingIndividualCert[participantKey]) return;
                        
                        setSendingIndividualCert(prev => ({ ...prev, [participantKey]: true }));
                        
                        try {
                          // Generate certificate as blob
                          const certificateBlob = await generateCertificate(
                            participantName, 
                            programDate,
                            { returnBlob: true }
                          ) as Blob;
                          
                          if (!certificateBlob) {
                            throw new Error("Failed to generate certificate");
                          }
                          
                          // Ensure the blob is properly formatted as a PDF
                          let pdfBlob = certificateBlob;
                          if (certificateBlob.type !== 'application/pdf') {
                            pdfBlob = new Blob([certificateBlob], { type: 'application/pdf' });
                          }
                          
                          // Upload certificate
                          const fileName = `${participantName}_FUTUREX.AI_2025_Certificate.pdf`;
                          const documentUrl = await uploadFile(pdfBlob, fileName);
                          
                          // Send thank you message
                          const thankYouText = `Dear ${participantName}

Thank You for Attending FUTUREX.AI 2025

On behalf of the organizing team, we would like to extend our heartfelt thanks for your participation in FUTUREX.AI 2025 held on 21 August 2025.

Your presence and engagement in the AI Immersion - Automate It. Analyse It. Storytell It. session greatly contributed to the success of the event.

We hope the experience was insightful and inspiring as we continue to explore how artificial intelligence and robotics can shape the future.

We hope you can join our next event as well.

Please find your digital certificate of participation attached.

Warm regards,
Co9P AI Chatbot`;
                          
                          await sendTextMessage(formattedPhone, thankYouText);
                          
                          // Send certificate as document
                          await sendDocumentMessage(formattedPhone, documentUrl, fileName, "Your FUTUREX.AI 2025 Certificate of Participation");
                          
                          alert(`Certificate sent successfully to ${participantName}`);
                        } catch (error) {
                          console.error("Error sending certificate:", error);
                          alert(`Failed to send certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        } finally {
                          setSendingIndividualCert(prev => ({ ...prev, [participantKey]: false }));
                        }
                      }}
                      disabled={!((row as Record<string, any>)["full_name"] || (row as Record<string, any>)["Full Name"]) || !((row as Record<string, any>)["phone_number"] || (row as Record<string, any>)["Phone"] || (row as Record<string, any>)["contact_number"]) || sendingIndividualCert[`${(row as Record<string, any>)["full_name"] || (row as Record<string, any>)["Full Name"]}_${(row as Record<string, any>)["phone_number"] || (row as Record<string, any>)["Phone"] || (row as Record<string, any>)["contact_number"]}`]}
                      title="Send certificate via WhatsApp"
                    >
                      {sendingIndividualCert[`${(row as Record<string, any>)["full_name"] || (row as Record<string, any>)["Full Name"]}_${(row as Record<string, any>)["phone_number"] || (row as Record<string, any>)["Phone"] || (row as Record<string, any>)["contact_number"]}`] ? 'Sending...' : 'Send via WhatsApp'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      
      {/* Feedback Certificate Confirmation Modal */}
      {feedbackCertModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Confirm Certificate Sending</h3>
              <button
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
                onClick={() => setFeedbackCertModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                You are about to send certificates to <strong>{feedbackAttendeesToSend.length}</strong> feedback respondents for the program: <strong>{selectedFeedbackProgram}</strong>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This will generate and send certificates via WhatsApp to all selected respondents.
              </p>
              
              {/* Failed Numbers Resend Section */}
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Resend to Failed Numbers</h4>
                <p className="text-xs text-red-600 dark:text-red-300 mb-2">
                  Paste failed phone numbers (one per line) to resend certificates:
                </p>
                <textarea
                  className="w-full p-2 border border-red-300 dark:border-red-700 rounded text-sm bg-white dark:bg-slate-700 dark:text-white"
                  rows={4}
                  placeholder="+60127332108&#10;+60192645440&#10;+60112147247&#10;..."
                  value={failedNumbersInput}
                  onChange={(e) => setFailedNumbersInput(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    onClick={() => {
                      const numbers = failedNumbersInput.split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .map(phone => ({
                          phone_number: phone, // Use phone_number to match the table display
                          phone: phone, // Keep phone for backward compatibility
                          name: "Failed Number Resend",
                          selected: true,
                          "Which session did you attend?": selectedFeedbackProgram || "Unknown Session"
                        }));
                      
                      if (numbers.length > 0) {
                        setFeedbackAttendeesToSend(numbers); // Replace instead of add
                        setFailedNumbersInput("");
                      }
                    }}
                  >
                    Add Failed Numbers
                  </button>
                  <button
                    className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                    onClick={() => {
                      const allFailedNumbers = `+60127332108
+60192645440
+60112147247
+60192398428
+60122246205
+60163165869
+60194382875
+60192335125
+60124800026
+60179256448
+60133247703
+60165640579
+60
+601153521500
+60136700477
+60192624682
+60193602939
+6014-7397602
+60196242866
+60136976227
+60128413003
+601124229331
+60172382600
+60192776720
+601159989195
+60137363385
+60178795899
0123210737
+60139982740
+60165432100
+60125170216
+60179084972
+60196992405
+60165683182
+601160562819
+60123210737
+60139808813
+60195710737
+601121677672`;
                      setFailedNumbersInput(allFailedNumbers);
                    }}
                  >
                    Paste All Failed Numbers
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                    onClick={() => setFailedNumbersInput("")}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto border rounded mb-4">
              <table className="min-w-full border text-xs">
                <thead className="bg-gray-100 dark:bg-slate-700">
                  <tr>
                    <th className="border px-2 py-1">
                      <input
                        type="checkbox"
                        checked={feedbackAttendeesToSend.every(a => a.selected)}
                        onChange={(e) => setFeedbackAttendeesToSend(prev => prev.map(a => ({ ...a, selected: e.target.checked })))}
                        className="mr-2"
                      />
                      Select All
                    </th>
                    <th className="border px-2 py-1">Name</th>
                    <th className="border px-2 py-1">Phone</th>
                    <th className="border px-2 py-1">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackAttendeesToSend.map((attendee, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-700'}>
                      <td className="border px-2 py-1">
                        <input
                          type="checkbox"
                          checked={attendee.selected}
                          onChange={() => {
                            setFeedbackAttendeesToSend(prev => prev.map((a, i) => i === idx ? { ...a, selected: !a.selected } : a));
                          }}
                        />
                      </td>
                      <td className="border px-2 py-1">{attendee["full_name"] || attendee["Full Name"] || "Unknown"}</td>
                      <td className="border px-2 py-1">{attendee["phone_number"] || attendee["Phone"] || attendee["contact_number"] || "No Phone"}</td>
                      <td className="border px-2 py-1">{attendee["Which session did you attend?"] || "Unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                onClick={() => setFeedbackCertModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                onClick={() => {
                  setFeedbackCertModalOpen(false);
                  handleFeedbackConfirmAndSend();
                }}
                disabled={!feedbackAttendeesToSend.some(a => a.selected)}
              >
                Send Certificates ({feedbackAttendeesToSend.filter(a => a.selected).length})
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Certificate Sending Progress Modal */}
      {feedbackSendingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
              onClick={() => {
                if (!feedbackSendingInProgress) setFeedbackSendingModalOpen(false);
                else if (window.confirm('Sending is in progress. Are you sure you want to close?')) setFeedbackSendingModalOpen(false);
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-lg font-bold mb-4 text-center">Sending Feedback Certificates</h3>
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
                  {feedbackSendingStatus.map((s, i) => (
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
                className={`px-4 py-2 rounded ${feedbackSendingInProgress ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-400 text-white hover:bg-gray-500'}`}
                onClick={() => {
                  if (!feedbackSendingInProgress) setFeedbackSendingModalOpen(false);
                  else if (window.confirm('Sending is in progress. Are you sure you want to close?')) setFeedbackSendingModalOpen(false);
                }}
                disabled={false}
              >
                Close
              </button>
            </div>
            {feedbackSendingInProgress && (
              <div className="mt-2 text-center text-sm text-blue-500">Sending in progress...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardOverview3;