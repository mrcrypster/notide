<?php

if ( $_FILES['file'] ) {
  $t = tempnam('/tmp', 'notide');
  move_uploaded_file($_FILES['file']['tmp_name'], $t);

  header('Content-type: application/json');
  echo json_encode(basename($t));
}
else if ( $_GET['get'] ) {
  $f = '/tmp/' . trim($_GET['get'], '/.');
  readfile($f);
  unlink($f);
}