import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  X,
  Calendar,
  Percent,
  Tag,
  Users,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  Download,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  TrendingUp,
  BarChart3,
  Gift,
  ChevronRight,
  Eye,
  MoreVertical,
  ExternalLink,
  Shield,
  Zap
} from "lucide-react";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";

/* =====================================
   🔥 INLINE COUPON SERVICE
===================================== */
const couponService = {
  getAll: async () => {
    const snap = await getDocs(collection(db, "coupons"));
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  },

  add: async (data) => {
    await addDoc(collection(db, "coupons"), {
      ...data,
      usageCount: 0,
      createdAt: new Date(),
    });
  },

  update: async (id, data) => {
    await updateDoc(doc(db, "coupons", id), {
      ...data,
      updatedAt: new Date(),
    });
  },

  delete: async (id) => {
    await deleteDoc(doc(db, "coupons", id));
  },

  toggleStatus: async (id, isActive) => {
    await updateDoc(doc(db, "coupons", id), { isActive });
  },
};

/* =====================================
   🧩 MAIN COMPONENT
===================================== */
const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "",
    maxUses: "",
    validUntil: "",
    isActive: true,
  });

  /* ---------------- FETCH ---------------- */
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await couponService.getAll();
      setCoupons(data);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);
  

  /* ---------------- STATS ---------------- */
 
/* ---------------- UTILS ---------------- */
const isExpired = (date) =>
  date ? new Date() > new Date(date) : false;

