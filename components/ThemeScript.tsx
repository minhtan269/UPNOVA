"use client";

// Script to prevent FOUC (Flash of Unstyled Content)
// Run this before React hydration to set the correct theme immediately.
export function ThemeScript() {
    return (
        <script
            dangerouslySetInnerHTML={{
                __html: `
(function() {
  try {
    const saved = localStorage.getItem("acrm-theme");
    const theme = saved === "light" || saved === "dark" ? saved : "dark";

    // Product default: dark theme for first visit.
    if (!saved) {
      localStorage.setItem("acrm-theme", "dark");
    }

    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();
        `,
            }}
        />
    );
}
