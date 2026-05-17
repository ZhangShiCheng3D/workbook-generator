"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  CreditCard,
  Bell,
  Globe,
  Lock,
  Mail,
  BookOpen,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";
import { useUserStore } from "@/stores/user-store";
import { notify } from "@/lib/toast";

const planLabels: Record<string, { name: string; description: string; monthlyGenerations: number | string; color: string }> = {
  free: { name: 'Free', description: '3 workbooks/month · Basic PDF layouts', monthlyGenerations: 3, color: 'text-gray-600' },
  pro: { name: 'Pro', description: 'Unlimited workbooks · Premium PDF · Auto-grading', monthlyGenerations: 'Unlimited', color: 'text-indigo-600' },
  school: { name: 'School', description: 'Unlimited for all teachers · Admin dashboard', monthlyGenerations: 'Unlimited', color: 'text-purple-600' },
  district: { name: 'District', description: 'Custom integrations · Dedicated support', monthlyGenerations: 'Unlimited', color: 'text-amber-600' },
};

export default function SettingsPage() {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
    }
  }, [user]);

  const plan = planLabels[user?.plan ?? 'free'] ?? planLabels.free;
  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'User';
  const avatarInitial = (displayName[0] || 'U').toUpperCase();

  const handleSaveProfile = async () => {
    setSaving(true);
    // Simulate save (profile writes go through Supabase)
    await new Promise((r) => setTimeout(r, 500));
    if (user) {
      setUser({ ...user, name });
    }
    setSaving(false);
    setSaved(true);
    notify.success('Profile updated');
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account, preferences, and subscription.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your personal information.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-indigo-100 text-xl font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                {avatarInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email ?? ''} disabled className="mt-1" />
          </div>
          <Button variant="outline" size="sm" onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saved ? <Check className="mr-2 h-4 w-4 text-green-600" /> : null}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Plan & Billing</CardTitle>
              <CardDescription>Your current subscription and usage.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{plan.name} Plan</p>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>
            </div>
            <Badge variant="outline">Current</Badge>
          </div>

          {user?.plan === 'free' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Upgrade to Pro</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  $8/month &middot; Unlimited workbooks &middot; Premium PDF &middot; No watermarks
                </p>
                <Button size="sm" className="mt-3 w-full" onClick={async () => {
                  const res = await fetch('/api/stripe/checkout?plan=pro', { method: 'POST' });
                  const body = await res.json();
                  if (body.data?.url) window.location.href = body.data.url;
                }}>
                  Upgrade to Pro — $8/month
                </Button>
              </div>
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">School Plan</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  $99/month &middot; 10 teachers &middot; Admin dashboard &middot; School Library
                </p>
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={async () => {
                  const res = await fetch('/api/stripe/checkout?plan=school', { method: 'POST' });
                  const body = await res.json();
                  if (body.data?.url) window.location.href = body.data.url;
                }}>
                  Upgrade to School — $99/month
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>Customize your experience.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Default Grade Level</p>
              <p className="text-xs text-muted-foreground">{user?.plan === 'free' ? 'Not available on Free plan' : 'Not set'}</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Default Subject</p>
              <p className="text-xs text-muted-foreground">{user?.plan === 'free' ? 'Not available on Free plan' : 'Not set'}</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive updates about new features</p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-base">Security</CardTitle>
              <CardDescription>Password and account security.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" size="sm" disabled>Change Password (Coming Soon)</Button>
          <Separator />
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Connected Accounts</p>
                <p className="text-xs text-muted-foreground">Link your Google or Microsoft account.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-3" disabled>Connect Google (Coming Soon)</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-base text-red-600 dark:text-red-400">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" disabled>Delete Account (Coming Soon)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
