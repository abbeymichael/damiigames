import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbRepository } from "@/lib/db-client";
import { requireAuth } from "@/lib/auth-guard";
import { OrganizerApplication } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const application = await dbRepository.getOrganizerApplicationByUserId(auth.user.token);

    return NextResponse.json({
      application: application || null,
      userRole: auth.user.role,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load organizer application" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth.user.token;
    const body = await req.json();

    const {
      applicantType,
      organizationName,
      organizationRegNumber,
      ghanaCardFrontUrl,
      ghanaCardBackUrl,
      selfieUrl,
      physicalAddress,
      proofOfAddressUrl,
      intendedGameTypes,
      expectedTournamentSize,
      expectedFrequency,
      priorExperience,
      termsAccepted,
    } = body;

    // Validation
    if (!applicantType || !["individual", "organization"].includes(applicantType)) {
      return NextResponse.json(
        { error: "Applicant type must be 'individual' or 'organization'" },
        { status: 400 },
      );
    }

    if (applicantType === "organization" && !organizationName) {
      return NextResponse.json(
        { error: "Organization name is required for organization applicants" },
        { status: 400 },
      );
    }

    if (!ghanaCardFrontUrl || !ghanaCardBackUrl || !selfieUrl) {
      return NextResponse.json(
        { error: "Ghana Card (Front and Back) and verification selfie URLs are required" },
        { status: 400 },
      );
    }

    if (!physicalAddress || !proofOfAddressUrl) {
      return NextResponse.json(
        { error: "Physical address and proof of address document are required" },
        { status: 400 },
      );
    }

    if (!intendedGameTypes) {
      return NextResponse.json(
        { error: "Intended game types are required" },
        { status: 400 },
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "You must accept the Organizer Terms & Platform Rules" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Check for existing application by this user
    const existing = await dbRepository.getOrganizerApplicationByUserId(userId);

    if (existing) {
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "You are already an approved tournament organizer.", application: existing },
          { status: 400 },
        );
      }

      if (existing.status === "pending") {
        return NextResponse.json(
          {
            error: "You already have a pending organizer application currently under review.",
            application: existing,
          },
          { status: 400 },
        );
      }

      // If status is "needs_info" (or "rejected" after revision), update the same row so history is preserved
      const updatedApp = await dbRepository.updateOrganizerApplication(existing.id, {
        applicantType,
        organizationName: organizationName ? String(organizationName).trim() : null,
        organizationRegNumber: organizationRegNumber ? String(organizationRegNumber).trim() : null,
        ghanaCardFrontUrl: String(ghanaCardFrontUrl).trim(),
        ghanaCardBackUrl: String(ghanaCardBackUrl).trim(),
        selfieUrl: String(selfieUrl).trim(),
        physicalAddress: String(physicalAddress).trim(),
        proofOfAddressUrl: String(proofOfAddressUrl).trim(),
        intendedGameTypes: typeof intendedGameTypes === "object" ? JSON.stringify(intendedGameTypes) : String(intendedGameTypes).trim(),
        expectedTournamentSize: expectedTournamentSize ? Number(expectedTournamentSize) : null,
        expectedFrequency: expectedFrequency ? String(expectedFrequency).trim() : null,
        priorExperience: priorExperience ? String(priorExperience).trim() : null,
        termsAcceptedAt: now,
        status: "pending",
        reviewNote: null, // clear previous review note upon resubmission
      });

      // Also sync organizer profile status
      await dbRepository.saveOrganizerProfile({
        userId,
        username: auth.user.username,
        status: "pending",
        requestedAt: now,
        organizationName: organizationName || undefined,
      });

      return NextResponse.json({
        success: true,
        message: "Your organizer application has been updated and resubmitted for admin review.",
        application: updatedApp,
      });
    }

    // Create new application
    const newApplication: OrganizerApplication = {
      id: crypto.randomUUID(),
      userId,
      applicantType,
      organizationName: organizationName ? String(organizationName).trim() : null,
      organizationRegNumber: organizationRegNumber ? String(organizationRegNumber).trim() : null,
      ghanaCardFrontUrl: String(ghanaCardFrontUrl).trim(),
      ghanaCardBackUrl: String(ghanaCardBackUrl).trim(),
      selfieUrl: String(selfieUrl).trim(),
      physicalAddress: String(physicalAddress).trim(),
      proofOfAddressUrl: String(proofOfAddressUrl).trim(),
      intendedGameTypes: typeof intendedGameTypes === "object" ? JSON.stringify(intendedGameTypes) : String(intendedGameTypes).trim(),
      expectedTournamentSize: expectedTournamentSize ? Number(expectedTournamentSize) : null,
      expectedFrequency: expectedFrequency ? String(expectedFrequency).trim() : null,
      priorExperience: priorExperience ? String(priorExperience).trim() : null,
      termsAcceptedAt: now,
      status: "pending",
      createdAt: now,
    };

    await dbRepository.createOrganizerApplication(newApplication);

    // Also sync organizer profile
    await dbRepository.saveOrganizerProfile({
      userId,
      username: auth.user.username,
      status: "pending",
      requestedAt: now,
      organizationName: organizationName || undefined,
    });

    // Write audit log
    await dbRepository.createAdminLog({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      adminToken: auth.user.token,
      adminName: auth.user.username,
      action: "organizer_application.submitted",
      target: userId,
      detailsJson: JSON.stringify({ applicantType, organizationName }),
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "Your organizer application has been submitted successfully and is pending admin approval.",
      application: newApplication,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit organizer application" },
      { status: 500 },
    );
  }
}
