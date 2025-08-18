# Juta CRM Onboarding System

A comprehensive step-by-step onboarding guide designed to help new users understand and navigate the Juta CRM system effectively.

## Features

### 🎯 **Interactive Step-by-Step Guide**
- **7 comprehensive steps** covering all major system features
- **Progress tracking** with visual indicators
- **Skip/complete options** for user flexibility
- **Direct navigation** to relevant features

### 🚀 **Multiple Trigger Options**
- **Auto-trigger**: Automatically shows for new users
- **Manual triggers**: Buttons, banners, and floating buttons
- **Customizable appearance** and positioning

### 💾 **Smart State Management**
- **Persistent storage** using localStorage
- **User preference tracking** (completed/skipped)
- **Automatic detection** of new vs. returning users

## Components

### 1. OnboardingGuide
The main modal component that displays the step-by-step guide.

```tsx
import OnboardingGuide from './components/OnboardingGuide';

<OnboardingGuide onClose={() => console.log('Guide closed')} />
```

### 2. OnboardingTrigger
Manual trigger component with multiple variants.

```tsx
import OnboardingTrigger from './components/OnboardingTrigger';

// Button variant
<OnboardingTrigger variant="button" />

// Banner variant
<OnboardingTrigger variant="banner" />

// Floating variant
<OnboardingTrigger variant="floating" />
```

### 3. AutoOnboardingTrigger
Automatically shows onboarding for new users.

```tsx
import AutoOnboardingTrigger from './components/OnboardingTrigger/AutoTrigger';

<AutoOnboardingTrigger 
  autoShow={true}
  showBanner={true}
  showFloatingButton={true}
/>
```

### 4. useOnboarding Hook
Custom hook for managing onboarding state.

```tsx
import { useOnboarding } from './hooks/useOnboarding';

const {
  shouldShowOnboarding,
  isOnboardingOpen,
  startOnboarding,
  closeOnboarding,
  completeOnboarding,
  resetOnboarding
} = useOnboarding();
```

## Onboarding Steps

### 1. **Welcome to Juta CRM**
- Introduction to the system
- Overview of key benefits
- Getting started encouragement

### 2. **WhatsApp Chat Management**
- Centralized chat hub
- Real-time synchronization
- Contact management and tagging
- Quick reply templates
- Message history and search

### 3. **Contact Management**
- Smart contact organization
- Import from various sources
- Custom tags and categories
- Activity tracking
- Bulk operations

### 4. **Marketing Automations**
- Welcome message sequences
- Follow-up campaigns
- Trigger-based messaging
- Performance tracking

### 5. **AI-Powered Responses**
- Context-aware suggestions
- Multi-language support
- Brand voice customization
- Response quality scoring

### 6. **Analytics & Reports**
- Message delivery statistics
- Campaign performance metrics
- Customer engagement insights
- Exportable reports

### 7. **System Configuration**
- WhatsApp connection setup
- User permissions and roles
- Notification preferences
- Integration settings

## Implementation

### Basic Setup

1. **Import the CSS** (optional, for animations):
```tsx
import './assets/css/components/onboarding.css';
```

2. **Add to your main layout**:
```tsx
import AutoOnboardingTrigger from './components/OnboardingTrigger/AutoTrigger';

function App() {
  return (
    <div>
      {/* Your app content */}
      <AutoOnboardingTrigger />
    </div>
  );
}
```

3. **Add manual triggers** where needed:
```tsx
import OnboardingTrigger from './components/OnboardingTrigger';

function Header() {
  return (
    <header>
      <OnboardingTrigger variant="button" />
    </header>
  );
}
```

### Customization

#### Custom Styling
```tsx
<OnboardingTrigger 
  variant="button" 
  className="bg-red-500 hover:bg-red-600"
/>
```

#### Conditional Display
```tsx
const { shouldShowOnboarding } = useOnboarding();

{shouldShowOnboarding && (
  <OnboardingTrigger variant="banner" />
)}
```

#### Custom Triggers
```tsx
const { startOnboarding } = useOnboarding();

<button onClick={startOnboarding}>
  Custom Onboarding Button
</button>
```

## Demo Page

Visit `/onboarding-demo` to see all components in action and test different configurations.

## Styling

The onboarding system uses Tailwind CSS classes and includes:

- **Responsive design** for all screen sizes
- **Smooth animations** and transitions
- **Modern UI components** with gradients and shadows
- **Accessibility features** with proper ARIA labels

### Custom CSS Classes

- `.animate-fade-in` - Fade in animation
- `.animate-slide-in-right` - Slide in from right
- `.animate-scale-in` - Scale in animation
- `.floating-button-pulse` - Pulsing effect for floating buttons

## State Management

### Local Storage Keys
- `onboardingCompleted` - Tracks if user has completed onboarding

### State Variables
- `shouldShowOnboarding` - Whether to show onboarding for this user
- `isOnboardingOpen` - Whether the onboarding modal is currently open
- `currentStep` - Current step in the onboarding process
- `completedSteps` - Set of completed step IDs

## Best Practices

### 1. **User Experience**
- Don't force users through onboarding
- Provide skip options
- Keep steps concise and focused
- Include actionable examples

### 2. **Performance**
- Lazy load onboarding components
- Use localStorage for persistence
- Minimize bundle size impact

### 3. **Accessibility**
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- High contrast options

### 4. **Mobile Optimization**
- Touch-friendly interactions
- Responsive layouts
- Optimized for small screens

## Troubleshooting

### Common Issues

1. **Onboarding not showing**
   - Check if `onboardingCompleted` exists in localStorage
   - Verify component is properly imported
   - Check browser console for errors

2. **Steps not progressing**
   - Ensure all required props are passed
   - Check state management logic
   - Verify event handlers are connected

3. **Styling issues**
   - Confirm Tailwind CSS is loaded
   - Check for CSS conflicts
   - Verify responsive breakpoints

### Debug Mode

Enable debug logging by setting:
```tsx
localStorage.setItem('onboardingDebug', 'true');
```

## Future Enhancements

- [ ] **Multi-language support** for international users
- [ ] **Video tutorials** integration
- [ ] **Interactive tooltips** for specific UI elements
- [ ] **Progress persistence** across sessions
- [ ] **Custom step content** from backend
- [ ] **A/B testing** for different onboarding flows
- [ ] **Analytics tracking** for onboarding completion rates

## Contributing

When adding new onboarding steps:

1. Update the `steps` array in `OnboardingGuide`
2. Add relevant icons and descriptions
3. Include action buttons for direct navigation
4. Test on different screen sizes
5. Update this documentation

## License

This onboarding system is part of the Juta CRM project and follows the same licensing terms.
