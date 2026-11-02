"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_90%),transparent)]"
      />
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-xl text-center"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <Link href="/">
            <Logo size={48} />
          </Link>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
            <Lock className="h-3.5 w-3.5" />
            <span>Admin-Managed Access</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Registration Closed
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Public user registration is disabled. User accounts and restaurant profiles
            are created and managed exclusively by the system administrator.
          </p>
        </div>

        <div className="flex flex-col gap-3 my-6 text-left rounded-xl bg-muted/40 p-4 border border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Need an account?</span>
          </div>
          <p>
            Please contact your platform administrator (<span className="font-semibold text-foreground">swami</span>) to get credentials assigned to your restaurant.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            className="flex-1 h-11"
            variant="default"
            render={<Link href="/login" />}
          >
            <span>Sign In</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button
            className="flex-1 h-11"
            variant="outline"
            render={<Link href="/admin" />}
          >
            <span>Admin Portal</span>
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
