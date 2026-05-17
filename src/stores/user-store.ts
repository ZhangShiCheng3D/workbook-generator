import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UserPlan, UserRole } from '@/types';

export interface UserState {
  id: string;
  email: string;
  name: string | null;
  plan: UserPlan;
  role: UserRole;
}

interface UserStore {
  user: UserState | null;
  isAuthenticated: boolean;
  setUser: (user: UserState) => void;
  clearUser: () => void;
}

/**
 * Client-side user state store.
 * Populated on login/signup via Supabase session.
 * Does NOT store sensitive data — the session token lives in Supabase-managed cookies.
 */
export const useUserStore = create<UserStore>()(
  immer((set) => ({
    user: null,
    isAuthenticated: false,

    setUser(user) {
      set((state) => {
        state.user = user;
        state.isAuthenticated = true;
      });
    },

    clearUser() {
      set((state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
    },
  }))
);
