import type { MonthlyReport } from '@/hooks/use-monthly-report';
import { CATEGORY_LABELS, INCOME_SOURCE_LABELS } from '@/types/database';

// Goal names are user-entered and go straight into the report markup.
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

export function buildReportHtml(report: MonthlyReport, displayName: string | null) {
  const incomeRows = report.incomeBySource
    .map((entry) => row(INCOME_SOURCE_LABELS[entry.source], entry.amount))
    .join('');

  const expenseRows = report.expensesByCategory
    .map((entry) => row(CATEGORY_LABELS[entry.category], entry.amount))
    .join('');

  const goalRows = report.goals
    .map((goal) => {
      const saved = Number(goal.current_amount);
      const target = Number(goal.target_amount);
      const percent = target === 0 ? 0 : Math.min(100, Math.round((saved / target) * 100));
      return `
        <div class="goal">
          <div class="goal-head">
            <span>${escapeHtml(goal.name)}</span>
            <span class="muted">${rupees(saved)} of ${rupees(target)}</span>
          </div>
          <div class="bar"><div class="bar-fill" style="width:${percent}%"></div></div>
        </div>`;
    })
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
      .goal { margin-bottom: 12px; }
      .goal-head { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; }
      .bar { height: 7px; background: #eeeff2; border-radius: 4px; overflow: hidden; }
      .bar-fill { height: 100%; background: #208aef; }
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

    <h2>Buffer</h2>
    <table>
      ${row('Set aside for the month', report.bufferAllotted)}
      ${row('Spent', report.bufferSpent)}
      <tr class="total"><td>Left</td><td class="amount">${rupees(
        report.bufferAllotted - report.bufferSpent
      )}</td></tr>
    </table>

    ${report.goals.length > 0 ? `<h2>Savings goals</h2>${goalRows}` : ''}

    <footer>Generated from my budget app on ${escapeHtml(
      new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    )}.</footer>
  </body>
</html>`;
}
