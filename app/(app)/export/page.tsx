import { createClient } from '@/lib/supabase/server';
import { ExportView } from './ExportView';

export const dynamic = 'force-dynamic';

export default async function ExportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: txs } = await supabase
    .from('transactions')
    .select('id, date, description, amount, type, vat_rate, vat_amount, net_amount, re_number, beleg_checked, erstellt_checked, bezahlt_checked, note, category_id, status')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  const { data: getbacks } = await supabase
    .from('getbacks')
    .select('id, date, description, amount, beleg_checked, status, note')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', user.id);

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl dark:text-white mb-4">Export</h1>
      <ExportView
        transactions={txs ?? []}
        getbacks={getbacks ?? []}
        categories={categories ?? []}
      />
    </div>
  );
}
