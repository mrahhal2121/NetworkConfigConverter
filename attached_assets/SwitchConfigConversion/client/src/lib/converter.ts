import { type Edge, type Node } from 'reactflow';

export interface ConversionResult {
  success: boolean;
  config?: string;
  error?: string;
  stats?: {
    originalVlans: number;
    virtualSwitches: number;
  };
  mappings?: {
    original: {
      nodes: Node[];
      edges: Edge[];
    };
    converted: {
      nodes: Node[];
      edges: Edge[];
    };
  };
}

interface PortConfig {
  portMappings: Array<{ oldPort: string; newPort: string }>;
  removedPorts: string[];
}

function parseVlanNumbers(vlanSpec: string): number[] {
  const vlanNumbers = new Set<number>();
  const parts = vlanSpec.trim().split(',');

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(num => parseInt(num));
      for (let i = start; i <= end; i++) {
        vlanNumbers.add(i);
      }
    } else {
      vlanNumbers.add(parseInt(part));
    }
  }

  return Array.from(vlanNumbers).sort((a, b) => a - b);
}

function convertVlanAddCommand(line: string, portConfig: PortConfig): string[] {
  const parts = line.split(' ');
  const vlanStartIdx = 3;
  const vlanSpec = parts[vlanStartIdx];
  const originalPort = parts[parts.length - 1].trim();

  // Check if the port should be removed
  if (portConfig.removedPorts.includes(originalPort)) {
    return []; // Skip this VLAN if the port is being removed
  }

  // Get the new port number if there's a mapping, otherwise use the original
  const portMapping = portConfig.portMappings.find(m => m.oldPort === originalPort);
  const port = portMapping ? portMapping.newPort : originalPort;

  const vlans = parseVlanNumbers(vlanSpec);
  const convertedLines: string[] = [];

  for (const vlan of vlans) {
    const subPortName = `SP_Port${port}_VLAN-${vlan}`;
    convertedLines.push(
      `sub-port create sub-port ${subPortName} parent-port ${port} classifier-precedence ${vlan}`,
      `sub-port add sub-port ${subPortName} class-element 1 vtag-stack ${vlan}`,
      `virtual-switch interface attach sub-port ${subPortName} vs VLAN_${vlan}-VS`
    );
  }

  return convertedLines;
}

function convertInterfaceCommand(line: string): string[] {
  const parts = line.split(' ');
  const interfaceNameIdx = parts.indexOf('ip-interface') + 1;
  const interfaceName = parts[interfaceNameIdx];
  const ipIdx = parts.indexOf('ip') + 1;
  const ipAddr = parts[ipIdx];
  const vlanIdx = parts.indexOf('vlan') + 1;
  const vlanNum = parts[vlanIdx];

  return [
    `cpu-interface sub-interface create cpu-subinterface cpu-mpls-.${vlanNum} cpu-egress-l2-transform push-8100.${vlanNum}.7`,
    `virtual-switch interface attach cpu-subinterface cpu-mpls-.${vlanNum} vs VLAN_${vlanNum}-VS`,
    `interface create ip-interface ${interfaceName} ip ${ipAddr} vs VLAN_${vlanNum}-VS`
  ];
}

