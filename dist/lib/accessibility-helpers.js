"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.axRole = axRole;
exports.axHasProp = axHasProp;
exports.findClickableAXAncestor = findClickableAXAncestor;
exports.extractIconHintsForBackendNode = extractIconHintsForBackendNode;
exports.extractElementMetadataForBackendNode = extractElementMetadataForBackendNode;
exports.augmentNodesWithIconHints = augmentNodesWithIconHints;
exports.collectAXNodesAcrossFrames = collectAXNodesAcrossFrames;
/**
 * Get accessibility role from node
 */
function axRole(node) {
    const r = node && node.role;
    if (!r)
        return '';
    if (typeof r === 'string')
        return r;
    if (typeof r === 'object' && 'value' in r)
        return String(r.value || '');
    return '';
}
/**
 * Check if accessibility node has property
 */
function axHasProp(node, propName) {
    try {
        const props = node?.properties;
        const propsArr = Array.isArray(props) ? props : [];
        for (const p of propsArr) {
            const name = typeof p.name === 'string' ? p.name : (p.name && p.name.value);
            if (name === propName) {
                const v = p.value && typeof p.value === 'object' && 'value' in p.value ? p.value.value : p.value;
                return v === true;
            }
        }
    }
    catch { }
    return false;
}
/**
 * Find nearest ancestor in flattened AX list with a backend DOM node and clickable/text-input role
 */
function findClickableAXAncestor(axEntries, startIndex) {
    if (!Array.isArray(axEntries) || startIndex == null)
        return null;
    const start = axEntries[startIndex];
    if (!start || !start.node)
        return null;
    const startDepth = typeof start.node.depth === 'number' ? start.node.depth : 0;
    const desirableRoles = new Set(['textbox', 'searchbox', 'combobox', 'button', 'link']);
    for (let i = startIndex - 1; i >= 0; i--) {
        const prev = axEntries[i];
        if (!prev || !prev.node)
            continue;
        const depth = typeof prev.node.depth === 'number' ? prev.node.depth : 0;
        // Once we climb past ancestors, stop when we leave the ancestor chain
        if (depth < 0)
            break;
        if (depth < startDepth) {
            const hasBackend = typeof prev.node.backendDOMNodeId === 'number' && prev.node.backendDOMNodeId > 0;
            if (!hasBackend) {
                // Keep walking further up to find a DOM-backed ancestor
                continue;
            }
            const role = axRole(prev.node).toLowerCase();
            const editable = axHasProp(prev.node, 'editable');
            const focusable = axHasProp(prev.node, 'focusable');
            if (desirableRoles.has(role) || editable || focusable) {
                return { entry: prev, index: i };
            }
        }
    }
    return null;
}
/**
 * Extract icon hints for backend node
 */
