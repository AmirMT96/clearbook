import { createClient } from '@/lib/supabase/server';
import { fmtEUR, monthRange } from '@/lib/utils';
import { BotttAvatar } from '@/components/BotttAvatar';
import { DashboardCharts } from './charts';
import { DashboardFilters } from './filters';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Load all transactions + getbacks for client-side filtering
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, amount, type, vat_rate, vat_amount, net_amount, status, date, description, category_id, is_auto_booked')
    .eq('user_id', user.id);

  const { data: getbacks } = await supabase
    .from('getbacks')
    .select('id, amount, status, date')
    .eq('user_id', user.id);

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', user.id);

  const today = new Date().toISOString().slice(0, 10);
  const fullName = `${profile?.anrede ?? ''} ${profile?.nachname ?? ''}`.trim();

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {profile?.bottt_seed && (
            <BotttAvatar seed={profile.bottt_seed} anrede={profile.anrede} size={56} />
          )}
          <div>
            <p className="text-xs text-muted">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <h1 className="text-xl md:text-2xl dark:text-white">{greetByHour()}, {fullName || 'willkommen'}</h1>
          </div>
        </div>
      </header>

      <DashboardFilters
        transactions={txs ?? []}
        getbacks={getbacks ?? []}
        categories={categories ?? []}
      />
    </div>
  );
}

function greetByHour() {
  const h = new Date().getHours();
  if (h < 11) return 'Guten Morgen';
  if (h < 18) return 'Hallo';
  return 'Guten Abend';
}
