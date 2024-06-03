import { useState, Fragment } from "react";
import React, { useEffect, useRef } from "react";
import Lucide from "@/components/Base/Lucide";
import Breadcrumb from "@/components/Base/Breadcrumb";
import { FormInput } from "@/components/Base/Form";
import { Menu, Popover } from "@/components/Base/Headless";
import fakerData from "@/utils/faker";
import _ from "lodash";
import clsx from "clsx";
import { Transition } from "@headlessui/react";
import { Link } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth"; // Import the signOut method
import { initializeApp } from 'firebase/app';
import { DocumentReference, getDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';

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
let companyName = '';
let userName = '';
let userEmail = '';
let ghlConfig = {
  ghl_id: '',
  ghl_secret: '',
  ghl_refreshToken: '',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

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

function Main() {
  const [searchDropdown, setSearchDropdown] = useState(false);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

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
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
        return;
      }

      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      userName = dataUser.name;
      companyName = dataUser.company;
      userEmail = dataUser.email;
      
   
      setMessages(dataUser.notifications || []);
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        
        return;
      }

      const data = docSnapshot.data();
      ghlConfig = {
        ghl_id: data.ghl_id,
        ghl_secret: data.ghl_secret,
        ghl_refreshToken: data.ghl_refreshToken
      };
      setToken(data.whapiToken);
    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }


  return (
    <>
      {/* BEGIN: Top Bar */}
      <div className="relative z-[51] flex h-[67px] items-center border-b border-slate-200">
        {/* BEGIN: Breadcrumb */}
        <Breadcrumb className="hidden mr-auto -intro-x sm:flex text-slate-600">
          <h2 className="mr-5 text-lg font-medium truncate">
            Hello {userName}!
          </h2>
        </Breadcrumb>
        {/* END: Breadcrumb */}
        {/* BEGIN: Search */}
      
        {/* END: Search  */}
        {/* BEGIN: Notifications    <Popover className="mr-auto intro-x sm:mr-6">
          <Popover.Button
            className="
              relative text-slate-600 outline-none block
              before:content-[''] before:w-[8px] before:h-[8px] before:rounded-full before:absolute before:top-[-2px] before:right-0 before:bg-danger
            "
          >
            <Lucide icon="Bell" className="w-5 h-5 dark:text-slate-500" />
          </Popover.Button>
          <Popover.Panel className="w-[280px] sm:w-[350px] p-5 mt-2">
            <div className="mb-5 font-medium">Notifications</div>
            {messages.map((message, index) => (
              <div
                key={index}
                className={clsx([
                  "cursor-pointer relative flex items-center",
                  { "mt-5": index > 0 },
                ])}
              >
                <div className="relative flex-none w-12 h-12 mr-1 image-fit">
              
                  <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${message.read ? 'bg-success' : 'bg-danger'} dark:border-darkmode-600`}></div>
                </div>
                <div className="ml-2 overflow-hidden">
                  <div className="flex items-center">
                    <a href="" className="mr-5 font-medium truncate">
                      {message.from_name}
                    </a>
                    <div className="ml-auto text-xs text-slate-400 whitespace-nowrap">
                      {new Date(message.timestamp*1000).toLocaleString()}
                    </div>
                  </div>
                  <div className="w-full truncate text-slate-500 mt-0.5">
                    {message.text.body}
                  </div>
                </div>
              </div>
            ))}
          </Popover.Panel>
        </Popover>*/}
     
        {/* END: Notifications  */}
        {/* BEGIN: Account Menu */}
        <Menu>
          <Menu.Button className="block w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white">
          <Lucide icon="Settings" className="w-5 h-5" />
          </Menu.Button>
          <Menu.Items className="w-56 mt-px text-white bg-primary">
            <Menu.Header className="font-normal">
              <div className="font-medium">{userEmail}</div>
              <div className="text-xs text-white/70 mt-0.5 dark:text-slate-500">
                {companyName}
              </div>
            </Menu.Header>
        
            <Menu.Divider className="bg-white/[0.08]" />
            <Menu.Item className="hover:bg-white/5">
              {/* Logout link with sign out function */}
              <Link to="/login" onClick={handleSignOut}>
                <Lucide icon="ToggleRight" className="w-4 h-4 mr-2" /> Logout
              </Link>
            </Menu.Item>
          </Menu.Items>
        </Menu>
      </div>
      {/* END: Top Bar */}
    </>
  );
}

export default Main;