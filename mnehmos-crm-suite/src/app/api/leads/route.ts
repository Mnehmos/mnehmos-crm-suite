import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { getAuth, clerkClient } from '@clerk/nextjs/server';
import type { User, EmailAddress } from '@clerk/nextjs/server'; // Import User and EmailAddress types

export const dynamic = 'force-dynamic'; // Keep this

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    console.log('API Leads: Clerk userId from getAuth():', userId);
    
    if (!userId) {
      console.error('API Leads: No Clerk user ID found. User is unauthorized.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let supabaseUserId: string | null = null;

    // 1. Try to find user by clerk_id
    const { data: userByClerkId, error: userByClerkIdError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userByClerkId && !userByClerkIdError) {
      supabaseUserId = userByClerkId.id;
      console.log('API Leads: Found user in Supabase by clerk_id:', supabaseUserId);
    } else {
      // Log the specific error if it's not just "no rows"
      if (userByClerkIdError && userByClerkIdError.code !== 'PGRST116') { // PGRST116 is "No rows found"
        console.error('API Leads: Error querying user by clerk_id:', userByClerkIdError.message);
        // Decide if this is a hard error or if we should proceed to link by email
      }
      
      console.log('API Leads: User not found by clerk_id. Attempting to link by email.');
      // 2. If not found by clerk_id, try to get Clerk user's email and link
      try {
        const client = await clerkClient(); // Call clerkClient as a function
        const clerkUser: User = await client.users.getUser(userId);
        const primaryEmailAddress = clerkUser.emailAddresses.find((em: EmailAddress) => em.id === clerkUser.primaryEmailAddressId)?.emailAddress;

        if (primaryEmailAddress) {
          console.log('API Leads: Clerk user primary email:', primaryEmailAddress);
          // Find user in Supabase by email where clerk_id is NULL
          const { data: userByEmail, error: userByEmailError } = await supabase
            .from('users')
            .select('id, clerk_id')
            .eq('email', primaryEmailAddress)
            .single(); // Use single to ensure we are targeting a unique record or one that needs linking

          if (userByEmailError && userByEmailError.code !== 'PGRST116') {
            console.error('API Leads: Error querying user by email:', userByEmailError.message);
          } else if (userByEmail) {
            if (userByEmail.clerk_id === null) {
              console.log(`API Leads: Found user by email (${primaryEmailAddress}) with NULL clerk_id. Linking account.`);
              // Update Supabase user with the clerk_id
              const { data: updatedUser, error: updateUserError } = await supabase
                .from('users')
                .update({ clerk_id: userId, updated_at: new Date().toISOString() })
                .eq('id', userByEmail.id)
                .select('id')
                .single();
              
              if (updateUserError) {
                console.error('API Leads: Error updating user with clerk_id:', updateUserError.message);
                // Not a fatal error for this request, but needs monitoring/logging
              } else if (updatedUser) {
                supabaseUserId = updatedUser.id;
                console.log('API Leads: Successfully linked Supabase user and Clerk user. Supabase user_id:', supabaseUserId);
              }
            } else if (userByEmail.clerk_id === userId) {
              // Already linked, this is fine
              supabaseUserId = userByEmail.id;
              console.log('API Leads: Account already linked for email and clerk_id. Supabase user_id:', supabaseUserId);
            } else {
              // Email exists but is linked to a DIFFERENT clerk_id. This is a conflict.
              console.error(`API Leads: Conflict: Email ${primaryEmailAddress} in Supabase is linked to a different clerk_id (${userByEmail.clerk_id}) than current (${userId}).`);
              // For now, we won't grant access if there's a conflict with an existing, different link.
            }
          } else {
            console.log(`API Leads: No user found in Supabase with email ${primaryEmailAddress} to link.`);
            // Optional: Create a new user in Supabase if that's the desired flow
            // For now, if no link can be made, and no user by clerk_id, access will be denied.
          }
        } else {
          console.error('API Leads: Could not retrieve primary email for Clerk user:', userId);
        }
      } catch (clerkError: unknown) { // Changed 'any' to 'unknown'
        console.error('API Leads: Error fetching Clerk user details:', clerkError instanceof Error ? clerkError.message : String(clerkError));
      }
    }
    
    // If after all attempts, supabaseUserId is still null, then user is not found/linked
    if (!supabaseUserId) {
      console.error('API Leads: User could not be identified or linked in Supabase. Clerk ID:', userId);
      return NextResponse.json({ error: 'User not found or cannot be linked in database' }, { status: 404 });
    }
    
    // Check for purchases before fetching leads
    console.log('API Leads: Checking purchases for Supabase user_id:', supabaseUserId);
    const { error: purchaseError, count: purchaseCount } = await supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true }) // Efficiently check for existence
      .eq('user_id', supabaseUserId);

    if (purchaseError) {
      console.error('API Leads: Error checking purchases for user ' + supabaseUserId + ':', purchaseError.message);
      return NextResponse.json({ error: 'Error verifying user status: ' + purchaseError.message }, { status: 500 });
    }

    if (purchaseCount === 0) {
      console.log('API Leads: No purchases found for user ' + supabaseUserId + '. Access denied to leads.');
      return NextResponse.json({ error: 'Access Denied. This feature requires a purchase.' }, { status: 403 });
    }

    console.log('API Leads: User ' + supabaseUserId + ' has purchases. Proceeding to fetch leads.');
    
    // Fetch leads for the identified and verified (paid) Supabase user
    console.log('API Leads: Attempting to fetch leads for Supabase user_id:', supabaseUserId);
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, company_name, email, status, last_contacted_at, source, notes, created_at')
      .eq('user_id', supabaseUserId) // Corrected userData.id to supabaseUserId
      .order('created_at', { ascending: false });

    if (leadsError) {
      // Added supabaseUserId to the error log for better context
      console.error('API Leads: Error fetching leads for supabaseUserId ' + supabaseUserId + ':', leadsError.message);
      return NextResponse.json({ error: 'Failed to fetch leads: ' + leadsError.message }, { status: 500 });
    }
    
    console.log('API Leads: Successfully fetched leads, count:', leads?.length || 0);

    return NextResponse.json(leads, { status: 200 });

  } catch (e: unknown) {
    let errorMessage = 'An unknown error occurred';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    console.error('API Leads: Unexpected error in GET handler:', errorMessage, (e instanceof Error ? e.stack : 'No stack available'));
    return NextResponse.json({ error: 'Internal server error: ' + errorMessage }, { status: 500 });
  }
}

