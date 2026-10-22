import fs from 'fs';
import path from 'path';

async function generateBist100Md() {
  const url = 'https://www.borsaistanbul.com/datum/hisse_endeks_ds.csv';
  console.log('Fetching Borsa Istanbul official constituent CSV...');
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`Borsa Istanbul CSV fetch failed: ${res.status} ${res.statusText}`);
  }

  const buffer = await res.arrayBuffer();
  const decoder = new TextDecoder('windows-1254');
  const text = decoder.decode(buffer);
  const lines = text.split(/\r?\n/).filter(Boolean);

  // Read local company details for additional metadata (city, full name)
  let compMap = new Map();
  try {
    const compDataPath = path.resolve(process.cwd(), 'lib/bist-companies.json');
    if (fs.existsSync(compDataPath)) {
      const bistCompanies = JSON.parse(fs.readFileSync(compDataPath, 'utf8'));
      for (const c of bistCompanies) {
        compMap.set(c.code.toUpperCase(), c);
      }
    }
  } catch (err) {
    console.warn('Could not read bist-companies.json:', err.message);
  }

  const sectorIndexNames = {
    'XBANK': 'Bankacılık',
    'XUSIN': 'Sınai / İmalat',
    'XHOLD': 'Holding & Yatırım',
    'XGMYO': 'GYO',
    'XGIDA': 'Gıda & İçecek',
    'XELKT': 'Elektrik & Enerji',
    'XULAS': 'Ulaştırma & Havacılık',
    'XILTM': 'İletişim & Telekomünikasyon',
    'XMETA': 'Metal Ana Sanayi',
    'XMANA': 'Metal Ana Sanayi',
    'XMESY': 'Metal Eşya & Makine',
    'XKMYA': 'Kimya, Petrol & Plastik',
    'XINSR': 'İnşaat & Taahhüt',
    'XTKST': 'Tekstil & Giyim',
    'XTRZM': 'Turizm',
    'XTCRT': 'Perakende & Ticaret',
    'XBLSM': 'Bilişim & Yazılım',
    'XUTEK': 'Teknoloji',
    'XMADN': 'Madencilik',
    'XTAST': 'Taş & Toprak / Çimento',
    'XSGRT': 'Sigorta',
    'XFINK': 'Finansal Kiralama & Faktoring',
    'XSPOR': 'Spor'
  };

  const xu100Map = new Map();
  const stockAllIndices = new Map();
  let borsaDate = '';

  for (let i = 2; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length < 4) continue;
    const symbol = parts[0].replace(/\.E$/i, '').trim();
    const bultenAdi = parts[1].trim();
    const indexCode = parts[2].trim();
    const indexName = parts[3].trim();
    if (!borsaDate && parts[5]) borsaDate = parts[5].trim();

    if (!stockAllIndices.has(symbol)) {
      stockAllIndices.set(symbol, new Set());
    }
    stockAllIndices.get(symbol).add(indexCode);

    if (indexCode === 'XU100') {
      const localComp = compMap.get(symbol);
      xu100Map.set(symbol, {
        code: symbol,
        ticker: `${symbol}.IS`,
        bultenName: bultenAdi,
        fullName: localComp?.name || bultenAdi,
        city: localComp?.city || '-'
      });
    }
  }

  const xu100List = Array.from(xu100Map.values());
  xu100List.sort((a, b) => a.code.localeCompare(b.code, 'tr'));

  // Build sector and segment categorization
  const enrichedList = xu100List.map(item => {
    const indices = stockAllIndices.get(item.code) || new Set();
    const isBist30 = indices.has('XU030');
    const isBist50 = indices.has('XU050');
    const isKatilim = indices.has('XK100') || indices.has('XKTUM');
    const isTemettu = indices.has('XTMTU') || indices.has('XT05Y') || indices.has('XT10Y');
    const isSurdurulebilir = indices.has('XUSRD') || indices.has('XSD25');

    // Detect Sector
    const sectors = [];
    for (const [code, label] of Object.entries(sectorIndexNames)) {
      if (indices.has(code)) {
        sectors.push(label);
      }
    }
    const sectorDisplay = sectors.length > 0 ? sectors.join(', ') : 'Diğer Sınai/Hizmet';

    return {
      ...item,
      isBist30,
      isBist50,
      isKatilim,
      isTemettu,
      isSurdurulebilir,
      sector: sectorDisplay
    };
  });

  const bist30Count = enrichedList.filter(x => x.isBist30).length;
  const bist50Count = enrichedList.filter(x => x.isBist50).length;
  const katilimCount = enrichedList.filter(x => x.isKatilim).length;
  const temettuCount = enrichedList.filter(x => x.isTemettu).length;

  let md = `# BIST 100 Şirketleri Listesi (XU100)

Bu liste, **Borsa İstanbul (BIST)** resmi günlük veri akışından (\`borsaistanbul.com\`) canlı olarak çekilerek oluşturulmuştur.

- **Veri Kaynağı:** Borsa İstanbul Resmi Endeks Veri Servisi (BIST Günlük Bülten CSV)
- **Veri Tarihi:** ${borsaDate || new Date().toISOString().slice(0, 10)}
- **Toplam BIST 100 Şirketi:** ${enrichedList.length}
- **BIST 30 Kapsamındaki Şirketler:** ${bist30Count} adet
- **BIST 50 Kapsamındaki Şirketler:** ${bist50Count} adet
- **Katılım Endeksine Uygun Şirketler (XK100/XKTUM):** ${katilimCount} adet
- **Temettü Endeksindeki Şirketler (XTMTU):** ${temettuCount} adet

---

## BIST 100 Şirketleri Tablosu

| # | Kod | Ticker (Yahoo) | Şirket / Bülten Adı | Sektör / Alan | BIST 30 | BIST 50 | Katılım | Temettü | Şehir |
|:---:|:---:|:---:|:---|:---|:---:|:---:|:---:|:---:|:---|
`;

  enrichedList.forEach((c, idx) => {
    const b30 = c.isBist30 ? '✅' : '—';
    const b50 = c.isBist50 ? '✅' : '—';
    const kat = c.isKatilim ? '✅' : '—';
    const tem = c.isTemettu ? '✅' : '—';
    md += `| ${idx + 1} | **${c.code}** | \`${c.ticker}\` | ${c.bultenName} | ${c.sector} | ${b30} | ${b50} | ${kat} | ${tem} | ${c.city} |\n`;
  });

  md += `
---

## BIST 30 Şirketleri (${bist30Count} Hisse)
BIST 100 içerisindeki en yüksek piyasa değeri ve işlem hacmine sahip BIST 30 hisseleri:

${enrichedList.filter(x => x.isBist30).map(x => `- **${x.code}** (\`${x.ticker}\`) - ${x.bultenName}`).join('\n')}

