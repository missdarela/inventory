import { defineStore } from 'pinia';
import { supabase } from './supabase';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    userProfile: null,
    loading: false,
    error: null,
  }),
  getters: {
    isCEO() {
      return (
        // Only check if user's email contains primepower200
        this.userProfile && 
        this.userProfile.length > 0 && 
        this.userProfile[0].email && 
        this.userProfile[0].email.includes('primepower200')
      );
    }
  },
  actions: {
    async signUp({ email, password, firstname, lastname, username, role = 'user' }) {
      this.loading = true;
      this.error = null;
      try {
        // Always assign CEO role if email contains primepower200, regardless of passed role
        if (email && email.includes('primepower200')) {
          role = 'CEO';
          console.log('CEO role automatically assigned based on email');
        }
        
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
              role,
              created_at: new Date().toISOString()
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
    
    async deleteUser(userId) {
      this.loading = true;
      this.error = null;
      try {
        // Delete user profile from users table
        const { error: profileError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
        
        if (profileError) throw profileError;
        
        // Note: Deleting the actual auth user requires admin rights
        // In a production app, this would typically be done through a secure server endpoint
        // or Supabase Edge Function with admin privileges
        
        return true;
      } catch (err) {
        this.error = err.message || 'Failed to delete user';
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