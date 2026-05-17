import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Full terms of service coming soon. Key points:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Practice Packs is a tool for teachers to generate printable workbook
              materials. You are responsible for reviewing all AI-generated content
              before distributing it to students.
            </li>
            <li>
              AI never auto-publishes &mdash; teachers must review and approve all
              content before use.
            </li>
            <li>
              Free tier includes a limited number of workbook generations per month.
              Paid plans unlock additional generations and features.
            </li>
            <li>
              We reserve the right to modify or discontinue the service with reasonable
              notice. Refunds are handled per our refund policy.
            </li>
            <li>
              By using Practice Packs, you agree to these terms and our Privacy Policy.
            </li>
          </ul>
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
