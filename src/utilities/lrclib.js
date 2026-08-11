const axios = require("axios");

const API_BASE = "https://lrclib.net/api";
const USER_AGENT = "FireMusic-DiscordBot/1.0 (https://github.com/MobilGame06/FireMusic)";
const REQUEST_TIMEOUT = 8000;

const NOISE_PATTERNS = [
    /\([^()]*\)/g,
    /\[[^\[\]]*]/g,
    /official\s*(?:music\s*)?video/gi,
    /official\s*audio/gi,
    /lyrics?\s*video/gi,
    /\bhd\b/gi,
    /\b4k\b/gi,
    /\bfull\s*song\b/gi,
    /\bremaster(?:ed)?\b/gi,
    /\bvisuali[sz]er\b/gi
];

function collapse(str) {
    return str.replace(/\s{2,}/g, " ").replace(/^[\s\-–|]+|[\s\-–|]+$/g, "").trim();
}

function stripNoise(str) {
    let out = str;
    for (const pattern of NOISE_PATTERNS) {
        out = out.replace(pattern, " ");
    }
    return collapse(out);
}

function cleanTitle(raw = "") {
    return stripNoise(raw);
}

function cleanArtist(raw = "") {
    const base = raw.replace(/\s*-\s*topic$/i, "").replace(/vevo$/i, "");
    const primary = base.split(/\s*(?:,|&|\/|\bfeat\.?\b|\bft\.?\b|\bwith\b|\bx\b|\bvs\.?\b)\s*/i)[0];
    return stripNoise(primary);
}

/**
 * "Artist - Title" strings (radio metadata, YouTube titles) split into their parts.
 */
function splitArtistTitle(raw = "") {
    const parts = raw.split(/\s+[-–—]\s+/);
    if (parts.length < 2) return null;
    return {
        artist: cleanArtist(parts[0]),
        title: cleanTitle(parts.slice(1).join(" - "))
    };
}

function normalize(str = "") {
    return str
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

/**
 * Rough token overlap between two strings, 0 (nothing in common) to 1 (identical).
 */
function similarity(a = "", b = "") {
    const left = new Set(normalize(a).split(" ").filter(Boolean));
    const right = new Set(normalize(b).split(" ").filter(Boolean));
    if (!left.size || !right.size) return 0;

    let shared = 0;
    for (const token of left) {
        if (right.has(token)) shared += 1;
    }
    return shared / Math.max(left.size, right.size);
}

async function request(path, params) {
    try {
        const response = await axios.get(`${API_BASE}${path}`, {
            params,
            timeout: REQUEST_TIMEOUT,
            headers: {
                "User-Agent": USER_AGENT,
                "Lrclib-Client": USER_AGENT
            },
            validateStatus: (status) => status === 200 || status === 404
        });
        return response.status === 200 ? response.data : null;
    } catch (error) {
        console.warn(`[lrclib] Request to ${path} failed: ${error.message}`);
        return null;
    }
}

function hasLyrics(candidate) {
    return Boolean(candidate && (candidate.syncedLyrics || candidate.plainLyrics || candidate.instrumental));
}

function scoreCandidate(candidate, { title, artist, durationSec }) {
    let score = 0;

    if (candidate.syncedLyrics) score += 40;
    if (candidate.plainLyrics) score += 5;

    if (durationSec && candidate.duration) {
        const diff = Math.abs(candidate.duration - durationSec);
        if (diff <= 2) score += 40;
        else if (diff <= 5) score += 25;
        else if (diff <= 15) score += 8;
        else score -= Math.min(40, diff);
    }

    score += similarity(candidate.trackName, title) * 30;
    if (artist) score += similarity(candidate.artistName, artist) * 20;

    return score;
}

function pickBest(candidates, context) {
    let best = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
        if (!hasLyrics(candidate)) continue;
        const score = scoreCandidate(candidate, context);
        if (score > bestScore) {
            best = candidate;
            bestScore = score;
        }
    }

    return best ? { candidate: best, score: bestScore } : null;
}

function toResult(candidate) {
    if (!candidate) return null;
    return {
        id: candidate.id,
        trackName: candidate.trackName || candidate.name || null,
        artistName: candidate.artistName || null,
        albumName: candidate.albumName || null,
        duration: candidate.duration ? Math.round(candidate.duration * 1000) : null,
        instrumental: Boolean(candidate.instrumental),
        plainLyrics: candidate.plainLyrics || null,
        syncedLyrics: candidate.syncedLyrics || null
    };
}

/**
 * Looks up lyrics on lrclib.net, preferring versions that carry timestamps.
 *
 * @returns normalized lyrics object, or null when nothing usable was found.
 */
