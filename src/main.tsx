import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AppProviders } from "@/app/providers"
import { Toaster } from "sonner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { bootstrapTracking } from "@/lib/tracking"
import { initSentry } from "@/lib/sentry"
import { API_BASE_URL } from "@/services/api"

initSentry()
void bootstrapTracking(API_BASE_URL)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light">
      <AppProviders>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </AppProviders>
    </ThemeProvider>
  </StrictMode>
)
