import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  User,
  KeyRound,
  Lock,
  Unlock,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  X,
  Mail,
  Building
} from 'lucide-react';
import { ManagedUserItem, CreateUserPayload, UpdateUserPayload } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ActionConfirmModal } from '../components/common/ActionConfirmModal';

interface AdminUserManagementPageProps {
  onBackToWorkspace: () => void;
}

export const AdminUserManagementPage: React.FC<AdminUserManagementPageProps> = ({
  onBackToWorkspace,
}) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUserItem | null>(null);

  // Form State Cấp mới
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    username: '',
    password: '',
    fullName: '',
    role: 'USER',
    department: 'Văn phòng Ủy ban',
    email: '',
  });

  // Form State Sửa
  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    fullName: '',
    role: 'USER',
    department: '',
    email: '',
    isActive: true,
  });

  // Form State Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirm Toggle Status Modal
  const [toggleStatusUser, setToggleStatusUser] = useState<ManagedUserItem | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (term: string = '') => {
    try {
      setLoading(true);
      const data = await api.getUsers(term);
      setUsers(data);
    } catch (err) {
      console.error(err);
      setNotification('Không thể tải danh sách tài khoản cán bộ.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(search);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.createUser(createForm);
      setNotification(res.message);
      setIsCreateModalOpen(false);
      setCreateForm({
        username: '',
        password: '',
        fullName: '',
        role: 'USER',
        department: 'Văn phòng Ủy ban',
        email: '',
      });
      await loadUsers(search);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể cấp tài khoản cán bộ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (u: ManagedUserItem) => {
    setSelectedUser(u);
    setEditForm({
      fullName: u.fullName,
      role: u.role,
      department: u.department,
      email: u.email || '',
      isActive: u.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const res = await api.updateUser(selectedUser.id, editForm);
      setNotification(res.message);
      setIsEditModalOpen(false);
      setSelectedUser(null);
      await loadUsers(search);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể cập nhật thông tin cán bộ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassOpen = (u: ManagedUserItem) => {
    setSelectedUser(u);
    setNewPassword('');
    setIsResetPassModalOpen(true);
  };

  const handleResetPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const res = await api.resetUserPassword(selectedUser.id, newPassword);
      setNotification(res.message);
      setIsResetPassModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (!toggleStatusUser) return;
    const target = toggleStatusUser;
    setToggleStatusUser(null);

    try {
      const res = await api.toggleUserStatus(target.id);
      setNotification(res.message);
      await loadUsers(search);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản.');
    }
  };

  return (
    <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Top Banner Tiêu đề & Nút Thao tác */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gov-primary-light/60 flex items-center justify-center text-gov-primary">
            <Users className="w-5 h-5 text-gov-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-gov-text">
                Quản Trị Tài Khoản Cán Bộ & Phân Quyền
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gov-danger-bg text-gov-danger font-black border border-gov-danger-border">
                Chỉ dành cho Lãnh đạo
              </span>
            </div>
            <p className="text-xs text-gov-text-secondary mt-0.5">
              Cấp tài khoản chuyên viên hoặc quản lý trưởng phòng, khóa/kích hoạt và quản lý định danh công vụ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 sm:w-72">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-gov-text-disabled absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm cán bộ theo tên, mã, phòng ban..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
          </form>

          {/* Button Cấp tài khoản mới */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gov-primary hover:bg-gov-primary-dark text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4 text-gov-gold" />
            <span>Cấp tài khoản cán bộ</span>
          </button>
        </div>
      </div>

      {/* Thông báo Notification */}
      {notification && (
        <div className="bg-gov-active-bg border border-gov-active-border text-gov-active text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Table Users */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gov-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gov-primary" />
            <p className="text-xs font-semibold">Đang tải danh sách cán bộ công quyền...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-gov-text-secondary">
            <Users className="w-12 h-12 mx-auto mb-3 text-gov-text-disabled/50" />
            <h4 className="text-sm font-bold text-gov-text">Không tìm thấy tài khoản cán bộ nào</h4>
            <p className="text-xs text-gov-text-secondary mt-1">
              Bấm vào nút "Cấp tài khoản cán bộ" để thêm tài khoản mới vào hệ thống.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gov-subtle text-gov-text font-bold uppercase text-[11px] border-b border-gov-border">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[220px]">Cán bộ & Tài khoản</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">Vai trò công vụ</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[160px]">Phòng ban / Đơn vị</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">Email liên hệ</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[130px] text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[120px]">Ngày khởi tạo</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap min-w-[140px]">Thao tác quản trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border">
                {users.map((u) => {
                  const isCurrent = currentUser?.username === u.username;
                  return (
                    <tr key={u.id} className="hover:bg-gov-bg/60 transition-colors">
                      {/* Cán bộ & Tài khoản */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gov-subtle flex items-center justify-center font-bold text-xs text-gov-primary border border-gov-border flex-shrink-0">
                            {u.role === 'ADMIN' ? (
                              <Shield className="w-4 h-4 text-gov-primary" />
                            ) : (
                              <User className="w-4 h-4 text-gov-text-secondary" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gov-text flex items-center gap-1.5 flex-wrap">
                              <span>{u.fullName}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gov-gold text-gov-text font-black whitespace-nowrap shadow-sm">
                                  Tôi
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gov-text-secondary">
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Vai trò */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                            u.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-950 border border-blue-300'
                              : 'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {u.role === 'ADMIN' ? (
                            <>
                              <Shield className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                              <span>Trưởng phòng (ADMIN)</span>
                            </>
                          ) : (
                            <>
                              <User className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                              <span>Chuyên viên (USER)</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Phòng ban */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-gov-text">
                          <Building className="w-3.5 h-3.5 text-gov-text-disabled flex-shrink-0" />
                          <span>{u.department}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-gov-text-secondary">
                        {u.email ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gov-text-disabled flex-shrink-0" />
                            <span>{u.email}</span>
                          </div>
                        ) : (
                          <span className="text-gov-text-disabled italic">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-400'
                              : 'bg-red-100 text-red-950 border border-red-400'
                          }`}
                        >
                          {u.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>

                      {/* Ngày khởi tạo */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-700 text-xs font-medium">
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sửa thông tin */}
                          <button
                            type="button"
                            onClick={() => handleEditOpen(u)}
                            className="p-1.5 rounded-lg border border-gov-border bg-white hover:bg-gov-subtle text-gov-text hover:text-gov-primary transition-colors"
                            title="Sửa thông tin cán bộ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Đặt lại mật khẩu */}
                          <button
                            type="button"
                            onClick={() => handleResetPassOpen(u)}
                            className="p-1.5 rounded-lg border border-gov-border bg-white hover:bg-gov-subtle text-gov-gold hover:text-amber-700 transition-colors"
                            title="Đặt lại mật khẩu cho cán bộ"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Khóa / Mở khóa (Không cho khóa chính mình) */}
                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => setToggleStatusUser(u)}
                            className={`p-1.5 rounded-lg border border-gov-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                              u.isActive
                                ? 'bg-white hover:bg-gov-danger-bg text-gov-danger'
                                : 'bg-white hover:bg-gov-active-bg text-gov-active'
                            }`}
                            title={
                              isCurrent
                                ? 'Không thể khóa tài khoản của chính mình'
                                : u.isActive
                                ? 'Khóa tài khoản cán bộ'
                                : 'Mở khóa tài khoản cán bộ'
                            }
                          >
                            {u.isActive ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cấp mới tài khoản Cán bộ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gov-border overflow-hidden">
            <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-gov-gold" />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Cấp Mới Tài Khoản Cán Bộ Công Vụ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Tên đăng nhập công vụ / Mã định danh <span className="text-gov-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="Ví dụ: truongphong_kt, chuyenvien_vp"
                  className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Mật khẩu khởi tạo <span className="text-gov-danger">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Nhập mật khẩu khởi tạo (tối thiểu 6 ký tự)"
                  className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Họ và tên cán bộ <span className="text-gov-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gov-text mb-1">
                    Vai trò công vụ <span className="text-gov-danger">*</span>
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'USER' | 'ADMIN' })}
                    className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs bg-white"
                  >
                    <option value="USER">Chuyên viên (USER)</option>
                    <option value="ADMIN">Trưởng phòng / Quản lý (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gov-text mb-1">
                    Phòng ban / Đơn vị <span className="text-gov-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    placeholder="Ví dụ: Phòng Nội chính"
                    className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Email công vụ (Tùy chọn)
                </label>
                <input
                  type="email"
                  value={createForm.email || ''}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="canbo@ubnd.gov.vn"
                  className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                />
              </div>

              <div className="pt-3 border-t border-gov-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gov-border bg-white text-gov-text font-semibold hover:bg-gov-subtle"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gov-primary text-white font-bold hover:bg-gov-primary-dark disabled:opacity-50"
                >
                  {submitting ? 'Đang cấp...' : 'Xác nhận cấp tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa thông tin cán bộ */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gov-border overflow-hidden">
            <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-gov-gold" />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Cập Nhật Thông Tin: {selectedUser.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Tài khoản định danh
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.username}
                  className="w-full px-3 py-2 rounded-xl border border-gov-border bg-gray-100 text-gov-text-disabled text-xs cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Họ và tên cán bộ <span className="text-gov-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gov-text mb-1">
                    Vai trò công vụ <span className="text-gov-danger">*</span>
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'USER' | 'ADMIN' })}
                    className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs bg-white"
                  >
                    <option value="USER">Chuyên viên (USER)</option>
                    <option value="ADMIN">Trưởng phòng / Quản lý (ADMIN)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gov-text mb-1">
                    Phòng ban / Đơn vị <span className="text-gov-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Email công vụ
                </label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="canbo@ubnd.gov.vn"
                  className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-gov-primary rounded"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-bold text-gov-text cursor-pointer">
                  Tài khoản đang hoạt động (cho phép đăng nhập)
                </label>
              </div>

              <div className="pt-3 border-t border-gov-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gov-border bg-white text-gov-text font-semibold hover:bg-gov-subtle"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gov-primary text-white font-bold hover:bg-gov-primary-dark disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt lại Mật khẩu */}
      {isResetPassModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gov-border overflow-hidden">
            <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-gov-gold" />
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Đặt Lại Mật Khẩu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPassModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-gov-bg border border-gov-border">
                <div className="font-bold text-gov-text">{selectedUser.fullName}</div>
                <div className="text-[11px] text-gov-text-secondary mt-0.5">Tài khoản: @{selectedUser.username}</div>
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Mật khẩu mới <span className="text-gov-danger">*</span>
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  className="w-full px-3 py-2 rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                />
              </div>

              <div className="pt-3 border-t border-gov-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gov-border bg-white text-gov-text font-semibold hover:bg-gov-subtle"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gov-primary text-white font-bold hover:bg-gov-primary-dark disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Khóa/Mở khóa tài khoản */}
      <ActionConfirmModal
        isOpen={!!toggleStatusUser}
        onClose={() => setToggleStatusUser(null)}
        onConfirm={handleToggleStatusConfirm}
        title={toggleStatusUser?.isActive ? 'Xác nhận khóa tài khoản cán bộ' : 'Xác nhận mở khóa tài khoản cán bộ'}
        message={
          toggleStatusUser?.isActive
            ? `Đồng chí có chắc chắn muốn tạm khóa tài khoản của cán bộ ${toggleStatusUser?.fullName} (@${toggleStatusUser?.username}) không? Cán bộ sẽ không thể đăng nhập cho đến khi được mở khóa.`
            : `Đồng chí có chắc chắn muốn mở khóa cho tài khoản của cán bộ ${toggleStatusUser?.fullName} (@${toggleStatusUser?.username}) không?`
        }
        detail={`Đơn vị: ${toggleStatusUser?.department} • Vai trò: ${toggleStatusUser?.role}`}
        confirmText={toggleStatusUser?.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
        cancelText="Hủy bỏ"
        type={toggleStatusUser?.isActive ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default AdminUserManagementPage;
