"use client";

import { useRef, useState } from "react";
import { cn, CATEGORIES, CURRENCIES } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_MIME_LIST,
  ACCEPTED_IMAGE_TYPES,
  PRODUCT_IMAGE_MAX_BYTES,
  fileToDataURL,
  formatBytes,
  sniffFile,
} from "@/lib/media";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Film,
  Box,
  Settings,
  Check,
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModelViewer } from "@/components/ui/model-viewer";

const STEPS = [
  { label: "Basic Info", icon: FileText },
  { label: "Media", icon: ImageIcon },
  { label: "3D Model", icon: Box },
  { label: "Auction", icon: DollarSign },
  { label: "Terms", icon: Settings },
  { label: "Publish", icon: CheckCircle },
];

const CONDITIONS = ["New", "Like New", "Excellent", "Good", "Fair", "Used"] as const;

const COUNTRIES = [
  "United States", "United Kingdom", "Germany", "France", "Japan", "Canada", "Australia",
  "Italy", "Spain", "Switzerland", "UAE", "Singapore", "Netherlands", "South Korea",
  "Brazil", "India", "China", "Mexico", "Sweden", "Norway", "Portugal", "Ireland",
];

const PHOTO_ANGLES = ["Front", "Back", "Left", "Right", "Top", "Bottom"] as const;

const MAX_ADDITIONAL_IMAGES = 8;
const MIN_3D_ANGLES = 4;
const GENERATION_CLIENT_TIMEOUT_MS = 1_800_000;
const THREE_D_POLL_INTERVAL_MS = 5_000;
const THREE_D_POLL_REQUEST_TIMEOUT_MS = 60_000;

const THREE_D_ERROR_TITLES: Record<string, string> = {
  NOT_CONFIGURED: "Hunyuan3D service is not configured",
  INVALID_IMAGES: "Product images were rejected",
  TIMEOUT: "3D generation timed out",
  PROVIDER_UNAVAILABLE: "Hunyuan3D service is busy or unavailable",
  PROVIDER_UNREACHABLE: "Hunyuan3D service is not running",
  DEPENDENCIES_MISSING: "Hunyuan3D dependencies are missing",
  GPU_UNAVAILABLE: "GPU/CUDA is not available",
  MODEL_NOT_RETURNED: "Hunyuan3D returned no model",
  INVALID_PROVIDER_RESPONSE: "Unexpected response from the Hunyuan3D service",
  GENERATION_FAILED: "3D model generation failed",
};

const PAYMENT_METHODS = [
  "Bank Transfer",
  "Card Payment",
  "Cryptocurrency",
  "Stablecoins",
  "Platform Payment Providers",
] as const;

const DEFAULT_TERMS = `This item is sold as-is by the seller. All descriptions and images provided are the responsibility of the seller. The platform acts as an intermediary only. Payment must be completed within 48 hours of auction close unless otherwise specified. Shipping arrangements should be coordinated within 5 business days. Returns are subject to the seller's return policy as outlined below. The platform reserves the right to cancel listings that violate our terms of service.`;

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  mime: string;
}

type ThreeDStatus = "idle" | "uploading" | "preparing" | "generating" | "done" | "error";

interface Specification {
  key: string;
  value: string;
}

interface FormData {
  productName: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  year: string;
  condition: string;
  city: string;
  country: string;
  specifications: Specification[];
  sellerNotes: string;
  mainImage: UploadedImage | null;
  additionalImages: UploadedImage[];
  videoUploaded: boolean;
  documentUploaded: boolean;
  angleImages: Record<string, UploadedImage>;
  threeDStatus: ThreeDStatus;
  threeDError: string | null;
  threeDErrorCode: string | null;
  threeDResult: string | null;
  threeDPreview: string | null;
  threeDProgress: number | null;
  startingBid: string;
  bidCurrency: string;
  bidIncrement: string;
  reservePrice: string;
  reservePriceEnabled: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  liveStartTime: string;
  buyNowPrice: string;
  buyNowEnabled: boolean;
  antiSniping: boolean;
  paymentMethods: string[];
  shippingInfo: string;
  returnPolicy: string;
  termsText: string;
  confirmInfo: boolean;
  confirmMedia: boolean;
  confirmCondition: boolean;
  confirmPayment: boolean;
  confirmTerms: boolean;
}

const INITIAL_FORM: FormData = {
  productName: "",
  description: "",
  category: "",
  subcategory: "",
  brand: "",
  model: "",
  year: "",
  condition: "",
  city: "",
  country: "",
  specifications: [],
  sellerNotes: "",
  mainImage: null,
  additionalImages: [],
  videoUploaded: false,
  documentUploaded: false,
  angleImages: {},
  threeDStatus: "idle",
  threeDError: null,
  threeDErrorCode: null,
  threeDResult: null,
  threeDPreview: null,
  threeDProgress: null,
  startingBid: "",
  bidCurrency: "USD",
  bidIncrement: "",
  reservePrice: "",
  reservePriceEnabled: false,
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  liveStartTime: "",
  buyNowPrice: "",
  buyNowEnabled: false,
  antiSniping: true,
  paymentMethods: [],
  shippingInfo: "",
  returnPolicy: "",
  termsText: DEFAULT_TERMS,
  confirmInfo: false,
  confirmMedia: false,
  confirmCondition: false,
  confirmPayment: false,
  confirmTerms: false,
};

const LABEL_CLASS = "block text-sm font-medium text-zinc-300 mb-1.5";
const INPUT_CLASS =
  "w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 transition-colors focus:outline-none focus:border-[#c8a44e]/60 focus:ring-1 focus:ring-[#c8a44e]/30";
const TEXTAREA_CLASS = cn(INPUT_CLASS, "resize-none");
const SELECT_CLASS = cn(INPUT_CLASS, "appearance-none cursor-pointer");
const ERROR_CLASS = "text-xs text-red-400 mt-1";

