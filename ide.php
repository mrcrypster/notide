<?php


require_once 'config.php';


# === auth {
if ( defined('LOGIN') && defined('PASSWORD') ) {
	$allow = !empty($_SERVER['PHP_AUTH_USER']) && ($_SERVER['PHP_AUTH_USER'] == LOGIN ) &&
	         !empty($_SERVER['PHP_AUTH_PW']) && ($_SERVER['PHP_AUTH_PW'] == PASSWORD );

  if ( !$allow ) {
    header('HTTP/1.1 401 Authorization Required');
		header('WWW-Authenticate: Basic realm="Access denied"');
		exit;
  }
}
# } auth ===



# actions processing
if ( $cb = $actions[$_GET['a']] ) {
  $res = $cb($_REQUEST);
  echo $res;
  exit;
}



# === file management backend {
  if ( !is_writable(PATH) ) {
    $error = 'Please make code directory (' . PATH . ') writable for PHP';
  }
  
  # search for query in all files
  if ( $_POST['search'] ) {
    die(json_encode(search($_POST['search'])));
  }
  
  # load or read code for a file (AJAX)
  if ( $_GET['f'] ) {
    $file = PATH . '/' . ltrim($_GET['f'], '/.');
    
    if ( $_SERVER['REQUEST_METHOD'] == 'POST' ) {
      $success = file_put_contents($file, file_get_contents('php://input'));
      die( json_encode(['written' => $success === false ? false : true]) );
    }
    else {
      $writable = is_writable($file);
      $mime = finfo_file(finfo_open(FILEINFO_MIME_TYPE), $file);
      $editable = pathinfo($file, PATHINFO_EXTENSION) == 'txt';
      
      if ( !$editable ) {
        foreach ( EDITABLE_MIME_REG as $mime_pattern ) {
          if ( preg_match($mime_pattern, $mime) ) {
            $editable = true;
          }
        }
      }
      
      if ( $editable ) {
        $code = file_get_contents($file);
      }

      die( json_encode(['code' => $code, 'writable' => $writable, 'mime' => $mime, 'editable' => $editable]) );
    }
  }
  
  # init create default file/dirs if specified and new
  if ( $_GET['p'] ) {
    $default_file = $_GET['p'];
    $file = PATH . '/' . ltrim($default_file, '/.');
    if ( !is_file($file) ) {
      $dir = dirname($file);
      
      if ( !is_dir($dir) ) {
        mkdir($dir, 0755, true);
      }
      
      $success = file_put_contents($file, '');
      if ( $success === false ) {
        $error = 'Unable to create "' . $default_file . '"';
      }
    }
  }
  
  # remove file
  if ( $_GET['r'] ) {
    $file = PATH . '/' . ltrim($_GET['r'], '/.');
    if ( !unlink($file) ) {
      $error = 'Unable to remove "' . $default_file . '"';
    }
    else {
      die('ok');
    }
  }
# } file management backend ===



# === utilities {
  function search($q, $dir = null) {
    if ( !$dir ) $dir = PATH;
    $list = [];
    
    foreach ( glob( $dir . '/*' ) as $file ) {
      if ( is_dir($file) ) {
        foreach ( search($q, $file) as $r ) {
          $list[] = $r;
        }
      }
      else {
        $code = file_get_contents($file);
        if ( strpos($code, $q) !== false ) {
          $name = str_replace($dir . '/', '', $file);
          $path = str_replace(PATH . '/', '', $file);
          
          $list[$path] = trim(str_replace("\n", ' ', substr($code, max(strpos($code, $q) - 5, 0), strlen($q) + 10)));
        }
      }
    }
      
    return $list;
  }

  # build html(ul/li) file tree
  function tree($dir = null) {
    if ( !$dir ) $dir = PATH;
    $html = '';
  
    foreach ( glob( $dir . '/*' ) as $file ) {
      if ( is_dir($file) ) {
        $tree_html = tree($file);
        if ( $tree_html ) {
          $html .= '<li class="dir"><b>' . basename($file) . '/</b>' .
                      '<ul>' . $tree_html . '</ul>' .
                    '</li>';
        }
      }
      else {
        $name = str_replace($dir . '/', '', $file);
        $path = str_replace(PATH . '/', '', $file) ;
        $html .= '<li><i data-file="' . $path . '">' . $name . '</i></li>';
      }
    }
  
    return $html;
  }
# } utilities ===




include 'ide.phtml';
