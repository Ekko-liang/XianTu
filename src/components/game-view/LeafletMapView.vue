<template>
  <div class="leaflet-map-container">
    <div ref="mapContainer" class="leaflet-map"></div>
    
    <!-- 地图控制面板 -->
    <div class="map-controls">
      <button @click="resetView" class="control-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z"/>
        </svg>
        重置视图
      </button>
      
      <button @click="toggleLayer('sects')" :class="{ active: visibleLayers.sects }" class="control-btn">
        ⚔️ 宗门
      </button>
      
      <button @click="toggleLayer('cities')" :class="{ active: visibleLayers.cities }" class="control-btn">
        🏛️ 城池
      </button>
      
      <button @click="toggleLayer('secrets')" :class="{ active: visibleLayers.secrets }" class="control-btn">
        🗝️ 秘境
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const props = defineProps<{
  mapData?: any;
  messages?: string[];
}>();

const emit = defineEmits<{
  (e: 'updateMapData', data: any): void;
}>();

const mapContainer = ref<HTMLDivElement>();
let map: L.Map | null = null;
let imageOverlay: L.ImageOverlay | null = null;

// 图层管理
const visibleLayers = ref({
  sects: true,
  cities: true,
  secrets: true,
  terrain: true
});

const markerClusters = ref<{
  sects: L.MarkerClusterGroup | null;
  cities: L.MarkerClusterGroup | null;
  secrets: L.MarkerClusterGroup | null;
}>({
  sects: null,
  cities: null,
  secrets: null
});

// 地图配置
const mapConfig = {
  imageUrl: '/map-background.png', // 自定义地图背景图片
  imageBounds: [[0, 0], [8192, 8192]] as L.LatLngBoundsExpression,
  initialCenter: [4096, 4096] as L.LatLngTuple,
  initialZoom: 1,
  minZoom: 0,
  maxZoom: 5
};

// 初始化地图
const initializeMap = async () => {
  if (!mapContainer.value) return;

  // 创建地图实例，使用Simple CRS（像素坐标系）
  map = L.map(mapContainer.value, {
    crs: L.CRS.Simple,
    center: mapConfig.initialCenter,
    zoom: mapConfig.initialZoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom,
    zoomControl: false, // 禁用默认缩放控件
    attributionControl: false // 禁用版权信息
  });

  // 添加自定义缩放控件到右下角
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 设置地图边界
  const bounds = L.latLngBounds(mapConfig.imageBounds);
  map.setMaxBounds(bounds);

  // 添加背景图片
  try {
    imageOverlay = L.imageOverlay(mapConfig.imageUrl, mapConfig.imageBounds, {
      opacity: 1,
      interactive: false
    }).addTo(map);

    // 图片加载完成后适配视图
    imageOverlay.on('load', () => {
      map?.fitBounds(bounds);
    });

    // 图片加载失败时使用默认背景
    imageOverlay.on('error', () => {
      console.warn('[LeafletMapView] 地图背景图片加载失败，使用默认样式');
      addDefaultBackground();
    });

  } catch (error) {
    console.warn('[LeafletMapView] 添加背景图片失败:', error);
    addDefaultBackground();
  }

  // 初始化标记集群
  initializeMarkerClusters();

  // 如果有地图数据，渲染标记
  if (props.mapData) {
    renderMapFeatures(props.mapData);
  }
};

// 添加默认背景（当图片加载失败时）
const addDefaultBackground = () => {
  if (!map) return;
  
  // 创建一个简单的网格背景
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  // 绘制网格
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  
  // 添加背景文字
  ctx.fillStyle = '#666';
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.fillText('朝天大陆', 256, 256);
  
  const dataUrl = canvas.toDataURL();
  
  // 使用生成的canvas作为背景
  imageOverlay = L.imageOverlay(dataUrl, mapConfig.imageBounds, {
    opacity: 0.5,
    interactive: false
  }).addTo(map);
};

