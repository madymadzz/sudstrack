const { logAdminAction } = require('../services/auditService');
const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");

const getRooms = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT c.room_id, a.full_name as customer_name, a.email
            FROM chat_messages c
            JOIN accounts a ON a.account_id = c.room_id
            ORDER BY c.room_id DESC
        `);
        return sendSuccess(res, 200, "Rooms retrieved", result.rows);
    } catch (err) {
        console.error("[Chat] getRooms error:", err.message);
        return sendError(res, 500, "Failed to retrieve chat rooms.");
    }
};

const getRoomMessages = async (req, res) => {
    let roomId = req.params.roomId;
    if (roomId === "my-room") {
        roomId = req.user.account_id;
    }
    
    if (roomId != req.user.account_id && req.user.role === "Customer") {
        return sendError(res, 403, "You do not have permission to view this chat.");
    }

    try {
        const result = await pool.query(
            "SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC",
            [roomId]
        );
        return sendSuccess(res, 200, "Messages retrieved", result.rows);
    } catch (err) {
        console.error("[Chat] getMessages error:", err.message);
        return sendError(res, 500, "Failed to retrieve messages.");
    }
};

const sendMessage = async (req, res) => {
    let roomId = req.params.roomId;
    if (roomId === "my-room") {
        roomId = req.user.account_id;
    }
    
    const { message } = req.body;
    if (!message) return sendError(res, 400, "Message cannot be empty.");

    if (roomId != req.user.account_id && req.user.role === "Customer") {
        return sendError(res, 403, "You do not have permission to send to this chat.");
    }

    try {
        const result = await pool.query(
            "INSERT INTO chat_messages (room_id, sender_id, sender_name, sender_role, message) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [roomId, req.user.account_id, req.user.full_name, req.user.role, message]
        );
        return sendSuccess(res, 201, "Message sent.", result.rows[0]);
    } catch (err) {
        console.error("[Chat] send error:", err.message);
        return sendError(res, 500, "Failed to send message.");
    }
};


// Edit a specific message
const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        
        if (!content || !content.trim()) return sendError(res, 400, "Content required");
        
        const check = await pool.query("SELECT sender_type, sender_id, content FROM chat_messages WHERE message_id = $1", [messageId]);
        if (check.rows.length === 0) return sendError(res, 404, "Message not found");
        
        if (check.rows[0].sender_type !== 'Admin') {
            return sendError(res, 403, "Cannot edit customer messages");
        }
        
        const oldContent = check.rows[0].content;
        await pool.query(
            "UPDATE chat_messages SET content = $1 WHERE message_id = $2",
            [content.trim(), messageId]
        );
        
        await logAdminAction(req.user.account_id, "Edit Live Chat", `Changed: "${oldContent}" -> "${content.trim()}"`);
        
        return sendSuccess(res, 200, "Message updated");
    } catch (err) {
        return sendError(res, 500, "Failed to edit message");
    }
};

// Delete a specific message
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const check = await pool.query("SELECT content FROM chat_messages WHERE message_id = $1", [messageId]);
        if (check.rows.length > 0) {
            const oldContent = check.rows[0].content;
            await logAdminAction(req.user.account_id, "Delete Live Chat", `Deleted message: "${oldContent}"`);
        }
        await pool.query("DELETE FROM chat_messages WHERE message_id = $1", [messageId]);
        return sendSuccess(res, 200, "Message deleted");
    } catch (err) {
        return sendError(res, 500, "Failed to delete message");
    }
};

// Wipe all messages in a room
const wipeRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        if (req.user.role !== 'SuperAdmin') {
            return sendError(res, 403, "Only SuperAdmin can wipe chats");
        }
        await pool.query("DELETE FROM chat_messages WHERE room_id = $1", [roomId]);
        await logAdminAction(req.user.account_id, "Wipe Live Chat", `Wiped all messages for room ID ${roomId}`);
        return sendSuccess(res, 200, "Chat wiped");
    } catch (err) {
        return sendError(res, 500, "Failed to wipe chat");
    }
};

module.exports = { getRooms, getRoomMessages, sendMessage, editMessage, deleteMessage, wipeRoomMessages };

