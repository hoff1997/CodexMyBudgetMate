"use client";

import Image from "next/image";
import { WaitlistForm } from "./waitlist-form";

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
              Fortnightly pay? Sorted. NZ bank connections? Sweet as. A budgeting app that actually
              gets how we do money in Aotearoa.
            </p>

            {/* Remy's intro */}
            <div className="flex items-start gap-4 p-4 bg-sage-very-light border border-sage-light rounded-2xl mb-8">
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src="/Images/remy-encouraging.png"
                  alt="Remy"
                  fill
                  className="object-contain"
                  quality={100}
                  unoptimized
                />
              </div>
              <div>
                <p className="text-sage-dark text-sm leading-relaxed">
                  &quot;Hey! I&apos;m Remy, your financial coach. I&apos;m putting the finishing
                  touches on something special for you. Pop your email in and I&apos;ll give you a
                  shout when we&apos;re ready!&quot;
                </p>
                <p className="text-sage text-xs mt-1 italic">- Remy</p>
              </div>
            </div>

            {/* Waitlist form */}
            <WaitlistForm source="hero" variant="hero" />

            {/* Social proof */}
            {waitlistCount > 10 && (
              <p className="text-text-medium text-sm mt-4">
                <span className="font-semibold text-sage-dark">
                  {waitlistCount.toLocaleString()}
                </span>{" "}
                Kiwis already on the waitlist
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
                  quality={100}
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
