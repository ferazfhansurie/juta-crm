# Juta CRM - API & Application Structure Guide

## Overview
This React application uses a combination of Firebase for authentication and real-time data, PostgreSQL backend via REST API, Redux for global state management, and React Context for configuration management.

---

## 1. API SERVICE ARCHITECTURE

### 1.1 Base Configuration
**Location**: Throughout components (no centralized API client yet)

```typescript
// Current Pattern - Duplicated in multiple files
const baseUrl = "https://bisnesgpt.jutateknologi.com"; // Main backend server
// OR
import.meta.env.VITE_API_BASE_URL || 'https://bisnesgpt.jutateknologi.com'
```

**HTTP Clients Used**:
- **Axios**: Used in `/src/pages/UsersLayout2/index.tsx`, `/src/pages/Inbox/index.tsx`
- **Fetch API**: Used in `/src/config.tsx`, `/src/themes/Tinker/SimpleMenu/index.tsx`

### 1.2 Key Service Files

#### **FollowUpService** - `/src/services/FollowUpService.ts`
- Dedicated Firebase service for follow-up template management
- Uses Firestore database directly
- Methods:
  - `processFollowUpTemplates(companyId)` - Process active templates
  - `executePendingMessages(companyId)` - Send scheduled messages
  - `testFollowUpExecution(templateId)` - Test follow-up execution
  - `sendMessage()` - Internal method for sending messages

```typescript
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

class FollowUpService {
    private firestore = getFirestore();
    private functions = getFunctions();
    
    async processFollowUpTemplates(companyId: string) { ... }
}
```

### 1.3 API Endpoints Pattern
Common API endpoints used across the application:

```
POST   /api/user-company-data?email=...           # Get user config
GET    /api/user-page-context?email=...           # Get page context with company data
GET    /api/company-groups?companyId=...          # Get company groups
DELETE /api/delete-user                           # Delete employee
PUT    /api/update-phone-name                     # Update phone name
POST   /api/v2/messages/text/{companyId}/{contactId}  # Send WhatsApp message
```

---

## 2. AUTHENTICATION & AUTHORIZATION

### 2.1 Firebase Authentication
**Location**: `/src/config.tsx`

```typescript
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  projectId: "onboarding-a5fcb",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
```

### 2.2 Custom Auth System (Primary)
- User email stored in `localStorage.userEmail`
- Used as primary authentication mechanism
- Checked on app startup in ConfigProvider

```typescript
// Authentication flow
const userEmail = localStorage.getItem('userEmail');
if (userEmail) {
  // Fetch user config and company data
  fetchConfigOnAuthChange();
}
```

### 2.3 User Roles
Stored and managed through Redux store:

```typescript
// Role types found in application:
// "1" = Admin/Owner
// "2" = Manager
// "3" = Agent/Employee
// "4" & "5" = Other roles

interface Config {
  name?: string;
  userRole?: string;      // Role ID
  companyId?: string;     // Company ID - PRIMARY KEY for data access
}
```

### 2.4 API Authentication
- Uses `credentials: 'include'` for cookie-based auth
- Content-Type header: `'application/json'`

```typescript
const response = await fetch(url, {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  credentials: "include",  // Enable cookies
});
```

---

## 3. COMPANY ID ACCESS PATTERNS

### 3.1 Redux Store (Primary Method)
**Location**: `/src/stores/configSlice.ts`

```typescript
import { useAppSelector } from '@/stores/hooks';

// Inside component:
const config = useAppSelector(state => state.config);
const companyId = config.companyId;
```

**Store Structure**:
```typescript
export interface Config {
  name?: string;
  userRole?: string;
  companyId?: string;
}

export const configSlice = createSlice({
  name: "config",
  initialState: { name: undefined, userRole: undefined, companyId: undefined },
  reducers: {
    setConfig: (state, action: PayloadAction<Config>) => {
      return { ...state, ...action.payload };
    },
  },
});
```

### 3.2 React Context (Fallback)
**Location**: `/src/config.tsx`

```typescript
import { useConfig } from '@/config';

// Inside component:
const { config } = useConfig();
const companyId = config?.company_id || config?.id;
```

### 3.3 localStorage (Direct Access)
Used when Redux is not initialized:

```typescript
const cachedConfig = localStorage.getItem('config');
if (cachedConfig) {
  const config = JSON.parse(LZString.decompress(cachedConfig));
  const companyId = config.company_id || config.id;
}
```

### 3.4 Local State
Individual page components maintain local state:

```typescript
// /src/pages/UsersLayout2/index.tsx
const [companyId, setCompanyId] = useState<string>("");

useEffect(() => {
  const response = await axios.get(`${baseUrl}/api/user-page-context?email=...`);
  setCompanyId(response.data.companyId);
}, []);
```

---

## 4. NOTIFICATION/TOAST SYSTEM

