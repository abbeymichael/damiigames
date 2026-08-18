import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { getSessionFromRequest } from "@/lib/auth-guard";
import { OrganizerProfile } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await getSessionFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgProfile = await dbRepository.getOrganizerProfile(auth.user.token);
  return NextResponse.json({
    profile: auth.user,
    organizerProfile: orgProfile || {
      userId: auth.user.token,
      username: auth.user.username,
      status: "none",
      requestedAt: "",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getSessionFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { organizationName, bio, contactPhone } = body;

    if (!organizationName) {
      return NextResponse.json({ error: "Organization Name is required" }, { status: 400 });
    }

    const existing = await dbRepository.getOrganizerProfile(auth.user.token);
    
    // Check cooldown if rejected (e.g. 14 days)
    if (existing && existing.status === "rejected" && existing.reviewedAt) {
      const daysSinceReview = (Date.now() - new Date(existing.reviewedAt).getTime()) / (1000 * 3600 * 24);
      if (daysSinceReview < 14) {
        const remainingDays = Math.ceil(14 - daysSinceReview);
        return NextResponse.json(
          { error: `Re-application cooldown active. Please wait ${remainingDays} more day(s) before applying again.` },
          { status: 429 }
        );
      }
    }

    const now = new Date().toISOString();
    const updatedOrgProfile: OrganizerProfile = {
      userId: auth.user.token,
      username: auth.user.username,
      status: "pending",
      requestedAt: now,
      organizationName: String(organizationName).trim(),
      bio: bio ? String(bio).trim() : "",
      contactPhone: contactPhone ? String(contactPhone).trim() : "",
    };

    await dbRepository.saveOrganizerProfile(updatedOrgProfile);

    // Also sync OrganizerApplication record
    const existingApp = await dbRepository.getOrganizerApplicationByUserId(auth.user.token);
    let appRecord = existingApp;
    if (existingApp) {
      appRecord = await dbRepository.updateOrganizerApplication(existingApp.id, {
        organizationName: String(organizationName).trim(),
        priorExperience: bio ? String(bio).trim() : null,
        status: "pending",
        reviewNote: null,
      });
    } else {
      appRecord = await dbRepository.createOrganizerApplication({
        id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: auth.user.token,
        applicantType: "individual",
        organizationName: String(organizationName).trim(),
        ghanaCardFrontUrl: "https://damii.app/docs/gh-card-front.png",
        ghanaCardBackUrl: "https://damii.app/docs/gh-card-back.png",
        selfieUrl: "https://damii.app/docs/selfie.png",
        physicalAddress: "Accra, Ghana",
        proofOfAddressUrl: "https://damii.app/docs/proof-of-address.pdf",
        intendedGameTypes: JSON.stringify(["damii_10x10"]),
        priorExperience: bio ? String(bio).trim() : null,
        termsAcceptedAt: now,
        status: "pending",
        createdAt: now,
      });
    }

    // Write Audit Log
    await dbRepository.createAdminLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminToken: auth.user.token,
      adminName: auth.user.username,
      action: "organizer.requested",
      target: auth.user.token,
      detailsJson: JSON.stringify({ organizationName, bio, contactPhone }),
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      organizerProfile: updatedOrgProfile,
      application: appRecord,
      message: "Your organizer request has been submitted and is pending admin approval. You can continue playing matches while waiting.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit organizer request" },
      { status: 500 }
    );
  }
}
