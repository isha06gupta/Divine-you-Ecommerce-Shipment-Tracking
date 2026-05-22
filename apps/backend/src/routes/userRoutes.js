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
    getAllCouriers
);

// UPDATE CUSTOMER PROFILE
router.put(
    "/:id",
    updateCustomer
);

// PROFILE PHOTO
router.post(
    "/:id/photo",
    upload.single("photo"),
    uploadProfilePhoto
);

// CHANGE PASSWORD
router.put(
    "/:id/password",
    changePassword
);

// USER STATS
router.get(
    "/:id/stats",
    getUserStats
);

module.exports = router;