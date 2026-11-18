// Fonds d'écran dynamiques sur le thème « focus et persévérance » : sommets, phares, grands paysages de montagne.
// Source : Wikimedia Commons, photos « Featured pictures » (licences libres, sans clé d'API), Full HD en paysage.
//
// GET /api/wallpaper?theme=<n> : toute la sélection d'un thème. L'app tire une photo au hasard dans la liste.
// Une réponse par thème, mise en cache 1 jour sur le CDN : quelques appels à Commons par jour, pas un par visite
// (Commons limite le débit : https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits).

const API = 'https://commons.wikimedia.org/w/api.php';
// Commons demande un User-Agent identifiable avec un moyen de contact (ASCII uniquement)
const UA = 'AbouRSE/1.0 (https://github.com/kwicl/AbouRSE; portfolio tracker wallpaper)';

export const THEMES = [
  'incategory:Featured_pictures_of_mountains',
  'incategory:Featured_pictures_of_lighthouses',
  'incategory:Featured_pictures_of_landscapes mountain',
];

interface ImageInfo {
  thumburl?: string;
  width: number;
  height: number;
  mime: string;
  descriptionurl: string;
  extmetadata?: Record<string, { value: string } | undefined>;
}

interface Page {
  title: string;
  imageinfo?: ImageInfo[];
}

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export async function GET(req: Request): Promise<Response> {
  const n = Math.abs(Math.trunc(Number(new URL(req.url).searchParams.get('theme')) || 0));
  const query = THEMES[n % THEMES.length];

  try {
    const url = new URL(API);
    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrnamespace: '6',
      gsrlimit: '50',
      gsrsearch: query,
      prop: 'imageinfo',
      iiprop: 'url|size|mime|extmetadata',
      iiextmetadatafilter: 'Artist|LicenseShortName',
      iiurlwidth: '1920',
    }).toString();

    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return json({ error: `Commons HTTP ${res.status}` }, 502);

    const pages = Object.values(((await res.json()) as { query?: { pages?: Record<string, Page> } }).query?.pages ?? {});
    // Full HD en paysage, JPEG uniquement (pas de panoramas extrêmes)
    const photos = pages
      .map((p) => ({ p, i: p.imageinfo?.[0] }))
      .filter(({ i }) => i?.thumburl && i.mime === 'image/jpeg' && i.width >= 1920 && i.width / i.height > 1.3 && i.width / i.height < 2.3)
      .map(({ p, i }) => ({
        url: i!.thumburl!,
        title: p.title.replace(/^File:/, '').replace(/\.jpe?g$/i, ''),
        author: strip(i!.extmetadata?.Artist?.value) || 'Wikimedia Commons',
        license: strip(i!.extmetadata?.LicenseShortName?.value),
        page: i!.descriptionurl,
      }));
    if (!photos.length) return json({ error: 'Aucune image' }, 502);

    return json({ theme: n % THEMES.length, photos }, 200, 'public, s-maxage=86400, stale-while-revalidate=604800');
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Source indisponible' }, 502);
  }
}

function json(data: unknown, status = 200, cache = 'no-store'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}
