import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import {
  User, Edit2, Save, X, Mail, Phone, Building,
  Shield, Calendar, Camera, Hash, CheckCircle2,
  Briefcase
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

const Profile = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const adminEmail = localStorage.getItem("adminEmail");

      if (!adminEmail) {
        setError("Not logged in");
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "admin"),
        where("email", "==", adminEmail)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Admin profile not found");
      } else {
        const adminData = snapshot.docs[0].data();
        setAdmin(adminData);
        setEditForm(adminData);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load profile");
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditForm(admin);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const adminEmail = localStorage.getItem("adminEmail");
      const q = query(
        collection(db, "admin"),
        where("email", "==", adminEmail)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const adminRef = doc(db, "admin", docId);
        await updateDoc(adminRef, editForm);
        setAdmin(editForm);
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent shadow-md"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        className: 'rounded-xl font-medium',
        style: { border: '1px solid #E5E7EB', padding: '16px', color: '#1F2937' },
      }} />
      <div className="min-h-screen bg-gray-50/50 pb-12">
        {/* HERO BANNER */}
        <div className="h-64 sm:h-72 bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 w-full relative overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-blue-300 blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center relative z-10 pt-4">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 drop-shadow-sm">Admin Workspace</h1>
            <p className="text-blue-100 text-base md:text-lg max-w-2xl font-medium opacity-90 drop-shadow-sm">
              Manage your personal settings, view your administrative privileges, and update your professional details.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* LEFT COLUMN - STATS & AVATAR CARD */}
            <div className="lg:col-span-4 space-y-6">

              {/* Profile Card */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative group">
                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 w-full absolute top-0 left-0 z-0 border-b border-gray-200"></div>

                <div className="p-6 relative z-10 flex flex-col items-center mt-8">
                  <div className="relative mb-5">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white relative group-hover:shadow-xl transition-shadow duration-300">
                      {admin.profile ? (
                        <img
                          src={admin.profile}
                          alt="Admin Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                          <User size={48} className="text-blue-300" />
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute bottom-1 right-1 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 hover:scale-110 transition-all cursor-pointer shadow-md border-2 border-white group-hover:border-blue-100">
                        <Camera size={16} />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditForm({ ...editForm, profile: reader.result });
                                toast.success("Preview updated! Don't forget to save.");
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 text-center">{admin.name}</h2>
                  <div className="flex items-center gap-1.5 text-blue-600 font-medium mt-1 mb-2 bg-blue-50 px-3 py-1 rounded-full text-sm">
                    <Shield size={14} className="text-blue-500" />
                    Administrator
                  </div>

                  <div className="w-full border-t border-gray-100 my-6"></div>

                  <div className="w-full space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Hash size={18} /></div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Admin ID</p>
                        <p className="text-sm font-mono text-gray-800 break-all">{admin.id || "lyLkD6HBVljEzd3Fhm6g"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Calendar size={18} /></div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Member Since</p>
                        <p className="text-sm font-medium text-gray-800">January 2024</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><CheckCircle2 size={18} /></div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Status</p>
                        <p className="text-sm font-medium text-emerald-600">Active Account</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional secondary card (e.g., Quick Stats) can go here if needed */}

            </div>

            {/* RIGHT COLUMN - MAIN DETAILS FORM */}
            <div className="lg:col-span-8">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                {/* Form Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Update your contact and professional details.</p>
                  </div>

                  {!isEditing ? (
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-800 rounded-xl hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all text-sm font-semibold whitespace-nowrap"
                    >
                      <Edit2 size={16} className="text-blue-600" />
                      Edit Details
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleCancel}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 bg-white rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        disabled={uploading}
                      >
                        <Save size={16} />
                        {uploading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Body */}
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                    {/* Full Name */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                      {isEditing ? (
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <User size={18} />
                          </div>
                          <input
                            type="text"
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="Enter your full name"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3.5 bg-gray-50/80 border border-gray-100 rounded-xl">
                          <User size={18} className="text-gray-400" />
                          <p className="text-gray-900 font-medium">{admin.name}</p>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                        Email Address
                        {isEditing && <span className="text-xs text-gray-400 font-normal">Cannot be changed</span>}
                      </label>
                      <div className={`flex items-center gap-3 p-3.5 border rounded-xl ${isEditing ? "bg-gray-100/50 border-gray-200 text-gray-500" : "bg-gray-50/80 border-gray-100 text-gray-900"}`}>
                        <Mail size={18} className={isEditing ? "text-gray-400" : "text-gray-400"} />
                        <p className="font-medium truncate">{admin.email}</p>
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                      {isEditing ? (
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <Phone size={18} />
                          </div>
                          <input
                            type="tel"
                            value={editForm.phone || ""}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="+91 00000 00000"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3.5 bg-gray-50/80 border border-gray-100 rounded-xl">
                          <Phone size={18} className="text-gray-400" />
                          <p className="text-gray-900 font-medium">{admin.phone || "70195 12273"}</p>
                        </div>
                      )}
                    </div>

                    {/* Department */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Department / Role Description</label>
                      {isEditing ? (
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <Briefcase size={18} />
                          </div>
                          <input
                            type="text"
                            value={editForm.department || ""}
                            onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            placeholder="e.g. Lead Administrator, Store Manager..."
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3.5 bg-gray-50/80 border border-gray-100 rounded-xl">
                          <Briefcase size={18} className="text-gray-400" />
                          <p className="text-gray-900 font-medium">{admin.department || "Admin"}</p>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Bio / Description</label>
                      {isEditing ? (
                        <textarea
                          value={editForm.bio || ""}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none h-32 resize-y"
                          placeholder="Tell us a little bit about yourself and your role..."
                        />
                      ) : (
                        <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-xl min-h-[100px] flex items-start">
                          <p className="text-gray-700 leading-relaxed text-sm">
                            {admin.bio || <span className="text-gray-400 italic">No bio provided. Click edit to add a description.</span>}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;