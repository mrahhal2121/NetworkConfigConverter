import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileUpload from "@/components/file-upload";
import ConfigDiff from "@/components/config-diff";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [originalConfig, setOriginalConfig] = useState<string>("");
  const [convertedConfig, setConvertedConfig] = useState<string>("");

  const handleConfigUpload = async (content: string) => {
    try {
      // TODO: Make API call to convert config
      const converted = content.toUpperCase(); // Placeholder conversion
      setOriginalConfig(content);
      setConvertedConfig(converted);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to convert configuration",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([convertedConfig], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-config.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SAOS Configuration Converter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Convert your SAOS 6 configurations to SAOS 8 format with visual diff comparison
            </p>
            <FileUpload onUpload={handleConfigUpload} />
          </CardContent>
        </Card>

        {originalConfig && convertedConfig && (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download Converted Config
              </Button>
            </div>
            <ConfigDiff original={originalConfig} converted={convertedConfig} />
          </>
        )}
      </div>
    </div>
  );
}
