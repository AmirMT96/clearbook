import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPin, verifyPin } from '@/lib/pin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const body = await request.json();
    const { action, pin, oldPin } = body as {
      action: 'setup' | 'verify' | 'change';
      pin: string;
      oldPin?: string;
    };

    if (!action || !pin) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    // Fetch current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', user.id)
      .maybeSingle();

    switch (action) {
      case 'setup': {
        if (profile?.pin_hash) {
          return NextResponse.json({ error: 'PIN bereits eingerichtet' }, { status: 400 });
        }
        const hashed = hashPin(pin);
        const { error } = await supabase
          .from('profiles')
          .update({ pin_hash: hashed })
          .eq('id', user.id);

        if (error) {
          return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'verify': {
        if (!profile?.pin_hash) {
          return NextResponse.json({ error: 'Kein PIN eingerichtet' }, { status: 400 });
        }
        const valid = verifyPin(pin, profile.pin_hash);
        return NextResponse.json({ valid });
      }

      case 'change': {
        if (!profile?.pin_hash) {
          return NextResponse.json({ error: 'Kein PIN eingerichtet' }, { status: 400 });
        }
        if (!oldPin) {
          return NextResponse.json({ error: 'Alter PIN erforderlich' }, { status: 400 });
        }
        if (!verifyPin(oldPin, profile.pin_hash)) {
          return NextResponse.json({ valid: false, error: 'Alter PIN falsch' }, { status: 403 });
        }
        const newHash = hashPin(pin);
        const { error } = await supabase
          .from('profiles')
          .update({ pin_hash: newHash })
          .eq('id', user.id);

        if (error) {
          return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
