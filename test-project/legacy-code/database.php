<?php
// Legacy Database Connection Class
// Using deprecated mysql_* functions

class Database {
    private $host = 'localhost';
    private $username = 'root';
    private $password = '';
    private $database = 'legacy_app';
    private $connection;
    
    function __construct() {
        $this->connect();
    }
    
    function connect() {
        // Using deprecated mysql_connect
        $this->connection = mysql_connect($this->host, $this->username, $this->password);
        
        if (!$this->connection) {
            die('Could not connect: ' . mysql_error());
        }
        
        // Select database
        mysql_select_db($this->database, $this->connection);
    }
    
    function query($sql) {
        // No SQL injection protection!
        $result = mysql_query($sql, $this->connection);
        
        if (!$result) {
            die('Query failed: ' . mysql_error());
        }
        
        return $result;
    }
    
    function fetchArray($result) {
        return mysql_fetch_array($result);
    }
    
    function fetchAssoc($result) {
        return mysql_fetch_assoc($result);
    }
    
    function numRows($result) {
        return mysql_num_rows($result);
    }
    
    function insertId() {
        return mysql_insert_id($this->connection);
    }
    
    function escapeString($string) {
        return mysql_real_escape_string($string, $this->connection);
    }
    
    function close() {
        mysql_close($this->connection);
    }
}

// Global database instance
$db = new Database();

// Legacy user functions
function getUserById($id) {
    global $db;
    
    // SQL injection vulnerability!
    $sql = "SELECT * FROM users WHERE id = " . $id;
    $result = $db->query($sql);
    
    if ($db->numRows($result) > 0) {
        return $db->fetchAssoc($result);
    }
    
    return null;
}

function createUser($name, $email, $password) {
    global $db;
    
    // Weak password hashing
    $hashedPassword = md5($password);
    
    // Manual escaping
    $name = $db->escapeString($name);
    $email = $db->escapeString($email);
    
    $sql = "INSERT INTO users (name, email, password, created_at) 
            VALUES ('$name', '$email', '$hashedPassword', NOW())";
    
    $db->query($sql);
    
    return $db->insertId();
}

function updateUser($id, $data) {
    global $db;
    
    $updates = array();
    
    if (isset($data['name'])) {
        $name = $db->escapeString($data['name']);
        $updates[] = "name = '$name'";
    }
    
    if (isset($data['email'])) {
        $email = $db->escapeString($data['email']);
        $updates[] = "email = '$email'";
    }
    
    if (isset($data['password'])) {
        // Still using MD5!
        $password = md5($data['password']);
        $updates[] = "password = '$password'";
    }
    
    if (empty($updates)) {
        return false;
    }
    
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = " . $id;
    $db->query($sql);
    
    return true;
}

function deleteUser($id) {
    global $db;
    
    $sql = "DELETE FROM users WHERE id = " . $id;
    $db->query($sql);
    
    return true;
}

function getAllUsers() {
    global $db;
    
    $sql = "SELECT * FROM users ORDER BY created_at DESC";
    $result = $db->query($sql);
    
    $users = array();
    while ($row = $db->fetchAssoc($result)) {
        $users[] = $row;
    }
    
    return $users;
}

// Legacy session handling
session_start();

function loginUser($email, $password) {
    global $db;
    
    $email = $db->escapeString($email);
    $hashedPassword = md5($password);
    
    $sql = "SELECT * FROM users WHERE email = '$email' AND password = '$hashedPassword'";
    $result = $db->query($sql);
    
    if ($db->numRows($result) > 0) {
        $user = $db->fetchAssoc($result);
        
        // Store user data in session
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['logged_in'] = true;
        
        return true;
    }
    
    return false;
}

function logoutUser() {
    session_destroy();
    return true;
}

function isLoggedIn() {
    return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    
    return array(
        'id' => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'],
        'email' => $_SESSION['user_email']
    );
}
?>