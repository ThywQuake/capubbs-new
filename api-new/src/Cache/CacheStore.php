<?php

interface ApiNew_CacheStore {
    public function get($key);
    public function set($key, $value, $ttl);
}

