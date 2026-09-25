import React, { useState, useEffect } from "react";
import {
  RefreshCw, Trash2, Eye, Search,
  ChevronDown, ChevronUp, Package, Check, X
} from "lucide-react";

import { db } from "../../firebase";
import { collection, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore";

const PendingApprovals = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellersMap, setSellersMap] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [viewProduct, setViewProduct] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [approvePopupId, setApprovePopupId] = useState(null);
  const [commissionYesNo, setCommissionYesNo] = useState(null);
  const [commissionPercent, setCommissionPercent] = useState("");

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Load PENDING products
  const loadProducts = async () => {
    setLoading(true);

    try {
      const sellersData = {};

      // 1. Fetch Sellers
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

      // 2. Fetch Users
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
      console.error("Error fetching sellers/users:", e);
    }

    const q = query(collection(db, "products"), where("status", "==", "pending"));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setProducts(items);
    setFiltered(items);
    setLoading(false);
  };

  useEffect(() => {
    localStorage.setItem('lastSeenPendingTime', Date.now().toString());
    window.dispatchEvent(new Event('pendingSeen'));
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

    await deleteDoc(doc(db, "products", id));
    loadProducts();
  };

  // Approve product
  const approveProduct = (id) => {
    const p = products.find(prod => prod.id === id) || (viewProduct?.id === id ? viewProduct : null);
    if(p) setApprovePopupId(p);
  };

  const handleFinalApprove = async () => {
    if (!approvePopupId) return;
    const p = approvePopupId;
    let newPrice = Number(p.price);
    let newSalePrice = p.salePrice ? Number(p.salePrice) : Number(p.price);

    let updates = { status: "approved" };

    if (commissionYesNo === "yes" && commissionPercent) {
      const percent = Number(commissionPercent);
      if (!isNaN(percent) && percent > 0) {
        newPrice = newPrice + (newPrice * percent / 100);
        newSalePrice = newSalePrice + (newSalePrice * percent / 100);
        
        updates = {
          ...updates,
          adminCommissionPercentage: percent,
          sellerPrice: Number(p.price),
          sellerSalePrice: p.salePrice ? Number(p.salePrice) : Number(p.price),
          price: newPrice,
          salePrice: newSalePrice,
        };
        
        if (p.variants && p.variants.length > 0) {
          updates.variants = p.variants.map(v => {
             let vPrice = Number(v.price);
             let vNewPrice = vPrice + (vPrice * percent / 100);
             return {
               ...v,
               sellerPrice: vPrice,
               price: vNewPrice
             };
          });
        }
      }
    }

    await updateDoc(doc(db, "products", p.id), updates);
    setApprovePopupId(null);
    setCommissionYesNo(null);
    setCommissionPercent("");
    setIsViewOpen(false);
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
          <h1 className="text-3xl font-bold text-white">Pending Approvals</h1>
          <p className="text-gray-400">Review products waiting to go live</p>
        </div>

        <button
          onClick={loadProducts}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg flex items-center gap-2 hover:bg-gray-600 transition"
        >
          <RefreshCw size={16} /> Refresh
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
      <div className="bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700">
        <table className="w-full text-white">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="py-4 text-left">Product</th>
              <th className="py-4 text-left">Category</th>
              <th className="py-4 text-left">Price</th>
              <th className="py-4 text-left">Status</th>
              <th className="py-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
              <td colSpan="5" className="text-center py-10">Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Check size={40} className="text-green-500/50" />
                    <p>No products waiting for approval. You're all caught up!</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-600 rounded-lg overflow-hidden shadow-sm">
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
                        <div className="font-semibold text-gray-100">{p.name}</div>
                        <div className="text-gray-400 text-xs mt-1">
                          Seller: {sellersMap[p.sellerId] || sellersMap[p.sellerid] || sellersMap[p.sellerEmail] || p.sellerEmail || p.sellerId || p.sellerid || "Unknown"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="text-gray-300">{p.category}</td>
                  <td className="text-gray-300 font-medium">₹{p.price}</td>

                  <td>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Pending
                    </span>
                  </td>

                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveProduct(p.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-600/30 rounded-lg text-xs font-bold uppercase transition"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => rejectProduct(p.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 border border-rose-600/30 rounded-lg text-xs font-bold uppercase transition"
                      >
                        <X size={14} /> Reject
                      </button>
                      
                      <button
                        onClick={() => openView(p)}
                        className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 rounded-lg transition ml-2"
                        title="View Details"
                      >
                        <Eye size={18} />
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
          <div className="flex justify-between items-center mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-30 hover:bg-gray-600 transition"
            >
              Previous
            </button>

            <div className="text-gray-400 text-sm">
              Page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{totalPages}</span>
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-30 hover:bg-gray-600 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* VIEW PRODUCT MODAL */}
      {isViewOpen && viewProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 w-full max-w-3xl rounded-2xl p-6 relative text-white overflow-y-auto max-h-[90vh] shadow-2xl border border-gray-700">

            <button
              className="absolute top-4 right-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition"
              onClick={() => setIsViewOpen(false)}
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-100 flex items-center gap-3">
              <Package className="text-indigo-400" /> Product Details
            </h2>

            {/* ALL IMAGES */}
            {viewProduct.images?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {viewProduct.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img?.url || img}
                    alt="Product"
                    className="w-full h-40 object-cover rounded-xl shadow-md border border-gray-700"
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

            <div className="mt-8 flex gap-4">
              <button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-900/20"
                onClick={() => {
                  approveProduct(viewProduct.id);
                  setIsViewOpen(false);
                }}
              >
                Approve Product
              </button>
              <button
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-rose-900/20"
                onClick={() => {
                  rejectProduct(viewProduct.id);
                  setIsViewOpen(false);
                }}
              >
                Reject Product
              </button>
            </div>

          </div>
        </div>
      )}

      {/* COMMISSION POPUP */}
      {approvePopupId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 w-full max-w-md rounded-2xl p-6 relative text-white shadow-2xl border border-gray-700">
            <button
              className="absolute top-4 right-4 p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition"
              onClick={() => {
                setApprovePopupId(null);
                setCommissionYesNo(null);
                setCommissionPercent("");
              }}
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Approve Product</h2>
            <p className="mb-4">Do you want to add a commission/percentage to this product?</p>
            <div className="flex gap-4 mb-4">
              <button
                className={`px-4 py-2 rounded-lg font-bold transition ${commissionYesNo === 'yes' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                onClick={() => setCommissionYesNo('yes')}
              >
                Yes
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-bold transition ${commissionYesNo === 'no' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                onClick={() => {
                  setCommissionYesNo('no');
                  setCommissionPercent("");
                }}
              >
                No
              </button>
            </div>
            
            {commissionYesNo === 'yes' && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-400 mb-2">Commission Percentage (%)</label>
                <input
                  type="number"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition mt-4 disabled:opacity-50"
              onClick={handleFinalApprove}
              disabled={commissionYesNo === null || (commissionYesNo === 'yes' && !commissionPercent)}
            >
              Confirm Approval
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default PendingApprovals;
