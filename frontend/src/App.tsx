import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Platforms from './pages/Platforms';
import PlatformDetail from './pages/PlatformDetail';
import BusinessManagerDetail from './pages/BusinessManagerDetail';
import AdLibrary from './pages/AdLibrary';
import CreateCampaign from './pages/CreateCampaign';
import AIAgent from './pages/AIAgent';
import Diagnostics from './pages/Diagnostics';
import Reports from './pages/Reports';
import Financial from './pages/Financial';
import AutomationRules from './pages/AutomationRules';
import CampaignLibrary from './pages/CampaignLibrary';
import WhatsAppSettings from './pages/WhatsAppSettings';
import Clients from './pages/Clients';
import ApiLogs from './pages/ApiLogs';
import KnowledgeBase from './pages/KnowledgeBase';

// Layout
import AppLayout from './components/layout/AppLayout';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Logout route - clears everything and redirects to login
function LogoutRoute() {
  const { clearAuth } = useAuthStore();
  clearAuth();
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="campaigns" element={<ErrorBoundary><Campaigns /></ErrorBoundary>} />
            <Route path="campaigns/new" element={<ErrorBoundary><CreateCampaign /></ErrorBoundary>} />
            <Route path="campaigns/:id" element={<ErrorBoundary><CampaignDetail /></ErrorBoundary>} />
            <Route path="platforms" element={<ErrorBoundary><Platforms /></ErrorBoundary>} />
            <Route path="platforms/bm/:bmId" element={<ErrorBoundary><BusinessManagerDetail /></ErrorBoundary>} />
            <Route path="platforms/:id" element={<ErrorBoundary><PlatformDetail /></ErrorBoundary>} />
            <Route path="ad-library" element={<ErrorBoundary><AdLibrary /></ErrorBoundary>} />
            <Route path="ai-agent" element={<ErrorBoundary><AIAgent /></ErrorBoundary>} />
            <Route path="diagnostics" element={<ErrorBoundary><Diagnostics /></ErrorBoundary>} />
            <Route path="reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
            <Route path="financial" element={<ErrorBoundary><Financial /></ErrorBoundary>} />
            <Route path="automation" element={<ErrorBoundary><AutomationRules /></ErrorBoundary>} />
            <Route path="campaign-library" element={<ErrorBoundary><CampaignLibrary /></ErrorBoundary>} />
            <Route path="whatsapp" element={<ErrorBoundary><WhatsAppSettings /></ErrorBoundary>} />
            <Route path="clients" element={<ErrorBoundary><Clients /></ErrorBoundary>} />
            <Route path="api-logs" element={<ErrorBoundary><ApiLogs /></ErrorBoundary>} />
            <Route path="knowledge-base" element={<ErrorBoundary><KnowledgeBase /></ErrorBoundary>} />
          </Route>

          {/* Logout */}
          <Route path="/logout" element={<LogoutRoute />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
