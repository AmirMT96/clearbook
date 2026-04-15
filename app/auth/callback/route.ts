import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Ensure profile exists
      const meta = data.user.user_metadata ?? {};
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
      if (!existing) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          vorname: meta.vorname, nachname: meta.nachname, anrede: meta.anrede,
          profil_type: meta.profil_type,
          land: meta.land, ust_pflichtig: meta.ust_pflichtig,
          bottt_seed: meta.bottt_seed, bottt_name: meta.bottt_name,
        });
        await supabase.rpc('insert_default_categories', {
          p_user_id: data.user.id,
          p_profil_type: meta.profil_type,
        });
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback`);
}
