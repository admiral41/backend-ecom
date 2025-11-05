/**
 * Generate unique SKU for product variants
 * Format: BRAND-CATEGORY-COLOR-SIZE-SEQ
 */

const generateSKU = (productName, brand, category, color, size = '', sequence = 1) => {
  // Clean and format components
  const brandCode = brand
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase();

  const categoryCode = category
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase();

  const colorCode = color
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 2)
    .toUpperCase();

  const sizeCode = size 
    ? size.toString().toUpperCase().padStart(2, '0')
    : '00';

  const seqCode = String(sequence).padStart(3, '0');

  return `${brandCode}-${categoryCode}-${colorCode}-${sizeCode}-${seqCode}`;
};

/**
 * Generate SKU for product variants during creation
 */
const generateVariantSKUs = (product, variants) => {
  const { name, brand, category } = product;
  
  return variants.map((variant, index) => {
    const sku = generateSKU(
      name,
      brand,
      category?.name || 'GEN',
      variant.color,
      variant.size,
      index + 1
    );
    
    return {
      ...variant,
      sku,
      barcode: sku // Can be different from SKU if needed
    };
  });
};

/**
 * Generate tracking ID for repairs
 */
const generateTrackingId = (type = 'REP') => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${type}-${year}${month}${day}-${random}`;
};

/**
 * Generate order number
 */
const generateOrderNumber = (type = 'ORD') => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  
  return `${type}-${year}${month}-${random}${timestamp}`;
};

module.exports = {
  generateSKU,
  generateVariantSKUs,
  generateTrackingId,
  generateOrderNumber
};