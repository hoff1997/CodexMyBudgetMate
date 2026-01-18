# My Budget Mate - Waitlist System Implementation

## Overview

Implement a waitlist system for My Budget Mate while the app is in pre-launch. The waitlist should feature Remy (the mascot) prominently and use her warm, encouraging Kiwi voice throughout.

**Important:** Remy is referred to as "she/her" in this implementation.

---

## MANDATORY: Read Before Starting

1. **Read `/docs/ARCHITECTURE.md`** - Understand the project structure
2. **Read `STYLE_GUIDE.md`** - Follow the color system exactly
3. **Read `CLAUDE.md`** - Follow established patterns

Confirm: "I have reviewed the docs and will follow established patterns."

---

## Remy's Voice Guidelines

Remy is a friendly Kiwi coach. Her voice is:
- **Warm and encouraging** - Never judgmental
- **Kiwi English** - Uses "sorted", "no worries", "stoked", "cuppa", "mate", "legend"
- **Direct and practical** - Gets to the point
- **Calm and reassuring** - Reduces anxiety, never creates urgency
- **Coaching mindset** - Asks questions, empowers users

### Banned Phrases (NEVER USE)
- "Every dollar has a job" (YNAB trademark)
- "Baby steps" (Dave Ramsey trademark)
- "Zero-based budgeting" (too technical)
- Generic corporate language
- Directive language like "You should...", "You must...", "You need to..."

### Good Remy Phrases
- "You've got this!"
- "Let's get you sorted"
- "No stress - we'll figure this out together"
- "Grab a cuppa while you wait"
- "You're going to love this"
- "Sweet as!"
- "Legend!"

---

## Design System

### Colors (from STYLE_GUIDE.md)

```css
/* Sage - Primary/Positive */
--sage: #7A9E9A;
--sage-dark: #5A7E7A;
--sage-light: #B8D4D0;
--sage-very-light: #E2EEEC;

/* Blue - Info */
--blue: #6B9ECE;
--blue-light: #DDEAF5;

/* Silver - UI Structure */
--silver: #9CA3AF;
--silver-light: #E5E7EB;
--silver-very-light: #F3F4F6;

/* Gold - Celebration */
--gold: #D4A853;
--gold-light: #F5E6C4;

/* Text */
--text-dark: #3D3D3D;
--text-medium: #6B6B6B;
--text-light: #9CA3AF;
```

### Tailwind Classes
```
Primary button: bg-sage hover:bg-sage-dark text-white
Secondary button: bg-white border border-sage text-sage-dark hover:bg-sage-very-light
Remy tip background: bg-sage-very-light border border-sage-light
Success state: bg-sage-very-light border-sage-light text-sage-dark
```

---

## Remy Images

Use these existing images:

| Image | Path | Usage |
|-------|------|-------|
| Full size Remy | `/public/Images/remy-fullsize.png` | Hero sections, large displays |
| Welcome Remy | `/public/Images/remy-welcome.png` | Waitlist confirmation, greetings |
| Encouraging Remy | `/public/Images/remy-encouraging.png` | Tips, form areas |
| Celebrating Remy | `/public/Images/remy-celebrating.png` | Success states |

**Note:** Images are in `/public/Images/` (capital I)

---

## Implementation Tasks

### Task 1: Database Schema

Create the waitlist table in Supabase.

**File:** Run in Supabase SQL Editor (or create migration)

```sql
-- Waitlist table for collecting pre-launch signups
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'website',
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  notes TEXT,
  CONSTRAINT waitlist_email_unique UNIQUE (email)
);

-- Index for faster lookups
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_created ON waitlist(created_at DESC);

-- RLS Policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can join the waitlist (public insert)
CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT 
  WITH CHECK (true);

-- Only authenticated users can view waitlist (admin only)
CREATE POLICY "Authenticated users can view waitlist" ON waitlist
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only authenticated users can update (for marking conversions)
CREATE POLICY "Authenticated users can update waitlist" ON waitlist
  FOR UPDATE 
  USING (auth.role() = 'authenticated');
```

---

### Task 2: API Route

