import { CDPClient, AccessibilityNode, AXEntry, IconHintsResult, ElementMetadata } from './types';
/**
 * Get accessibility role from node
 */
export declare function axRole(node: AccessibilityNode): string;
/**
 * Check if accessibility node has property
 */
export declare function axHasProp(node: AccessibilityNode, propName: string): boolean;
/**
 * Find nearest ancestor in flattened AX list with a backend DOM node and clickable/text-input role
 */
export declare function findClickableAXAncestor(axEntries: AXEntry[], startIndex: number): {
    entry: AXEntry;
    index: number;
} | null;
/**
 * Extract icon hints for backend node
 */
export declare function extractIconHintsForBackendNode(cdp: CDPClient, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, releaseRemoteObjectFn: (objectId: string) => Promise<void>, backendNodeId: number, frameId: string | null): Promise<IconHintsResult | null>;
/**
 * Extract element metadata for backend node
 */
export declare function extractElementMetadataForBackendNode(cdp: CDPClient, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, releaseRemoteObjectFn: (objectId: string) => Promise<void>, backendNodeId: number, frameId: string | null): Promise<ElementMetadata | null>;
/**
 * Augment nodes with icon hints
 */
export declare function augmentNodesWithIconHints(cdp: CDPClient, ensureFrameDocumentFn: (frameId: string | null) => Promise<void>, releaseRemoteObjectFn: (objectId: string) => Promise<void>, axEntries: AXEntry[], indexedNodes: any[], maxCount?: number): Promise<void>;
/**
 * Collect accessibility nodes across all frames
 */
export declare function collectAXNodesAcrossFrames(cdp: CDPClient, collectFrameIdsFn: () => Promise<string[]>, getAccessibilityTreeFn: (options: any) => Promise<any>, flattenAccessibilityTreeFn: (tree: any) => AccessibilityNode[], logDebug: (event: string, payload?: Record<string, any>) => void): Promise<AXEntry[]>;
//# sourceMappingURL=accessibility-helpers.d.ts.map