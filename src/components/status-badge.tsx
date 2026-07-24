import { Badge } from "@/components/ui/badge";

export type OrderStatus = "new_inquiry" | "awaiting_cad_approval" | "in_production" | "completed";

const map: Record<OrderStatus, { label: string; className: string }> = {
  new_inquiry: { label: "New Inquiry", className: "bg-muted text-foreground" },
  awaiting_cad_approval: { label: "Awaiting CAD Approval", className: "bg-accent/40 text-accent-foreground" },
  in_production: { label: "In Production", className: "bg-primary/15 text-primary" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = map[status] || map.new_inquiry;
  return <Badge variant="outline" className={`${s.className} border-transparent font-medium`}>{s.label}</Badge>;
}
