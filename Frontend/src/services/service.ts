import { request } from '@umijs/max';

export interface ServiceItem {
  id: string;
  serviceNumber?: string;
  apartmentId: string;
  requesterId: string;
  type: 'ELECTRIC' | 'WATER' | 'AIR_CONDITIONER' | 'INTERNET' | 'OTHER';
  description: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  apartment?: {
    code: string;
  };
  user?: {
    fullName: string;
    email: string;
  };
}

export async function getServices(): Promise<ServiceItem[]> {
  return request('/services');
}

export async function createService(data: Partial<ServiceItem>): Promise<ServiceItem> {
  return request('/services', {
    method: 'POST',
    data,
  });
}

export async function updateService(id: string, data: Partial<ServiceItem>): Promise<ServiceItem> {
  return request(`/services/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteService(id: string): Promise<void> {
  return request(`/services/${id}`, {
    method: 'DELETE',
  });
}

export const serviceTypeMap: Record<string, string> = {
  ELECTRIC: 'Điện',
  WATER: 'Nước',
  AIR_CONDITIONER: 'Máy lạnh',
  INTERNET: 'Internet',
  OTHER: 'Khác',
};

export const serviceStatusMap: Record<string, { text: string; color: string }> = {
  PENDING: { text: 'Chờ xử lý', color: 'orange' },
  PROCESSING: { text: 'Đang xử lý', color: 'blue' },
  DONE: { text: 'Hoàn thành', color: 'green' },
};
