import React, { useState, useEffect } from "react";
import {
  RefreshCw, Trash2, Eye, Search,
  ChevronDown, ChevronUp, Package
} from "lucide-react";

import { db } from "../firebase/config";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const SellerProductsDashboard = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

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

    const snap = await getDocs(collection(db, "seller_products"));
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
              <th className="py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-8">Loading...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-400">
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
                            src={p.images[0]}
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
                          Seller: {p.sellerid}
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
                    <div className="flex gap-3">
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
                    src={img}
                    alt="Product"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}

            <div className="space-y-3 text-sm">

              <p><strong>Name:</strong> {viewProduct.name}</p>
              <p><strong>Brand:</strong> {viewProduct.brand}</p>
              <p><strong>Description:</strong> {viewProduct.description}</p>
              <p><strong>Category:</strong> {viewProduct.category}</p>

              <p><strong>Price:</strong> ₹{viewProduct.price}</p>
              <p><strong>Item Price:</strong> ₹{viewProduct.itemPrice}</p>
              <p><strong>Stock:</strong> {viewProduct.stock}</p>

              <p><strong>Minimum Order:</strong> {viewProduct.minimumOrder}</p>
              <p><strong>Quantity:</strong> {viewProduct.quantity}</p>
              <p><strong>Weight:</strong> {viewProduct.weight}</p>

              {/* SAFE SPECIFICATIONS RENDER */}
              {Array.isArray(viewProduct.specifications) && (
                <div>
                  <strong>Specifications:</strong>
                  <ul className="mt-1 list-disc pl-5">
                    {viewProduct.specifications.map((s, i) => (
                      <li key={i}>
                        <strong>{s.key}:</strong> {s.value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p><strong>Warranty:</strong> {viewProduct.warranty}</p>
              <p><strong>Age:</strong> {viewProduct.age}</p>

              <p><strong>Seller ID:</strong> {viewProduct.sellerid}</p>
              <p><strong>Seller Neo ID:</strong> {viewProduct.seller_neoid}</p>
              <p><strong>Neo Mongo ID:</strong> {viewProduct.neoMongoId}</p>
              <p><strong>Neo Seller ID:</strong> {viewProduct.neoSellerId}</p>

              <p><strong>Category ID:</strong> {viewProduct.categoryID}</p>

              {/* PAYMENT ARRAY */}
              {Array.isArray(viewProduct.payment) && (
                <p>
                  <strong>Payment Supported:</strong>{" "}
                  {viewProduct.payment.join(", ")}
                </p>
              )}

              <p><strong>Date Added:</strong> {viewProduct.date}</p>

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
