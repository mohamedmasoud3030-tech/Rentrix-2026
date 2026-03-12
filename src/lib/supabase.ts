import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY;

const createMockSupabase = () => {
  const msg = 'Supabase env vars غير مضبوطة. يرجى ضبط VITE_APP_SUPABASE_URL و VITE_APP_SUPABASE_ANON_KEY.';
  const auth = {
    getSession: async () => ({ data: { session: null }, error: new Error(msg) }),
    onAuthStateChange: (cb: any) => {
      // fire once with null session to keep UI logic flowing
      cb('INITIAL', null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signOut: async () => ({ error: new Error(msg) }),
    signInWithPassword: async () => ({ data: { session: null }, error: new Error(msg) }),
    signInWithOAuth: async () => ({ data: { session: null }, error: new Error(msg) }),
  } as any;

  const tableApi = {
    select: async () => ({ data: [], error: new Error(msg) }),
    insert: async () => ({ data: null, error: new Error(msg) }),
    upsert: async () => ({ data: null, error: new Error(msg) }),
    delete: () => ({ not: () => ({ data: null, error: new Error(msg) }) }),
  };

  const from = () => tableApi;

  return { auth, from } as any;
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabase();

if (!supabaseUrl || !supabaseAnonKey) {
  // نبلّغ في وحدة التحكم بدون إيقاف التطبيق كلياً
  console.error('Supabase env vars غير مضبوطة. سيعمل التطبيق بدون اتصال حتى يتم ضبط المفاتيح.');
}
