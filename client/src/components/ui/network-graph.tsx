import ReactFlow, { Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';

interface NetworkGraphProps {
  nodes: any[];
  edges: any[];
  title: string;
}

export function NetworkGraph({ nodes, edges, title }: NetworkGraphProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="w-full h-[400px] border rounded-lg bg-background">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-left"
          defaultEdgeOptions={{
            style: { strokeWidth: 2 },
            animated: true,
            labelStyle: { fill: '#888', fontWeight: 700 }
          }}
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}