import client from './client';

export const getCoupons = (params) => client.get('/coupons', { params });
export const getCoupon = (id) => client.get(`/coupons/${id}`);
export const createCoupon = (data) => client.post('/coupons', data);
export const updateCoupon = (id, data) => client.put(`/coupons/${id}`, data);
export const deleteCoupon = (id) => client.delete(`/coupons/${id}`);
