"use client";

import { useRef, useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  AtSign,
  Calendar,
  Camera,
  Globe,
  ImagePlus,
  Mail,
  Phone,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CountrySelect, inputBase } from "@/components/profile/verification-form";
import { cn } from "@/lib/utils";
import { formatBytes, sniffFile, fileToDataURL, COVER_MAX_BYTES } from "@/lib/media";
import {
  ALLOWED_IMAGE_MIMES,
  AVATAR_MAX_BYTES,
  getCountry,
  validateEmail,
  validatePhone,
  validateUsername,
  validateDateOfBirth,
  validateDisplayName,
} from "@/lib/verify";
import type { Profile } from "@/lib/types";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (next: Profile) => void;
  profile: Profile;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
      {children}
    </span>
  );
}

function splitPhoneInput(e164: string | undefined, fallbackCountry: string): { raw: string; country: string } {
  const fallback = fallbackCountry || "";
  if (!e164) return { raw: "", country: fallback };
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed?.isValid()) return { raw: e164, country: fallback };
  return { raw: parsed.nationalNumber, country: parsed.country ?? fallback };
}

export function EditProfileModal({ open, onClose, onSave, profile }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email ?? "");
  const [countryCode, setCountryCode] = useState(profile.countryCode);
  const [phoneCountry, setPhoneCountry] = useState(
    () => splitPhoneInput(profile.phoneE164, profile.phoneCountry ?? profile.countryCode).country
  );
  const [phoneRaw, setPhoneRaw] = useState(
    () => splitPhoneInput(profile.phoneE164, profile.phoneCountry ?? profile.countryCode).raw
  );
  const [dob, setDob] = useState(profile.dateOfBirth ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatar, setAvatar] = useState(profile.avatar);
  const [coverImage, setCoverImage] = useState(profile.coverImage ?? "");
  const [imageError, setImageError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setDisplayName(profile.displayName);
      setUsername(profile.username);
      setEmail(profile.email ?? "");
      setCountryCode(profile.countryCode);
      const phoneParts = splitPhoneInput(profile.phoneE164, profile.phoneCountry ?? profile.countryCode);
      setPhoneCountry(phoneParts.country);
      setPhoneRaw(phoneParts.raw);
      setDob(profile.dateOfBirth ?? "");
      setBio(profile.bio ?? "");
      setAvatar(profile.avatar);
      setCoverImage(profile.coverImage ?? "");
      setImageError(null);
      setShowErrors(false);
    }
  }

  const handleAvatar = async (file: File | undefined) => {
    setImageError(null);
    if (!file) return;
    const sniffed = await sniffFile(file);
    if (!sniffed || !ALLOWED_IMAGE_MIMES.includes(sniffed)) {
      setImageError("Please choose a JPG, PNG or WEBP image for your profile photo.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setImageError(`Profile photo is too large (max ${formatBytes(AVATAR_MAX_BYTES)}).`);
      return;
    }
    try {
      setAvatar(await fileToDataURL(file));
    } catch {
      setImageError("Could not read the image. Please try again.");
    }
  };

  const handleCover = async (file: File | undefined) => {
    setImageError(null);
    if (!file) return;
    const sniffed = await sniffFile(file);
    if (!sniffed || !ALLOWED_IMAGE_MIMES.includes(sniffed)) {
      setImageError("Please choose a JPG, PNG or WEBP image for your cover.");
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      setImageError(`Cover image is too large (max ${formatBytes(COVER_MAX_BYTES)}).`);
      return;
    }
    try {
      setCoverImage(await fileToDataURL(file));
    } catch {
      setImageError("Could not read the image. Please try again.");
    }
  };

  const name = validateDisplayName(displayName);
  const uname = validateUsername(username);
  const mail = validateEmail(email);
  const phone = phoneRaw.trim() ? validatePhone(phoneRaw, phoneCountry) : { valid: true };
  const dobCheck = validateDateOfBirth(dob);
  const errors: Record<string, string> = {};
  if (!name.valid) errors.displayName = name.error;
  if (!uname.valid) errors.username = uname.error;
  if (!mail.valid) errors.email = mail.error;
  if (phoneRaw.trim() && !phone.valid) errors.phone = phone.error ?? "Enter a valid phone number.";
  if (!dobCheck.valid) errors.dateOfBirth = dobCheck.error ?? "Enter a valid date of birth.";
  if (!countryCode) errors.country = "Please select your country.";

  const err = (key: string) => (showErrors && errors[key] ? errors[key] : "");

  const handleSave = () => {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    const country = countryCode ? getCountry(countryCode) : undefined;
    const parsedPhone = phoneRaw.trim() && phone.valid ? phone.e164 : undefined;
    onSave({
      ...profile,
      displayName: displayName.trim(),
      username: username.trim(),
      email: mail.normalized ?? email.trim(),
      country: country?.name ?? profile.country,
      countryCode,
      phone: parsedPhone ?? profile.phone,
      phoneE164: parsedPhone ?? profile.phoneE164,
      phoneCountry: phoneRaw.trim() && phone.valid ? phoneCountry : profile.phoneCountry,
      dateOfBirth: dob || profile.dateOfBirth,
      bio: bio.trim(),
      avatar,
      coverImage: coverImage || undefined,
    });
    onClose();
  };

  const fieldInput = (hasError?: string) =>
    cn(
      inputBase,
      hasError && "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
    );

  return (
    <Modal open={open} onClose={onClose} className="max-w-[calc(100vw-1.5rem)] sm:max-w-2xl">
      <div className="flex max-h-[calc(100dvh-2.5rem)] flex-col sm:max-h-[calc(100dvh-3.5rem)]">
        <ModalHeader className="mt-1">
          <ModalTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#c8a44e]" />
            Edit Profile
          </ModalTitle>
          <ModalDescription>
            Update your public profile information. Your wallet address and reputation are never
            changed here.
          </ModalDescription>
        </ModalHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-1">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-800/60 text-xl text-[#c8a44e]">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="Profile photo" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-7 w-7" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    handleAvatar(f);
                  }}
                />
              </div>
              <div className="text-sm text-zinc-500">
                <p className="font-medium text-zinc-300">Profile photo</p>
                <p>JPG, PNG or WEBP - up to 2 MB.</p>
                <button
                  type="button"
                  onClick={() => setAvatar("")}
                  className={cn(
                    "mt-1.5 inline-flex items-center gap-1 text-xs text-red-400 transition hover:text-red-300",
                    !avatar && "pointer-events-none opacity-0"
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove photo
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-full overflow-hidden rounded-xl border border-zinc-700/60 bg-zinc-800/60 sm:w-56">
                {coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImage} alt="Cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-600">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="text-sm text-zinc-500">
                <p className="font-medium text-zinc-300">Cover image</p>
                <p>JPG, PNG or WEBP - up to 4 MB.</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="text-xs text-[#c8a44e] transition hover:text-[#d4b565]"
                  >
                    Choose file
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverImage("")}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs text-red-400 transition hover:text-red-300",
                      !coverImage && "pointer-events-none opacity-0"
                    )}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    handleCover(f);
                  }}
                />
              </div>
            </div>

            {imageError && <p className="text-xs text-red-400">{imageError}</p>}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>
                  <User className="h-3.5 w-3.5" />
                  Full name
                </FieldLabel>
                <input
                  className={fieldInput(err("displayName"))}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                />
                {err("displayName") && <p className="mt-1.5 text-xs text-red-400">{err("displayName")}</p>}
              </label>
              <label className="block">
                <FieldLabel>
                  <AtSign className="h-3.5 w-3.5" />
                  Username
                </FieldLabel>
                <input
                  className={fieldInput(err("username"))}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="janedoe"
                />
                {err("username") && <p className="mt-1.5 text-xs text-red-400">{err("username")}</p>}
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </FieldLabel>
                <input
                  type="email"
                  className={fieldInput(err("email"))}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                />
                {err("email") && <p className="mt-1.5 text-xs text-red-400">{err("email")}</p>}
              </label>
              <label className="block">
                <FieldLabel>
                  <Calendar className="h-3.5 w-3.5" />
                  Date of birth
                </FieldLabel>
                <input
                  type="date"
                  className={fieldInput(err("dateOfBirth"))}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
                {err("dateOfBirth") && <p className="mt-1.5 text-xs text-red-400">{err("dateOfBirth")}</p>}
              </label>
            </div>

            <div>
              <FieldLabel>
                <Globe className="h-3.5 w-3.5" />
                Country of residence
              </FieldLabel>
              <CountrySelect value={countryCode} onChange={setCountryCode} placeholder="Select your country" />
              {err("country") && <p className="mt-1.5 text-xs text-red-400">{err("country")}</p>}
            </div>

            <div>
              <FieldLabel>
                <Phone className="h-3.5 w-3.5" />
                Phone number
              </FieldLabel>
              <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2">
                <CountrySelect value={phoneCountry} onChange={setPhoneCountry} placeholder="+00" />
                <div className="relative">
                  {phoneCountry && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                      +{phoneCountry ? getCountry(phoneCountry)?.dialCode : ""}
                    </span>
                  )}
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder={phoneCountry ? "2555 000 000" : "Select a country first"}
                    value={phoneRaw}
                    onChange={(e) => setPhoneRaw(e.target.value)}
                    className={cn(fieldInput(err("phone")), phoneCountry && "pl-14")}
                  />
                </div>
              </div>
              {err("phone") && <p className="mt-1.5 text-xs text-red-400">{err("phone")}</p>}
            </div>

            <label className="block">
              <FieldLabel>
                <User className="h-3.5 w-3.5" />
                Bio
              </FieldLabel>
              <textarea
                className={cn(inputBase, "h-24 resize-none py-2.5 leading-relaxed")}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell bidders a little about you (optional)"
                maxLength={240}
              />
              <p className="mt-1 text-right text-[11px] text-zinc-600">{bio.length}/240</p>
            </label>

            {showErrors && Object.keys(errors).length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                Please fix the highlighted fields before saving.
              </div>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            <Shield className="h-4 w-4" />
            Save Changes
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}