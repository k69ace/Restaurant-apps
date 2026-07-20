"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Self-service org bootstrap: the first person from a restaurant/group signs
// up here, which creates their Organization, first Location, and an
// org_admin Membership in one step (see
// supabase/migrations/0005_org_bootstrap.sql). Every subsequent user for
// that org is invited by an org_admin from Settings > Users, not through
// this page — this page is "create a new tenant," not "join an existing
// one."
export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (signUpError) {
      setIsSubmitting(false);
      setError(signUpError.message);
      return;
    }

    // Email confirmation required, no session yet: the org gets created on
    // first login instead — see /app's redirect-to-onboarding logic.
    if (!signUpData.session) {
      setIsSubmitting(false);
      setPendingConfirmation(true);
      return;
    }

    const { error: bootstrapError } = await supabase.rpc("create_organization_with_admin", {
      org_name: organizationName,
      location_name: locationName,
    });

    setIsSubmitting(false);

    if (bootstrapError) {
      setError(bootstrapError.message);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  if (pendingConfirmation) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <h1 className="mb-2 text-2xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted">
          We sent a confirmation link to {email}. Click it, then come back and{" "}
          <Link href="/login" className="text-accent-strong underline">
            sign in
          </Link>{" "}
          — your organization will be set up automatically on first login.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-1 text-2xl font-semibold">Create your organization</h1>
      <p className="mb-8 text-sm text-muted">
        You&apos;ll be the Org Admin — add locations, targets, and teammates from Settings once
        you&apos;re in.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field id="displayName" label="Your name" value={displayName} onChange={setDisplayName} />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <Field
          id="organizationName"
          label="Organization name"
          placeholder="e.g. Walnut Street Hospitality Group"
          value={organizationName}
          onChange={setOrganizationName}
        />
        <Field
          id="locationName"
          label="First location name"
          placeholder="e.g. Walnut Street — Downtown"
          value={locationName}
          onChange={setLocationName}
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded-lg bg-accent px-4 py-2.5 text-base font-medium text-background disabled:opacity-60"
        >
          {isSubmitting ? "Creating…" : "Create organization"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-strong underline">
          Sign in
        </Link>
        .
      </p>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-lg border border-border bg-transparent px-4 py-2.5 text-base"
      />
    </div>
  );
}
