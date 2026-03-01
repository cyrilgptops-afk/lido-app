# Example: Using Redis Utility

## Basic Usage

```typescript
import { redis } from './lib/redis';

// String operations
await redis.set('user:123', 'John Doe', 3600); // TTL: 1 hour
const user = await redis.get('user:123');

// JSON operations
await redis.setJSON('user:123', { name: 'John', email: 'john@example.com' }, 3600);
const userData = await redis.getJSON<User>('user:123');

// Delete
await redis.del('user:123');

// Check existence
const exists = await redis.exists('user:123');

// Increment (for counters, rate limiting)
await redis.incr('api:requests:count');
await redis.incrBy('api:requests:count', 10);

// Expiration
await redis.expire('session:abc', 1800); // 30 minutes
const ttl = await redis.ttl('session:abc');
```

## Hash Operations (for user profiles, settings)

```typescript
// Store user profile as hash
await redis.hSet('user:123:profile', 'name', 'John Doe');
await redis.hSet('user:123:profile', 'email', 'john@example.com');

// Get single field
const name = await redis.hGet('user:123:profile', 'name');

// Get all fields
const profile = await redis.hGetAll('user:123:profile');
// { name: 'John Doe', email: 'john@example.com' }

// Delete field
await redis.hDel('user:123:profile', 'email');
```

## List Operations (for queues, activity feeds)

```typescript
// Push to queue
await redis.rPush('jobs:pending', 'job1', 'job2', 'job3');

// Pop from queue
const job = await redis.lPop('jobs:pending');

// Get range (pagination)
const recentJobs = await redis.lRange('jobs:completed', 0, 9); // First 10
```

## Set Operations (for tags, permissions)

```typescript
// Add user permissions
await redis.sAdd('user:123:permissions', 'read', 'write', 'delete');

// Check permission
const hasWrite = await redis.sIsMember('user:123:permissions', 'write');

// Get all permissions
const permissions = await redis.sMembers('user:123:permissions');

// Remove permission
await redis.sRem('user:123:permissions', 'delete');
```

## Pattern-based Operations

```typescript
// Get all user keys
const userKeys = await redis.keys('user:*');

// Delete all session keys
await redis.deletePattern('session:*');
```

## Health Check

```typescript
const isHealthy = await redis.healthCheck(); // Returns true if Redis responds to PING
```

## Integration with Cache Client

```typescript
// In cache adapters
import { redis } from '../lib/redis';

export class RedisAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<T | null> {
    return redis.getJSON<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await redis.setJSON(key, value, ttl);
  }
  
  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
}
```

## Best Practices

1. **Always use TTL** for temporary data (sessions, caches)
2. **Use namespaced keys**: `user:123:profile`, not `user123profile`
3. **Choose right data structure**:
   - String: Simple values, JSON
   - Hash: Objects with multiple fields
   - List: Ordered collections, queues
   - Set: Unique collections, tags
4. **Avoid `keys()` in production** - use SCAN for large datasets
5. **Handle connection errors gracefully** - Redis failures shouldn't crash your app
6. **Monitor memory usage** - Set maxmemory and eviction policies
