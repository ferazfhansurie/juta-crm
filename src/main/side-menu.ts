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
    pathname: "/dashboard/file-manager",
    title: "File Manager",
  },
  {
    icon: "Calendar",
    pathname: "/dashboard/calendar",
    title: "Calendar",
  },
  "divider",
  {
    icon: "Users",
    title: "Users",
    pathname: "/dashboard/users-layout-1",
  },
  {
    icon: "Trello",
    title: "Profile",
    pathname: "/dashboard/profile-overview-1",
    
  },

  "divider",

];

export default menu;
