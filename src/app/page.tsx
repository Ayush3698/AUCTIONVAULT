import Hero from "@/components/home/hero";
import FeaturedLive from "@/components/home/featured-live";
import EndingSoon from "@/components/home/ending-soon";
import Trending from "@/components/home/trending";
import Recommended from "@/components/home/recommended";
import Categories from "@/components/home/categories";
import GlobalActivity from "@/components/home/global-activity";
import PlatformStats from "@/components/home/platform-stats";
import TrustSecurity from "@/components/home/trust-security";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <Hero />
      <div className="space-y-24 py-20 sm:py-24">
        <FeaturedLive />
        <EndingSoon />
        <Trending />
        <Recommended />
        <Categories />
        <GlobalActivity />
        <PlatformStats />
        <TrustSecurity />
      </div>
    </main>
  );
}