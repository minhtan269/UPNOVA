"use client";

import { useSession } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";

export default function LoginModal() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (status === "unauthenticated") {
      setIsOpen(true);
    } else if (status === "authenticated") {
      setIsOpen(false);
    }
  }, [status]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { 
        redirect: true,
        callbackUrl: "/"
      });
    } catch (error) {
      console.error("Sign in error:", error);
      setIsLoading(false);
    }
  };

  if (status === "authenticated" || status === "loading" || !isOpen) {
    return null;
  }

  return (
    <>
      {/* Background Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 pointer-events-none" />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          {/* Modal Card with gradient background */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-slate-600/30 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
            {/* Decorative gradient orb */}
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />

            {/* Content */}
            <div className="relative px-8 py-12">
              {/* Project Name */}
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {t("login.projectName")}
                </h1>
              </div>

              {/* Greeting Section */}
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {t("login.welcome")}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t("login.subtitle")}
                </p>
              </div>

              {/* Google Sign In Button */}
              <div className="space-y-4 mb-8">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full group relative flex items-center justify-center gap-3 overflow-hidden rounded-xl bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md border border-slate-600/50 hover:border-slate-400/80 py-3.5 px-6 font-medium text-slate-100 transition-all duration-300 shadow-xl hover:shadow-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {/* Google Logo SVG */}
                  <svg
                    className="w-5 h-5 transition-transform group-hover:scale-110"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC02"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="text-base font-semibold">
                    {isLoading ? t("login.processing") : t("login.googleSignIn")}
                  </span>
                </button>
              </div>

            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full animate-bounce" />
                  <div
                    className="w-2.5 h-2.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2.5 h-2.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
