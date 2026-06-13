const productModel = require("../models/productModel");

const getProducts = async (req, res) => {
  try {
    const products = await productModel.getAllProducts();

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

module.exports = {
  getProducts,
};