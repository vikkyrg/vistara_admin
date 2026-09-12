import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import toast, { Toaster } from 'react-hot-toast';

const NotificationListener = () => {
  const isInitialLoad = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, "products"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        
        const lastSeenTime = parseInt(localStorage.getItem('lastSeenPendingTime') || '0');
        let unreadCount = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.createdAt && typeof data.createdAt.toMillis === 'function') {
            if (data.createdAt.toMillis() > lastSeenTime) unreadCount++;
          } else if (lastSeenTime === 0) {
            unreadCount++;
          }
        });

        if (unreadCount > 0) {
          toast((t) => (
            <div className="flex flex-col gap-2 cursor-pointer" onClick={() => {
              toast.dismiss(t.id);
              localStorage.setItem('lastSeenPendingTime', Date.now().toString());
              window.dispatchEvent(new Event('pendingSeen'));
              navigate('/pending-approvals');
            }}>
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <span>🔔</span> Pending Approvals
              </div>
              <div className="text-sm text-gray-600">
                You have {unreadCount} new products waiting for review.
              </div>
              <button className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold self-start hover:bg-indigo-700 transition">
                View All
              </button>
            </div>
          ), { duration: 6000, position: 'top-right' });
        }
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const product = change.doc.data();
          toast((t) => (
            <div className="flex flex-col gap-2 cursor-pointer" onClick={() => {
              toast.dismiss(t.id);
              localStorage.setItem('lastSeenPendingTime', Date.now().toString());
              window.dispatchEvent(new Event('pendingSeen'));
              navigate('/pending-approvals');
            }}>
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <span>🔔</span> New Product Needs Approval
              </div>
              <div className="text-sm text-gray-600">
                {product.name || 'Unknown'} is waiting for review.
              </div>
              <button className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold self-start hover:bg-indigo-700 transition">
                Review Now
              </button>
            </div>
          ), {
            duration: 8000,
            position: 'top-right'
          });
        }
      });
    });

    return () => unsubscribe();
  }, []);

  return <Toaster position="top-right" />;
};

export default NotificationListener;
