// import React, { useState, useEffect, useMemo } from "react";
// import {
//   Plus,
//   Edit,
//   Trash2,
//   RefreshCw,
//   Search,
//   X,
//   Camera,
//   ToggleLeft,
//   ToggleRight,
// } from "lucide-react";

// import {
//   db,
//   storage,
//   ref,
//   uploadBytes,
//   getDownloadURL,
// } from "../../firebase";

// import {
//   collection,
//   // ❌ REMOVED: addDoc
//   getDocs,
//   updateDoc,
//   deleteDoc,
//   doc,
//   setDoc, // ✅ ADDED: setDoc for writing data with a specific ID
// } from "firebase/firestore";

// const SubUnderCategory = () => {
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const [subUnderCategories, setSubUnderCategories] = useState([]);
//   const [subCategories, setSubCategories] = useState([]);
//   const [categories, setCategories] = useState([]);

//   const [selectedSubUnderCategory, setSelectedSubUnderCategory] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");

//   const [imageFile, setImageFile] = useState(null);
//   const [previewImage, setPreviewImage] = useState(null);

//   // form
//   const [formData, setFormData] = useState({
//     categoryId: "",
//     subCategoryId: "",
//     name: "",
//     image: "",
//     isActive: true,
//     sortOrder: 0,
//     commissionType: "percent",
//     commissionValue: 0,
//   });

//   // ----------------------
//   // LOAD FIRESTORE DATA
//   // ----------------------
//   useEffect(() => {
//     fetchAll();
//   }, []);

//   const fetchAll = async () => {
//     try {
//       setLoading(true);

//       const catSnap = await getDocs(collection(db, "categories"));
//       const subCatSnap = await getDocs(collection(db, "subcategories"));
//       const subUnderSnap = await getDocs(collection(db, "subunder"));

//       // Documents are mapped to include their Firestore ID for manipulation
//       setCategories(
//         catSnap.docs.map((d) => ({
//           id: d.id,
//           data: d.data(),
//         }))
//       );

//       setSubCategories(
//         subCatSnap.docs.map((d) => ({
//           id: d.id,
//           data: d.data(),
//         }))
//       );

//       setSubUnderCategories(
//         subUnderSnap.docs.map((d) => ({
//           id: d.id,
//           data: d.data(),
//         }))
//       );
//     } catch (e) {
//       console.error(e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ----------------------
//   // FORM INPUT CHANGES
//   // ----------------------
//   const handleInput = (e) => {
//     const { name, value } = e.target;

//     // When selecting category → clear sub category
//     if (name === "categoryId") {
//       setFormData((prev) => ({
//         ...prev,
//         categoryId: value,
//         subCategoryId: "",
//         name: "",
//       }));
//       return;
//     }

//     // When selecting subcategory ⇒ auto-generate name
//     if (name === "subCategoryId") {
//       const cat = categories.find((c) => c.id === formData.categoryId);
//       const subcat = subCategories.find((s) => s.id === value);

//       // Generate a default name based on parent names
//       const generated =
//         cat && subcat ? `${cat.data.name} ${subcat.data.name} Under Category` : "";

//       setFormData((prev) => ({
//         ...prev,
//         subCategoryId: value,
//         name: generated,
//       }));
//       return;
//     }

//     setFormData((prev) => ({
//       ...prev,
//       [name]:
//         name === "sortOrder" || name === "commissionValue"
//           ? Number(value)
//           : value,
//     }));
//   };

//   // ----------------------
//   // IMAGE HANDLING
//   // ----------------------
//   const handleFileSelect = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setImageFile(file);

//     const reader = new FileReader();
//     reader.onloadend = () => setPreviewImage(reader.result);
//     reader.readAsDataURL(file);
//   };

//   const clearImage = () => {
//     setImageFile(null);
//     setPreviewImage(null);
//   };

//   const uploadImage = async () => {
//     // If no new file is selected, return the existing URL or an empty string
//     if (!imageFile) return formData.image || ""; 

