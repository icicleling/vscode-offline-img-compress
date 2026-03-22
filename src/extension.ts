import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import sharp from "sharp";

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getCompressOptions(ext: string) {
  const lowerExt = ext.toLowerCase();
  if (lowerExt === ".jpg" || lowerExt === ".jpeg") {
    return {
      format: "jpeg" as const,
      sharpOpts: {},
      outOpts: { quality: 80, mozjpeg: true },
    };
  }
  if (lowerExt === ".png") {
    return {
      format: "png" as const,
      sharpOpts: {},
      outOpts: { compressionLevel: 9, palette: true },
    };
  }
  if (lowerExt === ".webp") {
    return {
      format: "webp" as const,
      sharpOpts: { animated: true },
      outOpts: { quality: 80, effort: 6 },
    };
  }
  if (lowerExt === ".gif") {
    return {
      format: "gif" as const,
      sharpOpts: { animated: true },
      outOpts: {
        colors: 128,
        effort: 10,
      },
    };
  }
  return null;
}

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Image Compressor");

  const compressionFile = vscode.commands.registerCommand(
    "offline-img-compress.compressionFile",
    async (uri: vscode.Uri) => {
      const fileName = path.basename(uri.fsPath);
      const fullPath = uri.fsPath;
      const ext = path.extname(fileName);

      const compressConfig = getCompressOptions(ext);
      if (!compressConfig) {
        outputChannel.appendLine(`[Warning] ${fileName} Unsupported format`);
        outputChannel.show();
        return;
      }

      try {
        const originalSize = fs.statSync(fullPath).size;
        const image = sharp(fullPath, compressConfig.sharpOpts);

        const parsedPath = path.parse(fullPath);
        const compressedPath = path.join(
          parsedPath.dir,
          `${parsedPath.name}-compressed${parsedPath.ext}`,
        );

        switch (compressConfig.format) {
          case "jpeg":
            await image.jpeg(compressConfig.outOpts).toFile(compressedPath);
            break;
          case "png":
            await image.png(compressConfig.outOpts).toFile(compressedPath);
            break;
          case "webp":
            await image.webp(compressConfig.outOpts).toFile(compressedPath);
            break;
          case "gif":
            await image.gif(compressConfig.outOpts).toFile(compressedPath);
            break;
          default:
            break;
        }

        const compressedSize = fs.statSync(compressedPath).size;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        const compressedFileName = path.basename(compressedPath);

        outputChannel.appendLine(
          `Compression completed: ${compressedFileName}`,
        );
        outputChannel.appendLine(
          `  Original size: ${formatSize(originalSize)}`,
        );
        outputChannel.appendLine(
          `  Compressed size: ${formatSize(compressedSize)}`,
        );
        outputChannel.appendLine(`  Compression ratio: ${ratio}%`);
        outputChannel.show();
      } catch (err) {
        outputChannel.appendLine(
          `[Error] ${fileName} Compression failed: ${err}`,
        );
        outputChannel.show();
      }
    },
  );

  context.subscriptions.push(compressionFile, outputChannel);
}

// This method is called when your extension is deactivated
export function deactivate() {}
