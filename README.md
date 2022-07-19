# notIDE

[![notIDE](/web/logo.png)](https://notide.cc/)

Browser-based code editor created to edit local or server files online.

## Features
- Create/rename/move/delete files/folders
- Drag-and-drop files upload
- Syntax highlight using Ace editor
- Autosaving changes
- Search files by name
- Python-based client local client
- Cross-files undo manager
- Cursor position/scroll depth autosave

## Usage
```bash
cd /path/to/code && python3 <(curl -s https://notide.cc/i)
```

![not IDE demo](/web/example-terminal.png)
![not IDE demo](/web/demo.png)

See more at [official website](https://notide.cc/).

## How it works
Code editor is hosted at [notide.cc](https://notide.cc) with [NodeJS backend](/ws/).
It operates based on a [python client](/local/client2.py) which manages your local files
and connects to server API to sync changes.
