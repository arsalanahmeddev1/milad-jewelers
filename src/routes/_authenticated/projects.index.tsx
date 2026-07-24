import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Diamond } from "lucide-react";
import { StatusBadge, type OrderStatus } from "@/components/status-badge";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsIndex,
});

type Order = { id: string; order_number: number; item_name: string; status: OrderStatus; created_at: string };

function ProjectsIndex() {
  const { user } = Route.useRouteContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();

  const load = () => {
    supabase.from("orders").select("id, order_number, item_name, status, created_at").eq("client_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders((data as any) || []));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("client-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `client_id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user.id]);

  const newInquiry = async () => {
    const { data, error } = await supabase.from("orders").insert({ client_id: user.id, item_name: "New Inquiry", status: "new_inquiry" }).select("id").single();
    if (error) return toast.error(error.message);
    navigate({ to: "/projects/$id", params: { id: data.id } });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="section-label">MY ORDERS</div>
        <Button onClick={newInquiry} className="shrink-0">New Inquiry</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((o) => (
          <Link key={o.id} to="/projects/$id" params={{ id: o.id }}>
            <Card className="p-0 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
              <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                <Diamond className="w-16 h-16 text-muted-foreground/40 group-hover:scale-110 group-hover:text-primary/60 transition-all duration-300" />
                <div className="absolute top-3 right-3"><StatusBadge status={o.status} /></div>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground">Order #{o.order_number} · {format(new Date(o.created_at), "MMM d, yyyy")}</div>
                <div className="font-serif font-bold text-lg mt-1 truncate">{o.item_name}</div>
              </div>
            </Card>
          </Link>
        ))}
        {orders.length === 0 && (
          <Card className="p-8 md:p-12 text-center text-muted-foreground col-span-full">
            No projects yet. Click "New Inquiry" to start.
          </Card>
        )}
      </div>
    </div>
  );
}
