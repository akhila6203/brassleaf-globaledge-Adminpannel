import client from './client';

export const getCategories = (params) => client.get('/categories', { params });
export const getCategory = (id) => client.get(`/categories/${id}`);
export const createCategory = (data) => client.post('/categories', data);
export const updateCategory = (id, data) => client.put(`/categories/${id}`, data);
export const deleteCategory = (id) => client.delete(`/categories/${id}`);
export const assignCategoryProducts = (id, product_ids, action = 'add') =>
  client.post(`/categories/${id}/products`, { product_ids, action });
