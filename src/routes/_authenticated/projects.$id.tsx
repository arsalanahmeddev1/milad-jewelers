import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Clock, Check, CircleCheck } from "lucide-react";
import { toast } from "sonner";
import { FileDrop } from "@/components/file-drop";
import type { OrderStatus } from "@/components/status-badge";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  component: ProjectDetails,
});

type Order = {
  id: string;
  order_number: number;
  item_name: string;
  category: string | null;
  description: string | null;
  metal_type: string | null;
  diamond_type: string | null;
  ring_size: string | null;
  projected_due_date: string | null;
  estimated_quote: number | null;
  client_po: string | null;
  status: OrderStatus;
};

type FileRow = { id: string; kind: "reference" | "approval"; storage_path: string; file_name: string | null; approved: boolean | null };

const timeline: { key: OrderStatus; label: string }[] = [
  { key: "new_inquiry", label: "Design Consultation" },
  { key: "awaiting_cad_approval", label: "CAD Modeling & Approval" },
  { key: "in_production", label: "Casting & Setting" },
  { key: "completed", label: "Final Polish & Inspection" },
];

function ProjectDetails() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const [order, setOrder] = useState<Order | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<{ company_name: string | null } | null>(null);

  const load = async () => {
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setOrder(data as any);
    const { data: f } = await supabase.from("order_files").select("*").eq("order_id", id).order("created_at");
    setFiles((f as any) || []);
  };
  useEffect(() => {
    load();
    supabase.from("profiles").select("company_name").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
    const ch = supabase.channel(`proj-${id}`).on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_files", filter: `order_id=eq.${id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user.id]);

  useEffect(() => {
    if (!files.length) return;
    Promise.all(files.map(async (f) => {
      const { data } = await supabase.storage.from("order-files").createSignedUrl(f.storage_path, 3600);
      return [f.id, data?.signedUrl || ""] as const;
    })).then((e) => setUrls(Object.fromEntries(e)));
  }, [files]);

  const submit = async () => {
    if (!order) return;
    const { error } = await supabase.from("orders").update({
      client_po: order.client_po,
      category: order.category,
      description: order.description,
      metal_type: order.metal_type,
      diamond_type: order.diamond_type,
      ring_size: order.ring_size,
      projected_due_date: order.projected_due_date,
      estimated_quote: order.estimated_quote,
      item_name: order.item_name === "New Inquiry" && order.client_po ? order.client_po : order.item_name,
    }).eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success("Order details submitted");
  };

  const uploadRef = async (file: File) => {
    const path = `${id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("order-files").upload(path, file);
    if (error) return toast.error(error.message);
    await supabase.from("order_files").insert({ order_id: id, kind: "reference", storage_path: path, file_name: file.name, uploaded_by: user.id });
    toast.success("Uploaded");
  };

  const decideApproval = async (fileId: string, approved: boolean) => {
    await supabase.from("order_files").update({ approved }).eq("id", fileId);
    if (approved) {
      await supabase.from("orders").update({ status: "in_production" }).eq("id", id);
    }
    toast.success(approved ? "Design approved" : "Changes requested");
  };

  if (!order) return <div className="text-muted-foreground">Loading…</div>;

  const approvals = files.filter((f) => f.kind === "approval");
  const stageIdx = timeline.findIndex((s) => s.key === order.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4 mr-1" />Back to Orders
      </Link>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Company Name</div>
        <h2 className="font-serif text-2xl md:text-3xl font-bold mt-1 break-words">{profile?.company_name || "—"}</h2>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="section-label">{order.status === "new_inquiry" ? "NEW INQUIRY" : `ORDER #${order.order_number}`}</div>
          <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{order.status === "new_inquiry" ? "Draft" : "Submitted"}</Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Client PO / Job Name" value={order.client_po || ""} onChange={(v) => setOrder({ ...order, client_po: v })} />
          <div>
            <Label>Jewelry Type</Label>
            <Select value={order.category || ""} onValueChange={(v) => setOrder({ ...order, category: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {["Ring", "Necklace", "Bracelet", "Earrings", "Pendant", "Repair", "Other"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea className="mt-1" placeholder="Enter detailed description..." value={order.description || ""} onChange={(e) => setOrder({ ...order, description: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Metal Type" value={order.metal_type || ""} onChange={(v) => setOrder({ ...order, metal_type: v })} />
          <Field label="Diamond Type" value={order.diamond_type || ""} onChange={(v) => setOrder({ ...order, diamond_type: v })} />
          <Field label="Ring Size" value={order.ring_size || ""} onChange={(v) => setOrder({ ...order, ring_size: v })} />
          <Field label="Projected Due Date" type="date" value={order.projected_due_date || ""} onChange={(v) => setOrder({ ...order, projected_due_date: v })} />
          <Field label="Estimated Quote" type="number" value={order.estimated_quote?.toString() || ""} onChange={(v) => setOrder({ ...order, estimated_quote: v ? Number(v) : null })} />
        </div>
        <div className="flex justify-end">
          <Button onClick={submit}>Submit Order Details</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="section-label mb-2">REFERENCE IMAGES</div>
        <p className="text-sm text-muted-foreground mb-4">Upload inspiration photos, sketches, or references for your design.</p>
        <FileDrop label="Upload Inspiration" onFile={uploadRef} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {files.filter((f) => f.kind === "reference").map((f) => (
            <a key={f.id} href={urls[f.id]} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border">
              {urls[f.id] && <img src={urls[f.id]} alt="" className="w-full h-full object-cover" />}
            </a>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="section-label mb-4">IMAGES FOR APPROVAL</div>
        {approvals.length === 0 ? (
          <div className="text-sm text-muted-foreground">No designs uploaded yet. You'll be notified when ready.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {approvals.map((f) => (
                <a key={f.id} href={urls[f.id]} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border relative">
                  {urls[f.id] && <img src={urls[f.id]} alt="" className="w-full h-full object-cover" />}
                  {f.approved === true && <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1"><Check className="w-4 h-4" /></div>}
                </a>
              ))}
            </div>
            {approvals.some((f) => f.approved !== true) && (
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <div className="font-semibold">Please review the designs above.</div>
                  <div className="text-sm text-muted-foreground">Approve to proceed, or request modifications.</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => approvals.filter((f) => !f.approved).forEach((f) => decideApproval(f.id, false))}>Request Changes</Button>
                  <Button onClick={() => approvals.filter((f) => !f.approved).forEach((f) => decideApproval(f.id, true))}>
                    <CircleCheck className="w-4 h-4 mr-1" />Approve Design
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-6">
        <div className="section-label mb-6">PRODUCTION TIMELINE</div>
        <div className="space-y-4">
          {timeline.map((s, i) => {
            const done = i <= stageIdx;
            const current = i === stageIdx;
            return (
              <div key={s.key} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-muted"} ${current ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                  {done ? <Check className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <div className={`font-serif ${done ? "font-bold" : "text-muted-foreground"}`}>{s.label}</div>
              </div>
            );
          })}
        </div>
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
