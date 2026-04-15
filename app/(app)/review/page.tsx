import { createClient } from '@/lib/supabase/server';
import { ReviewList } from './ReviewList';
import { BotttAvatar } from '@/components/BotttAvatar';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('bottt_seed, bottt_name, anrede, nachname')
    .eq('id', user.id)
    .maybeSingle();

  const { data: txs } = await supabase
    .from('transactions')
    .select('id, date, description, amount, type, vat_rate, category_id, is_auto_booked, raw_input')
    .eq('user_id', user.id)
    .eq('status', 'ungefasst')
    .order('date', { ascending: false });

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, emoji, type')
    .eq('user_id', user.id);

  const count = txs?.length ?? 0;

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <header className="flex items-center gap-4 mb-6">
        {profile?.bottt_seed && <BotttAvatar seed={profile.bottt_seed} anrede={profile.anrede} size={56} />}
        <div>
          <h1 className="text-2xl">⚠️ {count} {count === 1 ? 'Eintrag wartet' : 'Einträge warten'}</h1>
          <p className="text-sm text-muted">{profile?.bottt_name ?? 'Dein Bottt'}: "Kurz drüber schauen — ich habe schon vorgearbeitet!"</p>
        </div>
      </header>

      {count === 0 ? (
        <div className="card text-center py-10">
          <p className="text-lg mb-1">Alles im Grünen ✅</p>
          <p className="text-sm text-muted">Keine offenen Einträge.</p>
        </div>
      ) : (
        <ReviewList txs={txs ?? []} categories={categories ?? []} />
      )}
    </div>
  );
}
