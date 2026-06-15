import {
  bundle,
  webpack,
  type WebpackConfiguration
} from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { toRemotionCompositionId } from "../composition/composition-id.js";
import type { RendererComposition } from "../renderer-types.js";

export interface ExportVideoOptions {
  composition: RendererComposition;
  outputPath: string;
}

export interface ExportVideoResult {
  outputPath: string;
}

export async function exportVideo(
  options: ExportVideoOptions
): Promise<ExportVideoResult> {
  const bundleOutputDirectory = join(tmpdir(), "aide-remotion-bundle");
  await mkdir(bundleOutputDirectory, {
    recursive: true
  });

  const serveUrl = await bundle({
    entryPoint: fileURLToPath(new URL("../remotion-root.tsx", import.meta.url)),
    outDir: bundleOutputDirectory,
    publicDir: dirname(options.outputPath),
    webpackOverride: createWebpackOverride(),
    enableCaching: false
  });
  const browserExecutable = resolveBrowserExecutable();
  const chromiumOptions = {
    disableWebSecurity: true
  };
  const composition = await selectComposition({
    serveUrl,
    id: toRemotionCompositionId(options.composition.compositionId),
    inputProps: {
      composition: options.composition
    },
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 30000
  });

  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: options.outputPath,
    inputProps: {
      composition: options.composition
    },
    browserExecutable,
    chromiumOptions,
    timeoutInMilliseconds: 30000
  });

  return {
    outputPath: options.outputPath
  };
}

function resolveBrowserExecutable(): string | null {
  const configuredPath = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (configuredPath && existsSync(configuredPath)) {
    return configuredPath;
  }

  for (const candidatePath of [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ]) {
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

function createWebpackOverride() {
  return (configuration: WebpackConfiguration): WebpackConfiguration => ({
    ...configuration,
    resolve: {
      ...configuration.resolve,
      extensionAlias: {
        ...configuration.resolve?.extensionAlias,
        ".js": [".ts", ".tsx", ".js"],
        ".mjs": [".mts", ".mjs"]
      },
      extensions: [
        ".ts",
        ".tsx",
        ...(configuration.resolve?.extensions ?? [])
      ]
    },
    module: {
      ...configuration.module,
      rules: [
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false
          }
        },
        ...(configuration.module?.rules ?? [])
      ]
    },
    plugins: [
      ...(configuration.plugins ?? []),
      new webpack.NormalModuleReplacementPlugin(/\.js$/, (resource) => {
        if (resource.request.startsWith(".")) {
          resource.request = resource.request.replace(/\.js$/, "");
        }
      })
    ]
  });
}
