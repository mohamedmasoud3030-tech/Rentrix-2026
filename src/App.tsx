import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import AppShell from './components/layout/AppShell';
import { AppProvider } from './contexts/AppContext';
import ErrorBoundary from './components/ErrorBoundary';

const lazyWithRetry = <T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const hasReloaded = sessionStorage.getItem('rentrix:lazy-reload');
      if (!hasReloaded) {
        sessionStorage.setItem('rentrix:lazy-reload', '1');
        window.location.reload();
      }
      throw error;
    } finally {
      sessionStorage.removeItem('rentrix:lazy-reload');
    }
  });

// Lazy load pages
const Owners = lazyWithRetry(() => import('./pages/Owners'));
const Properties = lazyWithRetry(() => import('./pages/PropertiesAndUnits'));
const Tenants = lazyWithRetry(() => import('./pages/Tenants'));
const Contracts = lazyWithRetry(() => import('./pages/Contracts'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Financials = lazyWithRetry(() => import('./pages/Financials'));
const Invoices = lazyWithRetry(() => import('./pages/Invoices'));
const Accounting = lazyWithRetry(() => import('./pages/Accounting'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Maintenance = lazyWithRetry(() => import('./pages/Maintenance'));
const Missions = lazyWithRetry(() => import('./pages/Missions'));
const Leads = lazyWithRetry(() => import('./pages/Leads'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const CommunicationHub = lazyWithRetry(() => import('./pages/CommunicationHub'));
const Reports = lazyWithRetry(() => import('./pages/Reports'));
const AuditLog = lazyWithRetry(() => import('./pages/AuditLog'));
const Backup = lazyWithRetry(() => import('./pages/Backup'));
const HR = lazyWithRetry(() => import('./pages/HR'));
const DataIntegrityAudit = lazyWithRetry(() => import('./pages/DataIntegrityAudit'));
const Lands = lazyWithRetry(() => import('./pages/Lands'));
const Commissions = lazyWithRetry(() => import('./pages/Commissions'));
const PropertyMap = lazyWithRetry(() => import('./pages/PropertyMap'));
const System = lazyWithRetry(() => import('./pages/System'));
const OwnerLedgerReport = lazyWithRetry(() => import('./pages/OwnerLedgerReport'));
const TenantLedgerReport = lazyWithRetry(() => import('./pages/TenantLedgerReport'));
const SupplierLedgerReport = lazyWithRetry(() => import('./pages/SupplierLedgerReport'));
const PrintContract = lazyWithRetry(() => import('./pages/print/PrintContract'));
const PrintReceipt = lazyWithRetry(() => import('./pages/print/PrintReceipt'));
const OwnerView = lazyWithRetry(() => import('./pages/OwnerView'));

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
    return <div dir="rtl">جاري تحميل رينتريكس...</div>;
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
        <Route path="/print/contract/:id" element={<PrintContract />} />
        <Route path="/print/receipt/:id" element={<PrintReceipt />} />
        
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
          <Route path="/tenant-ledger" element={<TenantLedgerReport />} />
          <Route path="/supplier-ledger" element={<SupplierLedgerReport />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
