
import React from 'react';
import { X, Edit, Camera, Package, DollarSign, Barcode, Layers } from 'lucide-react';

const ProductDetails = ({ product, categories, subCategories, onEdit, onClose }) => {
  if (!product) return null;

  const getCategoryName = (categoryId) => {
    return categories.find(cat => cat.id === categoryId)?.name || "Unknown";
  };

  const getSubCategoryName = (subCategoryId) => {
    return subCategories.find(sub => sub.id === subCategoryId)?.name || "Unknown";
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { text: 'Out of Stock', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (stock <= 10) return { text: 'Low Stock', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { text: 'In Stock', color: 'text-green-400', bg: 'bg-green-500/20' };
  };

  const stockStatus = getStockStatus(product.stock || 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Product Details</h2>
            <p className="text-gray-600">Complete information about {product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Images & Basic Info */}
            <div className="space-y-6">
              {/* Product Images */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Camera size={20} />
                  Product Images
                </h3>
                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {product.images.map((image, index) => (
                      <img
                        key={index}
                        src={image.url || image}   // ✅ handles both cases
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg shadow-lg"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Camera size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No images available</p>
                  </div>
                )}
              </div>

              {/* Basic Information */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Package size={20} />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Product Name</span>
                    <span className="text-gray-800 font-medium">{product.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Brand</span>
                    <span className="text-gray-800">{product.brand || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Category</span>
                    <span className="text-gray-800 truncate max-w-[200px] text-right">
                      {product.categoryName || 
                       (typeof product.category === 'string' ? product.category : product.category?.category) || 
                       getCategoryName(product.category) || 
                       "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Description</span>
                    <span className="text-gray-800 text-right max-w-xs">
                      {product.description || 'No description available'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Details & Specifications */}
            <div className="space-y-6">
              {/* Pricing & Stock */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign size={20} />
                  Pricing & Inventory
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Regular Price</span>
                    <span className="text-gray-800 font-semibold text-lg">₹{product.price || 0}</span>
                  </div>
                  {(() => {
                    const regPrice = parseFloat(product.price || 0);
                    const offPrice = parseFloat(product.offerPrice || product.offerprice || product.salePrice || 0);
                    if (offPrice > 0 && offPrice < regPrice) {
                      return (
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600">Sale Price</span>
                          <span className="text-green-600 font-semibold text-lg">₹{offPrice}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Stock Quantity</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                      {product.stock || 0} units
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Stock Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                      {stockStatus.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Identification */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Barcode size={20} />
                  Product Identification
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">SKU</span>
                    <span className="text-gray-800 font-mono">{product.sku || product.basesku || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">HSN Code</span>
                    <span className="text-gray-800 font-mono">{product.hsn || product.hsncode || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Seller ID</span>
                    <span className="text-gray-800 font-mono">{product.sellerId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Variants */}
              {(product.variants?.length > 0 || product.sizevariants?.length > 0) && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Layers size={20} />
                    Variants
                  </h3>
                  <div className="space-y-2">
                    {(product.variants || product.sizevariants).map((variant, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{variant.size || variant.name || variant.sku}</span>
                          <span className="text-xs text-gray-500 font-mono text-left">{variant.sku}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium">₹{variant.price}</span>
                          <span className="text-xs text-gray-500">Stock: {variant.stock}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => onEdit(product)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors flex items-center gap-2"
          >
            <Edit size={16} />
            Edit Product
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;