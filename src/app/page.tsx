// Main page - displays the stock monitoring dashboard

import { Suspense } from 'react';
import { Dashboard } from '@/components/Dashboard';
import Loading from './loading';

export default function Home() {
    return (
        <Suspense fallback={<Loading />}>
            <Dashboard />
        </Suspense>
    );
}
