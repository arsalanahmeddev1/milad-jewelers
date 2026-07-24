import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { MiladLogo } from "@/lib/logo";

type Msg = { id: string; sender_id: string; body: string; created_at: string; client_id: string };

export function ChatThread({ clientId, meId, title, subtitle }: { clientId: string; meId: string; title: string; subtitle?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("messages").select("*").eq("client_id", clientId).order("created_at").then(({ data }) => {
      setMessages((data as Msg[]) || []);
      supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("client_id", clientId).is("read_at", null).neq("sender_id", meId);
    });
    const ch = supabase
      .channel(`chat-${clientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, meId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ sender_id: meId, client_id: clientId, body });
    if (error) { toast.error(error.message); setText(body); }
  };

  return (
    <Card className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
      <div className="flex items-center gap-3 p-3 md:p-4 border-b">
        <MiladLogo className="w-9 h-9 md:w-10 md:h-10 shrink-0" />
        <div className="min-w-0">
          <div className="font-serif font-bold text-base md:text-lg truncate">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
        {messages.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">Say hello!</div>}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
              <div className={`max-w-[80%] md:max-w-[75%] ${mine ? "text-right" : ""}`}>
                <div className={`inline-block rounded-2xl px-3.5 py-2 md:px-4 md:py-2.5 shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                  <div className="text-sm whitespace-pre-wrap break-words text-left">{m.body}</div>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 px-1">
                  {format(new Date(m.created_at), "MMM d, h:mm a")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t flex items-center gap-2">
        <Button variant="outline" size="icon" className="shrink-0"><ImageIcon className="w-4 h-4" /></Button>
        <Input
          placeholder="Type your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send} className="shrink-0">Send</Button>
      </div>
    </Card>
  );
}
