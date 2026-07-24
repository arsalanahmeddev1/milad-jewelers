import { createFileRoute } from "@tanstack/react-router";
import { ChatThread } from "@/components/chat-thread";

export const Route = createFileRoute("/_authenticated/messages")({
  component: ClientMessages,
});

function ClientMessages() {
  const { user } = Route.useRouteContext();
  return <ChatThread clientId={user.id} meId={user.id} title="Milad Jewelers Team" subtitle="Typically replies within a few hours" />;
}