---

## BIST 50 Şirketleri (${bist50Count} Hisse)
BIST 100 içerisindeki BIST 50 hisseleri:

${enrichedList.filter(x => x.isBist50).map(x => `- **${x.code}** (\`${x.ticker}\`) - ${x.bultenName}`).join('\n')}

---

## Sektörel Dağılım

`;

  // Group by sector
  const sectorGroups = new Map();
  for (const c of enrichedList) {
    const s = c.sector;
    if (!sectorGroups.has(s)) sectorGroups.set(s, []);
    sectorGroups.get(s).push(c);
  }

  // Sort sectors by count descending
  const sortedSectors = Array.from(sectorGroups.entries()).sort((a, b) => b[1].length - a[1].length);

  for (const [sec, comps] of sortedSectors) {
    md += `### ${sec} (${comps.length} Şirket)\n`;
    md += comps.map(c => `\`${c.code}\``).join(', ') + '\n\n';
  }

  md += `---

## Detaylı Şirket Künyeleri

| Kod | Tam Ticari Unvanı | Şehir |
|:---:|:---|:---:|
`;

  enrichedList.forEach(c => {
    md += `| **${c.code}** | ${c.fullName} | ${c.city} |\n`;
  });

  md += `
---
*Son Güncelleme: ${new Date().toLocaleString('tr-TR')}*
`;

  const targetPath = path.resolve(process.cwd(), 'bist100.md');
  fs.writeFileSync(targetPath, md, 'utf8');
  console.log(`Successfully generated: ${targetPath}`);

  const tickersJsonPath = path.resolve(process.cwd(), 'lib/bist-100-tickers.json');
  const tickers = enrichedList.map(c => c.ticker);
  fs.writeFileSync(tickersJsonPath, JSON.stringify(tickers, null, 2), 'utf8');
  console.log(`Successfully generated: ${tickersJsonPath} (${tickers.length} tickers)`);
}

generateBist100Md().catch(err => {
  console.error('Error generating bist100.md:', err);
  process.exit(1);
});
