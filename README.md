# notIDE

![notIDE](/logo.png)

Browser-based code editor created to edit local or server files online.

## How it works
Code editor is hosted at [notide.cc](https://notide.cc) with [PHP backend](/ide.php).
It contains [python client](/notide.py) which operates on your local files
and connects to server API to sync editing.

## Usage
Just go to your code dir in terminal and lanuch notIDE client:

```
cd /home/user/my_code && python3 <(curl -s https://notide.cc/install)
```

Also follow [instructions here](https://notide.cc/) to edit your local files online.
