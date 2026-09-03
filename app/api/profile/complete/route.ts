import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { requireAuth } from "@/lib/auth-guard";
import { securityService } from "@/lib/security";
import { validateAndFormatMomoPhone } from "@/lib/momo-validation";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const userId = auth?.user?.token || auth?.token;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await dbRepository.getUserById(userId);
    if (!user && auth?.user?.phoneNumber) {
      user = await dbRepository.getUserByPhone(auth.user.phoneNumber);
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
    const userId = auth?.user?.token || auth?.token;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user record from users table
    let user = await dbRepository.getUserById(userId);
    if (!user) {
      // If user profile exists in profiles table but not in users table, initialize it
      user = await dbRepository.getUserByPhone(auth?.user?.phoneNumber || "");
      if (!user) {
        user = await dbRepository.saveUser({
          id: userId,
          phoneNumber: auth?.user?.phoneNumber || `user_${userId.slice(-6)}`,
          phoneVerifiedAt: new Date().toISOString(),
          username: auth?.user?.username || "Player",
          role: auth?.user?.role === "organizer" ? "organizer" : auth?.user?.role === "admin" || auth?.user?.role === "super_admin" ? "admin" : "player",
          createdAt: auth?.user?.createdAt || new Date().toISOString(),
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
      accountType,
      organizationName,
      orgBio,
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

    // Validate username with length check & uniqueness check (allows editing)
    let finalUsername = user.username || "";
    const cleanUsernameInput = username !== undefined ? String(username).trim() : "";

    if (cleanUsernameInput) {
      // Length check (3 - 25 characters)
      if (cleanUsernameInput.length < 3 || cleanUsernameInput.length > 25) {
        return NextResponse.json(
          { error: "Username must be between 3 and 25 characters." },
          { status: 400 },
        );
      }
      // Character format check
      if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsernameInput)) {
        return NextResponse.json(
          { error: "Username can only contain letters, numbers, underscores, and hyphens." },
          { status: 400 },
        );
      }
      // Uniqueness check if different from current username
      if (cleanUsernameInput !== user.username) {
        const existingWithUsername = await dbRepository.findProfileByUsername(cleanUsernameInput);
        if (existingWithUsername && existingWithUsername.token !== userId) {
          return NextResponse.json(
            { error: `Username "${cleanUsernameInput}" is already taken. Please choose another username.` },
            { status: 400 },
          );
        }
        const existingUserWithUsername = await dbRepository.getUserByUsername(cleanUsernameInput);
        if (existingUserWithUsername && existingUserWithUsername.id !== userId) {
          return NextResponse.json(
            { error: `Username "${cleanUsernameInput}" is already taken. Please choose another username.` },
            { status: 400 },
          );
        }
      }
      finalUsername = cleanUsernameInput;
    } else if (!finalUsername) {
      finalUsername = `Player_${userId.slice(-6)}`;
    }

    // Validate MoMo Network against user's phone number prefix
    const targetMomoNetwork = momoNetwork !== undefined ? String(momoNetwork).trim() : (user.momoNetwork || undefined);
    const momoCheck = validateAndFormatMomoPhone(user.phoneNumber, targetMomoNetwork);
    if (!momoCheck.isValid) {
      return NextResponse.json(
        { error: momoCheck.error || `Invalid Mobile Money network for phone number ${user.phoneNumber}.` },
        { status: 400 }
      );
    }
    const finalMomoNetwork = momoCheck.detectedProvider;

    const now = new Date().toISOString();

    // Update user record - momoNumber is strictly locked to the verified phone number, username is updated
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
      momoNetwork: finalMomoNetwork,
      username: finalUsername,
      referralCode: referralCode !== undefined ? String(referralCode).trim() : user.referralCode,
      profileCompletedAt: now,
    });

    // Also sync username, phone, avatar, and password into profiles table
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
      if (updatedUser.avatarUrl) {
        profile.avatarUrl = updatedUser.avatarUrl;
        await dbRepository.saveProfile(profile);
      }
    } else {
      if (updatedUser.username) {
        profile.username = updatedUser.username;
      }
      if (updatedUser.phoneNumber) {
        profile.phoneNumber = updatedUser.phoneNumber;
      }
      if (updatedUser.avatarUrl !== undefined) {
        profile.avatarUrl = updatedUser.avatarUrl;
      }
      if (cleanPassword) {
        const { hash, salt } = securityService.hashPassword(cleanPassword);
        profile.passcode = hash;
        profile.passwordSalt = salt;
      }
      await dbRepository.saveProfile(profile);
    }

    // If registering as organizer, initialize organizer profile & application
    let organizerProfile = null;
    if (accountType === "organizer" || organizationName) {
      const orgName = String(organizationName || `${finalUsername} Tournaments`).trim();
      const bioText = orgBio ? String(orgBio).trim() : `Tournament Facilitator & Organizer account for ${finalUsername}`;

      organizerProfile = await dbRepository.saveOrganizerProfile({
        userId,
        username: finalUsername,
        status: "pending",
        requestedAt: now,
        organizationName: orgName,
        bio: bioText,
        contactPhone: updatedUser.phoneNumber,
      });

      const existingApp = await dbRepository.getOrganizerApplicationByUserId(userId);
      if (existingApp) {
        await dbRepository.updateOrganizerApplication(existingApp.id, {
          organizationName: orgName,
          priorExperience: bioText,
          status: "pending",
        });
      } else {
        await dbRepository.createOrganizerApplication({
          id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          applicantType: "individual",
          organizationName: orgName,
          ghanaCardFrontUrl: "https://damii.app/docs/gh-card-front.png",
          ghanaCardBackUrl: "https://damii.app/docs/gh-card-back.png",
          selfieUrl: "https://damii.app/docs/selfie.png",
          physicalAddress: cleanFullName || "Ghana",
          proofOfAddressUrl: "https://damii.app/docs/proof-of-address.pdf",
          intendedGameTypes: JSON.stringify(["damii_10x10"]),
          priorExperience: bioText,
          termsAcceptedAt: now,
          status: "pending",
          createdAt: now,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile saved successfully",
      user: updatedUser,
      profileCompleted: true,
      accountType: accountType || "player",
      organizerProfile,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete profile" },
      { status: 500 },
    );
  }
}
