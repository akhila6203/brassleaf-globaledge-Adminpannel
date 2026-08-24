import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message;
    return Promise.reject(new Error(message));
  }
);

export default client;

export const getDashboard     = () => client.get('/dashboard');
export const getUsers         = (params) => client.get('/users', { params });
export const getUser          = (id) => client.get(`/users/${id}`);
export const getProducts      = (params) => client.get('/products', { params });
export const getProduct       = (id) => client.get(`/products/${id}`);
export const getOrders        = (params) => client.get('/orders', { params });
export const getOrder         = (id) => client.get(`/orders/${id}`);
export const getCustomers     = (params) => client.get('/customers', { params });
export const getCustomer      = (id) => client.get(`/customers/${id}`);
export const getPayments      = (params) => client.get('/payments', { params });
export const getPayment       = (orderId) => client.get(`/payments/${orderId}`);
export const getPaymentStats  = () => client.get('/payments/stats/summary');
export const getCategories    = (params) => client.get('/categories', { params });
export const getCategory      = (id) => client.get(`/categories/${id}`);
