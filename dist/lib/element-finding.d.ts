import { CDPClient, AXEntry, ClickElementByTextOptions, AccessibilityNode } from './types';
/**
 * Build text search expression for DOM search
 */
export declare function buildTextSearchExpression(searchText: string, exactMatch: boolean, caseSensitive: boolean): string;
/**
 * Click an element by matching visible text content.
 */
export declare function clickElementByText(cdp: CDPClient, frameDocumentsRequested: Set<string>, isolatedWorldContexts: Map<string, number | null>, logDebug: (event: string, payload?: Record<string, any>) => void, collectAXNodesAcrossFramesFn: () => Promise<AXEntry[]>, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, ensureIsolatedWorldFn: (frameId: string) => Promise<number | undefined>, collectFrameIdsFn: () => Promise<string[]>, releaseRemoteObjectFn: (objectId: string) => Promise<void>, buildTextSearchExpressionFn: (searchText: string, exactMatch: boolean, caseSensitive: boolean) => string, text: string, options?: ClickElementByTextOptions): Promise<boolean>;
/**
 * Find all link elements using accessibility tree
 */
export declare function findLinks(cdp: CDPClient, collectAXNodesAcrossFramesFn: () => Promise<AXEntry[]>, logDebug: (event: string, payload?: Record<string, any>) => void): Promise<Array<{
    node: AccessibilityNode;
    frameId?: string | null;
    backendId: number;
    name: string;
    href?: string;
}>>;
/**
 * Find all text elements using accessibility tree
 */
export declare function findTextElements(cdp: CDPClient, collectAXNodesAcrossFramesFn: () => Promise<AXEntry[]>, logDebug: (event: string, payload?: Record<string, any>) => void, options?: {
    minLength?: number;
    maxLength?: number;
    role?: string;
}): Promise<Array<{
    node: AccessibilityNode;
    frameId?: string | null;
    backendId: number;
    text: string;
    role: string;
}>>;
/**
 * Click a link element by index (e.g., first link, second link, etc.)
 */
export declare function clickLinkByIndex(cdp: CDPClient, frameDocumentsRequested: Set<string>, isolatedWorldContexts: Map<string, number | null>, logDebug: (event: string, payload?: Record<string, any>) => void, collectAXNodesAcrossFramesFn: () => Promise<AXEntry[]>, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, ensureIsolatedWorldFn: (frameId: string) => Promise<number | undefined>, collectFrameIdsFn: () => Promise<string[]>, releaseRemoteObjectFn: (objectId: string) => Promise<void>, clickByBackendFn: (cdp: CDPClient, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, frameDocumentsRequested: Set<string>, logDebug: (event: string, payload?: Record<string, any>) => void, releaseRemoteObjectFn: (objectId: string) => Promise<void>, fallbackDomClickFn: (objectId: string | null) => Promise<boolean>, backendId: number, frameId: string | null) => Promise<boolean>, fallbackDomClickFn: (objectId: string | null) => Promise<boolean>, index: number): Promise<boolean>;
/**
 * Click a link element by text content
 */
export declare function clickLinkByText(cdp: CDPClient, frameDocumentsRequested: Set<string>, isolatedWorldContexts: Map<string, number | null>, logDebug: (event: string, payload?: Record<string, any>) => void, collectAXNodesAcrossFramesFn: () => Promise<AXEntry[]>, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, ensureIsolatedWorldFn: (frameId: string) => Promise<number | undefined>, collectFrameIdsFn: () => Promise<string[]>, releaseRemoteObjectFn: (objectId: string) => Promise<void>, clickByBackendFn: (cdp: CDPClient, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, frameDocumentsRequested: Set<string>, logDebug: (event: string, payload?: Record<string, any>) => void, releaseRemoteObjectFn: (objectId: string) => Promise<void>, fallbackDomClickFn: (objectId: string | null) => Promise<boolean>, backendId: number, frameId: string | null) => Promise<boolean>, fallbackDomClickFn: (objectId: string | null) => Promise<boolean>, text: string, options?: {
    exact?: boolean;
    caseSensitive?: boolean;
}): Promise<boolean>;
//# sourceMappingURL=element-finding.d.ts.map