import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState({ full_name: "", company_name: "", phone: "", email: "" });
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("full_name, company_name, phone, email").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({
          full_name: data.full_name || "",
          company_name: data.company_name || "",
          phone: data.phone || "",
          email: data.email || user.email || "",
        });
      });
  }, [user.id, user.email]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      company_name: profile.company_name,
      phone: profile.phone,
    }).eq("id", user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    setPw({ next: "", confirm: "" });
    toast.success("Password updated");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-6">
        <h2 className="font-serif text-2xl font-bold mb-4">Profile Information</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={profile.email} disabled className="mt-1" />
          </div>
          <div>
            <Label>Company Name</Label>
            <Input className="mt-1" value={profile.company_name} onChange={(e) => setProfile({ ...profile, company_name: e.target.value })} />
          </div>
          <div>
            <Label>Full Name</Label>
            <Input className="mt-1" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input className="mt-1" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={savingProfile}>{savingProfile ? "Saving..." : "Save Profile"}</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-serif text-2xl font-bold mb-4">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" className="mt-1" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} minLength={6} required />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" className="mt-1" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} minLength={6} required />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={savingPw}>{savingPw ? "Updating..." : "Update Password"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
