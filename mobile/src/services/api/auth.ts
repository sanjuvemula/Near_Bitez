import { apiClient } from "@/services/apiClient";
import type { AuthResponse, User } from "@/types/models";

/** Mirrors server/routes/auth.js */
export const authApi = {
  customerLogin: (email: string, password: string) =>
    apiClient
      .post<AuthResponse>("/auth/customer/login", { email, password })
      .then((r) => r.data),

  customerRegister: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) =>
    apiClient
      .post<AuthResponse>("/auth/customer/register", payload)
      .then((r) => r.data),

  vendorLogin: (email: string, password: string) =>
    apiClient
      .post<AuthResponse>("/auth/vendor/login", { email, password })
      .then((r) => r.data),

  vendorRegister: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) =>
    apiClient
      .post<AuthResponse>("/auth/vendor/register", payload)
      .then((r) => r.data),

  me: () =>
    apiClient
      .get<{ success: boolean; user: User }>("/auth/me")
      .then((r) => r.data.user),

  updateMe: (payload: Partial<User>) =>
    apiClient
      .patch<{ success: boolean; user: User }>("/auth/me", payload)
      .then((r) => r.data.user),

  logout: () => apiClient.post("/auth/logout").then((r) => r.data),
};
