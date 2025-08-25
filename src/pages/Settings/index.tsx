import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import LoadingIcon from '@/components/Base/LoadingIcon';
import { Link } from 'react-router-dom';
import Button from "@/components/Base/Button";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { selectColorScheme, setColorScheme } from "@/stores/colorSchemeSlice";
import { selectDarkMode, setDarkMode } from "@/stores/darkModeSlice";

function SettingsPage() {
  const dispatch = useAppDispatch();
  const activeColorScheme = useAppSelector(selectColorScheme);
  const activeDarkMode = useAppSelector(selectDarkMode);
  
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
  
  // New state for companyId change functionality
  const [userEmail, setUserEmail] = useState<string>('');
  const [showCompanyIdChange, setShowCompanyIdChange] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState('');
  const [isChangingCompanyId, setIsChangingCompanyId] = useState(false);

  const firestore = getFirestore();

  useEffect(() => {
    fetchSettings();
  }, []);

// Assuming axios is imported: import axios from 'axios';
// Also ensure you have proper state management (e.g., useState for setCompanyId, setRole, etc.)

const fetchSettings = async () => {
  try {
    const userEmail = localStorage.getItem('userEmail');
    setUserEmail(userEmail || '');

    // Check if email includes juta.com
    if (userEmail && userEmail.includes('juta.com')) {
      setShowCompanyIdChange(true);
    }

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

  const handleChangeCompanyId = async () => {
    if (!newCompanyId.trim()) {
      alert('Please enter a valid Company ID');
      return;
    }

    setIsChangingCompanyId(true);
    setError(null);

    try {
      // Update user's company_id in the database
      const response = await axios.put(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        company_id: newCompanyId.trim()
      });

      if (response.data.success) {
        alert('Company ID changed successfully! Please refresh the page to see the changes.');
        setCompanyId(newCompanyId.trim());
        setNewCompanyId('');
        // Optionally refresh the page or refetch settings
        window.location.reload();
      } else {
        throw new Error(response.data.error || 'Failed to change Company ID');
      }
    } catch (error) {
      console.error('Error changing Company ID:', error);
      setError('Failed to change Company ID. Please try again.');
    } finally {
      setIsChangingCompanyId(false);
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
          <div className="flex items-center space-x-4">
            <Link to="/users-layout-2">
              <Button variant="outline-secondary" className="shadow-md">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <ThemeSwitcher />
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
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
          
         
          {companyId === "0380" && (
           <Link to="/feedback-form-builder">
           <Button variant="primary" className="shadow-md">
             Feedback Form Builder
           </Button>
         </Link>
          )}
     
          
          {companyId === "0123" && (
            <Link to="/storage-pricing">
              <Button variant="primary" className="shadow-md">
                Storage Pricing
              </Button>
            </Link>
          )}
        </div>

        {/* Theme Settings Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Theme Settings</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Appearance Mode
              </label>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => dispatch(setDarkMode(false))}
                  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                    !activeDarkMode
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                    <span>Light Mode</span>
                  </div>
                </button>
                
                <button
                  onClick={() => dispatch(setDarkMode(true))}
                  className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
                    activeDarkMode
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-slate-700"></div>
                    <span>Dark Mode</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Color Scheme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {['default', 'theme-1', 'theme-2', 'theme-3', 'theme-4'].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => dispatch(setColorScheme(theme as any))}
                    className={`h-12 rounded-lg border-2 transition-all duration-200 ${
                      activeColorScheme === theme
                        ? 'border-primary shadow-md'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="h-full overflow-hidden rounded-lg">
                      <div className="flex items-center h-full gap-1 -mx-2">
                        <div className={`w-1/2 h-[140%] bg-theme-1 rotate-12 ${theme}`}></div>
                        <div className={`w-1/2 h-[140%] bg-theme-2 rotate-12 ${theme}`}></div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Choose from different color schemes to customize your interface
              </p>
            </div>
          </div>
        </div>

        {/* Company ID Change Section - Only show for juta.com users */}
        {showCompanyIdChange && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Change Company ID</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block mb-2">Current Company ID</label>
                <input
                  type="text"
                  value={companyId || ''}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block mb-2">New Company ID</label>
                <input
                  type="text"
                  value={newCompanyId}
                  onChange={(e) => setNewCompanyId(e.target.value)}
                  placeholder="Enter new Company ID"
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <Button
                variant="warning"
                onClick={handleChangeCompanyId}
                disabled={isChangingCompanyId || !newCompanyId.trim()}
                className="shadow-md"
              >
                {isChangingCompanyId ? 'Changing...' : 'Change Company ID'}
              </Button>
            </div>
          </div>
        )}

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