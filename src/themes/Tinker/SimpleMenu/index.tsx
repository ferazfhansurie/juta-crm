import "@/assets/css/themes/tinker/side-nav.css";
import { Transition } from "react-transition-group";
import { useState, useEffect, ReactElement, JSXElementConstructor, ReactNode, ReactPortal, Key, useCallback } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectMenu } from "@/stores/menuSlice";
import { useAppSelector } from "@/stores/hooks";
import { FormattedMenu, linkTo, nestedMenu, enter, leave } from "./simple-menu";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import logoUrl from "@/assets/images/logo.png";
import clsx from "clsx";
import { Menu, Popover } from "@/components/Base/Headless";
import { getAuth, signOut } from "firebase/auth"; // Import the signOut method
import { initializeApp } from 'firebase/app';
import { DocumentData, DocumentReference, getDoc, getDocs } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { useMediaQuery } from 'react-responsive';

type Notification = {
    chat_id: string;
    from_name: string;
    text: {
        body: string;
    };
    timestamp: number;
};
function Main() {
  const location = useLocation();
  const [formattedMenu, setFormattedMenu] = useState<Array<FormattedMenu | "divider">>([]);
  const menuStore = useAppSelector(selectMenu("simple-menu"));
  const menu = () => nestedMenu(menuStore, location);
  const [searchDropdown, setSearchDropdown] = useState(false);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uniqueNotifications, setUniqueNotifications] = useState<Notification[]>([]);
  const [company, setCompany] = useState("");
  const [showSideMenu, setShowSideMenu] = useState(false);
// Initialize Firebase app
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

let companyId = '014';

let ghlConfig = {
  ghl_id: '',
  ghl_secret: '',
  ghl_refreshToken: '',
};
let role = 2;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const filteredNotifications = notifications.filter((notification) => {
  const fromName = notification.from_name ? notification.from_name.toLowerCase() : "";
  const textBody = notification.text && notification.text.body ? notification.text.body.toLowerCase() : "";

  return (
    fromName.includes(searchQuery) ||
    textBody.includes(searchQuery)
  );
});

const navigate = useNavigate(); // Initialize useNavigate

const handleNotificationClick = (chatId: string) => {
  navigate(`/chat/?chatId=${chatId}`);
};

const showSearchDropdown = () => {
  setSearchDropdown(true);
};

const hideSearchDropdown = () => {
  setSearchDropdown(false);
};

useEffect(() => {
  fetchConfigFromDatabase();
}, []);

useEffect(() => {
  const unique = notifications.reduce((uniqueNotifications, notification) => {
      const existingNotificationIndex = uniqueNotifications.findIndex(
          (n: { chat_id: any; }) => n.chat_id === notification.chat_id
      );
      if (existingNotificationIndex !== -1) {
          if (uniqueNotifications[existingNotificationIndex].timestamp < notification.timestamp) {
              uniqueNotifications[existingNotificationIndex] = notification;
          }
      } else {
          uniqueNotifications.push(notification);
      }
      return uniqueNotifications;
  }, []);
  setUniqueNotifications(unique);
}, [notifications]);
async function fetchConfigFromDatabase() {
  const user = auth.currentUser;

  if (!user) {
    console.error("No user is currently authenticated.");
    return;
  }

  const userEmail = user.email;
  setUserEmail(userEmail || "");

  if (!userEmail) {
    console.error("Authenticated user has no email.");
    return;
  }

  try {
    const docUserRef = doc(firestore, 'user', userEmail);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      return;
    }
    const dataUser = docUserSnapshot.data();
    if (!dataUser) {
      return;
    }

    setUserName(dataUser.name);
    companyId = dataUser.companyId;
    role = dataUser.role;

    if (!companyId) {
      return;
    }

    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      return;
    }
    const data = docSnapshot.data();
    if (!data) {
      console.error("No data found in company document.");
      return;
    }

    setCompanyName(dataUser.company); // Set company

    // Fetch notifications from the notifications subcollection
    const notificationsRef = collection(firestore, 'user', userEmail, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsRef);
    const notifications = notificationsSnapshot.docs.map((doc: { data: () => DocumentData; }) => doc.data());
