import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Mail,
  Smartphone,
  Search,
  X,
  User,
  Shield,
  ShieldOff,
  MoreVertical,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";

import { collection, getDocs, doc, updateDoc, query, limit, startAfter, where } from "firebase/firestore";
import { db } from "../../firebase";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize] = useState(20);

  // =====================================================
  // FETCH USERS
  // =====================================================

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const fetchCustomers = async (isLoadMore = false) => {
    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      
      let q;
      if (statusFilter !== 'all') {
        q = query(usersRef, where("status", "==", statusFilter), limit(pageSize));
      } else {
        q = query(usersRef, limit(pageSize));
      }

      if (isLoadMore && lastVisible) {
        if (statusFilter !== 'all') {
          q = query(usersRef, where("status", "==", statusFilter), startAfter(lastVisible), limit(pageSize));
        } else {
          q = query(usersRef, startAfter(lastVisible), limit(pageSize));
        }
      }

      const snap = await getDocs(q);
      const data = snap.docs.map((docSnap) => {
        const u = docSnap.data();
        return {
          id: u.id || docSnap.id,
          name: u.userName || "Unknown User",
          email: u.email || "",
          phone: u.phone || "",
          status: u.status || "active",
          fcmToken: u.fcmToken || "",
          joinDate: u.createdAt || new Date().toISOString(),
        };
      });

      if (isLoadMore) {
        setCustomers(prev => [...prev, ...data]);
      } else {
        setCustomers(data);
      }
      
      setLastVisible(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === pageSize);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ACTIONS
  // =====================================================

  const handleBlockCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to block this user?")) return;

    try {
      await updateDoc(doc(db, "users", id), { status: "blocked" });

      setCustomers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "blocked" } : u
        )
      );
    } catch (err) {
      alert("Failed to block user");
    }
  };

  const handleUnblockCustomer = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), { status: "active" });

      setCustomers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "active" } : u
        )
      );
    } catch (err) {
      alert("Failed to unblock user");
    }
  };

  // =====================================================
  // FILTERS & SEARCH
  // =====================================================

  const filteredCustomers = useMemo(() => {
    let result = customers;
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(u => u.status === statusFilter);
    }
    
    // Apply search filter
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter((u) =>
        [u.name, u.email, u.id, u.phone]
          .some(field => field?.toLowerCase().includes(term))
      );
    }
    
    return result;
  }, [customers, searchTerm, statusFilter]);

  // =====================================================
  // UI
  // =====================================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen text-gray-800">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your customer accounts</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100">
            <div className="text-sm text-gray-600">Total Customers</div>
            <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
          </div>
          
          <button 
            onClick={fetchCustomers}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* SEARCH */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              placeholder="Search customers by name, email, or ID..."
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
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Active Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {customers.filter(u => u.status === 'active').length}
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <User className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Blocked Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {customers.filter(u => u.status === 'blocked').length}
              </div>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <ShieldOff className="text-red-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Showing</div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredCustomers.length}
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* TABLE - DESKTOP */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User ID</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="text-gray-300" size={48} />
                      <div className="text-gray-500">No customers found</div>
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
                filteredCustomers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">
                            Joined {new Date(user.joinDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" />
                          <span className="text-gray-700">{user.email || "—"}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Smartphone size={16} className="text-gray-400" />
                            <span className="text-gray-700">{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                            user.status === "blocked"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.status === "blocked" ? (
                            <ShieldOff size={14} />
                          ) : (
                            <Shield size={14} />
                          )}
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                        {user.id.slice(0, 12)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {user.status === "active" ? (
                          <button
                            onClick={() => handleBlockCustomer(user.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            <ShieldOff size={16} />
                            Block
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblockCustomer(user.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Shield size={16} />
                            Unblock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION/FOOTER */}
        {filteredCustomers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredCustomers.length}</span> of{" "}
              <span className="font-semibold">{customers.length}</span> customers
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchCustomers(true)}
                disabled={!hasMore || loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none transition-all"
              >
                {loading ? "Loading..." : hasMore ? "Load More Customers" : "End of List"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE CARDS */}
      <div className="lg:hidden space-y-4">
        {filteredCustomers.map((user) => (
          <div
            key={user.id}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.status === "blocked"
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {user.status === "blocked" ? <ShieldOff size={12} /> : <Shield size={12} />}
                {user.status}
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail size={16} className="text-gray-400" />
                <span className="text-sm">{user.email || "No email"}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Smartphone size={16} className="text-gray-400" />
                  <span className="text-sm">{user.phone}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {user.status === "active" ? (
                <button
                  onClick={() => handleBlockCustomer(user.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <ShieldOff size={16} />
                  Block User
                </button>
              ) : (
                <button
                  onClick={() => handleUnblockCustomer(user.id)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Shield size={16} />
                  Unblock User
                </button>
              )}
            </div>
          </div>
        ))}
        
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <Users className="mx-auto text-gray-300 mb-3" size={48} />
            <div className="text-gray-500 mb-2">No customers found</div>
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
    </div>
  );
};

export default Customers;