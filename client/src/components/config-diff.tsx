import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConfigDiffProps {
  original: string;
  converted: string;
}

export default function ConfigDiff({ original, converted }: ConfigDiffProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-2">Original SAOS 6 Config</h3>
        <ScrollArea className="h-[600px] w-full rounded-md border p-4">
          <pre className="text-sm font-mono whitespace-pre-wrap">{original}</pre>
        </ScrollArea>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-2">Converted SAOS 8 Config</h3>
        <ScrollArea className="h-[600px] w-full rounded-md border p-4">
          <pre className="text-sm font-mono whitespace-pre-wrap">{converted}</pre>
        </ScrollArea>
      </Card>
    </div>
  );
}
