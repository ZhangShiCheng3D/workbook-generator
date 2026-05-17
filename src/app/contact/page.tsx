import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            Have questions or feedback? We would love to hear from you.
          </p>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Email</p>
            <a
              href="mailto:support@practicepacks.com"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              support@practicepacks.com
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            We typically respond within 24 hours on school days.
          </p>
          <Button variant="outline" render={<Link href="/" />}>
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
