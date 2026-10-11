"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Eye,
  Lock,
  Shield,
  type LucideIcon,
} from "lucide-react";

interface TrustFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: TrustFeature[] = [
  {
    icon: Shield,
    title: "Wallet Authentication",
    description:
      "Sign in with your crypto wallet — no passwords, no friction, fully self-custodied identity.",
  },
  {
    icon: Lock,
    title: "Multi-Layer Security",
    description:
      "Hardware-grade encryption, cold storage escrow, and 2FA protect every asset and bid.",
  },
  {
    icon: Eye,
    title: "Verified Sellers",
    description:
      "Every seller passes KYC, reputation scoring, and provenance checks before listing.",
  },
  {
    icon: CheckCircle,
    title: "Secure Payments",
    description:
      "Funds are held in smart-contract escrow and released to sellers only when you confirm receipt.",
  },
  {
    icon: AlertTriangle,
    title: "Fraud Detection",
    description:
      "Real-time AI monitors bidding patterns to detect shill bidding and counterfeit listings.",
  },
  {
    icon: Activity,
    title: "Dispute Resolution",
    description:
      "Transparent, broker-mediated resolution with full evidence trails and escalation rights.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function TrustSecurity() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-[#c8a44e]" />
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            Built on Trust
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Every auction is protected by industry-leading security and integrity guarantees.
        </p>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={containerVariants}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="glass card-glow group rounded-2xl border border-zinc-800/60 p-6 transition-colors duration-300 hover:border-[#c8a44e]/40"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#c8a44e]/10 text-[#c8a44e] transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(200,164,78,0.25)]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-50">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}