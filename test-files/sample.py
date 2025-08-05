# Sample Python file for testing the parser
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

class LegacyDataProcessor:
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.cache = {}
        self.logger = logging.getLogger(__name__)
        self.max_cache_size = self.config.get('max_cache_size', 1000)
        self.cache_ttl = self.config.get('cache_ttl', 3600)
        
    def process_data(self, data: Any, processing_type: str = 'default') -> Any:
        """Process data with complex legacy logic"""
        
        # High cyclomatic complexity due to nested conditions
        if not data:
            self.logger.warning("No data provided for processing")
            return None
            
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                self.logger.error("Invalid JSON string provided")
                return None
        
        # Check cache first
        cache_key = self._generate_cache_key(data, processing_type)
        if cache_key in self.cache:
            cache_entry = self.cache[cache_key]
            if datetime.now() - cache_entry['timestamp'] < timedelta(seconds=self.cache_ttl):
                self.logger.info(f"Returning cached result for key: {cache_key}")
                return cache_entry['data']
            else:
                # Remove expired entry
                del self.cache[cache_key]
        
        # Process based on type
        processed_data = None
        if processing_type == 'normalize':
            processed_data = self._normalize_data(data)
        elif processing_type == 'aggregate':
            processed_data = self._aggregate_data(data)
        elif processing_type == 'filter':
            processed_data = self._filter_data(data)
        elif processing_type == 'transform':
            processed_data = self._transform_data(data)
        else:
            processed_data = self._default_processing(data)
        
        # Cache the result if cache is not full
        if len(self.cache) < self.max_cache_size:
            self.cache[cache_key] = {
                'data': processed_data,
                'timestamp': datetime.now()
            }
        elif len(self.cache) >= self.max_cache_size:
            # Remove oldest entry
            oldest_key = min(self.cache.keys(), 
                           key=lambda k: self.cache[k]['timestamp'])
            del self.cache[oldest_key]
            self.cache[cache_key] = {
                'data': processed_data,
                'timestamp': datetime.now()
            }
        
        return processed_data
    
    def _normalize_data(self, data: Any) -> Any:
        """Normalize data with complex logic"""
        if isinstance(data, dict):
            normalized = {}
            for key, value in data.items():
                # Complex normalization logic
                if isinstance(value, str):
                    if value.lower() in ['true', 'yes', '1']:
                        normalized[key.lower()] = True
                    elif value.lower() in ['false', 'no', '0']:
                        normalized[key.lower()] = False
                    elif value.isdigit():
                        normalized[key.lower()] = int(value)
                    else:
                        try:
                            normalized[key.lower()] = float(value)
                        except ValueError:
                            normalized[key.lower()] = value.strip().lower()
                elif isinstance(value, (list, dict)):
                    normalized[key.lower()] = self._normalize_data(value)
                else:
                    normalized[key.lower()] = value
            return normalized
        elif isinstance(data, list):
            return [self._normalize_data(item) for item in data]
        else:
            return data
    
    def _aggregate_data(self, data: Any) -> Dict[str, Any]:
        """Aggregate data with multiple conditions"""
        if not isinstance(data, list):
            return {'error': 'Data must be a list for aggregation'}
        
        result = {
            'count': len(data),
            'types': {},
            'numeric_stats': {},
            'string_stats': {}
        }
        
        # Count types
        for item in data:
            item_type = type(item).__name__
            result['types'][item_type] = result['types'].get(item_type, 0) + 1
        
        # Numeric aggregations
        numeric_values = [item for item in data if isinstance(item, (int, float))]
        if numeric_values:
            result['numeric_stats'] = {
                'min': min(numeric_values),
                'max': max(numeric_values),
                'avg': sum(numeric_values) / len(numeric_values),
                'sum': sum(numeric_values)
            }
        
        # String aggregations
        string_values = [item for item in data if isinstance(item, str)]
        if string_values:
            result['string_stats'] = {
                'total_length': sum(len(s) for s in string_values),
                'avg_length': sum(len(s) for s in string_values) / len(string_values),
                'unique_count': len(set(string_values))
            }
        
        return result
    
    def _filter_data(self, data: Any) -> Any:
        """Filter data based on complex criteria"""
        if isinstance(data, list):
            filtered = []
            for item in data:
                # Complex filtering logic
                if isinstance(item, dict):
                    if self._should_include_dict(item):
                        filtered.append(item)
                elif isinstance(item, str):
                    if len(item) > 0 and not item.isspace():
                        filtered.append(item)
                elif isinstance(item, (int, float)):
                    if item > 0:
                        filtered.append(item)
                else:
                    filtered.append(item)
            return filtered
        else:
            return data
    
    def _should_include_dict(self, item: Dict[str, Any]) -> bool:
        """Complex logic to determine if dict should be included"""
        if 'status' in item:
            if item['status'] in ['active', 'enabled', 'valid']:
                return True
            elif item['status'] in ['inactive', 'disabled', 'invalid']:
                return False
        
        if 'score' in item:
            try:
                score = float(item['score'])
                if score >= 0.5:
                    return True
                else:
                    return False
            except (ValueError, TypeError):
                pass
        
        if 'created_at' in item:
            try:
                created = datetime.fromisoformat(item['created_at'])
                if datetime.now() - created < timedelta(days=365):
                    return True
                else:
                    return False
            except (ValueError, TypeError):
                pass
        
        return True  # Default to include
    
    def _transform_data(self, data: Any) -> Any:
        """Transform data with multiple transformation rules"""
        if isinstance(data, dict):
            transformed = {}
            for key, value in data.items():
                # Apply transformation rules
                new_key = self._transform_key(key)
                new_value = self._transform_value(value)
                transformed[new_key] = new_value
            return transformed
        elif isinstance(data, list):
            return [self._transform_data(item) for item in data]
        else:
            return data
    
    def _transform_key(self, key: str) -> str:
        """Transform dictionary keys"""
        # Convert camelCase to snake_case
        import re
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', key)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
    
    def _transform_value(self, value: Any) -> Any:
        """Transform values based on type and content"""
        if isinstance(value, str):
            # Date string transformation
            if self._is_date_string(value):
                try:
                    return datetime.fromisoformat(value).isoformat()
                except ValueError:
                    return value
            # URL transformation
            elif value.startswith(('http://', 'https://')):
                return {'url': value, 'domain': self._extract_domain(value)}
            else:
                return value
        elif isinstance(value, (dict, list)):
            return self._transform_data(value)
        else:
            return value
    
    def _is_date_string(self, value: str) -> bool:
        """Check if string looks like a date"""
        import re
        date_patterns = [
            r'\d{4}-\d{2}-\d{2}',
            r'\d{2}/\d{2}/\d{4}',
            r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
        ]
        return any(re.match(pattern, value) for pattern in date_patterns)
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        from urllib.parse import urlparse
        try:
            return urlparse(url).netloc
        except Exception:
            return ''
    
    def _default_processing(self, data: Any) -> Any:
        """Default processing logic"""
        return data
    
    def _generate_cache_key(self, data: Any, processing_type: str) -> str:
        """Generate cache key from data and processing type"""
        import hashlib
        data_str = json.dumps(data, sort_keys=True, default=str)
        key_input = f"{processing_type}:{data_str}"
        return hashlib.md5(key_input.encode()).hexdigest()
    
    def clear_cache(self) -> None:
        """Clear the cache"""
        self.cache.clear()
        self.logger.info("Cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'size': len(self.cache),
            'max_size': self.max_cache_size,
            'ttl': self.cache_ttl,
            'keys': list(self.cache.keys())
        }