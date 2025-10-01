(() => {
  function postConvert(ids) {
    fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids ? { ids } : {})
    }).then(r => {
      if (!r.ok) throw new Error('Convert failed');
      return r.json();
    }).then(payload => {
      const blob = new Blob([JSON.stringify(payload.records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ids ? 'selected-sheets.json' : 'all-sheets.json';
      a.click();
      URL.revokeObjectURL(url);
      if (payload.summaryCsv) {
        const csvBlob = new Blob([payload.summaryCsv], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvA = document.createElement('a');
        csvA.href = csvUrl;
        csvA.download = ids ? 'selected-summary.csv' : 'all-summary.csv';
        csvA.click();
        URL.revokeObjectURL(csvUrl);
      }
    }).catch(err => {
      console.error(err);
      alert('Conversion failed.');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const allBtn = document.getElementById('convert-all-btn');
    const selectBtn = document.getElementById('convert-select-btn');
    allBtn?.addEventListener('click', () => postConvert());
    selectBtn?.addEventListener('click', async () => {
      // Naive selection prompt: ask for comma separated ids.
      const raw = prompt('Enter sheet IDs (comma separated) to convert. Leave blank to cancel. Example: ashtear,cermia');
      if (!raw) return;
      const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
      if (!ids.length) return;
      postConvert(ids);
    });
  });
})();
