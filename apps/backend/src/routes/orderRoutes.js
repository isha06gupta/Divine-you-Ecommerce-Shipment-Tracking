const express = require("express");

const router = express.Router();

const {
    createOrder,
    getAllOrders,
    updateOrderStatus,
    updateCourier,
    getCourierOrders,
    updateShipmentDetails
} = require("../controllers/orderController");

const {
    verifyToken,
    requireAdmin,
    requireCourier
} = require("../middlewares/authMiddleware");

// CREATE ORDER
router.post(
    "/",
    verifyToken,
    createOrder
);

// GET ALL ORDERS
router.get(
    "/",
    verifyToken,
    getAllOrders
);

// UPDATE ORDER STATUS
router.put(
    "/:orderId/status",
    verifyToken,
    requireCourier,
    updateOrderStatus
);

// ASSIGN COURIER
router.put(
    "/:orderId/courier",
    verifyToken,
    requireAdmin,
    updateCourier
);

// SAVE TRACKING + COURIER PARTNER
router.put(
    "/:orderId/shipment",
    verifyToken,
    requireCourier,
    updateShipmentDetails
);

// GET COURIER ORDERS
router.get(
    "/courier/:email",
    verifyToken,
    requireCourier,
    getCourierOrders
);

module.exports = router;