import React, { useState, useEffect } from 'react';

const SessionActivity = () => {
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSessionHistory = async () => {
      try {
        const response = await fetch('/api/session-history');
        if (!response.ok) {
          throw new Error('Failed to fetch session history');
        }
        const data = await response.json();
        setSessionHistory(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching session history:', error);
        setError('Failed to load session history. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchSessionHistory();
  }, []);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    };
    return new Date(dateTimeString).toLocaleString('en-US', options);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading session history...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl text-black font-semibold mb-4">Session Activity</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                Full Name
              </th>
              <th className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                Login Time
              </th>
              <th className="px-6 py-3 border-b border-gray-200 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                Logout Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {sessionHistory.map((session, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-6 py-4 text-black whitespace-no-wrap border-b border-gray-200">
                  {session.full_name}
                </td>
                <td className="px-6 py-4 text-black whitespace-no-wrap border-b border-gray-200">
                  {session.username}
                </td>
                <td className="px-6 py-4 text-black whitespace-no-wrap border-b border-gray-200">
                  {session.role}
                </td>
                <td className="px-6 py-4 text-black whitespace-no-wrap border-b border-gray-200">
                  {formatDateTime(session.login_time)}
                </td>
                <td className="px-6 py-4 text-black whitespace-no-wrap border-b border-gray-200">
                  {formatDateTime(session.logout_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SessionActivity;