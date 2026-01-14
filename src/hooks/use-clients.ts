"use client";

import { useState, useEffect, useCallback } from "react";

interface Client {
  id: string;
  name: string;
  company?: string;
  industry?: string;
  website?: string;
  description?: string;
  status: string;
  color?: string;
  sources?: unknown[];
  sessions?: unknown[];
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (data: Partial<Client>) => {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create client");
    const newClient = await res.json();
    setClients((prev) => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = async (id: string, data: Partial<Client>) => {
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update client");
    const updated = await res.json();
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteClient = async (id: string) => {
    const res = await fetch(`/api/clients/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete client");
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}

export function useClient(id: string) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Failed to fetch client");
      const data = await res.json();
      setClient(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return { client, loading, error, refetch: fetchClient };
}