//     const fileName = `subunder_${Date.now()}_${imageFile.name}`;
//     const storageRef = ref(storage, `sub_under_categories/${fileName}`);
//     await uploadBytes(storageRef, imageFile);
//     return await getDownloadURL(storageRef);
//   };

//   // ----------------------
//   // SUBMIT FORM (MODIFIED)
//   // ----------------------
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       const url = await uploadImage();

//       // Base payload data
//       const basePayload = {
//         ...formData,
//         image: url,
//       };

//       if (selectedSubUnderCategory) {
//         // --- UPDATE EXISTING DOCUMENT ---
//         // Ensure the ID field is included in the update payload
//         const updatePayload = {
//             ...basePayload,
//             id: selectedSubUnderCategory.id // Keep the existing ID in the document data
//         };

//         const docRef = doc(db, "subunder", selectedSubUnderCategory.id);
//         await updateDoc(docRef, updatePayload);

//       } else {
//         // --- CREATE NEW DOCUMENT (MODIFIED) ---
//         // 1. Create a reference to a new document with an auto-generated ID
//         const subUnderCollection = collection(db, "subunder");
//         const docRef = doc(subUnderCollection);
//         const newId = docRef.id;

//         // 2. Construct the final payload including the redundant ID
//         const createPayload = {
//             ...basePayload,
//             id: newId, // **<-- STORES THE DOCUMENT ID INSIDE THE DOCUMENT**
//             createdAt: Date.now(), // Optional: Add timestamp
//         };

//         // 3. Write the data using setDoc
//         await setDoc(docRef, createPayload);
//       }

//       handleCancel();
//       fetchAll();
//     } catch (err) {
//       console.error(err);
//       alert("Error saving data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ----------------------
//   // EDIT / DELETE
//   // ----------------------
//   const handleEdit = (item) => {
//     setSelectedSubUnderCategory(item);

//     // Pass the document data (which now includes the 'id' field if created with the new logic)
//     // The data structure used here is { id: doc.id, data: doc.data() }
//     setFormData({
//       ...item.data,
//     });

//     setPreviewImage(item.data.image);
//     setIsModalOpen(true);
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this item?")) return;

//     try {
//         setLoading(true);
//         await deleteDoc(doc(db, "subunder", id));
//         setSubUnderCategories((prev) => prev.filter((i) => i.id !== id));
//     } catch (err) {
//         console.error("Delete failed:", err);
//         alert("Error deleting item.");
//     } finally {
//         setLoading(false);
//     }
//   };

//   const handleCancel = () => {
//     setSelectedSubUnderCategory(null);
//     setFormData({
//       categoryId: "",
//       subCategoryId: "",
//       name: "",
//       image: "",
//       isActive: true,
//       sortOrder: 0,
//       commissionType: "percent",
//       commissionValue: 0,
//     });

//     setPreviewImage(null);
//     setImageFile(null);
//     setIsModalOpen(false);
//   };

//   // ----------------------
//   // SEARCH
//   // ----------------------
//   const list = useMemo(() => {
//     const t = searchTerm.toLowerCase();
//     return subUnderCategories.filter((i) =>
//       i.data.name.toLowerCase().includes(t)
//     );
//   }, [searchTerm, subUnderCategories]);

//   // ----------------------
//   // UI
//   // ----------------------
//   return (
//     <div className="p-6 bg-white min-h-screen">
//       {/* HEADER */}
//       <div className="flex justify-between items-center mb-8">
//         <div>
//           <h2 className="text-3xl font-bold text-gray-800">Sub Under Category Management</h2>
//           <p className="text-gray-600 mt-2">Manage your product sub under categories</p>
//         </div>

//         <div className="flex space-x-3">
//           <button
//             onClick={() => {handleCancel(); setIsModalOpen(true);}}
//             className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-300"
//           >
//             <Plus size={20} />
//             <span>Add Sub Under Category</span>
//           </button>

//           <button 
//             onClick={fetchAll}
//             className="bg-gray-100 hover:bg-gray-200 text-blue-600 p-3 rounded-xl shadow-md transition-all duration-300 border border-gray-200"
//           >
//             <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
//           </button>
//         </div>
//       </div>

