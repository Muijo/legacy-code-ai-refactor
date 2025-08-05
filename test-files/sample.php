<?php
// Sample PHP file for testing the parser
class LegacyUserManager {
    private $db;
    private $cache;
    private $logger;
    
    public function __construct($database, $cache = null, $logger = null) {
        $this->db = $database;
        $this->cache = $cache;
        $this->logger = $logger;
    }
    
    public function getUserById($userId) {
        // Complex legacy logic with high cyclomatic complexity
        if (!$userId) {
            if ($this->logger) {
                $this->logger->error('User ID is required');
            }
            return null;
        }
        
        if (!is_numeric($userId)) {
            if ($this->logger) {
                $this->logger->error('User ID must be numeric');
            }
            return null;
        }
        
        // Check cache first
        if ($this->cache) {
            $cacheKey = "user_" . $userId;
            $cachedUser = $this->cache->get($cacheKey);
            if ($cachedUser) {
                if ($this->logger) {
                    $this->logger->info('User found in cache: ' . $userId);
                }
                return $cachedUser;
            }
        }
        
        // Query database
        try {
            $query = "SELECT * FROM users WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $user = $result->fetch_assoc();
                
                // Process user data
                if ($user['status'] === 'active') {
                    $user['permissions'] = $this->getUserPermissions($userId);
                    $user['profile'] = $this->getUserProfile($userId);
                    
                    // Cache the result
                    if ($this->cache) {
                        $this->cache->set($cacheKey, $user, 3600); // 1 hour
                    }
                    
                    if ($this->logger) {
                        $this->logger->info('User loaded from database: ' . $userId);
                    }
                    
                    return $user;
                } else {
                    if ($this->logger) {
                        $this->logger->warning('Inactive user requested: ' . $userId);
                    }
                    return null;
                }
            } else {
                if ($this->logger) {
                    $this->logger->warning('User not found: ' . $userId);
                }
                return null;
            }
        } catch (Exception $e) {
            if ($this->logger) {
                $this->logger->error('Database error: ' . $e->getMessage());
            }
            throw $e;
        }
    }
    
    private function getUserPermissions($userId) {
        $query = "SELECT p.name FROM permissions p 
                  JOIN user_permissions up ON p.id = up.permission_id 
                  WHERE up.user_id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $permissions = [];
        while ($row = $result->fetch_assoc()) {
            $permissions[] = $row['name'];
        }
        
        return $permissions;
    }
    
    private function getUserProfile($userId) {
        $query = "SELECT * FROM user_profiles WHERE user_id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        
        return null;
    }
    
    public function updateUser($userId, $data) {
        if (!$userId || !is_array($data) || empty($data)) {
            return false;
        }
        
        $allowedFields = ['name', 'email', 'status', 'last_login'];
        $updateFields = [];
        $values = [];
        $types = '';
        
        foreach ($data as $field => $value) {
            if (in_array($field, $allowedFields)) {
                $updateFields[] = $field . " = ?";
                $values[] = $value;
                $types .= 's';
            }
        }
        
        if (empty($updateFields)) {
            return false;
        }
        
        $values[] = $userId;
        $types .= 'i';
        
        $query = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->bind_param($types, ...$values);
        
        if ($stmt->execute()) {
            // Clear cache
            if ($this->cache) {
                $this->cache->delete("user_" . $userId);
            }
            
            if ($this->logger) {
                $this->logger->info('User updated: ' . $userId);
            }
            
            return true;
        }
        
        return false;
    }
}
?>