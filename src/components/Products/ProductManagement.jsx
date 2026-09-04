import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, getDocs, deleteDoc, doc, query, limit, startAfter, orderBy, getCountFromServer, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Package, ArrowLeft, Plus } from "lucide-react";

// Import separated components
import ProductList from "./ProductList";
import ProductForm from "./ProductForm";
import ProductDetails from "./ProductDetails";

const ProductManagement = () => {
  const [currentView, setCurrentView] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [pageAnchors, setPageAnchors] = useState({ 1: null });
  const [totalProducts, setTotalProducts] = useState(0);
  const [stats, setStats] = useState({ totalProducts: 0, outOfStock: 0, lowStock: 0, inStock: 0 });

  useEffect(() => {
    fetchAll();
    // fetchStats() is now manual/on-demand to save your Firebase quota
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
    setPageAnchors({ 1: null });
    fetchProducts(1);
  }, [filterCategory]); 

  const fetchStats = async () => {
    try {
      const coll = collection(db, "products");
      const totalSnap = await getCountFromServer(coll);
      setTotalProducts(totalSnap.data().count);
      
      const newStats = { totalProducts: totalSnap.data().count, outOfStock: 0, lowStock: 0, inStock: 0 };
      setTotalProducts(newStats.totalProducts);

      // 2. Attempt filtered counts with error handling for missing indexes or types
      try {
        const [outSnap, lowSnap, inSnap] = await Promise.all([
          getCountFromServer(query(coll, where("stock", "==", 0))),
          getCountFromServer(query(coll, where("stock", ">", 0), where("stock", "<=", 10))),
          getCountFromServer(query(coll, where("stock", ">", 10)))
        ]);

        newStats.outOfStock = outSnap.data().count;
        newStats.lowStock = lowSnap.data().count;
        newStats.inStock = inSnap.data().count;

        // Validation: If total > 0 but sum is 0, we likely have legacy string data or missing/different field names
        if (newStats.totalProducts > 0 && (newStats.outOfStock + newStats.lowStock + newStats.inStock === 0)) {
           console.warn("Stock queries returned zero but total is > 0. Using total as 'In Stock' fallback.");
           newStats.inStock = newStats.totalProducts;
        }
      } catch (err) {
        console.warn("Detailed stats queries failed:", err.message);
        // Fallback: Just show total as "In Stock" so the UI isn't empty
        newStats.inStock = newStats.totalProducts;
      }

      setStats(newStats);
    } catch (error) {
      if (error.code === "resource-exhausted" || error.message?.includes("quota")) {
        console.warn("⚠️ Firestore Quota Exceeded for today. Stats might be inaccurate.");
      } else {
        console.error("Critical error in fetchStats:", error);
      }
    }
  };

  const fetchProducts = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const productsRef = collection(db, "products");
      let constraints = [];
      
      if (!filterCategory) {
        constraints.push(orderBy("name"));
      } else {
        constraints.push(where("category", "==", filterCategory));
      }

      // Pagination logic
      const anchor = pageAnchors[pageNumber];
      if (anchor) {
        constraints.push(startAfter(anchor));
      }
      
      constraints.push(limit(pageSize));

      const q = query(productsRef, ...constraints);
      const snapshot = await getDocs(q);
      
      const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(newProducts);
      
      // Update anchors for NEXT page
      if (snapshot.docs.length === pageSize) {
        setPageAnchors(prev => ({
          ...prev,
          [pageNumber + 1]: snapshot.docs[snapshot.docs.length - 1]
        }));
      }

      setHasMore(snapshot.docs.length === pageSize);
      setCurrentPage(pageNumber);
      
    } catch (error) {
      if (error.code === "resource-exhausted" || error.message?.includes("quota")) {
        console.warn("⚠️ Firestore Quota Exceeded.");
      } else {
        console.error("Error fetching products:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [categoriesSnap, subCategoriesSnap, productsCountSnap] = await Promise.all([
        getDocs(collection(db, "categories")),
        getDocs(collection(db, "subcategories")),
        getCountFromServer(collection(db, "products"))
      ]);

      const catData = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(catData);
      setSubCategories(subCategoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      const totalCount = productsCountSnap.data().count;
      setTotalProducts(totalCount);
      setStats(prev => ({ ...prev, totalProducts: totalCount }));

      // Automatically fetch stock stats during initial sync
      await fetchStats();
      await fetchProducts();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setCurrentView('add');
    setSelectedProduct(null);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setCurrentView('edit');
  };

  const handleView = (product) => {
    setSelectedProduct(product);
    setCurrentView('view');
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedProduct(null);
    setSearchTerm("");
  };

  const filteredProducts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const filterCatId = filterCategory;
    const filterCatName = categories.find(c => c.id === filterCatId)?.name?.toLowerCase();

    return products.filter((p) => {
      // 1. Search Match (Name, SKU, Brand, Keywords)
      const name = String(p.name || "").toLowerCase();
      const sku = String(p.sku || p.basesku || p.baseSku || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      const keywords = Array.isArray(p.searchKeywords) ? p.searchKeywords.join(" ").toLowerCase() : "";

      const searchMatch = !term ||
        name.includes(term) ||
        sku.includes(term) ||
        brand.includes(term) ||
        keywords.includes(term);

      // 2. Category Match (ID or Name)
      if (!filterCatId) return searchMatch;

      const prodCat = String(p.category || p.categoryId || p.Category || "").toLowerCase();
      const prodCatName = String(p.categoryName || "").toLowerCase();

      const categoryMatch =
        prodCat === filterCatId.toLowerCase() ||
        (filterCatName && (prodCat === filterCatName || prodCatName === filterCatName));

      return searchMatch && categoryMatch;
    });
  }, [products, debouncedSearch, filterCategory, categories]);

  const getCategoryName = (idOrName) => {
    if (!idOrName) return "N/A";
    const cat = categories.find(c => c.id === idOrName || c.name === idOrName || c.id === String(idOrName));
    return cat ? cat.name : idOrName;
  };

  const getSubCategoryName = (idOrName) => {
    if (!idOrName) return "";
    const sub = subCategories.find(s => s.id === idOrName || s.name === idOrName || s.id === String(idOrName));
    return sub ? sub.name : idOrName;
  };

  return (
    <div className="min-h-screen bg-[#fcfdff] w-full pb-10">
      {/* MANAGEMENT HEADER (RESPONSIVE) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="px-4 md:px-8 py-6 md:py-8 bg-white border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-30"
        >
          <div className="flex items-center gap-4">
            {currentView !== 'list' && (
              <button
                onClick={handleBackToList}
                className="p-2 hover:bg-gray-50 rounded-xl transition-all border border-gray-100 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                <Package className="text-indigo-600 hidden sm:block" />
                {currentView === 'list' && "Product Hub"}
                {currentView === 'add' && "New Creation"}
                {currentView === 'edit' && "Refining Product"}
                {currentView === 'view' && "Product Spotlight"}
              </h1>
              <p className="text-gray-500 text-sm font-medium mt-1">
                {currentView === 'list' && "Overview of your digital inventory."}
                {currentView === 'add' && "Expanding your marketplace catalog."}
                {currentView === 'edit' && `Modifying: ${selectedProduct?.name}`}
                {currentView === 'view' && "Deep dive into product metrics."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {currentView === 'list' && (
              <>
                <button
                  onClick={fetchStats}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-100 font-bold text-sm transition-all shadow-sm"
                  title="Recalculate inventory totals (Uses Firestore Quota)"
                >
                  <RefreshCw className="w-4 h-4" />
                  Stats
                </button>
                <button
                  onClick={fetchAll}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-all shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Sync
                </button>
                <button
                  onClick={handleAddNew}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm transition-all shadow-lg shadow-indigo-100"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </button>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <main className="max-w-[1600px] mx-auto transition-all duration-300 mt-6 px-4 md:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {currentView === 'add' && (
              <ProductForm
                mode="add"
                categories={categories}
                subCategories={subCategories}
                onSave={() => { fetchAll(); handleBackToList(); }}
                onCancel={handleBackToList}
              />
            )}
            {currentView === 'edit' && (
              <ProductForm
                mode="edit"
                product={selectedProduct}
                categories={categories}
                subCategories={subCategories}
                onSave={() => { fetchAll(); handleBackToList(); }}
                onCancel={handleBackToList}
              />
            )}
            {currentView === 'view' && (
              <ProductDetails
                product={selectedProduct}
                categories={categories}
                subCategories={subCategories}
                onEdit={handleEdit}
                onClose={handleBackToList}
              />
            )}
            {currentView === 'list' && (
              <ProductList
                products={filteredProducts}
                categories={categories}
                subCategories={subCategories}
                loading={loading}
                loadingMore={loadingMore}
                hasMore={hasMore}
                currentPage={currentPage}
                pageSize={pageSize}
                totalProducts={totalProducts}
                onPageChange={fetchProducts}
                stats={stats}
                searchTerm={searchTerm}
                filterCategory={filterCategory}
                filterStatus={filterStatus}
                onSearchChange={setSearchTerm}
                onCategoryFilterChange={setFilterCategory}
                onStatusFilterChange={setFilterStatus}
                onAddNew={handleAddNew}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={handleDelete}
                onRefresh={fetchAll}
                getCategoryName={getCategoryName}
                getSubCategoryName={getSubCategoryName}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default ProductManagement;