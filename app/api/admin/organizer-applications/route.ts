import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requirePermission } from "@/lib/auth-guard";
import { OrganizerApplicationStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePermission(req, "manage_organizers");

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as OrganizerApplicationStatus | null;

    const applications = await dbRepository.listOrganizerApplications(statusParam || undefined);

    // Enrich with applicant user & profile details for context
    const enriched = await Promise.all(
      applications.map(async (app) => {
        const user = await dbRepository.getUserById(app.userId);
        const profile = await dbRepository.getProfile(app.userId);
        return {
          ...app,
          user: user
            ? {
                id: user.id,
                phoneNumber: user.phoneNumber,
                fullName: user.fullName,
                email: user.email,
                username: user.username,
                role: user.role,
                phoneVerifiedAt: user.phoneVerifiedAt,
                profileCompletedAt: user.profileCompletedAt,
                createdAt: user.createdAt,
              }
            : null,
          profile: profile
            ? {
                token: profile.token,
                username: profile.username,
                rating: profile.rating,
                wins: profile.wins,
                losses: profile.losses,
                draws: profile.draws,
                marbles: profile.marbles,
                points: profile.points,
                role: profile.role,
                status: profile.status,
                createdAt: profile.createdAt,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      applications: enriched,
      count: enriched.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch organizer applications" },
      { status: 500 },
    );
  }
}
