import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Full privacy policy coming soon. In the meantime, here is what you need to know:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>We do not collect or store any student data.</li>
            <li>We do not create student accounts or profiles.</li>
            <li>
              Teacher account data (email, name, school) is used solely to provide
              our service and is never sold or shared with third parties.
            </li>
            <li>
              AI-generated content is processed via the Anthropic API with zero-retention
              mode enabled.
            </li>
            <li>
              All data is stored in US-based servers (Supabase US region).
            </li>
            <li>We are FERPA and COPPA compliant by design.</li>
          </ul>
          <p>
            If you have any questions about our privacy practices, please contact us
            at{" "}
            <a
              href="mailto:support@practicepacks.com"
              className="text-primary underline-offset-4 hover:underline"
            >
              support@practicepacks.com
            </a>
            .
          </p>
          <div className="pt-4 text-center">
            <Button variant="outline" render={<Link href="/" />}>
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
