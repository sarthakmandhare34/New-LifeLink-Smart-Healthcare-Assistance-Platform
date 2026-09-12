import { cn } from "@/lib/utils";                                                              // Classname merger
import { AlertTriangle, RotateCcw } from "lucide-react";                                        // Warning and reload icons
import { Component, ReactNode } from "react";                                                   // React class component types

interface Props {
  children: ReactNode;                                                                          // Wrapped tree
}

interface State {
  hasError: boolean;                                                                            // Error presence flag
  error: Error | null;                                                                          // Caught error object
}

// =========================================================================================
// REACT COMPONENT ERROR BOUNDARY
// Catches unexpected runtime JavaScript exceptions anywhere in the React child tree.
// Prevents complete application white-screening and displays a friendly recovery screen.
// =========================================================================================
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };                                              // Initial healthy state
  }

  // Lifecycle invoked when child component throws error
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };                                                           // Update state to render fallback UI
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">An unexpected error occurred.</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <pre className="text-sm text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}                                                       {/* Debug stack trace */}
              </pre>
            </div>

            {/* Browser reload recovery trigger */}
            <button
              onClick={() => window.location.reload()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;                                                                 // Healthy render pass-through
  }
}

export default ErrorBoundary;
