import { createClient } from '@supabase/supabase-js';

// Sanitize inputs by stripping extra quotes or whitespace
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl.replace(/^['"]|['"]$/g, '').trim();
const supabaseAnonKey = rawKey.replace(/^['"]|['"]$/g, '').trim();

function createMockSupabaseClient(): any {
  // Ensure we have profiles, users, reports, and news initialized in localStorage
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem('commuaria_users')) {
      localStorage.setItem('commuaria_users', JSON.stringify([
        { id: 'u1', email: 'cidadao@commuaria.com', password: '123456', name: 'Cidadão de Araucária', is_admin: false },
        { id: 'u2', email: 'admin@commuaria.com', password: 'admin123', name: 'Administrador Municipal', is_admin: true }
      ]));
    }
    if (!localStorage.getItem('commuaria_profiles')) {
      localStorage.setItem('commuaria_profiles', JSON.stringify([
        { id: 'u1', name: 'Cidadão de Araucária', email: 'cidadao@commuaria.com', is_admin: false, created_at: new Date().toISOString() },
        { id: 'u2', name: 'Administrador Municipal', email: 'admin@commuaria.com', is_admin: true, created_at: new Date().toISOString() }
      ]));
    }
    if (!localStorage.getItem('commuaria_news')) {
      localStorage.setItem('commuaria_news', JSON.stringify([
        {
          id: 'news-3',
          title: 'Mutirão de zeladoria melhora praças públicas no centro',
          description: 'Em ação cooperativa entre moradores voluntários e equipes públicas municipais, duas praças históricas receberam reparos nos bancos e nova pintura de calçadas.',
          category: 'Comunidade',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'news-2',
          title: 'Nova iluminação de LED chega ao bairro Costeira',
          description: 'A prefeitura iniciou a substituição de lâmpadas antigas por tecnologia LED na avenida principal do bairro Costeira, garantindo mais segurança e economia.',
          category: 'Serviços',
          created_at: new Date().toISOString()
        }
      ]));
    }
    if (!localStorage.getItem('commuaria_reports')) {
      localStorage.setItem('commuaria_reports', JSON.stringify([
        {
          id: "mock-r1",
          title: "Buraco Profundo na Via",
          description: "Buraco profundo na pista na Rua Ceará, oferecendo perigo aos motoristas e pedestres.",
          address: "Rua Ceará, Iguaçu, Araucária - PR",
          latitude: -25.5901,
          longitude: -49.4851,
          status: "unresolved",
          image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800",
          anonymous: false,
          user_id: "u1",
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "mock-r2",
          title: "Poste sem Iluminação Pública",
          description: "Lâmpada queimada há mais de uma semana em frente ao número 340.",
          address: "Avenida Victor do Amaral, Centro, Araucária - PR",
          latitude: -25.5925,
          longitude: -49.4812,
          status: "unresolved",
          image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800",
          anonymous: true,
          user_id: "u2",
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "mock-r3",
          title: "Vazamento de Água Limpa",
          description: "Vazamento contínuo correndo pela calçada perto do parque municipal.",
          address: "Rua Ceará, Iguaçu, Araucária - PR",
          latitude: -25.5885,
          longitude: -49.4891,
          status: "resolved",
          image_url: "https://images.unsplash.com/photo-1517436073-3b12361ac952?q=80&w=800",
          anonymous: false,
          user_id: "u1",
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]));
    }
  }

  // Active session helper
  let currentSessionUser: any = null;
  if (typeof window !== 'undefined') {
    const rawSession = localStorage.getItem('commuaria_session_user');
    if (rawSession) {
      try {
        currentSessionUser = JSON.parse(rawSession);
      } catch (_) {}
    }
  }

  const listeners: Array<any> = [];

  const updateSession = (user: any) => {
    currentSessionUser = user;
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('commuaria_session_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('commuaria_session_user');
      }
    }
    listeners.forEach(cb => cb('SIGNED_IN', user ? { user } : null));
  };

  // Generic chainable query builder for LocalStorage
  class MockQueryBuilder {
    private tableName: string;
    private filters: Array<{ field: string; value: any }> = [];
    private orderField: string | null = null;
    private isAscending = false;
    private isSingle = false;
    private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
    private payload: any = null;

    constructor(tableName: string) {
      this.tableName = tableName;
    }

    select(_fields?: string) {
      this.action = 'select';
      return this;
    }

    insert(values: any) {
      this.action = 'insert';
      this.payload = values;
      return this;
    }

    update(values: any) {
      this.action = 'update';
      this.payload = values;
      return this;
    }

    delete() {
      this.action = 'delete';
      return this;
    }

    eq(field: string, value: any) {
      this.filters.push({ field, value });
      return this;
    }

    order(field: string, options?: { ascending?: boolean }) {
      this.orderField = field;
      this.isAscending = !!options?.ascending;
      return this;
    }

    single() {
      this.isSingle = true;
      return this;
    }

    private execute() {
      const key = 'commuaria_' + this.tableName;
      let data = JSON.parse(localStorage.getItem(key) || '[]');

      if (this.action === 'insert') {
        const records = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = records.map((rec: any) => ({
          id: rec.id || ('rec_' + Math.random().toString(36).substring(2, 11)),
          created_at: rec.created_at || new Date().toISOString(),
          ...rec
        }));
        data = [...inserted, ...data];
        localStorage.setItem(key, JSON.stringify(data));
        return { data: inserted, error: null };
      }

      if (this.action === 'delete') {
        let remaining = [...data];
        this.filters.forEach(f => {
          remaining = remaining.filter((r: any) => r[f.field] !== f.value);
        });
        localStorage.setItem(key, JSON.stringify(remaining));
        return { data: null, error: null };
      }

      if (this.action === 'update') {
        data = data.map((r: any) => {
          const match = this.filters.every(f => r[f.field] === f.value);
          if (match) {
            return { ...r, ...this.payload };
          }
          return r;
        });
        localStorage.setItem(key, JSON.stringify(data));
        return { data: null, error: null };
      }

      // Action SELECT
      let result = [...data];
      this.filters.forEach(f => {
        result = result.filter((r: any) => r[f.field] === f.value);
      });

      if (this.orderField) {
        const field = this.orderField;
        const asc = this.isAscending;
        result.sort((a: any, b: any) => {
          const valA = a[field];
          const valB = b[field];
          if (valA > valB) return asc ? 1 : -1;
          if (valA < valB) return asc ? -1 : 1;
          return 0;
        });
      }

      if (this.isSingle) {
        if (result.length === 0) {
          return { data: null, error: { message: 'Registro não encontrado' } };
        }
        return { data: result[0], error: null };
      }

      return { data: result, error: null };
    }

    then(onfulfilled: any, onrejected?: any) {
      try {
        const res = this.execute();
        return Promise.resolve(onfulfilled(res));
      } catch (err) {
        if (onrejected) return Promise.resolve(onrejected(err));
        return Promise.reject(err);
      }
    }
  }

  return {
    auth: {
      async getSession() {
        return { data: { session: currentSessionUser ? { user: currentSessionUser } : null }, error: null };
      },
      async getUser() {
        return { data: { user: currentSessionUser }, error: null };
      },
      onAuthStateChange(callback: any) {
        listeners.push(callback);
        callback('INITIAL_SESSION', currentSessionUser ? { user: currentSessionUser } : null);
        return {
          data: {
            subscription: {
              unsubscribe() {
                const idx = listeners.indexOf(callback);
                if (idx !== -1) listeners.splice(idx, 1);
              }
            }
          }
        };
      },
      async signUp({ email, password, options }: any) {
        const users = JSON.parse(localStorage.getItem('commuaria_users') || '[]');
        if (users.some((u: any) => u.email === email)) {
          return { data: null, error: { message: 'Este e-mail já está cadastrado.' } };
        }
        const newUser = {
          id: 'u_' + Math.random().toString(36).substring(2, 11),
          email,
          password,
          name: options?.data?.name || 'Novo Usuário',
          is_admin: false
        };
        users.push(newUser);
        localStorage.setItem('commuaria_users', JSON.stringify(users));

        const profiles = JSON.parse(localStorage.getItem('commuaria_profiles') || '[]');
        profiles.push({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          is_admin: false,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('commuaria_profiles', JSON.stringify(profiles));

        updateSession(newUser);
        return { data: { user: newUser, session: { user: newUser } }, error: null };
      },
      async signInWithPassword({ email, password }: any) {
        const users = JSON.parse(localStorage.getItem('commuaria_users') || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);
        if (!user) {
          return { data: null, error: { message: 'E-mail ou senha incorretos.' } };
        }
        updateSession(user);
        return { data: { user }, error: null };
      },
      async resetPasswordForEmail(email: string) {
        const users = JSON.parse(localStorage.getItem('commuaria_users') || '[]');
        const exists = users.some((u: any) => u.email === email);
        if (!exists) {
          return { error: { message: 'Nenhuma conta encontrada com este e-mail.' } };
        }
        return { data: {}, error: null };
      },
      async verifyOtp({ token }: any) {
        if (token === '123456' || token?.length === 6) {
          return { data: { session: { user: currentSessionUser } }, error: null };
        }
        return { error: { message: 'Código de verificação inválido.' } };
      },
      async signOut() {
        updateSession(null);
        return { error: null };
      },
      async updateUser({ password, data }: any) {
        if (!currentSessionUser) return { error: { message: 'usuário não conectado' } };
        const users = JSON.parse(localStorage.getItem('commuaria_users') || '[]');
        const profiles = JSON.parse(localStorage.getItem('commuaria_profiles') || '[]');
        
        const uIdx = users.findIndex((u: any) => u.id === currentSessionUser.id);
        if (uIdx !== -1) {
          if (data?.name) users[uIdx].name = data.name;
          if (password) users[uIdx].password = password;
          localStorage.setItem('commuaria_users', JSON.stringify(users));
        }

        const pIdx = profiles.findIndex((p: any) => p.id === currentSessionUser.id);
        if (pIdx !== -1) {
          if (data?.name) profiles[pIdx].name = data.name;
          localStorage.setItem('commuaria_profiles', JSON.stringify(profiles));
        }

        const updated = { 
          ...currentSessionUser, 
          name: data?.name || currentSessionUser.name,
          password: password || currentSessionUser.password
        };
        updateSession(updated);
        return { data: { user: updated }, error: null };
      }
    },
    from(tableName: string) {
      return new MockQueryBuilder(tableName);
    },
    async rpc(name: string) {
      if (name === 'delete_user') {
        const user = currentSessionUser;
        if (user) {
          const users = JSON.parse(localStorage.getItem('commuaria_users') || '[]');
          const filteredUsers = users.filter((u: any) => u.id !== user.id);
          localStorage.setItem('commuaria_users', JSON.stringify(filteredUsers));

          const profiles = JSON.parse(localStorage.getItem('commuaria_profiles') || '[]');
          const filteredProfiles = profiles.filter((p: any) => p.id !== user.id);
          localStorage.setItem('commuaria_profiles', JSON.stringify(filteredProfiles));

          const reports = JSON.parse(localStorage.getItem('commuaria_reports') || '[]');
          const filteredReports = reports.filter((r: any) => r.user_id !== user.id);
          localStorage.setItem('commuaria_reports', JSON.stringify(filteredReports));
        }
        return { error: null };
      }
      return { error: { message: 'Função RPC desconhecida.' } };
    }
  };
}

export const isRealSupabase = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
  supabaseUrl.length > 10 &&
  supabaseUrl.startsWith('https://');

export function clearSupabaseStorageTokens() {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token') || key === 'supabase.auth.token')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('commuaria_session_user');
  } catch (_) {}
}

const isRefreshTokenError = (error: any) => {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error.message || error.error_description || error.name || '');
  const str = String(msg).toLowerCase();
  return (
    str.includes('refresh token') ||
    str.includes('refresh_token') ||
    str.includes('invalid_grant') ||
    str.includes('token not found') ||
    str.includes('already used')
  );
};

// Global interceptors to prevent uncaught refresh token rejection crashes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || reason?.error_description || '');
    if (isRefreshTokenError(msg)) {
      console.warn('Stale Supabase refresh token intercepted. Clearing local credentials.');
      clearSupabaseStorageTokens();
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (isRefreshTokenError(msg)) {
      console.warn('Stale Supabase refresh token intercepted in error listener. Clearing local credentials.');
      clearSupabaseStorageTokens();
      event.preventDefault();
    }
  });
}