//       {/* SEARCH & STATS CARD */}
//       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-8 shadow-sm">
//         <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
//           <div className="flex items-center space-x-4">
//             <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
//               <div className="text-blue-600 font-bold text-2xl">{list.length}</div>
//               <div className="text-gray-600 text-sm">Total Sub Under Categories</div>
//             </div>
//             <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
//               <div className="text-green-600 font-bold text-2xl">
//                 {subUnderCategories.filter(i => i.data.isActive).length}
//               </div>
//               <div className="text-gray-600 text-sm">Active</div>
//             </div>
//           </div>

//           <div className="relative w-full sm:w-80">
//             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
//             <input
//               type="text"
//               placeholder="Search sub under category..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
//             />
//           </div>
//         </div>
//       </div>

//       {/* TABLE */}
//       <div className="hidden lg:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
//         <table className="w-full">
//           <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
//             <tr>
//               <th className="px-6 py-4 text-left text-white font-semibold w-1/4">Name</th>
//               <th className="px-6 py-4 text-left text-white font-semibold">Document ID</th> {/* Display the ID */}
//               <th className="px-6 py-4 text-left text-white font-semibold w-[100px]">Status</th>
//               <th className="px-6 py-4 text-left text-white font-semibold w-[100px]">Sort Order</th>
//               <th className="px-6 py-4 text-left text-white font-semibold w-[150px]">Commission</th>
//               <th className="px-6 py-4 text-right text-white font-semibold w-[100px]">Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {loading && list.length === 0 ? (
//               <tr>
//                 <td colSpan="6" className="text-center text-gray-500 py-8">
//                   <div className="flex justify-center items-center space-x-3">
//                     <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
//                     <span>Loading sub under categories...</span>
//                   </div>
//                 </td>
//               </tr>
//             ) : list.length === 0 ? (
//               <tr>
//                 <td colSpan="6" className="text-center text-gray-500 py-8">
//                   No sub under categories found. Create your first one!
//                 </td>
//               </tr>
//             ) : (
//               list.map((item, index) => (
//                 <tr
//                   key={item.id}
//                   className={`border-b border-gray-100 hover:bg-blue-50 transition-all duration-300 ${
//                     index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
//                   }`}
//                 >
//                   <td className="px-6 py-4">
//                     <div className="flex items-center space-x-3">
//                       {item.data.image ? (
//                         <img
//                           src={item.data.image}
//                           className="w-10 h-10 rounded-lg object-cover border-2 border-blue-200"
//                           alt={item.data.name}
//                         />
//                       ) : (
//                         <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
//                           <Camera size={16} className="text-gray-400"/>
//                         </div>
//                       )}
//                       <div className="text-gray-800 font-medium">{item.data.name}</div>
//                     </div>
//                   </td>
                  
//                   {/* DOCUMENT ID DISPLAY */}
//                   <td className="px-6 py-4 text-xs font-mono text-gray-500 overflow-hidden whitespace-nowrap overflow-ellipsis max-w-[150px]">
//                     {item.id}
//                   </td>

//                   <td className="px-6 py-4">
//                     <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
//                       item.data.isActive 
//                         ? 'bg-green-100 text-green-700' 
//                         : 'bg-red-100 text-red-700'
//                     }`}>
//                       {item.data.isActive ? "Active" : "Inactive"}
//                     </span>
//                   </td>

//                   <td className="px-6 py-4">
//                     <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
//                       {item.data.sortOrder}
//                     </span>
//                   </td>

//                   <td className="px-6 py-4">
//                     {item.data.commissionValue > 0 ? (
//                       <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
//                         {item.data.commissionValue}
//                         {item.data.commissionType === "percent" ? "%" : " ₹"}
//                       </span>
//                     ) : (
//                       <span className="text-gray-400 text-sm">—</span>
//                     )}
//                   </td>

//                   <td className="px-6 py-4 text-right">
//                     <div className="flex space-x-2 justify-end">
//                       <button
//                         onClick={() => handleEdit(item)}
//                         className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-all duration-300 hover:scale-110"
//                       >
//                         <Edit size={18} />
//                       </button>

