"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTextSearchExpression = buildTextSearchExpression;
exports.clickElementByText = clickElementByText;
exports.findLinks = findLinks;
exports.findTextElements = findTextElements;
exports.clickLinkByIndex = clickLinkByIndex;
exports.clickLinkByText = clickLinkByText;
/**
 * Build text search expression for DOM search
 */
function buildTextSearchExpression(searchText, exactMatch, caseSensitive) {
    return `
        (() => {
            const rawText = ${JSON.stringify(searchText)};
            const exact = ${exactMatch ? 'true' : 'false'};
            const caseSensitive = ${caseSensitive ? 'true' : 'false'};

            const normalise = (value) => {
                if (typeof value !== 'string') return '';
                const trimmed = value.trim();
                return caseSensitive ? trimmed : trimmed.toLowerCase();
            };

            const needle = normalise(rawText);
            if (!needle) return null;

            const baseSelectors = [
                'button',
                'a[href]',
                '[role="button"]',
                '[role="link"]',
                'input[type="button"]',
                'input[type="submit"]',
                'input[type="reset"]',
                'textarea',
                'select',
                'label',
                '[role="menuitem"]',
                '[role="option"]',
                '[role="tab"]',
                '[role="checkbox"]',
                '[role="radio"]'
            ];
            const clickableSelector = baseSelectors.join(', ');

            const seen = new Set();

            const validateCandidate = (element) => {
                if (!(element instanceof Element)) {
                    return null;
                }
                if (seen.has(element)) {
                    return null;
                }
                seen.add(element);

                const textContent = element.innerText || element.textContent || '';
                const haystack = normalise(textContent);
                if (!haystack) {
                    return null;
                }

                const matches = exact ? haystack === needle : haystack.includes(needle);
                if (!matches) {
                    return null;
                }

                const potential = element.closest(clickableSelector);
                const target = potential instanceof Element ? potential : element;

                if (!(target instanceof Element)) {
                    return null;
                }

                if (seen.has(target)) {
                    return null;
                }
                seen.add(target);

                const style = window.getComputedStyle(target);
                if (!style || style.visibility === 'hidden' || style.display === 'none') {
                    return null;
                }
                if (target.hasAttribute('disabled') || style.pointerEvents === 'none') {
                    return null;
                }

                const rect = target.getBoundingClientRect();
                if (!rect || rect.width <= 0 || rect.height <= 0) {
                    return null;
                }

                return target;
            };

            for (const selector of baseSelectors) {
                for (const element of Array.from(document.querySelectorAll(selector))) {
                    const match = validateCandidate(element);
                    if (match) return match;
                }
            }

            const root = document.body || document.documentElement;
            if (!root) return null;

            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_ELEMENT,
                null,
                false
            );

            let current;
            while ((current = walker.nextNode())) {
                const match = validateCandidate(current);
                if (match) return match;
            }

            return null;
        })();
    `;
}
/**
 * Click an element by matching visible text content.
 */
