import { request } from '@umijs/max';

export async function getDashboard(params: { year: string }) {

  const res: any = await request('/dashboard', {
    method: 'GET',
    params,
  });

  console.log("SERVICE RESPONSE:", res);

  return res;
}