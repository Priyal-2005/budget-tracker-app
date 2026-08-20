import type { MonthlyReport, ReportEntry } from '@/hooks/use-monthly-report';
import { CATEGORY_LABELS, INCOME_SOURCE_LABELS } from '@/types/database';

// Item names and spend notes are user-entered and go straight into the markup.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// The PDF is printed on white paper and read outside the app, so it uses its
// own light styling rather than the app theme.
function rupees(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function row(label: string, amount: number) {
  return `<tr><td>${escapeHtml(label)}</td><td class="amount">${rupees(amount)}</td></tr>`;
}

function shortDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function entryRows(entries: ReportEntry[], showCategory: boolean) {
  return entries
    .map(
      (entry) => `<tr>
        <td class="date">${escapeHtml(shortDate(entry.loggedAt))}</td>
        <td>${escapeHtml(entry.label)}${
          showCategory
            ? `<span class="muted"> · ${escapeHtml(CATEGORY_LABELS[entry.category])}</span>`
            : ''
        }</td>
        <td class="amount">${rupees(entry.amount)}</td>
      </tr>`
    )
    .join('');
}

export function buildReportHtml(report: MonthlyReport, displayName: string | null) {
  const incomeRows = report.incomeBySource
    .map((entry) => row(INCOME_SOURCE_LABELS[entry.source], entry.amount))
    .join('');

  const expenseRows = report.expensesByCategory
    .map((entry) => row(CATEGORY_LABELS[entry.category], entry.amount))
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #16181d;
        margin: 0;
        padding: 32px;
        background: #ffffff;
      }
      h1 { font-size: 24px; margin: 0 0 4px; }
      h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #60646c; margin: 28px 0 8px; }
      h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #90949c; margin: 18px 0 6px; font-weight: 600; }
      td.date { color: #90949c; white-space: nowrap; width: 62px; }
      .muted { color: #60646c; }
      .summary { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
      .stat { flex: 1; min-width: 130px; border: 1px solid #e0e1e6; border-radius: 10px; padding: 12px; }
      .stat .label { font-size: 12px; color: #60646c; }
      .stat .value { font-size: 20px; font-weight: 600; margin-top: 2px; }
      .value.good { color: #1e7f4a; }
      .value.bad { color: #c23b35; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 7px 0; border-bottom: 1px solid #eeeff2; font-size: 14px; }
      td.amount { text-align: right; font-variant-numeric: tabular-nums; }
      tr.total td { font-weight: 600; border-bottom: none; border-top: 2px solid #16181d; }
      footer { margin-top: 32px; font-size: 11px; color: #90949c; }
    </style>
  </head>
  <body>
    <h1>${displayName ? `${escapeHtml(displayName)}&rsquo;s budget` : 'Monthly budget'}</h1>
    <div class="muted">${escapeHtml(report.monthLabel)}</div>

    <div class="summary">
      <div class="stat">
        <div class="label">Income</div>
        <div class="value">${rupees(report.totalIncome)}</div>
      </div>
      <div class="stat">
        <div class="label">Fixed expenses</div>
        <div class="value">${rupees(report.totalFixed)}</div>
      </div>
      <div class="stat">
        <div class="label">Buffer spent</div>
        <div class="value">${rupees(report.bufferSpent)}</div>
      </div>
      <div class="stat">
        <div class="label">Saved</div>
        <div class="value ${report.savings < 0 ? 'bad' : 'good'}">${rupees(report.savings)}</div>
      </div>
    </div>

    ${
      report.incomeBySource.length > 0
        ? `<h2>Money in</h2>
    <table>${incomeRows}
      <tr class="total"><td>Total</td><td class="amount">${rupees(report.totalIncome)}</td></tr>
    </table>`
        : ''
    }

    ${
      report.expensesByCategory.length > 0
        ? `<h2>Fixed expenses</h2>
    <table>${expenseRows}
      <tr class="total"><td>Total</td><td class="amount">${rupees(report.totalFixed)}</td></tr>
    </table>`
        : ''
    }

    ${
      report.fixedEntries.length > 0
        ? `<h2>Everything bought</h2>
    <table>${entryRows(report.fixedEntries, true)}
      <tr class="total"><td colspan="2">Total</td><td class="amount">${rupees(
        report.totalFixed
      )}</td></tr>
    </table>`
        : ''
    }

    <h2>Buffer</h2>
    <table>
      ${row('Set aside for the month', report.bufferAllotted)}
      ${row('Spent', report.bufferSpent)}
      <tr class="total"><td>Left</td><td class="amount">${rupees(
        report.bufferAllotted - report.bufferSpent
      )}</td></tr>
    </table>

    ${
      report.bufferEntries.length > 0
        ? `<h3>What the buffer went on</h3>
    <table>${entryRows(report.bufferEntries, false)}</table>`
        : ''
    }

    <footer>Generated from my budget app on ${escapeHtml(
      new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    )}.</footer>
  </body>
</html>`;
}
