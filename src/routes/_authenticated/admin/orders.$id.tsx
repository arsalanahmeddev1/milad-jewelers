import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Upload } from "lucide-react";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { FileDrop } from "@/components/file-drop";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  component: OrderManage,
});

type Order = {
  id: string;
  order_number: number;
  client_id: string;
  item_name: string;
  category: string | null;
  description: string | null;
  metal_type: string | null;
  diamond_type: string | null;
  ring_size: string | null;
  projected_due_date: string | null;
  estimated_quote: number | null;
  status: OrderStatus;
  profiles?: { full_name: string | null; company_name: string | null; email: string | null } | null;
};

type FileRow = { id: string; kind: "reference" | "approval"; storage_path: string; file_name: string | null; approved: boolean | null };

function OrderManage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, profiles!orders_client_id_fkey(full_name, company_name, email)")
      .eq("id", id).maybeSingle();
    setOrder(data as any);
    const { data: f } = await supabase.from("order_files").select("*").eq("order_id", id).order("created_at");
    setFiles((f as any) || []);
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!files.length) return;
    Promise.all(files.map(async (f) => {
      const { data } = await supabase.storage.from("order-files").createSignedUrl(f.storage_path, 3600);
      return [f.id, data?.signedUrl || ""] as const;
    })).then((entries) => setUrls(Object.fromEntries(entries)));
  }, [files]);

  const save = async () => {
    if (!order) return;
    const { error } = await supabase.from("orders").update({
      item_name: order.item_name,
      category: order.category,
      description: order.description,
      metal_type: order.metal_type,
      diamond_type: order.diamond_type,
      ring_size: order.ring_size,
      projected_due_date: order.projected_due_date,
      estimated_quote: order.estimated_quote,
      status: order.status,
    }).eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
  };

  const upload = async (file: File, kind: "approval" | "reference") => {
    const path = `${id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("order-files").upload(path, file);
    if (error) return toast.error(error.message);
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("order_files").insert({ order_id: id, kind, storage_path: path, file_name: file.name, uploaded_by: userData.user?.id });
    toast.success("Uploaded");
    load();
  };

  if (!order) return <div className="text-muted-foreground">Loading…</div>;
  const clientName = order.profiles?.company_name || order.profiles?.full_name || order.profiles?.email || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4 mr-1" />Back to Orders
      </Link>

      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Client</div>
        <h2 className="font-serif text-2xl md:text-3xl font-bold mt-1 break-words">{clientName}</h2>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="section-label">Order #{order.order_number}</div>
          <StatusBadge status={order.status} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Item Name" value={order.item_name} onChange={(v) => setOrder({ ...order, item_name: v })} />
          <Field label="Category" value={order.category || ""} onChange={(v) => setOrder({ ...order, category: v })} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea className="mt-1" value={order.description || ""} onChange={(e) => setOrder({ ...order, description: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Metal Type" value={order.metal_type || ""} onChange={(v) => setOrder({ ...order, metal_type: v })} />
          <Field label="Diamond Type" value={order.diamond_type || ""} onChange={(v) => setOrder({ ...order, diamond_type: v })} />
          <Field label="Ring Size" value={order.ring_size || ""} onChange={(v) => setOrder({ ...order, ring_size: v })} />
          <Field label="Projected Due Date" type="date" value={order.projected_due_date || ""} onChange={(v) => setOrder({ ...order, projected_due_date: v })} />
          <Field label="Estimated Quote" type="number" value={order.estimated_quote?.toString() || ""} onChange={(v) => setOrder({ ...order, estimated_quote: v ? Number(v) : null })} />
          <div>
            <Label>Status</Label>
            <Select value={order.status} onValueChange={(v) => setOrder({ ...order, status: v as OrderStatus })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_inquiry">New Inquiry</SelectItem>
                <SelectItem value="awaiting_cad_approval">Awaiting CAD Approval</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save}>Save Changes</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="section-label mb-2">Upload Client Approvals</div>
        <p className="text-sm text-muted-foreground mb-4">Upload CADs or photos for the client to review and approve.</p>
        <FileDrop label="Upload CAD / photo" onFile={(f) => upload(f, "approval")} />
        <FileList files={files.filter((f) => f.kind === "approval")} urls={urls} />
      </Card>

      <Card className="p-6">
        <div className="section-label mb-2">Client Reference Images</div>
        <FileList files={files.filter((f) => f.kind === "reference")} urls={urls} />
        {files.filter((f) => f.kind === "reference").length === 0 && (
          <p className="text-sm text-muted-foreground">No references uploaded by the client yet.</p>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}


function FileList({ files, urls }: { files: FileRow[]; urls: Record<string, string> }) {
  if (!files.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {files.map((f) => (
        <a key={f.id} href={urls[f.id]} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border bg-muted">
          {urls[f.id] && /\.(png|jpe?g|gif|webp)$/i.test(f.storage_path) ? (
            <img src={urls[f.id]} alt={f.file_name || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
              <Upload className="w-6 h-6 text-muted-foreground mb-2" />
              <div className="text-xs truncate w-full">{f.file_name}</div>
            </div>
          )}
        </a>
      ))}
    </div>
  );
}
