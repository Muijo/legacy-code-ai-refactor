<?php

namespace ModernizedModule;

/**
 * Modernized PHP Module: ModernizedModule
 * 
 * Automatically refactored from legacy code
 */

// Legacy Database Connection Class
// Using deprecated mysql_* functions

class Database {
    private $host = 'localhost';
    private $username = 'root';
    private $password = '';
    private $database = 'legacy_app';
    private $connection;
    
    public function __construct() {
        $this->connect();
    }
    
    public function connect() {
        // Using deprecated mysql_connect
        $this->connection = \PDO::__construct($this->host, $this->username, $this->password);
        
        if (!$this->connection) {
            die('Could not connect: ' . mysql_error());
        }
        
        // Select database
        mysql_select_db($this->database, $this->connection);
    }
    
    public function query($sql) {
        // No SQL injection protection!
        $result = \PDO::query($sql, $this->connection);
        
        if (!$result) {
            die('Query failed: ' . mysql_error());
        }
        
        return $result;
    }
    
    public function fetchArray($result) {
        return \PDOStatement::fetch($result);
    }
    
    public function fetchAssoc($result) {
        return mysql_fetch_assoc($result);
    }
    
    public function numRows($result) {
        return mysql_num_rows($result);
    }
    
    public function insertId() {
        return mysql_insert_id($this->connection);
    }
    
    public function escapeString($string) {
        return \PDO::quote($string, $this->connection);
    }
    
    public function close() {
        mysql_close($this->connection);
    }
}

// Global database instance
$db = new Database();

// Legacy user functions
public function getUserById($id) {
    global $db;
    
    // SQL injection vulnerability!
    $sql = "SELECT * FROM users WHERE id = " . $id;
    $result = $db->query($sql);
    
    if ($db->numRows($result) > 0) {
        return $db->fetchAssoc($result);
    }
    
    return null;
}

public function createUser($name, $email, $password) {
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

public function updateUser($id, $data) {
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

public function deleteUser($id) {
    global $db;
    
    $sql = "DELETE FROM users WHERE id = " . $id;
    $db->query($sql);
    
    return true;
}

public function getAllUsers() {
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

public function loginUser($email, $password) {
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

public function logoutUser() {
    session_destroy();
    return true;
}

public function isLoggedIn() {
    return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
}

public function getCurrentUser() {
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