async function clickElementByText(cdp, frameDocumentsRequested, isolatedWorldContexts, logDebug, collectAXNodesAcrossFramesFn, ensureFrameDocumentFn, ensureIsolatedWorldFn, collectFrameIdsFn, releaseRemoteObjectFn, buildTextSearchExpressionFn, text, options = {}) {
    try {
        if (typeof text !== 'string' || !text.trim()) {
            throw new Error('Text must be a non-empty string');
        }
        const searchText = text.trim();
        const exactMatch = Boolean(options.exact);
        const caseSensitive = Boolean(options.caseSensitive);
        logDebug('clickByText:start', { searchText, exactMatch, caseSensitive });
        // 1) Attempt AXTree-first search for accessible name matches
        try {
            const axNodes = await collectAXNodesAcrossFramesFn();
            logDebug('clickByText:axTreeLoaded', { nodeCount: axNodes.length });
            const normalise = (value) => {
                if (typeof value !== 'string')
                    return '';
                const trimmed = value.trim();
                return caseSensitive ? trimmed : trimmed.toLowerCase();
            };
            const axName = (node) => {
                const name = node && node.name ? (typeof node.name === 'object' && node.name !== null && 'value' in node.name ? node.name.value : node.name) : '';
                return typeof name === 'string' ? name : '';
            };
            const axRole = (node) => {
                const role = node && node.role ? (typeof node.role === 'object' && node.role !== null && 'value' in node.role ? node.role.value : node.role) : '';
                return typeof role === 'string' ? role : '';
            };
            const clickableRoles = new Map([
                ['button', 60],
                ['link', 50],
                ['menuitem', 45],
                ['tab', 45],
                ['checkbox', 40],
                ['radio', 40],
                ['switch', 40],
                ['option', 35],
                ['listitem', 25],
            ]);
            const needle = normalise(searchText);
            const candidates = [];
            for (const entry of axNodes) {
                const node = entry.node;
                if (!node)
                    continue;
                const ignoredReasons = Array.isArray(node.ignoredReasons) ? node.ignoredReasons : [];
                const ignoredByAriaHidden = Boolean(node.ignored) && ignoredReasons.some((reason) => {
                    if (!reason)
                        return false;
                    if (typeof reason === 'string') {
                        return reason.toLowerCase().includes('aria-hidden');
                    }
                    const type = typeof reason === 'object' && reason !== null && 'type' in reason ? String(reason.type) : '';
                    return type.toLowerCase().includes('aria-hidden');
                });
                if (node.ignored && !ignoredByAriaHidden) {
                    continue;
                }
                const name = axName(node);
                if (!name)
                    continue;
                const hay = normalise(name);
                if (!hay)
                    continue;
                let matched = false;
                let matchScore = 0;
                if (exactMatch) {
                    matched = hay === needle;
                    matchScore = matched ? 100 : 0;
                }
                else if (hay.includes(needle)) {
                    matched = true;
                    matchScore = hay === needle ? 100 : (hay.startsWith(needle) ? 80 : 70);
                }
                if (!matched) {
                    continue;
                }
                const role = axRole(node);
                let roleScore = clickableRoles.get(role) || 0;
                const hasBackend = typeof node.backendDOMNodeId === 'number' && node.backendDOMNodeId > 0;
                if (hasBackend) {
                    roleScore += 10;
                }
                try {
                    const propsArr = Array.isArray(node.properties) ? node.properties : [];
                    for (const p of propsArr) {
                        const propName = typeof p.name === 'string' ? p.name : (p.name && p.name.value);
                        if (propName === 'focusable') {
                            const v = p.value && typeof p.value === 'object' && 'value' in p.value ? p.value.value : p.value;
                            if (v === true)
                                roleScore += 5;
                        }
                    }
                }
                catch { }
                const penalty = node.ignored ? 25 : 0;
                const score = matchScore + roleScore - penalty;
                if (hasBackend) {
                    logDebug('clickByText:axCandidate', {
                        name,
                        role,
                        matchScore,
                        roleScore,
                        ignored: Boolean(node.ignored),
                        penalty,
                        backendDOMNodeId: node.backendDOMNodeId,
                        score,
                        frameId: entry.frameId || 'root'
                    });
                    candidates.push({ score, node, frameId: entry.frameId || null });
                }
            }
            candidates.sort((a, b) => b.score - a.score);
            logDebug('clickByText:axCandidatesRanked', { count: candidates.length });
            for (const cand of candidates) {
                const backendId = cand.node.backendDOMNodeId;
                if (typeof backendId !== 'number' || backendId <= 0)
                    continue;
                const frameIdForCandidate = cand.frameId || cand.node.frameId || null;
                const frameKey = frameIdForCandidate || 'root';
                let retriedDocument = false;
                while (true) {
                    await ensureFrameDocumentFn(frameIdForCandidate);
                    try {
                        const pushRes = await cdp.DOM.pushNodesByBackendIdsToFrontend({ backendNodeIds: [backendId] });
                        const nodeIds = Array.isArray(pushRes.nodeIds) ? pushRes.nodeIds : (Array.isArray(pushRes) ? pushRes : []);
                        const nodeId = nodeIds && nodeIds[0];
                        if (!nodeId)
                            break;
                        try {
                            await cdp.DOM.scrollIntoViewIfNeeded({ nodeId });
                        }
                        catch { }
                        const { model } = await cdp.DOM.getBoxModel({ nodeId });
                        if (!model || !Array.isArray(model.border) || model.border.length === 0) {
                            break;
                        }
                        const xValues = model.border.filter((_, index) => index % 2 === 0);
                        const yValues = model.border.filter((_, index) => index % 2 !== 0);
                        const x = xValues.reduce((acc, curr) => acc + curr, 0) / xValues.length;
                        const y = yValues.reduce((acc, curr) => acc + curr, 0) / yValues.length;
                        await cdp.Input.dispatchMouseEvent({ x, y, button: 'left', clickCount: 1, type: 'mousePressed' });
                        await cdp.Input.dispatchMouseEvent({ x, y, button: 'left', clickCount: 1, type: 'mouseReleased' });
                        console.log(`Clicked element by AX name: ${searchText}`);
                        logDebug('clickByText:axSuccess', { searchText, backendId, nodeId, frameId: frameKey });
                        return true;
                    }
                    catch (candidateError) {
                        const message = candidateError && candidateError.message ? candidateError.message : String(candidateError);
                        if (!retriedDocument && message.includes('Document needs to be requested first')) {
                            frameDocumentsRequested.delete(frameKey);
                            logDebug('clickByText:axRetryDocument', { backendId, frameId: frameKey, message });
                            retriedDocument = true;
                            continue;
                        }
                        logDebug('clickByText:axCandidateFailed', {
                            backendId,
                            frameId: frameKey,
                            message
                        });
                    }
                    break;
                }
            }
        }
        catch (axError) {
            logDebug('clickByText:axError', {
                message: axError && axError.message ? axError.message : String(axError)
            });
        }
        // 2) Fallback: DOM text-based search across frames
        const expression = buildTextSearchExpressionFn(searchText, exactMatch, caseSensitive);
        const objectGroup = 'click-element-by-text';
        let lastError;
        try {
            const frameIds = await collectFrameIdsFn();
            const targets = frameIds.length ? frameIds : [null];
            logDebug('clickByText:domSearchStart', { frameCount: targets.length, frames: targets });
            for (const frameId of targets) {
                let contextId;
                if (frameId) {
                    await ensureFrameDocumentFn(frameId);
                    contextId = await ensureIsolatedWorldFn(frameId);
                    if (!contextId) {
                        logDebug('clickByText:contextUnavailable', { frameId });
                        continue;
                    }
                }
                else {
                    await ensureFrameDocumentFn(null);
                }
                let evalResult;
                try {
                    const evalOptions = {
                        expression,
                        objectGroup,
                        includeCommandLineAPI: false,
                        awaitPromise: false,
                        returnByValue: false
                    };
                    if (contextId) {
                        evalOptions.contextId = contextId;
                    }
                    evalResult = await cdp.Runtime.evaluate(evalOptions);
                }
                catch (error) {
                    lastError = error;
                    logDebug('clickByText:evalError', {
                        frameId: frameId || 'root',
                        message: error && error.message ? error.message : String(error)
                    });
                    continue;
                }
                const { result } = evalResult || {};
                if (!result || result.type === 'undefined' || result.type === 'null' || !result.objectId) {
                    logDebug('clickByText:noMatchInFrame', { frameId: frameId || 'root' });
                    continue;
                }
                const objectId = result.objectId;
                const frameKey = frameId || 'root';
                let retriedDocument = false;
                let objectReleased = false;
                while (true) {
                    await ensureFrameDocumentFn(frameId);
                    try {
                        const { nodeId } = await cdp.DOM.requestNode({ objectId });
                        try {
                            await cdp.DOM.scrollIntoViewIfNeeded({ nodeId });
                        }
                        catch { }
                        const { model } = await cdp.DOM.getBoxModel({ nodeId });
                        if (!model || !Array.isArray(model.border) || model.border.length === 0) {
                            logDebug('clickByText:domNoBoxModel', { frameId: frameKey });
                            break;
                        }
                        const xValues = model.border.filter((_, index) => index % 2 === 0);
                        const yValues = model.border.filter((_, index) => index % 2 !== 0);
                        const x = xValues.reduce((acc, curr) => acc + curr, 0) / xValues.length;
                        const y = yValues.reduce((acc, curr) => acc + curr, 0) / yValues.length;
                        await cdp.Input.dispatchMouseEvent({ x, y, button: 'left', clickCount: 1, type: 'mousePressed' });
                        await cdp.Input.dispatchMouseEvent({ x, y, button: 'left', clickCount: 1, type: 'mouseReleased' });
                        console.log(`Clicked element by DOM text fallback: ${searchText} (frame: ${frameKey})`);
                        logDebug('clickByText:domSuccess', { searchText, frameId: frameKey, nodeId });
                        await releaseRemoteObjectFn(objectId);
                        objectReleased = true;
                        return true;
                    }
                    catch (clickError) {
                        const message = clickError && clickError.message ? clickError.message : String(clickError);
                        if (!retriedDocument && message.includes('Document needs to be requested first')) {
                            frameDocumentsRequested.delete(frameKey);
                            logDebug('clickByText:domRetryDocument', { frameId: frameKey, message });
                            retriedDocument = true;
                            continue;
                        }
                        lastError = clickError;
                        logDebug('clickByText:domCandidateFailed', {
                            frameId: frameKey,
                            message
                        });
                    }
                    break;
                }
                if (!objectReleased && result && result.objectId) {
                    await releaseRemoteObjectFn(result.objectId);
                }
            }
        }
        finally {
            try {
                await cdp.Runtime.releaseObjectGroup({ objectGroup });
            }
            catch { }
        }
        const reason = lastError ? (lastError.message || String(lastError)) : `Element containing text "${searchText}" not found`;
        logDebug('clickByText:failure', { searchText, reason });
        throw new Error(reason);
    }
    catch (error) {
        console.error(`Error clicking element by text "${text}":`, error);
        logDebug('clickByText:error', {
            searchText: text,
            message: error && error.message ? error.message : String(error)
        });
        throw error;
    }
}
/**
 * Find all link elements using accessibility tree
 */
