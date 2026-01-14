"use client";

import { useState, useEffect, useCallback } from "react";

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  owner?: string;
  ownerType?: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
  };
}

interface UseActionItemsOptions {
  clientId?: string;
  status?: string;
  autoRefresh?: boolean;
}

export function useActionItems(options: UseActionItemsOptions = {}) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (options.clientId) params.set("clientId", options.clientId);
      if (options.status) params.set("status", options.status);

      const res = await fetch(`/api/action-items?${params}`);
      if (!res.ok) throw new Error("Failed to fetch action items");

      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [options.clientId, options.status]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (data: Partial<ActionItem>) => {
    const res = await fetch("/api/action-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create action item");
    const newItem = await res.json();
    setItems((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateItem = async (id: string, data: Partial<ActionItem>) => {
    const res = await fetch(`/api/action-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update action item");
    const updated = await res.json();
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  };

  const completeItem = async (id: string) => {
    const res = await fetch(`/api/action-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    if (!res.ok) throw new Error("Failed to complete action item");
    const updated = await res.json();
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  };

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/action-items/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete action item");
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
    createItem,
    updateItem,
    completeItem,
    deleteItem,
  };
}
