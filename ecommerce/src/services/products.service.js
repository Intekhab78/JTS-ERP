import apiClient from './apiClient';

export const productsService = {
  // Get product catalog with search, filters, pagination, sorting
  getProducts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/products?${query}`);
    return res.data;
  },

  // Get single product details by ID or slug
  getProductById: async (id) => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  },

  // Get categories and department hierarchy
  getCategories: async () => {
    const res = await apiClient.get('/categories');
    return res.data;
  },

  // Get search suggestions
  getSearchSuggestions: async (query) => {
    const res = await apiClient.get(`/search-suggestions?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  // Get active banners configured in ERP Admin
  getBanners: async () => {
    const res = await apiClient.get('/banners');
    return res.data;
  },

  // Get dynamic home blocks
  getHomeBlocks: async () => {
    const res = await apiClient.get('/home-blocks');
    return res.data;
  },

  // Get storefront public config
  getConfig: async () => {
    const res = await apiClient.get('/config');
    return res.data;
  }
};

export default productsService;