//                       <button
//                         onClick={() => handleDelete(item.id)}
//                         className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-all duration-300 hover:scale-110"
//                       >
//                         <Trash2 size={18} />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* MOBILE CARDS */}
//       <div className="lg:hidden space-y-4">
//         {list.map((item) => (
//           <div
//             key={item.id}
//             className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-blue-50 transition-all duration-300 shadow-sm"
//           >
//             <div className="flex justify-between items-start">
//               <div className="flex space-x-4">
//                 {item.data.image && (
//                   <img
//                     src={item.data.image}
//                     className="h-16 w-16 rounded-xl object-cover border-2 border-blue-200"
//                     alt={item.data.name}
//                   />
//                 )}
                
//                 <div>
//                   <h3 className="text-gray-800 text-lg font-semibold">
//                     {item.data.name}
//                   </h3>
//                   <p className="text-xs font-mono text-gray-400 mt-1">ID: {item.id}</p> {/* Display the ID */}

//                   <div className="flex items-center space-x-2 mt-2">
//                     <span className={`px-2 py-1 rounded-full text-xs ${
//                       item.data.isActive 
//                         ? 'bg-green-100 text-green-700' 
//                         : 'bg-red-100 text-red-700'
//                     }`}>
//                       {item.data.isActive ? "Active" : "Inactive"}
//                     </span>
//                     <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
//                       Sort: {item.data.sortOrder}
//                     </span>
//                   </div>
//                   {item.data.commissionValue > 0 && (
//                     <div className="mt-2">
//                       <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
//                         {item.data.commissionValue}
//                         {item.data.commissionType === "percent" ? "%" : " ₹"}
//                       </span>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               <div className="flex space-x-2">
//                 <button
//                   onClick={() => handleEdit(item)}
//                   className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-colors"
//                 >
//                   <Edit size={16} />
//                 </button>
//                 <button
//                   onClick={() => handleDelete(item.id)}
//                   className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-colors"
//                 >
//                   <Trash2 size={16} />
//                 </button>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* ---------------------- */}
//       {/* MODAL */}
//       {/* ---------------------- */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
//           <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-xl">
//             <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-t-2xl">
//               <div className="flex justify-between items-center">
//                 <h3 className="text-2xl font-bold text-white">
//                   {selectedSubUnderCategory ? "Edit" : "Add"} Sub Under Category
//                 </h3>
//                 <button 
//                   onClick={handleCancel}
//                   className="text-white/80 hover:text-white p-2 hover:bg-white/20 rounded-xl transition-colors"
//                 >
//                   <X size={24} />
//                 </button>
//               </div>
//             </div>

//             <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto">

//               {/* Show the ID in the modal when editing */}
//               {selectedSubUnderCategory && (
//                 <div className="mb-6 p-3 bg-gray-100 rounded-xl text-sm font-mono text-gray-600 border border-gray-200">
//                     Document ID: **{selectedSubUnderCategory.id}**
//                 </div>
//               )}

//               {/* IMAGE */}
//               <div className="mb-6">
//                 <label className="text-gray-700 font-medium mb-3 block">Image</label>
//                 <div className="relative h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex justify-center items-center cursor-pointer hover:border-blue-500 transition-all duration-300">
//                   <input
//                     type="file"
//                     className="absolute inset-0 opacity-0 cursor-pointer"
//                     accept="image/*"
//                     onChange={handleFileSelect}
//                   />

//                   {previewImage ? (
//                     <>
//                       <img
//                         src={previewImage}
//                         className="h-full w-full object-cover rounded-xl"
//                       />
//                       <button
//                         type="button"
//                         onClick={clearImage}
//                         className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
//                       >
//                         <X size={16} />
//                       </button>
//                     </>
//                   ) : (
//                     <div className="text-center">
//                       <Camera size={32} className="text-blue-500 mx-auto mb-2" />
//                       <span className="text-gray-600 text-sm">Upload Image</span>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* CATEGORY */}
//               <div className="mb-6">
//                 <label className="text-gray-700 font-medium mb-2 block">Category *</label>
//                 <select
//                   name="categoryId"
//                   value={formData.categoryId}
//                   onChange={handleInput}
//                   className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
//                   required
//                 >
//                   <option value="">Select Category</option>
//                   {categories.map((c) => (
//                     <option key={c.id} value={c.id}>
//                       {c.data.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* SUB CATEGORY */}
//               <div className="mb-6">
//                 <label className="text-gray-700 font-medium mb-2 block">Sub Category *</label>
//                 <select
//                   name="subCategoryId"
//                   disabled={!formData.categoryId}
//                   value={formData.subCategoryId}
//                   onChange={handleInput}
//                   className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
//                   required
//                 >
//                   <option value="">Select Sub Category</option>

