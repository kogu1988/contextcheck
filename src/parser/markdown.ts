/**
 * Markdown section extraction (Spec §18).
 *
 * Splits markdown content into sections keyed by heading. A section is
 * `heading + content` accumulated from a heading down to (but excluding) the
 * next heading of the same or higher level. Repetition detection compares
 * heading + normalized content.
 *
 * Parsing never mutates content. Malformed/heading-less text still produces a
 * usable single-block result so analysis continues (Spec §34).
 */

export interface MarkdownSection {
  /** The heading text (without the leading `#` markers). */
  heading: string;
  /** Heading level, e.g. 1 for `#`, 2 for `##`. */
  level: number;
  /** Raw section content between this heading and the next heading. */
  content: string;
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;

/** Extracts sections from a markdown body. */
export function extractMarkdownSections(body: string): MarkdownSection[] {
  const rawLines = body.split(/\r\n|[\r\n]/);
  const sections: MarkdownSection[] = [];

  let currentHeading: string | null = null;
  let currentLevel = 0;
  let currentHeadingLine = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i] ?? "";
    const match = line.match(HEADING_RE);

    if (match) {
      // Close the previous section before opening a new one.
      if (currentHeading !== null) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: rawLines
            .slice(currentHeadingLine + 1, i)
            .join("\n")
            .trim(),
        });
      }

      currentHeading = (match[2] ?? "").trim();
      currentLevel = (match[1] ?? "").length;
      currentHeadingLine = i;
      continue;
    }
  }

  // Close the trailing section.
  if (currentHeading !== null) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: rawLines
        .slice(currentHeadingLine + 1)
        .join("\n")
        .trim(),
    });
  }

  return sections;
}

/** Text before the first heading, if any (e.g. a preamble). */
export function extractPreamble(body: string): string {
  const rawLines = body.split(/\r\n|[\r\n]/);
  let end = 0;
  while (end < rawLines.length && !rawLines[end]?.match(HEADING_RE)) {
    end++;
  }
  return rawLines.slice(0, end).join("\n").trim();
}
