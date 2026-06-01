require("dotenv").config();

const express = require("express");

const cors = require("cors");

const orderRoutes =
require("./routes/orderRoutes");

const trackingRoutes =
require("./routes/trackingRoutes");

const userRoutes =
require("./routes/userRoutes");

const app = express();

const addressRoutes =require("./routes/addressRoutes");

const path = require("path");

app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:3000",
        "http://localhost:7000"
    ],
    credentials: true
}));

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

app.use("/api/tracking", trackingRoutes );

app.use( "/api/address", addressRoutes );

const PORT =
    process.env.PORT || 7000;

app.listen(PORT, () => {

    console.log(
        `Custom API running on port ${PORT}`
    );
});
