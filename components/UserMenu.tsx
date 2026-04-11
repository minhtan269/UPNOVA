"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useACRMStore } from "@/lib/store";

export function UserMenu() {
  const { data: session, status } = useSession();
  const { clearSession } = useACRMStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="w-10 h-10 bg-slate-700 rounded-full animate-pulse" />
    );
  }

  // Nếu chưa login, không hiển thị gì (middleware sẽ redirect)
  if (!session?.user) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center hover:opacity-80 transition"
        title={session.user.name || "User"}
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || "User"}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full border-2 border-slate-600 hover:border-slate-400 transition"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {session.user.name?.[0] || "U"}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* User Info Section */}
          <div className="p-4 border-b border-slate-700 bg-slate-900/50">
            <p className="text-sm font-semibold text-white truncate">
              {session.user.name}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {session.user.email}
            </p>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={async () => {
                await signOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700/50 rounded-md transition duration-150"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

