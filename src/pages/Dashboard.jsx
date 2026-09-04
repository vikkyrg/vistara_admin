import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, Users, TrendingUp, Settings, DollarSign, 
  ShoppingCart, Package, Download, Calendar, ChevronRight, 
  MoreVertical, Activity, Target, Clock, Eye, MessageSquare,
  RefreshCw, TrendingDown
} from "lucide-react";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  getCountFromServer,
  collectionGroup,
  where,
  getDoc,
  doc
} from "firebase/firestore";
import { db } from "../../firebase";

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("week");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    inStock: 0,
    revenueGrowth: 0,
    userGrowth: 0,
    orderGrowth: 0,
    productGrowth: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [deviceData, setDeviceData] = useState([
    { name: "Mobile", value: 45, color: "#4f46e5" },
    { name: "Desktop", value: 35, color: "#7c3aed" },
    { name: "Tablet", value: 20, color: "#a855f7" },
  ]);

  const fetchData = async () => {
    setLoading(true);
    
    let totalUsers = 0;
    let totalProducts = 0;
    let outOfStock = 0;
    let lowStock = 0;
    let inStock = 0;
    let allOrders = [];
    let totalRevenue = 0;
    const userMap = new Map();

    // 1. Fetch Users & Products Counts
    try {
      const coll = collection(db, "products");
      const [usersCountSnap, productsCountSnap, outSnap, lowSnap, inSnap] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(coll),
        getCountFromServer(query(coll, where("stock", "==", 0))),
        getCountFromServer(query(coll, where("stock", ">", 0), where("stock", "<=", 10))),
        getCountFromServer(query(coll, where("stock", ">", 10)))
      ]);
      
      totalUsers = usersCountSnap.data().count;
      totalProducts = productsCountSnap.data().count;
      outOfStock = outSnap.data().count;
      lowStock = lowSnap.data().count;
      inStock = inSnap.data().count;

      if (totalProducts > 0 && outOfStock + lowStock + inStock === 0) {
        inStock = totalProducts;
      }
    } catch (countError) {
      console.error("Dashboard count query error:", countError);
    }

    // 2. Fetch Orders
    try {
      // Fetch without orderBy to bypass index requirement
      const ordersSnap = await getDocs(query(
        collectionGroup(db, "orders"),
        limit(200)
      ));
      
      // 3. Fetch User names
      const customerIds = [...new Set(ordersSnap.docs
        .map(doc => {
          const data = doc.data();
          if (doc.ref.path.startsWith("users/")) return doc.ref.parent.parent?.id;
          return data.customerId || data.userId || data.uid || data.cid;
        })
        .filter(id => !!id)
      )];

      try {
        await Promise.all(customerIds.map(async (id) => {
          try {
            const uSnap = await getDoc(doc(db, "users", id));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              userMap.set(id, uData.name || uData.userName || uData.displayName || uData.email);
            }
          } catch (e) {
            console.error("Dashboard user fetch error:", e);
          }
        }));
      } catch (userErr) {
        console.error("Dashboard batch user fetch error:", userErr);
      }

      ordersSnap.forEach((orderDoc) => {
        // Only include orders belonging to users, ignore seller subcollections
        if (orderDoc.ref.path.includes("/sellers/")) return;
        
        const orderData = orderDoc.data();
        const cid = orderDoc.ref.path.startsWith("users/") 
          ? orderDoc.ref.parent.parent?.id 
          : (orderData.customerId || orderData.userId || orderData.uid || orderData.cid);
        const amount = Number(orderData.totalAmount || 0);
        totalRevenue += amount;
        allOrders.push({
          id: orderDoc.id,
          userName: orderData.customerName || orderData.userName || userMap.get(cid) || "Customer",
          amount: amount,
          status: orderData.orderStatus,
          createdAt: orderData.createdAt,
          ...orderData
        });
      });

      // Sort by createdAt desc in memory
      allOrders.sort((a, b) => {
        const getSecs = (val) => {
          if (!val) return 0;
          if (val.seconds !== undefined) return val.seconds;
          return new Date(val).getTime() / 1000;
        };
        return getSecs(b.createdAt) - getSecs(a.createdAt);
      });

    } catch (orderError) {
      console.error("Dashboard orders fetch error:", orderError);
    }

    setStats({
      totalRevenue,
      totalUsers,
      totalOrders: allOrders.length,
      totalProducts,
      outOfStock,
      lowStock,
      inStock: inStock || (totalProducts > 0 && outOfStock + lowStock === 0 ? totalProducts : inStock),
      // Mock growth values
      revenueGrowth: 12.5,
      userGrowth: 342,
      orderGrowth: 8.2,
      productGrowth: totalProducts > 0 ? Math.floor(totalProducts * 0.05) : 0
    });

    // 5. Recent Activities
    const activities = allOrders.slice(0, 5).map(order => ({
      id: order.id,
      user: order.userName,
      action: `placed an order of ₹${order.amount}`,
      time: order.createdAt?.seconds 
        ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : "Recently",
      icon: ShoppingCart,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }));
    setRecentActivities(activities);

    // 6. Chart Data Generation
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return { name: days[d.getDay()], date: d.toDateString(), visits: 0, sales: 0 };
    }).reverse();

    allOrders.forEach(order => {
      if (!order.createdAt) return;
      const seconds = order.createdAt.seconds || new Date(order.createdAt).getTime() / 1000;
      if (isNaN(seconds)) return;
      const orderDate = new Date(seconds * 1000).toDateString();
      const dayMatch = last7Days.find(d => d.date === orderDate);
      if (dayMatch) {
        dayMatch.sales += order.amount;
        dayMatch.visits = Math.floor(dayMatch.sales * 1.5 + Math.random() * 1000); 
      }
    });
    setChartData(last7Days);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest font-bold text-gray-400">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
          <p>Initialising Live Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's what's happening with your store today.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button 
            onClick={fetchData}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Sync Data
          </button>
         
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Revenue Card */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-3xl p-6 shadow-xl shadow-indigo-200 relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Revenue</p>
            <p className="text-4xl font-black mt-2">₹{stats.totalRevenue.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-6 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold">+{stats.revenueGrowth}%</span>
            </div>
          </div>
          <DollarSign className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
        </motion.div>

        {/* Users Card */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-6 shadow-xl shadow-emerald-100 relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Customers</p>
            <p className="text-4xl font-black mt-2">{stats.totalUsers.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-6 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
              <Users className="w-4 h-4 text-white" />
              <span className="text-xs font-bold">+{stats.userGrowth} this week</span>
            </div>
          </div>
          <Users className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
        </motion.div>

        {/* Orders Card */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-3xl p-6 shadow-xl shadow-orange-100 relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-orange-100 text-sm font-medium uppercase tracking-wider">Orders</p>
            <p className="text-4xl font-black mt-2">{stats.totalOrders.toLocaleString()}</p>
            <div className="flex items-center gap-2 mt-6 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
              <Activity className="w-4 h-4 text-white" />
              <span className="text-xs font-bold">+{stats.orderGrowth}% increase</span>
            </div>
          </div>
          <ShoppingCart className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10" />
        </motion.div>

        {/* Products Card */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -5 }}
          className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-3xl p-6 shadow-xl shadow-rose-100 relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-rose-100 text-[10px] font-black uppercase tracking-wider">Inventory Health</p>
                <p className="text-4xl font-black mt-1">{stats.totalProducts.toLocaleString()}</p>
                <p className="text-[11px] font-bold text-rose-100/80 mt-1">Total Products</p>
              </div>
              <Package className="w-10 h-10 text-white/20" />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-6">
              <div className="bg-white/10 rounded-xl p-2 text-center">
                <div className="text-xs font-black">{stats.inStock}</div>
                <div className="text-[8px] uppercase font-bold opacity-70">Active</div>
              </div>
              <div className="bg-white/10 rounded-xl p-2 text-center">
                <div className="text-xs font-black text-amber-200">{stats.lowStock}</div>
                <div className="text-[8px] uppercase font-bold opacity-70">Low</div>
              </div>
              <div className="bg-white/10 rounded-xl p-2 text-center">
                <div className="text-xs font-black text-rose-200">{stats.outOfStock}</div>
                <div className="text-[8px] uppercase font-bold opacity-70">Out</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sales Analytics</h2>
              <p className="text-gray-500 text-sm font-medium">Weekly performance tracker</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <span className="text-xs font-bold text-gray-600 uppercase">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-xs font-bold text-gray-600 uppercase">Projected</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}}
                />
                <Tooltip 
                  cursor={{ stroke: '#4f46e5', strokeWidth: 2, strokeDasharray: '5 5' }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ fontWeight: 800, fontSize: '14px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#4f46e5" 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  strokeWidth={4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight self-start mb-2">Device Reach</h2>
          <p className="text-gray-500 text-sm font-medium self-start mb-8">User entry points</p>
          <div className="h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full mt-auto">
            {deviceData.map((item, index) => (
              <div key={index} className="flex flex-col p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{item.name}</span>
                <span className="text-lg font-bold text-gray-800">{item.value}%</span>
                <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Timeline</h2>
              <p className="text-gray-500 text-sm font-medium">Real-time store events</p>
            </div>
            <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-indigo-100 transition-all">
              Full Logs
            </button>
          </div>
          <div className="space-y-6">
            {recentActivities.map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-5 group"
                >
                  <div className={`w-14 h-14 ${activity.bgColor} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                    <Icon className={`w-7 h-7 ${activity.color}`} />
                  </div>
                  <div className="flex-1 border-b border-gray-50 pb-4">
                    <div className="flex justify-between items-start">
                      <p className="text-gray-900 font-bold text-lg">
                        {activity.user}
                      </p>
                      <span className="text-xs font-black text-gray-400 uppercase tracking-tighter bg-gray-100 px-2 py-1 rounded-md">{activity.time}</span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1 font-medium">{activity.action}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="bg-gray-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-8 relative z-10">Key Indicators</h2>
          
          <div className="space-y-8 relative z-10">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Avg. Ticket Size</span>
                <span className="text-white font-black text-xl">₹{stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0}</span>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  className="h-full bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/20"
                ></motion.div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Conversion Rate</span>
                <span className="text-white font-black text-xl">3.8%</span>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '64%' }}
                  className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20"
                ></motion.div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Active Retention</span>
                <span className="text-white font-black text-xl">82%</span>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '82%' }}
                  className="h-full bg-rose-500 rounded-full shadow-lg shadow-rose-500/20"
                ></motion.div>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white/5 rounded-2xl p-4 border border-white/10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Activity className="text-indigo-400" />
              </div>
              <div>
                <p className="text-white font-bold">Health Score</p>
                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mt-1">Status: Excellent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}