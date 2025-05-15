import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Adjusted path assuming supabase.ts is in src/lib

interface UserData {
  clerk_id: string;
  email: string;
  full_name?: string;
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

// Define the expected structure of the request body
interface RequestBody {
  type: 'user.created' | 'user.updated'; // Example webhook event types
  data: {
    id: string;
    email_addresses: { email_address: string; id: string; verification: ClerkEmailVerification | null }[];
    first_name?: string | null;
    last_name?: string | null;
    // Include other relevant fields from Clerk's user object or webhook payload
  };
  // Potentially other webhook metadata
}

export async function POST(request: Request) {
  try {
    // TODO: Implement webhook signature verification for security if exposed publicly
    // import { Webhook } from '@clerk/nextjs/server';
    // import { headers } from 'next/headers';
    // const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    // if (!WEBHOOK_SECRET) {
    //   throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
    // }
    // const headerPayload = headers();
    // const svix_id = headerPayload.get("svix-id");
    // const svix_timestamp = headerPayload.get("svix-timestamp");
    // const svix_signature = headerPayload.get("svix-signature");
    // if (!svix_id || !svix_timestamp || !svix_signature) {
    //   return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
    // }
    // const wh = new Webhook(WEBHOOK_SECRET);
    // let evt: WebhookEvent;
    // try {
    //   const payloadString = await request.text(); // Read the raw body
    //   evt = wh.verify(payloadString, {
    //     "svix-id": svix_id,
    //     "svix-timestamp": svix_timestamp,
    //     "svix-signature": svix_signature,
    //   }) as WebhookEvent;
    // } catch (err) {
    //   console.error('Error verifying webhook:', err);
    //   return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
    // }
    // const { id: clerk_id, email_addresses, first_name, last_name } = evt.data;
    // const email = email_addresses && email_addresses.length > 0 ? email_addresses[0].email_address : null;

    // For now, directly parse JSON assuming trusted source or internal call
    const body = await request.json() as RequestBody; // Or a simpler UserData if not a full webhook payload yet

    let userDataToUpsert: UserData;

    if (body.data && body.data.id) { // Assuming full webhook payload structure
        const clerkUserData = body.data;
        const email = clerkUserData.email_addresses && clerkUserData.email_addresses.length > 0 
                      ? clerkUserData.email_addresses[0].email_address 
                      : null;
        
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        let fullName;
        if (clerkUserData.first_name && clerkUserData.last_name) {
            fullName = `${clerkUserData.first_name} ${clerkUserData.last_name}`;
        } else if (clerkUserData.first_name) {
            fullName = clerkUserData.first_name;
        } else if (clerkUserData.last_name) {
            fullName = clerkUserData.last_name;
        }

        userDataToUpsert = {
            clerk_id: clerkUserData.id,
            email: email,
            full_name: fullName,
        };
    } else if ((body as unknown as UserData).clerk_id && (body as unknown as UserData).email) { // Assuming direct UserData payload
        userDataToUpsert = body as unknown as UserData;
    } else {
        return NextResponse.json({ error: 'Invalid payload structure. Provide Clerk user data or webhook payload.' }, { status: 400 });
    }
    
    if (!userDataToUpsert.clerk_id || !userDataToUpsert.email) {
      return NextResponse.json({ error: 'clerk_id and email are required' }, { status: 400 });
    }

    const { data, error } = await supabase
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

    return NextResponse.json({ message: 'User data synchronized successfully', data }, { status: 200 });
  } catch (error) {
    console.error('API route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}