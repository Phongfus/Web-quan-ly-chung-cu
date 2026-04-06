import { request } from '@umijs/max';

export interface BillItem {
  id: string;
  apartmentId: string;
  electricityFee?: number;
  waterFee?: number;
  serviceFee?: number;
  amount: number;
  month: number;
  year: number;
  dueDate: string;
  status: 'UNPAID' | 'PAID';
  createdAt: string;
  updatedAt: string;

  apartment: {
    id: string;
    code: string;
  };

  payments: {
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }[];
}

export async function getBills(): Promise<BillItem[]> {
  return request('/bills');
}

export async function getBillById(id: string): Promise<BillItem> {
  return request(`/bills/${id}`);
}

export async function getBillsByApartment(apartmentId: string): Promise<BillItem[]> {
  return request(`/bills/apartment/${apartmentId}`);
}

export async function createBill(data: Partial<BillItem>): Promise<BillItem> {
  return request('/bills', {
    method: 'POST',
    data,
  });
}

export async function updateBill(id: string, data: Partial<BillItem>): Promise<BillItem> {
  return request(`/bills/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteBill(id: string): Promise<void> {
  return request(`/bills/${id}`, {
    method: 'DELETE',
  });
}