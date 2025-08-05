
      # Python legacy patterns
      import sys
      
      class LegacyProcessor:
          def __init__(self):
              self.data = {}
              self.processed_count = 0
          
          def process_data(self, input_data):
              results = []
              
              for item in input_data:
                  if type(item) == dict:
                      if 'type' in item:
                          if item['type'] == 'user':
                              results.append(self.process_user(item))
                          elif item['type'] == 'order':
                              results.append(self.process_order(item))
                  
                  self.processed_count += 1
              
              return results
          
          
          def helper_method_0(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 1)
              return result
          

          def helper_method_1(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 2)
              return result
          

          def helper_method_2(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 3)
              return result
          

          def helper_method_3(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 4)
              return result
          

          def helper_method_4(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 5)
              return result
          

          def helper_method_5(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 6)
              return result
          

          def helper_method_6(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 7)
              return result
          

          def helper_method_7(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 8)
              return result
          

          def helper_method_8(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 9)
              return result
          

          def helper_method_9(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 10)
              return result
          

          def helper_method_10(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 11)
              return result
          

          def helper_method_11(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 12)
              return result
          

          def helper_method_12(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 13)
              return result
          

          def helper_method_13(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 14)
              return result
          

          def helper_method_14(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 15)
              return result
          

          def helper_method_15(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 16)
              return result
          

          def helper_method_16(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 17)
              return result
          

          def helper_method_17(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 18)
              return result
          

          def helper_method_18(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 19)
              return result
          

          def helper_method_19(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 20)
              return result
          

          def helper_method_20(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 21)
              return result
          

          def helper_method_21(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 22)
              return result
          

          def helper_method_22(self, param):
              result = []
              for j in range(len(param)):
                  result.append(param[j] * 23)
              return result
          
    