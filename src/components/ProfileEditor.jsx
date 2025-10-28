      // src/components/ProfileEditor.jsx
import React, { useState, useEffect } from 'react';

const ProfileEditor = ({ authToken, API_URL, user, onUpdateSuccess, onLogout }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        bio: '',
        yearsOfPractice: 0,
        phoneNumber: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.userId || !authToken) return;
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_URL}/api/professionals/me`, {
                    headers: { 'Authorization': `Bearer ${authToken}` },
                });
                if (res.status === 401 || res.status === 403) {
                    onLogout(); return;
                }
                if (!res.ok) throw new Error('Failed to fetch profile data.');
                const data = await res.json();
                setFormData({
                    fullName: data.full_name || '',
                    bio: data.bio || '',
                    yearsOfPractice: data.years_of_practice || 0,
                    phoneNumber: data.phone_number || '',
                });
            } catch (err) {
                console.error('Profile fetch error:', err);
                setError(err.message || 'שגיאה בטעינת נתונים.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [authToken, API_URL, user, onLogout]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: id === 'yearsOfPractice' ? parseInt(value, 10) : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(null); setMessage(null);
        try {
            const updatePayload = {
                full_name: formData.fullName,
                bio: formData.bio,
                years_of_practice: formData.yearsOfPractice,
                phone_number: formData.phoneNumber,
            };
            const res = await fetch(`${API_URL}/api/professionals/me`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(updatePayload)
            });
            if (res.status === 401 || res.status === 403) {
                onLogout(); return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'עדכון נכשל.');
            }
            setMessage('✅ הפרופיל עודכן בהצלחה!');
            // onUpdateSuccess?.(); // Optional: Trigger global update if needed
        } catch (err) {
            console.error('Update error:', err);
            setError(err.message || 'שגיאה בעדכון הפרופיל.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !message && !error) {
        // Spinner defined in style.css will be used here
        return <div className="text-center p-10"><div className="spinner"></div><p className="mt-4 text-lg text-text-dark">טוען נתוני פרופיל...</p></div>;
    }

    return (
        // Using Tailwind classes from style.css
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto my-8">
            <h2 className="text-2xl font-bold text-primary-blue mb-6 border-b pb-3 text-right">עריכת פרופיל אישי</h2>
            {error && <p className="text-red-600 p-3 bg-red-50 rounded mb-4 text-right">{error}</p>}
            {message && <p className="text-green-600 p-3 bg-green-50 rounded mb-4 text-right">{message}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 text-right">שם מלא:</label>
                    <input type="text" id="fullName" value={formData.fullName} onChange={handleChange} required
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue text-right"/>
                </div>
                <div>
                    <label htmlFor="yearsOfPractice" className="block text-sm font-medium text-gray-700 text-right">שנות נסיון:</label>
                    <input type="number" id="yearsOfPractice" value={formData.yearsOfPractice} onChange={handleChange} min="0"
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue text-right"/>
                </div>
                <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 text-right">טלפון:</label>
                    <input type="tel" id="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue text-right"/>
                </div>
                <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 text-right">אודות (Bio):</label>
                    <textarea id="bio" value={formData.bio} onChange={handleChange} rows="4"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue text-right"/>
                </div>
                <button type="submit" disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white transition duration-300 transform hover:scale-105 bg-primary-blue hover:bg-secondary-purple disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'מעדכן...' : 'שמור שינויים'}
                </button>
            </form>
        </div>
    );
};

export default ProfileEditor;