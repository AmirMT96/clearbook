import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PrivatSheet } from '@/components/sheets/PrivatSheet';
import { UstvaSheet } from '@/components/sheets/UstvaSheet';
import { EuerSheet } from '@/components/sheets/EuerSheet';
import { GetbacksSheet } from '@/components/sheets/GetbacksSheet';
import { EinnahmenSheet } from '@/components/sheets/EinnahmenSheet';

const VALID_TYPES = ['privat', 'ustva', 'euer', 'getbacks', 'einnahmen'] as const;
type SheetType = (typeof VALID_TYPES)[number];

const TITLES: Record<SheetType, string> = {
  privat: 'Privat',
  ustva: 'UStVA',
  euer: 'EUeR',
  getbacks: 'GetBacks',
  einnahmen: 'Einnahmen',
};

export default async function SheetTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!VALID_TYPES.includes(type as SheetType)) redirect('/sheets');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  const sheetType = type as SheetType;

  /* ── Load data per type ─────────────────────────────────── */
  if (sheetType === 'privat') {
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, emoji, type')
      .eq('user_id', user.id)
      .eq('type', 'PRIVAT')
      .order('name');

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl mb-6">{TITLES[sheetType]}</h1>
        <PrivatSheet
          userId={user.id}
          categories={categories ?? []}
        />
      </div>
    );
  }

  if (sheetType === 'ustva') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl mb-6">{TITLES[sheetType]}</h1>
        <UstvaSheet userId={user.id} />
      </div>
    );
  }

  if (sheetType === 'euer') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl mb-6">{TITLES[sheetType]}</h1>
        <EuerSheet userId={user.id} />
      </div>
    );
  }

  if (sheetType === 'getbacks') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl mb-6">{TITLES[sheetType]}</h1>
        <GetbacksSheet userId={user.id} />
      </div>
    );
  }

  /* einnahmen */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl mb-6">{TITLES[sheetType]}</h1>
      <EinnahmenSheet userId={user.id} />
    </div>
  );
}
