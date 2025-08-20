import { Navigate, useLocation, useRoutes } from "react-router-dom";
import DashboardOverview1 from "../pages/DashboardOverview1";
import DashboardOverview2 from "../pages/DashboardOverview2";
import DashboardOverview3 from "../pages/DashboardOverview3";
import DashboardOverview4 from "../pages/DashboardOverview4";
import TransactionList from "../pages/TransactionList";
import TransactionDetail from "../pages/TransactionDetail";
import Inbox from "../pages/Inbox";
import FileManager from "../pages/FileManager";
import PointOfSale from "../pages/PointOfSale";
import Chat from "../pages/Chat";
import Post from "../pages/Post";
import Calendar from "../pages/Calendar";
import CrudDataList from "../pages/CrudDataList";
import CrudForm from "../pages/CrudForm";
import UsersLayout1 from "../pages/UsersLayout1";
import UsersLayout2 from "../pages/UsersLayout2";
import UsersLayout3 from "../pages/UsersLayout3";
import ProfileOverview1 from "../pages/ProfileOverview1";
import ProfileOverview2 from "../pages/ProfileOverview2";
import ProfileOverview3 from "../pages/ProfileOverview3";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ErrorPage from "../pages/ErrorPage";
import UpdateProfile from "../pages/UpdateProfile";
import ChangePassword from "../pages/ChangePassword";
import Modal from "../pages/Modal";
import Notification from "../pages/Notification";
import Button from "../pages/Button";
import ProgressBar from "../pages/ProgressBar";
import Tooltip from "../pages/Tooltip";
import Dropdown from "../pages/Dropdown";
import Typography from "../pages/Typography";
import Icon from "../pages/Icon";
import LoadingIcon from "../pages/LoadingPage";
import LoadingIcon2 from "../pages/LoadingPage2";
import Datepicker from "../pages/Datepicker";
import FileUpload from "../pages/FileUpload";
import ImageZoom from "../pages/ImageZoom";
import Opportunities from "../pages/Opportunities";
import QuickReplies from "../pages/QuickReplies";
import Automations from "../pages/Automations";
import Builder from "../pages/Builder";
import FollowUps from "../pages/FollowUps";
import OnboardingFollowUps from "../pages/FollowUps/OnboardingFollowUps";
import OldFollowUps from "../pages/FollowUpsOld";
import SelectFollowUpMode from "../pages/FollowUpsSelect";
import BlastHistory from "../pages/BlastHistory"
import Layout from "../themes";
import { getAuth } from "firebase/auth";
import { useState, useEffect } from "react";
import AIResponses from "../pages/AIResponses";
import OnboardingAIResponses from "../pages/AIResponses/OnboardingAIResponses";
import StoragePricing from "../pages/StoragePricing";
import { ContactsProvider, useContacts } from "../contact"; // Adjust the path as needed
import DatabaseManager from "../pages/DatabaseManager";
import AIGenerativeResponses from "../pages/AIGenerativeResponses";
import Ticket from "../pages/Ticket";
import PublicTaskForm from "../pages/PublicTaskForm";
import Settings from "../pages/Settings";
import ScheduledMessages from "../pages/ScheduledMessages";
import AppointmentRequests from "../pages/AppointmentRequests";
import GuestChat from "../pages/GuestChat";
import FeedbackFormBuilder from "../pages/FeedbackFormBuilder";
import PublicFeedbackForm from "../pages/PublicFeedbackForm";
import PublicRegisterForm from "../pages/PublicRegisterForm";
import PublicAttendanceForm from "../pages/PublicAttendanceForm";
import PublicBookingForm from "../pages/PublicBookingForm";
import DataImport from "../pages/DataImport";
import Builder2 from "../pages/Builder2";
import ChatGPTStyle from "../pages/ChatGPTStyle";
import SplitTest from "../pages/SplitTest";
import ThankYou from "../pages/ThankYou";
import OnboardingDemo from "../pages/OnboardingDemo";

