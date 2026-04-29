import { request } from '@umijs/max';

const apiBaseUrl = process.env.UMI_APP_API_URL || 'http://localhost:3001/api';

export async function getDashboard(params: { year: string }) {
  const url = `${apiBaseUrl}/dashboard`;

  const res: any = await request(url, {
    method: 'GET',
    params: {
      year: params.year,
    },
  });

  console.log('✅ SERVICE RESPONSE:', res);
  console.log('🏠 totalApartment VALUE:', res?.totalApartment, typeof res?.totalApartment);

  return res;
}