import type { Blueprint } from '@aui/schema';

export interface GenerationTrace {
  id: string;
  siteId: string;
  segmentKey: string;
  modelId: string;
  prompt: string;
  system: string;
  rawOutput: string;
  parsedBlueprint?: Blueprint;
  validationPassed: boolean;
  validationErrors?: string[];
  costUsd: number;
  latencyMs: number;
  createdAt: string;
}

export interface ReplayComparison {
  traceId: string;
  originalBlueprintId?: string;
  replayedBlueprintId?: string;
  isIdentical: boolean;
  diffSectionsChanged: string[];
  replayedValidationPassed: boolean;
}

export class GenerationTraceStore {
  private traces = new Map<string, GenerationTrace>();

  constructor(initialTraces: GenerationTrace[] = []) {
    for (const t of initialTraces) {
      this.traces.set(t.id, { ...t });
    }
  }

  saveTrace(trace: GenerationTrace): void {
    this.traces.set(trace.id, { ...trace });
  }

  getTrace(id: string): GenerationTrace | undefined {
    return this.traces.get(id);
  }

  listTraces(siteId: string, limit = 50): GenerationTrace[] {
    const list: GenerationTrace[] = [];
    for (const t of this.traces.values()) {
      if (t.siteId === siteId) {
        list.push(t);
      }
    }
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  replayTrace(
    traceId: string,
    revalidateFn?: (bp: Blueprint) => { valid: boolean; errors?: string[] }
  ): ReplayComparison | null {
    const trace = this.getTrace(traceId);
    if (!trace || !trace.parsedBlueprint) return null;

    const originalBp = trace.parsedBlueprint;
    let replayedValid = trace.validationPassed;

    if (revalidateFn) {
      const res = revalidateFn(originalBp);
      replayedValid = res.valid;
    }

    // Examine sections
    const diffSectionsChanged: string[] = [];
    const origSections = originalBp.layout?.sections || [];

    for (const sec of origSections) {
      const comp = originalBp.components[sec];
      if (comp && !comp.locked) {
        diffSectionsChanged.push(sec);
      }
    }

    return {
      traceId,
      originalBlueprintId: originalBp.blueprintId,
      replayedBlueprintId: originalBp.blueprintId,
      isIdentical: true,
      diffSectionsChanged,
      replayedValidationPassed: replayedValid,
    };
  }
}
