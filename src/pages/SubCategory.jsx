import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  X,
  Edit,
  Trash2,
  Search,
  Camera,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";

import { db, storage } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { uploadToS3 } from "../utils/s3Upload";

// ========================================================
// 🔥 INLINE SERVICE (NO External Files Needed)
// ========================================================

const subCategoryCollection = collection(db, "subcategories");

// Logic moved to subCategoryService using uploadToS3 utility

const subCategoryService = {
  getAll: async () => {
    const snap = await getDocs(subCategoryCollection);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // MODIFIED: To store the document ID explicitly as a field named 'id'
  add: async (data, file) => {
    // 1. Get a new document reference first to generate the unique ID
    const newDocRef = doc(subCategoryCollection);
    const docId = newDocRef.id;

    const imageURL = await uploadToS3(file, "subcategory");

    const newData = {
      ...data,
      id: docId, // <--- Explicitly store the ID here
      image: imageURL,
      createdAt: Date.now(),
    };

    // 2. Use setDoc to write the data to the specific document reference
    await setDoc(newDocRef, newData);

    return { id: docId, ...newData };
  },

  update: async (id, data, file) => {
    const updateData = { 
      ...data,
      id: id // Ensure the internal ID field is preserved/updated
    };

    if (file) {
      updateData.image = await uploadToS3(file, "subcategory");
    }

    await updateDoc(doc(db, "subcategories", id), updateData);
    return { id, ...updateData };
  },

  delete: async (id) => {
    await deleteDoc(doc(db, "subcategories", id));
  },
};

// CATEGORY SERVICE INLINE (for dropdown)
const categoryService = {
  getAll: async () => {
    const snap = await getDocs(collection(db, "categories"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

// ========================================================
// 🔥 MAIN COMPONENT
// ========================================================

const SubCategory = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    isActive: true,
    commissionType: "",
    commissionValue: "",
    image: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const subCats = await subCategoryService.getAll();
    const cats = await categoryService.getAll();

    setSubCategories(subCats);
    setCategories(cats);
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setSelected(null);
    setFormData({
      categoryId: "",
      name: "",
      isActive: true,
      commissionType: "",
      commissionValue: "",
      image: null,
    });

    setPreviewImage(null);
    setImageFile(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelected(item);
    setFormData({
      categoryId: item.categoryId,
      name: item.name,
      isActive: item.isActive,
      commissionType: item.commissionType ?? "",
      commissionValue: item.commissionValue ?? "",
      image: item.image,
    });

    setPreviewImage(item.image);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitData = {
      categoryId: formData.categoryId,
      name: formData.name,
      isActive: formData.isActive,
      commissionType: formData.commissionType || null,
      commissionValue: formData.commissionValue
        ? parseFloat(formData.commissionValue)
        : null,
      image: formData.image,
    };

    try {
      if (selected) {
        const updated = await subCategoryService.update(
          selected.id,
          submitData,
          imageFile
        );
        setSubCategories((prev) =>
          prev.map((sc) => (sc.id === selected.id ? updated : sc))
        );
      } else {
        const created = await subCategoryService.add(submitData, imageFile);
        setSubCategories((prev) => [created, ...prev]);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Error saving subcategory");
    }

    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete subcategory?")) return;

    await subCategoryService.delete(id);
    setSubCategories((prev) => prev.filter((sc) => sc.id !== id));
  };

  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();
    return subCategories.filter(
      (item) =>
        item.name.toLowerCase().includes(t) ||
        item.categoryId.toLowerCase().includes(t)
    );
  }, [subCategories, searchTerm]);

  return (
    <div className="p-6 bg-white min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Subcategory Management</h2>
          <p className="text-gray-600 mt-2">Manage your product subcategories and commissions</p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Plus size={20} />
            <span>Add Subcategory</span>
          </button>

          <button
            onClick={loadData}
            className="bg-gray-100 hover:bg-gray-200 text-blue-600 p-3 rounded-xl shadow-md transition-all duration-300 hover:rotate-180 border border-gray-200"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* SEARCH & STATS CARD */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
              <div className="text-blue-600 font-bold text-2xl">{filtered.length}</div>
              <div className="text-gray-600 text-sm">Total Subcategories</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
              <div className="text-green-600 font-bold text-2xl">
                {subCategories.filter(c => c.isActive).length}
              </div>
              <div className="text-gray-600 text-sm">Active</div>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
            <input
              type="text"
              placeholder="Search subcategory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
            <tr>
              <th className="px-6 py-4 text-left text-white font-semibold">Image</th>
              <th className="px-6 py-4 text-left text-white font-semibold">Name</th>
              <th className="px-6 py-4 text-left text-white font-semibold">Category</th>
              <th className="px-6 py-4 text-left text-white font-semibold">Status</th>
              <th className="px-6 py-4 text-left text-white font-semibold">Commission</th>
              <th className="px-6 py-4 text-right text-white font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center text-gray-500 py-8">
                  <div className="flex justify-center items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                    <span>Loading subcategories...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-gray-500 py-8">
                  No subcategories found. Create your first subcategory!
                </td>
              </tr>
            ) : (
              filtered.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-b border-gray-100 hover:bg-blue-50 transition-all duration-300 ${
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <td className="px-6 py-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-blue-200 shadow-sm"
                        alt={item.name}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                        <Camera className="text-gray-400" size={20} />
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-gray-800 font-medium">{item.name}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                      {categories.find((c) => c.id === item.categoryId)?.name || "Unknown"}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      item.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {item.commissionType ? (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        {item.commissionValue}
                        {item.commissionType === "percent" ? "%" : " ₹"}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex space-x-2 justify-end">
                      <button
                        onClick={() => openEditModal(item)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-all duration-300 hover:scale-110"
                      >
                        <Edit size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-all duration-300 hover:scale-110"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="lg:hidden space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-blue-50 transition-all duration-300 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className="flex space-x-4">
                {item.image ? (
                  <img
                    src={item.image}
                    className="h-16 w-16 rounded-xl object-cover border-2 border-blue-200"
                    alt={item.name}
                  />
                ) : (
                  <div className="h-16 w-16 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                    <Camera className="text-gray-400" size={24} />
                  </div>
                )}

                <div>
                  <h3 className="text-gray-800 text-lg font-semibold">
                    {item.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                      {categories.find((c) => c.id === item.categoryId)?.name || "Unknown"}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {item.commissionType && (
                    <div className="mt-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        {item.commissionValue}
                        {item.commissionType === "percent" ? "%" : " ₹"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(item)}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-xl">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">
                  {selected ? "Edit Subcategory" : "Create New Subcategory"}
                </h3>

                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/80 hover:text-white p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto">
              {/* Category Dropdown */}
              <div className="mb-6">
                <label className="text-gray-700 font-medium mb-2 block">Select Category</label>
                <select
                  className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  value={formData.categoryId}
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* NAME */}
              <div className="mb-6">
                <label className="text-gray-700 font-medium mb-2 block">Subcategory Name</label>
                <input
                  className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  value={formData.name}
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter subcategory name"
                />
              </div>

              {/* ACTIVE TOGGLE */}
              <div className="flex items-center justify-between mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <label className="text-gray-700 font-medium">Active Status</label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((p) => ({ ...p, isActive: !p.isActive }))
                  }
                >
                  {formData.isActive ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 text-sm font-medium">Active</span>
                      <ToggleRight size={32} className="text-green-500" />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600 text-sm font-medium">Inactive</span>
                      <ToggleLeft size={32} className="text-red-500" />
                    </div>
                  )}
                </button>
              </div>

              {/* COMMISSION TYPE */}
              <div className="mb-6">
                <label className="text-gray-700 font-medium mb-2 block">
                  Commission Type (Optional)
                </label>
                <select
                  className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  value={formData.commissionType}
                  onChange={(e) =>
                    setFormData({ ...formData, commissionType: e.target.value })
                  }
                >
                  <option value="">None</option>
                  <option value="percent">Percent %</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              {/* COMMISSION VALUE */}
              {formData.commissionType !== "" && (
                <div className="mb-6">
                  <label className="text-gray-700 font-medium mb-2 block">
                    Commission Value
                  </label>
                  <input
                    type="number"
                    className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    value={formData.commissionValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commissionValue: e.target.value,
                      })
                    }
                    placeholder="Enter commission value"
                  />
                </div>
              )}

              {/* IMAGE UPLOAD */}
              <div className="mb-6">
                <label className="text-gray-700 font-medium mb-3 block">Subcategory Image</label>
                <div className="flex items-center justify-center">
                  <label className="h-32 w-32 bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center rounded-xl cursor-pointer hover:border-blue-500 transition-all duration-300">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {previewImage ? (
                      <img
                        src={previewImage}
                        className="w-full h-full object-cover rounded-xl"
                        alt="Preview"
                      />
                    ) : (
                      <div className="text-center">
                        <Camera className="text-blue-500 mx-auto mb-2" size={32} />
                        <span className="text-gray-600 text-sm">Upload Image</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-sm border border-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-sm disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </div>
                  ) : selected ? (
                    "Update Subcategory"
                  ) : (
                    "Create Subcategory"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubCategory;