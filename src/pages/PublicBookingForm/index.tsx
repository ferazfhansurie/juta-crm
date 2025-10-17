import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from "@/components/Base/Button";
import alistLogo from '@/assets/images/alist-logo.png';
import LoadingIcon from '@/components/Base/LoadingIcon';
import { Dialog } from '@headlessui/react';
import axios from 'axios';

interface BookingSlot {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  appointmentType?: string;
  staff_name?: string;
  staff_phone?: string; // Add staff phone number
  duration?: number; // in minutes
}

interface TimeSlot {
  time: string;
  available: boolean;
  date: string;
}

interface GoogleCalendarEvent {
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  summary: string;
  id?: string;
  status?: string;
}

interface BookingRecord {
  slotId: string;
  slotSlug: string;
  phoneNumber: string;
  name: string;
  email?: string;
  companyName?: string;
  bookedAt: string;
  selectedTime: string;
  selectedDate: string;
  staffName?: string;
}

// New interfaces for reminder functionality
interface ReminderSettings {
  reminders: Array<{
    enabled: boolean;
    time: number;
    timeUnit: "minutes" | "hours" | "days";
    type: "before" | "after";
    message: string;
    recipientType?: "contacts" | "employees" | "both";
    selectedEmployees?: string[];
  }>;
}

interface ReminderData {
  userEmail: string;
  appointment: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    address: string;
    contacts: Array<{
      id: string;
      name: string;
      phone: string;
      email: string;
    }>;
    staff: string[];
    staff_name?: string[];
  };
  reminderConfig: any;
  scheduledTime: Date;
  processed: boolean;
}

