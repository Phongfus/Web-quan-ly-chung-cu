import { request } from '@umijs/max';

export async function login(data: {
  email: string;
  password: string;
}) {
  return request('/auth/login', {
    method: 'POST',
    data,
  });
}