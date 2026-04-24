import { request } from '@umijs/max';

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead?: boolean;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
  };
}

export interface ConversationItem {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  updatedAt: string;
  user1: {
    id: string;
    fullName: string;
    role: string;
    phone?: string;
  };
  user2: {
    id: string;
    fullName: string;
    role: string;
    phone?: string;
  };
  messages: {
    id?: string;
    conversationId?: string;
    senderId: string;
    content: string;
    isRead?: boolean;
    createdAt: string;
    sender?: {
      id: string;
      fullName: string;
    };
  }[];
}

export async function getConversations(): Promise<ConversationItem[]> {
  return request('/messages/conversations');
}

export async function getMessages(conversationId: string): Promise<MessageItem[]> {
  return request(`/messages/conversations/${conversationId}/messages`);
}

export async function sendMessage(conversationId: string, content: string): Promise<MessageItem> {
  return request('/messages/messages', {
    method: 'POST',
    data: { conversationId, content },
  });
}

export async function createConversation(otherUserId: string): Promise<ConversationItem> {
  return request('/messages/conversations', {
    method: 'POST',
    data: { otherUserId },
  });
}

export async function updateMessage(messageId: string, content: string): Promise<MessageItem> {
  return request(`/messages/messages/${messageId}`, {
    method: 'PUT',
    data: { content },
  });
}

export async function deleteMessage(messageId: string): Promise<any> {
  return request(`/messages/messages/${messageId}`, {
    method: 'DELETE',
  });
}

export async function deleteConversation(conversationId: string): Promise<any> {
  return request(`/messages/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}