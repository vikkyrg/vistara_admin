import React, { useState, useEffect } from "react";
import { 
  Percent, 
  Save, 
  CheckCircle2, 
  DollarSign, 
  Calculator, 
  Info, 
  RefreshCw, 
  TrendingUp,
  ShieldCheck,
  Building2,
  Globe
} from "lucide-react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, query, where, writeBatch } from "firebase/firestore";

const Commission = () => {
  const [commissionRate, setCommissionRate] = useState(0);
  const [inputRate, setInputRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Live calculator test state
  const [testCost, setTestCost] = useState(100000);

  // Fetch saved commission rate from Firestore
  const fetchCommission = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "settings", "commission");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const rate = Number(data.percentage || 0);
        setCommissionRate(rate);
        setInputRate(rate.toString());
      } else {
        setCommissionRate(0);
        setInputRate("0");
      }
    } catch (err) {
      console.error("Error fetching commission rate:", err);
      setErrorMessage("Failed to load commission settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommission();
  }, []);

  // Save updated commission rate to Firestore and apply to existing products
  const handleSave = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    const parsedRate = parseFloat(inputRate);
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setErrorMessage("Please enter a valid percentage between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      // 1. Save the new global setting
      const docRef = doc(db, "settings", "commission");
      await setDoc(docRef, {
        percentage: parsedRate,
        updatedAt: Timestamp.now()
      }, { merge: true });

      setSuccessMessage(`⏳ Saving commission (${parsedRate}%) and applying to all approved products...`);

      // 2. Fetch all approved products
      const productsRef = collection(db, "products");
      const q = query(productsRef, where("status", "==", "approved"));
      const snapshot = await getDocs(q);
      
      const products = snapshot.docs;
      
      // 3. Batch update existing approved products (Firebase batch limit is 500)
      const MAX_BATCH_SIZE = 450;
      for (let i = 0; i < products.length; i += MAX_BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = products.slice(i, i + MAX_BATCH_SIZE);
        
        chunk.forEach((productDoc) => {
          const p = productDoc.data();
          
          let basePrice = Number(p.sellerPrice || p.price || 0);
          let baseSalePrice = p.sellerSalePrice ? Number(p.sellerSalePrice) : (p.salePrice ? Number(p.salePrice) : basePrice);

          let finalPrice = basePrice + (basePrice * parsedRate / 100);
          let finalSalePrice = baseSalePrice + (baseSalePrice * parsedRate / 100);

          let updates = {
            adminCommissionPercentage: parsedRate,
            sellerPrice: basePrice,
            sellerSalePrice: baseSalePrice,
            price: finalPrice,
            salePrice: finalSalePrice,
          };

          if (p.variants && p.variants.length > 0) {
            updates.variants = p.variants.map(v => {
              let vBasePrice = Number(v.sellerPrice || v.price || 0);
              let vFinalPrice = vBasePrice + (vBasePrice * parsedRate / 100);
              let vBaseSalePrice = v.sellerSalePrice ? Number(v.sellerSalePrice) : (v.salePrice ? Number(v.salePrice) : vBasePrice);
              let vFinalSalePrice = vBaseSalePrice + (vBaseSalePrice * parsedRate / 100);

              return {
                ...v,
                sellerPrice: vBasePrice,
                sellerSalePrice: vBaseSalePrice,
                price: vFinalPrice,
                salePrice: vFinalSalePrice
              };
            });
          }
          
          batch.update(doc(db, "products", productDoc.id), updates);
        });
        
        await batch.commit();
      }

      setCommissionRate(parsedRate);
      setSuccessMessage(`✅ Commission successfully updated to ${parsedRate}% and dynamically applied to ${products.length} existing products!`);
      setTimeout(() => setSuccessMessage(""), 6000);
    } catch (err) {
      console.error("Error saving commission rate:", err);
      setErrorMessage("Failed to save commission rate or update products. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Calculations for live preview
  const numCost = Number(testCost) || 0;
  const numRate = Number(inputRate) >= 0 ? Number(inputRate) : commissionRate;
  const commissionAmount = (numCost * numRate) / 100;
  const finalPrice = numCost + commissionAmount;

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 lg:p-8 text-white">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Percent className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Admin Commission
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Set default percentage commission automatically applied to products upon admin approval.
          </p>
        </div>

        <button
          onClick={fetchCommission}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl transition text-sm font-semibold shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Settings
        </button>
      </div>

      {/* ALERT MESSAGES */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 font-medium animate-fadeIn shadow-lg shadow-emerald-500/5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 font-medium shadow-lg shadow-rose-500/5">
          <Info className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: Commission Configuration Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-b from-gray-800/90 to-gray-800/60 rounded-3xl p-6 sm:p-8 border border-gray-700/80 shadow-2xl relative overflow-hidden backdrop-blur-xl">

            {/* Glowing Accent */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Commission Settings
              </h2>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Global Rule
              </span>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Commission Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={inputRate}
                    onChange={(e) => setInputRate(e.target.value)}
                    placeholder="e.g. 3"
                    className="w-full bg-gray-900/80 text-white text-2xl font-bold px-5 py-4 rounded-2xl border border-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition pl-12 placeholder-gray-600"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">
                    %
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  When admin approves seller products, this percentage is added on top of the seller's base price automatically.
                </p>
              </div>

              {/* CURRENT STATUS BADGE */}
              <div className="p-4 bg-gray-900/60 rounded-2xl border border-gray-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Currently Saved Rate</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">{commissionRate}%</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || loading}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl transition shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 text-base disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? "Saving Changes..." : "Save Commission Rate"}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Cost Preview Calculator & Flow Explanation */}
        <div className="lg:col-span-7 space-y-6">

          {/* CALCULATOR CARD */}
          <div className="bg-gradient-to-b from-gray-800/90 to-gray-800/60 rounded-3xl p-6 sm:p-8 border border-gray-700/80 shadow-2xl relative backdrop-blur-xl">

            <div className="flex items-center justify-between mb-6 border-b border-gray-700/70 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-400" /> Cost & Commission Preview Calculator
              </h2>
              <span className="text-xs text-gray-400 font-medium">Interactive Demo</span>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Seller Set Product Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₹</span>
                  <input
                    type="number"
                    value={testCost}
                    onChange={(e) => setTestCost(e.target.value)}
                    placeholder="Enter product cost (e.g. 100000)"
                    className="w-full bg-gray-900/80 text-white text-xl font-bold pl-9 pr-4 py-3.5 rounded-2xl border border-gray-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition"
                  />
                </div>
              </div>

              {/* BREAKDOWN DISPLAY GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. Seller Cost */}
                <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-700/80">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    <Building2 className="w-4 h-4 text-blue-400" /> Seller Set Cost
                  </div>
                  <p className="text-2xl font-black text-gray-100">
                    ₹{numCost.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">Displayed in Seller Panel</p>
                </div>

                {/* 2. Admin Commission */}
                <div className="bg-gray-900/80 p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                    <Percent className="w-4 h-4 text-purple-400" /> Admin ({numRate}%)
                  </div>
                  <p className="text-2xl font-black text-purple-400">
                    +₹{commissionAmount.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-purple-400/70 mt-1">Added upon Approval</p>
                </div>

                {/* 3. Final Cost */}
                <div className="bg-gray-900/80 p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">
                    <Globe className="w-4 h-4 text-emerald-400" /> Website Price
                  </div>
                  <p className="text-2xl font-black text-emerald-400">
                    ₹{finalPrice.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-emerald-400/70 mt-1">Website & Admin View</p>
                </div>

              </div>

              {/* CALCULATION SUMMARY BANNER */}
              <div className="p-4 bg-gradient-to-r from-indigo-950/50 via-purple-950/50 to-gray-900 rounded-2xl border border-indigo-500/30 text-sm leading-relaxed text-indigo-200">
                <span className="font-bold text-white">Price Calculation Breakdown: </span>
                Seller cost <span className="font-bold text-white">₹{numCost.toLocaleString("en-IN")}</span> + 
                Admin commission <span className="font-bold text-purple-300">{numRate}% (₹{commissionAmount.toLocaleString("en-IN")})</span> = 
                Total Website Display Price <span className="font-bold text-emerald-300">₹{finalPrice.toLocaleString("en-IN")}</span>.
              </div>

            </div>
          </div>

          {/* HOW IT WORKS INFO BOX */}
          <div className="bg-gray-800/40 rounded-3xl p-6 border border-gray-700/60 text-sm space-y-3">
            <h3 className="font-bold text-gray-200 flex items-center gap-2 text-base">
              <Info className="w-5 h-5 text-indigo-400" /> Automated Product Approval & Pricing Flow
            </h3>
            <ul className="space-y-2 text-gray-400 list-disc list-inside text-xs leading-relaxed">
              <li><strong className="text-gray-300">Seller Panel:</strong> Seller submits a product with their base cost (e.g., ₹100,000).</li>
              <li><strong className="text-gray-300">Admin Approval:</strong> Admin approves the product in <em>Pending Approvals</em>. The system automatically fetches the saved commission percentage ({commissionRate}%) and calculates the final price.</li>
              <li><strong className="text-gray-300">Website & Admin Display:</strong> Customers on the website and Admin view the final product cost with commission included (e.g., ₹103,000).</li>
              <li><strong className="text-gray-300">Seller View:</strong> Seller panel continues to show the seller's original base cost (₹100,000).</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Commission;
