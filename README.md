# Interactive Feedback MCP for macOS

A native macOS MCP server for collecting interactive user feedback with AppleScript dialogs and image support.

![image](https://github.com/user-attachments/assets/5b42b61c-090c-4c4e-a1b7-00bff33e3ee7)

![image](https://github.com/user-attachments/assets/298c2f9d-d9c8-4ab4-b447-53f32a7f91a4)



## ✨ What's Different

This is a macOS-native reimplementation of the original [interactive-feedback-mcp](https://github.com/noopstudios/interactive-feedback-mcp) by Fábio Ferreira ([@fabiomlferreira](https://x.com/fabiomlferreira)) with the following enhancements:

- **Native macOS Dialogs**: Uses AppleScript instead of web UI
- **Image Support**: Built-in image picker and screenshot capture
- **Lightweight**: No web server dependencies (Express, CORS, etc.)
- **Better Integration**: Seamless macOS user experience

## 🛠 Installation

1. Clone and install:
   ```bash
   git clone https://github.com/gmh5225/interactive-feedback-macos-mcp.git
   cd interactive-feedback-macos-mcp
   npm install
   ```

2. Add to your Cursor MCP configuration:
   ```json
   {
     "mcpServers": {
       "interactive-feedback-macos-mcp": {
         "command": "node",
         "args": ["/path/to/interactive-feedback-macos-mcp/src/mcp-server-macos.js"],
         "autoApprove": ["collect_feedback", "pick_image", "get_image_info", "take_screenshot"]
       }
     }
   }
   ```

## 🔧 Available Tools

- **`collect_feedback`**: Native dialog for user feedback with optional image attachment
- **`pick_image`**: macOS file picker for image selection
- **`get_image_info`**: Get image metadata and base64 content
- **`take_screenshot`**: Capture area or full screen screenshots

## 📝 Usage

Add this to your AI assistant prompt for best results:

> Whenever you want to ask a question, always call the MCP `interactive-feedback-macos-mcp.collect_feedback`.
> Whenever you're about to complete a user request, call the MCP `interactive-feedback-macos-mcp.collect_feedback` instead of simply ending the process.

##  License

MIT License

## 🙏 Credits

Based on [interactive-feedback-mcp](https://github.com/noopstudios/interactive-feedback-mcp) by Fábio Ferreira ([@fabiomlferreira](https://x.com/fabiomlferreira)).
