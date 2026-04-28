import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, googleProvider, auth, isFirebaseConfigured, db, doc, setDoc, getDoc, serverTimestamp, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from './firebase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import NewOrder from './components/NewOrder';
import Inventory from './components/Inventory';
import NewProduct from './components/NewProduct';
import CRM from './components/CRM';
import Inbox from './components/Inbox';
import Logistics from './components/Logistics';
import POS from './components/POS';
import Suppliers from './components/Suppliers';
import Finance from './components/Finance';
import HR from './components/HR';
import Team from './components/Team';
import Tasks from './components/Tasks';
import Reports from './components/Reports';
import Returns from './components/Returns';
import Settings from './components/Settings';
import { LogIn, AlertTriangle, ShieldCheck, Mail, Lock, Loader2, UserPlus, User as UserIcon, LogOut } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { toast, Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

import Login from './components/Login';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
              <p className="text-sm text-gray-500">An unexpected error occurred. Please try refreshing the page.</p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] bg-gray-50 p-4 rounded-lg text-left overflow-auto max-h-40 border border-gray-100 font-mono text-red-500">
                {this.state.error.message}
              </pre>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function InactiveUserScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-gray-100 shadow-xl text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-[#141414]">Amar <span className="text-[#0066FF]">Supply</span></h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Account Pending</p>
        </div>
        
        <div className="space-y-4">
          <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto text-orange-500 shadow-inner">
            <AlertTriangle size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Approval Required</h2>
          <p className="text-sm text-gray-500">Your account has been created successfully, but it requires administrator approval before you can access the dashboard.</p>
        </div>

        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all shadow-sm group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

function AppContent() {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-accent uppercase tracking-widest animate-pulse">Amar Supply</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        
        <Route path="/*" element={
          user ? (
            user.active ? (
              <Layout user={user}>
                <Routes>
                  <Route path="/dashboard" element={hasPermission('dashboard') ? <Dashboard /> : <Navigate to="/tasks" replace />} />
                  <Route path="/pos" element={hasPermission('pos') ? <POS /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/orders" element={hasPermission('orders') ? <Orders /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/orders/new" element={hasPermission('orders') ? <NewOrder /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/inventory" element={hasPermission('inventory') ? <Inventory /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/inventory/new" element={hasPermission('inventory') ? <NewProduct /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/inventory/edit/:id" element={hasPermission('inventory') ? <NewProduct /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/crm" element={hasPermission('crm') ? <CRM /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/inbox" element={hasPermission('crm') ? <Inbox /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/returns" element={hasPermission('orders') ? <Returns /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/suppliers" element={hasPermission('suppliers') ? <Suppliers /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/logistics" element={hasPermission('logistics') ? <Logistics /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/finance" element={hasPermission('finance') ? <Finance /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/hr" element={hasPermission('hr') ? <HR /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/team" element={hasPermission('team') ? <Team /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/tasks" element={hasPermission('tasks') ? <Tasks /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/reports" element={hasPermission('dashboard') ? <Reports /> : <Navigate to="/dashboard" replace />} />
                  <Route path="/settings" element={hasPermission('settings') ? <Settings /> : <Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            ) : (
              <InactiveUserScreen />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </Router>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" richColors theme={theme} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <AppContent />
            <ThemedToaster />
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
