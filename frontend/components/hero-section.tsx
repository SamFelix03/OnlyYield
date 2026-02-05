import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import RotatingText from "./RotatingText";

const ArrowRight = () => (
  <svg
    className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const Play = () => (
  <svg
    className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z"
    />
  </svg>
);

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-20 relative">
      <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in-hero">
        {/* Logo Badge */}
        <div className="inline-flex items-center justify-center mb-1 mt-6 sm:mt-8 animate-fade-in-badge">
          <Image
            src="/onlyyield-logo.png"
            alt="OnlyYield Logo"
            width={480}
            height={160}
            className="h-24 w-auto sm:h-32 md:h-40 lg:h-44"
            priority
          />
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 -mt-1 animate-fade-in-heading">
          <span className="text-foreground">Support Your Favorite</span>
          <br />
          <span className="inline-flex items-center justify-center gap-2 mt-4 sm:mt-6 md:mt-8 whitespace-nowrap">
            <span className="text-foreground">Creators &</span>
            <RotatingText
              texts={[
                "Fuel Their Growth",
                "Back Innovation",
                "Empower Creators",
                "Enable Dreams"
              ]}
              mainClassName="px-2 sm:px-2 md:px-3 bg-white text-black overflow-hidden py-1 sm:py-1 md:py-2 justify-center rounded-lg shadow-lg"
              staggerFrom={"last"}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2000}
            />
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-xl md:text-2xl text-white text-balance max-w-sm sm:max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4 sm:px-0 animate-fade-in-subheading font-light">
          Donate USDC to creators. Their funds earn yield on Aave and they keep the returns. Withdraw your principal
          anytime—zero lock-in.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 sm:mb-16 animate-fade-in-buttons">
          <Button
            asChild
            size="lg"
            className="bg-white text-black rounded-full px-8 py-4 text-lg font-medium transition-all duration-300 hover:bg-gray-50 hover:scale-105 hover:shadow-lg group cursor-pointer relative overflow-hidden"
          >
            <Link href="/donor">
              Donate
              <ArrowRight />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full px-8 py-4 text-lg font-medium border-border hover:bg-accent transition-all duration-200 hover:scale-105 group bg-transparent cursor-pointer"
          >
            <Link href="/streamer">
              <Play />
              Join as Creator
            </Link>
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="text-center px-4 hidden sm:block overflow-hidden animate-fade-in-trust">
          <p className="text-sm text-white mb-6">Powered by Aave • Secured by Ethereum • For Creators</p>
          <div className="relative overflow-hidden w-full mx-auto">
            <div className="flex items-center gap-8 opacity-60 hover:opacity-80 transition-all duration-500 animate-slide-left">
              <div className="flex items-center gap-8 whitespace-nowrap">
                <div className="text-base sm:text-lg font-semibold">Musicians</div>
                <div className="text-base sm:text-lg font-semibold">Streamers</div>
                <div className="text-base sm:text-lg font-semibold">Artists</div>
                <div className="text-base sm:text-lg font-semibold">Creators</div>
                <div className="text-base sm:text-lg font-semibold">Influencers</div>
                <div className="text-base sm:text-lg font-semibold">Builders</div>
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex items-center gap-8 whitespace-nowrap">
                <div className="text-base sm:text-lg font-semibold">Musicians</div>
                <div className="text-base sm:text-lg font-semibold">Streamers</div>
                <div className="text-base sm:text-lg font-semibold">Artists</div>
                <div className="text-base sm:text-lg font-semibold">Creators</div>
                <div className="text-base sm:text-lg font-semibold">Influencers</div>
                <div className="text-base sm:text-lg font-semibold">Builders</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Trust Indicators */}
        <div className="text-center px-4 mb-8 sm:hidden overflow-hidden animate-fade-in-trust">
          <p className="text-sm text-white mb-6">Powered by Aave • Secured by Ethereum • For Creators</p>
          <div className="relative overflow-hidden w-full mx-auto">
            {/* Left blur fade */}
            <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
            {/* Right blur fade */}
            <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>
            <div className="flex items-center gap-6 opacity-60 animate-slide-left-mobile">
              <div className="flex items-center gap-6 whitespace-nowrap">
                <div className="text-sm font-semibold">Musicians</div>
                <div className="text-sm font-semibold">Streamers</div>
                <div className="text-sm font-semibold">Artists</div>
                <div className="text-sm font-semibold">Creators</div>
                <div className="text-sm font-semibold">Influencers</div>
                <div className="text-sm font-semibold">Builders</div>
              </div>
              {/* Duplicate for seamless loop */}
              <div className="flex items-center gap-6 whitespace-nowrap">
                <div className="text-sm font-semibold">Musicians</div>
                <div className="text-sm font-semibold">Streamers</div>
                <div className="text-sm font-semibold">Artists</div>
                <div className="text-sm font-semibold">Creators</div>
                <div className="text-sm font-semibold">Influencers</div>
                <div className="text-sm font-semibold">Builders</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

