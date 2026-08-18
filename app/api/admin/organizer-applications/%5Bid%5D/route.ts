import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requirePermission } from "@/lib/auth-guard";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission(req, "manage_organizers");
    const { id } = await context.params;

    const application = await dbRepository.getOrganizerApplication(id);
    if (!application) {
      return NextResponse.json({ error: "Organizer application not found" }, { status: 404 });
    }

    const user = await dbRepository.getUserById(application.userId);
    const profile = await dbRepository.getProfile(application.userId);

    // Calculate account age
    const createdAtTime = new Date(profile?.createdAt || user?.createdAt || application.createdAt).getTime();
    const daysActive = Math.max(0, Math.floor((Date.now() - createdAtTime) / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      application,
      applicantContext: {
        user: user || null,
        profile: profile
          ? {
              token: profile.token,
              username: profile.username,
              rating: profile.rating,
              wins: profile.wins,
              losses: profile.losses,
              draws: profile.draws,
              totalMatches: profile.wins + profile.losses + profile.draws,
              marbles: profile.marbles,
              points: profile.points,
              role: profile.role,
              status: profile.status,
              createdAt: profile.createdAt,
              daysActive,
            }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch organizer application details" },
      { status: 500 },
    );
  }
}
