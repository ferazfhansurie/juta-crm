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
  const [formData, setFormData] = useState({
    selectedPrograms: [] as string[], // Changed to array for multiple events
    fullName: '',
    organisation: '',
    email: '',
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
      profession: ''
    }
  ]);

  // Extract phone number from URL parameter
  useEffect(() => {
    if (phone) {
      // Remove any non-digit characters and ensure it starts with 60
      let phoneDigits = phone.replace(/\D/g, "");
      if (!phoneDigits.startsWith("60")) {
        phoneDigits = "60" + phoneDigits;
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
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
  
  console.log('=== FILTERING EVENTS ===');
  console.log('Today (local):', today.toISOString());
  console.log('Today (UTC):', new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()).toISOString());
  
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
    
    // Parse the event date
    const eventDate = new Date(event.start_date);
    
    // Compare dates by converting both to YYYY-MM-DD strings (ignoring time)
    const eventDateStr = eventDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`Event: ${event.name}`);
    console.log(`  Event date: ${event.start_date}`);
    console.log(`  Event date string: ${eventDateStr}`);
    console.log(`  Today string: ${todayStr}`);
    console.log(`  Is upcoming: ${eventDateStr >= todayStr}`);
    
    return eventDateStr >= todayStr;
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

  // Helper function to get event ID from program selection
  const getEventIdFromProgram = (programValue: string) => {
    // Find the event by slug
    const event = upcomingEvents.find(e => e.slug === programValue);
    
    if (!event) {
      console.error(`No event found for program: ${programValue}`);
      throw new Error(`Invalid program selection: ${programValue}`);
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
      profession: ''
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
      participant.profession
    );
  };

  // Bulk registration function
  const handleBulkRegistration = async () => {
    if (!validateForm() || !validateParticipants()) {
      alert('Please fill in all required fields for all participants');
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
            email: participant.email,
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

  const handleInputChange = (field: string, value: string) => {
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

  const validateForm = () => {
    // Check if there are any upcoming events available
    if (upcomingEvents.length === 0) {
      alert('No upcoming events are available for registration');
      return false;
    }
    
    if (formData.selectedPrograms.length === 0) {
      alert('Please select at least one program to register for');
      return false;
    }
    if (!formData.fullName.trim()) {
      alert('Please enter your full name');
      return false;
    }
    if (!formData.organisation.trim()) {
      alert('Please enter your organisation/company');
      return false;
    }
    if (!formData.email.trim()) {
      alert('Please enter your email address');
      return false;
    }
    if (!formData.phone.trim()) {
      alert('Please enter your phone number for WhatsApp confirmation');
      return false;
    }
    if (!formData.profession) {
      alert('Please select your profession');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
      }
      
    setIsSubmitting(true);
    
    try {
      console.log('Form data to submit:', formData);
      
      // First, create or find the enrollee
      const enrolleeData = {
        name: formData.fullName, // Try 'name' instead of 'full_name'
        full_name: formData.fullName, // Keep both for compatibility
        organisation: formData.organisation,
        email: formData.email,
        designation: formData.profession,  // ← ADD THIS LINE
        mobile_number: formData.phone, // Try 'mobile_number' instead of 'phone'
        phone: formData.phone, // Keep both for compatibility
        company_id: "0380"
      };

      console.log('Creating/finding enrollee:', enrolleeData);

      // Try to find existing enrollee first by email
      console.log('Searching for existing enrollee with email:', formData.email);
      
      let enrolleeId: string;
      
      // First, get all enrollees and filter manually to debug the search
      const allEnrolleesResponse = await fetch(`${baseUrl}/api/enrollees?company_id=0380`);
      if (allEnrolleesResponse.ok) {
        const allEnrollees = await allEnrolleesResponse.json();
        console.log('All enrollees response:', allEnrollees);
        
        // Manually search for the email
        const existingEnrollee = allEnrollees.enrollees?.find((e: any) => 
          e.email && e.email.toLowerCase() === formData.email.toLowerCase()
        );
        
        if (existingEnrollee) {
          enrolleeId = existingEnrollee.id;
          console.log('Found existing enrollee manually:', existingEnrollee);
        } else {
          console.log('No existing enrollee found, creating new one...');
          console.log('Enrollee data to create:', enrolleeData);
          
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
            console.log('Enrollee created successfully:', enrolleeResult);
          } else {
            const errorData = await createResponse.json();
            console.error('Failed to create enrollee:', errorData);
            throw new Error(`Failed to create enrollee: ${errorData.error || createResponse.statusText}`);
          }
        }
      } else {
        const errorData = await allEnrolleesResponse.json();
        console.error('Failed to fetch all enrollees:', errorData);
        throw new Error(`Failed to fetch enrollees: ${errorData.error || allEnrolleesResponse.statusText}`);
      }

      // Register for all selected programs
      const results = [];
      
      for (const programSlug of formData.selectedPrograms) {
        try {
          // Prepare participant data for each event
          const participantData = {
            reference_number: generateReferenceNumber(),
            enrollee_id: enrolleeId,
            event_id: getEventIdFromProgram(programSlug),
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
            throw new Error(errorData.error || `Failed to register for ${getProgramTitle(programSlug)}: ${response.status}`);
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
        // Some registrations failed
        const errorMessage = `Registration Results:\n✅ ${successCount} successful\n❌ ${failedCount} failed\n\nFailed programs:\n${results.filter(r => r.status === 'failed').map(r => `- ${getProgramTitle(r.program)}`).join('\n')}`;
        alert(errorMessage);
        console.error('Some registrations failed:', results);
      }
      


    } catch (error) {
      console.error('Error submitting form:', error);
      alert(`Failed to submit registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-12">
        {/* Header */}
                  <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-blue-100 rounded-full mb-4 sm:mb-6 md:mb-8">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6">
              FUTUREX.AI 2025
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-2">
              Event Registration Form
            </p>
            <p className="text-sm sm:text-base text-gray-500 mt-3 sm:mt-4 max-w-2xl mx-auto">
              Join us for cutting-edge AI and robotics events. Register now to secure your spot and receive your certificate of attendance.
            </p>
          </div>

        {/* Phone Number Display */}
        {formData.phone && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            </div>
              <div>
                <div className="font-semibold text-green-800">Registration for Phone Number</div>
                <div className="text-green-700">+{formData.phone}</div>
                <div className="text-sm text-green-600">WhatsApp confirmation will be sent to this number</div>
          </div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8 lg:p-10">
            
            {/* Program Selection */}
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
              <div className="flex items-start space-x-2 sm:space-x-3 mb-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-blue-600">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                    Programs To Register <span className="text-red-500">*</span>
                  </label>
                  {formData.selectedPrograms.length > 0 && (
                    <div className="mb-3 p-2 bg-blue-100 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        ✅ {formData.selectedPrograms.length} event{formData.selectedPrograms.length > 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                  <div className="space-y-3 sm:space-y-4">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <label key={event.id} className="flex items-start p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                          <input
                            type="checkbox"
                            name="selectedPrograms"
                            value={event.slug}
                            checked={formData.selectedPrograms.includes(event.slug)}
                            onChange={(e) => handleProgramSelection(event.slug, e.target.checked)}
                            className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
                          />
                          <div className="ml-3 sm:ml-4 flex-1">
                            <div className="font-semibold text-gray-900 text-base sm:text-lg">
                              {new Date(event.start_date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div className="text-gray-700 text-sm sm:text-base mt-1">
                              {event.name}
                            </div>
                            <div className="text-gray-500 text-xs sm:text-sm mt-1">
                              {event.start_time} - {event.end_time} • {event.location}
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="p-4 sm:p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-600 text-base sm:text-lg font-medium">No upcoming events available</p>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1">All scheduled events have passed. Check back later for new events!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xl font-bold text-gray-900 mb-4">
                    Full Name (Please register with your full name for certificate of attendance) <span className="text-red-500">*</span>
            </label>
                  <textarea
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none text-base"
                    rows={3}
                    placeholder="Type your answer here..."
                  />
                  <div className="text-sm text-gray-500 mt-2">
                    {formData.fullName.length > 0 ? `${formData.fullName.length} characters` : ''}
          </div>
                </div>
              </div>
            </div>

            {/* Organisation/Company */}
            <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold text-purple-600">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xl font-bold text-gray-900 mb-4">
                    Organisation/Company <span className="text-red-500">*</span>
                  </label>
            <textarea
                    value={formData.organisation}
                    onChange={(e) => handleInputChange('organisation', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none text-base"
                    rows={3}
              placeholder="Type your answer here..."
            />
                  <div className="text-sm text-gray-500 mt-2">
                    {formData.organisation.length > 0 ? `${formData.organisation.length} characters` : ''}
            </div>
          </div>
      </div>
            </div>

            {/* Email Address */}
            <div className="mb-8 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
              <div className="flex items-start space-x-3 mb-4">
                        <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-bold text-orange-600">
                    4
        </div>
      </div>
                <div className="flex-1">
                  <label className="block text-xl font-bold text-gray-900 mb-4">
                    Email Address <span className="text-red-500">*</span>
                          </label>
                  <textarea
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-none text-base"
                    rows={3}
                    placeholder="Type your answer here..."
                  />
                  <div className="text-sm text-gray-500 mt-2">
                    {formData.email.length > 0 ? `${formData.email.length} characters` : ''}
          </div>
                        </div>
          </div>
        </div>



            {/* Profession */}
            <div className="mb-8 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-sm font-bold text-teal-600">
                    5
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xl font-bold text-gray-900 mb-4">
                    Profession <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {professionOptions.map((option, index) => (
                      <label key={index} className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all duration-200 cursor-pointer">
                  <input
                          type="radio"
                          name="profession"
                          value={option}
                          checked={formData.profession === option}
                          onChange={(e) => handleInputChange('profession', e.target.value)}
                          className="w-5 h-5 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <span className="ml-4 text-gray-900 text-base font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Management */}
            <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="flex items-start space-x-3 mb-4">
                        <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold text-purple-600">
                    6
                          </div>
                        </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-xl font-bold text-gray-900">
                      Additional Participants <span className="text-sm font-normal text-gray-600">(Optional)</span>
                          </label>
                    <button
                      type="button"
                      onClick={addParticipant}
                      className="px-4 py-3 text-sm bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 rounded-lg font-medium transition-all duration-200"
                    >
                      + Add Participant
                    </button>
                          </div>
                  
                  <div className="space-y-4">
                    {participants.map((participant, index) => (
                      <div key={participant.id} className="p-4 border border-purple-200 rounded-lg bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-purple-800">Participant {index + 1}</h4>
                          {participants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeParticipant(participant.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input
                              type="text"
                              value={participant.fullName}
                              onChange={(e) => updateParticipant(participant.id, 'fullName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Enter full name"
                            />
                      </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation *</label>
                            <input
                              type="text"
                              value={participant.organisation}
                              onChange={(e) => updateParticipant(participant.id, 'organisation', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Enter organisation"
                            />
                    </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input
                              type="email"
                              value={participant.email}
                              onChange={(e) => updateParticipant(participant.id, 'email', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Enter email address"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Profession *</label>
                            <select
                              value={participant.profession}
                              onChange={(e) => updateParticipant(participant.id, 'profession', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="">Select profession</option>
                              {professionOptions.map((option, idx) => (
                                <option key={idx} value={option}>{option}</option>
                              ))}
                            </select>
                          </div>
                  </div>
                </div>
              ))}
            </div>

                  <div className="mt-4 text-sm text-gray-600">
                    <p>• Add multiple participants to register them all at once</p>
                    <p>• All participants will be registered for the same event</p>
                    <p>• WhatsApp confirmation will be sent to the main contact number</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="pt-6 sm:pt-8 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                  <span className="font-semibold text-gray-700">{participants.length > 1 ? `${participants.length} participants` : '1 participant'} to register</span>
                </div>
                <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:space-x-3">
                  {participants.length > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBulkRegistration}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                          <LoadingIcon icon="three-dots" className="w-4 h-4" />
                          <span className="text-sm sm:text-base">Registering All...</span>
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
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                        <LoadingIcon icon="three-dots" className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base">Submitting...</span>
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
        <div className="text-center mt-8 text-sm text-gray-500 px-2">
          <p>Thank you for registering for FUTUREX.AI 2025! You will receive a confirmation email shortly.</p>
        </div>
      </div>
    </div>
  );
}

export default PublicRegisterForm; 