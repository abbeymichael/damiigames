/**
 * DAMII Avatar System
 * System preset avatars, image validation, downscaling and SVG generator
 */

export interface SystemAvatar {
  id: string;
  name: string;
  tagline: string;
  theme: "gold" | "emerald" | "amber" | "cyan" | "ruby" | "purple";
  svgDataUri: string;
}

function encodeSvg(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const SYSTEM_AVATARS: SystemAvatar[] = [
  {
    id: "avatar-champion",
    name: "Gold Champion",
    tagline: "The Crowned Board Ruler",
    theme: "gold",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-champ" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#144435"/>
            <stop offset="100%" stop-color="#041c17"/>
          </radialGradient>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffe28a"/>
            <stop offset="50%" stop-color="#d6a735"/>
            <stop offset="100%" stop-color="#9a7114"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-champ)" stroke="#d6a735" stroke-width="3"/>
        <circle cx="50" cy="50" r="41" fill="none" stroke="#d6a735" stroke-dasharray="3 3" stroke-width="1" opacity="0.6"/>
        <!-- Crown -->
        <path d="M28 64 L24 40 L38 48 L50 32 L62 48 L76 40 L72 64 Z" fill="url(#gold-grad)" stroke="#fff" stroke-width="0.5"/>
        <circle cx="24" cy="38" r="3.5" fill="#ffe28a"/>
        <circle cx="50" cy="30" r="4.5" fill="#ffe28a"/>
        <circle cx="76" cy="38" r="3.5" fill="#ffe28a"/>
        <!-- Damii piece base -->
        <ellipse cx="50" cy="66" rx="24" ry="7" fill="url(#gold-grad)"/>
        <ellipse cx="50" cy="64" rx="20" ry="5" fill="#ffe28a" opacity="0.4"/>
        <circle cx="50" cy="56" r="3.5" fill="#041c17"/>
      </svg>
    `),
  },
  {
    id: "avatar-grandmaster",
    name: "Emerald Master",
    tagline: "Deep Strategic Genius",
    theme: "emerald",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-gm" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#0e4b37"/>
            <stop offset="100%" stop-color="#02140f"/>
          </radialGradient>
          <linearGradient id="em-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6ee7b7"/>
            <stop offset="50%" stop-color="#10b981"/>
            <stop offset="100%" stop-color="#047857"/>
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-gm)" stroke="#10b981" stroke-width="3"/>
        <polygon points="50,16 62,38 86,38 67,54 74,78 50,64 26,78 33,54 14,38 38,38" fill="url(#em-grad)" stroke="#d1fae5" stroke-width="1.5"/>
        <circle cx="50" cy="48" r="12" fill="#041c17" stroke="#10b981" stroke-width="2"/>
        <text x="50" y="53" font-family="serif" font-size="14" font-weight="900" fill="#6ee7b7" text-anchor="middle">10</text>
      </svg>
    `),
  },
  {
    id: "avatar-lion",
    name: "Golden Lion",
    tagline: "Apex Predator of the Arena",
    theme: "gold",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-lion" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#2d1b06"/>
            <stop offset="100%" stop-color="#0a0501"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-lion)" stroke="#f59e0b" stroke-width="3"/>
        <!-- Mane -->
        <circle cx="50" cy="50" r="32" fill="#d97706" opacity="0.6"/>
        <polygon points="50,18 56,28 68,22 68,34 80,34 74,45 84,52 74,60 80,70 68,70 64,80 50,74 36,80 32,70 20,70 26,60 16,52 26,45 20,34 32,34 32,22 44,28" fill="#b45309"/>
        <!-- Face -->
        <circle cx="50" cy="52" r="20" fill="#fcd34d"/>
        <!-- Ears -->
        <circle cx="34" cy="38" r="6" fill="#b45309"/>
        <circle cx="34" cy="38" r="3.5" fill="#fcd34d"/>
        <circle cx="66" cy="38" r="6" fill="#b45309"/>
        <circle cx="66" cy="38" r="3.5" fill="#fcd34d"/>
        <!-- Eyes -->
        <ellipse cx="42" cy="48" rx="3.5" ry="4.5" fill="#78350f"/>
        <circle cx="43" cy="47" r="1.5" fill="#fff"/>
        <ellipse cx="58" cy="48" rx="3.5" ry="4.5" fill="#78350f"/>
        <circle cx="59" cy="47" r="1.5" fill="#fff"/>
        <!-- Nose and mouth -->
        <polygon points="46,55 54,55 50,60" fill="#78350f"/>
        <path d="M46 62 Q50 66 54 62" stroke="#78350f" stroke-width="2" fill="none"/>
      </svg>
    `),
  },
  {
    id: "avatar-falcon",
    name: "Swift Falcon",
    tagline: "Rapid Multi-Jump Striker",
    theme: "cyan",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-falc" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#0c2e3d"/>
            <stop offset="100%" stop-color="#021017"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-falc)" stroke="#38bdf8" stroke-width="3"/>
        <!-- Wings & Head -->
        <path d="M50 20 C62 30 82 40 86 64 C70 56 58 58 50 78 C42 58 30 56 14 64 C18 40 38 30 50 20 Z" fill="#0284c7" stroke="#e0f2fe" stroke-width="1.5"/>
        <path d="M50 24 L56 36 L50 42 L44 36 Z" fill="#38bdf8"/>
        <!-- Beak -->
        <polygon points="47,40 53,40 50,50" fill="#facc15"/>
        <!-- Eyes -->
        <circle cx="43" cy="34" r="3" fill="#facc15"/>
        <circle cx="43" cy="34" r="1.5" fill="#021017"/>
        <circle cx="57" cy="34" r="3" fill="#facc15"/>
        <circle cx="57" cy="34" r="1.5" fill="#021017"/>
      </svg>
    `),
  },
  {
    id: "avatar-tiger",
    name: "Emerald Tiger",
    tagline: "Fierce Endgame Predator",
    theme: "emerald",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-tig" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#021f17"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-tig)" stroke="#34d399" stroke-width="3"/>
        <circle cx="50" cy="52" r="26" fill="#059669"/>
        <!-- Ears -->
        <polygon points="26,30 38,36 30,48" fill="#047857"/>
        <polygon points="74,30 62,36 70,48" fill="#047857"/>
        <!-- Stripes -->
        <path d="M50 28 L50 38 M38 42 L46 45 M62 42 L54 45 M34 52 L42 54 M66 52 L58 54" stroke="#022c22" stroke-width="3" stroke-linecap="round"/>
        <!-- Eyes -->
        <ellipse cx="40" cy="48" rx="4" ry="5" fill="#fde047"/>
        <circle cx="40" cy="48" r="2" fill="#022c22"/>
        <ellipse cx="60" cy="48" rx="4" ry="5" fill="#fde047"/>
        <circle cx="60" cy="48" r="2" fill="#022c22"/>
        <!-- Snout -->
        <polygon points="46,58 54,58 50,64" fill="#fbcfe8"/>
        <circle cx="45" cy="67" r="3.5" fill="#a7f3d0"/>
        <circle cx="55" cy="67" r="3.5" fill="#a7f3d0"/>
      </svg>
    `),
  },
  {
    id: "avatar-crystal-marble",
    name: "Crystal Marble",
    tagline: "Glittering Token of Fortune",
    theme: "gold",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-marb" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#fef08a"/>
            <stop offset="70%" stop-color="#d6a735"/>
            <stop offset="100%" stop-color="#785408"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="#041c17" stroke="#d6a735" stroke-width="2"/>
        <circle cx="50" cy="50" r="36" fill="url(#bg-marb)" stroke="#fff" stroke-width="2"/>
        <path d="M26 44 C34 32 64 30 72 46 C60 62 34 60 26 44 Z" fill="none" stroke="#fff" stroke-width="3" opacity="0.6"/>
        <circle cx="40" cy="38" r="6" fill="#fff" opacity="0.8"/>
        <circle cx="46" cy="34" r="2.5" fill="#fff" opacity="0.9"/>
      </svg>
    `),
  },
  {
    id: "avatar-phoenix",
    name: "Solar Phoenix",
    tagline: "Unstoppable Comeback Specialist",
    theme: "ruby",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-phx" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#450a0a"/>
            <stop offset="100%" stop-color="#180303"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-phx)" stroke="#ef4444" stroke-width="3"/>
        <path d="M50 14 C68 28 84 46 76 74 C64 64 58 66 50 82 C42 66 36 64 24 74 C16 46 32 28 50 14 Z" fill="#dc2626" stroke="#fca5a5" stroke-width="1.5"/>
        <path d="M50 26 C60 36 70 48 64 66 C56 58 50 68 50 68 C50 68 44 58 36 66 C30 48 40 36 50 26 Z" fill="#f59e0b"/>
        <circle cx="50" cy="40" r="7" fill="#fef08a"/>
        <polygon points="46,44 54,44 50,54" fill="#7f1d1d"/>
      </svg>
    `),
  },
  {
    id: "avatar-knight",
    name: "Draughts Knight",
    tagline: "Armored Board Warrior",
    theme: "cyan",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-kni" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#020617"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-kni)" stroke="#94a3b8" stroke-width="3"/>
        <!-- Helmet -->
        <path d="M30 68 L30 44 C30 28 40 20 50 20 C60 20 70 28 70 44 L70 68 Z" fill="#64748b" stroke="#f8fafc" stroke-width="1.5"/>
        <!-- Visor slit -->
        <rect x="36" y="42" width="28" height="6" rx="3" fill="#0f172a"/>
        <!-- Breath holes -->
        <circle cx="42" cy="56" r="1.5" fill="#0f172a"/>
        <circle cx="50" cy="56" r="1.5" fill="#0f172a"/>
        <circle cx="58" cy="56" r="1.5" fill="#0f172a"/>
        <circle cx="46" cy="62" r="1.5" fill="#0f172a"/>
        <circle cx="54" cy="62" r="1.5" fill="#0f172a"/>
        <!-- Plume -->
        <path d="M50 20 C50 12 58 8 68 14 C62 20 54 20 50 20 Z" fill="#d6a735"/>
      </svg>
    `),
  },
  {
    id: "avatar-queen",
    name: "Regal Queen",
    tagline: "Empress of 100 Squares",
    theme: "purple",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-que" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#3b0764"/>
            <stop offset="100%" stop-color="#140224"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-que)" stroke="#c084fc" stroke-width="3"/>
        <!-- Tiara -->
        <path d="M26 62 L22 44 L36 50 L50 30 L64 50 L78 44 L74 62 Z" fill="#a855f7" stroke="#f3e8ff" stroke-width="1.5"/>
        <circle cx="50" cy="28" r="4" fill="#f43f5e"/>
        <circle cx="22" cy="42" r="3" fill="#f43f5e"/>
        <circle cx="78" cy="42" r="3" fill="#f43f5e"/>
        <circle cx="36" cy="48" r="2.5" fill="#facc15"/>
        <circle cx="64" cy="48" r="2.5" fill="#facc15"/>
        <!-- Base neck/jewel -->
        <ellipse cx="50" cy="66" rx="20" ry="6" fill="#7e22ce"/>
        <circle cx="50" cy="56" r="4" fill="#facc15"/>
      </svg>
    `),
  },
  {
    id: "avatar-sage",
    name: "Mystic Sage",
    tagline: "Keeper of Ancient Draughts Lore",
    theme: "purple",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-sage" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#090514"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-sage)" stroke="#818cf8" stroke-width="3"/>
        <!-- Hat / Hood -->
        <path d="M20 74 L50 18 L80 74 Z" fill="#4338ca" stroke="#c7d2fe" stroke-width="1.5"/>
        <!-- Beard / Face -->
        <path d="M34 56 C34 76 50 82 50 82 C50 82 66 76 66 56 Z" fill="#e0e7ff"/>
        <!-- Star emblem -->
        <polygon points="50,34 53,42 61,42 55,47 57,55 50,50 43,55 45,47 39,42 47,42" fill="#facc15"/>
      </svg>
    `),
  },
  {
    id: "avatar-kente",
    name: "Sun Tactician",
    tagline: "Inspired by Rich Gold Coast Heritage",
    theme: "amber",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-ken" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#3d1d05"/>
            <stop offset="100%" stop-color="#0f0701"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-ken)" stroke="#d97706" stroke-width="3"/>
        <!-- Kente geometric diamond pattern -->
        <polygon points="50,18 78,50 50,82 22,50" fill="#b45309" stroke="#fde68a" stroke-width="2"/>
        <polygon points="50,28 68,50 50,72 32,50" fill="#15803d" stroke="#fde68a" stroke-width="1.5"/>
        <polygon points="50,38 58,50 50,62 42,50" fill="#d97706"/>
        <circle cx="50" cy="50" r="5" fill="#fef08a"/>
      </svg>
    `),
  },
  {
    id: "avatar-boardmaster",
    name: "10x10 Strategist",
    tagline: "The Master of Diagonal Traps",
    theme: "emerald",
    svgDataUri: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <defs>
          <radialGradient id="bg-bm" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#021c17"/>
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#bg-bm)" stroke="#059669" stroke-width="3"/>
        <!-- Checkerboard grid pattern -->
        <g opacity="0.85">
          <rect x="26" y="26" width="12" height="12" fill="#047857"/>
          <rect x="38" y="26" width="12" height="12" fill="#a7f3d0"/>
          <rect x="50" y="26" width="12" height="12" fill="#047857"/>
          <rect x="62" y="26" width="12" height="12" fill="#a7f3d0"/>
          <rect x="26" y="38" width="12" height="12" fill="#a7f3d0"/>
          <rect x="38" y="38" width="12" height="12" fill="#047857"/>
          <rect x="50" y="38" width="12" height="12" fill="#a7f3d0"/>
          <rect x="62" y="38" width="12" height="12" fill="#047857"/>
          <rect x="26" y="50" width="12" height="12" fill="#047857"/>
          <rect x="38" y="50" width="12" height="12" fill="#a7f3d0"/>
          <rect x="50" y="50" width="12" height="12" fill="#047857"/>
          <rect x="62" y="50" width="12" height="12" fill="#a7f3d0"/>
          <rect x="26" y="62" width="12" height="12" fill="#a7f3d0"/>
          <rect x="38" y="62" width="12" height="12" fill="#047857"/>
          <rect x="50" y="62" width="12" height="12" fill="#a7f3d0"/>
          <rect x="62" y="62" width="12" height="12" fill="#047857"/>
        </g>
        <circle cx="50" cy="50" r="14" fill="#d6a735" stroke="#fff" stroke-width="2"/>
        <circle cx="50" cy="50" r="8" fill="#06261f"/>
      </svg>
    `),
  },
];

