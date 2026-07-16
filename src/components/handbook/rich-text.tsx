function renderInline(text: string, keyPrefix: string) {
  const pattern = /\*\*(.+?)\*\*|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${index++}`}>{match[1]}</strong>);
    } else {
      nodes.push(<a key={`${keyPrefix}-${index++}`} href={match[3]} target="_blank" rel="noreferrer">{match[2]}</a>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const paragraphs = text.split(/\n\s*\n/);

  paragraphs.forEach((paragraph, pIndex) => {
    const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);

    // Group consecutive lines within this block: runs of "- " lines become a <ul>,
    // runs of plain lines are joined into a single <p>. A bold label line (e.g.
    // "**Pre-conference:**") immediately followed by "- " lines must not collapse
    // into one flattened paragraph, so list runs are detected independently of
    // whatever precedes them in the same block.
    let run: string[] = [];
    let runIsList = false;
    let blockIndex = 0;

    function flushRun() {
      if (!run.length) return;
      const key = `p${pIndex}-b${blockIndex++}`;
      if (runIsList) {
        blocks.push(<ul key={key}>{run.map((item, index) => <li key={index}>{renderInline(item.slice(2), `${key}-${index}`)}</li>)}</ul>);
      } else {
        blocks.push(<p key={key}>{renderInline(run.join(" "), key)}</p>);
      }
      run = [];
    }

    lines.forEach((line) => {
      const isListLine = line.startsWith("- ");
      if (run.length && isListLine !== runIsList) flushRun();
      runIsList = isListLine;
      run.push(line);
    });
    flushRun();
  });

  return <>{blocks}</>;
}
