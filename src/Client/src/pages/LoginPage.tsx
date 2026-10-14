import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, Loader2, CheckSquare, Square, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu công vụ.');
      return;
    }

    try {
      setLoading(true);
      await login(username.trim(), password, rememberMe);
      onLoginSuccess();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        'Tên đăng nhập hoặc mật khẩu công vụ không chính xác. Vui lòng kiểm tra lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative flex flex-col justify-between items-center p-4 sm:p-6 overflow-hidden bg-cover bg-center bg-no-repeat select-none"
      style={{ backgroundImage: `url('/images/background.webp')` }}
    >

      {/* Khối Đăng nhập Trung tâm */}
      <div className="w-full max-w-xl my-auto relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header Ribbon với Background Header và Quốc huy */}
          <div
            className="px-6 py-6 text-center text-white border-b-4 border-gov-gold relative bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `linear-gradient(rgba(186, 28, 29, 0.88), rgba(143, 18, 19, 0.94)), url('/images/background_header_xlvbhc.webp')`,
            }}
          >
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 rounded-full bg-white p-1.5 shadow-lg border-2 border-gov-gold/60 flex items-center justify-center">
                <img
                  src="/images/quochuy.svg"
                  className="w-full h-full object-contain"
                  alt="Quốc huy Việt Nam"
                />
              </div>
            </div>
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider leading-snug drop-shadow-sm">
              HỆ THỐNG HỖ TRỢ XỬ LÝ VĂN BẢN HÀNH CHÍNH
            </h1>
            <p className="text-[11px] text-white/90 mt-1 font-medium">
              Cổng Xác thực Cán bộ, Công chức & Thẩm định Văn bản
            </p>
          </div>

          {/* Form Đăng nhập Cán bộ */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            <div className="text-center pb-2 border-b border-gov-border">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gov-text">
                Đăng nhập tài khoản công vụ
              </h2>
              <p className="text-xs text-gov-text-secondary mt-0.5">
                Sử dụng tài khoản cán bộ được cấp để truy cập hệ thống
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-gov-danger-bg text-gov-danger border border-gov-danger-border text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gov-text mb-1.5">
                Tên đăng nhập công vụ <span className="text-gov-danger">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gov-text-disabled absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập hoặc mã cán bộ"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary focus:border-gov-primary bg-white text-gov-text transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gov-text mb-1.5">
                Mật khẩu xác thực <span className="text-gov-danger">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gov-text-disabled absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu công vụ"
                  className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary focus:border-gov-primary bg-white text-gov-text transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-gov-text-disabled hover:text-gov-text transition-colors"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox Ghi nhớ đăng nhập */}
            <div className="flex items-center justify-between pt-1">
              <label
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-2 cursor-pointer select-none text-xs text-gov-text font-medium"
              >
                {rememberMe ? (
                  <CheckSquare className="w-4 h-4 text-gov-primary" />
                ) : (
                  <Square className="w-4 h-4 text-gov-text-disabled" />
                )}
                <span>Ghi nhớ đăng nhập trên thiết bị này</span>
              </label>
            </div>

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gov-primary hover:bg-gov-primary-dark text-white text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực thông tin...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-gov-gold" />
                  <span>Đăng nhập hệ thống công vụ</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Card info */}
          <div className="px-6 py-3 bg-gov-subtle text-center text-[11px] text-gov-text-secondary border-t border-gov-border flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cổng thông tin được mã hóa bảo mật.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
