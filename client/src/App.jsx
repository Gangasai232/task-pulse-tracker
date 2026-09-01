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

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [alertSelectedTaskId, setAlertSelectedTaskId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar onOpenAlertsModal={() => setShowAlertsModal(true)} />

      <div className="flex flex-1">
        <Sidebar onOpenCreateProject={() => setShowCreateProject(true)} />

        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={isAdmin ? <AdminConsole /> : <DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/all-tasks" element={<AllTasksPage />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin" element={<AdminConsole />} />
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
  );
}