async function extractIconHintsForBackendNode(cdp, ensureFrameDocumentFn, releaseRemoteObjectFn, backendNodeId, frameId) {
    try {
        await ensureFrameDocumentFn(frameId);
        const pushRes = await cdp.DOM.pushNodesByBackendIdsToFrontend({ backendNodeIds: [backendNodeId] });
        const nodeIds = Array.isArray(pushRes.nodeIds) ? pushRes.nodeIds : (Array.isArray(pushRes) ? pushRes : []);
        const nodeId = nodeIds && nodeIds[0];
        if (!nodeId)
            return null;
        const { object } = await cdp.DOM.resolveNode({ nodeId });
        const objectId = object && object.objectId ? object.objectId : null;
        if (!objectId)
            return null;
        const { result } = await cdp.Runtime.callFunctionOn({
            objectId,
            functionDeclaration: `function() {
                try {
                    const el = this && this.querySelector ? this : null;
                    if (!el) return { iconHints: [], labelHints: [], domInfo: null };

                    const hints = new Set();
                    const labels = new Set();

                    const push = (value) => {
                        if (value === undefined || value === null) return;
                        const str = String(value).trim();
                        if (!str) return;
                        hints.add(str);
                        const collapsed = str.replace(/^.*#/,'');
                        if (collapsed && collapsed !== str) hints.add(collapsed);
                        collapsed.split(/[^a-zA-Z0-9]+/).forEach(tok => {
                            const t = tok.toLowerCase();
                            if (t && t.length >= 2) hints.add(t);
                        });
                    };

                    const addLabel = (value) => {
                        if (!value) return;
                        const str = String(value).trim();
                        if (str) labels.add(str);
                    };

                    const text = (el.innerText || el.textContent || '').trim();
                    if (text) {
                        addLabel(text);
                    }

                    const ariaLabel = el.getAttribute ? el.getAttribute('aria-label') : null;
                    if (ariaLabel) addLabel(ariaLabel);

                    const title = el.getAttribute ? el.getAttribute('title') : null;
                    if (title) addLabel(title);

                    const labelledBy = el.getAttribute ? el.getAttribute('aria-labelledby') : null;
                    if (labelledBy) {
                        labelledBy.split(/\s+/).forEach(id => {
                            const ref = el.ownerDocument && el.ownerDocument.getElementById ? el.ownerDocument.getElementById(id) : null;
                            if (ref) {
                                const refText = (ref.innerText || ref.textContent || '').trim();
                                if (refText) addLabel(refText);
                            }
                        });
                    }

                    const dataTestId = el.getAttribute ? el.getAttribute('data-testid') : null;
                    if (dataTestId) push(dataTestId);

                    const dataCy = el.getAttribute ? el.getAttribute('data-cy') : null;
                    if (dataCy) push(dataCy);

                    if (el.classList) {
                        el.classList.forEach(cls => push(cls));
                    }

                    if (el.id) push(el.id);

                    const iconNodes = el.querySelectorAll('svg, use, i, [class*="icon"], [class*="arrow"], [class*="chevron"], [class*="send"], [class*="plane"], [class*="play"], [class*="pause"], [class*="close"]');
                    iconNodes.forEach(node => {
                        const tag = node.tagName ? node.tagName.toLowerCase() : '';
                        if (tag === 'use') {
                            push(node.getAttribute('xlink:href') || node.getAttribute('href'));
                        }
                        if (node.id) push(node.id);
                        if (node.classList) node.classList.forEach(cls => push(cls));
                        const aria = node.getAttribute ? node.getAttribute('aria-label') : null;
                        if (aria) push(aria);
                        const titleAttr = node.getAttribute ? node.getAttribute('title') : null;
                        if (titleAttr) push(titleAttr);
                    });

                    const domInfo = {
                        id: el.id || null,
                        tag: el.tagName ? el.tagName.toLowerCase() : null,
                        classes: Array.from(el.classList || []).slice(0, 6),
                        dataTestId: dataTestId || null,
                        dataCy: dataCy || null,
                        ariaLabel: ariaLabel || null,
                        title: title || null
                    };

                    return {
                        iconHints: Array.from(hints).slice(0, 25),
                        labelHints: Array.from(labels).slice(0, 10),
                        domInfo
                    };
                } catch (err) {
                    return { iconHints: [], labelHints: [], domInfo: null };
                }
            }`,
            returnByValue: true
        });
        const value = result && (result.value || (result.object && result.object.value));
        if (!value || typeof value !== 'object')
            return null;
        const iconHints = Array.isArray(value.iconHints) ? value.iconHints : [];
        const labelHints = Array.isArray(value.labelHints) ? value.labelHints : [];
        const domInfo = value.domInfo && typeof value.domInfo === 'object' ? value.domInfo : null;
        await releaseRemoteObjectFn(objectId);
        return { iconHints, labelHints, domInfo };
    }
    catch (error) {
        return null;
    }
}
/**
 * Extract element metadata for backend node
 */
async function extractElementMetadataForBackendNode(cdp, ensureFrameDocumentFn, releaseRemoteObjectFn, backendNodeId, frameId) {
    try {
        await ensureFrameDocumentFn(frameId);
        const pushRes = await cdp.DOM.pushNodesByBackendIdsToFrontend({ backendNodeIds: [backendNodeId] });
        const nodeIds = Array.isArray(pushRes.nodeIds) ? pushRes.nodeIds : (Array.isArray(pushRes) ? pushRes : []);
        const nodeId = nodeIds && nodeIds[0];
        if (!nodeId)
            return null;
        const { object } = await cdp.DOM.resolveNode({ nodeId });
        const objectId = object && object.objectId ? object.objectId : null;
        if (!objectId)
            return null;
        const { result } = await cdp.Runtime.callFunctionOn({
            objectId,
            functionDeclaration: `function() {
                try {
                    const el = this && this.querySelector ? this : null;
                    if (!el) return null;
                    
                    const metadata = {
                        id: el.id || null,
                        tagName: el.tagName ? el.tagName.toLowerCase() : null,
                        className: el.className || null,
                        dataTestId: el.getAttribute ? el.getAttribute('data-testid') : null,
                        dataCy: el.getAttribute ? el.getAttribute('data-cy') : null,
                        ariaLabel: el.getAttribute ? el.getAttribute('aria-label') : null,
                        title: el.getAttribute ? el.getAttribute('title') : null,
                        role: el.getAttribute ? el.getAttribute('role') : null,
                        name: el.getAttribute ? el.getAttribute('name') : null,
                        type: el.getAttribute ? el.getAttribute('type') : null,
                        placeholder: el.getAttribute ? el.getAttribute('placeholder') : null,
                        alt: el.getAttribute ? el.getAttribute('alt') : null,
                        src: el.getAttribute ? el.getAttribute('src') : null,
                        href: el.getAttribute ? el.getAttribute('href') : null,
                        value: el.value || null
                    };
                    
                    // Clean up empty strings and undefined values
                    Object.keys(metadata).forEach(key => {
                        if (metadata[key] === '' || metadata[key] === undefined) {
                            metadata[key] = null;
                        }
                    });
                    
                    return metadata;
                } catch (e) {
                    return null;
                }
            }`,
            returnByValue: true
        });
        const value = result && (result.value || (result.object && result.object.value));
        if (!value || typeof value !== 'object')
            return null;
        await releaseRemoteObjectFn(objectId);
        return value;
    }
    catch (e) {
        return null;
    }
}
/**
 * Augment nodes with icon hints
 */
