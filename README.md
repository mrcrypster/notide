# notIDE

[![notIDE](/logo.png)](https://notide.cc/)

Browser-based code editor created to edit local or server files online.

## Usage
```bash
cd /path/to/code && python3 <(curl -s https://notide.cc/i)
```

Also follow [instructions here](https://notide.cc/).

## How it works
Code editor is hosted at [notide.cc](https://notide.cc) with [PHP backend](/ide.php).
It contains [python client](/notide.py) which operates on your local files
and connects to server API to sync editing.
