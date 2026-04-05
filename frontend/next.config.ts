import type { NextConfig } from 'next';

const API_URL = process.env.API_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
    basePath: '/trustchecker',
    trailingSlash: true,
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${API_URL}/api/:path*`,
            },
            {
                source: "/legacy/:path*",
                destination: `${API_URL}/legacy/:path*`,
            }
        ];
    },
};

export default nextConfig;
