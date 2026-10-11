"use client";

import { useEffect, useRef, useState } from "react";
import { useSignMessage } from "wagmi";
import {
  AtSign,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  IdCard,
  ImagePlus,
  Loader2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Video,
  Loader,
} from "lucide-react";
import { Modal, ModalHeader, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes, sniffFile, fileToDataURL } from "@/lib/media";
import {
  ALLOWED_DOCUMENT_MIMES,
  ALLOWED_IMAGE_MIMES,
  AVATAR_MAX_BYTES,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_TYPES,
  SELFIE_MAX_BYTES,
  STAGE_SUBMITTED,
  getCountry,
  getSupportedCountries,
  validateBasicInfo,
  validatePhone,
} from "@/lib/verify";
import type { VerificationSubmission } from "@/lib/types";

interface VerificationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (submission: VerificationSubmission) => void;
  walletAddress: string;
}

interface DocFile {
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
}

interface SelfieFile {
  mime: string;
  size: number;
  url: string;
}

const STEPS = [
  { title: "Step 1", label: "Basic Information" },
  { title: "Step 2", label: "Identity Proof" },
  { title: "Step 3", label: "Face Verification" },
];

export const inputBase =
  "h-11 w-full rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-[#c8a44e]/60 focus:ring-2 focus:ring-[#c8a44e]/20";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ElementType;
  error?: string;
  hint?: string;
  required?: boolean;
}

