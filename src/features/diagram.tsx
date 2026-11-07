import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Snapshot } from "../domain/models";
export function Diagram({ id, snapshot }: { id: string; snapshot: Snapshot }) {
  const problem = snapshot.problems.find((p) => p.id === id)!;
  const plans = snapshot.plans.filter((p) => p.problemId === id);
  const tasks = snapshot.tasks.filter((t) => t.problemId === id);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let offset = 0;
  for (const plan of plans) {
    const children = tasks
      .filter((t) => t.planId === plan.id)
      .sort((a, b) => a.order - b.order);
    const groupHeight = Math.max(160, children.length * 100);
    nodes.push({
      id: plan.id,
      position: { x: 280, y: offset + groupHeight / 2 - 25 },
      data: { label: plan.title },
    });
    edges.push({
      id: `p-${plan.id}`,
      source: problem.id,
      target: plan.id,
      markerEnd: { type: MarkerType.ArrowClosed },
    });
    children.forEach((task, index) => {
      nodes.push({
        id: task.id,
        position: { x: 580, y: offset + index * 100 },
        data: { label: `${task.status === "done" ? "✓ " : ""}${task.title}` },
        style: {
          width: 200,
          borderColor: task.status === "done" ? "#168263" : "#ccd6d0",
          background: task.status === "done" ? "#edf8f1" : "white",
        },
      });
      edges.push({ id: `t-${task.id}`, source: plan.id, target: task.id });
      for (const dependency of task.dependencies)
        edges.push({
          id: `d-${dependency}-${task.id}`,
          source: dependency,
          target: task.id,
          animated: task.status !== "done",
          style: { stroke: "#d49146" },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
    });
    offset += groupHeight + 60;
  }
  nodes.unshift({
    id: problem.id,
    position: { x: 0, y: Math.max(0, (offset - 60) / 2 - 25) },
    data: { label: problem.title },
    style: {
      background: "#e8f5ee",
      borderColor: "#168263",
      fontWeight: 600,
      width: 200,
    },
  });
  return (
    <div className="diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        minZoom={0.1}
        aria-label="Sơ đồ vấn đề, phương án và công việc"
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <span className="diagram-caption">
        Đường cam: quan hệ phụ thuộc · Cuộn để thu phóng
      </span>
    </div>
  );
}
