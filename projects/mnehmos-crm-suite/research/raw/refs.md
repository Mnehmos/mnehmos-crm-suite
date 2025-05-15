---
title: Core Technologies Documentation References
task_id: 0.1
date: 2025-05-14
last_updated: 2025-05-14
status: FINAL
owner: deep-research-agent
---

# Core Technologies Documentation References

This document summarizes key findings and provides links to documentation for the core technologies used in the Mnehmos-CRM-Suite project, as of May 2025.

## Next.js

**Key Findings:**
Modern Next.js authentication best practices suggest moving away from middleware for certain auth flows, favoring authentication libraries and leveraging server components for secure server-side operations. Using libraries like NextAuth.js is recommended for increased security and simplicity.

**Relevant URLs:**
- [Next.js Authentication Best Practices in 2025](https://www.franciscomoretti.com/blog/modern-nextjs-authentication-best-practices)
- [App Router: Adding Authentication | Next.js](https://nextjs.org/learn/dashboard-app/adding-authentication)
- [Guides: Authentication | Next.js](https://nextjs.org/docs/app/guides/authentication)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Migrate to NextAuth.js v5](https://authjs.dev/getting-started/migrating-to-v5)

**Version/Compatibility Notes:**
- NextAuth.js v5 requires a minimum Next.js version of 14.0.

## Clerk

**Key Findings:**
As of January 10, 2025, support for the `@clerk/clerk-sdk-node` package has ended. Clerk is actively developing and releasing SDKs for various platforms and languages, including recent beta releases for Flutter and new SDKs for C# and Python. Developers should refer to the official SDK references for the most up-to-date integration methods.

**Relevant URLs:**
- [Clerk SDK References Overview](https://clerk.com/docs/references/overview)
- [End of Support for Node SDK](https://clerk.com/changelog/2025-01-10-node-sdk-eol)
- [Flutter SDK Public Beta Announcement](https://clerk.com/changelog/2025-03-26-flutter-sdk-beta)
- [C# Backend SDK Announcement](https://clerk.com/changelog/2025-01-09-csharp-sdk)
- [Python Backend SDK Announcement](https://dev.to/clerk/clerk-update-november-12-2024-2024-3h6b)

**Version/Compatibility Notes:**
- The `@clerk/clerk-sdk-node` is no longer supported. Migrate to recommended alternatives like `@clerk/express` for Express users.

## Supabase

**Key Findings:**
Supabase leverages PostgreSQL's Row Level Security (RLS) to secure data. RLS policies are the recommended way to control data access. Supabase Storage is designed to work seamlessly with RLS. RLS is a core feature and its documentation is not versioned by date in the same way as a full platform release.

**Relevant URLs:**
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage Access Control | Supabase Docs](https://supabase.com/docs/guides/storage/security/access-control)
- [RLS Performance and Best Practices | Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [RLS Simplified | Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rls-simplified-BJTcS8)
- [Authorization via Row Level Security | Supabase Features](https://supabase.com/features/row-level-security)

**Version/Compatibility Notes:**
- RLS is a fundamental feature of Supabase's PostgreSQL database. Ensure RLS is enabled for tables, especially when using the dashboard for creation.

## LemonSqueezy

**Key Findings:**
LemonSqueezy provides a REST API for integrating with their platform, which includes support for webhooks. Webhooks are used to send event data to external systems, enabling applications to react to events like license key creation or subscription changes. The official API documentation provides details on the webhook object and managing webhooks.

**Relevant URLs:**
- [Lemon Squeezy API Reference](https://docs.lemonsqueezy.com/api)
- [Sync With Webhooks Guide | Lemon Squeezy](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks)
- [The Webhook Object | Lemon Squeezy API Docs](https://docs.lemonsqueezy.com/api/webhooks)
- [Create a Webhook | Lemon Squeezy API Docs](https://docs.lemonsqueezy.com/api/webhooks/create-webhook)

**Version/Compatibility Notes:**
- Webhooks are part of the Lemon Squeezy REST API. Refer to the API documentation for the latest version details.

## Vercel

**Key Findings:**
Vercel supports monorepos and provides mechanisms for managing environment variables. Environment variables can be configured per project and are encrypted. Shared environment variables can be defined at the Team level and linked to multiple projects, which is particularly useful in monorepo setups with shared configurations. The Vercel CLI can also be used to manage environment variables.

**Relevant URLs:**
- [Environment variables | Vercel Docs](https://vercel.com/docs/environment-variables)
- [Using Monorepos | Vercel Docs](https://vercel.com/docs/monorepos)
- [Shared environment variables | Vercel Docs](https://vercel.com/docs/projects/environment-variables/shared-environment-variables)
- [vercel env CLI command | Vercel Docs](https://vercel.com/docs/cli/env)
- [Monorepos FAQ | Vercel Docs](https://vercel.com/docs/monorepos/monorepo-faq)

**Version/Compatibility Notes:**
- Vercel's environment variable management and monorepo support are features of the platform. Refer to the latest Vercel documentation for details.

## Community Builds Audit

This section details relevant community builds and example projects that utilize a technology stack similar to Mnehmos-CRM-Suite, providing insights into practical integration patterns.

- **Clerk/clerk-supabase-nextjs**
  - Repository: https://github.com/clerk/clerk-supabase-nextjs
  - Summary: This is the official companion repository for integrating Clerk authentication with Supabase in a Next.js application. It demonstrates how to set up user authentication and manage user data across both services, serving as a foundational example for combining these two key technologies.

- **Lemon Squeezy Next.js SaaS Billing Tutorial**
  - URL: https://docs.lemonsqueezy.com/guides/tutorials/nextjs-saas-billing
  - Summary: This guide focuses on building a billing portal for a SaaS application using Next.js and integrating it with Lemon Squeezy for payment processing. It provides a step-by-step approach to handling subscriptions and payments within a Next.js environment.

- **Makerkit: Using Lemon Squeezy instead of Stripe in your Next.js Supabase application**
  - URL: https://makerkit.dev/docs/next-supabase/how-to/payments/using-lemon-squeezy
  - Summary: This documentation explains how to integrate Lemon Squeezy payments into a Next.js application that uses Supabase for the backend. It offers specific guidance on setting up payment flows and managing subscription data when using this particular combination of technologies.

- **Vercel Supabase Starter**
  - Repository: https://vercel.com/templates/next.js/supabase
  - Summary: This is a template provided by Vercel for building Next.js applications with Supabase integration, specifically focusing on cookie-based authentication and deployment on the Vercel platform. It serves as a useful starting point for projects leveraging Next.js, Supabase, and Vercel.
---

## Clerk Integration Quickstart (Next.js App Router - for Phase 1)

The following steps are a quick reference for integrating Clerk into a Next.js (App Router) application, based on common setup procedures. This will be relevant during Phase 1 of the project.

1.  **Install @clerk/nextjs SDK:**
    ```terminal
    npm install @clerk/nextjs
    ```

2.  **Set your Clerk API keys in `.env.local` (created from `.env.local.template`):**
    ```env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c3Ryb25nLWdlY2tvLTk4LmNsZXJrLmFjY291bnRzLmRldiQ
    CLERK_SECRET_KEY=YOUR_ACTUAL_CLERK_SECRET_KEY_HERE
    ```

3.  **Update `middleware.ts`:**
    Create or update `middleware.ts` at the root of your project (or `src/` if using a src directory).
    ```typescript
    // middleware.ts
    import { clerkMiddleware } from '@clerk/nextjs/server';

    export default clerkMiddleware();

    export const config = {
      matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
      ],
    };
    ```

4.  **Add `ClerkProvider` to your app (`layout.tsx`):**
    Wrap your entire app at the entry point with `ClerkProvider`.
    ```tsx
    // src/app/layout.tsx (or app/layout.tsx)
    import { type Metadata } from 'next'
    import {
      ClerkProvider,
      SignInButton,
      SignUpButton,
      SignedIn,
      SignedOut,
      UserButton,
    } from '@clerk/nextjs'
    // import { Geist, Geist_Mono } from 'next/font/google' // Example font, adjust as needed
    import './globals.css'

    // const geistSans = Geist({ // Example font, adjust as needed
    //   variable: '--font-geist-sans',
    //   subsets: ['latin'],
    // })

    // const geistMono = Geist_Mono({ // Example font, adjust as needed
    //   variable: '--font-geist-mono',
    //   subsets: ['latin'],
    // })

    export const metadata: Metadata = {
      title: 'Mnehmos CRM Suite',
      description: 'CRM Suite built with Next.js and Clerk',
    }

    export default function RootLayout({
      children,
    }: Readonly<{
      children: React.ReactNode
    }>) {
      return (
        <ClerkProvider>
          <html lang="en">
            {/* <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}> Adjust font variables if needed */}
            <body>
              <header className="flex justify-end items-center p-4 gap-4 h-16">
                <SignedOut>
                  <SignInButton />
                  <SignUpButton />
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </header>
              <main>{children}</main>
            </body>
          </html>
        </ClerkProvider>
      )
    }
    ```

5.  **Run your project (in Phase 1):**
    ```terminal
    npm run dev
    ```
    Then visit `http://localhost:3000` to sign up your first user.