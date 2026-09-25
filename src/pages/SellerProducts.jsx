import React, { useState, useEffect } from "react";
import {
  RefreshCw, Trash2, Eye, Search,
  ChevronDown, ChevronUp, Package
} from "lucide-react";

import { db } from "../firebase/config";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

const SellerProductsDashboard = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellersMap, setSellersMap] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [viewProduct, setViewProduct] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Load ALL products
  const loadProducts = async () => {
    setLoading(true);

    try {
      const sellersData = {};

      const sellersSnap = await getDocs(collection(db, "sellers"));
      sellersSnap.docs.forEach(d => {
        const s = d.data();
        let name = s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim();
        if (!name) name = s.businessName;
        else if (s.businessName && s.businessName !== name) name = `${name} (${s.businessName})`;
        
        if (name) {
          sellersData[d.id] = name;
          if (s.email) sellersData[s.email] = name;
          if (s.sellerId) sellersData[s.sellerId] = name;
        }
      });

      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.docs.forEach(d => {
        const u = d.data();
        let name = u.userName || `${u.firstName || ''} ${u.lastName || ''}`.trim();
        if (name) {
          if (!sellersData[d.id]) sellersData[d.id] = name;
          if (u.email && !sellersData[u.email]) sellersData[u.email] = name;
        }
      });

      setSellersMap(sellersData);
    } catch (e) {
      console.error("Error loading sellers map:", e);
    }

    const snap = await getDocs(collection(db, "products"));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setProducts(items);
    setFiltered(items);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    let data = [...products];

    if (searchTerm) {
      data = data.filter((p) =>
        (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    data.sort((a, b) => {
      let A = a[sortBy] || "";
      let B = b[sortBy] || "";

      if (typeof A === "number" && typeof B === "number") {
        return sortOrder === "asc" ? A - B : B - A;
      } else {
        A = String(A).toLowerCase();
        B = String(B).toLowerCase();
        return sortOrder === "asc" ? A.localeCompare(B) : B.localeCompare(A);
      }
    });

    setFiltered(data);
    setPage(1);
  }, [searchTerm, sortBy, sortOrder, products]);

  // Delete product
  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    await deleteDoc(doc(db, "seller_products", id));
    await deleteDoc(doc(db, "products", id));
    loadProducts();
  };

  // Approve product
  const approveProduct = async (id) => {
    if (!window.confirm("Approve this product?")) return;

    await updateDoc(doc(db, "products", id), {
      status: "approved"
    });
    loadProducts();
  };

  // Reject product
  const rejectProduct = async (id) => {
    if (!window.confirm("Reject this product?")) return;

    await updateDoc(doc(db, "products", id), {
      status: "rejected"
    });
    loadProducts();
  };

  const openView = (p) => {
    setViewProduct(p);
    setIsViewOpen(true);
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const items = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-900 p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Products Overview</h1>
          <p className="text-gray-400">View and manage all products</p>
        </div>

        <button
          onClick={loadProducts}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search products"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg"
          />
        </div>

        <select
          className="bg-gray-800 text-white px-3 py-2 rounded-lg"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="price">Sort by Price</option>
          <option value="stock">Sort by Stock</option>
          <option value="category">Category</option>
        </select>

        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="px-3 py-2 bg-gray-700 text-white rounded-lg"
        >
          {sortOrder === "asc" ? <ChevronDown /> : <ChevronUp />}
        </button>
      </div>

      {/* PRODUCT TABLE */}
      <div className="bg-gray-800 rounded-xl p-4">
        <table className="w-full text-white">
          <thead className="text-gray-400">
            <tr>
              <th className="py-3 text-left">Product</th>
              <th className="py-3 text-left">Category</th>
              <th className="py-3 text-left">Price</th>
              <th className="py-3 text-left">Stock</th>
              <th className="py-3 text-left">Status</th>
              <th className="py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
              <td colSpan="6" className="text-center py-8">Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-400">
                  No products found
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-700 hover:bg-gray-700/40"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-600 rounded-lg overflow-hidden">
                        {p.images?.length ? (
                          <img
                            src={p.images[0]?.url || p.images[0]}
                            className="w-full h-full object-cover"
                            alt={p.name}
                          />
                        ) : (
                          <Package className="text-gray-300 m-auto" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-gray-400 text-sm">
                          Seller: {sellersMap[p.sellerId] || sellersMap[p.sellerid] || sellersMap[p.sellerEmail] || p.sellerEmail || p.sellerId || p.sellerid || "Unknown"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>{p.category}</td>
                  <td>₹{p.price}</td>

                  <td>
                    <span
                      className={`px-2 py-1 rounded-lg text-sm ${
                        p.stock === 0
                          ? "bg-red-600/30 text-red-400"
                          : p.stock <= 10
                          ? "bg-yellow-600/30 text-yellow-400"
                          : "bg-green-600/30 text-green-400"
                      }`}
                    >
                      {p.stock} units
                    </span>
                  </td>

                  <td>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
                        p.status === 'pending' ? 'bg-amber-100 text-amber-600' : p.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {p.status || 'approved'}
                    </span>
                  </td>

                  <td>
                    <div className="flex gap-3">
                      {p.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveProduct(p.id)}
                            className="px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-xs font-bold uppercase"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectProduct(p.id)}
                            className="px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs font-bold uppercase"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => openView(p)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="text-red-400 hover:text-red-300"
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

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-30"
            >
              Previous
            </button>

            <div className="text-gray-400">
              Page {page} of {totalPages}
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* VIEW PRODUCT MODAL */}
      {isViewOpen && viewProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 w-full max-w-3xl rounded-xl p-6 relative text-white overflow-y-auto max-h-[90vh]">

            <button
              className="absolute top-3 right-3"
              onClick={() => setIsViewOpen(false)}
            >
              ✖
            </button>

            <h2 className="text-2xl font-bold mb-4">Product Details</h2>

            {/* ALL IMAGES */}
            {viewProduct.images?.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {viewProduct.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img?.url || img}
                    alt="Product"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 text-sm bg-gray-900/50 p-6 rounded-xl border border-gray-700">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Name</p>
                  <p className="font-medium text-lg">{viewProduct.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Brand</p>
                    <p className="font-medium">{viewProduct.brand || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">SKU</p>
                    <p className="font-medium text-gray-300">{viewProduct.sku || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Category Path</p>
                  <p className="font-medium text-indigo-300">
                    {viewProduct.categoryName || viewProduct.category} 
                    {viewProduct.subcategoryName ? ` > ${viewProduct.subcategoryName}` : ''}
                    {viewProduct.subunderName ? ` > ${viewProduct.subunderName}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Description</p>
                  <p className="text-gray-300 leading-relaxed max-h-32 overflow-y-auto pr-2 whitespace-pre-wrap">{viewProduct.description}</p>
                </div>
                <div className="flex gap-3 mt-2">
                  {viewProduct.active && <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Active</span>}
                  {viewProduct.featured && <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Featured</span>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Regular Price</p>
                    <p className="font-medium text-lg text-gray-400 line-through">₹{viewProduct.price}</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg border border-emerald-900/50">
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Sale Price</p>
                    <p className="font-medium text-xl text-emerald-400">₹{viewProduct.salePrice || viewProduct.price}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Total Stock</p>
                    <p className="font-medium text-xl text-indigo-400">{viewProduct.stock}</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">HSN Code</p>
                    <p className="font-medium text-lg text-gray-300">{viewProduct.hsn || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-1">Seller Details</p>
                  <p className="font-mono text-gray-400 text-xs bg-gray-800 p-3 rounded border border-gray-700 leading-relaxed">
                    <span className="text-gray-500">ID:</span> {viewProduct.sellerId || viewProduct.sellerid || 'N/A'}<br/>
                    <span className="text-gray-500">Email:</span> {viewProduct.sellerEmail || 'N/A'}
                  </p>
                </div>

                {Array.isArray(viewProduct.variants) && viewProduct.variants.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-bold mb-2">Variants ({viewProduct.variants.length})</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {viewProduct.variants.map((v, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700 text-xs shadow-sm">
                          <span className="font-bold text-gray-200">Size/Color: {v.size}</span>
                          <span className="text-gray-400">SKU: {v.sku}</span>
                          <span className="text-emerald-400 font-bold">₹{v.price}</span>
                          <span className="text-indigo-400 font-bold">{v.stock} pcs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              className="mt-5 w-full bg-blue-600 py-2 rounded-lg"
              onClick={() => setIsViewOpen(false)}
            >
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default SellerProductsDashboard;
