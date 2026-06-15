require("dotenv").config();

const express = require("express");

const cors = require("cors");

const orderRoutes =
require("./routes/orderRoutes");

const trackingRoutes =
require("./routes/trackingRoutes");

const userRoutes =
require("./routes/userRoutes");
const productRoutes =
require("./routes/productRoutes");

const app = express();

const addressRoutes =require("./routes/addressRoutes");

const path = require("path");

app.use(cors({
    origin: true,
    credentials: true
}));

app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

app.use(express.json());
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "../uploads")
    )
);

// ROUTES
app.use( "/api/orders",orderRoutes );

app.use( "/api/users",userRoutes);
app.use("/api/products", productRoutes);

app.use("/api/tracking", trackingRoutes );

app.use( "/api/address", addressRoutes );

const PORT =
    process.env.PORT || 7000;

app.listen(PORT, () => {

    console.log(
        `Custom API running on port ${PORT}`
    );
});
