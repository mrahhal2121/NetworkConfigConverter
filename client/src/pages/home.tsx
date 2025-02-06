import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, ArrowRight } from "lucide-react";
import { convertConfig } from "@/lib/converter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PortMapping {
  oldPort: string;
  newPort: string;
}

export default function Home() {
  const [inputConfig, setInputConfig] = useState<string>("");
  const [convertedConfig, setConvertedConfig] = useState<string>("");
  const [converting, setConverting] = useState(false);
  const [showPortDialog, setShowPortDialog] = useState(false);
  const [portMappings, setPortMappings] = useState<PortMapping[]>([{ oldPort: "", newPort: "" }]);
  const [removedPorts, setRemovedPorts] = useState<string[]>([]);
  const [stats, setStats] = useState<{ originalVlans: number; virtualSwitches: number } | null>(null);
  const { toast } = useToast();

  const handleAddPortMapping = () => {
    setPortMappings([...portMappings, { oldPort: "", newPort: "" }]);
  };

  const handlePortMappingChange = (index: number, key: keyof PortMapping, value: string) => {
    const newMappings = [...portMappings];
    newMappings[index][key] = value;
    setPortMappings(newMappings);
  };

  const handleRemovedPortChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ports = event.target.value.split(',').map(p => p.trim()).filter(p => p);
    setRemovedPorts(ports);
  };

  const convertMutation = useMutation({
    mutationFn: async (config: string) => {
      const result = await convertConfig(config, {
        portMappings: portMappings.filter(m => m.oldPort && m.newPort),
        removedPorts: removedPorts
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      if (result.stats) {
        setStats(result.stats);
      }
      return result.config!;
    },
    onSuccess: (converted) => {
      setConvertedConfig(converted);
      toast({
        title: "Conversion Complete",
        description: "Configuration has been converted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleConvert = () => {
    if (!inputConfig.trim()) {
      toast({
        title: "Empty Configuration",
        description: "Please enter a SAOS 6 configuration to convert",
        variant: "destructive"
      });
      return;
    }

    setShowPortDialog(true);
  };

  const handleConfirmPortChanges = () => {
    setConverting(true);
    setShowPortDialog(false);
    try {
      convertMutation.mutate(inputConfig);
    } catch (error) {
      toast({
        title: "Conversion Error",
        description: "Failed to convert the configuration",
        variant: "destructive"
      });
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = () => {
    if (!convertedConfig) return;

    const blob = new Blob([convertedConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted-config.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            SAOS Configuration Converter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your SAOS 6 configuration here..."
              value={inputConfig}
              onChange={(e) => setInputConfig(e.target.value)}
              className="h-64 font-mono w-full"
              style={{ fontFamily: 'monospace' }}
            />
            <Button
              onClick={handleConvert}
              className="w-full"
              disabled={converting || !inputConfig.trim()}
            >
              {converting ? (
                <>
                  <Progress value={50} className="w-full" />
                  Converting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Convert Configuration
                </>
              )}
            </Button>
          </div>

          {convertedConfig && (
            <div className="space-y-4">
              {stats && (
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center space-x-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats.originalVlans}</div>
                        <div className="text-sm text-muted-foreground">Original VLANs</div>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats.virtualSwitches}</div>
                        <div className="text-sm text-muted-foreground">Virtual Switches</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Textarea
                value={convertedConfig}
                readOnly
                className="h-64 font-mono w-full"
                style={{ fontFamily: 'monospace' }}
              />
              <Button
                onClick={handleDownload}
                className="w-full"
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Converted Config
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPortDialog} onOpenChange={setShowPortDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Port Configuration</DialogTitle>
            <DialogDescription>
              Specify any port changes or removals before conversion
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <h4 className="font-medium">Port Changes</h4>
              {portMappings.map((mapping, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Old Port"
                    value={mapping.oldPort}
                    onChange={(e) => handlePortMappingChange(index, "oldPort", e.target.value)}
                  />
                  <span className="flex items-center">→</span>
                  <Input
                    placeholder="New Port"
                    value={mapping.newPort}
                    onChange={(e) => handlePortMappingChange(index, "newPort", e.target.value)}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddPortMapping}>
                Add Port Mapping
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Ports to Remove</h4>
              <Textarea
                placeholder="Enter ports to remove (comma-separated)"
                onChange={handleRemovedPortChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPortDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPortChanges}>
              Continue Conversion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}