import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server'; // Removed getAuth
import { NextResponse } from 'next/server';
import { supabase } from './lib/supabase'; // Assuming supabase client is here
import type { User, EmailAddress } from '@clerk/nextjs/server';


const isPublicRoute = createRouteMatcher([
  '/', // Landing page is public
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
  '/api/webhooks/lemonsqueezy'
]);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)', // Dashboard and its sub-pages
  '/api/leads(.*)',   // Protect leads API too, though API route has its own check
  // Add other routes that require a purchase
]);

export default clerkMiddleware(async (auth, req) => {
  // If it's a public route, allow access immediately
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth(); // Added await here

  // If no userId, it means user is not authenticated, Clerk will handle redirect to sign-in
  if (!userId) {
    return NextResponse.next(); // Let Clerk's default protection handle it
  }

  // If it's a protected route, check for purchase status
  if (isProtectedRoute(req)) {
    let supabaseUserId: string | null = null;

    // 1. Try to find user by clerk_id in Supabase
    const { data: userByClerkId, error: userByClerkIdError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userByClerkId && !userByClerkIdError) {
      supabaseUserId = userByClerkId.id;
    } else {
      if (userByClerkIdError && userByClerkIdError.code !== 'PGRST116') {
        console.error('Middleware: Error querying user by clerk_id:', userByClerkIdError.message);
      }
      // 2. If not found by clerk_id, try to link by email
      try {
        const client = await clerkClient();
        const clerkUser: User = await client.users.getUser(userId);
        const primaryEmailAddress = clerkUser.emailAddresses.find((em: EmailAddress) => em.id === clerkUser.primaryEmailAddressId)?.emailAddress;

        if (primaryEmailAddress) {
          const { data: userByEmail, error: userByEmailError } = await supabase
            .from('users')
            .select('id, clerk_id')
            .eq('email', primaryEmailAddress)
            .single();

          if (userByEmailError && userByEmailError.code !== 'PGRST116') {
            console.error('Middleware: Error querying user by email:', userByEmailError.message);
          } else if (userByEmail) {
            if (userByEmail.clerk_id === null) {
              const { data: updatedUser, error: updateUserError } = await supabase
                .from('users')
                .update({ clerk_id: userId, updated_at: new Date().toISOString() })
                .eq('id', userByEmail.id)
                .select('id')
                .single();
              if (!updateUserError && updatedUser) {
                supabaseUserId = updatedUser.id;
              } else if (updateUserError) {
                console.error('Middleware: Error linking user by email:', updateUserError.message);
              }
            } else if (userByEmail.clerk_id === userId) {
              supabaseUserId = userByEmail.id; // Already linked
            }
          }
        }
      } catch (e: unknown) {
        console.error('Middleware: Error during Clerk user fetch or linking:', e instanceof Error ? e.message : String(e));
      }
    }

    if (!supabaseUserId) {
      // Could not identify a valid Supabase user for the Clerk user
      // This case might need specific handling, e.g., redirect to an error page or sign-in
      console.warn(`Middleware: Could not map Clerk user ${userId} to a Supabase user. Denying access to protected route.`);
      const signInUrl = new URL('/sign-in', req.url);
      return NextResponse.redirect(signInUrl); // Or redirect to landing
    }

    // Check for purchases
    const { count: purchaseCount, error: purchaseError } = await supabase
      .from('purchases')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', supabaseUserId);

    if (purchaseError) {
      console.error('Middleware: Error checking purchases for user ' + supabaseUserId + ':', purchaseError.message);
      // Decide how to handle - for now, let them pass but log error
      return NextResponse.next();
    }

    if (purchaseCount === 0) {
      // No purchases, redirect to landing page if accessing a protected route like /dashboard
      if (req.nextUrl.pathname.startsWith('/dashboard')) {
        console.log(`Middleware: User ${supabaseUserId} (Clerk: ${userId}) has no purchases. Redirecting from ${req.nextUrl.pathname} to /.`);
        const homeUrl = new URL('/', req.url);
        return NextResponse.redirect(homeUrl);
      }
    }
    // User has purchases or is accessing a non-dashboard protected route that doesn't require purchase (if any)
  }
  
  // For all other authenticated routes not explicitly public or purchase-protected dashboard
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};