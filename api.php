<?php

if ( !$key = $_GET['key'] ) {
  return;
}



# init program
$in = '/var/lib/notide/queues/' . $key . '/in.json';
$out = '/var/lib/notide/queues/' . $key . '/out.json';
$ping = '/var/lib/notide/queues/' . $key . '/ping';

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
  touch($ping);
  file_put_contents($in, file_get_contents('php://input'));
  echo json_encode([]);
}

# pop command to client
else if ( $_GET['pop'] ) {
  touch($ping);
  echo json_encode(wait_for($out) ?: []);
}

# read in
else if ( $_GET['client'] ) {
  @unlink($in);
  $data = json_decode(file_get_contents('php://input'), 1);
  
  if ( $data['cmd'] != 'ping' ) {
    file_put_contents($out, json_encode($data));
    
    $response = wait_for($in) ?: ['fail' => true, 'cmd' => $data['cmd']];
    $response['alive'] = time() - filemtime($ping) <= 5;
  }
  else {
    $response['alive'] = time() - filemtime($ping) <= 5;
  }
  
  echo json_encode($response);
}