console.log(notifications);
    // Update state with the fetched notifications
    setNotifications(notifications);
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
}
  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log("Sign-out successful.");
        localStorage.removeItem('contacts'); // Clear contacts from localStorage
        sessionStorage.removeItem('contactsFetched'); // Clear the session marker
  
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  const isMobile = useMediaQuery({ maxWidth: 767 });

  const toggleSideMenu = () => {
    setShowSideMenu(!showSideMenu);
  };

  useEffect(() => {
    setFormattedMenu(menu());
  }, [menuStore, location.pathname]);

  return (
    <div className="tinker">
      {showMobileMenu && <MobileMenu />}
      <div className="flex mt-[5rem] pl-1 bg-slate-300 dark:bg-gray-800 md:mt-0 overflow-hidden">
        {/* BEGIN: Simple Menu */}
        <nav className={`pt-5 mb-0 pl-1 pr-2 item-center side-nav side-nav--simple ${isMobile ? (showSideMenu ? 'block' : 'hidden') : 'flex'} flex-col justify-between w-16 z-100 bg-slate-300 dark:bg-gray-800`}>
          <ul className="space-y-2 flex-grow">
            {/* BEGIN: First Child */}
            {formattedMenu.map((menu, menuKey) =>
              menu == "divider" ? (
                <li className="my-2 side-nav__divider" key={menuKey}></li>
              ) : (
                <li key={menuKey}>
                  <Tippy
                    as="a"
                    content={menu.title}
                    options={{
                      placement: "left",
                    }}
                    href={menu.subMenu ? "#" : menu.pathname}
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      linkTo(menu, navigate);
                      setFormattedMenu([...formattedMenu]);
                    }}
                    className={clsx([
                      "flex items-center p-2 rounded hover:bg-slate-400 dark:hover:bg-gray-700",
                      menu.active ? "bg-slate-400 dark:bg-gray-700 text-slate-200 dark:text-gray-200 font-medium" : "",
                    ])}
                  >
                    <div className="text-left w-10 h-6 m-0 flex items-center justify-between">
                      <Lucide icon={menu.icon} className="text-slate-900 dark:text-gray-200 hover:text-slate-900 dark:hover:text-gray-200" />
                    </div>
                  </Tippy>
                  {/* BEGIN: Second Child */}
                  {menu.subMenu && (
                    <Transition
                      in={menu.activeDropdown}
                      onEnter={enter}
                      onExit={leave}
                      timeout={300}
                    >
                      <ul
                        className={clsx({
                          "side-menu__sub-open": menu.activeDropdown,
                        })}
                      >
                        {menu.subMenu.map((subMenu, subMenuKey) => (
                          <li key={subMenuKey}>
                            <Tippy
                              as="a"
                              content={subMenu.title}
                              options={{
                                placement: "left",
                              }}
                              href={subMenu.subMenu ? "#" : subMenu.pathname}
                              onClick={(event: React.MouseEvent) => {
                                event.preventDefault();
                                linkTo(subMenu, navigate);
                                setFormattedMenu([...formattedMenu]);
                              }}
                              className={clsx([
                                "flex items-center p-1 my-1 rounded hover:bg-slate-400 dark:hover:bg-gray-700",
                                subMenu.active ? "bg-slate-400 dark:bg-gray-700" : "",
                              ])}
                            >
                              <div className="w-4 h-4 flex items-center justify-center">
                                <Lucide icon={subMenu.icon} className="text-slate-900 dark:text-gray-200" />
                              </div>
                            </Tippy>
                            {/* BEGIN: Third Child */}
                            {subMenu.subMenu && (
                              <Transition
                                in={subMenu.activeDropdown}
                                onEnter={enter}
                                onExit={leave}
                                timeout={300}
                              >
                                <ul
                                  className={clsx({
                                    "side-menu__sub-open": subMenu.activeDropdown,
                                  })}
                                >
                                  {subMenu.subMenu.map((lastSubMenu, lastSubMenuKey) => (
                                    <li key={lastSubMenuKey}>
                                      <Tippy
                                        as="a"
                                        content={lastSubMenu.title}
                                        options={{
                                          placement: "left",
                                        }}
                                        href={
                                          lastSubMenu.subMenu ? "#" : lastSubMenu.pathname
                                        }
                                        onClick={(event: React.MouseEvent) => {
                                          event.preventDefault();
                                          linkTo(lastSubMenu, navigate);
                                          setFormattedMenu([
                                            ...formattedMenu,
                                          ]);
                                        }}
                                        className={clsx([
                                          "flex items-center p-1 my-1 rounded hover:bg-slate-400 dark:hover:bg-gray-700",
                                          lastSubMenu.active ? "bg-slate-400 dark:bg-gray-700" : "",
                                        ])}
                                      >
                                        <div className="w-10 h-10 flex items-center justify-center">
                                          <Lucide icon={lastSubMenu.icon} className="text-slate-900 dark:text-gray-200" />
                                        </div>
                                      </Tippy>
                                    </li>
                                  ))}
                                </ul>
                              </Transition>
                            )}
                            {/* END: Third Child */}
                          </li>
                        ))}
                      </ul>
                    </Transition>
                  )}
                  {/* END: Second Child */}
                </li>
              )
            )}
            {/* END: First Child */}
            <div>
            {companyName !== "Infinity Pilates & Physiotherapy" && (
              <Menu className="!z-[9999]">
                <Menu.Button className="z-50 block w-10 h-10 overflow rounded-md text-slate-900 dark:text-gray-200 hover:bg-slate-400 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-gray-200 font-medium flex items-center justify-center">
                  <Lucide icon="Bell" className="w-5 h-5" />
                  {uniqueNotifications.length > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 text-[8px] z-10 transform translate-x-1/2 -translate-y-1/2">
                      {uniqueNotifications.length}
                    </span>
                  )}
                </Menu.Button>
                <Menu.Items className="absolute left-0 w-64 md:w-80 mt-2 mr-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-lg overflow-hidden">
                <Menu.Header className="font-normal border-b border-gray-200 dark:border-gray-700">
                  <div className="font-medium text-lg p-3">Notifications</div>
                </Menu.Header>
                <div className="max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                  {uniqueNotifications.length > 0 ? (
                    uniqueNotifications
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((notification, key) => (
                        <div key={key} className="p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                          <div
                            className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition-colors duration-150 ease-in-out p-2"
                            onClick={() => handleNotificationClick(notification.chat_id)}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate capitalize">
                                {notification.chat_id.split('@')[0]}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(notification.timestamp * 1000).toLocaleString('en-US', {
                                  hour: 'numeric',
                                  minute: 'numeric',
                                  hour12: true,
                                })}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {notification.text ? notification.text.body : ''}
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-4">No messages available</div>
                  )}
                </div>
              </Menu.Items>
              </Menu>
            )}
          </div>
      </ul>
          <div className="mt-4 ml-1">
          <Menu>
            <Menu.Button className="block w-8 h-8 overflow-hidden rounded-md bg-red-700">
              <Link to="/login" onClick={handleSignOut}>
                <Lucide icon="LogOut" className="text-center justify-center w-4 h-4" />
              </Link>
            </Menu.Button>
          </Menu>
        </div>
        </nav>
       
        {/* END: Simple Menu */}
        {/* BEGIN: Content */}
        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-gray-900">
          <div className="h-full pb-2 px-2 md:px-2 relative before:content-[''] before:w-full before:h-px before:block after:content-[''] after:z-[-1] after:rounded-[40px_0px_0px_0px] after:w-full after:inset-y-0 after:absolute after:left-0 after:bg-white/10 after:mt-8 after:-ml-4 after:dark:bg-darkmode-400/50 after:hidden md:after:block dark:dark-scrollbar">
            <Outlet />
          </div>
        </div>
        {/* END: Content */}

        {/* Floating menu button for mobile */}
        {isMobile && (
          <button
            onClick={toggleSideMenu}
            className="fixed bottom-4 left-4 z-50 w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg"
          >
            <Lucide icon="Menu" className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
}

export default Main;
