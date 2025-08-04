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
    pathname: "/dashboard-overview-3",
    title: "Stats",
  },

  {
      icon: "Bot",
      pathname: "/inbox",
      title: "Assistant",
    },
    {
      icon: "Calendar",
      pathname: "/calendar",
      title: "Calendar",
    },
 


    "divider",
    {
      icon: "Users",
      title: "Users",
      pathname: "/users-layout-2",
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