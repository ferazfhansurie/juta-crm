import { type Menu } from "@/stores/menuSlice";

const menu: Array<Menu | "divider"> = [
  {
    icon: "Factory",
    title: "Production",
   pathname:'/dashboard-overview-2'
  },

  {
    icon: "ShoppingBasket",
    pathname: "/product-grid",
    title: "Orders",
  },
  {
    icon: "Truck",
    pathname: "/product-list",
    title: "Delivery",
  },

  {
    icon: "HardDrive",
    pathname: "/crud-data-list",
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
    pathname: "users-layout-2",
  },

];

export default menu;
