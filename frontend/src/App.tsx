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
import Audiences from './pages/Audiences';
import Leads from './pages/Leads';
import PurchaseJourney from './pages/PurchaseJourney';
import TrackingLinks from './pages/TrackingLinks';
import ConversionEvents from './pages/ConversionEvents';
import PixelConfig from './pages/PixelConfig';
import WebhooksPage from './pages/Webhooks';
import TrackableMessages from './pages/TrackableMessages';

// Layout
import AppLayout from './components/layout/AppLayout';

// Protected Route Component - waits for Zustand hydration before deciding
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Wait for Zustand persist to finish hydrating from localStorage
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

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
            <Route path="audiences" element={<ErrorBoundary><Audiences /></ErrorBoundary>} />
            <Route path="knowledge-base" element={<ErrorBoundary><KnowledgeBase /></ErrorBoundary>} />
            <Route path="leads" element={<ErrorBoundary><Leads /></ErrorBoundary>} />
            <Route path="purchase-journey" element={<ErrorBoundary><PurchaseJourney /></ErrorBoundary>} />
            <Route path="tracking-links" element={<ErrorBoundary><TrackingLinks /></ErrorBoundary>} />
            <Route path="conversion-events" element={<ErrorBoundary><ConversionEvents /></ErrorBoundary>} />
            <Route path="pixel" element={<ErrorBoundary><PixelConfig /></ErrorBoundary>} />
            <Route path="webhooks" element={<ErrorBoundary><WebhooksPage /></ErrorBoundary>} />
            <Route path="tracking-messages" element={<ErrorBoundary><TrackableMessages /></ErrorBoundary>} />
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
