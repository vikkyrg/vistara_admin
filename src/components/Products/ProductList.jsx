import React from 'react';
import {
  Plus, RefreshCw, Search, Eye,
  Edit, Trash2, Star, ShoppingCart,
  Package, IndianRupee, Layers, Filter, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductStats from './ProductStats';

const ProductList = ({
  products,
  categories,
  loading,
  loadingMore,
  hasMore,
  stats: propStats,
  searchTerm,
  filterCategory,
  onSearchChange,
  onCategoryFilterChange,
  onAddNew,
  onEdit,
  onView,
  onDelete,
  onRefresh,
  getCategoryName,
  getSubCategoryName,
  currentPage,
  pageSize,
  totalProducts,
  onPageChange
}) => {
  const [showFilters, setShowFilters] = React.useState(false);

  const visibleProducts = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filterCatId = filterCategory;
    const filterCatName = (categories || []).find(c => c.id === filterCatId)?.name?.toLowerCase();

    return products.filter(p => {
      // 1. Search Match (including brand, multi-sku fields, and keywords)
      const name = String(p.name || "").toLowerCase();
      const sku = String(p.sku || p.basesku || p.baseSku || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      const keywords = Array.isArray(p.searchKeywords) ? p.searchKeywords.join(" ").toLowerCase() : "";

      const searchMatch = !term ||
        name.includes(term) ||
        sku.includes(term) ||
        brand.includes(term) ||
        keywords.includes(term);

      // 2. Category Match (Consistency with parent)
      if (!filterCatId) return searchMatch;

      const prodCat = String(p.category || p.categoryId || p.Category || "").toLowerCase();
      const prodCatName = String(p.categoryName || "").toLowerCase();

      const categoryMatch =
        prodCat === filterCatId.toLowerCase() ||
        (filterCatName && (prodCat === filterCatName || prodCatName === filterCatName));

      return searchMatch && categoryMatch;
    });
  }, [products, searchTerm, filterCategory, categories]);

  const stats = React.useMemo(() => {
    return propStats || { totalProducts: 0, outOfStock: 0, lowStock: 0, inStock: 0 };
  }, [propStats]);

  return (
    <div className="w-full">
      {/* Search & Actions Bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search by name, SKU or brand..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3.5 border transition-all rounded-2xl shadow-sm active:scale-95 flex items-center gap-2 ${showFilters || filterCategory
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
              }`}
            title="Toggle filters"
          >
            <Filter size={20} />
            <span className="hidden sm:inline font-bold text-sm">Filter</span>
            {filterCategory && (
              <span className="bg-white text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full font-black">1</span>
            )}
          </button>
          <button
            onClick={onRefresh}
            className="p-3.5 bg-white border border-gray-100 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            title="Refresh list"
          >
            <RefreshCw size={20} className={`${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onAddNew}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Select Category</h4>
                {filterCategory && (
                  <button
                    onClick={() => onCategoryFilterChange('')}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onCategoryFilterChange('')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${!filterCategory
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                >
                  All Categories
                </button>
                {(categories || []).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => onCategoryFilterChange(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${filterCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                  >
                    {cat.name}
                    {filterCategory === cat.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Summary */}
      <div className="mb-10">
        <ProductStats stats={stats} />
      </div>

      {/* Results Section */}
      <div className="relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-bold tracking-tight">Accessing Inventory...</p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">We couldn't find any products matching your search criteria. Try a different term or add a new item.</p>
            <button
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-900 text-gray-900 rounded-2xl font-black hover:bg-gray-900 hover:text-white transition-all"
            >
              <Plus size={18} />
              Setup First Product
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-50/50 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">General Info</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Categorization</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Financials</th>
                    <th className="px-6 py-5 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">Availability</th>
                    <th className="px-8 py-5 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleProducts.map((product) => (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={product.id || product.productid}
                      className="group hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative flex-shrink-0">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0].url || product.images[0]}
                                className="w-14 h-14 rounded-2xl object-cover bg-gray-50 border border-gray-100 group-hover:scale-105 transition-transform"
                                alt={product.name}
                              />
                            ) : (
                              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                                <ShoppingCart className="text-gray-300" size={24} />
                              </div>
                            )}
                            {product.isFeatured && (
                              <div className="absolute -top-1 -right-1 bg-amber-400 p-1 rounded-full border-2 border-white shadow-sm">
                                <Star className="text-white fill-white" size={10} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-gray-900 font-black text-sm group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-1">{product.name}</div>
                            <div className="text-gray-400 text-xs font-bold font-mono mt-0.5">{product.basesku || 'NO SKU'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 w-fit px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase tracking-wide">
                            <Layers size={10} />
                            {product.categoryName || getCategoryName(product.category || product.categoryId || product.Category)}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 ml-1">
                            {product.subcategoryName || getSubCategoryName(product.subcategory || product.subcategoryId || product.Subcategory) || 'No Subcategory'}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <div className="text-gray-900 font-black flex items-center gap-0.5">
                            <IndianRupee size={12} />
                            {(() => {
                              const regPrice = parseFloat(product.price || 0);
                              const offPrice = parseFloat(product.offerPrice || product.offerprice || 0);
                              // Display the lower of the two as primary if offer exists and is valid
                              return (offPrice > 0 && offPrice < regPrice) ? offPrice.toLocaleString() : regPrice.toLocaleString();
                            })()}
                          </div>
                          {(() => {
                            const regPrice = parseFloat(product.price || 0);
                            const offPrice = parseFloat(product.offerPrice || product.offerprice || 0);
                            if (offPrice > 0 && offPrice < regPrice) {
                              return (
                                <div className="text-gray-400 text-[10px] font-bold line-through ml-1 italic opacity-60">
                                  ₹{regPrice.toLocaleString()}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${product.stock > 10 ? 'bg-emerald-50 text-emerald-600' :
                          product.stock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 10 ? 'bg-emerald-500' :
                            product.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'
                            }`} />
                          {product.stock} Units
                        </div>
                      </td>

                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onView(product)}
                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => onEdit(product)}
                            className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => onDelete(product.productid || product.id)}
                            className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {totalProducts > pageSize && (
                <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                  <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                    Page {currentPage} of {Math.ceil(totalProducts / pageSize)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1 || loading}
                      onClick={() => onPageChange(currentPage - 1)}
                      className="px-6 py-2.5 bg-white border border-gray-200 text-indigo-600 rounded-xl font-black shadow-sm disabled:opacity-50 hover:bg-indigo-50 transition-all"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, Math.ceil(totalProducts / pageSize)))].map((_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`w-10 h-10 rounded-xl font-black transition-all ${currentPage === page ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-indigo-50'}`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      disabled={!hasMore || loading}
                      onClick={() => onPageChange(currentPage + 1)}
                      className="px-6 py-2.5 bg-white border border-gray-200 text-indigo-600 rounded-xl font-black shadow-sm disabled:opacity-50 hover:bg-indigo-50 transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Card Layout */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleProducts.map((product) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={product.id || product.productid}
                  className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden"
                >
                  <div className="flex gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].url || product.images[0]}
                          className="w-20 h-20 rounded-2xl object-cover bg-gray-50"
                          alt={product.name}
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                          <ShoppingCart className="text-gray-300" size={28} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 font-black text-sm uppercase tracking-tight line-clamp-2 leading-tight mb-1">{product.name}</h4>
                      <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg w-fit uppercase mb-2">
                        {product.categoryName || getCategoryName(product.category || product.categoryId || product.Category) || 'General'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-600 font-black text-base flex items-center">
                          <IndianRupee size={14} strokeWidth={3} />
                          {(() => {
                            const regPrice = parseFloat(product.price || 0);
                            const offPrice = parseFloat(product.offerPrice || product.offerprice || regPrice);
                            return (offPrice > 0 && offPrice < regPrice) ? offPrice.toLocaleString() : regPrice.toLocaleString();
                          })()}
                        </span>
                        {(() => {
                          const regPrice = parseFloat(product.price || 0);
                          const offPrice = parseFloat(product.offerPrice || product.offerprice || regPrice);
                          if (offPrice > 0 && offPrice < regPrice) {
                            return <span className="text-gray-400 text-xs font-bold line-through">₹{regPrice.toLocaleString()}</span>
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${product.stock > 10 ? 'bg-emerald-50 text-emerald-600' :
                      product.stock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                      {product.stock} Left
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onView(product)}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => onEdit(product)}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(product.productid || product.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Mobile Load More */}
            {totalProducts > pageSize && (
              <div className="mt-8 flex flex-col gap-4 lg:hidden">
                <div className="text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Page {currentPage} of {Math.ceil(totalProducts / pageSize)}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1 || loading}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="flex-1 py-4 bg-white border border-gray-100 text-indigo-600 rounded-3xl font-black shadow-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={!hasMore || loading}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="flex-1 py-4 bg-white border border-gray-100 text-indigo-600 rounded-3xl font-black shadow-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductList;