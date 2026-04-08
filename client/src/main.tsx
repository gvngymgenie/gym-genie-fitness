import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize PWA functionality
import "./lib/pwa";

createRoot(document.getElementById("root")!).render(<App />);
