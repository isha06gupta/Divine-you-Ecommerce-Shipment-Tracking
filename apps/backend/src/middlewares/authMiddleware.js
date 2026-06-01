const jwt = require("jsonwebtoken");

const verifyToken = (req,res,next) => {

    try{

        const authHeader =
        req.headers.authorization;

        if(
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ){

            return res.status(401).json({
                success:false,
                message:"No token provided"
            });
        }

        const token =
        authHeader.split(" ")[1];

        const decoded =
        jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    }catch(error){

        return res.status(401).json({
            success:false,
            message:"Invalid token"
        });
    }
};

const requireAdmin = (req,res,next) => {

    if(req.user.role !== "admin"){

        return res.status(403).json({
            success:false,
            message:"Admin access required"
        });
    }

    next();
};

const requireCourier = (req,res,next) => {

    if(
        req.user.role !== "courier" &&
        req.user.role !== "admin"
    ){

        return res.status(403).json({
            success:false,
            message:"Courier access required"
        });
    }

    next();
};

module.exports = {
    verifyToken,
    requireAdmin,
    requireCourier
};