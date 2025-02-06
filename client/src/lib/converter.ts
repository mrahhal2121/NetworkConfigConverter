import { type Edge, type Node } from 'reactflow';

export interface ConversionResult {
  success: boolean;
  config?: string;
  error?: string;
  stats?: {
    originalVlans: number;
    virtualSwitches: number;
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

function expandPortRange(portRange: string): string[] {
  const ports: string[] = [];

  // Handle single port
  if (!portRange.includes('-')) {
    return [portRange];
  }

  const [start, end] = portRange.split('-');

  // Handle dot notation (e.g., "1.1-1.48")
  if (start.includes('.')) {
    const [prefix, startNum] = start.split('.');
    const [_, endNum] = end.split('.');
    const startInt = parseInt(startNum);
    const endInt = parseInt(endNum);

    for (let i = startInt; i <= endInt; i++) {
      ports.push(`${prefix}.${i}`);
    }
  } 
  // Handle simple notation (e.g., "1-48")
  else {
    const startInt = parseInt(start);
    const endInt = parseInt(end);

    for (let i = startInt; i <= endInt; i++) {
      ports.push(i.toString());
    }
  }

  return ports;
}

function isPortRemoved(port: string, removedPorts: string[]): boolean {
  const expandedPorts = removedPorts.flatMap(range => expandPortRange(range));
  return expandedPorts.includes(port);
}

function convertVlanAddCommand(line: string, portConfig: PortConfig): string[] {
  const parts = line.split(' ');
  const vlanStartIdx = 3;
  const vlanSpec = parts[vlanStartIdx];
  const originalPort = parts[parts.length - 1].trim();

  // Check if the port should be removed
  if (isPortRemoved(originalPort, portConfig.removedPorts)) {
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

function convertInterfaceCommand(line: string, removedVlans: Set<number>): string[] {
  const parts = line.split(' ');
  const interfaceNameIdx = parts.indexOf('ip-interface') + 1;
  const interfaceName = parts[interfaceNameIdx];
  const ipIdx = parts.indexOf('ip') + 1;
  const ipAddr = parts[ipIdx];
  const vlanIdx = parts.indexOf('vlan') + 1;
  const vlanNum = parseInt(parts[vlanIdx]);

  // Skip if this VLAN was removed due to port removal
  if (removedVlans.has(vlanNum)) {
    return [];
  }

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

    // Track which VLANs are associated with which ports
    const vlanPortMap = new Map<number, Set<string>>();
    const removedVlans = new Set<number>();

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

    // Identify VLANs that should be removed
    for (const [vlan, ports] of vlanPortMap.entries()) {
      if (Array.from(ports).every(port => isPortRemoved(port, portConfig.removedPorts))) {
        removedVlans.add(vlan);
      }
    }

    // Second pass: convert configurations
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Pass through mpls and gmpls commands without changes
      if (trimmedLine.startsWith('mpls') || trimmedLine.startsWith('gmpls')) {
        converted.push(trimmedLine);
        continue;
      }

      // Handle port set commands with port mapping
      if (trimmedLine.startsWith('port set port')) {
        let newLine = trimmedLine;
        const portNumber = trimmedLine.split('port set port ')[1].split(' ')[0];

        if (!isPortRemoved(portNumber, portConfig.removedPorts)) {
          for (const mapping of portConfig.portMappings) {
            // Update the port number after "port set port"
            newLine = newLine.replace(
              `port set port ${mapping.oldPort}`,
              `port set port ${mapping.newPort}`
            );
          }
          converted.push(newLine);
        }
        continue;
      }

      if (trimmedLine.startsWith('vlan create vlan')) {
        const vlanSpec = trimmedLine.split('vlan create vlan')[1].trim();
        const vlanNumbers = parseVlanNumbers(vlanSpec);
        originalVlanCount += vlanNumbers.length;

        vlanNumbers.forEach(vlan => {
          if (!removedVlans.has(vlan)) {
            converted.push(`virtual-switch create vs VLAN_${vlan}-VS`);
            virtualSwitchCount++;
          }
        });
      } else if (trimmedLine.startsWith('vlan add vlan')) {
        converted.push(...convertVlanAddCommand(trimmedLine, portConfig));
      } else if (trimmedLine.startsWith('vlan rename vlan')) {
        const parts = trimmedLine.split(' ');
        const vlanNum = parseInt(parts[3]);

        if (!removedVlans.has(vlanNum)) {
          const name = parts.slice(5).join('_');
          converted.push(`virtual-switch set vs VLAN_${vlanNum}-VS description "${name}"`);
        }
      } else if (trimmedLine.startsWith('interface create ip-interface')) {
        converted.push(...convertInterfaceCommand(trimmedLine, removedVlans));
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
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to convert configuration'
    };
  }
}