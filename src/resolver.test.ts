import { Project, SyntaxKind } from "ts-morph";
import { Resolver } from "./resolver.js";
import { expect, test } from "vitest";

// TODO: ADD TEST CASE WITH ZOD OR OTHER DTOS

function generateTypeReference(sourceCode: string) {
  const project = new Project();

  const sourceFile = project.createSourceFile("temp.ts", sourceCode);
  const aliases = sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference);
  if (aliases.length < 1)
    throw new Error("You must provide one type reference node");

  return aliases?.[0].getType();
}

const resolve = Resolver();
test("should resolve single type from type reference", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return true}; type Test = boolean;",
      ),
    ),
  ).toBe("boolean");
});

test("should resolve union from type reference", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return true}; type Test = boolean | number;",
      ),
    ),
  ).toBe("number | false | true");
});

test("should resolve intersection from type reference", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return true}; type Test = boolean & number;",
      ),
    ),
  ).toBe("never");
});

test("should resolve object type from type reference", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return {aboba: 3};}; type Test = { aboba: number };",
      ),
    ),
  ).toBe("{ aboba: number }");
});

test("should resolve type that references another type", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return {aboba: 3};}; type Test = { aboba: Test2 }; type Test2 = { boba: string };",
      ),
    ),
  ).toBe("{ aboba: { boba: string } }");
});

test("should resolve arrays", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return {aboba: 3};}; type Test = { aboba: Test2[] }; type Test2 = { boba: string };",
      ),
    ),
  ).toBe("{ aboba: Array<{ boba: string }> }");
});

test("should resolve generics", () => {
  expect(
    resolve(
      generateTypeReference(
        `
function test(): Test {return {aboba: 3};}; type Test = { aboba: Result<Test2, "err"> }; type Test2 = { boba: string };


export type Err<E> = {
  _tag: 'err';
  error: E;
};

export type Ok<T> = {
  _tag: 'ok';
  value: T;
};

export type Result<T, E> = Ok<T> | Err<E>;
`,
      ),
    ),
  ).toBe(
    `{ aboba: { _tag: "ok"; value: { boba: string } } | { _tag: "err"; error: "err" } }`,
  );
});

// test("should generate proper client", () => {
//   const resolve = Resolver(100, false);
//
//   const sourceCode = `
// import { EventPattern, MessagePattern } from '@nestjs/microservices';
//
// type User = { id: number; username: string };
//
// function handlePayment(id: string) {
//   console.log(id);
// }
//
// export class GatewayController {
//   @MessagePattern('getUserById')
//   getUser(id: string): User {
//     return { id: 2, username: 'user' };
//   }
//
//   @MessagePattern('getIdByUser')
//   getIdByUser(user: User): number {
//     return user.id;
//   }
//
//   @MessagePattern('getSomethingSpecial')
//   getSomethingSpecial({ user, boba }:{user: User, boba: number}): string {
//     return "im a creep, im a weirdo, what the hell i'm doing here";
//   }
//
//   @EventPattern('payment_created')
//   processPayment(paymentId: string) {
//     handlePayment(paymentId);
//   }
// }
//
// `;
//   const project = new Project();
//   const sourceFile = project.createSourceFile("temp.ts", sourceCode);
//   const methods = sourceFile.getClasses().flatMap((i) => i.getMethods());
//   const messagePatternMethods = methods.filter((i) =>
//     i.getDecorator("MessagePattern"),
//   );
//   const eventPatternMethods = methods.filter((i) =>
//     i.getDecorator("EventPattern"),
//   );
//
//   // messagePatternMethods.forEach((i) => console.log(i.print()));
//
//   function getDecoratorCallPattern(
//     node: MethodDeclaration,
//     decoratorName: string,
//   ): string {
//     const resolve = Resolver();
//     const decorator = node.getDecorator(decoratorName);
//     if (decorator) {
//       const unresolvedCallPattern = decorator.getDescendantsOfKind(
//         SyntaxKind.SyntaxList,
//       )?.[0];
//
//       if (unresolvedCallPattern) {
//         const callPattern = unresolvedCallPattern.getText();
//         return callPattern;
//       }
//     }
//     throw new Error(
//       `Declaration of ${decoratorName} decorator call pattern not found`,
//     );
//   }
//
//   const transformed = messagePatternMethods.map((i) => {
//     let transformed: any = {};
//     const unresolvedReturnType = i.getReturnTypeNode()?.getType();
//     if (unresolvedReturnType) {
//       const returnType = resolve(unresolvedReturnType);
//       transformed.returnType = returnType;
//     }
//
//     transformed.callPattern = getDecoratorCallPattern(i, "MessagePattern");
//
//     const methodName = i
//       .getChildrenOfKind(SyntaxKind.Identifier)?.[0]
//       .getText();
//     transformed.methodName = methodName;
//
//     const params = i.getParameters().map((i) => {
//       const typeNode = i.getTypeNode()?.getType();
//       if (!typeNode) return "not_implemented";
//       const type = resolve(typeNode);
//
//       const text = i.getChildAtIndex(0).getText();
//       return { text, type };
//     });
//
//     transformed.params = params;
//
//     const isParamsArray = transformed.params.length > 1;
//     return `
//     async ${transformed.methodName}(${transformed.params.map((i) => `${i.text}: ${i.type}`).join(" ")}){
//         const observable = this.client.send<${transformed.returnType}>(${transformed.callPattern}, ${isParamsArray ? "[" : ""}${transformed.params.map((i) => i.text).join(", ")}${isParamsArray ? "]" : ""} );
//         const res = await firstValueFrom(observable);
//         return res;
//     }`;
//   });
//
//   const transformedEventPatternMethods = eventPatternMethods.map((i) => {
//     let transformed: any = {};
//
//     transformed.callPattern = getDecoratorCallPattern(i, "EventPattern");
//
//     const methodName = i
//       .getChildrenOfKind(SyntaxKind.Identifier)?.[0]
//       .getText();
//     transformed.methodName = methodName;
//
//     const params = i.getParameters().map((i) => {
//       const typeNode = i.getTypeNode()?.getType();
//       if (!typeNode) return "not_implemented";
//       const type = resolve(typeNode);
//
//       const text = i.getChildAtIndex(0).getText();
//       return { text, type };
//     });
//
//     transformed.params = params;
//
//     const isParamsArray = transformed.params.length > 1;
//     return `
//     ${transformed.methodName}(${transformed.params.map((i) => `${i.text}: ${i.type}`).join(" ")}){
//         this.client.emit(${transformed.callPattern}, ${isParamsArray ? "[" : ""}${transformed.params.map((i) => i.text).join(", ")}${isParamsArray ? "]" : ""});
//     }`;
//   });
//
//   project
//     .createSourceFile(
//       "./generated.ts",
//
//       `import { Injectable, Inject } from '@nestjs/common';
// import { ClientProxy } from '@nestjs/microservices';
// import { firstValueFrom } from 'rxjs';
//
// @Injectable()
// export class NatsClientService {
//   constructor(
//     @Inject('NATS_CLIENT') private readonly client: ClientProxy,
//   ) {}
// ${transformed.join("\n")}
// ${transformedEventPatternMethods.join("\n")}
// }
// `,
//
//       {
//         overwrite: true,
//       },
//     )
//     .save();
// });
