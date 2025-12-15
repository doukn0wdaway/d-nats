import { Node, SyntaxKind } from "ts-morph";
import { assert } from "vitest";

const validKindsInsideTypeAliasDeclaration = [
  SyntaxKind.BooleanKeyword,
  SyntaxKind.StringKeyword,
  SyntaxKind.NullKeyword,
  SyntaxKind.NumberKeyword,
  SyntaxKind.UndefinedKeyword,
  SyntaxKind.LiteralType,
  SyntaxKind.StringLiteral,
  SyntaxKind.UnionType,
  SyntaxKind.IntersectionType,
  SyntaxKind.TypeLiteral,
  SyntaxKind.PropertySignature,
  SyntaxKind.TypeReference,
];

export function Resolver(maxDepth: number = 20, enableDebug: boolean = true) {
  return function resolve(node: Node, currentDepth: number = 0): string {
    if (currentDepth >= maxDepth) throw new Error("MAX_DEPTH EXCEEDED");
    const newDepth = currentDepth + 1;

    console.log(new Array(newDepth).join(" "), node.getKindName());

    if (node.asKind(SyntaxKind.TypeAliasDeclaration)) {
      // assuming that TypeAliasDeclaration always have 5 childrens
      //
      let childrenToCheck: Node | undefined = node.getChildrenOfKind(
        SyntaxKind.TypeLiteral,
      )?.[0];
      if (!childrenToCheck) {
        childrenToCheck = node.getChildAtIndex(3);
      }

      if (
        validKindsInsideTypeAliasDeclaration.includes(childrenToCheck.getKind())
      ) {
        return resolve(childrenToCheck, newDepth);
      }
    }

    if (node.asKind(SyntaxKind.BooleanKeyword)) {
      return "boolean";
    }

    if (node.asKind(SyntaxKind.StringKeyword)) {
      return "string";
    }

    if (node.asKind(SyntaxKind.NumberKeyword)) {
      return "number";
    }

    if (node.asKind(SyntaxKind.UndefinedKeyword)) {
      return "undefined";
    }

    if (node.asKind(SyntaxKind.NullKeyword)) {
      return "null";
    }

    if (node.asKind(SyntaxKind.StringLiteral)) {
      return node.getText();
    }

    if (node.asKind(SyntaxKind.LiteralType))
      return resolve(node.getChildAtIndex(0), newDepth);

    if (node.asKind(SyntaxKind.UnionType)) {
      return resolve(node.getChildAtIndex(0), newDepth);
    }

    if (node.asKind(SyntaxKind.IntersectionType)) {
      return resolve(node.getChildAtIndex(0), newDepth);
    }

    if (node.asKind(SyntaxKind.TypeLiteral)) {
      return `{ ${resolve(node.getChildAtIndex(1), newDepth)} }`;
    }

    if (node.asKind(SyntaxKind.PropertySignature)) {
      return `${node.getChildAtIndex(0).getText()}: ${resolve(node.getChildAtIndex(2), newDepth)};`;
    }

    if (node.asKind(SyntaxKind.SyntaxList)) {
      return node
        .getChildren()
        .map((i) => resolve(i, newDepth))
        .join(" ");
    }

    if (node.asKind(SyntaxKind.AmpersandToken)) {
      return "&";
    }

    if (node.asKind(SyntaxKind.BarToken)) {
      return "|";
    }

    if (node.asKind(SyntaxKind.TypeReference)) {
      return resolve(
        node.getChildAtIndex(0).getSymbol().getDeclarations()[0],
        newDepth,
      );
    }

    if (node.asKind(SyntaxKind.ImportSpecifier)) {
      const child = node.getSymbol().getAliasedSymbol().getDeclarations()[0];

      return resolve(child, newDepth);
    }

    throw new Error("not implemented");
  };
}
