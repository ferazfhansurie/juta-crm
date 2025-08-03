import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from "@/components/Base/Button";
import LoadingIcon from '@/components/Base/LoadingIcon';
import axios from 'axios';

interface AttendanceEvent {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location: string;
  city: string;
  state_id: number;
  country_id: number;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface AttendanceRecord {
  eventId: string;
  eventSlug: string;
  phoneNumber: string;
  confirmedAt: string;
}

function PublicAttendanceForm() {
  const { eventTitle, phone } = useParams<{ eventTitle: string; phone: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AttendanceEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(phone || '');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [baseUrl] = useState<string>('https://juta-dev.ngrok.dev');

  useEffect(() => {
    if (eventTitle) {
      fetchEvent(eventTitle);
    }
  }, [eventTitle]);

  const fetchEvent = async (title: string) => {
    try {
      const response = await axios.get(`${baseUrl}/api/events/public/${title}`);
      if (response.data.success) {
        setEvent(response.data.event);
      } else {
        alert('Event not found or inactive');
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      alert('Failed to load event');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAttendance = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter your phone number');
      return;
    }

    if (!event) return;

    setIsSubmitting(true);
    try {
      const attendanceRecord: AttendanceRecord = {
        eventId: event.id,
        eventSlug: event.slug,
        phoneNumber: phoneNumber.trim(),
        confirmedAt: new Date().toISOString()
      };

      const response = await axios.post(`${baseUrl}/api/attendance-events/confirm`, attendanceRecord);
      
      if (response.data.success) {
        setIsConfirmed(true);
        setTimeout(() => {
          alert('Attendance confirmed successfully! Thank you for confirming.');
          navigate('/');
        }, 2000);
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error confirming attendance:', error);
      alert('Failed to confirm attendance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <LoadingIcon icon="three-dots" className="w-20 h-20" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600">The event you're looking for doesn't exist or is no longer active.</p>
        </div>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Attendance Confirmed!</h1>
            <p className="text-lg text-gray-600 mb-8">Thank you for confirming your attendance.</p>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{event.name}</h2>
            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-700">{new Date(event.start_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">{event.start_time} - {event.end_time}</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gray-700">{event.location}</span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Confirm Attendance</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Please confirm your attendance for the upcoming event
          </p>
        </div>

        {/* Event Details */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{event.name}</h2>
            {event.description && (
              <p className="text-gray-600 mb-6 leading-relaxed">{event.description}</p>
            )}
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-gray-900">{new Date(event.start_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-500">Time</p>
                  <p className="text-gray-900">{event.start_time} - {event.end_time}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-gray-900">{event.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Confirmation Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirm Your Attendance</h3>
              <p className="text-gray-600">Please enter your phone number to confirm attendance</p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="+60 12-345 6789"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={confirmAttendance}
                disabled={isSubmitting || !phoneNumber.trim()}
                variant="primary"
                className="w-full py-4 text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Confirming...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Confirm Attendance</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>We look forward to seeing you at the event!</p>
        </div>
      </div>
    </div>
  );
}

export default PublicAttendanceForm; 