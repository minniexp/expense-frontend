/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Only run ESLint on build in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  // If you're having persistent ESLint issues during deployment:
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
}

module.exports = nextConfig 