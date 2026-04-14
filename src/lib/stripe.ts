import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Force the latest stable API version or pass undefined to type it correctly
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia' as any, // fallback to ignore strict types
  appInfo: {
    name: 'VoxMarket',
    version: '0.1.0'
  }
});

// Helper for generating Absolute URLs on server components/routes
export function absoluteUrl(path: string) {
  // If we are dynamically passing NEXT_PUBLIC_APP_URL, use it. Otherwise fallback to localhost
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
}