// 初始化标记集群
const initializeMarkerClusters = () => {
  if (!map) return;

  // 宗门集群
  markerClusters.value.sects = L.markerClusterGroup({
    iconCreateFunction: (cluster) => {
      return L.divIcon({
        html: `<div class="cluster-icon sects-cluster">${cluster.getChildCount()}</div>`,
        className: 'custom-cluster-icon',
        iconSize: [32, 32]
      });
    }
  });

  // 城池集群
  markerClusters.value.cities = L.markerClusterGroup({
    iconCreateFunction: (cluster) => {
      return L.divIcon({
        html: `<div class="cluster-icon cities-cluster">${cluster.getChildCount()}</div>`,
        className: 'custom-cluster-icon',
        iconSize: [32, 32]
      });
    }
  });

  // 秘境集群
  markerClusters.value.secrets = L.markerClusterGroup({
    iconCreateFunction: (cluster) => {
      return L.divIcon({
        html: `<div class="cluster-icon secrets-cluster">${cluster.getChildCount()}</div>`,
        className: 'custom-cluster-icon',
        iconSize: [32, 32]
      });
    }
  });

  // 默认显示所有图层
  map.addLayer(markerClusters.value.sects!);
  map.addLayer(markerClusters.value.cities!);
  map.addLayer(markerClusters.value.secrets!);
};

// 渲染地图要素
const renderMapFeatures = (mapData: any) => {
  if (!map || !mapData || !mapData.features) return;

  console.log('[LeafletMapView] 开始渲染地图要素，共', mapData.features.length, '个');

  mapData.features.forEach((feature: any) => {
    const { geometry, properties } = feature;
    
    if (geometry.type === 'Point') {
      createMarker(geometry.coordinates, properties);
    } else if (geometry.type === 'Polygon') {
      createPolygon(geometry.coordinates, properties);
    } else if (geometry.type === 'LineString') {
      createPolyline(geometry.coordinates, properties);
    }
  });
};

// 创建点标记
const createMarker = (coordinates: [number, number], properties: any) => {
  if (!map) return;

  const [x, y] = coordinates;
  const latLng: L.LatLngTuple = [y, x]; // Leaflet使用[lat, lng]格式

  let iconHtml = '';
  let clusterGroup: L.MarkerClusterGroup | null = null;

  // 根据类型确定图标和集群
  switch (properties.type) {
    case 'sect':
      iconHtml = '⚔️';
      clusterGroup = markerClusters.value.sects;
      break;
    case 'city':
      iconHtml = '🏛️';
      clusterGroup = markerClusters.value.cities;
      break;
    case 'secret_realm':
      iconHtml = '🗝️';
      clusterGroup = markerClusters.value.secrets;
      break;
    default:
      iconHtml = '📍';
      clusterGroup = markerClusters.value.cities; // 默认归类到城池
  }

  // 创建自定义图标
  const customIcon = L.divIcon({
    html: `<div class="custom-marker ${properties.type}">${iconHtml}</div>`,
    className: 'custom-marker-container',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  // 创建标记
  const marker = L.marker(latLng, { icon: customIcon });

  // 创建弹窗内容
  const popupContent = `
    <div class="marker-popup">
      <h3>${properties.name || '未知地点'}</h3>
      <p>${properties.description || '暂无描述'}</p>
      ${properties.power_level ? `<p class="power-level">实力等级: ${properties.power_level}</p>` : ''}
      ${properties.danger_level ? `<p class="danger-level">危险程度: ${properties.danger_level}</p>` : ''}
    </div>
  `;

  marker.bindPopup(popupContent);

  // 添加到相应的集群
  if (clusterGroup) {
    clusterGroup.addLayer(marker);
  }
};

// 创建多边形（大陆、山脉等）
const createPolygon = (coordinates: number[][][], properties: any) => {
  if (!map) return;

  const latLngs = coordinates[0].map(coord => [coord[1], coord[0]] as L.LatLngTuple);
  
  let color = '#3388ff';
  let fillColor = '#3388ff';
  let fillOpacity = 0.2;

  // 根据类型设置样式
  switch (properties.type) {
    case 'continent':
      color = '#8B4513';
      fillColor = '#D2B48C';
      fillOpacity = 0.3;
      break;
    case 'mountain_range':
      color = '#696969';
      fillColor = '#A0522D';
      fillOpacity = 0.4;
      break;
    case 'special_terrain':
      color = '#228B22';
      fillColor = '#90EE90';
      fillOpacity = 0.3;
      break;
  }

  const polygon = L.polygon(latLngs, {
    color: color,
    fillColor: fillColor,
    fillOpacity: fillOpacity,
    weight: 2
  });

  // 添加弹窗
  const popupContent = `
    <div class="terrain-popup">
      <h3>${properties.name || '未知地形'}</h3>
      <p>${properties.description || '暂无描述'}</p>
    </div>
  `;

  polygon.bindPopup(popupContent).addTo(map);
};

// 创建线条（河流等）
const createPolyline = (coordinates: number[][], properties: any) => {
  if (!map) return;

  const latLngs = coordinates.map(coord => [coord[1], coord[0]] as L.LatLngTuple);
  
  const polyline = L.polyline(latLngs, {
    color: '#1E90FF',
    weight: 3,
    opacity: 0.8
  });

  // 添加弹窗
  const popupContent = `
    <div class="river-popup">
      <h3>${properties.name || '未知水系'}</h3>
      <p>${properties.description || '暂无描述'}</p>
    </div>
  `;

  polyline.bindPopup(popupContent).addTo(map);
};

// 重置视图
const resetView = () => {
  if (map) {
    map.setView(mapConfig.initialCenter, mapConfig.initialZoom);
  }
};

// 切换图层显示
const toggleLayer = (layerName: keyof typeof visibleLayers.value) => {
  if (!map) return;

  visibleLayers.value[layerName] = !visibleLayers.value[layerName];
  const cluster = markerClusters.value[layerName as keyof typeof markerClusters.value];

  if (cluster) {
    if (visibleLayers.value[layerName]) {
      map.addLayer(cluster);
    } else {
      map.removeLayer(cluster);
    }
  }
};

// 监听地图数据变化
watch(() => props.mapData, (newMapData) => {
  if (newMapData && map) {
    // 清除现有标记
    Object.values(markerClusters.value).forEach(cluster => {
      if (cluster) {
        cluster.clearLayers();
      }
    });

    // 渲染新数据
    renderMapFeatures(newMapData);
  }
}, { deep: true });

// 组件挂载
onMounted(async () => {
  await nextTick();
  initializeMap();
});

// 组件卸载
onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.leaflet-map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  background-color: #1a1a2e;
}

.map-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: translateX(2px);
}

