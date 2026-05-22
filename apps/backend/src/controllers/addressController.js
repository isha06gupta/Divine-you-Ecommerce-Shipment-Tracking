const { query } = require("../db/db");

// GET USER ADDRESSES
const getAddresses = async (req, res) => {

    try {

        const customerId = req.params.customerId;

        const result = await query(
            `
            SELECT *
            FROM shipment_address
            WHERE customer_id = $1
            ORDER BY created_at DESC
            `,
            [customerId]
        );

        res.json({
            success: true,
            addresses: result.rows
        });

    } catch (error) {

        console.error(
            "GET ADDRESS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch addresses"
        });
    }
};

// CREATE ADDRESS
const createAddress = async (req, res) => {

    try {

        const {
            customer_id,
            first_name,
            last_name,
            phone,
            address_1,
            city,
            province,
            postal_code,
            country_code
        } = req.body;

        const result = await query(
            `
            INSERT INTO shipment_address (
                customer_id,
                first_name,
                last_name,
                phone,
                address_1,
                city,
                province,
                postal_code,
                country_code
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
            `,
            [
                customer_id,
                first_name,
                last_name,
                phone,
                address_1,
                city,
                province,
                postal_code,
                country_code
            ]
        );

        res.status(201).json({
            success: true,
            address: result.rows[0]
        });

    } catch (error) {

        console.error(
            "CREATE ADDRESS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create address"
        });
    }
};
const updateAddress = async (req, res) => {

    try {

        const { customerId } = req.params;

        const {
            first_name,
            last_name,
            phone,
            address_1,
            city,
            province,
            postal_code,
            country_code
        } = req.body;

        const existingAddress = await query(
            `
            SELECT *
            FROM shipment_address
            WHERE customer_id = $1
            `,
            [customerId]
        );

        let result;

        if(existingAddress.rows.length > 0){

            result = await query(
                `
                UPDATE shipment_address
                SET
                    first_name = $1,
                    last_name = $2,
                    phone = $3,
                    address_1 = $4,
                    city = $5,
                    province = $6,
                    postal_code = $7,
                    country_code = $8
                WHERE customer_id = $9
                RETURNING *
                `,
                [
                    first_name,
                    last_name,
                    phone,
                    address_1,
                    city,
                    province,
                    postal_code,
                    country_code,
                    customerId
                ]
            );

        } else {

            result = await query(
                `
                INSERT INTO shipment_address (
                    customer_id,
                    first_name,
                    last_name,
                    phone,
                    address_1,
                    city,
                    province,
                    postal_code,
                    country_code
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING *
                `,
                [
                    customerId,
                    first_name,
                    last_name,
                    phone,
                    address_1,
                    city,
                    province,
                    postal_code,
                    country_code
                ]
            );
        }

        res.json({
            success:true,
            address:result.rows[0]
        });

    } catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Failed to save address"
        });
    }
};
module.exports = {
    getAddresses,
    createAddress,
    updateAddress
};