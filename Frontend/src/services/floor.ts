import { request } from "@umijs/max";

export interface FloorItem {
  id: string;
  number: number;
  buildingId: string;
}

export const getFloors = async (): Promise<FloorItem[]> => {
  return request("/floors");
};