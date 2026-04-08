import { request } from "@umijs/max";

export interface ApartmentTypeItem {
  id: string;
  name: string;
  bedrooms: number;
  livingRooms: number;
}

export const getApartmentTypes = async (): Promise<ApartmentTypeItem[]> => {
  return request("/apartment-types");
};