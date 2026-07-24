import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { MiladWordmark } from "@/lib/logo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — Milad Jewelers" },
      { name: "description", content: "Access your Milad Jewelers client portal." },
      { property: "og:title", content: "Sign In — Milad Jewelers" },
      { property: "og:description", content: "Access your Milad Jewelers client portal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const handleAuth = async (asAdmin: boolean) => {
    if (!email || !password) return toast.error("Email and password required");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              company_name: companyName,
              role: asAdmin ? "admin" : "client",
            },
          },
        });
        if (error) throw error;
        toast.success("Account created!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <MiladWordmark />
      <p className="mt-6 text-muted-foreground">Client Portal Access</p>

      <Card className="mt-8 w-full max-w-md p-8">
        <h2 className="font-serif text-2xl font-bold">{mode === "signin" ? "Sign In" : "Create Account"}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "signin" ? "Enter your email to access your project dashboard." : "Register to start submitting inquiries."}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="company">Company Name</Label>
            <Input id="company" placeholder="Your Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="client@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>

          <Button className="w-full h-11" disabled={loading} onClick={() => handleAuth(false)}>
            {mode === "signin" ? "Sign In as Client" : "Sign Up as Client"}
          </Button>
          <Button variant="outline" className="w-full h-11" disabled={loading} onClick={() => handleAuth(true)}>
            {mode === "signin" ? "Sign In as Admin" : "Sign Up as Admin"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>Don't have an account?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Sign up</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signin")}>Sign in</button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
