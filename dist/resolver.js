import { SyntaxKind } from "ts-morph";
const validAsFirstNode = [SyntaxKind.TypeReference, SyntaxKind.TypeLiteral];
export function Resolver(maxDepth = 200, enableDebug = false) {
    const handlers = {
        [SyntaxKind.BooleanKeyword]: () => "boolean",
        [SyntaxKind.StringKeyword]: () => "string",
        [SyntaxKind.NumberKeyword]: () => "number",
        [SyntaxKind.UndefinedKeyword]: () => "undefined",
        [SyntaxKind.NullKeyword]: () => "null",
        [SyntaxKind.BarToken]: () => "|",
        [SyntaxKind.AmpersandToken]: () => "&",
        [SyntaxKind.StringLiteral]: (node) => `${node.getText()}`,
        [SyntaxKind.NumericLiteral]: (node) => `${node.getText()}`,
        [SyntaxKind.TypeReference]: (node, depth) => resolve(node.getChildAtIndex(0).getSymbol().getDeclarations()[0], depth),
        [SyntaxKind.TypeAliasDeclaration]: (node, depth) => {
            let childrenToCheck = node.getChildrenOfKind(SyntaxKind.TypeLiteral)?.[0];
            if (!childrenToCheck) {
                childrenToCheck = node.getChildAtIndex(3);
            }
            return resolve(childrenToCheck, depth);
        },
        [SyntaxKind.UnionType]: (node, depth) => {
            return resolve(node.getChildAtIndex(0), depth);
        },
        [SyntaxKind.TypeLiteral]: (node, depth) => {
            return `{ ${resolve(node.getChildAtIndex(1), depth)} }`;
        },
        [SyntaxKind.PropertySignature]: (node, depth) => {
            return `${node.getChildAtIndex(0).getText()}: ${resolve(node.getChildAtIndex(2), depth)};`;
        },
        [SyntaxKind.IntersectionType]: (node, depth) => {
            return resolve(node.getChildAtIndex(0), depth);
        },
        [SyntaxKind.SyntaxList]: (node, depth) => {
            return node
                .getChildren()
                .map((i) => resolve(i, depth))
                .join(" ");
        },
    };
    function resolve(node, currentDepth = 0) {
        if (enableDebug)
            console.log(new Array(currentDepth).join(" "), node.getKindName());
        if (currentDepth >= maxDepth)
            throw new Error("MAX_DEPTH EXCEEDED");
        if (currentDepth === 0) {
            if (!validAsFirstNode.includes(node.getKind()))
                console.warn(`[WARN]: probably ${node.getKindName()} is not valid starting node`);
        }
        const newDepth = currentDepth + 1;
        const handler = handlers?.[node.getKind()];
        if (handler) {
            return handler(node, newDepth);
        }
        return "not_implemented";
    }
    return resolve;
}
