# Quick Reference - Juta CRM API Structure

## Key Files
- **API Client**: Currently scattered (Axios in pages, Fetch in config)
- **Services**: `/src/services/FollowUpService.ts`
- **Redux Store**: `/src/stores/configSlice.ts`
- **Auth Context**: `/src/config.tsx`
- **Button Component**: `/src/components/Base/Button/index.tsx`
- **Notifications**: `/src/components/Base/Notification/` + `react-toastify`
- **Utilities**: `/src/utils/helper.ts` (contains sendWhatsAppMessage)

## API Base URL
```
https://raucous-joaquin-unexamining.ngrok-free.dev
```

## Authentication Flow
1. User logs in (email stored in `localStorage.userEmail`)
2. ConfigProvider fetches user config from `/api/user-company-data`
3. Company ID and role dispatched to Redux store
4. All subsequent API calls use companyId from Redux

## How to Access CompanyId
```typescript
// Method 1: Redux (Recommended)
import { useAppSelector } from '@/stores/hooks';
const companyId = useAppSelector(state => state.config.companyId);

// Method 2: React Context
import { useConfig } from '@/config';
const { config } = useConfig();
const companyId = config?.company_id || config?.id;

// Method 3: localStorage
const cachedConfig = localStorage.getItem('config');
const config = JSON.parse(LZString.decompress(cachedConfig));
const companyId = config.company_id || config.id;
```

## Common API Calls

### Fetch User Context
```typescript
import axios from 'axios';
const response = await axios.get(
  `https://raucous-joaquin-unexamining.ngrok-free.dev/api/user-page-context?email=${userEmail}`
);
```

### Send WhatsApp Message
```typescript
import { sendWhatsAppMessage } from '@/utils/helper';
const success = await sendWhatsAppMessage({
  contactId: '60123456789',
  message: 'Hello!',
  phoneIndex: 0
});
```

### Delete Employee
```typescript
const response = await axios.delete(`${baseUrl}/api/delete-user`, {
  data: { email: employeeEmail, companyId }
});
```

## Toast Notifications
```typescript
import { toast } from 'react-toastify';

toast.success('Success message');
toast.error('Error message');
toast.info('Info message');
toast.warning('Warning message');
```

## Button Usage
```typescript
import Button from '@/components/Base/Button';

// Basic
<Button variant="primary">Click</Button>

// Loading
<Button disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>

// With Icon
<Button variant="danger">
  <Lucide icon="Trash2" className="w-4 h-4 mr-2" />
  Delete
</Button>
```

## Loading State Pattern
```typescript
const [isLoading, setIsLoading] = useState(false);
const [isDataLoaded, setIsDataLoaded] = useState(false);

const handleClick = async () => {
  try {
    setIsLoading(true);
    const response = await apiCall();
    setIsDataLoaded(true);
    toast.success('Success!');
  } catch (error) {
    toast.error('Error: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};

// In JSX
{isLoading && !isDataLoaded && <LoadingSpinner />}
<Button disabled={!isDataLoaded || isLoading} onClick={handleClick}>
  Submit
</Button>
```

## Error Handling Pattern
```typescript
try {
  const response = await axios.get(url);
  if (response.data.success) {
    // Handle success
  } else {
    throw new Error(response.data.message);
  }
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('API Error:', error.response?.status);
    toast.error(error.response?.data?.message || error.message);
  } else {
    toast.error((error as Error).message);
  }
}
```

## User Roles
- "1" = Admin/Owner
- "2" = Manager
- "3" = Agent/Employee
- "4" & "5" = Other roles

## Redux Usage
```typescript
import { useAppSelector, useAppDispatch } from '@/stores/hooks';
import { setConfig } from '@/stores/configSlice';

const config = useAppSelector(state => state.config);
const dispatch = useAppDispatch();
dispatch(setConfig({ companyId: '123' }));
```

## Environment Variables (Recommended)
```
VITE_API_BASE_URL=https://raucous-joaquin-unexamining.ngrok-free.dev
VITE_FIREBASE_API_KEY=...
```

## Best Practices
1. ✅ Use Redux for companyId (avoid prop drilling)
2. ✅ Centralize API calls in service files
3. ✅ Use toast for all user feedback
4. ✅ Always handle errors with try-catch
5. ✅ Set loading state during async operations
6. ✅ Validate data before API calls
7. ✅ Use environment variables for URLs
8. ✅ Use axios interceptors for auth headers
