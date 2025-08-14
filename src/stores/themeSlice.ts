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

// Clean up corrupted localStorage data
const cleanupLocalStorage = () => {
  try {
    const theme = localStorage.getItem("theme");
    const layout = localStorage.getItem("layout");
    
    // Check if stored values are valid
    const validThemes = ["tinker", "enigma", "icewall", "rubick"];
    const validLayouts = ["side-menu", "simple-menu", "top-menu"];
    
    if (theme && !validThemes.includes(theme)) {
      console.warn('Invalid theme in localStorage, clearing:', theme);
      localStorage.removeItem("theme");
    }
    
    if (layout && !validLayouts.includes(layout)) {
      console.warn('Invalid layout in localStorage, clearing:', layout);
      localStorage.removeItem("layout");
    }
  } catch (error) {
    console.error('Error cleaning up localStorage:', error);
    // Clear all theme-related localStorage if there's an error
    localStorage.removeItem("theme");
    localStorage.removeItem("layout");
  }
};

// Clean up on module load
cleanupLocalStorage();

const initialState: ThemeState = {
  value: (() => {
    const theme = getTheme();
    console.log('Initializing theme state, getTheme result:', theme);
    
    if (theme) {
      const stateValue = {
        name: theme.name,
        layout: theme.layout,
      };
      console.log('Setting initial theme state to:', stateValue);
      return stateValue;
    }
    
    const fallbackValue = {
      name: themes[0].name,
      layout: themes[0].layout,
    };
    console.log('Using fallback theme state:', fallbackValue);
    return fallbackValue;
  })(),
};

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Themes["name"]>) => {
      // Ensure only serializable values are stored
      const newValue = {
        name: action.payload,
        layout: state.value.layout,
      };
      
      // Validate that we're not storing any non-serializable values
      if (typeof newValue.name === 'string' && typeof newValue.layout === 'string') {
        state.value = newValue;
        localStorage.setItem("theme", action.payload);
      } else {
        console.error('Attempted to store non-serializable theme value:', newValue);
      }
    },
    setLayout: (state, action: PayloadAction<Themes["layout"]>) => {
      // Ensure only serializable values are stored
      const newValue = {
        name: state.value.name,
        layout: action.payload,
      };
      
      // Validate that we're not storing any non-serializable values
      if (typeof newValue.name === 'string' && typeof newValue.layout === 'string') {
        state.value = newValue;
        localStorage.setItem("layout", action.payload);
      } else {
        console.error('Attempted to store non-serializable layout value:', newValue);
      }
    },
  },
});

export const { setTheme, setLayout } = themeSlice.actions;

export const selectTheme = (state: RootState) => {
  // Validate and set default theme if localStorage is corrupted
  if (localStorage.getItem("theme") === null) {
    localStorage.setItem("theme", "tinker");
  }

  // Validate and set default layout if localStorage is corrupted
  if (localStorage.getItem("layout") === null) {
    localStorage.setItem("layout", "simple-menu");
  }

  // Ensure the returned state only contains serializable values
  const themeState = state.theme.value;
  
  // Validate that the state only contains expected properties
  if (themeState && typeof themeState === 'object') {
    return {
      name: themeState.name || "tinker",
      layout: themeState.layout || "simple-menu",
    };
  }

  // Fallback to defaults if state is corrupted
  return {
    name: "tinker",
    layout: "simple-menu",
  };
};

export default themeSlice.reducer;