### 4.1 React-Toastify (Primary)
**Installation**: `npm install react-toastify`

```typescript
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Usage:
toast.success('Operation completed successfully');
toast.error('An error occurred');
toast.info('Information message');
toast.warning('Warning message');
```

**Component Setup** (in page components):
```typescript
function Main() {
  return (
    <>
      <ToastContainer position="top-right" />
      {/* Rest of component */}
    </>
  );
}
```

### 4.2 Custom Notification Component
**Location**: `/src/components/Base/Notification/index.tsx`

```typescript
import Notification from '@/components/Base/Notification';

// Usage:
const notificationRef = useRef<NotificationElement>(null);

<Notification
  getRef={(el) => (notificationRef.current = el)}
  options={{ duration: 3000 }}
>
  <div>Notification content</div>
</Notification>

// Show toast:
notificationRef.current?.showToast();
```

### 4.3 Toast Configuration Example
```typescript
// Standard success notification
toast.success("Employee deleted successfully");

// Error with message
toast.error(`Failed to delete employee: ${error.message}`);

// With timeout
toast.info("Processing...", { autoClose: 5000 });
```

---

## 5. BUTTON COMPONENT & LOADING STATES

### 5.1 Base Button Component
**Location**: `/src/components/Base/Button/index.tsx`

```typescript
import Button from '@/components/Base/Button';

// Props interface:
type ButtonProps<C extends React.ElementType> = {
  as?: C extends string ? "button" | "a" : C;
  variant?: "primary" | "secondary" | "success" | "warning" | 
            "danger" | "dark" | "outline-primary" | "soft-primary" | ...;
  elevated?: boolean;
  size?: "sm" | "lg";
  rounded?: boolean;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
  children?: React.ReactNode;
  className?: string;
}
```

### 5.2 Button Usage Examples

```typescript
// Basic button
<Button variant="primary">Click me</Button>

// Loading state
<Button 
  variant="primary" 
  disabled={isLoading}
  onClick={handleSubmit}
>
  {isLoading ? "Loading..." : "Submit"}
</Button>

// With icon (using Lucide)
<Button variant="danger">
  <Lucide icon="Trash2" className="w-4 h-4 mr-2" />
  Delete
</Button>

// Link button
<Button as="a" href="/dashboard" variant="outline-primary">
  Go to Dashboard
</Button>

// Soft button
<Button variant="soft-primary" size="sm">Small button</Button>
```

### 5.3 Loading State Patterns

**Pattern 1: useState Hook**
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleClick = async () => {
  try {
    setIsLoading(true);
    await apiCall();
    toast.success('Success!');
  } catch (error) {
    toast.error('Error!');
  } finally {
    setIsLoading(false);
  }
};

<Button disabled={isLoading} onClick={handleClick}>
  {isLoading ? "Processing..." : "Submit"}
</Button>
```

**Pattern 2: Multiple States**
```typescript
const [isLoading, setIsLoading] = useState(false);
const [isDataLoaded, setIsDataLoaded] = useState(false);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    setIsLoading(true);
    const response = await axios.get('/api/data');
    // process response
    setIsDataLoaded(true);
  } finally {
    setIsLoading(false);
  }
};

// Render conditional UI
{isLoading && !isDataLoaded && <LoadingSpinner />}
{isDataLoaded && <DataDisplay />}

// Disable button
<Button disabled={!isDataLoaded || isLoading}>Submit</Button>
```

**Pattern 3: Loading Icon Component**
```typescript
import LoadingIcon from '@/components/Base/LoadingIcon';

<Button>
  <LoadingIcon icon="tail-spin" className="w-4 h-4 mr-2" />
  Processing...
