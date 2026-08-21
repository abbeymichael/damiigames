import type { Metadata } from "next";
import { PolicyPageView } from "@/components/PolicyPageView";

export const metadata: Metadata = {
  title: "Platform Terms of Service & User Agreement — DAMII",
  description:
    "Terms and conditions governing account access, Mobile Money transactions, tournament conduct, organizer licensing, and service usage on DAMII.",
};

export default function TermsPage() {
  return <PolicyPageView initialSlug="terms-of-service" />;
}
