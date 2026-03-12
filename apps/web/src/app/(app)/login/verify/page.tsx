import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-10 flex items-center gap-2 font-semibold tracking-tight">
        <span className="text-xl text-primary">◇</span>
        DependWatch
      </Link>
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent you a sign-in link. Click it to continue to DependWatch.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Didn’t get it? Check spam, or in local dev use the link printed in the terminal where <code className="rounded bg-muted px-1 font-mono">npm run dev</code> is running.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button variant="outline">Back to sign in</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
