import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import ProductManagement from "./components/Products/ProductManagement";
import Category from "./pages/Category";
import SubCategory from "./pages/SubCategory";
// import SubUnderCategory from "./pages/SubUnderCategory";
import Brands from "./pages/Brands";
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";
import Sellers from "./pages/Sellers";
import Coupons from "./pages/Coupons";
import Posters from "./pages/Posters";
import PythonAutomation from "./pages/PythonAutomation";
import JsonBulkUpload from "./pages/JsonUploadPage";
import AdminLogin from "./pages/Login";
import Profile from "./pages/Profile";
import Returns from "./pages/Returns";
// ✅ Protected Route
const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem("adminAuth") === "true";
  return isAuth ? children : <Navigate to="/login" />;
};

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <Routes>

        {/* 🔓 Login */}
        <Route path="/login" element={<AdminLogin />} />

        {/* 🔐 Admin Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex bg-gray-900 min-h-screen">
                <Sidebar
                  isOpen={isSidebarOpen}
                  onClose={() => setIsSidebarOpen(false)}
                />

                <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                  <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                  <main className="flex-1 overflow-auto bg-gray-900">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/products" element={<ProductManagement />} />
                      <Route path="/category" element={<Category />} />
                      <Route path="/sub-category" element={<SubCategory />} />
                      {/* <Route path="/sub-under-category" element={<SubUnderCategory />} /> */}
                      <Route path="/brands" element={<Brands />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/sellers" element={<Sellers />} />
                      <Route path="/coupons" element={<Coupons />} />
                      <Route path="/posters" element={<Posters />} />
                      <Route path="/python-automation" element={<PythonAutomation />} />
                      <Route path="/bulk-upload" element={<JsonBulkUpload />} />
                      <Route path="/returns" element={<Returns />} />
                      <Route path="/profile" element={<Profile/>} />
                    </Routes>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
