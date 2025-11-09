"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Group, Circle, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import useImage from "use-image";

interface AssignedClientInfo {
  id: string;
  companyName: string;
}

export interface InteractiveMapStall {
  id: string;
  identifier: string;
  x: number;
  y: number;
  assignedClient?: AssignedClientInfo | null;
}

interface InteractiveMapProps {
  imageUrl: string | null;
  stalls: InteractiveMapStall[];
  editable?: boolean;
  onCreateMarker?: (position: { x: number; y: number }) => void;
  onUpdateMarker?: (id: string, position: { x: number; y: number }) => void;
  onSelectMarker?: (id: string | null) => void;
  selectedMarkerId?: string | null;
}

const MARKER_RADIUS = 20;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_FACTOR = 1.05;

type StageState = {
  scale: number;
  x: number;
  y: number;
};

function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const element = ref.current;

    const updateSize = () => {
      setSize({
        width: element.clientWidth || 800,
        height: element.clientHeight || 500,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, size } as const;
}

function useMapImage(source: string | null) {
  const [image] = useImage(source ?? "");
  return image ?? null;
}

export default function InteractiveMap({
  imageUrl,
  stalls,
  editable = false,
  onCreateMarker,
  onUpdateMarker,
  onSelectMarker,
  selectedMarkerId,
}: InteractiveMapProps) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const stageRef = useRef<Konva.Stage | null>(null);
  const image = useMapImage(imageUrl);

  const [{ scale, x, y }, setStageState] = useState<StageState>({ scale: 1, x: 0, y: 0 });
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);

  const stallsById = useMemo(() => {
    const map = new Map<string, InteractiveMapStall>();
    for (const stall of stalls) {
      map.set(stall.id, stall);
    }
    return map;
  }, [stalls]);

  useEffect(() => {
    if (!stageRef.current) {
      return;
    }

    const stage = stageRef.current;
    stage.batchDraw();
  }, [image, stalls, scale, x, y]);

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = event.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * SCALE_FACTOR : oldScale / SCALE_FACTOR;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    const newPosition = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStageState({ scale: newScale, x: newPosition.x, y: newPosition.y });
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    const stage = event.target;
    setStageState((prev) => ({ ...prev, x: stage.x(), y: stage.y() }));
  };

  const handleCreateMarker = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!editable || !onCreateMarker) {
      return;
    }

    // Ignore if user is dragging marker.
    if (draggingMarkerId) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      return;
    }

  const clickedOnEmpty = event.target === stage || event.target?.hasName?.("map-image");

    if (!clickedOnEmpty) {
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const point = transform.point(pointer);

    onSelectMarker?.(null);
    onCreateMarker({ x: point.x, y: point.y });
  };

  const handleMarkerDragStart = (markerId: string) => {
    setDraggingMarkerId(markerId);
  };

  const handleMarkerDragEnd = (markerId: string, event: KonvaEventObject<DragEvent>) => {
    setDraggingMarkerId(null);
    if (!onUpdateMarker) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();

    const node = event.target;
    const absolute = node.getAbsolutePosition();
    const point = transform.point(absolute);
    onUpdateMarker(markerId, { x: point.x, y: point.y });
  };

  const handleMarkerClick = (markerId: string, event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    onSelectMarker?.(markerId);
  };

  const handleBackgroundClick = (event: KonvaEventObject<Event>) => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

  const isBackground = event.target === stage || event.target?.hasName?.("map-image");

    if (isBackground) {
      onSelectMarker?.(null);
    }
  };

  return (
    <div ref={containerRef} className="relative h-[520px] w-full overflow-hidden rounded-3xl border border-white/30 bg-white/60 shadow-inner">
      <Stage
        ref={(instance: Konva.Stage | null) => {
          stageRef.current = instance;
        }}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={x}
        y={y}
        draggable
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        onClick={(event: KonvaEventObject<MouseEvent>) => {
          handleBackgroundClick(event);
          handleCreateMarker(event);
        }}
        onTap={(event: KonvaEventObject<TouchEvent>) => {
          handleBackgroundClick(event);
          handleCreateMarker(event);
        }}
      >
        <Layer>
          {image ? (
            <KonvaImage
              image={image}
              width={image.width}
              height={image.height}
              name="map-image"
            />
          ) : (
            <Text
              text="Upload a floor map to begin placing stalls"
              fontSize={24}
              fill="#6b7280"
              x={40}
              y={40}
            />
          )}

          {stalls.map((stall) => {
            const isSelected = stall.id === selectedMarkerId;
            const fill = stall.assignedClient ? "#22c55e" : "#9ca3af";
            const stroke = isSelected ? "#2563eb" : "#ffffff";

            return (
              <Group
                key={stall.id}
                x={stall.x}
                y={stall.y}
                draggable={editable}
                onDragStart={() => handleMarkerDragStart(stall.id)}
                onDragEnd={(event: KonvaEventObject<DragEvent>) => handleMarkerDragEnd(stall.id, event)}
                onClick={(event: KonvaEventObject<MouseEvent>) => handleMarkerClick(stall.id, event)}
                onTap={(event: KonvaEventObject<TouchEvent>) => handleMarkerClick(stall.id, event)}
              >
                <Circle
                  radius={MARKER_RADIUS}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 4 : 2}
                  shadowBlur={isSelected ? 16 : 6}
                />
                <Text
                  text={stall.identifier}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#111827"
                  width={MARKER_RADIUS * 2}
                  align="center"
                  offsetX={MARKER_RADIUS}
                  offsetY={7}
                />
                {stall.assignedClient && (
                  <Text
                    text={stall.assignedClient.companyName}
                    fontSize={12}
                    fill="#1f2937"
                    width={140}
                    align="center"
                    offsetX={70}
                    offsetY={-MARKER_RADIUS - 18}
                  />
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
