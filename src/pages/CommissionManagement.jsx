import React, { useState, useEffect } from 'react';
import { Settings, Tag, Users, Edit, Trash2, TrendingUp, DollarSign, Search, Zap, XCircle, AlertTriangle } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, setLogLevel, getDoc } from 'firebase/firestore'; 
// Note: setLogLevel('debug') is added later for logging

// --- MOCK DATA REMOVED, INITIALIZING EMPTY STATES ---

const CommissionManagement = () => {
    // --- FIREBASE AND DATA STATES ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- APPLICATION STATES ---
    const [activeTab, setActiveTab] = useState('category');
    const [categoryRules, setCategoryRules] = useState([]); // Real data will populate this
    const [sellerOverrides, setSellerOverrides] = useState([]); // Real data will populate this
    const [overrideSearchTerm, setOverrideSearchTerm] = useState('');
    
    // Custom Modal State (Replacing window.confirm/alert)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [itemToRemove, setItemToRemove] = useState(null); 

    // 1. FIREBASE INITIALIZATION AND AUTHENTICATION
    useEffect(() => {
        setLogLevel('debug'); // Enable detailed Firebase logging

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        try {
            const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);
            
            setDb(firestore);
            setAuth(firebaseAuth);

            // Authentication logic
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsLoading(false);
                } else {
                    try {
                        // Sign in using the initial custom token or anonymously
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            const userCredential = await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                            setUserId(userCredential.user.uid);
                        } else {
                            const userCredential = await signInAnonymously(firebaseAuth);
                            setUserId(userCredential.user.uid);
                        }
                    } catch (error) {
                        console.error("Firebase authentication failed:", error);
                        // Fallback to anonymous ID if auth fails
                        setUserId(crypto.randomUUID()); 
                    } finally {
                        setIsLoading(false);
                    }
                }
            });

            return () => unsubscribe(); // Cleanup auth listener
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
            setIsLoading(false);
            setUserId(crypto.randomUUID()); // Ensure we still get a userId if config is missing
        }
    }, []);

    // 2. REAL-TIME DATA FETCHING (Firestore onSnapshot)
    useEffect(() => {
        if (!db || !userId) return; // Wait for Firebase and userId to be ready
        
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        // --- PATHS FOR DATA STORAGE ---
        // Storing admin/configuration data privately under the user's scope
        const categoryRulesPath = `/artifacts/${appId}/users/${userId}/commission_category_rules`;
        const sellerOverridesPath = `/artifacts/${appId}/users/${userId}/commission_seller_overrides`;

        // CATEGORY RULES LISTENER
        const rulesRef = collection(db, categoryRulesPath);
        const unsubscribeCategory = onSnapshot(rulesRef, (snapshot) => {
            const rules = snapshot.docs.map(doc => ({ 
                ...doc.data(), 
                id: doc.id 
            }));
            setCategoryRules(rules);
            console.log("Category Rules updated:", rules);
        }, (error) => {
            console.error("Error fetching category rules:", error);
        });

        // SELLER OVERRIDES LISTENER
        const overridesRef = collection(db, sellerOverridesPath);
        const unsubscribeOverrides = onSnapshot(overridesRef, (snapshot) => {
            const overrides = snapshot.docs.map(doc => ({ 
                ...doc.data(), 
                id: doc.id 
            }));
            setSellerOverrides(overrides);
            console.log("Seller Overrides updated:", overrides);
        }, (error) => {
            console.error("Error fetching seller overrides:", error);
        });

        // Cleanup listeners on component unmount
        return () => {
            unsubscribeCategory();
            unsubscribeOverrides();
        };
    }, [db, userId]); // Dependencies ensure this runs once DB and User ID are set

    // Filter Seller Overrides based on search term (uses fetched data)
    const filteredSellerOverrides = sellerOverrides.filter(override => 
        override.sellerName?.toLowerCase().includes(overrideSearchTerm.toLowerCase()) || 
        override.reason?.toLowerCase().includes(overrideSearchTerm.toLowerCase()) ||
        override.id?.toLowerCase().includes(overrideSearchTerm.toLowerCase())
    );

    // Placeholder for editing logic (replaces original alert)
    const handleEditRate = (id, type) => {
        console.log(`[EDIT ACTION] Opening form to edit ${type} rate for ID: ${id}.`);
        // In a real app, this would open a form/modal
    };

    // Refactored deletion logic to use custom state-driven modal
    const handleRemoveOverride = (item) => {
        setItemToRemove(item);
        setShowConfirmModal(true);
    };

    const confirmRemove = () => {
        if (!db || !userId || !itemToRemove) {
            console.error("Database not ready or item not selected for removal.");
            setShowConfirmModal(false);
            setItemToRemove(null);
            return;
        }

        // --- FIREBASE DELETION LOGIC (MOCK FOR NOW, replace with deleteDoc in production) ---
        // Example Firestore deletion: 
        // const docRef = doc(db, `/artifacts/${__app_id}/users/${userId}/commission_seller_overrides`, itemToRemove.id);
        // deleteDoc(docRef).then(() => console.log("Deleted successfully")).catch(err => console.error("Deletion failed", err));

        // For this demo, we use a local filter on the state to simulate success
        setSellerOverrides(prev => prev.filter(o => o.id !== itemToRemove.id));
        console.log(`[DELETION MOCK] Removed item ID: ${itemToRemove.id}`);

        setShowConfirmModal(false);
        setItemToRemove(null);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const renderExpiryStatus = (expiryDate) => {
        if (!expiryDate) return "Permanent";
        
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        let color = "text-green-400 bg-green-900/40";
        let statusText = expiryDate;

        if (diffDays <= 30 && diffDays > 0) {
            color = "text-yellow-400 bg-yellow-900/40";
            statusText = `Expiring in ${diffDays} days`;
        } else if (diffDays <= 0) {
            color = "text-red-400 bg-red-900/40";
            statusText = "EXPIRED";
        }

        return (
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
                {statusText}
            </span>
        );
    };

    // Custom Confirmation Modal Component
    const ConfirmationModal = () => (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-sm w-full border border-red-700/50">
                <div className='flex items-center space-x-3 mb-4'>
                    <AlertTriangle className='h-6 w-6 text-red-500'/>
                    <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
                </div>
                <p className="text-gray-300 mb-6">
                    Are you sure you want to remove the override for **{itemToRemove?.sellerName}**? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => { setShowConfirmModal(false); setItemToRemove(null); }}
                        className="px-4 py-2 text-sm font-medium rounded-lg text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmRemove}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center"
                    >
                        <Trash2 className='h-4 w-4 mr-2'/> Delete Override
                    </button>
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="p-8 bg-gray-900 h-screen flex items-center justify-center text-white">
                <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg">Loading Commission Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 bg-gray-900 h-full min-h-screen text-white font-[Inter]">
            {showConfirmModal && <ConfirmationModal />}
            
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6 border-b border-gray-700 pb-4">
                <Settings className="h-8 w-8 text-yellow-500" />
                <h1 className="text-3xl font-extrabold">Commission Management</h1>
                <p className='text-sm text-gray-400 ml-4 hidden sm:block'>Control default rates and seller-specific exceptions.</p>
            </div>

            {/* Display User ID (MANDATORY for Firebase app identification) */}
            <p className="text-xs text-gray-500 mb-6 bg-gray-800 p-2 rounded-lg break-all">
                **User ID:** {userId}
            </p>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-700 mb-8">
                <button
                    onClick={() => setActiveTab('category')}
                    className={`py-3 px-6 text-base font-semibold transition-colors flex items-center ${
                        activeTab === 'category'
                            ? 'border-b-4 border-yellow-500 text-yellow-400'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Tag className='h-5 w-5 mr-2'/> Category Rules ({categoryRules.length})
                </button>
                <button
                    onClick={() => setActiveTab('seller')}
                    className={`py-3 px-6 text-base font-semibold transition-colors flex items-center ${
                        activeTab === 'seller'
                            ? 'border-b-4 border-yellow-500 text-yellow-400'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Users className='h-5 w-5 mr-2'/> Seller Overrides ({sellerOverrides.length})
                </button>
            </div>

            {/* --- TAB CONTENT: Category Rules --- */}
            {activeTab === 'category' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-800 p-4 rounded-xl border border-gray-700/50 shadow-lg">
                        <h2 className="text-xl font-semibold text-white mb-3 sm:mb-0">Default Category Rates</h2>
                        <button 
                            onClick={() => console.log('[ACTION] Add New Category Rule Modal')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center shadow-md hover:shadow-yellow-500/30"
                        >
                            <TrendingUp className='h-4 w-4 mr-2'/> Add New Rule
                        </button>
                    </div>

                    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Est. Monthly Revenue</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sellers Affected</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {categoryRules.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                                                No category rules found. Add one to start defining default commissions.
                                            </td>
                                        </tr>
                                    ) : (
                                        categoryRules.map((rule) => (
                                            <tr key={rule.id} className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{rule.name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-2xl font-extrabold text-yellow-400">
                                                    {rule.rate?.toFixed(1) || '0.0'}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                                                    <div className="flex items-center">
                                                        <DollarSign className='h-4 w-4 mr-1'/> 
                                                        {formatCurrency(rule.estRevenue || 0)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {rule.sellers || 0} Sellers
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button 
                                                        onClick={() => handleEditRate(rule.id, 'Category')}
                                                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center"
                                                    >
                                                        <Edit className='h-4 w-4 mr-1'/> Edit Rate
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- TAB CONTENT: Seller Overrides --- */}
            {activeTab === 'seller' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-xl border border-gray-700/50 bg-gray-800 shadow-lg">
                        <div className='flex items-center w-full md:w-auto mb-3 md:mb-0'>
                            <Search className="h-5 w-5 text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search seller or reason..."
                                value={overrideSearchTerm}
                                onChange={(e) => setOverrideSearchTerm(e.target.value)}
                                className="w-full md:w-64 py-2 px-4 bg-gray-700/70 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 text-sm transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => handleEditRate('new', 'Seller Override')}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center shadow-md hover:shadow-green-500/30"
                        >
                            <Zap className='h-5 w-5 mr-2'/> Apply New Override
                        </button>
                    </div>

                    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Seller</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Default Rate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Override Rate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Reason / Terms</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Expiry</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredSellerOverrides.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                                                No seller overrides found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSellerOverrides.map((override) => (
                                            <tr key={override.id} className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                                    {override.sellerName || 'N/A'} <span className='text-gray-500 text-xs ml-2'>({override.id})</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    {override.defaultRate?.toFixed(1) || '0.0'}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-yellow-400">
                                                    {override.overrideRate?.toFixed(1) || '0.0'}%
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                                                    {override.reason || 'No specific reason provided'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {renderExpiryStatus(override.expiry)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                                                    <button 
                                                        onClick={() => handleEditRate(override.id, 'Override')}
                                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveOverride(override)}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        <Trash2 className='h-4 w-4 inline'/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommissionManagement;