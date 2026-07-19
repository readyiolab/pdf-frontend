import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Spinner } from "./components/ui/spinner";
import { TooltipProvider } from "./components/ui/tooltip";
import { Zap } from "lucide-react";

// Lazy-loaded pages
const Home = lazy(() => import("./pages/Home"));
const Workspace = lazy(() => import("./pages/Workspace"));
const History = lazy(() => import("./pages/History"));
const Billing = lazy(() => import("./pages/Billing"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
// Signing pulls in pdf.js and the designer; lazy-loading keeps that weight out
// of the initial bundle for users who only ever touch the conversion tools.
const DocumentList = lazy(() => import("./pages/signing/DocumentList"));
const DocumentEditor = lazy(() => import("./pages/signing/DocumentEditor"));
const SignDocument = lazy(() => import("./pages/signing/SignDocument"));
const SummarizePdf = lazy(() => import("./pages/ai/SummarizePdf"));
const ExplainPdf = lazy(() => import("./pages/ai/ExplainPdf"));
const ChatPdf = lazy(() => import("./pages/ai/ChatPdf"));

// Custom loading fallback
const PageLoader = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 animate-fade-in">
    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
      <Zap className="h-8 w-8 text-primary animate-pulse" />
      <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-ping" style={{ animationDuration: "3s" }} />
    </div>
    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
      <Spinner className="h-4 w-4" />
      Loading...
    </div>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  
  if (loading) return <PageLoader />;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      {/* Radix tooltips need a Provider ancestor or they throw at render:
          "`Tooltip` must be used within `TooltipProvider`". It sits ABOVE
          <Routes> rather than inside AppLayout because the public signing page
          (/s/:token) renders outside that layout and still uses the viewer
          toolbar's tooltips — a provider in AppLayout would leave signers with
          a blank crashed page.

          delayDuration=300 rather than the component's 0 default: instant
          tooltips on a dense toolbar fire constantly as the pointer crosses it. */}
      <TooltipProvider delayDuration={300}>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Public signing — deliberately OUTSIDE AppLayout and outside
                ProtectedRoute. The recipient has no account, so the app's
                navbar/sidebar (with its login and billing links) would be
                noise at best and misleading at worst. The signing token in the
                URL is the only credential.

                Path is /s/:token, NOT /sign/:token — /sign is the owner's
                authenticated dashboard below, and the two would collide. */}
            <Route path="/s/:token" element={<SignDocument />} />

            <Route path="/" element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="workspace" element={<Workspace />}>
                <Route path=":tool" element={<Workspace />} />
              </Route>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="history" element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              } />
              <Route path="billing" element={
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              } />
              <Route path="profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />

              {/* Signing. Guests are additionally rejected by the API — a
                  signing document is durable and must belong to a real account. */}
              <Route path="sign" element={
                <ProtectedRoute>
                  <DocumentList />
                </ProtectedRoute>
              } />
              <Route path="sign/:id" element={
                <ProtectedRoute>
                  <DocumentEditor />
                </ProtectedRoute>
              } />

              {/* AI — requires a real account (calls cost money, quota-bounded). */}
              <Route path="ai/summarize" element={
                <ProtectedRoute>
                  <SummarizePdf />
                </ProtectedRoute>
              } />
              <Route path="ai/explain" element={
                <ProtectedRoute>
                  <ExplainPdf />
                </ProtectedRoute>
              } />
              <Route path="ai/chat" element={
                <ProtectedRoute>
                  <ChatPdf />
                </ProtectedRoute>
              } />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
            </Routes>
          </Suspense>
        </Router>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
