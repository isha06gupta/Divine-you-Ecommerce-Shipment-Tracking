const { query } = require("../db/db");

// FORMAT TRACKING STATUS
function formatTrackingStatus(status){

    if(!status) return "Order Placed";

    return status
        .replace(/_/g," ")
        .replace(/\b\w/g,l => l.toUpperCase());
}

// CREATE ORDER
const createOrder = async (req,res) => {

    try{

        const {
            customer,
            items,
            subtotal,
            shipping_charge,
            total_amount,
            payment_status,
            order_status,
            razorpay_payment_id
        } = req.body;

        const existingCustomer =
        await query(
            `
            SELECT *
            FROM customers
            WHERE email = $1
            `,
            [customer.email]
        );

        let customerId;

        if(existingCustomer.rows.length > 0){

            customerId =
            existingCustomer.rows[0].id;

        }else{

            const customerResult =
            await query(
                `
                INSERT INTO customers(
                    first_name,
                    email,
                    phone,
                    address
                )
                VALUES($1,$2,$3,$4)
                RETURNING *
                `,
                [
                    customer.name,
                    customer.email,
                    customer.phone,
                    customer.address
                ]
            );

            customerId =
            customerResult.rows[0].id;
        }

        const orderId =
            "ORD-" + Date.now();

        const orderResult =
        await query(
            `
            INSERT INTO orders(
                order_id,
                customer_id,
                razorpay_payment_id,
                subtotal,
                shipping_charge,
                total_amount,
                payment_status,
                order_status
            )
            VALUES($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *
            `,
            [
                orderId,
                customerId,
                razorpay_payment_id,
                subtotal,
                shipping_charge || 50,
                total_amount,
                payment_status,
                order_status
            ]
        );

        const orderData =
            orderResult.rows[0];

        await query(
            `
            INSERT INTO shipment_tracking(
                order_id,
                tracking_status,
                tracking_message,
                location,
                courier_name,
                shipment_id
            )
            VALUES($1,$2,$3,$4,$5,$6)
            `,
            [
    orderData.id,
    "Order Placed",
    "Order has been placed successfully",
    "Warehouse",
    null,
    null
]
        );

        for(const item of items){

            await query(
                `
                INSERT INTO order_items(
                    order_id,
                    product_id,
                    product_title,
                    quantity,
                    price,
                    image_url
                )
                VALUES($1,$2,$3,$4,$5,$6)
                `,
                [
                    orderData.id,
                    item.id,
                    item.product_title || item.title || item.name,
                    item.quantity,
                    item.price,
                    item.thumbnail || item.image || ""
                ]
            );
        }

        res.status(201).json({
            success:true,
            order:orderData
        });

    }catch(error){

        console.error(
            "ORDER ERROR:",
            error
        );

        res.status(500).json({
            success:false,
            message:"Failed to create order"
        });
    }
};

// GET ALL ORDERS
const getAllOrders = async (req,res) => {

    try{

        const ordersResult =
        await query(
            `
            SELECT
                orders.*,

                customers.first_name,
                customers.last_name,
                customers.email,
                customers.phone,

                (
                    SELECT CONCAT(
                        sa.address_1, ', ',
                        sa.city, ', ',
                        sa.province, ' - ',
                        sa.postal_code
                    )
                    FROM shipment_address sa
                    WHERE sa.customer_id = customers.id
                    ORDER BY sa.created_at DESC
                    LIMIT 1
                ) AS address

            FROM orders

            JOIN customers
            ON orders.customer_id = customers.id

            ORDER BY orders.created_at DESC
            `
        );

        const orders =
            ordersResult.rows;

        for(const order of orders){

            const itemsResult =
            await query(
                `
                SELECT *
                FROM order_items
                WHERE order_id = $1
                `,
                [order.id]
            );

            order.items =
                itemsResult.rows;
        }

        res.json({
            success:true,
            orders
        });

    }catch(error){

        console.error(
            "GET ORDERS ERROR:",
            error
        );

        res.status(500).json({
            success:false,
            message:"Failed to fetch orders"
        });
    }
};

