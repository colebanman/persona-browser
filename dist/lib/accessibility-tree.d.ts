import { CDPClient, AccessibilityNode } from './types';
export interface AccessibilityTreeOptions {
    depth?: number;
    frameId?: string;
}
export interface PartialAccessibilityTreeOptions {
    fetchRelatives?: boolean;
}
export interface QueryAccessibilityTreeOptions {
    accessibleName?: string;
    role?: string;
}
export interface AccessibilityTreeNode {
    nodeId: string;
    ignored?: boolean;
    ignoredReasons?: Array<string | {
        type: string;
    }>;
    role?: string | {
        value: string;
    };
    name?: string | {
        value: string;
    };
    description?: string | {
        value: string;
    };
    value?: string | {
        value: string;
    };
    properties?: Array<{
        name: string | {
            value: string;
        };
        value: boolean | {
            value: boolean;
        };
    }>;
    backendDOMNodeId?: number;
    frameId?: string;
    children: AccessibilityTreeNode[];
    depth?: number;
}
export interface AccessibilityTree {
    root: AccessibilityTreeNode | null;
    nodes: any[];
}
/**
 * Get the full accessibility tree for the current page
 */
export declare function getAccessibilityTree(cdpClient: CDPClient, options?: AccessibilityTreeOptions): Promise<AccessibilityTree>;
/**
 * Get a partial accessibility tree for a specific DOM node
 */
export declare function getPartialAccessibilityTree(cdpClient: CDPClient, nodeId: number, options?: PartialAccessibilityTreeOptions): Promise<AccessibilityTree>;
/**
 * Query the accessibility tree for nodes matching specific criteria
 */
export declare function queryAccessibilityTree(cdpClient: CDPClient, nodeId: number, options?: QueryAccessibilityTreeOptions): Promise<any[]>;
/**
 * Get child accessibility nodes for a specific node
 */
export declare function getChildAXNodes(cdpClient: CDPClient, id: string, frameId?: string): Promise<any[]>;
/**
 * Flatten the accessibility tree into a list with depth information
 */
export declare function flattenAccessibilityTree(tree: AccessibilityTree): AccessibilityNode[];
/**
 * Find nodes in the accessibility tree by role
 */
export declare function findNodesByRole(tree: AccessibilityTree, role: string): AccessibilityNode[];
/**
 * Find nodes in the accessibility tree by accessible name
 */
export declare function findNodesByName(tree: AccessibilityTree, name: string): AccessibilityNode[];
//# sourceMappingURL=accessibility-tree.d.ts.map