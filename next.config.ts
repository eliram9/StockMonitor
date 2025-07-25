import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    eslint: {
        // Disable ESLint during builds
        ignoreDuringBuilds: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**', // Allow all HTTPS domains for news images
            },
        ],
    },
};

export default nextConfig;