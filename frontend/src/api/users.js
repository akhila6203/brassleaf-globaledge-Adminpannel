import client from './client';

export const getUsers = (params) => client.get('/users', { params });
export const getUser = (id) => client.get(`/users/${id}`);
export const createUser = (data) => client.post('/users', data);
export const updateUser = (id, data) => client.put(`/users/${id}`, data);
export const deleteUser = (id) => client.delete(`/users/${id}`);
