import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function createMockSupabaseClient(): any {
  // Ensure we have profiles, users, and reports initialized in localStorage
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
        // Instant trigger on subscribe
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

        // Create profile
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
      async signOut() {
        updateSession(null);
        return { error: null };
      },
      async updateUser({ data }: any) {
        if (!currentSessionUser) return { error: { message: 'usuário não conectado' } };
        const users = JSON.parse(localStorage.getItem('commuaria_users') || '[]');
        const profiles = JSON.parse(localStorage.getItem('commuaria_profiles') || '[]');
        
        const uIdx = users.findIndex((u: any) => u.id === currentSessionUser.id);
        if (uIdx !== -1) {
          users[uIdx].name = data?.name || users[uIdx].name;
          localStorage.setItem('commuaria_users', JSON.stringify(users));
        }

        const pIdx = profiles.findIndex((p: any) => p.id === currentSessionUser.id);
        if (pIdx !== -1) {
          profiles[pIdx].name = data?.name || profiles[pIdx].name;
          localStorage.setItem('commuaria_profiles', JSON.stringify(profiles));
        }

        const updated = { ...currentSessionUser, name: data?.name || currentSessionUser.name };
        updateSession(updated);
        return { data: { user: updated }, error: null };
      }
    },
    from(tableName: string) {
      return {
        select(fields?: string) {
          const self = this;
          return {
            eq(field: string, value: any) {
              const innerSelf = this;
              return {
                single() {
                  const data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
                  const record = data.find((r: any) => r[field] === value);
                  if (!record) {
                    return { data: null, error: { message: 'Registro não encontrado' } };
                  }
                  return { data: record, error: null };
                },
                order(orderField: string, options?: { ascending: boolean }) {
                  let data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
                  data = data.filter((r: any) => r[field] === value);
                  if (orderField) {
                    data.sort((a: any, b: any) => {
                      const valA = a[orderField];
                      const valB = b[orderField];
                      const comp = valA > valB ? 1 : valA < valB ? -1 : 0;
                      return options?.ascending ? comp : -comp;
                    });
                  }
                  return Promise.resolve({ data, error: null });
                },
                async then(onfulfilled: any) {
                  let data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
                  data = data.filter((r: any) => r[field] === value);
                  return onfulfilled({ data, error: null });
                }
              };
            },
            order(orderField: string, options?: { ascending: boolean }) {
              let data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
              if (orderField) {
                data.sort((a: any, b: any) => {
                  const valA = a[orderField];
                  const valB = b[orderField];
                  const comp = valA > valB ? 1 : valA < valB ? -1 : 0;
                  return options?.ascending ? comp : -comp;
                });
              }
              return {
                async then(onfulfilled: any) {
                  return onfulfilled({ data, error: null });
                }
              };
            },
            async single() {
              const data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
              if (data.length === 0) return { data: null, error: { message: 'Registro não encontrado' } };
              return { data: data[0], error: null };
            },
            async then(onfulfilled: any) {
              const data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
              return onfulfilled({ data, error: null });
            }
          };
        },
        delete() {
          return {
            eq(field: string, value: any) {
              const data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
              const filtered = data.filter((r: any) => r[field] !== value);
              localStorage.setItem('commuaria_' + tableName, JSON.stringify(filtered));
              return Promise.resolve({ error: null });
            }
          };
        },
        update(values: any) {
          return {
            eq(field: string, value: any) {
              const data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
              const idx = data.findIndex((r: any) => r[field] === value);
              if (idx !== -1) {
                data[idx] = { ...data[idx], ...values };
                localStorage.setItem('commuaria_' + tableName, JSON.stringify(data));
              }
              return Promise.resolve({ error: null });
            }
          };
        },
        insert(values: any) {
          const data = JSON.parse(localStorage.getItem('commuaria_' + tableName) || '[]');
          const newRecord = {
            id: 'rec_' + Math.random().toString(36).substring(2, 11),
            created_at: new Date().toISOString(),
            ...values
          };
          data.unshift(newRecord);
          localStorage.setItem('commuaria_' + tableName, JSON.stringify(data));
          return Promise.resolve({ data: [newRecord], error: null });
        }
      };
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

const isRealSupabase = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' && 
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
  supabaseUrl.trim() !== '' &&
  supabaseUrl.startsWith('https://');

export const supabase = isRealSupabase 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabaseClient();
