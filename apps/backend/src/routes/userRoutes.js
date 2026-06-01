const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    getAllCouriers,
    updateCustomer,
    uploadProfilePhoto,
    changePassword,
    getUserStats,
    upload
} = require("../controllers/userController");

const {
    verifyToken,
    requireAdmin
} = require("../middlewares/authMiddleware");

// REGISTER
router.post(
    "/register",
    registerUser
);

// LOGIN
router.post(
    "/login",
    loginUser
);

// GET ALL COURIERS
router.get(
    "/couriers",
    verifyToken,
    requireAdmin,
    getAllCouriers
);

// UPDATE CUSTOMER PROFILE
router.put(
    "/:id",
    verifyToken,
    updateCustomer
);

// PROFILE PHOTO
router.post(
    "/:id/photo",
    verifyToken,
    upload.single("photo"),
    uploadProfilePhoto
);

// CHANGE PASSWORD
router.put(
    "/:id/password",
    verifyToken,
    changePassword
);

// USER STATS
router.get(
    "/:id/stats",
    verifyToken,
    getUserStats
);

module.exports = router;