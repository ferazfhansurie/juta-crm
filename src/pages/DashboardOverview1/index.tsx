import _ from "lodash";
import clsx from "clsx";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState, useMemo, useCallback } from "react";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import TinySlider, { TinySliderElement } from "@/components/Base/TinySlider";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import Litepicker from "@/components/Base/Litepicker";
import ReportDonutChart from "@/components/ReportDonutChart";
import ReportLineChart from "@/components/ReportLineChart";
import ReportPieChart from "@/components/ReportPieChart";
import ReportDonutChart1 from "@/components/ReportDonutChart1";
import SimpleLineChart1 from "@/components/SimpleLineChart1";
import LeafletMap from "@/components/LeafletMap";
import { Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import axios from 'axios';
import { Link, useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ChartData, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, BarController } from 'chart.js';
import { BarChart } from "lucide-react";
import { useContacts } from "@/contact";
import { User, ChevronRight } from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay, eachHourOfInterval, eachDayOfInterval,  parse,  } from 'date-fns';


// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, BarController);

// Split Test Dashboard Component - Compact Version
const SplitTestDashboardCompact = () => {
  const [splitTestData, setSplitTestData] = useState<{
    totalCustomers: number;
    closedCustomers: number;
    variationStats: Array<{
      variationName: string;
      totalCustomers: number;
      closedCustomers: number;
      conversionRate: number;
      isActive: boolean;
    }>;
  }>({
    totalCustomers: 0,
    closedCustomers: 0,
    variationStats: [],
  });

  useEffect(() => {
    fetchSplitTestData();
  }, []);

  const fetchSplitTestData = async () => {
    try {
      const companyId = "001";
      const savedVariations = localStorage.getItem(`splitTestVariations_${companyId}`);
      
      if (savedVariations) {
        const variations = JSON.parse(savedVariations);
        const activeVariations = variations.filter((variation: any) => variation.isActive);
        
        let totalCustomers = 0;
        let totalClosed = 0;
        const variationStats: Array<{
          variationName: string;
          totalCustomers: number;
          closedCustomers: number;
          conversionRate: number;
          isActive: boolean;
        }> = [];

        variations.forEach((variation: any) => {
          const customers = variation.isActive ? Math.floor(Math.random() * 50) + 15 : 0;
          const closed = variation.isActive ? Math.floor(customers * (Math.random() * 0.4 + 0.1)) : 0;
          
          if (variation.isActive) {
            totalCustomers += customers;
            totalClosed += closed;
          }
          
          variationStats.push({
            variationName: variation.name,
            totalCustomers: customers,
            closedCustomers: closed,
            conversionRate: customers > 0 ? (closed / customers) * 100 : 0,
            isActive: variation.isActive,
          });
        });

        setSplitTestData({
          totalCustomers,
          closedCustomers: totalClosed,
          variationStats: variationStats.sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 6), // Show max 6 variations
        });
      }
    } catch (error) {
      console.error("Error fetching split test data:", error);
    }
  };

  const hasData = splitTestData.variationStats.length > 0;

  return (
    <div className="mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-800 rounded-lg">
              <div className="text-lg">🧪</div>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-900 dark:text-white">Split Test Performance</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">AI variation analytics</p>
            </div>
          </div>
          <Link to="/split-test">
            <Button variant="outline-primary" className="px-3 py-1 text-xs">
              Manage Tests →
            </Button>
          </Link>
        </div>

        {!hasData ? (
          <div className="text-center py-4">
            <div className="text-gray-400 text-xl mb-2">🚀</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No split tests yet</p>
            <Link to="/split-test">
              <Button variant="primary" className="px-4 py-1 text-xs">
                Create First Test
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            {/* Compact metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{splitTestData.totalCustomers}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{splitTestData.closedCustomers}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Closed</div>
              </div>
              <div className="text-center bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {splitTestData.totalCustomers > 0 
                    ? ((splitTestData.closedCustomers / splitTestData.totalCustomers) * 100).toFixed(1)
                    : '0'
                  }%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Rate</div>
              </div>
            </div>

            {/* Performance ranking */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Performance Ranking:</div>
              
              {/* Show active variations first, sorted by performance */}
              {splitTestData.variationStats
                .filter(v => v.isActive)
                .slice(0, 3)
                .map((variation, index) => {
                  const isTop = index === 0;
                  const isWorst = index === splitTestData.variationStats.filter(v => v.isActive).length - 1 && splitTestData.variationStats.filter(v => v.isActive).length > 1;
                  
                  return (
                    <div key={index} className={`flex items-center justify-between text-xs rounded px-3 py-2 ${
                      isTop ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' :
                      isWorst ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700' :
                      'bg-gray-50 dark:bg-gray-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          isTop ? 'bg-yellow-500' : isWorst ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {variation.variationName}
                        </span>
                        {isTop && <span className="text-sm">👑</span>}
                        {isWorst && <span className="text-sm">📉</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 dark:text-gray-400">
                          {variation.closedCustomers}/{variation.totalCustomers}
                        </span>
                        <span className={`font-bold ${
                          variation.conversionRate >= 30 ? 'text-green-600' : 
                          variation.conversionRate >= 20 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {variation.conversionRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              
              {/* Show inactive variations if any */}
              {splitTestData.variationStats.filter(v => !v.isActive).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Inactive Variations ({splitTestData.variationStats.filter(v => !v.isActive).length}):
                  </div>
                  {splitTestData.variationStats
                    .filter(v => !v.isActive)
                    .slice(0, 2)
                    .map((variation, index) => (
                      <div key={`inactive-${index}`} className="flex items-center justify-between text-xs bg-gray-100 dark:bg-gray-600 rounded px-2 py-1 mb-1">
                        <span className="text-gray-600 dark:text-gray-300">{variation.variationName}</span>
                        <span className="text-gray-500 dark:text-gray-400">⚫ Inactive</span>
                      </div>
                    ))}
                </div>
              )}
              
              {/* Best/Worst summary if multiple active variations */}
              {splitTestData.variationStats.filter(v => v.isActive).length > 1 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">🏆</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Best: <strong className="text-green-700 dark:text-green-400">
                          {splitTestData.variationStats.filter(v => v.isActive)[0]?.variationName}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600">📈</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        Needs Work: <strong className="text-red-700 dark:text-red-400">
                          {splitTestData.variationStats.filter(v => v.isActive).slice(-1)[0]?.variationName}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-center mt-3">
                <Link to="/split-test" className="text-xs text-blue-600 hover:text-blue-800">
                  View All Variations →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Split Test Dashboard Component - Full Version (keeping for reference)
const SplitTestDashboardComponent = () => {
  const [splitTestData, setSplitTestData] = useState<{
    totalCustomers: number;
    closedCustomers: number;
    variationStats: Array<{
      variationName: string;
      totalCustomers: number;
      closedCustomers: number;
      conversionRate: number;
    }>;
  }>({
    totalCustomers: 0,
    closedCustomers: 0,
    variationStats: [],
  });

  useEffect(() => {
    fetchSplitTestData();
  }, []);

  const fetchSplitTestData = async () => {
    try {
      // For now, load split tests from localStorage and generate stats
      // Later this would come from your API
      const companyId = "001"; // Get this from user context
      const savedTests = localStorage.getItem(`splitTests_${companyId}`);
      
      if (savedTests) {
        const splitTests = JSON.parse(savedTests);
        const activeTests = splitTests.filter((test: any) => test.isActive);
        
        if (activeTests.length > 0) {
          let totalCustomers = 0;
          let totalClosed = 0;
          const variationStats: Array<{
            variationName: string;
            totalCustomers: number;
            closedCustomers: number;
            conversionRate: number;
          }> = [];

          activeTests.forEach((test: any) => {
            test.variations.forEach((variation: any) => {
              const customers = Math.floor(Math.random() * 100) + 20;
              const closed = Math.floor(customers * (Math.random() * 0.4 + 0.1));
              
              totalCustomers += customers;
              totalClosed += closed;
              
              variationStats.push({
                variationName: variation.name,
                totalCustomers: customers,
                closedCustomers: closed,
                conversionRate: (closed / customers) * 100,
              });
            });
          });

          setSplitTestData({
            totalCustomers,
            closedCustomers: totalClosed,
            variationStats: variationStats.sort((a, b) => b.conversionRate - a.conversionRate),
          });
        }
      }
    } catch (error) {
      console.error("Error fetching split test data:", error);
    }
  };

  // Always show the section, even if no data
  const hasData = splitTestData.variationStats.length > 0;

  return (
    <div className="mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🧪 Split Test Performance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">AI assistant variation performance analytics</p>
          </div>
          <Link to="/split-test">
            <Button variant="outline-primary" className="px-4 py-2 text-sm">
              Manage Tests →
            </Button>
          </Link>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {splitTestData.totalCustomers}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                <Lucide icon="Users" className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Closed Customers</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {splitTestData.closedCustomers}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                <Lucide icon="CheckCircle" className="w-6 h-6 text-green-600 dark:text-green-300" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Overall Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {splitTestData.totalCustomers > 0 
                    ? ((splitTestData.closedCustomers / splitTestData.totalCustomers) * 100).toFixed(1)
                    : '0'
                  }%
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
                <Lucide icon="TrendingUp" className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Variation Performance */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance by Variation
          </h3>
          
          {!hasData ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-3">🧪</div>
              <h4 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No Split Tests Yet</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create split tests to start tracking AI assistant performance variations
              </p>
              <Link to="/split-test">
                <Button variant="primary" className="px-6 py-2">
                  Create Your First Split Test
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {splitTestData.variationStats.map((variation, index) => {
              const isTopPerformer = index === 0;
              const isLowestPerformer = index === splitTestData.variationStats.length - 1 && splitTestData.variationStats.length > 1;
              
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 relative transition-all hover:shadow-md ${
                    isTopPerformer 
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700' 
                      : isLowestPerformer
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  {/* Ranking Badge */}
                  {isTopPerformer && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      🏆 Best
                    </div>
                  )}
                  {isLowestPerformer && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      📉 Lowest
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {variation.variationName}
                    </h4>
                    <span className={`text-lg font-bold ${
                      isTopPerformer 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {variation.conversionRate.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                          {variation.totalCustomers}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Total</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-lg text-green-600 dark:text-green-400">
                          {variation.closedCustomers}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Closed</div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Conversion Rate</span>
                        <span className="font-medium">{variation.conversionRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isTopPerformer 
                              ? 'bg-green-500' 
                              : isLowestPerformer 
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(variation.conversionRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Performance Indicator */}
                    <div className="text-xs text-center">
                      <span className={`px-2 py-1 rounded-full ${
                        variation.conversionRate >= 35 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          : variation.conversionRate >= 25
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                      }`}>
                        {variation.conversionRate >= 35 
                          ? '🔥 Excellent' 
                          : variation.conversionRate >= 25
                          ? '👍 Good'
                          : '📈 Needs Improvement'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start">
            <Lucide icon="Info" className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                How it works
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This dashboard tracks customers based on automated tags. Set up tags like "closed", "converted", or "deal-won" 
                in your CRM system. When customers receive these tags, they'll be counted as closed customers for the 
                corresponding AI variation that interacted with them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Ensure axios is imported: import axios from 'axios';
// Ensure getAuth and app are imported from your Firebase setup (for user authentication)

export const updateMonthlyAssignments = async (employeeName: string, incrementValue: number) => {
  try {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      console.error('No authenticated user email available');
      return;
    }

    // Fetch companyId from SQL user data via your existing API
    const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const userData = userResponse.data;

    if (!userData || !userData.company_id) {
      console.error('User data or company ID not found for email:', userEmail);
      return;
    }
    const companyId = userData.company_id; // Use company_id from SQL

    // Call the new SQL API endpoint to update monthly assignments
    await axios.post('https://juta-dev.ngrok.dev/api/employees/update-monthly-assignments', {
      companyId: companyId,
      employeeName: employeeName, // This is the employee's name which serves as their identifier in the Firebase context. In SQL, it maps to the 'name' column.
      incrementValue: incrementValue
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log(`Monthly assignments updated successfully for ${employeeName} by ${incrementValue}`);

  } catch (error) {
    console.error('Error updating monthly assignments:', error);
  }
};

let companyId = "";
let total_contacts = 0;
let role = 2;

function EmployeeSearch({ 
  employees,
  onSelect,
  currentUser
}: {
  employees: Array<{ id: string; name: string; assignedContacts?: number }>;
  onSelect: (employee: { id: string; name: string; assignedContacts?: number }) => void;
  currentUser: { id: string } | null;
}) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: { target: Node | null; }) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside as EventListener);
    return () => document.removeEventListener("mousedown", handleClickOutside as EventListener);
  }, []);

  // Set initial search query to current user's name
  useEffect(() => {
    if (currentUser) {
      const currentEmployee = employees.find(emp => emp.id === currentUser.id);
      if (currentEmployee) {
        setSearchQuery(currentEmployee.name);
      }
    }
  }, [currentUser, employees]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center relative">
        <Lucide icon="User" className="absolute left-3 text-gray-400" />
        <FormInput
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 border-gray-300 dark:border-gray-700 focus:border-primary dark:focus:border-primary"
        />
        {searchQuery && (
          <button 
            className="absolute right-3 text-gray-400 hover:text-gray-600"
            onClick={() => {
              setSearchQuery("");
              setIsOpen(true);
            }}
          >
            <Lucide icon="X" className="w-4 h-4" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center ${
                  employee.id === currentUser?.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                }`}
                onClick={() => {
                  onSelect(employee);
                  setIsOpen(false);
                  setSearchQuery(employee.name);
                }}
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-3">
                  {employee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-gray-900 dark:text-gray-100 font-medium block">{employee.name}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">{employee.assignedContacts || 0} assigned contacts</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-gray-500 dark:text-gray-400 text-center">
              No employees found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Main() {

  interface Contact {
    additionalEmails: string[];
    address1: string | null;
    assignedTo: string | null;
    businessId: string | null;
    city: string | null;
    companyName: string | null;
    contactName: string;
    country: string;
    customFields: any[];
    dateAdded: string;
    dateOfBirth: string | null;
    dateUpdated: string;
    dnd: boolean;
    dndSettings: any;
    email: string | null;
    firstName: string;
    followers: string[];
    id: string;
    lastName: string;
    locationId: string;
    phone: string | null;
    postalCode: string | null;
    source: string | null;
    state: string | null;
    tags: string[];
    type: string;
    website: string | null;
  
  }

  interface Employee {
    id: string;
    name: string;
    role: string;
    uid?: string;
    email: string;
    assignedContacts: number;
    company?: string;
    companyId?: string;
    phone?: string;
    phoneNumber?: string;
    monthlyAssignments?: { [key: string]: number };
    closedContacts?: number;
    outgoingMessages?: number;
    currentMonthAssignments?: number;
  }
  interface Appointment {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    address: string;
    appointmentStatus: string;
    staff: string[];
    tags: Tag[];
    color: string;
    packageId: string | null;
    dateAdded: string;
    contacts: { id: string, name: string, session: number }[];
  }

interface Tag {
  id: string;
  name: string;
}
  const importantNotesRef = useRef<TinySliderElement>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { contacts: initialContacts} = useContacts();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [closed, setClosed] = useState(0);
  const [unclosed, setUnclosed] = useState(0);
  const [numReplies, setReplies] = useState(0);
  const [abandoned, setAbandoned] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [contactsOverTime, setContactsOverTime] = useState<{ date: string; count: number }[]>([]);
  const [contactsTimeFilter, setContactsTimeFilter] = useState<'today' | '7days' | '1month' | '3months' | 'all'>('7days');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [totalAppointments, setTotalAppointments] = useState(0);
  // Add these new state variables
  const [responseRate, setResponseRate] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [leadsOverview, setLeadsOverview] = useState<{
    total: number;
    today: number;
    week: number;
    month: number;
  }>({ total: 0, today: 0, week: 0, month: 0 });
  const [phoneLineStats, setPhoneLineStats] = useState<Array<{
    phoneIndex: number;
    totalAssignments: number;
    uniqueContacts: number;
    activeAgents: number;
  }>>([]);
  const [averageRepliesPerLead, setAverageRepliesPerLead] = useState(0);
  const [engagementScore, setEngagementScore] = useState(0);
  // Add this new state variable for the search query
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [monthlyTokens, setMonthlyTokens] = useState<number>(0);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [monthlySpendData, setMonthlySpendData] = useState<{ labels: string[], datasets: any[] }>({ labels: [], datasets: [] });
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => 
      employee.name.toLowerCase().includes(employeeSearchQuery.toLowerCase())
    );
  }, [employees, employeeSearchQuery]);
  useEffect(() => {
    fetchMonthlyTokens();
  }, []);

  const fetchMonthlyTokens = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;
      const userRes = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`);
      const companyId = userRes.data.company_id;
      const res = await axios.get(`https://juta-dev.ngrok.dev/api/companies/${companyId}/monthly-usage`);
      const usage = res.data.usage;
  
      const labels = usage.map((row: any) => row.month);
      const data = usage.map((row: any) => (row.total_tokens / 1000) * 0.003);
  
      setMonthlySpendData({
        labels,
        datasets: [
          {
            label: 'Monthly Spend',
            data,
            backgroundColor: '#82ca9d',
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching monthly tokens:', error);
    }
  };

  const calculateMonthlyPrice = (tokens: number) => {
    const price = (tokens / 1000) * 0.003;
    
    setMonthlyPrice(price);
  };


  useEffect(() => {
    fetchCompanyData();
  }, []);
  async function fetchAppointments() {
    try {
      // TODO: Replace with actual appointments API when available
      // For now, setting a placeholder value
      setTotalAppointments(0);
      
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  }
  // Add a new useEffect to fetch appointments after employees are loaded
  useEffect(() => {
    if (employees.length > 0) {
      fetchAppointments();
    }
  }, [employees]);
  const filteredNotifications = notifications.filter((notification) => {
    return (
      notification.from_name.toLowerCase().includes(searchQuery) ||
      (notification.text && notification.text.body.toLowerCase().includes(searchQuery))
    );
  });

  useEffect(() => {
    fetchConfigFromDatabase();
    return () => {

    };
  }, []);

  async function fetchConfigFromDatabase() {
    // Get the stored user email from your login response
    const userEmail = localStorage.getItem('userEmail'); // or however you store it after login
    
    if (!userEmail) {
      console.error("No user email found.");
      return;
    }
  
    try {
      // Fetch user data from SQL database
      const response = await fetch(`https://juta-dev.ngrok.dev/api/user/config?email=${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json'
        }
      });
  
  
      if (!response.ok) {
        throw new Error('Failed to fetch user config');
      }
  
      const dataUser = await response.json();
      
      if (!dataUser) {
        return;
      }
  
      const companyId = dataUser.company_id;
      const role = dataUser.role;
  
      if (!companyId) {
        return;
      }
  
      // Fetch company data
      const companyResponse = await fetch(`https://juta-dev.ngrok.dev/api/companies/${companyId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      if (!companyResponse.ok) {
        throw new Error('Failed to fetch company data');
      }
  
      const data = await companyResponse.json();
      
      if (!data) {
        return;
      }
  
      // Fetch contacts with replies
   /*   const repliesResponse = await fetch(`https://juta-dev.ngrok.dev/api/companies/${companyId}/replies`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      if (!repliesResponse.ok) {
        throw new Error('Failed to fetch replies data');
      }
  
      const repliesData = await repliesResponse.json();
     // setReplies(repliesData.contactsWithReplies);*/
  
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }

  
  useEffect(() => {
    fetchCompanyData();
  }, []);

  

  async function fetchEmployeeData(employeeId: string): Promise<Employee | null> {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return null;

      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) return null;

      // Get employees data
      const employeesResponse = await axios.get(`https://juta-dev.ngrok.dev/api/employees-data/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const employees = employeesResponse.data;
      const employeeData = employees.find((emp: any) => emp.id === employeeId);
      
      if (!employeeData) return null;

      // Get contacts data
      const contactsResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/companies/${companyId}/contacts?email=${encodeURIComponent(userEmail)}`,
        {
          headers: {}
        }
      );
      // Handle API response format { success, total, contacts: [...] }
      const contacts = contactsResponse.data.contacts || [];
      
      // Create a timeline of assignments
      const assignmentTimeline: { date: Date; count: number }[] = [];
      
      contacts.forEach((contactData: any) => {
        if (contactData.tags?.includes(employeeData.name)) {
          const assignmentDate = contactData.createdAt ? new Date(contactData.createdAt) : null;
          if (assignmentDate) {
            assignmentTimeline.push({
              date: assignmentDate,
              count: 1
            });
          }
        }
      });

      // Sort timeline by date
      assignmentTimeline.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate cumulative totals by month
      const monthlyAssignments: { [key: string]: number } = {};
      let runningTotal = 0;

      assignmentTimeline.forEach((assignment) => {
        const monthKey = format(assignment.date, 'yyyy-MM');
        runningTotal += assignment.count;
        monthlyAssignments[monthKey] = runningTotal;
      });

      // Ensure we have at least one data point if there are assigned contacts
      if (Object.keys(monthlyAssignments).length === 0 && employeeData.assignedContacts > 0) {
        const currentMonth = format(new Date(), 'yyyy-MM');
        monthlyAssignments[currentMonth] = employeeData.assignedContacts;
      }

      // Count current closed contacts for this employee
      const closedContacts = contacts.filter((contactData: any) => {
        // Check if contact is closed and assigned to this employee by tag
        const tags = contactData.tags?.map((tag: string) => tag.toLowerCase()) || [];
        console.log(`Checking contact tags for closed status: ${tags}`);
        return tags.includes('closed') && tags.includes(employeeData.name.toLowerCase());
      }).length;

      console.log(`Fetched employee data for ${employeeData.name}:`, {
        assignedContacts: employeeData.assignedContacts,
        monthlyAssignments,
        closedContacts
      });

      return {
        ...employeeData,
        monthlyAssignments,
        closedContacts
      };

    } catch (error) {
      console.error('Error fetching employee data:', error);
      return null;
    }
  }

  // Add this useEffect to log the selected employee
  useEffect(() => {
    if (selectedEmployee) {
      
      
    }
  }, [selectedEmployee]);

  // Modify the existing useEffect for selectedEmployee
 /* useEffect(() => {
    if (selectedEmployee) {
      const employeeRef = doc(firestore, `companies/${companyId}/employee/${selectedEmployee.id}`);
      const monthlyAssignmentsRef = collection(employeeRef, 'monthlyAssignments');
      
      const unsubscribe = onSnapshot(monthlyAssignmentsRef, (snapshot) => {
        const updatedMonthlyAssignments: { [key: string]: number } = {};
        snapshot.forEach((doc) => {
          updatedMonthlyAssignments[doc.id] = doc.data().assignments;
        });
        
        setSelectedEmployee(prevState => ({
          ...prevState!,
          monthlyAssignments: updatedMonthlyAssignments
        }));
      });

      return () => unsubscribe();
    }
  }, [selectedEmployee?.id, companyId]);*/
  
  // Usage in your component
  useEffect(() => {
    async function loadEmployeeData() {
      if (currentUser && currentUser.id) {
        const employeeData = await fetchEmployeeData(currentUser.id);
        if (employeeData) {
          setSelectedEmployee(employeeData);
        }
      }
    }
  
    if (currentUser) {
      loadEmployeeData();
    }
  }, [currentUser]);

  const getLast12MonthsData = (monthlyAssignments: { [key: string]: number } = {}, assignedContacts: number = 0) => {
    const last12Months = [];
    const currentDate = new Date();
    let lastKnownTotal = 0;

    // If we have no monthly assignments but have assigned contacts, create a data point
    if (Object.keys(monthlyAssignments).length === 0 && assignedContacts > 0) {
      const currentMonth = format(currentDate, 'yyyy-MM');
      monthlyAssignments[currentMonth] = assignedContacts;
    }

    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = format(date, 'yyyy-MM');
      
      // Use the last known total if no new assignments in this month
      const monthTotal = monthlyAssignments[monthKey] || lastKnownTotal;
      lastKnownTotal = monthTotal;

      last12Months.push({
        month: format(date, 'MMM'),
        year: date.getFullYear(),
        assignments: monthTotal
      });
    }
    
    return last12Months;
  };

  const chartData = useMemo(() => {
    if (!selectedEmployee) return null;

    // Create a fallback data point if there are no monthly assignments but there are assigned contacts
    let monthlyAssignments = selectedEmployee.monthlyAssignments || {};
    const assignedContacts = selectedEmployee.assignedContacts || 0;
    
    if (Object.keys(monthlyAssignments).length === 0 && assignedContacts > 0) {
      // Create data for the current month
      const currentMonth = format(new Date(), 'yyyy-MM');
      monthlyAssignments = { [currentMonth]: assignedContacts };
      
      // Also update the selected employee state to include this data
      setSelectedEmployee(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          monthlyAssignments: { ...monthlyAssignments }
        };
      });
    }

    // Pass both parameters to the function
    const last12Months = getLast12MonthsData(monthlyAssignments, assignedContacts);
    
    // Debug log
    console.log('Chart data for', selectedEmployee.name, last12Months);
    
    return {
      labels: last12Months.map(d => `${d.month} ${d.year}`),
      datasets: [
        {
          label: 'Total Assigned Contacts',
          data: last12Months.map(d => d.assignments),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.1,
          fill: true
        }
      ]
    };
  }, [selectedEmployee]);

  const lineChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Total Assigned Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Month',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: function(context: any) {
              return `Total Assigned: ${context.parsed.y}`;
            }
          }
        },
        title: {
          display: true,
          text: `Contact Assignment History - ${selectedEmployee?.name || 'Employee'}`,
          color: 'rgb(31, 41, 55)',
        },
      },
    } as const;
  }, [selectedEmployee]);

  // Add these new state variables
  const [closedContacts, setClosedContacts] = useState(0);
  const [openContacts, setOpenContacts] = useState(0);
  const [todayContacts, setTodayContacts] = useState(0);
  const [weekContacts, setWeekContacts] = useState(0);
  const [monthContacts, setMonthContacts] = useState(0);

  // Update this function
  async function fetchContactsData() {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      console.error('User email not found. Unable to fetch contacts data.');
      return;
    }

    try {
      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) {
        console.error('Company ID not found for user.');
        return;
      }

      // Get contacts data
      const contactsResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/companies/${companyId}/contacts?email=${encodeURIComponent(userEmail)}`,
        {
          headers: {}
        }
      );
      // Handle API response format { success, total, contacts: [...] }
      const contacts = contactsResponse.data.contacts || [];
      console.log('Contacts data structure:', contacts);
      
      let total = 0;
      let closed = 0;
      let today = 0;
      let week = 0;
      let month = 0;

      const now = new Date();
      const startOfDayTime = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      contacts.forEach((contactData: any) => {
        const dateAdded = contactData.createdAt ? new Date(contactData.createdAt) : null;

        total++;
        if (contactData.tags && contactData.tags.includes('closed')) {
          closed++;
        }

        if (dateAdded) {
          if (dateAdded >= startOfDayTime) {
            today++;
          }
          if (dateAdded >= startOfWeek) {
            week++;
          }
          if (dateAdded >= startOfMonth) {
            month++;
          }
        }
      });

      const open = total - closed;

      // Log the contacts data
      console.log('Contacts Data:', {
        totalContacts: total,
        closedContacts: closed,
        openContacts: open,
        todayContacts: today,
        weekContacts: week,
        monthContacts: month,
        numReplies: numReplies,
      });

      setTotalContacts(total);
      setClosedContacts(closed);
      setOpenContacts(open);
      setTodayContacts(today);
      setWeekContacts(week);
      setMonthContacts(month);
    } catch (error) {
      console.error('Error fetching contacts data:', error);
    }
  }

  // Add this function to calculate additional stats
  const calculateAdditionalStats = useCallback(() => {
    // Response Rate (percentage of contacts that have replied)
    const newResponseRate = totalContacts > 0 ? (numReplies / totalContacts) * 100 : 0;
    setResponseRate(Number(newResponseRate.toFixed(1))); // Use 1 decimal place for percentage
  
    // Average Replies per Lead
   // const newAverageRepliesPerLead = totalContacts > 0 ? numReplies / totalContacts : 0;
   // setAverageRepliesPerLead(Number(newAverageRepliesPerLead.toFixed(2))); // Use 2 decimal places
    const newBookAppointmentsRate = totalContacts > 0 ? (totalAppointments / totalContacts) * 100 : 0;
    setAverageRepliesPerLead(Number(newBookAppointmentsRate.toFixed(2)));
 // Engagement Score (weighted sum of response rate and booking appointments rate)
  // Adjust weights as needed; the sum should be 1 for better scaling
  const responseWeight = 0.15; // weight for response rate
  const appointmentWeight = 0.35; // weight for booking appointments rate
  const closedContactsWeight = 0.5;
  const newClosedContactsRate = totalContacts > 0 ? (closedContacts / totalContacts) * 100 : 0;

  const newEngagementScore = (newResponseRate * responseWeight) + 
  (newBookAppointmentsRate * appointmentWeight) + 
  (newClosedContactsRate * closedContactsWeight);

setEngagementScore(Number(newEngagementScore.toFixed(2)));
  }, [numReplies, totalContacts, totalAppointments]);

  // Update useEffect to call calculateAdditionalStats
  useEffect(() => {
    const initializeData = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      try {
        // Get companyId from user data
        const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        companyId = userResponse.data.company_id;
        
        if (companyId) {
          fetchContactsData();
          calculateAdditionalStats();
          fetchClosedContactsByEmployee();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, [calculateAdditionalStats]);

  // Modify the handleEmployeeSelect function
  const handleEmployeeSelect = async (employee: Employee) => {
    console.log('Employee selected:', employee);
    setLoading(true);
    
    try {
      // Fetch complete employee data including monthly assignments
      const completeEmployeeData = await fetchEmployeeData(employee.id);
      
      if (completeEmployeeData) {
        console.log('Complete employee data:', completeEmployeeData);
        setSelectedEmployee(completeEmployeeData);
        fetchEmployeeStats(completeEmployeeData.id);
      } else {
        // If we couldn't fetch complete data, still update with what we have
        setSelectedEmployee(employee);
        fetchEmployeeStats(employee.id);
      }
    } catch (error) {
      console.error('Error in handleEmployeeSelect:', error);
      // Still update with basic employee data if there's an error
      setSelectedEmployee(employee);
      fetchEmployeeStats(employee.id);
    } finally {
      setLoading(false);
    }
  };

  // Add new state for tag filter
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Add function to fetch available tags
  const fetchAvailableTags = async () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;
    
    try {
      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) return;

      // Get tags data
      const tagsResponse = await axios.get(`https://juta-dev.ngrok.dev/api/companies/${companyId}/tags`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const tags = tagsResponse.data.map((tag: any) => tag.name);
      
      setAvailableTags(tags.sort());
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  // Modify the existing fetchContactsOverTime function
  const fetchContactsOverTime = async (filter: 'today' | '7days' | '1month' | '3months' | 'all') => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      console.error('User email not found. Unable to fetch contacts data.');
      return;
    }

    try {
      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {}
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) return;

      // Get contacts data
      const contactsResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/companies/${companyId}/contacts?email=${encodeURIComponent(userEmail)}`,
        {
          headers: {}
        }
      );

      // The API returns { success, total, contacts: [...] }
      const contacts = contactsResponse.data.contacts;
      if (!Array.isArray(contacts)) {
        console.error('Contacts data is not an array:', contacts);
        return;
      }

      console.log('Total contacts fetched:', contacts.length);
      console.log('Selected tag filter:', selectedTag);

      const now = new Date();
      let startDate: Date;

      switch (filter) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case '7days':
          startDate = subDays(now, 7);
          break;
        case '1month':
          startDate = subDays(now, 30);
          break;
        case '3months':
          startDate = subMonths(now, 3);
          break;
        default: // 'all'
          startDate = subMonths(now, 12);
          break;
      }

      console.log('Date range:', { startDate, endDate: now });

      const contactCounts: { [key: string]: number } = {};
      let filteredContacts = 0;

      contacts.forEach((contactData: any) => {
        // Tag filter
        if (selectedTag !== 'all') {
          if (!contactData.tags || !contactData.tags.includes(selectedTag)) {
            return;
          }
        }

        // Use createdAt field
        const createdAt = contactData.createdAt ? new Date(contactData.createdAt) : null;
        if (!createdAt) {
          console.log('Contact without createdAt:', contactData.id);
          return;
        }

        if (createdAt < startDate) {
          return;
        }

        filteredContacts++;

        let dateKey;
        if (filter === 'today') {
          dateKey = format(createdAt, 'HH:00');
        } else if (filter === 'all') {
          dateKey = format(createdAt, 'yyyy-MM');
        } else {
          dateKey = format(createdAt, 'yyyy-MM-dd');
        }

        contactCounts[dateKey] = (contactCounts[dateKey] || 0) + 1;
      });

      console.log('Filtered contacts count:', filteredContacts);
      console.log('Contact counts by date:', contactCounts);

      let timePoints: Date[];
      if (filter === 'today') {
        timePoints = eachHourOfInterval({ start: startDate, end: now });
      } else if (filter === 'all') {
        timePoints = [];
        let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (currentDate <= now) {
          timePoints.push(new Date(currentDate));
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else {
        timePoints = eachDayOfInterval({ start: startDate, end: now });
      }

      // Show actual counts per period, not cumulative
      const sortedData = timePoints.map(date => {
        const dateKey = filter === 'today'
          ? format(date, 'HH:00')
          : filter === 'all'
            ? format(date, 'yyyy-MM')
            : format(date, 'yyyy-MM-dd');

        const count = contactCounts[dateKey] || 0;

        return {
          date: filter === 'today'
            ? format(date, 'HH:mm')
            : filter === 'all'
              ? format(date, 'MMM yyyy')
              : format(date, 'MMM dd'),
          count: count
        };
      });

      console.log('Final chart data:', sortedData);
      setContactsOverTime(sortedData);

    } catch (error) {
      console.error('Error fetching contacts over time data:', error);
    }
  };

  // Add useEffect to fetch tags when component mounts
  useEffect(() => {
    const initializeTags = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        await fetchAvailableTags();
      }
    };
    initializeTags();
  }, []);

  // Modify the existing useEffect to include selectedTag dependency
  useEffect(() => {
    const fetchData = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        console.log('Fetching contacts with tag:', selectedTag); // Debug log
        await fetchContactsOverTime(contactsTimeFilter);
      }
    };
    fetchData();
  }, [contactsTimeFilter, selectedTag]); // Add selectedTag as dependency

  const totalContactsChartData = useMemo(() => {
    return {
      labels: contactsOverTime.map(d => d.date),
      datasets: [{
        label: 'Total Contacts',
        data: contactsOverTime.map(d => d.count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    };
  }, [contactsOverTime]);

  const totalContactsChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          title: {
            display: true,
            text: 'Number of Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: Math.max(1, Math.ceil(Math.max(...contactsOverTime.map(d => d.count)) / 10)),
          },
        },
        x: {
          title: {
            display: true,
            text: contactsTimeFilter === 'today' ? 'Hour' : 
                  contactsTimeFilter === 'all' ? 'Month' : 'Date',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            maxTicksLimit: contactsTimeFilter === 'today' ? 24 : 
                          contactsTimeFilter === 'all' ? undefined : 10,
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Total Contacts Over Time',
          color: 'rgb(31, 41, 55)',
        },
      },
      barPercentage: 0.9,
      categoryPercentage: 0.9,
      onClick: (event: any, elements: any[]) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const label = contactsOverTime[index].date;
          setSelectedPeriodLabel(label);
          
          // Calculate period start and end based on the filter
          let periodStart: Date;
          let periodEnd: Date;
          
          if (contactsTimeFilter === 'today') {
            // For hourly view
            const [hours] = label.split(':');
            periodStart = new Date();
            periodStart.setHours(parseInt(hours), 0, 0, 0);
            periodEnd = new Date(periodStart);
            periodEnd.setHours(periodStart.getHours() + 1);
          } else if (contactsTimeFilter === 'all') {
            // For monthly view
            const [month, year] = label.split(' ');
            periodStart = new Date(parseInt(year), new Date(Date.parse(`${month} 1, ${year}`)).getMonth(), 1);
            periodEnd = new Date(periodStart);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else {
            // For daily view
            periodStart = parse(label, 'MMM dd', new Date());
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 1);
          }
          
          fetchContactsForPeriod(periodStart, periodEnd);
        }
      },
    } as const;
  }, [contactsOverTime, contactsTimeFilter, selectedTag]);

  const [closedContactsByEmployee, setClosedContactsByEmployee] = useState<{ [key: string]: number }>({});

  async function fetchClosedContactsByEmployee() {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      console.error('User email not found. Unable to fetch closed contacts data.');
      return;
    }

    try {
      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) return;

      // Get contacts data
      const contactsResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/companies/${companyId}/contacts?email=${encodeURIComponent(userEmail)}`,
        {
          headers: {}
        }
      );
      // Handle API response format { success, total, contacts: [...] }
      const contacts = contactsResponse.data.contacts || [];
      
      const closedContacts: { [key: string]: number } = {};

      contacts.forEach((contactData: any) => {
        if (contactData.tags && contactData.tags.includes('closed') && contactData.assignedTo) {
          closedContacts[contactData.assignedTo] = (closedContacts[contactData.assignedTo] || 0) + 1;
        }
      });

      setClosedContactsByEmployee(closedContacts);
    } catch (error) {
      console.error('Error fetching closed contacts data:', error);
    }
  }

  const closedContactsChartData = useMemo(() => {
    if (!employees || !closedContactsByEmployee) return null;

    const labels = employees.map(emp => emp.name);
    const data = employees.map(emp => closedContactsByEmployee[emp.id] || 0);

    return {
      labels: labels,
      datasets: [{
        label: 'Closed Contacts',
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    };
  }, [employees, closedContactsByEmployee]);

  const closedContactsChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Number of Closed Contacts',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Employees',
            color: 'rgb(75, 85, 99)',
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Closed Contacts by Employee',
          color: 'rgb(31, 41, 55)',
        },
      },
    } as const;
  }, []);

  // Add these new state variables near the top of your component
  const [blastMessageData, setBlastMessageData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
  }>({
    labels: [],
    datasets: []
  });

  // Add this new function to fetch blast message data
  const fetchBlastMessageData = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;
      const userRes = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`);
      const companyId = userRes.data.company_id;
      const res = await axios.get(`https://juta-dev.ngrok.dev/api/companies/${companyId}/scheduled-messages-summary`);
      const summary = res.data.summary;
  
      // Process into chart data
      const monthlyData: { [key: string]: { scheduled: number; completed: number; failed: number } } = {};
      summary.forEach((row: any) => {
        if (!monthlyData[row.month_key]) {
          monthlyData[row.month_key] = { scheduled: 0, completed: 0, failed: 0 };
        }
        if (row.status === 'sent') monthlyData[row.month_key].completed = Number(row.count);
        else if (row.status === 'failed') monthlyData[row.month_key].failed = Number(row.count);
        else monthlyData[row.month_key].scheduled = Number(row.count);
      });
  
      const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const yearDiff = parseInt(yearA) - parseInt(yearB);
        if (yearDiff !== 0) return yearDiff;
        return monthNames.indexOf(monthA) - monthNames.indexOf(monthB);
      });
  
      setBlastMessageData({
        labels: sortedMonths,
        datasets: [
          { label: 'Scheduled', data: sortedMonths.map(m => monthlyData[m].scheduled), backgroundColor: 'rgba(54, 162, 235, 0.8)' },
          { label: 'Completed', data: sortedMonths.map(m => monthlyData[m].completed), backgroundColor: 'rgba(75, 192, 192, 0.8)' },
          { label: 'Failed', data: sortedMonths.map(m => monthlyData[m].failed), backgroundColor: 'rgba(255, 99, 132, 0.8)' },
        ],
      });
    } catch (error) {
      console.error('Error fetching scheduled messages data:', error);
    }
  };

  // Add useEffect to fetch blast message data
  useEffect(() => {
    fetchBlastMessageData();
  }, []);

  // Add this new interface
  interface EmployeeStats {
    conversationsAssigned: number;
    outgoingMessagesSent: number;
    averageResponseTime: number;
    closedContacts: number;
    currentMonthAssignments?: number;
    employeeName?: string;
    employeeRole?: string;
    responseTimes?: Array<{
      contactId: string;
      responseTime: number;
      timestamp: string;
    }>;
    medianResponseTime?: number;
    phoneAssignments?: { [key: string]: number };
    weightageUsed?: { [key: string]: any };
  }

  // Add this new state
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  async function fetchCompanyData() {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;
  
      // Get companyId from user-data endpoint
      const userRes = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`);
      const companyId = userRes.data.company_id;
      if (!companyId) return;

      // Use the new dashboard endpoint that provides comprehensive data
      const dashboardRes = await axios.get(`https://juta-dev.ngrok.dev/api/dashboard/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const dashboardData = dashboardRes.data;

      // Update state with dashboard data
      if (dashboardData) {
        // Set total contacts from KPI data
        total_contacts = dashboardData.kpi.totalContacts;
        setTotalContacts(dashboardData.kpi.totalContacts);
        setClosedContacts(dashboardData.kpi.closedContacts);
        setOpenContacts(dashboardData.kpi.openContacts);
        setReplies(dashboardData.kpi.numReplies);
        
        // Set engagement metrics
        if (dashboardData.engagementMetrics) {
          setResponseRate(parseFloat(dashboardData.engagementMetrics.responseRate));
          setEngagementScore(parseFloat(dashboardData.engagementMetrics.engagementScore));
          setConversionRate(parseFloat(dashboardData.engagementMetrics.conversionRate));
        }
        
        // Set leads overview
        if (dashboardData.leadsOverview) {
          setLeadsOverview(dashboardData.leadsOverview);
        }
        
        // Set phone line stats
        if (dashboardData.phoneLineStats) {
          setPhoneLineStats(dashboardData.phoneLineStats);
        }
        
        // Set employee data from the dashboard response
        const employeeListData: Employee[] = dashboardData.employeePerformance.map((emp: any) => ({
          id: emp.employee_id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          phone: emp.phone_number,
          assignedContacts: emp.assignedContacts || 0,
          outgoingMessages: emp.outgoingMessages || 0,
          closedContacts: emp.closedContacts || 0,
          currentMonthAssignments: emp.current_month_assignments || 0
        }));

        // If no employee has assigned contacts, try to get assignment data from the assignments table
        const hasAssignments = employeeListData.some(emp => emp.assignedContacts > 0);
        if (!hasAssignments) {
          console.log('No assignments found in dashboard data, fetching from assignments endpoint...');
          try {
            // Get assignments data from the separate employees endpoint
            const employeesResponse = await axios.get(`https://juta-dev.ngrok.dev/api/employees-data/${companyId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            const employeesData = employeesResponse.data;

            // Get contacts data to count assignments by employee tags
            const contactsResponse = await axios.get(
              `https://juta-dev.ngrok.dev/api/companies/${companyId}/contacts?email=${encodeURIComponent(userEmail)}`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            const contacts = contactsResponse.data.contacts || [];

            console.log('Sample contact for debugging assignments:', contacts[0]);
            console.log('Available employees:', employeesData.map((emp: any) => emp.name));

            // Create a map to count contacts per employee
            const contactCountMap: { [key: string]: number } = {};
            const closedCountMap: { [key: string]: number } = {};
            
            contacts.forEach((contact: any) => {
              if (contact.tags && Array.isArray(contact.tags)) {
                // Method 1: Check if tags contain assigned_to property (from server.js logic)
                if (contact.tags.assigned_to) {
                  const employeeName = contact.tags.assigned_to;
                  contactCountMap[employeeName] = (contactCountMap[employeeName] || 0) + 1;
                  
                  if (contact.tags.closed === true) {
                    closedCountMap[employeeName] = (closedCountMap[employeeName] || 0) + 1;
                  }
                }
                
                // Method 2: Check if employee names are in tags array
                contact.tags.forEach((tag: string) => {
                  // Find employee by name
                  const employee = employeesData.find((emp: any) => emp.name.toLowerCase() === tag.toLowerCase());
                  if (employee) {
                    contactCountMap[employee.name] = (contactCountMap[employee.name] || 0) + 1;
                    
                    // Check if contact is closed
                    if (contact.tags.some((t: string) => t.toLowerCase() === 'closed')) {
                      closedCountMap[employee.name] = (closedCountMap[employee.name] || 0) + 1;
                    }
                  }
                });
              }
            });

            // Update employee data with assignment counts
            employeeListData.forEach(emp => {
              emp.assignedContacts = contactCountMap[emp.name] || 0;
              emp.closedContacts = closedCountMap[emp.name] || 0;
            });

            console.log('Updated employee assignments:', contactCountMap);
            
            // If still no assignments found, try using the current month assignments from the dashboard data
            if (Object.keys(contactCountMap).length === 0) {
              console.log('No assignments found via contacts, using current_month_assignments from dashboard...');
              employeeListData.forEach(emp => {
                emp.assignedContacts = emp.currentMonthAssignments || 0;
              });
            }
          } catch (fallbackError) {
            console.error('Error fetching fallback assignment data:', fallbackError);
          }
        }

        // Sort employees by assigned contacts
        employeeListData.sort((a, b) => (b.assignedContacts || 0) - (a.assignedContacts || 0));
        setEmployees(employeeListData);

        // Find current user
        const currentUserData = employeeListData.find(emp => emp.email === userEmail);
        if (currentUserData) {
          setCurrentUser(currentUserData);
          setSelectedEmployee(currentUserData);
        }

        // Set company data - companyId is already available from userRes
        
        console.log('Dashboard data loaded:', dashboardData);
        console.log('Employee performance data:', dashboardData.employeePerformance);
        console.log('Final employee list with assignments:', employeeListData);
      }
  
    } catch (error) {
      console.error('Error fetching company data:', error);
      // Fallback to original method if new endpoint fails
      try {
        const companyRes = await axios.get(`https://juta-dev.ngrok.dev/api/company-config/${companyId}`);
        const companyData = companyRes.data.companyData;
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
      }
    }
  }

  // Add this new function
  const fetchEmployeeStats = async (employeeId: string) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setError("User not authenticated");
        return;
      }
      // Get companyId from user-data endpoint
      const userRes = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`);
      const companyId = userRes.data.company_id;
      if (!companyId) return;
  
      // Fetch stats from the new stats endpoint
      const response = await axios.get(
        `https://juta-dev.ngrok.dev/api/stats/${companyId}?employeeId=${employeeId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const statsData = response.data;
      setEmployeeStats({
        conversationsAssigned: statsData.conversationsAssigned || 0,
        outgoingMessagesSent: statsData.outgoingMessagesSent || 0,
        averageResponseTime: statsData.averageResponseTime || 0,
        closedContacts: statsData.closedContacts || 0,
        currentMonthAssignments: statsData.currentMonthAssignments || 0,
        employeeName: statsData.employeeName || '',
        employeeRole: statsData.employeeRole || '',
        responseTimes: statsData.responseTimes || [],
        medianResponseTime: statsData.medianResponseTime || 0,
        phoneAssignments: statsData.phoneAssignments || {},
        weightageUsed: statsData.weightageUsed || {}
      });
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      setEmployeeStats({
        conversationsAssigned: 0,
        outgoingMessagesSent: 0,
        averageResponseTime: 0,
        closedContacts: 0
      });
    }
  };

  // Update useEffect to fetch stats for current user by default
  useEffect(() => {
    if (currentUser) {
      fetchEmployeeStats(currentUser.id);
      setSelectedEmployee(currentUser);
    }
  }, [currentUser]); // Dependency on currentUser

  // Add this new type near your other interfaces
  interface PerformanceMetricsData {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
    }[];
  }

  // Inside your Main component, add this new function
  const getPerformanceMetricsData = (stats: EmployeeStats | null): PerformanceMetricsData => {
    return {
      labels: ['Response Time (min)', 'Closed Contacts', 'Conversations', 'Messages Sent'],
      datasets: [
        {
          label: 'Performance Metrics',
          data: [
            stats?.averageResponseTime ? Number((stats.averageResponseTime / 60).toFixed(1)) : 0,
            stats?.closedContacts || 0,
            stats?.conversationsAssigned || 0,
            stats?.outgoingMessagesSent || 0
          ],
          borderColor: 'rgb(147, 51, 234)', // purple for response time
          backgroundColor: 'rgba(147, 51, 234, 0.2)',
          fill: true
        }
      ]
    };
  };

  // Add new interfaces and states
  interface Contact {
    id: string;
    contactName: string;
    email: string | null;
    phone: string | null;
    dateAdded: string;
    tags: string[];
    // Add other contact fields as needed
  }

  // Add these new states
  const [selectedPeriodContacts, setSelectedPeriodContacts] = useState<Contact[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState<string>('');

  // Add the function to fetch contacts for a specific period
  const fetchContactsForPeriod = async (periodStart: Date, periodEnd: Date) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) return;

      // Get contacts data
      const contactsResponse = await axios.get(`https://juta-dev.ngrok.dev/api/companies/${companyId}/contacts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      // Handle API response format { success, total, contacts: [...] }
      const contacts = contactsResponse.data.contacts || [];
      
      const periodContacts: Contact[] = [];
      
      contacts.forEach((contactData: any) => {
        if (contactData.phone && contactData.phone.startsWith('+') && contactData.createdAt) {
          const createdAt = new Date(contactData.createdAt);
          
          if (createdAt >= periodStart && createdAt < periodEnd) {
            if (selectedTag === 'all' || (contactData.tags && contactData.tags.includes(selectedTag))) {
              periodContacts.push({
                id: contactData.contact_id || contactData.id,
                additionalEmails: [],
                address1: null,
                assignedTo: contactData.assignedTo?.length > 0 ? contactData.assignedTo[0] : null,
                businessId: null,
                city: null,
                companyName: null,
                contactName: contactData.name || '',
                country: '',
                customFields: contactData.customFields || [],
                dateAdded: format(createdAt, 'MMM dd, yyyy HH:mm'),
                dateOfBirth: null,
                dateUpdated: contactData.lastUpdated || '',
                dnd: false,
                dndSettings: {},
                email: contactData.email || null,
                firstName: contactData.name?.split(' ')[0] || '',
                followers: [],
                lastName: contactData.name?.split(' ').slice(1).join(' ') || '',
                locationId: '',
                phone: contactData.phone || null,
                postalCode: null,
                source: null,
                state: null,
                tags: contactData.tags || [],
                type: contactData.isIndividual ? 'individual' : 'company',
                website: null
              });
            }
          }
        }
      });
      
      // Sort contacts by date added
      periodContacts.sort((a, b) => 
        new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      );
      
      setSelectedPeriodContacts(periodContacts);
      setIsContactModalOpen(true);
    } catch (error) {
      console.error('Error fetching contacts for period:', error);
    }
  };

  // Add the ContactsModal component
  const ContactsModal = ({ 
    isOpen, 
    onClose, 
    contacts, 
    periodLabel 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    contacts: Contact[]; 
    periodLabel: string; 
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Contacts for {periodLabel} ({contacts.length} contacts)
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Lucide icon="X" className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-auto max-h-[calc(80vh-8rem)]">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Phone</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">Date Added</th>
                  <th className="text-left p-2">Tags</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b dark:border-gray-700">
                    <td className="p-2">{`${contact.firstName} ${contact.lastName}`}</td>
                    <td className="p-2">{contact.email || '-'}</td>
                    <td className="p-2">{contact.phone || '-'}</td>
                    <td className="p-2">{contact.companyName || '-'}</td>
                    <td className="p-2">{contact.dateAdded}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Add these new interfaces and state
  interface DailyAssignment {
    date: string;
    count: number;
  }

  interface EmployeeAssignments {
    [employeeId: string]: {
      daily: DailyAssignment[];
      total: number;
    };
  }

  const [assignmentsData, setAssignmentsData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
    dailyData: EmployeeAssignments;
  }>({
    labels: [],
    datasets: [],
    dailyData: {}
  });

  // Update the fetchAssignmentsData function
  const fetchAssignmentsData = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      
      if (companyId !== '072') return;

      // TODO: Replace with actual assignments API endpoint when available
      // For now, using contacts data as a placeholder
      const contactsResponse = await axios.get(`https://juta-dev.ngrok.dev/api/companies/${companyId}/contacts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      // Handle API response format { success, total, contacts: [...] }
      const contacts = contactsResponse.data.contacts || [];

      const employeeAssignments: EmployeeAssignments = {};

      contacts.forEach((contactData: any) => {
        if (contactData.assignedTo && contactData.createdAt) {
          const date = format(new Date(contactData.createdAt), 'yyyy-MM-dd');
          
          if (!employeeAssignments[contactData.assignedTo]) {
            employeeAssignments[contactData.assignedTo] = {
              daily: [],
              total: 0
            };
          }

          const existingDayIndex = employeeAssignments[contactData.assignedTo].daily.findIndex(
            d => d.date === date
          );

          if (existingDayIndex >= 0) {
            employeeAssignments[contactData.assignedTo].daily[existingDayIndex].count++;
          } else {
            employeeAssignments[contactData.assignedTo].daily.push({ date, count: 1 });
          }
          employeeAssignments[contactData.assignedTo].total++;
        }
      });

      // Sort daily data for each employee
      Object.values(employeeAssignments).forEach(employee => {
        employee.daily.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });

      const labels = Object.keys(employeeAssignments);
      const data = labels.map(label => employeeAssignments[label].total);

      setAssignmentsData({
        labels,
        datasets: [{
          label: 'Total Assignments',
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
        }],
        dailyData: employeeAssignments
      });

    } catch (error) {
      console.error('Error fetching assignments data:', error);
    }
  };

  // Add this new function to fetch assignments data
  const dashboardCards = [
    {
      id: 'kpi',
      title: 'Key Performance Indicators',
      content: [
        { icon: "Contact", label: "Total Contacts", value: totalContacts },
        { icon: "MessageCircleReply", label: "Number Replies", value: numReplies },
        { icon: "Check", label: "Closed Contacts", value: closedContacts },
        { icon: "Mail", label: "Open Contacts", value: openContacts },
      ]
    },
    {
      id: 'engagement-metrics',
      title: 'Engagement Metrics',
      content: [
        { label: "Response Rate", value: `${responseRate}%` },
        { label: "Book Appointments Rate", value: `${averageRepliesPerLead}%` },
        { label: "Engagement Score", value: engagementScore },
        { label: "Conversion Rate", value: `${closedContacts > 0 ? ((closedContacts / totalContacts) * 100).toFixed(2) : 0}%` },
      ],
    },
    // {
    //   id: 'leads',
    //   title: 'Leads Overview',
    //   content: [
    //     { label: "Total", value: totalContacts },
    //     { label: "Today", value: todayContacts },
    //     { label: "This Week", value: weekContacts },
    //     { label: "This Month", value: monthContacts },
    //   ]
    // },
    {
      id: 'contacts-over-time',
      title: 'Contacts Over Time',
      content: totalContactsChartData,
      filter: contactsTimeFilter,
      setFilter: setContactsTimeFilter,
      // Add the tag filter UI here
      filterControls: (
        <div className="flex gap-2">
          <FormSelect
            className="w-40"
            value={contactsTimeFilter}
            onChange={(e) => setContactsTimeFilter(e.target.value as 'today' | '7days' | '1month' | '3months' | 'all')}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="all">All Time</option>
          </FormSelect>
          <FormSelect
            className="w-40"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="all">All Tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </FormSelect>
        </div>
      )
    },
    {
      id: 'employee-assignments',
      title: 'Employee Metrics',
      content: { 
        employees, 
        filteredEmployees, 
        chartData, 
        lineChartOptions, 
        currentUser, 
        selectedEmployee, 
        handleEmployeeSelect,
        closedContactsChartData,
        closedContactsChartOptions
      }
    },
    {
      id: 'blast-messages',
      title: 'Scheduled Messages Analytics',
      content: (
        <div className="h-full flex flex-col">
          {blastMessageData.labels.length > 0 ? (
            <Bar 
              data={{
                labels: blastMessageData.labels,
                datasets: [
                  {
                    label: 'Scheduled',
                    data: blastMessageData.datasets[0].data,
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                  },
                  {
                    label: 'Completed',
                    data: blastMessageData.datasets[1].data,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                  },
                  {
                    label: 'Failed',
                    data: blastMessageData.datasets[2].data,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                  },
                ]
              }}
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Number of Messages',
                      font: {
                        weight: 'bold'
                      }
                    },
                    grid: {
                      color: 'rgba(107, 114, 128, 0.1)'
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Month',
                      font: {
                        weight: 'bold'
                      }
                    },
                    grid: {
                      color: 'rgba(107, 114, 128, 0.1)'
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)'
                    }
                  },
                },
                plugins: {
                  title: {
                    display: true,
                    text: 'Monthly Scheduled Message Statistics',
                    font: {
                      size: 16,
                      weight: 'bold'
                    },
                    padding: {
                      top: 10,
                      bottom: 20
                    }
                  },
                  legend: {
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      padding: 15
                    }
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: 10,
                    cornerRadius: 4,
                    titleFont: {
                      size: 14
                    },
                    bodyFont: {
                      size: 13
                    }
                  },
                },
              }} 
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center text-gray-600 dark:text-gray-400">
              <div>
                <p className="text-lg mb-2">No scheduled message data available</p>
                <p className="text-sm">Create blast messages to see analytics here</p>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'performance-metrics',
      title: 'Employee Performance Metrics',
      content: (
        <div className="h-full">
          {employeeStats ? (
            <Bar
              data={getPerformanceMetricsData(employeeStats)}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // This makes it a horizontal bar chart
                scales: {
                  x: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(107, 114, 128, 0.1)'
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)'
                    }
                  },
                  y: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      color: 'rgb(107, 114, 128)',
                      font: {
                        weight: 'bold' as const
                      }
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  },
                  // title: {
                  //   display: true,
                  //   text: 'Employee Performance Metrics',
                  //   color: 'rgb(31, 41, 55)',
                  //   font: {
                  //     size: 16
                  //   }
                  // },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.x;
                        const metric = context.label;
                        
                        if (metric === 'Response Time (min)') {
                          return `${label}: ${value} minutes`;
                        }
                        return `${label}: ${value}`;
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No performance data available
            </div>
          )}
        </div>
      ),
    },
    // Inside your dashboardCards array, add this conditional card
    ...(companyId === '072' ? [{
      id: 'assignments-chart',
      title: 'Assignments by Employee',
      content: (
        <div className="h-[500px]"> {/* Fixed height */}
          <div className="h-[300px]"> {/* Chart height */}
            {assignmentsData.labels.length > 0 ? (
              <Bar 
                data={assignmentsData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Number of Assignments',
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Employee',
                      },
                    },
                  },
                  plugins: {
                    title: {
                      display: true,
                      text: 'Assignments Distribution',
                    },
                    tooltip: {
                      callbacks: {
                        afterBody: (tooltipItems) => {
                          const employeeId = assignmentsData.labels[tooltipItems[0].dataIndex];
                          const employeeData = assignmentsData.dailyData[employeeId];
                          if (!employeeData) return '';

                          // Show last 5 days of assignments
                          const recentAssignments = employeeData.daily.slice(-5);
                          return '\nRecent daily assignments:\n' + 
                            recentAssignments.map(day => 
                              `${format(new Date(day.date), 'MMM dd')}: ${day.count} assignments`
                            ).join('\n');
                        }
                      }
                    },
                  },
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No assignments data available
              </div>
            )}
          </div>
          
          {/* Daily breakdown table */}
          <div className="mt-4 h-[160px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                <tr>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Last 5 Days</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsData.labels.map(employeeId => {
                  const employeeData = assignmentsData.dailyData[employeeId];
                  const recentAssignments = employeeData.daily.slice(-5);
                  
                  return (
                    <tr key={employeeId} className="border-t dark:border-gray-700">
                      <td className="p-2">{employeeId}</td>
                      <td className="p-2">{employeeData.total}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          {recentAssignments.map(day => (
                            <div key={day.date} className="text-xs">
                              <div>{format(new Date(day.date), 'MM/dd')}</div>
                              <div className="font-semibold">{day.count}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )
    }] : []),
    // Add more cards here as needed
  ];

  // Add this new function to handle contact assignment
  const assignContactToEmployee = async (contactId: string, employeeName: string) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        console.error('No authenticated user');
        return;
      }

      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) return;

      // Add tag to contact using API
      await axios.post(`https://juta-dev.ngrok.dev/api/contacts/${companyId}/${contactId}/tags`, {
        tags: [employeeName]
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update monthly assignments
      await updateMonthlyAssignments(employeeName, 1);

    } catch (error) {
      console.error('Error assigning contact:', error);
    }
  };

  // Add this function to remove assignment
  const removeContactAssignment = async (contactId: string, employeeName: string) => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        console.error('No authenticated user');
        return;
      }

      // Get companyId from user data
      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) return;

      // Remove tag from contact using API
      await axios.delete(`https://juta-dev.ngrok.dev/api/contacts/${companyId}/${contactId}/tags`, {
        data: { tags: [employeeName] },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update monthly assignments
      await updateMonthlyAssignments(employeeName, -1);

    } catch (error) {
      console.error('Error removing contact assignment:', error);
    }
  };

  // Example usage:
  // To assign a contact:
  // await assignContactToEmployee("contactId123", "John Doe");

  // To remove an assignment:
  // await removeContactAssignment("contactId123", "John Doe");

  const handleAssignContact = async (contactId: string, employeeName: string) => {
    await assignContactToEmployee(contactId, employeeName);
    // Refresh the employee list or update the UI as needed
    await fetchCompanyData();
  };

  const handleUnassignContact = async (contactId: string, employeeName: string) => {
    await removeContactAssignment(contactId, employeeName);
    // Refresh the employee list or update the UI as needed
    await fetchCompanyData();
  };

  // Add this debug function to help diagnose issues
  const debugEmployeeData = (employee: Employee | null) => {
    if (!employee) {
      console.log('No employee selected');
      return;
    }
    
    console.log('Employee Debug Info:', {
      name: employee.name,
      id: employee.id,
      assignedContacts: employee.assignedContacts,
      monthlyAssignments: employee.monthlyAssignments,
      hasMonthlyData: employee.monthlyAssignments && Object.keys(employee.monthlyAssignments).length > 0,
      chartData: chartData
    });
  };

  // Call this in the useEffect for selectedEmployee
  useEffect(() => {
    if (selectedEmployee) {
      debugEmployeeData(selectedEmployee);
    }
  }, [selectedEmployee, chartData]);

  return (
    <div className="flex flex-col w-full h-full overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* Dashboard Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm mb-6 p-6">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's an overview of your CRM data.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        {/* KPIs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {dashboardCards.find(card => card.id === 'kpi')?.content && Array.isArray(dashboardCards.find(card => card.id === 'kpi')?.content) 
            ? (dashboardCards.find(card => card.id === 'kpi')?.content as any[]).map((item: any, index: number) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                  <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {!loading ? item.value : (
                      <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    )}
                  </h3>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  {item.icon && <Lucide icon={item.icon} className="w-5 h-5" />}
                </div>
              </div>
            </div>
          )) : null}
        </div>
        
        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {dashboardCards.find(card => card.id === 'engagement-metrics')?.content && Array.isArray(dashboardCards.find(card => card.id === 'engagement-metrics')?.content)
            ? (dashboardCards.find(card => card.id === 'engagement-metrics')?.content as any[]).map((item: any, index: number) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-all hover:shadow-md">
              <div className="flex flex-col">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                  {!loading ? item.value : (
                    <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  )}
                </h3>
                <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ 
                      width: `${typeof item.value === 'string' && item.value.includes('%') 
                        ? parseFloat(item.value) 
                        : typeof item.value === 'number' 
                          ? Math.min(item.value * 10, 100) 
                          : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )) : null}
        </div>
        
        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contacts Over Time */}
          {dashboardCards.find(card => card.id === 'contacts-over-time') && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {dashboardCards.find(card => card.id === 'contacts-over-time')?.title}
                </h3>
                <div className="flex space-x-2">
                  {dashboardCards.find(card => card.id === 'contacts-over-time')?.filterControls}
                </div>
              </div>
              <div className="p-6 flex-grow">
                {('datasets' in totalContactsChartData) ? (
                  <Bar data={totalContactsChartData} options={totalContactsChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500 dark:text-gray-400">No data available</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employee Metrics */}
          {dashboardCards.find(card => card.id === 'employee-assignments') && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {dashboardCards.find(card => card.id === 'employee-assignments')?.title}
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Employee
                  </label>
                  <EmployeeSearch 
                    employees={employees}
                    onSelect={(employee: { id: string; name: string; assignedContacts?: number | undefined; }) => 
                      handleEmployeeSelect(employee as Employee)}
                    currentUser={currentUser}
                  />
                </div>
              </div>
              <div className="p-6 flex-grow">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading employee data...</span>
                  </div>
                ) : selectedEmployee ? (
                  chartData ? (
                    <div>
                      <div className="flex items-center mb-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">
                          {selectedEmployee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{selectedEmployee.name}</span>
                        <span className="mx-2">•</span>
                        <span>{selectedEmployee.assignedContacts || 0} assigned contacts</span>
                      </div>
                      <div className="h-64">
                        <Line data={chartData} options={lineChartOptions} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-600 dark:text-gray-400">
                      <Lucide icon="BarChart2" className="w-10 h-10 text-gray-400 mb-3" />
                      <p>No assignment data available for this employee</p>
                      <p className="text-sm mt-1">Employee has {selectedEmployee.assignedContacts || 0} assigned contacts</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-600 dark:text-gray-400">
                    <Lucide icon="User" className="w-10 h-10 text-gray-400 mb-3" />
                    <p>Select an employee to view their chart</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Blast Messages */}
          {dashboardCards.find(card => card.id === 'blast-messages') && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {dashboardCards.find(card => card.id === 'blast-messages')?.title}
                </h3>
                <Link to="blast-history">
                  <Button variant="primary" size="sm" className="shadow-sm">
                    <Lucide icon="ExternalLink" className="w-4 h-4 mr-1" />
                    Blast History
                  </Button>
                </Link>
              </div>
              <div className="p-6 flex-grow">
                <div className="h-80">
                  {blastMessageData.labels.length > 0 ? (
                    <Bar data={blastMessageData} options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Number of Messages',
                            font: {
                              weight: 'bold'
                            }
                          },
                          grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                          },
                          ticks: {
                            color: 'rgb(107, 114, 128)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Month',
                            font: {
                              weight: 'bold'
                            }
                          },
                          grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                          },
                          ticks: {
                            color: 'rgb(107, 114, 128)'
                          }
                        },
                      },
                      plugins: {
                        title: {
                          display: false,
                        },
                        legend: {
                          position: 'top',
                          labels: {
                            usePointStyle: true,
                            boxWidth: 6,
                            padding: 15
                          }
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          padding: 10,
                          cornerRadius: 4,
                          titleFont: {
                            size: 14
                          },
                          bodyFont: {
                            size: 13
                          }
                        },
                      },
                    }} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 dark:text-gray-400">
                      <Lucide icon="Mail" className="w-10 h-10 text-gray-400 mb-3" />
                      <p className="text-lg mb-2">No scheduled message data available</p>
                      <p className="text-sm">Create blast messages to see analytics here</p>
                    </div>
                  )}
                </div>

                {blastMessageData.labels.length > 0 && (
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Scheduled:</p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {blastMessageData.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed:</p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {blastMessageData.datasets[1].data.reduce((a, b) => a + b, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Failed:</p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        {blastMessageData.datasets[2].data.reduce((a, b) => a + b, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Performance Metrics */}
          {dashboardCards.find(card => card.id === 'performance-metrics') && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {dashboardCards.find(card => card.id === 'performance-metrics')?.title}
                </h3>
              </div>
              <div className="p-6 flex-grow">
                {employeeStats ? (
                  <Bar
                    data={getPerformanceMetricsData(employeeStats)}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      scales: {
                        x: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                          },
                          ticks: {
                            color: 'rgb(107, 114, 128)'
                          }
                        },
                        y: {
                          grid: {
                            display: false
                          },
                          ticks: {
                            color: 'rgb(107, 114, 128)',
                            font: {
                              weight: 'bold' as const
                            }
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.dataset.label || '';
                              const value = context.parsed.x;
                              const metric = context.label;
                              
                              if (metric === 'Response Time (min)') {
                                return `${label}: ${value} minutes`;
                              }
                              return `${label}: ${value}`;
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-600 dark:text-gray-400">
                    <Lucide icon="BarChart" className="w-10 h-10 text-gray-400 mb-3" />
                    <p>No performance data available</p>
                    <p className="text-sm mt-1">Select an employee to view performance metrics</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Assignments Chart (conditional rendering) */}
          {companyId === '072' && dashboardCards.find(card => card.id === 'assignments-chart') && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {dashboardCards.find(card => card.id === 'assignments-chart')?.title}
                </h3>
              </div>
              <div className="p-6 flex-grow">
                {assignmentsData.labels.length > 0 ? (
                  <div>
                    <div className="h-64">
                      <Bar 
                        data={assignmentsData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: 'Number of Assignments',
                              },
                              grid: {
                                color: 'rgba(107, 114, 128, 0.1)'
                              }
                            },
                            x: {
                              title: {
                                display: true,
                                text: 'Employee',
                              },
                              grid: {
                                display: false
                              }
                            },
                          },
                          plugins: {
                            title: {
                              display: false,
                            },
                            tooltip: {
                              mode: 'index',
                              intersect: false,
                              callbacks: {
                                afterBody: (tooltipItems) => {
                                  const employeeId = assignmentsData.labels[tooltipItems[0].dataIndex];
                                  const employeeData = assignmentsData.dailyData[employeeId];
                                  if (!employeeData) return '';

                                  // Show last 5 days of assignments
                                  const recentAssignments = employeeData.daily.slice(-5);
                                  return '\nRecent daily assignments:\n' + 
                                    recentAssignments.map(day => 
                                      `${format(new Date(day.date), 'MMM dd')}: ${day.count} assignments`
                                    ).join('\n');
                                }
                              }
                            },
                          },
                        }} 
                      />
                    </div>
                    
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Assignments:</p>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                          {assignmentsData.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Employees:</p>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                          {assignmentsData.labels.length}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="max-h-[200px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="text-left p-3 text-gray-700 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-700/50">Employee</th>
                              <th className="text-center p-3 text-gray-700 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-700/50">Total</th>
                              <th className="text-left p-3 text-gray-700 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-700/50">Last 5 Days</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignmentsData.labels.map(employeeId => {
                              const employeeData = assignmentsData.dailyData[employeeId];
                              if (!employeeData) return null;
                              
                              // Show last 5 days of assignments
                              const recentAssignments = employeeData.daily.slice(-5);
                              
                              return (
                                <tr key={employeeId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                  <td className="p-3 text-gray-900 dark:text-gray-100">{employeeId}</td>
                                  <td className="p-3 text-center font-medium text-gray-900 dark:text-gray-100">
                                    {employeeData.total}
                                  </td>
                                  <td className="p-3 text-gray-700 dark:text-gray-300">
                                    <div className="flex flex-col space-y-1">
                                      {recentAssignments.length > 0 ? recentAssignments.map(day => (
                                        <div key={day.date} className="flex justify-between">
                                          <span className="text-xs text-gray-500">{format(new Date(day.date), 'MMM dd')}:</span>
                                          <span className="font-medium">{day.count}</span>
                                        </div>
                                      )) : (
                                        <span className="text-xs text-gray-500">No recent assignments</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-600 dark:text-gray-400">
                    <Lucide icon="BarChart2" className="w-10 h-10 text-gray-400 mb-3" />
                    <p>No assignments data available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Split Test Performance - Compact Version */}
        <SplitTestDashboardCompact />
      </div>
      
      <ContactsModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        contacts={selectedPeriodContacts}
        periodLabel={selectedPeriodLabel}
      />
    </div>
  );
}

export default Main;