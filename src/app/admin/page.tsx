import AQIDataEntry from '@/components/admin/AQIDataEntry';

export const metadata = {
    title: 'Admin - AQI Data Entry | PranaMesh',
    description: 'Submit air quality readings to Firebase',
};

export default function AdminPage() {
    return (
        <main style={{ minHeight: '100vh', paddingTop: '80px' }}>
            <AQIDataEntry />
        </main>
    );
}
