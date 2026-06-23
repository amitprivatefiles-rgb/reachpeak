/**
 * templatePayload.ts — Shared template send-payload builder
 *
 * Converts a stored Meta template DEFINITION into the SEND-shape components
 * array that POST /{phone}/messages expects. The definition carries format,
 * example, full body text, etc. The send payload carries ONLY runtime parameters.
 *
 * IMPORTANT: A client-side copy lives at src/lib/templatePayloadBuilder.ts.
 * If you change the logic here, update the client copy and vice-versa.
 *
 * Used by:  send-message/index.ts  (chat sends)
 *           Campaign startCampaign  (via client-side port)
 */

export interface StoredTemplate {
  name: string;
  language: string;                 // e.g. "en" or "en_US"
  components?: any[];               // the Meta DEFINITION array (as synced)
  body_text?: string | null;
  header_sample_url?: string | null; // re-hosted approved sample (durable URL)
}

export interface RuntimeInputs {
  headerMedia?: string;             // override URL for IMAGE/VIDEO/DOCUMENT header
  headerTextParams?: string[];      // params for a TEXT header containing {{n}}
  bodyParams?: string[];            // params for body {{1}}..{{n}}, in order
  buttonParams?: { index: number; sub_type: "url" | "copy_code"; text: string }[];
}

/** Count {{N}} placeholders in a string. */
const VARS = (s?: string | null): string[] =>
  (s ?? "").match(/\{\{\s*\d+\s*\}\}/g) ?? [];

/**
 * Convert a stored template DEFINITION into the SEND-shape components array.
 * Emits ONLY components that carry runtime input. Never sends format/example/
 * static text/static buttons. Returns [] for fully-static templates.
 */
export function buildTemplateSendComponents(
  t: StoredTemplate,
  inputs: RuntimeInputs = {},
): any[] {
  const out: any[] = [];

  for (const c of t.components ?? []) {
    const type = String(c.type ?? "").toUpperCase();

    if (type === "HEADER") {
      const fmt = String(c.format ?? "TEXT").toUpperCase();

      if (fmt === "IMAGE" || fmt === "VIDEO" || fmt === "DOCUMENT") {
        // Media header — use override → sample → Meta CDN handle (in that order)
        const link =
          inputs.headerMedia ??
          t.header_sample_url ??
          c.example?.header_handle?.[0] ??
          null;
        if (!link) continue; // required media missing — caller should block
        const key = fmt.toLowerCase(); // image | video | document
        out.push({
          type: "header",
          parameters: [{ type: key, [key]: { link } }],
        });
      } else if (
        fmt === "TEXT" &&
        VARS(c.text).length > 0 &&
        inputs.headerTextParams?.length
      ) {
        // Text header with variables
        out.push({
          type: "header",
          parameters: inputs.headerTextParams.map((v) => ({
            type: "text",
            text: v,
          })),
        });
      }
      // Static TEXT header → omit entirely

    } else if (type === "BODY") {
      const need = VARS(c.text ?? t.body_text).length;
      if (need > 0) {
        const params = (inputs.bodyParams ?? [])
          .slice(0, need)
          .map((v) => ({ type: "text", text: v }));
        if (params.length > 0) {
          out.push({ type: "body", parameters: params });
        }
      }
      // No vars (e.g. pixel1) → omit entirely  ← this was the failing case

    } else if (type === "BUTTONS") {
      // Only dynamic buttons (URL suffix / copy-code) need parameters
      for (const bp of inputs.buttonParams ?? []) {
        out.push({
          type: "button",
          sub_type: bp.sub_type,
          index: String(bp.index),
          parameters: [{ type: "text", text: bp.text }],
        });
      }
      // Static quick_reply / phone_number buttons → nothing to send
    }
    // FOOTER → never sent
  }

  return out;
}

/**
 * True if the template needs a media header but no source is available.
 * Call before sending to block with a clear error.
 */
export function missingRequiredHeaderMedia(
  t: StoredTemplate,
  inputs: RuntimeInputs = {},
): boolean {
  const h = (t.components ?? []).find(
    (c: any) => String(c.type).toUpperCase() === "HEADER",
  );
  if (!h) return false;
  const fmt = String(h.format ?? "TEXT").toUpperCase();
  if (!["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) return false;
  return !(
    inputs.headerMedia ||
    t.header_sample_url ||
    h.example?.header_handle?.[0]
  );
}