//                   {subCategories
//                     .filter((sc) => sc.data.categoryId === formData.categoryId)
//                     .map((sc) => (
//                       <option key={sc.id} value={sc.id}>
//                         {sc.data.name}
//                       </option>
//                     ))}
//                 </select>
//               </div>

//               {/* NAME */}
//               <div className="mb-6">
//                 <label className="text-gray-700 font-medium mb-2 block">Name *</label>
//                 <input
//                   className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
//                   value={formData.name}
//                   onChange={handleInput}
//                   name="name"
//                   required
//                   placeholder="Enter sub under category name"
//                 />
//               </div>

//               {/* ACTIVE */}
//               <div className="flex items-center justify-between mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
//                 <label className="text-gray-700 font-medium">Active Status</label>
//                 <button
//                   type="button"
//                   onClick={() =>
//                     setFormData((p) => ({ ...p, isActive: !p.isActive }))
//                   }
//                 >
//                   {formData.isActive ? (
//                     <div className="flex items-center space-x-2">
//                       <span className="text-green-600 text-sm font-medium">Active</span>
//                       <ToggleRight size={36} className="text-green-500" />
//                     </div>
//                   ) : (
//                     <div className="flex items-center space-x-2">
//                       <span className="text-red-600 text-sm font-medium">Inactive</span>
//                       <ToggleLeft size={36} className="text-red-500" />
//                     </div>
//                   )}
//                 </button>
//               </div>

//               {/* SORT ORDER */}
//               <div className="mb-6">
//                 <label className="text-gray-700 font-medium mb-2 block">Sort Order *</label>
//                 <input
//                   type="number"
//                   className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
//                   value={formData.sortOrder}
//                   name="sortOrder"
//                   onChange={handleInput}
//                   required
//                 />
//               </div>

//               {/* COMMISSION TYPE */}
//               <div className="mb-6">
//                 <label className="text-gray-700 font-medium mb-2 block">Commission Type</label>
//                 <select
//                   name="commissionType"
//                   className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
//                   value={formData.commissionType}
//                   onChange={handleInput}
//                 >
//                   <option value="percent">Percent</option>
//                   <option value="fixed">Fixed</option>
//                 </select>
//               </div>

//               {/* COMMISSION VALUE */}
//               <div className="mb-6">
//                 <label className="text-gray-700 font-medium mb-2 block">Commission Value</label>
//                 <input
//                   type="number"
//                   name="commissionValue"
//                   className="w-full bg-white border border-gray-300 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
//                   value={formData.commissionValue}
//                   onChange={handleInput}
//                   placeholder="Enter commission value"
//                 />
//               </div>

//               {/* BUTTONS */}
//               <div className="flex space-x-4 mt-8 pt-6 border-t border-gray-200">
//                 <button
//                   type="button"
//                   className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-sm border border-gray-200"
//                   onClick={handleCancel}
//                 >
//                   Cancel
//                 </button>
//                 <button 
//                   type="submit" 
//                   className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-sm disabled:opacity-50 disabled:hover:scale-100"
//                   disabled={loading}
//                 >
//                   {loading ? (
//                     <div className="flex items-center justify-center space-x-2">
//                       <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
//                       <span>Saving...</span>
//                     </div>
//                   ) : selectedSubUnderCategory ? (
//                     "Update Sub Under Category"
//                   ) : (
//                     "Create Sub Under Category"
//                   )}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default SubUnderCategory;