"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Handles SPA redirects from GitHub Pages 404.html.
 * When a deep link like /laws/Kap.%20154/ hits a 404,
 * GitHub Pages serves 404.html which redirects to /?p=/laws/Kap.%20154/
 * This component picks up the ?p= param and navigates to the right page.
 */
export default function SpaRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectPath = searchParams.get("p");
    if (redirectPath) {
      // Clean URL and navigate
      const cleanPath = decodeURIComponent(redirectPath);
      router.replace(cleanPath);
    }
  }, [searchParams, router]);

  return null;
}
