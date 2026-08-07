import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.jsx";
import "./app/reset.css";
import "./app/global.scss";

// ReactアプリをHTMLのroot要素へマウントする入口。
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
