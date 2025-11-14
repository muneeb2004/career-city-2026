"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Group, Circle, Text, Label, Tag } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
// Dynamic Konva import at runtime; avoid static node canvas requirement.
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

export interface InteractiveMapProps {
  imageUrl: string | null;
  stalls: InteractiveMapStall[];
  editable?: boolean;
  onCreateMarker?: (position: { x: number; y: number }) => void;
  onUpdateMarker?: (id: string, position: { x: number; y: number }) => void;
  onSelectMarker?: (id: string | null) => void;
  selectedMarkerId?: string | null;
  highlightedMarkerId?: string | null;
  highlightLabel?: string;
  highlightColor?: string;
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
  highlightedMarkerId,
  highlightLabel,
  highlightColor = "#2563eb",
}: InteractiveMapProps) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const stageRef = useRef<any>(null);
  const image = useMapImage(imageUrl);

  const [{ scale, x, y }, setStageState] = useState<StageState>({ scale: 1, x: 0, y: 0 });
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const groupRefs = useRef<Map<string, any>>(new Map());
  const highlightTweenRef = useRef<any | null>(null);
  const konvaRef = useRef<any | null>(null);

  useEffect(() => {
    let mounted = true;
    import("konva").then((mod) => {
      if (!mounted) return;
      konvaRef.current = (mod as any).default || (mod as any);
    });
    return () => {
      mounted = false;
    };
  }, []);

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

  useEffect(() => {
    highlightTweenRef.current?.destroy();
    highlightTweenRef.current = null;

    if (!highlightedMarkerId) {
      return;
    }

    const K = konvaRef.current;
    if (!K) {
      return;
    }

    const group = groupRefs.current.get(highlightedMarkerId);
    if (!group) {
      return;
    }

    const pulseCircle = group.findOne(".highlight-circle");

    if (!pulseCircle) {
      return;
    }

    pulseCircle.scale({ x: 1, y: 1 });
    pulseCircle.opacity(0.45);

    const tween = new K.Tween({
      node: pulseCircle,
      scaleX: 1.3,
      scaleY: 1.3,
      opacity: 0.1,
      duration: 0.9,
      easing: K.Easings.EaseInOut,
      yoyo: true,
      repeat: Infinity,
    });

    tween.play();
    highlightTweenRef.current = tween;

    return () => {
      tween.destroy();
      pulseCircle.scale({ x: 1, y: 1 });
      pulseCircle.opacity(0.45);
    };
  }, [highlightColor, highlightedMarkerId, stalls]);

  useEffect(() => {
    return () => {
      highlightTweenRef.current?.destroy();
      highlightTweenRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-[520px] w-full overflow-hidden rounded-3xl border border-white/30 bg-white/60 shadow-inner">
      <Stage
        ref={(instance: any | null) => {
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
            const isHighlighted = stall.id === highlightedMarkerId;
            const fill = isHighlighted ? "#38bdf8" : stall.assignedClient ? "#22c55e" : "#9ca3af";
            const stroke = isHighlighted ? highlightColor : isSelected ? "#2563eb" : "#ffffff";

            return (
              <Group
                key={stall.id}
                ref={(node) => {
                  if (node) {
                    groupRefs.current.set(stall.id, node);
                  } else {
                    groupRefs.current.delete(stall.id);
                  }
                }}
                x={stall.x}
                y={stall.y}
                draggable={editable}
                onDragStart={() => handleMarkerDragStart(stall.id)}
                onDragEnd={(event: KonvaEventObject<DragEvent>) => handleMarkerDragEnd(stall.id, event)}
                onClick={(event: KonvaEventObject<MouseEvent>) => handleMarkerClick(stall.id, event)}
                onTap={(event: KonvaEventObject<TouchEvent>) => handleMarkerClick(stall.id, event)}
              >
                {isHighlighted && (
                  <Circle
                    name="highlight-circle"
                    radius={MARKER_RADIUS + 14}
                    stroke={highlightColor}
                    strokeWidth={4}
                    opacity={0.45}
                    listening={false}
                    shadowBlur={24}
                  />
                )}
                <Circle
                  radius={MARKER_RADIUS}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected || isHighlighted ? 4 : 2}
                  shadowBlur={isSelected || isHighlighted ? 16 : 6}
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
                {isHighlighted && (
                  <Label y={-MARKER_RADIUS - 52} offsetX={70} listening={false}>
                    <Tag fill={highlightColor} opacity={0.9} cornerRadius={12} />
                    <Text
                      text={highlightLabel ?? "You are here"}
                      fontSize={12}
                      fontStyle="bold"
                      fill="#f8fafc"
                      padding={8}
                      align="center"
                    />
                  </Label>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