async function fetchLyrics({ title, artist, album, durationMs } = {}) {
    const cleanedTitle = cleanTitle(title || "");
    const cleanedArtist = cleanArtist(artist || "");
    if (!cleanedTitle) return null;

    const durationSec = durationMs && durationMs > 0 ? Math.round(durationMs / 1000) : null;
    const variants = buildVariants(cleanedTitle, cleanedArtist);
    const scored = [];

    for (const variant of variants) {
        const context = { title: variant.title, artist: variant.artist, durationSec };
        const candidates = await lookupVariant(variant, { album, durationSec });

        const best = pickBest(candidates, context);
        if (!best) continue;

        // Good enough and timestamped: no reason to keep querying the API.
        if (best.candidate.syncedLyrics && isGoodMatch(best.candidate, context)) {
            return toResult(best.candidate);
        }
        scored.push({ ...best, context });
    }

    scored.sort((a, b) => b.score - a.score);

    for (const { candidate, context } of scored) {
        if (isPlausibleMatch(candidate, context)) return toResult(candidate);
    }
    return null;
}

/**
 * Query spellings worth trying, most trustworthy first. Track titles from YouTube often
 * carry the artist ("Artist - Song (Official Video)") while the uploader is a channel name,
 * so the split form frequently beats the raw metadata.
 */
function buildVariants(title, artist) {
    const variants = [];
    const seen = new Set();

    const add = (variantTitle, variantArtist) => {
        if (!variantTitle || variantTitle.length < 2) return;
        const key = `${variantTitle.toLowerCase()}|${(variantArtist || "").toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        variants.push({ title: variantTitle, artist: variantArtist || null });
    };

    add(title, artist);

    const split = splitArtistTitle(title);
    if (split) {
        add(split.title, split.artist);
        add(split.title, artist);
        add(split.title, null);
    }

    add(title, null);

    return variants;
}

async function lookupVariant(variant, { album, durationSec }) {
    const candidates = [];

    if (variant.artist) {
        // Signature lookup first: with a duration lrclib only answers on a (near) exact match.
        if (durationSec) {
            const exact = await request("/get", {
                track_name: variant.title,
                artist_name: variant.artist,
                album_name: album || undefined,
                duration: durationSec
            });
            if (hasLyrics(exact)) candidates.push(exact);
        }

        const loose = await request("/get", {
            track_name: variant.title,
            artist_name: variant.artist
        });
        if (hasLyrics(loose)) candidates.push(loose);
    }

    if (!candidates.some((candidate) => candidate.syncedLyrics)) {
        const searched = await request("/search", {
            track_name: variant.title,
            artist_name: variant.artist || undefined
        });
        if (Array.isArray(searched)) candidates.push(...searched);
    }

    return candidates;
}

/**
 * Guards against confidently returning a same-named but different song.
 */
function isGoodMatch(candidate, { title, artist, durationSec }) {
    if (similarity(candidate.trackName, title) < 0.5) return false;
    if (artist && similarity(candidate.artistName, artist) < 0.34) return false;
    if (durationSec && candidate.duration && Math.abs(candidate.duration - durationSec) > 15) return false;
    return true;
}

/**
 * Lower bar for the last resort — still strict enough that a same-named song by a
 * different artist is reported as "not found" instead of as the wrong lyrics.
 */
function isPlausibleMatch(candidate, { title, artist, durationSec }) {
    if (similarity(candidate.trackName, title) < 0.5) return false;

    const diff = durationSec && candidate.duration ? Math.abs(candidate.duration - durationSec) : null;
    if (diff !== null && diff > 20) return false;
    if (artist && similarity(candidate.artistName, artist) === 0 && !(diff !== null && diff <= 5)) return false;

    return true;
}

const TIMESTAMP_LINE = /^((?:\s*\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?])+)(.*)$/;
const TIMESTAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?]/g;

/**
 * Parses an LRC body into timestamped lines sorted by time.
 *
 * @returns array of `{ time: ms, text: string }` — empty when the input holds no timestamps.
 */
function parseSyncedLyrics(lrc) {
    if (!lrc) return [];

    const lines = [];

    for (const rawLine of lrc.split(/\r?\n/)) {
        const match = rawLine.match(TIMESTAMP_LINE);
        if (!match) continue;

        const text = match[2].trim();
        for (const stamp of match[1].matchAll(TIMESTAMP)) {
            const minutes = parseInt(stamp[1], 10);
            const seconds = parseInt(stamp[2], 10);
            const fraction = stamp[3] ? parseInt(stamp[3].padEnd(3, "0"), 10) : 0;
            lines.push({ time: minutes * 60000 + seconds * 1000 + fraction, text });
        }
    }

    return lines.sort((a, b) => a.time - b.time);
}

/**
 * Index of the line that should be highlighted at `position`, or -1 before the first line.
 */
function findLineIndex(lines, position) {
    let index = -1;
    for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].time <= position) index = i;
        else break;
    }
    return index;
}

module.exports = {
    fetchLyrics,
    parseSyncedLyrics,
    findLineIndex,
    cleanTitle,
    cleanArtist,
    splitArtistTitle
};
