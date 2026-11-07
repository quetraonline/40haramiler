const SOURCE_URL = 'https://www.nowaonlineworld.com/en/chaos-zone-clan-ranking';

function textOf(markup) {
  return String(markup || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function numberOf(value) {
  return Number(String(value || '').replace(/[^\d]/g, '')) || 0;
}

function warPoints(value) {
  return numberOf(textOf(value));
}

function parseTopTen(html) {
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const output = [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => m[1]);
    if (cells.length < 7) continue;

    const rankMatch = textOf(cells[0]).match(/#?\s*(\d{1,3})/);
    if (!rankMatch) continue;

    const raceMatch = cells[1].match(/<img\b[^>]*\balt=["']([^"']+)["']/i);
    output.push({
      rank: Number(rankMatch[1]),
      race: raceMatch ? textOf(raceMatch[1]) : textOf(cells[1]),
      clan: textOf(cells[2]),
      leader: textOf(cells[3]),
      memberCount: numberOf(cells[4]),
      totalWarPoints: warPoints(cells[5]),
      donateWarPoints: warPoints(cells[6])
    });
  }

  return output
    .filter((clan) => clan.clan && clan.leader)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);
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
        'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8'
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: 'Nowa sıralama servisi HTTP ' + upstream.status + ' yanıtı verdi.' });
    }

    const html = await upstream.text();
    const clans = parseTopTen(html);
    if (clans.length !== 10) {
      console.error('Clan ranking parser found ' + clans.length + ' rows; source length=' + html.length);
      return res.status(502).json({ error: 'Kaynak sayfadan ilk 10 klan okunamadı. Kaynak biçimi değişmiş olabilir.' });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      source: SOURCE_URL,
      server: 'Ares',
      updatedAt: new Date().toISOString(),
      count: 10,
      clans
    });
  } catch (error) {
    console.error('Clan ranking endpoint error:', error);
    return res.status(502).json({ error: error && error.message ? error.message : 'Klan sıralaması alınamadı.' });
  }
}
