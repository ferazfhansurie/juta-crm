import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Button from "@/components/Base/Button";
import LoadingIcon from '@/components/Base/LoadingIcon';
import { Dialog } from "@/components/Base/Headless";
import Lucide from "@/components/Base/Lucide";
import { toast } from 'react-toastify';

interface FormMapping {
  id: number;
  company_id: string;
  form_id: string;
  form_name: string;
  page_id: string;
  page_name: string;
  welcome_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Lead {
  id: number;
  facebook_lead_id: string;
  form_id: string;
  page_id: string;
  campaign_id: string;
  adgroup_id: string;
  company_id: string;
  phone: string;
  name: string;
  email: string;
  message_sent: boolean;
  message_sent_at: string;
  message_status: string;
  created_at: string;
}

interface Analytics {
  company_id: string;
  form_name: string;
  page_name: string;
  total_leads: number;
  messages_sent: number;
  leads_today: number;
  leads_this_week: number;
  leads_this_month: number;
  message_success_rate: number;
}

function FacebookLeadManager() {
  const [activeTab, setActiveTab] = useState<'overview' | 'mappings' | 'leads' | 'datafinder' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Data states
  const [formMappings, setFormMappings] = useState<FormMapping[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [facebookTokenStatus, setFacebookTokenStatus] = useState<{
    isValid: boolean;
    error?: string;
    user?: any;
  } | null>(null);
  
  // Form states
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FormMapping | null>(null);
  const [mappingForm, setMappingForm] = useState({
    form_id: '',
    form_name: '',
    page_id: '',
    page_name: '',
    welcome_message: '',
    is_active: true
  });
  
  // Lead management states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);

  // Settings states
  const [globalWelcomeMessage, setGlobalWelcomeMessage] = useState('');
  const [webhookUrl] = useState('https://juta-dev.ngrok.dev/api/facebook-lead-webhook');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchFormMappings();
      fetchLeads();
      fetchAnalytics();
    }
  }, [companyId]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const userEmail = localStorage.getItem('userEmail');
      
      // Get user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`);
      const userData = userResponse.data;
      setCompanyId(userData.company_id);

      // Get company settings
      const companyConfigResponse = await axios.get(`https://juta-dev.ngrok.dev/api/company-config/${userData.company_id}`);
      const { companyData } = companyConfigResponse.data;
      setGlobalWelcomeMessage(companyData.facebook_welcome_message || 'Hi {name}! Thanks for your interest in our services. We will contact you shortly.');

      // Check Facebook token status
      await checkFacebookTokenStatus();
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFormMappings = async () => {
    try {
      if (!companyId) return;
      const response = await axios.get(`https://juta-dev.ngrok.dev/api/facebook-form-mappings?company_id=${companyId}`);
      setFormMappings(response.data);
    } catch (error) {
      console.error('Error fetching form mappings:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      if (!companyId) return;
      const response = await axios.get(`https://juta-dev.ngrok.dev/api/facebook-leads?company_id=${companyId}`);
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      if (!companyId) return;
      const response = await axios.get(`https://juta-dev.ngrok.dev/api/facebook-lead-analytics?company_id=${companyId}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const checkFacebookTokenStatus = async () => {
    try {
      const response = await axios.get(`https://juta-dev.ngrok.dev/api/facebook-token-status`);
      setFacebookTokenStatus({
        isValid: response.data.success,
        user: response.data.user
      });
    } catch (error: any) {
      setFacebookTokenStatus({
        isValid: false,
        error: error.response?.data?.error || 'Failed to check token status'
      });
    }
  };

  const handleSaveMapping = async () => {
    try {
      const mappingData = {
        ...mappingForm,
        company_id: companyId
      };

      if (editingMapping) {
        await axios.put(`https://juta-dev.ngrok.dev/api/facebook-form-mappings/${editingMapping.id}`, mappingData);
        toast.success('Form mapping updated successfully!');
      } else {
        await axios.post(`https://juta-dev.ngrok.dev/api/facebook-form-mappings`, mappingData);
        toast.success('Form mapping created successfully!');
      }

      setShowMappingModal(false);
      setEditingMapping(null);
      setMappingForm({
      form_id: '',
      form_name: '',
      page_id: '',
      page_name: '',
        welcome_message: '',
      is_active: true
    });
      fetchFormMappings();
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast.error('Failed to save form mapping');
    }
  };

  const handleEditMapping = (mapping: FormMapping) => {
    setEditingMapping(mapping);
    setMappingForm({
      form_id: mapping.form_id,
      form_name: mapping.form_name,
      page_id: mapping.page_id,
      page_name: mapping.page_name,
      welcome_message: mapping.welcome_message,
      is_active: mapping.is_active
    });
    setShowMappingModal(true);
  };

  const handleDeleteMapping = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this form mapping?')) {
      try {
        await axios.delete(`https://juta-dev.ngrok.dev/api/facebook-form-mappings/${id}?company_id=${companyId}`);
        toast.success('Form mapping deleted successfully!');
        fetchFormMappings();
      } catch (error) {
        console.error('Error deleting mapping:', error);
        toast.error('Failed to delete form mapping');
      }
    }
  };

