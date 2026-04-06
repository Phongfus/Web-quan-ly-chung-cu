import { request } from '@umijs/max';

export async function getDashboard(params: { month: string }) {

  const res: any = await request('/dashboard', {
    method: 'GET',
    params,
  });

  console.log("SERVICE:", res);

  return res?.data || res;
}