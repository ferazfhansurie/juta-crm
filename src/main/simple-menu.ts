import { type Menu } from "@/stores/menuSlice";

const menu: Array<Menu | "divider"> = [
  {
    icon: "Home",
    title: "Dashboard",
   pathname:'/dashboard'
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
  },
  /* {
    icon: "Bot",
    pathname: "/dashboard/inbox",
    title: "Assistant",
  },
 {
    icon: "HardDrive",
    pathname: "/dashboard/file-manager",
    title: "File Manager",
  },
  {
    icon: "Calendar",
    pathname: "/dashboard/calendar",
    title: "Calendar",
  },*/
  "divider",
  {
    icon: "Users",
    title: "Users",
    pathname: "/dashboard/users-layout-2",
  },
 /* {
    icon: "Trello",
    title: "Profile",
    pathname: "/dashboard/profile-overview-1",
    
  }
  ,
*/
  "divider",

];

export default menu;
