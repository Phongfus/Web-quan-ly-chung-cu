import { request } from '@umijs/max';

export interface ResidentItem {
  id: string;
  userId: string;
  apartmentId: string;
  identityCard?: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    isActive: boolean;
  };

  apartment: {
    id: string;
    code: string;
    status: string;
  };
}

export async function getResidents(): Promise<ResidentItem[]> {
  return request('/residents');
}

export async function getCurrentResident(): Promise<ResidentItem> {
  return request('/residents/current');
}

export async function getResidentById(id: string): Promise<ResidentItem> {
  return request(`/residents/${id}`);
}

export async function createResident(data: Partial<ResidentItem>): Promise<ResidentItem> {
  return request('/residents', {
    method: 'POST',
    data,
  });
}

export async function updateResident(id: string, data: Partial<ResidentItem>): Promise<ResidentItem> {
  return request(`/residents/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteResident(id: string): Promise<void> {
  return request(`/residents/${id}`, {
    method: 'DELETE',
  });
}