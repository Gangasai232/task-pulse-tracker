import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { AllTasksPage } from './pages/AllTasksPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { UsersPage } from './pages/UsersPage';
import { AdminConsole } from './pages/AdminConsole';
import { OverdueAlertsModal } from './components/OverdueAlertsModal';
import { ProjectModal } from './components/ProjectModal';
import { TaskModal } from './components/TaskModal';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Render Error Caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-slate-100">
          <div className="glass-panel p-8 rounded-xl max-w-xl w-full text-left space-y-4 border border-rose-800 shadow-2xl">
            <h2 className="text-lg font-bold text-rose-400">Application UI Error Details</h2>
            <div className="p-4 bg-slate-950 rounded-lg border border-rose-900/60 font-mono text-xs text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-60">
              {this.state.error ? this.state.error.stack || this.state.error.toString() : 'Unknown render error'}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/login';
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm"
              >
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [alertSelectedTaskId, setAlertSelectedTaskId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.role === 'ADMIN';
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      <Navbar onOpenAlertsModal={() => setShowAlertsModal(true)} />

      <div className="flex flex-1">
        <Sidebar onOpenCreateProject={() => setShowCreateProject(true)} />

        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/all-tasks" element={<AllTasksPage />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
            <Route path="/users" element={isManagerOrAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
            <Route path="/admin" element={isAdmin ? <AdminConsole /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Overdue Alerts Modal */}
      {showAlertsModal && (
        <OverdueAlertsModal
          onClose={() => setShowAlertsModal(false)}
          onSelectTask={(tId) => setAlertSelectedTaskId(tId)}
        />
      )}

      {/* Selected Task Modal from Alerts */}
      {alertSelectedTaskId && (
        <TaskModal
          taskId={alertSelectedTaskId}
          onClose={() => setAlertSelectedTaskId(null)}
        />
      )}

      {/* Quick Create Project Modal */}
      {showCreateProject && (
        <ProjectModal
          onClose={() => setShowCreateProject(false)}
          onProjectSaved={() => window.location.reload()}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
