import { createClient } from '@supabase/supabase-js';

// Sanitize inputs by stripping extra quotes or whitespace
const getStoredConfig = () => {
  let url = import.meta.env.VITE_SUPABASE_URL || '';
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('commuaria_custom_supabase_url');
    const customKey = localStorage.getItem('commuaria_custom_supabase_anon_key');
    if (customUrl) url = customUrl;
    if (customKey) key = customKey;
  }

  const cleanUrl = url.replace(/^['"]|['"]$/g, '').trim();
  const cleanKey = key.replace(/^['"]|['"]$/g, '').trim();

  return { url: cleanUrl, key: cleanKey };
};

const initialConfig = getStoredConfig();
const supabaseUrl = initialConfig.url;
const supabaseAnonKey = initialConfig.key;

export function getSupabaseConfig() {
  return getStoredConfig();
}

export function setCustomSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem('commuaria_custom_supabase_url', url.trim());
    } else {
      localStorage.removeItem('commuaria_custom_supabase_url');
    }
    if (key) {
      localStorage.setItem('commuaria_custom_supabase_anon_key', key.trim());
    } else {
      localStorage.removeItem('commuaria_custom_supabase_anon_key');
    }
  }
}

function createMockSupabaseClient(): any {
  // Ensure we have reports, and news initialized in localStorage
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem('commuaria_users')) {
      localStorage.setItem('commuaria_users', JSON.stringify([]));
    }
    if (!localStorage.getItem('commuaria_profiles')) {
      localStorage.setItem('commuaria_profiles', JSON.stringify([]));
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
          category: "Pavimentação",
          address: "Rua Ceará, Iguaçu, Araucária - PR",
          latitude: -25.5901,
          longitude: -49.4851,
          status: "in_progress",
          status_notes: "Equipe técnica vistoriou o local. Recapeamento asfáltico programado.",
          image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800",
          anonymous: false,
          user_id: "u1",
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "mock-r2",
          title: "Poste sem Iluminação Pública",
          description: "Lâmpada queimada há mais de uma semana em frente ao número 340.",
          category: "Iluminação Pública",
          address: "Avenida Victor do Amaral, Centro, Araucária - PR",
          latitude: -25.5925,
          longitude: -49.4812,
          status: "unresolved",
          status_notes: null,
          image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800",
          anonymous: true,
          user_id: "u2",
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "mock-r3",
          title: "Vazamento de Água Limpa",
          description: "Vazamento contínuo correndo pela calçada perto do parque municipal.",
          category: "Saneamento",
          address: "Rua Ceará, Iguaçu, Araucária - PR",
          latitude: -25.5885,
          longitude: -49.4891,
          status: "resolved",
          status_notes: "Válvula e tubulação reparadas com sucesso pela equipe de saneamento.",
          image_url: "https://images.unsplash.com/photo-1517436073-3b12361ac952?q=80&w=800",
          anonymous: false,
          user_id: "u1",
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "mock-r4",
          title: "Galhos Caídos Bloqueando Calçada",
          description: "Galhos grandes caíram após temporal e estão bloqueando a passagem de pedestres e cadeirantes.",
          category: "Arborização",
          address: "Rua Presidente Costa e Silva, Araucária - PR",
          latitude: -25.5940,
          longitude: -49.4830,
          status: "in_analysis",
          status_notes: "Equipe de arborização e poda notificada para desobstrução da via.",
          image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=800",
          anonymous: false,
          user_id: "u1",
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "mock-r5",
          title: "Entulho e Descarte Irregular em Terreno",
          description: "Acúmulo de móveis velhos e entulho na esquina, atraindo insetos e obstruindo o passeio público.",
          category: "Limpeza Urbana",
          address: "Rua Minas Gerais, Araucária - PR",
          latitude: -25.5870,
          longitude: -49.4880,
          status: "unresolved",
          status_notes: null,
          image_url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=800",
          anonymous: false,
          user_id: "u1",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
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
    private neqFilters: Array<{ field: string; value: any }> = [];
    private inFilters: Array<{ field: string; values: any[] }> = [];
    private orderField: string | null = null;
    private isAscending = false;
    private isSingle = false;
    private isMaybeSingle = false;
    private limitCount: number | null = null;
    private action: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
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

    upsert(values: any) {
      this.action = 'upsert';
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

    neq(field: string, value: any) {
      this.neqFilters.push({ field, value });
      return this;
    }

    in(field: string, values: any[]) {
      this.inFilters.push({ field, values });
      return this;
    }

    order(field: string, options?: { ascending?: boolean }) {
      this.orderField = field;
      this.isAscending = !!options?.ascending;
      return this;
    }

    limit(count: number) {
      this.limitCount = count;
      return this;
    }

    range(from: number, to: number) {
      this.limitCount = to - from + 1;
      return this;
    }

    single() {
      this.isSingle = true;
      return this;
    }

    maybeSingle() {
      this.isMaybeSingle = true;
      return this;
    }

    private execute() {
      const key = 'commuaria_' + this.tableName;
      let data = JSON.parse(localStorage.getItem(key) || '[]');

      if (this.action === 'upsert') {
        const records = Array.isArray(this.payload) ? this.payload : [this.payload];
        records.forEach((rec: any) => {
          const idx = data.findIndex((item: any) => 
            (rec.id && item.id === rec.id) || 
            (rec.email && item.email && item.email.toLowerCase() === rec.email.toLowerCase()) ||
            (rec.order_number && item.order_number && item.order_number === rec.order_number)
          );
          if (idx >= 0) {
            data[idx] = { ...data[idx], ...rec };
          } else {
            data.unshift({
              id: rec.id || ('rec_' + Math.random().toString(36).substring(2, 11)),
              created_at: rec.created_at || new Date().toISOString(),
              ...rec
            });
          }
        });
        localStorage.setItem(key, JSON.stringify(data));
        return { data: records, error: null };
      }

      if (this.action === 'insert') {
        const records = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = records.map((rec: any) => ({
          id: rec.id || ('rec_' + Math.random().toString(36).substring(2, 11)),
          created_at: rec.created_at || new Date().toISOString(),
          ...rec
        }));
        // Avoid duplicate IDs if already present
        inserted.forEach((item: any) => {
          const existingIdx = data.findIndex((d: any) => d.id === item.id);
          if (existingIdx >= 0) {
            data[existingIdx] = { ...data[existingIdx], ...item };
          } else {
            data.unshift(item);
          }
        });
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
      this.neqFilters.forEach(f => {
        result = result.filter((r: any) => r[f.field] !== f.value);
      });
      this.inFilters.forEach(f => {
        result = result.filter((r: any) => Array.isArray(f.values) && f.values.includes(r[f.field]));
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

      if (this.limitCount !== null && this.limitCount > 0) {
        result = result.slice(0, this.limitCount);
      }

      if (this.isMaybeSingle) {
        return { data: result.length > 0 ? result[0] : null, error: null };
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
          role: options?.data?.role || 'user',
          assigned_category: options?.data?.assigned_category || null,
          is_admin: options?.data?.role === 'admin' || false
        };
        users.push(newUser);
        localStorage.setItem('commuaria_users', JSON.stringify(users));

        const profiles = JSON.parse(localStorage.getItem('commuaria_profiles') || '[]');
        profiles.push({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          assigned_category: newUser.assigned_category,
          is_admin: newUser.is_admin,
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

const isRefreshTokenError = (error: any): boolean => {
  if (!error) return false;
  let msg = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (typeof error === 'object') {
    msg = `${error.message || ''} ${error.error_description || ''} ${error.name || ''} ${error.error || ''}`;
  }
  const str = msg.toLowerCase();
  return (
    str.includes('refresh token') ||
    str.includes('refresh_token') ||
    str.includes('invalid_grant') ||
    str.includes('token not found') ||
    str.includes('already used')
  );
};

// Global interceptors to prevent uncaught refresh token rejection crashes & console error noise
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const hasRefreshErr = args.some((arg) => isRefreshTokenError(arg));
    if (hasRefreshErr) {
      console.warn('Stale Supabase session detected. Cleaned local tokens.');
      clearSupabaseStorageTokens();
      return;
    }
    originalConsoleError(...args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    if (isRefreshTokenError(reason)) {
      console.warn('Stale Supabase refresh token intercepted. Clearing local credentials.');
      clearSupabaseStorageTokens();
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || event?.error;
    if (isRefreshTokenError(msg)) {
      console.warn('Stale Supabase refresh token intercepted in error listener. Clearing local credentials.');
      clearSupabaseStorageTokens();
      event.preventDefault();
      event.stopPropagation();
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
        storage: {
          getItem: (key: string) => {
            try {
              if (typeof window === 'undefined') return null;
              const val = window.localStorage.getItem(key);
              if (!val) return null;
              try {
                const parsed = JSON.parse(val);
                // If the token is empty or invalid
                if (parsed && typeof parsed === 'object' && !parsed.access_token && !parsed.refresh_token) {
                  window.localStorage.removeItem(key);
                  return null;
                }
              } catch (_) {
                window.localStorage.removeItem(key);
                return null;
              }
              return val;
            } catch (_) {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
              }
            } catch (_) {}
          },
          removeItem: (key: string) => {
            try {
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
              }
            } catch (_) {}
          },
        },
      },
    });

    // Wrap getSession to catch and sanitize invalid refresh tokens gracefully
    const originalGetSession = realClient.auth.getSession.bind(realClient.auth);
    realClient.auth.getSession = async () => {
      try {
        const res = await originalGetSession();
        if (res.error && isRefreshTokenError(res.error)) {
          clearSupabaseStorageTokens();
          try {
            await realClient.auth.signOut({ scope: 'local' });
          } catch (_) {}
          return { data: { session: null }, error: null };
        }
        return res;
      } catch (err: any) {
        if (isRefreshTokenError(err)) {
          clearSupabaseStorageTokens();
          try {
            await realClient.auth.signOut({ scope: 'local' });
          } catch (_) {}
          return { data: { session: null }, error: null };
        }
        return { data: { session: null }, error: err };
      }
    };

    // Wrap refreshSession
    const originalRefreshSession = realClient.auth.refreshSession.bind(realClient.auth);
    realClient.auth.refreshSession = async (currentSession?: any) => {
      try {
        const res = await originalRefreshSession(currentSession);
        if (res.error && isRefreshTokenError(res.error)) {
          clearSupabaseStorageTokens();
          try {
            await realClient.auth.signOut({ scope: 'local' });
          } catch (_) {}
          return { data: { session: null, user: null }, error: null };
        }
        return res;
      } catch (err: any) {
        if (isRefreshTokenError(err)) {
          clearSupabaseStorageTokens();
          try {
            await realClient.auth.signOut({ scope: 'local' });
          } catch (_) {}
          return { data: { session: null, user: null }, error: null };
        }
        return { data: { session: null, user: null }, error: err };
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

export async function syncAllDataToSupabase(): Promise<{
  success: boolean;
  message: string;
  reportsSynced: number;
  workOrdersSynced: number;
  newsSynced: number;
  profilesSynced: number;
}> {
  if (!isRealSupabase || !supabase) {
    return {
      success: false,
      message: "Supabase não está configurado com credenciais válidas.",
      reportsSynced: 0,
      workOrdersSynced: 0,
      newsSynced: 0,
      profilesSynced: 0,
    };
  }

  let reportsCount = 0;
  let workOrdersCount = 0;
  let newsCount = 0;
  let profilesCount = 0;
  const errors: string[] = [];

  // 1. Sync Profiles
  try {
    const rawProfiles = JSON.parse(localStorage.getItem('commuaria_profiles') || '[]');
    if (Array.isArray(rawProfiles) && rawProfiles.length > 0) {
      for (const p of rawProfiles) {
        const payload = {
          id: p.id,
          name: p.name || 'Usuário',
          email: p.email || '',
          role: p.role || 'user',
          assigned_category: p.assigned_category || null,
          is_admin: !!p.is_admin,
          created_at: p.created_at || new Date().toISOString(),
        };
        const { error } = await supabase.from('profiles').upsert([payload]);
        if (!error) profilesCount++;
        else console.warn("Erro ao sincronizar perfil:", error);
      }
    }
  } catch (e: any) {
    errors.push(`Perfis: ${e.message}`);
  }

  // 2. Sync Reports
  try {
    const rawReports = JSON.parse(localStorage.getItem('commuaria_reports') || '[]');
    if (Array.isArray(rawReports) && rawReports.length > 0) {
      for (const r of rawReports) {
        const payload = {
          id: r.id,
          title: r.title || 'Ocorrência',
          description: r.description || '',
          category: r.category || 'Pavimentação',
          address: r.address || 'Araucária - PR',
          latitude: typeof r.latitude === 'number' ? r.latitude : -25.5901,
          longitude: typeof r.longitude === 'number' ? r.longitude : -49.4851,
          status: r.status || 'unresolved',
          status_notes: r.status_notes || null,
          image_url: r.image_url || null,
          anonymous: !!r.anonymous,
          user_id: r.user_id || null,
          user_email: r.user_email || null,
          user_name: r.user_name || null,
          is_work_order: !!r.is_work_order,
          work_order_number: r.work_order_number || null,
          assigned_team: r.assigned_team || null,
          priority: r.priority || 'medium',
          deadline: r.deadline || null,
          created_at: r.created_at || new Date().toISOString(),
        };
        const { error } = await supabase.from('reports').upsert([payload]);
        if (!error) reportsCount++;
        else {
          console.warn("Erro ao sincronizar report:", error);
          errors.push(`Chamados: ${error.message}`);
        }
      }
    }
  } catch (e: any) {
    errors.push(`Chamados: ${e.message}`);
  }

  // 3. Sync Work Orders
  try {
    const rawOrders = JSON.parse(localStorage.getItem('commuaria_work_orders') || '[]');
    if (Array.isArray(rawOrders) && rawOrders.length > 0) {
      for (const o of rawOrders) {
        const payload = {
          id: o.id,
          order_number: o.order_number || `OS-${Math.floor(1000 + Math.random() * 9000)}`,
          title: o.title || 'Ordem de Serviço',
          category: o.category || 'Pavimentação',
          address: o.address || 'Araucária - PR',
          priority: o.priority || 'medium',
          deadline: o.deadline || null,
          assigned_team: o.assigned_team || 'Equipe Operacional',
          maintenance_type: o.maintenance_type || 'Manutenção Corretiva',
          description: o.description || '',
          technical_instructions: o.technical_instructions || '',
          status: o.status || 'dispatched',
          status_notes: o.status_notes || null,
          supervisor_name: o.supervisor_name || 'Supervisor',
          supervisor_email: o.supervisor_email || '',
          linked_report_id: o.linked_report_id || null,
          created_at: o.created_at || new Date().toISOString(),
          completed_at: o.completed_at || null,
        };
        const { error } = await supabase.from('work_orders').upsert([payload]);
        if (!error) workOrdersCount++;
        else {
          console.warn("Erro ao sincronizar work order:", error);
          errors.push(`O.S.: ${error.message}`);
        }
      }
    }
  } catch (e: any) {
    errors.push(`O.S.: ${e.message}`);
  }

  // 4. Sync News
  try {
    const rawNews = JSON.parse(localStorage.getItem('commuaria_news') || '[]');
    if (Array.isArray(rawNews) && rawNews.length > 0) {
      for (const n of rawNews) {
        const payload = {
          id: n.id,
          title: n.title,
          description: n.description,
          category: n.category || 'Comunidade',
          created_at: n.created_at || new Date().toISOString(),
        };
        const { error } = await supabase.from('news').upsert([payload]);
        if (!error) newsCount++;
        else console.warn("Erro ao sincronizar news:", error);
      }
    }
  } catch (e: any) {
    errors.push(`Notícias: ${e.message}`);
  }

  const hasAnySuccess = reportsCount > 0 || workOrdersCount > 0 || newsCount > 0 || profilesCount > 0;
  const uniqueErrors = Array.from(new Set(errors));

  return {
    success: hasAnySuccess || errors.length === 0,
    message: hasAnySuccess
      ? `Sincronização concluída! ${reportsCount} chamados, ${workOrdersCount} O.S. e ${newsCount} notícias atualizados no Supabase.`
      : uniqueErrors.length > 0
      ? `Falha na sincronização: ${uniqueErrors.join('; ')}`
      : "Nenhum dado pendente para sincronizar.",
    reportsSynced: reportsCount,
    workOrdersSynced: workOrdersCount,
    newsSynced: newsCount,
    profilesSynced: profilesCount,
  };
}
