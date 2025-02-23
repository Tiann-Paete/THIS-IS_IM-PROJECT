// ProtectedRoute.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const ProtectedRoute = ({ children }) => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        console.log('Token from localStorage:', token); // Add this line
        if (!token) {
          console.log('No token found, redirecting to signin...');
          router.push('/signin');
          return;
        }

        const response = await fetch('/api/check-auth', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        const data = await response.json();
        console.log('Auth check response:', data);
        if (data.isAuthenticated) {
          setIsAuthenticated(true);
        } else {
          console.log('Not authenticated, redirecting to signin...');
          router.push('/signin');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/signin');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : null;
};

export default ProtectedRoute;