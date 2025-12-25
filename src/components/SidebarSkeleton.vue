<template>
  <div class="sidebar-skeleton">
    <!-- Header skeleton -->
    <div class="skeleton-header">
      <Skeleton variant="rounded" width="100%" height="36px" />
    </div>
    
    <!-- Search skeleton -->
    <div class="skeleton-search">
      <Skeleton variant="rounded" width="100%" height="32px" />
    </div>
    
    <!-- Notebooks skeleton -->
    <div class="skeleton-section">
      <div class="skeleton-section-header">
        <Skeleton variant="text" width="60px" height="12px" />
      </div>
      
      <div class="skeleton-items">
        <div v-for="i in 3" :key="i" class="skeleton-notebook">
          <div class="skeleton-notebook-header">
            <Skeleton variant="circular" width="16px" height="16px" />
            <Skeleton variant="text" width="80%" height="14px" />
          </div>
          <div v-if="i === 1" class="skeleton-notes">
            <div v-for="j in 2" :key="j" class="skeleton-note">
              <Skeleton variant="circular" width="14px" height="14px" />
              <Skeleton variant="text" :width="`${60 + j * 10}%`" height="13px" />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tags skeleton -->
    <div class="skeleton-section">
      <div class="skeleton-section-header">
        <Skeleton variant="text" width="40px" height="12px" />
      </div>
      
      <div class="skeleton-tags">
        <Skeleton v-for="i in 4" :key="i" variant="rounded" :width="`${40 + i * 15}px`" height="24px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from './Skeleton.vue'
</script>

<style lang="scss" scoped>
.sidebar-skeleton {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-header {
  padding: 4px 0;
}

.skeleton-search {
  padding: 4px 0;
}

.skeleton-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-section-header {
  padding: 4px 8px;
}

.skeleton-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skeleton-notebook {
  padding: 8px;
  border-radius: var(--radius-md);
}

.skeleton-notebook-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skeleton-notes {
  margin-top: 8px;
  margin-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-note {
  display: flex;
  align-items: center;
  gap: 8px;
}

.skeleton-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 8px;
}
</style>
