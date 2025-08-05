
        function transformUserData(users) {
          var transformed = [];
          for (var i = 0; i < users.length; i++) {
            var user = users[i];
            transformed.push({
              id: user.id,
              fullName: user.firstName + ' ' + user.lastName,
              email: user.email.toLowerCase(),
              isActive: user.status === 'active'
            });
          }
          return transformed;
        }
      