export const SYSTEM_AVATARS_MAP = new Map<string, SystemAvatar>(
  SYSTEM_AVATARS.map((a) => [a.id, a])
);

/**
 * Returns the best image URL or SVG data URI for a user
 */
export function getAvatarUrl(avatarUrl?: string | null, username?: string | null): string {
  if (avatarUrl && avatarUrl.trim()) {
    const clean = avatarUrl.trim();
    if (SYSTEM_AVATARS_MAP.has(clean)) {
      return SYSTEM_AVATARS_MAP.get(clean)!.svgDataUri;
    }
    return clean;
  }

  // Generate fallback letter avatar SVG
  const name = (username || "Player").trim();
  const letter = (name[0] || "P").toUpperCase();
  
  // Pick deterministic palette based on name string sum
  const charSum = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palettes = [
    { bg: "#06261f", border: "#d6a735", text: "#d6a735" },
    { bg: "#0c3b2e", border: "#10b981", text: "#a7f3d0" },
    { bg: "#1e1b4b", border: "#818cf8", text: "#c7d2fe" },
    { bg: "#3d1d05", border: "#f59e0b", text: "#fde68a" },
    { bg: "#1f2937", border: "#38bdf8", text: "#bae6fd" },
  ];
  const p = palettes[charSum % palettes.length];

  const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="48" fill="${p.bg}" stroke="${p.border}" stroke-width="3"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="${p.border}" stroke-dasharray="3 3" opacity="0.4"/>
      <text x="50" y="62" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" fill="${p.text}" text-anchor="middle">${letter}</text>
    </svg>
  `;
  return encodeSvg(fallbackSvg);
}

/**
 * Validates uploaded image file size and MIME type
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || "unknown"}). Allowed formats: JPG, PNG, WEBP, GIF.`,
    };
  }

  if (file.size > MAX_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image file is too large (${sizeMb} MB). Maximum allowed size is 2.0 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Resizes and downscales a file to a crisp, lightweight data URL
 */
export async function resizeImageToDataUrl(
  file: File,
  maxDimension = 200,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(event.target?.result || ""));
          return;
        }

        // Draw smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP / JPEG
        const dataUrl = canvas.toDataURL("image/webp", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to read image file data."));
      img.src = String(event.target?.result || "");
    };
    reader.onerror = () => reject(new Error("Failed to upload image."));
    reader.readAsDataURL(file);
  });
}
