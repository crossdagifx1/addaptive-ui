import { z } from 'zod';

// ─── Token Value ────────────────────────────────────────────────────────────

/** A token value can reference a design token or be a literal CSS value */
export type TokenValue = `token:${string}` | string;

const TokenValueSchema = z.string();

// ─── Design Tokens ──────────────────────────────────────────────────────────

/** Design tokens — colors, typography, spacing, radius, shadows, motion */
export interface DesignTokens {
  /** Primary brand color token */
  'color.primary'?: TokenValue;
  /** Secondary brand color token */
  'color.secondary'?: TokenValue;
  /** Background color token */
  'color.background'?: TokenValue;
  /** Surface/card color token */
  'color.surface'?: TokenValue;
  /** Text color token */
  'color.text'?: TokenValue;
  /** Heading font token */
  'font.heading'?: TokenValue;
  /** Body font token */
  'font.body'?: TokenValue;
  /** UI density: compact, comfortable, spacious */
  density?: 'compact' | 'comfortable' | 'spacious';
  /** Border radius scale */
  'radius.scale'?: TokenValue;
  /** Shadow intensity */
  'shadow.intensity'?: TokenValue;
  /** Motion preference */
  'motion.preference'?: 'full' | 'reduced' | 'none';
  /** Additional custom tokens */
  [key: string]: TokenValue | undefined;
}

export const DesignTokensSchema = z.record(z.string(), TokenValueSchema.optional());
