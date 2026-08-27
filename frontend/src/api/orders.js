import client from './client';

export const getOrders = (params) => client.get('/orders', { params });
export const getOrder = (id) => client.get(`/orders/${id}`);
export const updateOrderStatus = (id, status) =>
  client.patch(`/orders/${id}/status`, { status });
export const addOrderNote = (id, content, isCustomerNote = false) =>
  client.post(`/orders/${id}/notes`, { content, customer_note: isCustomerNote });
export const updateShipment = (id, data) =>
  client.patch(`/orders/${id}/shipment`, data);
