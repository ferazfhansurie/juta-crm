import ScrollToTop from "@/components/Base/ScrollToTop";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route } from "react-router-dom";
import { Provider, useSelector } from "react-redux";
import { store, RootState } from "./stores/store";
import Router from "./router";
import "./assets/css/app.css";
import { ContactsProvider } from "./contact";
import { ConfigProvider } from "./config";

import { useEffect } from "react";
import { selectColorScheme } from "@/stores/colorSchemeSlice";
import { selectDarkMode } from "@/stores/darkModeSlice";
import { selectTheme } from "@/stores/themeSlice";

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useSelector((state: RootState) => selectColorScheme(state));
  const darkMode = useSelector((state: RootState) => selectDarkMode(state));
  const theme = useSelector((state: RootState) => selectTheme(state));

  useEffect(() => {
    document.body.className = colorScheme;
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorScheme, darkMode, theme]);

  return <>{children}</>;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <Provider store={store}>
      <ConfigProvider>
        <ContactsProvider>
          <ScrollToTop />
          <ThemeProvider>
            <Router />
          </ThemeProvider>
        </ContactsProvider>
      </ConfigProvider>
    </Provider>
  </BrowserRouter>
);