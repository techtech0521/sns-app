import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type React from 'react';

interface PrivateRouteProps {
    children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to='/auth' replace />;
    }

    return <>{children}</>;
}