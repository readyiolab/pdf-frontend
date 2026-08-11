import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { TooltipProvider } from "./components/ui/tooltip";
import { ScrollToTop } from "./components/ScrollToTop";
import { NavigationProgress } from "./components/NavigationProgress";
import { RouteFallback } from "./components/RouteFallback";
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

const LettersLanding = lazy(() => import("./pages/letters/LettersLanding"));
const LettersHub = lazy(() => import("./pages/letters/LettersHub"));
const BrandProfilesPage = lazy(() => import("./pages/letters/BrandProfilesPage"));
const TemplatesPage = lazy(() => import("./pages/letters/TemplatesPage"));
const BatchWizardPage = lazy(() => import("./pages/letters/BatchWizardPage"));
const BatchHistoryPage = lazy(() => import("./pages/letters/BatchHistoryPage"));
const MailCallbackPage = lazy(() => import("./pages/letters/MailCallbackPage"));
const TeamSettingsPage = lazy(() => import("./pages/letters/TeamSettingsPage"));
const AcceptInvitePage = lazy(() => import("./pages/letters/AcceptInvitePage"));
const LetterStudioShell = lazy(() =>
  import("./components/letters/LetterStudioShell").then((m) => ({
    default: m.LetterStudioShell,
  }))
);
const DiagramStudioShell = lazy(() =>
  import("./components/diagrams/DiagramStudioShell").then((m) => ({
    default: m.DiagramStudioShell,
  }))
);
const DiagramsLanding = lazy(() => import("./pages/diagrams/DiagramsLanding"));
const DiagramsListPage = lazy(() => import("./pages/diagrams/DiagramsListPage"));
const DiagramEditorPage = lazy(() => import("./pages/diagrams/DiagramEditorPage"));
const SharedDiagramPage = lazy(() => import("./pages/diagrams/SharedDiagramPage"));

function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={300}>
        <Router>
          <ScrollToTop />
          <NavigationProgress />
          <RouteSeo />
          <Routes>
              <Route
                path="/s/:token"
                element={
                  <Suspense fallback={<RouteFallback className="min-h-dvh" />}>
                    <SignDocument />
                  </Suspense>
                }
              />

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

                <Route path="letters" element={<LettersLanding />} />
                <Route
                  path="letters/mail/callback"
                  element={
                    <ProtectedRoute>
                      <VerifiedRoute>
                        <MailCallbackPage />
                      </VerifiedRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <VerifiedRoute>
                        <LetterStudioShell />
                      </VerifiedRoute>
                    </ProtectedRoute>
                  }
                >
                  <Route path="letters/studio" element={<LettersHub />} />
                  <Route path="letters/brands" element={<BrandProfilesPage />} />
                  <Route path="letters/templates" element={<TemplatesPage />} />
                  <Route path="letters/batches/new" element={<BatchWizardPage />} />
                  <Route path="letters/batches/:batchId" element={<BatchWizardPage />} />
                  <Route path="letters/history" element={<BatchHistoryPage />} />
                  <Route path="letters/team" element={<TeamSettingsPage />} />
                </Route>
                <Route path="orgs/accept-invite" element={
                  <ProtectedRoute>
                    <VerifiedRoute>
                      <AcceptInvitePage />
                    </VerifiedRoute>
                  </ProtectedRoute>
                } />

                <Route path="diagrams" element={<DiagramsLanding />} />
                <Route
                  path="diagrams/shared/:token"
                  element={<SharedDiagramPage />}
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <VerifiedRoute>
                        <DiagramStudioShell />
                      </VerifiedRoute>
                    </ProtectedRoute>
                  }
                >
                  <Route path="diagrams/studio" element={<DiagramsListPage />} />
                  <Route path="diagrams/new" element={<DiagramEditorPage />} />
                  <Route path="diagrams/:id" element={<DiagramEditorPage />} />
                </Route>

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
        </Router>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
