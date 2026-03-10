import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import ModalProvider from "./providers/ModalProvider";
import "./lib/i18n"; // Initialize i18n before rendering
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ModalProvider> 
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ModalProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
