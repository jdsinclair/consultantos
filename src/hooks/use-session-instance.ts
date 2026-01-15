"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const CHANNEL_NAME = "consultantos-session-instance";
const HEARTBEAT_INTERVAL = 3000; // 3 seconds
const STALE_THRESHOLD = 10000; // 10 seconds without heartbeat = stale

type MessageType =
  | "claim"
  | "release"
  | "heartbeat"
  | "query"
  | "response"
  | "takeover";

interface SessionMessage {
  type: MessageType;
  sessionId: string;
  tabId: string;
  timestamp: number;
  isRecording?: boolean;
}

interface ActiveInstance {
  tabId: string;
  sessionId: string;
  isRecording: boolean;
  lastHeartbeat: number;
}

interface UseSessionInstanceOptions {
  sessionId: string;
  onConflictDetected?: (existingTabId: string) => void;
  onTakeoverRequested?: () => void;
}

interface UseSessionInstanceReturn {
  /** Whether another tab has this session open and is recording */
  hasConflict: boolean;
  /** Whether this tab owns the recording lock */
  isOwner: boolean;
  /** Claim ownership for recording */
  claimSession: () => boolean;
  /** Release ownership */
  releaseSession: () => void;
  /** Request takeover from the other tab */
  requestTakeover: () => void;
  /** Details about the conflicting instance */
  conflictingInstance: ActiveInstance | null;
  /** This tab's unique ID */
  tabId: string;
}

/**
 * Hook to manage multi-instance session handling.
 * Prevents conflicts when the same session is open in multiple tabs,
 * particularly for recording functionality.
 */
export function useSessionInstance({
  sessionId,
  onConflictDetected,
  onTakeoverRequested,
}: UseSessionInstanceOptions): UseSessionInstanceReturn {
  const [hasConflict, setHasConflict] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [conflictingInstance, setConflictingInstance] =
    useState<ActiveInstance | null>(null);

  // Generate unique tab ID on mount
  const tabIdRef = useRef<string>("");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const instancesRef = useRef<Map<string, ActiveInstance>>(new Map());

  // Initialize tab ID
  useEffect(() => {
    tabIdRef.current = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // Cleanup stale instances
  const cleanupStaleInstances = useCallback(() => {
    const now = Date.now();
    const staleTabIds: string[] = [];

    instancesRef.current.forEach((instance, tabId) => {
      if (now - instance.lastHeartbeat > STALE_THRESHOLD) {
        staleTabIds.push(tabId);
      }
    });

    staleTabIds.forEach((tabId) => {
      instancesRef.current.delete(tabId);
    });

    // Re-check conflicts after cleanup
    const conflicting = Array.from(instancesRef.current.values()).find(
      (inst) =>
        inst.sessionId === sessionId &&
        inst.tabId !== tabIdRef.current &&
        inst.isRecording
    );

    if (!conflicting && hasConflict) {
      setHasConflict(false);
      setConflictingInstance(null);
    }
  }, [sessionId, hasConflict]);

  // Send message to other tabs
  const sendMessage = useCallback(
    (type: MessageType, extra: Partial<SessionMessage> = {}) => {
      if (!channelRef.current) return;

      const message: SessionMessage = {
        type,
        sessionId,
        tabId: tabIdRef.current,
        timestamp: Date.now(),
        ...extra,
      };

      channelRef.current.postMessage(message);
    },
    [sessionId]
  );

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent<SessionMessage>) => {
      const msg = event.data;

      // Ignore our own messages
      if (msg.tabId === tabIdRef.current) return;

      // Update instances map
      if (msg.type === "claim" || msg.type === "heartbeat") {
        instancesRef.current.set(msg.tabId, {
          tabId: msg.tabId,
          sessionId: msg.sessionId,
          isRecording: msg.isRecording ?? false,
          lastHeartbeat: msg.timestamp,
        });

        // Check for conflict with this session
        if (msg.sessionId === sessionId && msg.isRecording) {
          setHasConflict(true);
          setConflictingInstance({
            tabId: msg.tabId,
            sessionId: msg.sessionId,
            isRecording: true,
            lastHeartbeat: msg.timestamp,
          });
          onConflictDetected?.(msg.tabId);
        }
      }

      // Handle release
      if (msg.type === "release" && msg.sessionId === sessionId) {
        instancesRef.current.delete(msg.tabId);
        if (conflictingInstance?.tabId === msg.tabId) {
          setHasConflict(false);
          setConflictingInstance(null);
        }
      }

      // Handle query (other tabs asking who has this session)
      if (msg.type === "query" && msg.sessionId === sessionId && isOwner) {
        sendMessage("response", { isRecording: true });
      }

      // Handle takeover request
      if (msg.type === "takeover" && msg.sessionId === sessionId && isOwner) {
        onTakeoverRequested?.();
      }
    },
    [
      sessionId,
      isOwner,
      conflictingInstance,
      onConflictDetected,
      onTakeoverRequested,
      sendMessage,
    ]
  );

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for BroadcastChannel support
    if (!("BroadcastChannel" in window)) {
      console.warn(
        "BroadcastChannel not supported. Multi-tab detection disabled."
      );
      return;
    }

    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current.onmessage = handleMessage;

    // Query existing instances on mount
    sendMessage("query");

    // Start cleanup interval
    const cleanupInterval = setInterval(cleanupStaleInstances, STALE_THRESHOLD);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      clearInterval(cleanupInterval);
      if (channelRef.current) {
        // Release ownership before closing
        if (isOwner) {
          sendMessage("release");
        }
        channelRef.current.close();
      }
    };
  }, [handleMessage, sendMessage, cleanupStaleInstances, isOwner]);

  // Claim session ownership for recording
  const claimSession = useCallback(() => {
    if (hasConflict) {
      return false;
    }

    setIsOwner(true);
    sendMessage("claim", { isRecording: true });

    // Start heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      sendMessage("heartbeat", { isRecording: true });
    }, HEARTBEAT_INTERVAL);

    return true;
  }, [hasConflict, sendMessage]);

  // Release session ownership
  const releaseSession = useCallback(() => {
    setIsOwner(false);
    sendMessage("release");

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, [sendMessage]);

  // Request takeover from the other tab
  const requestTakeover = useCallback(() => {
    if (conflictingInstance) {
      sendMessage("takeover");
    }
  }, [conflictingInstance, sendMessage]);

  return {
    hasConflict,
    isOwner,
    claimSession,
    releaseSession,
    requestTakeover,
    conflictingInstance,
    tabId: tabIdRef.current,
  };
}
