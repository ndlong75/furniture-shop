export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
