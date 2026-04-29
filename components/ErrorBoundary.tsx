"use client";

import { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.section ?? "unknown"}]:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="border border-red-500/30 bg-red-500/5 p-4">
          <div className="font-mono text-xs text-red-600 uppercase tracking-widest mb-1">
            render_error{this.props.section ? ` · ${this.props.section}` : ""}
          </div>
          <p className="font-mono text-xs text-red-400/80">
            {this.state.error?.message ?? "An unexpected error occurred in this section."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 font-mono text-[10px] text-red-700 border border-red-500/30 px-2 py-1 hover:border-red-500/60 transition-colors cursor-pointer"
          >
            retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
