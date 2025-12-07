import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export const Sidebar = () => {
  return (
    <Card className="w-full h-full min-h-[500px] flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <CardTitle>AI Insights</CardTitle>
        </div>
        <CardDescription>Real-time market analysis & signals</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex flex-col gap-4 flex-1">
          <div className="p-4 rounded-lg bg-muted/50 border border-dashed flex flex-col items-center justify-center text-center space-y-2 min-h-[200px]">
            <span className="text-sm text-muted-foreground">AI Models Offline</span>
            <p className="text-xs text-muted-foreground/60">
              Sentiment Analysis & Predictive models will appear here.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">System Status</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ingestor</span>
                <span className="text-green-500">Active</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Analysis Engine</span>
                <span className="text-yellow-500">Standby</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
