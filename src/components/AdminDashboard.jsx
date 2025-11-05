// src/components/AdminDashboard.jsx (V4.0 - Action Focused Dashboard)
import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import ActionCard from './ActionCard'; // ניצור את הקובץ הזה
import ActionModal from './ActionModal'; // וניצור גם את הקובץ הזה
import LoadingSpinner from './LoadingSpinner'; // נשתמש ברכיב קיים
import AlertMessage from './AlertMessage'; // נשתמש ברכיב קיים

const AdminDashboard = ({ authToken, API_URL, user, onLogout }) => {
    const [stats, setStats] = useState({ totalUsers: 0, totalProfessionals: 0, totalPendingReviews: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentModal, setCurrentModal] = useState(null); // 'reviews', 'professionals', 'users'

    // --- קריאת API סטטיסטית ראשונית ---
    const fetchAdminStats = useCallback(async () => {
        if (user?.userType !== 'admin') return;
        setLoading(true); setError(null);
        try {
            const statsRes = await fetch(`${API_URL}/api/admin/stats`, { 
                headers: { 'Authorization': `Bearer ${authToken}` } 
            });
            if (!statsRes.ok) {
                 if (statsRes.status === 403) onLogout();
                 throw new Error('שגיאה בטעינת נתונים סטטיסטיים.');
            }
            const data = await statsRes.json();
            setStats(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [authToken, API_URL, user?.userType, onLogout]);

    useEffect(() => {
        fetchAdminStats();
    }, [fetchAdminStats]);

    // --- פונקציה שתטפל בעדכון ה-API לאחר פעולה במודאל ---
    const handleActionComplete = () => {
        fetchAdminStats(); // רענון הנתונים הסטטיסטיים
        setCurrentModal(null); // סגירת המודאל
    };

    if (loading) { return <LoadingSpinner />; }
    
    return (
        <div className="space-y-8 md:space-y-12">
            <h2 className="text-3xl font-bold text-primary-blue text-center">🏆 לוח בקרה למנהל (Admin Dashboard)</h2>
            
            {error && <AlertMessage type="error" message={error} onDismiss={() => setError(null)} />}

            {/* 1. רכיבי הפעולה החדשים (מחליפים את הסטטיסטיקה הפאסיבית) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ActionCard
                    title="חוות דעת ממתינות"
                    value={stats.totalPendingReviews}
                    color="yellow"
                    onClick={() => setCurrentModal('reviews')}
                />
                <ActionCard
                    title="מטפלים פעילים"
                    value={stats.totalProfessionals}
                    color="green"
                    onClick={() => setCurrentModal('professionals')}
                />
                <ActionCard
                    title="משתמשים רשומים (כללי)"
                    value={stats.totalUsers}
                    color="blue"
                    onClick={() => setCurrentModal('users')}
                />
            </div>
            
            {/* 2. אזור הגרפים (כפי שביקשת) - שלב עתידי */}
            <div className="p-4 bg-gray-100 rounded-lg">
                <h3 className="text-xl font-bold text-text-dark mb-4 border-b pb-2">ניתוח מגמות (בקרוב)</h3>
                <p className="text-sm text-gray-700">[כאן יופיע הגרף של נרשמים חדשים לפי יום]</p>
            </div>
            
            {/* 3. המודאל החכם שמופעל לפי לחיצה */}
            {currentModal && (
                <ActionModal
                    modalType={currentModal}
                    authToken={authToken}
                    API_URL={API_URL}
                    onClose={() => setCurrentModal(null)}
                    onActionComplete={handleActionComplete}
                />
            )}
        </div>
    );
};

export default AdminDashboard;