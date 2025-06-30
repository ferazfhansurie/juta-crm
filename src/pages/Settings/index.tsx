import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import LoadingIcon from '@/components/Base/LoadingIcon';
import { Link } from 'react-router-dom';
import Button from "@/components/Base/Button";
import ThemeSwitcher from "@/components/ThemeSwitcher";

function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('09:00');
  const [groupId, setGroupId] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [phoneCount, setPhoneCount] = useState(0);
  const [role, setRole] = useState<string>('');
  const [aiDelay, setAiDelay] = useState<number>(0);
  const [aiAutoResponse, setAiAutoResponse] = useState(false);

  const firestore = getFirestore();

  useEffect(() => {
    fetchSettings();
  }, []);

// Assuming axios is imported: import axios from 'axios';
// Also ensure you have proper state management (e.g., useState for setCompanyId, setRole, etc.)

const fetchSettings = async () => {
  try {
    const userEmail = localStorage.getItem('userEmail');


    setIsLoading(true); // Assuming setIsLoading is a state setter

    // 1. Get user data (companyId and role)
    const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`);
    const userData = userResponse.data;

    if (!userData) {
      throw new Error('User data not found');
    }
    
    const userCompanyId = userData.company_id; // Note: SQL column is company_id
    setCompanyId(userCompanyId); // Assuming setCompanyId is a state setter
    setShowAddUserButton(userData.role === "1" || userData.role === 'admin'); // Assuming setShowAddUserButton is a state setter
    setRole(userData.role); // Assuming setRole is a state setter

    // 2. Get company settings (using the already existing company-config API)
    const companyConfigResponse = await axios.get(`https://juta-dev.ngrok.dev/api/company-config/${userCompanyId}`);
    const { companyData } = companyConfigResponse.data;

    setBaseUrl(companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app'); // Assuming setBaseUrl is a state setter
    setPhoneCount(companyData.phoneCount || 0); // Assuming setPhoneCount is a state setter
    setAiDelay(companyData.aiDelay || 0); // Assuming setAiDelay is a state setter
    setAiAutoResponse(companyData.aiAutoResponse || false); // Assuming setAiAutoResponse is a state setter

    // 3. Get reporting settings from dailyReport JSONB
    if (companyData.dailyReport) {
      const dailyReportData = companyData.dailyReport;
      setEnabled(dailyReportData.enabled || false); // Assuming setEnabled is a state setter
      setTime(dailyReportData.time || '09:00'); // Assuming setTime is a state setter
      setGroupId(dailyReportData.groupId || ''); // Assuming setGroupId is a state setter
      setLastRun(dailyReportData.lastRun ? new Date(dailyReportData.lastRun).toLocaleString() : null); // Assuming setLastRun is a state setter
    } else {
        // If dailyReport is null or empty, set defaults
        setEnabled(false);
        setTime('09:00');
        setGroupId('');
        setLastRun(null);
    }

    setIsLoading(false);
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Ensure setError is defined in your component's scope
    setError('Failed to load settings'); 
    setIsLoading(false);
  }
};

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await axios.post(`${baseUrl}/api/daily-report/${companyId}`, {
        enabled,
        time,
        groupId
      });

      if (response.data.success) {
        alert('Settings saved successfully!');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerReport = async () => {
    try {
      const response = await axios.post(`${baseUrl}/api/daily-report/${companyId}/trigger`);
      if (response.data.success) {
        alert(`Report triggered successfully! Found ${response.data.count} leads today.`);
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Error triggering report:', error);
      alert('Failed to trigger report');
    }
  };

  const handleSaveAiDelay = async () => {
    try {
      await updateDoc(doc(firestore, 'companies', companyId!), {
        aiDelay: aiDelay
      });
      alert('AI delay setting saved successfully!');
    } catch (error) {
      console.error('Error saving AI delay:', error);
      alert('Failed to save AI delay setting');
    }
  };

  const handleSaveAiSettings = async () => {
    try {
      await updateDoc(doc(firestore, 'companies', companyId!), {
        aiDelay: aiDelay,
        aiAutoResponse: aiAutoResponse
      });
      alert('AI settings saved successfully!');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      alert('Failed to save AI settings');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <LoadingIcon icon="three-dots" className="w-20 h-20" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <ThemeSwitcher />
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link to="/crud-form">
            {showAddUserButton && role !== "3" && (
              <Button variant="primary" className="shadow-md">
                Add New User
              </Button>
            )}
          </Link>
          
          <Link to="/loading2">
            {showAddUserButton && phoneCount >= 2 && (
              <Button variant="primary" className="shadow-md">
                Add Number
              </Button>
            )}
          </Link>
          
          <Link to="/quick-replies">
            <Button variant="primary" className="shadow-md">
              Quick Replies
            </Button>
          </Link>
          
          {companyId === "0123" && (
            <Link to="/storage-pricing">
              <Button variant="primary" className="shadow-md">
                Storage Pricing
              </Button>
            </Link>
          )}
        </div>

        {/* Daily Report Settings Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Daily Report Settings</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="form-checkbox"
                />
                <span>Enable Daily Reports</span>
              </label>
            </div>

            {enabled && (
              <>
                <div>
                  <label className="block mb-2">Report Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block mb-2">WhatsApp Group ID</label>
                  <input
                    type="text"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="Enter group ID"
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                {lastRun && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Last report sent: {lastRun}
                  </div>
                )}
              </>
            )}

            <div className="space-x-4">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                className="shadow-md"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>

              {enabled && (
                <Button
                  variant="success"
                  onClick={handleTriggerReport}
                  className="shadow-md"
                >
                  Send Report Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;