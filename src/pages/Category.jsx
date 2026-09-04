import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  X,
  Camera,
  Edit,
  Trash2,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// FIREBASE IMPORTS
import { db, storage } from "../../firebase";
import {
  collection,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { uploadToS3 } from "../utils/s3Upload";


const categoryCollection = collection(db, "categories");

// Logic moved to categoryService using uploadToS3 utility

const categoryService = {
  /** Retrieves all categories from Firestore. */
  getAll: async () => {
    const snap = await getDocs(categoryCollection);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /** * MODIFIED: Uses setDoc/doc to force the Document ID into the data payload.
   */
  add: async (data, files) => {
    const image = await uploadToS3(files.image, "category_images");
    const banner = await uploadToS3(files.banner, "category_banners");
    const icon = await uploadToS3(files.icon, "category_icons");

    // 1. Create a reference to a new document with an auto-generated ID
    const docRef = doc(categoryCollection);
    const newId = docRef.id; // <-- The ID we need to store redundantly

    const newData = {
      ...data,
      id: newId, // <-- Explicitly adding the ID to the data payload
      image,
      banner,
      icon,
      createdAt: Date.now(),
    };

    await setDoc(docRef, newData); 
    
    return newData; // newData already contains the 'id' field
  },

  update: async (id, data, files) => {
    const updated = { 
        ...data,
        id: id // <-- Ensure 'id' is always in the update payload
    };

    if (files.image)
      updated.image = await uploadToS3(files.image, "category_images");
    if (files.banner)
      updated.banner = await uploadToS3(files.banner, "category_banners");
    if (files.icon) 
      updated.icon = await uploadToS3(files.icon, "category_icons");

    // The 'id' field is written along with other updates
    await updateDoc(doc(db, "categories", id), updated);
    return { id, ...updated };
  },

  /** Deletes a category by its ID. (No change needed) */
  delete: async (id) => {
    await deleteDoc(doc(db, "categories", id));
  },
};


const defaultMobileAttributes = ["RAM", "ROM", "Processor", "Battery Capacity"];

const Category = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);

  const [previewImage, setPreviewImage] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [previewIcon, setPreviewIcon] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
    commissionType: "percent",
    commissionValue: 0.0,
    requiredAttributes: [],
    image: null,
    banner: null,
    icon: null,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- Data Fetching ---

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const fetched = await categoryService.getAll();
      setCategories(fetched);
    } catch (err) {
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Form Handlers ---

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === "number" ? parseFloat(value) : value;

    let updated = { ...formData, [name]: finalValue };

    if (name === "name" && value.toLowerCase().includes("mobile")) {
      updated.requiredAttributes = [
        ...new Set([...updated.requiredAttributes, ...defaultMobileAttributes]),
      ];
    } else if (name === "name" && !value.toLowerCase().includes("mobile")) {
      updated.requiredAttributes = updated.requiredAttributes.filter(
        (attr) => !defaultMobileAttributes.includes(attr)
      );
    }

    setFormData(updated);
  };

  const addAttribute = (attr) => {
    attr = attr.trim();
    if (!attr) return;

    if (!formData.requiredAttributes.includes(attr)) {
      setFormData((prev) => ({
        ...prev,
        requiredAttributes: [...prev.requiredAttributes, attr],
      }));
    }
  };

  const removeAttribute = (attr) => {
    setFormData((prev) => ({
      ...prev,
      requiredAttributes: prev.requiredAttributes.filter((a) => a !== attr),
    }));
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "image") {
        setPreviewImage(reader.result);
        setImageFile(file);
      }
      if (type === "banner") {
        setPreviewBanner(reader.result);
        setBannerFile(file);
      }
      if (type === "icon") {
        setPreviewIcon(reader.result);
        setIconFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearFile = (type) => {
    if (type === "image") {
      setPreviewImage(null);
      setImageFile(null);
      setFormData((p) => ({ ...p, image: null }));
    }
    if (type === "banner") {
      setPreviewBanner(null);
      setBannerFile(null);
      setFormData((p) => ({ ...p, banner: null }));
    }
    if (type === "icon") {
      setPreviewIcon(null);
      setIconFile(null);
      setFormData((p) => ({ ...p, icon: null }));
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // IMPORTANT: Remove ID from the data payload if present, as the service
      // functions handle injecting it correctly.
      const { id, ...dataToSend } = formData;

      const files = {
        image: imageFile,
        banner: bannerFile,
        icon: iconFile,
      };

      if (selectedCategory) {
        // Update function expects the Firestore ID and the dataToSend
        const updated = await categoryService.update(
          selectedCategory.id,
          dataToSend,
          files
        );
        setCategories((prev) =>
          prev.map((c) => (c.id === selectedCategory.id ? updated : c))
        );
      } else {
        // Add function expects the dataToSend
        const newCat = await categoryService.add(dataToSend, files);
        setCategories((prev) => [newCat, ...prev]);
      }

      handleCancel();
    } catch (err) {
      console.error("Submission Error:", err);
      alert("Error saving category! Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedCategory(null);
    setFormData({
      name: "",
      isActive: true,
      commissionType: "percent",
      commissionValue: 0.0,
      requiredAttributes: [],
      image: null,
      banner: null,
      icon: null,
    });

    setPreviewImage(null);
    setPreviewBanner(null);
    setPreviewIcon(null);

    setImageFile(null);
    setBannerFile(null);
    setIconFile(null);

    setIsModalOpen(false);
  };

  const handleEdit = (cat) => {
    setSelectedCategory(cat);
    // When editing, the cat object from fetch includes the 'id' field, which is good.
    setFormData({
      ...cat,
      requiredAttributes: cat.requiredAttributes || []
    }); 

    setPreviewImage(cat.image);
    setPreviewBanner(cat.banner);
    setPreviewIcon(cat.icon);

    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this category?"))
      return;

    try {
      await categoryService.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting category:", err);
      alert("Error deleting category!");
    }
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return categories.filter(
      (c) => (c.name || "").toLowerCase().includes(term)
    );
  }, [searchTerm, categories]);

  // ===============================
  // UI (Displays Document ID)
  // ===============================

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">
            Category Management
          </h2>
          <p className="text-gray-600 mt-2">
            Manage your product categories, commission rates, and attributes.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => {
              handleCancel();
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Plus size={20} />
            <span>Add Category</span>
          </button>

          <button
            onClick={fetchCategories}
            className="bg-gray-100 hover:bg-gray-200 text-blue-600 p-3 rounded-xl shadow-md transition-all duration-300 border border-gray-200"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* --- Search & Stats Card --- */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
              <div className="text-blue-600 font-bold text-2xl">
                {filtered.length}
              </div>
              <div className="text-gray-600 text-sm">Total Categories</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
              <div className="text-green-600 font-bold text-2xl">
                {categories.filter((c) => c.isActive).length}
              </div>
              <div className="text-gray-600 text-sm">Active</div>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
            <input
              type="text"
              placeholder="Search category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
            />
          </div>
        </div>
      </div>
      
      {/* --- TABLE (Desktop View) --- */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
            <tr>
              <th className="px-6 py-4 text-left text-white font-semibold w-[150px]">
                Name
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold">
                Document ID
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold w-[150px]">
                Commission
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold">
                Attributes
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold w-[80px]">
                Image
              </th>
              <th className="px-6 py-4 text-left text-white font-semibold w-[120px]">
                Status
              </th>
              <th className="px-6 py-4 text-right text-white font-semibold w-[100px]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center text-gray-500 py-8">
                  <div className="flex justify-center items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                    <span>Loading categories...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-gray-500 py-8">
                  No categories found. Create your first category!
                </td>
              </tr>
            ) : (
              filtered.map((cat, index) => (
                <tr
                  key={cat.id}
                  className={`border-b border-gray-100 hover:bg-blue-50 transition-all duration-300 ${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="text-gray-800 font-medium">{cat.name}</div>
                  </td>
                  {/* DOCUMENT ID DISPLAY */}
                  <td className="px-6 py-4 text-xs font-mono text-gray-500 overflow-hidden whitespace-nowrap overflow-ellipsis max-w-[150px]">
                    {cat.id}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                      {cat.commissionValue}
                      {cat.commissionType === "percent" ? "%" : " ₹"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {(cat.requiredAttributes || []).slice(0, 3).join(", ")}
                    {(cat.requiredAttributes || []).length > 3 && (
                      <span className="text-gray-400"> +{(cat.requiredAttributes || []).length - 3}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        className="h-12 w-12 rounded-xl object-cover border-2 border-blue-200 shadow-sm"
                        alt={cat.name}
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                        <Camera className="text-gray-400" size={20} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        cat.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex space-x-2 justify-end">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-all duration-300 hover:scale-110"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
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

      {/* --- MOBILE CARDS --- */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="flex justify-center items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <span>Loading categories...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No categories found. Create your first category!
          </p>
        ) : (
          filtered.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-blue-50 transition-all duration-300 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex space-x-4">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      className="h-16 w-16 rounded-xl object-cover border-2 border-blue-200"
                      alt={cat.name}
                    />
                  ) : (
                    <div className="h-16 w-16 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                      <Camera className="text-gray-400" size={24} />
                    </div>
                  )}

                  <div>
                    <h3 className="text-gray-800 text-lg font-semibold">
                      {cat.name}
                    </h3>
                    <p className="text-xs font-mono text-gray-400 mt-1 truncate max-w-[200px]">ID: {cat.id}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        {cat.commissionValue}
                        {cat.commissionType === "percent" ? "%" : " ₹"}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          cat.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">
                  {selectedCategory ? "Edit Category" : "Create New Category"}
                </h3>

                <button
                  onClick={handleCancel}
                  className="text-white/80 hover:text-white p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body/Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 max-h-[80vh] overflow-y-auto"
            >
              <h4 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2">
                Media
              </h4>
              {/* IMAGE BLOCK */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {renderImageUploader(
                  "Main Image",
                  "main-img",
                  previewImage,
                  (e) => handleFileSelect(e, "image"),
                  () => clearFile("image"),
                  "blue"
                )}

                {renderImageUploader(
                  "Banner",
                  "banner-img",
                  previewBanner,
                  (e) => handleFileSelect(e, "banner"),
                  () => clearFile("banner"),
                  "indigo"
                )}

                {renderImageUploader(
                  "Icon",
                  "icon-img",
                  previewIcon,
                  (e) => handleFileSelect(e, "icon"),
                  () => clearFile("icon"),
                  "blue"
                )}
              </div>

              <h4 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2 mt-6">
                Details & Status
              </h4>
              
              {/* Show the ID in the modal when editing */}
              {selectedCategory && (
                <div className="mb-6 p-3 bg-gray-100 rounded-xl text-sm font-mono text-gray-600 border border-gray-200">
                    Document ID: **{selectedCategory.id}**
                </div>
              )}

              {/* NAME */}
              <div className="mb-6">
                <label className="text-gray-700 font-medium mb-2 block">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  placeholder="e.g., Electronics, Fashion, Mobile"
                  required
                />
              </div>

              {/* ACTIVE TOGGLE */}
              <div className="flex justify-between items-center mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex flex-col">
                    <label className="text-gray-700 font-medium">Active Status</label>
                    <p className="text-sm text-gray-500">Toggle visibility on the frontend.</p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: !prev.isActive,
                    }))
                  }
                  className="relative"
                >
                  {formData.isActive ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 text-sm font-medium">
                        Active
                      </span>
                      <ToggleRight size={36} className="text-green-500" />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600 text-sm font-medium">
                        Inactive
                      </span>
                      <ToggleLeft size={36} className="text-red-500" />
                    </div>
                  )}
                </button>
              </div>

              {/* COMMISSION */}
              <h4 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2 mt-6">
                Commission Setup
              </h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-gray-700 font-medium mb-2 block">
                    Commission Type
                  </label>
                  <select
                    name="commissionType"
                    value={formData.commissionType}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-gray-300 text-gray-800 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 font-medium mb-2 block">
                    Commission Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="commissionValue"
                    value={formData.commissionValue}
                    onChange={handleInputChange}
                    className="w-full bg-white border border-gray-300 text-gray-800 px-3 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* ATTRIBUTES */}
              <h4 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2 mt-6">
                Required Attributes
              </h4>
              <div className="mb-6">
                <label className="text-gray-700 font-medium mb-3 block">
                  Product Specifications (e.g., Color, Size, RAM)
                </label>

                <div className="flex flex-wrap gap-2 mb-3 p-3 min-h-12 bg-gray-50 rounded-xl border border-gray-200">
                  {formData.requiredAttributes.map((attr) => (
                    <div
                      key={attr}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-full flex items-center space-x-2 shadow-sm"
                    >
                      <span className="text-sm">{attr}</span>
                      <button
                        type="button"
                        onClick={() => removeAttribute(attr)}
                        className="hover:text-blue-200 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {formData.requiredAttributes.length === 0 && (
                      <span className="text-gray-400 text-sm italic">
                          No attributes added yet.
                      </span>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Type attribute and press Enter to add"
                  className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAttribute(e.target.value);
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              {/* BUTTONS */}
              <div className="flex space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-sm border border-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || !formData.name.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-md disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </div>
                  ) : selectedCategory ? (
                    "Update Category"
                  ) : (
                    "Create Category"
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

export default Category;


const renderImageUploader = (label, id, preview, onFileChange, onClear, color) => (
    <div className="relative group">
        <label className="block text-center text-gray-600 text-sm mb-1">{label}</label>
        <input
            type="file"
            id={id}
            className="hidden"
            accept="image/*"
            onChange={onFileChange}
        />

        <label
            htmlFor={id}
            className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl h-28 flex items-center justify-center cursor-pointer group-hover:border-${color}-500 transition-all duration-300 overflow-hidden`}
        >
            {preview ? (
                <>
                    <img
                        src={preview}
                        className="h-full w-full object-cover rounded-xl"
                        alt={`Preview of ${label}`}
                    />
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-red-500 p-1 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </>
            ) : (
                <div className="text-center">
                    <Camera className={`text-${color}-500 mx-auto mb-2`} size={24} />
                    <span className="text-gray-600 text-sm">{label}</span>
                </div>
            )}
        </label>
    </div>
);