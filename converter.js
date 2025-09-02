const INDENT_STEP = 2; // indent width for nested structures

// --- Escape HTML special characters to prevent injection ---
function escapeHtml(s){
  return s.replace(/&/g,"&amp;")
          .replace(/</g,"&lt;")
          .replace(/>/g,"&gt;")
          .replace(/\"/g,"&quot;")
          .replace(/'/g,"&#39;");
}

// --- Convert inline Markdown syntax into HTML ---
function inlineMarkdown(text){
  if (!text) return "";
  let s = escapeHtml(text);

  // Store inline code separately (to avoid conflict with other rules)
  const codeSpans = [];
  s = s.replace(/`([^`]+)`/g,(m,code)=>{const i=codeSpans.push(code)-1;return `\u0000CODE${i}\u0000`;});
  
  // Images: ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,'<img src="$2" alt="$1">');
  
  // Links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
  
  // Bold + Italic: ***text***
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g,'<strong><em>$1</em></strong>');
  // Bold: **text**
  s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  
  // Underline: __text__
  s = s.replace(/__([^_]+)__/g,'<u>$1</u>');
  
  // Italic: *text* or _text_
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g,(m,p,t)=>p+'<em>'+t+'</em>');
  s = s.replace(/(^|[^_])_([^_]+)_(?!_)/g,(m,p,t)=>p+'<em>'+t+'</em>');

  // Strikethrough: ~~text~~
  s = s.replace(/~~([^~]+)~~/g,'<del>$1</del>');
  
  // Restore inline code
  s = s.replace(/\u0000CODE(\d+)\u0000/g,(m,idx)=>`<code>${escapeHtml(codeSpans[idx])}</code>`);
  
  // Colored text: @@#RRGGBB text@@ or @@text@@ (red by default)
  s = s.replace(/@@([^@]+)@@/g, (m, inner) => {
    // Detect 3-digit (#fff) or 6-digit (#ffffff) hex color code
    const colorMatch = inner.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/);
    if (colorMatch) {
      const color = colorMatch[0]; // Extracted color code (#fff or #ffffff)
      const text  = inner.slice(color.length).trimStart(); // Remaining string is the actual text
      return `<span style="color:${color}">${text}</span>`;
    }
    // If no color code is provided, default to red
    return `<span style="color:#f00">${inner}</span>`;
  });
  
  // Highlight text: %%#RRGGBB text%% or %%text%% (yellow default)
  s = s.replace(/%%([^%]+)%%/g, (m, inner) => {
    const colorMatch = inner.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/);
    if (colorMatch) {
      const color = colorMatch[0];
      const text  = inner.slice(color.length).trimStart();
      return `<span style="background-color:${color}">${text}</span>`;
    }
    // If no color code is provided, default to orange
    return `<span style="background-color:#FFA500">${inner}</span>`;
  });
  
  return s;
}

// --- Main converter: Markdown → Pretty HTML ---
function markdownToPrettyHtml(md){
  const lines = md.replace(/\r\n?/g,'\n').split('\n'); // normalize line breaks
  const out = [];
  const stack = []; // heading <details> stack
  const push = line=>out.push(' '.repeat(stack.length*INDENT_STEP)+line);
  let paraBuf = []; // paragraph buffer
  let inCodeBlock = false;
  let codeLang = '';
  let inBlockquote = false;
  let blockquoteBuf = [];
  let inTable = false;
  let tableBuf = [];
  const listStack = []; // track nested lists [{type,level}]

  // Flush buffered paragraph into <p>
  const flushParagraph = ()=>{
    if(paraBuf.length){
      push('<p>');
      paraBuf.forEach((ln,i)=>{
        push(inlineMarkdown(ln)+(i===paraBuf.length-1?'':'<br>'));
      });
      push('</p>');
      paraBuf=[];
    }
  };

  // --- Flush buffered table lines into <table> ---
  const flushTable = () => {
    if (!tableBuf.length) return;
    const [headerLine, separatorLine, ...bodyLines] = tableBuf;
    const headers = headerLine.split('|').map(s=>s.trim()).filter(s=>s);
    push('<table>');
    push('<thead><tr>' + headers.map(h=>`<th>${inlineMarkdown(h)}</th>`).join('') + '</tr></thead>');
    if(bodyLines.length){
      push('<tbody>');
      bodyLines.forEach(line=>{
        const cells = line.split('|').map(s=>s.trim()).filter(s=>s);
        push('<tr>' + cells.map(c=>`<td>${inlineMarkdown(c)}</td>`).join('') + '</tr>');
      });
      push('</tbody>');
    }
    push('</table>');
    tableBuf = [];
    inTable = false;
  };

  // --- Main line-by-line parser ---
  for(let i = 0; i < lines.length; i++){
    let line = lines[i];

    // --- Horizontal rule (***, ---, ___) ---
    if(/^\s*(\*\*\*|---|___)\s*$/.test(line)){
      flushParagraph();
      push('<hr>');
      continue;
    }
    
    // Fenced code blocks: ```lang
    if(line.match(/^```/)){
      flushParagraph();
      if(inCodeBlock){ push('</code></pre>'); inCodeBlock=false; continue; }
      else{ codeLang=line.replace(/^```/,'').trim(); push(`<pre><code class="${codeLang}">`); inCodeBlock=true; continue; }
    }
    if(inCodeBlock){ push(escapeHtml(line)); continue; }

    // Headings (#, ##, ...)
    const h=line.match(/^(#{1,6})\s+(.*)$/);
    if(h){
      const level=h[1].length;
      const text=inlineMarkdown(h[2].trim());
      flushParagraph();
      while(stack.length && stack[stack.length-1].level>=level){
         push('</details>');
         stack.pop();
      }
      push(`<details style="margin-left:${level}em">`);
      push(`<summary><h${level}>${text}</h${level}></summary>`);
      stack.push({level});
      continue;
    }

    // Lists (-, *, +, or numbered)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if(listMatch){
      flushParagraph();
      const indent = listMatch[1].length;
      const level = Math.floor(indent / 2) + 1; // 2 spaces = 1 level
      const type = listMatch[2].match(/\d+\./)?'ol':'ul';
      const text = inlineMarkdown(listMatch[3]);

      while(listStack.length && (listStack[listStack.length-1].level > level || listStack[listStack.length-1].type !== type)){
        push(`</${listStack.pop().type}>`);
      }

      if(!listStack.length || listStack[listStack.length-1].level < level){
        push(`<${type}>`);
        listStack.push({type, level});
      }

      push(`<li>${text}</li>`);
      continue;
    } else {
      while(listStack.length){ push(`</${listStack.pop().type}>`); }
    }

    // GitHub-style alert blocks
    const alertMatch = line.match(/^\s*>+\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
    if(alertMatch){
      flushParagraph();
      const type = alertMatch[1].toLowerCase(); // note, tip, important, warning, caution
      const svg = {
            note: '<svg class="octicon octicon-info mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>',
            tip: '<svg class="octicon octicon-light-bulb mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>',
            important: '<svg class="octicon octicon-report mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>',
            warning: '<svg class="octicon octicon-alert mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>',
            caution: '<svg class="octicon octicon-stop mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>'
        }[type] || '';

      // Buffer to collect alert content
      const alertLines = [alertMatch[2] || ''];

      // Append lines starting with ">" to the content
      while(i + 1 < lines.length && lines[i + 1].match(/^\s*>+\s*(.*)$/)){
        i++; // Consume the line
        const content = lines[i].replace(/^\s*>+\s*/, '');
        alertLines.push(content);
      }

      // Generate alert HTML
      push(`<div class="markdown-alert markdown-alert-${type}" dir="auto">`);
      push(`<p class="markdown-alert-title" dir="auto">${svg}${type.charAt(0).toUpperCase()+type.slice(1)}</p>`);
      push(`<p dir="auto">${alertLines.filter(l => l.trim() !== '').map(inlineMarkdown).join('<br>')}</p>`);
      push('</div>');
      continue;
    }

    // Blockquotes: > text
    const bqMatch = line.match(/^\s*>+\s*(.*)$/);
    if(bqMatch){
      flushParagraph();
      blockquoteBuf.push(inlineMarkdown(bqMatch[1]));
      inBlockquote = true;
      continue;
    } else if(inBlockquote){
      // End of blockquote
      push('<blockquote>' + blockquoteBuf.join('<br>\n') + '</blockquote>');
      blockquoteBuf = [];
      inBlockquote = false;
    }

    // --- Tables: lines starting with '|' ---
    const tableMatch = line.match(/^\s*\|(.+)\|\s*$/);
    if(tableMatch){
      flushParagraph();
      tableBuf.push(line);
      inTable = true;
      continue;
    } else if(inTable){
      flushTable();
    }
    
    // Blank line → paragraph flush
    if(/^\s*$/.test(line)){ flushParagraph(); continue; }

    // Normal text → buffer
    paraBuf.push(line);
  }

  // --- Final cleanup ---
  while(listStack.length){ push(`</${listStack.pop().type}>`); }
  flushParagraph();
  while(stack.length){ push('</details>'); stack.pop(); }

  return out.join('\n');
}

// --- Wrap converted body with full HTML document (using external script for placeholders) ---
function buildDownloadHtml(prettyBody) {
  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Converted Markdown</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.min.css">
    <style>
      @media (prefers-color-scheme: dark) {
        body { background-color:#0d1117; color:#c9d1d9; }
        .markdown-body { background-color:transparent; }
      }
    </style>
  </head>
  <body>
    <article class="markdown-body">
${prettyBody}
    </article>
    <script>
(function(){
  try {
    var seen = Object.create(null);
    var article = document.querySelector("article");
    article.innerHTML = article.innerHTML.replace(/\{([^\}]+)\}/g, function(m,key){
      if(!(key in seen)){
        var v = prompt("「"+key+"」に入れるテキストを入力してください:","");
        seen[key] = (v && v.length) ? v : m;
      }
      return seen[key];
    });
  } catch(e) { console.error(e); }
})();
    </script>
  </body>
</html>`;
}


// --- Trigger download of generated HTML ---
function downloadFile(filename,content){
  const blob=new Blob([content],{type:'text/html'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- Main entry: convert textarea input when button is clicked ---
document.getElementById('convertBtn').addEventListener('click',()=>{
  const md=document.getElementById('mdInput').value||'';
  const body=markdownToPrettyHtml(md);
  const full=buildDownloadHtml(body);
  console.log(full)
const prettyBody = html_beautify(full, { indent_size: 2, preserve_newlines: true, max_preserve_newlines: 2 });
    console.log(prettyBody)
  downloadFile('converted.html',prettyBody);
});
