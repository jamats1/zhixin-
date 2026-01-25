import { create } from "zustand";

type AuthState = {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    role: "admin" | "editor" | "contributor" | "viewer";
  } | null;
};

type AuthActions = {
  setUser: (user: AuthState["user"]) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