// UPDATE ORDER STATUS
const updateOrderStatus = async (req,res) => {

    try{

        const { orderId } =
            req.params;

        const {
            status,
            location,
            message
        } = req.body;

        const updatedOrder =
        await query(
            `
            UPDATE orders
            SET
                order_status = $1,
                updated_at = NOW()
            WHERE order_id = $2
            RETURNING *
            `,
            [
                status,
                orderId
            ]
        );

        if(updatedOrder.rows.length === 0){

            return res.status(404).json({
                success:false,
                message:"Order not found"
            });
        }

        const order =
            updatedOrder.rows[0];

        await query(
            `
            INSERT INTO shipment_tracking(
                order_id,
                shipment_id,
                tracking_status,
                tracking_message,
                location,
                courier_name,
                created_at
            )
            VALUES($1,$2,$3,$4,$5,$6,NOW())
            `,
            [
                order.id,
                order.shipment_id,
                formatTrackingStatus(status),
                message ||
                `Shipment updated to ${formatTrackingStatus(status)}`,
                location || "Transit Hub",
                order.courier_name
            ]
        );

        res.json({
            success:true,
            order
        });

    }catch(error){

        console.error(
            "UPDATE STATUS ERROR:",
            error
        );

        res.status(500).json({
            success:false,
            message:"Failed to update status"
        });
    }
};

// ASSIGN COURIER
const updateCourier = async (req,res) => {

    try{

        const { orderId } =
            req.params;

        const {
            courier_name,
            courier_id,
            assigned_courier_email
        } = req.body;

        const result =
        await query(
            `
            UPDATE orders
            SET
                courier_name = $1,
                courier_id = $2,
                assigned_courier_id = $3,
                assigned_courier_email = $4,
                updated_at = NOW()
            WHERE order_id = $5
            RETURNING *
            `,
            [
                courier_name,
                courier_id,
                courier_id,
                assigned_courier_email,
                orderId
            ]
        );

        res.json({
            success:true,
            order:result.rows[0]
        });

    }catch(error){

        console.error(
            "UPDATE COURIER ERROR:",
            error
        );

        res.status(500).json({
            success:false,
            message:"Failed to assign courier"
        });
    }
};

const updateShipmentDetails = async (req, res) => {

    try {

        const { orderId } =
            req.params;

        const {
            tracking_id,
            courier_name,
            tracking_status
        } = req.body;

        const shipmentId =
            "SHIP-" + Date.now();
const result =
await query(
    `
    UPDATE orders
    SET
        tracking_id = $1,
        courier_name = $2,
        shipment_id = $3,
        order_status = $4,
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
    `,
    [
        tracking_id,
        courier_name,
        shipmentId,
        tracking_status,
        orderId
    ]
);
await query(
    `
    INSERT INTO shipment_tracking(
        order_id,
        shipment_id,
        tracking_status,
        tracking_message,
        location,
        courier_name,
        created_at
    )
    VALUES($1,$2,$3,$4,$5,$6,NOW())
    `,
    [
        orderId,
        shipmentId,
        tracking_status,
        `Shipment updated to ${tracking_status}`,
        "Transit Hub",
        courier_name
    ]
);
res.json({
    success: true,
    order: result.rows[0]
});

    } catch (error) {

        console.error(
            "SHIPMENT UPDATE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Shipment update failed"
        });
    }
};

// GET COURIER ORDERS
const getCourierOrders = async (req,res) => {

    try{

        const { email } =
            req.params;

        const result =
        await query(
            `
            SELECT
                orders.*,
                customers.first_name,
                customers.email,
                customers.phone,

                (
                    SELECT CONCAT(
                        sa.address_1, ', ',
                        sa.city, ', ',
                        sa.province, ' - ',
                        sa.postal_code
                    )
                    FROM shipment_address sa
                    WHERE sa.customer_id = customers.id
                    ORDER BY sa.created_at DESC
                    LIMIT 1
                ) AS address

            FROM orders

            JOIN customers
            ON orders.customer_id = customers.id

            WHERE orders.assigned_courier_email = $1

            ORDER BY orders.created_at DESC
            `,
            [email]
        );

        const orders =
            result.rows;

        for(const order of orders){

            const itemsResult =
            await query(
                `
                SELECT *
                FROM order_items
                WHERE order_id = $1
                `,
                [order.id]
            );

            order.items =
                itemsResult.rows;
        }

        res.json({
            success:true,
            orders
        });

    }catch(error){

        console.error(
            "GET COURIER ORDERS ERROR:",
            error
        );

        res.status(500).json({
            success:false,
            message:"Failed to fetch courier orders"
        });
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    updateOrderStatus,
    updateCourier,
    updateShipmentDetails,
    getCourierOrders
};