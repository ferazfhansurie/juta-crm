import "@/assets/css/themes/tinker/side-nav.css";
import { Transition } from "react-transition-group";
import { useState, useEffect, ReactElement, JSXElementConstructor, ReactNode, ReactPortal, Key, } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectMenu } from "@/stores/menuSlice";
import { useAppSelector } from "@/stores/hooks";
import { FormattedMenu, linkTo, nestedMenu, enter, leave } from "./simple-menu";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import logoUrl from "@/assets/images/logo.png";
import clsx from "clsx";
import TopBar from "@/components/Themes/Tinker/TopBar";
import MobileMenu from "@/components/MobileMenu";
import { Menu, Popover } from "@/components/Base/Headless";
import { getAuth, signOut } from "firebase/auth"; // Import the signOut method
import { initializeApp } from 'firebase/app';
import { DocumentData, DocumentReference, getDoc, getDocs } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';

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
  return (
    notification.from_name.toLowerCase().includes(searchQuery) ||
    (notification.text && notification.text.body.toLowerCase().includes(searchQuery))
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

    setCompanyName(data.companyName); // Set companyName

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
  useEffect(() => {
    setFormattedMenu(menu());
  }, [menuStore, location.pathname]);

  return (
    <div className="tinker">
      <MobileMenu />
      <div className="flex mt-[5rem] md:mt-0 overflow-hidden">
        {/* BEGIN: Simple Menu */}
        <nav className="pt-5 mb-2 p-2 side-nav side-nav--simple hidden md:flex flex-col justify-between sm:w-[50px] md:w-[50px] xl:w-[50px] z-100 bg-slate-300">
          <ul className="space-y-4 flex-grow">
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
                      "flex items-center p-2 rounded hover:bg-slate-700",
                      menu.active ? "bg-slate-400 text-slate-200 font-medium" : "",
                    ])}
                  >
                    <div className="text-left w-10 h-6 m-0 flex items-center justify-between">
                      <Lucide icon={menu.icon} className="text-slate-500 hover:text-slate-200" />
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
                                "flex items-center p-1 my-1 rounded hover:bg-gray-200",
                                subMenu.active ? "bg-gray-300" : "",
                              ])}
                            >
                              <div className="w-4 h-4 flex items-center justify-center">
                                <Lucide icon={subMenu.icon} className="text-gray-700" />
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
                                          "flex items-center p-1 my-1 rounded hover:bg-gray-200",
                                          lastSubMenu.active ? "bg-gray-300" : "",
                                        ])}
                                      >
                                        <div className="w-4 h-4 flex items-center justify-center">
                                          <Lucide icon={lastSubMenu.icon} className="text-gray-700" />
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
          <Menu>
            <Menu.Button className="block w-8 h-8 overflow rounded-md shadow-lg bg-primary flex items-center justify-center text-white mr-4">
              <Lucide icon="Bell" className="w-5 h-5" />
            </Menu.Button>

     
            <Menu.Items className="absolute left-0 w-auto mt-0 mr-4 text-white bg-primary" style={{ width: '400px' }}> {/* Adjust the width as needed */}
    <Menu.Header className="font-normal">
      <div className="font-medium text-lg">Notifications</div>
    </Menu.Header>

    <div className="mt-2 pl-2 pr-2 h-64 overflow-y-auto">
      {filteredNotifications && filteredNotifications.length > 0 ? (
        filteredNotifications.reduce((uniqueNotifications, notification) => {
          const existingNotificationIndex = uniqueNotifications.findIndex(
            (n: { chat_id: any; }) => n.chat_id === notification.chat_id
          );
          if (existingNotificationIndex !== -1) {
            // If a notification with the same chat_id exists, replace it with the new one if it has a later timestamp
            if (uniqueNotifications[existingNotificationIndex].timestamp < notification.timestamp) {
              uniqueNotifications[existingNotificationIndex] = notification;
            }
          } else {
            // Otherwise, add the new notification
            uniqueNotifications.push(notification);
          }
          return uniqueNotifications;
        }, []).sort((a: { timestamp: number; }, b: { timestamp: number; }) => b.timestamp - a.timestamp).map((notification: { chat_id: any; from_name: string; text: { body: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; }; timestamp: number; }, key: Key | null | undefined) => (
          <div key={key} className="w-full">
            <div
              className="flex items-center mb-2 box hover:bg-blue-100 zoom-in cursor-pointer"
              onClick={() => handleNotificationClick(notification.chat_id)}
            >
              <div className="p-2 pl-1 ml-2 w-full">
                <div className="text-s font-medium text-slate-800 truncate capitalize">{notification.chat_id.split('@')[0]}</div>
                <div className="text-base text-xs text-slate-500">{notification.text ? notification.text.body : ""}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  {new Date(notification.timestamp * 1000).toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-slate-500">No messages available</div>
      )}
    </div>
  </Menu.Items>
          </Menu>
        </div>
      </ul>
          <div className="mb-4">
          <Menu>
            <Menu.Button className="block w-8 h-8 overflow-hidden rounded-md bg-red-700 flex items-center justify-center text-white">
              <Link to="/login" onClick={handleSignOut}>
                <Lucide icon="LogOut" className="text-center justify-center w-4 h-4" />
              </Link>
            </Menu.Button>
          </Menu>
        </div>
        </nav>
       
        {/* END: Simple Menu */}
        {/* BEGIN: Content */}
        <div className="min-h-screen max-w-full md:max-w-none bg-slate-100 flex-1 pb-2 px-2 md:px-2 relative  dark:bg-darkmode-700 before:content-[''] before:w-full before:h-px before:block after:content-[''] after:z-[-1] after:rounded-[40px_0px_0px_0px] after:w-full after:inset-y-0 after:absolute after:left-0 after:bg-white/10 after:mt-8 after:-ml-4 after:dark:bg-darkmode-400/50 after:hidden md:after:block">
          <Outlet />
        </div>
        {/* END: Content */}
      </div>
    </div>
  );
}

export default Main;
