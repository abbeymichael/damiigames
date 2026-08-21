import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbRepository } from "@/lib/db-client";
import { requireAuth } from "@/lib/auth-guard";
import { OrganizerApplication } from "@/lib/types";

const REAPPLICATION_COOLDOWN_DAYS = 14;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth?.user?.token || auth?.token;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const application = await dbRepository.getOrganizerApplicationByUserId(userId);
    const profile = await dbRepository.getProfile(userId);
    const revocation = await dbRepository.getOrganizerRevocationByUserId(userId);

    // Compute cooldown if previously rejected
    let cooldown: {
      isCooldownActive: boolean;
      reapplyEligibleAt: string | null;
      remainingDays: number;
    } = {
      isCooldownActive: false,
      reapplyEligibleAt: null,
      remainingDays: 0,
    };

    if (application && application.status === "rejected") {
      const reviewedTime = application.reviewedAt
        ? new Date(application.reviewedAt).getTime()
        : new Date(application.createdAt).getTime();
      const eligibleTime = reviewedTime + REAPPLICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (now < eligibleTime) {
        const remainingMs = eligibleTime - now;
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        cooldown = {
          isCooldownActive: true,
          reapplyEligibleAt: new Date(eligibleTime).toISOString(),
          remainingDays,
        };
      }
    }

    return NextResponse.json({
      success: true,
      application: application || null,
      userRole: auth?.user?.role || auth?.role || "user",
      userProfile: profile || null,
      revocation: revocation || null,
      cooldown,
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
    const userId = auth?.user?.token || auth?.token;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();

    const isDraft = Boolean(body.isDraft || body.status === "draft");

    const {
      applicantType = "individual",
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

    const now = new Date().toISOString();

    // Check revocation status
    const revocation = await dbRepository.getOrganizerRevocationByUserId(userId);
    if (revocation && !isDraft) {
      if (revocation.reapplyEligibleAt) {
        const eligibleTime = new Date(revocation.reapplyEligibleAt).getTime();
        if (Date.now() < eligibleTime) {
          return NextResponse.json(
            {
              error: `Your organizer privileges were revoked. Reapplication is locked until ${new Date(
                eligibleTime,
              ).toLocaleDateString()}. Contact administrator for clearance.`,
              isRevoked: true,
            },
            { status: 403 },
          );
        }
      } else {
        return NextResponse.json(
          {
            error:
              "Your organizer privileges were previously revoked for cause. Reapplication requires manual administrator clearance.",
            isRevoked: true,
          },
          { status: 403 },
        );
      }
    }

    // Check existing application
    const existing = await dbRepository.getOrganizerApplicationByUserId(userId);

    if (existing) {
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "You are already a certified tournament organizer.", application: existing },
          { status: 400 },
        );
      }

      if (existing.status === "pending" && !isDraft) {
        return NextResponse.json(
          {
            error: "You already have an active organizer application under commission review.",
            application: existing,
          },
          { status: 400 },
        );
      }

      // Check cooldown if rejected
      if (existing.status === "rejected" && !isDraft) {
        const reviewedTime = existing.reviewedAt
          ? new Date(existing.reviewedAt).getTime()
          : new Date(existing.createdAt).getTime();
        const eligibleTime = reviewedTime + REAPPLICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() < eligibleTime) {
          const remainingDays = Math.ceil((eligibleTime - Date.now()) / (1000 * 60 * 60 * 24));
          return NextResponse.json(
            {
              error: `Reapplication cooldown is active. You may reapply in ${remainingDays} day(s).`,
              reapplyEligibleAt: new Date(eligibleTime).toISOString(),
            },
            { status: 400 },
          );
        }
      }
    }

    // If NOT draft, validate mandatory fields
    if (!isDraft) {
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
          { error: "Ghana Card (Front and Back) and verification selfie are required" },
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
          { error: "You must accept the Organizer Rules & Financial Escrow Terms" },
          { status: 400 },
        );
      }
    }

    const newStatus = isDraft ? "draft" : "pending";
    const targetStatus = existing?.status === "needs_info" && !isDraft ? "pending" : newStatus;

    // If updating existing application (draft or needs_info resubmission)
    if (existing && (existing.status === "draft" || existing.status === "needs_info")) {
      const updatedApp = await dbRepository.updateOrganizerApplication(existing.id, {
        applicantType,
        organizationName: organizationName ? String(organizationName).trim() : null,
        organizationRegNumber: organizationRegNumber ? String(organizationRegNumber).trim() : null,
        ghanaCardFrontUrl: ghanaCardFrontUrl ? String(ghanaCardFrontUrl).trim() : existing.ghanaCardFrontUrl,
        ghanaCardBackUrl: ghanaCardBackUrl ? String(ghanaCardBackUrl).trim() : existing.ghanaCardBackUrl,
        selfieUrl: selfieUrl ? String(selfieUrl).trim() : existing.selfieUrl,
        physicalAddress: physicalAddress ? String(physicalAddress).trim() : existing.physicalAddress,
        proofOfAddressUrl: proofOfAddressUrl ? String(proofOfAddressUrl).trim() : existing.proofOfAddressUrl,
        intendedGameTypes: typeof intendedGameTypes === "object" ? JSON.stringify(intendedGameTypes) : intendedGameTypes ? String(intendedGameTypes).trim() : existing.intendedGameTypes,
        expectedTournamentSize: expectedTournamentSize ? Number(expectedTournamentSize) : existing.expectedTournamentSize,
        expectedFrequency: expectedFrequency ? String(expectedFrequency).trim() : existing.expectedFrequency,
        priorExperience: priorExperience ? String(priorExperience).trim() : existing.priorExperience,
        termsAcceptedAt: termsAccepted ? now : existing.termsAcceptedAt,
        status: targetStatus,
        submittedAt: !isDraft ? now : existing.submittedAt,
        reviewNote: isDraft ? existing.reviewNote : null, // clear review note on full resubmit
      });

      if (!isDraft) {
        await dbRepository.saveOrganizerProfile({
          userId,
          username: auth.user.username,
          status: "pending",
          requestedAt: now,
          organizationName: organizationName || undefined,
        });

        await dbRepository.createAdminLog({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          adminToken: auth.user.token,
          adminName: auth.user.username,
          action: existing.status === "needs_info" ? "organizer_application.resubmitted" : "organizer_application.submitted",
          target: userId,
          detailsJson: JSON.stringify({ applicationId: existing.id, applicantType, organizationName }),
          createdAt: now,
        });
      }

      return NextResponse.json({
        success: true,
        message: isDraft
          ? "Application draft saved successfully."
          : "Your organizer application has been resubmitted for admin review.",
        application: updatedApp,
      });
    }

    // Creating new application (fresh draft or fresh submission after cooldown)
    const newApplicationId = crypto.randomUUID();
    const previousAppId = existing?.status === "rejected" ? existing.id : undefined;

    const newApplication: OrganizerApplication = {
      id: newApplicationId,
      userId,
      applicantType,
      organizationName: organizationName ? String(organizationName).trim() : null,
      organizationRegNumber: organizationRegNumber ? String(organizationRegNumber).trim() : null,
      ghanaCardFrontUrl: ghanaCardFrontUrl ? String(ghanaCardFrontUrl).trim() : null,
      ghanaCardBackUrl: ghanaCardBackUrl ? String(ghanaCardBackUrl).trim() : null,
      selfieUrl: selfieUrl ? String(selfieUrl).trim() : null,
      physicalAddress: physicalAddress ? String(physicalAddress).trim() : null,
      proofOfAddressUrl: proofOfAddressUrl ? String(proofOfAddressUrl).trim() : null,
      intendedGameTypes: typeof intendedGameTypes === "object" ? JSON.stringify(intendedGameTypes) : intendedGameTypes ? String(intendedGameTypes).trim() : null,
      expectedTournamentSize: expectedTournamentSize ? Number(expectedTournamentSize) : null,
      expectedFrequency: expectedFrequency ? String(expectedFrequency).trim() : null,
      priorExperience: priorExperience ? String(priorExperience).trim() : null,
      termsAcceptedAt: termsAccepted ? now : null,
      status: targetStatus,
      previousApplicationId: previousAppId,
      submittedAt: !isDraft ? now : null,
      createdAt: now,
    };

    await dbRepository.createOrganizerApplication(newApplication);

    if (!isDraft) {
      await dbRepository.saveOrganizerProfile({
        userId,
        username: auth.user.username,
        status: "pending",
        requestedAt: now,
        organizationName: organizationName || undefined,
      });

      await dbRepository.createAdminLog({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        adminToken: auth.user.token,
        adminName: auth.user.username,
        action: "organizer_application.submitted",
        target: userId,
        detailsJson: JSON.stringify({ applicationId: newApplicationId, applicantType, organizationName, previousAppId }),
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: isDraft
        ? "Application draft saved."
        : "Your organizer application has been submitted successfully and is pending admin review.",
      application: newApplication,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit organizer application" },
      { status: 500 },
    );
  }
}
