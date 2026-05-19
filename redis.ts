import { Redis } from '@upstash/redis';

// The Upstash → Vercel integration may inject env vars under either name
// depending on which integration flow you use:
//   - Upstash Marketplace integration: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   - Legacy Vercel KV compatibility:  KV_REST_API_URL / KV_REST_API_TOKEN
// We support both so the app works regardless of how you connect Upstash.
const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  '';

const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  '';

export const redis = new Redis({ url, token });

export const KEYS = {
  accounts: 'finance:accounts',
  transactions: 'finance:transactions',
};
