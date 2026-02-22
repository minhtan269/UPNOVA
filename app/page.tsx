import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import ArchitectureSection from "@/components/home/ArchitectureSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import FormulaSection from "@/components/home/FormulaSection";
import CTASection from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />

      <main>
        <HeroSection />
        <ArchitectureSection />
        <FeaturesSection />
        <FormulaSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
