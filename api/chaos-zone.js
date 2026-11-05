const SOURCE_URL = 'https://www.nowaonlineworld.com/en/chaos-zone-user-ranking';

function clean(value = '') {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function imageAlts(html = '') {
  return [...html.matchAll(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi)]
    .map((match) => clean(match[1]));
}

function parseRows(html) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const players = [];

  for (const match of rows) {
    const row = match[1];
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cell) => cell[1]);
    if (cells.length < 5) continue;

    const rankText = clean(cells[0] || row);
    const rankMatch = rankText.match(/#?\s*(\d{1,3})\b/);
    if (!rankMatch) continue;

    const cellText = cells.map(clean);
    const altText = cells.map((cell) => imageAlts(cell));
    const combined = [...cellText, ...altText.flat()].join(' ');
    const job = ['Warrior', 'Rogue', 'Priest', 'Mage'].find((v) => combined.includes(v)) || '';
    const race = ['Human', 'Karus', 'Orc'].find((v) => combined.includes(v)) || '';

    const player = cellText[4] || '';
    if (!player || /^\d+$/.test(player)) continue;

    const wpCell = cellText.find((v) => /\d[\d,\.\s]*\s*WP\b/i.test(v)) || cellText[cellText.length - 1] || '';
    const wpMatch = wpCell.match(/[\d][\d,\.\s]*/);
    const warPoint = wpMatch ? Number(wpMatch[0].replace(/[^\d]/g, '')) : 0;
    const clan = cellText[5] && cellText[5] !== '-' ? cellText[5] : '';

    players.push({
      rank: Number(rankMatch[1]),
      player,
      clan,
      race,
      job,
      warPoint
    });
  }

  return players.sort((a, b) => a.rank - b.rank);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Yalnızca GET isteği destekleniyor.' });
  }

  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 40HaramilerRanking/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(12000)
    });

    if (!upstream.ok) {
      throw new Error(`Nowa sıralama servisi HTTP ${upstream.status} yanıtı verdi.`);
    }

    const html = await upstream.text();
    const players = parseRows(html);

    if (!players.length) {
      throw new Error('Kaynak sayfanın tablo biçimi değişmiş olabilir; sıralama verisi ayrıştırılamadı.');
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      source: SOURCE_URL,
      server: 'Ares',
      title: 'Chaos Zone / Battle Points',
      updatedAt: new Date().toISOString(),
      count: players.length,
      players
    });
  } catch (error) {
    return res.status(502).json({
      error: error?.message || 'Sıralama verisi şu anda alınamadı.',
      source: SOURCE_URL
    });
  }
}
