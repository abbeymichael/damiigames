import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth.user.token;

    // Fetch user record from users table
    let user = await dbRepository.getUserById(userId);
    if (!user) {
      // If user profile exists in profiles table but not in users table, initialize it
      user = await dbRepository.getUserByPhone(auth.user.phoneNumber || "");
      if (!user) {
        user = await dbRepository.saveUser({
          id: userId,
          phoneNumber: auth.user.phoneNumber || `user_${userId.slice(-6)}`,
          phoneVerifiedAt: new Date().toISOString(),
          username: auth.user.username,
          role: auth.user.role === "organizer" ? "organizer" : auth.user.role === "admin" || auth.user.role === "super_admin" ? "admin" : "player",
          createdAt: auth.user.createdAt || new Date().toISOString(),
        });
      }
    }

    // Require phone verification before completing profile
    if (!user.phoneVerifiedAt) {
      return NextResponse.json(
        { error: "Phone number verification required before completing profile." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      fullName,
      email,
      ghanaCardNumber,
      dateOfBirth,
      gender,
      avatarUrl,
      region,
      city,
      address,
      momoNumber,
      momoNetwork,
      username,
      referralCode,
    } = body;

    // Validate username uniqueness if changed
    if (username && username.trim()) {
      const cleanUsername = username.trim();
      const existingWithUsername = await dbRepository.getUserByUsername(cleanUsername);
      if (existingWithUsername && existingWithUsername.id !== user.id) {
        return NextResponse.json(
          { error: `Username '${cleanUsername}' is already taken. Please choose another.` },
          { status: 409 },
        );
      }

      // Also check platform profiles table for uniqueness
      const existingProfile = await dbRepository.findProfileByUsername(cleanUsername);
      if (existingProfile && existingProfile.token !== userId) {
        return NextResponse.json(
          { error: `Username '${cleanUsername}' is already taken. Please choose another.` },
          { status: 409 },
        );
      }
    }

    const now = new Date().toISOString();

    // Update user record - momoNumber is strictly locked to the verified phone number
    const updatedUser = await dbRepository.saveUser({
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: fullName !== undefined ? String(fullName).trim() : user.fullName,
      email: email !== undefined ? String(email).trim() : user.email,
      ghanaCardNumber: ghanaCardNumber !== undefined ? String(ghanaCardNumber).trim() : user.ghanaCardNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : user.dateOfBirth,
      gender: gender !== undefined ? String(gender).trim() : user.gender,
      avatarUrl: avatarUrl !== undefined ? String(avatarUrl).trim() : user.avatarUrl,
      region: region !== undefined ? String(region).trim() : user.region,
      city: city !== undefined ? String(city).trim() : user.city,
      address: address !== undefined ? String(address).trim() : user.address,
      momoNumber: user.phoneNumber, // Strictly locked to verified phone number
      momoNetwork: momoNetwork !== undefined ? String(momoNetwork).trim() : (user.momoNetwork || "MTN"),
      username: username !== undefined ? String(username).trim() : user.username,
      referralCode: referralCode !== undefined ? String(referralCode).trim() : user.referralCode,
      profileCompletedAt: now,
    });

    // Also sync username and profile data into profiles table
    const profile = await dbRepository.getProfile(userId);
    if (profile) {
      if (updatedUser.username) {
        profile.username = updatedUser.username;
      }
      if (updatedUser.phoneNumber) {
        profile.phoneNumber = updatedUser.phoneNumber;
      }
      await dbRepository.saveProfile(profile);
    }

    return NextResponse.json({
      success: true,
      message: "Profile completed successfully",
      user: updatedUser,
      profileCompleted: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete profile" },
      { status: 500 },
    );
  }
}
