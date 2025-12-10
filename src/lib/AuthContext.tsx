'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================
// Types
// ============================================

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => boolean;
    logout: () => void;
}

interface AuthProviderProps {
    children: ReactNode;
}

// ============================================
// Constants
// ============================================

// Default credentials - can be overridden via environment variables
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'pranamesh2024';

const AUTH_STORAGE_KEY = 'pranamesh_admin_auth';

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================
// Provider Component
// ============================================

export function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing auth session on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(AUTH_STORAGE_KEY);
            if (stored === 'true') {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: restore auth state from localStorage on mount
                setIsAuthenticated(true);
            }
             
            setIsLoading(false);
        }
    }, []);

    const login = (username: string, password: string): boolean => {
        // Get credentials from env or use defaults
        const validUsername = process.env.NEXT_PUBLIC_ADMIN_USERNAME || DEFAULT_USERNAME;
        const validPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || DEFAULT_PASSWORD;

        if (username === validUsername && password === validPassword) {
            setIsAuthenticated(true);
            if (typeof window !== 'undefined') {
                localStorage.setItem(AUTH_STORAGE_KEY, 'true');
            }
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
