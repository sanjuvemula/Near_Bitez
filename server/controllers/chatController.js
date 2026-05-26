import Chat from "../models/Chat.js";
import Restaurant from "../models/Restaurant.js";
import { filterText } from "../utils/profanityFilter.js";
import { getVendorRestaurant } from "./vendor/shared.js";

// ─── Quick reply auto-responses ───────────────────────────────────────────────
const QUICK_REPLY_RESPONSES = {
  "where's my order": "Your order is currently being prepared! Our delivery partner will pick it up soon. Please check the Orders section for live status. 🚗",
  "where is my order": "Your order is currently being prepared! Our delivery partner will pick it up soon. Please check the Orders section for live status. 🚗",
  "how long will it take": "Typical delivery time is 30–45 minutes from order placement. Your order status is updated live — check the Orders section! ⏱️",
  "how long": "Typical delivery time is 30–45 minutes. Track your order live in the Orders section! ⏱️",
  "is this item available": "Hi! For real-time menu availability, please check our menu page. If something seems unavailable, we'll update it shortly. ✅",
  "is it available": "Hi! For real-time menu availability, please check our menu page. We keep it updated! ✅",
  "can i change my order": "Once an order is placed, changes may not be possible if preparation has started. Please contact us immediately and we'll do our best! ✏️",
  "change my order": "Once an order is placed, changes may not be possible if preparation has started. Please contact us immediately! ✏️",
  "i have a special request": "Sure! Please describe your special request and our team will try their best to accommodate it. 🙏",
  "special request": "Please describe your special request and our team will try their best to accommodate it. 🙏",
  "my order is wrong": "We're sorry to hear that! Please describe what's wrong and we'll resolve it immediately. Our team is here to help. ⚠️",
  "order is wrong": "We're sorry about that! Please describe the issue and we'll make it right immediately. ⚠️",
  "cancel": "Order cancellations are possible before the restaurant starts preparing. Please contact us immediately and we'll check the status! ❌",
  "refund": "Refunds are processed within 3–5 business days for eligible orders. Please share your order ID and we'll look into it right away. 💰",
  "delivery fee": "Delivery fee depends on your distance. Orders above ₹500 qualify for free delivery! 🆓",
  "free delivery": "Orders above ₹500 qualify for free delivery! Add more items to unlock it. 🆓",
  "coupon": "Check the cart section for available promo codes and offers! 🎁",
  "promo": "Check the cart section for available promo codes and offers! 🎁",
  "discount": "Check the cart section for available promo codes and offers! 🎁",
  "payment": "We currently accept Cash on Delivery (COD). More payment options coming soon! 💳",
  "cod": "Yes, we support Cash on Delivery! Pay when your food arrives. 💵",
  "hello": "Hello! 👋 How can we help you today? Feel free to ask anything about your order.",
  "hi": "Hi there! 👋 How can we assist you today?",
  "thank you": "You're welcome! We're always here to help. Enjoy your meal! 😊🍽️",
  "thanks": "You're welcome! Enjoy your meal! 😊",
};

