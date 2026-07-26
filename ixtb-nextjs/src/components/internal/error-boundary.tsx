"use client";

import { logClientError } from "@/src/lib/common/log-client-error";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { PageError } from "./error";

export interface IErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback. Defaults to PageError. */
  fallback?: ReactNode | ((error: Error) => ReactNode);
  /** Optional label included in the log line. */
  name?: string;
}

interface IErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors, logs them, and shows a fallback in production.
 * In development, rethrows so the Next.js / React error overlay stays prominent.
 *
 * Use this to contain a specific risky subtree so the rest of the page survives.
 * For whole-page failures, the `error.tsx` route boundaries handle it (and offer
 * a retry) without any wrapping.
 */
export class ErrorBoundary extends Component<
  IErrorBoundaryProps,
  IErrorBoundaryState
> {
  state: IErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): IErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logClientError({
      error,
      source: this.props.name ?? "ErrorBoundary",
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (process.env.NODE_ENV === "development") {
      // Surface in the Next.js / React overlay instead of a quiet fallback.
      throw error;
    }

    const { fallback } = this.props;
    if (typeof fallback === "function") {
      return fallback(error);
    }
    if (fallback !== undefined) {
      return fallback;
    }

    return <PageError error={error} />;
  }
}
