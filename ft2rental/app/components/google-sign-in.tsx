"use client";

import { useEffect, useRef, useState } from "react";
import { getGoogleClientId } from "@/lib/rental-locations";
import { useAuth } from "@/app/components/auth-provider";

type GoogleCredentialResponse = {
  credential: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
            },
          ) => void;
        };
      };
    };
  }
}

export default function GoogleSignIn() {
  const { state, user, signOut, signInWithGoogleToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = getGoogleClientId();

  useEffect(() => {
    if (!clientId || state !== "signed-out" || !buttonRef.current) {
      return;
    }

    const existingScript = document.getElementById("google-gsi-script") as HTMLScriptElement | null;
    const script: HTMLScriptElement = existingScript ?? document.createElement("script");

    if (!existingScript) {
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const renderGoogleButton = () => {
      if (!window.google || !buttonRef.current) {
        return;
      }

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            setError(null);
            await signInWithGoogleToken(credential);
          } catch (signInError) {
            setError(signInError instanceof Error ? signInError.message : "Failed to sign in with Google.");
          }
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
      });
    };

    if (window.google) {
      renderGoogleButton();
      return;
    }

    script.addEventListener("load", renderGoogleButton, { once: true });
    return () => {
      script.removeEventListener("load", renderGoogleButton);
    };
  }, [clientId, signInWithGoogleToken, state]);

  if (state === "loading") {
    return <p className="text-xs text-stone-600 dark:text-stone-400">Checking session...</p>;
  }

  if (state === "signed-in" && user) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-stone-700 dark:text-stone-300">
        <span>
          Signed in as <strong>{user.displayName ?? user.anonymousAlias}</strong> (alias: {user.anonymousAlias})
        </span>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium hover:bg-stone-100 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (!clientId) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-400">
        Google sign-in is disabled. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to enable it.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <div ref={buttonRef} />
      <p className="text-xs text-stone-600 dark:text-stone-400">Use Google sign-in to verify places and post reviews.</p>
      {error ? <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
