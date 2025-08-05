
      <?php
      // PHP legacy patterns
      class LegacyProcessor {
        private $data = array();
        
        public function processData($input) {
          global $globalConfig;
          
          foreach ($input as $key => $value) {
            if (isset($value['type'])) {
              switch ($value['type']) {
                case 'user':
                  $this->data['users'][] = $this->processUser($value);
                  break;
                case 'order':
                  $this->data['orders'][] = $this->processOrder($value);
                  break;
              }
            }
          }
          
          return $this->data;
        }
        
        
          private function helperMethod0($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 1;
            }
            return $result;
          }
        

          private function helperMethod1($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 2;
            }
            return $result;
          }
        

          private function helperMethod2($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 3;
            }
            return $result;
          }
        

          private function helperMethod3($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 4;
            }
            return $result;
          }
        

          private function helperMethod4($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 5;
            }
            return $result;
          }
        

          private function helperMethod5($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 6;
            }
            return $result;
          }
        

          private function helperMethod6($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 7;
            }
            return $result;
          }
        

          private function helperMethod7($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 8;
            }
            return $result;
          }
        

          private function helperMethod8($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 9;
            }
            return $result;
          }
        

          private function helperMethod9($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 10;
            }
            return $result;
          }
        

          private function helperMethod10($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 11;
            }
            return $result;
          }
        

          private function helperMethod11($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 12;
            }
            return $result;
          }
        

          private function helperMethod12($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 13;
            }
            return $result;
          }
        

          private function helperMethod13($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 14;
            }
            return $result;
          }
        

          private function helperMethod14($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 15;
            }
            return $result;
          }
        

          private function helperMethod15($param) {
            $result = array();
            for ($j = 0; $j < count($param); $j++) {
              $result[] = $param[$j] * 16;
            }
            return $result;
          }
        
      }
      ?>
    