</Button>
```

---

## 6. COMMON API CALL PATTERNS

### 6.1 Error Handling Pattern

```typescript
const handleDelete = async (employeeEmail: string) => {
  try {
    setIsLoading(true);
    
    // Validate data
    if (!employeeEmail) {
      throw new Error('Employee email not found');
    }
    if (!isDataLoaded) {
      throw new Error('Data is still loading');
    }
    
    // API call
    const response = await axios.delete(`${baseUrl}/api/delete-user`, {
      data: { 
        email: employeeEmail,
        companyId: companyId 
      }
    });

    // Handle success
    if (response.data.success) {
      toast.success('Employee deleted successfully');
      // Update UI
      const updated = employeeList.filter(e => e.email !== employeeEmail);
      setEmployeeList(updated);
    } else {
      throw new Error(response.data.message || 'Failed to delete');
    }
    
  } catch (error) {
    // Handle different error types
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data?.message || error.message;
      toast.error(`Error: ${errorMsg}`);
      console.error('API Error:', { 
        status: error.response?.status,
        data: error.response?.data 
      });
    } else {
      toast.error((error as Error).message);
    }
  } finally {
    setIsLoading(false);
  }
};
```

### 6.2 Fetch API Pattern

```typescript
const fetchUserConfig = async (userEmail: string) => {
  try {
    const response = await fetch(
      `https://bisnesgpt.jutateknologi.com/api/user-company-data?email=${encodeURIComponent(userEmail)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const userData = await response.json();
    return userData;
    
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
};
```

### 6.3 WhatsApp Message Sending Pattern
**Location**: `/src/utils/helper.ts`

```typescript
export const sendWhatsAppMessage = async ({
  contactId,
  message,
  quotedMessageId,
  phoneIndex = 0
}: SendWhatsAppMessageParams): Promise<boolean> => {
  try {
    // Get company ID from config
    const cachedConfig = localStorage.getItem('config');
    const config = JSON.parse(LZString.decompress(cachedConfig));
    const companyId = config.company_id || config.id;
    
    // Format contact ID
    const formattedContactId = formatContactId(contactId, companyId);

    // Send request
    const response = await fetch(
      `https://bisnesgpt.jutateknologi.com/api/v2/messages/text/${companyId}/${formattedContactId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          phoneIndex,
          quotedMessageId
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send: ${response.status} ${errorData}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
};
```

---

## 7. REDUX STORE SETUP

**Location**: `/src/stores/`

### 7.1 Store Configuration
```typescript
// /src/stores/store.ts
import { configureStore } from "@reduxjs/toolkit";
import configReducer from "./configSlice";
import darkModeReducer from "./darkModeSlice";
// ... other reducers

export const store = configureStore({
  reducer: {
    config: configReducer,
    darkMode: darkModeReducer,
    colorScheme: colorSchemeReducer,
    menu: menuReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        warnAfter: 128,
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 7.2 Typed Hooks
```typescript
// /src/stores/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 7.3 Using Hooks in Components
```typescript
import { useAppSelector, useAppDispatch } from '@/stores/hooks';
import { setConfig } from '@/stores/configSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const config = useAppSelector(state => state.config);

  const updateConfig = (newConfig: any) => {
    dispatch(setConfig(newConfig));
  };

  return <div>{config.companyId}</div>;
}
```

---

## 8. CONTEXT API PATTERN

### 8.1 ConfigContext
**Location**: `/src/config.tsx`

```typescript
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

  // Fetch logic here...

  return (
    <ConfigContext.Provider value={{ config, isLoading, userRole }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};
```

### 8.2 Using Context
```typescript
import { useConfig } from '@/config';

function MyComponent() {
  const { config, isLoading, userRole } = useConfig();

  if (isLoading) return <LoadingSpinner />;

  return <div>{config?.name}</div>;
}
```

---

## 9. BEST PRACTICES & RECOMMENDATIONS

### 9.1 API Client Centralization (RECOMMENDED)
Create a single API client to avoid duplication:

```typescript
// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     'https://bisnesgpt.jutateknologi.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor for authentication
apiClient.interceptors.request.use((config) => {
  const userEmail = localStorage.getItem('userEmail');
  if (userEmail) {
    config.headers['X-User-Email'] = userEmail;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('userEmail');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 9.2 API Service Abstraction
```typescript
// src/services/userService.ts
import apiClient from './api';

export const userService = {
  getUserContext: (email: string) => 
    apiClient.get('/api/user-page-context', { params: { email } }),
  
  deleteEmployee: (email: string, companyId: string) =>
    apiClient.delete('/api/delete-user', { 
      data: { email, companyId } 
    }),
  
  updatePhoneName: (companyId: string, phoneIndex: number, phoneName: string) =>
    apiClient.put('/api/update-phone-name', {
      companyId,
      phoneIndex,
      phoneName
    }),
};
```

### 9.3 Environment Variables
```
# .env.local
VITE_API_BASE_URL=https://bisnesgpt.jutateknologi.com
VITE_FIREBASE_API_KEY=AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc
VITE_FIREBASE_PROJECT_ID=onboarding-a5fcb
```

### 9.4 Error Boundary
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error caught:', error, errorInfo);
    toast.error('An unexpected error occurred');
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }
    return this.props.children;
  }
}
```

---

## 10. SUMMARY TABLE

| Aspect | Implementation | Location |
|--------|---|---|
| **API HTTP Client** | Axios + Fetch | Various pages |
| **Authentication** | Firebase + Custom (localStorage) | `/src/config.tsx` |
| **Authorization** | Role-based (stored in Redux) | `/src/stores/configSlice.ts` |
| **CompanyId Access** | Redux > Context > localStorage | Multiple |
| **Toast/Notification** | react-toastify + Custom | `/src/components/Base/Notification` |
| **Button Component** | Custom Polymorphic | `/src/components/Base/Button` |
| **Loading States** | useState Hook | Component level |
| **Global State** | Redux Toolkit | `/src/stores/` |
| **Config Management** | React Context + Redux | `/src/config.tsx` |

