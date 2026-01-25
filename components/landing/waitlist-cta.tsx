import Image from "next/image";
import { WaitlistForm } from "./waitlist-form";

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
                quality={100}
                unoptimized
              />
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-text-dark mb-4">
                Ready to take control of your money?
              </h2>
              <p className="text-text-medium mb-6">
                Join the waitlist and be the first to know when My Budget Mate launches. No
                pressure, no spam - just a friendly heads up from yours truly.
              </p>
              <WaitlistForm source="cta-section" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