export default function CreateAuctionPage() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [showReserveInfo, setShowReserveInfo] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mainImageError, setMainImageError] = useState<string | null>(null);
  const [additionalImageError, setAdditionalImageError] = useState<string | null>(null);
  const [angleUploadError, setAngleUploadError] = useState<string | null>(null);

  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);
  const angleInputRef = useRef<HTMLInputElement>(null);
  const threeDInputRef = useRef<HTMLInputElement>(null);
  const pendingAdditionalTarget = useRef(-1);
  const pendingAngleTarget = useRef<string | null>(null);
  const threeDTaskIdRef = useRef<string | null>(null);
  const threeDGeneratingRef = useRef(false);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const resetThreeDState = () => {
    threeDTaskIdRef.current = null;
    update("threeDStatus", "idle");
    update("threeDError", null);
    update("threeDErrorCode", null);
    update("threeDResult", null);
    update("threeDPreview", null);
    update("threeDProgress", null);
  };

  const setThreeDError = (code: string, message: string) => {
    update("threeDStatus", "error");
    update("threeDErrorCode", code);
    update("threeDError", message);
    update("threeDProgress", null);
  };

  const buildErrorMessage = (
    code: string,
    base: string,
    data: { details?: unknown; requiredEnv?: unknown }
  ) => {
    const details =
      data && Array.isArray(data.details) ? ` ${data.details.filter((d) => typeof d === "string").join(" ")}` : "";
    const requiredEnv =
      data && Array.isArray(data.requiredEnv) ? data.requiredEnv.filter((v) => typeof v === "string") : [];
    const envSuffix =
      code === "NOT_CONFIGURED" && requiredEnv.length > 0
        ? ` Required configuration: ${requiredEnv.join(", ")}.`
        : "";
    return `${base}${details}${envSuffix}`;
  };

  const pollThreeDTask = async (taskId: string): Promise<void> => {
    const deadline = Date.now() + GENERATION_CLIENT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), THREE_D_POLL_REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(`/api/auction/3d?taskId=${encodeURIComponent(taskId)}`, {
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as
          | {
              status?: unknown;
              progress?: unknown;
              modelUrl?: unknown;
              thumbnailUrl?: unknown;
              error?: unknown;
              code?: unknown;
              providerStatus?: unknown;
            }
          | null;

        if (!res.ok) {
          const code = data && typeof data.code === "string" ? data.code : "GENERATION_FAILED";
          const base =
            data && typeof data.error === "string"
              ? data.error
              : `3D generation failed (HTTP ${res.status}).`;
          if (code === "TIMEOUT") {
            setThreeDError("TIMEOUT", base);
          } else {
            if (data && data.providerStatus === "failed") threeDTaskIdRef.current = null;
            setThreeDError(code, base);
          }
          return;
        }

        const status = data && typeof data.status === "string" ? data.status : null;
        if (status === "succeeded") {
          const modelUrl = data && typeof data.modelUrl === "string" ? data.modelUrl : null;
          if (!modelUrl) {
            setThreeDError(
              "INVALID_PROVIDER_RESPONSE",
              "The 3D generation service returned a success status without a model."
            );
            return;
          }
          threeDTaskIdRef.current = null;
          update("threeDResult", modelUrl);
          if (data && typeof data.thumbnailUrl === "string") {
            update("threeDPreview", data.thumbnailUrl);
          }
          update("threeDProgress", 100);
          update("threeDStatus", "done");
          return;
        }

        if (status === "failed" || status === "canceled") {
          threeDTaskIdRef.current = null;
          const base =
            data && typeof data.error === "string"
              ? data.error
              : "The 3D generation service reported that generation failed.";
          setThreeDError("GENERATION_FAILED", base);
          return;
        }

        update("threeDProgress", data && typeof data.progress === "number" ? data.progress : null);
        update("threeDStatus", status === "in_progress" ? "generating" : "preparing");
      } catch {
        // Transient network failure or request timeout: keep polling until the deadline.
      } finally {
        clearTimeout(timer);
      }
      await sleep(THREE_D_POLL_INTERVAL_MS);
    }
    setThreeDError(
      "TIMEOUT",
      "Timed out waiting for the 3D generation service to finish. You can retry to keep waiting."
    );
  };

  const canProceed = (s: number): boolean => {
    switch (s) {
      case 0:
        return !!(
          form.productName.trim() &&
          form.description.trim() &&
          form.category &&
          form.condition
        );
      case 1:
        return !!form.mainImage;
      case 2:
        return true;
      case 3:
        return !!(form.startingBid && form.endDate);
      case 4:
        return form.paymentMethods.length > 0;
      case 5:
        return !!(
          form.confirmInfo &&
          form.confirmMedia &&
          form.confirmCondition &&
          form.confirmPayment &&
          form.confirmTerms
        );
      default:
        return true;
    }
  };

  const next = () => {
    if (!canProceed(step)) return;
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goTo = (s: number) => {
    if (s > step && !canProceed(step)) return;
    setDirection(s > step ? 1 : -1);
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addSpec = () => {
    update("specifications", [...form.specifications, { key: "", value: "" }]);
  };

  const removeSpec = (index: number) => {
    update(
      "specifications",
      form.specifications.filter((_, i) => i !== index)
    );
  };

  const updateSpec = (index: number, field: "key" | "value", val: string) => {
    const specs = [...form.specifications];
    specs[index] = { ...specs[index], [field]: val };
    update("specifications", specs);
  };

  const togglePayment = (method: string) => {
    const methods = form.paymentMethods.includes(method)
      ? form.paymentMethods.filter((m) => m !== method)
      : [...form.paymentMethods, method];
    update("paymentMethods", methods);
  };

  const getAnglesUploaded = () => Object.values(form.angleImages).filter(Boolean).length;

  const readUploadedImage = async (
    file: File,
    onReady: (image: UploadedImage) => void
  ): Promise<string | null> => {
    if (!ACCEPTED_IMAGE_MIME_LIST.includes(file.type)) {
      const sniffed = await sniffFile(file);
      if (!sniffed || !ACCEPTED_IMAGE_MIME_LIST.includes(sniffed)) {
        return "Unsupported file type. Please upload a JPG, PNG, WebP or HEIC image.";
      }
    }
    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      return `Image is too large (max ${formatBytes(PRODUCT_IMAGE_MAX_BYTES)}).`;
    }
    try {
      const preview = await fileToDataURL(file);
      onReady({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        file,
        preview,
        name: file.name,
        size: file.size,
        mime: file.type || "image/*",
      });
      return null;
    } catch {
      return "Could not read the image. Please try again.";
    }
  };

  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const error = await readUploadedImage(file, (image) => {
      update("mainImage", image);
      setMainImageError(null);
    });
    if (error) setMainImageError(error);
  };

  const handleMainImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const error = await readUploadedImage(file, (image) => {
      update("mainImage", image);
      setMainImageError(null);
    });
    if (error) setMainImageError(error);
  };

  const removeMainImage = () => {
    setMainImageError(null);
    setDragActive(false);
    update("mainImage", null);
  };

  const openAdditionalPicker = (targetIndex?: number) => {
    pendingAdditionalTarget.current = targetIndex ?? -1;
    setAdditionalImageError(null);
    additionalInputRef.current?.click();
  };

  const handleAdditionalImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setAdditionalImageError(null);
    const target = pendingAdditionalTarget.current;
    pendingAdditionalTarget.current = -1;
    if (files.length === 0) return;

    const added: UploadedImage[] = [];
    for (const file of files) {
      const error = await readUploadedImage(file, (image) => added.push(image));
      if (error) {
        setAdditionalImageError(error);
        return;
      }
    }

    const current = [...form.additionalImages];
    const combined =
      target >= 0 && target < current.length
        ? current.map((image, index) => (index === target ? added[0] : image))
        : [...current, ...added];
    if (combined.length > MAX_ADDITIONAL_IMAGES) {
      setAdditionalImageError(`You can upload up to ${MAX_ADDITIONAL_IMAGES} additional images.`);
    }
    update("additionalImages", combined.slice(0, MAX_ADDITIONAL_IMAGES));
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImageError(null);
    update(
      "additionalImages",
      form.additionalImages.filter((_, i) => i !== index)
    );
  };

  const openAnglePicker = (angle: string) => {
    pendingAngleTarget.current = angle;
    setAngleUploadError(null);
    angleInputRef.current?.click();
  };

  const handleAngleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setAngleUploadError(null);
    const target = pendingAngleTarget.current;
    pendingAngleTarget.current = null;
    if (files.length === 0) return;

    const added: UploadedImage[] = [];
    for (const file of files) {
      const error = await readUploadedImage(file, (image) => added.push(image));
      if (error) {
        setAngleUploadError(error);
        return;
      }
    }
    if (added.length === 0) return;

    const next = { ...form.angleImages };
    if (target) {
      next[target] = added[0];
    } else {
      let index = 0;
      for (const angle of PHOTO_ANGLES) {
        if (index >= added.length) break;
        if (!next[angle]) {
          next[angle] = added[index];
          index += 1;
        }
      }
      if (index < added.length) {
        setAngleUploadError(
          `All ${PHOTO_ANGLES.length} product angles are already filled. ${
            added.length - index
          } image(s) were not added.`
        );
      }
    }
    update("angleImages", next);
    resetThreeDState();
  };

  const removeAngleImage = (angle: string) => {
    setAngleUploadError(null);
    const next = { ...form.angleImages };
    delete next[angle];
    update("angleImages", next);
    resetThreeDState();
  };

  const generate3D = async () => {
    if (threeDGeneratingRef.current) return;

    const angleImages = PHOTO_ANGLES.map((angle) => ({
      angle,
      image: form.angleImages[angle],
    })).filter((entry) => !!entry.image);
    if (angleImages.length < MIN_3D_ANGLES) {
      setThreeDError(
        "INVALID_IMAGES",
        `Upload at least ${MIN_3D_ANGLES} product images before generating.`
      );
      return;
    }

    threeDGeneratingRef.current = true;
    update("threeDError", null);
    update("threeDErrorCode", null);
    update("threeDResult", null);
    update("threeDPreview", null);
    update("threeDProgress", null);

    try {
      if (!threeDTaskIdRef.current) {
        update("threeDStatus", "uploading");

        const body = new FormData();
        angleImages.forEach(({ angle, image }) => {
          body.append("images", image.file, image.name);
          body.append("angles", angle.toLowerCase());
        });
        if (form.productName.trim()) body.append("productName", form.productName.trim());

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), GENERATION_CLIENT_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch("/api/auction/3d", {
            method: "POST",
            body,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        const data = (await res.json().catch(() => null)) as
          | { error?: unknown; code?: unknown; taskId?: unknown; requiredEnv?: unknown; details?: unknown }
          | null;

        if (!res.ok) {
          const code = data && typeof data.code === "string" ? data.code : "GENERATION_FAILED";
          const base =
            data && typeof data.error === "string"
              ? data.error
              : `3D generation failed (HTTP ${res.status}).`;
          setThreeDError(code, buildErrorMessage(code, base, data ?? {}));
          return;
        }

        const taskId = data && typeof data.taskId === "string" ? data.taskId : null;
        if (!taskId) {
          setThreeDError(
            "INVALID_PROVIDER_RESPONSE",
            "The 3D generation service did not return a generation task."
          );
          return;
        }
        threeDTaskIdRef.current = taskId;
      }

      await pollThreeDTask(threeDTaskIdRef.current);
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      setThreeDError(
        aborted ? "TIMEOUT" : "PROVIDER_UNREACHABLE",
        aborted
          ? "The 3D generation request took too long and was stopped. Please try again."
          : "Could not reach the 3D generation service. Check your connection and try again."
      );
    } finally {
      threeDGeneratingRef.current = false;
    }
  };

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setPublished(true);
    }, 2500);
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  if (published) {
    return (
      <main className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          className="glass rounded-2xl p-12 max-w-lg w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.4 }}
            className="mx-auto mb-6 w-20 h-20 rounded-full bg-[#c8a44e]/15 flex items-center justify-center"
          >
            <motion.div
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <CheckCircle className="w-10 h-10 text-[#c8a44e]" />
            </motion.div>
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-2xl font-bold text-zinc-100 mb-3"
          >
            Your auction has been published!
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-zinc-400 mb-8"
          >
            {form.productName || "Your listing"} is now live and visible to bidders worldwide.
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8a44e] hover:bg-[#d4b565] text-black font-semibold px-6 py-3 text-sm transition-all shadow-[0_0_20px_rgba(200,164,78,0.2)] hover:shadow-[0_0_30px_rgba(200,164,78,0.35)]"
            >
              <Eye className="w-4 h-4" /> View Auction
            </button>
            <button
              onClick={() => {
                setForm(INITIAL_FORM);
                setStep(0);
                setPublished(false);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-600 font-medium px-6 py-3 text-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Create Another
            </button>
          </motion.div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
            Create Auction
          </h1>
          <p className="text-zinc-400 text-sm">
            List your premium item for auction in a few simple steps.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="glass rounded-2xl p-4 sm:p-6 mb-8 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px] relative">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = i === step;
              const isCompleted = i < step;
              return (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => goTo(i)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2",
                        isActive &&
                          "bg-[#c8a44e]/15 border-[#c8a44e] text-[#c8a44e] shadow-[0_0_15px_rgba(200,164,78,0.3)]",
                        isCompleted &&
                          "bg-[#c8a44e] border-[#c8a44e] text-black",
                        !isActive &&
                          !isCompleted &&
                          "bg-zinc-900 border-zinc-700 text-zinc-500 group-hover:border-zinc-500 group-hover:text-zinc-300"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium transition-colors hidden sm:block",
                        isActive && "text-[#c8a44e]",
                        isCompleted && "text-zinc-300",
                        !isActive && !isCompleted && "text-zinc-600 group-hover:text-zinc-400"
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mx-2 sm:mx-3 h-[2px] mt-[-20px] sm:mt-0 relative">
                      <div className="absolute inset-0 bg-zinc-800 rounded-full" />
                      <motion.div
                        className="absolute inset-0 bg-[#c8a44e] rounded-full origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: i < step ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="glass rounded-2xl p-6 sm:p-8 min-h-[500px] relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {step === 0 && renderStep1()}
              {step === 1 && renderStep2()}
              {step === 2 && renderStep3()}
              {step === 3 && renderStep4()}
              {step === 4 && renderStep5()}
              {step === 5 && renderStep6()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 gap-3 flex-wrap">
          <button
            onClick={() => {
              alert("Auction saved as draft!");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-600 font-medium px-5 py-2.5 text-sm transition-all"
          >
            <FileText className="w-4 h-4" /> Save as Draft
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={prev}
              disabled={step === 0}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl font-medium px-5 py-2.5 text-sm transition-all border",
                step === 0
                  ? "bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed opacity-50"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 hover:border-zinc-600"
              )}
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                disabled={!canProceed(step)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-[#c8a44e] hover:bg-[#d4b565] text-black font-semibold px-6 py-2.5 text-sm transition-all shadow-[0_0_20px_rgba(200,164,78,0.2)] hover:shadow-[0_0_30px_rgba(200,164,78,0.35)] active:scale-[0.97]",
                  !canProceed(step) &&
                    "opacity-40 pointer-events-none shadow-none"
                )}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={publishing || !canProceed(5)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl font-semibold px-8 py-2.5 text-sm transition-all",
                  publishing
                    ? "bg-[#c8a44e]/50 text-black/60 cursor-wait"
                    : !canProceed(5)
                    ? "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"
                    : "bg-[#c8a44e] hover:bg-[#d4b565] text-black shadow-[0_0_20px_rgba(200,164,78,0.3)] hover:shadow-[0_0_40px_rgba(200,164,78,0.4)] active:scale-[0.97]"
                )}
              >
                {publishing ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" /> Publish Auction
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );

  function FieldError({ name }: { name: string }) {
    return errors[name] ? (
      <p className={ERROR_CLASS}>{errors[name]}</p>
    ) : null;
  }

  function renderStep1() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 mb-1">Basic Information</h2>
          <p className="text-sm text-zinc-500">
            Tell bidders about your item. All fields marked are required.
          </p>
        </div>

        {/* Product Name */}
        <div>
          <label className={LABEL_CLASS}>
            Product Name <span className="text-[#c8a44e]">*</span>
          </label>
          <input
            type="text"
            value={form.productName}
            onChange={(e) => update("productName", e.target.value)}
            placeholder="e.g. Vintage Rolex Submariner 1968"
            className={cn(
              INPUT_CLASS,
              errors.productName && "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/30"
            )}
          />
          <FieldError name="productName" />
        </div>

        {/* Description */}
        <div>
          <label className={LABEL_CLASS}>
            Description <span className="text-[#c8a44e]">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Provide a detailed description of your item, including its history, provenance, and any notable features..."
            rows={5}
            className={cn(
              TEXTAREA_CLASS,
              errors.description && "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/30"
            )}
          />
          <div className="flex justify-between items-center mt-1">
            <FieldError name="description" />
            <span
              className={cn(
                "text-xs ml-auto",
                form.description.length > 2000
                  ? "text-red-400"
                  : form.description.length > 1500
                  ? "text-amber-400"
                  : "text-zinc-600"
              )}
            >
              {form.description.length}/2000
            </span>
          </div>
        </div>

        {/* Category & Subcategory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>
              Category <span className="text-[#c8a44e]">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className={cn(
                SELECT_CLASS,
                !form.category && "text-zinc-600",
                errors.category && "border-red-500/50"
              )}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <FieldError name="category" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Subcategory</label>
            <input
              type="text"
              value={form.subcategory}
              onChange={(e) => update("subcategory", e.target.value)}
              placeholder="e.g. Automatic Watches"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Brand & Model */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Brand</label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => update("brand", e.target.value)}
              placeholder="e.g. Rolex"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Model</label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="e.g. Submariner Ref. 5513"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Year & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => update("year", e.target.value)}
              placeholder="e.g. 1968"
              min={1900}
              max={2030}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>
              Condition <span className="text-[#c8a44e]">*</span>
            </label>
            <select
              value={form.condition}
              onChange={(e) => update("condition", e.target.value)}
              className={cn(
                SELECT_CLASS,
                !form.condition && "text-zinc-600",
                errors.condition && "border-red-500/50"
              )}
            >
              <option value="">Select condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <FieldError name="condition" />
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="e.g. New York"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Country</label>
            <select
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
              className={cn(SELECT_CLASS, !form.country && "text-zinc-600")}
            >
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Specifications */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={LABEL_CLASS}>Product Specifications</label>
            <button
              onClick={addSpec}
              className="inline-flex items-center gap-1 text-xs text-[#c8a44e] hover:text-[#d4b565] font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Spec
            </button>
          </div>
          {form.specifications.length === 0 && (
            <p className="text-xs text-zinc-600 bg-zinc-900/50 rounded-lg px-4 py-3 border border-zinc-800/50">
              No specifications added yet. Click &quot;Add Spec&quot; to include key-value details like
              Material, Weight, Dimensions, etc.
            </p>
          )}
          <div className="space-y-2">
            {form.specifications.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={spec.key}
                  onChange={(e) => updateSpec(i, "key", e.target.value)}
                  placeholder="Key (e.g. Material)"
                  className={cn(INPUT_CLASS, "flex-1")}
                />
                <input
                  type="text"
                  value={spec.value}
                  onChange={(e) => updateSpec(i, "value", e.target.value)}
                  placeholder="Value (e.g. Stainless Steel)"
                  className={cn(INPUT_CLASS, "flex-1")}
                />
                <button
                  onClick={() => removeSpec(i)}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Seller Notes */}
        <div>
          <label className={LABEL_CLASS}>Seller Notes</label>
          <textarea
            value={form.sellerNotes}
            onChange={(e) => update("sellerNotes", e.target.value)}
            placeholder="Any additional notes for potential bidders..."
            rows={3}
            className={TEXTAREA_CLASS}
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 mb-1">Product Media</h2>
          <p className="text-sm text-zinc-500">
            Upload high-quality images and videos to showcase your item.
          </p>
        </div>

        {/* Main Image Upload */}
        <div>
          <label className={LABEL_CLASS}>
            Main Image <span className="text-[#c8a44e]">*</span>
          </label>
          <div
            onClick={() => {
              setMainImageError(null);
              mainImageInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleMainImageDrop}
            className={cn(
              "relative rounded-xl border-2 border-dashed p-8 text-center transition-all cursor-pointer group",
              form.mainImage
                ? "border-[#c8a44e]/40 bg-[#c8a44e]/5"
                : dragActive
                ? "border-[#c8a44e]/60 bg-[#c8a44e]/5"
                : "border-zinc-700 bg-zinc-900/50 hover:border-[#c8a44e]/30 hover:bg-zinc-900"
            )}
          >
            {form.mainImage ? (
              <div className="space-y-3">
                <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.mainImage.preview}
                    alt="Main image preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#c8a44e]" />
                  <span className="text-sm text-zinc-300 font-medium max-w-full truncate">
                    {form.mainImage.name}
                  </span>
                  <span className="text-xs text-zinc-600">{formatBytes(form.mainImage.size)}</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMainImageError(null);
                      mainImageInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Replace
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMainImage();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 text-zinc-600 group-hover:text-[#c8a44e] transition-colors mx-auto" />
                <div>
                  <p className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    Click or drag to upload main image
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    JPG, PNG, WebP, HEIC • Max {formatBytes(PRODUCT_IMAGE_MAX_BYTES)} • Min 1200×800px
                  </p>
                </div>
              </div>
            )}
          </div>
          {mainImageError && <p className={ERROR_CLASS}>{mainImageError}</p>}
          <input
            ref={mainImageInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="hidden"
            onChange={handleMainImageChange}
          />
        </div>

        {/* Multiple Images */}
        <div>
          <label className={LABEL_CLASS}>Additional Images</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({
              length: Math.max(
                4,
                Math.min(form.additionalImages.length + 1, MAX_ADDITIONAL_IMAGES)
              ),
            }).map((_, i) => {
              const image = form.additionalImages[i];
              return image ? (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-xl border border-[#c8a44e]/30 bg-[#c8a44e]/5 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.preview}
                    alt={`Additional image ${i + 1} preview`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-5">
                    <span className="truncate text-[10px] text-zinc-200">
                      {image.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-400">
                      {formatBytes(image.size)}
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAdditionalPicker(i);
                      }}
                      className="rounded-lg bg-zinc-800/90 p-1.5 transition-colors hover:bg-zinc-700"
                      title="Replace image"
                    >
                      <RefreshCw className="w-3 h-3 text-zinc-300" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAdditionalImage(i);
                      }}
                      className="rounded-lg bg-red-500/80 p-1.5 transition-colors hover:bg-red-500"
                      title="Remove image"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  onClick={() => openAdditionalPicker(i)}
                  className="aspect-square rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group hover:border-zinc-500 hover:bg-zinc-900"
                >
                  <Plus className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500">
                    Add image
                  </span>
                </div>
              );
            })}
          </div>
          {additionalImageError && <p className={ERROR_CLASS}>{additionalImageError}</p>}
          <p className="text-xs text-zinc-600 mt-2">
            {form.additionalImages.length}/{MAX_ADDITIONAL_IMAGES} images uploaded. First image will
            be the cover.
          </p>
          <input
            ref={additionalInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            className="hidden"
            onChange={handleAdditionalImagesChange}
          />
        </div>

        {/* Video */}
        <div>
          <label className={LABEL_CLASS}>Video (Optional)</label>
          <div
            onClick={() => update("videoUploaded", !form.videoUploaded)}
            className={cn(
              "rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer group",
              form.videoUploaded
                ? "border-[#c8a44e]/40 bg-[#c8a44e]/5"
                : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900"
            )}
          >
            {form.videoUploaded ? (
              <div className="flex items-center justify-center gap-3">
                <Film className="w-6 h-6 text-[#c8a44e]" />
                <span className="text-sm text-zinc-300">Video uploaded</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    update("videoUploaded", false);
                  }}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Film className="w-6 h-6 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                <div>
                  <p className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    Click to upload a video
                  </p>
                  <p className="text-xs text-zinc-700">MP4, MOV • Max 100MB • Max 2 minutes</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Upload */}
        <div>
          <label className={LABEL_CLASS}>Documents (Optional)</label>
          <div
            onClick={() => update("documentUploaded", !form.documentUploaded)}
            className={cn(
              "rounded-xl border-2 border-dashed p-5 text-center transition-all cursor-pointer group",
              form.documentUploaded
                ? "border-[#c8a44e]/40 bg-[#c8a44e]/5"
                : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900"
            )}
          >
            {form.documentUploaded ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-5 h-5 text-[#c8a44e]" />
                <span className="text-sm text-zinc-300">Document uploaded</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    update("documentUploaded", false);
                  }}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                <p className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  Certificate of authenticity, appraisal, receipts, etc.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Requirements Info */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#c8a44e] shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-500 space-y-1">
              <p className="font-medium text-zinc-400">Image Requirements</p>
              <p>• Recommended resolution: 2000×1500px or higher</p>
              <p>• Accepted formats: JPG, PNG, WebP, HEIC</p>
              <p>• Maximum file size: 10MB per image</p>
              <p>• Minimum 1 image required, up to 12 images total</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStep3() {
    const anglesUploaded = getAnglesUploaded();
    const canGenerate = anglesUploaded >= MIN_3D_ANGLES;
    const isThreeDInFlight =
      form.threeDStatus === "uploading" ||
      form.threeDStatus === "preparing" ||
      form.threeDStatus === "generating";
    const resultUrl = form.threeDResult;
    const isModelResult = !!resultUrl && /\.(glb|gltf)(\?|#|$)/i.test(resultUrl);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 mb-1">3D Product Model</h2>
          <p className="text-sm text-zinc-500">
            Upload photos from multiple angles to generate an interactive 3D model of your item.
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Box className="w-5 h-5 text-[#c8a44e] shrink-0 mt-0.5" />
            <div className="text-sm text-zinc-400">
              <p className="font-medium text-zinc-300 mb-1">How it works</p>
              <p>
                Upload photos of your item from at least 4 different angles. The local Hunyuan3D
                service will reconstruct a 3D model that bidders can rotate and inspect. Better
                photos lead to higher-quality 3D models and more confident bids.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Product Images */}
        <div
          onClick={() => {
            setAngleUploadError(null);
            pendingAngleTarget.current = null;
            threeDInputRef.current?.click();
          }}
          className="rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center transition-all cursor-pointer group hover:border-[#c8a44e]/40 hover:bg-zinc-900"
        >
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Upload className="w-8 h-8 text-zinc-600 group-hover:text-[#c8a44e] transition-colors" />
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
                Upload Product Images
              </p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Select one or more images • JPG, PNG, WebP, HEIC • Max {formatBytes(PRODUCT_IMAGE_MAX_BYTES)} each
              </p>
            </div>
          </div>
        </div>

        <input
          ref={threeDInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          className="hidden"
          onChange={handleAngleImagesChange}
        />

        {/* Angle Upload Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PHOTO_ANGLES.map((angle) => {
            const image = form.angleImages[angle];
            return (
              <div
                key={angle}
                onClick={() => openAnglePicker(angle)}
                className={cn(
                  "relative aspect-[4/3] rounded-xl border-2 border-dashed overflow-hidden transition-all cursor-pointer group",
                  image
                    ? "border-[#c8a44e]/40 bg-[#c8a44e]/5"
                    : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900"
                )}
              >
                {image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.preview}
                      alt={`${angle} angle preview`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5">
                      <span className="text-xs font-medium text-white">{angle}</span>
                      <span className="text-[10px] text-zinc-300">{formatBytes(image.size)}</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAnglePicker(angle);
                        }}
                        className="rounded-lg bg-zinc-800/90 p-1.5 transition-colors hover:bg-zinc-700"
                        title="Replace image"
                      >
                        <RefreshCw className="w-3 h-3 text-zinc-300" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAngleImage(angle);
                        }}
                        className="rounded-lg bg-red-500/80 p-1.5 transition-colors hover:bg-red-500"
                        title="Remove image"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Upload className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300 font-medium transition-colors">
                      {angle}
                    </span>
                    <span className="text-[10px] text-zinc-700">Click to upload</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <input
          ref={angleInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          onChange={handleAngleImagesChange}
        />

        {angleUploadError && <p className={ERROR_CLASS}>{angleUploadError}</p>}

        <div className="flex items-center gap-2 text-sm">
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
              canGenerate
                ? "bg-green-500/15 text-green-400"
                : "bg-zinc-800 text-zinc-500"
            )}
          >
            {anglesUploaded}
          </div>
          <span className="text-zinc-500">
            of {MIN_3D_ANGLES} minimum angles uploaded
          </span>
        </div>

        {/* Generate Button */}
        <button
          onClick={generate3D}
          disabled={!canGenerate || isThreeDInFlight}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold py-3 text-sm transition-all",
            form.threeDStatus === "done"
              ? "bg-green-500/15 text-green-400 border border-green-500/30 cursor-default"
              : canGenerate && !isThreeDInFlight
              ? "bg-[#c8a44e] hover:bg-[#d4b565] text-black shadow-[0_0_20px_rgba(200,164,78,0.2)] hover:shadow-[0_0_30px_rgba(200,164,78,0.35)]"
              : "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"
          )}
        >
          {form.threeDStatus === "uploading" ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Uploading image...
            </>
          ) : form.threeDStatus === "preparing" ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Preparing image...
            </>
          ) : form.threeDStatus === "generating" ? (
            form.threeDProgress != null && form.threeDProgress >= 75 ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing 3D model... {form.threeDProgress}%
              </>
            ) : (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Generating 3D model{form.threeDProgress != null ? `... ${form.threeDProgress}%` : "..."}
              </>
            )
          ) : form.threeDStatus === "done" ? (
            <>
              <CheckCircle className="w-4 h-4" /> 3D model ready
            </>
          ) : form.threeDStatus === "error" && canGenerate ? (
            <>
              <RefreshCw className="w-4 h-4" /> Retry 3D Generation
            </>
          ) : (
            <>
              <Box className="w-4 h-4" /> Generate 3D Model
            </>
          )}
        </button>

        {form.threeDStatus === "error" && form.threeDError && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-300">
                  {THREE_D_ERROR_TITLES[form.threeDErrorCode ?? ""] ??
                    "3D generation could not be completed"}
                </p>
                <p className="text-xs text-zinc-500 mt-1 break-words">{form.threeDError}</p>
                {form.threeDErrorCode === "PROVIDER_UNREACHABLE" ||
                form.threeDErrorCode === "DEPENDENCIES_MISSING" ||
                form.threeDErrorCode === "GPU_UNAVAILABLE" ||
                form.threeDErrorCode === "NOT_CONFIGURED" ? (
                  <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                    The local Hunyuan3D service could not be used. Start it in a separate
                    terminal:{" "}
                    <code className="font-mono text-amber-200">
                      cd hunyuan3d-service
                    </code>{" "}
                    then{" "}
                    <code className="font-mono text-amber-200">
                      .\.venv\Scripts\python.exe server.py
                    </code>{" "}
                    (or run <code className="font-mono text-amber-200">start_hunyuan3d.bat</code>
                    {" "}- a bare{" "}
                    <code className="font-mono text-amber-200">python</code> may not have torch
                    installed). Generation is configured via{" "}
                    <code className="font-mono text-amber-200">HUNYUAN3D_URL</code>{" "}
                    (defaults to{" "}
                    <code className="font-mono text-amber-200">http://127.0.0.1:8000</code>
                    ). See <code className="font-mono text-amber-200">hunyuan3d-service/README.md</code>{" "}
                    for setup, GPU and Python dependency requirements. Then retry.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* 3D Preview */}
        {form.threeDStatus === "done" && resultUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <div className="aspect-video rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden mb-4">
              {isModelResult ? (
                <ModelViewer src={resultUrl} className="h-full w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.threeDPreview ?? resultUrl}
                  alt="Generated 3D model preview"
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <a
                href={resultUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
              >
                Open model
              </a>
            </div>
            <p className="text-xs text-zinc-500 text-center break-all mt-3">
              3D model: {resultUrl}
            </p>
          </motion.div>
        )}

        {/* Fallback Notice */}
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-500">
              Automatic 3D reconstruction runs through the local Hunyuan3D service. If that
              service is unavailable or generation fails, your uploaded product images will be shown
              as the gallery fallback. You can edit and retry at any time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function renderStep4() {
    const fiatCurrencies = CURRENCIES.filter((c) => c.type === "fiat");
    const cryptoCurrencies = CURRENCIES.filter(
      (c) => c.type === "crypto" || c.type === "stablecoin"
    );

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 mb-1">Auction Settings</h2>
          <p className="text-sm text-zinc-500">
            Configure how your auction will run. Set pricing, timing, and bidding options.
          </p>
        </div>

        {/* Starting Bid & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>
              Starting Bid <span className="text-[#c8a44e]">*</span>
            </label>
            <input
              type="number"
              value={form.startingBid}
              onChange={(e) => update("startingBid", e.target.value)}
              placeholder="0.00"
              min={0}
              className={cn(
                INPUT_CLASS,
                errors.startingBid && "border-red-500/50"
              )}
            />
            <FieldError name="startingBid" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Currency</label>
            <select
              value={form.bidCurrency}
              onChange={(e) => update("bidCurrency", e.target.value)}
              className={SELECT_CLASS}
            >
              <optgroup label="Fiat Currencies">
                {fiatCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Crypto & Stablecoins">
                {cryptoCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Bid Increment */}
        <div>
          <label className={LABEL_CLASS}>Minimum Bid Increment</label>
          <input
            type="number"
            value={form.bidIncrement}
            onChange={(e) => update("bidIncrement", e.target.value)}
            placeholder="e.g. 50"
            min={0}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-zinc-600 mt-1">
            The minimum amount a new bid must exceed the current highest bid.
          </p>
        </div>

        {/* Reserve Price */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className={LABEL_CLASS}>Reserve Price</label>
            <div className="relative">
              <button
                onClick={() => setShowReserveInfo(!showReserveInfo)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showReserveInfo && (
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-64 text-xs text-zinc-400 shadow-xl">
                  A reserve price is the minimum price at which you are willing to sell. If the
                  highest bid doesn&apos;t meet the reserve, the item won&apos;t sell. The reserve price
                  is hidden from bidders.
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => update("reservePriceEnabled", !form.reservePriceEnabled)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                form.reservePriceEnabled ? "bg-[#c8a44e]" : "bg-zinc-700"
              )}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                animate={{ left: form.reservePriceEnabled ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className="text-sm text-zinc-400">
              {form.reservePriceEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          {form.reservePriceEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <input
                type="number"
                value={form.reservePrice}
                onChange={(e) => update("reservePrice", e.target.value)}
                placeholder="Reserve price"
                min={0}
                className={INPUT_CLASS}
              />
            </motion.div>
          )}
        </div>

        {/* Start Date & Time */}
        <div className="space-y-3">
          <label className={LABEL_CLASS}>
            <Clock className="w-4 h-4 inline mr-1.5 text-[#c8a44e]" />
            Auction Schedule
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className={cn(INPUT_CLASS, "color-scheme-dark")}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                className={cn(INPUT_CLASS, "color-scheme-dark")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                className={cn(INPUT_CLASS, "color-scheme-dark")}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => update("endTime", e.target.value)}
                className={cn(INPUT_CLASS, "color-scheme-dark")}
              />
            </div>
          </div>
        </div>

        {/* Live Bidding Start Time */}
        <div>
          <label className={LABEL_CLASS}>Live Bidding Start Time (Optional)</label>
          <input
            type="time"
            value={form.liveStartTime}
            onChange={(e) => update("liveStartTime", e.target.value)}
            className={cn(INPUT_CLASS, "color-scheme-dark")}
          />
          <p className="text-xs text-zinc-600 mt-1">
            When live bidding mode activates. Bidders can place proxy bids before this time.
          </p>
        </div>

        {/* Buy Now Price */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => update("buyNowEnabled", !form.buyNowEnabled)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                form.buyNowEnabled ? "bg-[#c8a44e]" : "bg-zinc-700"
              )}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                animate={{ left: form.buyNowEnabled ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <label className={LABEL_CLASS}>Buy Now Price (Optional)</label>
          </div>
          {form.buyNowEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
            >
              <input
                type="number"
                value={form.buyNowPrice}
                onChange={(e) => update("buyNowPrice", e.target.value)}
                placeholder="Buy now price"
                min={0}
                className={INPUT_CLASS}
              />
              <p className="text-xs text-zinc-600 mt-1">
                Allow bidders to purchase the item immediately at this fixed price.
              </p>
            </motion.div>
          )}
        </div>

        {/* Anti-Sniping Extension */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => update("antiSniping", !form.antiSniping)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors shrink-0",
                form.antiSniping ? "bg-[#c8a44e]" : "bg-zinc-700"
              )}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
                animate={{ left: form.antiSniping ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <div>
              <p className="text-sm font-medium text-zinc-300">Anti-Sniping Extension</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                If a bid is placed in the final 2 minutes, the auction extends by 2 minutes to prevent
                last-second sniping. This gives all bidders a fair chance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStep5() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 mb-1">Terms & Confirmation</h2>
          <p className="text-sm text-zinc-500">
            Set your payment, shipping, and return policies. Confirm the accuracy of your listing.
          </p>
        </div>

        {/* Payment Methods */}
        <div>
          <label className={LABEL_CLASS}>Accepted Payment Methods</label>
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  form.paymentMethods.includes(method)
                    ? "border-[#c8a44e]/40 bg-[#c8a44e]/5"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                    form.paymentMethods.includes(method)
                      ? "bg-[#c8a44e] border-[#c8a44e]"
                      : "border-zinc-600"
                  )}
                >
                  {form.paymentMethods.includes(method) && (
                    <Check className="w-3 h-3 text-black" />
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.paymentMethods.includes(method)}
                  onChange={() => togglePayment(method)}
                />
                <span className="text-sm text-zinc-300">{method}</span>
              </label>
            ))}
          </div>
          {errors.paymentMethods && <p className={ERROR_CLASS}>{errors.paymentMethods}</p>}
        </div>

        {/* Shipping Info */}
        <div>
          <label className={LABEL_CLASS}>Shipping Information</label>
          <textarea
            value={form.shippingInfo}
            onChange={(e) => update("shippingInfo", e.target.value)}
            placeholder="Describe shipping options, carriers, estimated delivery times, and any special handling requirements..."
            rows={4}
            className={TEXTAREA_CLASS}
          />
        </div>

        {/* Return Policy */}
        <div>
          <label className={LABEL_CLASS}>Return Policy</label>
          <textarea
            value={form.returnPolicy}
            onChange={(e) => update("returnPolicy", e.target.value)}
            placeholder="Describe your return policy, including timeframes, conditions, and who covers return shipping costs..."
            rows={4}
            className={TEXTAREA_CLASS}
          />
        </div>

        {/* Terms & Conditions */}
        <div>
          <label className={LABEL_CLASS}>Terms & Conditions</label>
          <textarea
            value={form.termsText}
            onChange={(e) => update("termsText", e.target.value)}
            rows={6}
            className={TEXTAREA_CLASS}
          />
          <button
            onClick={() => update("termsText", DEFAULT_TERMS)}
            className="text-xs text-[#c8a44e] hover:text-[#d4b565] mt-2 font-medium transition-colors"
          >
            Reset to default template
          </button>
        </div>

        {/* Confirmation Checkboxes */}
        <div className="space-y-3">
          <label className={LABEL_CLASS}>Required Confirmations</label>
          {[
            {
              key: "confirmInfo" as const,
              label: "I confirm the product information is accurate",
              desc: "All details including name, description, brand, and specifications are correct.",
            },
            {
              key: "confirmMedia" as const,
              label: "I confirm I have the right to use all uploaded media",
              desc: "All images, videos, and documents are original or you have permission to use them.",
            },
            {
              key: "confirmCondition" as const,
              label: "I confirm the product condition is accurately described",
              desc: "The condition rating reflects the true state of the item.",
            },
            {
              key: "confirmPayment" as const,
              label: "I confirm payment information is correct",
              desc: "Your payout details and accepted payment methods are accurate.",
            },
            {
              key: "confirmTerms" as const,
              label: "I accept the Platform Terms & Conditions",
              desc: "You agree to abide by all platform rules, fees, and policies.",
            },
          ].map(({ key, label, desc }) => (
            <label
              key={key}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                form[key]
                  ? "border-[#c8a44e]/40 bg-[#c8a44e]/5"
                  : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                  form[key] ? "bg-[#c8a44e] border-[#c8a44e]" : "border-zinc-600"
                )}
              >
                {form[key] && <Check className="w-3 h-3 text-black" />}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={!!form[key]}
                onChange={() => update(key, !form[key])}
              />
              <div>
                <p className="text-sm font-medium text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  }

  function renderStep6() {
    const allConfirmed =
      form.confirmInfo &&
      form.confirmMedia &&
      form.confirmCondition &&
      form.confirmPayment &&
      form.confirmTerms;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 mb-1">Review & Publish</h2>
          <p className="text-sm text-zinc-500">
            Review your listing before publishing. Click edit to go back and make changes.
          </p>
        </div>

        {!allConfirmed && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Confirmations Required</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Please go back to the Terms &amp; Confirmation step and complete all required
                checkboxes before publishing.
              </p>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <ReviewSection title="Basic Information" step={0} onEdit={goTo}>
          <ReviewRow label="Product Name" value={form.productName || "—"} />
          <ReviewRow
            label="Description"
            value={form.description ? truncateText(form.description, 150) : "—"}
          />
          <ReviewRow
            label="Category"
            value={
              CATEGORIES.find((c) => c.id === form.category)?.name || "—"
            }
          />
          {form.subcategory && <ReviewRow label="Subcategory" value={form.subcategory} />}
          {form.brand && <ReviewRow label="Brand" value={form.brand} />}
          {form.model && <ReviewRow label="Model" value={form.model} />}
          {form.year && <ReviewRow label="Year" value={form.year} />}
          <ReviewRow label="Condition" value={form.condition || "—"} />
          {(form.city || form.country) && (
            <ReviewRow
              label="Location"
              value={[form.city, form.country].filter(Boolean).join(", ") || "—"}
            />
          )}
          {form.specifications.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-zinc-500 mb-1">Specifications:</p>
              <div className="flex flex-wrap gap-2">
                {form.specifications.map(
                  (s, i) =>
                    s.key &&
                    s.value && (
                      <span
                        key={i}
                        className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg"
                      >
                        {s.key}: {s.value}
                      </span>
                    )
                )}
              </div>
            </div>
          )}
        </ReviewSection>

        {/* Media */}
        <ReviewSection title="Product Media" step={1} onEdit={goTo}>
          <ReviewRow
            label="Main Image"
            value={form.mainImage ? `✓ ${form.mainImage.name}` : "Not uploaded"}
            highlight={!!form.mainImage}
          />
          <ReviewRow
            label="Additional Images"
            value={`${form.additionalImages.length} uploaded`}
          />
          <ReviewRow
            label="Video"
            value={form.videoUploaded ? "✓ Uploaded" : "Not uploaded"}
          />
          <ReviewRow
            label="Documents"
            value={form.documentUploaded ? "✓ Uploaded" : "Not uploaded"}
          />
        </ReviewSection>

        {/* 3D Model */}
        <ReviewSection title="3D Model" step={2} onEdit={goTo}>
          <ReviewRow
            label="Product Images"
            value={`${getAnglesUploaded()} of ${PHOTO_ANGLES.length}`}
          />
          <ReviewRow
            label="3D Model"
            value={
              form.threeDStatus === "done"
                ? "✓ Generated"
                : form.threeDStatus === "error"
                ? "Failed"
                : "Not generated"
            }
            highlight={form.threeDStatus === "done"}
          />
        </ReviewSection>

        {/* Auction Settings */}
        <ReviewSection title="Auction Settings" step={3} onEdit={goTo}>
          <ReviewRow
            label="Starting Bid"
            value={
              form.startingBid
                ? `${CURRENCIES.find((c) => c.code === form.bidCurrency)?.symbol || ""}${form.startingBid} ${form.bidCurrency}`
                : "—"
            }
          />
          {form.bidIncrement && (
            <ReviewRow label="Bid Increment" value={`${form.bidCurrency} ${form.bidIncrement}`} />
          )}
          {form.reservePriceEnabled && form.reservePrice && (
            <ReviewRow label="Reserve Price" value={`${form.reservePrice}`} />
          )}
          {form.startDate && (
            <ReviewRow
              label="Auction Period"
              value={`${form.startDate} ${form.startTime || ""} → ${form.endDate || "?"} ${form.endTime || ""}`}
            />
          )}
          {form.liveStartTime && (
            <ReviewRow label="Live Bidding" value={`Starts at ${form.liveStartTime}`} />
          )}
          {form.buyNowEnabled && form.buyNowPrice && (
            <ReviewRow label="Buy Now Price" value={`${form.buyNowPrice}`} />
          )}
          <ReviewRow
            label="Anti-Sniping"
            value={form.antiSniping ? "Enabled" : "Disabled"}
          />
        </ReviewSection>

        {/* Terms & Confirmations */}
        <ReviewSection title="Terms & Policies" step={4} onEdit={goTo}>
          <ReviewRow
            label="Payment Methods"
            value={
              form.paymentMethods.length > 0
                ? form.paymentMethods.join(", ")
                : "None selected"
            }
          />
          <ReviewRow
            label="Shipping"
            value={
              form.shippingInfo
                ? truncateText(form.shippingInfo, 100)
                : "Not specified"
            }
          />
          <ReviewRow
            label="Return Policy"
            value={
              form.returnPolicy
                ? truncateText(form.returnPolicy, 100)
                : "Not specified"
            }
          />
          <ReviewRow
            label="Confirmations"
            value={
              allConfirmed ? (
                <span className="text-green-400 font-medium">All confirmed ✓</span>
              ) : (
                <span className="text-amber-400 font-medium">Incomplete</span>
              )
            }
          />
        </ReviewSection>

        {/* Final Notice */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#c8a44e] shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-500 space-y-1">
              <p className="font-medium text-zinc-400">Before you publish</p>
              <p>• A listing fee of 2% will be charged upon successful sale.</p>
              <p>• You can edit most details even after publishing (except price fields).</p>
              <p>• Auctions cannot be cancelled once a bid has been placed.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (s: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
        <button
          onClick={() => onEdit(step)}
          className="text-xs text-[#c8a44e] hover:text-[#d4b565] font-medium transition-colors"
        >
          Edit
        </button>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span
        className={cn(
          "text-xs text-right",
          highlight ? "text-green-400 font-medium" : "text-zinc-300"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}
