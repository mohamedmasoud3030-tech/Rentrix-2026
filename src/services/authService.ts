import { createClient } from '@supabase/supabase-js';
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

const mapUser = (userData: any): User => ({
  id: userData.id,
  username: userData.username,
  role: userData.role,
  mustChange: userData.must_change,
  createdAt: userData.created_at,
});

export const authService = {
  login: async (username: string, password: string): Promise<User> => {
    const email = username.includes('@') ? username : `${username}@rentrix.local`;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }

    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !userData) {
      throw new Error('تم تسجيل الدخول لكن تعذر تحميل ملف المستخدم.');
    }

    sessionStorage.setItem('currentUserId', data.user.id);
    return mapUser(userData);
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message || 'تعذر تسجيل الخروج.');
    }

    sessionStorage.removeItem('currentUserId');
    window.location.reload();
  },

  getCurrentUserId: (): string | null => sessionStorage.getItem('currentUserId'),

  changePassword: async (userId: string, newPass: string): Promise<void> => {
    const currentUserId = sessionStorage.getItem('currentUserId');

    if (userId !== currentUserId) {
      throw new Error('تغيير كلمة مرور مستخدم آخر يتطلب مسارًا إداريًا منفصلًا.');
    }

    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      throw new Error(error.message || 'فشل تغيير كلمة المرور.');
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ must_change: false })
      .eq('id', userId);

    if (updateError) {
      throw new Error(updateError.message || 'تم تغيير كلمة المرور لكن تعذر تحديث حالة الإلزام.');
    }
  },

  addUser: async (
    user: Omit<User, 'id' | 'createdAt' | 'salt' | 'hash'>,
    pass: string
  ): Promise<User> => {
    const email = user.username.includes('@') ? user.username : `${user.username}@rentrix.local`;
    const isolatedClient = createIsolatedAuthClient();

    const { data, error } = await isolatedClient.auth.signUp({
      email,
      password: pass,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'تعذر إنشاء المستخدم.');
    }

    const profilePayload = {
      username: user.username,
      role: user.role,
      must_change: user.mustChange,
      created_at: Date.now(),
    };

    const { error: profileError } = await supabase
      .from('users')
      .update(profilePayload)
      .eq('id', data.user.id);

    if (profileError) {
      throw new Error(profileError.message || 'تم إنشاء المستخدم في المصادقة لكن تعذر حفظ ملفه.');
    }

    return {
      id: data.user.id,
      username: user.username,
      role: user.role as any,
      mustChange: user.mustChange,
      createdAt: Date.now(),
    } as User;
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<void> => {
    const payload: any = { ...updates };

    if (updates.mustChange !== undefined) {
      payload.must_change = updates.mustChange;
      delete payload.mustChange;
    }

    const { error } = await supabase.from('users').update(payload).eq('id', id);

    if (error) {
      throw new Error(error.message || 'تعذر تحديث المستخدم.');
    }
  },

  forcePasswordReset: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ must_change: true })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message || 'تعذر فرض إعادة تعيين كلمة المرور.');
    }
  },
};