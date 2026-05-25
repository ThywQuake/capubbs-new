<?php

class ApiNew_NullCacheStore implements ApiNew_CacheStore {
    public function get($key) {
        return null;
    }

    public function set($key, $value, $ttl) {
        return false;
    }
}

