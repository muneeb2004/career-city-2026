"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Compass, Map as MapIcon, MapPin, MoveLeft } from "lucide-react";
import type { FloorViewModel } from "@/app/dashboard/staff/floors/types";
import type { InteractiveMapProps, InteractiveMapStall } from "@/components/InteractiveMap";

const InteractiveMap = dynamic<InteractiveMapProps>(
  () => import("@/components/InteractiveMap"),
  { ssr: false }
);

export interface CorporateMapClientProps {
  companyName: string;
  floors: FloorViewModel[];
  currentStallId: string | null;
  currentStallIdentifier: string | null;
  currentFloorId: string | null;
}

export default function CorporateMapClient({
  companyName,
  floors,
  currentStallId,
  currentStallIdentifier,
  currentFloorId,
}: CorporateMapClientProps) {
  const initialFloorId = currentFloorId ?? floors[0]?.id ?? null;
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(initialFloorId);

  const activeFloor = useMemo(() => floors.find((floor) => floor.id === selectedFloorId) ?? null, [
    floors,
    selectedFloorId,
  ]);

  const stallHomeFloorName = useMemo(() => {
    if (!currentFloorId) {
      return null;
    }
    return floors.find((floor) => floor.id === currentFloorId)?.name ?? null;
  }, [currentFloorId, floors]);

  const interactiveStalls: InteractiveMapStall[] = useMemo(() => {
    if (!activeFloor) {
      return [];
    }

    return activeFloor.stalls.map((stall) => ({
      id: stall.id,
      identifier: stall.identifier,
      x: stall.x,
      y: stall.y,
      assignedClient: stall.corporateClientId
        ? {
            id: stall.corporateClientId,
            companyName: stall.corporateClientName ?? "",
          }
        : null,
    }));
  }, [activeFloor]);

  const isCurrentStallOnActiveFloor = Boolean(
    activeFloor && currentStallId && activeFloor.stalls.some((stall) => stall.id === currentStallId)
  );

  const highlightMarkerId = isCurrentStallOnActiveFloor ? currentStallId : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-white to-primary/5 px-6 py-10 lg:px-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
            <MapIcon className="h-4 w-4" /> Floor overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-text">Explore your stall location</h1>
          <p className="mt-2 max-w-2xl text-sm text-text/70">
            Navigate across venue floors to understand where corporate partners are placed. Your assigned stall is
            highlighted so you can easily spot it.
          </p>
        </div>
        <Link
          href="/dashboard/corporate"
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary shadow hover:border-primary/40 hover:text-primary/90"
        >
          <MoveLeft className="h-4 w-4" /> Return to Dashboard
        </Link>
      </header>

      {!floors.length ? (
        <section className="rounded-3xl border border-dashed border-primary/30 bg-white/70 p-10 text-center text-text/60 shadow-lg">
          <p className="text-lg font-semibold">Floor maps are not available yet.</p>
          <p className="mt-3 text-sm">
            Once the organising team publishes floor plans, you will be able to explore stall placements here.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
              <Compass className="h-3 w-3" /> {companyName}
            </span>
            {currentStallIdentifier && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                <MapPin className="h-3 w-3" /> Stall {currentStallIdentifier}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
              {floors.length} floors
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {floors.map((floor) => {
              const isActive = floor.id === selectedFloorId;
              return (
                <button
                  key={floor.id}
                  type="button"
                  onClick={() => setSelectedFloorId(floor.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-indigo-400 bg-indigo-500 text-white shadow"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                  }`}
                >
                  {floor.name}
                </button>
              );
            })}
          </div>

          <section className="rounded-3xl border border-white/20 bg-white/80 p-6 shadow-lg backdrop-blur">
            {activeFloor?.mapImageUrl ? (
              <InteractiveMap
                imageUrl={activeFloor.mapImageUrl}
                stalls={interactiveStalls}
                editable={false}
                selectedMarkerId={highlightMarkerId ?? undefined}
                highlightedMarkerId={highlightMarkerId ?? undefined}
                highlightLabel="You are here"
              />
            ) : (
              <div className="flex h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 text-center text-sm text-slate-500">
                <MapIcon className="mb-4 h-10 w-10 text-slate-300" />
                Floor map preview is not ready yet for {activeFloor?.name ?? "this floor"}.
              </div>
            )}
          </section>

          {highlightMarkerId ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 text-sm text-emerald-700">
              Your stall is located on the <span className="font-semibold">{activeFloor?.name}</span> floor. Look for
              the pulsing marker labelled <span className="font-semibold">You are here</span> to find your space quickly.
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-600">
              {currentStallId ? (
                <span>
                  Select{" "}
                  {stallHomeFloorName ? (
                    <>
                      the <span className="font-semibold">{stallHomeFloorName}</span> floor
                    </>
                  ) : (
                    "your assigned floor"
                  )}
                  {" to view your stall's exact position."}
                </span>
              ) : (
                <span>Once a stall is assigned, it will appear here with a pulsing indicator.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
