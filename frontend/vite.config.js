import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

const dynamicRoutes = [
  '/',
  '/menu',
  '/plans',
  '/gallery',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/refund',
  '/catering',
  '/events',
  '/login',
  '/signup'
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    Sitemap({
        hostname: 'https://vrindavanrestocafe.com',
        dynamicRoutes,
        robots: [{
          userAgent: '*',
          allow: '/',
          disallow: ['/admin', '/delivery', '/cashier']
        }]
    })
  ],
})
