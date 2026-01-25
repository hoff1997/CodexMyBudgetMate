import Image from "next/image";
import Link from "next/link";
import { WaitlistForm } from "./waitlist-form";

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
                quality={100}
                unoptimized
              />
            </div>
            <div>
              <h3 className="text-xl font-bold">My Budget Mate</h3>
              <p className="text-silver-light text-sm">Budgeting built for Kiwis</p>
            </div>
          </div>

          {/* Right: Mini waitlist form */}
          <div>
            <p className="text-silver-light text-sm mb-3">Get notified when we launch:</p>
            <WaitlistForm source="footer" variant="compact" />
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-silver/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-silver-light text-sm">Made with aroha in Aotearoa</p>
          <div className="flex gap-6 text-sm text-silver-light">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <a
              href="mailto:hello@mybudgetmate.co.nz"
              className="hover:text-white transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
