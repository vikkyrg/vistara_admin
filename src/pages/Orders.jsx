import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  collectionGroup,
  getDoc
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  User,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Download,
  MapPin,
  Phone,
  CreditCard,
  ShoppingBag,
  ExternalLink,
  MoreVertical,
  X,
  ArrowUpRight,
  Box,
  Zap,
  Info
} from "lucide-react";

const API_BASE_URL = "https://vistaraa-server.vercel.app/api";
const AUTH_TOKEN = "006eb537ffea3dafe0e3a16233c449a1e20510e8f3404b1a456f53cf6ca7f371";

/* ======================================================
   🔥 INLINE ORDER SERVICE
====================================================== */

const orderService = {
  enrichOrdersWithUserProfiles: async (docs) => {
    // 1. Robust ID Extraction
    const customerIds = [...new Set(docs
      .map(doc => {
        const data = doc.data();
        if (doc.ref.path.startsWith("users/")) return doc.ref.parent.parent?.id;
        return data.customerId || data.userId || data.uid || data.cid;
      })
      .filter(id => !!id)
    )];

    // 2. Parallel Profile Fetching
    const userMap = new Map();
    await Promise.all(customerIds.map(async (id) => {
      try {
        const uSnap = await getDoc(doc(db, "users", id));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          userMap.set(id, {
            name: uData.name || uData.userName || uData.displayName,
            email: uData.email,
            phone: uData.contactNo || uData.phoneNumber || uData.phone
          });
        }
      } catch (e) {
        console.error(`Error fetching data for user ${id}:`, e);
      }
    }));

    // 3. Mapping and Enrichment
    return docs
      .filter(doc => !doc.ref.path.includes("/sellers/")) // Exclude any seller-related orders
      .map(doc => {
        const data = doc.data();
        const cid = doc.ref.path.startsWith("users/")
          ? (doc.ref.parent.parent?.id || "Unknown")
          : (data.customerId || data.userId || data.uid || data.cid || "Unknown");

        const uProfile = userMap.get(cid) || {};

        // Prioritize: 1. Order Name, 2. Profile Name, 3. Profile Email, 4. Order Email, 5. Default
        return {
          id: doc.id,
          uniqueKey: doc.ref.path,
          orderId: data.orderId || `ORD-${doc.id.slice(0, 8).toUpperCase()}`,
          customerId: cid !== "Unknown" ? cid : null,
          customerName: data.customerName || data.userName || uProfile.name || "Customer",
          customerEmail: data.customerEmail || data.userEmail || uProfile.email || "",
          customerPhone: data.customerPhone || data.phoneNumber || uProfile.phone || "",
          ...data
        };
      });
  },

  getAll: async () => {
    // 1. Optimized Fetching
    const q = query(
      collectionGroup(db, "orders"),
      limit(1000)
    );
    const snap = await getDocs(q);

    // 2. Use helper to enrich data
    const enriched = await orderService.enrichOrdersWithUserProfiles(snap.docs);

    // 3. Deduplicate by orderId
    const uniqueMap = new Map();
    enriched.forEach(order => {
      if (!uniqueMap.has(order.orderId)) {
        uniqueMap.set(order.orderId, order);
      } else {
        // Prefer the root collection copy if multiple exist
        if (order.uniqueKey && order.uniqueKey.split('/').length === 2) {
          uniqueMap.set(order.orderId, order);
        }
      }
    });

    const uniqueOrders = Array.from(uniqueMap.values());

    // Sort in memory to avoid Firebase Composite Index requirements
    uniqueOrders.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    return uniqueOrders;
  },

  updateStatus: async (orderId, status, customerId) => {
    // Attempt to update the user's subcollection copy
    if (customerId) {
      try {
        await updateDoc(
          doc(db, "users", customerId, "orders", orderId),
          { orderStatus: status, status: status, updatedAt: serverTimestamp() }
        );
      } catch (e) {
        console.warn("Failed to update subcollection copy:", e);
      }
    }

    // Attempt to update the root collection copy
    try {
      await updateDoc(
        doc(db, "orders", orderId),
        { orderStatus: status, status: status, updatedAt: serverTimestamp() }
      );
    } catch (e) {
      console.warn("Failed to update root collection copy:", e);
    }
  },

  delete: async (orderPath) => {
    await deleteDoc(doc(db, orderPath));
  },
};

