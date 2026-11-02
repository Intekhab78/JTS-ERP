/**
 * JTS ERP - Help Documentation & SOP Manual Exporter
 * Supports Markdown (.md), Standalone HTML (.html), JSON (.json), and Printable/Save-as-PDF view.
 */

// Helper to escape HTML characters
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Builds a structured Markdown documentation string
 */
export const buildMarkdownDoc = (modules, title = 'JTS ERP Enterprise Documentation & SOP Manual') => {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let md = `# ${title}\n\n`;
  md += `> **System:** JTS Enterprise ERP v4.2  \n`;
  md += `> **Generated on:** ${dateStr}  \n`;
  md += `> **Scope:** ${modules.length === 1 ? modules[0].title : `Complete System (${modules.length} Core Modules)`}\n\n`;
  md += `---\n\n`;

  // Table of Contents
  md += `## 📑 Table of Contents\n\n`;
  modules.forEach((mod, idx) => {
    md += `${idx + 1}. [${mod.title}](#${mod.id})\n`;
    if (mod.submodules && mod.submodules.length > 0) {
      mod.submodules.forEach(sub => {
        md += `   - ${sub.name}\n`;
      });
    }
  });
  md += `\n---\n\n`;

  // Detailed Modules Breakdown
  modules.forEach((mod, mIdx) => {
    md += `<a id="${mod.id}"></a>\n`;
    md += `## ${mIdx + 1}. ${mod.title}\n\n`;
    md += `**Category:** ${mod.category} | **Classification:** ${mod.badge}\n\n`;
    md += `**Module Overview:**\n${mod.summary}\n\n`;

    // 1. Submodules / Key Features
    if (mod.submodules && mod.submodules.length > 0) {
      md += `### 🔍 Features & Operational Screens (${mod.submodules.length})\n\n`;
      mod.submodules.forEach((sub, sIdx) => {
        md += `#### ${mIdx + 1}.${sIdx + 1} ${sub.name}\n`;
        md += `- **Purpose:** ${sub.purpose}\n`;
        if (sub.path) md += `- **Access Path / URL:** \`${sub.path}\`\n`;

        if (sub.keyFeatures && sub.keyFeatures.length > 0) {
          md += `\n**Key Capabilities:**\n`;
          sub.keyFeatures.forEach(feat => {
            md += `  - ${feat}\n`;
          });
        }

        if (sub.actionsExplained && sub.actionsExplained.length > 0) {
          md += `\n**Actions & Controls Explained:**\n\n`;
          md += `| Action / Button | Description & Behavior |\n`;
          md += `| :--- | :--- |\n`;
          sub.actionsExplained.forEach(act => {
            md += `| **${act.action}** | ${act.desc} |\n`;
          });
          md += `\n`;
        }
        md += `\n`;
      });
    }

    // 2. Standard Operating Procedures (SOP Workflows)
    if (mod.workflows && mod.workflows.length > 0) {
      md += `### 📋 Step-by-Step Standard Operating Procedures (SOPs)\n\n`;
      mod.workflows.forEach((wf, wIdx) => {
        md += `#### SOP ${mIdx + 1}.${wIdx + 1}: ${wf.title}\n`;
        md += `*Estimated Time: ${wf.time || 'N/A'} | Difficulty: ${wf.difficulty || 'Standard'}*\n\n`;

        if (wf.steps && wf.steps.length > 0) {
          wf.steps.forEach(st => {
            md += `**Step ${st.stepNumber}: ${st.title}**\n\n`;
            md += `${st.description}\n\n`;
            if (st.tip) {
              md += `> 💡 **Best Practice / Tip:** ${st.tip}\n\n`;
            }
          });
        }
      });
    }

    // 3. FAQs & Troubleshooting
    if (mod.faqs && mod.faqs.length > 0) {
      md += `### ❓ Frequently Asked Questions & Troubleshooting\n\n`;
      mod.faqs.forEach((faq, fIdx) => {
        md += `**Q${fIdx + 1}: ${faq.q}**\n\n`;
        md += `${faq.a}\n\n`;
      });
    }

    // 4. Pro Tips & Shortcuts
    if (mod.tips && mod.tips.length > 0) {
      md += `### 💡 Pro Tips & Shortcuts\n\n`;
      mod.tips.forEach(tip => {
        md += `- ${tip}\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
  });

  md += `\n*End of Documentation. For live support or feedback, please contact the JTS ERP System Administrator.*\n`;
  return md;
};

/**
 * Builds a standalone, beautiful HTML document suitable for offline reading and printing
 */
export const buildHtmlDoc = (modules, title = 'JTS ERP Enterprise Documentation & SOP Manual') => {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --primary: #1e40af;
      --primary-light: #3b82f6;
      --bg: #ffffff;
      --card-bg: #f8fafc;
      --text: #0f172a;
      --text-muted: #475569;
      --border: #e2e8f0;
      --accent: #059669;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
      margin: 0;
      padding: 30px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    header.doc-header {
      border-bottom: 3px solid var(--primary);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #dbeafe;
      color: #1e40af;
      margin-bottom: 12px;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
    }
    .meta {
      font-size: 13px;
      color: var(--text-muted);
    }
    .toc {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 40px;
    }
    .toc h3 { margin-top: 0; font-size: 16px; font-weight: 800; }
    .toc ul { margin: 0; padding-left: 20px; }
    .toc li { margin-bottom: 6px; font-size: 13px; }
    .toc a { color: var(--primary); text-decoration: none; font-weight: 600; }
    .toc a:hover { text-decoration: underline; }

    .module-card {
      margin-bottom: 50px;
      page-break-before: auto;
    }
    .module-header {
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      color: white;
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 24px;
    }
    .module-header h2 { margin: 0 0 8px 0; font-size: 22px; font-weight: 800; }
    .module-header p { margin: 0; font-size: 14px; opacity: 0.95; line-height: 1.5; }
    .module-header .tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      background: rgba(255,255,255,0.2);
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    h3.section-title {
      font-size: 17px;
      font-weight: 800;
      color: #1e293b;
      border-bottom: 2px solid var(--border);
      padding-bottom: 8px;
      margin: 30px 0 16px 0;
    }

    .feature-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 16px;
    }
    .feature-card h4 {
      margin: 0 0 6px 0;
      font-size: 15px;
      font-weight: 700;
      color: #1e40af;
    }
    .feature-card p {
      margin: 0 0 10px 0;
      font-size: 13px;
      color: var(--text-muted);
    }
    .feature-card ul {
      margin: 0;
      padding-left: 20px;
      font-size: 12.5px;
      color: var(--text);
    }
    .feature-card li { margin-bottom: 4px; }

    table.actions-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 12px;
    }
    table.actions-table th, table.actions-table td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
    }
    table.actions-table th {
      background: #e2e8f0;
      font-weight: 700;
      color: #334155;
    }

    .sop-card {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 20px;
      background: #ffffff;
    }
    .sop-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      border-bottom: 1px dashed var(--border);
      padding-bottom: 8px;
    }
    .sop-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
    .sop-badge { font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; }

    .sop-step {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .sop-num {
      width: 26px;
      height: 26px;
      background: #2563eb;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .sop-step-content { flex: 1; }
    .sop-step-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .sop-step-desc { font-size: 12.5px; color: #475569; line-height: 1.5; margin: 0; }
    .sop-tip {
      font-size: 12px;
      background: #fef3c7;
      border-left: 3px solid #d97706;
      padding: 6px 10px;
      border-radius: 0 6px 6px 0;
      margin-top: 6px;
      color: #92400e;
    }

    .faq-item {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 10px;
    }
    .faq-q { font-size: 13px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
    .faq-a { font-size: 12.5px; color: #475569; margin: 0; }

    .tips-list {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 0 10px 10px 0;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .tips-list ul { margin: 0; padding-left: 20px; font-size: 12.5px; color: #1e3a8a; }
    .tips-list li { margin-bottom: 6px; }

    .print-actions {
      position: fixed;
      top: 16px;
      right: 16px;
      background: white;
      padding: 8px 14px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 1px solid var(--border);
      display: flex;
      gap: 10px;
      z-index: 999;
    }
    .btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
    }
    .btn-primary { background: #2563eb; color: white; }
    .btn-secondary { background: #e2e8f0; color: #1e293b; }

    @media print {
      body { padding: 0; }
      .print-actions, .toc { display: none; }
      .module-card { page-break-before: always; }
      .module-card:first-of-type { page-break-before: avoid; }
      .module-header { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="btn btn-secondary" onclick="window.close()">Close</button>
  </div>

  <div class="container">
    <header class="doc-header">
      <div class="badge">JTS ERP Enterprise Documentation</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        System Version 4.2 | Generated on ${dateStr} | Scope: ${modules.length === 1 ? escapeHtml(modules[0].title) : `${modules.length} Core Modules`}
      </div>
    </header>

    ${modules.length > 1 ? `
    <div class="toc">
      <h3>📑 Table of Contents</h3>
      <ul>
        ${modules.map((m, idx) => `
          <li>
            <a href="#mod-${m.id}">${idx + 1}. ${escapeHtml(m.title)}</a>
            <span style="color:#64748b; font-size:11px;">(${m.category})</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${modules.map((mod, mIdx) => `
      <div class="module-card" id="mod-${mod.id}">
        <div class="module-header">
          <div class="tag">${escapeHtml(mod.category)} · ${escapeHtml(mod.badge)}</div>
          <h2>${mIdx + 1}. ${escapeHtml(mod.title)}</h2>
          <p>${escapeHtml(mod.summary)}</p>
        </div>

        ${mod.submodules && mod.submodules.length > 0 ? `
          <h3 class="section-title">🔍 Features & Operational Screens (${mod.submodules.length})</h3>
          ${mod.submodules.map((sub, sIdx) => `
            <div class="feature-card">
              <h4>${mIdx + 1}.${sIdx + 1} ${escapeHtml(sub.name)} ${sub.path ? `<span style="font-size:11px; font-weight:normal; color:#64748b; margin-left:8px;">(Path: ${escapeHtml(sub.path)})</span>` : ''}</h4>
              <p>${escapeHtml(sub.purpose)}</p>
              ${sub.keyFeatures && sub.keyFeatures.length > 0 ? `
                <ul>
                  ${sub.keyFeatures.map(kf => `<li>${escapeHtml(kf)}</li>`).join('')}
                </ul>
              ` : ''}
              ${sub.actionsExplained && sub.actionsExplained.length > 0 ? `
                <table class="actions-table">
                  <thead>
                    <tr><th>Action / Control</th><th>Function & Behavior</th></tr>
                  </thead>
                  <tbody>
                    ${sub.actionsExplained.map(act => `
                      <tr>
                        <td style="font-weight:700; white-space:nowrap;">${escapeHtml(act.action)}</td>
                        <td>${escapeHtml(act.desc)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}
            </div>
          `).join('')}
        ` : ''}

        ${mod.workflows && mod.workflows.length > 0 ? `
          <h3 class="section-title">📋 Step-by-Step SOP Workflows (${mod.workflows.length})</h3>
          ${mod.workflows.map((wf, wIdx) => `
            <div class="sop-card">
              <div class="sop-header">
                <div class="sop-title">SOP ${mIdx + 1}.${wIdx + 1}: ${escapeHtml(wf.title)}</div>
                <div class="sop-badge">⏱️ ${escapeHtml(wf.time || 'Standard')} · ${escapeHtml(wf.difficulty || 'Easy')}</div>
              </div>
              ${(wf.steps || []).map(st => `
                <div class="sop-step">
                  <div class="sop-num">${st.stepNumber}</div>
                  <div class="sop-step-content">
                    <div class="sop-step-title">${escapeHtml(st.title)}</div>
                    <p class="sop-step-desc">${escapeHtml(st.description)}</p>
                    ${st.tip ? `<div class="sop-tip">💡 <strong>Pro Tip:</strong> ${escapeHtml(st.tip)}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}
        ` : ''}

        ${mod.faqs && mod.faqs.length > 0 ? `
          <h3 class="section-title">❓ Frequently Asked Questions & Troubleshooting</h3>
          ${mod.faqs.map(faq => `
            <div class="faq-item">
              <div class="faq-q">Q: ${escapeHtml(faq.q)}</div>
              <div class="faq-a">A: ${escapeHtml(faq.a)}</div>
            </div>
          `).join('')}
        ` : ''}

        ${mod.tips && mod.tips.length > 0 ? `
          <h3 class="section-title">💡 Pro Tips & Shortcuts</h3>
          <div class="tips-list">
            <ul>
              ${mod.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `).join('')}

    <footer style="margin-top:40px; padding-top:20px; border-top:1px solid #e2e8f0; font-size:12px; color:#64748b; text-align:center;">
      JTS Enterprise ERP v4.2 · Confidential & Proprietary Internal Documentation
    </footer>
  </div>
</body>
</html>`;
};

/**
 * Triggers direct browser download of a string content
 */
const triggerFileDownload = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/**
 * Download Markdown file (.md)
 */
export const downloadMarkdown = (modules, customTitle) => {
  const isSingle = modules.length === 1;
  const filename = isSingle
    ? `${modules[0].title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_sop_manual.md`
    : `jts_erp_complete_help_manual.md`;
  
  const title = customTitle || (isSingle 
    ? `${modules[0].title} - Standard Operating Procedures & User Guide`
    : 'JTS ERP Enterprise Complete Help & SOP Manual');

  const content = buildMarkdownDoc(modules, title);
  triggerFileDownload(content, filename, 'text/markdown;charset=utf-8;');
};

/**
 * Download Standalone HTML file (.html)
 */
export const downloadHtml = (modules, customTitle) => {
  const isSingle = modules.length === 1;
  const filename = isSingle
    ? `${modules[0].title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_guide.html`
    : `jts_erp_complete_manual.html`;

  const title = customTitle || (isSingle 
    ? `${modules[0].title} - User Guide & SOPs`
    : 'JTS ERP Complete Manual');

  const content = buildHtmlDoc(modules, title);
  triggerFileDownload(content, filename, 'text/html;charset=utf-8;');
};

/**
 * Download JSON file (.json) for IT/LMS integration
 */
export const downloadJson = (modules) => {
  const isSingle = modules.length === 1;
  const filename = isSingle
    ? `${modules[0].title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_help_data.json`
    : `jts_erp_help_data.json`;

  const payload = {
    system: 'JTS Enterprise ERP',
    version: '4.2',
    exportedAt: new Date().toISOString(),
    moduleCount: modules.length,
    modules
  };

  const content = JSON.stringify(payload, null, 2);
  triggerFileDownload(content, filename, 'application/json;charset=utf-8;');
};

/**
 * Opens a print-optimized window and invokes window.print() (Save as PDF)
 */
export const printOrSavePdf = (modules, customTitle) => {
  const isSingle = modules.length === 1;
  const title = customTitle || (isSingle 
    ? `${modules[0].title} - User Manual & SOPs`
    : 'JTS ERP Enterprise Complete SOP Manual');

  const html = buildHtmlDoc(modules, title);
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Auto-invoke print after fonts/content render
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.warn('Auto print error:', err);
      }
    }, 500);
  } else {
    alert('Popup blocker prevented opening the print window. Please allow popups for this site.');
  }
};
