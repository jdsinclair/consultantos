"use client";

import { useChat as useVercelChat } from "ai/react";

interface UseChatOptions {
  clientId?: string;
  persona?: string;
  clientContext?: {
    name: string;
    description?: string;
    sources?: Array<{ name: string; content?: string }>;
    recentSessions?: Array<{ title: string; summary?: string }>;
  };
}

export function useChat(options: UseChatOptions = {}) {
  const { clientId, persona = "main", clientContext } = options;

  return useVercelChat({
    api: "/api/chat",
    body: {
      clientId,
      persona,
      clientContext,
    },
  });
}
