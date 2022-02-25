# notIDE

[![notIDE](/logo.png)](https://notide.cc/)

Browser-based code editor created to edit local or server files online.

## Features
- Syntax highlight using [ace editor](https://ace.c9.io/)
- Create new files
- Move or rename files (`double click` to move/rename)
- Remove files/folders (`Shift + single click` to remove)
- Search files by name
- Python-based client with automatic reconnection

## Usage
```bash
cd /path/to/code && python3 <(curl -s https://notide.cc/i)
```

![not IDE demo](/demo.png)

See more at [official website](https://notide.cc/).

## How it works
Code editor is hosted at [notide.cc](https://notide.cc) with [PHP backend](/ide.php).
It contains [python client](/notide.py) which operates on your local files
and connects to server API to sync editing.
