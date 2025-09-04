const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure for pages router
}

module.exports = process.env.NODE_ENV === 'development' ? nextConfig : withPWA(nextConfig)