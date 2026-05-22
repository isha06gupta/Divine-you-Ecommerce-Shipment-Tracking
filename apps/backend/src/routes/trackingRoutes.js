const express = require("express");

const router = express.Router();

const { query } = require("../db/db");

router.post("/", async (req, res) => {

    try {

        const {
            order_id,
            shipment_id,
            tracking_status,
            tracking_message,
            location,
            courier_name
        } = req.body;

        const result = await query(
            `
            INSERT INTO shipment_tracking (
                order_id,
                shipment_id,
                tracking_status,
                tracking_message,
                location,
                courier_name,
                created_at
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                NOW()
            )
            RETURNING *
            `,
            [
                order_id,
                shipment_id,
                tracking_status,
                tracking_message,
                location,
                courier_name
            ]
        );

        res.json({
            success: true,
            tracking: result.rows[0]
        });

    } catch (error) {

        console.error(
            "TRACKING CREATE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create tracking"
        });
    }
});

// GET TRACKING USING SHIPMENT ID
router.get("/:shipmentId", async (req, res) => {

    try {

        const { shipmentId } = req.params;

        // GET ORDER
        const orderResult = await query(
            `
            SELECT
                order_id,
                shipment_id,
                courier_name,
                order_status,
                created_at
            FROM orders
            WHERE shipment_id = $1
            `,
            [shipmentId]
        );

        if (orderResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Shipment not found"
            });
        }

        // GET TRACKING TIMELINE
        const trackingResult = await query(
            `
            SELECT *
            FROM shipment_tracking
            WHERE shipment_id = $1
            ORDER BY created_at ASC
            `,
            [shipmentId]
        );

        res.json({
            success: true,

            order: orderResult.rows[0],

            tracking: trackingResult.rows
        });

    } catch (error) {

        console.error(
            "TRACKING ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch tracking"
        });
    }
});

module.exports = router;