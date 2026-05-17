import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">About Practice Packs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-lg leading-relaxed text-muted-foreground">
            We help US K-12 teachers generate printable practice workbooks in 90 seconds.
            From a single topic, you get a complete Student Copy + Teacher Copy with
            Answer Key and Rubric &mdash; no prompt engineering required.
          </p>
          <p className="text-sm text-muted-foreground">
            Our mission is to save teachers time on lesson prep so they can focus on
            what matters most: their students.
          </p>
          <p className="text-sm text-muted-foreground">
            Designed for US K-12 teachers. No student accounts. No student data collected.
            FERPA and COPPA compliant by design.
          </p>
          <Button render={<Link href="/signup" />} className="mt-4">
            Start Free
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
