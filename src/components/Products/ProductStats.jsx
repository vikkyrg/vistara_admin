// components/ProductStats.js
import React from 'react';
import { Package, AlertTriangle, Clock, Archive } from 'lucide-react';

const ProductStats = ({ stats }) => {
  const statItems = [
    {
      title: 'All Products',
      count: stats.totalProducts,
      formattedCount: `${stats.totalProducts}`,
      icon: Package,
      color: 'bg-blue-500',
      iconBg: 'bg-blue-100',
      description: 'Total products'
    },
    {
      title: 'Out of Stock',
      count: stats.outOfStock,
      formattedCount: `${stats.outOfStock}`,
      icon: AlertTriangle,
      color: 'bg-red-500',
      iconBg: 'bg-red-100',
      description: 'Need restocking'
    },
    {
      title: 'Low Stock',
      count: stats.lowStock,
      formattedCount: `${stats.lowStock}`,
      icon: Clock,
      color: 'bg-yellow-500',
      iconBg: 'bg-yellow-100',
      description: 'Running low'
    },
    {
      title: 'In Stock',
      count: stats.inStock,
      formattedCount: `${stats.inStock}`,
      icon: Archive,
      color: 'bg-green-500',
      iconBg: 'bg-green-100',
      description: 'Adequately stocked'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {statItems.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                <Icon size={20} className={stat.color} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{stat.formattedCount}</div>
            <div className="text-sm text-gray-600">{stat.title}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.description}</div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductStats;