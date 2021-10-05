<?php

define('PATH', realpath('/var/www/somepath'));
define('TAB_SIZE', 2);
define('EDITABLE_MIME_REG', ['/text\/.+/', '/x-empty/', '/json/', '/xml/']);

$actions = [
  'test' => function($params) {
    return 'Hi from server!';
  },
];
