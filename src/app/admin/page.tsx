'use client';

import { useAuth } from '@/lib/AuthContext';
import AdminLogin from '@/components/admin/AdminLogin';
import AQIDataEntry from '@/components/admin/AQIDataEntry';
import { LogOut, Loader2 } from 'lucide-react';

export default function AdminPage() {
    const { isAuthenticated, isLoading, login, logout } = useAuth();

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary-light-theme dark:text-primary mb-4" />
                        <p className="text-text-muted-light dark:text-text-muted">Loading...</p>
                    </div>
                </div>
            </main>
        );
    }

    // Show login form if not authenticated
    if (!isAuthenticated) {
        return (
            <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
                <AdminLogin onLogin={login} />
            </main>
        );
    }

    // Show admin panel if authenticated
    return (
        <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
            {/* Logout Button */}
            <div className="fixed top-[90px] right-4 z-50">
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
            <AQIDataEntry />
        </main>
    );
}
