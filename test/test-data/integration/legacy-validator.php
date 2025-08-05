
            <?php
            function validate_user($user_data) {
              if (!isset($user_data['email'])) {
                return false;
              }
              return filter_var($user_data['email'], FILTER_VALIDATE_EMAIL);
            }
            ?>
          