import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { useNavigate } from "react-router-dom";
import LZString from 'lz-string';
import { useDispatch } from 'react-redux';
import { setConfig } from './stores/configSlice';

const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

interface ConfigContextProps {
  config: any;
  isLoading: boolean;
  userRole: string | null;
}

const ConfigContext = createContext<ConfigContextProps | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setLocalConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // Clear the session flag when the page reloads
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem('configFetched');
    });

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave? Changes you made may not be saved.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const shouldFetchConfig = !sessionStorage.getItem('configFetched');
    console.log('Should fetch config:', shouldFetchConfig);
    console.log('Session storage configFetched:', sessionStorage.getItem('configFetched'));

    // Check if we have cached config in localStorage
    const cachedConfig = localStorage.getItem('config');
    if (cachedConfig) {
      try {
        const parsedConfig = JSON.parse(LZString.decompress(cachedConfig));
        console.log('Found cached config:', parsedConfig);
        setLocalConfig(parsedConfig);
        if (parsedConfig.name) {
          dispatch(setConfig({ 
            name: parsedConfig.name,
            userRole: parsedConfig.role,
            companyId: parsedConfig.company_id,
          }));
        }
      } catch (error) {
        console.error('Error parsing cached config:', error);
      }
    }

    fetchConfigOnAuthChange();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  const fetchConfigOnAuthChange = () => {
    const fetchConfig = async (user: User) => {
      try {
        console.log('Starting config fetch for user:', user.email);
        setIsLoading(true);

        // Fetch user data from Neon database
        const userResponse = await fetch(
          `https://juta-dev.ngrok.dev/api/user/config?email=${encodeURIComponent(user.email!)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        console.log('User response status:', userResponse.status);
        console.log('User response ok:', userResponse.ok);

        if (!userResponse.ok) {
          console.error('Failed to fetch user config from Neon');
          setIsLoading(false);
          return;
        }

        const userData = await userResponse.json();
        console.log('User data received:', userData);
        
        const companyId = userData.company_id;
        const role = userData.role;
        
        console.log('Company ID:', companyId);
        console.log('User role:', role);
        
        setUserRole(role);

        if (!companyId) {
          console.error('No company ID found in user data');
          setIsLoading(false);
          return;
        }

        // Fetch company data from Neon database
        const companyResponse = await fetch(
          `https://juta-dev.ngrok.dev/api/company-details?companyId=${companyId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          }
        );

        console.log('Company response status:', companyResponse.status);
        console.log('Company response ok:', companyResponse.ok);

        if (!companyResponse.ok) {
          console.error('Failed to fetch company details from Neon');
          setIsLoading(false);
          return;
        }

        const companyData = await companyResponse.json();
        console.log('Company data received:', companyData);

        // Store the configuration data in local state and Redux
        console.log('Setting local config:', companyData);
        setLocalConfig(companyData);
        
        const configPayload = { 
          name: companyData.name,
          userRole: role,
          companyId: companyId,
        };
        console.log('Dispatching config to Redux:', configPayload);
        dispatch(setConfig(configPayload));
        
        // Test if Redux is working
        console.log('Testing Redux dispatch...');
        setTimeout(() => {
          console.log('Redux state after dispatch should be updated');
        }, 100);
        
        localStorage.setItem('config', LZString.compress(JSON.stringify(companyData)));
        sessionStorage.setItem('configFetched', 'true');
        console.log('Config fetch completed successfully');

      } catch (error) {
        console.error('Error fetching config from Neon:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed, user:', user);
      if (user) {
        console.log('User authenticated, fetching config for:', user.email);
        fetchConfig(user);
      } else {
        console.log('No user authenticated');
        const currentPath = window.location.pathname;
        if (currentPath === '/register') {
          navigate('/register');
        } else  if (!currentPath.includes('/guest-chat')) {
      
        } else {

        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  };

  return (
    <ConfigContext.Provider value={{ config, isLoading, userRole }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  
  console.log('useConfig hook called, context:', context);
  console.log('useConfig config:', context.config);
  console.log('useConfig config?.name:', context.config?.name);
  
  return context;
};

export { ConfigContext };