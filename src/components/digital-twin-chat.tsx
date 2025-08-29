
"use client";

import { useState, useRef, useEffect } from "react";
import { BotMessageSquare, Send, CornerDownLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { interactWithArtisanDigitalTwin } from "@/lib/actions";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DigitalTwinChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Namaste! I am Ramu's digital assistant. Ask me anything about his craft, story, or products.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const response = await interactWithArtisanDigitalTwin({
      artisanId: "ramu-kanchipuram-weaver",
      buyerQuery: input,
    });

    if (response.success && response.data) {
      const assistantMessage: ChatMessage = { role: "assistant", content: response.data.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      toast({
        title: "Chat Error",
        description: response.error,
        variant: "destructive",
      });
       // Restore user message if AI fails
       setMessages(prev => prev.slice(0, -1));
    }
    setLoading(false);
  };

  return (
    <Card id="chat" className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <BotMessageSquare className="size-6 text-primary" />
          Artisan Buddy
        </CardTitle>
        <CardDescription>
          Chat with Ramu's AI assistant 24/7.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  message.role === "user" && "justify-end"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="size-8 border">
                     <AvatarImage src="https://placehold.co/100x100.png" alt="Artisan Ramu" data-ai-hint="indian man artisan"/>
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-xs md:max-w-md rounded-lg p-3 text-sm",
                    message.role === "assistant"
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {message.content}
                </div>
                 {message.role === "user" && (
                  <Avatar className="size-8 border">
                    <AvatarFallback>You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
             {loading && (
              <div className="flex items-start gap-3">
                <Avatar className="size-8 border">
                  <AvatarImage src="https://placehold.co/100x100.png" alt="Artisan Ramu" data-ai-hint="indian man artisan"/>
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="max-w-xs md:max-w-md rounded-lg p-3 text-sm bg-muted flex items-center space-x-2">
                   <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-0"></span>
                   <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150"></span>
                   <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-300"></span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2 relative">
          <Input
            id="chat-input"
            placeholder="Ask about weaving techniques..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
