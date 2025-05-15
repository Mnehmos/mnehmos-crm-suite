import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Define the structure of the LemonSqueezy webhook payload (simplified)
// Based on: https://docs.lemonsqueezy.com/api/webhooks#event-types
// And the fields requested in the task
interface LemonSqueezyOrderItem {
  product_id: number;
  product_name: string;
  variant_id: number;
  variant_name: string;
  price: number; // Price of the item in cents
  // ... other order item fields
}

interface LemonSqueezyWebhookAttributes {
  store_id: number;
  customer_id: number;
  order_number?: number; // Used for order_id
  user_name: string | null;
  user_email: string | null;
  currency: string;
  currency_rate: string;
  tax_name: string | null;
  tax_rate: string | null;
  subtotal: number; // In cents
  discount_total: number; // In cents
  tax: number; // In cents
  total: number; // In cents, used for total_amount
  status: string; // e.g., "paid", "pending", "failed"
  receipt_url: string | null;
  updated_at: string;
  created_at: string;
  first_order_item?: LemonSqueezyOrderItem; // For product_name
  // ... other attributes
}

interface LemonSqueezyWebhookData {
  type: string; // e.g., "orders"
  id: string; // Webhook event ID, or potentially order ID if order_number is not present
  attributes: LemonSqueezyWebhookAttributes;
  relationships: Record<string, unknown>;
  // ... other data fields
}

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string; // e.g., "order_created", "subscription_payment_success"
    webhook_id: string;
    // ... other meta fields
  };
  data: LemonSqueezyWebhookData;
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const randomId = crypto.randomBytes(4).toString('hex');
  console.log(`LemonSqueezy webhook received request [${timestamp}/${randomId}]`);
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not set in .env.local');
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const rawBody = await request.text();
  console.log("LemonSqueezy webhook raw body (snippet):", rawBody.substring(0, 200)); // Log a snippet
  const signature = request.headers.get('X-Signature');

  if (!signature) {
    console.warn('Missing X-Signature header from LemonSqueezy webhook');
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 });
  }

  // Verify the signature
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
  const receivedSignature = Buffer.from(signature, 'utf8');

  if (!crypto.timingSafeEqual(digest, receivedSignature)) {
    console.warn(`Invalid LemonSqueezy webhook signature. Request ID: [${timestamp}/${randomId}]`);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }
  console.log(`LemonSqueezy webhook signature verification successful. Request ID: [${timestamp}/${randomId}]`);

  let payload: LemonSqueezyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;
  } catch (error) {
    console.error(`Failed to parse LemonSqueezy webhook payload. Request ID: [${timestamp}/${randomId}]:`, error, (error as Error).stack);
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const eventName = payload.meta.event_name;
  const eventData = payload.data;

  // Process relevant events, primarily focusing on order creation or successful payment.
  // The task specifically mentions 'order_created'.
  // LemonSqueezy might also use events like 'subscription_payment_success' or similar for recurring payments.
  if (eventName === 'order_created' || eventName === 'subscription_payment_success') {
    try {
      const attributes = eventData.attributes;

      // Extract necessary data
      // Prioritize order_number, fallback to data.id for order_id
      const orderId = attributes.order_number?.toString() ?? eventData.id;
      const userEmail = attributes.user_email;
      const productName = attributes.first_order_item?.product_name ?? 'N/A';
      const totalAmount = attributes.total; // In cents
      const currency = attributes.currency;
      const status = attributes.status;

      if (!userEmail) {
        console.warn(`Webhook event ${eventName} (Order ID: ${orderId}) missing user_email. Request ID: [${timestamp}/${randomId}]`);
        // Acknowledge to LemonSqueezy to prevent retries, but log the issue.
        return NextResponse.json({ message: 'Webhook received, but user_email missing.' }, { status: 200 });
      }

      // Find the corresponding user_id in our public.users table or create a new user
      let userId: string | null = null;
      const userName = attributes.user_name; // Extract user_name

      try {
        console.log(`Attempting to find user by email: ${userEmail}. Request ID: [${timestamp}/${randomId}]`);
        const { data: existingUserData, error: fetchUserError } = await supabase
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .single();
        console.log(`Result of finding user by email ${userEmail}: Data: ${JSON.stringify(existingUserData)}, Error: ${JSON.stringify(fetchUserError)}. Request ID: [${timestamp}/${randomId}]`);

        if (fetchUserError && fetchUserError.code !== 'PGRST116') { // PGRST116: "Fetched result not found" (expected if user doesn't exist)
          console.error(`Error fetching user by email ${userEmail}. Request ID: [${timestamp}/${randomId}]:`, fetchUserError, fetchUserError.stack);
          return NextResponse.json({ error: 'Database error fetching user.' }, { status: 500 });
        }

        if (existingUserData) {
          userId = existingUserData.id;
          console.log(`User found with email ${userEmail}, ID: ${userId}. Request ID: [${timestamp}/${randomId}]`);
        } else {
          // User not found, create a new one
          console.log(`User with email ${userEmail} not found. Attempting to create new user. Request ID: [${timestamp}/${randomId}]`);
          const newUser = {
            email: userEmail,
            full_name: userName, // Use user_name from payload
            clerk_id: null, // Clerk ID will be null as this user is created via webhook
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          console.log(`New user data for creation: ${JSON.stringify(newUser)}. Request ID: [${timestamp}/${randomId}]`);
          const { data: newUserData, error: createUserError } = await supabase
            .from('users')
            .insert(newUser)
            .select('id')
            .single();

          if (createUserError) {
            console.error(`Error creating user with email ${userEmail}. Request ID: [${timestamp}/${randomId}]:`, createUserError, createUserError.stack);
            return NextResponse.json({ error: 'Database error creating user.' }, { status: 500 });
          }

          if (newUserData) {
            userId = newUserData.id;
            console.log(`Successfully created user with email ${userEmail}, ID: ${userId}. Request ID: [${timestamp}/${randomId}]`);
          } else {
            // This case should ideally not happen if insert was successful and returned data
            console.error(`Failed to retrieve ID for newly created user ${userEmail}. createUserError was ${JSON.stringify(createUserError)}. newUserData was ${JSON.stringify(newUserData)}. Request ID: [${timestamp}/${randomId}]`);
            return NextResponse.json({ error: 'Failed to retrieve new user ID.' }, { status: 500 });
          }
        }
      } catch (dbError) {
        console.error(`Database operation error for user ${userEmail}. Request ID: [${timestamp}/${randomId}]:`, dbError, (dbError as Error).stack);
        return NextResponse.json({ error: 'Database operation failed.' }, { status: 500 });
      }


      if (!userId) {
        // This should ideally not be reached if user creation/fetching is handled correctly
        console.error(`Critical: Could not obtain user ID for ${userEmail} for order ${orderId}. Request ID: [${timestamp}/${randomId}]`);
        return NextResponse.json({ error: 'Failed to obtain user ID for purchase.' }, { status: 500 });
      }

      // Insert a new record into the public.purchases table
      const purchaseData = {
        lemonsqueezy_order_id: orderId,
        user_id: userId, // Now this should always be populated
        user_email: userEmail,
        product_name: productName,
        total_amount: totalAmount, // Storing as cents
        currency: currency,
        status: status,
        raw_payload: payload, // Store the full payload for auditing
      };
      console.log(`Attempting to insert into purchases table. Data: ${JSON.stringify(purchaseData)}. Request ID: [${timestamp}/${randomId}]`);

      const { error: insertError } = await supabase.from('purchases').insert(purchaseData);
      console.log(`Result of inserting into purchases table. Error: ${JSON.stringify(insertError)}. Request ID: [${timestamp}/${randomId}]`);

      if (insertError) {
        console.error(`Error inserting purchase for order ${orderId}. Request ID: [${timestamp}/${randomId}]:`, insertError, insertError.stack);
        // The original error message from the task description
        return NextResponse.json({ error: 'Database error inserting purchase.' }, { status: 500 });
      }

      console.log(`Successfully processed ${eventName} for order ${orderId}, user_email: ${userEmail}. Request ID: [${timestamp}/${randomId}]`);
      console.log(`Successfully processed LemonSqueezy webhook. Request ID: [${timestamp}/${randomId}]`);
      return NextResponse.json({ message: 'Webhook processed successfully.' }, { status: 200 });

    } catch (error) {
      console.error(`Error processing ${eventName} webhook. Request ID: [${timestamp}/${randomId}]:`, error, (error as Error).stack);
      return NextResponse.json({ error: 'Error processing webhook.' }, { status: 500 });
    }
  } else {
    // Acknowledge other events if necessary, or just log them
    console.log(`Received unhandled LemonSqueezy event: ${eventName}. Request ID: [${timestamp}/${randomId}]`);
    return NextResponse.json({ message: 'Webhook received, event not processed.' }, { status: 200 });
  }
}