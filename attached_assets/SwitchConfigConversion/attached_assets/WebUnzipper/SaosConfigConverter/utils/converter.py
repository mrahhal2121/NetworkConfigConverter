def parse_vlan_numbers(vlan_spec):
    """Parse VLAN specification into a list of individual VLAN numbers."""
    vlan_numbers = set()
    parts = vlan_spec.split(',')

    for part in parts:
        if '-' in part:
            start, end = map(int, part.split('-'))
            vlan_numbers.update(range(start, end + 1))
        else:
            vlan_numbers.add(int(part))

    return sorted(list(vlan_numbers))

def convert_config(saos6_config):
    """
    Convert SAOS 6 configuration to SAOS 8 configuration.
    Handles VLAN creation with support for ranges and multiple VLANs.
    """
    lines = saos6_config.split('\n')
    converted_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith('vlan create vlan'):
            # Extract VLAN specification after "vlan create vlan"
            vlan_spec = line.split('vlan create vlan')[1].strip()
            # Parse the VLAN numbers
            vlan_numbers = parse_vlan_numbers(vlan_spec)
            # Generate a virtual-switch create command for each VLAN
            for vlan_num in vlan_numbers:
                converted_lines.append(f'virtual-switch create vs VLAN_{vlan_num}-VS')
        elif line.startswith('system hostname'):
            # Convert system hostname command
            converted_lines.append(line.replace('system hostname', 'hostname'))
        elif line.startswith('interface ethernet'):
            # Convert interface commands
            converted_lines.append(line.replace('interface ethernet', 'interface eth'))
        else:
            # Keep unchanged commands
            converted_lines.append(line)

    return '\n'.join(converted_lines)