"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccessibilityTree = getAccessibilityTree;
exports.getPartialAccessibilityTree = getPartialAccessibilityTree;
exports.queryAccessibilityTree = queryAccessibilityTree;
exports.getChildAXNodes = getChildAXNodes;
exports.flattenAccessibilityTree = flattenAccessibilityTree;
exports.findNodesByRole = findNodesByRole;
exports.findNodesByName = findNodesByName;
/**
 * Get the full accessibility tree for the current page
 */
async function getAccessibilityTree(cdpClient, options = {}) {
    try {
        // Ensure Accessibility domain is enabled
        if (!cdpClient.Accessibility) {
            throw new Error('Accessibility domain not available in CDP client. Make sure to enable it when creating the client.');
        }
        // Enable accessibility if not already enabled
        await cdpClient.Accessibility.enable();
        // Fetch the full accessibility tree
        const { nodes } = await cdpClient.Accessibility.getFullAXTree(options);
        if (!nodes || nodes.length === 0) {
            return { root: null, nodes: [] };
        }
        // Create a map of nodeId to node for quick lookup
        const nodeMap = new Map();
        nodes.forEach((node) => {
            nodeMap.set(node.nodeId, node);
        });
        // Find the root node (the one without parentId or with parentId null)
        const rootNode = nodes.find((node) => !node.parentId) || nodes[0];
        // Build the tree structure recursively
        function buildTree(nodeId) {
            const node = nodeMap.get(nodeId);
            if (!node)
                return null;
            const treeNode = {
                nodeId: node.nodeId,
                ignored: node.ignored,
                ignoredReasons: node.ignoredReasons || [],
                role: node.role,
                name: node.name,
                description: node.description,
                value: node.value,
                properties: node.properties || [],
                backendDOMNodeId: node.backendDOMNodeId,
                frameId: node.frameId,
                children: []
            };
            // Recursively build children
            if (node.childIds && node.childIds.length > 0) {
                node.childIds.forEach((childId) => {
                    const childTree = buildTree(childId);
                    if (childTree) {
                        treeNode.children.push(childTree);
                    }
                });
            }
            return treeNode;
        }
        const tree = {
            root: buildTree(rootNode.nodeId),
            nodes: nodes // Include raw nodes for additional processing if needed
        };
        console.log(`Built accessibility tree with ${nodes.length} nodes`);
        return tree;
    }
    catch (error) {
        console.error('Error getting accessibility tree:', error);
        throw error;
    }
}
/**
 * Get a partial accessibility tree for a specific DOM node
 */
async function getPartialAccessibilityTree(cdpClient, nodeId, options = {}) {
    try {
        if (!cdpClient.Accessibility) {
            throw new Error('Accessibility domain not available in CDP client.');
        }
        await cdpClient.Accessibility.enable();
        const { nodes } = await cdpClient.Accessibility.getPartialAXTree({
            nodeId,
            fetchRelatives: options.fetchRelatives !== undefined ? options.fetchRelatives : true
        });
        // Process similar to full tree
        const nodeMap = new Map();
        nodes.forEach((node) => {
            nodeMap.set(node.nodeId, node);
        });
        const rootNode = nodes.find((node) => !node.parentId) || nodes[0];
        function buildTree(nodeId) {
            const node = nodeMap.get(nodeId);
            if (!node)
                return null;
            return {
                nodeId: node.nodeId,
                ignored: node.ignored,
                ignoredReasons: node.ignoredReasons || [],
                role: node.role,
                name: node.name,
                description: node.description,
                value: node.value,
                properties: node.properties || [],
                backendDOMNodeId: node.backendDOMNodeId,
                frameId: node.frameId,
                children: node.childIds ? node.childIds.map((childId) => buildTree(childId)).filter((n) => n !== null) : []
            };
        }
        return {
            root: buildTree(rootNode.nodeId),
            nodes
        };
    }
    catch (error) {
        console.error('Error getting partial accessibility tree:', error);
        throw error;
    }
}
/**
 * Query the accessibility tree for nodes matching specific criteria
 */
async function queryAccessibilityTree(cdpClient, nodeId, options = {}) {
    try {
        if (!cdpClient.Accessibility) {
            throw new Error('Accessibility domain not available in CDP client.');
        }
        await cdpClient.Accessibility.enable();
        const result = await cdpClient.Accessibility.queryAXTree({
            nodeId,
            accessibleName: options.accessibleName,
            role: options.role
        });
        return result.nodes || [];
    }
    catch (error) {
        console.error('Error querying accessibility tree:', error);
        throw error;
    }
}
/**
 * Get child accessibility nodes for a specific node
 */
async function getChildAXNodes(cdpClient, id, frameId) {
    try {
        if (!cdpClient.Accessibility) {
            throw new Error('Accessibility domain not available in CDP client.');
        }
        await cdpClient.Accessibility.enable();
        const result = await cdpClient.Accessibility.getChildAXNodes({
            id,
            frameId
        });
        return result.nodes || [];
    }
    catch (error) {
        console.error('Error getting child AX nodes:', error);
        throw error;
    }
}
/**
 * Flatten the accessibility tree into a list with depth information
 */
function flattenAccessibilityTree(tree) {
    const flattened = [];
    function traverse(node, depth = 0) {
        if (!node)
            return;
        flattened.push({ ...node, depth });
        if (node.children) {
            node.children.forEach(child => traverse(child, depth + 1));
        }
    }
    if (tree.root) {
        traverse(tree.root);
    }
    return flattened;
}
/**
 * Find nodes in the accessibility tree by role
 */
function findNodesByRole(tree, role) {
    const flattened = flattenAccessibilityTree(tree);
    return flattened.filter(node => {
        const nodeRole = node.role;
        if (typeof nodeRole === 'string')
            return nodeRole === role;
        if (nodeRole && typeof nodeRole === 'object' && 'value' in nodeRole) {
            return nodeRole.value === role;
        }
        return false;
    });
}
/**
 * Find nodes in the accessibility tree by accessible name
 */
function findNodesByName(tree, name) {
    const flattened = flattenAccessibilityTree(tree);
    const lowerName = name.toLowerCase();
    return flattened.filter(node => {
        const nodeName = node.name;
        if (typeof nodeName === 'string') {
            return nodeName.toLowerCase().includes(lowerName);
        }
        if (nodeName && typeof nodeName === 'object' && 'value' in nodeName) {
            return String(nodeName.value).toLowerCase().includes(lowerName);
        }
        return false;
    });
}
//# sourceMappingURL=accessibility-tree.js.map