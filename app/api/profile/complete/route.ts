import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requireAuth } from "@/lib/auth-guard";
import { securityService } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth.user.token;

    let user = await dbRepository.getUserById(userId);
    if (!user) {
      user = await dbRepository.getUserByPhone(auth.user.phoneNumber || "");
    }

    const profile = await dbRepository.getProfile(userId);

    return NextResponse.json({
      success: true,
      user: user || null,
      profile: profile
        ? {
            token: profile.token,
            username: profile.username,
            phoneNumber: profile.phoneNumber,
            rating: profile.rating,
            marbles: profile.marbles,
            points: profile.points,
            role: profile.role,
            wins: profile.wins,
            losses: profile.losses,
            draws: profile.draws,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load profile details" },
      { status: 401 },
    );
  }
}

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
      dateOfBirth,
      username,
      password,
      confirmPassword,
      passcode,
      ghanaCardNumber,
      gender,
      avatarUrl,
      region,
      city,
      address,
      momoNetwork,
      referralCode,
    } = body;

    // Validate Password if provided
    const cleanPassword = typeof password === "string" ? password.trim() : typeof passcode === "string" ? passcode.trim() : "";
    const cleanConfirmPassword = typeof confirmPassword === "string" ? confirmPassword.trim() : "";

    if (cleanPassword) {
      if (cleanPassword.length < 4) {
        return NextResponse.json(
          { error: "Password must be at least 4 characters long." },
          { status: 400 },
        );
      }
      if (cleanConfirmPassword && cleanPassword !== cleanConfirmPassword) {
        return NextResponse.json(
          { error: "Passwords do not match. Please verify your password confirmation." },
          { status: 400 },
        );
      }
    }

    // Validate full legal name (Required)
    const cleanFullName = typeof fullName === "string" ? fullName.trim() : "";
    if (!cleanFullName || cleanFullName.length < 2) {
      return NextResponse.json(
        { error: "Full legal name is required (minimum 2 characters)." },
        { status: 400 },
      );
    }

    if (cleanFullName.length > 100) {
      return NextResponse.json(
        { error: "Full legal name cannot exceed 100 characters." },
        { status: 400 },
      );
    }

    // Validate Email format if provided
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json(
          { error: "Please provide a valid email address (e.g. player@example.com)." },
          { status: 400 },
        );
      }
    }

    // Validate Ghana Card if provided
    const cleanGhanaCard = typeof ghanaCardNumber === "string" ? ghanaCardNumber.trim() : "";
    if (cleanGhanaCard) {
      if (cleanGhanaCard.length < 6 || cleanGhanaCard.length > 30) {
        return NextResponse.json(
          { error: "Ghana Card ID number must be between 6 and 30 characters (e.g. GHA-123456789-0)." },
          { status: 400 },
        );
      }
    }

    // Validate Date of Birth and enforce 18+ requirement (Underage not permitted)
    if (!dateOfBirth) {
      return NextResponse.json(
        { error: "Date of birth is required." },
        { status: 400 },
      );
    }
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth format." },
        { status: 400 },
      );
    }
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (age < 18) {
      return NextResponse.json(
        { error: "Underage registration is not permitted. You must be at least 18 years old to participate on DAMII Arena." },
        { status: 400 },
      );
    }

    if (age > 120) {
      return NextResponse.json(
        { error: "Please enter a valid date of birth." },
        { status: 400 },
      );
    }

    // Validate that if a username is submitted, it cannot overwrite or mismatch the generated fruit-with-numbers gamer tag
    const FRUIT_GAMER_TAG_REGEX = /^[A-Z][a-z]+[0-9]{3,}$/i;
    const finalUsername = user.username || (username ? String(username).trim() : "");

    if (username && user.username && String(username).trim() !== user.username) {
      return NextResponse.json(
        { error: "Gamer Tag is uneditable and permanently assigned upon phone verification." },
        { status: 400 },
      );
    }

    if (finalUsername && !FRUIT_GAMER_TAG_REGEX.test(finalUsername) && !user.username) {
      return NextResponse.json(
        { error: "Gamer Tag must follow the fruit+number format (e.g. Lemon264, Apple743)." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    // Update user record - momoNumber is strictly locked to the verified phone number, username is preserved
    const updatedUser = await dbRepository.saveUser({
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: cleanFullName,
      email: cleanEmail || null,
      ghanaCardNumber: cleanGhanaCard || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : user.dateOfBirth,
      gender: gender !== undefined ? String(gender).trim() : (user.gender || "male"),
      avatarUrl: avatarUrl !== undefined ? String(avatarUrl).trim() : user.avatarUrl,
      region: region !== undefined ? String(region).trim() : (user.region || "Greater Accra"),
      city: city !== undefined ? String(city).trim() : user.city,
      address: address !== undefined ? String(address).trim() : user.address,
      momoNumber: user.phoneNumber, // Strictly locked to verified phone number
      momoNetwork: momoNetwork !== undefined ? String(momoNetwork).trim() : (user.momoNetwork || "MTN"),
      username: user.username || finalUsername,
      referralCode: referralCode !== undefined ? String(referralCode).trim() : user.referralCode,
      profileCompletedAt: now,
    });

    // Also sync username, phone, and password into profiles table
    let profile = await dbRepository.getProfile(userId);
    if (!profile) {
      profile = await dbRepository.createRegisteredProfile(
        userId,
        updatedUser.username || `player_${userId.slice(-6)}`,
        cleanPassword ? securityService.hashPassword(cleanPassword).hash : "registered_player",
        updatedUser.phoneNumber,
        updatedUser.role === "admin" ? "admin" : "user",
        cleanPassword ? securityService.hashPassword(cleanPassword).salt : undefined,
      );
    } else {
      if (updatedUser.username) {
        profile.username = updatedUser.username;
      }
      if (updatedUser.phoneNumber) {
        profile.phoneNumber = updatedUser.phoneNumber;
      }
      if (cleanPassword) {
        const { hash, salt } = securityService.hashPassword(cleanPassword);
        profile.passcode = hash;
        profile.passwordSalt = salt;
      }
      await dbRepository.saveProfile(profile);
    }

    return NextResponse.json({
      success: true,
      message: "Profile saved successfully",
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
