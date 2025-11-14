import { CDPClient } from './types';
/**
 * Ensure frame document is requested
 */
export declare function ensureFrameDocument(cdp: CDPClient, frameDocumentsRequested: Set<string>, logDebug: (event: string, payload?: Record<string, any>) => void, frameId: string | null): Promise<void>;
/**
 * Collect all frame IDs from the page
 */
export declare function collectFrameIds(cdp: CDPClient): Promise<string[]>;
/**
 * Ensure isolated world exists for frame
 */
export declare function ensureIsolatedWorld(cdp: CDPClient, isolatedWorldContexts: Map<string, number | null>, frameId: string): Promise<number | undefined>;
/**
 * Release remote object
 */
export declare function releaseRemoteObject(cdp: CDPClient, objectId: string): Promise<void>;
//# sourceMappingURL=dom-helpers.d.ts.map