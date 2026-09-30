/**
 * Serialize structured data for an inline `<script type="application/ld+json">`.
 *
 * `JSON.stringify` alone is not safe inside a script element: a string value
 * containing `</script>` (a title, a description, a quoted tag) ends the
 * element early and the rest is parsed as HTML. Escaping `<`, `>` and `&` as
 * JSON unicode escapes keeps the text inert to the HTML parser while every
 * JSON parser reads back the identical value. U+2028/U+2029 are escaped for
 * the same reason in the other direction: they are legal in JSON strings but
 * were line terminators in pre-ES2019 JavaScript.
 */
const UNSAFE = /[<>&\u2028\u2029]/g;

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    UNSAFE,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}
