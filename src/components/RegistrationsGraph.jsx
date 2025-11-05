// src/components/RegistrationsGraph.jsx
// --- רכיב גרף חדש ---

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import moment from 'moment';

const RegistrationsGraph = ({ authToken, API_URL }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true); setError(null);
        fetch(`${API_URL}/api/admin/stats/registrations-chart`, { 
            headers: { 'Authorization': `Bearer ${authToken}` } 
        })
        .then(res => {
            if (!res.ok) throw new Error('שגיאה בטעינת נתוני הגרף.');
            return res.json();
        })
        .then(apiData => {
            // עיבוד הנתונים לפורמט שהגרף דורש
            const processedData = apiData.map(item => ({
                date: moment(item.date).format('DD/MM'),
                count: item.count
            }));
            setData(processedData);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, [authToken, API_URL]);

    if (loading) {
        return <div className="text-center p-10 text-sm text-gray-500">טוען נתוני גרף...</div>;
    }
    if (error) {
        return <div className="text-center p-10 text-sm text-red-500">{error}</div>;
    }
    if (data.length === 0) {
        return <div className="text-center p-10 text-sm text-gray-500">לא נמצאו נתוני הרשמה ב-30 הימים האחרונים.</div>;
    }

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <LineChart
                    data={data}
                    margin={{
                        top: 5, right: 30, left: 0, bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" name="נרשמים חדשים" stroke="#764ba2" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RegistrationsGraph;