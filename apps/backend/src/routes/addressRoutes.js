const express = require("express");

const router = express.Router();

const {
    getAddresses,
    createAddress,
    updateAddress
} = require("../controllers/addressController");

// GET USER ADDRESSES
router.get(
    "/:customerId",
    getAddresses
);

// CREATE ADDRESS
router.post(
    "/create",
    createAddress
);

// UPDATE ADDRESS
router.put(
    "/update/:customerId",
    updateAddress
);

module.exports = router;