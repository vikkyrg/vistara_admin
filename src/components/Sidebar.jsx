import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Layers,
  Layers3,
  Tag,
  ShoppingCart,
  Ticket,
  Image,
  User,
  Users,
  UserCheck,
  Upload,
  X,
  Code,
  Package,
  Sparkles,
  ChevronRight,
  Zap,
  RotateCcw,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', },
    { path: '/orders', icon: ShoppingCart, label: 'Orders', },
    { path: '/customers', icon: UserCheck, label: 'Customers',  },
    { path: '/products', icon: FolderOpen, label: 'Products',  },
    { path: '/category', icon: Layers, label: 'Category' },
    { path: '/sub-category', icon: Layers, label: 'Sub Category' },
    // { path: '/sub-under-category', icon: Layers3, label: 'Sub Under Category' },
    // { path: '/brands', icon: Tag, label: 'Brands', },
    { path: '/sellers', icon: Users, label: 'Sellers',  },
    { path: '/coupons', icon: Ticket, label: 'Coupons' },
    { path: '/posters', icon: Image, label: 'Posters' },
    { path: '/bulk-upload', icon: Upload, label: 'JSON Upload' },
    { path: '/python-automation', icon: Code, label: 'Python Automation' },
    { path: '/returns', icon: RotateCcw, label: 'Returns & Refunds' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/30 to-violet-900/20 backdrop-blur-xl z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
  className={`w-64 bg-gradient-to-b 
  from-[#111827] via-[#1f2933] to-[#1e1b4b]
  text-white h-full fixed left-0 top-0 overflow-y-auto z-50 
  border-r border-white/10 
  shadow-2xl shadow-indigo-900/25
  transform transition-all duration-500 ease-out
  ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  lg:translate-x-0`}
>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -right-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Header with Glassmorphism */}
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-white/5 via-white/3 to-transparent backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Animated Logo */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 flex items-center justify-center shadow-xl shadow-purple-600/30">
                  <Sparkles className="w-6 h-6 text-white" fill="white" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold tracking-wide bg-gradient-to-r from-indigo-300 via-purple-200 to-violet-300 bg-clip-text text-transparent">
                  Vistaraa
                </span>
                <p className="text-xs text-indigo-300/70 font-medium tracking-wider">ADMIN PANEL</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-all duration-300 group"
            >
              <X size={20} className="text-indigo-300 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className="relative">
              <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-ping"></div>
            </div>
            <span className="text-xs font-medium text-indigo-300/80">Live Dashboard</span>
            <Zap className="w-3 h-3 text-yellow-400 ml-auto animate-pulse" />
          </div>
        </div>

        {/* Quick Stats */}
     

        {/* Navigation */}
        <nav className="relative mt-2">
          <div className="px-4 mb-3">
            <span className="text-xs font-semibold text-indigo-400/60 uppercase tracking-wider">Main Menu</span>
          </div>
          
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => window.innerWidth < 1024 && onClose()}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 border-l-4 border-indigo-400 shadow-lg shadow-indigo-500/20'
                          : 'hover:bg-white/5 hover:border-l-4 hover:border-indigo-900/30'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Hover effect line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="flex items-center space-x-3">
                          <div className={`relative p-2 rounded-lg transition-all duration-300 group-hover:scale-110 ${
                            isActive 
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-purple-500/50' 
                              : 'bg-white/5 text-indigo-300'
                          }`}>
                            <Icon size={18} className="relative z-10" />
                            {isActive && (
                              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg blur-md opacity-50"></div>
                            )}
                          </div>
                          <span className={`font-medium transition-colors duration-300 ${
                            isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                          }`}>
                            {item.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {item.notification && (
                            <span className="text-xs font-bold px-2 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full min-w-[24px] text-center">
                              {item.notification}
                            </span>
                          )}
                          {item.badge && (
                            <span className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight size={16} className="text-indigo-400/50 group-hover:text-indigo-300 transition-colors" />
                        </div>
                        
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-2 h-2 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>


        {/* Decorative elements */}
        <div className="absolute top-1/3 -right-2 w-1 h-20 bg-gradient-to-b from-indigo-500/30 via-purple-500/30 to-transparent"></div>
        <div className="absolute bottom-1/3 -right-2 w-1 h-20 bg-gradient-to-b from-purple-500/30 via-violet-500/30 to-transparent"></div>
      </div>
    </>
  );
};

export default Sidebar;