function getSupabaseClient() {
  if (!isRealSupabase) {
    return createMockSupabaseClient();
  }
  try {
    const realClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    // Wrap getSession to catch and sanitize invalid refresh tokens gracefully
    const originalGetSession = realClient.auth.getSession.bind(realClient.auth);
    realClient.auth.getSession = async () => {
      try {
        const res = await originalGetSession();
        if (res.error && isRefreshTokenError(res.error)) {
          console.warn("Invalid refresh token encountered in getSession. Clearing stored auth state.", res.error);
          clearSupabaseStorageTokens();
          try {
            await realClient.auth.signOut({ scope: 'local' });
          } catch (_) {}
          return { data: { session: null }, error: null };
        }
        return res;
      } catch (err: any) {
        if (isRefreshTokenError(err)) {
          console.warn("Invalid refresh token thrown in getSession. Clearing stored auth state.", err);
          clearSupabaseStorageTokens();
          try {
            await realClient.auth.signOut({ scope: 'local' });
          } catch (_) {}
          return { data: { session: null }, error: null };
        }
        return { data: { session: null }, error: err };
      }
    };

    // Wrap getUser as well to catch invalid tokens
    const originalGetUser = realClient.auth.getUser.bind(realClient.auth);
    realClient.auth.getUser = async (jwt?: string) => {
      try {
        const res = await originalGetUser(jwt);
        if (res.error && isRefreshTokenError(res.error)) {
          clearSupabaseStorageTokens();
          return { data: { user: null }, error: null };
        }
        return res;
      } catch (err: any) {
        if (isRefreshTokenError(err)) {
          clearSupabaseStorageTokens();
          return { data: { user: null }, error: null };
        }
        return { data: { user: null }, error: err };
      }
    };

    return realClient;
  } catch (err) {
    console.warn("Falha ao inicializar o cliente do Supabase, usando banco de dados local fallback:", err);
    return createMockSupabaseClient();
  }
}

export const supabase = getSupabaseClient();
