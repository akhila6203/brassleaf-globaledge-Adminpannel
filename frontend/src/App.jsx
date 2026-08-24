import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard      from './pages/Dashboard';
import Users          from './pages/Users';
import UserDetail     from './pages/UserDetail';
import Products       from './pages/Products';
import ProductDetail  from './pages/ProductDetail';
import Orders         from './pages/Orders';
import OrderDetail    from './pages/OrderDetail';
import Customers      from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Payments       from './pages/Payments';
import Categories     from './pages/Categories';
import CategoryDetail from './pages/CategoryDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin" element={<Layout />}>
          <Route index                     element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"          element={<Dashboard />} />
          <Route path="users"              element={<Users />} />
          <Route path="users/:id"          element={<UserDetail />} />
          <Route path="products"           element={<Products />} />
          <Route path="products/:id"       element={<ProductDetail />} />
          <Route path="categories"         element={<Categories />} />
          <Route path="categories/:id"     element={<CategoryDetail />} />
          <Route path="orders"             element={<Orders />} />
          <Route path="orders/:id"         element={<OrderDetail />} />
          <Route path="customers"          element={<Customers />} />
          <Route path="customers/:id"      element={<CustomerDetail />} />
          <Route path="payments"           element={<Payments />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
