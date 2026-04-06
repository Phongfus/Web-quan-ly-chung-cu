import { request } from "@umijs/max";

export interface ApartmentItem {
  id: string;
  code: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
  area?: number;
  createdAt: string;

  floor?: {
    number: number;
  };

  type?: {
    name: string;
  };
}

export const getApartments = async (): Promise<ApartmentItem[]> => {
  return request("/apartments");
};

export const getApartmentById = async (id: string): Promise<ApartmentItem> => {
  return request(`/apartments/${id}`);
};

export const createApartment = async (
  data: Partial<ApartmentItem>
): Promise<ApartmentItem> => {
  return request("/apartments", {
    method: "POST",
    data,
  });
};

export const updateApartment = async (
  id: string,
  data: Partial<ApartmentItem>
): Promise<ApartmentItem> => {
  return request(`/apartments/${id}`, {
    method: "PUT",
    data,
  });
};

export const deleteApartment = async (id: string): Promise<void> => {
  return request(`/apartments/${id}`, {
    method: "DELETE",
  });
};