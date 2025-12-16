import {
  MethodDeclaration,
  Project,
  SyntaxKind,
  TypeReferenceNode,
} from "ts-morph";
import { Resolver } from "./resolver.js";
import { expect, test } from "vitest";

function generateTypeReference(sourceCode: string): TypeReferenceNode {
  const project = new Project();

  const sourceFile = project.createSourceFile("temp.ts", sourceCode);
  const aliases = sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference);
  if (aliases.length < 1)
    throw new Error("You must provide one type reference node");

  return aliases[0];
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
  ).toBe("boolean | number");
});

test("should resolve intersection from type reference", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return true}; type Test = boolean & number;",
      ),
    ),
  ).toBe("boolean & number");
});

test("should resolve object type from type reference", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return {aboba: 3};}; type Test = { aboba: number };",
      ),
    ),
  ).toBe("{ aboba: number; }");
});

test("should resolve type that references another type", () => {
  expect(
    resolve(
      generateTypeReference(
        "function test():Test {return {aboba: 3};}; type Test = { aboba: Test2 }; type Test2 = { boba: string };",
      ),
    ),
  ).toBe("{ aboba: { boba: string; }; }");
});

test("should generate proper client", () => {
  const resolve = Resolver(100, false);

  const sourceCode = `
import { EventPattern, MessagePattern } from '@nestjs/microservices';

type User = { id: number; username: string };

function handlePayment(id: string) {
  console.log(id);
}

export class GatewayController {
  @MessagePattern('getUserById')
  getUser(id: string): User {
    return { id: 2, username: 'user' };
  }

  @EventPattern('payment_created')
  processPayment(paymentId: string) {
    handlePayment(paymentId);
  }
}

`;
  const project = new Project();
  const sourceFile = project.createSourceFile("temp.ts", sourceCode);
  const methods = sourceFile.getClasses().flatMap((i) => i.getMethods());
  const messagePatternMethods = methods.filter((i) =>
    i.getDecorator("MessagePattern"),
  );
  const eventPatternMethods = methods.filter((i) =>
    i.getDecorator("EventPattern"),
  );

  // messagePatternMethods.forEach((i) => console.log(i.print()));

  function getDecoratorCallPattern(
    node: MethodDeclaration,
    decoratorName: string,
  ): string {
    const resolve = Resolver();
    const decorator = node.getDecorator(decoratorName);
    if (decorator) {
      const unresolvedCallPattern = decorator.getDescendantsOfKind(
        SyntaxKind.SyntaxList,
      )?.[0];

      if (unresolvedCallPattern) {
        const callPattern = resolve(unresolvedCallPattern);
        return callPattern;
      }
    }
  }

  const transformed = messagePatternMethods.map((i) => {
    let transformed: any = {};
    const unresolvedReturnType = i.getChildrenOfKind(
      SyntaxKind.TypeReference,
    )?.[0];
    if (unresolvedReturnType) {
      const returnType = resolve(unresolvedReturnType);
      transformed.returnType = returnType;
    }

    transformed.callPattern = getDecoratorCallPattern(i, "MessagePattern");

    const methodName = i
      .getChildrenOfKind(SyntaxKind.Identifier)?.[0]
      .getText();
    transformed.methodName = methodName;

    const params = i.getParameters().map((i) => {
      const type = resolve(i.getChildAtIndex(2));

      const text = i.getChildAtIndex(0).getText();
      return { text, type };
    });

    transformed.params = params;

    // console.log(transformed);

    return `
    async ${transformed.methodName}(${transformed.params.map((i) => `${i.text}: ${i.type}`).join(" ")}){
        const observable = this.client.send<${transformed.returnType}>(${transformed.callPattern}, [ ${transformed.params.map((i) => i.text).join(", ")} ]); 
        const res = await firstValueFrom(observable);
        return res;
    }`;
  });

  project
    .createSourceFile(
      "./generated.ts",

      `
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NatsClientService {
  constructor(
    @Inject('NATS_CLIENT') private readonly client: ClientProxy, // Инъекция стандартного клиента NATS
  ) {}
${transformed.join("\n")}
}
`,

      {
        overwrite: true,
      },
    )
    .save();

  eventPatternMethods.map((i) => {
    let transformed: any = {};
    transformed.callPattern = getDecoratorCallPattern(i, "EventPattern");

    const methodName = i
      .getChildrenOfKind(SyntaxKind.Identifier)?.[0]
      .getText();
    transformed.methodName = methodName;

    console.log(transformed);
  });
});

// TODO: SUPPORT ARRAYS AND GENERICS maybe?
