import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import AppShell from './components/layout/AppShell';
import { AppProvider } from './contexts/AppContext';

// Lazy load pages
const Owners = lazy(() => import('./pages/Owners'));
const Properties = lazy(() => import('./pages/PropertiesAndUnits'));
const Tenants = lazy(() => import('./pages/Tenants'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Login = lazy(() => import('./pages/Login'));
const Financials = lazy(() => import('./pages/Financials'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Accounting = lazy(() => import('./pages/Accounting'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Missions = lazy(() => import('./pages/Missions'));
const Leads = lazy(() => import('./pages/Leads'));
const Settings = lazy(() => import('./pages/Settings'));
const CommunicationHub = lazy(() => import('./pages/CommunicationHub'));
const Reports = lazy(() => import('./pages/Reports'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Backup = lazy(() => import('./pages/Backup'));
const HR = lazy(() => import('./pages/HR'));
const DataIntegrityAudit = lazy(() => import('./pages/DataIntegrityAudit'));
// Split lands and commissions into standalone pages
const Lands = lazy(() => import('./pages/Lands'));
const Commissions = lazy(() => import('./pages/Commissions'));
const PropertyMap = lazy(() => import('./pages/PropertyMap'));
const System = lazy(() => import('./pages/System'));
const OwnerLedgerReport = lazy(() => import('./pages/OwnerLedgerReport'));
const OwnerView = lazy(() => import('./pages/OwnerView'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div>جاري تحميل رينتريكس...</div>; // Customized loading message
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/portal/:ownerId" element={<OwnerView />} />
        
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/people" element={<Navigate to="/owners" replace />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/financials" element={<Financials />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/tasks" element={<Missions />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<CommunicationHub />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/audit/integrity" element={<DataIntegrityAudit />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/hr" element={<HR />} />
          <Route path="/lands" element={<Lands />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/map" element={<PropertyMap />} />
          <Route path="/system" element={<System />} />
          <Route path="/owner-ledger" element={<OwnerLedgerReport />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
};

export default App;
