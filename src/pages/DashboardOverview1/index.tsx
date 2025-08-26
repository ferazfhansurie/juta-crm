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
    <div className="h-full relative">
      <div className="p-6 relative z-10">
        {/* Enhanced glassmorphic inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10 rounded-3xl"></div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-indigo-600/20 dark:from-purple-400/30 dark:to-indigo-500/30 rounded-xl border border-purple-200/30 dark:border-purple-500/30">
              <div className="text-lg">🧪</div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Split Test Performance</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">AI variation analytics</p>
            </div>
          </div>
          <Link to="/split-test">
            <Button variant="outline-primary" className="px-3 py-1.5 text-xs rounded-lg hover:shadow-md transition-all duration-200">
              Manage Tests →
            </Button>
          </Link>
        </div>

        {!hasData ? (
          <div className="text-center py-6">
            <div className="text-gray-400 text-2xl mb-3">🚀</div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No split tests yet</p>
            <Link to="/split-test">
              <Button variant="primary" className="px-4 py-2 text-sm rounded-lg hover:shadow-md transition-all duration-200">
                Create First Test
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            {/* Compact metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-blue-600/20 dark:from-blue-400/30 dark:to-blue-500/30 rounded-2xl p-3 border border-blue-300/40 dark:border-blue-400/40 hover:bg-blue-500/25 dark:hover:bg-blue-400/35 transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group">
                {/* Inner glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-transparent to-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300 relative z-10">{splitTestData.totalCustomers}</div>
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 relative z-10">Total</div>
              </div>
              <div className="text-center backdrop-blur-md bg-gradient-to-br from-green-500/20 to-green-600/20 dark:from-green-400/30 dark:to-green-500/30 rounded-2xl p-3 border border-green-300/40 dark:border-green-400/40 hover:bg-green-500/25 dark:hover:bg-green-400/35 transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group">
                {/* Inner glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-transparent to-green-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="text-lg font-bold text-green-700 dark:text-green-300 relative z-10">{splitTestData.closedCustomers}</div>
                <div className="text-xs font-medium text-green-600 dark:text-green-400 relative z-10">Closed</div>
              </div>
              <div className="text-center backdrop-blur-md bg-gradient-to-br from-purple-500/20 to-purple-600/20 dark:from-purple-400/30 dark:to-purple-500/30 rounded-2xl p-3 border border-purple-300/40 dark:border-purple-400/40 hover:bg-purple-500/25 dark:hover:bg-purple-400/35 transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group">
                {/* Inner glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-transparent to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300 relative z-10">
                  {splitTestData.totalCustomers > 0 
                    ? ((splitTestData.closedCustomers / splitTestData.totalCustomers) * 100).toFixed(1)
                    : '0'
                  }%
                </div>
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400 relative z-10">Rate</div>
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
                    <div key={index} className={`flex items-center justify-between text-xs rounded-2xl px-3 py-2 backdrop-blur-md transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group ${
                      isTop ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 dark:from-green-400/30 dark:to-green-500/30 border border-green-300/40 dark:border-green-400/40 hover:bg-green-500/25 dark:hover:bg-green-400/35' :
                      isWorst ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 dark:from-red-400/30 dark:to-red-500/30 border border-red-300/40 dark:border-red-400/40 hover:bg-red-500/25 dark:hover:bg-red-400/35' :
                      'bg-gradient-to-r from-gray-500/20 to-gray-600/20 dark:from-gray-400/30 dark:to-gray-500/30 border border-gray-300/40 dark:border-gray-400/40 hover:bg-gray-500/25 dark:hover:bg-gray-400/35'
                    }`}>
                      {/* Inner glow effect */}
                      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                        isTop ? 'bg-gradient-to-r from-green-400/20 via-transparent to-green-500/20' :
                        isWorst ? 'bg-gradient-to-r from-red-400/20 via-transparent to-red-500/20' :
                        'bg-gradient-to-r from-gray-400/20 via-transparent to-gray-500/20'
                      }`}></div>
                      <div className="flex items-center gap-1.5 relative z-10">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                          isTop ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' : isWorst ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                          {variation.variationName}
                        </span>
                        {isTop && <span className="text-xs">👑</span>}
                        {isWorst && <span className="text-xs">📉</span>}
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          {variation.closedCustomers}/{variation.totalCustomers}
                        </span>
                        <span className={`font-bold text-xs ${
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
                <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Inactive Variations ({splitTestData.variationStats.filter(v => !v.isActive).length}):
                  </div>
                  {splitTestData.variationStats
                    .filter(v => !v.isActive)
                    .slice(0, 2)
                    .map((variation, index) => (
                      <div key={`inactive-${index}`} className="flex items-center justify-between text-xs backdrop-blur-sm bg-gray-500/10 dark:bg-gray-400/20 rounded-lg px-2 py-1.5 mb-1.5 border border-gray-200/30 dark:border-gray-500/30">
                        <span className="text-gray-600 dark:text-gray-300 text-xs">{variation.variationName}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">⚫ Inactive</span>
                      </div>
                    ))}
                </div>
              )}
              
              {/* Best/Worst summary if multiple active variations */}
              {splitTestData.variationStats.filter(v => v.isActive).length > 1 && (
                <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex items-center gap-2 p-3 backdrop-blur-md bg-gradient-to-r from-green-500/20 to-green-600/20 dark:from-green-400/30 dark:to-green-500/30 rounded-xl border border-green-300/40 dark:border-green-400/40 hover:bg-green-500/25 dark:hover:bg-green-400/35 transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group">
                      {/* Inner glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 via-transparent to-green-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="text-green-600 text-sm relative z-10">🏆</span>
                      <span className="text-gray-600 dark:text-gray-400 text-xs relative z-10">
                        Best: <strong className="text-green-700 dark:text-green-400">
                          {splitTestData.variationStats.filter(v => v.isActive)[0]?.variationName}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-3 backdrop-blur-md bg-gradient-to-r from-red-500/20 to-red-600/20 dark:from-red-400/30 dark:to-red-500/30 rounded-xl border border-red-300/40 dark:border-red-400/40 hover:bg-red-500/25 dark:hover:bg-red-400/35 transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group">
                      {/* Inner glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 via-transparent to-red-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="text-red-600 text-sm relative z-10">📈</span>
                      <span className="text-gray-600 dark:text-gray-400 text-xs relative z-10">
                        Needs Work: <strong className="text-red-700 dark:text-red-400">
                          {splitTestData.variationStats.filter(v => v.isActive).slice(-1)[0]?.variationName}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="text-center mt-4">
                <Link to="/split-test" className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-all duration-200">
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
    console.log('🔍 Filtering employees:', employees.length, 'employees, query:', searchQuery);
    const filtered = employees.filter(employee => 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log('🔍 Filtered result:', filtered.length, 'employees');
    return filtered;
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
          className="w-full pl-10 pr-10 border-gray-300 dark:border-gray-700 focus:border-primary dark:focus:border-primary rounded-lg transition-all duration-200"
        />
        {searchQuery && (
          <button 
            className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
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
        <div className="absolute z-10 w-full mt-2 backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-white/20 dark:border-gray-700/50 rounded-xl shadow-xl max-h-60 overflow-auto">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                className={`p-3 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 cursor-pointer flex items-center rounded-lg transition-all duration-200 ${
                  employee.id === currentUser?.id ? 'bg-blue-500/20 dark:bg-blue-400/20 border border-blue-200/30 dark:border-blue-500/30' : ''
                }`}
                onClick={() => {
                  onSelect(employee);
                  setIsOpen(false);
                  setSearchQuery(employee.name);
                }}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center mr-3 shadow-sm">
                  {employee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-gray-900 dark:text-gray-100 font-medium block">{employee.name}</span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">{employee.assignedContacts || 0} assigned contacts</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-gray-500 dark:text-gray-400 text-center">
              <div className="text-gray-400 text-lg mb-1">👥</div>
              <p className="text-sm">No employees found</p>
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
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderColor: 'rgba(34, 197, 94, 0.8)',
            borderWidth: 2,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(34, 197, 94, 0.8)',
            hoverBorderColor: 'rgba(34, 197, 94, 1)'
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
        const tags = contactData.tags || [];
        const normalizedTags = tags
          .filter((tag: any) => typeof tag === 'string')
          .map((tag: string) => tag.toLowerCase());
        
        console.log(`Checking contact tags for closed status: ${normalizedTags}`);
        return normalizedTags.includes('closed') && normalizedTags.includes(employeeData.name.toLowerCase());
      }).length;

      console.log(`Fetched employee data for ${employeeData.name}:`, {
        assignedContacts: employeeData.assignedContacts,
        monthlyAssignments,
        closedContacts
      });

      return {
        ...employeeData,
        assignedContacts: employeeData.assignedContacts || 0, // Ensure assignedContacts is preserved
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
          // Only set selectedEmployee if none is currently selected
          // This prevents overwriting a user's manual selection
          if (!selectedEmployee) {
            setSelectedEmployee(employeeData);
          }
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
      
      // If this month has data, use it and update lastKnownTotal
      if (monthlyAssignments[monthKey] !== undefined) {
        lastKnownTotal = monthlyAssignments[monthKey];
      }
      
      // Use the last known total for this month
      last12Months.push({
        month: format(date, 'MMM'),
        year: date.getFullYear(),
        assignments: lastKnownTotal
      });
    }
    
    return last12Months;
  };

  const chartData = useMemo(() => {
    if (!selectedEmployee) return null;

    console.log('🔍 Chart data calculation - selectedEmployee:', {
      name: selectedEmployee.name,
      id: selectedEmployee.id,
      assignedContacts: selectedEmployee.assignedContacts,
      monthlyAssignments: selectedEmployee.monthlyAssignments
    });

    // Create a fallback data point if there are no monthly assignments but there are assigned contacts
    let monthlyAssignments = selectedEmployee.monthlyAssignments || {};
    const assignedContacts = selectedEmployee.assignedContacts || 0;
    
    console.log('🔍 Chart calculation values:', { monthlyAssignments, assignedContacts });
    
    if (Object.keys(monthlyAssignments).length === 0 && assignedContacts > 0) {
      // Create data for the current month
      const currentMonth = format(new Date(), 'yyyy-MM');
      monthlyAssignments = { [currentMonth]: assignedContacts };
      console.log('🔍 Created fallback monthly assignments:', monthlyAssignments);
      
      // Don't call setSelectedEmployee here - it causes infinite loops
      // The monthlyAssignments will be used locally for this chart calculation
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
          borderColor: 'rgba(59, 130, 246, 0.8)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointHoverBorderColor: '#ffffff'
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
            font: {
              weight: 'bold',
              size: 12
            }
          },
          grid: {
            color: 'rgba(107, 114, 128, 0.1)',
            lineWidth: 0.5
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
            font: {
              size: 11
            }
          },
        },
        x: {
          title: {
            display: true,
            text: 'Month',
            color: 'rgb(75, 85, 99)',
            font: {
              weight: 'bold',
              size: 12
            }
          },
          grid: {
            color: 'rgba(107, 114, 128, 0.1)',
            lineWidth: 0.5
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            font: {
              size: 11
            }
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 8,
          cornerRadius: 6,
          titleFont: {
            size: 12
          },
          bodyFont: {
            size: 11
          },
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
          font: {
            size: 14,
            weight: 'bold'
          }
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

  // Add new state variables for real data
  const [activeConversations, setActiveConversations] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalAIResponses, setTotalAIResponses] = useState(0);
  const [aiMessageQuota, setAiMessageQuota] = useState(5000); // Default quota
  
  // Debug: Track quota changes
  useEffect(() => {
    console.log('🔍 AI Message Quota changed to:', aiMessageQuota);
  }, [aiMessageQuota]);
  const [aiDataLoaded, setAiDataLoaded] = useState(false); // Flag to prevent overwriting AI data
  const [dashboardStatus, setDashboardStatus] = useState<'loading' | 'success' | 'error' | 'fallback'>('loading');
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: string;
    description: string;
    timestamp: string;
    employee: string;
  }>>([]);
  const [topPerformers, setTopPerformers] = useState<Array<{
    name: string;
    performance: number;
    metric: string;
  }>>([]);
  
  // Add state for info tooltips
  const [infoTooltip, setInfoTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Helper function to get KPI descriptions
  const getKPIInfo = (label: string): string => {
    const infoMap: { [key: string]: string } = {
      'Total Contacts': 'The total number of contacts in your CRM system. This includes all leads, customers, and prospects.',
      'Blasted Messages': 'Total number of scheduled and sent blast messages across all campaigns. This tracks your outreach and marketing message volume.',
      'Closed Contacts': 'Contacts that have been successfully converted or completed their journey in your AI workflow.',
      'Total AI Responses Used': 'Total number of AI-generated responses used across all conversations in your CRM system. This matches the AI Messages count shown in the chat interface.'
    };
    return infoMap[label] || 'No description available.';
  };
  
  // Helper function to get engagement metrics descriptions
  const getEngagementInfo = (label: string): string => {
    const infoMap: { [key: string]: string } = {
      'Response Rate': 'Percentage of contacts that have responded to your outreach efforts. Higher rates indicate better engagement.',
      'Book Appointments Rate': 'Percentage of contacts that have scheduled appointments or meetings. Shows conversion effectiveness.',
      'Engagement Score': 'Overall engagement metric combining response rate, appointment booking, and other interaction factors.',
      'Conversion Rate': 'Percentage of leads that have been successfully converted to customers or closed deals.'
    };
    return infoMap[label] || 'No description available.';
  };
  


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
          // Load AI message data FIRST to ensure it's displayed correctly
          console.log('🚀 Starting AI data loading FIRST...');
          const loadAIDataFirst = async () => {
            try {
              console.log('🔍 Fetching AI config data...');
              const configResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-config?email=${encodeURIComponent(userEmail)}`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });
              console.log('🔍 AI config response:', configResponse.data);
              
              if (configResponse.data && configResponse.data.messageUsage) {
                const aiMessages = configResponse.data.messageUsage.aiMessages || 0;
                setTotalAIResponses(aiMessages);
                setAiDataLoaded(true);
                console.log('🚀 AI Message Usage loaded FIRST:', aiMessages);
              }
              
              if (configResponse.data && configResponse.data.usageQuota) {
                console.log('🔍 Usage quota data:', configResponse.data.usageQuota);
                console.log('🔍 Company data:', configResponse.data.companyData);
                let quota = 0;
                if (configResponse.data.companyData && configResponse.data.companyData.plan === "enterprise") {
                  quota = (configResponse.data.usageQuota.aiMessages || 0) + 5000;
                  console.log('🔍 Enterprise plan calculation:', configResponse.data.usageQuota.aiMessages, '+ 5000 =', quota);
                } else if (configResponse.data.companyData && configResponse.data.companyData.plan === "pro") {
                  quota = (configResponse.data.usageQuota.aiMessages || 0) + 20000;
                  console.log('🔍 Pro plan calculation:', configResponse.data.usageQuota.aiMessages, '+ 20000 =', quota);
                } else {
                  quota = (configResponse.data.usageQuota.aiMessages || 0) + 100;
                  console.log('🔍 Free plan calculation:', configResponse.data.usageQuota.aiMessages, '+ 100 =', quota);
                }
                              // Only set quota if it's not already set to a higher value
              if (!aiDataLoaded || quota > aiMessageQuota) {
                setAiMessageQuota(quota);
                console.log('✅ AI Message Quota loaded FIRST:', quota);
              } else {
                console.log('🛡️ Quota already set to higher value:', aiMessageQuota, 'keeping it instead of:', quota);
              }
              }
            } catch (error) {
              console.log('❌ Error loading AI data first:', error);
            }
          };
          
          // Load AI data immediately
          loadAIDataFirst();
          
          // Then load other data
          fetchContactsData();
          calculateAdditionalStats();
          fetchClosedContactsByEmployee();
          fetchRealDashboardData();
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, [calculateAdditionalStats]);

  // Modify the handleEmployeeSelect function
  const handleEmployeeSelect = async (employee: Employee) => {
    console.log('🚀 Employee selected:', employee);
    setLoading(true);
    
    try {
      // Use the existing employee data which already has the correct assignedContacts
      // Only fetch additional data if needed
      const existingEmployee = employees.find(emp => emp.id === employee.id);
      
      if (existingEmployee && existingEmployee.assignedContacts !== undefined) {
        console.log('✅ Using existing employee data with correct assignedContacts:', existingEmployee);
        setSelectedEmployee(existingEmployee);
        console.log('🔄 Calling fetchEmployeeStats for:', existingEmployee.id);
        fetchEmployeeStats(existingEmployee.id);
      } else {
        console.log('⚠️ No existing data or missing assignedContacts, fetching complete data');
        // Only fetch if we don't have the data
        const completeEmployeeData = await fetchEmployeeData(employee.id);
        
        if (completeEmployeeData) {
          console.log('✅ Complete employee data fetched:', completeEmployeeData);
          setSelectedEmployee(completeEmployeeData);
          console.log('🔄 Calling fetchEmployeeStats for:', completeEmployeeData.id);
          fetchEmployeeStats(completeEmployeeData.id);
        } else {
          console.log('⚠️ No complete data, using basic employee data');
          setSelectedEmployee(employee);
          fetchEmployeeStats(employee.id);
        }
      }
    } catch (error) {
      console.error('❌ Error in handleEmployeeSelect:', error);
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
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderColor: 'rgba(59, 130, 246, 0.8)',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(59, 130, 246, 0.5)',
        hoverBorderColor: 'rgba(59, 130, 246, 1)'
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
            font: {
              weight: 'bold',
              size: 12
            }
          },
          grid: {
            color: 'rgba(107, 114, 128, 0.1)',
            lineWidth: 0.5
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: Math.max(1, Math.ceil(Math.max(...contactsOverTime.map(d => d.count)) / 10)),
            font: {
              size: 11
            }
          },
        },
        x: {
          title: {
            display: true,
            text: contactsTimeFilter === 'today' ? 'Hour' : 
                  contactsTimeFilter === 'all' ? 'Month' : 'Date',
            color: 'rgb(75, 85, 99)',
            font: {
              weight: 'bold',
              size: 12
            }
          },
          grid: {
            color: 'rgba(107, 114, 128, 0.1)',
            lineWidth: 0.5
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            maxTicksLimit: contactsTimeFilter === 'today' ? 24 : 
                          contactsTimeFilter === 'all' ? undefined : 10,
            autoSkip: true,
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 11
            }
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
            font: {
              size: 14,
              weight: 'bold'
            }
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
        backgroundColor: 'rgba(34, 197, 94, 0.4)',
        borderColor: 'rgba(34, 197, 94, 0.8)',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(34, 197, 94, 0.6)',
        hoverBorderColor: 'rgba(34, 197, 94, 1)'
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
            font: {
              weight: 'bold',
              size: 12
            }
          },
          grid: {
            color: 'rgba(107, 114, 128, 0.1)',
            lineWidth: 0.5
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            stepSize: 1,
            font: {
              size: 11
            }
          },
        },
        x: {
          title: {
            display: true,
            text: 'Employees',
            color: 'rgb(75, 85, 99)',
            font: {
              weight: 'bold',
              size: 12
            }
          },
          grid: {
            color: 'rgba(107, 114, 128, 0.1)',
            lineWidth: 0.5
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            font: {
              size: 11
            }
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
          font: {
            size: 14,
            weight: 'bold'
          }
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
      borderColor?: string;
      borderWidth?: number;
      borderRadius?: number;
      hoverBackgroundColor?: string;
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
          { 
            label: 'Scheduled', 
            data: sortedMonths.map(m => monthlyData[m].scheduled), 
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgba(59, 130, 246, 0.8)',
            borderWidth: 2,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(59, 130, 246, 0.8)'
          },
          { 
            label: 'Completed', 
            data: sortedMonths.map(m => monthlyData[m].completed), 
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderColor: 'rgba(34, 197, 94, 0.8)',
            borderWidth: 2,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(34, 197, 94, 0.8)'
          },
          { 
            label: 'Failed', 
            data: sortedMonths.map(m => monthlyData[m].failed), 
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgba(239, 68, 68, 0.8)',
            borderWidth: 2,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(239, 68, 68, 0.8)'
          },
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
        let employeeListData: Employee[] = [];
        
        if (dashboardData.employeePerformance && dashboardData.employeePerformance.length > 0) {
          employeeListData = dashboardData.employeePerformance.map((emp: any) => ({
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
          console.log('✅ Employees loaded from dashboard data:', employeeListData.length);
        } else {
          console.log('⚠️ No employees found in dashboard data, using fallback...');
          // Use fallback to fetch employees
          employeeListData = await fetchEmployeesFallback(companyId);
        }

        // Always fetch real employee assignment data to ensure accuracy
        console.log('🔍 Fetching real employee assignment data...');
        let assignmentData;
        try {
          assignmentData = await fetchEmployeeAssignments(companyId, userEmail);
        } catch (assignmentError) {
          console.log('⚠️ Error fetching employee assignments, using fallback data:', assignmentError);
          assignmentData = {
            contactCountMap: {},
            closedCountMap: {},
            messageCountMap: {}
          };
        }
        
        // Apply assignment data to employees
        console.log('🔍 Available employees to match:', employeeListData.map(emp => emp.name));
        console.log('🔍 Assignment data keys:', Object.keys(assignmentData.contactCountMap));
        
        employeeListData.forEach(emp => {
          // Try to match employee by name (case-insensitive)
          const normalizedEmpName = emp.name.trim().toLowerCase();
          console.log(`🔍 Trying to match employee: "${emp.name}" (normalized: "${normalizedEmpName}")`);
          
          // Update assigned contacts
          if (assignmentData.contactCountMap[normalizedEmpName] !== undefined) {
            emp.assignedContacts = assignmentData.contactCountMap[normalizedEmpName];
            console.log(`✅ ${emp.name}: ${emp.assignedContacts} assigned contacts (exact match)`);
          } else {
            // Try partial name matching
            const partialMatch = Object.keys(assignmentData.contactCountMap).find(key => 
              key.includes(normalizedEmpName) || normalizedEmpName.includes(key)
            );
            if (partialMatch) {
              emp.assignedContacts = assignmentData.contactCountMap[partialMatch];
              console.log(`✅ ${emp.name}: ${emp.assignedContacts} assigned contacts (partial match: "${partialMatch}")`);
            } else {
              emp.assignedContacts = emp.currentMonthAssignments || 0;
              console.log(`⚠️ ${emp.name}: No match found, using fallback ${emp.assignedContacts} assigned contacts`);
            }
          }
          
          // Update closed contacts
          if (assignmentData.closedCountMap[normalizedEmpName] !== undefined) {
            emp.closedContacts = assignmentData.closedCountMap[normalizedEmpName];
          } else {
            const partialMatch = Object.keys(assignmentData.closedCountMap).find(key => 
              key.includes(normalizedEmpName) || normalizedEmpName.includes(key)
            );
            if (partialMatch) {
              emp.closedContacts = assignmentData.closedCountMap[partialMatch];
            }
          }
          
          // Update outgoing messages
          if (assignmentData.messageCountMap[normalizedEmpName] !== undefined) {
            emp.outgoingMessages = assignmentData.messageCountMap[normalizedEmpName];
          } else {
            const partialMatch = Object.keys(assignmentData.messageCountMap).find(key => 
              key.includes(normalizedEmpName) || normalizedEmpName.includes(key)
            );
            if (partialMatch) {
              emp.outgoingMessages = assignmentData.messageCountMap[partialMatch];
            }
          }
        });
        
        console.log('🎯 Final employee assignments applied:', employeeListData.map(emp => ({
          name: emp.name,
          assignedContacts: emp.assignedContacts,
          closedContacts: emp.closedContacts,
          outgoingMessages: emp.outgoingMessages
        })));

        // Sort employees by assigned contacts
        employeeListData.sort((a, b) => (b.assignedContacts || 0) - (a.assignedContacts || 0));
        
        // Ensure we have employees before setting state
        if (employeeListData.length === 0) {
          console.log('⚠️ Still no employees, creating minimal employee list...');
          // Create a minimal employee list with current user
          const userEmail = localStorage.getItem('userEmail');
          if (userEmail) {
            const minimalEmployee: Employee = {
              id: 'current-user',
              name: userEmail.split('@')[0], // Use email prefix as name
              email: userEmail,
              role: 'User',
              phone: '',
              assignedContacts: 0,
              outgoingMessages: 0,
              closedContacts: 0,
              currentMonthAssignments: 0
            };
            employeeListData = [minimalEmployee];
            setCurrentUser(minimalEmployee);
            // Only set selectedEmployee if none is currently selected
            // This prevents overwriting a user's manual selection
            if (!selectedEmployee) {
              setSelectedEmployee(minimalEmployee);
            }
          }
        }
        
        console.log('🎯 Final employee list:', employeeListData);
        setEmployees(employeeListData);

        // Find current user
        const currentUserData = employeeListData.find(emp => emp.email === userEmail);
        if (currentUserData) {
          setCurrentUser(currentUserData);
          // Only set selectedEmployee if none is currently selected
          // This prevents overwriting a user's manual selection
          if (!selectedEmployee) {
            setSelectedEmployee(currentUserData);
          }
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

  // Add this new function to fetch real dashboard data
  const fetchRealDashboardData = async () => {
    let dashboardData: any = null; // Declare outside try block so it's available in catch
    
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const companyId = userResponse.data.company_id;
      if (!companyId) return;

      // Fetch comprehensive dashboard data with retry
      let dashboardData: any = null;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`🔄 Attempting dashboard fetch (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          const dashboardResponse = await axios.get(`https://juta-dev.ngrok.dev/api/dashboard/${companyId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            timeout: 10000 // 10 second timeout
          });
          dashboardData = dashboardResponse.data;
          console.log('✅ Dashboard data fetched successfully');
          setDashboardStatus('success');
          break; // Success, exit retry loop
        } catch (dashboardError: any) {
          retryCount++;
          console.log(`⚠️ Dashboard endpoint failed (attempt ${retryCount}/${maxRetries + 1}):`, dashboardError?.response?.status, dashboardError?.message);
          
          if (retryCount > maxRetries) {
            console.log('⚠️ Max retries reached, using fallback data');
            setDashboardStatus('fallback');
            
            // Preserve existing employee data instead of clearing it
            const existingEmployees = employees.length > 0 ? employees : [];
            console.log('🔄 Preserving existing employee data:', existingEmployees.length, 'employees');
            
            // Create minimal dashboard data structure but preserve employee data
            dashboardData = {
              employeePerformance: existingEmployees.map(emp => ({
                employee_id: emp.id,
                name: emp.name,
                email: emp.email,
                role: emp.role || '',
                phone_number: emp.phone || '',
                assignedContacts: emp.assignedContacts || 0,
                outgoingMessages: emp.outgoingMessages || 0,
                closedContacts: emp.closedContacts || 0,
                current_month_assignments: emp.currentMonthAssignments || 0
              })),
              phoneLineStats: {},
              recentActivity: [],
              performanceMetrics: { topPerformers: [] }
            };
            break;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      console.log('🔍 Dashboard response data:', dashboardData);
      console.log('🔍 Employee performance data:', dashboardData?.employeePerformance);
      console.log('🔍 Employee performance length:', dashboardData?.employeePerformance?.length);

      // Fetch AI message usage from the same endpoint used in Chat page
      // This ensures consistency between Dashboard and Chat page AI message counters
      // BUT only if AI data hasn't been loaded yet
      if (!aiDataLoaded) {
        try {
          const configResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-config?email=${encodeURIComponent(userEmail)}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          console.log('=== DASHBOARD AI MESSAGE DEBUG ===');
          console.log('Full config response:', configResponse.data);
          console.log('Message usage data:', configResponse.data?.messageUsage);
          console.log('Usage quota data:', configResponse.data?.usageQuota);
          console.log('Company data:', configResponse.data?.companyData);
          
          if (configResponse.data && configResponse.data.messageUsage) {
            const aiMessages = configResponse.data.messageUsage.aiMessages || 0;
            if (!aiDataLoaded || aiMessages > 0) {
              setTotalAIResponses(aiMessages);
              setAiDataLoaded(true);
              console.log('✅ AI Message Usage set to:', aiMessages);
            } else {
              console.log('🔄 AI data already loaded, skipping overwrite');
            }
          } else {
            console.log('❌ No messageUsage found in config response');
          }
          
          if (configResponse.data && configResponse.data.usageQuota) {
            let quota = configResponse.data.usageQuota.aiMessages || 5000;
            console.log('Raw quota from API:', quota);
            
            // Use the EXACT same quota calculation logic as the Chat page
            if (configResponse.data.companyData && configResponse.data.companyData.plan === "enterprise") {
              quota = (configResponse.data.usageQuota.aiMessages || 0) + 5000;
              console.log('🔄 Enterprise plan: quota =', configResponse.data.usageQuota.aiMessages, '+ 5000 =', quota);
            } else if (configResponse.data.companyData && configResponse.data.companyData.plan === "pro") {
              quota = (configResponse.data.usageQuota.aiMessages || 0) + 20000;
              console.log('🔄 Pro plan: quota =', configResponse.data.usageQuota.aiMessages, '+ 20000 =', quota);
            } else {
              quota = (configResponse.data.usageQuota.aiMessages || 0) + 100;
              console.log('🔄 Free plan: quota =', configResponse.data.usageQuota.aiMessages, '+ 100 =', quota);
            }
            
            console.log('🎯 Final AI Message Quota set to:', quota);
            // Only set quota if it's not already set to a higher value (indicating it was loaded correctly)
            if (!aiDataLoaded || quota > aiMessageQuota) {
              setAiMessageQuota(quota);
              console.log('✅ Quota updated to:', quota);
            } else {
              console.log('🛡️ Quota already set to higher value:', aiMessageQuota, 'keeping it instead of:', quota);
            }
          } else if (!aiDataLoaded) {
            console.log('❌ No usageQuota found in config, using default 5000');
            setAiMessageQuota(5000);
          } else {
            console.log('🚀 AI quota already loaded, skipping fallback');
          }
          
          console.log('=== END DASHBOARD AI MESSAGE DEBUG ===');
        } catch (error) {
          console.log('❌ Config endpoint error:', error);
          // Fallback: try to get AI message usage from the dashboard endpoint
          if (dashboardData && dashboardData.aiMessageUsage && !aiDataLoaded) {
            setTotalAIResponses(dashboardData.aiMessageUsage);
            setAiDataLoaded(true);
            console.log('🔄 AI Message Usage from dashboard fallback:', dashboardData.aiMessageUsage);
          }
        }
      } else {
        console.log('🚀 AI data already loaded, skipping fetchRealDashboardData AI fetch');
      }

      // Fetch recent activity
      try {
        const activityResponse = await axios.get(`https://juta-dev.ngrok.dev/api/companies/${companyId}/recent-activity`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (activityResponse.data) {
          setRecentActivity(activityResponse.data.slice(0, 5));
        }
      } catch (error) {
        console.log('Recent activity endpoint not available, using fallback');
      }

      // Fetch performance metrics
      try {
        const performanceResponse = await axios.get(`https://juta-dev.ngrok.dev/api/companies/${companyId}/performance-metrics`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (performanceResponse.data) {
          setTopPerformers(performanceResponse.data.topPerformers || []);
        }
      } catch (error) {
        console.log('Performance metrics endpoint not available, using fallback');
      }

      // Update state with real data
      if (dashboardData) {
        setActiveConversations(dashboardData.activeConversations || openContacts);
        setAvgResponseTime(dashboardData.avgResponseTime || 0);
        setTotalMessages(dashboardData.totalMessages || numReplies);
        // AI responses are now fetched from config endpoint above
      }

    } catch (error) {
      console.error('Error fetching real dashboard data:', error);
      
      // Ensure we have a dashboardData object even if the main fetch failed
      if (!dashboardData) {
        dashboardData = {
          employeePerformance: [],
          phoneLineStats: {},
          recentActivity: [],
          performanceMetrics: { topPerformers: [] }
        };
      }
      
      // Fallback to calculated values
      setActiveConversations(openContacts);
      setAvgResponseTime(employeeStats?.averageResponseTime || 0);
      setTotalMessages(numReplies);
      
      // Try to get AI responses from dashboard data if available, otherwise use fallback
      if (dashboardData && dashboardData.aiMessageUsage !== undefined && !aiDataLoaded) {
        setTotalAIResponses(dashboardData.aiMessageUsage);
        setAiDataLoaded(true);
        console.log('🔄 AI Message Usage from dashboard fallback:', dashboardData.aiMessageUsage);
      } else if (!aiDataLoaded) {
        // Only use calculated fallback if no dashboard data available and AI data not loaded
        setTotalAIResponses(Math.floor(numReplies * 0.8) || 0);
        setAiDataLoaded(true);
        console.log('🔄 Using calculated AI responses fallback:', Math.floor(numReplies * 0.8) || 0);
      }
      
      if (!aiDataLoaded) {
        setAiMessageQuota(5000); // Default quota only if AI data not loaded
        console.log('🔄 Using default quota 5000 as fallback');
      } else {
        console.log('🚀 AI quota already loaded, skipping default fallback');
      }
      
      // Additional protection: never override a quota that's already set to the correct value
      if (aiMessageQuota > 5000 && aiDataLoaded) {
        console.log('🛡️ Protecting existing quota:', aiMessageQuota, 'from being overwritten');
      }
      
      // Add sample data for demonstration
      setRecentActivity([
        {
          type: 'contact_added',
          description: 'New contact John Doe added',
          timestamp: new Date().toISOString(),
          employee: 'Sales Team'
        },
        {
          type: 'contact_closed',
          description: 'Contact Sarah Smith marked as closed',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          employee: 'Support Team'
        },
        {
          type: 'message_sent',
          description: 'Follow-up message sent to 5 contacts',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          employee: 'Marketing Team'
        }
      ]);
      
      setTopPerformers([
        {
          name: 'John Smith',
          performance: 95,
          metric: 'Response Rate'
        },
        {
          name: 'Sarah Johnson',
          performance: 87,
          metric: 'Conversion Rate'
        },
        {
          name: 'Mike Davis',
          performance: 82,
          metric: 'Customer Satisfaction'
        }
      ]);
    }
  };

  // Add function to fetch real employee assignment data
  const fetchEmployeeAssignments = async (companyId: string, userEmail: string) => {
    try {
      console.log('🔍 Fetching real employee assignment data...');
      
      // Method 1: Try to get assignments from dedicated assignments endpoint
      try {
        const assignmentsResponse = await axios.get(`https://juta-dev.ngrok.dev/api/assignments/${companyId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (assignmentsResponse.data && assignmentsResponse.data.length > 0) {
          console.log('✅ Assignments data found:', assignmentsResponse.data);
          return assignmentsResponse.data;
        }
      } catch (error) {
        console.log('⚠️ Assignments endpoint not available, trying contacts method...');
      }
      
      // Method 2: Get contacts and analyze tags for assignments
      const contactsResponse = await axios.get(
        `https://juta-dev.ngrok.dev/api/companies/${companyId}/contacts?email=${encodeURIComponent(userEmail)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const contacts = contactsResponse.data.contacts || [];
      console.log('🔍 Analyzing', contacts.length, 'contacts for employee assignments...');
      
      // Debug: Show sample contact structure
      if (contacts.length > 0) {
        console.log('🔍 Sample contact structure:', JSON.stringify(contacts[0], null, 2));
        console.log('🔍 Sample contact tags:', contacts[0].tags);
        console.log('🔍 Sample contact assignedTo:', contacts[0].assignedTo);
        
        // Show first few contacts with their assignments
        console.log('🔍 First 5 contacts and their assignments:');
        for (let i = 0; i < Math.min(5, contacts.length); i++) {
          const contact = contacts[i];
          console.log(`  ${i + 1}. ${contact.name}: assignedTo=${JSON.stringify(contact.assignedTo)}, tags=${JSON.stringify(contact.tags)}`);
        }
      }
      
      // Create maps to count contacts per employee
      const contactCountMap: { [key: string]: number } = {};
      const closedCountMap: { [key: string]: number } = {};
      const messageCountMap: { [key: string]: number } = {};
      
      contacts.forEach((contact: any) => {
        let assignedEmployee = null;
        
        // Structure 1: assignedTo array (this is what we see in the actual data)
        if (contact.assignedTo && Array.isArray(contact.assignedTo) && contact.assignedTo.length > 0) {
          // Take the first assigned employee (remove duplicates)
          assignedEmployee = contact.assignedTo[0];
          console.log(`🔍 Contact ${contact.name} assigned to: ${assignedEmployee}`);
        }
        // Structure 2: tags.assigned_to
        else if (contact.tags && contact.tags.assigned_to && typeof contact.tags.assigned_to === 'string') {
          assignedEmployee = contact.tags.assigned_to;
        }
        // Structure 3: tags array with employee names
        else if (contact.tags && Array.isArray(contact.tags)) {
          // Look for employee names in tags
          for (const tag of contact.tags) {
            if (typeof tag === 'string' && tag.length > 0) {
              // Check if this tag matches an employee name
              assignedEmployee = tag;
              break;
            }
          }
        }
        // Structure 4: tags.employee or tags.assigned_employee
        else if (contact.tags && contact.tags.employee) {
          assignedEmployee = contact.tags.employee;
        } else if (contact.tags && contact.tags.assigned_employee) {
          assignedEmployee = contact.tags.assigned_employee;
        }
        
        if (assignedEmployee) {
          // Normalize employee name (remove extra spaces, convert to lowercase for comparison)
          const normalizedName = assignedEmployee.trim().toLowerCase();
          contactCountMap[normalizedName] = (contactCountMap[normalizedName] || 0) + 1;
          
          console.log(`✅ Found assignment: ${contact.name} -> ${assignedEmployee} (normalized: ${normalizedName})`);
          
          // Check if contact is closed (look in tags array)
          if (contact.tags && Array.isArray(contact.tags)) {
            const hasClosedTag = contact.tags.some((tag: any) => 
              typeof tag === 'string' && tag.toLowerCase() === 'closed'
            );
            if (hasClosedTag) {
              closedCountMap[normalizedName] = (closedCountMap[normalizedName] || 0) + 1;
              console.log(`✅ Contact ${contact.name} is closed`);
            }
          }
          
          // Count messages if available
          if (contact.messageCount) {
            messageCountMap[normalizedName] = (messageCountMap[normalizedName] || 0) + contact.messageCount;
          }
        } else {
          console.log(`⚠️ No assignment found for contact: ${contact.name}`);
        }
      });
      
      console.log('🔍 Assignment analysis results:');
      console.log('Contact counts:', contactCountMap);
      console.log('Closed counts:', closedCountMap);
      console.log('Message counts:', messageCountMap);
      
      return {
        contactCountMap,
        closedCountMap,
        messageCountMap
      };
      
    } catch (error) {
      console.error('❌ Error fetching employee assignments:', error);
      return {
        contactCountMap: {},
        closedCountMap: {},
        messageCountMap: {}
      };
    }
  };

  // Add function to fetch employees as fallback
  const fetchEmployeesFallback = async (companyId: string) => {
    try {
      console.log('🔄 Fetching employees as fallback...');
      const employeesResponse = await axios.get(`https://juta-dev.ngrok.dev/api/employees-data/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const employeesData = employeesResponse.data;
      console.log('✅ Employees fetched:', employeesData);
      
      // Transform to Employee format
      const employeeListData: Employee[] = employeesData.map((emp: any) => ({
        id: emp.id || emp.employee_id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        phone: emp.phone_number || emp.phone,
        assignedContacts: 0, // Will be updated with real data
        outgoingMessages: 0,
        closedContacts: 0,
        currentMonthAssignments: 0
      }));
      
      // Fetch real assignment data for these employees
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        console.log('🔍 Fetching assignment data for fallback employees...');
        const assignmentData = await fetchEmployeeAssignments(companyId, userEmail);
        
        // Apply assignment data
        employeeListData.forEach(emp => {
          const normalizedEmpName = emp.name.trim().toLowerCase();
          
          if (assignmentData.contactCountMap[normalizedEmpName] !== undefined) {
            emp.assignedContacts = assignmentData.contactCountMap[normalizedEmpName];
            emp.closedContacts = assignmentData.closedCountMap[normalizedEmpName] || 0;
            emp.outgoingMessages = assignmentData.messageCountMap[normalizedEmpName] || 0;
            console.log(`✅ Fallback ${emp.name}: ${emp.assignedContacts} assigned contacts`);
          } else {
            // Try partial matching
            const partialMatch = Object.keys(assignmentData.contactCountMap).find(key => 
              key.includes(normalizedEmpName) || normalizedEmpName.includes(key)
            );
            if (partialMatch) {
              emp.assignedContacts = assignmentData.contactCountMap[partialMatch];
              emp.closedContacts = assignmentData.closedCountMap[partialMatch] || 0;
              emp.outgoingMessages = assignmentData.messageCountMap[partialMatch] || 0;
              console.log(`✅ Fallback ${emp.name}: ${emp.assignedContacts} assigned contacts (partial match: ${partialMatch})`);
            }
          }
        });
      }
      
      setEmployees(employeeListData);
      
      // Find current user
      if (userEmail) {
        const currentUserData = employeeListData.find(emp => emp.email === userEmail);
        if (currentUserData) {
          setCurrentUser(currentUserData);
          // Only set selectedEmployee if none is currently selected
          // This prevents overwriting a user's manual selection
          if (!selectedEmployee) {
            setSelectedEmployee(currentUserData);
          }
        }
      }
      
      return employeeListData;
    } catch (error) {
      console.error('❌ Error fetching employees fallback:', error);
      return [];
    }
  };

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
  
      console.log('🔍 Fetching employee stats for:', { companyId, employeeId });
  
      // Get the current selected employee to preserve existing data
      const currentSelectedEmployee = selectedEmployee;
      console.log('🔍 Current selected employee data:', currentSelectedEmployee);
      console.log('🔍 Employee ID being fetched:', employeeId);
      console.log('🔍 Current selected employee ID:', currentSelectedEmployee?.id);
  
      // Try to fetch stats from the stats endpoint first
      try {
        const response = await axios.get(
          `https://juta-dev.ngrok.dev/api/stats/${companyId}?employeeId=${employeeId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        const statsData = response.data;
        console.log('✅ Employee stats fetched successfully:', statsData);
        
        setEmployeeStats({
          conversationsAssigned: statsData.conversationsAssigned || currentSelectedEmployee?.assignedContacts || 0,
          outgoingMessagesSent: statsData.outgoingMessagesSent || currentSelectedEmployee?.outgoingMessages || 0,
          averageResponseTime: statsData.averageResponseTime || 0,
          closedContacts: statsData.closedContacts || currentSelectedEmployee?.closedContacts || 0,
          currentMonthAssignments: statsData.currentMonthAssignments || currentSelectedEmployee?.currentMonthAssignments || 0,
          employeeName: statsData.employeeName || currentSelectedEmployee?.name || '',
          employeeRole: statsData.employeeRole || currentSelectedEmployee?.role || '',
          responseTimes: statsData.responseTimes || [],
          medianResponseTime: statsData.medianResponseTime || 0,
          phoneAssignments: statsData.phoneAssignments || {},
          weightageUsed: statsData.weightageUsed || {}
        });
        return;
      } catch (statsError: any) {
        console.log('⚠️ Stats endpoint failed, using fallback data:', statsError?.response?.status, statsError?.message);
        
        // If stats endpoint fails, preserve the existing employee data and only set the stats fields
        if (currentSelectedEmployee) {
          console.log('🔄 Using fallback employee data for stats, preserving existing data');
          setEmployeeStats({
            conversationsAssigned: currentSelectedEmployee.assignedContacts || 0,
            outgoingMessagesSent: currentSelectedEmployee.outgoingMessages || 0,
            averageResponseTime: 0, // Default value
            closedContacts: currentSelectedEmployee.closedContacts || 0,
            currentMonthAssignments: currentSelectedEmployee.currentMonthAssignments || 0,
            employeeName: currentSelectedEmployee.name || '',
            employeeRole: currentSelectedEmployee.role || '',
            responseTimes: [],
            medianResponseTime: 0,
            phoneAssignments: {},
            weightageUsed: {}
          });
          return;
        }
        
        // If no current selected employee, try to get from the employee list
        const currentEmployee = employees.find(emp => emp.id === employeeId);
        if (currentEmployee) {
          console.log('🔄 Using employee list data for stats');
          setEmployeeStats({
            conversationsAssigned: currentEmployee.assignedContacts || 0,
            outgoingMessagesSent: currentEmployee.outgoingMessages || 0,
            averageResponseTime: 0, // Default value
            closedContacts: currentEmployee.closedContacts || 0,
            currentMonthAssignments: currentEmployee.currentMonthAssignments || 0,
            employeeName: currentEmployee.name || '',
            employeeRole: currentEmployee.role || '',
            responseTimes: [],
            medianResponseTime: 0,
            phoneAssignments: {},
            weightageUsed: {}
          });
          return;
        }
      }
      
      // Final fallback - set default values
      console.log('🔄 Using default employee stats');
      setEmployeeStats({
        conversationsAssigned: 0,
        outgoingMessagesSent: 0,
        averageResponseTime: 0,
        closedContacts: 0,
        currentMonthAssignments: 0,
        employeeName: '',
        employeeRole: '',
        responseTimes: [],
        medianResponseTime: 0,
        phoneAssignments: {},
        weightageUsed: {}
      });
      
    } catch (error) {
      console.error('❌ Error in fetchEmployeeStats:', error);
      // Set default values on error
      setEmployeeStats({
        conversationsAssigned: 0,
        outgoingMessagesSent: 0,
        averageResponseTime: 0,
        closedContacts: 0,
        currentMonthAssignments: 0,
        employeeName: '',
        employeeRole: '',
        responseTimes: [],
        medianResponseTime: 0,
        phoneAssignments: {},
        weightageUsed: {}
      });
    }
  };

          // Update useEffect to fetch stats for current user by default
        useEffect(() => {
          if (currentUser) {
            fetchEmployeeStats(currentUser.id);
          }
        }, [currentUser]); // Dependency on currentUser

  // Add useEffect to update monthly assignments when employee data changes
  useEffect(() => {
    if (selectedEmployee && selectedEmployee.assignedContacts && 
        (!selectedEmployee.monthlyAssignments || Object.keys(selectedEmployee.monthlyAssignments).length === 0)) {
      
      console.log('🔄 Updating monthly assignments for employee:', selectedEmployee.name);
      
      // Create monthly assignments data if it doesn't exist
      const currentMonth = format(new Date(), 'yyyy-MM');
      const monthlyAssignments = { [currentMonth]: selectedEmployee.assignedContacts };
      
      // Only update if monthlyAssignments is actually missing or empty
      if (!selectedEmployee.monthlyAssignments || Object.keys(selectedEmployee.monthlyAssignments).length === 0) {
        setSelectedEmployee(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            monthlyAssignments: monthlyAssignments
          };
        });
      }
    }
  }, [selectedEmployee?.id]); // Only run when employee ID changes, not when assignedContacts changes

  // Add debugging useEffect to track when selectedEmployee changes
  useEffect(() => {
    console.log('🔍 selectedEmployee changed:', {
      name: selectedEmployee?.name,
      id: selectedEmployee?.id,
      assignedContacts: selectedEmployee?.assignedContacts,
      monthlyAssignments: selectedEmployee?.monthlyAssignments,
      timestamp: new Date().toISOString()
    });
  }, [selectedEmployee]);

  // Add debugging useEffect to track when employees array changes
  useEffect(() => {
    console.log('🔍 employees array changed:', {
      count: employees.length,
      names: employees.map(emp => ({ name: emp.name, assignedContacts: emp.assignedContacts })),
      timestamp: new Date().toISOString()
    });
  }, [employees]);

  // Add useEffect to ensure employees are loaded when component mounts
  useEffect(() => {
    const ensureEmployeesLoaded = async () => {
      if (employees.length === 0) {
        console.log('🔄 No employees found, fetching as fallback...');
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
          try {
            const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`);
            const companyId = userResponse.data.company_id;
            if (companyId) {
              await fetchEmployeesFallback(companyId);
            }
          } catch (error) {
            console.error('❌ Error ensuring employees loaded:', error);
          }
        }
      }
    };
    
    ensureEmployeesLoaded();
  }, [employees.length]);

  // Add useEffect to refresh AI message data when component mounts (only if not already loaded)
  useEffect(() => {
    // Only refresh AI message data if it hasn't been loaded yet
    if (!aiDataLoaded) {
      const refreshAIData = async () => {
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
          try {
            const configResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-config?email=${encodeURIComponent(userEmail)}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (configResponse.data && configResponse.data.messageUsage) {
              const aiMessages = configResponse.data.messageUsage.aiMessages || 0;
              setTotalAIResponses(aiMessages);
              setAiDataLoaded(true);
              console.log('🚀 Dashboard mounted - AI Message Usage loaded:', aiMessages);
            }
            
            if (configResponse.data && configResponse.data.usageQuota) {
              let quota = 0;
              if (configResponse.data.companyData && configResponse.data.companyData.plan === "enterprise") {
                quota = (configResponse.data.usageQuota.aiMessages || 0) + 5000;
              } else if (configResponse.data.companyData && configResponse.data.companyData.plan === "pro") {
                quota = (configResponse.data.usageQuota.aiMessages || 0) + 20000;
              } else {
                quota = (configResponse.data.usageQuota.aiMessages || 0) + 100;
              }
              // Only set quota if it's not already set to a higher value
              if (!aiDataLoaded || quota > aiMessageQuota) {
                setAiMessageQuota(quota);
                console.log('✅ Dashboard mounted - AI Message Quota loaded:', quota);
              } else {
                console.log('🛡️ Quota already set to higher value:', aiMessageQuota, 'keeping it instead of:', quota);
              }
            }
          } catch (error) {
            console.log('❌ Error refreshing AI data on mount:', error);
          }
        }
      };
      
      refreshAIData();
    } else {
      console.log('🚀 AI data already loaded, skipping mount refresh');
    }
  }, [aiDataLoaded]); // Dependency on aiDataLoaded to prevent unnecessary calls

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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="backdrop-blur-md bg-white/90 dark:bg-gray-800/90 rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl border border-white/20 dark:border-gray-700/50">
          <div className="p-6 border-b border-white/20 dark:border-gray-600/50 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Contacts for {periodLabel} ({contacts.length} contacts)
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Lucide icon="X" className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-auto max-h-[calc(80vh-8rem)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/50 dark:border-gray-600/50">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Company</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Date Added</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Tags</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-100/50 dark:border-gray-600/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200">
                    <td className="p-3 font-medium">{`${contact.firstName} ${contact.lastName}`}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{contact.email || '-'}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{contact.phone || '-'}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{contact.companyName || '-'}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{contact.dateAdded}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {contact.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2.5 py-1 text-xs rounded-full backdrop-blur-sm bg-blue-500/20 dark:bg-blue-400/30 text-blue-700 dark:text-blue-300 border border-blue-200/30 dark:border-blue-500/30 font-medium"
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
      borderColor?: string;
      borderWidth?: number;
      borderRadius?: number;
      hoverBackgroundColor?: string;
      hoverBorderColor?: string;
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
          backgroundColor: 'rgba(147, 51, 234, 0.6)',
          borderColor: 'rgba(147, 51, 234, 0.8)',
          borderWidth: 2,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(147, 51, 234, 0.8)',
          hoverBorderColor: 'rgba(147, 51, 234, 1)'
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
        { icon: "Contact", label: "Total Contacts", value: `${totalContacts}/10000` },
        { icon: "Check", label: "Closed Contacts", value: closedContacts },
        { icon: "Bot", label: "Total AI Responses Used", value: `${totalAIResponses}/${aiMessageQuota}` },
        { icon: "Send", label: "Blasted Messages", value: blastMessageData.datasets[0]?.data.reduce((a, b) => a + b, 0) || 0 },
      ]
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
        <div className="flex gap-3">
          <FormSelect
            className="w-40 rounded-lg border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
            className="w-40 rounded-lg border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                        color: 'rgb(75, 85, 99)',
                        font: {
                          weight: 'bold',
                          size: 12
                        }
                      },
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        lineWidth: 0.5
                      },
                      ticks: {
                        color: 'rgb(107, 114, 128)',
                        font: {
                          size: 11
                        }
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: 'Employee',
                        color: 'rgb(75, 85, 99)',
                        font: {
                          weight: 'bold',
                          size: 12
                        }
                      },
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        lineWidth: 0.5
                      },
                      ticks: {
                        color: 'rgb(107, 114, 128)',
                        font: {
                          size: 11
                        }
                      },
                    },
                  },
                  plugins: {
                    title: {
                      display: true,
                      text: 'Assignments Distribution',
                      color: 'rgb(31, 41, 55)',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 8,
                      cornerRadius: 6,
                      titleFont: {
                        size: 12
                      },
                      bodyFont: {
                        size: 11
                      },
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
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="p-3 backdrop-blur-sm bg-gray-500/10 dark:bg-gray-400/20 rounded-xl border border-gray-200/30 dark:border-gray-500/30 mb-3">
                  <Lucide icon="BarChart3" className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-medium">No assignments data available</p>
              </div>
            )}
          </div>
          
          {/* Daily breakdown table */}
          <div className="mt-6 h-[160px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Employee</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Total</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Last 5 Days</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsData.labels.map(employeeId => {
                  const employeeData = assignmentsData.dailyData[employeeId];
                  const recentAssignments = employeeData.daily.slice(-5);
                  
                  return (
                    <tr key={employeeId} className="border-t border-gray-100/50 dark:border-gray-600/30 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-200">
                      <td className="p-3 font-medium">{employeeId}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{employeeData.total}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {recentAssignments.map(day => (
                            <div key={day.date} className="text-xs p-2 backdrop-blur-sm bg-gray-500/10 dark:bg-gray-400/20 rounded-lg border border-gray-200/30 dark:border-gray-500/30">
                              <div className="text-gray-500 dark:text-gray-400">{format(new Date(day.date), 'MM/dd')}</div>
                              <div className="font-bold text-gray-800 dark:text-gray-200">{day.count}</div>
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
          <div className="flex flex-col w-full h-full overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-100/80 via-blue-100/60 to-indigo-200/80 dark:from-gray-900/90 dark:via-gray-800/80 dark:to-gray-700/90 relative">
        {/* Enhanced background with multiple layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-blue-50/30 dark:from-gray-800/40 dark:via-transparent dark:to-gray-700/30"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/20 via-transparent to-transparent dark:from-purple-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-blue-900/20"></div>
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>

      <div className="container mx-auto px-4 pt-6 pb-6 space-y-6 relative">
        {/* Enhanced background decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/15 to-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-pink-400/15 to-rose-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        </div>
        {/* Dashboard Status Indicator - Removed since fallback data is working correctly */}
        
        {/* KPIs Section - Glassmorphic and Compact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardCards.find(card => card.id === 'kpi')?.content && Array.isArray(dashboardCards.find(card => card.id === 'kpi')?.content) 
            ? (dashboardCards.find(card => card.id === 'kpi')?.content as any[]).map((item: any, index: number) => (
            <div key={index} className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/40 p-5 hover:shadow-3xl transition-all duration-500 hover:scale-[1.03] animate-fade-in-up relative overflow-hidden group" style={{ animationDelay: `${index * 100}ms` }}>
              {/* Glassmorphic inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10 rounded-3xl"></div>
              {/* Subtle border glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.label}</p>
                    <button
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({ x: rect.left, y: rect.bottom + 10 });
                        setInfoTooltip(getKPIInfo(item.label));
                      }}
                    >
                      <Lucide icon="Info" className="w-3 h-3" />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {!loading ? item.value : (
                      <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    )}
                  </h3>
                  
                  {/* Progress bar for Total Contacts */}
                  {item.label === "Total Contacts" && (
                    <div className="mt-3">
                      <div className="w-full h-3 bg-gray-200/30 dark:bg-gray-700/30 rounded-full overflow-hidden backdrop-blur-md border border-white/20 dark:border-gray-600/20 relative">
                        {/* Progress bar glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 rounded-full"></div>
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${
                            totalContacts > 10000
                              ? "from-red-500 to-red-600"
                              : totalContacts > 10000 * 0.9
                              ? "from-red-400 to-red-500"
                              : totalContacts > 10000 * 0.7
                              ? "from-yellow-400 to-yellow-500"
                              : "from-blue-500 to-indigo-600"
                          }`}
                          style={{
                            width: `${Math.min((totalContacts / 10000) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
                        <span className="font-medium">Used: {totalContacts}</span>
                        <span className="font-medium">Limit: 10000</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Progress bar for AI Responses */}
                  {item.label === "Total AI Responses Used" && (
                    <div className="mt-3">
                      <div className="w-full h-3 bg-gray-200/30 dark:bg-gray-700/30 rounded-full overflow-hidden backdrop-blur-md border border-white/20 dark:border-gray-600/20 relative">
                        {/* Progress bar glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 rounded-full"></div>
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${
                            totalAIResponses > aiMessageQuota
                              ? "from-red-500 to-red-600"
                              : totalAIResponses > aiMessageQuota * 0.7
                              ? "from-yellow-400 to-yellow-500"
                              : "from-green-500 to-emerald-600"
                          }`}
                          style={{ 
                            width: `${Math.min((totalAIResponses / aiMessageQuota) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
                        <span className="font-medium">Used: {totalAIResponses}</span>
                        <span className="font-medium">Limit: {aiMessageQuota}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-2xl backdrop-blur-md bg-gradient-to-br from-blue-500/30 to-indigo-600/30 dark:from-blue-400/40 dark:to-indigo-500/40 text-blue-600 dark:text-blue-400 border border-blue-300/40 dark:border-blue-400/40 shadow-lg relative overflow-hidden group">
                  {/* Inner glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-transparent to-indigo-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {item.icon && <Lucide icon={item.icon} className="w-6 h-6 relative z-10" />}
                </div>
              </div>
            </div>
          )) : null}
        </div>
        
        {/* Main Dashboard Cards - Glassmorphic and Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contacts Over Time */}
          {dashboardCards.find(card => card.id === 'contacts-over-time') && (
            <div className="backdrop-blur-xl bg-gradient-to-br from-white/50 via-white/40 to-white/30 dark:from-gray-800/50 dark:via-gray-800/40 dark:to-gray-800/30 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/40 overflow-hidden hover:shadow-3xl transition-all duration-500 relative group">
              {/* Enhanced glassmorphic inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10 rounded-3xl"></div>
              {/* Subtle border glow on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="px-6 pt-5 pb-4 flex justify-between items-center border-b border-white/30 dark:border-gray-500/40 relative z-10">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {dashboardCards.find(card => card.id === 'contacts-over-time')?.title}
                </h3>
                <div className="flex space-x-1.5">
                  {dashboardCards.find(card => card.id === 'contacts-over-time')?.filterControls}
                </div>
              </div>
              <div className="p-6 relative z-10">
                {('datasets' in totalContactsChartData) ? (
                  <Bar data={totalContactsChartData} options={totalContactsChartOptions} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                    <div className="p-3 backdrop-blur-sm bg-gray-500/10 dark:bg-gray-400/20 rounded-xl border border-gray-200/30 dark:border-gray-500/30 mb-3">
                      <Lucide icon="BarChart3" className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium">No data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Split Test Performance */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-white/50 via-white/40 to-white/30 dark:from-gray-800/50 dark:via-gray-800/40 dark:to-gray-800/30 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/40 overflow-hidden hover:shadow-3xl transition-all duration-500 relative group">
            {/* Enhanced glassmorphic inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10 rounded-3xl"></div>
            {/* Subtle border glow on hover */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="px-6 pt-5 pb-4 border-b border-white/30 dark:border-gray-500/40 relative z-10">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Split Test Performance
              </h3>
            </div>
            <SplitTestDashboardCompact />
          </div>
        </div>
        
        {/* Additional Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blast Messages */}
          {dashboardCards.find(card => card.id === 'blast-messages') && (
            <div className="backdrop-blur-xl bg-gradient-to-br from-white/50 via-white/40 to-white/30 dark:from-gray-800/50 dark:via-gray-800/40 dark:to-gray-800/30 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/40 overflow-hidden hover:shadow-3xl transition-all duration-500 relative group">
              {/* Enhanced glassmorphic inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10 rounded-3xl"></div>
              {/* Subtle border glow on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="px-6 pt-5 pb-4 flex justify-between items-center border-b border-white/30 dark:border-gray-500/40 relative z-10">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {dashboardCards.find(card => card.id === 'blast-messages')?.title}
                </h3>
                <Link to="blast-history">
                  <Button variant="primary" size="sm" className="shadow-sm text-xs px-2 py-1">
                    <Lucide icon="ExternalLink" className="w-3 h-3 mr-1" />
                    Blast History
                  </Button>
                </Link>
              </div>
              <div className="p-6 relative z-10">
                <div className="h-64">
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
                              weight: 'bold',
                              size: 12
                            }
                          },
                          grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                          },
                          ticks: {
                            color: 'rgb(107, 114, 128)',
                            font: { size: 11 }
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Month',
                            font: {
                              weight: 'bold',
                              size: 12
                            }
                          },
                          grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                          },
                          ticks: {
                            color: 'rgb(107, 114, 128)',
                            font: { size: 11 }
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
                            padding: 12,
                            font: { size: 11 }
                          }
                        },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          padding: 8,
                          cornerRadius: 4,
                          titleFont: {
                            size: 12
                          },
                          bodyFont: {
                            size: 11
                          }
                        },
                      },
                    }} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 dark:text-gray-400">
                      <div className="p-3 backdrop-blur-sm bg-gray-500/10 dark:bg-gray-400/20 rounded-xl border border-gray-200/30 dark:border-gray-500/30 mb-3">
                        <Lucide icon="Mail" className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium mb-2">No scheduled message data available</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Create blast messages to see analytics here</p>
                    </div>
                  )}
                </div>

                {blastMessageData.labels.length > 0 && (
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-2xl backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-blue-600/20 dark:from-blue-400/30 dark:to-blue-500/30 border border-blue-300/40 dark:border-blue-400/40 hover:bg-blue-500/25 dark:hover:bg-blue-400/35 transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group">
                      {/* Inner glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-transparent to-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1 relative z-10">Total Scheduled:</p>
                      <p className="text-sm font-bold text-blue-900 dark:text-blue-100 relative z-10">
                        {blastMessageData.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl backdrop-blur-md bg-gradient-to-br from-green-500/20 to-green-600/20 dark:from-green-400/30 dark:to-green-500/30 border border-green-300/40 dark:border-green-400/40 hover:bg-green-500/25 dark:hover:bg-green-400/35 transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group">
                      {/* Inner glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-transparent to-green-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1 relative z-10">Total Completed:</p>
                      <p className="text-sm font-bold text-green-900 dark:text-green-100 relative z-10">
                        {blastMessageData.datasets[1].data.reduce((a, b) => a + b, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl backdrop-blur-md bg-gradient-to-br from-red-500/20 to-red-600/20 dark:from-red-400/30 dark:to-red-500/30 border border-red-300/40 dark:border-red-400/40 hover:bg-red-500/25 dark:hover:bg-red-400/35 transition-all duration-300 hover:scale-105 shadow-lg relative overflow-hidden group">
                      {/* Inner glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 via-transparent to-red-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1 relative z-10">Total Failed:</p>
                      <p className="text-sm font-bold text-red-900 dark:text-red-100 relative z-10">
                        {blastMessageData.datasets[2].data.reduce((a, b) => a + b, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Employee Metrics */}
          {dashboardCards.find(card => card.id === 'employee-assignments') && (
            <div className="backdrop-blur-xl bg-gradient-to-br from-white/50 via-white/40 to-white/30 dark:from-gray-800/50 dark:via-gray-800/40 dark:to-gray-800/30 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-600/40 overflow-hidden hover:shadow-3xl transition-all duration-500 relative group">
              {/* Enhanced glassmorphic inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-gray-700/20 dark:via-transparent dark:to-gray-700/10 rounded-3xl"></div>
              {/* Subtle border glow on hover */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="px-6 pt-5 pb-4 border-b border-white/30 dark:border-gray-500/40 relative z-10">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  {dashboardCards.find(card => card.id === 'employee-assignments')?.title}
                </h3>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Select Employee
                  </label>
                  <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
                    <span className="font-medium">Available employees: {employees.length} | Current user: {currentUser?.name || 'None'}</span>
                    <button
                      onClick={async () => {
                        const userEmail = localStorage.getItem('userEmail');
                        if (userEmail) {
                          try {
                            const userResponse = await axios.get(`https://juta-dev.ngrok.dev/api/user-data/${userEmail}`);
                            const companyId = userResponse.data.company_id;
                            if (companyId) {
                              console.log('🔄 Manually refreshing employee assignments...');
                              const assignmentData = await fetchEmployeeAssignments(companyId, userEmail);
                              
                              // Update existing employees with new assignment data
                              const updatedEmployees = employees.map(emp => {
                                const normalizedEmpName = emp.name.trim().toLowerCase();
                                const contactCount = assignmentData.contactCountMap[normalizedEmpName] || 
                                                  Object.keys(assignmentData.contactCountMap).find(key => 
                                                    key.includes(normalizedEmpName) || normalizedEmpName.includes(key)
                                                  ) ? assignmentData.contactCountMap[Object.keys(assignmentData.contactCountMap).find(key => 
                                                    key.includes(normalizedEmpName) || normalizedEmpName.includes(key)
                                                  )!] : emp.assignedContacts;
                                
                                return {
                                  ...emp,
                                  assignedContacts: contactCount,
                                  closedContacts: assignmentData.closedCountMap[normalizedEmpName] || emp.closedContacts,
                                  outgoingMessages: assignmentData.messageCountMap[normalizedEmpName] || emp.outgoingMessages
                                };
                              });
                              
                              setEmployees(updatedEmployees);
                              console.log('✅ Employee assignments refreshed');
                            }
                          } catch (error) {
                            console.error('❌ Error refreshing employee assignments:', error);
                          }
                        }
                      }}
                      className="px-2 py-1 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
                      title="Refresh employee assignments"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                  <EmployeeSearch 
                    employees={employees}
                    onSelect={(employee: { id: string; name: string; assignedContacts?: number | undefined; }) => 
                      handleEmployeeSelect(employee as Employee)}
                    currentUser={currentUser}
                  />
                </div>
              </div>
              <div className="p-6 relative z-10">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-48">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-sm"></div>
                    <span className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">Loading employee data...</span>
                  </div>
                ) : selectedEmployee ? (
                  chartData ? (
                    <div>
                      <div className="flex items-center mb-4 p-3 backdrop-blur-sm bg-blue-500/10 dark:bg-blue-400/20 rounded-xl border border-blue-200/30 dark:border-blue-500/30">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center mr-2 shadow-sm">
                          {selectedEmployee.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{selectedEmployee.name}</span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{selectedEmployee.assignedContacts || 0} assigned contacts</span>
                      </div>
                      <div className="h-48">
                        <Line data={chartData} options={lineChartOptions} />
                      </div>
                    </div>
                                  ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-600 dark:text-gray-400">
                    <div className="p-3 backdrop-blur-sm bg-gray-500/10 dark:bg-gray-400/20 rounded-xl border border-gray-200/30 dark:border-gray-500/30 mb-3">
                      <Lucide icon="BarChart2" className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium mb-1">No assignment data available for this employee</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Employee has {selectedEmployee.assignedContacts || 0} assigned contacts</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-600 dark:text-gray-400">
                  <div className="p-3 backdrop-blur-sm bg-gray-500/10 dark:bg-gray-400/20 rounded-xl border border-gray-200/30 dark:border-gray-500/30 mb-3">
                    <Lucide icon="User" className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">Select an employee to view their chart</p>
                </div>
              )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Tooltip */}
      {infoTooltip && (
        <div 
          className="fixed z-50 backdrop-blur-md bg-black/80 text-white p-3 rounded-xl shadow-2xl max-w-xs text-xs border border-white/20"
          style={{ 
            left: tooltipPosition.x, 
            top: tooltipPosition.y,
            transform: 'translateX(-50%)'
          }}
        >
          {infoTooltip}
          <button
            className="absolute top-2 right-2 text-gray-300 hover:text-white transition-colors duration-200"
            onClick={() => setInfoTooltip(null)}
          >
            <Lucide icon="X" className="w-3 h-3" />
          </button>
        </div>
      )}
      
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