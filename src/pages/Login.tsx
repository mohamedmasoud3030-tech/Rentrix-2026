import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        navigate('/dashboard'); // Redirect to the dashboard after successful login
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-8 md:p-10">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">تسجيل الدخول للنظام</h1>
            <p className="text-sm text-slate-600">أدخل بياناتك للوصول للوحة التحكم</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email-field" className="block text-sm font-medium text-slate-700 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="email-field"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-10 pl-3 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="البريد الإلكتروني"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-field" className="block text-sm font-medium text-slate-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="password-field"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-3 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium p-3 rounded-lg flex items-center justify-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري التحقق...
                </>
              ) : (
                <>
                  تسجيل الدخول الآمن
                  <ArrowLeft className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
        <div className="text-center text-xs text-muted-foreground p-4 border-t border-border">
          <p dir="ltr">© 2024 Rentrix ERP | Masoud Apps</p>
        </div>
      </div>
    </div>
  );
};

export default Login;