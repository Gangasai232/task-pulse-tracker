import React, { useState, useEffect } from 'react';
import api from '../api';
import { X, FolderPlus, Users } from 'lucide-react';

export const ProjectModal = ({ project, onClose, onProjectSaved }) => {
  const [key, setKey] = useState(project?.key || '');
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [selectedMembers, setSelectedMembers] = useState(
    project?.members?.map((m) => m._id || m) || []
  );

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.get('/users');
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };
    fetchUsers();
  }, []);

  const toggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      if (project) {
        // Edit existing project
        await api.put(`/projects/${project._id}`, {
          name,
          description,
          members: selectedMembers,
        });
      } else {
        // Create new project
        await api.post('/projects', {
          key: key.toUpperCase(),
          name,
          description,
          members: selectedMembers,
        });
      }

      onProjectSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl flex flex-col shadow-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-100 font-display font-bold text-lg">
            <FolderPlus className="w-5 h-5 text-indigo-400" />
            <span>{project ? 'Edit Project Settings' : 'Create New Project'}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-6 mb-0 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!project && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Project Key (Short Identifier e.g. "PRJ", "FIN")
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="PRJ"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
            <input
              type="text"
              placeholder="e.g. Cloud Infrastructure Modernization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Describe project objectives and scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span>Assign Project Members</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Removing a user auto-unassigns them from tasks
              </span>
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              {users.map((u) => {
                const isSelected = selectedMembers.includes(u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleMember(u._id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-700/60'
                        : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full" />
                      <span className="font-semibold">{u.name}</span>
                      <span className="text-[10px] text-slate-500">({u.role})</span>
                    </div>
                    <input type="checkbox" checked={isSelected} readOnly className="rounded accent-indigo-600" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
