"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Map, Pencil, PlusCircle, Trash2, UploadCloud } from "lucide-react";
import { readFileAsDataUrl } from "@/lib/client/files";
import type { FloorViewModel, SelectOption } from "@/app/dashboard/staff/floors/types";
import type { InteractiveMapProps, InteractiveMapStall } from "@/components/InteractiveMap";

const InteractiveMap = dynamic<InteractiveMapProps>(
  () => import("@/components/InteractiveMap"),
  { ssr: false }
);

export interface FloorsDashboardClientProps {
  role: "super_admin" | "staff";
  floors: FloorViewModel[];
  clients: SelectOption[];
}

type EditableFloorState = FloorViewModel;

export default function FloorsDashboardClient({ role, floors, clients }: FloorsDashboardClientProps) {
  const router = useRouter();
  const [floorsState, setFloorsState] = useState<EditableFloorState[]>(floors);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(floors[0]?.id ?? null);
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingFloor, setIsCreatingFloor] = useState(false);

  useEffect(() => {
    setFloorsState(floors);
    if (!activeFloorId && floors[0]) {
      setActiveFloorId(floors[0].id);
    }
  }, [floors, activeFloorId]);

  const activeFloor = useMemo(
    () => floorsState.find((floor) => floor.id === activeFloorId) ?? null,
    [floorsState, activeFloorId]
  );

  const selectedStall = useMemo(() => {
    if (!activeFloor || !selectedStallId) {
      return null;
    }
    return activeFloor.stalls.find((stall) => stall.id === selectedStallId) ?? null;
  }, [activeFloor, selectedStallId]);

  const interactiveMapStalls: InteractiveMapStall[] = useMemo(() => {
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

  const handleCreateFloor = async () => {
    if (isCreatingFloor) {
      return;
    }

    setIsCreatingFloor(true);

    try {
      const response = await fetch("/api/floors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `New Floor ${floorsState.length + 1}` }),
      });
      if (!response.ok) {
        throw new Error("Failed to create floor");
      }
      const payload = await response.json();
      if (!payload?.floor) {
        throw new Error("Invalid response");
      }
      const newFloor: EditableFloorState = {
        id: payload.floor.id,
        name: payload.floor.name,
        mapImageUrl: payload.floor.mapImageUrl,
        orderIndex: payload.floor.orderIndex,
        createdAt: payload.floor.createdAt,
        stalls: [],
      };
      setFloorsState((prev) => [...prev, newFloor]);
      setActiveFloorId(newFloor.id);
      toast.success("Floor created");
    } catch (error) {
      console.error(error);
      toast.error("Could not create floor");
    } finally {
      setIsCreatingFloor(false);
    }
  };

  const updateFloorState = (floorId: string, updater: (floor: EditableFloorState) => EditableFloorState) => {
    setFloorsState((prev) => prev.map((floor) => (floor.id === floorId ? updater(floor) : floor)));
  };

  const handleFloorNameChange = (floorId: string, name: string) => {
    updateFloorState(floorId, (floor) => ({ ...floor, name }));
  };

  const handleRenameFloor = async (floorId: string, name: string) => {
    if (!name.trim()) {
      toast.error("Floor name cannot be empty");
      return;
    }

    try {
      const response = await fetch(`/api/floors/${floorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error("Failed to update floor name");
      }
      toast.success("Floor updated");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save floor name");
      router.refresh();
    }
  };

  const handleDeleteFloor = async (floorId: string) => {
    const confirmation = window.confirm("Delete this floor? Stalls on this floor will be removed as well.");
    if (!confirmation) {
      return;
    }

    try {
      const response = await fetch(`/api/floors/${floorId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete floor");
      }
      setFloorsState((prev) => {
        const next = prev.filter((floor) => floor.id !== floorId);
        if (activeFloorId === floorId) {
          setActiveFloorId(next[0]?.id ?? null);
          setSelectedStallId(null);
        }
        return next;
      });
      toast.success("Floor removed");
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete floor");
    }
  };

  const handleMapUpload = async (floorId: string, file: File) => {
    setIsUploading(true);
    try {
      const fileBase64 = await readFileAsDataUrl(file);
      updateFloorState(floorId, (floor) => ({ ...floor, mapImageUrl: fileBase64 }));

      const response = await fetch(`/api/floors/${floorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapImageUrl: fileBase64 }),
      });
      if (!response.ok) {
        throw new Error("Failed to upload floor map");
      }
      toast.success("Map image updated");
    } catch (error) {
      console.error(error);
      toast.error("Could not upload map image");
      router.refresh();
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateStall = async (position: { x: number; y: number }) => {
    if (!activeFloor) {
      return;
    }

    const identifier = window.prompt("Stall label", `Stall ${activeFloor.stalls.length + 1}`);
    if (!identifier) {
      return;
    }

    try {
      const response = await fetch("/api/stalls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorId: activeFloor.id,
          identifier,
          x: position.x,
          y: position.y,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create stall");
      }

      const payload = await response.json();
      updateFloorState(activeFloor.id, (floor) => ({
        ...floor,
        stalls: [
          ...floor.stalls,
          {
            id: payload.stall.id,
            identifier: payload.stall.identifier,
            x: payload.stall.x,
            y: payload.stall.y,
            corporateClientId: payload.stall.corporateClientId,
            corporateClientName: payload.stall.corporateClientName,
          },
        ],
      }));
      toast.success("Stall placed");
    } catch (error) {
      console.error(error);
      toast.error("Unable to create stall");
    }
  };

  const handleStallIdentifierChange = (stallId: string, value: string) => {
    if (!activeFloor) {
      return;
    }

    updateFloorState(activeFloor.id, (floor) => ({
      ...floor,
      stalls: floor.stalls.map((stall) =>
        stall.id === stallId ? { ...stall, identifier: value } : stall
      ),
    }));
  };

  const handleUpdateStallPosition = async (stallId: string, position: { x: number; y: number }) => {
    if (!activeFloor) {
      return;
    }

    updateFloorState(activeFloor.id, (floor) => ({
      ...floor,
      stalls: floor.stalls.map((stall) =>
        stall.id === stallId ? { ...stall, x: position.x, y: position.y } : stall
      ),
    }));

    try {
      const response = await fetch(`/api/stalls/${stallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: position.x, y: position.y }),
      });
      if (!response.ok) {
        throw new Error("Failed to update stall position");
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not save stall position");
      router.refresh();
    }
  };

  const handleUpdateStallMeta = async (
    stallId: string,
    updates: Partial<{ identifier: string; corporateClientId: string | null }>
  ) => {
    if (!activeFloor) {
      return;
    }

    updateFloorState(activeFloor.id, (floor) => ({
      ...floor,
      stalls: floor.stalls.map((stall) =>
        stall.id === stallId
          ? {
              ...stall,
              identifier: updates.identifier ?? stall.identifier,
              corporateClientId:
                updates.corporateClientId === undefined ? stall.corporateClientId : updates.corporateClientId,
              corporateClientName:
                updates.corporateClientId === undefined
                  ? stall.corporateClientName
                  : updates.corporateClientId
                  ? clients.find((client) => client.id === updates.corporateClientId)?.companyName ?? null
                  : null,
            }
          : stall
      ),
    }));

    try {
      const response = await fetch(`/api/stalls/${stallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update stall metadata");
      }
      toast.success("Stall updated");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update stall");
      router.refresh();
    }
  };

  const handleDeleteStall = async (stallId: string) => {
    const confirmation = window.confirm("Remove this stall marker?");
    if (!confirmation || !activeFloor) {
      return;
    }

    try {
      const response = await fetch(`/api/stalls/${stallId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete stall");
      }

      updateFloorState(activeFloor.id, (floor) => ({
        ...floor,
        stalls: floor.stalls.filter((stall) => stall.id !== stallId),
      }));
      if (selectedStallId === stallId) {
        setSelectedStallId(null);
      }
      toast.success("Stall removed");
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete stall");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/20 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-900">
            <Map className="h-6 w-6 text-indigo-500" /> Floor &amp; Stall Management
          </h1>
          <p className="text-sm text-slate-600">
            Organize floor plans, place stalls, and assign corporate partners.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            {role === "super_admin" ? "Super Admin" : "Staff"} access
          </span>
          <button
            type="button"
            onClick={handleCreateFloor}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            disabled={isCreatingFloor}
          >
            {isCreatingFloor ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Add Floor
          </button>
          {activeFloor && (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/staff/floors/${activeFloor.id}`)}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Open Detail View
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Floors</h2>
            <span className="text-xs text-slate-500">{floorsState.length} total</span>
          </div>
          <div className="space-y-2">
            {floorsState.map((floor) => (
              <button
                key={floor.id}
                type="button"
                onClick={() => {
                  setActiveFloorId(floor.id);
                  setSelectedStallId(null);
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  floor.id === activeFloorId
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow"
                    : "border-white/40 bg-white/50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{floor.name}</span>
                  <span className="text-xs text-slate-500">{floor.stalls.length} stalls</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Created {new Date(floor.createdAt).toLocaleDateString()}</p>
              </button>
            ))}
            {!floorsState.length && (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs text-slate-500">
                No floors yet. Create one to begin mapping stalls.
              </p>
            )}
          </div>
        </aside>

        <section className="space-y-4">
          {activeFloor ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/20 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Pencil className="h-4 w-4 text-indigo-500" />
                    <input
                      type="text"
                      value={activeFloor.name}
                      onChange={(event) => handleFloorNameChange(activeFloor.id, event.target.value)}
                      onBlur={(event) => handleRenameFloor(activeFloor.id, event.target.value)}
                      className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm text-slate-800 focus:border-indigo-300 focus:outline-none"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-100">
                    <UploadCloud className="h-4 w-4" />
                    <span>{isUploading ? "Uploading..." : "Upload Map"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleMapUpload(activeFloor.id, file);
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteFloor(activeFloor.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" /> Remove Floor
                </button>
              </div>

              <InteractiveMap
                imageUrl={activeFloor.mapImageUrl || null}
                stalls={interactiveMapStalls}
                editable
                selectedMarkerId={selectedStallId}
                onSelectMarker={setSelectedStallId}
                onCreateMarker={handleCreateStall}
                onUpdateMarker={handleUpdateStallPosition}
              />

              {selectedStall ? (
                <div className="rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Stall Details</h3>
                    <button
                      type="button"
                      onClick={() => handleDeleteStall(selectedStall.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" /> Delete Stall
                    </button>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-xs font-semibold text-slate-600">
                      Stall Identifier
                      <input
                        type="text"
                        value={selectedStall.identifier}
                        onChange={(event) => handleStallIdentifierChange(selectedStall.id, event.target.value)}
                        onBlur={(event) =>
                          handleUpdateStallMeta(selectedStall.id, { identifier: event.target.value })
                        }
                        className="w-full rounded-2xl border border-indigo-100 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-300 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-xs font-semibold text-slate-600">
                      Assigned Corporate
                      <select
                        value={selectedStall.corporateClientId ?? ""}
                        onChange={(event) =>
                          handleUpdateStallMeta(selectedStall.id, {
                            corporateClientId: event.target.value || null,
                          })
                        }
                        className="w-full rounded-2xl border border-indigo-100 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-300 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.companyName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Drag the marker on the map to refine positioning. Coordinates are updated instantly.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm text-indigo-600">
                  Select a stall to edit its details, or click on the map to create a new stall marker.
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/50 p-12 text-center text-slate-500">
              <Map className="mb-4 h-10 w-10 text-indigo-400" />
              <p className="text-sm font-medium">Create a floor to begin managing stalls.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

