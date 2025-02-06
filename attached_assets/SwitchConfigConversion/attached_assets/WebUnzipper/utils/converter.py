def parse_vlan_numbers(vlan_spec):
    """Parse VLAN specification into a list of individual VLAN numbers."""
    vlan_numbers = set()
    parts = vlan_spec.split(',')

    for part in parts:
        part = part.strip()
        if '-' in part:
            start, end = map(int, part.split('-'))
            vlan_numbers.update(range(start, end + 1))
        else:
            vlan_numbers.add(int(part))

    return sorted(list(vlan_numbers))

def convert_vlan_add_command(line):
    """Convert SAOS 6 VLAN add command to SAOS 8 sub-port configuration."""
    parts = line.split()

    # Find the start of VLAN numbers (after "vlan add vlan")
    vlan_start_idx = 3
    port_idx = -2  # Port number is second to last element

    # Get VLAN numbers (everything between "vlan add vlan" and "port")
    vlan_spec = parts[vlan_start_idx]
    port = parts[-1].strip()  # Last element is the port number

    vlans = parse_vlan_numbers(vlan_spec)
    converted_lines = []

    for vlan in vlans:
        # Generate sub-port configuration for each VLAN
        sub_port_name = f"SP_Port{port}_VLAN-{vlan}"
        converted_lines.extend([
            f"sub-port create sub-port {sub_port_name} parent-port {port} classifier-precedence {vlan}",
            f"sub-port add sub-port {sub_port_name} class-element 1 vtag-stack {vlan}",
            f"virtual-switch interface attach sub-port {sub_port_name} vs VLAN_{vlan}-VS"
        ])
    return converted_lines

def convert_interface_command(line):
    """Convert SAOS 6 interface creation command to SAOS 8 format."""
    parts = line.split()

    # Extract interface details
    interface_name = parts[parts.index('ip-interface') + 1]
    ip_addr = parts[parts.index('ip') + 1]
    vlan_num = parts[parts.index('vlan') + 1]

    # Generate SAOS 8 equivalent commands
    return [
        f"cpu-interface sub-interface create cpu-subinterface cpu-mpls-.{vlan_num} cpu-egress-l2-transform push-8100.{vlan_num}.7",
        f"virtual-switch interface attach cpu-subinterface cpu-mpls-.{vlan_num} vs VLAN_{vlan_num}-VS",
        f"interface create ip-interface {interface_name} ip {ip_addr} vs VLAN_{vlan_num}-VS"
    ]

def convert_config(saos6_config):
    """
    Convert SAOS 6 configuration to SAOS 8 configuration.
    Handles VLAN creation, VLAN add to ports, and VLAN renaming.
    """
    lines = saos6_config.split('\n')
    converted_lines = []

    # Define supported conversion patterns
    conversion_patterns = {
        'vlan create vlan': True,
        'vlan add vlan': True,
        'vlan rename vlan': True,
        'interface create ip-interface': True,
        'system hostname': True,
        'interface ethernet': True,
        'mpls': True,  # Pass through without changes
        'gmpls': True  # Pass through without changes
    }

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Pass through mpls and gmpls commands without changes
        if line.startswith(('mpls', 'gmpls')):
            converted_lines.append(line)
            continue

        # Check if the line matches any known conversion pattern
        matches_pattern = False
        for pattern in conversion_patterns:
            if line.startswith(pattern):
                matches_pattern = True
                break

        if not matches_pattern:
            continue  # Skip lines that don't match any conversion pattern

        if line.startswith('vlan create vlan'):
            # Extract VLAN specification after "vlan create vlan"
            vlan_spec = line.split('vlan create vlan')[1].strip()
            # Parse the VLAN numbers
            vlan_numbers = parse_vlan_numbers(vlan_spec)
            # Generate a virtual-switch create command for each VLAN
            for vlan_num in vlan_numbers:
                converted_lines.append(f'virtual-switch create vs VLAN_{vlan_num}-VS')

        elif line.startswith('vlan add vlan'):
            # Handle VLAN add to port commands
            converted_lines.extend(convert_vlan_add_command(line))

        elif line.startswith('vlan rename vlan'):
            # Handle VLAN rename commands
            parts = line.split()
            vlan_num = parts[3]  # Get the VLAN ID number directly
            name = parts[-1]  # Get the name value (last part)
            converted_lines.append(f'virtual-switch set vs VLAN_{vlan_num}-VS description {name}')

        elif line.startswith('interface create ip-interface'):
            # Handle interface creation commands
            converted_lines.extend(convert_interface_command(line))

        elif line.startswith('system hostname'):
            # Convert system hostname command
            converted_lines.append(line.replace('system hostname', 'hostname'))

        elif line.startswith('interface ethernet'):
            # Convert interface commands
            converted_lines.append(line.replace('interface ethernet', 'interface eth'))

    return '\n'.join(converted_lines)