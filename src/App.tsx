import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Spinner } from "./components/ui/spinner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ScrollToTop } from "./components/ScrollToTop";
import { RouteSeo } from "./components/Seo";
import { ProtectedRoute, VerifiedRoute } from "./components/auth/RouteGuards";

const Home = lazy(() => import("./pages/Home"));
const Workspace = lazy(() => import("./pages/Workspace"));
const History = lazy(() => import("./pages/History"));
const Billing = lazy(() => import("./pages/Billing"));
const Profile = lazy(() => import("./pages/Profile"));
const CloudStorage = lazy(() => import("./pages/settings/CloudStorage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

const DocumentList = lazy(() => import("./pages/signing/DocumentList"));
const DocumentEditor = lazy(() => import("./pages/signing/DocumentEditor"));
const SignDocument = lazy(() => import("./pages/signing/SignDocument"));

const SummarizePdf = lazy(() => import("./pages/ai/SummarizePdf"));
const ExplainPdf = lazy(() => import("./pages/ai/ExplainPdf"));
const ChatPdf = lazy(() => import("./pages/ai/ChatPdf"));

const InfoPage = lazy(() => import("./pages/info/InfoPage"));
const EnterpriseByoc = lazy(() => import("./pages/enterprise/EnterpriseByoc"));
const DesktopToolkit = lazy(() => import("./pages/desktop/DesktopToolkit"));
const EsignLanding = lazy(() => import("./pages/esign/EsignLanding"));

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center animate-fade-in">
    <Spinner className="h-6 w-6 text-primary" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={300}>
        <Router>
          <ScrollToTop />
          <RouteSeo />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/s/:token" element={<SignDocument />} />

              <Route path="/" element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="workspace" element={<Workspace />}>
                  <Route path=":tool" element={<Workspace />} />
                </Route>
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="verify-email" element={<VerifyEmail />} />

                <Route path="history" element={
                  <ProtectedRoute>
                    <History />
                  </ProtectedRoute>
                } />
                <Route path="billing" element={
                  <ProtectedRoute>
                    <VerifiedRoute>
                      <Billing />
                    </VerifiedRoute>
                  </ProtectedRoute>
                } />
                <Route path="profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="settings/cloud" element={
                  <ProtectedRoute>
                    <CloudStorage />
                  </ProtectedRoute>
                } />

                <Route path="esign" element={<EsignLanding />} />
                <Route path="sign" element={
                  <ProtectedRoute>
                    <VerifiedRoute>
                      <DocumentList />
                    </VerifiedRoute>
                  </ProtectedRoute>
                } />
                <Route path="sign/:id" element={
                  <ProtectedRoute>
                    <VerifiedRoute>
                      <DocumentEditor />
                    </VerifiedRoute>
                  </ProtectedRoute>
                } />

                <Route path="ai/summarize" element={
                  <ProtectedRoute>
                    <VerifiedRoute>
                      <SummarizePdf />
                    </VerifiedRoute>
                  </ProtectedRoute>
                } />
                <Route path="ai/explain" element={
                  <ProtectedRoute>
                    <VerifiedRoute>
                      <ExplainPdf />
                    </VerifiedRoute>
                  </ProtectedRoute>
                } />
                <Route path="ai/chat" element={
                  <ProtectedRoute>
                    <VerifiedRoute>
                      <ChatPdf />
                    </VerifiedRoute>
                  </ProtectedRoute>
                } />

                <Route path="enterprise" element={<EnterpriseByoc />} />
                <Route path="desktop" element={<DesktopToolkit />} />
                <Route path="security" element={<InfoPage type="security" />} />
                <Route path="developer" element={<InfoPage type="developer" />} />
                <Route path="api-docs" element={<InfoPage type="developer" />} />
                <Route path="blog" element={<InfoPage type="blog" />} />
                <Route path="about" element={<InfoPage type="about" />} />
                <Route path="privacy" element={<InfoPage type="privacy" />} />
                <Route path="terms" element={<InfoPage type="terms" />} />
                <Route path="gdpr" element={<InfoPage type="gdpr" />} />
                <Route path="docs" element={<InfoPage type="docs" />} />

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
