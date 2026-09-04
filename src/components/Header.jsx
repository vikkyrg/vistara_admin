import React, { useState, useEffect, useRef } from "react";
import { 
  Menu, ShoppingBag, LogOut, User, 
  ChevronDown, Settings, Bell, Search 
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";

const Header = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [adminData, setAdminData] = useState({ name: "Admin", profile: "" });
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchAdminProfile();
    
    // Close dropdown on click outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAdminProfile = async () => {
    try {
      const email = localStorage.getItem("adminEmail");
      if (!email) return;

      const q = query(collection(db, "admin"), where("email", "==", email));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setAdminData({
          name: data.name || "Admin",
          profile: data.profile || ""
        });
      }
    } catch (err) {
      console.error("Error fetching admin header profile:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminEmail");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-8 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left: Menu & Brand */}
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </motion.button>

          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">
                VISTARAA
              </h1>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Control Panel</span>
            </div>
          </Link>
        </div>

        {/* Center: Search (Optional/Decorative) */}
        <div className="hidden md:flex flex-1 max-w-md relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search analytics..."
            className="w-full bg-gray-50 border-none rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-3">
          <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl relative transition-all">
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="relative" ref={dropdownRef}>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 bg-white"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-indigo-100 shadow-sm bg-indigo-50">
                {adminData.profile ? (
                  <img src={adminData.profile} alt="P" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={18} className="text-indigo-400" />
                  </div>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-bold text-gray-900 leading-none">{adminData.name}</p>
                <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-tighter">Super Admin</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl shadow-indigo-100 border border-gray-100 overflow-hidden py-2 z-50"
                >
                  <div className="px-5 py-4 border-b border-gray-50">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Account</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{localStorage.getItem("adminEmail")}</p>
                  </div>

                  <div className="p-2 space-y-1">
                    <Link
                      to="/profile"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all"
                    >
                      <User size={18} />
                      View Profile
                    </Link>
                  </div>

                  <div className="p-2 border-t border-gray-50">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                    >
                      <LogOut size={18} />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
