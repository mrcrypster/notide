import sys, os, glob, json, time, requests, string, random, shutil



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
    if pre[0:2] != '/.':
      for i in files:
        if i[0:1] != '.':
          list.append(pre + i)
  
      for i in subdirs:
        if i[0:1] != '.':
          list.append(pre + i + '/')

  return list


# Open file by path
def code(dir, file):
  with open(dir + file, 'r') as f:
    return {'file': file, 'code': f.read()}


# Create new file by path
def create(dir, file):
  if file[0:1] != '/':
    file = '/' + file
    
  dirname = os.path.dirname(dir + file)
  if not os.path.isdir(dirname):
    os.makedirs(dirname)
  
  with open(dir + file, 'w') as f:
    f.write('')
    
  return {'file': file}


# Remove file by path
def remove(dir, file):
  os.remove(dir + file)
  return {'file': file}


# Remove folder by path
def remove_dir(dir, folder):
  shutil.rmtree(dir + folder)
  return {'folder': folder}


# move or rename file 
def move(dir, file, new):
  
  if new[0:1] != '/':
    new = '/' + new
    
  os.rename(dir + file, dir + new)
  
  return {'new': new}


# Save file by path
def save_code(dir, file, code):
  with open(dir + file, 'w') as f:
    f.write(code)
    return {'ok': True, 'file': file}


# Talk to server
handlers = {
  'tree':      lambda cmd, dir: {'tree': tree( dir )},
  'open':      lambda cmd, dir: {'open': code( dir, cmd['file'] )},
  'new':       lambda cmd, dir: {'new': create( dir, cmd['file'] )},
  'del':       lambda cmd, dir: {'del': remove( dir, cmd['file'] )},
  'delf':      lambda cmd, dir: {'delf': remove_dir( dir, cmd['folder'] )},
  'move':      lambda cmd, dir: {'move': move( dir, cmd['file'], cmd['new'] )},
  'save_code': lambda cmd, dir: {'save_code': save_code( dir, cmd['file'], cmd['code'] )}
}


# main communication process
def talk():
  while ( True ):
    try:
      cmd = (requests.get('https://notide.cc/api.php?pop=1&key=' + key, timeout=5).json());

      if 'cmd' in cmd:
        out = json.dumps( handlers[cmd['cmd']](cmd, dir) )
        x = requests.post('https://notide.cc/api.php?push=1&key=' + key, data = out)
        
    except Exception as e:
      time.sleep(1)



# -- Main program --

# init
dir = os.getcwd()
key = get_key(dir)


# welcome info
print()
print('  To edit "' + dir + '" point your browser to:')
print('  \033[92mnotide.cc/' + key + '\033[0m')
print()
print('  press ctrl+c when finished')
print()


# Enter listening mode
talk()
