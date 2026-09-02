import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { ProjectModal } from '../components/ProjectModal';
import { FolderKanban, Plus, Archive, RefreshCw, Users, ArrowRight, Trash2 } from 'lucide-react';

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/projects?includeArchived=${showArchived}`);
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [showArchived]);

  const handleArchiveToggle = async (projectId, currentArchivedState, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/projects/${projectId}/archive`, { archived: !currentArchivedState });
      await loadProjects();
    } catch (err) {
      alert(`Failed to archive/restore project: ${err.message}`);
    }
  };

  const handleDeleteProject = async (projectId, projectName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"? All associated tasks and timeline history will be permanently deleted.`)) {
      return;
    }
    try {
      await api.delete(`/projects/${projectId}`);
      await loadProjects();
    } catch (err) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100">Projects Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Manage active project engagements, team memberships, and task tracking</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active / Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition ${
              showArchived
                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </button>

          {isManager && (
            <button
              onClick={() => {
                setEditingProject(null);
                setShowProjectModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl text-center space-y-3 border border-slate-800">
          <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Projects Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {showArchived ? 'No archived projects exist in the system.' : 'You have no active project access.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project._id}
              onClick={() => navigate(`/projects/${project._id}`)}
              className={`glass-panel p-5 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-4 ${
                project.archived
                  ? 'border-amber-900/50 bg-slate-950/60 opacity-80'
                  : 'glass-panel-hover border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-indigo-400 font-mono text-xs font-bold border border-slate-800">
                    {project.key}
                  </span>
                  {project.archived && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                      ARCHIVED
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-display font-bold text-base text-slate-100">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {project.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{project.members?.length || 0} Members</span>
                </div>

                <div className="flex items-center gap-2">
                  {isManager && (
                    <>
                      <button
                        onClick={(e) => handleArchiveToggle(project._id, project.archived, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 transition"
                        title={project.archived ? 'Restore Project' : 'Archive Project'}
                      >
                        {project.archived ? <RefreshCw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={(e) => handleDeleteProject(project._id, project.name, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <span className="text-indigo-400 font-semibold flex items-center gap-0.5 text-xs">
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Create / Edit Modal */}
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => setShowProjectModal(false)}
          onProjectSaved={loadProjects}
        />
      )}
    </div>
  );
};
