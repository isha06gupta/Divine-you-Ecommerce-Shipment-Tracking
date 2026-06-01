const jwt = require("jsonwebtoken");
const multer = require("multer");
const { query } = require("../db/db");

const bcrypt = require("bcryptjs");
const storage = multer.diskStorage({

    destination: function(req, file, cb) {

        cb(null, "uploads/");
    },

    filename: function(req, file, cb) {

        cb(
            null,
            Date.now() +
            "-" +
            file.originalname
        );
    }
});

const upload = multer({
    storage
});

// REGISTER USER
const registerUser = async (req, res) => {

    try {

        const {
            first_name,
            last_name,
            email,
            password,
            role,
            phone
        } = req.body;

        // CHECK EXISTING USER
        const existingUser = await query(
            `
            SELECT *
            FROM customers
            WHERE email = $1
            `,
            [email]
        );

        if (existingUser.rows.length > 0) {

            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }

        // HASH PASSWORD
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // INSERT USER
        const result = await query(
            `
            INSERT INTO customers (
                first_name,
                last_name,
                email,
                password,
                role,
                phone
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [
                first_name,
                last_name,
                email,
                hashedPassword,
                role || "user",
                phone
            ]
        );

        res.status(201).json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
};

// LOGIN USER
const loginUser = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        const result = await query(
            `
            SELECT *
            FROM customers
            WHERE email = $1
            `,
            [email]
        );

        if (result.rows.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid email"
            });
        }

        const user = result.rows[0];

        const isPasswordValid =
        await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {

            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // JWT TOKEN
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({

            success: true,

            token,

            user: {

                id: user.id,

                first_name:
                    user.first_name,

                last_name:
                    user.last_name,

                email:
                    user.email,

                role:
                    user.role,

                phone:
                    user.phone,

                address:
                    user.address,

                company_name:
                    user.company_name,

                profile_photo:
                    user.profile_photo
            }
        });

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Login failed"
        });
    }
};
// GET ALL COURIERS
const getAllCouriers = async (req, res) => {

    try {

        const result = await query(
            `
            SELECT
                id,
                first_name,
                last_name,
                email,
                phone,
                company_name,
                role,
                created_at
            FROM customers
            WHERE LOWER(role) = 'courier'
            ORDER BY created_at DESC
            `
        );

        res.json({
            success: true,
            couriers: result.rows
        });

    } catch (error) {

        console.error(
            "GET COURIERS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch couriers"
        });
    }
};

// UPDATE CUSTOMER PROFILE
const updateCustomer = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            first_name,
            last_name,
            phone,
            address
        } = req.body;

        const result = await query(
            `
            UPDATE customers
            SET
                first_name = $1,
                last_name = $2,
                phone = $3,
                address = $4,
                updated_at = NOW()
            WHERE id = $5
            RETURNING *
            `,
            [
                first_name,
                last_name,
                phone,
                address,
                id
            ]
        );

        res.json({
            success: true,
            customer: result.rows[0]
        });

    } catch (error) {

        console.error(
            "UPDATE CUSTOMER ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update profile"
        });
    }
};
const uploadProfilePhoto = async (req, res) => {

    try {

        const { id } = req.params;

        const imagePath =
            req.file
            ? `/uploads/${req.file.filename}`
            : null;

        const result = await query(
            `
            UPDATE customers
            SET profile_photo = $1
            WHERE id = $2
            RETURNING *
            `,
            [
                imagePath,
                id
            ]
        );

        res.json({
            success:true,
            photo:imagePath,
            customer:result.rows[0]
        });

    } catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Photo upload failed"
        });
    }
};

const changePassword = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            currentPassword,
            newPassword
        } = req.body;

        const userResult = await query(
            `
            SELECT *
            FROM customers
            WHERE id = $1
            `,
            [id]
        );

        if(userResult.rows.length === 0){

            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        }

        const user =
            userResult.rows[0];

        const isMatch =
            await bcrypt.compare(
                currentPassword,
                user.password
            );

        if(!isMatch){

            return res.status(401).json({
                success:false,
                message:"Current password incorrect"
            });
        }

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                10
            );

        await query(
            `
            UPDATE customers
            SET password = $1
            WHERE id = $2
            `,
            [
                hashedPassword,
                id
            ]
        );

        res.json({
            success:true,
            message:"Password updated"
        });

    } catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Password update failed"
        });
    }
};

const getUserStats = async (req, res) => {

    try {

        const { id } = req.params;

        const totalOrders = await query(
            `
            SELECT COUNT(*) AS total
            FROM orders
            WHERE customer_id = $1
            `,
            [id]
        );

        const deliveredOrders = await query(
            `
            SELECT COUNT(*) AS total
            FROM orders
            WHERE customer_id = $1
            AND LOWER(order_status) = 'delivered'
            `,
            [id]
        );

        const pendingOrders = await query(
            `
            SELECT COUNT(*) AS total
            FROM orders
            WHERE customer_id = $1
            AND LOWER(order_status) != 'delivered'
            `,
            [id]
        );

        const addressResult = await query(
            `
            SELECT *
            FROM shipment_address
            WHERE customer_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [id]
        );

        res.json({
            success:true,

            stats:{
                total:
                totalOrders.rows[0].total,

                delivered:
                deliveredOrders.rows[0].total,

                pending:
                pendingOrders.rows[0].total
            },

            address:
            addressResult.rows[0] || null
        });

    } catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Failed to load stats"
        });
    }
};
module.exports = {
    registerUser,
    loginUser,
    getAllCouriers,
    updateCustomer,
    uploadProfilePhoto,
    changePassword,
    getUserStats,
    upload
};