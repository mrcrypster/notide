function execute(data, cb) {
  fetch('/api.php?client=1&key=' + key, {method: 'post', body: JSON.stringify(data)}).
  then(function(r) { return r.json(); }).
  then(function(r) {
    if ( r.fail ) {
      error('Error, retrying...');
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
  execute({cmd: 'tree'}, function(r) {
    var html = '';
    
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
        
        html += '<li class="pad' + pad + ' ' + (pad > 0 ? 'closed' : '') + '"><i data-file="' + el + '">' + name + '</i></li>';
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
function listeners() {
  on('keyup', '#new_file', function(e) {
    if ( e.key == 'Enter' ) {
      this.readonly = true;
      execute({ cmd: 'new', file: this.value }, function(r) {
        document.querySelector('#new_file').readonly = false;
        
        tree(function() {
          document.querySelector('#files i[data-file="' + r.new.file + '"]').click();
        });
      });
    }
  });  
  
  on('click', '#files li b', function() {
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
  
  on('click', '#files li i', function(e) {
    if ( e.shiftKey ) {
      if ( confirm('Delete this file?') ) {
        execute({cmd: 'del', file: this.dataset.file});
        this.parentNode.remove();
      }
      
      return;
    }
    
    if ( this.classList.contains('edit') ) {
      return;
    }
    
    if ( loading ) {
      return;
    }
    
    closed = this.parentNode.classList.contains('closed');
    
    if ( closed  ) {
      var parent = this.dataset.file.split('/')
      parent.pop();
      parent = parent.join('/') + '/';
      
      do {
        console.log(parent);
        console.log( document.querySelector('#files b[data-parent="' + parent + '"]') );
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
    file = null;
    editor.getSession().off('change');
    editor.setValue('', -1);
    
    document.querySelectorAll('#files li i.load, #files li i.edit').forEach(function(el) {
      el.className = '';
    });
    
    this.classList.add('load');

    execute({ cmd: 'open', file: this.dataset.file }, function(r) {
      loading = false;
      editor.setValue(r.open.code, -1);
      file = r.open.file;
      
      document.querySelector('#files li i[data-file="' + file + '"]').classList.remove('load');
      document.querySelector('#files li i[data-file="' + file + '"]').classList.add('edit');
    
      var modelist = ace.require("ace/ext/modelist");
      var mode = modelist.getModeForPath(r.open.file).mode;
      editor.session.setMode(mode);
      
      editor.setReadOnly(false);
      editor.focus();
      
      editor.getSession().setUndoManager(new ace.UndoManager());
      
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
}



function sync_save() {
  for ( var file in save ) {
    if ( save[file].update > Date.now() - 250 ) {
      continue;
    }
    
    execute({ cmd: 'save_code', file: file, code: save[file].code }, function(r) {
      document.querySelector('#files li i[data-file="' + r.save_code.file + '"]').classList.remove('unsaved');
    });
    
    delete save[file];
  }
  
  setTimeout(sync_save, 250);
}



function error(message) {
  if ( message ) {
    document.querySelector('#error').innerHTML = message;
    document.querySelector('#error').classList.add('on');
  }
  else {
    document.querySelector('#error').classList.remove('on');
  }
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
  
  tree();
  listeners();
  sync_save();
}



init();
















// init editor with specified settings
/*var editor = null; // global editor variable
function init_editor() {
  editor = ace.edit("editor", {
    theme: 'ace/theme/monokai',
    fontFamily: 'Roboto Mono',
    tabSize: <?=TAB_SIZE?>,
    useSoftTabs: true,
    readOnly: true,
    autoScrollEditorIntoView: true
  });
    
  $(document).on('keyup', function() {
    if ( $('#files li .edit')[0] ) {
      var pos_key = 'pos_' + $('#files li .edit').data('file');
      localStorage.setItem(pos_key, JSON.stringify(editor.getCursorPosition()));
    }
  });
}



// load code for previously selected file (using "#" in address)
function init_default_file() {
  var file = <?=json_encode($default_file)?>;
  if ( file ) {
    var file_element = $('i[data-file="' + file + '"]');
    file_element.click();
    expand_file_tree(file_element[0]);
  }
}



// Expands full path for selected file
function expand_file_tree(file_element) {
  var parent = file_element;
  while ( parent = $(parent).parent()[0] ) {
    if ( $(parent).hasClass('dir') ) {
      $(parent).children('ul').addClass('open');
    }
  }
}



// listen to folders and files events
function init_tree() {
  // Folder toggling
  $(document).on('click', '#files b', function() {
    $(this).parent().children('ul').toggleClass('open');
  });
  
  $(document).on('click', '#files i', function() {
    if ( $('#files i.load').length > 0 ) return; // cancel if we're loading a file already
    if ( $(this).hasClass('edit') ) return; // cancel if this file is loaded already
    
    $('#files i.edit').removeClass('edit').parent().find('.save').remove();
    $(this).addClass('load');
    
    load_code();
  });
  
  $(document).on('dblclick', '#files i', function(e) {
    e.stopPropagation();
    e.preventDefault();
    
    if ( confirm('Remove "' + file + '"?') ) {
      var file = $(this).data('file');
      editor.setValue('', -1);
      editor.setReadOnly(false);
      $(this).parent().remove();
      $('#latest li[data-file="' + file + '"]').remove();
      
      fetch(location.pathname + '?r=' + file);
      history.pushState({}, '', '/')
    }
  });
}



// latest files block
function init_latest() {
  $(document).on('click', '#latest li', function() {
    var file = $(this).data('file');
    $('#files li i[data-file="' + file + '"]').click();
  });
  
  $(document).on('keyup', function(e) {
    if ( e.altKey && e.key == 'n' ) {
      e.stopPropagation();
      e.preventDefault();
      
      if ( e.ctrlKey ) {
        var next = $('#latest li.on').prev()[0] ? $('#latest li.on').prev() : $('#latest li:last-child');
      }
      else {
        var next = $('#latest li.on').next()[0] ? $('#latest li.on').next() : $('#latest li:first-child');
      }
      
      next.click();
    }
  });
}



// code search listener
var search_abort = null;
function init_search() {
  $(document).on('keydown', function(e) {
    if ( (e.ctrlKey || e.metaKey) && e.shiftKey && e.keyCode == 70 && !$('#search').hasClass('on') ) { // listen to "F" key
      $('#search').addClass('on');
      $('#search input').focus().select();
    }
  });
  
  $(document).on('blur', '#search input', function(e) {
    setTimeout(function() {
      $('#search').removeClass('on');
    }, 200);
  });
  
  $(document).on('keydown', '#search input', function(e) {
    if ( e.keyCode == 13 ) {
      if ( $('#search ul li.on')[0] ) {
        var file_element = $('#files i[data-file="' + $('#search ul li.on').data('file') + '"]');
        file_element.click();
        expand_file_tree(file_element[0]);
      }
    }
    else if ( e.keyCode == 27 ) {
      $('#search').removeClass('on');
    }
  });
  
  $(document).on('keyup', '#search input', function(e) {
    
    if ( e.keyCode == 40 ) {
      var next = $('#search ul li.on').next()[0] || $('#search ul li')[0];
      $('#search ul li.on').removeClass('on');
      $(next).addClass('on');
    }
    else if ( e.keyCode == 38 ) {
      var next = $('#search ul li.on').prev()[0] || $('#search ul li:last')[0];
      $('#search ul li.on').removeClass('on');
      $(next).addClass('on');
    }
    else {
      var q = $(this).val();
      var possible = [];
      
      if ( q != '' ) {
        $('#files i').each(function() {
          if ( ( possible.length < 10 ) && ($(this).data('file').indexOf(q) >= 0) ) {
            possible.push('<li data-file="' + $(this).data('file') + '">' + $(this).data('file').replace(q, '<b>' + q + '</b>') + '</li>');
          }
        });
      }
      
      if ( possible.length > 0 ) {
        $('#search ul').html(possible.join(''));
        $('#search ul li:first-child').addClass('on');
      }
      
      if ( q ) {
        if ( search_abort ) {
          search_abort.abort();
        }
        search_abort = new AbortController();
        
        fetch('/', {
          signal: search_abort.signal,
          method: 'post',
          body: new URLSearchParams({search: q})
        }).then(function(r) {
          return r.json();
        }).then(function(data) {
          if ( possible.length == 0 ) {
            $('#search ul').html('');
          }
          
          for ( var path in data ) {
            $('#search ul').append('<li data-file="' + path + '">' + path + ': ' + data[path].replace(q, '<b>' + q + '</b>') + '</li>')
          }
          
          if ( !$('#search ul li.on')[0] ) {
            $('#search ul li:first-child').addClass('on');
          }
        });
      }
    }
  });
  
  $(document).on('click', '#search ul li', function() {
    $('#files i[data-file="' + $(this).text() + '"]').click();
  });
}



// load code for currently selected file
var change_cb; // global editor code change callback (to disable/enable it)
function load_code() {
  if ( change_cb ) {
    editor.getSession().off('change', change_cb);
  }
  
  var file = $('#files i.load').data('file');
  fetch('?f=' + file, {
  }).then(function(response) {
    return response.json();
  }).then(function(data) {
  
    if ( !$('#latest li[data-file="' + file + '"]')[0] ) {
      $('#latest').append('<li data-file="' + file + '">' + file + '</li>');
    }
    
    $('#latest li.on').removeClass('on');
    $('#latest li[data-file="' + file + '"]').addClass('on');
    $('#latest li:nth(10)').remove();
  
    window.history.pushState({}, file, '?p=' + file);
    document.title = file;
    
    $('#files i.load').removeClass('load').addClass('edit');
    
    
    if ( data.writable && data.editable ) {
      editor.setValue(data.code, -1);
      var modelist = ace.require("ace/ext/modelist");
      var mode = modelist.getModeForPath(file).mode;
      editor.session.setMode(mode);
      
      editor.setReadOnly(false);
      editor.focus();
      
      editor.getSession().setUndoManager(new ace.UndoManager());
      
      change_cb = function() {
        save_code($('#files i.edit').data('file'), editor.getValue());
      };
      
      editor.getSession().on('change', change_cb);
      
      if ( $('#files li .edit')[0] ) {
        var pos_key = 'pos_' + $('#files li .edit').data('file');
        if ( localStorage.getItem(pos_key) ) {
          var pos = JSON.parse( localStorage.getItem(pos_key) )
          editor.moveCursorTo(pos.row, pos.column, .5);
          editor.scrollToLine(pos.row, true);
        }
      }
      
    } else {
      if ( !data.editable ) {
        error('"' + file + '" is not editable text file');
      }
      else {
        error('"' + file + '" is not writable');
      }
    }
  }).catch((message) => {
    error(message);
  });
}

// save code through backend
var save_in_progress = false;
var queued_save = null;
function save_code(file, code) {
  if ( !file ) return;
  
  if ( save_in_progress ) {
    if ( queued_save ) {
      clearTimeout(queued_save);
    }
    return queued_save = setTimeout(function() { save_code(file, code); }, 25);
  }
  
  save_in_progress = true;
  var file_element = $('#files i[data-file="' + file + '"]').parent();
  if ( !file_element.find('.save').length ) {
    file_element.append('<em class="save"></em>');
  }
  file_element.find('.save').text('saving...');
  fetch('?f=' + file, {
      method: 'post',
      body: code
  }).then(function(response) {
    return response.json();
  }).then(function(data) {
    save_in_progress = false;
    if ( !data.written ) {
      error('"' + file + '" code not saved');
    }
    else {
      file_element.find('.save').text('saved');
    }
  }).catch((error) => {
    save_in_progress = false;
    error(error);
  });
}



// error interaction
function init_error(startup_error) {
  $(document).on('click', '#error i', function() {
    $('#error').removeClass('on');
  })
  
  if ( startup_error ) {
    error(startup_error);
  }
}



$(document).ready(function() {
  init_editor();
  init_tree();
  init_error(<?=json_encode($error)?>);
  init_default_file();
  init_search();
  init_latest();
  init_actions();
  init_console();
});*/