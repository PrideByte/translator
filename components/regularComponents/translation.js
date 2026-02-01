async function requiredData({ attrs, messages }) {
    return !Object.entries(messages).length ? {} : {
        data: messages
    };
}

function renderRows({ errors, CSSclass, data }) {
    if (!data.length) {
        return `
            <div class="${CSSclass}__row">
                <input class="${CSSclass}__input" name="translations" type="text" placeholder="Перевод" required>
                <button class="btn" type="button" aria-label="Удалить перевод">
                    ×
                </button>
            </div>
        `;
    }

    let result = '';

    data.forEach((element, idx) => {
        result += `
            <div class="${CSSclass}__row">
                <input class="${CSSclass}__input" name="translations" type="text" placeholder="Перевод"${errors ? ` value="${element}"` : ''}${(idx === 0) ? ` required` : ''}>
                <button class="btn" type="button" aria-label="Удалить перевод">
                    ×
                </button>
            </div>
        `;
    });

    return result;
}

function render(opts) {
    const CSSclass = opts.attrs.class || 'trsform';
    let wordErrors, translationErrors;
    // Error messages are contained in opts.data.errors
    if (opts.data?.errors) {
        wordErrors = opts.data.errors.word ? `<p>${opts.data.errors.word}</p>` : '';
        translationErrors = !opts.data.errors.translations || !opts.data.errors.translations.length
            ? ''
            : opts.data.errors.translations.map(el => `<p>${el}</p>`).join('\n');
    }

    return `
        <form class="${CSSclass}" method="POST" action="/translation">
            <header class="${CSSclass}__header">
                <h2 class="${CSSclass}__title">
                    Добавить перевод
                </h2>
                <p class="${CSSclass}__text">Поддерживается перевод в любом порядке (en - ru, ru - en)</p>
            </header>


            <div class="${CSSclass}__body">
                <div class="${CSSclass}__group">
                    <label class="${CSSclass}__label">Слово или предложение</label>
                    <input class="${CSSclass}__input${wordErrors
                        ? ` ${CSSclass}__fielderr`
                        : ''}" name="word" type="text" placeholder="Слово или предложение"${opts.data?.errors ? ` value="${opts.data.initial.word}"` : ''} autofocus required>
                    ${wordErrors ? `<div class="${CSSclass}__errors">${wordErrors}</div>` : ''}
                </div>

                <div class="${CSSclass}__group">
                    <fieldset class="${CSSclass}__group${translationErrors ? ` ${CSSclass}__fielderr` : ''}">
                        <legend>Переводы</legend>
                        ${renderRows({ errors: Boolean(opts.data?.errors), CSSclass, data: opts.data?.initial?.translations || [] })}

                        <button class="btn btn-secondary" type="button">
                            + Добавить перевод
                        </button>
                    </fieldset>
                    ${translationErrors ? `<div class="${CSSclass}__errors">${translationErrors}</div>` : ''}
                </div>
            </div>

            <footer class="${CSSclass}__footer">
                <button type="reset" class="btn btn-secondary">
                    Очистить
                </button>
                <button type="submit" class="btn">
                    Добавить
                </button>
            </footer>
        </form>
    `;
}

module.exports = {
    render,
    requiredData
}