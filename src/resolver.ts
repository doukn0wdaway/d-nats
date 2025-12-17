import { Node, Type } from "ts-morph";

type Resolver = (node: Node, depth: number) => string;

export function Resolver() {
  // TODO: add max depth and maybe some optimizations
  // NOTE: maybe i should leave aliases and don't unfold everything
  function resolve(type: Type): string {
    if (type.isString()) return type.getText();
    if (type.isNumber()) return type.getText();
    if (type.isBoolean()) return type.getText();
    if (type.isBooleanLiteral()) return type.getText();
    if (type.isNever()) return type.getText();
    if (type.isStringLiteral()) return type.getText();
    if (type.isAny()) return type.getText();
    if (type.isNull()) return type.getText();
    if (type.isUndefined()) return type.getText();

    if (type.isIntersection()) {
      return type
        .getIntersectionTypes()
        .map((t) => resolve(t))
        .join(" & ");
    }

    if (type.isUnion()) {
      return type
        .getUnionTypes()
        .map((t) => resolve(t))
        .join(" | ");
    }

    if (type.isArray()) {
      return `Array<${resolve(type.getArrayElementType())}>`;
    }

    if (type.isObject() && type.getSymbol()) {
      const symbol = type.getSymbol()!;
      const name = symbol.getName();

      const args = type.getTypeArguments();
      if (args.length > 0) {
        return `${name}<${args.map((arg) => resolve(arg)).join(", ")}>`;
      }
    }

    if (type.isObject()) {
      const props = type.getProperties();

      const members = props.map((p) => {
        const decl = p.getDeclarations()[0];
        const propType = p.getTypeAtLocation(decl);
        return `${p.getName()}: ${resolve(propType)}`;
      });

      return `{ ${members.join("; ")} }`;
    }

    return `not_implemented(${type.getText()})`;
  }

  return resolve;
}
