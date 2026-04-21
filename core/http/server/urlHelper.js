function getNormalizedUrl(request) {
    const protocol = request.headers['x-forwarded-proto'] || 'http';
    const host = request.headers.host;
    const base = `${protocol}://${host}`;

    const safeURL = request.url.replace(/\/{2,}/g, '/');
    const rawUrl = new URL(safeURL, base);

    let cleanPath = rawUrl.pathname.replace(/\/+/g, '/');
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
        cleanPath = cleanPath.slice(0, -1);
    }
    const cleanParams = sanitizeURLParams(rawUrl.searchParams);
    
    const normalizedUrl = new URL(cleanPath, base);
    normalizedUrl.search = cleanParams.toString();
    normalizedUrl.hash = rawUrl.hash;

    const shouldRedirect = request.url !== (normalizedUrl.pathname + normalizedUrl.search + normalizedUrl.hash);

    return {
        url: normalizedUrl,
        shouldRedirect,
        redirectURL: normalizedUrl.toString()
    };
}

function sanitizeURLParams(searchParams) {
    const result = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
        if (key !== '' && value !== '') {
            result.set(key, value);
        }
    }

    return result;
}

module.exports = getNormalizedUrl;