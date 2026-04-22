import { useState, useEffect } from 'react';
import { Settings, Users, Building2, Plus, CreditCard as Edit2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, Branch } from '../lib/types';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { profile: currentProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'branches' | 'account'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'sales_staff', branch_id: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState(false);

  // Edit profile
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, branchesRes] = await Promise.all([
      supabase.from('profiles').select('*, branch:branches(name)').order('created_at'),
      supabase.from('branches').select('*').order('name'),
    ]);
    setProfiles(profilesRes.data || []);
    setBranches(branchesRes.data || []);
    setLoading(false);
  };

  const handleAddUser = async () => {
    setUserError('');
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      setUserError('Please fill in all required fields.');
      return;
    }
    setSavingUser(true);
    const { data, error } = await supabase.auth.admin
      ? ({ data: null, error: new Error('Use Supabase Dashboard to create users') })
      : await supabase.auth.signUp({
          email: newUser.email,
          password: newUser.password,
          options: {
            data: { full_name: newUser.full_name, role: newUser.role },
          },
        });

    if (error) {
      setUserError(error.message);
      setSavingUser(false);
      return;
    }

    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: newUser.full_name,
        role: newUser.role,
        branch_id: newUser.branch_id || null,
      });
    }

    setSavingUser(false);
    setUserSuccess(true);
    setShowAddUser(false);
    setNewUser({ email: '', password: '', full_name: '', role: 'sales_staff', branch_id: '' });
    loadData();
    setTimeout(() => setUserSuccess(false), 3000);
  };

  const handleUpdateRole = async () => {
    if (!editProfile) return;
    setSavingEdit(true);
    await supabase.from('profiles').update({ role: editRole }).eq('id', editProfile.id);
    setSavingEdit(false);
    setEditProfile(null);
    loadData();
  };

  const tabs = [
    { key: 'users', label: 'Users', icon: Users },
    { key: 'branches', label: 'Branches', icon: Building2 },
    { key: 'account', label: 'My Account', icon: Settings },
  ] as const;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-xl font-black text-slate-900">Settings</h3>
        <p className="text-slate-500 text-sm">Manage system configuration</p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {userSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl animate-fade-in">
          <CheckCircle size={16} />
          <span className="text-sm font-semibold">User created successfully</span>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{profiles.length} users</p>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus size={15} />
              Add User
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {profiles.map(p => (
                <div key={p.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-bold text-sm">{(p.full_name || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{p.full_name || 'Unnamed User'}</p>
                    <p className="text-xs text-slate-500">
                      {(p.branch as { name?: string } | null)?.name || 'No branch'} ·{' '}
                      Joined {new Date(p.created_at).toLocaleDateString('en-GH', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    p.role === 'ceo' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.role === 'ceo' ? 'CEO / Admin' : 'Sales Staff'}
                  </span>
                  {p.id !== currentProfile?.id && (
                    <button
                      onClick={() => { setEditProfile(p); setEditRole(p.role); }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {branches.map(b => (
            <div key={b.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{b.name}</p>
                <p className="text-xs text-slate-500">{b.location}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${b.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {b.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && currentProfile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-black text-2xl">{(currentProfile.full_name || '?').charAt(0)}</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">{currentProfile.full_name}</h4>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${
                currentProfile.role === 'ceo' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {currentProfile.role === 'ceo' ? 'CEO / Admin' : 'Sales Staff'}
              </span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Phone</span>
              <span className="font-medium text-slate-900">{currentProfile.phone || '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Account Status</span>
              <span className={`font-semibold ${currentProfile.is_active ? 'text-emerald-600' : 'text-red-600'}`}>
                {currentProfile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Member Since</span>
              <span className="font-medium text-slate-900">{new Date(currentProfile.created_at).toLocaleDateString('en-GH', { dateStyle: 'long' })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        open={showAddUser}
        onClose={() => setShowAddUser(false)}
        title="Add New User"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAddUser(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleAddUser} disabled={savingUser} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {savingUser ? 'Creating...' : 'Create User'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {userError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{userError}</div>
          )}
          {[
            { key: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Full name' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'Email address' },
            { key: 'password', label: 'Password', type: 'password', placeholder: 'Minimum 6 characters' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">{f.label} <span className="text-red-500">*</span></label>
              <input
                type={f.type}
                value={newUser[f.key as keyof typeof newUser] as string}
                onChange={e => setNewUser(n => ({ ...n, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
            <select
              value={newUser.role}
              onChange={e => setNewUser(n => ({ ...n, role: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="sales_staff">Sales Staff</option>
              <option value="ceo">CEO / Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch</label>
            <select
              value={newUser.branch_id}
              onChange={e => setNewUser(n => ({ ...n, branch_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        open={!!editProfile}
        onClose={() => setEditProfile(null)}
        title="Change User Role"
        size="sm"
        footer={
          <>
            <button onClick={() => setEditProfile(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleUpdateRole} disabled={savingEdit} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editProfile && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">Changing role for <strong>{editProfile.full_name}</strong></p>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="sales_staff">Sales Staff</option>
                <option value="ceo">CEO / Admin</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
