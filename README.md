# Interactive Feedback MCP for macOS

A native macOS MCP server for collecting interactive user feedback with AppleScript dialogs and image support.

![image](https://github.com/user-attachments/assets/7d321b56-303c-4045-9ec5-de865c1c5b11)



![image](https://github.com/user-attachments/assets/a0652fa6-5ddb-48c5-a3cb-067a95748110)




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
