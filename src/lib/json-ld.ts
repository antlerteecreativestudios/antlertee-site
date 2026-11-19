/**
 * Serialises structured data for a <script type="application/ld+json"> tag. JSON.stringify leaves "<" as is, so text
 * such as "</script>" in a product or post title would end the tag and run as script; "<" is the same character
 * to a JSON parser but can never close the tag.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
