// Legacy User Management System
// Written in 2010 - needs modernization

var UserManager = function() {
    var self = this;
    self.users = [];
    
    self.addUser = function(name, email, age) {
        if (!name || name == '') {
            alert('Name is required!');
            return false;
        }
        
        if (!email || email == '') {
            alert('Email is required!');
            return false;
        }
        
        // Simple email validation
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Invalid email format!');
            return false;
        }
        
        if (!age || age < 18) {
            alert('User must be 18 or older!');
            return false;
        }
        
        var user = {
            id: Math.floor(Math.random() * 10000),
            name: name,
            email: email,
            age: age,
            createdAt: new Date().toISOString()
        };
        
        self.users.push(user);
        console.log('User added:', user);
        return true;
    };
    
    self.findUserById = function(id) {
        for (var i = 0; i < self.users.length; i++) {
            if (self.users[i].id == id) {
                return self.users[i];
            }
        }
        return null;
    };
    
    self.findUserByEmail = function(email) {
        for (var i = 0; i < self.users.length; i++) {
            if (self.users[i].email == email) {
                return self.users[i];
            }
        }
        return null;
    };
    
    self.updateUser = function(id, data) {
        var user = self.findUserById(id);
        if (!user) {
            console.error('User not found!');
            return false;
        }
        
        if (data.name) user.name = data.name;
        if (data.email) user.email = data.email;
        if (data.age) user.age = data.age;
        
        user.updatedAt = new Date().toISOString();
        console.log('User updated:', user);
        return true;
    };
    
    self.deleteUser = function(id) {
        for (var i = 0; i < self.users.length; i++) {
            if (self.users[i].id == id) {
                self.users.splice(i, 1);
                console.log('User deleted');
                return true;
            }
        }
        console.error('User not found!');
        return false;
    };
    
    self.getAllUsers = function() {
        return self.users;
    };
    
    self.getUserCount = function() {
        return self.users.length;
    };
    
    // Legacy AJAX call using XMLHttpRequest
    self.syncWithServer = function() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/users/sync', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('Sync successful');
                    var response = JSON.parse(xhr.responseText);
                    self.users = response.users;
                } else {
                    console.error('Sync failed');
                }
            }
        };
        
        xhr.send(JSON.stringify({ users: self.users }));
    };
};

// Global instance
var userManager = new UserManager();

// Legacy event handlers
window.onload = function() {
    var addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.onclick = function() {
            var name = document.getElementById('userName').value;
            var email = document.getElementById('userEmail').value;
            var age = parseInt(document.getElementById('userAge').value);
            
            if (userManager.addUser(name, email, age)) {
                updateUserList();
            }
        };
    }
};

function updateUserList() {
    var userList = document.getElementById('userList');
    if (!userList) return;
    
    userList.innerHTML = '';
    var users = userManager.getAllUsers();
    
    for (var i = 0; i < users.length; i++) {
        var li = document.createElement('li');
        li.innerHTML = users[i].name + ' (' + users[i].email + ')';
        userList.appendChild(li);
    }
}