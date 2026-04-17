import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl mb-4 dark:text-dark-text">Einstellungen</h1>
      <SettingsForm initial={profile} email={user.email ?? ''} />
    </div>
  );
}
