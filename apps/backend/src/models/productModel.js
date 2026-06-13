const { query } = require("../db/db");

const getAllProducts = async () => {
  const productsResult = await query(`
    SELECT *
    FROM products
    WHERE is_active = true
    ORDER BY id
  `);

  const products = productsResult.rows;

  for (const product of products) {
    const variantsResult = await query(
      `
      SELECT
        id,
        title,
        price,
        stock_quantity
      FROM product_variants
      WHERE product_id = $1
      ORDER BY id
    `,
      [product.id]
    );

    const imagesResult = await query(
      `
      SELECT
        id,
        image_url
      FROM product_images
      WHERE product_id = $1
      ORDER BY id
    `,
      [product.id]
    );

    product.variants = variantsResult.rows;
    product.images = imagesResult.rows;
  }

  return products;
};

module.exports = {
  getAllProducts,
};