import dynamic from "next/dynamic"

import { Navbar1 } from "@/components/ui/navbar1"
import { Hero } from "@/components/landing/hero"
import { ProblemCost } from "@/components/landing/problem-cost"

// Секции ниже первого экрана — отдельные чанки, не блокируют первую загрузку
const LpMap = dynamic(() => import("@/components/landing/lp-map").then((m) => m.LpMap))
const LpServices = dynamic(() => import("@/components/landing/lp-services").then((m) => m.LpServices))
const LpSolutions = dynamic(() => import("@/components/landing/lp-solutions").then((m) => m.LpSolutions))
const LpBento = dynamic(() => import("@/components/landing/lp-bento").then((m) => m.LpBento))
const LpProcess = dynamic(() => import("@/components/landing/lp-process").then((m) => m.LpProcess))
const ReadyCta = dynamic(() => import("@/components/landing/ready-cta").then((m) => m.ReadyCta))
const Footer = dynamic(() => import("@/components/landing/footer").then((m) => m.Footer))

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar1 />
      <main>
        <Hero />
        <ProblemCost />
        <LpMap />
        <LpServices />
        <LpSolutions />
        <LpBento />
        <LpProcess />
        <ReadyCta />
      </main>
      <Footer />
    </div>
  )
}
