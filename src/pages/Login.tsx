import React, { useState } from 'react';
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
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.08),_transparent_20%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/88 shadow-[0_36px_80px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/88 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden border-l border-slate-200/80 bg-[linear-gradient(135deg,#e7f0fb_0%,#f7fafc_45%,#ffffff_100%)] p-10 dark:border-slate-800 dark:bg-[linear-gradient(135deg,#193148_0%,#20384f_48%,#223d57_100%)] lg:block">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-sky-400 via-blue-500 to-cyan-500 text-white shadow-brand">
            <ShieldCheck size={24} />
          </div>
          <h1 className="mt-8 text-3xl font-black tracking-tight text-slate-900 dark:text-white">رينتريكس ERP</h1>
          <p className="mt-3 max-w-md text-sm leading-8 text-slate-600 dark:text-slate-300">
            منصة تشغيل عقاري ومحاسبي موحدة لإدارة العقارات والوحدات والعقود والتحصيلات والصيانة ضمن تجربة عمل مؤسسية واضحة.
          </p>

          <div className="mt-10 space-y-4">
            {[
              'إدارة العقارات والوحدات من مساحة عمل موحدة',
              'تحصيل وفوترة ومتابعة المتأخرات ضمن تدفق واحد',
              'تقارير وتشغيل يومي بصياغة مؤسسية واضحة',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8 text-center lg:text-right">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-50 text-blue-600 shadow-brand dark:bg-blue-500/10 dark:text-blue-300 lg:mx-0">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white">تسجيل الدخول للنظام</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">أدخل بياناتك للوصول إلى لوحة التحكم وإدارة العمليات اليومية.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email-field" className="block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">البريد الإلكتروني</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email-field"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/90 py-3 pr-11 pl-4 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
                  placeholder="أدخل البريد الإلكتروني"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password-field" className="block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password-field"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/90 py-3 pr-11 pl-4 text-sm text-slate-800 shadow-sm transition-all duration-150 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin dark:border-slate-300/40 dark:border-t-slate-900" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  تسجيل الدخول الآمن
                  <ArrowLeft className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200/80 pt-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <p>جميع العمليات محفوظة ومؤمنة داخل نظام رينتريكس</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
