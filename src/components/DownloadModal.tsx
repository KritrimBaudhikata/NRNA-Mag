"use client";

import { FormEvent, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

type Step = "email" | "code" | "done";

type DownloadModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DownloadModal({ open, onClose }: DownloadModalProps) {
  const { t, locale } = useLocale();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const errorMessage = (key: string | null) => {
    if (!key) return null;
    const map: Record<string, string> = {
      invalidEmail: t("download.invalidEmail"),
      consentRequired: t("download.consentRequired"),
      invalidCode: t("download.invalidCode"),
      rateLimited: t("download.rateLimited"),
    };
    return map[key] ?? t("download.invalidCode");
  };

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, locale, website: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "invalidEmail");
        return;
      }
      setStep("code");
    } finally {
      setBusy(false);
    }
  };

  const verifyAndDownload = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "invalidCode");
        return;
      }
      setStep("done");
      const link = document.createElement("a");
      link.href = "/api/download/pdf";
      link.download = "Everest-Day-Hong-Kong-2026.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setStep("email");
    setCode("");
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("download.title")}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t("download.close")}
          >
            ×
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage(error)}
          </p>
        )}

        {step === "email" && (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label
                htmlFor="download-email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t("download.email")}
              </label>
              <input
                id="download-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63]"
              />
            </div>
            <div className="flex gap-2 text-sm text-gray-700">
              <input
                id="download-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
                required
              />
              <label htmlFor="download-consent">{t("download.consent")}</label>
            </div>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="sr-only"
              aria-label="Leave this field empty"
            />
            <button
              type="submit"
              disabled={busy || !consent}
              className="w-full rounded-lg bg-[#E91E63] py-2.5 font-medium text-white hover:bg-[#c2185b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("download.sendCode")}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyAndDownload} className="space-y-4">
            <p className="text-sm text-gray-600">{t("download.codeSent")}</p>
            <div>
              <label
                htmlFor="download-code"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                {t("download.codeLabel")}
              </label>
              <input
                id="download-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest text-gray-900 outline-none focus:border-[#E91E63] focus:ring-1 focus:ring-[#E91E63]"
              />
            </div>
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full rounded-lg bg-[#E91E63] py-2.5 font-medium text-white hover:bg-[#c2185b] disabled:opacity-60"
            >
              {t("download.verify")}
            </button>
          </form>
        )}

        {step === "done" && (
          <p className="text-center text-gray-700">{t("download.success")}</p>
        )}
      </div>
    </div>
  );
}