**File:** `app/api/waitlist/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service role for public inserts (bypasses RLS for insert)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, source = 'website', referredBy } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Generate a simple referral code for this user
    const referralCode = `MBM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Insert into waitlist
    const { data, error } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
        source,
        referral_code: referralCode,
        referred_by: referredBy || null,
      })
      .select('id, referral_code')
      .single();

    if (error) {
      // Handle duplicate email
      if (error.code === '23505') {
        // Fetch existing referral code
        const { data: existing } = await supabase
          .from('waitlist')
          .select('referral_code')
          .eq('email', email.toLowerCase().trim())
          .single();

        return NextResponse.json({
          success: true,
          alreadyExists: true,
          message: "You're already on the list - we'll be in touch soon!",
          referralCode: existing?.referral_code,
        });
      }

      console.error('Waitlist insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You're in! We'll email you when we launch.",
      referralCode: data.referral_code,
    });

  } catch (err) {
    console.error('Waitlist API error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

// GET endpoint to check waitlist count (public info)
export async function GET() {
  try {
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({
      count: count || 0,
    });
  } catch (err) {
    console.error('Waitlist count error:', err);
    return NextResponse.json({ count: 0 });
  }
}
```

---

### Task 3: Waitlist Form Component

**File:** `components/marketing/waitlist-form.tsx`

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface WaitlistFormProps {
  source?: string;
  showName?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'hero';
}

export function WaitlistForm({ 
  source = 'website', 
  showName = false,
  className = '',
  variant = 'default'
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, source }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setReferralCode(data.referralCode || '');
        setEmail('');
        setName('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Give it another go?');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Give it another go?');
    }
  };

  // Success state with Remy celebrating
  if (status === 'success') {
    return (
      <div className={`rounded-2xl bg-sage-very-light border border-sage-light p-6 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image
              src="/Images/remy-celebrating.png"
              alt="Remy celebrating"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-sage" />
              <h3 className="font-semibold text-text-dark">You legend!</h3>
            </div>
            <p className="text-sage-dark text-sm mb-3">{message}</p>
            <p className="text-text-medium text-sm">
              Grab a cuppa and relax - we'll send you an email as soon as we're ready for you.
            </p>
            {referralCode && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-sage-light">
                <p className="text-xs text-text-medium mb-1">Your referral code:</p>
                <p className="font-mono font-semibold text-sage-dark">{referralCode}</p>
                <p className="text-xs text-text-light mt-1">Share this with mates to move up the list!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact variant (for footer, sidebar)
  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-2 ${className}`}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === 'loading'}
          className="flex-1 px-4 py-2.5 rounded-lg border border-silver-light focus:border-sage focus:ring-1 focus:ring-sage outline-none text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-5 py-2.5 bg-sage hover:bg-sage-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm whitespace-nowrap"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Joining...
            </>
          ) : (
            'Join Waitlist'
          )}
        </button>
        {status === 'error' && (
          <p className="text-sm text-blue flex items-center gap-1 sm:col-span-2">
            <AlertCircle className="w-4 h-4" />
            {message}
          </p>
        )}
      </form>
    );
  }

  // Default and hero variants
  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {showName && (
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status === 'loading'}
            className="w-full px-4 py-3 rounded-xl border border-silver-light focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none disabled:opacity-50"
          />
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={status === 'loading'}
            className="flex-1 px-4 py-3 rounded-xl border border-silver-light focus:border-sage focus:ring-2 focus:ring-sage/20 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className={`px-6 py-3 bg-sage hover:bg-sage-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap ${
              variant === 'hero' ? 'text-lg px-8' : ''
            }`}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              'Join the Waitlist'
            )}
          </button>
        </div>
        {status === 'error' && (
          <div className="flex items-center gap-2 text-blue text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{message}</p>
          </div>
        )}
      </form>
      <p className="text-text-light text-sm mt-3">
        No spam, promise. Just a heads up when we're ready for you.
      </p>
    </div>
  );
}
```

---

### Task 4: Waitlist Hero Section

**File:** `components/marketing/waitlist-hero.tsx`

```tsx
'use client';

import Image from 'next/image';
import { WaitlistForm } from './waitlist-form';

interface WaitlistHeroProps {
  waitlistCount?: number;
}

export function WaitlistHero({ waitlistCount = 0 }: WaitlistHeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage-very-light via-white to-blue-light opacity-50" />
      
      <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-center md:text-left">
            {/* Coming soon badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold-light border border-gold rounded-full mb-6">
              <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gold-dark">Coming Soon</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-dark mb-6 leading-tight">
              Finally, budgeting
              <span className="text-sage"> built for Kiwis</span>
            </h1>

            <p className="text-lg md:text-xl text-text-medium mb-8 leading-relaxed">
              Fortnightly pay? Sorted. NZ bank connections? Sweet as. 
              A budgeting app that actually gets how we do money in Aotearoa.
            </p>

            {/* Remy's intro */}
            <div className="flex items-start gap-4 p-4 bg-sage-very-light border border-sage-light rounded-2xl mb-8">
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src="/Images/remy-encouraging.png"
                  alt="Remy"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-sage-dark text-sm leading-relaxed">
                  "Hey! I'm Remy, your financial coach. I'm putting the finishing touches on 
                  something special for you. Pop your email in and I'll give you a shout when we're ready!"
                </p>
                <p className="text-sage text-xs mt-1 italic">- Remy</p>
              </div>
            </div>

            {/* Waitlist form */}
            <WaitlistForm source="hero" variant="hero" />

            {/* Social proof */}
            {waitlistCount > 10 && (
              <p className="text-text-medium text-sm mt-4">
                <span className="font-semibold text-sage-dark">{waitlistCount.toLocaleString()}</span> Kiwis already on the waitlist
              </p>
            )}
          </div>

          {/* Right: Remy illustration */}
          <div className="relative hidden md:block">
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Decorative circles */}
              <div className="absolute top-10 right-10 w-32 h-32 bg-sage-light rounded-full opacity-30" />
              <div className="absolute bottom-20 left-10 w-24 h-24 bg-blue-light rounded-full opacity-40" />
              <div className="absolute top-1/2 right-0 w-16 h-16 bg-gold-light rounded-full opacity-50" />
              
              {/* Remy */}
              <div className="relative z-10 w-full h-full">
                <Image
                  src="/Images/remy-fullsize.png"
                  alt="Remy - Your financial coach"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

### Task 5: Feature Preview Section

**File:** `components/marketing/waitlist-features.tsx`

```tsx
import { 
  Building2, 
  CalendarClock, 
  PiggyBank, 
  TrendingDown, 
  Bell, 
  Heart 
} from 'lucide-react';

const features = [
  {
    icon: Building2,
    title: 'NZ Bank Sync',
    description: 'Connect your Kiwi bank accounts directly. No more manual entry.',
  },
  {
    icon: CalendarClock,
    title: 'Fortnightly Pay Support',
    description: 'Built for how we actually get paid in New Zealand.',
  },
  {
    icon: PiggyBank,
    title: 'Envelope Budgeting',
    description: 'Give every dollar a purpose. See exactly where your money goes.',
  },
  {
    icon: TrendingDown,
    title: 'Debt Snowball',
    description: 'Crush your debt with a proven method that actually works.',
  },
  {
    icon: Bell,
    title: 'Bill Reminders',
    description: 'Never miss a payment. Know exactly what\'s coming up.',
  },
  {
    icon: Heart,
    title: 'Coaching, Not Lecturing',
    description: 'Remy guides you without judgment. Your pace, your journey.',
  },
];

export function WaitlistFeatures() {
  return (
    <section className="py-16 md:py-24 bg-silver-very-light">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-text-dark mb-4">
            What's coming your way
          </h2>
          <p className="text-lg text-text-medium max-w-2xl mx-auto">
            We're building the budgeting app New Zealand deserves. Here's a sneak peek.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 border border-silver-light hover:border-sage-light hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 bg-sage-very-light rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-sage" />
              </div>
              <h3 className="font-semibold text-text-dark mb-2">{feature.title}</h3>
              <p className="text-text-medium text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

---

### Task 6: Remy CTA Section

**File:** `components/marketing/waitlist-cta.tsx`

```tsx
import Image from 'next/image';
import { WaitlistForm } from './waitlist-form';

export function WaitlistCTA() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-sage-very-light border border-sage-light rounded-3xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Remy */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
              <Image
                src="/Images/remy-welcome.png"
                alt="Remy welcoming you"
                fill
                className="object-contain"
              />
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-text-dark mb-4">
                Ready to take control of your money?
              </h2>
              <p className="text-text-medium mb-6">
                Join the waitlist and be the first to know when My Budget Mate launches. 
                No pressure, no spam - just a friendly heads up from yours truly.
              </p>
              <WaitlistForm source="cta-section" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

### Task 7: Footer Waitlist Section

**File:** `components/marketing/waitlist-footer.tsx`

```tsx
import Image from 'next/image';
import { WaitlistForm } from './waitlist-form';

export function WaitlistFooter() {
  return (
    <footer className="bg-text-dark text-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
          {/* Left: Branding + Remy */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src="/Images/remy-encouraging.png"
                alt="Remy"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold">My Budget Mate</h3>
              <p className="text-silver-light text-sm">
                Budgeting built for Kiwis
              </p>
            </div>
          </div>

          {/* Right: Mini waitlist form */}
          <div>
            <p className="text-silver-light text-sm mb-3">
              Get notified when we launch:
            </p>
            <WaitlistForm source="footer" variant="compact" />
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-silver/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-silver-light text-sm">
            Made with aroha in Aotearoa 🥝
          </p>
          <div className="flex gap-6 text-sm text-silver-light">
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="mailto:hello@mybudgetmate.co.nz" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

### Task 8: Main Waitlist Landing Page

**File:** `app/(marketing)/page.tsx` or `app/page.tsx`

```tsx
import { WaitlistHero } from '@/components/marketing/waitlist-hero';
import { WaitlistFeatures } from '@/components/marketing/waitlist-features';
import { WaitlistCTA } from '@/components/marketing/waitlist-cta';
import { WaitlistFooter } from '@/components/marketing/waitlist-footer';
import { createClient } from '@supabase/supabase-js';

// Fetch waitlist count at build/request time
async function getWaitlistCount() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });
    
    return count || 0;
  } catch {
    return 0;
  }
}

export default async function WaitlistPage() {
  const waitlistCount = await getWaitlistCount();

  return (
    <main className="min-h-screen">
      <WaitlistHero waitlistCount={waitlistCount} />
      <WaitlistFeatures />
      <WaitlistCTA />
      <WaitlistFooter />
    </main>
  );
}

// Revalidate every 5 minutes to update count
export const revalidate = 300;
```

---

### Task 9: SEO Metadata

**File:** `app/(marketing)/layout.tsx` or add to page

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Budget Mate - Budgeting Built for Kiwis | Join the Waitlist',
  description: 'Finally, a budgeting app that understands fortnightly pay and connects to NZ banks. Join the waitlist for early access to My Budget Mate.',
  keywords: [
    'budgeting app nz',
    'new zealand budgeting',
    'envelope budgeting',
    'fortnightly budget',
    'ynab alternative nz',
    'pocketsmith alternative',
    'nz bank sync',
    'akahu budgeting',
  ],
  openGraph: {
    title: 'My Budget Mate - Budgeting Built for Kiwis',
    description: 'Finally, a budgeting app that understands fortnightly pay and connects to NZ banks. Join the waitlist!',
    url: 'https://mybudgetmate.co.nz',
    siteName: 'My Budget Mate',
    locale: 'en_NZ',
    type: 'website',
    images: [
      {
        url: '/og/waitlist.png',
        width: 1200,
        height: 630,
        alt: 'My Budget Mate - Join the Waitlist',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Budget Mate - Budgeting Built for Kiwis',
    description: 'Finally, a budgeting app that understands fortnightly pay and connects to NZ banks.',
    images: ['/og/waitlist.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NZ">
      <body>{children}</body>
    </html>
  );
}
```

---

### Task 10: Disabled Sign Up Button Component

For pages that still have a sign-up button, create a disabled version:

**File:** `components/marketing/signup-disabled.tsx`

```tsx
import Image from 'next/image';
import Link from 'next/link';

export function SignupDisabled() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Disabled button */}
      <button
        disabled
        className="px-6 py-3 bg-silver text-white font-semibold rounded-xl cursor-not-allowed opacity-60 flex items-center gap-2"
      >
        Sign Up
        <span className="text-xs bg-silver-light text-silver px-2 py-0.5 rounded-full">
          Coming Soon
        </span>
      </button>

      {/* Remy message */}
      <div className="flex items-center gap-3 text-sm text-text-medium">
        <div className="relative w-8 h-8 flex-shrink-0">
          <Image
            src="/Images/remy-encouraging.png"
            alt="Remy"
            fill
            className="object-contain"
          />
        </div>
        <p>
          Not quite ready yet! 
          <Link href="/" className="text-sage-dark hover:underline ml-1">
            Join the waitlist
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## File Structure Summary

After implementation, you should have:

```
app/
├── api/
│   └── waitlist/
│       └── route.ts              # Waitlist API endpoint
├── (marketing)/
│   ├── layout.tsx                # Marketing layout with SEO
│   └── page.tsx                  # Main waitlist landing page
│
components/
└── marketing/
    ├── waitlist-form.tsx         # Reusable form component
    ├── waitlist-hero.tsx         # Hero section with Remy
    ├── waitlist-features.tsx     # Feature preview grid
    ├── waitlist-cta.tsx          # CTA section with Remy
    ├── waitlist-footer.tsx       # Footer with mini form
    └── signup-disabled.tsx       # Disabled signup button
```

---

## Testing Checklist

After implementation, verify:

- [ ] Supabase table `waitlist` exists
- [ ] Can submit email via form
- [ ] Duplicate emails handled gracefully
- [ ] Success state shows Remy celebrating
- [ ] Error state shows helpful message
- [ ] Remy images load correctly (check paths)
- [ ] Mobile responsive layout
- [ ] Colors match style guide
- [ ] No banned phrases used
- [ ] Remy's voice is warm and Kiwi

---

## Remy Copy Checklist

Verify all copy uses Remy's voice:

| Location | Example Copy |
|----------|--------------|
| Hero intro | "Hey! I'm Remy, your financial coach..." |
| Success state | "You legend!" |
| Form helper | "No spam, promise. Just a heads up when we're ready." |
| CTA section | "Ready to take control of your money?" |
| Footer | "Made with aroha in Aotearoa" |

---

## Notes for Claude Code

1. **Image paths** - Use `/Images/` (capital I) not `/images/`
2. **Remy pronouns** - Refer to Remy as "she/her" 
3. **Colors** - Use Tailwind classes from style guide (`sage`, `sage-dark`, etc.)
4. **No em dashes** - Use regular dashes
5. **No banned phrases** - See list above
6. **Kiwi English** - "sorted", "sweet as", "no worries", "mate", "legend"

---

### Task 11: Admin API Routes

**File:** `app/api/admin/waitlist/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('waitlist')
      .select('*', { count: 'exact' });

    // Add search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // Add sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      entries: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });

  } catch (err) {
    console.error('Admin waitlist error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    );
  }
}
```

---

### Task 12: Admin Stats API

**File:** `app/api/admin/waitlist/stats/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total count
    const { count: totalCount } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    // Get today's signups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayCount } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get this week's signups
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: weekCount } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    // Get signups by source
    const { data: sourceData } = await supabase
      .from('waitlist')
      .select('source');

    const sourceCounts: Record<string, number> = {};
    sourceData?.forEach((entry) => {
      const src = entry.source || 'unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    // Get recent signups (last 10)
    const { data: recentSignups } = await supabase
      .from('waitlist')
      .select('id, email, name, source, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get daily signups for last 14 days (for chart)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: dailyData } = await supabase
      .from('waitlist')
      .select('created_at')
      .gte('created_at', twoWeeksAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group by day
    const dailyCounts: Record<string, number> = {};
    dailyData?.forEach((entry) => {
      const date = new Date(entry.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // Fill in missing days with 0
    const dailyChartData = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyChartData.push({
        date: dateStr,
        count: dailyCounts[dateStr] || 0,
      });
    }

    return NextResponse.json({
      total: totalCount || 0,
      today: todayCount || 0,
      thisWeek: weekCount || 0,
      bySource: sourceCounts,
      recentSignups: recentSignups || [],
      dailyChart: dailyChartData,
    });

  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
```

---

### Task 13: Admin Export API

**File:** `app/api/admin/waitlist/export/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all waitlist entries
    const { data, error } = await supabase
      .from('waitlist')
      .select('email, name, source, referral_code, referred_by, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Convert to CSV
    const headers = ['Email', 'Name', 'Source', 'Referral Code', 'Referred By', 'Signed Up'];
    const csvRows = [headers.join(',')];

    data?.forEach((entry) => {
      const row = [
        `"${entry.email || ''}"`,
        `"${entry.name || ''}"`,
        `"${entry.source || ''}"`,
        `"${entry.referral_code || ''}"`,
        `"${entry.referred_by || ''}"`,
        `"${new Date(entry.created_at).toLocaleDateString('en-NZ')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    // Return as downloadable CSV
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="waitlist-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json(
      { error: 'Failed to export waitlist' },
      { status: 500 }
    );
  }
}
```

---

### Task 14: Admin Dashboard Page

**File:** `app/(app)/admin/waitlist/page.tsx`

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WaitlistAdminClient } from './waitlist-admin-client';

export default async function WaitlistAdminPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  return <WaitlistAdminClient />;
}
```

---

### Task 15: Admin Dashboard Client Component

**File:** `app/(app)/admin/waitlist/waitlist-admin-client.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Download, 
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  source: string;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  today: number;
  thisWeek: number;
  bySource: Record<string, number>;
  recentSignups: WaitlistEntry[];
  dailyChart: { date: string; count: number }[];
}

export function WaitlistAdminClient() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/waitlist/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
      });
      
      const res = await fetch(`/api/admin/waitlist?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [page, search]);

  // Handle export
  const handleExport = () => {
    window.open('/api/admin/waitlist/export', '_blank');
  };

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate max for chart
  const chartMax = stats?.dailyChart 
    ? Math.max(...stats.dailyChart.map(d => d.count), 1) 
    : 1;

  return (
    <div className="min-h-screen bg-silver-very-light">
      {/* Header */}
      <div className="bg-white border-b border-silver-light">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12">
                <Image
                  src="/Images/remy-encouraging.png"
                  alt="Remy"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-dark">Waitlist Dashboard</h1>
                <p className="text-text-medium text-sm">
                  Manage your My Budget Mate waitlist
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { fetchStats(); fetchEntries(); }}
                className="p-2 text-text-medium hover:text-sage-dark hover:bg-sage-very-light rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-sage hover:bg-sage-dark text-white font-medium rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total */}
          <div className="bg-white rounded-xl border border-silver-light p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-medium text-sm">Total Signups</span>
              <Users className="w-5 h-5 text-sage" />
            </div>
            <p className="text-3xl font-bold text-text-dark">
              {statsLoading ? '-' : stats?.total.toLocaleString()}
            </p>
          </div>

          {/* Today */}
          <div className="bg-white rounded-xl border border-silver-light p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-medium text-sm">Today</span>
              <Calendar className="w-5 h-5 text-blue" />
            </div>
            <p className="text-3xl font-bold text-text-dark">
              {statsLoading ? '-' : stats?.today.toLocaleString()}
            </p>
          </div>

          {/* This Week */}
          <div className="bg-white rounded-xl border border-silver-light p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-medium text-sm">This Week</span>
              <TrendingUp className="w-5 h-5 text-gold" />
            </div>
            <p className="text-3xl font-bold text-text-dark">
              {statsLoading ? '-' : stats?.thisWeek.toLocaleString()}
            </p>
          </div>

          {/* Top Source */}
          <div className="bg-white rounded-xl border border-silver-light p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-medium text-sm">Top Source</span>
              <ExternalLink className="w-5 h-5 text-sage-dark" />
            </div>
            <p className="text-xl font-bold text-text-dark truncate">
              {statsLoading ? '-' : (
                stats?.bySource 
                  ? Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                  : 'N/A'
              )}
            </p>
          </div>
        </div>

        {/* Chart + Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-silver-light p-6">
            <h3 className="font-semibold text-text-dark mb-4">Last 14 Days</h3>
            <div className="h-48 flex items-end gap-1">
              {stats?.dailyChart.map((day, i) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-sage rounded-t transition-all hover:bg-sage-dark"
                    style={{ 
                      height: `${Math.max((day.count / chartMax) * 100, 4)}%`,
                      minHeight: day.count > 0 ? '8px' : '2px',
                    }}
                    title={`${day.date}: ${day.count} signups`}
                  />
                  {i % 2 === 0 && (
                    <span className="text-xs text-text-light">
                      {new Date(day.date).getDate()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sources Breakdown */}
          <div className="bg-white rounded-xl border border-silver-light p-6">
            <h3 className="font-semibold text-text-dark mb-4">By Source</h3>
            <div className="space-y-3">
              {stats?.bySource && Object.entries(stats.bySource)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-text-medium text-sm capitalize truncate">
                      {source.replace(/-/g, ' ')}
                    </span>
                    <span className="font-medium text-text-dark">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Recent Signups Quick View */}
        <div className="bg-white rounded-xl border border-silver-light p-6 mb-8">
          <h3 className="font-semibold text-text-dark mb-4">Recent Signups</h3>
          <div className="flex flex-wrap gap-2">
            {stats?.recentSignups.map((signup) => (
              <div
                key={signup.id}
                className="px-3 py-1.5 bg-sage-very-light text-sage-dark text-sm rounded-full"
              >
                {signup.email}
              </div>
            ))}
          </div>
        </div>

        {/* Full List */}
        <div className="bg-white rounded-xl border border-silver-light overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-silver-light">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-silver-light rounded-lg focus:border-sage focus:ring-1 focus:ring-sage outline-none"
                />
              </div>
              <span className="text-sm text-text-medium">
                {total.toLocaleString()} total entries
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-silver-very-light">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-medium">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-medium">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-medium">Source</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-medium">Referral Code</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-medium">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-silver-light">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-medium">
                      Loading...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-text-medium">
                      {search ? 'No entries match your search' : 'No waitlist entries yet'}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-sage-very-light/50">
                      <td className="px-4 py-3 text-sm text-text-dark">{entry.email}</td>
                      <td className="px-4 py-3 text-sm text-text-medium">{entry.name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-light text-blue text-xs rounded-full capitalize">
                          {entry.source?.replace(/-/g, ' ') || 'website'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-medium">
                        {entry.referral_code || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-medium">
                        {formatDate(entry.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-silver-light flex items-center justify-between">
              <span className="text-sm text-text-medium">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-silver-very-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-silver-very-light disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Remy Footer Note */}
        <div className="mt-8 flex items-center justify-center gap-3 text-text-medium text-sm">
          <div className="relative w-8 h-8">
            <Image
              src="/Images/remy-encouraging.png"
              alt="Remy"
              fill
              className="object-contain"
            />
          </div>
          <p>
            Your waitlist is growing! When you're ready to launch, export the list and send them the good news.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 16: Add Admin Link to Sidebar (Optional)

If you want to add the admin link to your existing sidebar for easy access:

**In your Sidebar component, add:**

```tsx
// Only show for authenticated users
{user && (
  <Link
    href="/admin/waitlist"
    className="flex items-center gap-2 px-3 py-2 text-sm text-text-medium hover:bg-silver-very-light rounded-lg"
  >
    <Users className="w-4 h-4" />
    Waitlist Admin
  </Link>
)}
```

---

## Updated File Structure Summary

After full implementation, you should have:

```
app/
├── api/
│   ├── waitlist/
│   │   └── route.ts                    # Public join endpoint
│   └── admin/
│       └── waitlist/
│           ├── route.ts                # Admin list endpoint
│           ├── stats/
│           │   └── route.ts            # Stats endpoint
│           └── export/
│               └── route.ts            # CSV export endpoint
├── (marketing)/
│   ├── layout.tsx                      # Marketing layout with SEO
│   └── page.tsx                        # Main waitlist landing page
├── (app)/
│   └── admin/
│       └── waitlist/
│           ├── page.tsx                # Admin page (server)
│           └── waitlist-admin-client.tsx  # Admin dashboard (client)
│
components/
└── marketing/
    ├── waitlist-form.tsx               # Reusable form component
    ├── waitlist-hero.tsx               # Hero section with Remy
    ├── waitlist-features.tsx           # Feature preview grid
    ├── waitlist-cta.tsx                # CTA section with Remy
    ├── waitlist-footer.tsx             # Footer with mini form
    └── signup-disabled.tsx             # Disabled signup button
```

---

## Admin Dashboard Features

The admin dashboard includes:

| Feature | Description |
|---------|-------------|
| **Stats Cards** | Total signups, today's count, this week's count, top source |
| **14-Day Chart** | Visual bar chart of daily signups |
| **Source Breakdown** | See which channels are performing |
| **Recent Signups** | Quick view of latest entries |
| **Full Table** | Searchable, paginated list of all entries |
| **CSV Export** | One-click download of entire waitlist |
| **Refresh Button** | Update data without page reload |

---

## Admin Access Control

The admin pages are protected:

1. All `/api/admin/*` routes check for authenticated user
2. Admin page redirects to `/login` if not authenticated
3. Only logged-in users can view or export waitlist data

**Note:** This uses basic auth protection. For production with multiple team members, you may want to add role-based access control.

---

## After Implementation

Once the waitlist is live:

1. Test with your own email
2. Check Supabase table for the entry
3. Verify referral code generated
4. Test duplicate submission handling
5. Check mobile responsiveness
6. Review all Remy copy for voice consistency
7. Test admin dashboard access
8. Verify CSV export works
9. Check stats are calculating correctly
