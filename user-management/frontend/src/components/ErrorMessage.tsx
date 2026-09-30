interface ErrorMessageProps {
  message: string;
}

/** role="alert" makes screen readers announce the error as soon as it appears. */
export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div role="alert" className="alert alert-error">
      {message}
    </div>
  );
}
