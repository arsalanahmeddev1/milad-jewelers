import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
  component: AdminOrders,
});

type OrderRow = {
  id: string;
  order_number: number;
  client_id: string;
  item_name: string;
  status: OrderStatus;
  created_at: string;
  profiles?: { full_name: string | null; company_name: string | null; email: string | null } | null;
};

function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [clients, setClients] = useState<{ id: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, client_id, item_name, status, created_at, profiles!orders_client_id_fkey(full_name, company_name, email)")
      .order("created_at", { ascending: false });
    setOrders((data as any) || []);
  };

  useEffect(() => {
    load();
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "client");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length === 0) { setClients([]); return; }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, email")
        .in("id", ids);
      setClients(((data as any[]) || []).map((p) => ({ id: p.id, label: p.company_name || p.full_name || p.email })));
    })();
    const ch = supabase.channel("admin-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h2 className="font-serif text-xl md:text-2xl font-bold">Active Orders</h2>
          <NewOrderDialog open={open} setOpen={setOpen} clients={clients} onCreated={(id) => { load(); setOpen(false); navigate({ to: "/admin/orders/$id", params: { id } }); }} />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="pb-3 pr-4">Order #</th>
                <th className="pb-3 pr-4">Client</th>
                <th className="pb-3 pr-4">Item</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-4 pr-4 text-primary font-medium">#{o.order_number}</td>
                  <td className="py-4 pr-4 font-semibold">{o.profiles?.company_name || o.profiles?.full_name || o.profiles?.email || "—"}</td>
                  <td className="py-4 pr-4">{o.item_name}</td>
                  <td className="py-4 pr-4">{format(new Date(o.created_at), "MMM d, yyyy")}</td>
                  <td className="py-4 pr-4"><StatusBadge status={o.status} /></td>
                  <td className="py-4 text-right">
                    <Link to="/admin/orders/$id" params={{ id: o.id }} className="text-primary hover:underline text-sm">Manage</Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              to="/admin/orders/$id"
              params={{ id: o.id }}
              className="block border rounded-lg p-4 hover:shadow-sm hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-xs text-primary font-medium">#{o.order_number}</div>
                  <div className="font-semibold truncate">{o.profiles?.company_name || o.profiles?.full_name || o.profiles?.email || "—"}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="text-sm truncate">{o.item_name}</div>
              <div className="text-xs text-muted-foreground mt-1">{format(new Date(o.created_at), "MMM d, yyyy")}</div>
            </Link>
          ))}
          {orders.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No orders yet</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function NewOrderDialog({ open, setOpen, clients, onCreated }: { open: boolean; setOpen: (v: boolean) => void; clients: { id: string; label: string }[]; onCreated: (id: string) => void }) {
  const [clientId, setClientId] = useState("");
  const [clientPo, setClientPo] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [metalType, setMetalType] = useState("");
  const [diamondType, setDiamondType] = useState("");
  const [ringSize, setRingSize] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setClientId(""); setClientPo(""); setCategory(""); setDescription("");
    setMetalType(""); setDiamondType(""); setRingSize(""); setDueDate(""); setQuote("");
  };

  const create = async () => {
    if (!clientId) return toast.error("Please select a client");
    if (!clientPo) return toast.error("Job name is required");
    setLoading(true);
    const { data, error } = await supabase.from("orders").insert({
      client_id: clientId,
      item_name: clientPo,
      client_po: clientPo,
      category: category || null,
      description: description || null,
      metal_type: metalType || null,
      diamond_type: diamondType || null,
      ring_size: ringSize || null,
      projected_due_date: dueDate || null,
      estimated_quote: quote ? Number(quote) : null,
      status: "new_inquiry",
    }).select("id").single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Order created");
    reset();
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" />New Order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Order</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client PO / Job Name</Label>
              <Input value={clientPo} onChange={(e) => setClientPo(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Jewelry Type</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {["Ring", "Necklace", "Bracelet", "Earrings", "Pendant", "Repair", "Other"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Metal Type</Label>
              <Input value={metalType} onChange={(e) => setMetalType(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Diamond Type</Label>
              <Input value={diamondType} onChange={(e) => setDiamondType(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Ring Size</Label>
              <Input value={ringSize} onChange={(e) => setRingSize(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Projected Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Estimated Quote</Label>
              <Input type="number" value={quote} onChange={(e) => setQuote(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <textarea
              className="mt-1 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter detailed description..."
            />
          </div>
        </div>
        <DialogFooter><Button onClick={create} disabled={loading}>Create Order</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
