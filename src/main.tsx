import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "./index.css"
import App from "./App"
import { CurrencyProvider } from "./contexts/CurrencyContext"
import KeyboardViewport from "./components/KeyboardViewport"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CurrencyProvider>
      <BrowserRouter>
        <KeyboardViewport />
        <App />
      </BrowserRouter>
    </CurrencyProvider>
  </StrictMode>,
)