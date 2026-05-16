// js/cell-layout-engine.js
import * as THREE from 'three';

// Zonas espaciais (versão inicial apenas para célula animal e vegetal)
const ZONE_BOUNDS = {
    Animalia: {
        central: { rMin: 0, rMax: 0.1 },
        perinuclear: { rMin: 0.38, rMax: 0.6 },
        cytoplasmic: { rMin: 0.6, rMax: 1.0 },
        peripheral: { rMin: 1.0, rMax: 1.15 }
    },
    Plantae: {
        central: { x: 0, y: -0.2, z: 0 },
        vacuolar_zone: { offset: [0.35, 0, -0.2], w: 0.6, h: 0.9, d: 0.6 },
        cytoplasmic: { radius: 0.8, height: 1.4 },
        peripheral: { radius: 1.1, height: 1.7 }
    }
};

export class CellLayoutEngine {
    static generateSceneManifest(organelasList, cellCategory) {
        const manifest = [];
        const isPlant = (cellCategory === "Plantae");
        const zones = ZONE_BOUNDS[cellCategory] || ZONE_BOUNDS["Animalia"];

        organelasList.forEach(org => {
            switch (org.id) {
                case "nucleus":
                    manifest.push({
                        id: org.id,
                        meshName: org.mesh_name,
                        description: org.descricao,
                        position: isPlant ? [0, -0.2, 0] : [0, 0, 0],
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
                    // Complexo de Golgi: 4 discos empilhados em posição fixa
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
                    // Ribossomos organizados em 3 clusters, com 5 unidades cada
                    const numClusters = 3;
                    const ribosomesPerCluster = 5;
                    for (let c = 0; c < numClusters; c++) {
                        const center = this._getRandomPosition(zones, isPlant);
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
                    // Demais organelas: distribuição aleatória simples
                    // (mitocôndrias, cloroplastos, lisossomos, etc.)
                    const quantidade = (org.id === "chloroplast") ? 6 : 4;
                    for (let i = 0; i < quantidade; i++) {
                        const pos = this._getRandomPosition(zones, isPlant);
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

    static _getRandomPosition(zones, isPlant) {
        if (isPlant) {
            const r = Math.random() * zones.cytoplasmic.radius;
            const angle = Math.random() * Math.PI * 2;
            return {
                x: Math.cos(angle) * r,
                y: (Math.random() - 0.5) * zones.cytoplasmic.height,
                z: Math.sin(angle) * r
            };
        } else {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 0.6 + Math.random() * 0.5;
            return {
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi)
            };
        }
    }
}