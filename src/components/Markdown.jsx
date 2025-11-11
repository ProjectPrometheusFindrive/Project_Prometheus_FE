import React from "react";

// Lightweight Markdown renderer with basic GFM table support.
// Supports headings (#..######), unordered/ordered lists, paragraphs, and tables (|A|B| + --- separator).
export default function Markdown({ content = "", className = "" }) {
  const lines = String(content).replace(/\r\n?/g, "\n").split("\n");

  const blocks = [];
  let para = [];
  let listType = null; // 'ul' | 'ol'
  let listItems = [];

  const flushParagraph = () => {
    if (para.length) {
      const text = para.join(" ").trim();
      if (text) blocks.push({ type: "paragraph", text });
      para = [];
    }
  };

  const flushList = () => {
    if (listType && listItems.length) {
      blocks.push({ type: listType, items: listItems.slice() });
    }
    listType = null;
    listItems = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  const splitTableRow = (s) => {
    let str = s.trim();
    if (str.startsWith("|")) str = str.slice(1);
    if (str.endsWith("|")) str = str.slice(0, -1);
    return str.split("|").map((c) => c.trim());
  };

  const isDelimiterCell = (cell) => /^:?-{3,}:?$/.test(cell.trim());

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\t/g, "    ");
    if (!line.trim()) {
      flushAll();
      continue;
    }

    // Horizontal rule
    const hr = line.trim().replace(/\s+/g, "");
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(hr)) {
      flushAll();
      blocks.push({ type: "hr" });
      continue;
    }

    // Code fence ```lang
    const fenceOpen = line.match(/^```([^\s`]*)\s*$/);
    if (fenceOpen) {
      flushAll();
      const lang = fenceOpen[1] || "";
      const codeLines = [];
      let k = i + 1;
      while (k < lines.length) {
        const l2 = lines[k];
        if (/^```\s*$/.test(l2)) {
          break;
        }
        codeLines.push(l2);
        k++;
      }
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      i = k; // jump past closing fence
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      flushAll();
      const quoteLines = [];
      let k = i;
      while (k < lines.length) {
        const ql = lines[k];
        if (!/^>\s?/.test(ql)) break;
        quoteLines.push(ql.replace(/^>\s?/, ""));
        k++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      i = k - 1;
      continue;
    }

    // Table detection: header row with '|' and a delimiter row next
    const pipeCount = (line.match(/\|/g) || []).length;
    if (pipeCount >= 2 && i + 1 < lines.length) {
      const next = lines[i + 1];
      const nextPipes = (next.match(/\|/g) || []).length;
      if (nextPipes >= 1) {
        const delimCells = splitTableRow(next);
        const isDelimRow = delimCells.length > 0 && delimCells.every(isDelimiterCell);
        if (isDelimRow) {
          // Flush current paragraph/list before table
          flushAll();
          const headers = splitTableRow(line);
          const aligns = delimCells.map((cell) => {
            const c = cell.trim();
            const left = c.startsWith(":");
            const right = c.endsWith(":");
            if (left && right) return "center";
            if (right) return "right";
            if (left) return "left";
            return null;
          });
          const rows = [];
          let k = i + 2;
          while (k < lines.length) {
            const rowLine = lines[k];
            if (!rowLine.trim()) break;
            if ((rowLine.match(/\|/g) || []).length < 1) break;
            rows.push(splitTableRow(rowLine));
            k++;
          }
          blocks.push({ type: "table", headers, aligns, rows });
          i = k - 1; // advance
          continue;
        }
      }
    }

    // Heading: up to ######
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      flushAll();
      const level = Math.min(hMatch[1].length, 6);
      blocks.push({ type: "heading", level, text: hMatch[2].trim() });
      continue;
    }

    // Ordered list item
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(olMatch[2]);
      continue;
    }

    // Unordered list item (supports task list - [ ] / - [x])
    const ulMatch = line.match(/^([*+-])\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      const itemText = ulMatch[2];
      const task = itemText.match(/^\[( |x|X)\]\s+(.+)$/);
      if (task) {
        listItems.push({ task: true, checked: /x|X/.test(task[1]), text: task[2] });
      } else {
        listItems.push(itemText);
      }
      continue;
    }

    // Default: paragraph line
    para.push(line.trim());
  }

  flushAll();

  const elements = blocks.map((b, idx) => {
    if (b.type === "heading") {
      const Tag = `h${b.level}`;
      return <Tag key={idx} className="mb-2 font-semibold">{renderInline(b.text)}</Tag>;
    }
    if (b.type === "ul") {
      return (
        <ul key={idx} className="list-disc pl-5 mb-2">
          {b.items.map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              {typeof it === "object" && it && it.task ? (
                <input type="checkbox" disabled readOnly checked={!!it.checked} className="mt-0.5" />
              ) : null}
              <span>{renderInline(typeof it === "object" && it ? it.text : it)}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (b.type === "ol") {
      return (
        <ol key={idx} className="list-decimal pl-5 mb-2">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    }
    if (b.type === "table") {
      return (
        <div key={idx} className="mb-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {b.headers.map((h, i) => (
                  <th key={i} style={{ textAlign: b.aligns[i] || "left", border: "1px solid #e5e7eb", padding: "6px 8px", background: "#f9fafb" }}>{renderInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} style={{ textAlign: b.aligns[ci] || "left", border: "1px solid #e5e7eb", padding: "6px 8px" }}>{renderInline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (b.type === "hr") {
      return <hr key={idx} className="my-3 border-gray-200" />;
    }
    if (b.type === "blockquote") {
      return (
        <blockquote key={idx} className="border-l-4 border-gray-300 pl-3 my-2 text-gray-700">
          <Markdown content={b.text} />
        </blockquote>
      );
    }
    if (b.type === "code") {
      return (
        <pre key={idx} className="bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto text-sm">
          <code className={b.lang ? `language-${b.lang}` : undefined}>{b.code}</code>
        </pre>
      );
    }
    return <p key={idx} className="mb-2">{renderInline(b.text)}</p>;
  });

  return <div className={className}>{elements}</div>;
}

// Inline Markdown: bold, italic, code, links (basic)
function renderInline(text) {
  const nodes = [];
  const re = /(`[^`]+`)|(!\[[^\]]*?\]\([^\)]+?\))|(\[[^\]]+?\]\([^\)]+?\))|(\*\*([\s\S]+?)\*\*)|(__([\s\S]+?)__)|(~~([\s\S]+?)~~)|(\*([^*]+?)\*)|(_([^_]+?)_)/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(...linkify(text.slice(lastIndex, m.index)));
    }
    if (m[1]) {
      // `code`
      nodes.push(<code key={nodes.length}>{m[1].slice(1, -1)}</code>);
    } else if (m[2]) {
      // image ![alt](url)
      const im = m[2].match(/^!\[([^\]]*?)\]\(([^\)]+?)\)$/);
      const alt = im ? im[1] : "";
      const src = im ? im[2] : "";
      nodes.push(<img key={nodes.length} src={src} alt={alt} style={{ maxWidth: "100%" }} />);
    } else if (m[3]) {
      // link [text](url)
      const lm = m[3].match(/^\[([^\]]+?)\]\(([^\)]+?)\)$/);
      const label = lm ? lm[1] : "";
      const href = lm ? lm[2] : "";
      nodes.push(
        <a key={nodes.length} href={href} target="_blank" rel="noreferrer noopener">
          {label}
        </a>
      );
    } else if (m[4] || m[6]) {
      const inner = m[5] || m[7] || "";
      nodes.push(<strong key={nodes.length}>{inner}</strong>);
    } else if (m[8]) {
      const inner = m[9] || "";
      nodes.push(<del key={nodes.length}>{inner}</del>);
    } else if (m[10] || m[12]) {
      const inner = m[11] || m[13] || "";
      nodes.push(<em key={nodes.length}>{inner}</em>);
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(...linkify(text.slice(lastIndex)));
  }
  return nodes;
}

function linkify(text) {
  const parts = [];
  const urlRe = /(https?:\/\/[^\s)]+)(?![^<]*>)/g;
  let last = 0;
  let m;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[1];
    parts.push(
      <a key={parts.length} href={url} target="_blank" rel="noreferrer noopener">
        {url}
      </a>
    );
    last = urlRe.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
