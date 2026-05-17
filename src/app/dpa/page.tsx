import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DPAPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Data Processing Agreement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            A full Data Processing Agreement (DPA) is available upon request for
            school districts and institutions that require one.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact us at{" "}
            <a
              href="mailto:support@practicepacks.com"
              className="text-primary underline-offset-4 hover:underline"
            >
              support@practicepacks.com
            </a>{" "}
            to request a copy. We typically respond within 1-2 business days.
          </p>
          <p className="text-xs text-muted-foreground">
            Practice Packs is designed to be FERPA and COPPA compliant. We do not
            collect or store student data, and all teacher data is processed in
            accordance with our Privacy Policy.
          </p>
          <Button variant="outline" render={<Link href="/" />}>
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
