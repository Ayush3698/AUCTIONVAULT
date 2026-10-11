"use client";

import { useState } from "react";
import {
  CreditCard,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { Modal, ModalHeader, ModalTitle, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { inputBase } from "@/components/profile/verification-form";
import { cn } from "@/lib/utils";

type VaultEntry = { id: string; label: string };

interface VaultEditState {
  kind: "payment" | "shipping";
  id: string | null;
  label: string;
}

const initialPayments: VaultEntry[] = [
  { id: "pm-1", label: "•••• •••• •••• 4242" },
  { id: "pm-2", label: "BTC Wallet 0x74...bD38" },
];

const initialAddresses: VaultEntry[] = [
  { id: "ad-1", label: "123 Main St, New York, NY 10001" },
];

export function VaultSection() {
  const [payments, setPayments] = useState<VaultEntry[]>(initialPayments);
  const [addresses, setAddresses] = useState<VaultEntry[]>(initialAddresses);
  const [editing, setEditing] = useState<VaultEditState | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const openAdd = (kind: "payment" | "shipping") =>
    setEditing({ kind, id: null, label: "" });

  const openEdit = (kind: "payment" | "shipping", entry: VaultEntry) =>
    setEditing({ kind, id: entry.id, label: entry.label });

  const saveEntry = () => {
    if (!editing || !editing.label.trim()) return;
    const value = editing.label.trim();
    if (editing.id) {
      if (editing.kind === "payment") {
        setPayments((items) => items.map((i) => (i.id === editing.id ? { ...i, label: value } : i)));
      } else {
        setAddresses((items) => items.map((i) => (i.id === editing.id ? { ...i, label: value } : i)));
      }
    } else {
      const entry: VaultEntry = { id: `${editing.kind}-${Date.now()}`, label: value };
      if (editing.kind === "payment") setPayments((items) => [...items, entry]);
      else setAddresses((items) => [...items, entry]);
    }
    setSaved(editing.kind === "payment" ? "Payment method saved." : "Shipping address saved.");
    setEditing(null);
    window.setTimeout(() => setSaved(null), 2500);
  };

  const removeEntry = (kind: "payment" | "shipping", id: string) => {
    if (kind === "payment") setPayments((items) => items.filter((i) => i.id !== id));
    else setAddresses((items) => items.filter((i) => i.id !== id));
  };

  return (
    <div className="mt-6 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Saved Payment Methods</p>
        <div className="space-y-2">
          {payments.length === 0 && (
            <p className="rounded-xl border border-zinc-800/60 bg-zinc-800/30 px-4 py-3 text-xs text-zinc-500">
              No payment methods saved yet.
            </p>
          )}
          {payments.map((method) => (
            <div key={method.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-800/40 border border-zinc-800/60 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <CreditCard className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                <span className="truncate text-sm text-zinc-300 font-mono">{method.label}</span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit("payment", method)}
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-500 transition hover:text-zinc-300"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeEntry("payment", method.id)}
                  className="inline-flex items-center gap-1 text-[10px] text-red-400/80 transition hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openAdd("payment")}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-transparent px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Payment Method
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Saved Shipping Addresses</p>
        <div className="space-y-2">
          {addresses.length === 0 && (
            <p className="rounded-xl border border-zinc-800/60 bg-zinc-800/30 px-4 py-3 text-xs text-zinc-500">
              No shipping addresses saved yet.
            </p>
          )}
          {addresses.map((address) => (
            <div key={address.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-800/40 border border-zinc-800/60 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <MapPin className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                <span className="truncate text-sm text-zinc-300">{address.label}</span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit("shipping", address)}
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-500 transition hover:text-zinc-300"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeEntry("shipping", address.id)}
                  className="inline-flex items-center gap-1 text-[10px] text-red-400/80 transition hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openAdd("shipping")}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-transparent px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Shipping Address
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3">
        <Shield className="h-4 w-4 text-amber-400 flex-shrink-0" />
        <p className="text-xs text-amber-300/80">
          Vault entries are stored locally in the current browser session for now. Private keys and
          seed phrases are never stored.
        </p>
      </div>

      {saved && <p className="text-xs font-medium text-green-400">{saved}</p>}

      <Modal open={editing !== null} onClose={() => setEditing(null)} className="max-w-md">
        <ModalHeader className="mt-1">
          <ModalTitle>
            {editing?.kind === "payment" ? (
              <>
                <CreditCard className="mr-2 inline h-4 w-4 text-[#c8a44e]" />
                {editing?.id ? "Edit Payment Method" : "Add Payment Method"}
              </>
            ) : (
              <>
                <MapPin className="mr-2 inline h-4 w-4 text-[#c8a44e]" />
                {editing?.id ? "Edit Shipping Address" : "Add Shipping Address"}
              </>
            )}
          </ModalTitle>
        </ModalHeader>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
            {editing?.kind === "payment" ? "Payment method details" : "Shipping address"}
            <span className="text-[#c8a44e]">*</span>
          </span>
          <input
            autoFocus
            className={cn(inputBase)}
            placeholder={
              editing?.kind === "payment"
                ? "e.g. Visa •••• 4242"
                : "Enter a delivery address"
            }
            value={editing?.label ?? ""}
            onChange={(e) => setEditing((s) => (s ? { ...s, label: e.target.value } : s))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && editing) saveEntry();
            }}
          />
        </label>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" onClick={saveEntry} disabled={!editing?.label.trim()}>
            Save
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}