/* ---------------- STATS ---------------- */
const couponStats = useMemo(() => {
  const total = coupons.length;
  const active = coupons.filter(c => c.isActive !== false).length;
  const expired = coupons.filter(c => isExpired(c.validUntil)).length;
  const percentageCoupons = coupons.filter(c => c.discountType === "percentage").length;
  const fixedCoupons = coupons.filter(c => c.discountType === "fixed").length;

  return { total, active, expired, percentageCoupons, fixedCoupons };
}, [coupons]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN") : "No expiry";

  const formatTime = (date) =>
    date ? new Date(date).toLocaleTimeString("en-IN", { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : "";

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormData({ ...formData, code });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Coupon code copied to clipboard!");
  };

  /* ---------------- FILTERS ---------------- */
  const filteredCoupons = useMemo(() => {
    let filtered = coupons;

    // Search filter
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.code?.toLowerCase().includes(t) ||
          c.description?.toLowerCase().includes(t)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter(c => c.isActive !== false && !isExpired(c.validUntil));
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter(c => c.isActive === false);
      } else if (statusFilter === "expired") {
        filtered = filtered.filter(c => isExpired(c.validUntil));
      }
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(c => c.discountType === typeFilter);
    }

    return filtered;
  }, [coupons, searchTerm, statusFilter, typeFilter]);

  /* ---------------- ACTIONS ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCoupon) {
        await couponService.update(editingCoupon.id, formData);
      } else {
        await couponService.add(formData);
      }
      setShowModal(false);
      setEditingCoupon(null);
      resetForm();
      fetchCoupons();
    } catch (error) {
      alert("Error saving coupon. Please try again.");
    }
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      ...coupon,
      validUntil: coupon.validUntil
        ? coupon.validUntil.split("T")[0]
        : "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      try {
        await couponService.delete(id);
        fetchCoupons();
      } catch (error) {
        alert("Error deleting coupon. Please try again.");
      }
    }
  };

  const resetForm = () =>
    setFormData({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minOrderAmount: "",
      maxUses: "",
      validUntil: "",
      isActive: true,
    });

  if (loading && coupons.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading coupons...</p>
        </div>
      </div>
    );
  }

  /* =====================================
     🖼️ UI
  ===================================== */
  return (
    <div className="p-6 bg-white min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coupons Management</h1>
          <p className="text-gray-600 mt-1">Create and manage discount coupons for your store</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
            <div className="text-sm text-gray-600">Total Coupons</div>
            <div className="text-2xl font-bold text-gray-900">{couponStats.total}</div>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setEditingCoupon(null);
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-xl flex items-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow"
          >
            <Plus size={20} /> Create Coupon
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-blue-100">Total Coupons</div>
              <div className="text-3xl font-bold mt-2">{couponStats.total}</div>
            </div>
            <Tag className="w-12 h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-emerald-100">Active</div>
              <div className="text-3xl font-bold mt-2">{couponStats.active}</div>
            </div>
            <ToggleRight className="w-12 h-12 text-emerald-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-orange-100">Expired</div>
              <div className="text-3xl font-bold mt-2">{couponStats.expired}</div>
            </div>
            <Clock className="w-12 h-12 text-orange-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-purple-100">Percentage</div>
              <div className="text-3xl font-bold mt-2">{couponStats.percentageCoupons}</div>
            </div>
            <Percent className="w-12 h-12 text-purple-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-rose-100">Fixed Amount</div>
              <div className="text-3xl font-bold mt-2">{couponStats.fixedCoupons}</div>
            </div>
            <DollarSign className="w-12 h-12 text-rose-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* SEARCH */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              placeholder="Search coupons by code or description..."
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm"
              >
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredCoupons.length}</span> of{" "}
            <span className="font-semibold">{coupons.length}</span> coupons
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCoupons}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* COUPONS TABLE - DESKTOP */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Coupon Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Discount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Usage</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Validity</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Tag className="text-gray-300" size={48} />
                      <div className="text-gray-500">No coupons found</div>
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
                filteredCoupons.map((c) => {
                  const expired = isExpired(c.validUntil);
                  const inactive = c.isActive === false;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                            <Tag size={16} />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-gray-900">{c.code}</div>
                            <button
                              onClick={() => copyToClipboard(c.code)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Copy size={12} />
                              Copy Code
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{c.description || "—"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {c.discountType === "percentage" ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              <Percent size={14} />
                              {c.discountValue}%
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              <DollarSign size={14} />
                              ₹{c.discountValue}
                            </span>
                          )}
                          {c.minOrderAmount && (
                            <div className="text-xs text-gray-500">
                              Min: ₹{c.minOrderAmount}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{c.usageCount || 0}</div>
                          <div className="text-xs text-gray-500">
                            {c.maxUses ? `Max: ${c.maxUses}` : "Unlimited"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <div>
                            <div className={`text-sm font-medium ${expired ? 'text-red-600' : 'text-gray-900'}`}>
                              {formatDate(c.validUntil)}
                            </div>
                            {c.validUntil && (
                              <div className="text-xs text-gray-500">{formatTime(c.validUntil)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                            expired ? 'bg-red-100 text-red-800' :
                            inactive ? 'bg-gray-100 text-gray-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {expired ? <Clock size={14} /> : 
                             inactive ? <ToggleLeft size={14} /> : 
                             <CheckCircle size={14} />}
                            {expired ? 'Expired' : inactive ? 'Inactive' : 'Active'}
                          </span>
                          <button
                            onClick={() => couponService.toggleStatus(c.id, !c.isActive).then(fetchCoupons)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            {c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(c)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Edit size={16} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* FOOTER */}
        {filteredCoupons.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredCoupons.length}</span> of{" "}
              <span className="font-semibold">{coupons.length}</span> coupons
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
        {filteredCoupons.map((c) => {
          const expired = isExpired(c.validUntil);
          const inactive = c.isActive === false;
          return (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                    <Tag size={20} />
                  </div>
                  <div>
                    <div className="font-mono font-bold text-gray-900">{c.code}</div>
                    <div className="text-sm text-gray-500">{c.description || "—"}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  expired ? 'bg-red-100 text-red-800' :
                  inactive ? 'bg-gray-100 text-gray-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {expired ? <Clock size={12} /> : 
                   inactive ? <ToggleLeft size={12} /> : 
                   <CheckCircle size={12} />}
                  {expired ? 'Expired' : inactive ? 'Inactive' : 'Active'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Discount</div>
                  <div className="font-bold text-lg text-gray-900">
                    {c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Usage</div>
                  <div className="font-medium">
                    {c.usageCount || 0}{c.maxUses ? ` / ${c.maxUses}` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Min Order</div>
                  <div className="font-medium">
                    {c.minOrderAmount ? `₹${c.minOrderAmount}` : "No min"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Valid Until</div>
                  <div className={`font-medium ${expired ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatDate(c.validUntil)}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(c.code)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Copy size={16} />
                  Copy Code
                </button>
                <button
                  onClick={() => handleEdit(c)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit size={16} />
                  Edit
                </button>
              </div>
            </div>
          );
        })}
        
        {filteredCoupons.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <Tag className="mx-auto text-gray-300 mb-3" size={48} />
            <div className="text-gray-500 mb-2">No coupons found</div>
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
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCoupon ? "Edit Coupon" : "Create Coupon"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              </div>
              <p className="text-gray-600 text-sm mt-1">
                {editingCoupon ? "Update coupon details" : "Create a new discount coupon"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Code Input with Generate Button */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code *
                </label>
                <div className="flex gap-3">
                  <input
                    placeholder="e.g., WELCOME20"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="flex-1 border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    <Sparkles size={18} />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Enter coupon description..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({ ...formData, discountType: e.target.value })
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    placeholder={formData.discountType === "percentage" ? "e.g., 20" : "e.g., 500"}
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({ ...formData, discountValue: e.target.value })
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Min Order Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1000 (optional)"
                  value={formData.minOrderAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrderAmount: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Max Uses & Validity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Uses
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 100 (optional)"
                    value={formData.maxUses}
                    onChange={(e) =>
                      setFormData({ ...formData, maxUses: e.target.value })
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) =>
                      setFormData({ ...formData, validUntil: e.target.value })
                    }
                    className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Active Status */}
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
                  Coupon is active
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 p-3.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  {editingCoupon ? "Update Coupon" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;