async function findLinks(cdp, collectAXNodesAcrossFramesFn, logDebug) {
    try {
        const axNodes = await collectAXNodesAcrossFramesFn();
        logDebug('findLinks:axTreeLoaded', { nodeCount: axNodes.length });
        const links = [];
        for (const entry of axNodes) {
            if (!entry || !entry.node)
                continue;
            const role = typeof entry.node.role === 'string'
                ? entry.node.role
                : (entry.node.role && typeof entry.node.role === 'object' && 'value' in entry.node.role
                    ? entry.node.role.value
                    : '');
            const backendId = entry.node.backendDOMNodeId;
            // Check if it's a link (role="link" or <a> tag)
            if (role.toLowerCase() === 'link' && typeof backendId === 'number' && backendId > 0) {
                const name = typeof entry.node.name === 'string'
                    ? entry.node.name
                    : (entry.node.name && typeof entry.node.name === 'object' && 'value' in entry.node.name
                        ? String(entry.node.name.value || '')
                        : '');
                // Try to get href from properties
                let href;
                if (entry.node.properties) {
                    for (const prop of entry.node.properties) {
                        const propName = typeof prop.name === 'string' ? prop.name : (prop.name && typeof prop.name === 'object' ? prop.name.value : '');
                        if (propName === 'url' || propName === 'href') {
                            const propValue = typeof prop.value === 'string' ? prop.value : (prop.value && typeof prop.value === 'object' && 'value' in prop.value ? String(prop.value.value) : '');
                            if (propValue)
                                href = propValue;
                        }
                    }
                }
                if (name || href) {
                    links.push({
                        node: entry.node,
                        frameId: entry.frameId,
                        backendId,
                        name: name || href || '',
                        href
                    });
                }
            }
        }
        logDebug('findLinks:found', { count: links.length });
        return links;
    }
    catch (error) {
        console.error('Error finding links:', error);
        logDebug('findLinks:error', { message: error.message });
        throw error;
    }
}
/**
 * Find all text elements using accessibility tree
 */
