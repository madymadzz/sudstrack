const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");
const { getRooms, getRoomMessages, sendMessage, editMessage, deleteMessage, wipeRoomMessages } = require("../controllers/chatController");

router.use(protect);

router.get("/rooms", adminOnly, getRooms);
router.get("/:roomId", getRoomMessages);
router.post("/:roomId", sendMessage);


router.put("/messages/:messageId", adminOnly, editMessage);
router.delete("/messages/:messageId", adminOnly, deleteMessage);
router.delete("/rooms/:roomId/messages", adminOnly, wipeRoomMessages);

module.exports = router;

