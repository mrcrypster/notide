<?php

$path = parse_url($_SERVER['REQUEST_URI'])['path'];
$key = trim($path, '/');

if ( strlen($key) == 48 ) {
  include 'ide.phtml';
}
else {
  if ( $key == 'install' ) {
    header('Content-type: text/plai');
    readfile(__DIR__ . '/notide.py');
  }
  else if ($key) {
    header('Location: /');
    exit;
  }
  else {
    include 'install.phtml';
  }
}