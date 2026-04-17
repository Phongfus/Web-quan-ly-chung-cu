import { request } from '@umijs/max';

export interface VehicleItem {
  id: string;
  ownerId: string;
  apartmentId: string;
  type: 'CAR' | 'MOTORBIKE' | 'BICYCLE';
  licensePlate?: string;
  createdAt: string;
  updatedAt: string;
  apartment?: {
    code: string;
  };
  owner?: {
    user: {
      fullName: string;
      email: string;
    };
  };
}

export async function getVehicles(): Promise<VehicleItem[]> {
  return request('/vehicles');
}

export async function createVehicle(data: Partial<VehicleItem>): Promise<VehicleItem> {
  return request('/vehicles', {
    method: 'POST',
    data,
  });
}

export async function updateVehicle(id: string, data: Partial<VehicleItem>): Promise<VehicleItem> {
  return request(`/vehicles/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  return request(`/vehicles/${id}`, {
    method: 'DELETE',
  });
}

export const vehicleTypeMap: Record<string, string> = {
  CAR: 'Ô tô',
  MOTORBIKE: 'Xe máy',
  BICYCLE: 'Xe đạp',
};