function sendResponse(response, result) {
    if (result.headers) {
        for (const [key, value] of Object.entries(result.headers)) {
            response.setHeader(key, value);
        }
    }

    response.writeHead(result.statusCode || 500);
    response.end(result.data);
}

module.exports = sendResponse;