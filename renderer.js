// renderer.js
const { escapeHtml, serializeForScript } = require('./utils');
const components = require('./components/components.js');

function layout(meta, body) {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${escapeHtml(meta?.title)}</title>
      <meta name="description" content="${escapeHtml(meta?.description)}">
      <link rel="icon" type="image/x-icon" href="/static/images/favicon.ico">

      <link rel="stylesheet" href="/static/assets/style.css">
      <script defer src="/static/assets/client.js"></script>
    </head>
    <body>
      <main id="app" data-root tabindex="-1">
        ${body}
      </main>
    </body>
    </html>
  `;
}

async function renderComponent({component, db, params}) {
  try {
    const body = (await Promise.all(component.body?.map(async element => {
      return (typeof element === 'object' && element.component) ?
        await renderComponent({component: element, db, params}) :
        `
          <p class="text">
            ${escapeHtml(element)}
          </p>
        `;
    }) ?? '')).join('\n');

    let data = [];

    if (components[component.component].needData) {
      data = await Promise.all(components[component.component].needData.map(async request => {
        return db[request](params);
      }));
    }
    
    return components[component.component].render({
      ...component,
      body,
      classList: (component.classList?.length) ? component.classList : [],
      data
    });
  } catch (e) {
    console.error('Ошибка при работе с компонентом: ' + e);
  }
}

async function renderPage({pageObject, req, res, db, URLparams}) {
  let pageBody = {};
  let pageMeta = {};

  try {
    pageMeta = JSON.parse(pageObject.meta);
  } catch (e) {
    console.error('Ошибка при парсинге мета-информации страницы:', e);
    pageMeta = {};
  }

  try {
    pageBody = JSON.parse(pageObject.body);
  } catch (e) {
    console.error('Ошибка при парсинге тела страницы:', e);
    pageBody = {};
  }

  const body = (await Promise.all(pageBody.map(async component => {
    return renderComponent({
      component,
      db,
      params: URLparams
    });
  }))).join('\n');

  return layout(pageMeta ?? {}, body);
}

module.exports = { renderPage };