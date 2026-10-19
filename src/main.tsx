import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";

import App from "./App";
import "./form-controls.css";

import { CartProvider } from "./contexts/CartContext";
import { CheckoutProvider } from "./contexts/CheckoutContext";

createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>

    <BrowserRouter>

      <CartProvider>

        <CheckoutProvider>

          <App />

        </CheckoutProvider>

      </CartProvider>

    </BrowserRouter>

  </StrictMode>
);
// Instalação PWA somente no build publicado (HTTPS ou localhost).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
 window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{/* Loja online segue funcionando se a instalação não estiver disponível. */});});
}
