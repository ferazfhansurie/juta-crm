import { type Menu } from "@/stores/menuSlice";

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { DocumentReference, getDoc,getDocs } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
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
const firestore = getFirestore(app);

async function fetchEmployees() {
const auth = getAuth(app);
const user = auth.currentUser;
try {
  const docUserRef = doc(firestore, 'user', user?.email!);
  const docUserSnapshot = await getDoc(docUserRef);
  if (!docUserSnapshot.exists()) {
    console.log('No such document!');
    return;
  }

  const dataUser = docUserSnapshot.data();
  const companyId = dataUser.companyId;


  
  // Check if user's role is 1
  if (dataUser.role === "1") {
    // If user's role is 1, set showAddUserButton to true
    menu.push({ icon: "Users", pathname: "/dashboard/users-layout-2", title: "Users" });
  } else {
    // If user's role is not 1, set showAddUserButton to false
 
  }

} catch (error) {
  console.error('Error fetching config:', error);
  throw error;
}
}
const menu: Array<Menu | "divider"> = [
  {
    icon: "Home",
    title: "Dashboard",
    pathname: '/dashboard'
  },
  {
    icon: "MessageSquare",
    pathname: "/dashboard/chat",
    title: "Chat",
  },
  {
    icon: "HardDrive",
    pathname: "/dashboard/crud-data-list",
    title: "Contacts",
  }
];
fetchEmployees();
// Define the user role checker function

// Check the user role to determine if the "Add New User" button should be shown

export default menu;
