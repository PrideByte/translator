document.addEventListener("DOMContentLoaded", init);

function init() {
    const initialData = getInitialState();
    console.log(initialData);

    window.addEventListener('click', function (e) {
        
    });
}

function getInitialState() {
    const dataTag = document.querySelector('script#__INITIAL_DATA__');
    try {
        return JSON.parse(dataTag.textContent);
    } catch (e) {
        console.warn(`Initial data parsing failed!\n`, e);
        return {};
    }
}

function clickAddTranslationModalButton(e) {

}