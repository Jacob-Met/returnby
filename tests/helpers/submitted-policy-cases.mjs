import assert from 'node:assert/strict';

function review(app, original, merchant, days) {
  app.elements.get('paste').value = `From: ${original}\nOrder date: October 1, 2026`;
  app.elements.get('find').listeners.get('click')();
  app.elements.get('preview').fields = {
    merchant, orderDate: '2026-10-01', orderNo: 'AUTHORED-123', total: '$12.00', windowDays: String(days),
  };
}

function saved(app, merchant, days, source, label) {
  const row = app.persisted().at(-1);
  assert.equal(row.merchant, merchant);
  assert.equal(row.windowDays, days);
  assert.equal(row.windowSource, source);
  assert.equal(row.orderDate, '2026-10-01');
  assert.equal(row.orderNo, 'AUTHORED-123');
  assert.equal(row.total, '$12.00');
  assert.ok(app.elements.get('list').innerHTML.includes(label));
}

export const submittedPolicyCases = [
  ['an unlisted merchant cannot inherit another store\'s 15-day policy', async open => {
    const app = await open([]);
    review(app, 'Contoso Electronics', 'Unlisted fixture store', 15);
    app.submit();
    saved(app, 'Unlisted fixture store', 15, 'user', 'YOUR RULE / 15 DAYS');
  }],
  ['an edited unlisted merchant with 30 days uses the current fallback attribution', async open => {
    const app = await open([]);
    review(app, 'Northwind Outfitters', 'Unlisted fixture store', 30);
    app.submit();
    saved(app, 'Unlisted fixture store', 30, 'default', '30-DAY FALLBACK');
  }],
  ['an edited known merchant with its matching days receives current policy attribution', async open => {
    const app = await open([]);
    review(app, 'Unlisted fixture store', 'Northwind Outfitters', 30);
    app.submit();
    saved(app, 'Northwind Outfitters', 30, 'policy', 'STORE POLICY / 30 DAYS');
  }],
  ['switching known stores preserves chosen days and calls a mismatch a user rule', async open => {
    const app = await open([]);
    review(app, 'Contoso Electronics', 'Fabrikam Home', 15);
    app.submit();
    saved(app, 'Fabrikam Home', 15, 'user', 'YOUR RULE / 15 DAYS');
  }],
  ['switching known stores and matching the submitted policy uses that policy', async open => {
    const app = await open([]);
    review(app, 'Contoso Electronics', 'Fabrikam Home', 60);
    app.submit();
    saved(app, 'Fabrikam Home', 60, 'policy', 'STORE POLICY / 60 DAYS');
  }],
  ['unchanged policy, case and existing alias matching retain their behavior', async open => {
    for (const merchant of ['Contoso Electronics', 'CONTOSO', 'AdventureWorks']) {
      const app = await open([]);
      const days = merchant === 'AdventureWorks' ? 45 : 15;
      review(app, merchant, merchant, days);
      app.submit();
      saved(app, merchant, days, 'policy', `STORE POLICY / ${days} DAYS`);
    }
  }],
  ['unchanged unknown merchant keeps default and custom attribution', async open => {
    for (const [days, source, label] of [[30, 'default', '30-DAY FALLBACK'], [42, 'user', 'YOUR RULE / 42 DAYS']]) {
      const app = await open([]);
      review(app, 'Unlisted fixture store', 'Unlisted fixture store', days);
      app.submit();
      saved(app, 'Unlisted fixture store', days, source, label);
    }
  }],
  ['blank edited merchants use the same current lookup fallback without changing the field', async open => {
    for (const [original, days, source, label] of [['Contoso Electronics', 15, 'user', 'YOUR RULE / 15 DAYS'], ['Northwind Outfitters', 30, 'default', '30-DAY FALLBACK']]) {
      const app = await open([]);
      review(app, original, '', days);
      app.submit();
      saved(app, '', days, source, label);
    }
  }],
  ['retry after a refused save attributes the final merchant and does not duplicate', async open => {
    const app = await open([]);
    review(app, 'Contoso Electronics', 'Unlisted fixture store', 15);
    app.failNext(); app.submit();
    assert.deepEqual(app.persisted(), []);
    app.elements.get('preview').fields.merchant = 'Fabrikam Home';
    app.elements.get('preview').fields.windowDays = '60';
    app.submit();
    assert.equal(app.persisted().length, 1);
    saved(app, 'Fabrikam Home', 60, 'policy', 'STORE POLICY / 60 DAYS');
    assert.equal(app.elements.get('storage-error').hidden, true);
  }],
];
