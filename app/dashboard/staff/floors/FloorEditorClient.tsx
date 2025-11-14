"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Pencil, PlusCircle, Trash2, UploadCloud } from "lucide-react";
import { readFileAsDataUrl } from "@/lib/client/files";
import type { FloorViewModel, SelectOption } from "@/app/dashboard/staff/floors/types";
import type { InteractiveMapProps, InteractiveMapStall } from "@/components/InteractiveMap";

const InteractiveMap = dynamic<InteractiveMapProps>(
  () => import("@/components/InteractiveMap"),
  { ssr: false }
);

export interface FloorEditorClientProps {
  role: "super_admin" | "staff";
  floor: FloorViewModel;
  clients: SelectOption[];
}

type StallMetaUpdates = Partial<{ identifier: string; corporateClientId: string | null }>;

export default function FloorEditorClient({ role, floor, clients }: FloorEditorClientProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [floorState, setFloorState] = useState<FloorViewModel>(floor);
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null);
  const [isCreatingStall, setIsCreatingStall] = useState(false);

  const selectedStall = useMemo(
    () => floorState.stalls.find((stall) => stall.id === selectedStallId) ?? null,
    [floorState.stalls, selectedStallId]
  );

  const interactiveStalls: InteractiveMapStall[] = useMemo(
    () =>
      floorState.stalls.map((stall) => ({
        id: stall.id,
        identifier: stall.identifier,
        x: stall.x,
        y: stall.y,
        assignedClient: stall.corporateClientId
          ? { id: stall.corporateClientId, companyName: stall.corporateClientName ?? "" }
          : null,
      })),
    [floorState.stalls]
  );

  const updateFloorState = (updater: (floor: FloorViewModel) => FloorViewModel) => {
    setFloorState((prev) => updater(prev));
  };

  const handleNameChange = (value: string) => {
    updateFloorState((prev) => ({ ...prev, name: value }));
  };

  const handleRename = async (value: string) => {
    if (!value.trim()) {
      toast.error("Floor name cannot be empty");
      return;
    }

    try {
      const response = await fetch(`/api/floors/${floorState.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      if (!response.ok) {
        throw new Error("Failed to update floor name");
      }
      toast.success("Floor name saved");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update floor name");
      router.refresh();
    }
  };

  const handleMapUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateFloorState((prev) => ({ ...prev, mapImageUrl: dataUrl }));
      const response = await fetch(`/api/floors/${floorState.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapImageUrl: dataUrl }),
      });
      if (!response.ok) {
        throw new Error("Failed to upload map image");
      }
      toast.success("Map image updated");
    } catch (error) {
      console.error(error);
      toast.error("Unable to upload map image");
      router.refresh();
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateStall = async (position: { x: number; y: number }) => {
    const identifier = window.prompt("Stall label", `Stall ${floorState.stalls.length + 1}`);
    if (!identifier) {
      return;
    }

    if (isCreatingStall) {
      return;
    }

    setIsCreatingStall(true);

    try {
      const response = await fetch("/api/stalls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorId: floorState.id,
          identifier,
          x: position.x,
          y: position.y,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create stall");
      }

      const payload = await response.json();
      updateFloorState((prev) => ({
        ...prev,
        stalls: [
          ...prev.stalls,
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
    } finally {
      setIsCreatingStall(false);
    }
  };

  const updateStallPosition = (stallId: string, position: { x: number; y: number }) => {
    updateFloorState((prev) => ({
      ...prev,
      stalls: prev.stalls.map((stall) =>
        stall.id === stallId ? { ...stall, x: position.x, y: position.y } : stall
      ),
    }));
  };

  const handleUpdateStallPosition = async (stallId: string, position: { x: number; y: number }) => {
    updateStallPosition(stallId, position);
    try {
      const response = await fetch(`/api/stalls/${stallId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(position),
      });
      if (!response.ok) {
        throw new Error("Failed to update stall position");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to save stall position");
      router.refresh();
    }
  };

  const applyStallUpdates = (stallId: string, updates: StallMetaUpdates) => {
    updateFloorState((prev) => ({
      ...prev,
      stalls: prev.stalls.map((stall) =>
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
  };

  const handleUpdateStallMeta = async (stallId: string, updates: StallMetaUpdates) => {
    applyStallUpdates(stallId, updates);

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
    if (!confirmation) {
      return;
    }

    try {
      const response = await fetch(`/api/stalls/${stallId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete stall");
      }
      updateFloorState((prev) => ({
        ...prev,
        stalls: prev.stalls.filter((stall) => stall.id !== stallId),
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
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => router.push("/dashboard/staff/floors")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Floors
          </button>
          <h1 className="text-2xl font-semibold text-slate-900">{floorState.name}</h1>
          <p className="text-sm text-slate-600">
            Manage stall placements, assign corporate partners, and customise the floor plan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            {role === "super_admin" ? "Super Admin" : "Staff"} access
          </span>
          <div className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
            Order #{floorState.orderIndex}
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
            {new Date(floorState.createdAt).toLocaleString()}
          </span>
        </div>
      </header>

      <div className="space-y-4 rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Pencil className="h-4 w-4 text-indigo-500" />
              <input
                type="text"
                value={floorState.name}
                onChange={(event) => handleNameChange(event.target.value)}
                onBlur={(event) => handleRename(event.target.value)}
                className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm text-slate-800 focus:border-indigo-300 focus:outline-none"
              />
            </label>
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
                    void handleMapUpload(file);
                  }
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs text-indigo-600">
            {floorState.stalls.length} stalls placed
          </div>
        </div>

        <InteractiveMap
          imageUrl={floorState.mapImageUrl || null}
          stalls={interactiveStalls}
          editable
          selectedMarkerId={selectedStallId}
          onSelectMarker={setSelectedStallId}
          onCreateMarker={handleCreateStall}
          onUpdateMarker={handleUpdateStallPosition}
        />
      </div>

      <div className="space-y-4 rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <PlusCircle className="h-4 w-4 text-indigo-500" /> Stall Details
          </h2>
          {selectedStall && (
            <button
              type="button"
              onClick={() => handleDeleteStall(selectedStall.id)}
              className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-3 w-3" /> Delete Stall
            </button>
          )}
        </div>

        {selectedStall ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs font-semibold text-slate-600">
              Stall Identifier
              <input
                type="text"
                value={selectedStall.identifier}
                onChange={(event) =>
                  applyStallUpdates(selectedStall.id, { identifier: event.target.value })
                }
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
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-xs text-slate-600">
              Coordinates: <span className="font-semibold">{selectedStall.x.toFixed(0)}</span>,
              <span className="font-semibold"> {selectedStall.y.toFixed(0)}</span>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-sm text-indigo-600">
            Select a stall marker on the map to edit its details, or click anywhere on the map to create a new stall.
          </p>
        )}

        <p className="text-xs text-slate-500">
          Drag markers directly on the map to adjust placement. Changes save automatically after each drag or field
          update.
        </p>
      </div>
    </div>
  );
}
