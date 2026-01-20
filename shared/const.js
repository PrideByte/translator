const protocol = `http`;
const host = `localhost`;
const port = 8080;
const defaultOrigin = new URL(`${protocol}://${host}:${port}`);
const limitList = [10, 30, 50];
const limitDefault = 10;
const pageDefault = 1;
const sizesDictionary = {
    'KB': 1024,
    'MB': 1024*1024,
    'TB': 1024*1024*1024
}

module.exports = {
    limitList,
    port,
    defaultOrigin,
    limitDefault,
    pageDefault,
    sizesDictionary
};