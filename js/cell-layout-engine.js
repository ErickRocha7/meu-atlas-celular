import * as THREE from 'three';

// Zonas espaciais biológicas (versão refinada para célula animal e vegetal)
const ZONE_BOUNDS = {
    Animalia: {
        nuclear: { rMin: 0, rMax: 0.15 },
        perinuclear: { rMin: 0.2, rMax: 0.45 },
        cytoplasmic: { rMin: 0.45, rMax: 0.95 },
        peripheral: { rMin: 0.95, rMax: 1.15 }
    },
    Plantae: {
        nuclear: { offset: [0, -0.2, 0], radius: 0.2 },
        vacuolar_zone: { offset: [0.35, 0, -0.2], w: 0.6, h: 0.9, d: 0.6 },
        cytoplasmic: { radius: 0.8, height: 1.4 },
        peripheral: { radius: 1.1, height: 1.7 }
    }
};

const ORGANELLE_ZONE_MAP = {
    nucleus: 'nuclear',
    vacuole: 'vacuolar_zone',
    golgi: 'perinuclear',
    mitochondria: 'cytoplasmic',
    chloroplast: 'cytoplasmic',
    ribosome: 'cytoplasmic',
    lysosome: 'cytoplasmic',
    peroxisome: 'cytoplasmic',
    centriole: 'peripheral'
};

export class CellLayoutEngine {
    static generateSceneManifest(organelasList, cellCategory) {
        const manifest = [];
        const isPlant = (cellCategory === "Plantae");
        const zones = ZONE_BOUNDS[cellCategory] || ZONE_BOUNDS["Animalia"];

        organelasList.forEach(org => {
            const zoneKey = ORGANELLE_ZONE_MAP[org.id] || 'cytoplasmic';

            switch (org.id) {
                case "nucleus":
                    manifest.push({
                        id: org.id,
                        meshName: org.mesh_name,
                        description: org.descricao,
                        position: isPlant ? zones.nuclear.offset : [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: [1, 1, 1],
                        layoutGroup: "singular"
                    });
                    break;
                case "vacuole":
                    if (isPlant) {
                        manifest.push({
                            id: org.id,
                            meshName: org.mesh_name,
                            description: org.descricao,
                            position: zones.vacuolar_zone.offset,
                            rotation: [0, 0, 0],
                            scale: [1, 1, 1],
                            layoutGroup: "singular"
                        });
                    }
                    break;
                case "golgi":
                    const golgiCenter = isPlant ? [-0.4, 0.2, 0.4] : [0.5, -0.2, -0.4];
                    const numDiscos = 4;
                    for (let i = 0; i < numDiscos; i++) {
                        manifest.push({
                            id: org.id,
                            meshName: `${org.mesh_name}_stack_${i}`,
                            description: org.descricao,
                            position: [golgiCenter[0], golgiCenter[1] + (i * 0.06), golgiCenter[2]],
                            rotation: [0.2, Math.PI / 4, 0],
                            scale: [1 - (i * 0.08), 1, 1 - (i * 0.08)],
                            layoutGroup: "stack"
                        });
                    }
                    break;
                case "ribosome":
                    const numClusters = 3;
                    const ribosomesPerCluster = 5;
                    for (let c = 0; c < numClusters; c++) {
                        const center = CellLayoutEngine._getRandomPosition(zones, zoneKey, isPlant);
                        for (let r = 0; r < ribosomesPerCluster; r++) {
                            const offsetX = (Math.random() - 0.5) * 0.18;
                            const offsetY = (Math.random() - 0.5) * 0.18;
                            const offsetZ = (Math.random() - 0.5) * 0.18;
                            manifest.push({
                                id: org.id,
                                meshName: `${org.mesh_name}_cluster_${c}_${r}`,
                                description: org.descricao,
                                position: [center.x + offsetX, center.y + offsetY, center.z + offsetZ],
                                rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
                                scale: [0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4],
                                layoutGroup: "cluster"
                            });
                        }
                    }
                    break;
                default:
                    const quantidade = (org.id === "chloroplast") ? 6 : 4;
                    for (let i = 0; i < quantidade; i++) {
                        const pos = CellLayoutEngine._getRandomPosition(zones, zoneKey, isPlant);
                        manifest.push({
                            id: org.id,
                            meshName: `${org.mesh_name}_${i}`,
                            description: org.descricao,
                            position: [pos.x, pos.y, pos.z],
                            rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
                            scale: [1, 1, 1],
                            layoutGroup: "scattered"
                        });
                    }
                    break;
            }
        });
        return manifest;
    }

    static _getRandomPosition(zones, zoneKey, isPlant) {
        const zone = zones[zoneKey] || zones.cytoplasmic;

        if (isPlant) {
            if (zoneKey === 'nuclear' && zone.offset) {
                return { x: zone.offset[0], y: zone.offset[1], z: zone.offset[2] };
            }
            if (zoneKey === 'vacuolar_zone' && zone.offset) {
                const hw = zone.w / 2;
                const hh = zone.h / 2;
                const hd = zone.d / 2;
                return {
                    x: zone.offset[0] + (Math.random() - 0.5) * zone.w,
                    y: zone.offset[1] + (Math.random() - 0.5) * zone.h,
                    z: zone.offset[2] + (Math.random() - 0.5) * zone.d
                };
            }
            const radius = zone.radius || 0.8;
            const height = zone.height || 1.4;
            const angle = Math.random() * Math.PI * 2;
            const r = zoneKey === 'peripheral' ? radius * 0.9 + Math.random() * radius * 0.1 : Math.random() * radius;
            return {
                x: Math.cos(angle) * r,
                y: (Math.random() - 0.5) * height,
                z: Math.sin(angle) * r
            };
        } else {
            let rMin = zone.rMin || 0.6;
            let rMax = zone.rMax || 1.0;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = rMin + Math.random() * (rMax - rMin);
            return {
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi)
            };
        }
    }
}