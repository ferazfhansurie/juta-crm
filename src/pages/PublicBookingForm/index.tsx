import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from "@/components/Base/Button";
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
  const { slotTitle, staffName, phone } = useParams<{ slotTitle: string; staffName: string; phone: string }>();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(phone || '');
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [baseUrl] = useState<string>('https://juta-dev.ngrok.dev');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>(staffName || '');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Record<string, TimeSlot[]>>({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{date: string, time: string} | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    console.log('🚀 useEffect triggered with slotTitle:', slotTitle);
    if (slotTitle) {
      console.log('📞 Calling fetchSlot for:', slotTitle);
      fetchSlot(slotTitle).catch(error => {
        console.error('🚨 fetchSlot failed completely:', error);
        // Emergency fallback
  
        setIsLoading(false);
      });
    } else {
      console.log('🎭 No slotTitle, using mock data');
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
    // Initialize current week to start from Monday
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
  }, [slotTitle]);

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
      
      // Get the whole month instead of just one week
      const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
      const monthEnd = new Date(weekStart.getFullYear(), weekStart.getMonth() + 1, 0);
      
      console.log('📅 Fetching for entire month:', formatDate(monthStart), 'to', formatDate(monthEnd));
      
      // Fetch all events for the entire month in one API call
      const monthEvents = await fetchMonthEvents(monthStart, monthEnd, userEmail);
      console.log(`📅 Got ${monthEvents.length} events for the entire month`);

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
          console.log('⏭️ Skipping weekend:', formatDate(date), `(day ${date.getDay()})`);
          continue;
        }
        
        console.log('🔍 Processing availability for:', formatDate(date));
        const dateStr = formatDate(date);
        
        // Filter events for this specific date
        console.log(`🔍 Filtering events for ${dateStr} from ${monthEvents.length} total events`);
        
        const dayEvents = monthEvents.filter(event => {
          let eventDate = '';
          let eventType = '';
          
          // Handle different event types
          if (event.start.dateTime) {
            const originalDateTime = event.start.dateTime;
            const parsedDate = new Date(event.start.dateTime);
            eventDate = formatDate(parsedDate);
            eventType = 'timed';
            
            // Debug timezone issues
            console.log(`🕐 DateTime parsing for "${event.summary}":`, {
              original: originalDateTime,
              parsed: parsedDate.toISOString(),
              localString: parsedDate.toLocaleString(),
              formatDate_local: eventDate,
              formatDate_UTC: formatDateUTC(parsedDate),
              timezone: parsedDate.getTimezoneOffset(),
              targetDate: dateStr
            });
          } else if (event.start.date) {
            eventDate = event.start.date;
            eventType = 'all-day';
            console.log(`📅 Pure all-day event "${event.summary}": ${eventDate}`);
          } else {
            console.warn(`⚠️ Event has no date or dateTime:`, event);
            return false;
          }
          
          const matches = eventDate === dateStr;
          
          if (matches) {
            console.log(`  ✅ Event matches ${dateStr}: "${event.summary}" (${eventType}, date: ${eventDate})`);
          } else {
            console.log(`  ❌ Event doesn't match ${dateStr}: "${event.summary}" (${eventType}, date: ${eventDate})`);
          }
          
          return matches;
        });
        
        console.log(`�� Found ${dayEvents.length} events for ${dateStr}:`);
        if (dayEvents.length > 0) {
          dayEvents.forEach((event, i) => {
            console.log(`  ${i + 1}. ${event.summary}`);
            if (event.start.dateTime && event.end.dateTime) {
              console.log(`     Time: ${new Date(event.start.dateTime).toLocaleString()} - ${new Date(event.end.dateTime).toLocaleString()}`);
            } else {
              console.log(`     All-day: ${event.start.date || 'N/A'} - ${event.end.date || 'N/A'}`);
            }
          });
        }
        
        const daySlots = processDayAvailability(date, dayEvents);
        availability[dateStr] = daySlots;
        console.log(`✅ Got ${daySlots.length} available slots for ${dateStr}`);
      }

      // Log events that didn't match any week day (for debugging)
      console.log('🔍 Checking for events that didn\'t match any week day...');
      const unmatchedEvents = monthEvents.filter(event => {
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

  const fetchMonthEvents = async (monthStart: Date, monthEnd: Date, userEmail: string): Promise<GoogleCalendarEvent[]> => {
    try {
      // Format dates for Google Calendar API - get entire month
      const startOfMonth = new Date(monthStart);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(monthEnd);
      endOfMonth.setHours(23, 59, 59, 999);

      const apiUrl = `${baseUrl}/api/google-calendar/events`;
      const apiParams = {
        email: userEmail,
        timeMin: startOfMonth.toISOString(),
        timeMax: endOfMonth.toISOString(),
        calendarId: 'thealistmalaysia@gmail.com'
      };

      console.log('🌐 Making MONTH API call to:', apiUrl);
      console.log('📋 Month API Parameters:', apiParams);
      console.log('🔗 Month Full URL:', `${apiUrl}?${new URLSearchParams(apiParams).toString()}`);

      const response = await axios.get(apiUrl, {
        params: apiParams
      });

      console.log('📡 Month API Response status:', response.status);
      console.log('📊 Month API Response data:', response.data);

      const events: GoogleCalendarEvent[] = response.data.events || [];
      console.log(`📅 Found ${events.length} events for entire month`);
      
      // Log all events with detailed information
      if (events.length > 0) {
        console.log('🎯 ALL MONTH EVENTS DETAILS:');
        
        // Categorize events
        const timedEvents = events.filter(e => e.start.dateTime);
        const allDayEvents = events.filter(e => e.start.date && !e.start.dateTime);
        const invalidEvents = events.filter(e => !e.start.dateTime && !e.start.date);
        
        console.log(`📊 Event Summary: ${events.length} total (${timedEvents.length} timed, ${allDayEvents.length} all-day, ${invalidEvents.length} invalid)`);
        
        events.forEach((event, index) => {
         
          // Show parsed dates for easier reading
          if (event.start.dateTime && event.end.dateTime) {
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            const duration = eventEnd.getTime() - eventStart.getTime();
            const isAllDay = (duration >= 24 * 60 * 60 * 1000) && 
                            (eventStart.getHours() === 0 && eventStart.getMinutes() === 0);
            
            
            console.log(`     Date: ${formatDate(eventStart)}`);
          } else if (event.start.date) {
            console.log(`  📅 All-day Event (date): ${event.summary}`);
            console.log(`     Start Date: ${event.start.date}`);
            console.log(`     End Date: ${event.end.date || 'N/A'}`);
          }
          console.log('  ---');
        });
      } else {
        console.log('❌ No events found for the month');
      }
      
      return events;
    } catch (error) {
      console.error('❌ Error fetching month events:', error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as any;
        console.error('📡 Response status:', axiosError.response?.status);
        console.error('📡 Response data:', axiosError.response?.data);
      }
      return [];
    }
  };

  const processDayAvailability = (date: Date, dayEvents: GoogleCalendarEvent[]): TimeSlot[] => {
    // Generate all possible time slots for the day (9 AM to 5 PM)
    const allSlots = generateAllTimeSlots();
    const availableSlots: TimeSlot[] = [];

    console.log(`⏰ Processing ${allSlots.length} time slots for ${formatDate(date)} with ${dayEvents.length} events`);

    for (const slot of allSlots) {
      const slotStart = parseTimeSlot(date, slot.time);
      const slotEnd = new Date(slotStart.getTime() + (slot.duration || 30) * 60000);

      // Check if this slot conflicts with any existing events
      const conflictingEvents = dayEvents.filter(event => {
        // Handle all-day events (date field - no time specified)
        if (event.start.date && !event.start.dateTime) {
          console.log(`🔍 Checking all-day event: "${event.summary}" (${event.start.date})`);
          
          // All-day events block the entire day
          // If the event start date matches the slot date, it's blocked
          const eventDate = event.start.date;
          const slotDateStr = formatDate(date);
          const isBlocked = eventDate === slotDateStr;
          
          if (isBlocked) {
            console.log(`🚫 Slot ${slot.time} blocked by all-day event: "${event.summary}" (${eventDate})`);
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
              console.log(`🚫 Slot ${slot.time} blocked by all-day dateTime event: "${event.summary}" (detected as 24h+ event)`);
            }
            return isBlocked;
          }
          
          // Regular timed event - check for overlap
          const hasOverlap = (slotStart < eventEnd && slotEnd > eventStart);
          if (hasOverlap) {
            console.log(`⚠️ Slot ${slot.time} (${slotStart.toISOString()} - ${slotEnd.toISOString()}) conflicts with: "${event.summary}" (${eventStart.toISOString()} - ${eventEnd.toISOString()})`);
          }
          return hasOverlap;
        }
        
        return false;
      });

      const hasConflict = conflictingEvents.length > 0;

      // Only add if no conflict and not in the past
      // Compare in local timezone - current time in Malaysia
      const nowInMalaysia = new Date();
      // For booking slots, only consider today's slots that have already passed as "past"
      // Allow future dates and future times on today
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
      // Future dates are always available (isPast = false)
      
      if (isPast) {
        console.log(`⏳ Slot ${slot.time} is in the past (slot: ${slotStart.toLocaleString()}, now: ${nowInMalaysia.toLocaleString()}), skipping`);
      }
      
      if (!hasConflict && !isPast) {
        console.log(`✅ Slot ${slot.time} is available`);
        availableSlots.push({
          time: slot.time,
          available: true,
          date: formatDate(date)
        });
      }
    }

    console.log(`🎯 Returning ${availableSlots.length} available slots for ${formatDate(date)}`);
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
              console.log(`🚫 Slot ${slot.time} blocked by all-day event: ${event.summary}`);
            }
            return isBlocked;
          }
          
          // Handle timed events (dateTime field)
          if (event.start.dateTime && event.end.dateTime) {
            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);
            
            // Check for overlap
            const hasOverlap = (slotStart < eventEnd && slotEnd > eventStart);
            if (hasOverlap) {
              console.log(`⚠️ Slot ${slot.time} (${slotStart.toISOString()} - ${slotEnd.toISOString()}) conflicts with: ${event.summary} (${eventStart.toISOString()} - ${eventEnd.toISOString()})`);
            }
            return hasOverlap;
          }
          
          return false;
        });

        const hasConflict = conflictingEvents.length > 0;

        // Only add if no conflict and not in the past
        // Compare in local timezone - current time in Malaysia
        const nowInMalaysia = new Date();
        // For booking slots, only consider today's slots that have already passed as "past"
        // Allow future dates and future times on today
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
        // Future dates are always available (isPast = false)
        
        if (isPast) {
          console.log(`⏳ Slot ${slot.time} is in the past (slot: ${slotStart.toLocaleString()}, now: ${nowInMalaysia.toLocaleString()}), skipping`);
        }
        
        if (!hasConflict && !isPast) {
          console.log(`✅ Slot ${slot.time} is available`);
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
    // Generate slots from 10 AM to 4:30 PM
    for (let hour = 10; hour <= 16; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Stop at 4:30 PM (16:30)
        if (hour === 16 && minute > 30) break;
        
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const period = hour >= 12 ? 'pm' : 'am';
        const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
        
        slots.push({
          time: timeStr,
          duration: 30 // Default duration
        });
      }
    }
    console.log(`⏰ Generated ${slots.length} time slots (10:00am - 4:30pm)`);
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
      // Use the correct Neon database endpoint for booking slots
      const response = await axios.get(`${baseUrl}/api/booking-slots/${title}`, {
  
      });
      
      console.log('📡 API Response:', response.data);
      
      if (response.data.success && response.data.bookingSlot) {
        console.log('✅ Setting slot from API:', response.data.bookingSlot);
        setSlot(response.data.bookingSlot);
        
        // If we have a company_id, fetch employees for this company
        if (response.data.bookingSlot.company_id) {
          await fetchEmployees(response.data.bookingSlot.company_id);
        }
      } else {
        throw new Error('No booking slot found in response');
      }
    } catch (error) {
      console.error('❌ Error fetching booking slot:', error);
      throw error; // Let the useEffect handle the fallback
    } finally {
      console.log('🏁 Setting isLoading to false');
      setIsLoading(false);
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
        if (staffName && response.data.length > 0) {
          const matchingEmployee = response.data.find((emp: any) => 
            emp.name?.toLowerCase().includes(staffName.toLowerCase()) ||
            emp.fullName?.toLowerCase().includes(staffName.toLowerCase())
          );
          if (matchingEmployee) {
            setSelectedStaff(matchingEmployee.name || matchingEmployee.fullName || staffName);
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
      if (!slotTitle) {
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
        const altResponse = await axios.get(`${baseUrl}/api/employees?companyId=${companyId}&search=${encodeURIComponent(staffName)}`);
        
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
        const searchResponse = await axios.get(`${baseUrl}/api/employees?companyId=${companyId}`);
        
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
        const empResponse = await axios.get(`${baseUrl}/api/employees?companyId=${slot?.company_id || '0210'}`);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <LoadingIcon icon="three-dots" className="w-20 h-20" />
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <LoadingIcon icon="three-dots" className="w-20 h-20" />
      </div>
    );
  }

  if (isBooked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Booking Confirmed!</h1>
            <p className="text-lg text-gray-600 mb-8">Thank you for booking your appointment.</p>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">{slot.title}</h2>
              <div className="space-y-3 text-left">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">{selectedDate ? new Date(selectedDate).toLocaleDateString() : 'No date selected'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-700">{selectedTime ? `${selectedTime} (${slot?.duration || 30} min)` : 'No time selected'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{slot.location}</span>
                </div>
              </div>

              {/* Reminder Notification */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6l-6 6v-6zM4 13h6l-6 6v-6zM4 7h6l-6 6V7zM10 19h6l-6 6v-6zM10 13h6l-6 6v-6zM10 7h6l-6 6V7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-800 mb-1">
                      🔔 Reminders Set Up
                    </h3>
                    <p className="text-sm text-blue-700">
                      We've automatically set up reminders for both you and your assigned staff member. 
                      You'll receive a WhatsApp notification 24 hours before your appointment to ensure everyone is prepared.
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6">
          <div>
            <h1 className="text-3xl font-normal text-gray-900 mb-2">{selectedStaff || 'Select Staff'}</h1>
            <h2 className="text-xl font-normal text-gray-700 mb-4">{slot.title}</h2>
            
            <div className="flex items-center text-gray-600 mb-2">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{slot.duration || 30} min appointments</span>
            </div>
            
            <div className="flex items-center text-gray-600">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM5 8a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h8a1 1 0 100-2H6z" />
              </svg>
              <span>Google Meet video conference info added after booking</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center text-gray-500 text-sm">
              <span className="mr-2">Google</span>
              <span className="text-blue-500 font-medium">Calendar</span>
            </div>
          </div>
        </div>



        {/* Calendar Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex">
            {/* Mini Calendar Sidebar */}
            <div className="w-80 border-r border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center space-x-1">
                  {(() => {
                    const today = new Date();
                    const minDate = new Date(today);
                    minDate.setDate(today.getDate() - today.getDay() + 1);
                    
                    const maxDate = new Date(today);
                    maxDate.setDate(today.getDate() - today.getDay() + 1 + 14);
                    
                    const canGoPrev = currentWeekStart > minDate;
                    const canGoNext = currentWeekStart < maxDate;
                    
                    return (
                      <>
                        <button
                          onClick={() => navigateWeek('prev')}
                          disabled={!canGoPrev}
                          className={`p-1 ${canGoPrev ? 'text-gray-400 hover:text-gray-600' : 'text-gray-200 cursor-not-allowed'}`}
                          title={canGoPrev ? 'Previous week' : 'Cannot go to past weeks'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigateWeek('next')}
                          disabled={!canGoNext}
                          className={`p-1 ${canGoNext ? 'text-gray-400 hover:text-gray-600' : 'text-gray-200 cursor-not-allowed'}`}
                          title={canGoNext ? 'Next week' : 'Cannot book more than 2 weeks ahead'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </>
                    );
                  })()}
                  
                  <button
                    onClick={goToCurrentWeek}
                    className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Go to current week"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Mini Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="py-2 text-gray-500 font-medium">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {/* Generate calendar days */}
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
                    const isToday = currentDay.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate === formatDate(currentDay);
                    
                    const isSelectable = isDateSelectable(currentDay);
                    const isInWeekRange = getWeekDates().some(weekDate => 
                      formatDate(weekDate) === formatDate(currentDay)
                    );
                    
                    days.push(
                      <button
                        key={i}
                        onClick={() => {
                          console.log('📅 Calendar date clicked:', {
                            date: currentDay.toDateString(),
                            isSelectable: isSelectable,
                            formatDate: formatDate(currentDay)
                          });
                          if (isSelectable) {
                            navigateToDate(currentDay);
                          } else {
                            console.log('🚫 Date not selectable');
                          }
                        }}
                        disabled={!isSelectable}
                        className={`py-2 px-1 text-sm rounded-full transition-colors ${
                          !isSelectable
                            ? 'text-gray-300 cursor-not-allowed'
                            : isInWeekRange
                            ? 'bg-blue-600 text-white'
                            : isToday
                            ? 'bg-blue-100 text-blue-600 font-medium hover:bg-blue-200'
                            : isCurrentMonth
                            ? 'text-gray-900 hover:bg-gray-100'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={!isSelectable ? 'Date not available for booking' : 'Click to view this week'}
                      >
                        {currentDay.getDate()}
                      </button>
                    );
                  }
                  return days;
                })()}
              </div>
            </div>

            {/* Main Calendar Content */}
            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-gray-900">Select an appointment time</h2>
                <div className="text-sm text-gray-500">
                  (GMT+08:00) Malaysia Time - Kuala Lumpur
                  {isLoadingAvailability && (
                    <div className="mt-1 flex items-center text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                      <span className="text-xs">Loading availability...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Week Days Headers */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                {getWeekDates()
                  .filter(date => date.getDay() !== 0 && date.getDay() !== 6) // Filter out weekends
                  .map((date, index) => {
                  const isToday = formatDate(date) === formatDate(new Date());
                  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                  
                  return (
                    <div key={index} className="text-center">
                      <div className="text-sm font-medium text-gray-600 mb-2">
                        {weekdays[date.getDay()]}
                      </div>
                      <div className={`text-2xl font-normal mb-4 ${isToday ? 'text-white bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center mx-auto' : 'text-gray-900'}`}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Slots Grid */}
              <div className="grid grid-cols-5 gap-4">
                {getWeekDates()
                  .filter(date => date.getDay() !== 0 && date.getDay() !== 6) // Filter out weekends
                  .map((date, dateIndex) => {
                  const dateStr = formatDate(date);
                  const daySlots = availableSlots[dateStr] || [];
                  
                  return (
                    <div key={dateIndex} className="space-y-2">
                      {isLoadingSlots ? (
                        <div className="text-center text-gray-400 py-4">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                        </div>
                      ) : daySlots.length === 0 ? (
                        <div className="text-center text-gray-400 py-4">—</div>
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
                              className={`w-full py-2 px-3 text-sm rounded-full border transition-all duration-200 ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Time Display */}
          {selectedDate && selectedTime && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center text-blue-800">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">
                  Selected: {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} at {selectedTime}
                </span>
                {selectedStaff && (
                  <div className="text-sm text-gray-600">
                    with {selectedStaff}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Form */}
          {selectedDate && selectedTime && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+60 12-345 6789"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              {/* Reminder Information */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-green-700">
                    🔔 Automatic reminders will be set up for both you and your staff member 24 hours before the appointment
                  </span>
                </div>
              </div>

              <button
                onClick={confirmBooking}
                disabled={isSubmitting || !phoneNumber.trim() || !name.trim()}
                className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Booking...</span>
                  </div>
                ) : (
                  'Book Appointment'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 py-4">
          <div className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
            <span>Create your own appointment page.</span>
            <span className="ml-2 underline">Learn More</span>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onClose={() => setShowBookingModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <Dialog.Title className="text-xl font-medium text-gray-900 mb-2">
              {slot?.title || 'The A-List Introduction'}
            </Dialog.Title>
            
            {selectedSlot && (
              <div className="text-gray-600 mb-6">
                <div className="flex items-center mb-2">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  {new Date(selectedSlot.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })} · {selectedSlot.time} - {(() => {
                    const startTime = parseTimeSlot(new Date(selectedSlot.date), selectedSlot.time);
                    const endTime = new Date(startTime.getTime() + (slot?.duration || 30) * 60000);
                    return endTime.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    });
                  })()}
                </div>
                <div className="text-sm text-gray-500">
                  (GMT+08:00) Malaysia Time - Kuala Lumpur
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center text-green-600 mb-4">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM5 8a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h8a1 1 0 100-2H6z" />
                </svg>
                <span className="text-sm">Google Meet video conference info added after booking</span>
              </div>
            </div>

            {/* Reminder Information */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6l-6 6v-6zM4 13h6l-6 6v-6zM4 7h6l-6 6V7zM10 19h6l-6 6v-6zM10 13h6l-6 6v-6zM10 7h6l-6 6V7z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">
                    🔔 Automatic Reminders
                  </h3>
                  <p className="text-xs text-blue-700">
                    We'll automatically set up WhatsApp reminders for both you and your staff member 24 hours before the appointment.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Firaz"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Fhansurie"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ferazfhansurie@gmail.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Company Ltd"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+60123456789"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBooking}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Booking...
                  </>
                ) : (
                  'Book'
                )}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

export default PublicBookingForm;