async function findTextElements(cdp, collectAXNodesAcrossFramesFn, logDebug, options = {}) {
    try {
        const { minLength = 1, maxLength = Infinity, role: filterRole } = options;
        const axNodes = await collectAXNodesAcrossFramesFn();
        logDebug('findTextElements:axTreeLoaded', { nodeCount: axNodes.length });
        const textElements = [];
        for (const entry of axNodes) {
            if (!entry || !entry.node)
                continue;
            const nodeRole = typeof entry.node.role === 'string'
                ? entry.node.role
                : (entry.node.role && typeof entry.node.role === 'object' && 'value' in entry.node.role
                    ? entry.node.role.value
                    : '');
            // Filter by role if specified
            if (filterRole && nodeRole.toLowerCase() !== filterRole.toLowerCase()) {
                continue;
            }
            const backendId = entry.node.backendDOMNodeId;
            if (typeof backendId !== 'number' || backendId <= 0)
                continue;
            // Get text content
            const name = typeof entry.node.name === 'string'
                ? entry.node.name
                : (entry.node.name && typeof entry.node.name === 'object' && 'value' in entry.node.name
                    ? String(entry.node.name.value || '')
                    : '');
            const value = typeof entry.node.value === 'string'
                ? entry.node.value
                : (entry.node.value && typeof entry.node.value === 'object' && 'value' in entry.node.value
                    ? String(entry.node.value.value || '')
                    : '');
            const text = name || value || '';
            // Filter by length
            if (text.length >= minLength && text.length <= maxLength) {
                textElements.push({
                    node: entry.node,
                    frameId: entry.frameId,
                    backendId,
                    text: text.trim(),
                    role: nodeRole
                });
            }
        }
        logDebug('findTextElements:found', { count: textElements.length });
        return textElements;
    }
    catch (error) {
        console.error('Error finding text elements:', error);
        logDebug('findTextElements:error', { message: error.message });
        throw error;
    }
}
/**
 * Click a link element by index (e.g., first link, second link, etc.)
 */