  const handleToggleMapping = async (id: number, isActive: boolean) => {
    try {
      await axios.put(`https://juta-dev.ngrok.dev/api/facebook-form-mappings/${id}`, { 
        is_active: !isActive,
        company_id: companyId
      });
      toast.success(`Form mapping ${!isActive ? 'activated' : 'deactivated'} successfully!`);
      fetchFormMappings();
    } catch (error) {
      console.error('Error toggling mapping:', error);
      toast.error('Failed to update form mapping');
    }
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    try {
      await axios.post(`https://juta-dev.ngrok.dev/api/facebook-lead-webhook`, {
        object: 'page',
        entry: [{
          id: 'test_page_id',
          time: Date.now(),
          changes: [{
            value: {
              leadgen_id: 'TEST_LEAD_' + Date.now(),
              form_id: 'TEST_FORM',
              page_id: 'TEST_PAGE',
              created_time: Date.now()
            },
            field: 'leadgen'
          }]
        }]
      });
      toast.success('Webhook test successful!');
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Webhook test failed');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    try {
      await axios.put(`https://juta-dev.ngrok.dev/api/company-config/${companyId}`, {
        facebook_welcome_message: globalWelcomeMessage
      });
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Lead management handlers
  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadModal(true);
  };

  const handleResendMessage = async (lead: Lead) => {
    try {
      await axios.post(`https://juta-dev.ngrok.dev/api/resend-facebook-message`, {
        lead_id: lead.id,
        company_id: companyId,
        phone: lead.phone,
        name: lead.name,
        form_id: lead.form_id
      });
      toast.success(`Message resent to ${lead.name || lead.phone}`);
      fetchLeads(); // Refresh leads data
    } catch (error) {
      console.error('Error resending message:', error);
      toast.error('Failed to resend message');
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (window.confirm(`Are you sure you want to delete the lead from ${lead.name || lead.phone}?`)) {
      try {
        await axios.delete(`https://juta-dev.ngrok.dev/api/facebook-leads/${lead.id}?company_id=${companyId}`);
        toast.success('Lead deleted successfully!');
        fetchLeads(); // Refresh leads data
      } catch (error) {
        console.error('Error deleting lead:', error);
        toast.error('Failed to delete lead');
      }
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
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 pb-20 relative">
        {/* Glassmorphic Background Overlay */}
        <div className="absolute inset-0 bg-white/20 dark:bg-white/5 backdrop-blur-3xl rounded-3xl shadow-2xl shadow-blue-500/10 dark:shadow-indigo-500/20 -z-10"></div>
    

        {/* Modern Tab Navigation */}
        <div className="relative backdrop-blur-xl bg-white/40 dark:bg-slate-800/40 p-2 rounded-2xl 
                      border border-white/30 dark:border-slate-700/30 shadow-xl shadow-blue-500/5 
                      dark:shadow-indigo-500/10 mb-8">
          <div className="flex space-x-1 relative">
            {[
              { id: 'overview', label: 'Overview', icon: 'BarChart3', badge: leads.length },
              { id: 'mappings', label: 'Mappings', icon: 'Link', badge: formMappings.length },
              { id: 'leads', label: 'Leads', icon: 'Users', badge: leads.filter(l => l.message_sent).length },
              { id: 'datafinder', label: 'Setup Helper', icon: 'Lightbulb' },
              { id: 'settings', label: 'Settings', icon: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold 
                          transition-all duration-300 group overflow-hidden ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/30'
                }`}
              >
                {/* Active tab glow effect */}
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 
                                rounded-xl blur-lg scale-110 -z-10"></div>
                )}
                
                <div className="relative z-10">
                  <Lucide 
                    icon={tab.icon as any} 
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      activeTab === tab.id ? 'drop-shadow-lg' : ''
                    }`} 
                  />
                </div>
                
                <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                
                {/* Badge for data counts */}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <div className={`relative z-10 px-2 py-1 text-xs font-bold rounded-full min-w-[1.5rem] h-6 
                                 flex items-center justify-center ${
                    activeTab === tab.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}>
                    {tab.badge}
                  </div>
                )}
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                              translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 
                              skew-x-12"></div>
              </button>
            ))}
          </div>
          
          {/* Modern tab indicator line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/20 via-indigo-500/40 to-purple-500/20 rounded-full"></div>
        </div>

        {/* Enhanced Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Compact Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Mappings', value: formMappings.length, icon: 'Link', color: 'blue' },
                { label: 'Total Leads', value: leads.length, icon: 'Users', color: 'green' },
                { label: 'Processed', value: leads.filter(l => l.message_sent).length, icon: 'MessageCircle', color: 'purple' },
                { label: 'Success Rate', value: `${leads.length > 0 ? Math.round((leads.filter(l => l.message_sent).length / leads.length) * 100) : 0}%`, icon: 'TrendingUp', color: 'orange' }
              ].map((stat) => (
                <div key={stat.label} className="backdrop-blur-lg bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl 
                                               border border-white/20 dark:border-slate-700/20 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    </div>
                    <Lucide icon={stat.icon as any} className={`w-6 h-6 text-${stat.color}-500`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics Integration */}
            {analytics.length > 0 && (
              <div className="backdrop-blur-xl bg-white/50 dark:bg-slate-800/50 rounded-xl p-6 
                            border border-white/20 dark:border-slate-700/20 shadow-lg">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Form Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.slice(0, 6).map((stat) => (
                    <div key={stat.form_name} className="p-4 bg-white/30 dark:bg-slate-700/30 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{stat.form_name}</h4>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {stat.message_success_rate}%
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Total</span>
                          <span className="font-medium">{stat.total_leads}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">This Month</span>
                          <span className="font-medium">{stat.leads_this_month}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Recent Leads */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-white/60 to-white/20 
                          dark:from-slate-800/60 dark:to-slate-900/20 rounded-2xl 
                          border border-white/20 dark:border-slate-700/20 
                          shadow-xl shadow-slate-500/5 dark:shadow-slate-500/10 overflow-hidden">
              <div className="relative p-6 border-b border-white/10 dark:border-slate-700/20">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
                <div className="relative flex items-center justify-between">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 
                               dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Recent Leads
                  </h3>
                  <div className="flex items-center space-x-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <Lucide icon="Clock" className="w-4 h-4" />
                    <span>Latest Activity</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {leads.slice(0, 5).length > 0 ? (
                  <div className="space-y-3">
                    {leads.slice(0, 5).map((lead, index) => (
                      <div key={lead.id} 
                           className="group flex items-center justify-between p-4 
                                    backdrop-blur-lg bg-white/40 dark:bg-slate-800/40 
                                    rounded-xl border border-white/20 dark:border-slate-700/20
                                    shadow-lg hover:shadow-xl hover:bg-white/60 dark:hover:bg-slate-800/60
                                    transition-all duration-300 hover:-translate-y-0.5
                                    hover:border-blue-200/50 dark:hover:border-blue-700/50"
                           style={{animationDelay: `${index * 100}ms`}}>
                        <div className="flex items-center space-x-4">
                          <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 
                                        text-white rounded-full flex items-center justify-center font-bold 
                                        shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 
                                          rounded-full blur-lg scale-150 opacity-0 group-hover:opacity-100 
                                          transition-opacity duration-300"></div>
                            <span className="relative z-10 text-lg">
                              {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 
                                        dark:group-hover:text-blue-400 transition-colors">
                              {lead.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                              {lead.phone}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm
                                         border shadow-sm transition-all duration-300 ${
                            lead.message_sent 
                              ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50'
                              : 'bg-amber-100/80 text-amber-700 border-amber-200/50 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50'
                          }`}>
                            {lead.message_sent ? '✓ Message Sent' : '⏳ Pending'}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                    rounded-full blur-2xl"></div>
                      <Lucide icon="Users" className="relative w-16 h-16 mx-auto mb-4 text-slate-400 
                                                    dark:text-slate-600" />
                    </div>
                    <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No leads yet</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                      Your Facebook leads will appear here once you start receiving them
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Form Mappings Tab */}
        {activeTab === 'mappings' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 
                             dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Form Mappings
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">
                  Connect your Facebook forms to automate lead processing
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowMappingModal(true)}
                className="flex items-center space-x-2 backdrop-blur-lg bg-gradient-to-r from-blue-500 to-indigo-600 
                         hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl 
                         hover:shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Lucide icon="Plus" className="w-4 h-4" />
                <span>Add Mapping</span>
              </Button>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-white/60 to-white/20 
                          dark:from-slate-800/60 dark:to-slate-900/20 rounded-2xl 
                          border border-white/20 dark:border-slate-700/20 
                          shadow-xl shadow-slate-500/5 dark:shadow-slate-500/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="backdrop-blur-lg bg-white/40 dark:bg-slate-800/40 
                                 border-b border-white/20 dark:border-slate-700/20">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 
                                   uppercase tracking-wider">Form</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 
                                   uppercase tracking-wider">Page</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 
                                   uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 
                                   uppercase tracking-wider">Leads</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 
                                   uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 dark:divide-slate-700/20">
                    {formMappings.map((mapping, index) => {
                      const mappingLeads = leads.filter(l => l.form_id === mapping.form_id);
                      const sentMessages = mappingLeads.filter(l => l.message_sent).length;
                      
                      return (
                        <tr key={mapping.id} 
                            className="group hover:bg-white/40 dark:hover:bg-slate-800/40 
                                     transition-all duration-300"
                            style={{animationDelay: `${index * 100}ms`}}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 
                                            group-hover:text-blue-600 dark:group-hover:text-blue-400 
                                            transition-colors">
                                {mapping.form_name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono 
                                            bg-slate-100/50 dark:bg-slate-800/50 px-2 py-1 rounded">
                                ID: {mapping.form_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {mapping.page_name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono 
                                            bg-slate-100/50 dark:bg-slate-800/50 px-2 py-1 rounded">
                                ID: {mapping.page_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleMapping(mapping.id, mapping.is_active)}
                              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold
                                        backdrop-blur-sm border shadow-sm transition-all duration-300 
                                        hover:scale-105 hover:shadow-md ${
                                mapping.is_active 
                                  ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 hover:bg-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50 dark:hover:bg-emerald-800/60'
                                  : 'bg-red-100/80 text-red-700 border-red-200/50 hover:bg-red-200/80 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/50 dark:hover:bg-red-800/60'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full mr-2 ${mapping.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                              {mapping.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {mappingLeads.length} total
                              </div>
                              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {sentMessages} sent
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditMapping(mapping)}
                                className="p-2 rounded-xl backdrop-blur-sm bg-blue-100/50 hover:bg-blue-200/70 
                                         text-blue-600 hover:text-blue-700 border border-blue-200/50 
                                         dark:bg-blue-900/30 dark:hover:bg-blue-800/50 dark:text-blue-400 
                                         dark:hover:text-blue-300 dark:border-blue-700/50 
                                         transition-all duration-300 hover:scale-110 hover:shadow-lg"
                                title="Edit Mapping"
                              >
                                <Lucide icon="Pencil" className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMapping(mapping.id)}
                                className="p-2 rounded-xl backdrop-blur-sm bg-red-100/50 hover:bg-red-200/70 
                                         text-red-600 hover:text-red-700 border border-red-200/50 
                                         dark:bg-red-900/30 dark:hover:bg-red-800/50 dark:text-red-400 
                                         dark:hover:text-red-300 dark:border-red-700/50 
                                         transition-all duration-300 hover:scale-110 hover:shadow-lg"
                                title="Delete Mapping"
                              >
                                <Lucide icon="Trash2" className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {formMappings.length === 0 && (
                <div className="text-center py-12">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                  rounded-full blur-2xl"></div>
                    <Lucide icon="Link" className="relative w-16 h-16 mx-auto mb-4 text-slate-400 
                                                  dark:text-slate-600" />
                  </div>
                  <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No form mappings yet</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    Create your first mapping to start processing Facebook leads automatically
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setShowMappingModal(true)}
                    className="mt-4 backdrop-blur-lg bg-gradient-to-r from-blue-500 to-indigo-600 
                             hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl 
                             hover:shadow-blue-500/25 transition-all duration-300"
                  >
                    <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                    Create First Mapping
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Leads Tab with CRUD */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 
                             dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Lead Management
                </h2>
                <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">
                  View, manage, and track all your Facebook leads
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline-primary"
                  onClick={fetchLeads}
                  className="flex items-center space-x-2 backdrop-blur-lg bg-white/30 dark:bg-slate-800/30"
                >
                  <Lucide icon="RefreshCw" className="w-4 h-4" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {leads.length > 0 ? (
              <div className="backdrop-blur-xl bg-white/50 dark:bg-slate-800/50 rounded-2xl 
                            border border-white/20 dark:border-slate-700/20 shadow-lg overflow-hidden">
                
                {/* Enhanced Lead Cards */}
                <div className="p-6 space-y-4">
                  {leads.map((lead, index) => (
                    <div key={lead.id} 
                         className="group backdrop-blur-lg bg-white/40 dark:bg-slate-800/40 p-4 rounded-xl 
                                  border border-white/20 dark:border-slate-700/20 shadow-lg 
                                  hover:shadow-xl hover:bg-white/60 dark:hover:bg-slate-800/60 
                                  transition-all duration-300 hover:-translate-y-0.5"
                         style={{animationDelay: `${index * 50}ms`}}>
                      
                      <div className="flex items-center justify-between">
                        {/* Lead Info */}
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 
                                        text-white rounded-xl flex items-center justify-center font-bold shadow-lg 
                                        group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg">
                              {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {lead.name || 'Unknown'}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {lead.phone}
                                </p>
                                {lead.email && (
                                  <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                                    {lead.email}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                  Form
                                </p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {formMappings.find(m => m.form_id === lead.form_id)?.form_name || 'Unknown Form'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                  {new Date(lead.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold
                                                 backdrop-blur-sm border transition-all duration-300 ${
                                    lead.message_sent 
                                      ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : 'bg-amber-100/80 text-amber-700 border-amber-200/50 dark:bg-amber-900/40 dark:text-amber-300'
                                  }`}>
                                    {lead.message_sent ? '✓ Processed' : '⏳ Pending'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleViewLead(lead)}
                            className="p-2 rounded-lg backdrop-blur-sm bg-blue-100/50 hover:bg-blue-200/70 
                                     text-blue-600 hover:text-blue-700 border border-blue-200/50 
                                     dark:bg-blue-900/30 dark:hover:bg-blue-800/50 dark:text-blue-400 
                                     transition-all duration-300 hover:scale-110"
                            title="View Details">
                            <Lucide icon="Eye" className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleResendMessage(lead)}
                            className="p-2 rounded-lg backdrop-blur-sm bg-green-100/50 hover:bg-green-200/70 
                                     text-green-600 hover:text-green-700 border border-green-200/50 
                                     dark:bg-green-900/30 dark:hover:bg-green-800/50 dark:text-green-400 
                                     transition-all duration-300 hover:scale-110"
                            title="Resend Message">
                            <Lucide icon="Send" className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteLead(lead)}
                            className="p-2 rounded-lg backdrop-blur-sm bg-red-100/50 hover:bg-red-200/70 
                                     text-red-600 hover:text-red-700 border border-red-200/50 
                                     dark:bg-red-900/30 dark:hover:bg-red-800/50 dark:text-red-400 
                                     transition-all duration-300 hover:scale-110"
                            title="Delete Lead">
                            <Lucide icon="Trash2" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-white/50 dark:bg-slate-800/50 rounded-2xl p-12 text-center 
                            border border-white/20 dark:border-slate-700/20 shadow-lg">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                rounded-full blur-2xl"></div>
                  <Lucide icon="Users" className="relative w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">No leads yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Your Facebook leads will appear here once your forms start receiving submissions
                </p>
                <Button
                  variant="primary"
                  onClick={() => setActiveTab('mappings')}
                  className="mt-4 backdrop-blur-lg bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                  Create First Mapping
                </Button>
              </div>
            )}
          </div>
        )}


        {/* Setup Helper Tab */}
        {activeTab === 'datafinder' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 
                           dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
                Setup Helper
              </h2>
              <p className="text-slate-600 dark:text-slate-400">Quick guide to get your Facebook Lead Ads connected</p>
            </div>
            
            {/* Simple Steps */}
            <div className="backdrop-blur-xl bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6 
                          border border-white/20 dark:border-slate-700/20 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Get Form ID */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Lucide icon="FileText" className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Get Form ID</h3>
                  </div>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">1</span>
                      <span>Go to Business Manager → Instant Forms</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">2</span>
                      <span>Select your form from the list</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0">3</span>
                      <span>Copy the Form ID from the URL (asset_id parameter)</span>
                    </li>
                  </ol>
                </div>

                {/* Get Page ID */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <Lucide icon="Building" className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Get Page ID</h3>
                  </div>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0">1</span>
                      <span>Go to your Facebook Page</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0">2</span>
                      <span>Settings → Page Info</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0">3</span>
                      <span>Copy Page ID</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="https://business.facebook.com/latest/instant_forms/forms/" target="_blank" rel="noopener noreferrer"
                 className="backdrop-blur-lg bg-white/40 dark:bg-slate-800/40 p-4 rounded-xl border border-white/20 
                          dark:border-slate-700/20 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all group">
                <div className="flex items-center space-x-3">
                  <Lucide icon="ExternalLink" className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Instant Forms
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Manage your forms</p>
                  </div>
                </div>
              </a>

              <a href="https://findmyfbid.com/" target="_blank" rel="noopener noreferrer"
                 className="backdrop-blur-lg bg-white/40 dark:bg-slate-800/40 p-4 rounded-xl border border-white/20 
                          dark:border-slate-700/20 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all group">
                <div className="flex items-center space-x-3">
                  <Lucide icon="Search" className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      Find FB ID
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Quick ID lookup</p>
                  </div>
                </div>
              </a>

              <button onClick={() => setActiveTab('mappings')}
                      className="backdrop-blur-lg bg-white/40 dark:bg-slate-800/40 p-4 rounded-xl border border-white/20 
                               dark:border-slate-700/20 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all group">
                <div className="flex items-center space-x-3">
                  <Lucide icon="Plus" className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">
                      Add Mapping
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Create new form</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Settings</h2>
            
            {/* Global Welcome Message */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Global Welcome Message</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Welcome Message
                  </label>
                  <textarea
                    value={globalWelcomeMessage}
                    onChange={(e) => setGlobalWelcomeMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                    rows={4}
                    placeholder="Hi {name}! Thanks for your interest in our services. We will contact you shortly."
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Use {'{name}'} to insert the lead's name dynamically
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleSaveGlobalSettings}
                  className="flex items-center space-x-2"
                >
                  <Lucide icon="Save" className="w-4 h-4" />
                  <span>Save Settings</span>
                </Button>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Webhook Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                    />
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        toast.success('Webhook URL copied to clipboard!');
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Lucide icon="Copy" className="w-4 h-4" />
                      <span>Copy</span>
                    </Button>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <Button
                    variant="outline-primary"
                    onClick={handleTestWebhook}
                    disabled={isTestingWebhook}
                    className="flex items-center space-x-2"
                  >
                    <Lucide icon="Play" className="w-4 h-4" />
                    <span>{isTestingWebhook ? 'Testing...' : 'Test Webhook'}</span>
                  </Button>
                  
                  <Button
                    variant="outline-secondary"
                    onClick={checkFacebookTokenStatus}
                    className="flex items-center space-x-2"
                  >
                    <Lucide icon="RefreshCw" className="w-4 h-4" />
                    <span>Check Facebook Token</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Facebook Token Status */}
            <div className={`p-4 rounded-lg border ${
              facebookTokenStatus?.isValid 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start space-x-3">
                <Lucide 
                  icon={facebookTokenStatus?.isValid ? "CheckCircle" : "XCircle"} 
                  className={`w-5 h-5 mt-0.5 ${
                    facebookTokenStatus?.isValid 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`} 
                />
                <div className="flex-1">
                  <h4 className={`font-medium mb-1 ${
                    facebookTokenStatus?.isValid 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    Facebook Access Token Status
                  </h4>
                  {facebookTokenStatus?.isValid ? (
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                        ✅ Token is valid and working
                      </p>
                      {facebookTokenStatus.user && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Connected as: {facebookTokenStatus.user.name || 'Facebook User'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                        ❌ Token is invalid or expired
                      </p>
                      {facebookTokenStatus?.error && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Error: {facebookTokenStatus.error}
                        </p>
                      )}
              </div>
            )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Mapping Modal */}
        <Dialog
          open={showMappingModal}
          onClose={() => {
            setShowMappingModal(false);
            setEditingMapping(null);
            setMappingForm({
              form_id: '',
              form_name: '',
              page_id: '',
              page_name: '',
              welcome_message: '',
              is_active: true
            });
          }}
        >
          <Dialog.Panel>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingMapping ? 'Edit Form Mapping' : 'Add New Form Mapping'}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Form ID *
                    </label>
                  <input
                    type="text"
                      value={mappingForm.form_id}
                      onChange={(e) => setMappingForm({...mappingForm, form_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Enter Facebook Form ID"
                  />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Form Name *
                    </label>
                  <input
                    type="text"
                      value={mappingForm.form_name}
                      onChange={(e) => setMappingForm({...mappingForm, form_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Enter Form Name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Page ID *
                    </label>
                  <input
                    type="text"
                      value={mappingForm.page_id}
                      onChange={(e) => setMappingForm({...mappingForm, page_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Enter Facebook Page ID"
                  />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Page Name *
                    </label>
                  <input
                    type="text"
                      value={mappingForm.page_name}
                      onChange={(e) => setMappingForm({...mappingForm, page_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Enter Page Name"
                  />
                </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Welcome Message
                  </label>
                  <textarea
                    value={mappingForm.welcome_message}
                    onChange={(e) => setMappingForm({...mappingForm, welcome_message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                    placeholder="Hi {name}! Thanks for your interest. We will contact you soon."
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Use {'{name}'} to insert the lead's name dynamically. Leave empty to use global default.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                    id="is_active"
                    checked={mappingForm.is_active}
                    onChange={(e) => setMappingForm({...mappingForm, is_active: e.target.checked})}
                      className="form-checkbox"
                    />
                  <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                    Active (enables this mapping)
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setShowMappingModal(false);
                    setEditingMapping(null);
                    setMappingForm({
                      form_id: '',
                      form_name: '',
                      page_id: '',
                      page_name: '',
                      welcome_message: '',
                      is_active: true
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveMapping}
                  disabled={!mappingForm.form_id || !mappingForm.form_name || !mappingForm.page_id || !mappingForm.page_name}
                >
                  {editingMapping ? 'Update' : 'Create'} Mapping
                </Button>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>

        {/* Lead Details Modal */}
        <Dialog
          open={showLeadModal}
          onClose={() => {
            setShowLeadModal(false);
            setSelectedLead(null);
          }}
        >
          <Dialog.Panel>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 
                             dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Lead Details
                </h3>
                <button
                  onClick={() => setShowLeadModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Lucide icon="X" className="w-5 h-5" />
                </button>
              </div>

              {selectedLead && (
                <div className="space-y-6">
                  {/* Lead Avatar and Basic Info */}
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 
                                dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 
                                  text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg">
                      {selectedLead.name ? selectedLead.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedLead.name || 'Unknown Lead'}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400 font-medium">
                        {selectedLead.phone}
                      </p>
                      {selectedLead.email && (
                        <p className="text-slate-500 dark:text-slate-500">
                          {selectedLead.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lead Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Form Information
                        </label>
                        <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {formMappings.find(m => m.form_id === selectedLead.form_id)?.form_name || 'Unknown Form'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 font-mono">
                            ID: {selectedLead.form_id}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Status
                        </label>
                        <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold ${
                          selectedLead.message_sent 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                            : 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
                        }`}>
                          {selectedLead.message_sent ? '✓ Message Sent' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Campaign Info
                        </label>
                        <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                          <p className="text-slate-900 dark:text-white">
                            {selectedLead.campaign_id || 'Not specified'}
                          </p>
                          {selectedLead.adgroup_id && (
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              Ad Group: {selectedLead.adgroup_id}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Dates
                        </label>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Created:</span>
                            <span className="font-medium">
                              {new Date(selectedLead.created_at).toLocaleString()}
                            </span>
                          </div>
                          {selectedLead.message_sent_at && (
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Message Sent:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {new Date(selectedLead.message_sent_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowLeadModal(false)}
                    >
                      Close
                    </Button>
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        handleResendMessage(selectedLead);
                        setShowLeadModal(false);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Lucide icon="Send" className="w-4 h-4" />
                      <span>Resend Message</span>
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={() => {
                        handleDeleteLead(selectedLead);
                        setShowLeadModal(false);
                      }}
                      className="flex items-center space-x-2"
                    >
                      <Lucide icon="Trash2" className="w-4 h-4" />
                      <span>Delete Lead</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Dialog.Panel>
        </Dialog>
      </div>
    </div>
  );
}

export default FacebookLeadManager;