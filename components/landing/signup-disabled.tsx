import Image from "next/image";
import Link from "next/link";

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
            quality={100}
            unoptimized
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
