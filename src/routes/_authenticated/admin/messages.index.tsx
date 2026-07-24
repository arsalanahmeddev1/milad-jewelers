import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/messages/")({
  component: MessagesIndex,
});

type Thread = {
  client_id: string;
  name: string;
  last_body: string;
  last_at: string;
  unread: number;
};

function MessagesIndex() {
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => {
    (async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("client_id, body, created_at, read_at, sender_id")
        .order("created_at", { ascending: false });
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, company_name, email");
      const { data: user } = await supabase.auth.getUser();
      const me = user.user?.id;
      const pmap = new Map((profiles || []).map((p) => [p.id, p]));
      const grouped = new Map<string, Thread>();
      (msgs || []).forEach((m) => {
        if (!grouped.has(m.client_id)) {
          const p = pmap.get(m.client_id);
          grouped.set(m.client_id, {
            client_id: m.client_id,
            name: p?.company_name || p?.full_name || p?.email || "Client",
            last_body: m.body, last_at: m.created_at, unread: 0,
          });
        }
        const t = grouped.get(m.client_id)!;
        if (!m.read_at && m.sender_id !== me) t.unread += 1;
      });
      setThreads(Array.from(grouped.values()));
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="divide-y">
        {threads.length === 0 && <div className="p-12 text-center text-muted-foreground">No messages yet</div>}
        {threads.map((t) => (
          <Link key={t.client_id} to="/admin/messages/$clientId" params={{ clientId: t.client_id }} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-muted/30 transition-colors">
            <Avatar className="shrink-0"><AvatarFallback>{t.name[0]}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{t.name}</div>
                <div className="text-xs text-muted-foreground shrink-0">{formatDistanceToNow(new Date(t.last_at), { addSuffix: true })}</div>
              </div>
              <div className="text-sm text-muted-foreground truncate">{t.last_body}</div>
            </div>
            {t.unread > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 shrink-0">{t.unread}</span>}
          </Link>
        ))}
      </Card>
    </div>
  );
}
