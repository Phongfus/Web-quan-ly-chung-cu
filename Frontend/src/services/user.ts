import { request } from '@umijs/max';

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getUsers(): Promise<UserItem[]> {
  return request('/user');
}