.control-btn.active {
  background: rgba(var(--color-primary-rgb), 0.8);
  box-shadow: 0 0 8px rgba(var(--color-primary-rgb), 0.5);
}

/* 自定义标记样式 */
:deep(.custom-marker-container) {
  background: none;
  border: none;
}

:deep(.custom-marker) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 14px;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.custom-marker:hover) {
  transform: scale(1.2);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
}

:deep(.custom-marker.sect) {
  background: linear-gradient(45deg, #ff4757, #ff6b7a);
}

:deep(.custom-marker.city) {
  background: linear-gradient(45deg, #3742fa, #5352ed);
}

:deep(.custom-marker.secret_realm) {
  background: linear-gradient(45deg, #ffa502, #ff9f43);
}

/* 集群样式 */
:deep(.custom-cluster-icon) {
  background: none;
  border: none;
}

:deep(.cluster-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: white;
  font-weight: bold;
  font-size: 12px;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

:deep(.sects-cluster) {
  background: linear-gradient(45deg, #ff4757, #ff6b7a);
}

:deep(.cities-cluster) {
  background: linear-gradient(45deg, #3742fa, #5352ed);
}

:deep(.secrets-cluster) {
  background: linear-gradient(45deg, #ffa502, #ff9f43);
}

/* 弹窗样式 */
:deep(.leaflet-popup-content-wrapper) {
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

:deep(.leaflet-popup-tip) {
  background: var(--color-surface);
}

.marker-popup h3,
.terrain-popup h3,
.river-popup h3 {
  margin: 0 0 8px 0;
  color: var(--color-primary);
  font-family: var(--font-family-serif);
}

.marker-popup p,
.terrain-popup p,
.river-popup p {
  margin: 4px 0;
  font-size: 14px;
}

.power-level {
  color: var(--color-accent);
  font-weight: bold;
}

.danger-level {
  color: var(--color-warning);
  font-weight: bold;
}

/* Leaflet控件样式覆盖 */
:deep(.leaflet-control-zoom) {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:deep(.leaflet-control-zoom a) {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  backdrop-filter: blur(4px);
  border: none;
}

:deep(.leaflet-control-zoom a:hover) {
  background: rgba(0, 0, 0, 0.9);
  color: var(--color-primary);
}
</style>