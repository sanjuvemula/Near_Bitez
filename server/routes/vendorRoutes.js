const express = require('express');
const router = express.Router();
const multer = require('multer');

// ==========================================
// ⚠️ TUMHARE MONGOOSE MODELS YAHAN IMPORT KARO
// Ensure you have these models created in your backend
// ==========================================
// const Vendor = require('../models/Vendor');
// const Menu = require('../models/Menu');
// const Order = require('../models/Order');
// const Promo = require('../models/Promo');
// const Review = require('../models/Review');
// const Chat = require('../models/Chat');
// const Subscription = require('../models/Subscription');
// const { protectVendor } = require('../middleware/authMiddleware'); // Tumhara JWT Auth

// ==========================================
// MULTER SETUP (For Image Uploads)
// ==========================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); }, // Apne hisaab se path set kar lena
  filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

// Apply authentication middleware to ALL vendor routes
// router.use(protectVendor); 

// ==========================================
// 1. DASHBOARD OVERVIEW & STATS
// ==========================================
router.get('/overview', async (req, res) => {
  try {
    const vendorId = req.user._id;
    
    // Asli calculations from Database
    // const liveOrdersCount = await Order.countDocuments({ vendorId, status: { $in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } });
    // const todayOrdersCount = await Order.countDocuments({ vendorId, createdAt: { $gte: new Date().setHours(0,0,0,0) } });
    // const activeMenuCount = await Menu.countDocuments({ vendorId, isAvailable: true });
    
    res.json({
      stats: {
        liveOrders: 0, // Replace with liveOrdersCount
        todayOrders: 0, // Replace with todayOrdersCount
        todayRevenue: 0,
        acceptanceRate: 100,
        activeMenuItems: 0 // Replace with activeMenuCount
      },
      statusBreakdown: { PLACED: 0, PREPARING: 0, READY: 0, OUT_FOR_DELIVERY: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch overview stats", error: error.message });
  }
});

// ==========================================
// 2. STORE / RESTAURANT PROFILE
// ==========================================
router.get('/restaurant', async (req, res) => {
  try {
    // const restaurant = await Vendor.findById(req.user._id);
    res.json(req.user || {}); // Sending the authenticated user data
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put('/restaurant', upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`; // S3 or Cloudinary URL in production

    // const updatedVendor = await Vendor.findByIdAndUpdate(req.user._id, updateData, { new: true });
    res.json(updateData); 
  } catch (error) {
    res.status(400).json({ message: "Failed to update restaurant profile" });
  }
});

// ==========================================
// 3. MENU & INVENTORY MANAGEMENT
// ==========================================
router.get('/menu', async (req, res) => {
  try {
    // const menuItems = await Menu.find({ vendorId: req.user._id }).sort({ createdAt: -1 });
    res.json([]); 
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch menu" });
  }
});

router.post('/menu', upload.single('image'), async (req, res) => {
  try {
    const dishData = { ...req.body, vendorId: req.user._id };
    if (req.file) dishData.imageUrl = `/uploads/${req.file.filename}`;
    
    // const newDish = await Menu.create(dishData);
    res.status(201).json({ _id: Date.now().toString(), ...dishData }); 
  } catch (error) {
    res.status(400).json({ message: "Failed to create dish" });
  }
});

router.put('/menu/:id', upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

    // const updatedDish = await Menu.findOneAndUpdate({ _id: req.params.id, vendorId: req.user._id }, updateData, { new: true });
    res.json({ _id: req.params.id, ...updateData });
  } catch (error) {
    res.status(400).json({ message: "Failed to update dish" });
  }
});

router.patch('/menu/:id/availability', async (req, res) => {
  try {
    // const dish = await Menu.findOneAndUpdate({ _id: req.params.id, vendorId: req.user._id }, { isAvailable: req.body.isAvailable }, { new: true });
    res.json({ _id: req.params.id, isAvailable: req.body.isAvailable });
  } catch (error) {
    res.status(400).json({ message: "Failed to update availability" });
  }
});

router.delete('/menu/:id', async (req, res) => {
  try {
    // await Menu.findOneAndDelete({ _id: req.params.id, vendorId: req.user._id });
    res.json({ message: "Dish removed successfully" });
  } catch (error) {
    res.status(400).json({ message: "Failed to delete dish" });
  }
});

// ==========================================
// 4. LIVE ORDERS
// ==========================================
router.get('/orders', async (req, res) => {
  try {
    // const orders = await Order.find({ vendorId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    // const order = await Order.findOneAndUpdate({ _id: req.params.id, vendorId: req.user._id }, { status: req.body.status }, { new: true });
    res.json({ _id: req.params.id, status: req.body.status });
  } catch (error) {
    res.status(400).json({ message: "Failed to update order status" });
  }
});

// ==========================================
// 5. LOGISTICS & DELIVERY ZONES
// ==========================================
router.get('/logistics', async (req, res) => {
  try {
    // const vendor = await Vendor.findById(req.user._id).select('logistics');
    // res.json(vendor.logistics);
    res.json({
      location: { lat: 30.9010, lng: 75.8573 },
      deliveryRadiusKm: 5,
      baseDeliveryFee: 40,
      freeDeliveryAbove: 500,
      isSelfDelivery: true
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put('/logistics', async (req, res) => {
  try {
    // const updatedVendor = await Vendor.findByIdAndUpdate(req.user._id, { logistics: req.body }, { new: true });
    res.json(req.body); 
  } catch (error) {
    res.status(400).json({ message: "Failed to save logistics" });
  }
});

// ==========================================
// 6. WALLET & PAYOUTS
// ==========================================
router.get('/wallet', async (req, res) => {
  try {
    // const walletData = await Wallet.findOne({ vendorId: req.user._id });
    res.json({ balance: 0, totalEarnings: 0, pendingSettlement: 0, history: [] });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/wallet/payout', async (req, res) => {
  try {
    const { amount } = req.body;
    // Logic to deduct from balance and create payout request in DB
    res.status(200).json({ message: "Payout requested", amount });
  } catch (error) {
    res.status(400).json({ message: "Failed to request payout" });
  }
});

// ==========================================
// 7. MARKETING & PROMOS
// ==========================================
router.get('/promos', async (req, res) => {
  try {
    // const promos = await Promo.find({ vendorId: req.user._id }).sort({ createdAt: -1 });
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/promos', async (req, res) => {
  try {
    // const newPromo = await Promo.create({ ...req.body, vendorId: req.user._id });
    res.status(201).json({ _id: Date.now().toString(), ...req.body, isActive: true });
  } catch (error) {
    res.status(400).json({ message: "Failed to create promo" });
  }
});

router.patch('/promos/:id/status', async (req, res) => {
  try {
    // const promo = await Promo.findOneAndUpdate({ _id: req.params.id, vendorId: req.user._id }, { isActive: req.body.isActive }, { new: true });
    res.json({ _id: req.params.id, isActive: req.body.isActive });
  } catch (error) {
    res.status(400).json({ message: "Failed to update promo status" });
  }
});

// ==========================================
// 8. REVIEWS, CHATS & SUBSCRIPTIONS
// ==========================================
router.get('/reviews', async (req, res) => {
  try {
    // const reviews = await Review.find({ vendorId: req.user._id }).populate('customerId', 'name');
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get('/chats', async (req, res) => {
  try {
    // const chats = await Chat.find({ vendorId: req.user._id }).populate('customerId', 'name');
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post('/chats/:id/message', async (req, res) => {
  try {
    // Message send logic
    res.json({ message: "Sent successfully" });
  } catch (error) {
    res.status(400).json({ message: "Failed to send message" });
  }
});

router.get('/subscriptions', async (req, res) => {
  try {
    // const subs = await Subscription.find({ vendorId: req.user._id });
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch('/subscriptions/:id/status', async (req, res) => {
  try {
    // await Subscription.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ _id: req.params.id, status: req.body.status });
  } catch (error) {
    res.status(400).json({ message: "Failed to update subscription" });
  }
});

module.exports = router;