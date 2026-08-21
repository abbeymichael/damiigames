import type { Metadata } from "next";
import { PolicyPageView } from "@/components/PolicyPageView";

export const metadata: Metadata = {
  title: "Fair Play Guarantee & Escrow Security Policy — DAMII",
  description:
    "DAMII's unbreakable commitment to zero-cheat competition, server-authoritative state validation, native DAMII escrow protection, and referee arbitration.",
};

export default function FairPlayPage() {
  return <PolicyPageView initialSlug="fair-play-guarantee" />;
}
