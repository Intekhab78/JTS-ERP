import { getActiveConfig } from '../config/api';

// Universal, neutral product SVG placeholder for products without uploaded images
export const NEUTRAL_PRODUCT_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' fill='none'%3E%3Crect width='400' height='400' fill='%23f8fafc' rx='16'/%3E%3Cpath d='M130 160h140v120H130z' stroke='%23cbd5e1' stroke-width='3' stroke-dasharray='6 6' rx='12'/%3E%3Cpath d='M165 160v-25a35 35 0 0 1 70 0v25' stroke='%2394a3b8' stroke-width='3.5' stroke-linecap='round'/%3E%3Ccircle cx='200' cy='220' r='12' fill='%23cbd5e1'/%3E%3Ctext x='50%25' y='325' text-anchor='middle' font-family='system-ui, -apple-system, sans-serif' font-size='13' font-weight='600' fill='%2394a3b8'%3ENo Image Available%3C/text%3E%3C/svg%3E";

export const FALLBACK_IMAGES = {
  default: NEUTRAL_PRODUCT_FALLBACK
};

/**
 * Normalizes any image URL (handles localhost:5000, relative /uploads/, data URIs)
 * Directly prefixes with the active backend URL so images load reliably
 */
export const formatImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  if (!url || url === 'null' || url === 'undefined') return '';

  if (url.startsWith('data:')) return url;

    const active = getActiveConfig();

    // If it contains legacy localhost:5000, rewrite to active backend URL
    if (url.includes('localhost:5000')) {
      return url.replace(/http:\/\/localhost:5000/g, active.backendUrl);
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Prepend active backend URL to relative upload paths (e.g. /uploads/...)
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${active.backendUrl}${cleanPath}`;
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

    // 3. Check legacy product.image
    if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
      const formatted = formatImageUrl(product.image);
      if (formatted) return formatted;
    }

    // 4. Return clean SVG fallback
    return FALLBACK_IMAGES.default;
  };

  /**
   * Image error handler to gracefully fallback to placeholder (with production server retry)
   */
  export const handleImageError = (e) => {
    if (!e?.target) return;
    const currentSrc = e.target.src || '';

    // If failed on localhost, retry from production server before showing fallback
    if (currentSrc.includes('localhost:5000') || currentSrc.includes('127.0.0.1:5000')) {
      const prodUrl = currentSrc.replace(/http:\/\/(localhost|127\.0\.0\.1):5000/g, 'https://erpapi.jtsmiddleeast.com');
      if (prodUrl !== currentSrc) {
        e.target.src = prodUrl;
        return;
      }
    }

    if (e.target.src !== NEUTRAL_PRODUCT_FALLBACK) {
      e.target.onerror = null;
      e.target.src = NEUTRAL_PRODUCT_FALLBACK;
    }
  };
