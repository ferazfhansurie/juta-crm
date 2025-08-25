import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from "@/components/Base/Button";
import LoadingIcon from '@/components/Base/LoadingIcon';

// Event registration form component
function PublicRegisterForm() {
  const navigate = useNavigate();
  const { phone } = useParams<{ phone: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseUrl] = useState<string>('https://juta-dev.ngrok.dev');
  
  // Add error state for better error handling
  const [errors, setErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  
  const [formData, setFormData] = useState({
    selectedPrograms: [] as string[], // Changed to array for multiple events
    fullName: '',
    organisation: '',
    email: '', // This will be auto-generated from phone number
    profession: '',
    phone: ''
  });

  // Participants list for bulk registration
  const [participants, setParticipants] = useState([
    {
      id: 1,
      fullName: '',
      organisation: '',
      email: '',
      profession: '',
      phone: '' // Add phone field
    }
  ]);

  // Extract phone number from URL parameter
  useEffect(() => {
    if (phone) {
      console.log('Raw phone parameter:', phone);
      
      // Remove any non-digit characters and ensure it starts with 60
      let phoneDigits = phone.replace(/\D/g, "");
      console.log('Phone after removing non-digits:', phoneDigits);
      
      if (!phoneDigits.startsWith("60")) {
        phoneDigits = "60" + phoneDigits;
        console.log('Phone after adding 60 prefix:', phoneDigits);
      }
      
      console.log('Final formatted phone:', phoneDigits);
      console.log('Phone length:', phoneDigits.length);
      
      // Validate phone number format
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        console.warn('Phone number length seems unusual:', phoneDigits.length);
      }
      
      setFormData(prev => ({
        ...prev,
        phone: phoneDigits
      }));

    }
  }, [phone]);

  // State for events
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Fetch events from the database
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const response = await fetch(`${baseUrl}/api/events?company_id=0380`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }
        
        const data = await response.json();

        
        if (data.events) {
          setEvents(data.events);
          
          // Debug: Log upcoming events
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const upcoming = data.events.filter((event: any) => {
            if (!event.start_date) return false;
            if (event.is_active === false || event.is_active === 'false') return false;
            
            const eventDate = new Date(event.start_date);
            const eventDateStr = eventDate.toISOString().split('T')[0];
            const todayStr = today.toISOString().split('T')[0];
            return eventDateStr >= todayStr;
          });
          

        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, [baseUrl]);

  // Filter out past events and get upcoming ones
// Filter out past events and get upcoming ones using Malaysia time
// Malaysia is UTC+8
const malaysiaTimeOffset = 8 * 60; // 8 hours in minutes
const now = new Date();
const malaysiaTime = new Date(now.getTime() + (malaysiaTimeOffset * 60 * 1000));

// Get end of today in Malaysia time (23:59:59)
const todayEnd = new Date(malaysiaTime);
todayEnd.setHours(23, 59, 59, 999);

console.log('=== FILTERING EVENTS ===');
console.log('Current time (local):', now.toISOString());
console.log('Malaysia time:', malaysiaTime.toISOString());
console.log('Today end (Malaysia):', todayEnd.toISOString());

const upcomingEvents = events.filter(event => {
  // Debug: Log the event data to see what we're working with
  console.log(`Checking event: ${event.name}`);
  console.log(`  start_date: ${event.start_date} (type: ${typeof event.start_date})`);
  console.log(`  is_active: ${event.is_active} (type: ${typeof event.is_active})`);
  console.log(`  Full event object:`, event);
  
  if (!event.start_date) {
    console.log(`Skipping ${event.name}: no start_date`);
    return false;
  }
  
  if (event.is_active === false || event.is_active === 'false') {
    console.log(`Skipping ${event.name}: not active`);
    return false;
  }
  
  // Parse the event date and convert to Malaysia time
  const eventDate = new Date(event.start_date);
  const eventDateMalaysia = new Date(eventDate.getTime() + (malaysiaTimeOffset * 60 * 1000));
  
  // Check if event is today or in the future (until end of today)
  const isUpcoming = eventDateMalaysia >= malaysiaTime || 
  (eventDateMalaysia.getDate() === malaysiaTime.getDate() && 
   eventDateMalaysia.getMonth() === malaysiaTime.getMonth() && 
   eventDateMalaysia.getFullYear() === malaysiaTime.getFullYear());

  console.log(`Event: ${event.name}`);
  console.log(`  Event date (original): ${event.start_date}`);
  console.log(`  Event date (Malaysia): ${eventDateMalaysia.toISOString()}`);
  console.log(`  Today end (Malaysia): ${todayEnd.toISOString()}`);
  console.log(`  Current (Malaysia): ${malaysiaTime.toISOString()}`);
  console.log(`  Is upcoming: ${isUpcoming}`);
  
  return isUpcoming;
}).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  console.log('=== FILTERING COMPLETE ===');
  console.log('Total events:', events.length);
  console.log('Upcoming events:', upcomingEvents.length);
  upcomingEvents.forEach(event => {
    console.log(`✅ ${event.name} - ${event.start_date}`);
  });

  // Profession options
  const professionOptions = [
    'SME / SMI / Private Company',
    'Government Agency / Research Institute',
    'Ministry / Government Staff / Civil Servant',
    'University (Staff / Lecturers / Researchers)',
    'University / College Student',
    'Individual',
    'Others'
  ];

  // Helper function to get company data from NeonDB
  const getCompanyApiUrl = async () => {
    try {
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
        apiUrl: data.companyData?.api_url || baseUrl,
      companyId: data.userData.companyId,
    };
    } catch (error) {
      console.error('Error in getCompanyApiUrl:', error);
      throw error;
    }
  };

  // Helper function to generate reference number
  const generateReferenceNumber = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `REF-${timestamp}-${random}`.toUpperCase();
  };

  // Helper function to generate receipt number
  const generateReceiptNumber = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `RCPT-${timestamp}-${random}`.toUpperCase();
  };

  // Helper function to generate enrollee ID
  const generateEnrolleeId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ENR-${timestamp}-${random}`.toUpperCase();
  };

  // Helper function to generate proper UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Error handling functions
  const clearErrors = () => {
    setErrors([]);
    setShowErrors(false);
  };

  const addError = (error: string) => {
    setErrors(prev => [...prev, error]);
  };

  const showErrorModal = (errorMessages: string[]) => {
    setErrors(errorMessages);
    setShowErrors(true);
  };

  // Enhanced validation with specific error messages
  const validateForm = () => {
    clearErrors();
    const newErrors: string[] = [];

    console.log('🔍 VALIDATION DEBUG - Form data:', formData);
    console.log('🔍 VALIDATION DEBUG - Email field:', {
      value: formData.email,
      type: typeof formData.email,
      length: formData.email.length,
      trimmed: formData.email.trim(),
      trimmedLength: formData.email.trim().length
    });

    // Check if there are any upcoming events available
    if (upcomingEvents.length === 0) {
      newErrors.push('❌ No upcoming events are available for registration. Please check back later.');
    }
    
    // Check if events are still loading
    if (eventsLoading) {
      newErrors.push('❌ Events are still loading. Please wait a moment and try again.');
    }
    
    // Validate that selected events have proper IDs
    if (formData.selectedPrograms.length > 0) {
      const invalidEvents = formData.selectedPrograms.filter(slug => {
        const event = upcomingEvents.find(e => e.slug === slug);
        return !event || !event.id;
      });
      
      if (invalidEvents.length > 0) {
        newErrors.push(`❌ Some selected events are invalid: ${invalidEvents.join(', ')}. Please refresh the page and try again.`);
      }
    }
    
    if (formData.selectedPrograms.length === 0) {
      newErrors.push('❌ Please select at least one program to register for.');
    }
    
    if (!formData.fullName.trim()) {
      newErrors.push('❌ Full name is required for your certificate of attendance.');
    } else if (formData.fullName.trim().length < 2) {
      newErrors.push('❌ Full name must be at least 2 characters long.');
    }
    
    if (!formData.organisation.trim()) {
      newErrors.push('❌ Organisation/company name is required.');
    } else if (formData.organisation.trim().length < 2) {
      newErrors.push('❌ Organisation name must be at least 2 characters long.');
    }
    
    if (!formData.phone.trim()) {
      newErrors.push('❌ Phone number is required for WhatsApp confirmation.');
    } else {
      // Enhanced phone number validation
      const cleanPhone = formData.phone.replace(/\s/g, '');
      const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,}$/;
      
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.push('❌ Please enter a valid phone number (minimum 10 digits).');
      }
      
      // Check for the specific problematic phone number
      if (cleanPhone === '60192692775') {
        console.log('🚨 VALIDATING PROBLEMATIC PHONE NUMBER: 60192692775');
        console.log('Phone validation details:', {
          original: formData.phone,
          cleaned: cleanPhone,
          length: cleanPhone.length,
          matchesRegex: phoneRegex.test(cleanPhone),
          startsWith60: cleanPhone.startsWith('60')
        });
      }
    }
    
    if (!formData.profession) {
      newErrors.push('❌ Please select your profession from the available options.');
    }

    if (newErrors.length > 0) {
      showErrorModal(newErrors);
      return false;
    }
    
    return true;
  };

  // Check if user is already registered for selected events
  const checkExistingRegistration = async (phone: string, eventIds: string[]) => {
    try {
      const response = await fetch(`${baseUrl}/api/participants?company_id=0380`);
      if (response.ok) {
        const data = await response.json();
        const existingRegistrations = data.participants?.filter((p: any) => {
          // Check by phone number
          if (p.enrollee?.phone === phone || p.enrollee?.mobile_number === phone) {
            return eventIds.includes(p.event_id);
          }
          
          // Check by email if user provided one
          if (formData.email.trim() && p.enrollee?.email?.toLowerCase() === formData.email.trim().toLowerCase()) {
            return eventIds.includes(p.event_id);
          }
          
          return false;
        }) || [];
        
        if (existingRegistrations.length > 0) {
          const eventNames = existingRegistrations.map((r: any) => {
            const event = upcomingEvents.find(e => e.id === r.event_id);
            return event ? event.name : 'Unknown Event';
          });
          return {
            isRegistered: true,
            events: eventNames,
            message: `You are already registered for: ${eventNames.join(', ')}`
          };
        }
      }
      return { isRegistered: false, events: [], message: '' };
    } catch (error) {
      console.error('Error checking existing registration:', error);
      return { isRegistered: false, events: [], message: '' };
    }
  };

  // Helper function to get event ID from program selection
  const getEventIdFromProgram = (programValue: string) => {
    console.log('getEventIdFromProgram called with:', programValue);
    console.log('Available events:', upcomingEvents);
    
    // Find the event by slug
    const event = upcomingEvents.find(e => e.slug === programValue);
    
    if (!event) {
      console.error(`No event found for program slug: ${programValue}`);
      console.error('Available slugs:', upcomingEvents.map(e => e.slug));
      throw new Error(`Invalid program selection: ${programValue}. Please refresh the page and try again.`);
    }
    
    console.log('Found event:', event);
    console.log('Event ID:', event.id);
    
    if (!event.id) {
      console.error('Event found but ID is missing:', event);
      throw new Error(`Event ${event.name} has no ID. Please contact support.`);
    }
    
    return event.id; // This will be the actual UUID from the database
  };

  // Helper function to get program title from program value
  const getProgramTitle = (programValue: string) => {
    const program = upcomingEvents.find(p => p.slug === programValue);
    return program ? program.name : 'Unknown Program';
  };

  // Helper function to get event details for WhatsApp message
  const getEventDetails = (programValue: string) => {
    // Find the event by slug
    const event = upcomingEvents.find(e => e.slug === programValue);
    
    if (!event) {
      return { title: 'Unknown Event', venue: 'TBD', date: 'TBD', time: 'TBD' };
    }
    
    // Format the date
    const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Format the time
    const startTime = event.start_time || '09:00';
    const endTime = event.end_time || '17:00';
    const timeRange = `${startTime} to ${endTime}`;
    
    return {
      title: event.name,
      venue: event.location,
      date: eventDate,
      time: timeRange
    };
  };

  // Participant management functions
  const addParticipant = () => {
    const newId = Math.max(...participants.map(p => p.id)) + 1;
    setParticipants(prev => [...prev, {
      id: newId,
      fullName: '',
      organisation: '',
      email: '',
      profession: '',
      phone: formData.phone // Use the main contact's phone number
    }]);
  };

  const removeParticipant = (id: number) => {
    if (participants.length > 1) {
      setParticipants(prev => prev.filter(p => p.id !== id));
    }
  };

  const updateParticipant = (id: number, field: string, value: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const validateParticipants = () => {
    return participants.every(participant => 
      participant.fullName.trim() && 
      participant.organisation.trim() && 
      participant.email.trim() && 
      participant.phone.trim() && 
      participant.profession
    );
  };

  // Bulk registration function
  const handleBulkRegistration = async () => {
    if (!validateForm() || !validateParticipants()) {
      alert('Please fill in all required fields for all participants (name, organisation, email, phone, profession)');
        return;
      }
      
    setIsSubmitting(true);

    try {
      const results = [];
      
      for (const participant of participants) {
        try {
          // Create or find enrollee for each participant
          const enrolleeData = {
            name: participant.fullName, // Try 'name' instead of 'full_name'
            full_name: participant.fullName, // Keep both for compatibility
            organisation: participant.organisation,
            email: participant.email, // Use the actual email provided by participant
            company_id: "0380"
          };

          let enrolleeId: string;
          
          // Get all enrollees and filter manually to debug the search
          const allEnrolleesResponse = await fetch(`${baseUrl}/api/enrollees?company_id=0380`);
          if (allEnrolleesResponse.ok) {
            const allEnrollees = await allEnrolleesResponse.json();
            
            // Manually search for the email
            const existingEnrollee = allEnrollees.enrollees?.find((e: any) => 
              e.email && e.email.toLowerCase() === participant.email.toLowerCase()
            );
            
            if (existingEnrollee) {
              enrolleeId = existingEnrollee.id;
            } else {
              // No existing enrollee found, try to create one
              const createResponse = await fetch(`${baseUrl}/api/enrollees`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(enrolleeData),
              });
              
              if (createResponse.ok) {
                const enrolleeResult = await createResponse.json();
                enrolleeId = enrolleeResult.enrollee_id || enrolleeResult.id;
              } else {
                const errorData = await createResponse.json();
                throw new Error(`Failed to create enrollee for ${participant.fullName}: ${errorData.error || createResponse.statusText}`);
              }
            }
          } else {
            const errorData = await allEnrolleesResponse.json();
            throw new Error(`Failed to fetch enrollees for ${participant.fullName}: ${errorData.error || allEnrolleesResponse.statusText}`);
          }

          // Register participant for event
          const participantData = {
            reference_number: generateReferenceNumber(),
            enrollee_id: enrolleeId,
            event_id: getEventIdFromProgram(formData.selectedPrograms[0]), // Use first selected program for bulk
            fee_id: generateUUID(),
            payment_date: new Date().toISOString(),
            payment_status_id: 1,
            amount_paid: 0,
            payment_mode: 'Free Registration',
            receipt_number: generateReceiptNumber(),
            is_attended: false,
            company_id: "0380",
            remarks: `Registered via public form for ${getProgramTitle(formData.selectedPrograms[0])}`
          };

          const response = await fetch(`${baseUrl}/api/participants`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(participantData),
          });

          if (response.ok) {
            results.push({ participant: participant.fullName, status: 'success' });
      } else {
            results.push({ participant: participant.fullName, status: 'failed', error: `HTTP ${response.status}` });
          }
        } catch (error) {
          results.push({ participant: participant.fullName, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // Show results
      const successCount = results.filter(r => r.status === 'success').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      
      if (failedCount === 0) {
        alert(`✅ All ${successCount} participants registered successfully!`);
        // Send WhatsApp confirmation for the main contact
        try {
          await sendWhatsAppConfirmation(formData, { apiUrl: baseUrl, companyId: "0380" });
        } catch (error) {
          console.error('WhatsApp confirmation failed:', error);
        }
        navigate('/thank-you');
      } else {
        alert(`⚠️ Registration Results:\n✅ ${successCount} successful\n❌ ${failedCount} failed\n\nCheck console for details.`);
        console.log('Bulk registration results:', results);
      }
    } catch (error) {
      console.error('Bulk registration error:', error);
      alert(`Bulk registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to send WhatsApp confirmation message
  const sendWhatsAppConfirmation = async (formData: any, companyData: any) => {
    try {
      if (!formData.phone) {
        throw new Error('Phone number is required for WhatsApp confirmation');
      }

      // Format phone number for WhatsApp API
      let phoneDigits = String(formData.phone).replace(/\D/g, "");
      if (!phoneDigits.startsWith("6")) phoneDigits = "6" + phoneDigits;
      const chatId = phoneDigits + "@c.us";

      // Get event details for all selected programs
      const selectedEventDetails = formData.selectedPrograms.map((slug: string) => getEventDetails(slug));
      
      // Prepare WhatsApp message for multiple events
      let whatsappMessage = `🎉 Your details are registered for ${formData.selectedPrograms.length} event(s):\n\n`;
      
      selectedEventDetails.forEach((event: any, index: number) => {
        whatsappMessage += `📢 ${event.title}\n📍 ${event.venue}\n🗓 ${event.date}, ${event.time}\n\n`;
      });
      
      whatsappMessage += `Thank you for registering for FUTUREX.AI 2025! We look forward to seeing you at the events.\n\nBest regards,\nCo9P AI Chatbot`;

      console.log('Sending WhatsApp confirmation to:', chatId);
      console.log('Message:', whatsappMessage);

      // Send WhatsApp message using the API
      const response = await fetch(`${companyData.apiUrl}/api/v2/messages/text/${companyData.companyId}/${chatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          message: whatsappMessage,
          phoneIndex: 0,
          userName: 'Public Registration Form'
      }),
    });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WhatsApp API failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('WhatsApp confirmation sent successfully:', result);

    } catch (error) {
      console.error('Error sending WhatsApp confirmation:', error);
      throw error;
    }
  };

  // Function to send admin notification when registration fails
  const sendAdminNotification = async (formData: any, errorMessage: string, companyData: any) => {
    try {
      // Admin phone number
      const adminPhone = "60127332108";
      const adminChatId = adminPhone + "@c.us";

      // Prepare admin notification message
      const adminMessage = `🚨 REGISTRATION FAILURE ALERT 🚨\n\n` +
        `A user registration has failed with the following details:\n\n` +
        `👤 User Name: ${formData.fullName || 'Not provided'}\n` +
        `📱 User Phone: ${formData.phone || 'Not provided'}\n` +
        `🏢 Organisation: ${formData.organisation || 'Not provided'}\n` +
        `📧 Email: ${formData.email || 'Not provided'}\n` +
        `💼 Profession: ${formData.profession || 'Not provided'}\n` +
        `📋 Selected Programs: ${formData.selectedPrograms.join(', ') || 'None'}\n\n` +
        `❌ Error: ${errorMessage}\n\n` +
        `⏰ Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}\n\n` +
        `Please investigate and assist the user if needed.`;

      console.log('Sending admin notification to:', adminChatId);
      console.log('Admin message:', adminMessage);

      // Send WhatsApp message to admin using the API
      const response = await fetch(`${companyData.apiUrl}/api/v2/messages/text/${companyData.companyId}/${adminChatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: adminMessage,
          phoneIndex: 0,
          userName: 'Public Registration Form - Admin Alert'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send admin notification:', errorText);
      } else {
        const result = await response.json();
        console.log('Admin notification sent successfully:', result);
      }

    } catch (error) {
      console.error('Error sending admin notification:', error);
      // Don't throw error here as it's not critical for the main flow
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log(`🔄 Input change - Field: ${field}, Value: "${value}"`);
    console.log(`🔄 Input change - Value type: ${typeof value}, Length: ${value.length}`);
    
    // Special debugging for email field
    if (field === 'email') {
      console.log('🔍 EMAIL INPUT DEBUG:');
      console.log('Raw email value:', value);
      console.log('Email after trim:', value.trim());
      console.log('Email contains spaces:', value.includes(' '));
      console.log('Email contains special chars:', /[^\w@.-]/.test(value));
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle multiple program selection
  const handleProgramSelection = (programSlug: string, isChecked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedPrograms: isChecked 
        ? [...prev.selectedPrograms, programSlug]
        : prev.selectedPrograms.filter(slug => slug !== programSlug)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
      }
      
    setIsSubmitting(true);
    clearErrors();
    
    try {
      console.log('Form data to submit:', formData);
      
      // Check for existing registrations first
      const eventIds = formData.selectedPrograms.map(slug => getEventIdFromProgram(slug));
      const existingCheck = await checkExistingRegistration(formData.phone, eventIds);
      
      if (existingCheck.isRegistered) {
        const errorMessage = `User already registered for events: ${existingCheck.events.join(', ')}`;
        
        // Send admin notification
        await sendAdminNotification(formData, errorMessage, { apiUrl: baseUrl, companyId: "0380" });
        
        showErrorModal([
          '❌ Registration Failed',
          `You are already registered for the following events:`,
          ...existingCheck.events.map((event: string) => `   • ${event}`),
          '',
          'If you need to make changes to your registration, please contact our support team via WhatsApp.',
          'Click the WhatsApp buttons above to get help.'
        ]);
        setIsSubmitting(false);
        return;
      }
      
      // First, create or find the enrollee
      const enrolleeData = {
        name: formData.fullName, // Try 'name' instead of 'full_name'
        full_name: formData.fullName, // Keep both for compatibility
        organisation: formData.organisation,
        email: formData.email.trim() || `${formData.phone}@whatsapp.local`, // Use actual email if provided, otherwise phone-based
        designation: formData.profession,  // ← ADD THIS LINE
        mobile_number: formData.phone, // Try 'mobile_number' instead of 'phone'
        phone: formData.phone, // Keep both for compatibility
        company_id: "0380"
      };

      console.log('Creating/finding enrollee:', enrolleeData);
      console.log('Phone number being used:', formData.phone);
      console.log('Phone number type:', typeof formData.phone);
      console.log('Phone number length:', formData.phone.length);

      // Special debugging for the problematic phone number
      if (formData.phone === '60192692775') {
        console.log('🚨 DEBUGGING PROBLEMATIC PHONE NUMBER: 60192692775');
        console.log('Form data for this phone:', formData);
        console.log('Upcoming events:', upcomingEvents);
        console.log('Selected programs:', formData.selectedPrograms);
        console.log('Enrollee data being sent:', enrolleeData);
        
        // Validate phone number format
        const cleanPhone = formData.phone.replace(/\s/g, '');
        console.log('Phone validation for problematic number:', {
          original: formData.phone,
          cleaned: cleanPhone,
          length: cleanPhone.length,
          startsWith60: cleanPhone.startsWith('60'),
          isValid: /^[0-9]{10,15}$/.test(cleanPhone)
        });
      }

      // Try to find existing enrollee first by email or phone number
      console.log('Searching for existing enrollee with phone:', formData.phone, 'and email:', formData.email);
      
      let enrolleeId: string | undefined;
      
      // First, get all enrollees and filter manually to debug the search
      const allEnrolleesResponse = await fetch(`${baseUrl}/api/enrollees?company_id=0380`);
      if (allEnrolleesResponse.ok) {
        const allEnrollees = await allEnrolleesResponse.json();
        console.log('All enrollees response:', allEnrollees);
        console.log('Total enrollees found:', allEnrollees.enrollees?.length || 0);
        
        // Manually search for the enrollee by email first, then phone number
        // Manually search for the enrollee by email first, then phone number
const existingEnrollee = allEnrollees.enrollees?.find((e: any) => {
  // If user provided an email, search by email first (case-insensitive)
  if (formData.email.trim()) {
    if (e.email && e.email.toLowerCase() === formData.email.trim().toLowerCase()) {
      console.log('Found enrollee by email match:', e.email, '===', formData.email.trim());
      return true;
    }
  }
  
  // Also search by phone number as fallback
  if (e.phone && e.phone === formData.phone) {
    console.log('Found enrollee by phone match:', e.phone, '===', formData.phone);
    return true;
  }
  
  if (e.mobile_number && e.mobile_number === formData.phone) {
    console.log('Found enrollee by mobile_number match:', e.mobile_number, '===', formData.phone);
    return true;
  }
  
  return false;
});
        
        console.log('Searching for enrollee with phone:', formData.phone);
        console.log('Searching for enrollee with email:', formData.email);
        console.log('Existing enrollee found:', existingEnrollee);
        
        if (existingEnrollee) {
          // Use the existing enrollee's ID
          enrolleeId = existingEnrollee.id || existingEnrollee.enrollee_id || existingEnrollee.user_id;
          console.log('Found existing enrollee manually:', existingEnrollee);
          console.log('Using existing enrollee ID:', enrolleeId);
          
          // Update the enrollee's information if needed (e.g., phone number, organisation, etc.)
          if (existingEnrollee.phone !== formData.phone || 
              existingEnrollee.mobile_number !== formData.phone ||
              existingEnrollee.organisation !== formData.organisation ||
              existingEnrollee.designation !== formData.profession) {
            
            console.log('Updating existing enrollee information...');
            const updateData = {
              ...enrolleeData,
              id: enrolleeId // Include the ID for the update
            };
            
            try {
              const updateResponse = await fetch(`${baseUrl}/api/enrollees/${enrolleeId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
              });
              
              if (updateResponse.ok) {
                console.log('Enrollee information updated successfully');
              } else {
                console.warn('Failed to update enrollee information, but continuing with registration');
              }
            } catch (updateError) {
              console.warn('Error updating enrollee information, but continuing with registration:', updateError);
            }
          }
        } else {
          console.log('No existing enrollee found, creating new one...');
          console.log('Enrollee data to create:', enrolleeData);
          
          // Retry mechanism for enrollee creation
          let createResponse: Response | undefined;
          let enrolleeResult: any;
          let retryCount = 0;
          const maxRetries = 2;
          
          while (retryCount <= maxRetries) {
            try {
              console.log(`Attempting enrollee creation (attempt ${retryCount + 1}/${maxRetries + 1})`);
              
              createResponse = await fetch(`${baseUrl}/api/enrollees`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(enrolleeData),
              });
              
              if (createResponse.ok) {
                enrolleeResult = await createResponse.json();
                console.log(`Enrollee creation successful on attempt ${retryCount + 1}`);
                break;
              } else {
                const errorData = await createResponse.json();
                console.error(`Enrollee creation failed on attempt ${retryCount + 1}:`, errorData);
                
                // If we get a 409 (conflict) error, it means the enrollee already exists
                // Let's try to find them again
                if (createResponse.status === 409) {
                  console.log('Got 409 error, trying to find existing enrollee again...');
                  
                  // Re-fetch enrollees and search again
                  const retryEnrolleesResponse = await fetch(`${baseUrl}/api/enrollees?company_id=0380`);
                  if (retryEnrolleesResponse.ok) {
                    const retryEnrollees = await retryEnrolleesResponse.json();
                    const retryExistingEnrollee = retryEnrollees.enrollees?.find((e: any) => {
                      if (formData.email.trim()) {
                        if (e.email && e.email.toLowerCase() === formData.email.trim().toLowerCase()) {
                          return true;
                        }
                      }
                      if (e.phone && e.phone === formData.phone) {
                        return true;
                      }
                      if (e.mobile_number && e.mobile_number === formData.phone) {
                        return true;
                      }
                      return false;
                    });
                    
                    if (retryExistingEnrollee) {
                      enrolleeId = retryExistingEnrollee.id || retryExistingEnrollee.enrollee_id || retryExistingEnrollee.user_id;
                      console.log('Found existing enrollee after 409 error:', retryExistingEnrollee);
                      console.log('Using existing enrollee ID:', enrolleeId);
                      break; // Exit the retry loop
                    }
                  }
                }
                
                if (retryCount === maxRetries) {
                  // Final attempt failed, throw error
                  let errorMessage = '';
                  if (createResponse.status === 409) {
                    errorMessage = 'An account with this email already exists. Please use a different email or contact support if this is your account.';
                  } else if (createResponse.status === 400) {
                    errorMessage = 'Invalid data provided. Please check your information and try again.';
                  } else if (createResponse.status === 500) {
                    errorMessage = 'Server error occurred while creating your account. Please try again later or contact support.';
                  } else {
                    errorMessage = `Failed to create account: ${errorData.error || createResponse.statusText}`;
                  }
                  
                  // Send admin notification for enrollee creation failure
                  await sendAdminNotification(formData, `Enrollee creation failed: ${errorMessage}`, { apiUrl: baseUrl, companyId: "0380" });
                  
                  throw new Error(errorMessage);
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                retryCount++;
              }
            } catch (error) {
              if (retryCount === maxRetries) {
                throw error;
              }
              console.log(`Enrollee creation attempt ${retryCount + 1} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              retryCount++;
            }
          }
          
          if (createResponse && createResponse.ok && enrolleeResult) {
            // Try different possible field names for the ID
            enrolleeId = enrolleeResult.enrollee_id || enrolleeResult.id || enrolleeResult.user_id || enrolleeResult.enrolleeId;
            
            // Special debugging for the problematic phone number
            if (formData.phone === '60192692775') {
              console.log('🚨 DEBUGGING ENROLLEE RESPONSE FOR PROBLEMATIC PHONE:');
              console.log('Full response object:', enrolleeResult);
              console.log('Response stringified:', JSON.stringify(enrolleeResult, null, 2));
              console.log('Attempted ID extraction:', {
                enrollee_id: enrolleeResult.enrollee_id,
                id: enrolleeResult.id,
                user_id: enrolleeResult.user_id,
                enrolleeId: enrolleeResult.enrolleeId,
                final_enrolleeId: enrolleeId
              });
            }
            
            if (!enrolleeId) {
              console.error('No enrollee ID found in response:', enrolleeResult);
              console.error('Response structure:', JSON.stringify(enrolleeResult, null, 2));
              
              // Try to extract ID from nested objects
              if (enrolleeResult.data && enrolleeResult.data.id) {
                enrolleeId = enrolleeResult.data.id;
                console.log('Found ID in data.id:', enrolleeId);
              } else if (enrolleeResult.result && enrolleeResult.result.id) {
                enrolleeId = enrolleeResult.result.id;
                console.log('Found ID in result.id:', enrolleeId);
              } else if (enrolleeResult.enrollee && enrolleeResult.enrollee.id) {
                enrolleeId = enrolleeResult.enrollee.id;
                console.log('Found ID in enrollee.id:', enrolleeId);
              }
              
              if (!enrolleeId) {
                throw new Error(`Failed to get enrollee ID from server response. Server returned: ${JSON.stringify(enrolleeResult)}`);
              }
            }
            
            console.log('Enrollee created successfully with ID:', enrolleeId);
          } else if (enrolleeId) {
            // We found an existing enrollee after the 409 error
            console.log('Using existing enrollee ID after 409 error:', enrolleeId);
          } else {
            // Handle case where enrollee creation failed after all retries
            if (!createResponse) {
              const errorMessage = 'Failed to create enrollee: No response received from server';
              await sendAdminNotification(formData, errorMessage, { apiUrl: baseUrl, companyId: "0380" });
              throw new Error(errorMessage);
            }
            
            const errorData = await createResponse?.json();
            console.error('Failed to create enrollee:', errorData);
            
            // Provide specific error messages based on the error
            let errorMessage = '';
            if (createResponse?.status === 409) {
              errorMessage = 'An account with this email already exists. Please use a different email or contact support if this is your account.';
            } else if (createResponse?.status === 400) {
              errorMessage = 'Invalid data provided. Please check your information and try again.';
            } else if (createResponse?.status === 500) {
              errorMessage = 'Server error occurred while creating your account. Please try again later or contact support.';
            } else {
              errorMessage = `Failed to create account: ${errorData?.error || createResponse?.statusText}`;
            }
            
            // Send admin notification for enrollee creation failure
            await sendAdminNotification(formData, `Enrollee creation failed: ${errorMessage}`, { apiUrl: baseUrl, companyId: "0380" });
            
            throw new Error(errorMessage);
          }
        }
      } else {
        const errorData = await allEnrolleesResponse.json();
        console.error('Failed to fetch all enrollees:', errorData);
        
        let errorMessage = '';
        if (allEnrolleesResponse.status === 503) {
          errorMessage = 'Service temporarily unavailable. Please try again in a few minutes.';
        } else if (allEnrolleesResponse.status === 500) {
          errorMessage = 'Server error occurred. Please try again later or contact support.';
        } else {
          errorMessage = `Failed to verify account: ${errorData.error || allEnrolleesResponse.statusText}`;
        }
        
        // Send admin notification for enrollee fetch failure
        await sendAdminNotification(formData, `Failed to fetch enrollees: ${errorMessage}`, { apiUrl: baseUrl, companyId: "0380" });
        
        throw new Error(errorMessage);
      }

      // Register for all selected programs
      const results = [];
      
      // Ensure we have a valid enrollee ID before proceeding
      if (!enrolleeId) {
        const errorMessage = 'Failed to get or create enrollee. Please try again or contact support.';
        await sendAdminNotification(formData, errorMessage, { apiUrl: baseUrl, companyId: "0380" });
        throw new Error(errorMessage);
      }
      
      console.log('Proceeding with registration using enrollee ID:', enrolleeId);
      
      for (const programSlug of formData.selectedPrograms) {
        try {
          // Get event ID and validate it exists
          const eventId = getEventIdFromProgram(programSlug);
          console.log(`Event ID for ${programSlug}:`, eventId);
          
          // Validate event ID exists
          if (!eventId) {
            const errorMessage = `Event ID not found for program: ${programSlug}`;
            await sendAdminNotification(formData, errorMessage, { apiUrl: baseUrl, companyId: "0380" });
            throw new Error(`Event not found for ${getProgramTitle(programSlug)}. Please contact support.`);
          }
          
          // Special debugging for the problematic phone number
          if (formData.phone === '60192692775') {
            console.log('🚨 DEBUGGING EVENT LOOKUP FOR PROBLEMATIC PHONE:');
            console.log('Program slug:', programSlug);
            console.log('Event ID found:', eventId);
            console.log('Event ID type:', typeof eventId);
            console.log('Event ID length:', eventId ? eventId.length : 'undefined');
          }
          
          // Validate enrollee ID
          if (!enrolleeId) {
            const errorMessage = 'Enrollee ID is missing. Please try again.';
            await sendAdminNotification(formData, errorMessage, { apiUrl: baseUrl, companyId: "0380" });
            throw new Error(errorMessage);
          }
          
          // Prepare participant data for each event
          const participantData = {
            reference_number: generateReferenceNumber(),
            enrollee_id: enrolleeId,
            event_id: eventId,
            fee_id: generateUUID(),
            payment_date: new Date().toISOString(),
            payment_status_id: 1,
            amount_paid: 0,
            payment_mode: 'Free Registration',
            receipt_number: generateReceiptNumber(),
            is_attended: false,
            company_id: "0380",
            remarks: `Registered via public form for ${getProgramTitle(programSlug)}`
          };
          
          console.log(`Participant data for ${programSlug}:`, participantData);
          
          // Special debugging for the problematic phone number
          if (formData.phone === '60192692775') {
            console.log('🚨 DEBUGGING PARTICIPANT DATA FOR PROBLEMATIC PHONE:');
            console.log('Full participant data:', participantData);
            console.log('enrollee_id:', participantData.enrollee_id);
            console.log('event_id:', participantData.event_id);
            console.log('company_id:', participantData.company_id);
            console.log('All required fields present:', {
              enrollee_id: !!participantData.enrollee_id,
              event_id: !!participantData.event_id,
              company_id: !!participantData.company_id
            });
          }
          
          console.log(`Registering for program: ${programSlug}`);
          
          // Submit to Neon database via API
          const response = await fetch(`${baseUrl}/api/participants`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(participantData),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`API Error for ${programSlug}:`, errorData);
            
            // Provide specific error messages based on the error
            let errorMessage = '';
            if (response.status === 409) {
              errorMessage = `You are already registered for ${getProgramTitle(programSlug)}.`;
            } else if (response.status === 400) {
              errorMessage = `Invalid registration data for ${getProgramTitle(programSlug)}. Please check your information.`;
            } else if (response.status === 404) {
              errorMessage = `Event ${getProgramTitle(programSlug)} not found or no longer available.`;
            } else if (response.status === 422) {
              // Check if it's a validation error
              if (errorData.error && errorData.error.includes('required')) {
                errorMessage = `Missing required data for ${getProgramTitle(programSlug)}. Please contact support.`;
              } else {
                errorMessage = `Event ${getProgramTitle(programSlug)} is full or registration is closed.`;
              }
            } else if (response.status === 500) {
              errorMessage = `Server error occurred while registering for ${getProgramTitle(programSlug)}. Please try again.`;
            } else {
              errorMessage = errorData.error || `Failed to register for ${getProgramTitle(programSlug)}: ${response.status}`;
            }
            
            // Send admin notification for participant registration failure
            await sendAdminNotification(formData, `Failed to register for ${getProgramTitle(programSlug)}: ${errorMessage}`, { apiUrl: baseUrl, companyId: "0380" });
            
            throw new Error(errorMessage);
          }
          
          const result = await response.json();
          results.push({ program: programSlug, status: 'success', result });
          console.log(`Registration successful for ${programSlug}:`, result);
        } catch (error) {
          results.push({ program: programSlug, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
          console.error(`Failed to register for ${programSlug}:`, error);
        }
      }
      
      // Check if all registrations were successful
      const successCount = results.filter(r => r.status === 'success').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      
      if (failedCount === 0) {
        console.log('All registrations successful:', results);
        
        // Send WhatsApp confirmation message
        try {
          await sendWhatsAppConfirmation(formData, { apiUrl: baseUrl, companyId: "0380" });
          console.log('WhatsApp confirmation sent successfully');
        } catch (whatsappError) {
          console.error('Error sending WhatsApp confirmation:', whatsappError);
          // Don't fail the registration if WhatsApp fails
        }
        
        // Navigate to thank you page
        navigate('/thank-you');
      } else {
        // Some registrations failed - show detailed error
        const failedPrograms = results.filter(r => r.status === 'failed');
        const errorMessages = [
          '❌ Registration Partially Failed',
          '',
          `✅ Successfully registered for ${successCount} event(s)`,
          `❌ Failed to register for ${failedCount} event(s):`,
          '',
          ...failedPrograms.map(r => `• ${getProgramTitle(r.program)}: ${r.error}`),
          '',
          'Please try registering for the failed events again, or contact support via WhatsApp if the problem persists.',
          'Click the WhatsApp buttons above to get help.'
        ];
        
        // Send admin notification for partial failure
        const partialFailureMessage = `Partial registration failure: ${failedCount} out of ${formData.selectedPrograms.length} events failed. Failed events: ${failedPrograms.map(r => getProgramTitle(r.program)).join(', ')}`;
        await sendAdminNotification(formData, partialFailureMessage, { apiUrl: baseUrl, companyId: "0380" });
        
        showErrorModal(errorMessages);
        console.error('Some registrations failed:', results);
      }
      


    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'An unexpected error occurred during registration.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error: Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again or contact support if the problem persists.';
        } else if (error.message.includes('already exists')) {
          errorMessage = error.message;
        } else if (error.message.includes('already registered')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }
      
      // Send admin notification for the error
      await sendAdminNotification(formData, errorMessage, { apiUrl: baseUrl, companyId: "0380" });
      
      showErrorModal([
        '❌ Registration Failed',
        '',
        errorMessage,
        '',
        'If you continue to experience issues, please contact our support team via WhatsApp:',
        'Click the WhatsApp buttons above to get help.',
        'Or call: +60 3-1234 5678'
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-4">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Header */}
                  <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              FUTUREX.AI 2025
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Event Registration Form
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-2 max-w-xl mx-auto">
              Join us for cutting-edge AI and robotics events. Register now to secure your spot.
            </p>
          </div>

          {/* Help Button */}
          <button
            onClick={() => {
              setErrors([
                "Need help with registration?",
                "• Make sure all required fields are filled",
                "• Check that your email format is correct (e.g., user@example.com)",
                "• Ensure your phone number includes country code (e.g., 60123456789)",
                "• Select at least one program to register for",
                "• If you're already registered, you'll see a message",
                "• For technical issues, contact our support team via WhatsApp below"
              ]);
              setShowErrors(true);
            }}
            className="inline-flex items-center mt-3 px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Need Help?
          </button>

        {/* Phone Number Display */}
        {formData.phone && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-green-800 text-sm">Registration for +{formData.phone}</div>
                <div className="text-green-600 text-xs">WhatsApp confirmation will be sent to this number</div>
              </div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6">
            
            {/* Program Selection */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-2 mb-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Programs To Register <span className="text-red-500">*</span>
                  </label>
                  {formData.selectedPrograms.length > 0 && (
                    <div className="mb-2 p-2 bg-blue-100 border border-blue-200 rounded text-xs text-blue-800">
                      ✅ {formData.selectedPrograms.length} event{formData.selectedPrograms.length > 1 ? 's' : ''} selected
                    </div>
                  )}
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <label key={event.id} className="flex items-start p-2 border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                          <input
                            type="checkbox"
                            name="selectedPrograms"
                            value={event.slug}
                            checked={formData.selectedPrograms.includes(event.slug)}
                            onChange={(e) => handleProgramSelection(event.slug, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                          />
                          <div className="ml-2 flex-1">
                            <div className="font-medium text-gray-900 text-xs">
                              {new Date(event.start_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-gray-700 text-xs mt-0.5">
                              {event.name}
                            </div>
                            <div className="text-gray-500 text-xs mt-0.5">
                              {event.start_time} - {event.end_time} • {event.location}
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="p-3 text-center bg-gray-50 rounded border border-gray-200">
                        <p className="text-gray-600 text-xs font-medium">No upcoming events available</p>
                        <p className="text-gray-500 text-xs mt-1">Check back later for new events!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-2 mb-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-600">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none text-sm"
                    rows={2}
                    placeholder="Type your answer here..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.fullName.length > 0 ? `${formData.fullName.length} characters` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Organisation/Company */}
            <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-start space-x-2 mb-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Organisation/Company <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.organisation}
                    onChange={(e) => handleInputChange('organisation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none text-sm"
                    rows={2}
                    placeholder="Type your answer here..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.organisation.length > 0 ? `${formData.organisation.length} characters` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <div className="flex items-start space-x-2 mb-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-xs font-bold text-orange-600">
                    4
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-none text-sm"
                    rows={2}
                    placeholder="Enter your email address..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {formData.email.length > 0 ? `${formData.email.length} characters` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Profession */}
            <div className="mb-4 p-3 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
              <div className="flex items-start space-x-2 mb-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-600">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Profession <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {professionOptions.map((option, index) => (
                      <label key={index} className="flex items-center p-2 border border-gray-200 rounded hover:border-teal-300 hover:bg-teal-50 transition-all duration-200 cursor-pointer">
                        <input
                          type="radio"
                          name="profession"
                          value={option}
                          checked={formData.profession === option}
                          onChange={(e) => handleInputChange('profession', e.target.value)}
                          className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <span className="ml-2 text-gray-900 text-xs">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Management */}
            <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-start space-x-2 mb-2">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">
                    6
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-900">
                      Additional Participants <span className="text-xs font-normal text-gray-600">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={addParticipant}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 rounded font-medium transition-all duration-200"
                    >
                      + Add
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {participants.map((participant, index) => (
                      <div key={participant.id} className="p-2 border border-purple-200 rounded bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-purple-800 text-xs">Participant {index + 1}</h4>
                          {participants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeParticipant(participant.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                            <input
                              type="text"
                              value={participant.fullName}
                              onChange={(e) => updateParticipant(participant.id, 'fullName', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                              placeholder="Enter full name"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Organisation *</label>
                            <input
                              type="text"
                              value={participant.organisation}
                              onChange={(e) => updateParticipant(participant.id, 'organisation', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                              placeholder="Enter organisation"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                            <input
                              type="email"
                              value={participant.email}
                              onChange={(e) => updateParticipant(participant.id, 'email', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                              placeholder="Enter email address"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Profession *</label>
                            <select
                              value={participant.profession}
                              onChange={(e) => updateParticipant(participant.id, 'profession', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                            >
                              <option value="">Select profession</option>
                              {professionOptions.map((option, idx) => (
                                <option key={idx} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                            <input
                              type="tel"
                              value={participant.phone}
                              onChange={(e) => updateParticipant(participant.id, 'phone', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                              placeholder="Enter phone number"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    <p>• Add multiple participants to register them all at once</p>
                    <p>• All participants will be registered for the same event</p>
                    <p>• WhatsApp confirmation will be sent to the main contact number</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="text-xs text-gray-500 text-center sm:text-left">
                  <span className="font-medium text-gray-700">{participants.length > 1 ? `${participants.length} participants` : '1 participant'} to register</span>
                </div>
                <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
                  {participants.length > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBulkRegistration}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-3 py-2 text-xs font-medium rounded shadow hover:shadow-md transition-all duration-200 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center space-x-1">
                          <LoadingIcon icon="three-dots" className="w-3 h-3" />
                          <span className="text-xs">Registering All...</span>
                        </div>
                      ) : (
                        `Register All (${participants.length})`
                      )}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded shadow hover:shadow-md transition-all duration-200 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-1">
                        <LoadingIcon icon="three-dots" className="w-3 h-3" />
                        <span className="text-xs">Submitting...</span>
                      </div>
                    ) : (
                      'Register Main Contact'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-gray-500 px-2">
          <p>Thank you for registering for FUTUREX.AI 2025! You will receive a confirmation shortly.</p>
        </div>

        {/* Error Modal */}
        {showErrors && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Registration Issues</h3>
                  <button
                    onClick={clearErrors}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-3 mb-6">
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      {error}
                    </div>
                  ))}
                </div>

                {/* WhatsApp Support Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
                    Need help with registration? Contact our support team via WhatsApp:
                  </p>
                  
                  <div className="space-y-2">
                    {/* Main Support WhatsApp */}
                    <a
                      href={`https://wa.me/601137206640?text=Hi, I'm having an issue with my registration for FUTUREX.AI 2025. My phone number is ${formData.phone || 'not provided'}. Can you help me complete my registration?`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors duration-200 shadow hover:shadow-md"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.86 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                      Chat with Support
                    </a>
                    
                
                  </div>
                  
                  <div className="mt-4 text-center">
                    <button
                      onClick={clearErrors}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                    >
                      Close & Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicRegisterForm; 