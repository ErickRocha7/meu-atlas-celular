// cell-layout-engine.js
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
    centriole: 'peripheral',
    rough_endoplasmic_reticulum: 'perinuclear'
};

// Gerador pseudoaleatório com semente (mulberry32 simples)
class SeededRNG {
    constructor(seed) {
        this.state = seed;
    }
    next() {
        let x = this.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        this.state = x;
        return (x >>> 0) / 4294967295;
    }
}

export class CellLayoutEngine {
    static generateSceneManifest(organelasList, cellCategory, cellId = 'unknown') {
        const manifest = [];
        const isPlant = (cellCategory === "Plantae");
        const zones = ZONE_BOUNDS[cellCategory] || ZONE_BOUNDS["Animalia"];

        // Semente determinística baseada no cellId
        const seedBase = cellId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const rng = new SeededRNG(seedBase);

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
                        scale: [0.70, 0.70, 0.70],
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
                            scale: [0.80, 0.80, 0.80],
                            layoutGroup: "singular"
                        });
                    }
                    break;
                case "golgi":
                    manifest.push({
                        id: org.id,
                        meshName: org.mesh_name,
                        description: org.descricao,
                        position: isPlant ? [-0.4, 0.2, 0.4] : [-0.60, -0.20, 0.35],
                        rotation: [0.2, Math.PI / 4, 0],
                        scale: [0.65, 0.65, 0.65],
                        layoutGroup: "stack"
                    });
                    break;
                case "rough_endoplasmic_reticulum":
                    manifest.push({
                        id: org.id,
                        meshName: org.mesh_name,
                        description: org.descricao,
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: [1.05, 1.05, 1.05],
                        layoutGroup: "singular"
                    });
                    break;
                case "ribosome":
                    const numClusters = 3;
                    const ribosomesPerCluster = 5;
                    for (let c = 0; c < numClusters; c++) {
                        const center = CellLayoutEngine._getRandomPosition(zones, zoneKey, isPlant, rng);
                        for (let r = 0; r < ribosomesPerCluster; r++) {
                            const offsetX = (rng.next() - 0.5) * 0.18;
                            const offsetY = (rng.next() - 0.5) * 0.18;
                            const offsetZ = (rng.next() - 0.5) * 0.18;
                            manifest.push({
                                id: org.id,
                                meshName: `${org.mesh_name}_cluster_${c}_${r}`,
                                description: org.descricao,
                                position: [center.x + offsetX, center.y + offsetY, center.z + offsetZ],
                                rotation: [rng.next() * Math.PI, rng.next() * Math.PI, 0],
                                scale: [0.35, 0.35, 0.35],
                                layoutGroup: "cluster"
                            });
                        }
                    }
                    break;
                case "mitochondria":
                    for (let i = 0; i < 4; i++) {
                        const pos = CellLayoutEngine._getRandomPosition(zones, zoneKey, isPlant, rng);
                        manifest.push({
                            id: org.id,
                            meshName: `${org.mesh_name}_${i}`,
                            description: org.descricao,
                            position: [pos.x, pos.y, pos.z],
                            rotation: [rng.next() * Math.PI, rng.next() * Math.PI, 0],
                            scale: [0.60, 0.60, 0.60],
                            layoutGroup: "scattered"
                        });
                    }
                    break;
                case "centriole":
                    manifest.push({
                        id: org.id,
                        meshName: org.mesh_name,
                        description: org.descricao,
                        position: [0.70, -0.10, 0.60],
                        rotation: [0, 0, 0],
                        scale: [0.48, 0.48, 0.48],
                        layoutGroup: "singular"
                    });
                    break;
                default:
                    const quantidade = (org.id === "chloroplast") ? 6 : 4;
                    for (let i = 0; i < quantidade; i++) {
                        const pos = CellLayoutEngine._getRandomPosition(zones, zoneKey, isPlant, rng);
                        manifest.push({
                            id: org.id,
                            meshName: `${org.mesh_name}_${i}`,
                            description: org.descricao,
                            position: [pos.x, pos.y, pos.z],
                            rotation: [rng.next() * Math.PI, rng.next() * Math.PI, 0],
                            scale: [0.45, 0.45, 0.45],
                            layoutGroup: "scattered"
                        });
                    }
                    break;
            }
        });
        return manifest;
    }

    static _getRandomPosition(zones, zoneKey, isPlant, rng) {
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
                    x: zone.offset[0] + (rng.next() - 0.5) * zone.w,
                    y: zone.offset[1] + (rng.next() - 0.5) * zone.h,
                    z: zone.offset[2] + (rng.next() - 0.5) * zone.d
                };
            }
            const radius = zone.radius || 0.8;
            const height = zone.height || 1.4;
            const angle = rng.next() * Math.PI * 2;
            const r = zoneKey === 'peripheral' ? radius * 0.9 + rng.next() * radius * 0.1 : rng.next() * radius;
            return {
                x: Math.cos(angle) * r,
                y: (rng.next() - 0.5) * height,
                z: Math.sin(angle) * r
            };
        } else {
            let rMin = zone.rMin || 0.6;
            let rMax = zone.rMax || 1.0;
            const theta = rng.next() * Math.PI * 2;
            const phi = Math.acos(2 * rng.next() - 1);
            const r = rMin + rng.next() * (rMax - rMin);
            return {
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi)
            };
        }
    }
}