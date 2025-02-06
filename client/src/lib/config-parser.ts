export interface ConfigSection {
  name: string;
  content: string[];
  children: ConfigSection[];
}

export function parseConfig(content: string): ConfigSection[] {
  const lines = content.split('\n');
  const sections: ConfigSection[] = [];
  let currentSection: ConfigSection | null = null;

  for (const line of lines) {
    if (line.startsWith('section')) {
      const name = line.split(' ')[1];
      const newSection = {
        name,
        content: [],
        children: []
      };

      if (currentSection) {
        currentSection.children.push(newSection);
      } else {
        sections.push(newSection);
      }
      currentSection = newSection;
    } else if (line.startsWith('exit')) {
      currentSection = null;
    } else if (currentSection && line.trim()) {
      currentSection.content.push(line.trim());
    }
  }

  return sections;
}

export function convertConfig(sections: ConfigSection[]): string {
  // TODO: Implement actual conversion logic based on rules
  return JSON.stringify(sections, null, 2);
}