function PublicBookingForm() {
  const { slug, phone } = useParams<{ slug: string; phone?: string }>();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(phone || '');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{date: string, time: string} | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<Record<string, TimeSlot[]>>({});
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [baseUrl] = useState(() => {
    // Use environment variable or fallback to development URL
    return import.meta.env.VITE_API_BASE_URL || 'https://raucous-joaquin-unexamining.ngrok-free.dev';
  });
  const [isBooked, setIsBooked] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('🔍 PublicBookingForm rendered with:', { slug, phone });

  useEffect(() => {
    if (slug) {
      console.log('🚀 useEffect triggered with slug:', slug);
      console.log('📞 Calling fetchSlot for:', slug);
      
      // slug already contains the full slug (e.g., "introduction-thera-a-list")
      // No need to combine with staffName again
      console.log('🔗 Using slug as slug:', slug);
      
      fetchSlot(slug);
    }
  }, [slug]);

  useEffect(() => {
    console.log('🚀 useEffect triggered with slug:', slug);
    if (slug) {
      console.log('📞 Calling fetchSlot for:', slug);
      fetchSlot(slug).catch(error => {
        console.error('🚨 fetchSlot failed completely:', error);
        // Emergency fallback
  
        setIsLoading(false);
      });
    } else {
      console.log('🎭 No slug, using mock data');
      // For testing purposes, set mock data

      setSelectedStaff('Tika'); // Pre-select the staff member
      setIsLoading(false);
    }

    // Ultra-fast fallback - if nothing loads after 1 second, force mock data to prevent "Not Found" message
    const timeoutId = setTimeout(() => {
      console.log('⏰ Ultra-fast fallback triggered - preventing "Not Found" message');
      if (!slot) {
        setIsLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [slug]);

  // Initialize current week to start from Monday
  useEffect(() => {
    const today = new Date();
    console.log('🗓️ Initializing with today:', today.toISOString());
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    console.log('🗓️ Calculated Monday:', monday.toISOString());
    
    // For booking purposes, if today is past business hours (after 5 PM) or weekend, start from next week
    const currentHour = today.getHours();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6; // Sunday or Saturday
    const isAfterBusinessHours = currentHour >= 17; // After 5 PM
    
    if (isWeekend || isAfterBusinessHours) {
      // Start from next Monday
      monday.setDate(monday.getDate() + 7);
      console.log('🗓️ After hours/weekend - starting from next Monday:', monday.toISOString());
    }
    
    setCurrentWeekStart(monday);
    generateTimeSlots();
    
    // Fetch Google Calendar availability
    fetchGoogleCalendarAvailability(monday);
  }, []);

  // Watch for week changes to fetch new availability
  useEffect(() => {
    fetchGoogleCalendarAvailability(currentWeekStart);
  }, [currentWeekStart]);

  useEffect(() => {
    if (slot) {
      console.log('🎯 Slot loaded, testing employee lookup...');
      console.log('👨‍💼 Slot staff name:', slot);
      // Extract staff name from slot data
      if (slot.staff_name) {
        setSelectedStaff(slot.staff_name);
        console.log('👨‍💼 Staff name extracted from slot:', slot.staff_name);
      } else {
        // Try to extract from slot title (e.g., "introduction-faeez" -> "faeez")
        const titleParts = slot.title.toLowerCase().split('-');
        const possibleStaffName = titleParts[titleParts.length - 1];
        if (possibleStaffName && possibleStaffName.length > 2) {
          // Capitalize first letter
          const staffName = possibleStaffName.charAt(0).toUpperCase() + possibleStaffName.slice(1);
          setSelectedStaff(staffName);
          console.log('👨‍💼 Staff name extracted from title:', staffName);
        }
      }
      
      testEmployeeLookup();
    }
  }, [slot]);

  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    // Generate time slots from 9:00am to 4:00pm (business hours)
    for (let hour = 9; hour <= 16; hour++) {
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'pm' : 'am';
      
      slots.push({
        time: `${displayHour}:00${period}`,
        available: true,
        date: '' // Will be set when used
      });
      
      // Don't add 30-minute slot for the last hour
      if (hour < 16) {
        slots.push({
          time: `${displayHour}:30${period}`,
          available: true,
          date: '' // Will be set when used
        });
      }
    }
    setTimeSlots(slots);
  };

  const formatTime = (hour: number, minute: number = 0) => {
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatDate = (date: Date) => {
    // Use local timezone instead of UTC to avoid date shifting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateUTC = (date: Date) => {
    // Keep the old UTC version for comparison
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    
    // Check if the new date is within allowed range
    const today = new Date();
    const actualCurrentWeekMonday = new Date(today);
    actualCurrentWeekMonday.setDate(today.getDate() - today.getDay() + 1); // Actual current week Monday
    
    // Allow going back to actual current week, regardless of business hours
    const minDate = new Date(actualCurrentWeekMonday);
    
    const maxDate = new Date(actualCurrentWeekMonday);
    maxDate.setMonth(actualCurrentWeekMonday.getMonth() + 1); // 1 month ahead from actual current week
    
    console.log('🗓️ Navigation check:', {
      direction,
      newDate: newDate.toDateString(),
      minDate: minDate.toDateString(),
      maxDate: maxDate.toDateString(),
      isWithinRange: newDate >= minDate && newDate <= maxDate
    });
    
    // Don't allow navigation beyond limits
    if (newDate < minDate || newDate > maxDate) {
      console.log('🚫 Navigation blocked - outside 1 month range');
      return;
    }
    
    console.log('🗓️ Navigating week to:', newDate.toISOString());
    setCurrentWeekStart(newDate);
    // Fetch new availability when week changes
    fetchGoogleCalendarAvailability(newDate);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    
    // Same logic as initialization - if after hours or weekend, go to next week
    const currentHour = today.getHours();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    const isAfterBusinessHours = currentHour >= 17;
    
    if (isWeekend || isAfterBusinessHours) {
      monday.setDate(monday.getDate() + 7);
      console.log('🗓️ Resetting to next available week (after hours):', monday.toISOString());
    } else {
      console.log('🗓️ Resetting to current week:', monday.toISOString());
    }
    
    setCurrentWeekStart(monday);
    fetchGoogleCalendarAvailability(monday);
  };

  const navigateToDate = (selectedDate: Date) => {
    console.log('🗓️ navigateToDate called with:', selectedDate.toDateString());
    
    // Calculate the Monday of the week containing the selected date
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);
    
    console.log('🗓️ Calculated Monday:', monday.toDateString());
    
    // Check if date is within allowed range (1 month ahead from actual current week)
    const today = new Date();
    const actualCurrentWeekMonday = new Date(today);
    actualCurrentWeekMonday.setDate(today.getDate() - today.getDay() + 1);
    
    const minDate = new Date(actualCurrentWeekMonday);
    const maxDate = new Date(actualCurrentWeekMonday);
    maxDate.setMonth(actualCurrentWeekMonday.getMonth() + 1);
    
    console.log('🗓️ Date range check:', {
      monday: monday.toDateString(),
      minDate: minDate.toDateString(),
      maxDate: maxDate.toDateString(),
      isInRange: monday >= minDate && monday <= maxDate
    });
    
    if (monday < minDate || monday > maxDate) {
      console.log('🚫 Date selection blocked - outside 1 month range');
      return;
    }
    
    console.log('🗓️ Navigating to week containing:', selectedDate.toDateString());
    setCurrentWeekStart(monday);
    fetchGoogleCalendarAvailability(monday);
  };

  const isDateSelectable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // For weekend or after-hours, allow current week but prioritize future dates
    const currentHour = new Date().getHours();
    const isAfterHours = currentHour >= 17;
    
    // Don't allow past dates, but be more lenient for today
    const isPast = checkDate < today;
    
    // Don't allow more than 1 month ahead
    const maxDate = new Date(today);
    maxDate.setMonth(today.getMonth() + 1);
    const isTooFar = checkDate > maxDate;
    
    // Skip weekends
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    const isSelectable = !isPast && !isTooFar && !isWeekend;
    
    // Enhanced debug logging - log today specifically
    const isToday = checkDate.getTime() === today.getTime();
    if (isToday || Math.random() < 0.05) { // Always log today, 5% for others
      console.log('🔍 isDateSelectable check:', {
        date: date.toDateString(),
        today: today.toDateString(),
        maxDate: maxDate.toDateString(),
        isPast,
        isTooFar,
        isWeekend,
        isToday,
        currentHour,
        isAfterHours,
        isSelectable
      });
    }
    
    return isSelectable;
  };

  const fetchGoogleCalendarAvailability = async (weekStart: Date = currentWeekStart) => {
    setIsLoadingAvailability(true);
    setIsLoadingSlots(true);
    try {
      const userEmail = 'thealistmalaysia@gmail.com';
      
      console.log('🗓️ fetchGoogleCalendarAvailability called with weekStart:', weekStart);
      console.log('👤 Using email:', userEmail);
      
      // Get events for current week plus next week to ensure we cover all relevant dates
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekStart.getDate() + 13); // Current week + next week (14 days total)
      
      console.log('📅 Fetching for date range:', formatDate(weekStartDate), 'to', formatDate(weekEndDate));
      
      // Fetch all events for the date range in one API call
      const dateRangeEvents = await fetchEventsByDateRange(weekStartDate, weekEndDate, userEmail);
      console.log(`📅 Got ${dateRangeEvents.length} events for the date range`);

      // Generate dates for current week display
      const weekDates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDates.push(date);
      }

      console.log('📅 Week dates generated:', weekDates.map(d => formatDate(d)));

      const availability: Record<string, TimeSlot[]> = {};

      // Process availability for each day of the week (excluding weekends)
      for (const date of weekDates) {
        // Skip weekends (Sunday = 0, Saturday = 6)
        if (date.getDay() === 0 || date.getDay() === 6) {
          continue;
        }
        
        const dateStr = formatDate(date);
        
        // Filter events for this specific date
        const dayEvents = dateRangeEvents.filter(event => {
          let eventDate = '';
          
          // Handle different event types
          if (event.start.dateTime) {
            const parsedDate = new Date(event.start.dateTime);
            eventDate = formatDate(parsedDate);
          } else if (event.start.date) {
            eventDate = event.start.date;
          } else {
            return false;
          }
          
          return eventDate === dateStr;
        });
        
        if (dayEvents.length > 0) {
          console.log(`📅 ${dateStr}: ${dayEvents.length} events found`);
          dayEvents.forEach((event, i) => {
            if (event.start.dateTime && event.end.dateTime) {
              const duration = Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000);
              console.log(`   ${i + 1}. ${event.summary} (${duration}min)`);
              
              // Special debugging for MEETING SALES
              if (event.summary === 'MEETING SALES') {
                console.log(`🔍 DEBUG MEETING SALES:`);
                console.log(`   Raw start: ${event.start.dateTime}`);
                console.log(`   Raw end: ${event.end.dateTime}`);
                console.log(`   Parsed start: ${new Date(event.start.dateTime).toLocaleString()}`);
                console.log(`   Parsed end: ${new Date(event.end.dateTime).toLocaleString()}`);
                console.log(`   Duration: ${duration} minutes`);
              }
            } else {
              console.log(`   ${i + 1}. ${event.summary} (all-day)`);
            }
          });
        }
        
        const daySlots = processDayAvailability(date, dayEvents);
        availability[dateStr] = daySlots;
        console.log(`✅ ${dateStr}: ${daySlots.length} available slots`);
      }

      // Log events that didn't match any week day (for debugging)
      console.log('🔍 Checking for events that didn\'t match any week day...');
      const unmatchedEvents = dateRangeEvents.filter(event => {
        const eventDate = event.start.dateTime ? 
          formatDate(new Date(event.start.dateTime)) : 
          (event.start.date || '');
        
        const weekDateStrings = weekDates
          .filter(date => date.getDay() !== 0 && date.getDay() !== 6) // exclude weekends
          .map(date => formatDate(date));
        
        return !weekDateStrings.includes(eventDate);
      });
      
      if (unmatchedEvents.length > 0) {
        console.log(`⚠️ Found ${unmatchedEvents.length} events that didn't match current week days:`);
        unmatchedEvents.forEach((event, i) => {
          const eventDate = event.start.dateTime ? 
            formatDate(new Date(event.start.dateTime)) : 
            (event.start.date || 'N/A');
          console.log(`  ${i + 1}. ${event.summary} (date: ${eventDate})`);
        });
      } else {
        console.log('✅ All events were properly processed for current week');
      }

      console.log('🎯 Final availability object:', availability);
      setAvailableSlots(availability);
    } catch (error) {
      console.error('❌ Error fetching Google Calendar availability:', error);
      // Fall back to mock data or show error
    } finally {
      setIsLoadingSlots(false);
      setIsLoadingAvailability(false);
    }
  };



  const processDayAvailability = (date: Date, dayEvents: GoogleCalendarEvent[]): TimeSlot[] => {
    // Generate all possible time slots for the day (9 AM to 5 PM)
    const allSlots = generateAllTimeSlots();
    const availableSlots: TimeSlot[] = [];

    console.log(`⏰ Processing ${allSlots.length} time slots for ${formatDate(date)} with ${dayEvents.length} events`);

    // Debug: Show all events being processed
    if (dayEvents.length > 0) {
      console.log(`🔍 Events to process for ${formatDate(date)}:`);
      dayEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.summary} - ${event.start.dateTime || event.start.date}`);
      });
    }

    for (const slot of allSlots) {
      const slotStart = parseTimeSlot(date, slot.time);
      const slotEnd = new Date(slotStart.getTime() + (slot.duration || 30) * 60000);

      // Check if this slot conflicts with any existing events
      const conflictingEvents = dayEvents.filter(event => {
        // Special debugging for MEETING SALES
        if (event.summary === 'MEETING SALES') {
          console.log(`🔍 DEBUG: Processing MEETING SALES event in overlap check`);
        }
        
        // Handle all-day events (date field - no time specified)
        if (event.start.date && !event.start.dateTime) {
          const eventDate = event.start.date;
          const slotDateStr = formatDate(date);
          const isBlocked = eventDate === slotDateStr;
          
          if (isBlocked) {
            console.log(`🚫 ${slot.time} blocked by all-day event: "${event.summary}"`);
          }
          return isBlocked;
        }
        
        // Handle events that might be all-day but stored as dateTime (with 00:00:00 time)
        if (event.start.dateTime && event.end.dateTime) {
          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);
          
          // Check if it's an all-day event (24 hours or more, starting at midnight)
          const duration = eventEnd.getTime() - eventStart.getTime();
          const isAllDay = (duration >= 24 * 60 * 60 * 1000) && 
                          (eventStart.getHours() === 0 && eventStart.getMinutes() === 0);
          
          if (isAllDay) {
            const eventDateStr = formatDate(eventStart);
            const slotDateStr = formatDate(date);
            const isBlocked = eventDateStr === slotDateStr;
            
            if (isBlocked) {
              console.log(`🚫 ${slot.time} blocked by all-day event: "${event.summary}"`);
            }
            return isBlocked;
          }
          
          // Regular timed event - check for overlap
          // The event times are already in the correct timezone, no need to convert
          const eventStartLocal = new Date(eventStart);
          const eventEndLocal = new Date(eventEnd);
          
          const hasOverlap = (slotStart < eventEndLocal && slotEnd > eventStartLocal);
          
          if (hasOverlap) {
            console.log(`⚠️ ${slot.time} conflicts with: "${event.summary}" (${eventStartLocal.toLocaleTimeString()}-${eventEndLocal.toLocaleTimeString()})`);
          }
          
          // Special debugging for MEETING SALES
          if (event.summary === 'MEETING SALES') {
            console.log(`🔍 DEBUG MEETING SALES OVERLAP CHECK:`);
            console.log(`   Slot: ${slot.time} (${slotStart.toLocaleString()} - ${slotEnd.toLocaleString()})`);
            console.log(`   Event: "${event.summary}" (${eventStartLocal.toLocaleString()} - ${eventEndLocal.toLocaleString()})`);
            console.log(`   Overlap calculation: slotStart < eventEndLocal && slotEnd > eventStartLocal`);
            console.log(`   ${slotStart.toLocaleString()} < ${eventEndLocal.toLocaleString()} = ${slotStart < eventEndLocal}`);
            console.log(`   ${slotEnd.toLocaleString()} > ${eventStartLocal.toLocaleString()} = ${slotEnd > eventStartLocal}`);
            console.log(`   Has overlap: ${hasOverlap}`);
          }
          
          return hasOverlap;
        }
        
        return false;
      });

      const hasConflict = conflictingEvents.length > 0;

      // Only add if no conflict and not in the past
      const nowInMalaysia = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const slotDate = new Date(date);
      slotDate.setHours(0, 0, 0, 0);
      
      let isPast = false;
      if (slotDate.getTime() === today.getTime()) {
        // Same day - check if time has passed
        isPast = slotStart < nowInMalaysia;
      } else if (slotDate < today) {
        // Past date
        isPast = true;
      }
      
      if (isPast) {
        console.log(`⏳ ${slot.time} is in the past, skipping`);
      }
      
      if (!hasConflict && !isPast) {
        availableSlots.push({
          time: slot.time,
          available: true,
          date: formatDate(date)
        });
      }
    }

    return availableSlots;
  };

  const fetchDayAvailability = async (date: Date, userEmail: string): Promise<TimeSlot[]> => {
    try {
      // Format date for Google Calendar API
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const apiUrl = `${baseUrl}/api/google-calendar/events`;
      const apiParams = {
        email: userEmail,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        calendarId: 'thealistmalaysia@gmail.com' // Use specific calendar ID
      };

      console.log('🌐 Making API call to:', apiUrl);
      console.log('📋 API Parameters:', apiParams);
      console.log('🔗 Full URL:', `${apiUrl}?${new URLSearchParams(apiParams).toString()}`);

      // Fetch existing events from Google Calendar
      const response = await axios.get(apiUrl, {
        params: apiParams
      });

      console.log('📡 API Response status:', response.status);
      console.log('📊 API Response data:', response.data);

      const events: GoogleCalendarEvent[] = response.data.events || [];
      console.log(`📅 Found ${events.length} events for ${formatDate(date)}`);
      
      if (events.length > 0) {
        console.log('🎯 Events details:', events.map(e => ({
          summary: e.summary,
          start: e.start,
          end: e.end
        })));
      }
      
      // Generate all possible time slots for the day (9 AM to 5 PM)
      const allSlots = generateAllTimeSlots();
      const availableSlots: TimeSlot[] = [];

      console.log(`⏰ Processing ${allSlots.length} time slots for ${formatDate(date)}`);

      for (const slot of allSlots) {
        const slotStart = parseTimeSlot(date, slot.time);
        const slotEnd = new Date(slotStart.getTime() + (slot.duration || 30) * 60000);

        // Check if this slot conflicts with any existing events
        const conflictingEvents = events.filter(event => {
          // Handle all-day events (date field)
          if (event.start.date && event.end.date) {
            const eventStartDate = new Date(event.start.date);
            const eventEndDate = new Date(event.end.date);
            const slotDate = new Date(date);
            slotDate.setHours(0, 0, 0, 0);
            
            // All-day event blocks the entire day
            const isBlocked = slotDate >= eventStartDate && slotDate < eventEndDate;
            if (isBlocked) {
              console.log(`🚫 ${slot.time} blocked by all-day event: ${event.summary}`);
            }
            return isBlocked;
          }
          
          // Handle timed events (dateTime field)
          if (event.start.dateTime && event.end.dateTime) {
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            
            // The event times are already in the correct timezone, no need to convert
            const eventStartLocal = new Date(eventStart);
            const eventEndLocal = new Date(eventEnd);
            
            // Check for overlap
            const hasOverlap = (slotStart < eventEndLocal && slotEnd > eventStartLocal);
            if (hasOverlap) {
              console.log(`⚠️ ${slot.time} conflicts with: ${event.summary} (${eventStartLocal.toLocaleTimeString()}-${eventEndLocal.toLocaleTimeString()})`);
            }
            return hasOverlap;
          }
          
          return false;
        });

        const hasConflict = conflictingEvents.length > 0;

        // Only add if no conflict and not in the past
        const nowInMalaysia = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const slotDate = new Date(date);
        slotDate.setHours(0, 0, 0, 0);
        
        let isPast = false;
        if (slotDate.getTime() === today.getTime()) {
          // Same day - check if time has passed
          isPast = slotStart < nowInMalaysia;
        } else if (slotDate < today) {
          // Past date
          isPast = true;
        }
        
        if (isPast) {
          console.log(`⏳ ${slot.time} is in the past, skipping`);
        }
        
        if (!hasConflict && !isPast) {
          availableSlots.push({
            time: slot.time,
            available: true,
            date: formatDate(date)
          });
        }
      }

      console.log(`🎯 Returning ${availableSlots.length} available slots for ${formatDate(date)}`);
      return availableSlots;
    } catch (error) {
      console.error('❌ Error fetching day availability for', formatDate(date), ':', error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as any;
        console.error('📡 Response status:', axiosError.response?.status);
        console.error('📡 Response data:', axiosError.response?.data);
      }
      return [];
    }
  };

  const generateAllTimeSlots = () => {
    const slots = [];
    // Generate slots from 9 AM to 5 PM (business hours)
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Stop at 5:00 PM (17:00)
        if (hour === 17 && minute > 0) break;
        
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? 'pm' : 'am';
        const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
        
        slots.push({
          time: timeStr,
          duration: 30 // Default duration
        });
      }
    }
    return slots;
  };

  const parseTimeSlot = (date: Date, timeStr: string): Date => {
    const [time, period] = timeStr.split(/([ap]m)/);
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr);
    const minute = parseInt(minuteStr) || 0;

    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;

    const result = new Date(date);
    result.setHours(hour, minute, 0, 0);
    
    return result;
  };

  const fetchSlot = async (title: string) => {
    console.log('🔍 Fetching slot for title:', title);
    try {
      setError(null); // Clear any previous errors
      
      // Use the simplified slug format: title-staffname
      const response = await axios.get(`${baseUrl}/api/booking-slots/${title}`);
      
      console.log('📡 API Response:', response.data);
      
      if (response.data.success && response.data.bookingSlot) {
        console.log('✅ Setting slot from API:', response.data.bookingSlot);
        setSlot(response.data.bookingSlot);
        
        // Set selected staff from slot data
        if (response.data.bookingSlot.staff_name) {
          setSelectedStaff(response.data.bookingSlot.staff_name);
        }
        
        // If we have a company_id, fetch employees for this company
        if (response.data.bookingSlot.company_id) {
          await fetchEmployees(response.data.bookingSlot.company_id);
        }
        return; // Success, exit early
      }
      
      // If we get here, the slot wasn't found
      console.log('❌ No slot found for title:', title);
      setError(`Booking slot not found: ${title}`);
      setSlot(null);
    } catch (error: any) {
      console.error('❌ Error fetching slot:', error);
      setError(`Failed to load booking slot: ${error.message || 'Unknown error'}`);
      setSlot(null);
    }
  };

  const fetchEmployees = async (companyId: string) => {
    console.log('👥 Fetching employees for company:', companyId);
    try {
      const response = await axios.get(`${baseUrl}/api/employees-data/${companyId}`, {
        timeout: 5000
      });
      
      console.log('👥 Employees API Response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Setting employees from API:', response.data);
        setEmployees(response.data);
        
        // If staffName is provided in URL params, find and set the selected staff
        if (slot?.staff_name && response.data.length > 0) {
          const matchingEmployee = response.data.find((emp: any) => 
            emp.name?.toLowerCase().includes(slot?.staff_name?.toLowerCase() || '') ||
            emp.fullName?.toLowerCase().includes(slot?.staff_name?.toLowerCase() || '')
          );
          if (matchingEmployee) {
            setSelectedStaff(matchingEmployee.name || matchingEmployee.fullName || slot?.staff_name || '');
            console.log('✅ Pre-selected staff from URL:', matchingEmployee);
            
            // Update slot with staff phone if available
            const staffPhone = matchingEmployee.phoneNumber || matchingEmployee.phone || '';
            if (staffPhone && slot) {
              setSlot(prevSlot => prevSlot ? {
                ...prevSlot,
                staff_phone: staffPhone
              } : prevSlot);
              console.log('✅ Updated slot with staff phone:', staffPhone);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      // Don't throw error, just log it as employees are not critical for basic booking
    }
  };

  const confirmBooking = async () => {
    if (!phoneNumber.trim() || !name.trim()) {
      alert('Please enter your name and phone number');
      return;
    }

    if (!selectedSlot) {
      alert('Please select a date and time for your appointment');
      return;
    }

    if (!slot) return;

    setIsSubmitting(true);
    try {
      const bookingRecord: BookingRecord = {
        slotId: slot.id,
        slotSlug: slot.slug,
        phoneNumber: phoneNumber.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
        companyName: companyName.trim() || undefined,
        bookedAt: new Date().toISOString(),
        selectedDate: selectedSlot.date,
        selectedTime: selectedSlot.time,
        staffName: selectedStaff || slot?.staff_name || 'Unassigned' // Fallback to slot staff_name if selectedStaff is empty
      };

      console.log('📋 Created booking record:', bookingRecord);
      console.log('👨‍💼 Selected staff:', selectedStaff);
      console.log('👨‍💼 Staff name type:', typeof selectedStaff);
      console.log('👨‍💼 Staff name value:', JSON.stringify(selectedStaff));

      // Parse the appointment start time for reminders
      const eventDate = new Date(selectedSlot.date);
      const startTime = parseTimeSlot(eventDate, selectedSlot.time);

      // For test mode, skip database booking but try Google Calendar
      if (!slug) {
        console.log('Test booking data:', bookingRecord);
        
        // Try to create Google Calendar event for testing
        try {
          await createGoogleCalendarEvent(bookingRecord);
          console.log('✅ Google Calendar event created successfully in test mode');
        } catch (error) {
          console.warn('⚠️ Google Calendar creation failed in test mode (API not ready):', error instanceof Error ? error.message : String(error));
        }

        // Schedule reminders for test mode
        try {
          await scheduleReminders(bookingRecord, startTime);
          console.log('✅ Reminders scheduled successfully in test mode');
        } catch (error) {
          console.warn('⚠️ Reminder scheduling failed in test mode:', error);
        }
        
        // Preserve booking details for confirmation page
        setSelectedDate(selectedSlot.date);
        setSelectedTime(selectedSlot.time);
        
        setIsBooked(true);
        setShowBookingModal(false);
        setTimeout(() => {
          alert('Test booking confirmed! (Google Calendar integration pending backend setup)');
        }, 1000);
        return;
      }

      const response = await axios.post(`${baseUrl}/api/booking-slots/book`, bookingRecord);
      
      if (response.data.success) {
        // Try to create Google Calendar event after successful booking
        let calendarSuccess = false;
        try {
          await createGoogleCalendarEvent(bookingRecord);
          calendarSuccess = true;
          console.log('✅ Google Calendar event created successfully');
        } catch (error) {
          console.warn('⚠️ Google Calendar creation failed (booking still confirmed):', error instanceof Error ? error.message : String(error));
        }

        // Schedule reminders after successful booking
        try {
          await scheduleReminders(bookingRecord, startTime);
          console.log('✅ Reminders scheduled successfully');
        } catch (error) {
          console.warn('⚠️ Reminder scheduling failed (booking still confirmed):', error);
        }
        
        // Preserve booking details for confirmation page
        setSelectedDate(selectedSlot.date);
        setSelectedTime(selectedSlot.time);
        
        setIsBooked(true);
        setShowBookingModal(false);
        setTimeout(() => {
          const message = calendarSuccess 
            ? 'Booking confirmed successfully! Event added to Google Calendar. We will contact you shortly.'
            : 'Booking confirmed successfully! We will contact you shortly. (Calendar event will be added manually)';
          alert(message);
        }, 2000);
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      alert('Failed to confirm booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const createGoogleCalendarEvent = async (bookingRecord: BookingRecord) => {
    try {
      // Parse the selected date and time
      const eventDate = new Date(bookingRecord.selectedDate);
      const startTime = parseTimeSlot(eventDate, bookingRecord.selectedTime);
      const endTime = new Date(startTime.getTime() + (slot?.duration || 30) * 60000);

      const calendarEvent = {
        summary: `${bookingRecord.staffName ? bookingRecord.staffName.charAt(0).toUpperCase() + bookingRecord.staffName.slice(1) : ''} X ${bookingRecord.companyName || bookingRecord.name || ''}`,
        description: `Appointment with ${bookingRecord.name || 'Not provided'}\nCompany: ${bookingRecord.companyName || 'Not provided'}\nPhone: ${bookingRecord.phoneNumber || 'Not provided'}\nEmail: ${bookingRecord.email || 'Not provided'}\nStaff: ${bookingRecord.staffName || 'Not provided'}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Kuala_Lumpur'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Kuala_Lumpur'
        },
        attendees: [
          {
            email: bookingRecord.email || '',
            displayName: bookingRecord.name
          }
        ],
        conferenceData: {
          createRequest: {
            requestId: `booking-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      };

      console.log('📅 Creating Google Calendar event:', calendarEvent);

      const calendarResponse = await axios.post(`${baseUrl}/api/google-calendar/create-event`, {
        event: calendarEvent,
        calendarId: 'thealistmalaysia@gmail.com'
      });

      if (calendarResponse.data.success) {
        console.log('✅ Google Calendar event created:', calendarResponse.data.event);
        // Log the meet link if available
        if (calendarResponse.data.event.hangoutLink) {
          console.log('🎥 Google Meet link:', calendarResponse.data.event.hangoutLink);
        } else if (calendarResponse.data.manualMeetLink) {
          console.log('🎥 Manual Meet link:', calendarResponse.data.manualMeetLink);
        }
      } else {
        console.warn('⚠️ Failed to create Google Calendar event:', calendarResponse.data.error);
      }
    } catch (error) {
      console.error('❌ Error creating Google Calendar event:', error);
      // Don't fail the booking if calendar creation fails
    }
  };

  const checkContactExists = async (phoneNumber: string, companyId: string): Promise<string | null> => {
    try {
      // Format the phone number (remove any non-digit characters)
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      
      // Generate the expected contact_id format
      const expectedContactId = companyId + "-" + formattedPhone;
      
      // Try to fetch the contact to see if it exists
      const response = await axios.get(
        `${baseUrl}/api/contacts/${expectedContactId}`
      );
      
      if (response.data && response.data.success && response.data.contact) {
        console.log('✅ Contact already exists:', expectedContactId);
        return expectedContactId;
      }
      
      return null;
    } catch (error) {
      // Contact doesn't exist, which is fine
      return null;
    }
  };

  const createContactForReminder = async (bookingRecord: BookingRecord, companyId: string): Promise<string | null> => {
    try {
      // Format the phone number (remove any non-digit characters)
      const formattedPhone = bookingRecord.phoneNumber.replace(/\D/g, '');
      
      // Generate contact_id as companyId + phone (same format as CrudDataList)
      const contact_id = companyId + "-" + formattedPhone;
      
      // Generate chat_id for WhatsApp
      const chat_id = formattedPhone + "@c.us";
      
      // Prepare the contact data
      const contactData = {
        contact_id,
        companyId,
        contactName: `${bookingRecord.name} ${lastName}`,
        name: `${bookingRecord.name} ${lastName}`,
        last_name: lastName,
        email: bookingRecord.email || '',
        phone: `+${formattedPhone}`,
        address1: '',
        companyName: '',
        locationId: '',
        dateAdded: new Date().toISOString(),
        unreadCount: 0,
        branch: '',
        expiryDate: '',
        vehicleNumber: '',
        ic: '',
        chat_id: chat_id,
        notes: `Auto-created from booking form for appointment reminder`,
      };

      console.log('📝 Creating contact for reminder:', contactData);
      
      // Send POST request to create the contact
      const response = await axios.post(
        `${baseUrl}/api/contacts`,
        contactData
      );

      if (response.data.success) {
        console.log('✅ Contact created successfully for reminder');
        return contact_id;
      } else {
        console.warn('⚠️ Contact creation response not successful:', response.data);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to create contact for reminder:', error);
      return null;
    }
  };

  // New function to fetch employee data including phone number
  const fetchEmployeeData = async (staffName: string, companyId: string): Promise<{ phoneNumber: string; contactId: string } | null> => {
    try {
      console.log('🔍 Fetching employee data for:', staffName);
      console.log('🏢 Company ID:', companyId);
      
      // First try to get employee data from user-page-context
      try {
        console.log('🔄 Trying user-page-context endpoint...');
        const response = await axios.get(`${baseUrl}/api/user-page-context?email=${slot?.created_by || 'admin@juta.com'}`);
        
        if (response.data && response.data.employees) {
          console.log('📋 Found employees in user-page-context:', response.data.employees);
          
          // Find the employee by name (case-insensitive)
          const employee = response.data.employees.find((emp: any) => 
            emp.name?.toLowerCase() === staffName.toLowerCase() || 
            emp.email?.toLowerCase() === staffName.toLowerCase()
          );
          
          if (employee && employee.phoneNumber) {
            console.log('✅ Found employee with phone number:', employee);
            
            // Format phone number and create contact_id
            const formattedPhone = employee.phoneNumber.replace(/\D/g, '');
            const contactId = companyId + "-" + formattedPhone;
            
            return {
              phoneNumber: formattedPhone,
              contactId: contactId
            };
          } else {
            console.log('⚠️ Employee found but no phone number:', employee);
          }
        } else {
          console.log('⚠️ No employees found in user-page-context response');
        }
      } catch (error) {
        console.log('⚠️ user-page-context endpoint failed:', error);
      }
      
      // Fallback: Try to get employee data from a different endpoint
      try {
        console.log('🔄 Trying alternative employee data endpoint...');
        const altResponse = await axios.get(`${baseUrl}/api/employees-data/${companyId}`);
        
        if (altResponse.data && altResponse.data.employees) {
          console.log('📋 Found employees in alternative endpoint:', altResponse.data.employees);
          
          const employee = altResponse.data.employees.find((emp: any) => 
            emp.name?.toLowerCase() === staffName.toLowerCase() || 
            emp.email?.toLowerCase() === staffName.toLowerCase()
          );
          
          if (employee && employee.phoneNumber) {
            console.log('✅ Found employee via alternative endpoint:', employee);
            
            const formattedPhone = employee.phoneNumber.replace(/\D/g, '');
            const contactId = companyId + "-" + formattedPhone;
            
            return {
              phoneNumber: formattedPhone,
              contactId: contactId
            };
          } else {
            console.log('⚠️ Employee found in alternative endpoint but no phone number:', employee);
          }
        } else {
          console.log('⚠️ No employees found in alternative endpoint response');
        }
      } catch (altError) {
        console.log('⚠️ Alternative endpoint also failed:', altError);
      }
      
      // Try one more approach: search by name in the employees endpoint
      try {
        console.log('🔄 Trying direct name search in employees endpoint...');
        const searchResponse = await axios.get(`${baseUrl}/api/employees-data/${companyId}`);
        
        if (searchResponse.data && searchResponse.data.employees) {
          console.log('📋 All employees in company:', searchResponse.data.employees);
          
          // Find employee by name (case-insensitive partial match)
          const employee = searchResponse.data.employees.find((emp: any) => 
            emp.name?.toLowerCase().includes(staffName.toLowerCase()) ||
            staffName.toLowerCase().includes(emp.name?.toLowerCase())
          );
          
          if (employee && employee.phoneNumber) {
            console.log('✅ Found employee via name search:', employee);
            
            const formattedPhone = employee.phoneNumber.replace(/\D/g, '');
            const contactId = companyId + "-" + formattedPhone;
            
            return {
              phoneNumber: formattedPhone,
              contactId: contactId
            };
          }
        }
      } catch (searchError) {
        console.log('⚠️ Direct name search also failed:', searchError);
      }
      
      console.log('❌ Employee not found or no phone number for:', staffName);
      return null;
    } catch (error) {
      console.error('❌ Error fetching employee data:', error);
      return null;
    }
  };

  // New simplified function to create staff contact directly from phone number
  const ensureStaffContactFromPhone = async (staffName: string, staffPhone: string, companyId: string): Promise<string | null> => {
    try {
      console.log('📞 Creating staff contact from phone for:', staffName);
      console.log('📞 Staff phone:', staffPhone);
      console.log('🏢 Company ID:', companyId);
      
      // Format the phone number (remove any non-digit characters)
      const formattedPhone = staffPhone.replace(/\D/g, '');
      const contactId = companyId + "-" + formattedPhone;
      
      // Check if contact already exists
      const existingContact = await checkContactExists(formattedPhone, companyId);
      if (existingContact) {
        console.log('✅ Staff contact already exists:', existingContact);
        return existingContact;
      }
      
      console.log('📝 Staff contact does not exist, creating new one...');
      
      // Create staff contact
      const contactData = {
        contact_id: contactId,
        companyId,
        contactName: staffName,
        name: staffName,
        last_name: '',
        email: '', // Staff email not available from booking slot
        phone: `+${formattedPhone}`,
        address1: '',
        companyName: '',
        locationId: '',
        dateAdded: new Date().toISOString(),
        unreadCount: 0,
        branch: '',
        expiryDate: '',
        vehicleNumber: '',
        staff: true // Mark as staff contact
      };
      
      console.log('📝 Creating staff contact with data:', contactData);
      
      const response = await axios.post(
        `${baseUrl}/api/contacts`,
        contactData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data && response.data.success) {
        console.log('✅ Staff contact created successfully:', contactId);
        return contactId;
      } else {
        console.error('❌ Failed to create staff contact:', response.data);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Error creating staff contact from phone:', error);
      return null;
    }
  };

  // New function to create or get employee contact for reminders (fallback method)
  const ensureEmployeeContact = async (staffName: string, companyId: string): Promise<string | null> => {
    try {
      console.log('🔧 Ensuring employee contact exists for:', staffName);
      console.log('🏢 Company ID:', companyId);
      
      // First try to fetch employee data
      const employeeData = await fetchEmployeeData(staffName, companyId);
      
      if (employeeData) {
        console.log('✅ Employee data retrieved:', employeeData);
        
        // Check if contact already exists
        const existingContact = await checkContactExists(employeeData.phoneNumber, companyId);
        if (existingContact) {
          console.log('✅ Employee contact already exists:', existingContact);
          return existingContact;
        }
        
        console.log('📝 Employee contact does not exist, creating new one...');
        
        // Create employee contact if it doesn't exist
        const contactData = {
          contact_id: employeeData.contactId,
          companyId,
          contactName: staffName,
          name: staffName,
          last_name: '',
          email: staffName, // Use staff name as email for now
          phone: `+${employeeData.phoneNumber}`,
          address1: '',
          companyName: '',
          locationId: '',
          dateAdded: new Date().toISOString(),
          unreadCount: 0,
          branch: '',
          expiryDate: '',
          vehicleNumber: '',
          ic: '',
          chat_id: `${employeeData.phoneNumber}@c.us`,
          notes: `Auto-created employee contact for appointment reminder`,
        };

        console.log('📝 Creating employee contact for reminder:', contactData);
        
        const response = await axios.post(
          `${baseUrl}/api/contacts`,
          contactData
        );

        if (response.data.success) {
          console.log('✅ Employee contact created successfully');
          return employeeData.contactId;
        } else {
          console.warn('⚠️ Employee contact creation response not successful:', response.data);
        }
      } else {
        console.warn('⚠️ Could not retrieve employee data for:', staffName);
      }
      
      console.warn('⚠️ Could not create employee contact, using fallback');
      return null;
    } catch (error) {
      console.error('❌ Error ensuring employee contact:', error);
      return null;
    }
  };

  const scheduleReminders = async (bookingRecord: BookingRecord, startTime: Date) => {
    try {
      console.log('🔔 Scheduling reminders for booking:', bookingRecord);
      console.log('📅 Appointment start time:', startTime.toLocaleString());
      console.log('🔍 Debug staff values at start of scheduleReminders:');
      console.log('   bookingRecord.staffName:', bookingRecord.staffName);
      console.log('   selectedStaff:', selectedStaff);
      console.log('   slot?.staff_name:', slot?.staff_name);
      console.log('   slot?.staff_phone:', slot?.staff_phone);
      
      // Get the company admin's email (the person who created the booking slot)
      const adminEmail = slot?.created_by || 'admin@juta.com';
      console.log('👤 Admin email for reminders:', adminEmail);
      
      // Create appointment object for reminder processing
      const appointment = {
        id: `booking-${Date.now()}`,
        title: `${slot?.title} - ${bookingRecord.name}`,
        startTime: startTime.toISOString(),
        endTime: new Date(startTime.getTime() + (slot?.duration || 30) * 60000).toISOString(),
        address: slot?.location || 'Location TBD',
        contacts: [{
          id: `contact-${Date.now()}`,
          name: `${bookingRecord.name} ${lastName}`,
          phone: bookingRecord.phoneNumber,
          email: bookingRecord.email || ''
        }],
        staff: [bookingRecord.staffName || 'Unassigned'], // Array for appointment system
        staff_name: [bookingRecord.staffName || 'Unassigned'] // Array for reminder system
      };

      console.log('📋 Created appointment object:', appointment);

      // Get reminder settings from the company admin
      let reminderSettings = await fetchReminderSettings(adminEmail);
      
      if (!reminderSettings || !reminderSettings.reminders) {
        console.log('No reminder settings found, using defaults');
        // Set default reminder settings
        reminderSettings = {
          reminders: [
            {
              enabled: true,
              time: 24, // 24 hours = 1 day
              timeUnit: "hours" as const,
              type: "before" as const,
              message: "Reminder: You have an appointment tomorrow at {time} {unit} {when}. Please be prepared!",
              recipientType: "both" as const,
              selectedEmployees: []
            }
          ]
        };
        console.log('✅ Using default reminder settings:', reminderSettings);
      } else {
        console.log('✅ Found existing reminder settings:', reminderSettings);
      }

      // Process each enabled reminder
      for (const reminder of reminderSettings.reminders) {
        if (!reminder.enabled) {
          console.log('⏭️ Skipping disabled reminder:', reminder);
          continue;
        }
        
        console.log('🔄 Processing reminder:', reminder);

        // Calculate the reminder time
        let reminderTime: Date;
        if (reminder.type === "before") {
          reminderTime = new Date(startTime);
          if (reminder.timeUnit === "minutes") {
            reminderTime.setMinutes(reminderTime.getMinutes() - reminder.time);
          } else if (reminder.timeUnit === "hours") {
            reminderTime.setHours(reminderTime.getHours() - reminder.time);
          } else if (reminder.timeUnit === "days") {
            reminderTime.setDate(reminderTime.getDate() - reminder.time);
          }
        } else {
          reminderTime = new Date(startTime);
          if (reminder.timeUnit === "minutes") {
            reminderTime.setMinutes(reminderTime.getMinutes() + reminder.time);
          } else if (reminder.timeUnit === "hours") {
            reminderTime.setHours(reminderTime.getHours() + reminder.time);
          } else if (reminder.timeUnit === "days") {
            reminderTime.setDate(reminderTime.getDate() + reminder.time);
          }
        }

        console.log(`⏰ Calculated reminder time: ${reminderTime.toLocaleString()}`);

        // Send CLIENT REMINDER separately
        if (reminder.recipientType === "contacts" || reminder.recipientType === "both") {
          console.log('📞 Processing CLIENT reminder...');
          
          const clientMessage = `CLIENT REMINDER: You have an appointment scheduled for ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}. Please be prepared!`;
          
          // Create or get contact for client reminder
          console.log('📞 Processing client reminder for:', bookingRecord.phoneNumber);
          let contactId = await checkContactExists(bookingRecord.phoneNumber, slot?.company_id || 'default-company');
          
          if (!contactId) {
            contactId = await createContactForReminder(bookingRecord, slot?.company_id || 'default-company');
          }
          
          if (contactId) {
            console.log('✅ Client contact ready:', contactId);
            
            const clientScheduledData = {
              chatIds: [contactId],
              message: clientMessage,
              messages: [{
                chatId: contactId,
                message: clientMessage,
                contactData: {
                  contactName: `${bookingRecord.name} ${lastName}`,
                  firstName: bookingRecord.name,
                  lastName: lastName,
                  email: bookingRecord.email || '',
                  phone: bookingRecord.phoneNumber,
                  vehicleNumber: '',
                  branch: '',
                  expiryDate: '',
                  ic: ''
                }
              }],
              batchQuantity: 1,
              companyId: slot?.company_id || 'default-company',
              contact_id: [contactId],
              createdAt: new Date().toISOString(),
              documentUrl: "",
              fileName: null,
              mediaUrl: "",
              mimeType: null,
              repeatInterval: 0,
              repeatUnit: "days",
              scheduledTime: reminderTime.toISOString(),
              status: "scheduled",
              v2: true,
              whapiToken: null,
              phoneIndex: 0,
              minDelay: 0,
              maxDelay: 0,
              activateSleep: false,
              sleepAfterMessages: null,
              sleepDuration: null,
              multiple: false,
            };

            try {
              console.log('📤 Sending CLIENT reminder to schedule-message API');
              const clientResponse = await axios.post(
                `${baseUrl}/api/schedule-message/${slot?.company_id || 'default-company'}`,
                clientScheduledData
              );
              
              if (clientResponse.data.success) {
                console.log(`✅ CLIENT reminder scheduled successfully for ${reminderTime.toLocaleString()}`);
                console.log(`📞 Client: ${contactId}`);
                console.log(`📝 Client Message: ${clientMessage}`);
              } else {
                console.warn('⚠️ Client reminder scheduling failed:', clientResponse.data);
              }
            } catch (error) {
              console.error('❌ Failed to schedule CLIENT reminder:', error);
            }
          } else {
            console.warn('⚠️ Failed to create/get client contact, skipping client reminder');
          }
        }

        // Send STAFF REMINDER separately
        if (reminder.recipientType === "employees" || reminder.recipientType === "both") {
          console.log('👨‍💼 Processing STAFF reminder...');
          
          const staffMessage = `STAFF REMINDER: You have an appointment with ${bookingRecord.name} ${lastName} scheduled for ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}. Please be prepared!`;
          
          if (bookingRecord.staffName && slot?.staff_phone) {
            console.log('📞 Using staff phone from slot:', slot.staff_phone);
            const employeeContactId = await ensureStaffContactFromPhone(bookingRecord.staffName, slot.staff_phone, slot?.company_id || 'default-company');
            
            if (employeeContactId) {
              console.log('✅ Staff contact ready:', employeeContactId);
              console.log('📞 Staff will receive reminder at phone:', slot.staff_phone);
              
              const staffScheduledData = {
                chatIds: [employeeContactId],
                message: staffMessage,
                messages: [{
                  chatId: employeeContactId,
                  message: staffMessage,
                  contactData: {
                    contactName: bookingRecord.staffName,
                    firstName: bookingRecord.staffName,
                    lastName: '',
                    email: '',
                    phone: slot.staff_phone,
                    vehicleNumber: '',
                    branch: '',
                    expiryDate: '',
                    ic: ''
                  }
                }],
                batchQuantity: 1,
                companyId: slot?.company_id || 'default-company',
                contact_id: [employeeContactId],
                createdAt: new Date().toISOString(),
                documentUrl: "",
                fileName: null,
                mediaUrl: "",
                mimeType: null,
                repeatInterval: 0,
                repeatUnit: "days",
                scheduledTime: reminderTime.toISOString(),
                status: "scheduled",
                v2: true,
                whapiToken: null,
                phoneIndex: 0,
                minDelay: 0,
                maxDelay: 0,
                activateSleep: false,
                sleepAfterMessages: null,
                sleepDuration: null,
                multiple: false,
              };

              try {
                console.log('📤 Sending STAFF reminder to schedule-message API');
                const staffResponse = await axios.post(
                  `${baseUrl}/api/schedule-message/${slot?.company_id || 'default-company'}`,
                  staffScheduledData
                );
                
                if (staffResponse.data.success) {
                  console.log(`✅ STAFF reminder scheduled successfully for ${reminderTime.toLocaleString()}`);
                  console.log(`👨‍💼 Staff: ${employeeContactId}`);
                  console.log(`📝 Staff Message: ${staffMessage}`);
                } else {
                  console.warn('⚠️ Staff reminder scheduling failed:', staffResponse.data);
                }
              } catch (error) {
                console.error('❌ Failed to schedule STAFF reminder:', error);
              }
            } else {
              console.warn('⚠️ Could not create staff contact, skipping staff reminder');
            }
          } else {
            console.log('⚠️ Missing staff info - staffName:', bookingRecord.staffName, 'staff_phone:', slot?.staff_phone);
          }
        }
      }
      
      console.log('🎉 Reminder scheduling process completed');
    } catch (error) {
      console.error('❌ Error scheduling reminders:', error);
      // Don't fail the booking if reminder scheduling fails
    }
  };

  const fetchReminderSettings = async (userEmail: string): Promise<ReminderSettings | null> => {
    try {
      const response = await axios.get(
        `${baseUrl}/api/reminder-settings?email=${encodeURIComponent(userEmail)}`
      );
      
      if (response.data && response.data.reminders && response.data.reminders.length > 0) {
        // Transform the backend data structure to match our interface
        const transformedReminders = response.data.reminders.map((reminder: any) => ({
          enabled: reminder.enabled !== false, // Default to true if not specified
          time: reminder.hours_before || reminder.time || 24, // Use hours_before if available
          timeUnit: "hours" as const, // Backend uses hours_before, so default to hours
          type: "before" as const, // Backend uses hours_before, so default to before
          message: reminder.message_template || reminder.message || "Reminder: You have an appointment scheduled for {datetime}",
          recipientType: "both", // Force to "both" for booking appointments - always send to staff and clients
          selectedEmployees: reminder.selected_employees || []
        }));
        
        return {
          reminders: transformedReminders
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching reminder settings:', error);
      return null;
    }
  };

  // Test function to check available employees
  const testEmployeeLookup = async () => {
    try {
      console.log('🧪 Testing employee lookup...');
      console.log('🏢 Company ID:', slot?.company_id);
      console.log('👤 Admin email:', slot?.created_by);
      
      // Test user-page-context endpoint
      try {
        const response = await axios.get(`${baseUrl}/api/user-page-context?email=${slot?.created_by || 'admin@juta.com'}`);
        console.log('📋 user-page-context response:', response.data);
        if (response.data && response.data.employees) {
          console.log('👥 Available employees:', response.data.employees);
          response.data.employees.forEach((emp: any, index: number) => {
            console.log(`👤 Employee ${index + 1}:`, {
              name: emp.name,
              email: emp.email,
              phoneNumber: emp.phoneNumber,
              hasPhone: !!emp.phoneNumber
            });
          });
        }
      } catch (error) {
        console.log('❌ user-page-context failed:', error);
      }
      
      // Test employees endpoint
      try {
        const empResponse = await axios.get(`${baseUrl}/api/employees-data/${slot?.company_id || '0210'}`);
        console.log('📋 employees endpoint response:', empResponse.data);
        if (empResponse.data && empResponse.data.employees) {
          console.log('👥 Available employees from employees endpoint:', empResponse.data.employees);
        }
      } catch (error) {
        console.log('❌ employees endpoint failed:', error);
      }
      
    } catch (error) {
      console.error('❌ Test employee lookup failed:', error);
    }
  };

  const fetchEventsByDateRange = async (startDate: Date, endDate: Date, userEmail: string): Promise<GoogleCalendarEvent[]> => {
    try {
      // Format dates for Google Calendar API
      const startOfRange = new Date(startDate);
      startOfRange.setHours(0, 0, 0, 0);
      const endOfRange = new Date(endDate);
      endOfRange.setHours(23, 59, 59, 999);

      const apiUrl = `${baseUrl}/api/google-calendar/events`;
      const apiParams = {
        email: userEmail,
        timeMin: startOfRange.toISOString(),
        timeMax: endOfRange.toISOString(),
        calendarId: 'thealistmalaysia@gmail.com'
      };

      console.log('🌐 Making date range API call to:', apiUrl);
      console.log('📋 Date range API Parameters:', apiParams);
      console.log('🔗 Date range Full URL:', `${apiUrl}?${new URLSearchParams(apiParams).toString()}`);

      const response = await axios.get(apiUrl, {
        params: apiParams
      });

      console.log('📡 Date range API Response status:', response.status);
      console.log('📊 Date range API Response data:', response.data);

      const events: GoogleCalendarEvent[] = response.data.events || [];
      console.log(`📅 Found ${events.length} events for date range`);
      
      // Log events with dates for debugging
      if (events.length > 0) {
        console.log('🎯 EVENTS BY DATE:');
        const eventsByDate: Record<string, string[]> = {};
        
        events.forEach((event) => {
          let eventDate = '';
          if (event.start.dateTime) {
            eventDate = formatDate(new Date(event.start.dateTime));
          } else if (event.start.date) {
            eventDate = event.start.date;
          }
          
          if (eventDate) {
            if (!eventsByDate[eventDate]) {
              eventsByDate[eventDate] = [];
            }
            eventsByDate[eventDate].push(event.summary);
          }
        });
        
        // Display events grouped by date
        Object.keys(eventsByDate).sort().forEach(date => {
          console.log(`  ${date}: ${eventsByDate[date].length} events`);
          eventsByDate[date].forEach(eventSummary => {
            console.log(`    - ${eventSummary}`);
          });
        });
      } else {
        console.log('❌ No events found for the date range');
      }
      
      return events;
    } catch (error) {
      console.error('❌ Error fetching events by date range:', error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as any;
        console.error('📡 Response status:', axiosError.response?.status);
        console.error('📡 Response data:', axiosError.response?.data);
      }
      return [];
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900/20 dark:to-pink-900/20">
        <div className="relative max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-red-500 to-red-600 rounded-3xl mb-8 shadow-2xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">
              Booking Error
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">{error}</p>
            
            <div className="backdrop-blur-2xl bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-white/40 dark:border-slate-700/60 shadow-2xl p-8 mb-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Debug Information:</h2>
              <div className="text-left space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div><strong>URL Slug:</strong> {slug}</div>
                <div><strong>Phone:</strong> {phone || 'Not provided'}</div>
                <div><strong>Base URL:</strong> {baseUrl}</div>
                <div><strong>API Endpoint:</strong> {baseUrl}/api/booking-slots/{slug}</div>
              </div>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.href = '/'}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-200"
              >
                Return Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-gradient-to-r from-slate-500 to-gray-600 text-white font-semibold rounded-2xl hover:from-slate-600 hover:to-gray-700 transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state if no slug or still loading
  if (!slug || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900/20 dark:to-pink-900/20">
        <div className="relative max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-red-500 to-red-600 rounded-3xl mb-8 shadow-2xl animate-pulse">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">
              Loading...
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              {!slug ? 'No booking slug provided' : 'Loading booking information...'}
            </p>
            
            {!slug && (
              <div className="backdrop-blur-2xl bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-white/40 dark:border-slate-700/60 shadow-2xl p-8 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Debug Information:</h2>
                <div className="text-left space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <div><strong>URL Slug:</strong> {slug || 'undefined'}</div>
                  <div><strong>Phone:</strong> {phone || 'Not provided'}</div>
                  <div><strong>Current URL:</strong> {window.location.href}</div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-200"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        {/* Background decorative elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-3xl border border-white/20 dark:border-slate-700/50 shadow-2xl p-12">
            <LoadingIcon icon="three-dots" className="w-20 h-20" />
          </div>
        </div>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
        {/* Background decorative elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-3xl border border-white/20 dark:border-slate-700/50 shadow-2xl p-12">
            <LoadingIcon icon="three-dots" className="w-20 h-20" />
          </div>
        </div>
      </div>
    );
  }

  if (isBooked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900/20 dark:to-pink-900/20">
        {/* Background decorative elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-red-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            {/* THE A-LIST Logo */}


            
            {/* Main Title */}
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent mb-4">
              Booking Confirmed!
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">Thank you for choosing The A-List Malaysia for your appointment.</p>
            
            {/* Main Content Card */}
            <div className="backdrop-blur-2xl bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-white/40 dark:border-slate-700/60 shadow-2xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">{slot.title}</h2>
              
              {/* Appointment Details */}
              <div className="space-y-4 text-left mb-6">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-slate-50/80 to-gray-50/80 dark:from-slate-700/60 dark:to-gray-700/60 rounded-2xl border border-slate-200/30 dark:border-slate-600/30 backdrop-blur-sm">
                  <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg"></div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'No date selected'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50/80 to-pink-50/80 dark:from-red-900/40 dark:to-pink-900/40 rounded-2xl border border-red-200/30 dark:border-red-600/30 backdrop-blur-sm">
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {selectedTime ? `${selectedTime} (${slot?.duration || 30} min)` : 'No time selected'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50/80 to-violet-50/80 dark:from-purple-900/40 dark:to-violet-900/40 rounded-2xl border border-purple-200/30 dark:border-purple-600/30 backdrop-blur-sm">
                  <div className="w-3 h-3 bg-purple-500 rounded-full shadow-lg"></div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{slot.location}</span>
                </div>
              </div>

              {/* Reminder Notification */}
              <div className="p-6 bg-gradient-to-r from-red-50/80 to-pink-50/80 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200/40 dark:border-red-700/40 rounded-2xl backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6l-6 6v-6zM4 13h6l-6 6v-6zM4 7h6l-6 6V7zM10 19h6l-6 6v-6zM10 13h6l-6 6v-6zM10 7h6l-6 6V7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-3">
                      🔔 Smart Reminders Activated
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                      We've automatically set up intelligent reminders for both you and your assigned staff member. 
                      You'll receive WhatsApp notifications to ensure everyone is prepared for your appointment.
                    </p>
                  </div>
                </div>
              </div>
            </div>

     
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-pink-100 dark:from-slate-900 dark:via-red-900/20 dark:to-pink-900/20">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-red-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-red-400/20 to-pink-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="backdrop-blur-2xl bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-white/40 dark:border-slate-700/60 shadow-2xl p-8 mb-8">
          <div className="text-center space-y-4">
            {/* Logo and Branding */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-16 h-16  rounded-2xl flex items-center justify-center shadow-lg">
                <img 
                  src={alistLogo}
                  alt="THE A-LIST" 
                  className="w-24 h-24 object-contain"
                />
              </div>
         
            </div>
            
            {/* Main Title */}
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
              Introduction with The A-List Malaysia
            </h1>
   
            
            {/* Features */}
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{slot?.duration || 30} min appointments</span>
              </div>
         
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar Section */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-2xl bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-white/40 dark:border-slate-700/60 shadow-2xl overflow-hidden">
              {/* Calendar Header */}
              <div className="p-8 border-b border-white/30 dark:border-slate-700/40 bg-gradient-to-r from-red-50/50 to-pink-50/50 dark:from-red-900/20 dark:to-pink-900/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Select Appointment Time</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-700/70 px-4 py-2 rounded-full border border-white/40 dark:border-slate-600/60 backdrop-blur-sm">
                      GMT+08:00 Malaysia
                    </div>
                    {isLoadingAvailability && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                        <span className="text-sm">Loading...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="p-8 border-b border-white/30 dark:border-slate-700/40">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-slate-700 dark:text-slate-300">
                    {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h4>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigateWeek('prev')}
                      className="p-3 hover:bg-white/70 dark:hover:bg-slate-700/70 rounded-2xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                    >
                      <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={goToCurrentWeek}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => navigateWeek('next')}
                      className="p-3 hover:bg-white/70 dark:hover:bg-slate-700/70 rounded-2xl transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                    >
                      <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Week Days Grid */}
                <div className="grid grid-cols-5 gap-4">
                  {getWeekDates()
                    .filter(date => date.getDay() !== 0 && date.getDay() !== 6)
                    .map((date, index) => {
                      const isToday = formatDate(date) === formatDate(new Date());
                      const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
                      const dateStr = formatDate(date);
                      const daySlots = availableSlots[dateStr] || [];
                      
                      return (
                        <div key={index} className="text-center">
                          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
                            {weekdays[date.getDay() - 1]}
                          </div>
                          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-xl font-bold transition-all duration-200 ${
                            isToday 
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl scale-110' 
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {date.getDate()}
                          </div>

                          {/* Time Slots */}
                          <div className="space-y-2">
                            {isLoadingSlots ? (
                              <div className="flex justify-center">
                                <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                              </div>
                            ) : daySlots.length === 0 ? (
                              <div className="text-sm text-slate-400 dark:text-slate-500 py-3">—</div>
                            ) : (
                              daySlots.map((slot, timeIndex) => {
                                const isSelected = selectedDate === dateStr && selectedTime === slot.time;
                                return (
                                  <button
                                    key={timeIndex}
                                    onClick={() => {
                                      setSelectedSlot({date: dateStr, time: slot.time});
                                      setShowBookingModal(true);
                                    }}
                                    className={`w-full py-3 px-3 text-sm rounded-2xl border transition-all duration-200 hover:scale-105 ${
                                      isSelected
                                        ? 'border-red-500 bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl'
                                        : 'border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 backdrop-blur-sm'
                                    }`}
                                  >
                                    {slot.time}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Selected Time Display */}
              {selectedDate && selectedTime && (
                <div className="p-8 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-t border-white/30 dark:border-slate-700/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xl font-bold text-slate-800 dark:text-white">
                        {new Date(selectedDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })} at {selectedTime}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDate('');
                        setSelectedTime('');
                        setSelectedSlot(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 hover:bg-white/70 dark:hover:bg-slate-700/70 rounded-xl backdrop-blur-sm"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Mini Calendar */}
            <div className="backdrop-blur-2xl bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-white/40 dark:border-slate-700/60 shadow-2xl p-8">
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Calendar</h4>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 text-center text-sm mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="py-3 text-slate-500 dark:text-slate-400 font-bold">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {(() => {
                  const firstDay = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1);
                  const lastDay = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + 1, 0);
                  const startDate = new Date(firstDay);
                  startDate.setDate(startDate.getDate() - firstDay.getDay());
                  
                  const days = [];
                  for (let i = 0; i < 42; i++) {
                    const currentDay = new Date(startDate);
                    currentDay.setDate(startDate.getDate() + i);
                    
                    const isCurrentMonth = currentDay.getMonth() === currentWeekStart.getMonth();
                    const isToday = formatDate(currentDay) === formatDate(new Date());
                    const isInWeekRange = currentDay >= currentWeekStart && currentDay < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const isSelectable = isDateSelectable(currentDay);
                    
                    days.push(
                      <button
                        key={i}
                        onClick={() => {
                          if (isSelectable) {
                            const newWeekStart = new Date(currentDay);
                            newWeekStart.setDate(newWeekStart.getDate() - newWeekStart.getDay() + 1);
                            setCurrentWeekStart(newWeekStart);
                          }
                        }}
                        disabled={!isSelectable}
                        className={`py-2 px-1 text-sm rounded-xl transition-all duration-200 ${
                          !isSelectable
                            ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            : isInWeekRange
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl'
                            : isToday
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 font-bold'
                            : isCurrentMonth
                            ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70'
                            : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                        }`}
                      >
                        {currentDay.getDate()}
                      </button>
                    );
                  }
                  return days;
                })()}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onClose={() => setShowBookingModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-2xl backdrop-blur-2xl bg-white/95 dark:bg-slate-800/95 rounded-3xl border border-white/50 dark:border-slate-700/70 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/30 dark:border-slate-700/40 bg-gradient-to-r from-red-50/50 to-pink-50/50 dark:from-red-900/20 dark:to-pink-900/20">
              <Dialog.Title className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {slot?.title || 'The A-List Introduction'}
              </Dialog.Title>
              
              {selectedSlot && (
                <div className="text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-medium">
                      {new Date(selectedSlot.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })} · {selectedSlot.time}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    (GMT+08:00) Malaysia Time
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Features */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200/50 dark:border-red-700/30 backdrop-blur-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-red-700 dark:text-red-300">Duration: {slot?.duration || 30} minutes</span>
                </div>
         
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      First name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/70 dark:bg-slate-700/70 border border-slate-200/50 dark:border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 backdrop-blur-sm"
                
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/70 dark:bg-slate-700/70 border border-slate-200/50 dark:border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 backdrop-blur-sm"
                   
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/70 dark:bg-slate-700/70 border border-slate-200/50 dark:border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 backdrop-blur-sm"
                   
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Company name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/70 dark:bg-slate-700/70 border border-slate-200/50 dark:border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 backdrop-blur-sm"
   
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/70 dark:bg-slate-700/70 border border-slate-200/50 dark:border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 backdrop-blur-sm"
                    placeholder="+60123456789"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/30 dark:border-slate-700/40 bg-gradient-to-r from-slate-50/50 to-gray-50/50 dark:from-slate-800/20 dark:to-gray-800/20">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-4 py-2.5 text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-700/70 border border-slate-200/50 dark:border-slate-600/50 rounded-xl hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all duration-200 backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBooking}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Booking...
                    </>
                  ) : (
                    'Book Appointment'
                  )}
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

export default PublicBookingForm;
