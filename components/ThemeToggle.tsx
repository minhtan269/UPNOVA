"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);

    // Sync state with DOM on mount
    useEffect(() => {
        setMounted(true);
        const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
            document.documentElement.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");
    }, []);

    const toggle = () => {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);

        // Update DOM
        if (next === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.setAttribute("data-theme", "light");
            document.documentElement.classList.remove("dark");
        }

        // Save preference
        localStorage.setItem("acrm-theme", next);
    };

    // Avoid hydration mismatch by rendering a placeholder until mounted
    if (!mounted) {
        return <div className="w-9 h-9" />;
    }

    return (
        <button
            onClick={toggle}
            className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label="Toggle Dark Mode"
        >
            {/* Sun icon */}
            <svg
                className={`absolute h-5 w-5 transition-all duration-300 ${theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
                    }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
            </svg>
            {/* Moon icon */}
            <svg
                className={`absolute h-5 w-5 text-gray-100 transition-all duration-300 ${theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                    }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
            </svg>
        </button>
    );
}
