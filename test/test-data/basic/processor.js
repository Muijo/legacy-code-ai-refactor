
          function processUsers(users) {
            var processed = [];
            
            for (var i = 0; i < users.length; i++) {
              var user = users[i];
              if (user.email && validateEmail(user.email)) {
                processed.push({
                  id: user.id,
                  email: user.email.toLowerCase(),
                  createdAt: formatDate(new Date())
                });
              }
            }
            
            return processed;
          }
        