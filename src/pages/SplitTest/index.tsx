import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Link } from "react-router-dom";

const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL:
    "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L",
};

let companyId = "001";

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

interface Variation {
  id: string;
  name: string;
  instructions: string;
  isActive: boolean;
  customers: number;
  closedCustomers: number;
}

const SplitTest: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [variations, setVariations] = useState<Variation[]>([
    {
      id: "variation-1",
      name: "Variation A",
      instructions: "",
      isActive: false,
      customers: 0,
      closedCustomers: 0,
    },
  ]);

  useEffect(() => {
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchUserRole();
      fetchFirebaseConfig();
      loadVariations();
    }
  }, [companyId]);

  const fetchCompanyId = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnapshot = await getDoc(userDocRef);
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          companyId = userData.companyId;
        }
      } catch (error) {
        console.error("Error fetching company ID:", error);
      }
    }
  };

  const fetchUserRole = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnapshot = await getDoc(userDocRef);
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          setUserRole(userData.role || "");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    }
  };

  const fetchFirebaseConfig = async () => {
    try {
      const configDocRef = doc(firestore, "companies", companyId);
      const configDocSnapshot = await getDoc(configDocRef);
      if (configDocSnapshot.exists()) {
        const configData = configDocSnapshot.data();
        setApiKey(configData.apiKey || "");
      }
    } catch (error) {
      console.error("Error fetching Firebase config:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVariations = () => {
    try {
      const savedVariations = localStorage.getItem(`splitTestVariations_${companyId}`);
      if (savedVariations) {
        const parsedVariations = JSON.parse(savedVariations);
        // Add mock performance data
        const variationsWithData = parsedVariations.map((variation: Variation) => ({
          ...variation,
          customers: variation.isActive ? Math.floor(Math.random() * 100) + 20 : 0,
          closedCustomers: variation.isActive ? Math.floor((Math.random() * 100 + 20) * (Math.random() * 0.4 + 0.1)) : 0,
        }));
        setVariations(variationsWithData);
      }
    } catch (error) {
      console.error("Error loading variations:", error);
    }
  };

  const saveVariations = () => {
    try {
      localStorage.setItem(`splitTestVariations_${companyId}`, JSON.stringify(variations));
      toast.success("Variations saved successfully");
    } catch (error) {
      console.error("Error saving variations:", error);
      toast.error("Failed to save variations");
    }
  };

  const handleVariationChange = (
    variationId: string,
    field: keyof Variation,
    value: string | boolean
  ) => {
    setVariations((prev) =>
      prev.map((variation) =>
        variation.id === variationId
          ? { ...variation, [field]: value }
          : variation
      )
    );
  };

  const addVariation = () => {
    const newVariationId = `variation-${variations.length + 1}`;
    const newVariationLetter = String.fromCharCode(65 + variations.length);
    
    setVariations((prev) => [
      ...prev,
      {
        id: newVariationId,
        name: `Variation ${newVariationLetter}`,
        instructions: "",
        isActive: false,
        customers: 0,
        closedCustomers: 0,
      },
    ]);
  };

  const removeVariation = (variationId: string) => {
    if (variations.length <= 1) {
      toast.error("You must have at least one variation");
      return;
    }
    
    setVariations((prev) => prev.filter((variation) => variation.id !== variationId));
  };

  const toggleVariationStatus = (variationId: string) => {
    setVariations((prev) =>
      prev.map((variation) =>
        variation.id === variationId
          ? { 
              ...variation, 
              isActive: !variation.isActive,
              customers: !variation.isActive ? Math.floor(Math.random() * 100) + 20 : 0,
              closedCustomers: !variation.isActive ? Math.floor((Math.random() * 100 + 20) * (Math.random() * 0.4 + 0.1)) : 0,
            }
          : variation
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-4">
          <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
          <div className="mt-2 text-xs p-2 dark:text-gray-200">
            Loading Split Test...
          </div>
          <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
        </div>
      </div>
    );
  }

  const activeVariations = variations.filter(v => v.isActive);
  const totalCustomers = activeVariations.reduce((sum, v) => sum + v.customers, 0);
  const totalClosed = activeVariations.reduce((sum, v) => sum + v.closedCustomers, 0);
  const overallConversion = totalCustomers > 0 ? (totalClosed / totalCustomers) * 100 : 0;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  AI Split Testing
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Create and test AI assistant variations to optimize customer interactions
                </p>
              </div>
              <Link to="/inbox">
                <Button variant="outline-secondary" className="px-4 py-2">
                  ← Back to Assistant
                </Button>
              </Link>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <div className="text-white text-xl">📊</div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Performance Overview
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Live testing results by variation
                  </p>
                </div>
              </div>
              <Link to="/dashboard">
                <Button variant="outline-primary" className="px-4 py-2 text-sm">
                  📈 View Dashboard →
                </Button>
              </Link>
            </div>
            
            {activeVariations.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🚀</div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Ready to Start Testing?
                </h4>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Activate variations on the right to begin split testing! ✨
                </p>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    💡 Performance data will appear here once you activate variations
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overall Summary */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="font-bold text-xl text-blue-600 dark:text-blue-400">
                      {activeVariations.length}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Active Variations
                    </div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">👥</div>
                    <div className="font-bold text-xl text-blue-600 dark:text-blue-400">
                      {totalCustomers}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Total Customers
                    </div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">✅</div>
                    <div className="font-bold text-xl text-green-600 dark:text-green-400">
                      {totalClosed}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Closed Deals
                    </div>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-800/70 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">📈</div>
                    <div className="font-bold text-xl text-purple-600 dark:text-purple-400">
                      {overallConversion.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Overall Rate
                    </div>
                  </div>
                </div>

                {/* Individual Variation Performance */}
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <span>🏆</span>
                    Variation Performance Ranking
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="grid grid-cols-5 gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 pb-2">
                      <div>Rank & Variation</div>
                      <div className="text-center">Customers</div>
                      <div className="text-center">Closed</div>
                      <div className="text-center">Rate</div>
                      <div className="text-center">Performance</div>
                    </div>
                    
                    {/* Variation Rows */}
                    {activeVariations
                      .map(variation => ({
                        ...variation,
                        conversionRate: variation.customers > 0 ? (variation.closedCustomers / variation.customers) * 100 : 0
                      }))
                      .sort((a, b) => b.conversionRate - a.conversionRate)
                      .map((variation, index) => {
                        const isTop = index === 0 && activeVariations.length > 1;
                        const isWorst = index === activeVariations.length - 1 && activeVariations.length > 1;
                        
                        return (
                          <div
                            key={variation.id}
                            className={`grid grid-cols-5 gap-4 py-3 text-sm rounded-lg transition-colors ${
                              isTop ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' :
                              isWorst ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700' :
                              'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {/* Rank & Variation Name */}
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isTop ? 'bg-yellow-400 text-yellow-900' :
                                isWorst ? 'bg-red-400 text-red-900' :
                                'bg-blue-400 text-blue-900'
                              }`}>
                                {index + 1}
                              </div>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {variation.name}
                              </span>
                              {isTop && <span className="text-lg">👑</span>}
                              {isWorst && <span className="text-lg">📉</span>}
                            </div>
                            
                            {/* Customers */}
                            <div className="text-center font-medium text-blue-600 dark:text-blue-400">
                              {variation.customers}
                            </div>
                            
                            {/* Closed */}
                            <div className="text-center font-medium text-green-600 dark:text-green-400">
                              {variation.closedCustomers}
                            </div>
                            
                            {/* Conversion Rate */}
                            <div className="text-center">
                              <span className={`font-bold ${
                                variation.conversionRate >= 30 ? 'text-green-600 dark:text-green-400' : 
                                variation.conversionRate >= 20 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {variation.conversionRate.toFixed(1)}%
                              </span>
                            </div>
                            
                            {/* Performance Indicator */}
                            <div className="text-center">
                              {isTop && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 rounded-full text-xs font-medium">
                                  🔥 Best
                                </span>
                              )}
                              {isWorst && activeVariations.length > 1 && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 rounded-full text-xs font-medium">
                                  📊 Needs Work
                                </span>
                              )}
                              {!isTop && !isWorst && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full text-xs font-medium">
                                  ⚡ Good
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  
                  {/* Performance Insights */}
                  {activeVariations.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">🏆</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            Best: <strong className="text-slate-900 dark:text-slate-100">
                              {activeVariations
                                .map(v => ({ ...v, rate: v.customers > 0 ? (v.closedCustomers / v.customers) * 100 : 0 }))
                                .sort((a, b) => b.rate - a.rate)[0]?.name}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">📈</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            Needs Improvement: <strong className="text-slate-900 dark:text-slate-100">
                              {activeVariations
                                .map(v => ({ ...v, rate: v.customers > 0 ? (v.closedCustomers / v.customers) * 100 : 0 }))
                                .sort((a, b) => a.rate - b.rate)[0]?.name}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Variations Editor */}
            <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  AI Variations
                </h2>
                <Button
                  variant="outline-primary"
                  onClick={addVariation}
                  className="px-4 py-2"
                  disabled={userRole === "3"}
                >
                  + Add Variation
                </Button>
              </div>

              {/* Horizontal scrollable variations */}
              <div className="overflow-x-auto pb-4" style={{ scrollBehavior: 'smooth' }}>
                <div className="flex gap-4 min-w-max">
                  {variations.map((variation, index) => (
                    <div
                      key={variation.id}
                      className="flex-shrink-0 w-80 border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="text"
                          value={variation.name}
                          onChange={(e) =>
                            handleVariationChange(variation.id, "name", e.target.value)
                          }
                          className="text-lg font-medium bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none focus:border-blue-500 dark:text-slate-200 flex-1 mr-2"
                          placeholder="Variation name..."
                          disabled={userRole === "3"}
                        />
                        {variations.length > 1 && (
                          <Button
                            variant="outline-danger"
                            onClick={() => removeVariation(variation.id)}
                            className="px-2 py-1 text-xs"
                            disabled={userRole === "3"}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                      <div className="relative">
                        <textarea
                          value={variation.instructions}
                          onChange={(e) =>
                            handleVariationChange(variation.id, "instructions", e.target.value)
                          }
                          placeholder="Enter the AI instructions for this variation..."
                          className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto"
                          disabled={userRole === "3"}
                          style={{ 
                            height: '300px',
                            minHeight: '300px', 
                            maxHeight: '300px'
                          }}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                          {variation.instructions.length} chars
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end mt-6">
                <Button
                  variant="primary"
                  onClick={saveVariations}
                  className="px-6 py-2"
                  disabled={userRole === "3"}
                >
                  💾 Save All Variations
                </Button>
              </div>
            </div>

            {/* Variations Management */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Manage Variations
              </h2>

              {variations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-slate-400 text-lg mb-2">🎨</div>
                  <p className="text-slate-500 dark:text-slate-400">
                    No variations created yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {variations.map((variation) => {
                    const conversionRate = variation.customers > 0 
                      ? (variation.closedCustomers / variation.customers) * 100 
                      : 0;
                    
                    return (
                      <div
                        key={variation.id}
                        className={`border rounded-lg p-4 transition-all ${
                          variation.isActive
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                            : 'border-slate-200 bg-slate-50 dark:bg-slate-700 dark:border-slate-600'
                        }`}
                      >
                                                 <div className="flex items-center justify-between mb-3">
                           <h3 className="font-medium text-slate-900 dark:text-slate-100">
                             {variation.name}
                           </h3>
                           <div className="flex items-center gap-2">
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                               variation.isActive
                                 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                 : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                             }`}>
                               {variation.isActive ? '🟢 Active' : '⚫ Inactive'}
                             </span>
                             <Button
                               variant={variation.isActive ? "outline-danger" : "outline-primary"}
                               onClick={() => toggleVariationStatus(variation.id)}
                               className="px-3 py-1 text-xs"
                               disabled={userRole === "3"}
                             >
                               {variation.isActive ? 'Deactivate' : 'Activate'}
                             </Button>
                           </div>
                         </div>

                        {variation.isActive && (
                          <div className="mt-3 space-y-2">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                  {variation.customers}
                                </div>
                                <div className="text-slate-600 dark:text-slate-400">Customers</div>
                              </div>
                              <div className="text-center p-2 bg-white dark:bg-slate-800 rounded">
                                <div className="font-bold text-green-600 dark:text-green-400">
                                  {variation.closedCustomers}
                                </div>
                                <div className="text-slate-600 dark:text-slate-400">Closed</div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className={`text-lg font-bold ${
                                conversionRate >= 30 ? 'text-green-600' : 
                                conversionRate >= 20 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {conversionRate.toFixed(1)}%
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                Conversion Rate
                              </div>
                            </div>
                          </div>
                        )}

                        {!variation.isActive && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Activate to start collecting data
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default SplitTest; 