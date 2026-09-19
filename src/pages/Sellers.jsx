import React, { useState, useEffect, useMemo } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  collection, getDocs, doc, updateDoc, getDoc,
  query, where, arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import {
  Users, Mail, Phone, MapPin, Calendar, X, Search,
  FileText, CheckCircle, Clock, Package, DollarSign, ExternalLink, ShieldCheck,
  MessageCircle, Smartphone, User, Shield, Send, MessageSquare,
  CheckCircle2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown,
  RefreshCw, Filter, Download, Star, Store, Building, UserCheck,
  UserX, ShoppingBag, Globe, Briefcase, Award, BarChart3, Percent,
  TrendingUp, Target, Activity, CreditCard, MoreVertical, Eye,
  ChevronRight, ShieldOff
} from 'lucide-react';

const API_BASE_URL = "https://vistaraa-server.vercel.app/api";
const AUTH_TOKEN = "006eb537ffea3dafe0e3a16233c449a1e20510e8f3404b1a456f53cf6ca7f371";

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [sending, setSending] = useState(false);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [filteredSellerProducts, setFilteredSellerProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'registrationDate', direction: 'desc' });

  // Statistics
  const [sellerStats, setSellerStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    blocked: 0,
    revenue: 0
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  // Apply sorting and filtering
  useEffect(() => {
    let result = [...sellers];

    // Apply search filter
    if (searchTerm.trim() !== "") {
      const search = searchTerm.toLowerCase();
      result = result.filter((s) => {
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const business = (s.businessName || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const phone = s.phone || "";

        return (
          fullName.includes(search) ||
          business.includes(search) ||
          email.includes(search) ||
          phone.includes(search)
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(s => s.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      result = result.filter(s => {
        if (!s.createdAt && !s.registrationDate) return false;

        let sellerDate;
        if (s.registrationDate) {
          sellerDate = new Date(s.registrationDate);
        } else if (s.createdAt?.toDate) {
          sellerDate = s.createdAt.toDate();
        } else if (s.createdAt) {
          sellerDate = new Date(s.createdAt);
        } else {
          return false;
        }

        switch (dateFilter) {
          case 'today': return sellerDate.toDateString() === now.toDateString();
          case 'week': return sellerDate >= sevenDaysAgo;
          case 'month': return sellerDate >= thirtyDaysAgo;
          default: return true;
        }
      });
    }

    // Apply sorting by date
    result.sort((a, b) => {
      const getDateValue = (seller) => {
        if (seller.registrationDate) {
          return new Date(seller.registrationDate).getTime();
        }
        if (seller.createdAt) {
          if (seller.createdAt.toDate) {
            return seller.createdAt.toDate().getTime();
          }
          return new Date(seller.createdAt).getTime();
        }
        return 0;
      };

      const aValue = getDateValue(a);
      const bValue = getDateValue(b);

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setFilteredSellers(result);
  }, [searchTerm, sellers, sortConfig, statusFilter, dateFilter]);

  // Filter products
  useEffect(() => {
    if (productSearchTerm.trim() === "") {
      setFilteredSellerProducts(sellerProducts);
    } else {
      const search = productSearchTerm.toLowerCase();
      const filtered = sellerProducts.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const category = (p.category || "").toLowerCase();
        const description = (p.description || "").toLowerCase();

        return (
          name.includes(search) ||
          category.includes(search) ||
          description.includes(search)
        );
      });
      setFilteredSellerProducts(filtered);
    }
  }, [productSearchTerm, sellerProducts]);

  // Fetch sellers
  const fetchSellers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "sellers"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSellers(data);

      // Calculate stats
      const stats = {
        total: data.length,
        approved: data.filter(s => s.status === "approved").length,
        pending: data.filter(s => s.status === "pending").length,
        blocked: data.filter(s => s.status === "blocked").length,
        revenue: 0
      };
      setSellerStats(stats);
    } catch (err) {
      console.error("Error loading sellers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products by seller
  const fetchSellerProducts = async (sellerId) => {
    try {
      setLoadingProducts(true);
      const productsCollectionRef = collection(db, "products");
      const q = query(productsCollectionRef, where("sellerId", "==", sellerId));
      const snap = await getDocs(q);

      const sellerItems = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setSellerProducts(sellerItems);
      setFilteredSellerProducts(sellerItems);
    } catch (err) {
      console.error("Error loading seller products:", err);
      setSellerProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleBlockSeller = async (sellerId) => {
    if (window.confirm("Are you sure you want to block this seller?")) {
      try {
        const sellerRef = doc(db, 'sellers', sellerId);
        const auditLog = {
          action: "blocked",
          performedBy: auth.currentUser?.email || "Admin",
          timestamp: new Date().toISOString(),
          notes: "Seller account blocked by Admin"
        };

        await updateDoc(sellerRef, {
          status: 'blocked',
          kycAuditTrail: arrayUnion(auditLog)
        });

        setSellers(prevSellers =>
          prevSellers.map(seller =>
            seller.id === sellerId
              ? { ...seller, status: 'blocked' }
              : seller
          )
        );

        fetchSellers();
      } catch (error) {
        console.error('Error blocking seller:', error);
        alert('Failed to block seller. Please try again.');
      }
    }
  };

  const handleApproveSeller = async (sellerId) => {
    if (window.confirm("Are you sure you want to approve this seller account & KYC?")) {
      try {
        const sellerRef = doc(db, 'sellers', sellerId);
        
        // --- ADD PICKUP LOCATION TO SHIPROCKET ---
        const sellerData = sellers.find(s => s.id === sellerId);
        if (sellerData) {
          try {
            const pickupPayload = {
              pickup_location: sellerId,
              name: `${sellerData.firstName || ""} ${sellerData.lastName || ""}`.trim() || "Seller",
              email: sellerData.email || "",
              phone: sellerData.phone || "",
              address: sellerData.address || "No Address",
              address_2: "",
              city: sellerData.city || "Unknown",
              state: sellerData.state || "Unknown",
              country: "India",
              pin_code: sellerData.pincode || "000000"
            };

            console.log("Sending to Shiprocket...", pickupPayload);
            const srRes = await fetch(`${API_BASE_URL}/add-pickup-location`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AUTH_TOKEN}`
              },
              body: JSON.stringify(pickupPayload)
            });

            const result = await srRes.json();
            if (!srRes.ok) {
              console.error("Shiprocket Failed:", result);
              toast.error("Seller approved, but pickup location couldn’t be created. Please check that the seller’s address and PIN code are correct.", { duration: 6000 });
            }
          } catch (srError) {
            console.error("Error communicating with backend for Shiprocket:", srError);
          }
        }

        const auditLog = {
          action: "approved",
          performedBy: auth.currentUser?.email || "Admin",
          timestamp: new Date().toISOString(),
          notes: "Seller account & KYC approved by Admin"
        };

        await updateDoc(sellerRef, {
          status: 'approved',
          kycStatus: 'approved',
          kycApprovedAt: new Date().toISOString(),
          kycApprovedBy: auth.currentUser?.email || "Admin",
          kycAuditTrail: arrayUnion(auditLog)
        });

        setSellers(prevSellers =>
          prevSellers.map(seller =>
            seller.id === sellerId
              ? { ...seller, status: 'approved', kycStatus: 'approved' }
              : seller
          )
        );

        toast.success("Seller account approved successfully!");
        fetchSellers();
      } catch (error) {
        console.error('Error approving seller:', error);
        alert('Failed to approve seller. Please try again.');
      }
    }
  };

  const handleRejectSeller = async (sellerId) => {
    const reason = prompt("Please enter the rejection reason for this seller application:");
    if (!reason) return;

    try {
      const sellerRef = doc(db, 'sellers', sellerId);
      const auditLog = {
        action: "rejected",
        performedBy: auth.currentUser?.email || "Admin",
        timestamp: new Date().toISOString(),
        rejectionReason: reason
      };

      await updateDoc(sellerRef, {
        status: 'rejected',
        kycStatus: 'rejected',
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: auth.currentUser?.email || "Admin",
        kycAuditTrail: arrayUnion(auditLog)
      });

      setSellers(prevSellers =>
        prevSellers.map(seller =>
          seller.id === sellerId
            ? { ...seller, status: 'rejected', kycStatus: 'rejected', rejectionReason: reason }
            : seller
        )
      );

      toast.success("Seller application rejected.");
      fetchSellers();
    } catch (error) {
      console.error('Error rejecting seller:', error);
      alert('Failed to reject seller. Please try again.');
    }
  };

  const handleVerifyPanStatus = async (sellerId, newStatus) => {
    try {
      const sellerRef = doc(db, 'sellers', sellerId);
      const auditLog = {
        action: `pan_${newStatus}`,
        performedBy: auth.currentUser?.email || "Admin",
        timestamp: new Date().toISOString(),
        notes: `PAN verification status set to ${newStatus}`
      };

      await updateDoc(sellerRef, {
        panVerificationStatus: newStatus,
        panVerifiedAt: new Date().toISOString(),
        panVerifiedBy: auth.currentUser?.email || "Admin",
        kycAuditTrail: arrayUnion(auditLog)
      });

      const docRef = doc(db, "sellerDocuments", sellerId);
      await updateDoc(docRef, {
        panVerificationStatus: newStatus,
        panVerifiedAt: new Date().toISOString(),
        panVerifiedBy: auth.currentUser?.email || "Admin"
      }).catch(() => {});

      setSelectedSeller(prev => prev ? ({
        ...prev,
        panVerificationStatus: newStatus,
        panVerifiedAt: new Date().toISOString(),
        panVerifiedBy: auth.currentUser?.email || "Admin"
      }) : null);

      toast.success(`PAN status set to ${newStatus}`);
      fetchSellers();
    } catch (error) {
      console.error("Error updating PAN status:", error);
      toast.error("Failed to update PAN status");
    }
  };

  const handleVerifyDocument = async (sellerId, documentKey, newStatus) => {
    try {
      const sellerRef = doc(db, 'sellers', sellerId);
      await updateDoc(sellerRef, {
        [`verificationStatus.${documentKey}`]: newStatus
      });

      setSelectedSeller(prev => {
        if (!prev) return null;
        return {
          ...prev,
          verificationStatus: {
            ...(prev.verificationStatus || {}),
            [documentKey]: newStatus
          }
        };
      });

      setSellers(prevSellers => prevSellers.map(s => {
        if (s.id === sellerId) {
          return {
            ...s,
            verificationStatus: {
              ...(s.verificationStatus || {}),
              [documentKey]: newStatus
            }
          };
        }
        return s;
      }));
    } catch (error) {
      console.error(`Error updating document ${documentKey}:`, error);
      alert('Failed to update document status.');
    }
  };

  const handleViewSeller = async (seller) => {
    setSelectedSeller(seller);
    fetchSellerProducts(seller.id);
    setProductSearchTerm("");
    setShowModal(true);

    try {
      const docRef = doc(db, "sellerDocuments", seller.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const docsData = docSnap.data();
        setSelectedSeller(prev => {
          if (!prev || prev.id !== seller.id) return prev;
          
          const mergedDocuments = { ...(prev.documents || {}) };
          
          if (docsData.panCardUrl) {
            mergedDocuments.panCard = {
              url: docsData.panCardUrl,
              fileName: docsData.panCardOriginalName || docsData.panCardName || "PAN Card",
              fileSize: docsData.panCardSize || 0,
              uploadedAt: docsData.updatedAt || docsData.uploadedAt
            };
          }
          if (docsData.gstCertificateUrl) {
            mergedDocuments.gstCertificate = {
              url: docsData.gstCertificateUrl,
              fileName: docsData.gstCertificateOriginalName || docsData.gstCertificateName || "GST Certificate",
              fileSize: docsData.gstCertificateSize || 0,
              uploadedAt: docsData.updatedAt || docsData.uploadedAt
            };
          }
          if (docsData.bankProofUrl || docsData.bankDocUrl) {
            mergedDocuments.bankProof = {
              url: docsData.bankProofUrl || docsData.bankDocUrl,
              fileName: docsData.bankDocOriginalName || docsData.bankProofName || docsData.bankDocName || "Bank Proof",
              fileSize: docsData.bankDocSize || 0,
              uploadedAt: docsData.updatedAt || docsData.uploadedAt
            };
          }
          if (docsData.businessDocUrl) {
            mergedDocuments.businessDoc = {
              url: docsData.businessDocUrl,
              fileName: docsData.businessDocOriginalName || docsData.businessDocName || "Business Document",
              fileSize: docsData.businessDocSize || 0,
              uploadedAt: docsData.updatedAt || docsData.uploadedAt
            };
          }
          if (docsData.identityDocUrl) {
            mergedDocuments.identityDoc = {
              url: docsData.identityDocUrl,
              fileName: docsData.identityDocOriginalName || docsData.identityDocName || "Identity Document",
              fileSize: docsData.identityDocSize || 0,
              uploadedAt: docsData.updatedAt || docsData.uploadedAt
            };
          }
          
          return {
            ...prev,
            panCardUrl: docsData.panCardUrl || prev.panCardUrl,
            gstCertificateUrl: docsData.gstCertificateUrl || prev.gstCertificateUrl,
            bankProofUrl: docsData.bankProofUrl || docsData.bankDocUrl || prev.bankProofUrl,
            bankAccount: docsData.bankAccount || prev.bankAccount,
            gstNumber: docsData.gstNumber || prev.gstNumber,
            panNumber: docsData.panNumber || prev.panNumber,
            documents: mergedDocuments
          };
        });
      }
    } catch (err) {
      console.error("Error fetching seller documents from sellerDocuments collection:", err);
    }
  };

  const closeModal = () => {
    setSelectedSeller(null);
    setShowModal(false);
    setSellerProducts([]);
    setFilteredSellerProducts([]);
    setProductSearchTerm("");
  };

  // MESSAGING FUNCTIONS (keep the same as before)
  const handleMessageSeller = (seller) => {
    setSelectedSeller(seller);
    setMessageText(`Hello ${seller.businessName || seller.firstName || 'there'}! We have an important update regarding your seller account.`);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setSelectedSeller(null);
    setMessageText('');
  };

  const handleSendConfirmation = (channel) => {
    setSelectedChannel(channel);
    setShowConfirmationModal(true);
  };

  const closeConfirmationModal = () => {
    setShowConfirmationModal(false);
    setSelectedChannel('');
    setSending(false);
  };

  const handleSendMessage = async () => {
    if (!selectedSeller || !selectedChannel) return;

    setSending(true);

    try {
      let success = false;

      if (selectedChannel === 'whatsapp') {
        success = sendWhatsAppMessage();
      } else if (selectedChannel === 'email') {
        success = sendEmailMessage();
      } else if (selectedChannel === 'gmail') {
        success = await sendGmailMessage();
      }

      if (success) {
        setTimeout(() => {
          setSending(false);
          closeConfirmationModal();
          closeMessageModal();
        }, 1500);
      } else {
        throw new Error('Failed to send message');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
      alert('Failed to send message. Please try again.');
    }
  };

  const sendWhatsAppMessage = () => {
    try {
      const phone = selectedSeller.phone;
      if (!phone) {
        alert('No phone number available for this seller');
        return false;
      }

      const cleanedPhone = phone.replace(/\D/g, '');
      const message = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${message}`;

      window.open(whatsappUrl, '_blank');
      return true;
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      return false;
    }
  };

  const sendGmailMessage = async () => {
    try {
      if (!selectedSeller.email) {
        alert('No email address available for this seller');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/send-seller-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({
          email: selectedSeller.email,
          subject: 'Important Update Regarding Your Vistaraa Seller Account',
          message: messageText
        })
      });

      if (response.ok) {
        // Successfully sent via backend Nodemailer
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email via Nodemailer:', error);
      alert('Failed to send email: ' + error.message);
      return false;
    }
  };

  const sendEmailMessage = () => {
    try {
      if (!selectedSeller.email) {
        alert('No email address available for this seller');
        return false;
      }

      const subject = encodeURIComponent('Message from Store Administration');
      const body = encodeURIComponent(messageText);

      const mailtoUrl = `mailto:${selectedSeller.email}?subject=${subject}&body=${body}`;

      const emailLink = document.createElement('a');
      emailLink.href = mailtoUrl;
      emailLink.style.display = 'none';
      document.body.appendChild(emailLink);
      emailLink.click();
      document.body.removeChild(emailLink);

      return true;
    } catch (error) {
      console.error('Error opening email client:', error);

      try {
        const subject = encodeURIComponent('Message from Store Administration');
        const body = encodeURIComponent(messageText);
        const mailtoUrl = `mailto:${selectedSeller.email}?subject=${subject}&body=${body}`;
        window.location.href = mailtoUrl;
        return true;
      } catch (fallbackError) {
        console.error('Fallback email method also failed:', fallbackError);
        return false;
      }
    }
  };

  const handleSort = () => {
    setSortConfig(prev => ({
      key: 'registrationDate',
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = () => {
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    } else {
      return <ArrowDown className="h-4 w-4 ml-1" />;
    }
  };

  const getSortLabel = () => {
    return sortConfig.direction === 'asc' ? ' (Oldest First)' : ' (Newest First)';
  };

  const getSellerName = (s) => {
    if (s.firstName && s.lastName) return `${s.firstName} ${s.lastName}`;
    if (s.firstName) return s.firstName;
    if (s.businessName) return s.businessName;
    return "Unknown Seller";
  };

  const getSellerInitials = (s) => {
    const name = getSellerName(s);
    if (name === 'Unknown Seller') return 'S';
    return name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
  };

  const clearSearch = () => setSearchTerm("");

  const getSellerDocuments = (seller) => {
    if (!seller) return [];
    const docs = [];
    const categories = seller.documents || {};
    const verify = seller.verificationStatus || {};

    // 1. Check nested documents object
    for (const key in categories) {
      const docItem = categories[key];
      const fileUrl = docItem?.fileUrl || docItem?.url;
      if (fileUrl) {
        const documentKey = Object.keys(seller.documents).find(k => seller.documents[k] === docItem) || key;
        const uploadDate = docItem.uploadDate || docItem.uploadedAt;

        docs.push({
          key: documentKey,
          category: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' '),
          fileName: docItem.fileName || docItem.originalName || docItem.name || 'Document',
          fileUrl: fileUrl,
          fileSize: docItem.fileSize || docItem.size,
          uploadDate: uploadDate
            ? new Date(uploadDate).toLocaleDateString()
            : "N/A",
          status: verify[documentKey] || docItem.status || "pending"
        });
      }
    }

    // 2. Fallback/Check flat fields on the seller document
    const flatMapping = [
      { key: 'panCard', url: seller.panCardUrl, name: 'PAN Card', fieldName: seller.panCardName || 'PAN Card' },
      { key: 'gstCertificate', url: seller.gstCertificateUrl, name: 'GST Certificate', fieldName: seller.gstCertificateName || 'GST Certificate' },
      { key: 'bankProof', url: seller.bankProofUrl || seller.bankDocUrl, name: 'Bank Proof', fieldName: seller.bankProofName || seller.bankDocName || 'Bank Proof' },
      { key: 'businessDoc', url: seller.businessDocUrl, name: 'Business Document', fieldName: seller.businessDocName || 'Business Document' },
      { key: 'identityDoc', url: seller.identityDocUrl, name: 'Identity Document', fieldName: seller.identityDocName || 'Identity Document' }
    ];

    flatMapping.forEach(item => {
      if (item.url && !docs.some(d => d.key === item.key)) {
        docs.push({
          key: item.key,
          category: item.name,
          fileName: item.fieldName,
          fileUrl: item.url,
          fileSize: 0,
          uploadDate: seller.lastUpdated ? new Date(seller.lastUpdated).toLocaleDateString() : "N/A",
          status: verify[item.key] || "pending"
        });
      }
    });

    return docs;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'blocked': return { bg: 'bg-red-100', text: 'text-red-800', icon: ShieldOff };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock };
    }
  };

  const getDocStatusColor = (status) => {
    const s = status.toLowerCase();
    if (s === "approved" || s === 'verified') {
      return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
    } else if (s === "pending" || s === 'uploaded') {
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
    } else if (s === "rejected") {
      return { bg: 'bg-red-100', text: 'text-red-800', icon: X };
    }
    return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock };
  };

  const renderDocStatus = (status) => {
    const { bg, text, icon: StatusIcon } = getDocStatusColor(status);
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text} capitalize`}
      >
        <StatusIcon className="h-3 w-3 mr-1" />
        {status}
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const { bg, text, icon: StatusIcon } = getStatusColor(status);
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
        <StatusIcon size={14} />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || "Pending"}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return "—";
    let d;
    if (date?.toDate) {
      d = date.toDate();
    } else {
      d = new Date(date);
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading && sellers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading sellers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sellers Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and monitor seller accounts and performance</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-blue-100">
            <div className="text-xs sm:text-sm text-gray-600">Total Sellers</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{sellerStats.total}</div>
          </div>

          <button
            onClick={fetchSellers}
            className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm sm:text-base"
          >
            <RefreshCw size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs sm:text-sm text-blue-100">Total Sellers</div>
              <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{sellerStats.total}</div>
            </div>
            <Store className="w-8 h-8 sm:w-12 sm:h-12 text-blue-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs sm:text-sm text-emerald-100">Approved</div>
              <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{sellerStats.approved}</div>
            </div>
            <UserCheck className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs sm:text-sm text-orange-100">Pending</div>
              <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{sellerStats.pending}</div>
            </div>
            <Clock className="w-8 h-8 sm:w-12 sm:h-12 text-orange-200 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs sm:text-sm text-red-100">Blocked</div>
              <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{sellerStats.blocked}</div>
            </div>
            <UserX className="w-8 h-8 sm:w-12 sm:h-12 text-red-200 opacity-80" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs sm:text-sm text-purple-100">Avg. Revenue</div>
              <div className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">₹0</div>
            </div>
            <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-purple-200 opacity-80" />
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH - Responsive */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-blue-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* SEARCH */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              className="w-full bg-white border border-gray-300 rounded-xl py-2.5 sm:py-3 pl-9 sm:pl-12 pr-8 sm:pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-sm sm:text-base"
              placeholder="Search sellers by name, business, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl py-2.5 pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm text-sm sm:text-base"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div className="relative flex-1 sm:flex-initial">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border border-gray-300 rounded-xl py-2.5 pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none shadow-sm text-sm sm:text-base"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredSellers.length}</span> of{" "}
            <span className="font-semibold">{sellers.length}</span> sellers
          </div>
        </div>
      </div>

      {/* SORT INFO - Responsive */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap justify-between items-center gap-3">
        <p className="text-xs sm:text-sm text-gray-600">
          Sorted by: <span className="font-semibold text-gray-900">
            Registration Date{getSortLabel()}
          </span>
        </p>
        <button
          onClick={handleSort}
          className="flex items-center text-blue-600 hover:text-blue-700 transition-colors text-xs sm:text-sm font-medium"
        >
          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          {sortConfig.direction === 'asc' ? 'Oldest First' : 'Newest First'}
        </button>
      </div>

      {/* SELLERS TABLE - DESKTOP (lg and above) */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Seller Info</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Store className="text-gray-300" size={48} />
                      <div className="text-gray-500">No sellers found</div>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-base">
                          {getSellerInitials(seller)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {getSellerName(seller)}
                          </div>
                          {seller.businessName && (
                            <div className="text-xs text-blue-600">{seller.businessName}</div>
                          )}
                          <div className="text-xs text-gray-500">
                            ID: {seller.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Mail size={12} className="text-gray-400" />
                          <span className="text-xs">{seller.email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Phone size={12} className="text-gray-400" />
                          <span className="text-xs">{seller.phone || "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {renderStatusBadge(seller.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-600">{formatDate(seller.registrationDate || seller.createdAt)}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewSeller(seller)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        <button
                          onClick={() => handleApproveSeller(seller.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleBlockSeller(seller.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Shield size={14} />
                          Block
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        {filteredSellers.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-between items-center gap-3">
            <div className="text-xs text-gray-600">
              Showing <span className="font-semibold">{filteredSellers.length}</span> of{" "}
              <span className="font-semibold">{sellers.length}</span> sellers
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs hover:bg-gray-100">
                Previous
              </button>
              <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs">1</span>
              <button className="px-2.5 py-1 border border-gray-300 rounded-lg text-xs hover:bg-gray-100">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE & TABLET CARDS (lg and below) */}
      <div className="lg:hidden space-y-4">
        {filteredSellers.map((seller) => (
          <div
            key={seller.id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {getSellerInitials(seller)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm sm:text-base">
                    {getSellerName(seller)}
                  </div>
                  <div className="text-xs text-gray-500 break-all">{seller.email}</div>
                </div>
              </div>
              {renderStatusBadge(seller.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs text-gray-600">Phone</div>
                <div className="font-medium text-sm">{seller.phone || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Joined</div>
                <div className="font-medium text-sm">{formatDate(seller.registrationDate || seller.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Business</div>
                <div className="font-medium text-sm break-words">{seller.businessName || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">ID</div>
                <div className="font-medium text-xs">{seller.id.substring(0, 8)}...</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleViewSeller(seller)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Eye size={16} />
                View Details
              </button>
              <button
                onClick={() => handleApproveSeller(seller.id)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
              <button
                onClick={() => handleBlockSeller(seller.id)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Shield size={16} />
                Block
              </button>
            </div>
          </div>
        ))}

        {filteredSellers.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
            <Store className="mx-auto text-gray-300 mb-3" size={48} />
            <div className="text-gray-500 mb-2">No sellers found</div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* SELLER DETAILS MODAL - Responsive */}
      {showModal && selectedSeller && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white flex flex-wrap justify-between items-center gap-3 p-4 sm:p-6 border-b border-gray-200 z-10">
              <div className='flex items-center space-x-2 sm:space-x-3'>
                <ShieldCheck className='h-5 w-5 sm:h-7 sm:w-7 text-blue-500' />
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Seller Profile & Verification</h2>
                  <p className="text-xs sm:text-sm text-gray-600">{getSellerName(selectedSeller)}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">

              {/* Profile Card & Status */}
              <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-semibold text-xl sm:text-2xl">
                      {getSellerInitials(selectedSeller)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-xl font-bold text-gray-900">{getSellerName(selectedSeller)}</h3>
                    {selectedSeller.businessName && (
                      <p className="text-sm sm:text-md font-medium text-blue-600">{selectedSeller.businessName}</p>
                    )}
                    <p className="text-xs text-gray-500 font-mono mt-0.5 sm:mt-1 break-all">ID: {selectedSeller.id}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end space-y-1">
                  <span className='text-xs text-gray-500'>Current Status:</span>
                  {renderStatusBadge(selectedSeller.status)}
                </div>
              </div>

              {/* Contact and Location Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

                {/* Contact */}
                <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-2 sm:space-y-3">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center mb-2 sm:mb-3"><Mail className='h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500' /> Contact</h4>
                  <div className='space-y-2 sm:space-y-3'>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Email</p>
                      <p className="text-sm text-gray-900 font-medium break-all">{selectedSeller.email || 'N/A'}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Phone</p>
                      <p className="text-sm text-gray-900 font-medium">{selectedSeller.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-200 space-y-2 sm:space-y-3">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center mb-2 sm:mb-3"><MapPin className='h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500' /> Location</h4>
                  <div className='space-y-2 sm:space-y-3'>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">Address</p>
                      <p className="text-sm text-gray-900">{selectedSeller.address || 'N/A'}</p>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-0.5 sm:mb-1">City, State, Pincode</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {selectedSeller.city || 'N/A'}, {selectedSeller.state || 'N/A'} {selectedSeller.pincode || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-5 rounded-xl space-y-2 sm:space-y-3 sm:col-span-2 lg:col-span-1">
                  <h4 className="font-semibold flex items-center mb-2 sm:mb-3 text-sm sm:text-base">₹ Financials</h4>
                  <div className='space-y-2 sm:space-y-3'>
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>GST Number</span>
                      <span className="font-medium break-all text-right">{selectedSeller.gstNumber || 'N/A'}</span>
                    </div>
                    <div className="pt-2 border-t border-blue-400">
                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                        <span>PAN Number</span>
                        <span className="font-medium">{selectedSeller.panNumber || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LEGAL, PAN & VERIFICATION AUDIT TRAIL */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl border border-indigo-800 shadow-xl space-y-6">
                <div className="flex justify-between items-center border-b border-indigo-800/60 pb-3">
                  <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-indigo-300">
                    <ShieldCheck className="text-emerald-400" /> Legal Compliance, PAN & Verification Audit Trail
                  </h3>
                  <span className="text-xs bg-indigo-900/60 text-indigo-200 border border-indigo-700 px-3 py-1 rounded-full font-mono">
                    Phase-1 Compliant
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
                  {/* Mobile Contact */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                    <span className="text-gray-400 block text-xs uppercase font-bold tracking-wider">Mobile Contact</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-bold">
                      <CheckCircle size={14} /> Registered Phone
                    </span>
                    <p className="text-[11px] text-gray-300 font-mono mt-1">+91 {selectedSeller.phone || 'N/A'}</p>
                  </div>

                  {/* PAN Details & Status */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                    <span className="text-gray-400 block text-xs uppercase font-bold tracking-wider">PAN Details</span>
                    <p className="font-mono font-bold text-white text-base">{selectedSeller.panNumber || selectedSeller.gst || 'N/A'}</p>
                    <p className="text-xs text-indigo-200 font-medium truncate">Name: {selectedSeller.panName || `${selectedSeller.firstName || ''} ${selectedSeller.lastName || ''}` || 'N/A'}</p>
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleVerifyPanStatus(selectedSeller.id, 'verified')}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-[10px] uppercase font-bold rounded transition"
                      >
                        Verify PAN
                      </button>
                      <button
                        onClick={() => handleVerifyPanStatus(selectedSeller.id, 'rejected')}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-[10px] uppercase font-bold rounded transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerifyPanStatus(selectedSeller.id, 'exempt')}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-[10px] uppercase font-bold rounded transition"
                      >
                        Exempt
                      </button>
                    </div>
                  </div>

                  {/* Seller Agreement Acceptance */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-gray-400 block text-xs uppercase font-bold tracking-wider">Seller Agreement</span>
                    {selectedSeller.agreementAccepted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold">
                        <CheckCircle size={12} /> Accepted ({selectedSeller.agreementVersion || "v1.0"})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-bold">
                        Pending
                      </span>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">ID: {selectedSeller.sellerId || selectedSeller.id}</p>
                  </div>

                  {/* Seller Legal Declaration */}
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1.5">
                    <span className="text-gray-400 block text-xs uppercase font-bold tracking-wider">Legal Declaration</span>
                    {selectedSeller.sellerDeclarationAccepted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold">
                        <CheckCircle size={12} /> Confirmed ({selectedSeller.sellerDeclarationVersion || "v1.0"})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-bold">
                        Pending
                      </span>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">Authenticity & Authority Agreed</p>
                  </div>
                </div>

                {/* KYC Audit Trail Log List */}
                {Array.isArray(selectedSeller.kycAuditTrail) && selectedSeller.kycAuditTrail.length > 0 && (
                  <div className="pt-3 border-t border-indigo-800/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2">Audit Trail Log</h4>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {selectedSeller.kycAuditTrail.map((log, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5 text-[11px]">
                          <span className="font-bold text-emerald-300 uppercase">{log.action}</span>
                          <span className="text-gray-300">By: {log.performedBy || "Admin"}</span>
                          <span className="text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</span>
                          {log.rejectionReason && <span className="text-rose-300 font-medium">Reason: {log.rejectionReason}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* DOCUMENTS SECTION */}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center"><FileText className='h-5 w-5 sm:h-6 sm:w-6 mr-2 text-yellow-500' /> Documents for Verification</h3>
                <div className="overflow-x-auto bg-gray-50 rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Document Type</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {getSellerDocuments(selectedSeller).length > 0 ? (
                        getSellerDocuments(selectedSeller).map((doc) => (
                          <tr key={doc.fileUrl} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">{doc.category}</td>
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap">
                              {renderDocStatus(doc.status)}
                            </td>
                            <td className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap space-x-2">
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-medium transition-colors"
                              >
                                View <ExternalLink className='h-2.5 w-2.5 sm:h-3 sm:w-3' />
                              </a>
                              <button
                                onClick={() => handleVerifyDocument(selectedSeller.id, doc.key, 'verified')}
                                className='inline-flex items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-3 sm:py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium transition-colors'
                              >
                                <CheckCircle size={12} />
                                Verify
                              </button>
                              <button
                                onClick={() => handleVerifyDocument(selectedSeller.id, doc.key, 'rejected')}
                                className='inline-flex items-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-3 sm:py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-medium transition-colors'
                              >
                                <X size={12} />
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-3 py-4 sm:px-4 sm:py-6 text-center text-xs sm:text-sm text-gray-500">
                            No documents uploaded yet.
                           </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SELLER PRODUCTS SECTION */}
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <Package className='h-5 w-5 sm:h-6 sm:w-6 mr-2 text-pink-500' />
                  Seller Products ({loadingProducts ? '...' : sellerProducts.length})
                </h3>
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">

                  {/* PRODUCT SEARCH BAR */}
                  {sellerProducts.length > 0 && (
                    <div className="relative mb-3 sm:mb-4">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search products by name or category..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-xs sm:text-sm"
                      />
                      {productSearchTerm && (
                        <button
                          onClick={() => setProductSearchTerm("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* PRODUCT LIST CONTENT */}
                  {loadingProducts ? (
                    <div className="flex items-center justify-center h-full py-6 sm:py-8">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-pink-500 mr-2 sm:mr-3"></div>
                      <span className="text-xs sm:text-sm text-gray-600">Loading Products...</span>
                    </div>
                  ) : sellerProducts.length > 0 ? (
                    <div className='overflow-hidden'>
                      {productSearchTerm && (
                        <p className="text-gray-600 text-xs mb-2">
                          Showing {filteredSellerProducts.length} product{filteredSellerProducts.length !== 1 ? 's' : ''} for "{productSearchTerm}"
                        </p>
                      )}

                      <div className="grid grid-cols-12 text-xs font-semibold uppercase text-gray-500 pb-2 border-b border-gray-300">
                        <span className="col-span-6">Product Name</span>
                        <span className="col-span-3">Category</span>
                        <span className="col-span-3 text-right">Price</span>
                      </div>
                      <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto pr-1 sm:pr-2 pt-2">
                        {filteredSellerProducts.length === 0 ? (
                          <p className="text-gray-500 text-center pt-4 text-xs">No products match your search.</p>
                        ) : (
                          filteredSellerProducts.map((product) => (
                            <div key={product.id} className="grid grid-cols-12 items-center bg-white p-2 sm:p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                              <div className="col-span-6 flex items-center gap-3 pr-2">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center">
                                  {product.images?.[0] ? (
                                    <img
                                      src={product.images[0].url || product.images[0]}
                                      className="w-full h-full object-cover"
                                      alt={product.name}
                                    />
                                  ) : (
                                    <ShoppingBag className="text-gray-300 w-4 h-4 sm:w-5 sm:h-5" />
                                  )}
                                </div>
                                <p className="text-gray-900 font-medium truncate text-xs sm:text-sm">{product.name || 'Untitled Product'}</p>
                              </div>
                              <p className="col-span-3 text-gray-600 text-xs sm:text-sm">{product.categoryName || product.category || 'N/A'}</p>
                              <div className="col-span-3 flex justify-end items-center">
                                <span className="text-green-600 font-semibold text-xs sm:text-sm">₹{product.price?.toFixed(2) || 'N/A'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-6 sm:py-8 text-xs sm:text-sm">This seller has no products listed yet.</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold transition-colors shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                  onClick={() => handleMessageSeller(selectedSeller)}
                >
                  <MessageSquare size={16} className="sm:w-5 sm:h-5" />
                  Send Message
                </button>
                <button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold transition-colors shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                  onClick={() => {
                    handleApproveSeller(selectedSeller.id);
                    closeModal();
                  }}
                >
                  <CheckCircle2 size={16} className="sm:w-5 sm:h-5" />
                  Approve
                </button>
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold transition-colors shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 text-sm"
                  onClick={() => {
                    handleBlockSeller(selectedSeller.id);
                    closeModal();
                  }}
                >
                  <Shield size={16} className="sm:w-5 sm:h-5" />
                  Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGE MODAL - Responsive */}
      {showMessageModal && selectedSeller && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-2xl">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Send Message to Seller</h2>
              <button
                onClick={closeMessageModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <div className="mb-4 sm:mb-6 bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Seller</label>
                <p className="text-sm sm:text-base text-gray-900 font-semibold">{getSellerName(selectedSeller)}</p>
                {selectedSeller.businessName && (
                  <p className="text-blue-600 text-xs sm:text-sm">{selectedSeller.businessName}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 sm:mt-2 text-xs text-gray-500">
                  {selectedSeller.phone && (
                    <span className="flex items-center gap-1">
                      <Smartphone size={12} className="sm:w-3.5 sm:h-3.5" />
                      {selectedSeller.phone}
                    </span>
                  )}
                  {selectedSeller.email && (
                    <span className="flex items-center gap-1 break-all">
                      <Mail size={12} className="sm:w-3.5 sm:h-3.5" />
                      {selectedSeller.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Message Content</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full bg-white text-gray-900 p-3 sm:p-4 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-sm"
                  rows={4}
                  placeholder="Type your message here..."
                />
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Send Via</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    onClick={() => handleSendConfirmation('whatsapp')}
                    disabled={!selectedSeller.phone}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl font-semibold transition-all duration-200 text-sm ${selectedSeller.phone
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <MessageCircle size={14} className="sm:w-4 sm:h-4" />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleSendConfirmation('gmail')}
                    disabled={!selectedSeller.email}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl font-semibold transition-all duration-200 text-sm ${selectedSeller.email
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                  >
                    <Mail size={14} className="sm:w-4 sm:h-4" />
                    Gmail
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeMessageModal}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL - Responsive */}
      {showConfirmationModal && selectedSeller && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-2xl">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-blue-500"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                    Confirm Send
                  </>
                )}
              </h2>
              {!sending && (
                <button
                  onClick={closeConfirmationModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>
            <div className="p-4 sm:p-6">
              {!sending ? (
                <>
                  <div className="mb-4 sm:mb-6">
                    <p className="text-sm text-gray-600 mb-3 sm:mb-4">
                      Are you sure you want to send this message via{' '}
                      <span className="font-semibold text-gray-900">
                        {selectedChannel === 'whatsapp' ? 'WhatsApp' : selectedChannel === 'gmail' ? 'Gmail' : 'Email'}
                      </span>?
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Message Preview</label>
                      <p className="text-gray-800 text-xs sm:text-sm whitespace-pre-wrap">{messageText}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
                    <button
                      onClick={closeConfirmationModal}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-colors font-semibold text-sm"
                      disabled={sending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg flex items-center gap-1.5 sm:gap-2 text-sm"
                      disabled={sending}
                    >
                      <Send size={14} className="sm:w-4 sm:h-4" />
                      Send Message
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-900 font-semibold text-sm sm:text-base">Message sent successfully!</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2">Redirecting you back...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
};

export default Sellers;