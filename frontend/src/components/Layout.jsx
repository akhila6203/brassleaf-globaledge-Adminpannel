import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  UserCircle,
  CreditCard,
  Tag,
  Leaf,
} from 'lucide-react';

const nav = [
  { to: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/admin/users',      label: 'Users',      icon: UserCircle },
  { to: '/admin/products',   label: 'Products',   icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/orders',     label: 'Orders',     icon: ShoppingCart },
  { to: '/admin/customers',  label: 'Customers',  icon: Users },
  { to: '/admin/payments',   label: 'Payments',   icon: CreditCard },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
          <Leaf className="text-emerald-600" size={24} />
          <span className="text-xl font-bold text-gray-800">Brassleaf</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">Read-only admin view</p>
          <p className="text-xs text-gray-400">Tables prefixed wpwd_</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
