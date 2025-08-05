
            def process_data(data):
              result = []
              for item in data:
                if type(item) == str:
                  result.append(item.upper())
                else:
                  result.append(str(item))
              return result
          