const { logAdminAction } = require('../services/auditService');
const pool = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseUtils');

// GET /api/staff-chat — fetch last 100 messages
const getStaffMessages = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.message_id,
                m.sender_id,
                m.content,
                m.created_at,
                a.full_name AS sender_name,
                a.role AS sender_role,
                a.profile_picture AS sender_pic
            FROM staff_messages m
            JOIN accounts a ON a.account_id = m.sender_id
            ORDER BY m.created_at ASC
            LIMIT 100
        `);
        return sendSuccess(res, 200, 'Messages retrieved.', result.rows);
    } catch (err) {
        console.error('[StaffChat] getMessages error:', err.message);
        return sendError(res, 500, 'Could not retrieve messages.');
    }
};

// POST /api/staff-chat — send a message
const sendStaffMessage = async (req, res) => {
    const { content } = req.body;
    if (!content || !content.trim()) {
        return sendError(res, 400, 'Message content is required.');
    }
    
    try {
        // Insert message
        const result = await pool.query(
            `INSERT INTO staff_messages (sender_id, content)
             VALUES ($1, $2)
             RETURNING message_id, content, created_at`,
            [req.user.account_id, content.trim()]
        );
        const newMsg = result.rows[0];

        // Process mentions
        const mentions = content.match(/@([a-zA-Z0-9_]+)/g);
        if (mentions && mentions.length > 0) {
            const mentionedWords = mentions.map(m => m.substring(1).toLowerCase());
            
            // Get all staff and admins except sender
            const staffResult = await pool.query(
                "SELECT account_id, full_name, role FROM accounts WHERE role IN ('Staff', 'SuperAdmin') AND account_id != $1",
                [req.user.account_id]
            );
            
            const toNotify = new Set();
            for (const person of staffResult.rows) {
                const firstName = person.full_name.split(' ')[0].toLowerCase();
                const role = person.role.toLowerCase();
                
                if (mentionedWords.includes('all') || mentionedWords.includes(firstName) || mentionedWords.includes(role)) {
                    toNotify.add(person.account_id);
                }
            }

            // Create notifications
            if (toNotify.size > 0) {
                const senderName = req.user.full_name.split(' ')[0];
                const notifTitle = `New mention in Staff Chat`;
                const notifMsg = `${senderName} mentioned you: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`;
                
                for (const accountId of toNotify) {
                    await pool.query(
                        `INSERT INTO admin_notifications (account_id, title, message, link_tab) VALUES ($1, $2, $3, 'staff-chat')`,
                        [accountId, notifTitle, notifMsg]
                    );
                }
            }
        }

        return sendSuccess(res, 201, 'Message sent.', newMsg);
    } catch (err) {
        console.error('[StaffChat] sendMessage error:', err.message);
        return sendError(res, 500, 'Could not send message.');
    }
};


// GET /api/staff-chat/members — list all pingable staff
const getChatMembers = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT account_id, full_name, role, profile_picture FROM accounts WHERE role IN ('Staff', 'SuperAdmin')"
        );
        return sendSuccess(res, 200, 'Members retrieved', result.rows);
    } catch (err) {
        console.error('[StaffChat] getChatMembers error:', err.message);
        return sendError(res, 500, 'Could not retrieve members');
    }
};


// PUT /api/staff-chat/:messageId — edit a message
const editStaffMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        
        if (!content || !content.trim()) return sendError(res, 400, "Content required");
        
        const check = await pool.query("SELECT sender_id, content FROM staff_messages WHERE message_id = $1", [messageId]);
        if (check.rows.length === 0) return sendError(res, 404, "Message not found");
        
        if (check.rows[0].sender_id !== req.user.account_id && req.user.role !== 'SuperAdmin') {
            return sendError(res, 403, "Not authorized to edit this message");
        }
        
        const oldContent = check.rows[0].content;
        await pool.query(
            "UPDATE staff_messages SET content = $1 WHERE message_id = $2",
            [content.trim(), messageId]
        );
        
        await logAdminAction(req.user.account_id, "Edit Staff Chat", `Changed: "${oldContent}" -> "${content.trim()}"`);
        
        return sendSuccess(res, 200, "Message updated");
    } catch (err) {
        return sendError(res, 500, "Failed to edit message");
    }
};

// DELETE /api/staff-chat/:messageId — delete a message
const deleteStaffMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const check = await pool.query("SELECT sender_id, content FROM staff_messages WHERE message_id = $1", [messageId]);
        if (check.rows.length === 0) return sendError(res, 404, "Message not found");
        
        if (check.rows[0].sender_id !== req.user.account_id && req.user.role !== 'SuperAdmin') {
            return sendError(res, 403, "Not authorized to delete this message");
        }
        
        const oldContent = check.rows[0].content;
        await pool.query("DELETE FROM staff_messages WHERE message_id = $1", [messageId]);
        
        await logAdminAction(req.user.account_id, "Delete Staff Chat", `Deleted message: "${oldContent}"`);
        
        return sendSuccess(res, 200, "Message deleted");
    } catch (err) {
        return sendError(res, 500, "Failed to delete message");
    }
};

// DELETE /api/staff-chat/wipe/all — wipe all staff chat
const wipeStaffChat = async (req, res) => {
    try {
        if (req.user.role !== 'SuperAdmin') {
            return sendError(res, 403, "Only SuperAdmin can wipe chats");
        }
        await pool.query("DELETE FROM staff_messages");
        
        await logAdminAction(req.user.account_id, "Wipe Staff Chat", `Wiped entire staff chat history`);
        
        return sendSuccess(res, 200, "Staff chat wiped");
    } catch (err) {
        return sendError(res, 500, "Failed to wipe chat");
    }
};

module.exports = { getStaffMessages, sendStaffMessage, getChatMembers, editStaffMessage, deleteStaffMessage, wipeStaffChat };


