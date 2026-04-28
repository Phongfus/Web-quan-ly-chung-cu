"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteConversation = exports.deleteMessage = exports.updateMessage = exports.getUnreadCount = exports.createConversation = exports.sendMessage = exports.getMessages = exports.getConversations = void 0;
const prisma_1 = require("../../config/prisma");
const getConversations = async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        let conversations;
        if (user.role === "ADMIN") {
            // Admin sees all conversations with residents
            conversations = await prisma_1.prisma.conversation.findMany({
                where: {
                    OR: [
                        { user1: { role: "RESIDENT" } },
                        { user2: { role: "RESIDENT" } },
                    ],
                },
                include: {
                    user1: { select: { id: true, fullName: true, role: true, phone: true } },
                    user2: { select: { id: true, fullName: true, role: true, phone: true } },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1, // Last message
                        select: { id: true, senderId: true, content: true, createdAt: true, isRead: true },
                    },
                },
                orderBy: { updatedAt: "desc" },
            });
        }
        else if (user.role === "RESIDENT") {
            // Resident sees only conversation with admin
            conversations = await prisma_1.prisma.conversation.findMany({
                where: {
                    OR: [
                        { user1Id: user.id, user2: { role: "ADMIN" } },
                        { user2Id: user.id, user1: { role: "ADMIN" } },
                    ],
                },
                include: {
                    user1: { select: { id: true, fullName: true, role: true, phone: true } },
                    user2: { select: { id: true, fullName: true, role: true, phone: true } },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { id: true, senderId: true, content: true, createdAt: true, isRead: true },
                    },
                },
            });
        }
        else {
            return res.status(403).json({ message: "Access denied" });
        }
        res.json(conversations);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching conversations" });
    }
};
exports.getConversations = getConversations;
const getMessages = async (req, res) => {
    const conversationId = req.params.conversationId;
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (!conversationId) {
        return res.status(400).json({ message: "Conversation ID is required" });
    }
    try {
        // Check if user is part of the conversation
        const conversation = await prisma_1.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { user1: true, user2: true },
        });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        if (conversation.user1Id !== user.id && conversation.user2Id !== user.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        await prisma_1.prisma.message.updateMany({
            where: {
                conversationId,
                senderId: { not: user.id },
                isRead: false,
            },
            data: { isRead: true },
        });
        const messages = await prisma_1.prisma.message.findMany({
            where: { conversationId },
            include: { sender: { select: { id: true, fullName: true } } },
            orderBy: { createdAt: "asc" },
        });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching messages" });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
    const { conversationId, content } = req.body;
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (!conversationId || !content) {
        return res.status(400).json({ message: "Conversation ID and content are required" });
    }
    try {
        // Check if user is part of the conversation
        const conversation = await prisma_1.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { user1: true, user2: true },
        });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        if (conversation.user1Id !== user.id && conversation.user2Id !== user.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        const message = await prisma_1.prisma.message.create({
            data: {
                conversationId,
                senderId: user.id,
                content,
            },
            include: { sender: { select: { id: true, fullName: true } } },
        });
        // Update conversation updatedAt
        await prisma_1.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        res.json(message);
    }
    catch (error) {
        res.status(500).json({ message: "Error sending message" });
    }
};
exports.sendMessage = sendMessage;
const createConversation = async (req, res) => {
    const { otherUserId } = req.body;
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (!otherUserId) {
        return res.status(400).json({ message: "Other user ID is required" });
    }
    // cho phép cả ADMIN và RESIDENT tạo conversation
    if (!["ADMIN", "RESIDENT"].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
    }
    try {
        // Check if conversation already exists
        const existing = await prisma_1.prisma.conversation.findFirst({
            where: {
                OR: [
                    { user1Id: user.id, user2Id: otherUserId },
                    { user1Id: otherUserId, user2Id: user.id },
                ],
            },
        });
        if (existing) {
            return res.json(existing);
        }
        const conversation = await prisma_1.prisma.conversation.create({
            data: {
                user1Id: user.id,
                user2Id: otherUserId,
            },
        });
        res.json(conversation);
    }
    catch (error) {
        res.status(500).json({ message: "Error creating conversation" });
    }
};
exports.createConversation = createConversation;
const getUnreadCount = async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const count = await prisma_1.prisma.conversation.count({
            where: {
                OR: [
                    { user1Id: user.id },
                    { user2Id: user.id },
                ],
                messages: {
                    some: {
                        isRead: false,
                        senderId: {
                            not: user.id,
                        },
                    },
                },
            },
        });
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching unread conversation count" });
    }
};
exports.getUnreadCount = getUnreadCount;
const updateMessage = async (req, res) => {
    const messageId = req.params.messageId;
    const { content } = req.body;
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (!content) {
        return res.status(400).json({ message: "Content is required" });
    }
    try {
        const message = await prisma_1.prisma.message.findUnique({
            where: { id: messageId },
        });
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        if (message.senderId !== user.id) {
            return res.status(403).json({ message: "You can only edit your own messages" });
        }
        const updatedMessage = await prisma_1.prisma.message.update({
            where: { id: messageId },
            data: { content },
            include: { sender: { select: { id: true, fullName: true } } },
        });
        res.json(updatedMessage);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating message" });
    }
};
exports.updateMessage = updateMessage;
const deleteMessage = async (req, res) => {
    const messageId = req.params.messageId;
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const message = await prisma_1.prisma.message.findUnique({
            where: { id: messageId },
        });
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        if (message.senderId !== user.id) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }
        await prisma_1.prisma.message.delete({
            where: { id: messageId },
        });
        res.json({ message: "Message deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting message" });
    }
};
exports.deleteMessage = deleteMessage;
const deleteConversation = async (req, res) => {
    const conversationId = req.params.conversationId;
    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const conversation = await prisma_1.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        // Check if user is part of the conversation
        if (conversation.user1Id !== user.id && conversation.user2Id !== user.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        // Delete all messages in the conversation
        await prisma_1.prisma.message.deleteMany({
            where: { conversationId },
        });
        // Delete the conversation
        await prisma_1.prisma.conversation.delete({
            where: { id: conversationId },
        });
        res.json({ message: "Conversation deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting conversation" });
    }
};
exports.deleteConversation = deleteConversation;
