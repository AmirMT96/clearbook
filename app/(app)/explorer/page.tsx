import { createClient } from '@/lib/supabase/server';
import { ExplorerView } from './ExplorerView';

export const dynamic = 'force-dynamic';

export default async function ExplorerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: txs } = await supabase
    .from('transactions')
    .select('id, date, description, amount, type, vat_rate, vat_amount, net_amount, status, category_id, is_auto_booked, trip_id')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, emoji, type')
    .eq('user_id', user.id);

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl mb-4">🔍 Explorer</h1>
      <ExplorerView transactions={txs ?? []} categories={categories ?? []} />
    </div>
  );
}
