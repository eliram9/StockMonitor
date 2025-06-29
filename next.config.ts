import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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