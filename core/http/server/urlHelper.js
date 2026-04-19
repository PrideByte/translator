function getNormalizedUrl(request) {
    const protocol = request.headers['x-forwarded-proto'] || 'http';
    const host = request.headers.host;
    const base = `${protocol}://${host}`;
    
    const rawUrl = new URL(request.url, base);

    let cleanPath = rawUrl.pathname.replace(/\/+/g, '/');
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
        cleanPath = cleanPath.slice(0, -1);
    }
    const cleanParams = sanitizeURLParams(rawUrl.searchParams);
    
    const normalizedUrl = new URL(cleanPath, base);
    normalizedUrl.search = cleanParams.toString();

    const shouldRedirect = decodeURIComponent(rawUrl.pathname + rawUrl.search) !== decodeURIComponent(normalizedUrl.pathname + normalizedUrl.search);

    return {
        url: normalizedUrl,
        shouldRedirect,
        redirectURL: normalizedUrl.toString()
    };
}

function sanitizeURLParams(searchParams) {
    const result = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
        if (key && value && !result.has(key)) {
            result.set(key, value);
        }
    }

    return result;
}

module.exports = getNormalizedUrl;