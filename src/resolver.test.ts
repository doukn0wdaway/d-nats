import { Project, TypeAliasDeclaration } from "ts-morph";
import { Resolver } from "./resolver.js";
import { expect, test } from "vitest";

function simpleTest(sourceCode: string): TypeAliasDeclaration {
  const project = new Project();

  const sourceFile = project.createSourceFile("temp.ts", sourceCode);
  const aliases = sourceFile.getTypeAliases();
  if (aliases.length < 1)
    throw new Error("You must provide one typedefinition");

  return aliases[0];
}

test("should resolve boolean", () => {
  const resolve = Resolver();
  expect(resolve(simpleTest("type Test = boolean;"))).toBe("boolean");
});

test("should resolve null", () => {
  const resolve = Resolver();
  expect(resolve(simpleTest("type Test = null;"))).toBe("null");
});

test("should resolve undefined", () => {
  const resolve = Resolver();
  expect(resolve(simpleTest("type Test = undefined;"))).toBe("undefined");
});

test("should resolve number", () => {
  const resolve = Resolver();
  expect(resolve(simpleTest("type Test = number;"))).toBe("number");
});

test("should resolve string", () => {
  const resolve = Resolver();
  expect(resolve(simpleTest("type Test = string;"))).toBe("string");
});

test("should resolve string literal", () => {
  const resolve = Resolver();
  expect(resolve(simpleTest('type Test = "something";'))).toBe('"something"');

  expect(resolve(simpleTest('type Test = "3";'))).toBe('"3"');
});

test("should resolve basic unions", () => {
  const resolve = Resolver();
  expect(resolve(simpleTest("type Test =  undefined | null;"))).toBe(
    "undefined | null",
  );
});

test("should resolve basic intersections", () => {
  const resolve = Resolver();
  expect(resolve(simpleTest("type Test =  null & number;"))).toBe(
    "null & number",
  );
});

test("should resolve semi-complex type ", () => {
  const resolve = Resolver();
  expect(
    resolve(simpleTest("type Test = {aboba: number; boba: string; };")),
  ).toBe("{ aboba: number; boba: string; }");
});

test("should resolve type reference in the same file", () => {
  const resolve = Resolver();
  expect(
    resolve(
      simpleTest(
        "type Test = {test2: Test2; boba: string; };\ntype Test2 = {aboba: number; boba: string; };",
      ),
    ),
  ).toBe("{ test2: { aboba: number; boba: string; }; boba: string; }");
});

test("should resolve type reference in the separate files", () => {
  const resolve = Resolver();

  const project = new Project();

  project.createSourceFile(
    "temp1.ts",
    `export type Test2 = {aboba: number; boba: string; };`,
  );
  const sourceFile = project.createSourceFile(
    "temp2.ts",
    `import { Test2 } from './temp1';\ntype Test1 = {test2: Test2; boba: string; };`,
    {},
  );
  const aliases = sourceFile.getTypeAliases();

  if (aliases.length < 1)
    throw new Error("You must provide one typedefinition");

  expect(resolve(aliases[0])).toBe(
    "{ test2: { aboba: number; boba: string; }; boba: string; }",
  );
});

// test("should resolve arrays", () => {
//   const resolve = Resolver();
//
//   expect(
//     resolve(
//       simpleTest(
//         "type Test = { num: number[]; }",
//       ),
//     ),
//   ).toBe("number[]"); // INFO: or Array<number> actually? idk
//
//   expect(
//     resolve(
//       simpleTest(
//         "type Test = { num: Array<number>; }",
//       ),
//     ),
//   ).toBe("number[]"); // INFO: or Array<number> actually? idk
//
// });
//

// TODO: SUPPORT ARRAYS AND GENERICS maybe?
