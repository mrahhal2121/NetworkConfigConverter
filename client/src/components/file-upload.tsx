import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { useRef } from "react";

interface FileUploadProps {
  onUpload: (content: string) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.cfg')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt or .cfg file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onUpload(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-4">
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.cfg"
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Upload SAOS 6 Config
      </Button>
    </div>
  );
}
