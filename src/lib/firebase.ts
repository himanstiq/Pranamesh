'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent multiple initializations)
let app: FirebaseApp | undefined;
let database: Database | undefined;
let firestore: Firestore | undefined;

/**
 * Get or initialize Firebase app
 */
export function getFirebaseApp(): FirebaseApp | null {
    if (typeof window === 'undefined') {
        // Server-side: don't initialize Firebase
        return null;
    }

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.warn('Firebase config missing. Set NEXT_PUBLIC_FIREBASE_* environment variables.');
        return null;
    }

    if (!app && getApps().length === 0) {
        try {
            app = initializeApp(firebaseConfig);
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            return null;
        }
    } else if (!app) {
        app = getApps()[0];
    }

    return app;
}

/**
 * Get Firebase Realtime Database instance
 */
export function getFirebaseDatabase(): Database | null {
    if (typeof window === 'undefined') {
        console.log('[Firebase] getFirebaseDatabase called on server-side, returning null');
        return null;
    }

    if (!database) {
        console.log('[Firebase] Initializing Realtime Database...');
        console.log('[Firebase] DATABASE_URL:', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);

        const firebaseApp = getFirebaseApp();
        if (!firebaseApp) {
            console.warn('[Firebase] No Firebase app available');
            return null;
        }

        try {
            // Pass the database URL explicitly for non-default region databases
            const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
            if (dbUrl) {
                database = getDatabase(firebaseApp, dbUrl);
                console.log('[Firebase] [OK] Realtime Database initialized with URL:', dbUrl);
            } else {
                database = getDatabase(firebaseApp);
                console.log('[Firebase] [OK] Realtime Database initialized with default URL');
            }
        } catch (error) {
            console.error('[Firebase] [ERROR] Failed to get Firebase database:', error);
            return null;
        }
    }

    return database;
}

/**
 * Get Firebase Firestore instance
 */
export function getFirebaseFirestore(): Firestore | null {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!firestore) {
        const firebaseApp = getFirebaseApp();
        if (!firebaseApp) return null;

        try {
            firestore = getFirestore(firebaseApp);
        } catch (error) {
            console.error('Failed to get Firestore:', error);
            return null;
        }
    }

    return firestore;
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
    return !!(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
}

/**
 * Check if Realtime Database is configured
 */
export function isRealtimeDatabaseConfigured(): boolean {
    return !!(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    );
}

