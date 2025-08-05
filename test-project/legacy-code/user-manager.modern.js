// Automatically modernized from legacy code
// Consider further improvements: arrow functions, const declarations, async/await

'use strict';

// Legacy User Management System
// Written in 2010 - needs modernization

let UserManager = function() {
  let self = this;
  self.users = [];
  
  self.addUser = function(name, email, age) {
    if (!name || name === '') {
      console.warn('Name is required!');
      return false;
    }
    
    if (!email || email === '') {
      console.warn('Email is required!');
      return false;
    }
    
    // Simple email validation
    let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('Invalid email format!');
      return false;
    }
    
    if (!age || age < 18) {
      console.warn('User must be 18 or older!');
      return false;
    }
    
    let user = {
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
    for (let i = 0; i < self.users.length; i++) {
      if (self.users[i].id === id) {
        return self.users[i];
      }
    }
    return null;
  };
  
  self.findUserByEmail = function(email) {
    for (let i = 0; i < self.users.length; i++) {
      if (self.users[i].email === email) {
        return self.users[i];
      }
    }
    return null;
  };
  
  self.updateUser = function(id, data) {
    let user = self.findUserById(id);
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
    for (let i = 0; i < self.users.length; i++) {
      if (self.users[i].id === id) {
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
    let xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/users/sync', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          console.log('Sync successful');
          let response = JSON.parse(xhr.responseText);
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
let userManager = new UserManager();

// Legacy event handlers
window.onload = function() {
  let addUserBtn = document.getElementById('addUserBtn');
  if (addUserBtn) {
    addUserBtn.onclick = function() {
      let name = document.getElementById('userName').value;
      let email = document.getElementById('userEmail').value;
      let age = parseInt(document.getElementById('userAge').value);
      
      if (userManager.addUser(name, email, age)) {
        updateUserList();
      }
    };
  }
};

function updateUserList() {
  let userList = document.getElementById('userList');
  if (!userList) return;
  
  userList.innerHTML = '';
  let users = userManager.getAllUsers();
  
  for (let i = 0; i < users.length; i++) {
    let li = document.createElement('li');
    li.innerHTML = users[i].name + ' (' + users[i].email + ')';
    userList.appendChild(li);
  }
}