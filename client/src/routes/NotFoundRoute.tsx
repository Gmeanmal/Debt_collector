import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <h1 className="font-serif italic text-2xl text-text">Something broke.</h1>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-text-mute text-sm">An unexpected error occurred.</p>
          <div className="rounded-md bg-bad-bg text-bad-ink text-xs font-mono px-4 py-3 text-left break-words">
            {message}
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="ghost" asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

function NotFoundView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <p className="text-xs uppercase tracking-widest text-text-faint">404</p>
          <h1 className="font-serif italic text-2xl text-text">Not found.</h1>
        </CardHeader>
        <CardContent>
          <p className="text-text-mute text-sm">
            The page you were looking for doesn&apos;t exist or was moved.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="ghost" asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
