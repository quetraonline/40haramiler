export default async function handler(req, res) {
  try {
    const response = await fetch('https://www.nowaonlineworld.com/en/chaos-zone-clan-ranking', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(10000)
    });
    const html = await response.text();
    const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    const result = rows.map((match) => {
      const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
      const clean = (v) => v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const text = cells.map(clean);
      return { text, clanHtml: cells[2] || '', clanLinks: [...(cells[2] || '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({href:m[1],text:clean(m[2])})) };
    }).filter(row => row.text.some(v => v.toLocaleLowerCase('en').includes('40_haramiler')));
    return res.status(200).json({status:response.status,found:result.length,rows:result});
  } catch (e) {
    return res.status(502).json({error:e.message});
  }
}
