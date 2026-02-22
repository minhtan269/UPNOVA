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
    const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (saved === "dark" || (!saved && preferDark)) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();
        `,
            }}
        />
    );
}
