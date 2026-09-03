/**
 * Ghana Mobile Money (MoMo) Telecom Provider Validation & Prefix Standards
 * 
 * Supports:
 *  - MTN Ghana: 024, 025, 053, 054, 055, 059
 *  - Telecel Ghana (Vodafone): 020, 050
 *  - AT Ghana (AirtelTigo): 026, 027, 056, 057
 */

export type GhanaMomoProvider = "MTN" | "Telecel" | "AT";

export interface MomoValidationResult {
  isValid: boolean;
  nationalFormat: string;
  internationalFormat: string;
  detectedProvider: GhanaMomoProvider | "Unknown";
  error?: string;
}

export const GHANA_PREFIX_MAPPINGS: Record<string, { provider: GhanaMomoProvider; name: string }> = {
  // MTN Ghana
  "024": { provider: "MTN", name: "MTN Mobile Money" },
  "025": { provider: "MTN", name: "MTN Mobile Money" },
  "053": { provider: "MTN", name: "MTN Mobile Money" },
  "054": { provider: "MTN", name: "MTN Mobile Money" },
  "055": { provider: "MTN", name: "MTN Mobile Money" },
  "059": { provider: "MTN", name: "MTN Mobile Money" },

  // Telecel Ghana (formerly Vodafone Ghana)
  "020": { provider: "Telecel", name: "Telecel Cash" },
  "050": { provider: "Telecel", name: "Telecel Cash" },

  // AT Ghana (AirtelTigo)
  "026": { provider: "AT", name: "AT Money" },
  "027": { provider: "AT", name: "AT Money" },
  "056": { provider: "AT", name: "AT Money" },
  "057": { provider: "AT", name: "AT Money" },
};

export const PROVIDER_DISPLAY_NAMES: Record<GhanaMomoProvider, string> = {
  MTN: "MTN Mobile Money",
  Telecel: "Telecel Cash (Vodafone)",
  AT: "AT Money (AirtelTigo)",
};

/**
 * Strips formatting and normalizes +233 / 233 / 00233 to national 0XXXXXXXXX format.
 */
export function normalizeGhanaPhoneNumber(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  let clean = rawPhone.replace(/[\s\-\(\)\.]/g, "").trim();
  if (clean.startsWith("+233")) {
    clean = "0" + clean.slice(4);
  } else if (clean.startsWith("00233")) {
    clean = "0" + clean.slice(5);
  } else if (clean.startsWith("233") && clean.length === 12) {
    clean = "0" + clean.slice(3);
  }
  return clean;
}

/**
 * Detect telecom carrier from 3-digit Ghana national prefix.
 */
export function detectGhanaTelecomProvider(rawPhone: string): {
  prefix: string;
  provider: GhanaMomoProvider | "Unknown";
  providerName: string;
  isRecognized: boolean;
} {
  const clean = normalizeGhanaPhoneNumber(rawPhone);
  if (clean.length < 3) {
    return { prefix: "", provider: "Unknown", providerName: "Unknown Carrier", isRecognized: false };
  }
  const prefix = clean.slice(0, 3);
  const match = GHANA_PREFIX_MAPPINGS[prefix];
  if (match) {
    return { prefix, provider: match.provider, providerName: match.name, isRecognized: true };
  }
  return { prefix, provider: "Unknown", providerName: "Unrecognized Carrier", isRecognized: false };
}

/**
 * Validates 10-digit Ghana mobile number and enforces network prefix compatibility.
 */
export function validateAndFormatMomoPhone(
  rawPhone: string,
  provider?: string
): MomoValidationResult {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      nationalFormat: "",
      internationalFormat: "",
      detectedProvider: "Unknown",
      error: "Mobile Money phone number is required.",
    };
  }

  const clean = normalizeGhanaPhoneNumber(rawPhone);

  const genericGhanaRegex = /^0[235][0-9]{8}$/;
  if (!genericGhanaRegex.test(clean) || clean.length !== 10) {
    return {
      isValid: false,
      nationalFormat: clean,
      internationalFormat: clean.length === 10 ? `+233${clean.slice(1)}` : "",
      detectedProvider: "Unknown",
      error: `Invalid Ghana Mobile Money phone number format ("${rawPhone}"). Phone must be a valid 10-digit Ghana mobile number (e.g. 024XXXXXXX, 020XXXXXXX, 026XXXXXXX) or international (+233) format.`,
    };
  }

  const { prefix, provider: detectedProvider, providerName, isRecognized } = detectGhanaTelecomProvider(clean);

  if (!isRecognized || detectedProvider === "Unknown") {
    return {
      isValid: false,
      nationalFormat: clean,
      internationalFormat: `+233${clean.slice(1)}`,
      detectedProvider: "Unknown",
      error: `Phone prefix "${prefix}" is not a recognized Ghana Mobile Money prefix. Valid prefixes are MTN (024, 025, 053, 054, 055, 059), Telecel (020, 050), and AT (026, 027, 056, 057).`,
    };
  }

  if (provider) {
    const pUpper = provider.toUpperCase().trim();
    if ((pUpper.includes("VOD") || pUpper.includes("TELECEL")) && detectedProvider !== "Telecel") {
      return {
        isValid: false,
        nationalFormat: clean,
        internationalFormat: `+233${clean.slice(1)}`,
        detectedProvider,
        error: `Phone prefix "${prefix}" belongs to ${detectedProvider}, but Telecel/Vodafone Cash was specified as the destination network.`,
      };
    }
    if ((pUpper.includes("TIGO") || pUpper.includes("AIRTEL") || pUpper.includes("ATL") || pUpper === "AT") && detectedProvider !== "AT") {
      return {
        isValid: false,
        nationalFormat: clean,
        internationalFormat: `+233${clean.slice(1)}`,
        detectedProvider,
        error: `Phone prefix "${prefix}" belongs to ${detectedProvider}, but AT (AirtelTigo) Money was specified as the destination network.`,
      };
    }
    if (pUpper.includes("MTN") && detectedProvider !== "MTN") {
      return {
        isValid: false,
        nationalFormat: clean,
        internationalFormat: `+233${clean.slice(1)}`,
        detectedProvider,
        error: `Phone prefix "${prefix}" belongs to ${detectedProvider}, but MTN Mobile Money was specified as the destination network.`,
      };
    }
  }

  return {
    isValid: true,
    nationalFormat: clean,
    internationalFormat: `+233${clean.slice(1)}`,
    detectedProvider,
  };
}
