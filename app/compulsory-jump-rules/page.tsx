import type { Metadata } from "next";
import { PolicyPageView } from "@/components/PolicyPageView";

export const metadata: Metadata = {
  title: "Compulsory Jump Rules & 10×10 Draughts Regulations — DAMII",
  description:
    "Official Ghanaian 10×10 Draughts (Damii) competition rules, compulsory capture hierarchy, flying kings mechanics, and tournament timers.",
};

export default function CompulsoryJumpRulesAliasPage() {
  return <PolicyPageView initialSlug="compulsory-jump-rules" />;
}
