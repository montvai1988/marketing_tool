import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function SetupNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Alert className="mb-6 border-border bg-secondary">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-display">{title}</AlertTitle>
      <AlertDescription className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </AlertDescription>
    </Alert>
  );
}

