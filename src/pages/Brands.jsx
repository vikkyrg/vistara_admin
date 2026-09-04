import React, { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Edit, Trash2, Search, X, Tag, Layers, Filter, Download } from "lucide-react";

import { db } from "../../firebase";
import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

// ========================================================
// 🔥 INLINE FIRESTORE SERVICES
// ========================================================

const brandCollection = collection(db, "brands");
const subCategoryCollection = collection(db, "subcategories");

const brandService = {
  getAll: async () => {
    const snap = await getDocs(brandCollection);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  add: async (data) => {
    const newDocRef = doc(brandCollection);
    const id = newDocRef.id;

    const newData = {
      ...data,
      id,
      createdAt: Date.now(),
      isActive: true,
    };

    await setDoc(newDocRef, newData);
    return newData;
  },

  update: async (id, data) => {
    const updateData = {
      ...data,
      id,
    };

    await updateDoc(doc(db, "brands", id), updateData);
    return updateData;
  },

  delete: async (id) => {
    await deleteDoc(doc(db, "brands", id));
  },
};

const subCategoryService = {
  getAll: async () => {
    const snap = await getDocs(subCategoryCollection);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

// ========================================================
// 🔥 MAIN COMPONENT
// ========================================================

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [formData, setFormData] = useState({
    name: "",
    subCategoryId: "",
    isActive: true,
  });

  // ========================================================
  // LOAD DATA
  // ========================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [brandData, subCatData] = await Promise.all([
        brandService.getAll(),
        subCategoryService.getAll(),
      ]);

      setBrands(brandData);
      setSubCategories(
        subCatData
          .filter((sc) => sc.isActive)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // ========================================================
  // FORM HANDLERS
  // ========================================================

  const openAddModal = () => {
    setSelectedBrand(null);
    setFormData({ name: "", subCategoryId: "", isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (brand) => {
    setSelectedBrand(brand);
    setFormData({
      name: brand.name,
      subCategoryId: brand.subCategoryId,
      isActive: brand.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (selectedBrand) {
        const updated = await brandService.update(
          selectedBrand.id,
          formData
        );

        setBrands((prev) =>
          prev.map((b) => (b.id === selectedBrand.id ? updated : b))
        );
      } else {
        const created = await brandService.add(formData);
        setBrands((prev) => [created, ...prev]);
      }

      setIsModalOpen(false);
      setFormData({ name: "", subCategoryId: "", isActive: true });
    } catch (err) {
      alert("Error saving brand");
    }

    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this brand?")) return;
    await brandService.delete(id);
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  // ========================================================
  // FILTERS
  // ========================================================

  const filteredBrands = useMemo(() => {
    let filtered = brands;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((b) =>
        b.name.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((b) => b.subCategoryId === categoryFilter);
    }

    // Active filter
    if (activeFilter !== "all") {
      const isActive = activeFilter === "active";
      filtered = filtered.filter((b) => b.isActive === isActive);
    }

    return filtered;
  }, [brands, searchTerm, categoryFilter, activeFilter]);

  const getSubCategoryName = (id) =>
    subCategories.find((sc) => sc.id === id)?.name || "—";

  // ========================================================
  // UI
  // ========================================================

  if (loading && brands.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Brand Management</h1>
          <p className="text-gray-600 mt-1">Manage and organize your product brands</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
            <div className="text-sm text-gray-600">Total Brands</div>
            <div className="text-2xl font-bold text-gray-900">{brands.length}</div>
          </div>
          
          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl flex items-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow"
          >
            <Plus size={20} /> Add New Brand
          </button>
        </div>
      </div>

      {/* STATS & CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Active Brands</div>
              <div className="text-2xl font-bold text-gray-900">
                {brands.filter(b => b.isActive !== false).length}
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Tag className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Subcategories</div>
              <div className="text-2xl font-bold text-gray-900">
                {subCategories.length}
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Layers className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Showing</div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredBrands.length}
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Filter className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* SEARCH */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              placeholder="Search brands by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* FILTERS */}
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-3 text-gray-400" size={18} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm"
              >
                <option value="all">All Subcategories</option>
                {subCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={18} />
            Refresh Data
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Download size={18} />
            Export Brands
          </button>
        </div>
      </div>

      {/* TABLE - DESKTOP */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Brand</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Subcategory</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
        
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Tag className="text-gray-300" size={48} />
                      <div className="text-gray-500">No brands found</div>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {brand.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{brand.name}</div>
                          <div className="text-sm text-gray-500">ID: {brand.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm">
                        <Layers size={14} />
                        {getSubCategoryName(brand.subCategoryId)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        brand.isActive !== false 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          brand.isActive !== false ? "bg-green-500" : "bg-red-500"
                        }`}></div>
                        {brand.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                  
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(brand)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Edit size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(brand.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* FOOTER */}
        {filteredBrands.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredBrands.length}</span> of{" "}
              <span className="font-semibold">{brands.length}</span> brands
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100">
                Previous
              </button>
              <span className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">1</span>
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE CARDS */}
      <div className="lg:hidden space-y-4">
        {filteredBrands.map((brand) => (
          <div
            key={brand.id}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {brand.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{brand.name}</div>
                  <div className="text-sm text-gray-500">ID: {brand.id.slice(0, 8)}...</div>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                brand.isActive !== false 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  brand.isActive !== false ? "bg-green-500" : "bg-red-500"
                }`}></div>
                {brand.isActive !== false ? "Active" : "Inactive"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600">Subcategory</div>
                <div className="font-medium">{getSubCategoryName(brand.subCategoryId)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Created</div>
                <div className="font-medium">
                  {brand.createdAt ? new Date(brand.createdAt).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => openEditModal(brand)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Edit size={16} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(brand.id)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
        
        {filteredBrands.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <Tag className="mx-auto text-gray-300 mb-3" size={48} />
            <div className="text-gray-500 mb-2">No brands found</div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedBrand ? "Edit Brand" : "Create New Brand"}
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  {selectedBrand ? "Update brand details" : "Add a new brand to your catalog"}
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <select
                  required
                  className="w-full p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                  value={formData.subCategoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, subCategoryId: e.target.value })
                  }
                >
                  <option value="" disabled>Select a subcategory</option>
                  {subCategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name
                </label>
                <input
                  required
                  className="w-full p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  placeholder="Enter brand name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Brand is active
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 p-3.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : selectedBrand ? "Update Brand" : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brands;