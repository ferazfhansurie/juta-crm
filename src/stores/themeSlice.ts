import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";
import RubickSideMenu from "@/themes/Rubick/SideMenu";
import RubickSimpleMenu from "@/themes/Rubick/SimpleMenu";
import RubickTopMenu from "@/themes/Rubick/TopMenu";
import IcewallSideMenu from "@/themes/Icewall/SideMenu";
import IcewallSimpleMenu from "@/themes/Icewall/SimpleMenu";
import IcewallTopMenu from "@/themes/Icewall/TopMenu";
import TinkerSideMenu from "@/themes/Tinker/SideMenu";
import TinkerSimpleMenu from "@/themes/Tinker/SimpleMenu";
import TinkerTopMenu from "@/themes/Tinker/TopMenu";
import EnigmaSideMenu from "@/themes/Enigma/SideMenu";
import EnigmaSimpleMenu from "@/themes/Enigma/SimpleMenu";
import EnigmaTopMenu from "@/themes/Enigma/TopMenu";

export const themes = [

  {
    name: "tinker",
    layout: "simple-menu",
    component: TinkerSimpleMenu,
  },
  {
    name: "tinker",
    layout: "top-menu",
    component: TinkerTopMenu,
  },
  {
    name: "enigma",
    layout: "side-menu",
    component: EnigmaSideMenu,
  },
  {
    name: "enigma",
    layout: "simple-menu",
    component: EnigmaSimpleMenu,
  },
  {
    name: "enigma",
    layout: "top-menu",
    component: EnigmaTopMenu,
  },
] as const;

export type Themes = (typeof themes)[number];

interface ThemeState {
  value: {
    name: Themes["name"];
    layout: Themes["layout"];
  };
}

export const getTheme = (search?: {
  name: Themes["name"];
  layout: Themes["layout"];
}) => {
  const searchValues =
    search === undefined
      ? {
          name: localStorage.getItem("theme"),
          layout: localStorage.getItem("layout"),
        }
      : search;
  return themes.filter((item, key) => {
    return (
      item.name === searchValues.name && item.layout === searchValues.layout
    );
  })[0];
};

const initialState: ThemeState = {
  value: getTheme() || {
    name: themes[0].name,
    layout: themes[0].layout,
  },
};

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Themes["name"]>) => {
      state.value = {
        name: action.payload,
        layout: state.value.layout,
      };

      localStorage.setItem("theme", action.payload);
    },
    setLayout: (state, action: PayloadAction<Themes["layout"]>) => {
      state.value = {
        name: state.value.name,
        layout: action.payload,
      };

      localStorage.setItem("layout", action.payload);
    },
  },
});

export const { setTheme, setLayout } = themeSlice.actions;

export const selectTheme = (state: RootState) => {
  if (localStorage.getItem("theme") === null) {
    localStorage.setItem("theme", "rubick");
  }


    localStorage.setItem("layout", "simple-menu");


  return state.theme.value;
};

export default themeSlice.reducer;
