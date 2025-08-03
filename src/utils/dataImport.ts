import axios from 'axios';

interface CSVEvent {
  name: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
}

interface CSVEnrollee {
  name: string;
  email: string;
  mobile_number: string;
  organisation?: string;
  designation?: string;
  submission_time?: string;
}

interface CSVParticipant {
  full_name: string;
  company: string;
  phone: string;
  email: string;
  program_name: string;
  program_date_time: string;
  rsvp_status: string;
  attendance_status: string;
  category?: string;
}

interface FeedbackResponse {
  timestamp: string;
  email: string;
  full_name: string;
  contact_number: string;
  profession: string;
  session_attended: string;
  overall_rating: string;
  trainer_effectiveness: string;
  content_relevance: string;
  expectations_met: string;
  venue_rating: string;
  interaction_rating: string;
  liked_most: string;
  improvements: string;
  future_topics: string;
  contact_agreement: string;
}

export class DataImportService {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://juta-dev.ngrok.dev') {
    this.baseUrl = baseUrl;
  }

  // Extract events from AI Horizon CSV
  private extractEventsFromAIHorizon(csvData: string): CSVEvent[] {
    const lines = csvData.split('\n');
    const events = new Map<string, CSVEvent>();
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length < 8) continue;
      
      const courseRegistration = columns[7]; // "Daftar Kursus" column
      if (!courseRegistration) continue;
      
      // Parse course registrations (can have multiple courses)
      const courses = courseRegistration.split(',');
      
      courses.forEach(course => {
        const trimmedCourse = course.trim();
        if (!trimmedCourse) return;
        
        // Extract date and name from course string
        // Format: "14 May – Generative AI for Media and Broadcasting"
        const match = trimmedCourse.match(/(\d+)\s+(\w+)\s*–\s*(.+)/);
        if (match) {
          const day = match[1];
          const month = match[2];
          const name = match[3].trim();
          
          // Validate the name - skip if it looks like an email or invalid data
          if (name.length < 3 || name.includes('@') || name.includes('siswa.ukm.edu.my')) {
            console.log(`⚠️  Skipping invalid course name: "${name}"`);
            return; // Use return instead of continue in forEach
          }
          
          const eventKey = `${day}-${month}-${name}`;
          
          if (!events.has(eventKey)) {
            events.set(eventKey, {
              name: name,
              date: `${day} ${month} 2025`,
              time: '09:00 - 17:00', // Default time
              location: 'Kuala Lumpur Convention Centre', // Default location
              description: `AI Horizon Program: ${name}`
            });
          }
        }
      });
    }
    
    return Array.from(events.values());
  }

  // Extract events from MTDC CSV
  private extractEventsFromMTDC(csvData: string): CSVEvent[] {
    const lines = csvData.split('\n');
    const events = new Map<string, CSVEvent>();
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length < 7) continue;
      
      const programName = columns[5]; // "Program Name" column
      const programDateTime = columns[6]; // "Program Date & Time" column
      
      if (!programName || !programDateTime) continue;
      
      // Clean the program name - remove any date patterns
      let cleanName = programName.trim();
      
      // Remove date patterns like "26/05/2025" from the name
      cleanName = cleanName.replace(/\d{2}\/\d{2}\/\d{4}/g, '').trim();
      // Remove time patterns like "09:00:00" from the name
      cleanName = cleanName.replace(/\d{2}:\d{2}:\d{2}/g, '').trim();
      // Remove extra spaces and dashes
      cleanName = cleanName.replace(/\s*-\s*$/, '').trim();
      
      if (!cleanName) continue;
      
      const eventKey = cleanName;
      
      if (!events.has(eventKey)) {
        // Parse date and time
        const dateTimeMatch = programDateTime.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        let date = programDateTime;
        let time = '09:00 - 17:00';
        
        if (dateTimeMatch) {
          const day = dateTimeMatch[1];
          const month = dateTimeMatch[2];
          const year = dateTimeMatch[3];
          const hour = dateTimeMatch[4];
          const minute = dateTimeMatch[5];
          
          date = `${day}/${month}/${year}`;
          time = `${hour}:${minute} - 17:00`;
        }
        
        events.set(eventKey, {
          name: cleanName,
          date: date,
          time: time,
          location: 'Kuala Lumpur Convention Centre',
          description: `MTDC Program: ${cleanName}`
        });
      }
    }
    
    return Array.from(events.values());
  }

  // Extract events from Feedback CSV
  private extractEventsFromFeedback(csvData: string): CSVEvent[] {
    const lines = csvData.split('\n');
    const events = new Map<string, CSVEvent>();
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length < 6) continue;
      
      const sessionAttended = columns[5]; // "Which session did you attend?" column
      
      if (!sessionAttended) continue;
      
      // Clean the session attended string
      const cleanSession = sessionAttended.trim();
      
      // Skip if it looks like an email or invalid data
      if (cleanSession.includes('@') || cleanSession.length < 5) {
        console.log(`⚠️  Skipping invalid session data: "${cleanSession}"`);
        continue;
      }
      
      // Parse date and name from session string
      // Format: "17 June - Smart Robotics in Action"
      const match = cleanSession.match(/(\d+)\s+(\w+)\s*–\s*(.+)/);
      if (match) {
        const day = match[1];
        const month = match[2];
        const name = match[3].trim();
        
                  // Additional validation for the name
          if (name.length < 3 || name.includes('@') || name.includes('siswa.ukm.edu.my')) {
            console.log(`⚠️  Skipping invalid event name: "${name}"`);
            continue;
          }
        
        const eventKey = `${day}-${month}-${name}`;
        
        if (!events.has(eventKey)) {
          events.set(eventKey, {
            name: name,
            date: `${day} ${month} 2025`,
            time: '09:00 - 17:00',
            location: 'Kuala Lumpur Convention Centre',
            description: `Roboconnect 2025: ${name}`
          });
        }
      }
    }
    
    return Array.from(events.values());
  }

  // Extract enrollees from AI Horizon CSV
  private extractEnrolleesFromAIHorizon(csvData: string): CSVEnrollee[] {
    const lines = csvData.split('\n');
    const enrollees: CSVEnrollee[] = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length < 8) continue;
      
      const name = columns[0]?.trim();
      const email = columns[2]?.trim();
      const mobileNumber = columns[3]?.trim();
      const organisation = columns[4]?.trim();
      const designation = columns[5]?.trim();
      const submissionTime = columns[6]?.trim();
      
      if (name && email && mobileNumber) {
        enrollees.push({
          name,
          email,
          mobile_number: mobileNumber,
          organisation: organisation || '',
          designation: designation || '',
          submission_time: submissionTime
        });
      }
    }
    
    return enrollees;
  }

  // Extract participants from MTDC CSV
  private extractParticipantsFromMTDC(csvData: string): CSVParticipant[] {
    const lines = csvData.split('\n');
    const participants: CSVParticipant[] = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length < 11) continue;
      
      const fullName = columns[1]?.trim();
      const company = columns[2]?.trim();
      const phone = columns[3]?.trim();
      const email = columns[4]?.trim();
      const programName = columns[5]?.trim();
      const programDateTime = columns[6]?.trim();
      const rsvpStatus = columns[7]?.trim();
      const attendanceStatus = columns[8]?.trim();
      const category = columns[10]?.trim();
      
      if (fullName && email && phone && programName) {
        participants.push({
          full_name: fullName,
          company: company || '',
          phone,
          email,
          program_name: programName,
          program_date_time: programDateTime || '',
          rsvp_status: rsvpStatus || '',
          attendance_status: attendanceStatus || '',
          category
        });
      }
    }
    
    return participants;
  }

  // Extract feedback responses
  private extractFeedbackResponses(csvData: string): FeedbackResponse[] {
    const lines = csvData.split('\n');
    const responses: FeedbackResponse[] = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length < 16) continue;
      
      responses.push({
        timestamp: columns[0]?.trim() || '',
        email: columns[1]?.trim() || '',
        full_name: columns[2]?.trim() || '',
        contact_number: columns[3]?.trim() || '',
        profession: columns[4]?.trim() || '',
        session_attended: columns[5]?.trim() || '',
        overall_rating: columns[6]?.trim() || '',
        trainer_effectiveness: columns[7]?.trim() || '',
        content_relevance: columns[8]?.trim() || '',
        expectations_met: columns[9]?.trim() || '',
        venue_rating: columns[10]?.trim() || '',
        interaction_rating: columns[11]?.trim() || '',
        liked_most: columns[12]?.trim() || '',
        improvements: columns[13]?.trim() || '',
        future_topics: columns[14]?.trim() || '',
        contact_agreement: columns[15]?.trim() || ''
      });
    }
    
    return responses;
  }

  // Create URL-friendly slug
  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Validate event name
  private isValidEventName(name: string): boolean {
    // Skip if name is too short
    if (name.length < 3) return false;
    
    // Skip if it contains email indicators
    if (name.includes('@')) return false;
    
    // Skip if it contains student email domains
    if (name.includes('siswa.ukm.edu.my')) return false;
    
    // Skip if it's just "Unspecified"
    if (name.toLowerCase() === 'unspecified') return false;
    
    // Skip if it looks like an email address pattern
    if (name.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) return false;
    
    return true;
  }

  // Import all data
  async importAllData(
    aiHorizonCSV: string,
    mtdcCSV: string,
    feedbackCSV: string,
    companyId: string,
    createdBy: string
  ) {
    try {
      console.log('Starting data import...');
      
      // Extract events from all sources
      const aiHorizonEvents = this.extractEventsFromAIHorizon(aiHorizonCSV);
      const mtdcEvents = this.extractEventsFromMTDC(mtdcCSV);
      const feedbackEvents = this.extractEventsFromFeedback(feedbackCSV);
      
      console.log('\n📊 DATA EXTRACTION SUMMARY:');
      console.log(`AI Horizon Events: ${aiHorizonEvents.length}`);
      console.log(`MTDC Events: ${mtdcEvents.length}`);
      console.log(`Feedback Events: ${feedbackEvents.length}`);
      console.log(`Total Events Before Filtering: ${aiHorizonEvents.length + mtdcEvents.length + feedbackEvents.length}`);
      
      // Combine all events
      const allEvents = [...aiHorizonEvents, ...mtdcEvents, ...feedbackEvents];
      const uniqueEvents = new Map<string, CSVEvent>();
      
      allEvents.forEach(event => {
        // Final validation - filter out invalid events
        if (this.isValidEventName(event.name)) {
          const key = event.name.toLowerCase();
          if (!uniqueEvents.has(key)) {
            uniqueEvents.set(key, event);
          }
        } else {
          console.log(`⚠️  Filtering out invalid event: "${event.name}"`);
        }
      });
      
 
      
      // Import events
      const importedEvents = await this.importEvents(Array.from(uniqueEvents.values()), companyId, createdBy);
      
      // Extract and import enrollees
      const aiHorizonEnrollees = this.extractEnrolleesFromAIHorizon(aiHorizonCSV);
      console.log(`📋 Enrollees extracted: ${aiHorizonEnrollees.length}`);
      const importedEnrollees = await this.importEnrollees(aiHorizonEnrollees, companyId);
      
      // Extract and import participants
      const mtdcParticipants = this.extractParticipantsFromMTDC(mtdcCSV);
      console.log(`👥 Participants extracted: ${mtdcParticipants.length}`);
      const importedParticipants = await this.importParticipants(mtdcParticipants, importedEvents, importedEnrollees, companyId);
      
      // Extract and import feedback responses
      const feedbackResponses = this.extractFeedbackResponses(feedbackCSV);
      console.log(`💬 Feedback responses extracted: ${feedbackResponses.length}`);
      const importedFeedback = await this.importFeedbackResponses(feedbackResponses, importedEvents, importedEnrollees, companyId);
      console.log(`Total Unique Events: ${uniqueEvents.size}`);
      console.log('Unique Events Found:');
      Array.from(uniqueEvents.values()).forEach((event, index) => {
        console.log(`  ${index + 1}. ${event.name} (${event.date})`);
      });
      console.log('');
      console.log('\n🎉 DATA IMPORT COMPLETED!');
      console.log('=========================');
      console.log(`📅 Events: ${importedEvents.length}`);
      console.log(`📋 Enrollees: ${importedEnrollees.length}`);
      console.log(`👥 Participants: ${importedParticipants.length}`);
      console.log(`💬 Feedback: ${importedFeedback.length}`);
      console.log('=========================');
      console.log('\n✅ All data has been successfully imported to the database!');
      console.log('');
      
      return {
        events: importedEvents.length,
        enrollees: importedEnrollees.length,
        participants: importedParticipants.length,
        feedback: importedFeedback.length
      };
      
    } catch (error) {
      console.error('Error during data import:', error);
      throw error;
    }
  }

  // Import events
  private async importEvents(events: CSVEvent[], companyId: string, createdBy: string) {
    const importedEvents = [];
    
    for (const event of events) {
      try {
        const slug = this.createSlug(event.name);
        
        const eventData = {
          name: event.name,
          slug: slug,
          description: event.description || event.name,
          short_description: event.name,
          start_date: this.parseDate(event.date),
          end_date: this.parseDate(event.date),
          start_time: event.time.split(' - ')[0] || '09:00',
          end_time: event.time.split(' - ')[1] || '17:00',
          location: event.location || 'Kuala Lumpur Convention Centre',
          city: 'Kuala Lumpur',
          state_id: 1,
          country_id: 1,
          company_id: companyId,
          created_by: createdBy
        };
        
        // Make actual API call
        const response = await axios.post(`${this.baseUrl}/api/events`, eventData);
        
        if (response.data.success) {
          importedEvents.push({
            id: response.data.eventId,
            name: event.name,
            slug: slug
          });
          console.log(`✅ Imported event: ${event.name} (ID: ${response.data.eventId})`);
        } else {
          console.error(`❌ Failed to import event ${event.name}:`, response.data.error);
        }
      } catch (error) {
        console.error(`❌ Error processing event ${event.name}:`, error);
      }
    }
    
    return importedEvents;
  }

  // Import enrollees
  private async importEnrollees(enrollees: CSVEnrollee[], companyId: string) {
    const importedEnrollees = [];
    
    for (const enrollee of enrollees) {
      try {
        const enrolleeData = {
          email: enrollee.email,
          name: enrollee.name,
          designation: enrollee.designation || '',
          organisation: enrollee.organisation || '',
          mobile_number: enrollee.mobile_number,
          company_id: companyId
        };
        
        // Make actual API call
        const response = await axios.post(`${this.baseUrl}/api/enrollees`, enrolleeData);
        
        if (response.data.success) {
          importedEnrollees.push({
            id: response.data.enrolleeId,
            email: enrollee.email,
            name: enrollee.name
          });
          console.log(`✅ Imported enrollee: ${enrollee.name} (ID: ${response.data.enrolleeId})`);
        } else {
          console.error(`❌ Failed to import enrollee ${enrollee.name}:`, response.data.error);
        }
      } catch (error) {
        console.error(`❌ Error processing enrollee ${enrollee.name}:`, error);
      }
    }
    
    return importedEnrollees;
  }

  // Import participants
  private async importParticipants(
    participants: CSVParticipant[],
    events: any[],
    enrollees: any[],
    companyId: string
  ) {
    const importedParticipants = [];
    
    for (const participant of participants) {
      try {
        // Find matching event
        const event = events.find(e => 
          e.name.toLowerCase().includes(participant.program_name.toLowerCase()) ||
          participant.program_name.toLowerCase().includes(e.name.toLowerCase())
        );
        
        // Find matching enrollee by email
        const enrollee = enrollees.find(e => e.email === participant.email);
        
        if (event && enrollee) {
          const participantData = {
            enrollee_id: enrollee.id,
            event_id: event.id,
            reference_number: `REF-${Date.now()}`,
            payment_status_id: participant.rsvp_status === 'Accepted' ? 'paid' : 'pending',
            is_attended: participant.attendance_status === 'Accepted',
            remarks: `Imported from CSV - RSVP: ${participant.rsvp_status}, Attendance: ${participant.attendance_status}`,
            company_id: companyId
          };
          
          // Make actual API call
          const response = await axios.post(`${this.baseUrl}/api/participants`, participantData);
          
          if (response.data.success) {
            importedParticipants.push({
              id: response.data.participantId,
              name: participant.full_name,
              event: event.name
            });
            console.log(`✅ Imported participant: ${participant.full_name} for ${event.name} (ID: ${response.data.participantId})`);
          } else {
            console.error(`❌ Failed to import participant ${participant.full_name}:`, response.data.error);
          }
        } else {
          console.log(`⚠️  Skipping participant ${participant.full_name} - no matching event or enrollee found`);
          console.log(`   Event match: ${event ? 'Yes' : 'No'}, Enrollee match: ${enrollee ? 'Yes' : 'No'}`);
        }
      } catch (error) {
        console.error(`❌ Error processing participant ${participant.full_name}:`, error);
      }
    }
    
    return importedParticipants;
  }

  // Import feedback responses
  private async importFeedbackResponses(
    responses: FeedbackResponse[],
    events: any[],
    enrollees: any[],
    companyId: string
  ) {
    const importedFeedback = [];
    
    for (const response of responses) {
      try {
        // Find matching event
        const event = events.find(e => 
          e.name.toLowerCase().includes(response.session_attended.toLowerCase()) ||
          response.session_attended.toLowerCase().includes(e.name.toLowerCase())
        );
        
        // Find matching enrollee by email
        const enrollee = enrollees.find(e => e.email === response.email);
        
        if (event && enrollee) {
          // Create feedback form response
          const feedbackData = {
            formId: event.id,
            formTitle: event.slug,
            phoneNumber: response.contact_number,
            responses: [
              {
                fieldId: 'overall_rating',
                question: 'How would you rate overall session?',
                answer: response.overall_rating
              },
              {
                fieldId: 'trainer_effectiveness',
                question: 'How effective was the trainer delivering the content?',
                answer: response.trainer_effectiveness
              },
              {
                fieldId: 'content_relevance',
                question: 'How relevant was the content to your interests or role?',
                answer: response.content_relevance
              },
              {
                fieldId: 'expectations_met',
                question: 'Does the training meet your expectations?',
                answer: response.expectations_met
              },
              {
                fieldId: 'venue_rating',
                question: 'How would you rate the event venue?',
                answer: response.venue_rating
              },
              {
                fieldId: 'interaction_rating',
                question: 'How satisfied were you with the opportunities for interaction?',
                answer: response.interaction_rating
              },
              {
                fieldId: 'liked_most',
                question: 'What did you like most about the session?',
                answer: response.liked_most
              },
              {
                fieldId: 'improvements',
                question: 'What can we improve for future sessions?',
                answer: response.improvements
              },
              {
                fieldId: 'future_topics',
                question: 'Any suggestions for future topics or speakers?',
                answer: response.future_topics
              }
            ],
            submittedAt: response.timestamp
          };
          
          // Make actual API call
          const apiResponse = await axios.post(`${this.baseUrl}/api/feedback-forms/submit`, feedbackData);
          
          if (apiResponse.data.success) {
            importedFeedback.push({
              name: response.full_name,
              event: event.name,
              rating: response.overall_rating
            });
            console.log(`✅ Imported feedback from: ${response.full_name} for ${event.name} (ID: ${apiResponse.data.submissionId})`);
          } else {
            console.error(`❌ Failed to import feedback from ${response.full_name}:`, apiResponse.data.error);
          }
        } else {
          console.log(`⚠️  Skipping feedback from ${response.full_name} - no matching event or enrollee found`);
          console.log(`   Event match: ${event ? 'Yes' : 'No'}, Enrollee match: ${enrollee ? 'Yes' : 'No'}`);
        }
      } catch (error) {
        console.error(`❌ Error processing feedback from ${response.full_name}:`, error);
      }
    }
    
    return importedFeedback;
  }

  // Parse date string to YYYY-MM-DD format
  private parseDate(dateStr: string): string {
    try {
      // Handle different date formats
      if (dateStr.includes('/')) {
        // Format: DD/MM/YYYY
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (dateStr.includes(' ')) {
        // Format: "14 May 2025"
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      } else {
        // Default to current date
        return new Date().toISOString().split('T')[0];
      }
    } catch (error) {
      console.error(`Error parsing date: ${dateStr}`, error);
      return new Date().toISOString().split('T')[0];
    }
  }
}

export default DataImportService; 