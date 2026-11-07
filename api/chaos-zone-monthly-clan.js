const SOURCE_URL = 'https://www.nowaonlineworld.com/en/chaos-zone-user-ranking?tab=monthly';

function clean(value = '') {
  return String(value)
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

function normalizeClan(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]/g, '');
}

function parseRows(html) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const players = [];

  for (const match of rows) {
    const row = match[1];
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cell) => cell[1]);
    if (cells.length < 6) continue;

    const cellText = cells.map(clean);
    const rankMatch = (cellText[0] || clean(row)).match(/#?\s*(\d{1,4})\b/);
    if (!rankMatch) continue;

    const altText = cells.map((cell) => imageAlts(cell));
    const combined = [...cellText, ...altText.flat()].join(' ');
    const job = ['Warrior', 'Rogue', 'Priest', 'Mage'].find((v) => combined.includes(v)) || '';
    const race = ['Human', 'Karus', 'Orc'].find((v) => combined.includes(v)) || '';
    const player = cellText[4] || '';
    const clan = cellText[5] && cellText[5] !== '-' ? cellText[5] : '';
    if (!player || /^\d+$/.test(player) || normalizeClan(clan) !== '40haramiler') continue;

    const wpCell = cellText.find((v) => /\d[\d,.\s]*\s*WP\b/i.test(v)) || cellText[cellText.length - 1] || '';
    const wpMatch = wpCell.match(/[\d][\d,.\s]*/);
    const monthlyWarPoint = wpMatch ? Number(wpMatch[0].replace(/[^\d]/g, '')) : 0;

    players.push({
      sourceRank: Number(rankMatch[1]),
      player,
      clan,
      race,
      job,
      monthlyWarPoint
    });
  }

  return players
    .sort((a, b) => b.monthlyWarPoint - a.monthlyWarPoint || a.sourceRank - b.sourceRank)
    .map((player, index) => ({ ...player, clanRank: index + 1 }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Yalnızca GET isteği destekleniyor.' });
  }

  try {
    const upstream = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 40HaramilerMonthlyRanking/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8'
      },
      signal: AbortSignal.timeout(12000)
    });

    if (!upstream.ok) {
      throw new Error('Nowa aylık sıralama servisi HTTP ' + upstream.status + ' yanıtı verdi.');
    }

    const html = await upstream.text();
    const players = parseRows(html);
    if (!players.length) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({
        source: SOURCE_URL,
        server: 'Ares',
        clan: '40_HaRaMiLeR',
        period: 'monthly',
        updatedAt: new Date().toISOString(),
        count: 0,
        players: [],
        notice: 'Nowa aylık oyuncu sıralaması Clan sütununda üye bilgisi yayınlamıyor. 40_HaRaMiLeR oyuncularını doğru eşleştirmek için klan üye isimleri gerekiyor.'
      });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      source: SOURCE_URL,
      server: 'Ares',
      clan: '40_HaRaMiLeR',
      period: 'monthly',
      updatedAt: new Date().toISOString(),
      count: players.length,
      players
    });
  } catch (error) {
    console.error('Monthly 40Haramiler ranking error:', error);
    return res.status(502).json({
      error: error?.message || 'Aylık klan sıralaması şu anda alınamadı.',
      source: SOURCE_URL
    });
  }
}
