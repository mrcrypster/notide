<?php

if ( is_file(__DIR__ . '/config.local.php') ) {
  include __DIR__ . '/config.local.php';
}
else {
  define('PATH', realpath('/var/www/somepath'));
}

define('TAB_SIZE', 2);
define('EDITABLE_MIME_REG', ['/text\/.+/', '/x-empty/', '/json/', '/xml/']);

$actions = array_merge([
  'test' => function($params) {
    return 'Hi from server!' . "\n\n" . $params['body'];
  },
  
  'git push' => function($params) {
    chdir(PATH . '/' . dirname($params['f']));
    $cmds = ['git add *', 'git commit --allow-empty-message -m ""', 'git push'];
    exec(implode(' 2>&1; ', $cmds) . ' 2>&1', $o);
    return implode("\n", $o);
  },
  
  'git status' => function($params) {
    chdir(PATH . '/' . dirname($params['f']));
    $cmds = ['git status'];
    exec(implode(' 2>&1; ', $cmds) . ' 2>&1', $o);
    return implode("\n", $o);
  },
], $actions ?: []);