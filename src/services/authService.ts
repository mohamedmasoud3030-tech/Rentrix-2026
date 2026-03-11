import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { supabase } from './db';
import { User } from '../types';

const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY;

const createIsolatedAuthClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `rentrix-user-create-${Date.now()}`,
    },
  });

export const authService = {
  login: async (username: string, password: string): Promise<{ ok: boolean; msg: string; user?: User }> => {
    const email = username.includes('@') ? username : `${username}@rentrix.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return { ok: false, msg: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    const { data: userData } = await supabase.from('users').select('*').eq('id', data.user.id).single();
    sessionStorage.setItem('currentUserId', data.user.id);

    return {
      ok: true,
      msg: 'تم تسجيل الدخول',
      user: userData
        ? {
            id: userData.id,
            username: userData.username,
            role: userData.role,
            mustChange: userData.must_change,
            createdAt: userData.created_at,
          }
        : undefined,
    };
  },

  logout: async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('currentUserId');
    window.location.reload();
  },

  getCurrentUserId: (): string | null => sessionStorage.getItem('currentUserId'),

  changePassword: async (userId: string, newPass: string): Promise<{ ok: boolean; msg?: string }> => {
    const currentUserId = sessionStorage.getItem('currentUserId');
    if (userId !== currentUserId) {
      toast.error('تغيير كلمة مرور مستخدم آخر يتطلب مساراً إدارياً منفصلاً.');
      return { ok: false, msg: 'غير مدعوم من هذه الجلسة' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      toast.error('فشل تغيير كلمة المرور');
      return { ok: false, msg: error.message };
    }

    await supabase.from('users').update({ must_change: false }).eq('id', userId);
    return { ok: true };
  },

  addUser: async (user: Omit<User, 'id' | 'createdAt' | 'salt' | 'hash'>, pass: string): Promise<{ ok: boolean; msg: string; newUser?: User }> => {
    const email = user.username.includes('@') ? user.username : `${user.username}@rentrix.local`;
    const isolatedClient = createIsolatedAuthClient();

    const { data, error } = await isolatedClient.auth.signUp({
      email,
      password: pass,
    });

    if (error || !data.user) {
      return { ok: false, msg: error?.message || 'تعذر إنشاء المستخدم.' };
    }

    const profilePayload = {
      username: user.username,
      role: user.role,
      must_change: user.mustChange,
      created_at: Date.now(),
    };

    const { error: profileError } = await supabase.from('users').update(profilePayload).eq('id', data.user.id);
    if (profileError) {
      return { ok: false, msg: profileError.message };
    }

    return {
      ok: true,
      msg: 'تم إنشاء المستخدم',
      newUser: {
        id: data.user.id,
        username: user.username,
        role: user.role as any,
        mustChange: user.mustChange,
        createdAt: Date.now(),
      } as User,
    };
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<void> => {
    const payload: any = { ...updates };
    if (updates.mustChange !== undefined) {
      payload.must_change = updates.mustChange;
      delete payload.mustChange;
    }
    await supabase.from('users').update(payload).eq('id', id);
  },

  forcePasswordReset: async (userId: string): Promise<{ ok: boolean }> => {
    if (window.confirm('هل أنت متأكد من رغبتك في فرض إعادة تعيين كلمة المرور لهذا المستخدم؟')) {
      await supabase.from('users').update({ must_change: true }).eq('id', userId);
      toast.success('تم فرض إعادة تعيين كلمة المرور بنجاح.');
      return { ok: true };
    }
    return { ok: false };
  },
};
