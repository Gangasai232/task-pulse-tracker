import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { ProjectModal } from '../components/ProjectModal';
import { FolderKanban, Plus, Archive, RefreshCw, Users, Shield, ArrowRight } from 'lucide-react';

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
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100">Client Projects</h1>
          <p className="text-xs text-slate-400">Manage client engagements, team assignments, and task boards</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active / Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition ${
              showArchived
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Showing Archived' : 'Show Archived Projects'}
          </button>

          {isManager && (
            <button
              onClick={() => {
                setEditingProject(null);
                setShowProjectModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
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
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3 border border-slate-800">
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
              className={`glass-panel p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 ${
                project.archived
                  ? 'border-amber-900/40 bg-slate-950/60 opacity-80'
                  : 'glass-panel-hover border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 font-mono text-xs font-bold border border-indigo-800/60">
                    {project.key}
                  </span>
                  {project.archived && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                      ARCHIVED
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg text-slate-100 group-hover:text-indigo-300">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {project.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{project.members?.length || 0} Members</span>
                </div>

                <div className="flex items-center gap-2">
                  {isManager && (
                    <button
                      onClick={(e) => handleArchiveToggle(project._id, project.archived, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/30 transition"
                      title={project.archived ? 'Restore Project' : 'Archive Project'}
                    >
                      {project.archived ? <RefreshCw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <span className="text-indigo-400 font-semibold flex items-center gap-0.5">
                    Open <ArrowRight className="w-3.5 h-3.5" />
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
