"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useFilterStore } from "@/stores/filterStore";
import { useUIStore } from "@/stores/uiStore";

export default function SearchUrlSync() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const setVehicleView = useFilterStore((s) => s.setVehicleView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  useEffect(() => {
    setCurrentView("imageList");
    setVehicleView("imageList");
    setSearchQuery(q.trim());
  }, [q, setSearchQuery, setVehicleView, setCurrentView]);

  return null;
}
