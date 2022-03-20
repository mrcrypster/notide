function execute(data, cb) {
  fetch('/api.php?client=1&key=' + key, {method: 'post', body: JSON.stringify(data)}).
  then(function(r) { return r.json(); }).
  then(function(r) {
    if ( r.fail ) {
      error('Failed to process "' + r.cmd + '" command, please check client...');
      return execute(data, cb);
    }
    else {
      error();
      
      if ( cb ) {
        cb(r);
      }
    }
  });
}



function tree(cb) {
  document.querySelector('#search button').classList.add('updating');
  
  execute({cmd: 'tree'}, function(r) {
    var html = '';
    document.querySelector('#search button').classList.remove('updating');
    
    if ( !r.tree ) {
      return;
    }
    
    var tree = r.tree.sort();
    
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
      
      if ( cb ) {
        cb(r);
      }
    }
  });
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
  });
  
  on('keyup', '#new_file', function(e) {
    if ( e.key == 'Enter' ) {
      this.disabled = true;
      this.classList.add('wait');
      execute({ cmd: 'new', file: this.value }, function(r) {
        document.querySelector('#new_file').disabled = false;
        document.querySelector('#new_file').classList.remove('wait');
        document.querySelector('#new_file').value = '';
        
        tree(function() {
          document.querySelector('#files i[data-file="' + r.new.file + '"]').click();
        });
      });
    }
  });  
  
  on('click', '#files li b', function(e) {
    if ( e.shiftKey ) {
      if ( confirm('Delete this folder?') ) {
        var folder = this.dataset.parent;
        execute({cmd: 'delf', folder: folder});
        this.parentNode.remove();
        
        document.querySelectorAll('#files i[data-file^="' + folder + '"], #files b[data-parent^="' + folder + '"]').forEach(function(el) {
          el.remove();
        })
      }
      
      return;
    }
    
    var dir = this.dataset.parent;
    var closed = null;
    
    document.querySelectorAll('#files i[data-file^="' + dir + '"], #files b[data-parent^="' + dir + '"]').forEach(function(el) {
      
      if ( el.dataset.parent == dir ) {
        return;
      }
      
      var sub_name = el.dataset.file || el.dataset.parent;
      var sub_name = sub_name.replace(dir, '') || sub_name.replace(dir, '');
      
      if ( (sub_name.substr(-1) != '/') && (sub_name.indexOf('/') != -1) ) {
        return;
      }
      
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
  
  on('click', '#search button', function() {
    tree();
  });
  
  on('click', '#files li i', function(e) {
    if ( e.shiftKey ) {
      if ( confirm('Delete this file?') ) {
        execute({cmd: 'del', file: this.dataset.file});
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

    execute({ cmd: 'open', file: this.dataset.file }, function(r) {
      document.querySelector('#loading').classList.remove('on');
      loading = false;
      editor.setValue(r.open.code, -1);
      file = r.open.file;
      location.hash = file;
      
      var pos = localStorage.getItem('post' + file);
      if ( pos ) {
        pos = JSON.parse(pos);
        editor.moveCursorTo(pos.row, pos.column);
      }
      
      document.querySelector('#files li i[data-file="' + file + '"]').classList.remove('load');
      document.querySelector('#files li i[data-file="' + file + '"]').classList.add('edit');
    
      var modelist = ace.require("ace/ext/modelist");
      var mode = modelist.getModeForPath(r.open.file).mode;
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
        
        document.querySelector('#files li i[data-file="' + file + '"]').classList.add('unsaved');
      };
      
      editor.getSession().on('change', change_cb);
    });
  });
  
  on('dblclick', '#files li i', function(e) {
    var rename = prompt('Rename or move file', this.dataset.file);
    if ( rename && (rename != this.dataset.file) ) {
      this.classList.add('load');
      
      execute({ cmd: 'move', file: this.dataset.file, new: rename }, function(r) {
        tree(function() {
          document.querySelector('#files i[data-file="' + r.move.new + '"]').click();
        });
      });
    }
    
    e.stopPropagation();
    e.preventDefault();
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
    
    saving = true;
    execute({ cmd: 'save_code', file: file, code: save[file].code }, function(r) {
      document.querySelector('#files li i[data-file="' + r.save_code.file + '"]').classList.remove('unsaved');
      saving = false;
    });
    
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



function ping() {
  execute({cmd: 'ping'}, function(r) {
    if ( !r.alive ) {
      error('Client is offline, waiting for it to be online again...');
    }
    else {
      error();
    }
    
    setTimeout(ping, 5 * 1000);
  });
}



var search_abort = null;
function search() {
  on('keyup', '#search > input', function(e) {
    if ( e.keyCode == 40 ) {
      if ( !document.querySelector('#files li:not(.not-found) i.hover') ) {
        if ( document.querySelector('#files li:not(.not-found) i') ) {
          document.querySelector('#files li:not(.not-found) i:last-child').classList.add('hover');
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
        if ( document.querySelector('#files li:not(.not-found) i') ) {
          document.querySelector('#files li:not(.not-found) i:last-child').classList.add('hover');
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
        
        if ( document.querySelector('#files li:not(.not-found) i') ) {
          document.querySelector('#files li:not(.not-found) i:last-child').classList.add('hover');
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



function init() {
  editor = ace.edit("editor", {
    theme: 'ace/theme/monokai',
    fontFamily: 'Roboto Mono',
    tabSize: 2,
    useSoftTabs: true,
    readOnly: true,
    autoScrollEditorIntoView: true
  });
  
  tree(function() {
    document.querySelector('#files i[data-file="' + location.hash.substr(1) + '"]').click();
  });
  listeners();
  sync_save();
  ping();
  search();
}

init();