/* ======================================================
   🧩 MAIN COMPONENT
====================================================== */

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [error, setError] = useState(null);
  const [syncingId, setSyncingId] = useState(null);



  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getAll();
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
      setError(error.message);

      // Fallback: If sorted query fails (index issue), try fetching without sort just to show data
      if (error.message.includes("index") || error.code === "failed-precondition") {
        try {
          const fallbackSnap = await getDocs(query(collectionGroup(db, "orders"), limit(200)));
          const enrichedData = await orderService.enrichOrdersWithUserProfiles(fallbackSnap.docs);
          setOrders(enrichedData);
        } catch (fError) {
          console.error("Fallback failed:", fError);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const formatDate = (ts) => {
    if (!ts?.seconds) return "N/A";
    const date = new Date(ts.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (ts) => {
    if (!ts?.seconds) return "";
    const date = new Date(ts.seconds * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const API_URL = window.location.origin;

  const sendOrderEmail = async (data) => {
    try {
      await fetch(`${API_URL}/api/sendEmail`.replace(/([^:]\/)\/+/g, "$1"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error("Email failed", err);
    }
  };

  useEffect(() => {
    // 1. One listener for ALL orders in the system (Highly Optimized)
    const q = query(
      collectionGroup(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(1000) // Expanded to listen to active orders for real-time status sync
    );

    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        // STRICT FILTER: ONLY CUSTOMER ORDERS
        if (!change.doc.ref.path.startsWith("users/")) return;

        const orderData = change.doc.data();
        let customerName = orderData.customerName || orderData.userName;

        // Fetch name from user doc if missing in order
        if (!customerName) {
          try {
            const userId = change.doc.ref.parent.parent?.id;
            if (userId) {
              const uSnap = await getDoc(doc(db, "users", userId));
              if (uSnap.exists()) {
                const uData = uSnap.data();
                customerName = uData.name || uData.userName || uData.displayName;
              }
            }
          } catch (e) {
            console.error("Error fetching name for listener:", e);
          }
        }

        customerName = customerName || "Customer";
        const customerEmail = orderData.customerEmail || orderData.userEmail || "";

        if (!customerEmail) return;

        const orderId = orderData.orderId || `ORD-${change.doc.id.slice(0, 8).toUpperCase()}`;

        if (change.type === "added") {
          await sendOrderEmail({
            userEmail: customerEmail,
            userName: customerName,
            orderId: orderId,
            status: "pending",
            orderItems: orderData.products || [],
          });
        }

        if (change.type === "modified") {
          // Dynamically update the table state for this specific order
          setOrders(prev => prev.map(o => {
            if (o.orderId === orderId) {
              return { ...o, ...orderData, orderStatus: orderData.orderStatus || orderData.status || o.orderStatus };
            }
            return o;
          }));

          await sendOrderEmail({
            userEmail: customerEmail,
            userName: customerName,
            orderId: orderId,
            status: orderData.orderStatus || orderData.status || "pending",
            orderItems: orderData.products || [],
          });
        }
      });
    }, (error) => {
      console.warn("Real-time orders listener error. You likely need to create a Firestore index. Check the console for the link.", error.message);
    });

    return () => unsubscribe();
  }, []);
  const handleStatusChange = async (order, newStatus) => {
    try {
      setSyncingId(order.id);

      // Optimistic UI update: Instantly change the dropdown without waiting for network
      setOrders(prev => prev.map(o => 
        o.orderId === order.orderId ? { ...o, orderStatus: newStatus, status: newStatus } : o
      ));

      // 1. Update Firestore Status first
      await orderService.updateStatus(order.id, newStatus, order.customerId);

      // 2. Shiprocket Integration Logic
      if (newStatus === "ready to ship" && !order.shiprocketOrderId) {
        console.log("Preparing Shiprocket Adhoc Order...");

        // Map Firestore order to Shiprocket Adhoc format
        const shiprocketData = {
          order_id: order.id, // Using Firestore ID as mapping
          order_date: order.createdAt?.seconds
            ? new Date(order.createdAt.seconds * 1000).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          pickup_location: "Primary",
          billing_customer_name: order.customerName?.split(' ')[0] || "Customer",
          billing_last_name: order.customerName?.split(' ').slice(1).join(' ') || "User",
          billing_address: order.address || order.shippingAddress || "No Address",
          billing_city: order.city || "Unknown",
          billing_pincode: order.pinCode || order.pincode || "000000",
          billing_state: order.state || "Unknown",
          billing_country: "India",
          billing_email: order.customerEmail || "noreply@vistaraa.com",
          billing_phone: order.phoneNumber || order.phoneNumber || "0000000000",
          shipping_is_billing: true,
          order_items: (order.products || []).map(p => ({
            name: p.name,
            sku: p.basesku || p.sku || p.id,
            units: p.quantity,
            selling_price: p.offerPrice || p.price
          })),
          payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
          sub_total: order.totalAmount,
          length: 10, weight: 0.5, height: 10, width: 10,
          user_id: order.customerId // Vital for backend to find user/order
        };

        const res = await fetch(`${API_BASE_URL}/create-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AUTH_TOKEN}`
          },
          body: JSON.stringify(shiprocketData)
        });

        const result = await res.json();
        if (res.ok) {
          alert(`Shiprocket Sync Success! Order ID: ${result.order_id || result.data?.order_id}`);
        } else {
          console.error("Shiprocket Create Failed:", result);
          alert(`Shiprocket Sync Failed: ${result.details?.message || "Check fields"}`);
        }
      }
      else if (newStatus === "cancelled" && order.shiprocketOrderId) {
        console.log("Cancelling Shiprocket Order...");
        const res = await fetch(`${API_BASE_URL}/cancel-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AUTH_TOKEN}`
          },
          body: JSON.stringify({ shiprocketOrderId: order.shiprocketOrderId })
        });

        const result = await res.json();
        if (res.ok) {
          alert("Order cancelled in Shiprocket successfully.");
        } else {
          console.error("Shiprocket Cancel Failed:", result);
        }
      }

    } catch (error) {
      console.error("Status Change Integration Error:", error);
      alert("Status changed in DB, but failed to sync with Shiprocket.");
    } finally {
      setSyncingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'processing': return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Package };
      case 'ready to ship': return { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Box };
      case 'shipped': return { bg: 'bg-purple-100', text: 'text-purple-800', icon: Truck };
      case 'delivered': return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle };
      case 'return_requested':
      case 'partial_return_requested': return { bg: 'bg-rose-100', text: 'text-rose-800', icon: RotateCcw };
      case 'exchange_requested':
      case 'partial_exchange_requested': return { bg: 'bg-amber-100', text: 'text-amber-800', icon: RefreshCw };
      case 'pending_admin_approval': return { bg: 'bg-orange-100', text: 'text-orange-800', icon: Clock };
      case 'return_approved': 
      case 'exchange_approved': 
      case 'approved': return { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle };
      case 'forward_shipped': return { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck };
      case 'refunded': return { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle };
      case 'return_rejected':
      case 'rejected': return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock };
    }
  };

  const getStatusIcon = (status) => {
    const { icon } = getStatusColor(status);
    const IconComponent = icon;
    return <IconComponent className="w-4 h-4" />;
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.customerName.toLowerCase().includes(term) ||
        order.orderId?.toLowerCase().includes(term) ||
        order.customerEmail.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(order => {
        if (!order.createdAt?.seconds) return false;
        const orderDate = new Date(order.createdAt.seconds * 1000);

        switch (dateFilter) {
          case 'today': return orderDate.toDateString() === now.toDateString();
          case 'week': return orderDate >= sevenDaysAgo;
          case 'month': return orderDate >= thirtyDaysAgo;
          default: return true;
        }
      });
    }

    return filtered;
  }, [orders, searchTerm, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const revenue = orders.reduce((sum, order) => sum + (Number(order.totalAmount || order.totalPrice || order.amount || order.total) || 0), 0);
    const pending = orders.filter(o => o.orderStatus === 'pending').length;
    const delivered = orders.filter(o => o.orderStatus === 'delivered').length;

    return { total, revenue, pending, delivered };
  }, [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }
  const downloadOrdersCSV = () => {
    if (!filteredOrders.length) {
      alert("No orders to export");
      return;
    }

    const headers = [
      "Order ID",
      "Customer Name",
      "Email",
      "Phone",
      "Order Status",
      "Payment Method",
      "Total Amount",
      "Order Date",
      "Address",
      "Products"
    ];

    const rows = filteredOrders.map(order => {
      const products = order.products
        ?.map(p => `${p.name} (x${p.quantity})`)
        .join(" | ") || "";

      const orderDate = order.createdAt?.seconds
        ? new Date(order.createdAt.seconds * 1000).toLocaleString()
        : "";

      return [
        order.orderId,
        order.customerName,
        order.customerEmail,
        order.phoneNumber || "",
        order.orderStatus,
        order.paymentMethod || "",
        order.totalAmount,
        orderDate,
        order.address || "",
        products
      ];
    });

    const csvContent =
      [headers, ...rows]
        .map(row =>
          row
            .map(value => `"${String(value).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="p-6 bg-white min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Track and manage all customer orders</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold text-gray-900">₹{stats.revenue.toLocaleString()}</div>
          </div>

          <button
            onClick={loadOrders}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ERROR ALERT REMOVED AS PER USER REQUEST */}

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-blue-100">Total Orders</div>
              <div className="text-3xl font-bold mt-2">{stats.total}</div>
            </div>
            <ShoppingBag className="w-12 h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-emerald-100">Delivered</div>
              <div className="text-3xl font-bold mt-2">{stats.delivered}</div>
            </div>
            <CheckCircle className="w-12 h-12 text-emerald-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-orange-100">Pending</div>
              <div className="text-3xl font-bold mt-2">{stats.pending}</div>
            </div>
            <Clock className="w-12 h-12 text-orange-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-purple-100">Avg. Order</div>
              <div className="text-3xl font-bold mt-2">
                ₹{stats.total > 0 ? Math.round(stats.revenue / stats.total) : 0}
              </div>
            </div>
            <DollarSign className="w-12 h-12 text-purple-200 opacity-80" />
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
              placeholder="Search orders by customer, order ID, or email..."
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
                <option value="placed">Placed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="ready to ship">Ready to ship</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="return_requested">Return Requested</option>
                <option value="partial_return_requested">Partial Return</option>
                <option value="exchange_requested">Exchange Requested</option>
                <option value="partial_exchange_requested">Partial Exchange</option>
                <option value="pending_admin_approval">Pending Admin Approval</option>
                <option value="return_approved">Return Approved</option>
                <option value="exchange_approved">Exchange Approved</option>
                <option value="forward_shipped">Forward Shipped</option>
                <option value="refunded">Refunded</option>
                <option value="return_rejected">Return Rejected</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredOrders.length}</span> of{" "}
            <span className="font-semibold">{orders.length}</span> orders
          </div>

          <button
            onClick={downloadOrdersCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            Export Orders
          </button>

        </div>
      </div>

      {/* ORDERS TABLE - DESKTOP */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="w-full">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Order Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="text-gray-300" size={48} />
                      <div className="text-gray-500">No orders found</div>
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
                filteredOrders.map((order) => {
                  const displayStatus = order.orderStatus || order.status || 'placed';
                  const formattedStatus = displayStatus.replace('_', ' ').charAt(0).toUpperCase() + displayStatus.replace('_', ' ').slice(1);
                  const { bg, text } = getStatusColor(displayStatus);
                  return (
                    <tr key={order.uniqueKey || order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.orderId}</div>
                          <div className="text-xs text-gray-500">
                            {order.products?.length || 0} items
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                            {(order.customerName || order.customerEmail || "C").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                            {order.customerEmail && order.customerEmail !== order.customerName && (
                              <div className="text-xs text-gray-500">{order.customerEmail}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-base font-bold text-gray-900">₹{order.totalAmount || order.totalPrice || order.amount || order.total || 0}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
                            {getStatusIcon(displayStatus)}
                            {formattedStatus}
                          </span>
                          <div className="relative w-full max-w-[130px]">
                            <select
                              value={displayStatus.toLowerCase()}
                              disabled={syncingId === order.id}
                              onChange={(e) => handleStatusChange(order, e.target.value)}
                              className={`w-full text-xs border border-gray-300 rounded-md p-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white ${syncingId === order.id ? 'opacity-50' : ''}`}
                            >
                              <option value="placed">Placed</option>
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="ready to ship">Ready to ship</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="return_requested">Return Requested</option>
                              <option value="partial_return_requested">Partial Return</option>
                              <option value="exchange_requested">Exchange Requested</option>
                              <option value="partial_exchange_requested">Partial Exchange</option>
                              <option value="pending_admin_approval">Pending Admin Approval</option>
                              <option value="return_approved">Return Approved</option>
                              <option value="exchange_approved">Exchange Approved</option>
                              <option value="forward_shipped">Forward Shipped</option>
                              <option value="refunded">Refunded</option>
                              <option value="return_rejected">Return Rejected</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            {syncingId === order.id && (
                              <RefreshCw className="absolute right-1 top-1 w-3 h-3 text-blue-500 animate-spin" />
                            )}
                          </div>
                          {order.shiprocketOrderId && (
                            <div className="flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] font-black text-blue-700 uppercase tracking-tight">
                              <Zap size={8} className="text-blue-600 fill-blue-600" />
                              Sync: #{order.shiprocketOrderId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-xs font-medium text-gray-900">{formatDate(order.createdAt)}</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{formatTime(order.createdAt)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setViewOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-medium transition-colors"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm("Are you sure you want to delete this order?")) {
                                try {
                                  // Optimistic UI update for snappy feel
                                  setOrders(prev => prev.filter(o => o.uniqueKey !== order.uniqueKey));
                                  await orderService.delete(order.uniqueKey);
                                } catch (error) {
                                  console.error("Failed to delete order:", error);
                                  alert("Failed to delete order");
                                  loadOrders(); // restore state if failed
                                }
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-md text-xs font-medium transition-colors"
                          >
                            <Trash2 size={14} />
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
        {filteredOrders.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredOrders.length}</span> of{" "}
              <span className="font-semibold">{orders.length}</span> orders
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
        {filteredOrders.map((order) => {
          const { bg, text } = getStatusColor(order.orderStatus);
          return (
            <div
              key={order.uniqueKey || order.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="font-semibold text-gray-900">{order.orderId}</div>
                  <div className="text-sm text-gray-500">{formatDate(order.createdAt)}</div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
                  {getStatusIcon(order.orderStatus)}
                  {order.orderStatus}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                  {order.customerName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{order.customerName}</div>
                  <div className="text-sm text-gray-500">{order.customerEmail}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Amount</div>
                  <div className="text-xl font-bold text-gray-900">₹{order.totalAmount}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Items</div>
                  <div className="font-medium">{order.products?.length || 0}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewOrder(order)}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Eye size={16} />
                  View Details
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to delete this order?")) {
                      try {
                        setOrders(prev => prev.filter(o => o.uniqueKey !== order.uniqueKey));
                        await orderService.delete(order.uniqueKey);
                      } catch (error) {
                        console.error("Failed to delete order:", error);
                        alert("Failed to delete order");
                        loadOrders();
                      }
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <Package className="mx-auto text-gray-300 mb-3" size={48} />
            <div className="text-gray-500 mb-2">No orders found</div>
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

      {/* ORDER DETAILS MODAL */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <p className="text-gray-600">{viewOrder.orderId}</p>
                </div>
                <button
                  onClick={() => setViewOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User size={18} />
                    Customer Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {viewOrder.customerName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{viewOrder.customerName}</div>
                        <div className="text-sm text-gray-600 truncate max-w-[150px]">{viewOrder.customerEmail}</div>
                        <div className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-tighter">CID: {viewOrder.customerId}</div>
                      </div>
                    </div>
                    {(viewOrder.customerPhone || viewOrder.phoneNumber) && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone size={16} className="text-gray-400" />
                        <span>{viewOrder.customerPhone || viewOrder.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Info */}
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ShoppingBag size={18} />
                    Order Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewOrder.orderStatus).bg} ${getStatusColor(viewOrder.orderStatus).text}`}>
                        {getStatusIcon(viewOrder.orderStatus)}
                        {viewOrder.orderStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Date</span>
                      <span className="font-medium">{formatDate(viewOrder.orderDate || viewOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items</span>
                      <span className="font-medium">{viewOrder.products?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment</span>
                      <span className="font-medium flex items-center gap-1">
                        <CreditCard size={16} />
                        {viewOrder.paymentMethod || "Not Specified"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-5">
                  <h3 className="font-semibold mb-4">Order Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{viewOrder.totalAmount - (viewOrder.shippingCharges || viewOrder.shipping || 0) - (viewOrder.tax || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>₹{viewOrder.shippingCharges || viewOrder.shipping || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>₹{viewOrder.tax || 0}</span>
                    </div>
                    <div className="border-t border-blue-400 pt-3 mt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Amount</span>
                        <span>₹{viewOrder.totalAmount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              {viewOrder.address && (
                <div className="bg-gray-50 rounded-xl p-5 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin size={18} />
                    Delivery Address
                  </h3>
                  <p className="text-gray-700">{viewOrder.address}</p>
                </div>
              )}

              {/* Products Section */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Order Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {viewOrder.products?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {item.images?.[0] && (
                                <img
                                  src={item.images[0]}
                                  alt={item.name}
                                  className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                />
                              )}
                              <div>
                                <div className="font-medium">{item.name}</div>
                                {item.variant && (
                                  <div className="text-sm text-gray-600">{item.variant}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-sm text-gray-600">{item.sku}</code>
                          </td>
                          <td className="px-4 py-3 font-medium">₹{item.salePrice || item.price}</td>
                          <td className="px-4 py-3">{item.quantity}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">₹{(item.salePrice || item.price) * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setViewOrder(null)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
