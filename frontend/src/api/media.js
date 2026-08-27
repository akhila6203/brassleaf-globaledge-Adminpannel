import client from './client';

export const getMedia = (params) => client.get('/media', { params });
export const uploadMedia = (formData) =>
  client.post('/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const deleteMedia = (id) => client.delete(`/media/${id}`);
