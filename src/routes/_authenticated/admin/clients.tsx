import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClientAccount, suspendClient, deleteClient } from "@/lib/admin-clients.functions";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  component: ClientsPage,
});

type ClientRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  suspended: boolean;
  active_orders: number;
};

function ClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    company_name: "",
    phone: "",
  });

  async function toggleSuspend(r: ClientRow) {
    try {
      await suspendClient({ user_id: r.id, suspend: !r.suspended });
      toast.success(r.suspended ? "Client reinstated" : "Client suspended");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    }
  }

  async function removeClient(r: ClientRow) {
    if (!confirm(`Permanently delete ${r.company_name || r.email}? This cannot be undone.`)) return;
    try {
      await deleteClient({ user_id: r.id });
      toast.success("Client deleted");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  }

  async function load() {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
    const ids = (roles || []).map((r: any) => r.user_id);
    if (ids.length === 0) { setRows([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, company_name, email, phone, suspended")
      .in("id", ids);
    const { data: orders } = await supabase.from("orders").select("client_id, status");
    const active = new Map<string, number>();
    (orders || []).forEach((o) => {
      if (o.status !== "completed") active.set(o.client_id, (active.get(o.client_id) || 0) + 1);
    });
    setRows(((profiles as any[]) || []).map((p) => ({
      id: p.id, full_name: p.full_name, company_name: p.company_name, email: p.email, phone: p.phone,
      suspended: !!p.suspended,
      active_orders: active.get(p.id) || 0,
    })));
  }

  useEffect(() => { load(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }
    setSubmitting(true);
    try {
      await createClientAccount(form);
      toast.success("Client created");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", company_name: "", phone: "" });
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create client");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h2 className="font-serif text-xl md:text-2xl font-bold">Client Directory</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0"><UserPlus className="w-4 h-4 mr-2" />New Client</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create New Client</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="password">Temporary Password *</Label>
                  <Input id="password" type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <p className="text-xs text-muted-foreground mt-1">Share this with the client so they can sign in.</p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Client"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="pb-3 pr-4">Client ID</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Contact</th>
                <th className="pb-3 pr-4">Orders</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-4 pr-4 text-primary">C-{String(101 + i)}</td>
                  <td className="py-4 pr-4 font-semibold">
                    <div className="flex items-center gap-2">
                      {r.company_name || r.full_name || "—"}
                      {r.suspended && <Badge variant="destructive">Suspended</Badge>}
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div>{r.email}</div>
                    {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                  </td>
                  <td className="py-4 pr-4">{r.active_orders} Active</td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link to="/admin/messages/$clientId" params={{ clientId: r.id }} className="text-primary hover:underline">Message</Link>
                      <button onClick={() => toggleSuspend(r)} className="text-muted-foreground hover:text-foreground">
                        {r.suspended ? "Reinstate" : "Suspend"}
                      </button>
                      <button onClick={() => removeClient(r)} className="text-destructive hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No clients yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {rows.map((r, i) => (
            <div key={r.id} className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-primary">C-{String(101 + i)}</div>
                  <div className="font-semibold truncate flex items-center gap-2 flex-wrap">
                    {r.company_name || r.full_name || "—"}
                    {r.suspended && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{r.active_orders} Active</div>
              </div>
              <div className="text-sm">
                <div className="truncate">{r.email}</div>
                {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
              </div>
              <div className="flex items-center gap-3 pt-2 border-t text-sm">
                <Link to="/admin/messages/$clientId" params={{ clientId: r.id }} className="text-primary hover:underline">Message</Link>
                <button onClick={() => toggleSuspend(r)} className="text-muted-foreground hover:text-foreground">
                  {r.suspended ? "Reinstate" : "Suspend"}
                </button>
                <button onClick={() => removeClient(r)} className="text-destructive hover:underline ml-auto">Delete</button>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No clients yet</div>
          )}
        </div>
      </Card>
    </div>
  );
}
