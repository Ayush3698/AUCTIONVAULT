import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export const AVATAR_MAX_BYTES = 2_000_000;
export const DOCUMENT_MAX_BYTES = 8_000_000;
export const SELFIE_MAX_BYTES = 8_000_000;

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_DOCUMENT_MIMES = [...ALLOWED_IMAGE_MIMES, "application/pdf"];

export type DocumentSide = "front" | "front-and-back";

export const DOCUMENT_TYPES = [
  { id: "passport", label: "Passport" },
  { id: "national_id", label: "National ID" },
  { id: "government_id", label: "Government-Issued ID" },
  { id: "drivers_license", label: "Driver\u2019s License" },
  { id: "residence_permit", label: "Residence Permit" },
  { id: "other", label: "Other Government-Issued Document" },
] as const;

export type DocumentTypeId = (typeof DOCUMENT_TYPES)[number]["id"];

export type VerificationStage =
  | "NOT_STARTED"
  | "STEP_1_IN_PROGRESS"
  | "STEP_1_COMPLETED"
  | "STEP_2_IN_PROGRESS"
  | "DOCUMENT_SUBMITTED"
  | "DOCUMENT_VERIFIED"
  | "STEP_3_IN_PROGRESS"
  | "LIVENESS_COMPLETED"
  | "VERIFICATION_SUBMITTED"
  | "VERIFIED"
  | "VERIFICATION_FAILED"
  | "VERIFICATION_PENDING"
  | "VERIFICATION_REQUIRES_RETRY";

export const STAGE_SUBMITTED: VerificationStage = "VERIFICATION_SUBMITTED";
export const STAGE_PENDING: VerificationStage = "VERIFICATION_PENDING";

export interface CountryOption {
  name: string;
  iso2: string;
  dialCode: string;
  flag: string;
}

function flagFor(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/[A-Z]/g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

let regionNames: Intl.DisplayNames | null = null;
(() => {
  try {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    regionNames = null;
  }
})();

let supportedCountries: CountryOption[] | null = null;

export function getSupportedCountries(): CountryOption[] {
  if (supportedCountries) return supportedCountries;
  supportedCountries = getCountries()
    .map((iso2) => ({
      iso2,
      name: regionNames?.of(iso2) ?? iso2,
      dialCode: getCountryCallingCode(iso2),
      flag: flagFor(iso2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return supportedCountries;
}

export function getCountry(iso2: string): CountryOption | undefined {
  if (!iso2) return undefined;
  const code = iso2.toUpperCase();
  return getSupportedCountries().find((c) => c.iso2 === code);
}

export function validateDisplayName(value: string): {
  valid: boolean;
  error: string;
} {
  const v = value.trim();
  if (!v) return { valid: false, error: "Full name is required." };
  if (v.length < 2 || v.length > 80)
    return { valid: false, error: "Full name must be between 2 and 80 characters." };
  if (!/^[A-Za-z\u00C0-\u017F' \-]+$/.test(v))
    return {
      valid: false,
      error: "Full name can only contain letters, spaces, apostrophes and hyphens.",
    };
  if (!/[A-Za-z\u00C0-\u017F]/.test(v))
    return { valid: false, error: "Full name must contain letters." };
  return { valid: true, error: "" };
}

export function validateUsername(value: string): {
  valid: boolean;
  error: string;
} {
  const v = value.trim();
  if (!v) return { valid: false, error: "Username is required." };
  if (v.length < 3)
    return { valid: false, error: "Username must be at least 3 characters." };
  if (v.length > 30)
    return { valid: false, error: "Username must be 30 characters or fewer." };
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$/.test(v))
    return {
      valid: false,
      error:
        "Username can only contain letters, numbers, dots, underscores and hyphens, and must start and end with a letter or number.",
    };
  return { valid: true, error: "" };
}

export function validateEmail(value: string): {
  valid: boolean;
  error: string;
  normalized?: string;
} {
  const v = value.trim();
  if (!v) return { valid: false, error: "Email is required.", normalized: undefined };
  if (v.length > 254)
    return { valid: false, error: "Please enter a valid email address.", normalized: undefined };
  const re =
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
  if (/\s/.test(v) || !re.test(v))
    return { valid: false, error: "Please enter a valid email address.", normalized: undefined };
  return { valid: true, error: "", normalized: v.toLowerCase() };
}

export function validatePhone(
  input: string,
  countryCode: string
): {
  valid: boolean;
  error?: string;
  e164?: string;
  dialCode?: string;
  parsedCountry?: string;
} {
  const v = input.trim();
  if (!v) return { valid: false, error: "Phone number is required." };
  let parsed;
  if (v.startsWith("+")) {
    parsed = parsePhoneNumberFromString(v);
  } else {
    const code = (countryCode || "").toUpperCase();
    if (!code)
      return {
        valid: false,
        error: "Select a country for your phone number.",
      };
    parsed = parsePhoneNumberFromString(v, code as CountryCode);
  }
  if (!parsed || !parsed.isValid())
    return {
      valid: false,
      error: "Enter a valid phone number for the selected country.",
    };
  const parsedCountry = parsed.country ?? undefined;
  if (countryCode) {
    const expected = countryCode.toUpperCase();
    if (parsedCountry && parsedCountry !== expected)
      return {
        valid: false,
        error: "This number does not match the selected country.",
      };
  }
  return {
    valid: true,
    e164: parsed.number,
    dialCode: parsed.countryCallingCode,
    parsedCountry,
  };
}

export function validateDateOfBirth(value: string): {
  valid: boolean;
  error?: string;
} {
  const v = value.trim();
  if (!v) return { valid: true };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v))
    return { valid: false, error: "Enter a valid date of birth." };
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime()))
    return { valid: false, error: "Enter a valid date of birth." };
  if (d.getTime() > Date.now())
    return { valid: false, error: "Date of birth cannot be in the future." };
  if (d.getFullYear() < 1900)
    return { valid: false, error: "Enter a valid date of birth." };
  return { valid: true };
}

export interface BasicInfoInput {
  displayName: string;
  username: string;
  email: string;
  phoneRaw: string;
  phoneCountry: string;
  countryCode: string;
  dateOfBirth: string;
}

export function validateBasicInfo(input: BasicInfoInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = validateDisplayName(input.displayName);
  if (!name.valid) errors.displayName = name.error;
  const uname = validateUsername(input.username);
  if (!uname.valid) errors.username = uname.error;
  const mail = validateEmail(input.email);
  if (!mail.valid) errors.email = mail.error;
  const phone = validatePhone(input.phoneRaw, input.phoneCountry);
  if (!phone.valid) errors.phone = phone.error ?? "Enter a valid phone number.";
  if (!input.countryCode) errors.country = "Please select your country.";
  const dob = validateDateOfBirth(input.dateOfBirth);
  if (!dob.valid) errors.dateOfBirth = dob.error ?? "Enter a valid date of birth.";
  return errors;
}