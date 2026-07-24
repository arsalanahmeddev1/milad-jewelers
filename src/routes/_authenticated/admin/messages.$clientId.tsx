import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChatThread } from "@/components/chat-thread";

export const Route = createFileRoute("/_authenticated/admin/messages/$clientId")({
  component: AdminThread,
});

function AdminThread() {
  const { clientId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const [name, setName] = useState("Client");
  useEffect(() => {
    supabase.from("profiles").select("full_name, company_name, email").eq("id", clientId).maybeSingle().then(({ data }) => {
      setName(data?.company_name || data?.full_name || data?.email || "Client");
    });
  }, [clientId]);
  return <ChatThread clientId={clientId} meId={user.id} title={name} subtitle="Client conversation" />;
}
