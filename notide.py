import sys, os, glob, json, time, requests, string, random



# -- Libs --

# returns access key for editing dir
def get_key(dir):
    key_file = dir + '/.notide.key'

    if not os.path.isfile(key_file):
        with open(key_file, 'w') as f:
            key = ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase + string.digits, k = 48))
            f.write(key)

    with open(key_file, 'r') as f:
        key = f.read()

    return key


# Build dirs/files tree for root dir
def tree(dir):
    list = []
    for root, subdirs, files in os.walk(dir):
        pre = root.replace(dir, '') + '/'
        for i in files:
            list.append(pre + i)

        for i in subdirs:
            list.append(pre + i + '/')

    return list


# Open file by path
def code(dir, file):
    with open(dir + file, 'r') as f:
        return {'file': file, 'code': f.read()}


# Save file by path
def save_code(dir, file, code):
    with open(dir + file, 'w') as f:
        f.write(code)
        return True


# Talk to server
def talk():
    while ( True ):
        cmd = (requests.get('https://notide.cc/api.php?pop=1&key=' + key).json());

        handlers = {
            'tree':      lambda cmd, dir: {'tree': tree( dir )},
            'open':      lambda cmd, dir: {'open': code( dir, cmd['file'] )},
            'save_code': lambda cmd, dir: {'save_code': save_code( dir, cmd['file'], cmd['code'] )}
        }

        if 'cmd' in cmd:
            out = json.dumps( handlers[cmd['cmd']](cmd, dir) )
            x = requests.post('https://notide.cc/api.php?push=1&key=' + key, data = out)



# -- Main program --

# init
dir = os.getcwd()
key = get_key(dir)


# welcome info
print('  Let\'s do not IDE on:')
print('  "' + dir + '"')
print()
print('  Point your browser to:')
print('  notide.cc/' + key)
print()
print('  press ctrl+c when finished')
print()


# Enter listening mode
talk()
