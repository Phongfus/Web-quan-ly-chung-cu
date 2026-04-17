import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
  updateMessage,
  deleteMessage,
  deleteConversation,
} from "./message.controller";

const router = Router();

router.use(authMiddleware);

router.get("/conversations", getConversations);
router.post("/conversations", createConversation);
router.delete("/conversations/:conversationId", deleteConversation);
router.get("/conversations/:conversationId/messages", getMessages);
router.post("/messages", sendMessage);
router.put("/messages/:messageId", updateMessage);
router.delete("/messages/:messageId", deleteMessage);

export default router;