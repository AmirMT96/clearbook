import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const { data: profile } = await supabase
    .from('profiles')
    .select('bottt_seed, bottt_name, anrede')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <AppShell
      botttSeed={profile?.bottt_seed ?? undefined}
      botttName={profile?.bottt_name ?? undefined}
      anrede={profile?.anrede ?? undefined}
    >
      {children}
    </AppShell>
  );
}
