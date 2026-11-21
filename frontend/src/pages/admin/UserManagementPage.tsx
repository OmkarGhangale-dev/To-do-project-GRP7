import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  UserPlus,
  Eye,
  Edit3,
  Trash2,
  Ban,
  CheckCircle2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { User, UserAccountStatus, UserRole } from '../../types';
import { Modal } from '../../components/common/Modal';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';

export const UserManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [backendUsers, setBackendUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  // Add User Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('Engineering');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [newStatus, setNewStatus] = useState<UserAccountStatus>('Active');

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [editStatus, setEditStatus] = useState<UserAccountStatus>('Active');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Determine if active session is Super Admin
  const isSuperAdmin =
    Boolean(currentUser?.isSuperAdmin) ||
    currentUser?.email?.toLowerCase().trim() === 'omkarghangale36@gmail.com';

  // Fetch registered users from backend
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminUsers();
      if (res.success && Array.isArray(res.data)) {
        const mapped: User[] = res.data.map((u: any) => {
          const email = (u.email || '').toLowerCase().trim();
          const userIsSuper =
            Boolean(u.isSuperAdmin) || email === 'omkarghangale36@gmail.com';

          return {
            id: u.id,
            name: u.name || (email ? email.split('@')[0] : 'User'),
            email: u.email || '',
            role: (userIsSuper ? 'admin' : (u.role || 'user')) as UserRole,
            isSuperAdmin: userIsSuper,
            status: (u.status || 'Active') as UserAccountStatus,
            avatar:
              u.avatar ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                u.name || 'User'
              )}`,
            department: u.department || 'Workspace',
            registeredDate: u.createdAt
              ? new Date(
                  u.createdAt._seconds ? u.createdAt._seconds * 1000 : u.createdAt
                )
                  .toISOString()
                  .split('T')[0]
              : new Date().toISOString().split('T')[0],
            totalTasks: 0,
            completedTasks: 0,
          };
        });
        setBackendUsers(mapped);
      }
    } catch (err: any) {
      console.warn('Could not load registered admin users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditDepartment(user.department);
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      // In TaskFlow, new users register via authentication; this creates a local view profile
      const newUser: User = {
        id: 'usr-' + Date.now(),
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        isSuperAdmin: false,
        status: newStatus,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          newName.trim()
        )}`,
        department: newDepartment,
        registeredDate: new Date().toISOString().split('T')[0],
        totalTasks: 0,
        completedTasks: 0,
      };

      setBackendUsers((prev) => [newUser, ...prev]);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      showToast('User Created', `${newUser.name} added to workspace.`, 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Could not add user.', 'error');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setBackendUsers((prev) =>
      prev.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              name: editName.trim(),
              email: editEmail.trim(),
              department: editDepartment.trim(),
              status: editStatus,
            }
          : u
      )
    );

    showToast('Saved', 'User details updated.', 'info');
    setEditingUser(null);
  };

  const handleToggleStatus = (user: User) => {
    if (user.isSuperAdmin || user.email.toLowerCase().trim() === 'omkarghangale36@gmail.com') {
      showToast('Protected Account', 'The Super Admin account cannot be deactivated.', 'error');
      return;
    }

    const nextStatus: UserAccountStatus =
      user.status === 'Active' ? 'Inactive' : 'Active';

    setBackendUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );
    showToast('Status Changed', `Account status set to ${nextStatus}.`, 'info');
  };

  const handleBlockUser = (user: User) => {
    if (user.isSuperAdmin || user.email.toLowerCase().trim() === 'omkarghangale36@gmail.com') {
      showToast('Protected Account', 'The Super Admin account cannot be suspended.', 'error');
      return;
    }

    const nextStatus: UserAccountStatus =
      user.status === 'Suspended' ? 'Active' : 'Suspended';

    setBackendUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );
    showToast('User Blocked', `Account status set to ${nextStatus}.`, 'info');
  };

  const handleRoleToggle = async (targetUser: User) => {
    if (!isSuperAdmin) {
      showToast(
        'Access Denied',
        'Only the Super Admin (omkarghangale36@gmail.com) can promote or revoke Admin roles.',
        'error'
      );
      return;
    }

    if (targetUser.isSuperAdmin || targetUser.email.toLowerCase().trim() === 'omkarghangale36@gmail.com') {
      showToast(
        'Action Forbidden',
        'The Super Admin role is permanent and cannot be modified or revoked.',
        'error'
      );
      return;
    }

    const nextRole: UserRole = targetUser.role === 'admin' ? 'user' : 'admin';

    try {
      const res = await api.updateUserRole(targetUser.id, nextRole);
      if (res.success) {
        showToast(
          'Role Updated',
          `${targetUser.name} has been ${
            nextRole === 'admin' ? 'promoted to Administrator' : 'demoted to Member'
          }.`,
          'success'
        );
        fetchUsers();
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update user role.', 'error');
    }
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;

    if (
      deletingUser.isSuperAdmin ||
      deletingUser.email.toLowerCase().trim() === 'omkarghangale36@gmail.com'
    ) {
      showToast('Protected Account', 'The Super Admin account cannot be deleted.', 'error');
      setDeletingUser(null);
      return;
    }

    setBackendUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
    showToast('User Removed', `${deletingUser.name} was removed.`, 'info');
    setDeletingUser(null);
  };

  // Filtered users
  const filteredUsers = backendUsers.filter((u) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !u.name.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q) &&
        !u.department.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'All' && u.status !== statusFilter) return false;
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            User Management Directory
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              {backendUsers.length} Total Users
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Administer employee accounts, permissions, account states, and role assignments
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs shadow-purple-600/30 transition-all flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, department..."
            className="w-full pl-9.5 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold pl-3 pr-7 py-2 bg-white dark:bg-[#151D2A] border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none cursor-pointer shadow-2xs"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs font-semibold pl-3 pr-7 py-2 bg-white dark:bg-[#151D2A] border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 appearance-none cursor-pointer shadow-2xs"
            >
              <option value="All">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">Member</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">User ID</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5 text-center">Tasks (Done/Total)</th>
                <th className="px-5 py-3.5">Registered</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No users matching criteria
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User name & avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-500">
                      {user.id}
                    </td>

                    {/* Department */}
                    <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                      {user.department}
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      {user.isSuperAdmin || user.email.toLowerCase().trim() === 'omkarghangale36@gmail.com' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 shadow-2xs">
                          <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          Super Admin (Owner)
                        </span>
                      ) : user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          Administrator
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Member
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          user.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : user.status === 'Suspended'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'Active'
                              ? 'bg-emerald-500'
                              : user.status === 'Suspended'
                              ? 'bg-rose-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {user.status}
                      </span>
                    </td>

                    {/* Task count */}
                    <td className="px-5 py-3.5 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {user.completedTasks}
                      </span>{' '}
                      / {user.totalTasks}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {user.registeredDate}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-center relative">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingUser(user)}
                          title="View user details"
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit user"
                          className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id)
                          }
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {activeMenuUserId === user.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setActiveMenuUserId(null)}
                          />
                          <div className="absolute right-4 top-10 z-40 w-52 spike-dropdown py-1.5 text-xs">
                            {/* Role Elevation (Super Admin Only) */}
                            {user.isSuperAdmin || user.email.toLowerCase().trim() === 'omkarghangale36@gmail.com' ? (
                              <div className="px-3.5 py-2 text-amber-600 dark:text-amber-400 flex items-center gap-2 select-none font-medium">
                                <Crown className="w-3.5 h-3.5" />
                                <span>Super Admin (Permanent)</span>
                              </div>
                            ) : isSuperAdmin ? (
                              <button
                                onClick={() => {
                                  handleRoleToggle(user);
                                  setActiveMenuUserId(null);
                                }}
                                className={`w-full px-3.5 py-2 text-left font-semibold flex items-center gap-2 ${
                                  user.role === 'admin'
                                    ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                    : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                                }`}
                              >
                                {user.role === 'admin' ? (
                                  <>
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Revoke Admin Access</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                    <span>Promote to Admin</span>
                                  </>
                                )}
                              </button>
                            ) : null}

                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                            <button
                              onClick={() => {
                                handleToggleStatus(user);
                                setActiveMenuUserId(null);
                              }}
                              className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {user.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                            </button>

                            <button
                              onClick={() => {
                                handleBlockUser(user);
                                setActiveMenuUserId(null);
                              }}
                              className="w-full px-3.5 py-2 text-left text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              {user.status === 'Suspended' ? 'Unblock User' : 'Block User'}
                            </button>

                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                            <button
                              onClick={() => {
                                setDeletingUser(user);
                                setActiveMenuUserId(null);
                              }}
                              className="w-full px-3.5 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete Account
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View User Modal */}
      {viewingUser && (
        <Modal
          isOpen={true}
          onClose={() => setViewingUser(null)}
          title="User Account Details"
          maxWidth="md"
        >
          <div className="space-y-4 text-center">
            <img
              src={viewingUser.avatar}
              alt={viewingUser.name}
              className="w-20 h-20 rounded-2xl mx-auto object-cover ring-4 ring-purple-500/20"
            />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {viewingUser.name}
              </h3>
              <p className="text-xs text-slate-500">{viewingUser.email}</p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold">{viewingUser.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-semibold capitalize">{viewingUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Status:</span>
                <span className="font-semibold text-emerald-600">{viewingUser.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered:</span>
                <span>{viewingUser.registeredDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tasks Completed:</span>
                <span className="font-bold">{viewingUser.completedTasks} of {viewingUser.totalTasks}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          title="Add New Workspace Member"
          maxWidth="md"
        >
          <form onSubmit={handleSaveAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs sm:text-sm focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="jordan@taskflow.io"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs sm:text-sm focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Role
                </label>
                <div className="relative">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm appearance-none cursor-pointer"
                  >
                    <option value="user">Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700"
              >
                Create Account
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title="Edit Member Details"
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Role
                </label>
                <div className="relative">
                  <select
                    value={editRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm appearance-none cursor-pointer"
                  >
                    <option value="user">Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Status
              </label>
              <div className="relative">
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserAccountStatus)}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm appearance-none cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700"
              >
                Save Updates
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
          title="Delete User Account?"
          message={`Are you sure you want to permanently delete ${deletingUser.name}'s account? All permissions will be revoked immediately.`}
          confirmLabel="Delete User"
        />
      )}
    </div>
  );
};
