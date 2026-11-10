import type { NextConfig } from "next";

/**
 * Vercel already defines SUPABASE_URL and SUPABASE_ANON_KEY.
 * Map these PUBLIC client-safe values to the existing application variable names.
 * next.config env values are bundled into client code: NEVER add service_role or secret keys here.
 */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
