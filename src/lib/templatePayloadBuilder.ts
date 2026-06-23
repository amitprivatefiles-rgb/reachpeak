/**
 * templatePayloadBuilder.ts — Client-side template send-payload builder
 *
 * This is a PORT of supabase/functions/_shared/templatePayload.ts for use in
 * the browser (Campaigns.tsx, Inbox.tsx). The logic MUST stay in sync.
 *
 * IMPORTANT: If you change the logic here, update the edge function copy at
 * supabase/functions/_shared/templatePayload.ts and vice-versa.
 */

export interface StoredTemplate {
  name: string;
  language: string;
  components?: any[];
  body_text?: string | null;
  header_sample_url?: string | null;
}

export interface RuntimeInputs {
  headerMedia?: string;
  headerTextParams?: string[];
  bodyParams?: string[];
  buttonParams?: { index: number; sub_type: 'url' | 'copy_code'; text: string }[];
}

const VARS = (s?: string | null): string[] =>
  (s ?? '').match(/\{\{\s*\d+\s*\}\}/g) ?? [];

/**
 * Convert a stored template DEFINITION into the SEND-shape components array.
 * Emits ONLY components that carry runtime input. Returns [] for fully-static templates.
 */
export function buildTemplateSendComponents(
  t: StoredTemplate,
  inputs: RuntimeInputs = {},
): any[] {
  const out: any[] = [];

  for (const c of t.components ?? []) {
    const type = String(c.type ?? '').toUpperCase();

    if (type === 'HEADER') {
      const fmt = String(c.format ?? 'TEXT').toUpperCase();

      if (fmt === 'IMAGE' || fmt === 'VIDEO' || fmt === 'DOCUMENT') {
        const link =
          inputs.headerMedia ??
          t.header_sample_url ??
          c.example?.header_handle?.[0] ??
          null;
        if (!link) continue;
        const key = fmt.toLowerCase();
        out.push({
          type: 'header',
          parameters: [{ type: key, [key]: { link } }],
        });
      } else if (
        fmt === 'TEXT' &&
        VARS(c.text).length > 0 &&
        inputs.headerTextParams?.length
      ) {
        out.push({
          type: 'header',
          parameters: inputs.headerTextParams.map((v) => ({
            type: 'text',
            text: v,
          })),
        });
      }
    } else if (type === 'BODY') {
      const need = VARS(c.text ?? t.body_text).length;
      if (need > 0) {
        const params = (inputs.bodyParams ?? [])
          .slice(0, need)
          .map((v) => ({ type: 'text', text: v }));
        if (params.length > 0) {
          out.push({ type: 'body', parameters: params });
        }
      }
    } else if (type === 'BUTTONS') {
      for (const bp of inputs.buttonParams ?? []) {
        out.push({
          type: 'button',
          sub_type: bp.sub_type,
          index: String(bp.index),
          parameters: [{ type: 'text', text: bp.text }],
        });
      }
    }
  }

  return out;
}

/**
 * True if the template needs a media header but no source is available.
 */
export function missingRequiredHeaderMedia(
  t: StoredTemplate,
  inputs: RuntimeInputs = {},
): boolean {
  const h = (t.components ?? []).find(
    (c: any) => String(c.type).toUpperCase() === 'HEADER',
  );
  if (!h) return false;
  const fmt = String(h.format ?? 'TEXT').toUpperCase();
  if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(fmt)) return false;
  return !(
    inputs.headerMedia ||
    t.header_sample_url ||
    h.example?.header_handle?.[0]
  );
}

/**
 * Extract header format from a template's components.
 * Returns 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT' | null
 */
export function getHeaderFormat(components?: any[]): string | null {
  const h = (components ?? []).find(
    (c: any) => String(c.type).toUpperCase() === 'HEADER',
  );
  if (!h) return null;
  return String(h.format ?? 'TEXT').toUpperCase();
}

/**
 * Count body variables in a template.
 */
export function countBodyVars(bodyText?: string | null): number {
  return VARS(bodyText).length;
}
