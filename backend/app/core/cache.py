"""Redis caching and session management."""

import json
import logging
from typing import Any, Optional, Union
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from redis.asyncio import Redis
from redis.exceptions import ConnectionError, RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global Redis connection pool
redis_client: Optional[Redis] = None


async def init_redis() -> None:
    """Initialize Redis connection with optimized settings."""
    global redis_client
    
    try:
        logger.info("Initializing Redis connection...")
        
        # Create Redis client with connection pooling
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,  # Connection pool size
            retry_on_timeout=True,
            retry_on_error=[ConnectionError],
            health_check_interval=30,  # Health check every 30 seconds
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        
        # Test connection
        await redis_client.ping()
        logger.info("Redis connection established successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")
        raise


async def close_redis() -> None:
    """Close Redis connections gracefully."""
    global redis_client
    
    if redis_client is not None:
        logger.info("Closing Redis connections...")
        await redis_client.close()
        redis_client = None
        logger.info("Redis connections closed")


def get_redis() -> Redis:
    """Get Redis client instance."""
    if redis_client is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return redis_client


class CacheManager:
    """High-performance cache manager with Redis backend."""
    
    def __init__(self, client: Redis):
        self.client = client
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        try:
            value = await self.client.get(key)
            if value is None:
                return None
                
            # Try to deserialize JSON, fallback to string
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
                
        except RedisError as e:
            logger.error(f"Failed to get cache key {key}: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default from settings)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Serialize complex objects to JSON
            if isinstance(value, (dict, list, tuple)):
                serialized_value = json.dumps(value, ensure_ascii=False)
            else:
                serialized_value = str(value)
            
            ttl = ttl or settings.REDIS_CACHE_TTL
            
            await self.client.setex(key, ttl, serialized_value)
            return True
            
        except RedisError as e:
            logger.error(f"Failed to set cache key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if key was deleted, False otherwise
        """
        try:
            result = await self.client.delete(key)
            return result > 0
            
        except RedisError as e:
            logger.error(f"Failed to delete cache key {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.
        
        Args:
            key: Cache key to check
            
        Returns:
            True if key exists, False otherwise
        """
        try:
            result = await self.client.exists(key)
            return result > 0
            
        except RedisError as e:
            logger.error(f"Failed to check cache key {key}: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Increment numeric value in cache.
        
        Args:
            key: Cache key
            amount: Amount to increment by
            
        Returns:
            New value after increment or None if failed
        """
        try:
            return await self.client.incrby(key, amount)
            
        except RedisError as e:
            logger.error(f"Failed to increment cache key {key}: {e}")
            return None
    
    async def expire(self, key: str, ttl: int) -> bool:
        """
        Set expiration time for existing key.
        
        Args:
            key: Cache key
            ttl: Time to live in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = await self.client.expire(key, ttl)
            return result
            
        except RedisError as e:
            logger.error(f"Failed to set expiration for cache key {key}: {e}")
            return False
    
    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        """
        Get multiple values from cache.
        
        Args:
            keys: List of cache keys
            
        Returns:
            Dictionary mapping keys to values
        """
        try:
            values = await self.client.mget(keys)
            result = {}
            
            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        result[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        result[key] = value
                        
            return result
            
        except RedisError as e:
            logger.error(f"Failed to get multiple cache keys: {e}")
            return {}
    
    async def set_many(
        self, 
        mapping: dict[str, Any], 
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set multiple values in cache.
        
        Args:
            mapping: Dictionary of key-value pairs
            ttl: Time to live in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Serialize values
            serialized_mapping = {}
            for key, value in mapping.items():
                if isinstance(value, (dict, list, tuple)):
                    serialized_mapping[key] = json.dumps(value, ensure_ascii=False)
                else:
                    serialized_mapping[key] = str(value)
            
            # Use pipeline for atomic operation
            async with self.client.pipeline() as pipe:
                await pipe.mset(serialized_mapping)
                
                if ttl:
                    for key in mapping.keys():
                        await pipe.expire(key, ttl)
                        
                await pipe.execute()
                
            return True
            
        except RedisError as e:
            logger.error(f"Failed to set multiple cache keys: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """
        Clear all keys matching pattern.
        
        Args:
            pattern: Redis pattern (e.g., "user:*")
            
        Returns:
            Number of keys deleted
        """
        try:
            keys = await self.client.keys(pattern)
            if keys:
                return await self.client.delete(*keys)
            return 0
            
        except RedisError as e:
            logger.error(f"Failed to clear cache pattern {pattern}: {e}")
            return 0


class SessionManager:
    """Redis-based session management."""
    
    def __init__(self, client: Redis):
        self.client = client
    
    def _session_key(self, session_id: str) -> str:
        """Generate session key."""
        return f"session:{session_id}"
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data."""
        try:
            key = self._session_key(session_id)
            data = await self.client.get(key)
            
            if data:
                return json.loads(data)
            return None
            
        except RedisError as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None
    
    async def set_session(
        self, 
        session_id: str, 
        data: dict, 
        ttl: Optional[int] = None
    ) -> bool:
        """Set session data."""
        try:
            key = self._session_key(session_id)
            ttl = ttl or settings.REDIS_SESSION_TTL
            
            serialized_data = json.dumps(data, ensure_ascii=False)
            await self.client.setex(key, ttl, serialized_data)
            
            return True
            
        except RedisError as e:
            logger.error(f"Failed to set session {session_id}: {e}")
            return False
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        try:
            key = self._session_key(session_id)
            result = await self.client.delete(key)
            return result > 0
            
        except RedisError as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            return False


# Factory functions for dependency injection
def get_cache_manager() -> CacheManager:
    """Get cache manager instance."""
    return CacheManager(get_redis())


def get_session_manager() -> SessionManager:
    """Get session manager instance."""
    return SessionManager(get_redis())


# Health check for Redis
async def check_redis_health() -> dict:
    """
    Check Redis connection health.
    
    Returns:
        dict: Health status information
    """
    if redis_client is None:
        return {"status": "error", "message": "Redis not initialized"}
    
    try:
        # Test basic operations
        await redis_client.ping()
        
        # Test set/get operation
        test_key = "health_check"
        await redis_client.setex(test_key, 5, "ok")
        value = await redis_client.get(test_key)
        await redis_client.delete(test_key)
        
        if value != "ok":
            raise Exception("Set/Get operation failed")
        
        # Get connection info
        info = await redis_client.info()
        
        return {
            "status": "healthy",
            "message": "Redis connection is working",
            "connected_clients": info.get("connected_clients", "unknown"),
            "used_memory": info.get("used_memory_human", "unknown"),
            "uptime": info.get("uptime_in_seconds", "unknown"),
        }
        
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "error",
            "message": f"Redis health check failed: {str(e)}"
        }


# Context manager for Redis operations
@asynccontextmanager
async def redis_transaction():
    """Context manager for Redis transactions."""
    client = get_redis()
    async with client.pipeline() as pipe:
        try:
            yield pipe
            await pipe.execute()
        except Exception:
            # Pipeline automatically discards on exception
            raise
