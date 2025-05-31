#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");
const imageSize = require("image-size");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
	StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

console.error(`[Native MCP] Starting server...`);
console.error(`[Native MCP] Node version: ${process.version}`);
console.error(`[Native MCP] Working directory: ${process.cwd()}`);

class NativeMCPServer {
	constructor() {
		this.requestId = 0;
	}

	// Display native dialog using AppleScript (supports pasting multi-line text)
	async showNativeDialog(title, message, defaultText = "") {
		return new Promise((resolve, reject) => {
			const script = `
        tell application "System Events"
          activate
          set userInput to text returned of (display dialog "${message}

Tips:
• You can paste multi-line text directly
• Line breaks will be preserved
• Supports Cmd+A to select all, Cmd+C to copy, Cmd+V to paste" default answer "${defaultText}" with title "${title}" buttons {"Cancel", "OK"} default button "OK")
          return userInput
        end tell
      `;

			exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
				if (error) {
					if (error.code === 1) {
						// User clicked cancel
						resolve(null);
					} else {
						reject(new Error(`AppleScript error: ${error.message}`));
					}
				} else {
					// Ensure line breaks are properly handled
					const result = stdout.replace(/\r\n|\r/g, "\n").trim();
					resolve(result);
				}
			});
		});
	}

	// Use native file picker
	async showNativeFilePicker() {
		return new Promise((resolve, reject) => {
			const script = `
        tell application "System Events"
          activate
          set selectedFile to (choose file with prompt "Please select an image file" of type {"public.image"})
          return POSIX path of selectedFile
        end tell
      `;

			exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
				if (error) {
					if (error.code === 1) {
						// User clicked cancel
						resolve(null);
					} else {
						reject(new Error(`AppleScript error: ${error.message}`));
					}
				} else {
					resolve(stdout.trim());
				}
			});
		});
	}

	async showNativeAlert(title, message) {
		return new Promise((resolve) => {
			const script = `
        tell application "System Events"
          activate
          display alert "${title}" message "${message}" buttons {"OK"} default button "OK"
        end tell
      `;

			exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
				resolve(); // Always resolve, regardless of user action
			});
		});
	}

	// Screenshot functionality
	async showScreenshotDialog() {
		return new Promise((resolve, reject) => {
			const script = `
        tell application "System Events"
          activate
          set userChoice to button returned of (display dialog "Please choose screenshot type:" buttons {"Cancel", "Select Area", "Full Screen"} default button "Select Area")
          return userChoice
        end tell
      `;

			exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
				if (error) {
					if (error.code === 1) {
						resolve(null); // User canceled
					} else {
						reject(new Error(`AppleScript error: ${error.message}`));
					}
				} else {
					resolve(stdout.trim());
				}
			});
		});
	}

	async takeScreenshot(type = "selection") {
		return new Promise((resolve, reject) => {
			// Generate temporary filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const filename = `screenshot-${timestamp}.png`;
			const filepath = path.join(require("os").tmpdir(), filename);

			let screencaptureCmd;
			if (type === "Full Screen") {
				// Full screen screenshot
				screencaptureCmd = `screencapture "${filepath}"`;
			} else {
				// Select area screenshot (default)
				screencaptureCmd = `screencapture -s "${filepath}"`;
			}

			console.error(`[Native MCP] Taking screenshot: ${screencaptureCmd}`);

			exec(screencaptureCmd, (error, stdout, stderr) => {
				if (error) {
					reject(new Error(`Screenshot failed: ${error.message}`));
				} else {
					// Check if file was created successfully
					if (fs.existsSync(filepath)) {
						resolve(filepath);
					} else {
						reject(new Error("Screenshot was cancelled by user"));
					}
				}
			});
		});
	}

	async handleCollectFeedback(args) {
		try {
			const workSummary = args.work_summary || "No work summary";

			// Collect user feedback (directly enter feedback collection, no longer show work summary popup)
			const feedback = await this.showNativeDialog(
				"Feedback Collection",
				`Please enter your feedback, suggestions, or comments:`,
				"",
			);

			if (feedback === null) {
				throw new Error("User cancelled feedback input");
			}

			// Ask if user wants to add an image
			const addImageScript = `
        tell application "System Events"
          activate
          set userChoice to button returned of (display dialog "Would you like to add an image?" buttons {"Skip", "Select Image", "Screenshot"} default button "Skip")
          return userChoice
        end tell
      `;

			return new Promise((resolve, reject) => {
				exec(
					`osascript -e '${addImageScript}'`,
					async (error, stdout, stderr) => {
						let imagePath = null;

						if (!error) {
							const choice = stdout.trim();

							if (choice === "Select Image") {
								try {
									imagePath = await this.showNativeFilePicker();
								} catch (imgError) {
									console.error(
										"[Native MCP] Image selection error:",
										imgError.message,
									);
								}
							} else if (choice === "Screenshot") {
								try {
									const screenshotType = await this.showScreenshotDialog();
									if (screenshotType && screenshotType !== "Cancel") {
										imagePath = await this.takeScreenshot(screenshotType);
									}
								} catch (screenshotError) {
									console.error(
										"[Native MCP] Screenshot error:",
										screenshotError.message,
									);
									await this.showNativeAlert(
										"Screenshot Failed",
										screenshotError.message,
									);
								}
							}
						}

						const result = {
							feedback: feedback,
							image_path: imagePath,
							timestamp: new Date().toISOString(),
							work_summary: workSummary,
						};

						resolve({
							content: [
								{
									type: "text",
									text: `User feedback collection completed:\n\n${JSON.stringify(result, null, 2)}`,
								},
							],
						});
					},
				);
			});
		} catch (error) {
			console.error(`[Native MCP] collect_feedback failed: ${error.message}`);
			throw new Error(`Collect feedback failed: ${error.message}`);
		}
	}

	async handlePickImage(args) {
		try {
			console.error(`[Native MCP] Handling pick_image with native file picker`);

			const selectedPath = await this.showNativeFilePicker();

			if (!selectedPath) {
				throw new Error("User cancelled image selection");
			}

			// Verify file exists and format
			if (!fs.existsSync(selectedPath)) {
				throw new Error(`Selected file does not exist: ${selectedPath}`);
			}

			const ext = path.extname(selectedPath).toLowerCase();
			const supportedFormats = [
				".jpg",
				".jpeg",
				".png",
				".gif",
				".bmp",
				".webp",
				".heic",
				".heif",
			];

			if (!supportedFormats.includes(ext)) {
				throw new Error(`Unsupported image format: ${ext}`);
			}

			// Read image information and content
			const dimensions = imageSize(selectedPath);
			const stats = fs.statSync(selectedPath);
			const imageBuffer = fs.readFileSync(selectedPath);
			const base64Image = imageBuffer.toString("base64");
			const mimeType = this.getMimeType(ext);

			const result = {
				selected_image_path: selectedPath,
				filename: path.basename(selectedPath),
				format: ext.substring(1),
				width: dimensions.width,
				height: dimensions.height,
				size_bytes: stats.size,
				size_kb: (stats.size / 1024).toFixed(2),
				timestamp: new Date().toISOString(),
			};

			return {
				content: [
					{
						type: "text",
						text: `Image selection completed:\n\n${JSON.stringify(result, null, 2)}`,
					},
					{
						type: "image",
						data: base64Image,
						mimeType: mimeType,
					},
				],
			};
		} catch (error) {
			console.error(`[Native MCP] pick_image failed: ${error.message}`);
			throw new Error(`Pick image failed: ${error.message}`);
		}
	}

	async handleGetImageInfo(args) {
		try {
			const { image_path } = args;

			if (!image_path) {
				throw new Error("image_path parameter is required");
			}

			if (!fs.existsSync(image_path)) {
				throw new Error(`File not found: ${image_path}`);
			}

			const dimensions = imageSize(image_path);
			const stats = fs.statSync(image_path);

			// Read image file and convert to base64
			const imageBuffer = fs.readFileSync(image_path);
			const base64Image = imageBuffer.toString("base64");
			const mimeType = this.getMimeType(path.extname(image_path).toLowerCase());

			const result = {
				filename: path.basename(image_path),
				format: path.extname(image_path).substring(1),
				width: dimensions.width,
				height: dimensions.height,
				size_bytes: stats.size,
				size_kb: (stats.size / 1024).toFixed(2),
				modified: stats.mtime.toISOString(),
				path: image_path,
			};

			return {
				content: [
					{
						type: "text",
						text: `Image information:\n\n${JSON.stringify(result, null, 2)}`,
					},
					{
						type: "image",
						data: base64Image,
						mimeType: mimeType,
					},
				],
			};
		} catch (error) {
			throw new Error(`Get image info failed: ${error.message}`);
		}
	}

	// Get MIME type based on file extension
	getMimeType(ext) {
		const mimeTypes = {
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".png": "image/png",
			".gif": "image/gif",
			".bmp": "image/bmp",
			".webp": "image/webp",
			".heic": "image/heic",
			".heif": "image/heif",
		};
		return mimeTypes[ext] || "image/jpeg";
	}

	async handleTakeScreenshot(args) {
		try {
			console.error(`[Native MCP] Handling take_screenshot`);

			const screenshotType = await this.showScreenshotDialog();

			if (!screenshotType || screenshotType === "Cancel") {
				throw new Error("User cancelled screenshot");
			}

			const screenshotPath = await this.takeScreenshot(screenshotType);

			if (!screenshotPath) {
				throw new Error("Screenshot failed or was cancelled");
			}

			// Read screenshot information and content
			const dimensions = imageSize(screenshotPath);
			const stats = fs.statSync(screenshotPath);
			const imageBuffer = fs.readFileSync(screenshotPath);
			const base64Image = imageBuffer.toString("base64");
			const mimeType = "image/png"; // Screenshots are always PNG format

			const result = {
				screenshot_path: screenshotPath,
				filename: path.basename(screenshotPath),
				type: screenshotType,
				width: dimensions.width,
				height: dimensions.height,
				size_bytes: stats.size,
				size_kb: (stats.size / 1024).toFixed(2),
				timestamp: new Date().toISOString(),
			};

			// Delete temporary screenshot file before returning result
			try {
				if (fs.existsSync(screenshotPath)) {
					fs.unlinkSync(screenshotPath);
					console.error(
						`[Native MCP] Deleted temporary screenshot: ${screenshotPath}`,
					);
				}
			} catch (unlinkError) {
				console.error(
					`[Native MCP] Failed to delete temporary screenshot: ${unlinkError.message}`,
				);
			}

			return {
				content: [
					{
						type: "text",
						text: `Screenshot completed:\n\n${JSON.stringify(result, null, 2)}`,
					},
					{
						type: "image",
						data: base64Image,
						mimeType: mimeType,
					},
				],
			};
		} catch (error) {
			console.error(`[Native MCP] take_screenshot failed: ${error.message}`);
			throw new Error(`Take screenshot failed: ${error.message}`);
		}
	}
}

