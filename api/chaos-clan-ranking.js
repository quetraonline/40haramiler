const SOURCE_URL = 'https://www.nowaonlineworld.com/en/chaos-zone-clan-ranking';

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

function parseWarPoints(value = '') {
  const match = clean(value).match(/[\d][\d,.\s]*\s*WP\b/i);
  return match ? Number(match[0].replace(/[^\d]/g, '')) : 0;
}

function parseClans(html = '') {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const clans = [];

  for (const rowMatch of rows) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cell) => cell[1]);

    if (cells.length < 7) continue;

    const rankText = clean(cells[0]);
    const rankMatch = rankText.match(/#?\s*(\d{1,3})\b/);
    if (!rankMatch) continue;

    const raceMarkup = cells[1] || '';
    const raceMatch = raceMarkup.match(/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/i);
    const race = raceMatch ? clean(raceMatch[1]) : clean(raceMarkup);
    const clan = clean(cells[2]);
    const leader = clean(cells[3]);
    const memberCount = Number(clean(cells[4]).replace(/[^\d]/g, '')) || 0;
    const totalWarPoints = parseWarPoints(cells[5]);
    const donateWarPoints = parseWarPoints(cells[6]);

    if (!clan || !leader) continue;

    clans.push({
      rank: Number(rankMatch[1]),
      race: race || '—',
      clan,
      leader,
      memberCount,
      totalWarPoints,
      donateWarPoints
    });
  }

  return clans.sort((a, b) => a.rank - b.rank).slice(0, 10);
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
      throw new Error('Nowa klan sıralaması HTTP ' + upstream.status + ' yanıtı verdi.');
    }

    const html = await upstream.text();
    const clans = parseClans(html);

    if (clans.length !== 10) {
      throw new Error('Kaynak sayfadan ilk 10 klan okunamadı (bulunan: ' + clans.length + '). Sayfa yapısı değişmiş olabilir.');
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      source: SOURCE_URL,
      server: 'Ares',
      title: 'Chaos Zone Clan Ranking',
      updatedAt: new Date().toISOString(),
      count: clans.length,
      clans
    });
  } catch (error) {
    return res.status(502).json({
      error: error?.message || 'Klan sıralaması şu anda alınamıyor.',
      source: SOURCE_URL
    });
  }
}
