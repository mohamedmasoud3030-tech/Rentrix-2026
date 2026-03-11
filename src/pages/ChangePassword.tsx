
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';

const ChangePassword: React.FC = () => {
// FIX: Destructure currentUser directly from useApp context.
  const { auth, currentUser } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    if (newPassword.length < 3) {
      setError('يجب أن تكون كلمة المرور ٣ أحرف على الأقل.');
      return;
    }
    // Simple check to prevent using the default password again
    if (newPassword === '123') {
      setError('لا يمكن استخدام كلمة المرور الافتراضية.');
      return;
    }

    setIsLoading(true);
    setError('');

// FIX: Use currentUser from context, not from auth object.
    if (currentUser) {
// FIX: Use currentUser from context, not from auth object.
      const result = await auth.changePassword(currentUser.id, newPassword);
      if (!result.ok) {
        setError('حدث خطأ أثناء تغيير كلمة المرور.');
        setIsLoading(false);
      }
      // On success, App.tsx will automatically re-render and navigate to the dashboard
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">تغيير كلمة المرور</h1>
          <p className="text-sm text-slate-600">
            لأسباب أمنية، يجب عليك تغيير كلمة المرور الافتراضية قبل المتابعة.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="newPassword">
              كلمة المرور الجديدة
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="أدخل كلمة المرور الجديدة"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2" htmlFor="confirmPassword">
              تأكيد كلمة المرور الجديدة
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="أعد إدخال كلمة المرور الجديدة"
              required
            />
          </div>
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium p-3 rounded-lg text-center">{error}</div>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'جاري الحفظ...' : 'حفظ وتأكيد'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;