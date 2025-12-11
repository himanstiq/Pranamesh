import { Suspense } from 'react';
import MappingPage from '@/components/MappingPage';

// Loading fallback for Suspense
function MappingLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-dark_bg">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-light-theme dark:border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-text-muted-light dark:text-text-muted">Loading map...</p>
            </div>
        </div>
    );
}

const Page = () => {
    return (
        <Suspense fallback={<MappingLoading />}>
            <MappingPage />
        </Suspense>
    );
};

export default Page;
