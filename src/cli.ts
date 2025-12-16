#!/usr/bin/env node

import z from "zod";
import * as fs from "fs/promises";
import { Command } from "commander";

const defaultConfigPath = "./d-nats.json";
const defaultConfig: Config = {
  tsconfig: "./tsconfig.json",
};

const ConfigSchema = z.object({
  tsconfig: z.string(),
});
type Config = z.infer<typeof ConfigSchema>;

async function writeConfig(config: Config, configPath: string) {
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.warn(`Failed to save config to ${configPath}`);
    return e as Error;
  }
}

async function readFile(path: string) {
  try {
    const result = await fs.readFile(path);
    return result.toString();
  } catch (e) {
    console.warn(`Failed to read ${path} file`);
    return e as Error;
  }
}

async function resolveConfig(path: string): Promise<Config> {
  const configString = await readFile(path);

  if (configString instanceof Error) {
    return defaultConfig;
  }

  const config = ConfigSchema.safeParse(JSON.parse(path));

  if (config.success) {
    return config.data;
  } else {
    console.warn(`failed to parse config: ${config.error}`);

    return defaultConfig;
  }
}

function main() {
  const program = new Command();

  let configPath = defaultConfigPath;

  program
    .name("d-nats")
    .description("Generates a NATS Client module by your nestjs project");

  program
    .command("init [config]")
    .description("Initialize default config")
    .action((filename) => {
      const configPath = filename || defaultConfigPath;

      writeConfig({ tsconfig: "./tsconfig.json" }, configPath);
    });

  program
    .command("generate")
    .option("-c, --config <path>", "path to config file")
    .description("generates client")
    .action(async (opts: { config?: string }) => {
      if (opts.config) {
        configPath = opts.config;
      }

      const config = await resolveConfig(configPath);

      console.log("Current config:", config);
    });

  program.parse(process.argv);
}

main();
