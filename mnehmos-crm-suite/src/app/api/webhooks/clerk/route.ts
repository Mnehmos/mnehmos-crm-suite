import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Adjusted path assuming supabase.ts is in src/lib
import { Webhook } from 'svix'; // Import Webhook from svix
import type { WebhookEvent } from '@clerk/nextjs/server'; // Import WebhookEvent type from Clerk
import { headers } from 'next/headers'; // Import headers

interface UserData {
  clerk_id: string;
  email: string;
  full_name?: string | null; // Allow null for full_name
  // Add other fields from Clerk user object as needed
  // e.g., first_name?: string; last_name?: string; image_url?: string;
}

interface ClerkEmailVerification {
  status: 'unverified' | 'verified' | 'failed' | 'expired' | 'transferable' | string; // string for flexibility
  strategy: string | null;
  attempts: number | null;
  expire_at: number | null; // Clerk uses Unix timestamp (milliseconds)
  // Add other potential fields if known, or keep it minimal
}

// Define the expected structure of the webhook event data for user.created/user.updated
interface ClerkEventData {
  id: string;
  email_addresses: { email_address: string; id: string; verification: ClerkEmailVerification | null }[];
  first_name?: string | null;
  last_name?: string | null;
  // Include other relevant fields from Clerk's user object or webhook payload
}

export async function POST(request: Request) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      console.error('CLERK_WEBHOOK_SECRET not found in environment variables.');
      // It's crucial to return an error here if the secret is not configured.
      return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are missing headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
    }

    // Create a new Webhook instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    // Get the body as text
    const payloadString = await request.text();

    // Verify the payload with the headers and the secret
    try {
      evt = wh.verify(payloadString, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err: unknown) { // Catching as 'unknown' and checking type is safer
      let errorMessage = 'An unknown error occurred during webhook verification.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      console.error('Error verifying webhook:', errorMessage);
      // Return a 401 Unauthorized response on verification failure
      return NextResponse.json({ error: 'Webhook verification failed', details: errorMessage }, { status: 401 });
    }

    // At this point, the webhook is verified.
    // Process the event based on its type
    const { data } = evt; // Removed 'type' from destructuring as it's not used
    const clerkEventData = data as ClerkEventData; // Cast data to the specific interface

    // Ensure we have the necessary data from the event
    if (!clerkEventData || !clerkEventData.id) {
        console.error('Invalid event data structure after verification:', clerkEventData);
        return NextResponse.json({ error: 'Invalid event data structure.' }, { status: 400 });
    }

    // Extract email and full name
    const emailValue = clerkEventData.email_addresses && clerkEventData.email_addresses.length > 0
                  ? clerkEventData.email_addresses[0].email_address
                  : null;

    if (!emailValue) { // Check if email is present
        return NextResponse.json({ error: 'Email is required in event data' }, { status: 400 });
    }

    let fullNameValue: string | null | undefined; // Allow null or undefined
    if (clerkEventData.first_name && clerkEventData.last_name) {
        fullNameValue = `${clerkEventData.first_name} ${clerkEventData.last_name}`;
    } else if (clerkEventData.first_name) {
        fullNameValue = clerkEventData.first_name;
    } else if (clerkEventData.last_name) {
        fullNameValue = clerkEventData.last_name;
    } else {
        fullNameValue = null; // Explicitly set to null if no name parts are present
    }

    // Prepare data for Supabase upsert
    const userDataToUpsert: UserData = {
        clerk_id: clerkEventData.id,
        email: emailValue,
        full_name: fullNameValue,
    };

    // Perform Supabase upsert
    const { data: upsertedUser, error } = await supabase
      .from('users')
      .upsert(
        {
          clerk_id: userDataToUpsert.clerk_id,
          email: userDataToUpsert.email,
          full_name: userDataToUpsert.full_name,
          updated_at: new Date().toISOString(),
          // created_at will be set by default value or on insert by Supabase if not provided
        },
        {
          onConflict: 'clerk_id', // Specify the conflict target
        }
      )
      .select(); // Optionally select the upserted/updated record

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: 'Failed to upsert user data', details: error.message }, { status: 500 });
    }

    // Return success response
    return NextResponse.json({ message: 'User data synchronized successfully', data: upsertedUser }, { status: 200 });

  } catch (error: unknown) { // Catching as 'unknown' for the main catch block
    console.error('API route error:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}