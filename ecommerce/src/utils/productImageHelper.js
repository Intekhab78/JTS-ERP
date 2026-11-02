// Universal, neutral product SVG placeholder for products without uploaded images
export const NEUTRAL_PRODUCT_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' fill='none'%3E%3Crect width='400' height='400' fill='%23f8fafc' rx='16'/%3E%3Cpath d='M130 160h140v120H130z' stroke='%23cbd5e1' stroke-width='3' stroke-dasharray='6 6' rx='12'/%3E%3Cpath d='M165 160v-25a35 35 0 0 1 70 0v25' stroke='%2394a3b8' stroke-width='3.5' stroke-linecap='round'/%3E%3Ccircle cx='200' cy='220' r='12' fill='%23cbd5e1'/%3E%3Ctext x='50%25' y='325' text-anchor='middle' font-family='system-ui, -apple-system, sans-serif' font-size='13' font-weight='600' fill='%2394a3b8'%3ENo Image Available%3C/text%3E%3C/svg%3E";

export const FALLBACK_IMAGES = {
  default: NEUTRAL_PRODUCT_FALLBACK
};

/**
 * Normalizes any image URL (handles localhost:5000, relative /uploads/, data URIs)
 */
export const formatImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  if (!url || url === 'null' || url === 'undefined') return '';

  if (url.startsWith('data:')) return url;

  // Convert http://localhost:5000/uploads/... to /uploads/... so Vite dev proxy handles it cleanly
  if (url.includes(':5000/uploads/')) {
    return url.substring(url.indexOf('/uploads/'));
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Ensure relative upload paths have leading '/'
  if (url.startsWith('uploads/')) {
    return '/' + url;
  }
  if (!url.startsWith('/')) {
    return '/' + url;
  }
  return url;
};

/**
 * Fallback image selector: returns clean universal neutral SVG placeholder
 */
export const getFallbackImage = () => {
  return NEUTRAL_PRODUCT_FALLBACK;
};

/**
 * Main image resolver: prioritizes real uploaded images from ERP
 */
export const getProductImage = (product) => {
  if (!product) return FALLBACK_IMAGES.default;

  // 1. Check direct uploadImage string
  if (product.uploadImage && typeof product.uploadImage === 'string' && product.uploadImage.trim() !== '') {
    const formatted = formatImageUrl(product.uploadImage);
    if (formatted) return formatted;
  }

  // 2. Check images array
  if (Array.isArray(product.images) && product.images.length > 0) {
    for (const img of product.images) {
      if (img && typeof img === 'string' && img.trim() !== '') {
        const formatted = formatImageUrl(img);
        if (formatted) return formatted;
      }
    }
  }

  // 3. Check other common image fields
  if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.trim() !== '') {
    const formatted = formatImageUrl(product.imageUrl);
    if (formatted) return formatted;
  }
  if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
    const formatted = formatImageUrl(product.image);
    if (formatted) return formatted;
  }
  if (product.img && typeof product.img === 'string' && product.img.trim() !== '') {
    const formatted = formatImageUrl(product.img);
    if (formatted) return formatted;
  }

  // 4. Fallback based on name/category keywords
  return getFallbackImage(product);
};
