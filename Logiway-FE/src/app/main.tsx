import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Elemen root tidak ditemukan");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
