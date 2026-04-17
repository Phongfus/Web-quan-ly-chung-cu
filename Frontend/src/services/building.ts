import { request } from '@umijs/max';

export interface BuildingItem {
  id: string;
  name: string;
  address: string;
}

export async function getBuildings(): Promise<BuildingItem[]> {
  return request('/buildings');
}

export async function getBuildingById(id: string): Promise<BuildingItem> {
  return request(`/buildings/${id}`);
}