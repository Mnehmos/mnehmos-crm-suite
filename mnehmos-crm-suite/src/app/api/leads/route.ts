import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Keep this

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) { // Use NextRequest, prefixed with _
  // It's important that cookies() is called within the Route Handler
  // and not at the module scope.
  const cookieStore = cookies(); 
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('API Leads: Session error:', sessionError.message);
      return NextResponse.json({ error: 'Session error: ' + sessionError.message }, { status: 500 });
    }

    if (!session) {
      console.error('API Leads: No session found. User is unauthorized.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // console.log('API Leads: Session retrieved for user:', session.user.id); // For debugging

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, company_name, email, status, last_contacted_at, source, notes, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('API Leads: Error fetching leads:', leadsError.message);
      return NextResponse.json({ error: 'Failed to fetch leads: ' + leadsError.message }, { status: 500 });
    }

    // console.log('API Leads: Fetched leads:', leads); // For debugging
    return NextResponse.json(leads, { status: 200 });

  } catch (e: unknown) { // Changed to unknown
    let errorMessage = 'An unknown error occurred';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    console.error('API Leads: Unexpected error in GET handler:', errorMessage, (e instanceof Error ? e.stack : 'No stack available'));
    return NextResponse.json({ error: 'Internal server error: ' + errorMessage }, { status: 500 });
  }
}