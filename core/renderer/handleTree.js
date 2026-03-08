const components = require('../../components/index.js');

async function collectData({ tree, db, url, messages, state = {props: {}, client: {}, constraints: {}} }) {
    const dataCollection = [];

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

            dataCollection.push((async () => {
                const data = await component.requiredData({
                    db,
                    url,
                    attrs: node.attrs || {},
                    messages
                });

                return { node, data };
            })());
        }
    }

    const result = await Promise.all(dataCollection);

    for (const {node, data} of result) {
        if (!data.constraints) {
            state.props[node.attrs.key] = data;
            state.client[node.attrs.key] = (typeof data.data !== "undefined") ? data.data : data;
        } else {
            state.constraints[node.attrs.key] = data.constraints;
        }
    }

    for (const node of tree) {
        if (node.children) {
            await collectData({ tree: node.children, db, url, state });
        }
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

        const props = (node.attrs.key && node.attrs.key in initialData)
            ? initialData[node.attrs.key]
            : null;

        html += component.render({
            attrs: node.attrs,  // Atributes from template
            props,              // Data and additional data from DB
            content: innerHTML  // children nodes code
        });
    }

    return html;
}

module.exports = {
    collectData,
    renderTree
}