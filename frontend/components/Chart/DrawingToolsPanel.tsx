"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChartStore, DrawingToolType } from '@/store/useChartStore';
import {
  Minus,
  MoveVertical,
  TrendingUp,
  MoveRight,
  ArrowRight,
  Square,
  GitBranchPlus,
  Type,
  ArrowUp,
  DollarSign,
  X,
  Trash2,
} from 'lucide-react';

interface DrawingToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToolConfig {
  type: DrawingToolType;
  label: string;
  icon: React.ReactNode;
  group: 'lines' | 'shapes' | 'fibonacci' | 'annotations';
}

const DRAWING_TOOLS: ToolConfig[] = [
  // Lines
  { type: 'horizontalLine', label: 'Horizontal Line', icon: <Minus className="h-4 w-4" />, group: 'lines' },
  { type: 'verticalLine', label: 'Vertical Line', icon: <MoveVertical className="h-4 w-4" />, group: 'lines' },
  { type: 'trendLine', label: 'Trend Line', icon: <TrendingUp className="h-4 w-4" />, group: 'lines' },
  { type: 'ray', label: 'Ray', icon: <ArrowRight className="h-4 w-4" />, group: 'lines' },
  { type: 'horizontalRay', label: 'Horizontal Ray', icon: <MoveRight className="h-4 w-4" />, group: 'lines' },
  // Shapes
  { type: 'rectangle', label: 'Rectangle', icon: <Square className="h-4 w-4" />, group: 'shapes' },
  { type: 'parallelChannel', label: 'Parallel Channel', icon: <GitBranchPlus className="h-4 w-4" />, group: 'shapes' },
  // Fibonacci
  { type: 'fibonacciRetracement', label: 'Fib Retracement', icon: <span className="text-xs font-bold">Fib</span>, group: 'fibonacci' },
  { type: 'fibonacciExtension', label: 'Fib Extension', icon: <span className="text-xs font-bold">Ext</span>, group: 'fibonacci' },
  // Annotations
  { type: 'text', label: 'Text', icon: <Type className="h-4 w-4" />, group: 'annotations' },
  { type: 'arrow', label: 'Arrow', icon: <ArrowUp className="h-4 w-4" />, group: 'annotations' },
  { type: 'priceLabel', label: 'Price Label', icon: <DollarSign className="h-4 w-4" />, group: 'annotations' },
];

const COLOR_PRESETS = [
  '#2962FF', '#00C853', '#FF6D00', '#D500F9', '#00B8D4',
  '#FFD600', '#FF1744', '#00E676', '#FFFFFF', '#808080',
];

const LINE_WIDTHS = [1, 2, 3, 4];

const LINE_STYLES = [
  { value: 'solid', label: '—' },
  { value: 'dashed', label: '- -' },
  { value: 'dotted', label: '···' },
];

export function DrawingToolsPanel({ isOpen, onClose }: DrawingToolsPanelProps): React.ReactElement | null {
  const activeDrawingTool = useChartStore((s) => s.activeDrawingTool);
  const setActiveDrawingTool = useChartStore((s) => s.setActiveDrawingTool);
  const drawingColor = useChartStore((s) => s.drawingColor);
  const setDrawingColor = useChartStore((s) => s.setDrawingColor);
  const drawingLineWidth = useChartStore((s) => s.drawingLineWidth);
  const setDrawingLineWidth = useChartStore((s) => s.setDrawingLineWidth);
  const clearAllDrawings = useChartStore((s) => s.clearAllDrawings);
  const drawings = useChartStore((s) => s.drawings);

  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');

  if (!isOpen) return null;

  const handleToolSelect = (tool: DrawingToolType) => {
    setActiveDrawingTool(activeDrawingTool === tool ? null : tool);
  };

  const groupedTools = {
    lines: DRAWING_TOOLS.filter((t) => t.group === 'lines'),
    shapes: DRAWING_TOOLS.filter((t) => t.group === 'shapes'),
    fibonacci: DRAWING_TOOLS.filter((t) => t.group === 'fibonacci'),
    annotations: DRAWING_TOOLS.filter((t) => t.group === 'annotations'),
  };

  return (
    <div className="absolute top-12 right-3 z-20 w-64 bg-card border rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Drawing Tools</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tool Groups */}
      <div className="p-3 space-y-4 max-h-[400px] overflow-y-auto">
        {/* Lines */}
        <ToolGroup label="Lines" tools={groupedTools.lines} activeTool={activeDrawingTool} onSelect={handleToolSelect} />

        {/* Shapes */}
        <ToolGroup label="Shapes" tools={groupedTools.shapes} activeTool={activeDrawingTool} onSelect={handleToolSelect} />

        {/* Fibonacci */}
        <ToolGroup label="Fibonacci" tools={groupedTools.fibonacci} activeTool={activeDrawingTool} onSelect={handleToolSelect} />

        {/* Annotations */}
        <ToolGroup label="Annotations" tools={groupedTools.annotations} activeTool={activeDrawingTool} onSelect={handleToolSelect} />

        {/* Divider */}
        <div className="border-t pt-3">
          {/* Color */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1.5 block">Color</label>
            <div className="flex flex-wrap gap-1">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDrawingColor(color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform",
                    drawingColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Line Width */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1.5 block">Width</label>
            <div className="flex gap-1">
              {LINE_WIDTHS.map((w) => (
                <Button
                  key={w}
                  variant={drawingLineWidth === w ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDrawingLineWidth(w)}
                  className="w-10 h-8"
                >
                  {w}
                </Button>
              ))}
            </div>
          </div>

          {/* Line Style */}
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1.5 block">Style</label>
            <div className="flex gap-1">
              {LINE_STYLES.map((s) => (
                <Button
                  key={s.value}
                  variant={lineStyle === s.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLineStyle(s.value as typeof lineStyle)}
                  className="flex-1 h-8 font-mono"
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear All */}
        {drawings.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={clearAllDrawings}
            className="w-full gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear All ({drawings.length})
          </Button>
        )}
      </div>
    </div>
  );
}

interface ToolGroupProps {
  label: string;
  tools: ToolConfig[];
  activeTool: DrawingToolType | null;
  onSelect: (tool: DrawingToolType) => void;
}

function ToolGroup({ label, tools, activeTool, onSelect }: ToolGroupProps) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1">
        {tools.map((tool) => (
          <Button
            key={tool.type}
            variant={activeTool === tool.type ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(tool.type)}
            className="h-8 w-8 p-0"
            title={tool.label}
          >
            {tool.icon}
          </Button>
        ))}
      </div>
    </div>
  );
}
