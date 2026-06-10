import { Navbar1 } from "@/components/ui/navbar1"
import { Hero } from "@/components/landing/hero"
import { LogoCloud } from "@/components/landing/logo-cloud"
import { LpMap } from "@/components/landing/lp-map"
import { LpServices } from "@/components/landing/lp-services"
import { LpSolutions } from "@/components/landing/lp-solutions"
import { LpBento } from "@/components/landing/lp-bento"
import { LpProcess } from "@/components/landing/lp-process"
import { Testimonials } from "@/components/landing/testimonials"
import { Pricing } from "@/components/landing/pricing"
import { ReadyCta } from "@/components/landing/ready-cta"
import { Footer } from "@/components/landing/footer"

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar1 />
      <main>
        <Hero />
        <LogoCloud />
        <LpMap />
        <LpServices />
        <LpSolutions />
        <LpBento />
        <LpProcess />
        <Testimonials />
        <Pricing />
        <ReadyCta />
      </main>
      <Footer />
    </div>
  )
}
