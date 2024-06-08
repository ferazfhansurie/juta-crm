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

const ColorSchemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useSelector((state: RootState) => selectColorScheme(state));

  useEffect(() => {
    document.body.className = colorScheme;
  }, [colorScheme]);

  return <>{children}</>;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <Provider store={store}>
      <ConfigProvider>
        <ContactsProvider>
          <ScrollToTop />
          <ColorSchemeProvider>
            <Router />
          </ColorSchemeProvider>
        </ContactsProvider>
      </ConfigProvider>
    </Provider>
  </BrowserRouter>
);