async function augmentNodesWithIconHints(cdp, ensureFrameDocumentFn, releaseRemoteObjectFn, axEntries, indexedNodes, maxCount = 200) {
    if (!Array.isArray(axEntries) || !Array.isArray(indexedNodes))
        return;
    const desirableRoles = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'generic']);
    let augmented = 0;
    for (let i = 0; i < axEntries.length; i++) {
        if (augmented >= maxCount)
            break;
        const entry = axEntries[i];
        if (!entry || !entry.node)
            continue;
        const role = axRole(entry.node).toLowerCase();
        if (!desirableRoles.has(role))
            continue;
        const backendId = entry.node.backendDOMNodeId;
        if (typeof backendId !== 'number' || backendId <= 0)
            continue;
        // Extract icon hints
        const hints = await extractIconHintsForBackendNode(cdp, ensureFrameDocumentFn, releaseRemoteObjectFn, backendId, entry.frameId || null);
        if (hints) {
            const { iconHints = [], labelHints = [], domInfo = null } = hints;
            if (iconHints.length || labelHints.length) {
                try {
                    if (iconHints.length)
                        indexedNodes[i].iconHints = iconHints;
                    if (labelHints.length)
                        indexedNodes[i].labelHints = labelHints;
                }
                catch { }
                augmented++;
            }
            if (domInfo) {
                try {
                    indexedNodes[i].domAttributes = domInfo;
                    if (domInfo.id && !indexedNodes[i].domId)
                        indexedNodes[i].domId = domInfo.id;
                    if (domInfo.dataTestId && !indexedNodes[i].dataTestId)
                        indexedNodes[i].dataTestId = domInfo.dataTestId;
                    if (domInfo.dataCy && !indexedNodes[i].dataCy)
                        indexedNodes[i].dataCy = domInfo.dataCy;
                    if (domInfo.classes && !indexedNodes[i].className)
                        indexedNodes[i].className = domInfo.classes.join(' ');
                }
                catch { }
            }
        }
        // Extract element metadata (ID, attributes, etc.)
        const metadata = await extractElementMetadataForBackendNode(cdp, ensureFrameDocumentFn, releaseRemoteObjectFn, backendId, entry.frameId || null);
        if (metadata) {
            try {
                // Add useful metadata to the node
                if (metadata.id)
                    indexedNodes[i].domId = metadata.id;
                if (metadata.tagName)
                    indexedNodes[i].tagName = metadata.tagName;
                if (metadata.className)
                    indexedNodes[i].className = metadata.className;
                if (metadata.dataTestId)
                    indexedNodes[i].dataTestId = metadata.dataTestId;
                if (metadata.dataCy)
                    indexedNodes[i].dataCy = metadata.dataCy;
                if (metadata.ariaLabel)
                    indexedNodes[i].ariaLabel = metadata.ariaLabel;
                if (metadata.title)
                    indexedNodes[i].title = metadata.title;
                if (metadata.role)
                    indexedNodes[i].htmlRole = metadata.role;
                if (metadata.name)
                    indexedNodes[i].htmlName = metadata.name;
                if (metadata.type)
                    indexedNodes[i].inputType = metadata.type;
                if (metadata.placeholder)
                    indexedNodes[i].placeholder = metadata.placeholder;
                if (metadata.alt)
                    indexedNodes[i].alt = metadata.alt;
                if (metadata.href)
                    indexedNodes[i].href = metadata.href;
                if (metadata.value)
                    indexedNodes[i].value = metadata.value;
            }
            catch { }
        }
    }
}
/**
 * Collect accessibility nodes across all frames
 */
async function collectAXNodesAcrossFrames(cdp, collectFrameIdsFn, getAccessibilityTreeFn, flattenAccessibilityTreeFn, logDebug) {
    const nodes = [];
    const seenIds = new Set();
    const frameIds = await collectFrameIdsFn();
    const targets = [null, ...frameIds.filter((id) => id)];
    for (const frameId of targets) {
        try {
            const options = frameId ? { frameId } : {};
            const tree = await getAccessibilityTreeFn(options);
            const flattened = flattenAccessibilityTreeFn(tree) || [];
            for (const node of flattened) {
                if (!node)
                    continue;
                const hasBackend = typeof node.backendDOMNodeId === 'number';
                const dedupeKey = hasBackend ? `${node.backendDOMNodeId}:${frameId || 'root'}` : undefined;
                if (dedupeKey && seenIds.has(dedupeKey)) {
                    continue;
                }
                if (dedupeKey) {
                    seenIds.add(dedupeKey);
                }
                nodes.push({ node, frameId: frameId || undefined });
            }
        }
        catch (error) {
            logDebug('ax:frameLoadFailed', {
                frameId: frameId || 'root',
                message: error && error.message ? error.message : String(error)
            });
        }
    }
    return nodes;
}
//# sourceMappingURL=accessibility-helpers.js.map