async function setupNativeMCPServer() {
	console.error(`[Native MCP] Setting up MCP server...`);

	const nativeServer = new NativeMCPServer();

	const server = new Server(
		{
			name: "interactive-feedback-macos-mcp",
			version: "1.0.1",
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// List available tools
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		console.error(`[Native MCP] Listing tools`);
		return {
			tools: [
				{
					name: "collect_feedback",
					description:
						"Collects user feedback (text and/or images) via native macOS dialogs.",
					inputSchema: {
						type: "object",
						properties: {
							work_summary: {
								type: "string",
								description:
									"AI's summary of work completed. Displayed to the user.",
							},
						},
						required: [],
					},
				},
				{
					name: "pick_image",
					description:
						"Allows the user to select a single image via native macOS file picker.",
					inputSchema: {
						type: "object",
						properties: {
							random_string: {
								type: "string",
								description: "Dummy parameter for no-parameter tools",
							},
						},
						required: ["random_string"],
					},
				},
				{
					name: "get_image_info",
					description:
						"Retrieves information (dimensions, format, size) about a local image file.",
					inputSchema: {
						type: "object",
						properties: {
							image_path: {
								type: "string",
								description: "The absolute path to the local image file.",
							},
						},
						required: ["image_path"],
					},
				},
				{
					name: "take_screenshot",
					description:
						"Takes a screenshot of the screen and saves it to a file.",
					inputSchema: {
						type: "object",
						properties: {
							random_string: {
								type: "string",
								description: "Dummy parameter for no-parameter tools",
							},
						},
						required: ["random_string"],
					},
				},
			],
		};
	});

	// Handle tool calls
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		console.error(
			`[Native MCP] Tool call: ${name} with args: ${JSON.stringify(args)}`,
		);

		try {
			switch (name) {
				case "collect_feedback":
					return await nativeServer.handleCollectFeedback(args);

				case "pick_image":
					return await nativeServer.handlePickImage(args);

				case "get_image_info":
					return await nativeServer.handleGetImageInfo(args);

				case "take_screenshot":
					return await nativeServer.handleTakeScreenshot(args);

				default:
					throw new Error(`Unknown tool: ${name}`);
			}
		} catch (error) {
			console.error(`[Native MCP] Tool ${name} failed: ${error.message}`);
			throw error;
		}
	});

	// Cleanup on exit
	const cleanup = () => {
		console.error("[Native MCP] Received exit signal, cleaning up...");
		process.exit(0);
	};

	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);
	process.on("uncaughtException", (error) => {
		console.error("[Native MCP] Uncaught exception:", error);
		process.exit(1);
	});

	// Start the server
	try {
		const transport = new StdioServerTransport();
		await server.connect(transport);
		console.error(
			`[Native MCP] Server connected successfully. PID: ${process.pid}`,
		);
	} catch (error) {
		console.error(`[Native MCP] Failed to connect server: ${error.message}`);
		throw error;
	}
}

// Start the native MCP server
setupNativeMCPServer().catch((error) => {
	console.error("[Native MCP] Failed to start:", error);
	process.exit(1);
});
