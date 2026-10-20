import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/reports/pos',
        destination: '/pos/reports',
        permanent: true,
      },
      {
        source: '/reports/ai-summary',
        destination: '/ai/reports',
        permanent: true,
      },

      {
        source: '/reports/finance',
        destination: '/finance/reports',
        permanent: true,
      },
      {
        source: '/reports/inventory',
        destination: '/inventory/reports',
        permanent: true,
      },
      {
        source: '/customers/list',
        destination: '/crm/customers',
        permanent: true,
      },
      {
        source: '/customers',
        destination: '/crm/customers',
        permanent: true,
      },
      {
        source: '/crm/quotations',
        destination: '/sales/quotations',
        permanent: true,
      },
      {
        source: '/crm/orders',
        destination: '/sales/orders',
        permanent: true,
      },
      {
        source: '/crm/deliveries',
        destination: '/sales/deliveries',
        permanent: true,
      },
      {
        source: '/inventory/stock-adjustment',
        destination: '/inventory/adjustments',
        permanent: true,
      },
      {
        source: '/inventory/stock-transfer',
        destination: '/inventory/transfers',
        permanent: true,
      }
    ];
  },
};

export default nextConfig;