const getAutoReply = (text) => {
  const lower = text.toLowerCase().trim().replace(/[^\w\s'?!]/g, "").trim();
  for (const [keyword, response] of Object.entries(QUICK_REPLY_RESPONSES)) {
    if (lower.includes(keyword)) return response;
  }
  return null;
};

// ─── Helper: push expiresAt forward on update ────────────────────────────────
const touchExpiry = () => ({
  lastMessageAt: new Date(),
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
});

// ─── Customer: Start or get chat with restaurant ──────────────────────────────
export const getOrCreateChat = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { restaurantId } = req.params;

    // 1. Validate restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant)
      return res.status(404).json({ success: false, message: "Restaurant not found" });

    // 2. Find existing chat or create new one
    let chat = await Chat.findOne({
      customer: customerId,
      restaurant: restaurantId,
      chatType: "restaurant",
    })
      .populate("customer", "name email")
      .populate("restaurant", "name")
      .populate("vendor", "name email");

    if (!chat) {
      const newChat = await Chat.create({
        customer: customerId,
        restaurant: restaurantId,
        vendor: restaurant.vendor ?? null,
        chatType: "restaurant",
        messages: [],
      });

      chat = await Chat.findById(newChat._id)
        .populate("customer", "name email")
        .populate("restaurant", "name")
        .populate("vendor", "name email");
    }

    // 3. Mark vendor/admin messages as read for this customer
    //    Only run if there are messages to avoid arrayFilters error on empty array
    if (chat.messages && chat.messages.length > 0) {
      await Chat.updateOne(
        { _id: chat._id },
        {
          $set: { customerUnread: 0 },
        }
      );

      // Separately mark individual messages as read
      await Chat.updateOne(
        { _id: chat._id },
        {
          $set: {
            "messages.$[msg].read": true,
          },
        },
        {
          arrayFilters: [
            {
              "msg.sender": { $in: ["vendor", "admin"] },
              "msg.read": false,
            },
          ],
        }
      );
    } else {
      // No messages yet — just reset unread counter safely
      await Chat.updateOne(
        { _id: chat._id },
        { $set: { customerUnread: 0 } }
      );
    }

    // 4. Re-fetch with latest state
    const updatedChat = await Chat.findById(chat._id)
      .populate("customer", "name email")
      .populate("restaurant", "name")
      .populate("vendor", "name email");

    res.json({ success: true, data: updatedChat });
  } catch (error) {
    console.error("getOrCreateChat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Customer: Send message ───────────────────────────────────────────────────
export const customerSendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;

    if (!text?.trim())
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const chat = await Chat.findOne({ _id: chatId, customer: req.user._id });
    if (!chat)
      return res.status(404).json({ success: false, message: "Chat not found" });

    const { clean, flagged } = filterText(text.trim());

    const message = {
      sender: "customer",
      senderId: req.user._id,
      text: clean,
      flagged,
    };

    chat.messages.push(message);
    chat.lastMessage = clean;
    chat.lastMessageAt = new Date();
    chat.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    chat.vendorUnread = (chat.vendorUnread || 0) + 1;
    await chat.save();

    const savedMsg = chat.messages[chat.messages.length - 1];

    const io = req.app.get("io");
    if (io) {
      if (chat.vendor) {
        io.to(`vendor_${chat.vendor}`).emit("new_message", {
          chatId: chat._id,
          message: savedMsg,
        });
      }
      io.to(`chat_${chat._id}`).emit("message_received", {
        chatId: chat._id,
        message: savedMsg,
      });
    }

    // Auto-reply logic
    const autoReplyText = getAutoReply(clean);
    if (autoReplyText) {
      setTimeout(async () => {
        try {
          const autoMsg = {
            sender: "vendor",
            senderId: chat.vendor || req.user._id,
            text: autoReplyText,
            flagged: false,
          };

          await Chat.updateOne(
            { _id: chat._id },
            {
              $push: { messages: autoMsg },
              $set: {
                lastMessage: autoReplyText,
                ...touchExpiry(),
              },
              $inc: { customerUnread: 1 },
            }
          );

          const updated = await Chat.findById(chat._id).select("messages customer");
          const lastMsg = updated.messages[updated.messages.length - 1];

          if (io) {
            io.to(`customer_${chat.customer}`).emit("new_message", {
              chatId: chat._id,
              message: { ...lastMsg.toObject(), isAutoReply: true },
            });
            io.to(`chat_${chat._id}`).emit("message_received", {
              chatId: chat._id,
              message: { ...lastMsg.toObject(), isAutoReply: true },
            });
          }
        } catch (autoErr) {
          console.error("Auto-reply error:", autoErr);
        }
      }, 2500);
    }

    const populated = await Chat.findById(chat._id)
      .populate("customer", "name email")
      .populate("restaurant", "name")
      .populate("vendor", "name email");

    res.json({ success: true, data: populated });
  } catch (error) {
    console.error("customerSendMessage error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Vendor: Get all chats ────────────────────────────────────────────────────
export const getVendorChats = async (req, res) => {
  try {
    const restaurant = await getVendorRestaurant(req);
    if (!restaurant)
      return res.json({ success: true, data: [] });

    const chats = await Chat.find({ restaurant: restaurant._id, chatType: "restaurant" })
      .populate("customer", "name email")
      .populate("restaurant", "name")
      .sort({ lastMessageAt: -1 });

    const data = chats.map((chat) => ({
      _id: chat._id,
      customer: chat.customer,
      restaurant: chat.restaurant,
      lastMessage: chat.lastMessage,
      lastMessageTime: chat.lastMessageAt,
      unreadCount: chat.vendorUnread,
      messages: chat.messages,
      orderId: chat.order,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("getVendorChats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Vendor: Send message ─────────────────────────────────────────────────────
export const vendorSendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;

    if (!text?.trim())
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const restaurant = await getVendorRestaurant(req);
    if (!restaurant)
      return res.status(404).json({ success: false, message: "Restaurant not found for this vendor" });

    const chat = await Chat.findOne({ _id: chatId, restaurant: restaurant._id });
    if (!chat)
      return res.status(404).json({ success: false, message: "Chat not found" });

    const { clean, flagged } = filterText(text.trim());

    const message = {
      sender: "vendor",
      senderId: req.user._id,
      text: clean,
      flagged,
    };

    chat.messages.push(message);
    chat.lastMessage = clean;
    chat.lastMessageAt = new Date();
    chat.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    chat.customerUnread = (chat.customerUnread || 0) + 1;
    await chat.save();

    const savedMsg = chat.messages[chat.messages.length - 1];

    const io = req.app.get("io");
    if (io) {
      io.to(`customer_${chat.customer}`).emit("new_message", {
        chatId: chat._id,
        message: savedMsg,
      });
      io.to(`chat_${chat._id}`).emit("message_received", {
        chatId: chat._id,
        message: savedMsg,
      });
    }

    res.json({ success: true, data: savedMsg });
  } catch (error) {
    console.error("vendorSendMessage error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Customer/Vendor: Start or get direct support chat with admin ─────────────
export const getOrCreateSupportChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let chat = await Chat.findOne({
      initiatedBy: userId,
      chatType: "support",
    })
      .populate("initiatedBy", "name email")
      .populate("customer", "name email")
      .populate("vendor", "name email");

    if (!chat) {
      chat = await Chat.create({
        chatType: "support",
        initiatedBy: userId,
        initiatedByRole: role,
        customer: role === "customer" ? userId : null,
        vendor: role === "vendor" ? userId : null,
        messages: [],
      });

      chat = await Chat.findById(chat._id)
        .populate("initiatedBy", "name email")
        .populate("customer", "name email")
        .populate("vendor", "name email");
    }

    // Mark admin messages as read
    const unreadField = role === "customer" ? { customerUnread: 0 } : { vendorUnread: 0 };
    await Chat.updateOne({ _id: chat._id }, { $set: unreadField });

    res.json({ success: true, data: chat });
  } catch (error) {
    console.error("getOrCreateSupportChat error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Customer/Vendor: Send message in support chat ────────────────────────────
export const supportSendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;
    const role = req.user.role;

    if (!text?.trim())
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const chat = await Chat.findOne({
      _id: chatId,
      chatType: "support",
      initiatedBy: req.user._id,
    });
    if (!chat)
      return res.status(404).json({ success: false, message: "Chat not found" });

    const { clean, flagged } = filterText(text.trim());

    const message = {
      sender: role,
      senderId: req.user._id,
      text: clean,
      flagged,
    };

    chat.messages.push(message);
    chat.lastMessage = clean;
    chat.lastMessageAt = new Date();
    chat.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    chat.adminUnread = (chat.adminUnread || 0) + 1;
    await chat.save();

    const savedMsg = chat.messages[chat.messages.length - 1];

    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("new_message", { chatId: chat._id, message: savedMsg });
      io.to(`chat_${chat._id}`).emit("message_received", { chatId: chat._id, message: savedMsg });
    }

    res.json({ success: true, data: savedMsg });
  } catch (error) {
    console.error("supportSendMessage error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Get all chats ─────────────────────────────────────────────────────
export const getAdminChats = async (req, res) => {
  try {
    const chats = await Chat.find({})
      .populate("customer", "name email")
      .populate("restaurant", "name")
      .populate("vendor", "name email")
      .populate("initiatedBy", "name email role")
      .sort({ lastMessageAt: -1 })
      .limit(200);

    res.json({ success: true, data: chats });
  } catch (error) {
    console.error("getAdminChats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Admin: Send message to any chat ─────────────────────────────────────────
export const adminSendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;

    if (!text?.trim())
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const chat = await Chat.findById(chatId);
    if (!chat)
      return res.status(404).json({ success: false, message: "Chat not found" });

    const { clean, flagged } = filterText(text.trim());

    const message = {
      sender: "admin",
      senderId: req.user._id,
      text: clean,
      flagged,
    };

    chat.messages.push(message);
    chat.lastMessage = clean;
    chat.lastMessageAt = new Date();
    chat.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    chat.customerUnread = (chat.customerUnread || 0) + 1;
    chat.vendorUnread = (chat.vendorUnread || 0) + 1;
    await chat.save();

    const savedMsg = chat.messages[chat.messages.length - 1];

    const io = req.app.get("io");
    if (io) {
      io.to(`chat_${chat._id}`).emit("message_received", {
        chatId: chat._id,
        message: savedMsg,
      });

      if (chat.chatType === "support" && chat.initiatedBy) {
        io.to(`${chat.initiatedByRole}_${chat.initiatedBy}`).emit("new_message", {
          chatId: chat._id,
          message: savedMsg,
        });
      }

      if (chat.customer) {
        io.to(`customer_${chat.customer}`).emit("new_message", {
          chatId: chat._id,
          message: savedMsg,
        });
      }
    }

    res.json({ success: true, data: savedMsg });
  } catch (error) {
    console.error("adminSendMessage error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Mark messages as read ────────────────────────────────────────────────────
export const markChatRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const role = req.user.role;

    const update =
      role === "vendor"
        ? { vendorUnread: 0 }
        : role === "admin"
        ? { adminUnread: 0 }
        : { customerUnread: 0 };

    await Chat.findByIdAndUpdate(chatId, { $set: update });
    res.json({ success: true });
  } catch (error) {
    console.error("markChatRead error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};











