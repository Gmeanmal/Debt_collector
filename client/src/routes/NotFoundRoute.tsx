import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";

export function NotFoundRoute() {
  return <NotFoundView />;
}

export function RouterErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundView />;
  }
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-surface px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-base-text">Unexpected error</h1>
        <p className="text-base-text-muted">{message}</p>
        <Link
          to="/"
          className="rounded-md bg-pink-primary px-4 py-2 text-sm font-medium text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

function NotFoundView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-surface px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-xs uppercase tracking-widest text-base-text-muted">404</p>
        <h1 className="text-2xl font-semibold text-base-text">Page not found</h1>
        <p className="text-base-text-muted">
          The page you were looking for doesn&apos;t exist or was moved.
        </p>
        <Link
          to="/"
          className="rounded-md bg-pink-primary px-4 py-2 text-sm font-medium text-white"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
