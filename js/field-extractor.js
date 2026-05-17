// field-extractor.js
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export class FieldExtractor {
    constructor(sdfFunc, resolution = 32, size = 1.0, isolation = 0, smoothNormals = true) {
        this.sdfFunc = sdfFunc;
        this.resolution = resolution;
        this.size = size;
        this.isolation = isolation;
        this.smoothNormals = smoothNormals;
    }

    generateGeometry() {
        // Material provisório para evitar erro de inicialização do MarchingCubes
        const dummyMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            flatShading: false,
            side: THREE.DoubleSide
        });
        const mc = new MarchingCubes(this.resolution, dummyMaterial);
        mc.isolation = this.isolation;
        const field = mc.field;
        const step = this.size / (this.resolution - 1);
        const halfSize = this.size / 2;

        for (let k = 0; k < this.resolution; k++) {
            for (let j = 0; j < this.resolution; j++) {
                for (let i = 0; i < this.resolution; i++) {
                    const idx = i + j * this.resolution + k * this.resolution * this.resolution;
                    const wx = i * step - halfSize;
                    const wy = j * step - halfSize;
                    const wz = k * step - halfSize;
                    field[idx] = this.sdfFunc({ x: wx, y: wy, z: wz });
                }
            }
        }
        mc.update();

        let geometry = mc.geometry;
        if (!geometry) {
            console.warn('FieldExtractor: geometria vazia. Verifique a SDF ou aumente a resolução.');
            geometry = new THREE.SphereGeometry(0.01, 4, 4);
        }
        if (this.smoothNormals) {
            geometry = mergeVertices(geometry);
            geometry.computeVertexNormals();
        }

        // Descarta o material provisório e limpa referência
        dummyMaterial.dispose();
        mc.material = null;

        return geometry;
    }

    createMesh(material) {
        const geometry = this.generateGeometry();
        return new THREE.Mesh(geometry, material);
    }
}