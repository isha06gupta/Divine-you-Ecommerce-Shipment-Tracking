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

// GET ALL ORDERS
router.get(
    "/",
    getAllOrders
);

// CREATE ORDER
router.post(
    "/",
    createOrder
);

// UPDATE ORDER STATUS
router.put(
    "/:orderId/status",
    updateOrderStatus
);

// ASSIGN COURIER
router.put(
    "/:orderId/courier",
    updateCourier
);

// SAVE TRACKING + COURIER PARTNER
router.put(
    "/:orderId/shipment",
    updateShipmentDetails
);

// GET COURIER ORDERS
router.get(
    "/courier/:email",
    getCourierOrders
);

module.exports = router;