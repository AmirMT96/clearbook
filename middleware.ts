import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next internals, API, manifest, and any static file with an extension (png/svg/jpg/ico/webp/json/txt/xml/mp4/css/js)
    '/((?!_next/static|_next/image|api/|manifest.json|.*\\.(?:png|svg|jpg|jpeg|gif|ico|webp|json|txt|xml|mp4|css|js)$).*)',
  ],
};
