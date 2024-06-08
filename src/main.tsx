import ScrollToTop from "@/components/Base/ScrollToTop";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./stores/store";
import Router from "./router";
import "./assets/css/app.css";
import { ContactsProvider } from "./contact"; // Import the ContactsProvider
import { ConfigProvider } from "./config"; // Import the ConfigProvider

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <BrowserRouter>
    <Provider store={store}>
      <ConfigProvider> {/* Wrap the application with ConfigProvider */}
        <ContactsProvider> {/* Wrap the application with ContactsProvider */}
          <ScrollToTop />
          <Router />
        </ContactsProvider>
      </ConfigProvider>
    </Provider>
  </BrowserRouter>
);
