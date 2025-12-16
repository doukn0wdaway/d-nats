#!/usr/bin/env node
import z from "zod";
import * as fs from "fs/promises";
import { Command } from "commander";
const defaultConfigPath = "./nestjs-nats-client-generator.json";
const defaultConfig = {
    tsconfig: "./tsconfig.json",
};
const ConfigSchema = z.object({
    tsconfig: z.string(),
});
async function writeConfig(config, configPath) {
    try {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
    }
    catch (e) {
        console.warn(`Failed to save config to ${configPath}`);
        return e;
    }
}
async function readFile(path) {
    try {
        const result = await fs.readFile(path);
        return result.toString();
    }
    catch (e) {
        console.warn(`Failed to read ${path} file`);
        return e;
    }
}
async function resolveConfig(path) {
    const configString = await readFile(path);
    if (configString instanceof Error) {
        return defaultConfig;
    }
    const config = ConfigSchema.safeParse(JSON.parse(path));
    if (config.success) {
        return config.data;
    }
    else {
        console.warn(`failed to parse config: ${config.error}`);
        return defaultConfig;
    }
}
function main() {
    const program = new Command();
    let configPath = defaultConfigPath;
    program
        .name("nestjs-nats-client-generator")
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
        .action(async (opts) => {
        if (opts.config) {
            configPath = opts.config;
        }
        const config = await resolveConfig(configPath);
        console.log("Current config:", config);
    });
    program.parse(process.argv);
}
main();
