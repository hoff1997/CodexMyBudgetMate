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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F3F4F6] border border-[#D1D5DB] rounded-full mb-6">
              <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[#6B7280]">Coming Soon</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-dark mb-6 leading-tight">
              Kia Ora,
              <br />
              welcome to
              <br />
              <span className="text-sage whitespace-nowrap">My Budget Mate</span>
            </h1>

            <p className="text-base md:text-lg text-text-medium mb-4 leading-relaxed">
              My Budget Mate uses envelope budgeting to help you tell your money where to go,
              before you wonder where it went. Sync with your bank using trusted Akahu bank
              connections.
            </p>
            <p className="text-base md:text-lg text-text-medium font-medium mb-8">
              Your money. Your plan. Your pace - one pay cycle at a time.
            </p>

            {/* Remy's intro */}
            <div className="flex items-start gap-4 p-4 bg-sage-very-light border border-sage-light rounded-2xl mb-8">
              <div className="relative w-16 h-16 md:w-[72px] md:h-[72px] rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm bg-sage-light">
                <Image
                  src="/Images/remy-welcome.png"
                  alt="Remy"
                  fill
                  className="object-cover object-top"
                  quality={100}
                  unoptimized
                  style={{ imageRendering: "auto" }}
                />
              </div>
              <div>
                <p className="text-sage-dark text-sm leading-relaxed">
                  &quot;Kia ora! I&apos;m Remy, your financial coach. We&apos;re almost ready to open
                  the doors. Pop your email below and I&apos;ll give you a shout when it&apos;s
                  time to get sorted.&quot;
                </p>
                <p className="text-sage text-xs mt-1 italic">- Remy</p>
              </div>
            </div>

            {/* Waitlist form */}
            <div id="waitlist">
              <WaitlistForm source="hero" variant="hero" />
            </div>
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
