import React, { useState } from 'react';
import { KeyRound, X, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    try {
      setLoading(true);
      const msg = await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess(msg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 !m-0 z-50 overflow-y-auto w-full h-full min-h-screen bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gov-border w-full max-w-md overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-gov-gold" />
            <h3 className="text-sm font-bold uppercase tracking-wide">
              Đổi mật khẩu tài khoản cán bộ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-gov-danger-bg text-gov-danger border border-gov-danger-border text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-gov-active-bg text-gov-active border border-gov-active-border text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gov-text mb-1">
              Mật khẩu hiện tại *
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu đang sử dụng"
              className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gov-text mb-1">
              Mật khẩu mới * (tối thiểu 6 ký tự)
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới an toàn"
              className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gov-text mb-1">
              Xác nhận mật khẩu mới *
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="text-xs text-gov-text-secondary hover:text-gov-text flex items-center gap-1"
            >
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPass ? 'Ẩn ký tự' : 'Hiển thị ký tự'}</span>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-gov-border text-gov-text hover:bg-gov-subtle transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Cập nhật mật khẩu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