function Router() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const auth = getAuth();

  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, [auth]);

  const routes = [
    {
      path: "/",
      element:(
        <div className="h-screen flex flex-col">
          <Layout />
        </div>
      ),
      children: [
        { path: "/", element: <Chat /> },
        { path: "chat", element: <Chat /> },
        { path: "/dashboard", element: <DashboardOverview1 /> },
        { path: "ticket", element: <Ticket /> },
                    { path: "crud-form", element: <CrudForm /> },
            { path: "settings", element: <Settings /> },
            { path: "feedback-form-builder", element: <FeedbackFormBuilder /> },
            { path: "data-import", element: <DataImport /> },
        { path: "quick-replies", element: <QuickReplies /> },
        { path: "a-i-responses", element: <AIResponses /> },
        { path: "automations", element: <Automations /> },
        { path: "follow-ups", element: <FollowUps /> },

        { path: "follow-ups-select", element: <SelectFollowUpMode /> },
        { path: "follow-ups-old", element: <OldFollowUps /> },
        { path: "a-i-generative-responses", element: <AIGenerativeResponses /> },
        { path: "storage-pricing", element: <StoragePricing /> },
        { path: "/client-ticket", element: <PublicTaskForm /> },

        {path: "/loading2", element: <LoadingIcon2 />},
        { path: "opportunities", element: <Opportunities /> },
        { path: "appointment-requests", element: <AppointmentRequests /> },
        { path: "scheduled-messages", element: <ScheduledMessages /> },

        {
          path: "/database-manager",
          element: <DatabaseManager />
        },
        { path: "/dashboard/blast-history", element: <BlastHistory /> },
        { path: "users-layout-2/quick-replies", element: <QuickReplies /> },
        { path: "users-layout-2/settings", element: <Settings /> },
        { path: "users-layout-2/automations", element: <Automations /> },
        { path: "users-layout-2/follow-ups", element: <FollowUps /> },
        { path: "users-layout-2/follow-ups-select", element: <SelectFollowUpMode /> },
        { path: "users-layout-2/follow-ups-old", element: <OldFollowUps /> },
        { path: "users-layout-2/a-i-responses", element: <AIResponses /> },
        { path: "users-layout-2/a-i-generative-responses", element: <AIGenerativeResponses /> },
        { path: "users-layout-2/builder", element: <Builder /> },
        { path: "users-layout-2/builder2", element: <Builder2 /> },
        { path: "users-layout-2/storage-pricing", element: <StoragePricing /> },
        { path: "dashboard-overview-3", element: <DashboardOverview3 /> },
        { path: "dashboard-overview-4", element: <DashboardOverview4 /> },
        { path: "profile", element: <ProfileOverview1 /> },
        { path: "transaction-list", element: <TransactionList /> },
        { path: "transaction-detail", element: <TransactionDetail /> },
        { path: "inbox", element: <Inbox /> },
        { path: "inbox/fullscreen-chat/:companyId", element: <Inbox /> },
        { path: "split-test", element: <SplitTest /> },
        { path: "file-manager", element: <FileManager /> },
        { path: "point-of-sale", element: <PointOfSale /> },
        { path: "chat", element: <Chat /> },
        { path: "post", element: <Post /> },
        { path: "calendar", element: <Calendar /> },
        { path: "crud-data-list", element: <CrudDataList /> },
        { path: "users-layout-2/crud-form", element: <CrudForm /> },
        { path: "users-layout-1", element: <UsersLayout1 /> },
        { path: "users-layout-2", element: <UsersLayout2 /> },
        { path: "users-layout-3", element: <UsersLayout3 /> },
        { path: "profile-overview-1", element: <ProfileOverview1 /> },
        { path: "profile-overview-2", element: <ProfileOverview2 /> },
        { path: "profile-overview-3", element: <ProfileOverview3 /> },
        { path: "update-profile", element: <UpdateProfile /> },
        { path: "change-password", element: <ChangePassword /> },
        { path: "button", element: <Button /> },
        { path: "progress-bar", element: <ProgressBar /> },
        { path: "tooltip", element: <Tooltip /> },
        { path: "dropdown", element: <Dropdown /> },
        { path: "typography", element: <Typography /> },
        { path: "icon", element: <Icon /> },
        { path: "datepicker", element: <Datepicker /> },
        { path: "file-upload", element: <FileUpload /> },
        { path: "image-zoom", element: <ImageZoom /> },
        { path: "opp", element: <Opportunities /> },
        { path: "users-layout-2/loading2", element: <LoadingIcon2 /> },
        { path: "dashboard-overview-2", element: <DashboardOverview2 /> },
     
      ],
    },

    { path: "follow-ups-onboarding", element: <OnboardingFollowUps /> },
    { path: "ai-responses-onboarding", element: <OnboardingAIResponses /> },
    { path: "/onboarding", element: <ChatGPTStyle /> },
    { path: "/guest-chat/:companyId", element: <GuestChat />},
    { path: "/feedback/:formTitle/:phone", element: <PublicFeedbackForm />},
    { path: "/register/:formTitle/:phone", element: <PublicRegisterForm />},
    { path: "/attendance/:eventTitle/:phone", element: <PublicAttendanceForm />},
    { path: "/booking/:slotTitle/:staffName/:phone", element: <PublicBookingForm />},
    { path: "/booking-test", element: <PublicBookingForm />},
            { path: "/thank-you", element: <ThankYou />},
        { path: "/onboarding-demo", element: <OnboardingDemo />},
        { path: "notification", element: <Notification /> },
    { path: "dashboard-overview-2", element: <DashboardOverview2 /> },
    { path: "loading", element:<LoadingIcon />  },
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
  
    { path: "/loading", element: <LoadingIcon />},
    { path: "/error-page", element: <ErrorPage /> },
    { path: "*", element: <ErrorPage /> },
  ];

  return useRoutes(routes);
}

export default Router;