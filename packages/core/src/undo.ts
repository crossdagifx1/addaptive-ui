import type { Blueprint } from '@aui/schema';

// ─── Undo Manager ───────────────────────────────────────────────────────────

/**
 * Provides "Reset to default" and version undo functionality.
 *
 * Design principle: "Owner stays in control."
 */
export interface UndoManager {
  /** Push a blueprint onto the undo stack */
  push(blueprint: Blueprint): void;
  /** Undo the last change (return to previous blueprint) */
  undo(): Blueprint | undefined;
  /** Reset to the original default blueprint */
  resetToDefault(): Blueprint | undefined;
  /** Check if undo is available */
  canUndo(): boolean;
  /** Get the undo stack depth */
  depth(): number;
  /** Clear all history */
  clear(): void;
}

/**
 * Creates a new UndoManager instance.
 */
export function createUndoManager(initialDefault?: Blueprint): UndoManager {
  const stack: Blueprint[] = [];
  let rootDefault: Blueprint | undefined = initialDefault;

  if (initialDefault) {
    stack.push(initialDefault);
  }

  return {
    push(blueprint: Blueprint) {
      if (!rootDefault) {
        rootDefault = blueprint;
      }
      stack.push(blueprint);
    },
    undo() {
      if (stack.length <= 1) {
        return stack[0];
      }
      stack.pop();
      return stack[stack.length - 1];
    },
    resetToDefault() {
      if (rootDefault) {
        stack.length = 0;
        stack.push(rootDefault);
        return rootDefault;
      }
      return undefined;
    },
    canUndo() {
      return stack.length > 1;
    },
    depth() {
      return stack.length;
    },
    clear() {
      stack.length = 0;
      if (rootDefault) {
        stack.push(rootDefault);
      }
    },
  };
}
