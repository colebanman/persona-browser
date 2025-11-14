"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureFrameDocument = ensureFrameDocument;
exports.collectFrameIds = collectFrameIds;
exports.ensureIsolatedWorld = ensureIsolatedWorld;
exports.releaseRemoteObject = releaseRemoteObject;
/**
 * Ensure frame document is requested
 */
async function ensureFrameDocument(cdp, frameDocumentsRequested, logDebug, frameId) {
    const key = frameId || 'root';
    if (frameDocumentsRequested.has(key)) {
        return;
    }
    const params = { depth: 0 };
    if (frameId) {
        params.frameId = frameId;
    }
    try {
        await cdp.DOM.getDocument(params);
        frameDocumentsRequested.add(key);
        logDebug('dom:documentRequested', { frameId: key });
    }
    catch (error) {
        logDebug('dom:documentRequestFailed', {
            frameId: key,
            message: error && error.message ? error.message : String(error)
        });
    }
}
/**
 * Collect all frame IDs from the page
 */
async function collectFrameIds(cdp) {
    try {
        const ids = [];
        const { frameTree } = await cdp.Page.getFrameTree();
        const traverse = (node) => {
            if (!node || !node.frame || !node.frame.id)
                return;
            ids.push(node.frame.id);
            if (Array.isArray(node.childFrames)) {
                node.childFrames.forEach(traverse);
            }
        };
        traverse(frameTree);
        return ids.length ? ids : [frameTree && frameTree.frame && frameTree.frame.id].filter(Boolean);
    }
    catch (error) {
        console.warn('Failed to get frame tree for DOM search:', error && error.message ? error.message : error);
        return [];
    }
}
/**
 * Ensure isolated world exists for frame
 */
async function ensureIsolatedWorld(cdp, isolatedWorldContexts, frameId) {
    if (!frameId)
        return undefined;
    if (isolatedWorldContexts.has(frameId)) {
        return isolatedWorldContexts.get(frameId) || undefined;
    }
    try {
        const { executionContextId } = await cdp.Page.createIsolatedWorld({
            frameId,
            worldName: 'chromeAutomationTextSearch'
        });
        if (executionContextId) {
            isolatedWorldContexts.set(frameId, executionContextId);
            return executionContextId;
        }
    }
    catch (error) {
        console.warn(`Failed to create isolated world for frame ${frameId}:`, error && error.message ? error.message : error);
    }
    isolatedWorldContexts.set(frameId, null);
    return undefined;
}
/**
 * Release remote object
 */
async function releaseRemoteObject(cdp, objectId) {
    if (!objectId)
        return;
    try {
        await cdp.Runtime.releaseObject({ objectId });
    }
    catch {
        // ignore
    }
}
//# sourceMappingURL=dom-helpers.js.map