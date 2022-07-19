// Editor-server-client event handlers
let server_handlers = {
  tree: function(tree, cb) {
    var html = '';
    //var tree = tree.sort();
    
    tree.forEach(function(el) {
      var name = el.substr(1);
      
      if ( el.substr(-1) == '/' ) {
        name = name.slice(0, -1);
        var pad = (name.match(/\//g) || []).length;
        if ( pad > 0 ) {
          name = name.split('/')[pad];
        }
        
        html += '<li class="pad' + pad + ' ' + (pad > 0 ? 'closed' : '') + '"><b data-parent="' + el + '">' + name + '</b></li>';
      }
      else {
        var pad = (name.match(/\//g) || []).length;
        if ( pad > 0 ) {
          name = name.split('/')[pad];
        }
        
        html += '<li class="pad' + pad + ' ' + (pad > 0 ? 'closed' : '') + '"><i data-file="' + el + '">' + name + '</i><u></u></li>';
      }
    });
    
    if (html != document.querySelector('#files').innerHTML) {
      document.querySelector('#files').innerHTML = html;

      if ( initial_file ) {
        if ( document.querySelector('#files i[data-file="' + initial_file + '"]') ) {
          document.querySelector('#files i[data-file="' + initial_file + '"]').click();
        }
        else {
          location.hash = '';
        }
        initial_file = null;
      }
      
      if ( cb ) {
        cb(tree);
      }
    }
  },

  new_file: function(data) {
    server_handlers.tree(data.tree, function() {
      document.querySelector('#files i[data-file="' + data.name.file + '"]').click();
    });
  },

  error: function(message) {
    console.log(message);
    error(message);
  },

  open: function(data) {
    document.querySelector('#loading').classList.remove('on');
    loading = false;

    if ( data.error ) {
      document.querySelector('#files li i[data-file="' + data.name + '"]').classList.remove('load');
      return error("Can't read that file, sorry :(");
    }

    editor.setValue(data.code, -1);
    file = data.name;
    location.hash = file;
    
    var pos = localStorage.getItem('post' + file);
    if ( pos ) {
      pos = JSON.parse(pos);
      editor.moveCursorTo(pos.row, pos.column);
    }

    var scroll = localStorage.getItem('scroll' + file);
    if ( scroll ) {
      scroll = parseInt(scroll);

      if ( scroll ) {
        editor.session.setScrollTop(scroll)
      }
    }
    
    document.querySelector('#files li i[data-file="' + file + '"]').classList.remove('load');
    document.querySelector('#files li i[data-file="' + file + '"]').classList.add('edit');
  
    var modelist = ace.require("ace/ext/modelist");
    var mode = modelist.getModeForPath(file).mode;
    editor.session.setMode(mode);
    
    editor.setReadOnly(false);
    editor.focus();
    
    if ( !undos[file] ) {
      undos[file] = new ace.UndoManager();
    }
    
    editor.getSession().setUndoManager( undos[file] );
    
    change_cb = function() {
      if ( !file ) {
        return;
      }
      
      save[file] = {
        code: editor.getValue(),
        update: Date.now()
      };
    };
    
    editor.getSession().on('change', change_cb);
  },

  save: function(data) {
    document.querySelector('#files li i[data-file="' + data.file + '"]').classList.remove('load');
    saving = false;
  },

  move: function(data) {
    server_handlers.tree(data.tree, function() {
      document.querySelector('#files i[data-file="' + data.new + '"]').click();
    });
  },

  upload: function(data) {
    server_handlers.tree(data.tree, function() {
      document.querySelector('#files i[data-file="' + file + '"]').click();
    });
  }
}



function on(eventName, selector, handler) {
  document.addEventListener(eventName, function(e) {
    // loop parent nodes from the target to the delegation node
    for (var target = e.target; target && target != this; target = target.parentNode) {
        if (target.matches(selector)) {
            handler.call(target, e);
            break;
        }
    }
  }, false);
}



var change_cb;
var file;
var loading = false;
var save = {};
var undos = {};

function listeners() {
  document.addEventListener('keydown', function(e) {
    if ( e.key == 'Shift' ) {
      document.querySelector('#files').classList.add('alt');
    }
  });
  
  window.addEventListener('blur', function(e) {
    document.querySelector('#files').classList.remove('alt');
  });
  
  document.addEventListener('keyup', function(e) {
    if ( e.key == 'Shift' ) {
      document.querySelector('#files').classList.remove('alt');
    }
    
    localStorage.setItem('post' + file, JSON.stringify(editor.getCursorPosition()));
    localStorage.setItem('scroll' + file, editor.session.getScrollTop());
  });
  
  on('click', '#files li b', function(e) {
    if ( e.shiftKey ) {
      if ( confirm('Delete this folder?') ) {
        var folder = this.dataset.parent;
        ws.send(JSON.stringify({cmd: 'delf', context: {folder: folder}}));
        wait_ws_answer();

        this.parentNode.remove();
        
        document.querySelectorAll('#files i[data-file^="' + folder + '"], #files b[data-parent^="' + folder + '"]').forEach(function(el) {
          el.remove();
        })
      }
      
      return;
    }
    
    var dir = this.dataset.parent;
    var closed = null;

    //console.log(dir);
    //console.log( document.querySelectorAll('#files i[data-file^="' + dir + '"], #files b[data-parent^="' + dir + '"]') );
    
    document.querySelectorAll('#files i[data-file^="' + dir + '"], #files b[data-parent^="' + dir + '"]').forEach(function(el) {
      if ( el.dataset.parent == dir ) {
        return;
      }
      
      var sub_name = el.dataset.file || el.dataset.parent;
      var sub_name = sub_name.replace(dir, '') || sub_name.replace(dir, '');
      
      
      /*if ( (sub_name.substr(-1) != '/') && (sub_name.indexOf('/') != -1) ) {
        return;
      }*/
      
      /*if ( sub_name.split('/').length >= 3 ) {
        return;
      }*/
      
      if ( closed === null ) {
        closed = el.parentNode.classList.contains('closed');
      }
      
      if ( closed ) {
        el.parentNode.classList.remove('closed');
      }
      else {
        el.parentNode.classList.add('closed');
      }
    });
  });

  on('drop', '#files li', function(e) {
    let container = this;
    container.classList.add('upload');
    container.classList.remove('drag');
    for ( let i = 0; i < e.dataTransfer.files.length; i++ ) {
      let file = e.dataTransfer.files[i];
      let file_name = file.name;
      let fd = new FormData();
      fd.append("file", file);
      fetch('/file.php', {method: 'POST', body: fd})
      .then(response => response.json())
      .then(function(upload) {
        let to = container.querySelector('b') ? container.querySelector('b').dataset.parent : container.querySelector('i').dataset.file;
        ws.send(JSON.stringify({cmd: 'upload', context: {name: file_name, to: to, upload: upload}}));
        wait_ws_answer();
        container.classList.remove('upload');
      });
    }

    e.preventDefault();
  });

  on('dragover', '#files li', function(e) {
    this.classList.add('drag');
    e.preventDefault();
  });

  on('dragleave', '#files li', function(e) {
    this.classList.remove('drag');
    e.preventDefault();
  });

  on('click', '#files li i', function(e) {
    if ( e.shiftKey ) {
      if ( confirm('Delete this file?') ) {
        ws.send(JSON.stringify({cmd: 'del', context: {file: this.dataset.file}}));
        wait_ws_answer();

        this.parentNode.remove();
        
        if ( file == this.dataset.file ) {
          editor.setReadOnly(true);
          editor.setvalue('', -1);
          file = null;
        }
      }
      
      return;
    }
    
    if ( this.classList.contains('edit') ) {
      return;
    }
    
    if ( loading ) {
      return;
    }
    
    var closed = this.parentNode.classList.contains('closed');
    
    if ( closed  ) {
      var parent = this.dataset.file.split('/')
      parent.pop();
      parent = parent.join('/') + '/';
      
      do {
        document.querySelector('#files b[data-parent="' + parent + '"]').click();
        var parent = parent.split('/')
        parent.pop();
        parent.pop();
        
        if ( parent ) {
          parent = parent.join('/') + '/';
        }
        
        if ( parent == '/' ) {
          break;
        }
        
      } while( parent )
    }
    
    loading = true;
    editor.setReadOnly(true);
    editor.getSession().setUndoManager( new ace.UndoManager() );
    file = null;
    editor.getSession().off('change');
    document.querySelector('#loading').classList.add('on');
    //editor.setValue('', -1);
    
    document.querySelectorAll('#files li i.load, #files li i.edit').forEach(function(el) {
      el.className = '';
    });
    
    this.classList.add('load');

    ws.send(JSON.stringify({cmd: 'open', context: {name: this.dataset.file}}));
    wait_ws_answer();
  });
  
  on('dblclick', '#files li i', function(e) {
    var rename = prompt('Rename or move file', this.dataset.file);
    if ( rename && (rename != this.dataset.file) ) {
      this.classList.add('load');
      
      ws.send(JSON.stringify({cmd: 'move', context: {file: this.dataset.file, new: rename}}));
      wait_ws_answer();
    }
    
    e.stopPropagation();
    e.preventDefault();
  });
}



function new_file() {
  document.querySelector('#search button').addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();

    let prefix = '';
    if ( file ) {
      prefix = file.substring(0, file.lastIndexOf('/') + 1);
    }
    let name = prompt('New file name:', prefix);
    if ( name ) {
      ws.send(JSON.stringify({cmd: 'new', context: {name: name}}));
      wait_ws_answer();
    }
  });
}



var saving = false;
function sync_save() {
  for ( var file in save ) {
    if ( saving ) {
      continue;
    }
    
    if ( save[file].update > Date.now() - 250 ) {
      continue;
    }
    
    document.querySelector('#files li i[data-file="' + file + '"]').classList.add('load');

    saving = true;
    ws.send(JSON.stringify({cmd: 'save', context: {name: file, code: save[file].code}}));
    wait_ws_answer();
    
    delete save[file];
  }
  
  setTimeout(sync_save, 250);
}



function error(message) {
  if ( message ) {
    if ( document.querySelector('#error').classList.contains('on') ) {
      return;
    }
    
    document.querySelector('#error').innerHTML = message;
    document.querySelector('#error').classList.add('on');
  }
  else {
    document.querySelector('#error').classList.remove('on');
  }
}



var search_abort = null;
function search() {
  document.addEventListener('keydown', function(e) {
    if ( e.shiftKey && e.ctrlKey && e.keyCode == 70 ) {
      e.stopPropagation();
      e.preventDefault();

      document.querySelector('#search > input').focus();
    }
  });

  on('keydown', '#search > input', function(e) {
    if ( e.keyCode == 40 || e.keyCode == 38 ) {
      e.stopPropagation();
      e.preventDefault();
    }
  });

  on('keyup', '#search > input', function(e) {
    if ( e.keyCode == 40 ) {
      if ( !document.querySelector('#files li:not(.not-found) i.hover') ) {
        if ( document.querySelector('#files li:not(.not-found):last-child i') ) {
          document.querySelector('#files li:not(.not-found):last-child i').classList.add('hover');
        }
      }
      else {
        var hov = document.querySelector('#files li:not(.not-found) i.hover');
        var select_next = false;
        document.querySelectorAll('#files li:not(.not-found) i').forEach(function(el) {
          if ( select_next ) {
            hov.classList.remove('hover');
            el.classList.add('hover');
            select_next = false;
          }
          
          if ( el == hov ) {
            select_next = true;
          }
        });
      }
      
      e.stopPropagation();
      e.preventDefault();
    }
    else if ( e.keyCode == 38 ) {
      if ( !document.querySelector('#files li:not(.not-found) i.hover') ) {
        if ( document.querySelector('#files li:not(.not-found):last-child i') ) {
          document.querySelector('#files li:not(.not-found):last-child i').classList.add('hover');
        }
      }
      else {
        var hov = document.querySelector('#files li:not(.not-found) i.hover');
        var prev;
        var select_prev = false;
        
        document.querySelectorAll('#files li:not(.not-found) i').forEach(function(el) {
          if ( el == hov ) {
            select_prev = true;
          }
          else if ( !select_prev ) {
            prev = el;
          }
        });
        
        if ( select_prev && prev ) {
          hov.classList.remove('hover');
          prev.classList.add('hover');
          select_prev = false;
        }
      }
      
      e.stopPropagation();
      e.preventDefault();

    }
    else if ( e.keyCode == 13 ) {
      var hov = document.querySelector('#files li i.hover');
      if ( hov ) {
        hov.click();
      }
    }
    else if ( e.keyCode == 27 ) {
      this.value = '';
      document.querySelector('#files').classList.remove('searching');
    }
    else {
      var q = this.value.toLowerCase();
      var possible = [];
      var hov = document.querySelector('#files li i.hover');
      if ( hov ) {
        hov.classList.remove('hover');
      }
      
      if ( q != '' ) {
        document.querySelector('#files').classList.add('searching');
        document.querySelectorAll('#files li i').forEach(function(el) {
          if ( el.innerText.toLowerCase().indexOf(q) >= 0 ) {
            el.parentNode.classList.remove('not-found');
          }
          else {
            el.parentNode.classList.add('not-found');
          }
        });
        
        if ( document.querySelector('#files li:not(.not-found) i.edit') ) {
          document.querySelector('#files li:not(.not-found) i.edit').classList.add('hover');
        } else if ( document.querySelector('#files li:not(.not-found) i') ) {
          document.querySelector('#files li:not(.not-found) i').classList.add('hover');
        }
      }
      else {
        document.querySelector('#files').classList.remove('searching');
        document.querySelectorAll('#files li i').forEach(function(el) {
          el.parentNode.classList.remove('not-found');
        });
      }
    }
  });
}



// Heath system
wait_health_to = null;
function wait_ws_answer() {
  wait_health_to = setTimeout(function() {
    error('Local machine takes too long to answer, waiting...');
  }, 3000);
}

function got_ws_answer() {
  if ( wait_health_to ) {
    error();
    clearTimeout(wait_health_to);
  }
}



// Init App
ws = null;
initial_load = true;
function init_ws() {
  ws = new WebSocket('wss://notide.cc:8323/' + key);

  ws.onclose = function(e) {
    setTimeout(function() { init_ws(); }, 500);
  };

  ws.onerror = function(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  ws.onmessage = function (event) {
    got_ws_answer();
    let json = JSON.parse(event.data);
    for ( let k in json ) {
      if ( server_handlers[k] ) {
        server_handlers[k](json[k]);
      }
    }
  }

  ws.onopen = function (event) {
    if ( initial_load ) {
      ws.send(JSON.stringify({cmd: 'tree'}));
      wait_ws_answer();
      initial_load = false;
    }
  };
}

var initial_file = location.hash.substr(1);
function init() {
  // WS server
  init_ws();

  // Code editor
  editor = ace.edit("editor", {
    theme: 'ace/theme/monokai',
    fontFamily: 'Roboto Mono',
    tabSize: 2,
    useSoftTabs: true,
    readOnly: true,
    autoScrollEditorIntoView: true
  });

  listeners();
  sync_save();
  search();
  new_file();
}

init();