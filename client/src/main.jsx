import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./app/App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { FavoritesProvider } from "./context/FavoritesContext.jsx";
import "./index.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3200,
              style: {
                borderRadius: "20px",
                border: "1px solid rgba(255,237,213,0.9)",
                background: "rgba(255,255,255,0.96)",
                color: "#111827",
                boxShadow: "0 25px 60px -30px rgba(15, 23, 42, 0.35)",
                fontWeight: 700,
              },
              success: {
                iconTheme: {
                  primary: "#ea580c",
                  secondary: "#fff",
                },
              },
            }}
          />
        </CartProvider>
      </FavoritesProvider>
    </AuthProvider>
  </React.StrictMode>
);



