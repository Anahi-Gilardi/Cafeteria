import { useState, useCallback } from "react";
import { Table } from "../types";

export function useSalonTables(initialTables: Table[]) {
  const [tables, setTables] = useState<Table[]>(initialTables);

  const updateTableCoords = useCallback((tableId: string, x: number, y: number) => {
    setTables(prev => 
      prev.map(t => t.id === tableId ? { ...t, coordX: x, coordY: y } : t)
    );
  }, []);

  const toggleTableStatus = useCallback((targetTable: Table) => {
    setTables(prev =>
      prev.map(t => {
        if (t.id !== targetTable.id) return t;
        const nextStatus = t.status === "Libre" ? "Ocupada" : t.status === "Ocupada" ? "Reservada" : "Libre";
        return { ...t, status: nextStatus };
      })
    );
  }, []);

  const joinTables = useCallback((id1: string, id2: string) => {
    setTables(prev =>
      prev.map(t => {
        if (t.id === id1) return { ...t, joinedWith: id2 };
        if (t.id === id2) return { ...t, joinedWith: id1 };
        return t;
      })
    );
  }, []);

  const unjoinTable = useCallback((id: string) => {
    setTables(prev =>
      prev.map(t => {
        if (t.id === id || t.joinedWith === id) {
          return { ...t, joinedWith: undefined };
        }
        return t;
      })
    );
  }, []);

  return {
    tables,
    setTables,
    updateTableCoords,
    toggleTableStatus,
    joinTables,
    unjoinTable
  };
}
