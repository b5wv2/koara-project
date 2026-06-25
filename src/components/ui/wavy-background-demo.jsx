import React from "react";
import { WavyBackground } from "@/components/ui/wavy-background";

/**
 * WavyBackgroundDemo
 * Drop-in demo showcasing the WavyBackground component.
 * Import this wherever you want to preview the canvas wave hero.
 *
 * Example usage in a page:
 *   import WavyBackgroundDemo from "@/components/ui/wavy-background-demo";
 *   export default function MyPage() { return <WavyBackgroundDemo />; }
 */
export default function WavyBackgroundDemo() {
  return (
    <WavyBackground className="max-w-4xl mx-auto pb-40">
      <p className="text-2xl md:text-4xl lg:text-7xl text-white font-bold inter-var text-center">
        Hero waves are cool
      </p>
      <p className="text-base md:text-lg mt-4 text-white font-normal inter-var text-center">
        Leverage the power of canvas to create a beautiful hero section
      </p>
    </WavyBackground>
  );
}
