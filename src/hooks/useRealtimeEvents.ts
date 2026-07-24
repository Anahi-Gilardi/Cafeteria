import { useEffect, useState, useCallback } from "react";
import { WebSocketServerManager, EventRoom, RealtimeEventPayload } from "../services/WebSocketServer";

export function useRealtimeEvents(
  room: EventRoom,
  onEventReceived?: (event: RealtimeEventPayload) => void
) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [lastEvent, setLastEvent] = useState<RealtimeEventPayload | null>(null);

  // Callback estable para procesar eventos
  const handleEvent = useCallback(
    (event: RealtimeEventPayload) => {
      setLastEvent(event);
      if (onEventReceived) {
        onEventReceived(event);
      }
    },
    [onEventReceived]
  );

  useEffect(() => {
    const wsManager = WebSocketServerManager.getInstance();

    // Suscribirse a la sala indicada (room:kitchen, room:bar, etc.)
    const unsubscribe = wsManager.subscribe(room, handleEvent);

    // Detección de estado de red para reconexión transparente
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [room, handleEvent]);

  return {
    isConnected,
    lastEvent
  };
}
