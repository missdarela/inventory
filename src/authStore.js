import { defineStore } from 'pinia';
import { supabase } from './supabase';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    userProfile: null,
    loading: false,
    error: null,
  }),
  actions: {
    async signUp({ email, password, ...profile }) {
      this.loading = true;
      this.error = null;
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase.from('users').insert([
            {
              id: data.user.id,
              email,
              firstname,
              lastname,
              username,
              // ...any other fields you want
            }
          ]);
          if (profileError) throw profileError;
        }
        this.user = data.user;
        return data.user;
      } catch (err) {
        this.error = err.message || 'Sign up failed';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async fetchUserProfile() {
      if (!this.user) return;
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', this.user.id)
      if (!error) {
        this.userProfile = data;
      }
    },
    async login({ email, password }) {
      this.loading = true;
      this.error = null;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        this.user = data.user;
        await this.fetchUserProfile();
        return data.user;
      } catch (err) {
        this.error = err.message || 'Login failed';
        throw err;
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      await supabase.auth.signOut();
      this.user = null;
    },
    setUser(user) {
      this.user = user;
    }
  },
}); 