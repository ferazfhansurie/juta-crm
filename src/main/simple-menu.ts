import { type Menu } from "@/stores/menuSlice";

const menu: Array<Menu | "divider"> = [
  {
    icon: "MessageSquare",
    title: "Chats",
   pathname:'/chat'
  },
  {
    icon: "HardDrive",
    pathname: "/crud-data-list",
    title: "Contacts",
  },
  {
    icon: "AreaChart",
    pathname: "/dashboard",
    title: "Stats",
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
    pathname: "users-layout-2",
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