// POST endpoint for creating leads
export async function POST(request: NextRequest) {
  try {
    // Get the Clerk session
    const { userId } = getAuth(request);
    
    if (!userId) {
      console.error('API Leads POST: No Clerk user ID found. User is unauthorized.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Look up the user in Supabase by clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();
      
    if (userError) {
      console.error('API Leads POST: Error finding user:', userError.message);
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    if (!userData) {
      console.error('API Leads POST: User not found in Supabase.');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { 
      name, 
      company_name, 
      email, 
      status, 
      source, 
      notes,
      phone
    } = requestBody;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Prepare lead data
    const leadData = {
      user_id: userData.id,
      name,
      company_name: company_name || null,
      email: email || null,
      status: status || 'Leads', // Default status
      source: source || null,
      notes: notes || null,
      phone: phone || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert lead into Supabase
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();
    
    if (insertError) {
      console.error('API Leads POST: Error creating lead:', insertError.message);
      return NextResponse.json({ error: 'Failed to create lead: ' + insertError.message }, { status: 500 });
    }
    
    return NextResponse.json(newLead, { status: 201 });
    
  } catch (e: unknown) {
    let errorMessage = 'An unknown error occurred';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    console.error('API Leads: Unexpected error in POST handler:', errorMessage, (e instanceof Error ? e.stack : 'No stack available'));
    return NextResponse.json({ error: 'Internal server error: ' + errorMessage }, { status: 500 });
  }
}