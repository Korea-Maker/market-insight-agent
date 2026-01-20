/**
 * 인증 상태 관리 스토어
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, authApi, usersApi } from '@/lib/api';
import type { User, UserWithStats } from '@/types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: { display_name?: string; bio?: string; avatar_url?: string }) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });

          api.setAccessToken(response.access_token);

          set({
            user: response.user,
            accessToken: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, username: string, password: string, displayName: string) => {
        set({ isLoading: true });
        try {
          await authApi.register({
            email,
            username,
            password,
            display_name: displayName,
          });
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // 에러 무시 (이미 로그아웃 상태일 수 있음)
        } finally {
          api.setAccessToken(null);
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });
        }
      },

      refreshToken: async () => {
        try {
          const response = await authApi.refresh();
          api.setAccessToken(response.access_token);

          set({
            accessToken: response.access_token,
          });
        } catch {
          // 리프레시 실패 시 로그아웃
          get().logout();
        }
      },

      checkAuth: async () => {
        const { accessToken } = get();

        if (!accessToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        api.setAccessToken(accessToken);

        try {
          const user = await authApi.me();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // 토큰 만료 시 리프레시 시도
          try {
            await get().refreshToken();
            const user = await authApi.me();
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch {
            // 리프레시도 실패 시 로그아웃
            api.setAccessToken(null);
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        }
      },

      updateProfile: async (data) => {
        await usersApi.updateMe(data);
        // 프로필 정보 다시 조회
        const user = await authApi.me();
        set({ user });
      },

      setTokens: (accessToken: string) => {
        api.setAccessToken(accessToken);
        set({ accessToken, isAuthenticated: true });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
    }
  )
);
