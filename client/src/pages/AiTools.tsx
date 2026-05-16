import { Link } from "react-router-dom";
import { Bot, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const agents = [
  {
    id: "taras",
    title: "Taras",
    description: "Lab reports (звіти) from templates — upload examples, set preferences, export .docx.",
    to: "/ai-tools/taras",
    icon: FileText,
    enabled: true,
  },
  {
    id: "helper",
    title: "Campus helper",
    description: "Ask about Dorm67, marketplace, chats, and campus life.",
    to: "/ai-assistant",
    icon: Bot,
    enabled: true,
  },
  {
    id: "soon",
    title: "Coming soon",
    description: "Another AI tool will land here.",
    to: "#",
    icon: Sparkles,
    enabled: false,
  },
] as const;

export function AiToolsPage() {
  return (
    <div className="page-container max-w-4xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI tools</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Pick an assistant. Each tool has its own workflow and limits.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <Card
              key={agent.id}
              className={cn(
                "border-border/80 transition-shadow",
                agent.enabled ? "hover:border-brand/40 hover:shadow-sm" : "opacity-60"
              )}
            >
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <CardTitle className="text-lg">{agent.title}</CardTitle>
                  <CardDescription className="mt-1.5">{agent.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {agent.enabled ? (
                  <Button asChild className="w-full">
                    <Link to={agent.to}>Open</Link>
                  </Button>
                ) : (
                  <Button className="w-full" disabled variant="secondary">
                    Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
