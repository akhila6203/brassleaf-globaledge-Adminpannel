import client from './client';

export const getShippingZones = (params) => client.get('/shipping', { params });
export const getShippingZone = (id) => client.get(`/shipping/${id}`);
export const updateShippingZone = (id, data) => client.put(`/shipping/${id}`, data);
