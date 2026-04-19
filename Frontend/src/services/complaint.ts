import { request } from '@umijs/max';

export interface ComplaintItem {
  id: string;
  userId: string;
  apartmentId: string;
  title: string;
  content: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
  };

  apartment: {
    id: string;
    code: string;
  };
}

export async function getComplaints(): Promise<ComplaintItem[]> {
  return request('/complaints');
}

export async function getComplaintById(id: string): Promise<ComplaintItem> {
  return request(`/complaints/${id}`);
}

export async function createComplaint(data: Partial<ComplaintItem>): Promise<ComplaintItem> {
  return request('/complaints', {
    method: 'POST',
    data,
  });
}

export async function updateComplaint(id: string, data: Partial<ComplaintItem>): Promise<ComplaintItem> {
  return request(`/complaints/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteComplaint(id: string): Promise<void> {
  return request(`/complaints/${id}`, {
    method: 'DELETE',
  });
}