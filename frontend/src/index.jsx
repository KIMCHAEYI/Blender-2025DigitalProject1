// src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";

// 두 context import
import { UserProvider } from "./contexts/UserContext.jsx";
import { VoiceProvider } from "./contexts/VoiceContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <UserProvider>
      <VoiceProvider>
        <App />
      </VoiceProvider>
    </UserProvider>
  </BrowserRouter>
);