function Field({ label, icon: Icon, error, hint, required, className, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        {required && <span className="text-[#c8a44e]">*</span>}
      </span>
      <input
        className={cn(
          inputBase,
          error && "border-red-500/60 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </label>
  );
}

export function CountrySelect({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (iso2: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const countries = getSupportedCountries();
  const selected = value ? getCountry(value) : undefined;
  const q = query.trim().toLowerCase();
  const filtered = countries.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.iso2.toLowerCase() === q ||
      c.dialCode.includes(q.replace(/^\+/, ""))
  );

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          inputBase,
          "flex items-center justify-between gap-2 pr-3 text-left"
        )}
      >
        <span className={cn("flex min-w-0 items-center gap-2", !selected && "text-zinc-500")}>
          {selected ? (
            <>
              <span className="text-base leading-none">{selected.flag}</span>
              <span className="truncate">{selected.name}</span>
              <span className="text-xs text-zinc-500">+{selected.dialCode}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-1 flex max-h-72 flex-col overflow-hidden rounded-xl border border-zinc-700/70 bg-zinc-900 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
              <Search className="h-3.5 w-3.5 text-zinc-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries..."
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
              />
            </div>
            <div className="overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.iso2}
                  type="button"
                  onClick={() => {
                    onChange(c.iso2);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-800"
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-zinc-500">+{c.dialCode}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-3 text-xs text-zinc-500">No countries match your search.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DocUploadCard({
  title,
  required,
  file,
  onFile,
  onRemove,
  error,
}: {
  title: string;
  required?: boolean;
  file: DocFile | null;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPdf = file?.mime === "application/pdf";

  return (
    <div
      className={cn(
        "rounded-xl border bg-zinc-900/40",
        error ? "border-red-500/60" : "border-zinc-700/60"
      )}
    >
      <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
        <p className="text-xs font-medium text-zinc-300">
          {title}
          {required && <span className="text-[#c8a44e]">*</span>}
        </p>
        {file && <span className="text-[10px] text-zinc-500">{formatBytes(file.size)}</span>}
      </div>

      {file ? (
        <div className="p-4">
          {isPdf ? (
            <div className="flex items-center gap-3 rounded-lg bg-zinc-800/60 px-3 py-5">
              <FileText className="h-6 w-6 flex-shrink-0 text-[#c8a44e]" />
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">{file.name}</p>
                <p className="text-[11px] text-zinc-500">PDF preview not shown</p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg border border-zinc-700/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file.dataUrl} alt={`${title} preview`} className="h-44 w-full object-cover" />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-700/70 px-4 py-8 text-center transition hover:border-[#c8a44e]/50 hover:bg-[#c8a44e]/5"
        >
          <UploadCloud className="h-6 w-6 text-zinc-500" />
          <p className="text-sm text-zinc-300">Upload {title.toLowerCase()}</p>
          <p className="text-xs text-zinc-500">JPG, PNG, WEBP or PDF - up to 8 MB</p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_DOCUMENT_MIMES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          onFile(f);
        }}
      />
      {error && <p className="px-4 pb-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function VerificationForm({
  open,
  onClose,
  onSubmit,
  walletAddress,
}: VerificationFormProps) {
  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [dob, setDob] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const [documentType, setDocumentType] = useState("");
  const [docFront, setDocFront] = useState<DocFile | null>(null);
  const [docBack, setDocBack] = useState<DocFile | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const [selfie, setSelfie] = useState<SelfieFile | null>(null);
  const [selfieConfirm, setSelfieConfirm] = useState(false);
  const [camState, setCamState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "done">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const selfieUrlRef = useRef<string | null>(null);
  const timersRef = useRef<number[]>([]);

  const { signMessageAsync } = useSignMessage();

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setStep(0);
      setDisplayName("");
      setUsername("");
      setEmail("");
      setCountryCode("");
      setPhoneCountry("");
      setPhoneRaw("");
      setDob("");
      setAvatar("");
      setAvatarError(null);
      setShowErrors(false);
      setDocumentType("");
      setDocFront(null);
      setDocBack(null);
      setDocError(null);
      setSelfie(null);
      setSelfieConfirm(false);
      setCamState("idle");
      setCameraError(null);
      setCountdown(null);
      setSubmitState("idle");
      setSubmitError(null);
    }
  }

  useEffect(
    () => () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (selfieUrlRef.current) {
        URL.revokeObjectURL(selfieUrlRef.current);
        selfieUrlRef.current = null;
      }
      timersRef.current.forEach((t) => window.clearTimeout(t));
    },
    []
  );

  useEffect(() => {
    if (!mediaStream || !videoRef.current) return;
    videoRef.current.srcObject = mediaStream;
    const play = videoRef.current.play();
    if (play?.catch) play.catch(() => {});
  }, [mediaStream]);

  const basicErrors = validateBasicInfo({
    displayName,
    username,
    email,
    phoneRaw,
    phoneCountry,
    countryCode,
    dateOfBirth: dob,
  });
  const phoneE164 = validatePhone(phoneRaw, phoneCountry).e164 ?? "";
  const basicValid = Object.keys(basicErrors).length === 0;

  const docValid = Boolean(
    documentType &&
      docFront &&
      docFront.size > 0 &&
      docFront.size <= DOCUMENT_MAX_BYTES &&
      ALLOWED_DOCUMENT_MIMES.includes(docFront.mime)
  );

  const selfieValid = Boolean(
    selfie && selfie.size > 0 && selfie.size <= SELFIE_MAX_BYTES && selfieConfirm
  );

  const err = (key: keyof typeof basicErrors) =>
    showErrors && basicErrors[key] ? basicErrors[key] : "";

  const setStream = (stream: MediaStream | null) => {
    mediaStreamRef.current = stream;
    setMediaStream(stream);
  };

  const stopCamera = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setMediaStream(null);
  };

  const enableCamera = async () => {
    setCameraError(null);
    setCamState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(stream);
      setCamState("active");
    } catch {
      setStream(null);
      setCamState("error");
      setCameraError(
        "Camera is unavailable or permission was denied. Allow camera access in your browser and try again."
      );
    }
  };

  const sampleBrightness = (ctx: CanvasRenderingContext2D, w: number, h: number): number => {
    try {
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 160) {
        sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        count += 1;
      }
      if (count === 0) return 0;
      return Math.round((sum / count / 255) * 100);
    } catch {
      return 100;
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCountdown(null);
    const brightness = sampleBrightness(ctx, canvas.width, canvas.height);
    if (brightness < 55) {
      stopCamera();
      setCamState("error");
      setCameraError(
        "The capture was too dark. Move to a well-lit area, keep your face visible, and try again."
      );
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          stopCamera();
          setCamState("error");
          setCameraError("The capture failed. Please try again.");
          return;
        }
        const url = URL.createObjectURL(blob);
        if (selfieUrlRef.current) URL.revokeObjectURL(selfieUrlRef.current);
        selfieUrlRef.current = url;
        setSelfie({
          mime: blob.type || "image/jpeg",
          size: blob.size,
          url,
        });
        setCamState("idle");
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const startCapture = () => {
    if (!mediaStreamRef.current || countdown !== null) return;
    setCountdown(3);
    const push = (cb: () => void, ms: number) => {
      const id = window.setTimeout(cb, ms);
      timersRef.current.push(id);
    };
    push(() => {
      setCountdown(2);
      push(() => {
        setCountdown(1);
        push(captureFrame, 1000);
      }, 1000);
    }, 1000);
  };

  const retakeSelfie = () => {
    stopCamera();
    if (selfieUrlRef.current) {
      URL.revokeObjectURL(selfieUrlRef.current);
      selfieUrlRef.current = null;
    }
    setSelfie(null);
    setCamState("idle");
    setCameraError(null);
    setSelfieConfirm(false);
  };

  const handleAvatar = async (file: File | undefined) => {
    setAvatarError(null);
    if (!file) return;
    const sniffed = await sniffFile(file);
    if (!sniffed || !ALLOWED_IMAGE_MIMES.includes(sniffed)) {
      setAvatarError("Please choose a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError(`Image is too large (max ${formatBytes(AVATAR_MAX_BYTES)}).`);
      return;
    }
    try {
      setAvatar(await fileToDataURL(file));
    } catch {
      setAvatarError("Could not read the image. Please try again.");
    }
  };

  const handleDocFile = async (file: File | undefined, side: "front" | "back") => {
    setDocError(null);
    if (!file) return;
    const sniffed = await sniffFile(file);
    if (!sniffed || !ALLOWED_DOCUMENT_MIMES.includes(sniffed)) {
      setDocError("Unsupported file type. Please upload a clear JPG, PNG, WEBP or PDF.");
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      setDocError("File is too large (max 8 MB).");
      return;
    }
    try {
      const dataUrl = await fileToDataURL(file);
      const record: DocFile = { name: file.name, mime: sniffed, size: file.size, dataUrl };
      if (side === "front") setDocFront(record);
      else setDocBack(record);
    } catch {
      setDocError("This document could not be read. Please upload a clearer image.");
    }
  };

  const handleNext = () => {
    if (step === 0) {
      setShowErrors(true);
      if (!basicValid) return;
      setShowErrors(false);
      setStep(1);
      return;
    }
    if (step === 1) {
      setDocError(null);
      if (!docValid) {
        setDocError(
          docFront
            ? "This document could not be verified. Please upload a clearer image."
            : "Please upload an identity document to continue."
        );
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      stopCamera();
      onClose();
      return;
    }
    setShowErrors(false);
    setDocError(null);
    if (step === 2) stopCamera();
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!selfieValid || submitState === "submitting" || submitState === "done") return;
    setSubmitError(null);
    setSubmitState("submitting");
    const country = countryCode ? getCountry(countryCode) : undefined;
    try {
      const challengeRes = await fetch(
        `/api/verification/challenge?address=${encodeURIComponent(walletAddress)}`
      );
      const challenge = await challengeRes.json();
      if (!challengeRes.ok || !challenge?.ok || !challenge.nonce || !challenge.message) {
        throw new Error("Verification service is unavailable. Please try again.");
      }
      const signature = await signMessageAsync({ message: challenge.message });
      const payload = {
        walletAddress,
        signature,
        nonce: challenge.nonce,
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        phoneE164,
        phoneCountry,
        countryCode,
        dateOfBirth: dob || undefined,
        documentType,
        documentMime: docFront?.mime,
        documentSize: docFront?.size,
        documentSides: docBack ? ("front-and-back" as const) : ("front" as const),
        selfieMime: selfie?.mime,
        selfieSize: selfie?.size,
        stage: STAGE_SUBMITTED,
      };
      const verifyRes = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok || !data?.ok) {
        throw new Error(data?.error ?? "Submission could not be verified. Please try again.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed.";
      setSubmitError(
        /rejected|denied|cancelled/i.test(message)
          ? "The wallet signature was not provided. A signature is required to submit verification."
          : message
      );
      setSubmitState("idle");
      return;
    }

    const submission: VerificationSubmission = {
      walletAddress,
      displayName: displayName.trim(),
      username: username.trim(),
      email: email.trim(),
      phoneE164,
      phoneCountry,
      country: country?.name ?? "",
      countryCode,
      dateOfBirth: dob || undefined,
      avatar,
      documentType,
      documentMime: docFront?.mime ?? "",
      documentSize: docFront?.size ?? 0,
      documentSides: docBack ? "front-and-back" : "front",
      selfieMime: selfie?.mime ?? "",
      selfieSize: selfie?.size ?? 0,
      stage: STAGE_SUBMITTED,
      privacyConsent: selfieConfirm,
    };

    setSubmitState("done");
    const id = window.setTimeout(() => onSubmit(submission), 1600);
    timersRef.current.push(id);
  };

  const canSubmit = selfieValid && submitState === "idle";

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-[calc(100vw-1.5rem)] sm:max-w-2xl lg:max-w-3xl"
    >
      <div className="flex max-h-[calc(100dvh-2.5rem)] flex-col sm:max-h-[calc(100dvh-3.5rem)]">
        <ModalHeader className="mt-1">
          <ModalTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#c8a44e]" />
            Verify Your Identity
          </ModalTitle>
          <ModalDescription>
            Complete the three required steps to secure your account and start verifying.
          </ModalDescription>
        </ModalHeader>

        <div className="px-6 pb-5">
          <div className="flex items-center">
            {STEPS.map((st, i) => {
              const done =
                (i === 0 && step > 0) ||
                (i === 1 && step > 1) ||
                (i === 1 && docValid) ||
                (i === 2 && selfieValid);
              const isCurrent = step === i && !done;
              return (
                <div key={st.title} className={cn("flex items-center", i > 0 && "flex-1")}>
                  {i > 0 && (
                    <div
                      className={cn(
                        "mx-2 h-0.5 flex-1 rounded-full",
                        done ? "bg-gradient-to-r from-[#c8a44e] to-[#e8d48b]" : "bg-zinc-800"
                      )}
                    />
                  )}
                  <div className="flex shrink-0 flex-col items-center gap-1.5 text-center">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                        done
                          ? "border-[#c8a44e] bg-gradient-to-br from-[#c8a44e] to-[#d4b565] text-black"
                          : isCurrent
                          ? "border-[#c8a44e]/60 bg-[#c8a44e]/10 text-[#c8a44e]"
                          : "border-zinc-700 bg-zinc-800/60 text-zinc-500"
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider",
                          done || isCurrent ? "text-[#c8a44e]" : "text-zinc-500"
                        )}
                      >
                        {st.title}
                      </p>
                      <p className="text-[11px] text-zinc-500">{st.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-1">
          {submitState === "done" ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-zinc-100">
                Verification submitted successfully
              </h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-400">
                Status: Verification Submitted. Your information has been recorded and is now
                awaiting review. You will be taken back to your profile.
              </p>
              <div className="mt-6 w-full max-w-sm space-y-2 text-sm">
                {[
                  ["Basic Information", true],
                  ["Identity Document", true],
                  ["Live Face Verification", true],
                ].map(([label, ok]) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-2.5"
                  >
                    <span className="text-zinc-300">{String(label)}</span>
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : step === 0 ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-800/60 text-xl text-[#c8a44e]">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-7 w-7" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById("avatar-input")?.click()}
                    className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    id="avatar-input"
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
                  <p>Optional. JPG, PNG or WEBP - up to 2 MB.</p>
                  {avatarError && <p className="mt-1 text-xs text-red-400">{avatarError}</p>}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Full name"
                  icon={Shield}
                  placeholder="Jane Doe"
                  required
                  error={err("displayName")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <Field
                  label="Username"
                  icon={AtSign}
                  placeholder="janedoe"
                  required
                  error={err("username")}
                  hint="3-30 characters. Letters, numbers, dots, underscores and hyphens."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Email"
                  icon={Mail}
                  type="email"
                  placeholder="example@gmail.com"
                  required
                  error={err("email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Field
                  label="Date of birth"
                  icon={Calendar}
                  type="date"
                  error={err("dateOfBirth")}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                    <Globe className="h-3.5 w-3.5" />
                    Country of residence
                    <span className="text-[#c8a44e]">*</span>
                  </span>
                  <CountrySelect
                    value={countryCode}
                    onChange={(code) => {
                      setCountryCode(code);
                      if (!phoneCountry) setPhoneCountry(code);
                    }}
                    placeholder="Select your country"
                  />
                  {err("country") && <p className="mt-1.5 text-xs text-red-400">{err("country")}</p>}
                </div>

                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                    <Phone className="h-3.5 w-3.5" />
                    Phone number
                    <span className="text-[#c8a44e]">*</span>
                  </span>
                  <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2">
                    <CountrySelect
                      value={phoneCountry}
                      onChange={(code) => setPhoneCountry(code)}
                      placeholder="+00"
                    />
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
                        className={cn(
                          inputBase,
                          phoneCountry && "pl-14",
                          err("phone") && "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
                        )}
                      />
                    </div>
                  </div>
                  {err("phone") && <p className="mt-1.5 text-xs text-red-400">{err("phone")}</p>}
                </div>
              </div>

              {showErrors && !basicValid && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  Please fix the highlighted fields before continuing.
                </div>
              )}

              <div className="rounded-xl border border-[#c8a44e]/20 bg-[#c8a44e]/5 px-4 py-3.5">
                <p className="flex items-center gap-2 text-sm font-medium text-[#c8a44e]">
                  <Lock className="h-4 w-4" />
                  Your Privacy Matters
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  Your information is used to secure your account and verify your identity.
                  Sensitive information is protected using appropriate encryption and access
                  controls and is not publicly displayed. Only the information required for this
                  purpose is collected.
                </p>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3.5">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <IdCard className="h-4 w-4 text-[#c8a44e]" />
                  Select an identity document
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Only store or submit documentation required for verification. Documents are used
                  solely for identity checks, are never published, and are not exposed through
                  public URLs.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {DOCUMENT_TYPES.map((doc) => {
                  const active = documentType === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setDocumentType(doc.id)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left text-sm font-medium transition",
                        active
                          ? "border-[#c8a44e]/60 bg-[#c8a44e]/10 text-[#c8a44e]"
                          : "border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:border-zinc-600"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {active ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <IdCard className="h-4 w-4 text-zinc-500" />
                        )}
                        {doc.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <DocUploadCard
                  title="Front-side image"
                  required
                  file={docFront}
                  onFile={(f) => handleDocFile(f, "front")}
                  onRemove={() => setDocFront(null)}
                  error={docError && !docFront ? docError : undefined}
                />
                <DocUploadCard
                  title="Back-side image"
                  file={docBack}
                  onFile={(f) => handleDocFile(f, "back")}
                  onRemove={() => setDocBack(null)}
                />
              </div>

              {docError && docFront && (
                <p className="text-xs text-red-400">{docError}</p>
              )}

              {docValid && (
                <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Loader className="h-4 w-4 text-amber-400" />
                    <p className="text-sm text-zinc-200">Document uploaded</p>
                  </div>
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    Pending review
                  </span>
                </div>
              )}

              <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3.5">
                <p className="text-xs leading-relaxed text-zinc-500">
                  The document has been uploaded for automated checks. It has not been marked as
                  verified; a member of our review team will confirm the document. Use the Replace
                  button to upload a clearer image if needed.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3.5">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Video className="h-4 w-4 text-[#c8a44e]" />
                  Face Verification
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  We need a short live selfie to verify that you are a real person and that you are
                  present during verification. The selfie is captured live from your camera and is
                  never stored permanently or shared publicly.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-zinc-700/60 bg-zinc-900/40">
                {selfie ? (
                  <div className="p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selfie.url}
                      alt="Live selfie preview"
                      className="mx-auto h-64 w-auto max-w-full rounded-lg border border-zinc-700/50 object-cover"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Live capture complete
                      </span>
                      <Button type="button" variant="secondary" size="sm" onClick={retakeSelfie}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retake
                      </Button>
                    </div>
                  </div>
                ) : camState === "active" ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-64 w-full bg-black object-cover"
                    />
                    {countdown !== null && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-6xl font-bold text-white">{countdown}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-36 w-28 rounded-full border-2 border-dashed border-white/40" />
                    </div>
                    <div className="absolute inset-x-0 bottom-3 flex justify-center">
                      <Button type="button" onClick={startCapture} disabled={countdown !== null}>
                        Capture Live Selfie
                      </Button>
                    </div>
                  </div>
                ) : camState === "requesting" ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-3 bg-zinc-950">
                    <Loader2 className="h-6 w-6 animate-spin text-[#c8a44e]" />
                    <p className="text-sm text-zinc-400">Requesting camera access...</p>
                  </div>
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
                    <Video className="h-8 w-8 text-zinc-600" />
                    <p className="text-sm text-zinc-400">
                      {cameraError ??
                        "Position yourself in a well-lit area and look directly at the camera."}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button type="button" onClick={enableCamera}>
                        Enable Camera
                      </Button>
                      {selfie && (
                        <Button type="button" variant="secondary" onClick={retakeSelfie}>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Use Previous Capture
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800/40 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selfieConfirm}
                  disabled={!selfie}
                  onChange={(e) => setSelfieConfirm(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#c8a44e]"
                />
                <span className="text-xs leading-relaxed text-zinc-300">
                  I confirm this is my live, unedited capture taken just now, and I consent to its
                  use for identity verification only.
                </span>
              </label>
              {!selfieValid && selfie && !selfieConfirm && (
                <p className="text-xs text-red-400">
                  Please confirm your live capture before submitting.
                </p>
              )}

              <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/40 px-4 py-4">
                <p className="mb-3 text-sm font-medium text-zinc-200">
                  Review before submitting
                </p>
                <div className="space-y-2 text-sm">
                  {[
                    ["Basic Information", basicValid],
                    ["Identity Document", docValid],
                    ["Live Face Verification", selfieValid],
                  ].map(([label, ok]) => (
                    <div
                      key={String(label)}
                      className="flex items-center justify-between rounded-lg bg-zinc-800/40 px-3.5 py-2.5"
                    >
                      <span className="text-zinc-300">{String(label)}</span>
                      {ok ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Clock className="h-3.5 w-3.5" />
                          Incomplete
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-800/40 px-3.5 py-2.5">
                  <span className="text-zinc-300">Status</span>
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    <Clock className="h-3 w-3" />
                    Verification Submitted - Pending Review
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  Please review your information before submitting. Verification status is only
                  confirmed after our review team processes your documents and live selfie.
                </p>
              </div>
            </div>
          )}
        </div>

        {submitState !== "done" && (
          <div className="flex flex-col gap-3 border-t border-zinc-800/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-5">
              {submitState === "idle" && (submitError || (step === 2 && !selfieValid)) && (
                <p className="text-xs text-red-400">
                  {submitError ??
                    (selfie
                      ? "Please confirm your live capture before submitting."
                      : "Complete the face verification step before submitting.")}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Button variant="ghost" onClick={handleBack}>
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step < 2 ? (
                <Button
                  aria-disabled={step === 0 ? !basicValid : !docValid}
                  onClick={handleNext}
                  className={cn(
                    "min-w-[8rem]",
                    ((step === 0 && !basicValid) || (step === 1 && !docValid)) &&
                      "opacity-60 hover:shadow-none"
                  )}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  loading={submitState === "submitting"}
                  disabled={!canSubmit}
                  className="min-w-[11rem]"
                >
                  {submitState === "submitting" ? (
                    <>Securing submission...</>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Submit Verification
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}