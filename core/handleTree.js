const components = require('../components/index.js');

async function collectData({tree, db, url, messages, state = {}}) {
    for (const node of tree) {
        if (typeof node === 'string') continue;

        const component = components[node.name];

        if (!component) {
            throw new Error(`Component "${node.name}" not found`);
        }

        if (component.requiredData) {
            if (!node.attrs.key) {
                throw new Error(`Component "${node.name}" requires key`);
            }

            const data = await component.requiredData({
                db,
                url,
                attrs: node.attrs || {},
                messages
            });

            if (!data.constraints) {
                if (!state["data"]) {
                    state["data"] = {};
                }
                state.data[node.attrs.key] = data.data;
            } else {
                if (!state["constraints"]) {
                    state["constraints"] = {};
                }
                state.constraints[node.attrs.key] = data.constraints;
            }
        }

        await collectData({tree: node.children, db, url, state});
    }

    return state;
}

function renderTree(tree, initialData = {}) {
    let html = '';

    for (const node of tree) {
        if (typeof node === 'string') {
            html += node;
            continue;
        }

        const component = components[node.name];

        if (!component) {
            throw new Error(`Component "${node.name}" not found`);
        }

        const innerHTML = renderTree(node.children, initialData);

        const data = node.attrs.key && initialData[node.attrs.key] != undefined
            ? initialData[node.attrs.key]
            : null;

        html += component.render({
            attrs: node.attrs,
            data,
            innerHTML
        });
    }

    return html;
}

module.exports = {
    collectData,
    renderTree
}