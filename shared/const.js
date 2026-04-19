const protocol = `http`;
const host = `localhost`;
const port = +process.env.SERVER_PORT || 8080;
const limitList = [10, 30, 50];
const limitDefault = 10;
const pageDefault = 1;
const sizesDictionary = {
    'KB': 1024,
    'MB': 1024*1024,
    'GB': 1024*1024*1024
}
const db_config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4'
}

module.exports = {
    limitList,
    port,
    limitDefault,
    pageDefault,
    sizesDictionary,
    db_config
};