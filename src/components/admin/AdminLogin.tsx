'use client';

import React, { useState } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

interface AdminLoginProps {
    onLogin: (username: string, password: string) => boolean;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 300));

        const success = onLogin(username, password);

        if (!success) {
            setError('Invalid username or password');
            setPassword('');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-light-theme to-primary-light-light-theme dark:from-primary dark:to-warm-orange mb-4 shadow-lg">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-dark dark:text-text-light">
                        Admin Access
                    </h1>
                    <p className="text-text-muted-light dark:text-text-muted mt-2">
                        Enter your credentials to access the admin panel
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6 shadow-lg">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter username"
                                    required
                                    autoComplete="username"
                                    className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary focus:ring-2 focus:ring-primary-light-theme/20 dark:focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-text-dark dark:text-text-light mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted-light dark:text-text-muted" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-12 pr-12 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-text-dark dark:text-text-light placeholder-text-muted-light dark:placeholder-text-muted focus:outline-none focus:border-primary-light-theme dark:focus:border-primary focus:ring-2 focus:ring-primary-light-theme/20 dark:focus:ring-primary/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted hover:text-text-dark dark:hover:text-text-light transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !username || !password}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary-light-theme to-primary-light-light-theme dark:from-primary dark:to-warm-orange text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer Note */}
                <p className="text-center text-text-muted-light dark:text-text-muted text-sm mt-6">
                    Access restricted to authorized personnel only
                </p>
            </div>
        </div>
    );
}
