import asyncio, websockets, sys, os, glob, json, time, requests, string, random, shutil, platform



# Utilities
def get_key(dir):
  key_file = dir + '/.notide.key'

  if not os.path.isfile(key_file):
    with open(key_file, 'w') as f:
      key = ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase + string.digits, k = 48))
      f.write(key)

  with open(key_file, 'r') as f:
    key = f.read()

  return key

def tree(dir):
  list = []
  root_files = []
  for root, subdirs, files in os.walk(dir):
    pre = root.replace(dir, '') + '/'
    
    if pre.find('.git/') == -1:
      if pre[0:2] != '/.':
        for i in files:
          if i[0:1] != '.':
            if i.find('.git/') == -1:
              if pre == '/':
                root_files.append(pre + i)
              else:
                list.append(pre + i)
    
        for i in subdirs:
          if i[0:1] != '.':
            if i.find('.git/') == -1:
              list.append(pre + i + '/')

  list = sorted(list) + sorted(root_files);
  return list

def create(dir, file):
  if file[0:1] != '/':
    file = '/' + file
    
  dirname = os.path.dirname(dir + file)
  if not os.path.isdir(dirname):
    os.makedirs(dirname)
  
  with open(dir + file, 'w') as f:
    f.write('')
    
  return {'file': file}

def code(dir, file):
  try:
    with open(dir + file, 'r') as f:
      return {'name': file, 'code': f.read()}
  except Exception:
    return {'name': file, 'error': 1}

def save_code(dir, file, code):
  with open(dir + file, 'w') as f:
    f.write(code)
    return {'ok': True, 'file': file}

def remove(dir, file):
  os.remove(dir + file)
  return {'file': file}

def remove_dir(dir, folder):
  shutil.rmtree(dir + folder)
  return {'folder': folder}

def download(dir, name, to, upload):
  download_url = 'https://notide.cc/file.php?get=' + upload
  file = os.path.dirname(to) + '/' + name
  dst = dir + file;

  os.system("wget  -O '" + dst + "' '" + download_url + "'")

  return {'file': file, 'tree': tree(dir)}

def move(dir, file, new):
  
  if new[0:1] != '/':
    new = '/' + new
    
  os.rename(dir + file, dir + new)
  
  return {'new': new, 'tree': tree(dir)}


def project(dir):
  return platform.node() + ' - ' + dir


# Handlers
local_handlers = {
  'tree':      lambda context: {'tree': tree( dir ), 'project': project( dir )},
  'new':       lambda context: {'new_file': {'name': create(dir, context['name']), 'tree': tree( dir )}},
  'open':      lambda context: {'open': {'name': context['name'], 'code': code( dir, context['name'] )}},
  'open':      lambda context: {'open': code( dir, context['name'] )},
  'save':      lambda context: {'save': save_code(dir, context['name'], context['code'])},
  'del':       lambda context: {'del': remove( dir, context['file'] )},
  'delf':      lambda context: {'delf': remove_dir( dir, context['folder'] )},
  'move':      lambda context: {'move': move( dir, context['file'], context['new'] )},
  'upload':    lambda context: {'upload': download( dir, context['name'], context['to'], context['upload'] )}
}



# Websocket server
async def talk(key, dir):
  while True:
    try:
      async with websockets.connect('ws://notide.cc:8321/' + key) as websocket:
        print('Connected to NotIDE.cc WS Server')

        while True:
          res = await websocket.recv()
          res = json.loads(res)

          context = {}
          if "context" in res:
            context = res['context']

          try:
            data = local_handlers[res['cmd']](context)
            await websocket.send( json.dumps(data) )
          except Exception as e:
            await websocket.send( json.dumps({'error': str(e)}) )
    
    except websockets.exceptions.ConnectionClosedError as e:
      pass
    except ConnectionRefusedError as e:
      pass
    except ConnectionResetError as e:
      pass



# Main program

dir = os.getcwd()
key = get_key(dir)

print()
print('  To edit "' + dir + '" point your browser to:')
print('  \033[92mnotide.cc/' + key + '\033[0m')
print()
print('  press ctrl+c when finished')
print()

asyncio.run(talk(key, dir))