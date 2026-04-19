import { request } from '@umijs/max';

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  targetId: string;
}

export interface NotificationResponse {
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getNotifications(params?: { page?: number; limit?: number }): Promise<NotificationResponse> {
  return request('/notifications', {
    params,
  });
}

export async function getNotificationById(id: string): Promise<NotificationItem> {
  return request(`/notifications/${id}`);
}

export async function markAsRead(id: string): Promise<NotificationItem> {
  return request(`/notifications/${id}/read`, {
    method: 'PUT',
  });
}

export async function markAllAsRead(): Promise<{ message: string }> {
  return request('/notifications/mark-all-read', {
    method: 'PUT',
  });
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return request('/notifications/unread-count');
}

export async function createNotification(data: { title: string; content: string; userIds: string[] }): Promise<NotificationItem> {
  return request('/notifications', {
    method: 'POST',
    data,
  });
}

export async function updateNotification(id: string, data: { title?: string; content?: string }): Promise<NotificationItem> {
  return request(`/notifications/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteNotification(id: string): Promise<{ message: string }> {
  return request(`/notifications/${id}`, {
    method: 'DELETE',
  });
}