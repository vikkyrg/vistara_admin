import React, { useEffect, useState, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Camera,
  X,
  Search,
  Image as ImageIcon,
  FileUp,
  Eye,
  EyeOff,
  Filter,
  Upload
} from "lucide-react";

import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../../firebase";
import { uploadToS3 } from "../utils/s3Upload";
import { toast, Toaster } from "react-hot-toast";

/* ======================================================
   🔥 FIREBASE SERVICES
====================================================== */

const posterService = {
  getAll: async () => {
    const snap = await getDocs(collection(db, "posters"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  add: async (data) => {
    const ref = await addDoc(collection(db, "posters"), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, ...data };
  },

  update: async (id, data) => {
    await updateDoc(doc(db, "posters", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { id, ...data };
  },

  remove: async (id) => {
    await deleteDoc(doc(db, "posters", id));
  },
};

/* ======================================================
   🧩 HELPERS
====================================================== */

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimensions
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8); // 80% quality
      };
    };
  });
};

/* ======================================================
   🧩 MAIN COMPONENT
====================================================== */

const Posters = () => {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subContents: "",
    image: "",
    status: "active",
  });

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const postersData = await posterService.getAll();
      setPosters(postersData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load posters");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FILTER & SORT ---------------- */
  const filteredPosters = useMemo(() => {
    let filtered = posters;
    
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(s) ||
          p.subContents?.toLowerCase().includes(s)
      );
    }
    
    const sorted = [...filtered];
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
      case "oldest":
        return sorted.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateA - dateB;
        });
      case "title":
        return sorted.sort((a, b) => a.title?.localeCompare(b.title));
      default:
        return sorted;
    }
  }, [search, posters, sortBy]);

  /* ---------------- FILE UPLOAD HANDLING ---------------- */
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm({ ...form, image: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('file-input').click();
  };

  const removeImage = () => {
    setSelectedFile(null);
    setForm({ ...form, image: "" });
  };

  /* ---------------- HANDLERS ---------------- */
  const openAdd = () => {
    setEditing(null);
    setForm({
      title: "",
      subContents: "",
      image: "",
      status: "active",
    });
    setSelectedFile(null);
    setModalOpen(true);
  };

  const openEdit = (poster) => {
    setEditing(poster);
    setForm(poster);
    setSelectedFile(null);
    setModalOpen(true);
  };

  const savePoster = async (e) => {
    e.preventDefault();
    setUploading(true);
    const loadingToast = toast.loading(editing ? "Updating poster..." : "Creating poster...");
    
    try {
      const posterData = { ...form };
      
      if (selectedFile) {
        // 1. Compress Image
        const compressedFile = await compressImage(selectedFile);
        // 2. Upload to S3 instead of storing base64 in Firestore
        const s3Url = await uploadToS3(compressedFile, "posters");
        posterData.image = s3Url;
      }
      
      if (editing) {
        await posterService.update(editing.id, posterData);
        toast.success("Poster updated successfully", { id: loadingToast });
      } else {
        await posterService.add(posterData);
        toast.success("Poster created successfully", { id: loadingToast });
      }
      
      setModalOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving poster:", error);
      toast.error(error.message || "Failed to save poster", { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const deletePoster = async (id) => {
    if (window.confirm("Are you sure you want to delete this poster?")) {
      try {
        await posterService.remove(id);
        toast.success("Poster deleted");
        loadData();
      } catch (error) {
        toast.error("Failed to delete poster");
        console.error("Error deleting poster:", error);
      }
    }
  };

  const toggleStatus = async (poster) => {
    try {
      const newStatus = poster.status === "active" ? "inactive" : "active";
      await posterService.update(poster.id, { ...poster, status: newStatus });
      toast.success(`Poster ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error("Failed to update status");
      console.error("Error updating status:", error);
    }
  };

  /* ======================================================
     🎨 UI
  ======================================================= */

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* HEADER */}
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Poster Manager
            </h1>
            <p className="text-gray-600 text-lg">
              Manage and organize your poster collection
            </p>
          </div>

          {/* CONTROLS BAR */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-auto md:flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search posters..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="title">Title A-Z</option>
                  </select>
                </div>

                <button
                  onClick={loadData}
                  disabled={loading}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>

                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Plus size={20} />
                  Add New Poster
                </button>
              </div>
            </div>
          </div>

          {/* POSTERS GRID */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : filteredPosters.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <ImageIcon size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No posters found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first poster</p>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors"
              >
                <Plus size={20} />
                Add New Poster
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosters.map((poster) => (
                <div
                  key={poster.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Poster Image */}
                  <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    {poster.image ? (
                      <img
                        src={poster.image}
                        alt={poster.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/400x200?text=Image+Load+Error";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={48} className="text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          poster.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {poster.status}
                      </span>
                    </div>
                  </div>

                  {/* Poster Content */}
                  <div className="p-5">
                    {poster.title && (
                      <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                        {poster.title}
                      </h3>
                    )}
                    {poster.subContents && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {poster.subContents}
                      </p>
                    )}

                    <div className={`flex items-center justify-between ${(poster.title || poster.subContents) ? 'pt-4 border-t border-gray-100' : ''}`}>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={16} />
                        {poster.createdAt && (
                          <span>
                            {poster.createdAt?.seconds 
                              ? new Date(poster.createdAt.seconds * 1000).toLocaleDateString()
                              : new Date(poster.createdAt).toLocaleDateString()
                            }
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(poster)}
                          className={`p-2 rounded-lg ${
                            poster.status === "active"
                              ? "bg-green-50 text-green-600 hover:bg-green-100"
                              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                          }`}
                          title={poster.status === "active" ? "Deactivate" : "Activate"}
                        >
                          {poster.status === "active" ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button
                          onClick={() => openEdit(poster)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => deletePoster(poster.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editing ? "Edit Poster" : "Add New Poster"}
                  </h2>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={24} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={savePoster} className="p-6 space-y-6">


                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Image File
                  </label>
                  <div className="space-y-4">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      id="file-input"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                    
                    {/* Upload Button */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload size={20} />
                        Choose File
                      </button>
                      
                      <div className="text-sm text-gray-600">
                        {selectedFile ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-blue-600 truncate max-w-[200px]">{selectedFile.name}</span>
                            <span className="text-gray-500">
                              ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={removeImage}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 font-medium">No file chosen</span>
                        )}
                      </div>
                    </div>



                    {/* Image Preview */}
                    {form.image && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 border border-gray-300">
                          <img
                            src={form.image}
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm"
                            disabled={uploading}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Status
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="status"
                          value="active"
                          checked={form.status === "active"}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                          className="sr-only"
                          disabled={uploading}
                        />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.status === "active" ? 'border-black' : 'border-gray-300'}`}>
                          {form.status === "active" && (
                            <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <span className={`font-medium ${uploading ? 'opacity-50' : ''}`}>Active</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="status"
                          value="inactive"
                          checked={form.status === "inactive"}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                          className="sr-only"
                          disabled={uploading}
                        />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.status === "inactive" ? 'border-black' : 'border-gray-300'}`}>
                          {form.status === "inactive" && (
                            <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <span className={`font-medium ${uploading ? 'opacity-50' : ''}`}>Inactive</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={uploading}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !form.image}
                    className="px-6 py-3 bg-black hover:bg-gray-900 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editing ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      editing ? "Update Poster" : "Create Poster"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Helper component for Calendar icon
const Calendar = ({ size = 16 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export default Posters;     