export async function convertConfig(input: string, portConfig: PortConfig = { portMappings: [], removedPorts: [] }): Promise<ConversionResult> {
  try {
    const lines = input.split('\n');
    const converted: string[] = [];
    let originalVlanCount = 0;
    let virtualSwitchCount = 0;

    // For visualization
    const originalNodes: Node[] = [];
    const originalEdges: Edge[] = [];
    const convertedNodes: Node[] = [];
    const convertedEdges: Edge[] = [];
    let xPos = 50;
    let yPos = 50;

    // Track which VLANs are associated with which ports
    const vlanPortMap = new Map<number, Set<string>>();

    // First pass: build VLAN to port associations
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('vlan add vlan')) {
        const parts = trimmedLine.split(' ');
        const vlanSpec = parts[3];
        const port = parts[parts.length - 1].trim();
        const vlans = parseVlanNumbers(vlanSpec);

        vlans.forEach(vlan => {
          if (!vlanPortMap.has(vlan)) {
            vlanPortMap.set(vlan, new Set());
          }
          vlanPortMap.get(vlan)!.add(port);
        });
      }
    }

    // Add VLANs to visualization
    Array.from(vlanPortMap.keys()).forEach((vlan, index) => {
      const vlanNodeId = `vlan-${vlan}`;
      originalNodes.push({
        id: vlanNodeId,
        position: { x: xPos, y: yPos + index * 80 },
        data: { label: `VLAN ${vlan}` }
      });

      // Connect VLANs to their ports
      const ports = vlanPortMap.get(vlan) || new Set();
      ports.forEach(port => {
        if (!portConfig.removedPorts.includes(port)) {
          const portNodeId = `port-${port}`;
          // Add port node if it doesn't exist
          if (!originalNodes.find(n => n.id === portNodeId)) {
            originalNodes.push({
              id: portNodeId,
              position: { x: xPos + 300, y: yPos + index * 80 },
              data: { label: `Port ${port}` }
            });
          }
          // Add edge
          originalEdges.push({
            id: `${vlanNodeId}-${portNodeId}`,
            source: vlanNodeId,
            target: portNodeId,
            animated: true
          });
        }
      });
    });

    // Second pass: convert configurations
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Pass through mpls and gmpls commands without changes
      if (trimmedLine.startsWith('mpls') || trimmedLine.startsWith('gmpls')) {
        converted.push(trimmedLine);
        continue;
      }

      // Pass through port set commands without changes
      if (trimmedLine.startsWith('port set')) {
        converted.push(trimmedLine);
        continue;
      }

      if (trimmedLine.startsWith('vlan create vlan')) {
        const vlanSpec = trimmedLine.split('vlan create vlan')[1].trim();
        const vlanNumbers = parseVlanNumbers(vlanSpec);
        originalVlanCount += vlanNumbers.length;

        vlanNumbers.forEach((vlan, index) => {
          const vlanPorts = vlanPortMap.get(vlan) || new Set();
          const hasNonRemovedPorts = Array.from(vlanPorts).some(port => !portConfig.removedPorts.includes(port));

          if (hasNonRemovedPorts || !vlanPorts.size) {
            converted.push(`virtual-switch create vs VLAN_${vlan}-VS`);
            virtualSwitchCount++;

            // Add virtual switch to visualization
            const vsNodeId = `vs-${vlan}`;
            convertedNodes.push({
              id: vsNodeId,
              position: { x: xPos, y: yPos + index * 80 },
              data: { label: `VS_${vlan}` }
            });

            // Connect to parent ports
            vlanPorts.forEach(port => {
              if (!portConfig.removedPorts.includes(port)) {
                const mappedPort = portConfig.portMappings.find(m => m.oldPort === port)?.newPort || port;
                const portNodeId = `parent-${mappedPort}`;

                // Add parent port node if it doesn't exist
                if (!convertedNodes.find(n => n.id === portNodeId)) {
                  convertedNodes.push({
                    id: portNodeId,
                    position: { x: xPos + 300, y: yPos + index * 80 },
                    data: { label: `Parent Port ${mappedPort}` }
                  });
                }

                // Add edge to show parent port connection
                convertedEdges.push({
                  id: `${vsNodeId}-${portNodeId}`,
                  source: vsNodeId,
                  target: portNodeId,
                  animated: true,
                  label: 'parent-port'
                });
              }
            });
          }
        });
      } else if (trimmedLine.startsWith('vlan add vlan')) {
        converted.push(...convertVlanAddCommand(trimmedLine, portConfig));
      } else if (trimmedLine.startsWith('vlan rename vlan')) {
        const parts = trimmedLine.split(' ');
        const vlanNum = parseInt(parts[3]);
        const vlanPorts = vlanPortMap.get(vlanNum) || new Set();
        const hasNonRemovedPorts = Array.from(vlanPorts).some(port => !portConfig.removedPorts.includes(port));

        if (hasNonRemovedPorts) {
          const name = parts.slice(5).join('_');
          converted.push(`virtual-switch set vs VLAN_${vlanNum}-VS description "${name}"`);
        }
      } else if (trimmedLine.startsWith('interface create ip-interface')) {
        converted.push(...convertInterfaceCommand(trimmedLine));
      } else if (trimmedLine.startsWith('system hostname')) {
        converted.push(trimmedLine.replace('system hostname', 'hostname'));
      } else if (trimmedLine.startsWith('interface ethernet')) {
        let newLine = trimmedLine;
        for (const mapping of portConfig.portMappings) {
          newLine = newLine.replace(
            `interface ethernet ${mapping.oldPort}`,
            `interface eth ${mapping.newPort}`
          );
        }
        converted.push(newLine.replace('interface ethernet', 'interface eth'));
      }
    }

    return {
      success: true,
      config: converted.join('\n'),
      stats: {
        originalVlans: originalVlanCount,
        virtualSwitches: virtualSwitchCount
      },
      mappings: {
        original: {
          nodes: originalNodes,
          edges: originalEdges
        },
        converted: {
          nodes: convertedNodes,
          edges: convertedEdges
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert configuration'
    };
  }
}