async function clickLinkByIndex(cdp, frameDocumentsRequested, isolatedWorldContexts, logDebug, collectAXNodesAcrossFramesFn, ensureFrameDocumentFn, ensureIsolatedWorldFn, collectFrameIdsFn, releaseRemoteObjectFn, clickByBackendFn, fallbackDomClickFn, index) {
    try {
        const links = await findLinks(cdp, collectAXNodesAcrossFramesFn, logDebug);
        if (links.length === 0) {
            throw new Error('No links found on the page');
        }
        if (index < 0 || index >= links.length) {
            throw new Error(`Link index ${index} out of range. Found ${links.length} links.`);
        }
        const link = links[index];
        logDebug('clickLinkByIndex:target', { index, name: link.name, href: link.href, backendId: link.backendId });
        const frameId = link.frameId || null;
        const success = await clickByBackendFn(cdp, ensureFrameDocumentFn, frameDocumentsRequested, logDebug, releaseRemoteObjectFn, fallbackDomClickFn, link.backendId, frameId);
        if (success) {
            console.log(`Clicked link ${index + 1}: ${link.name || link.href || 'unnamed link'}`);
            logDebug('clickLinkByIndex:success', { index, name: link.name, href: link.href });
        }
        return success;
    }
    catch (error) {
        console.error(`Error clicking link at index ${index}:`, error);
        logDebug('clickLinkByIndex:error', { index, message: error.message });
        throw error;
    }
}
/**
 * Click a link element by text content
 */
async function clickLinkByText(cdp, frameDocumentsRequested, isolatedWorldContexts, logDebug, collectAXNodesAcrossFramesFn, ensureFrameDocumentFn, ensureIsolatedWorldFn, collectFrameIdsFn, releaseRemoteObjectFn, clickByBackendFn, fallbackDomClickFn, text, options = {}) {
    try {
        const links = await findLinks(cdp, collectAXNodesAcrossFramesFn, logDebug);
        const { exact = false, caseSensitive = false } = options;
        const normalize = (str) => caseSensitive ? str.trim() : str.trim().toLowerCase();
        const searchText = normalize(text);
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const linkText = normalize(link.name || link.href || '');
            const matches = exact
                ? linkText === searchText
                : linkText.includes(searchText);
            if (matches) {
                logDebug('clickLinkByText:target', { text, name: link.name, href: link.href, backendId: link.backendId, index: i });
                const frameId = link.frameId || null;
                const success = await clickByBackendFn(cdp, ensureFrameDocumentFn, frameDocumentsRequested, logDebug, releaseRemoteObjectFn, fallbackDomClickFn, link.backendId, frameId);
                if (success) {
                    console.log(`Clicked link: ${link.name || link.href || 'unnamed link'}`);
                    logDebug('clickLinkByText:success', { text, name: link.name, href: link.href });
                    return true;
                }
            }
        }
        throw new Error(`Link with text "${text}" not found`);
    }
    catch (error) {
        console.error(`Error clicking link by text "${text}":`, error);
        logDebug('clickLinkByText:error', { text, message: error.message });
        throw error;
    }
}
//# sourceMappingURL=element-finding.js.map