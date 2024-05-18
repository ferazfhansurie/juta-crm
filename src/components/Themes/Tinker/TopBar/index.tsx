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
  refresh_token: '',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const handleSignOut = () => {
  signOut(auth)
    .then(() => {
      console.log("User signed out successfully");
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
        console.log('No such document!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      userName = dataUser.name;
      companyName = dataUser.company;
      userEmail = dataUser.email;
      console.log(dataUser.notifications);
   
      setMessages(dataUser.notifications || []);
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }

      const data = docSnapshot.data();
      ghlConfig = {
        ghl_id: data.ghl_id,
        ghl_secret: data.ghl_secret,
        refresh_token: data.refresh_token
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
        <div className="relative mr-3 intro-x sm:mr-6">
          <div className="relative hidden sm:block">
            <FormInput
              type="text"
              className="border-transparent w-56 shadow-none rounded-full bg-slate-300/50 pr-8 transition-[width] duration-300 ease-in-out focus:border-transparent focus:w-72 dark:bg-darkmode-400/70"
              placeholder="Search..."
              onFocus={showSearchDropdown}
              onBlur={hideSearchDropdown}
            />
            <Lucide
              icon="Search"
              className="absolute inset-y-0 right-0 w-5 h-5 my-auto mr-3 text-slate-600 dark:text-slate-500"
            />
          </div>
          <a className="relative text-slate-600 sm:hidden" href="">
            <Lucide icon="Search" className="w-5 h-5 dark:text-slate-500" />
          </a>
          <Transition
            as={Fragment}
            show={searchDropdown}
            enter="transition-all ease-linear duration-150"
            enterFrom="mt-5 invisible opacity-0 translate-y-1"
            enterTo="mt-[3px] visible opacity-100 translate-y-0"
            leave="transition-all ease-linear duration-150"
            leaveFrom="mt-[3px] visible opacity-100 translate-y-0"
            leaveTo="mt-5 invisible opacity-0 translate-y-1"
          >
            <div className="absolute right-0 z-10 mt-[3px]">
              <div className="w-[450px] p-5 box">
                <div className="mb-2 font-medium">Pages</div>
                <div className="mb-5">
                  <a href="" className="flex items-center">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/20 dark:bg-success/10 text-success">
                      <Lucide icon="Inbox" className="w-4 h-4" />
                    </div>
                    <div className="ml-3">Mail Settings</div>
                  </a>
                  <a href="" className="flex items-center mt-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-pending/10 text-pending">
                      <Lucide icon="Users" className="w-4 h-4" />
                    </div>
                    <div className="ml-3">Users & Permissions</div>
                  </a>
                  <a href="" className="flex items-center mt-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 text-primary/80">
                      <Lucide icon="CreditCard" className="w-4 h-4" />
                    </div>
                    <div className="ml-3">Transactions Report</div>
                  </a>
                </div>
                <div className="mb-2 font-medium">Users</div>
                <div className="mb-5">
                  {_.take(fakerData, 4).map((faker, fakerKey) => (
                    <a
                      key={fakerKey}
                      href=""
                      className="flex items-center mt-2"
                    >
                      <div className="w-8 h-8 image-fit">
                        <img
                          alt="Midone Tailwind HTML Admin Template"
                          className="rounded-full"
                          src={faker.photos[0]}
                        />
                      </div>
                
                      <div className="w-48 ml-auto text-xs text-right truncate text-slate-500">
                        {faker.users[0].email}
                      </div>
                    </a>
                  ))}
                </div>
                <div className="mb-2 font-medium">Products</div>
                {_.take(fakerData, 4).map((faker, fakerKey) => (
                  <a key={fakerKey} href="" className="flex items-center mt-2">
                    <div className="w-8 h-8 image-fit">
                      <img
                        alt="Midone Tailwind HTML Admin Template"
                        className="rounded-full"
                        src={faker.images[0]}
                      />
                    </div>
                    <div className="ml-3">{faker.products[0].name}</div>
                    <div className="w-48 ml-auto text-xs text-right truncate text-slate-500">
                      {faker.products[0].category}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </Transition>
        </div>
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
            <span className="text-lg">{""}</span>
          </Menu.Button>
          <Menu.Items className="w-56 mt-px text-white bg-primary">
            <Menu.Header className="font-normal">
              <div className="font-medium">{userEmail}</div>
              <div className="text-xs text-white/70 mt-0.5 dark:text-slate-500">
                {companyName}
              </div>
            </Menu.Header>
            <Menu.Divider className="bg-white/[0.08]" />
            <Menu.Divider className="bg-white/[0.08]" />
            <Menu.Item className="hover:bg-white/5">
              {/* Logout link with sign out function */}
              <Link to="/" onClick={handleSignOut}>
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