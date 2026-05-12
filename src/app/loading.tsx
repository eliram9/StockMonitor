// Streamed immediately by the App Router while the Dashboard JS chunk loads.
// Replaces the invisible blank screen / long spinner the user was experiencing.

export default function Loading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header skeleton */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <div className="space-y-2">
                            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
                            <div className="h-4 w-56 bg-gray-100 rounded animate-pulse" />
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
                            <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Stock card skeletons */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-lg p-6 border-l-8 border-gray-200">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse flex-shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="h-8 w-28 bg-gray-200 rounded animate-pulse mb-3" />
                            <div className="flex space-x-4">
                                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                                <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* News section skeleton */}
                <div className="bg-white rounded-lg shadow-lg px-6 py-4 border border-gray-200">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6 mt-2" />
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-3">
                                <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                                <div className="h-3 w-full bg-gray-50 rounded animate-pulse" />
                                <div className="h-3 w-5/6 bg-gray-50 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
