<?php

if ( !$key = $_GET['key'] ) {
  return;
}



# init program
$in = '/var/lib/notide/queues/' . $key . '/in.json';
$out = '/var/lib/notide/queues/' . $key . '/out.json';

if ( !is_dir(dirname($in)) ) {
  mkdir(dirname($in), 0755);
}



# utilities
function wait_for($f) {
  for ( $i = 0; $i < 50; $i++ ) {
    clearstatcache();
    
    if ( is_file($f) ) {
      $r = json_decode(file_get_contents($f), 1);
      unlink($f);
      return $r;
    }
    
    usleep(50 * 1000);
  }
}



# push response from client
if ( $_GET['push'] ) {
  file_put_contents($in, file_get_contents('php://input'));
  echo json_encode([]);
}

# pop command to client
else if ( $_GET['pop'] ) {
  echo json_encode(wait_for($out) ?: []);
}

# read in
else if ( $_GET['client'] ) {
  @unlink($in);
  file_put_contents($out, file_get_contents('php://input'));
  echo json_encode(wait_for($in) ?: ['fail' => true]);
}