interface LoadingSpinnerProps {
  label?: string;
}

/** role="status" lets screen readers (and tests) find loading indicators. */
export function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <p role="status" className="loading">
      <span className="spinner" aria-hidden="true" />
      {label}
    </p>
  );
}
